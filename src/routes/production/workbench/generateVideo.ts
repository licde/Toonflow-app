import express from "express";
import u from "@/utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { resolveStoryboardReference, resolveAssetReference } from "@/lib/dramaPack/resolveReference";
import { findAllOrphanRefs, loadTrackRefSlots } from "@/lib/dramaPack/refSlotBuilder";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { ReferenceList } from "@/utils/ai";
const router = express.Router();

type Type = "imageReference" | "startImage" | "endImage" | "videoReference" | "audioReference";
interface UploadItem {
  fileType: "image" | "video" | "audio";
  type: Type;
  sources?: "assets" | "storyboard";
  id?: number;
  src?: string;
  label?: string;
  prompt?: string;
}

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    uploadData: z.array(
      z.object({
        id: z.number(),
        sources: z.string(),
      }),
    ),
    prompt: z.string(),
    model: z.string(),
    mode: z.string(),
    resolution: z.string(),
    duration: z.number(),
    audio: z.boolean().optional(),
    trackId: z.number(),
  }),
  async (req, res) => {
    const { scriptId, projectId, prompt, uploadData, model, duration, resolution, audio, mode, trackId } = req.body;
    let modeData = [];
    if (Array.isArray(mode)) {
    } else if (typeof mode === "string" && mode.startsWith('["') && mode.endsWith('"]')) {
      try {
        modeData = JSON.parse(mode);
      } catch (e) {}
    }
    //获取生成视频比例
    const ratio = await u.db("o_project").select("videoRatio").where("id", projectId).first();
    const videoPath = `/${projectId}/video/${uuidv4()}.mp4`; //视频保存路径
    //查询出图片数据
    const missingRefs: Array<{ id?: number; reason: string }> = [];
    const images = await Promise.all(
      uploadData.map(async (item: UploadItem) => {
        if (item.sources === "storyboard") {
          const ref = await resolveStoryboardReference(item.id!);
          if (!ref?.path) {
            missingRefs.push({ id: item.id, reason: "分镜图未生成且无关联资产图" });
            return null;
          }
          return { path: ref.path, sources: "storyBoard", fallback: ref.fallback };
        }
        if (item.sources === "assets") {
          const ref = await resolveAssetReference(item.id!);
          if (!ref?.path) {
            missingRefs.push({ id: item.id, reason: "资产图未生成" });
            return null;
          }
          return { path: ref.path, sources: ref.sources };
        }
        return null;
      }),
    );

    if (missingRefs.length && uploadData.length > 0) {
      return res.status(400).send(error({ message: "参考图缺失", missingRefs }));
    }

    const refSlots = await loadTrackRefSlots(trackId);
    const orphanRefs = findAllOrphanRefs(prompt, uploadData.length, refSlots);
    if (orphanRefs.length) {
      return res.status(400).send(error({ message: "提示词引用与参考条带不一致", orphanRefs }));
    }
    //把images里面的图片转成base64格式
    const base64 = await Promise.all(
      images.map(async (item) => {
        if (!item) return null;
        return { base64: await u.oss.getImageBase64(item.path), type: item.sources == "audio" ? "audio" : "image" };
      }),
    );
    //新增
    const [videoId] = await u.db("o_video").insert({
      filePath: videoPath,
      time: Date.now(),
      state: "生成中",
      scriptId,
      projectId,
      videoTrackId: trackId,
    });
    res.status(200).send(success(videoId));
    const relatedObjects = {
      projectId,
      videoId,
      scriptId,
      type: "视频",
    };
    const aiVideo = u.Ai.Video(model);
    aiVideo
      .run(
        {
          prompt,
          referenceList: base64.filter(Boolean) as ReferenceList[],
          mode: modeData.length > 0 ? modeData : mode,
          duration,
          aspectRatio: (ratio?.videoRatio as "16:9" | "9:16") || "16:9",
          resolution,
          audio,
        },
        {
          projectId,
          taskClass: "视频生成",
          describe: "根据提示词生成视频",
          relatedObjects: JSON.stringify(relatedObjects),
        },
      )
      .then(async () => await aiVideo.save(videoPath))
      .then(async () => await u.db("o_video").where("id", videoId).update({ state: "生成成功" }))
      .catch(async (error: any) => {
        await u
          .db("o_video")
          .where("id", videoId)
          .update({
            state: "生成失败",
            errorReason: u.error(error).message,
          });
      });
  },
);

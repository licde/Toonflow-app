import express from "express";
import u from "@/utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { ReferenceList } from "@/utils/ai";
import { resolveStoryboardReference, resolveAssetReference } from "@/lib/dramaPack/resolveReference";
import { loadTrackRefSlots, refSlotsToUploadInfo } from "@/lib/dramaPack/refSlotBuilder";
import { buildPromptSourceTag, validatePromptRefsAgainstTrack, validateVideoContract } from "@/lib/dramaPack/videoWorkbenchGuard";

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

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    trackData: z.array(
      z.object({
        uploadData: z.array(
          z.object({
            id: z.number(),
            sources: z.string(),
          }),
        ),
        trackId: z.number(),
        prompt: z.string(),
        duration: z.number(),
      }),
    ),
    model: z.string(),
    mode: z.string(),
    resolution: z.string(),
    audio: z.boolean().optional(),
  }),
  async (req, res) => {
    const { scriptId, projectId, trackData, model, resolution, audio, mode } = req.body;
    const rejected: Array<{ trackId: number; code: string; message: string; details?: Record<string, unknown> }> = [];

    let modeData = [];
    if (Array.isArray(mode)) {
    } else if (typeof mode === "string" && mode.startsWith('["') && mode.endsWith('"]')) {
      try {
        modeData = JSON.parse(mode);
      } catch (e) {}
    }

    // 获取生成视频比例
    const ratio = await u.db("o_project").select("videoRatio").where("id", projectId).first();

    // 为每个 track 预处理数据并插入数据库，返回任务列表
    const tasks = await Promise.all(
      (trackData as { uploadData: { id: number; sources: string }[]; trackId: number; prompt: string; duration: number }[]).map(async (track) => {
        const { trackId, prompt, duration } = track;
        const contract = validateVideoContract({ model, mode, duration, resolution, audio });
        if (!contract.ok) {
          u.genLog({
            vendorId: model.split(/:(.+)/)[0],
            model,
            taskClass: "视频生成",
            assetId: trackId,
            phase: "batch_preflight_reject",
            message: `${contract.code}:${contract.message}`,
          });
          rejected.push({ trackId, code: contract.code, message: contract.message, details: contract.details });
          return null;
        }
        const refGuard = await validatePromptRefsAgainstTrack({ trackId, prompt });
        if (!refGuard.ok) {
          u.genLog({
            vendorId: model.split(/:(.+)/)[0],
            model,
            taskClass: "视频生成",
            assetId: trackId,
            phase: "batch_preflight_reject",
            message: `${refGuard.code}:${JSON.stringify(refGuard.details || {}).slice(0, 300)}`,
          });
          rejected.push({ trackId, code: refGuard.code, message: refGuard.message, details: refGuard.details });
          return null;
        }

        const trackRefSlots = await loadTrackRefSlots(trackId);
        const canonicalUploadData = refSlotsToUploadInfo(trackRefSlots);
        // 查询出图片数据
        const missingRefs: Array<{ id?: number; reason: string }> = [];
        const images = await Promise.all(
          canonicalUploadData.map(async (item) => {
            if (item.sources === "storyboard") {
              const ref = await resolveStoryboardReference(item.id);
              if (!ref?.path) {
                missingRefs.push({ id: item.id, reason: "分镜图未生成且无关联资产图" });
                return null;
              }
              return { path: ref.path, sources: "storyBoard" };
            }
            if (item.sources === "assets") {
              const ref = await resolveAssetReference(item.id);
              if (!ref?.path) {
                missingRefs.push({ id: item.id, reason: "资产图未生成" });
                return null;
              }
              return { path: ref.path, sources: ref.sources };
            }
            return null;
          }),
        );
        if (missingRefs.length && canonicalUploadData.length > 0) {
          u.genLog({
            vendorId: model.split(/:(.+)/)[0],
            model,
            taskClass: "视频生成",
            assetId: trackId,
            phase: "batch_preflight_reject",
            message: `REFERENCE_MISSING:${JSON.stringify(missingRefs).slice(0, 300)}`,
          });
          rejected.push({
            trackId,
            code: "REFERENCE_MISSING",
            message: "参考图缺失",
            details: { missingRefs },
          });
          return null;
        }

        const videoPath = `/${projectId}/video/${uuidv4()}.mp4`;
        const [videoId] = await u.db("o_video").insert({
          filePath: videoPath,
          time: Date.now(),
          state: "生成中",
          scriptId,
          projectId,
          videoTrackId: trackId,
        });
        await u.db("o_videoTrack").where({ id: trackId }).update({
          promptSource: buildPromptSourceTag(model, mode, prompt, refGuard.refSlotsCount),
        });

        return { videoId, videoPath, prompt, duration, images, trackId };
      }),
    );
    const validTasks = tasks.filter(Boolean) as Array<{
      videoId: number;
      videoPath: string;
      prompt: string;
      duration: number;
      images: Array<{ path: string; sources: string } | null>;
      trackId: number;
    }>;
    res.status(200).send(success({ accepted: validTasks.map((t) => ({ videoId: t.videoId, trackId: t.trackId })), rejected }));
    for (const { videoId, videoPath, prompt, duration, images } of validTasks) {
      // 所有任务全部并发后台执行，完全不阻塞任何进程
      const base64 = await Promise.all(
        images.map(async (item) => {
          if (!item) return null;
          return { base64: await u.oss.getImageBase64(item.path), type: item.sources == "audio" ? "audio" : "image" };
        }),
      );
      const relatedObjects = { projectId, videoId, scriptId, type: "视频" };
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
          const normalized = u.error(error);
          u.genLog({
            vendorId: model.split(/:(.+)/)[0],
            model,
            taskClass: "视频生成",
            assetId: videoId,
            phase: "batch_failed",
            message: normalized.message,
            httpStatus: normalized.status,
          });
          await u
            .db("o_video")
            .where("id", videoId)
            .update({
              state: "生成失败",
              errorReason: normalized.message,
            });
        });
    }
  },
);

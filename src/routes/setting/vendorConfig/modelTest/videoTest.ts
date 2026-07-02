import express from "express";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import u from "@/utils";
import { z } from "zod";
import { tool, jsonSchema } from "ai";
const router = express.Router();

// 检查语言模型
export default router.post(
  "/",
  validateFields({
    modelName: z.string(),
    id: z.string(),
    mode: z.string(),
    prompt: z.string().optional().default(""),
    videos: z.array(
      z.object({
        type: z.string(),
        base64: z.string(),
      }),
    ),
    audios: z.array(
      z.object({
        type: z.string(),
        base64: z.string(),
      }),
    ),
    images: z.array(
      z.object({
        type: z.string(),
        base64: z.string(),
      }),
    ),
  }),
  async (req, res) => {
    const { modelName, id, mode, prompt, images, videos, audios } = req.body;

    try {
      const vendorConfigData = await u.db("o_vendorConfig").where("id", id).first();

      if (!vendorConfigData) return res.status(500).send(error("未找到该供应商配置"));
      if (!vendorConfigData.models) return res.status(500).send(error("未找到模型列表"));
      const modelList = await u.vendor.getModelList(vendorConfigData.id!);

      const selectedModel = modelList.find((i: any) => i.modelName == modelName);
      if (!selectedModel) {
        return res.status(400).send(error(`未找到模型「${modelName}」，请刷新供应商模型列表后重试`));
      }

      let modeData = [];
      if (Array.isArray(mode)) {
      } else if (typeof mode === "string" && mode.startsWith('["') && mode.endsWith('"]')) {
        try {
          modeData = JSON.parse(mode);
        } catch (e) {}
      }
      const drm = selectedModel.durationResolutionMap?.[0];
      const reqFn = await u.Ai.Video(`${id}:${modelName}`).run({
        duration: drm?.duration?.[0] ?? 5,
        resolution: drm?.resolution?.[0] ?? "720p",
        aspectRatio: "16:9",
        prompt: prompt || "测试视频生成",
        referenceList: [...images, ...videos, ...audios],
        audio: typeof selectedModel.audio == "boolean" ? selectedModel.audio : true,
        mode: modeData.length > 0 ? modeData : mode,
      });
      await reqFn.save("test.mp4");
      const resultUrl = await u.oss.getFileUrl("test.mp4");
      res.status(200).send(success(resultUrl));
    } catch (err) {
      const msg = u.error(err).message;
      u.genLog({ vendorId: id, model: modelName, taskClass: "模型测试", phase: "video_test_failed", message: msg });
      res.status(500).send(error(msg));
    }
  },
);

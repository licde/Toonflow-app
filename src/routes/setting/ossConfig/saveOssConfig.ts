import express from "express";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { upsertOssSettings } from "@/utils/publicAssetUrl";
import { z } from "zod";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    ossStorageMode: z.enum(["local", "aliyun"]).optional(),
    ossPublicBaseUrl: z.string().optional(),
    aliyunOssEndpoint: z.string().optional(),
    aliyunOssBucket: z.string().optional(),
    aliyunOssAccessKeyId: z.string().optional(),
    aliyunOssAccessKeySecret: z.string().optional(),
  }),
  async (req, res) => {
    await upsertOssSettings(req.body);
    res.status(200).send(success("OSS 配置已保存，请重启应用使固定端口生效"));
  },
);

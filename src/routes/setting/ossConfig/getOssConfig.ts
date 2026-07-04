import express from "express";
import { success } from "@/lib/responseFormat";
import { getOssConfig } from "@/utils/publicAssetUrl";
const router = express.Router();

export default router.get("/", async (_req, res) => {
  const cfg = await getOssConfig();
  res.status(200).send(
    success({
      ossStorageMode: cfg.ossStorageMode,
      ossPublicBaseUrl: cfg.ossPublicBaseUrl,
      aliyunOssEndpoint: cfg.aliyunOssEndpoint,
      aliyunOssBucket: cfg.aliyunOssBucket,
      aliyunOssAccessKeyId: cfg.aliyunOssAccessKeyId,
      aliyunOssAccessKeySecret: cfg.aliyunOssAccessKeySecret ? "******" : "",
    }),
  );
});

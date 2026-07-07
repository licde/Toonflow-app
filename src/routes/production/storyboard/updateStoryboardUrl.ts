import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { id } from "zod/locales";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
    url: z.string(),
    flowId: z.number(),
  }),
  async (req, res) => {
    const { id, url, flowId } = req.body;
    const filePath = u.replaceUrl(url);
    const [imageId] = await u.db("o_image").insert({
      filePath,
      state: "已完成",
      storyboardId: id,
      type: "storyboard",
    });
    await u
      .db("o_storyboard")
      .where({ id })
      .update({
        filePath,
        flowId,
        imageId,
        state: "已完成",
        shouldGenerateImage: filePath ? 1 : 0,
      });
    res.status(200).send(success({ message: "更新分镜成功" }));
  },
);

import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    storyboardId: z.number(),
    imageId: z.number(),
  }),
  async (req, res) => {
    const { storyboardId, imageId } = req.body;
    const image = await u.db("o_image").where({ id: imageId, storyboardId }).first();
    if (!image?.filePath) return res.status(400).send({ code: 400, message: "图片不存在", data: null });

    await u.db("o_storyboard").where("id", storyboardId).update({
      imageId,
      filePath: image.filePath,
    });
    return res.status(200).send(success({ message: "已设为当前分镜图" }));
  },
);

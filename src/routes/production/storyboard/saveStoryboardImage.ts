import express from "express";
import u from "@/utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
    projectId: z.number(),
    scriptId: z.number(),
    base64: z.string().optional().nullable(),
    imageId: z.number().optional().nullable(),
  }),
  async (req, res) => {
    const { id, projectId, scriptId, base64, imageId } = req.body;

    if (base64) {
      const matches = base64.match(/^data:image\/\w+;base64,(.+)$/);
      const realBase64 = matches ? matches[1] : base64;
      const savePath = `/${projectId}/assets/${scriptId}/${uuidv4()}.jpg`;
      await u.oss.writeFile(savePath, Buffer.from(realBase64, "base64"));

      const [newImageId] = await u.db("o_image").insert({
        storyboardId: id,
        filePath: savePath,
        type: "storyboard",
        state: "已完成",
      });
      await u.db("o_storyboard").where("id", id).update({
        imageId: newImageId,
        filePath: savePath,
        state: "已完成",
        shouldGenerateImage: 1,
      });
    } else if (imageId) {
      const image = await u.db("o_image").where({ id: imageId, storyboardId: id }).first();
      if (!image?.filePath) return res.status(400).send({ code: 400, message: "图片不存在" });
      await u.db("o_storyboard").where("id", id).update({
        imageId,
        filePath: image.filePath,
        state: "已完成",
        shouldGenerateImage: 1,
      });
    }

    res.status(200).send(success({ message: "保存分镜图片成功" }));
  },
);

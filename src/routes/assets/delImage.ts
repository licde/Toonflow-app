import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
  }),
  async (req, res) => {
    const { id } = req.body;
    const image = await u.db("o_image").where("id", id).select("id", "filePath", "assetsId", "storyboardId").first();
    if (!image) return res.status(404).send({ code: 404, message: "图片不存在" });

    await u.db("o_assets").where({ imageId: id }).update({ imageId: null });
    await u.db("o_storyboard").where({ imageId: id }).update({ imageId: null, filePath: "" });
    await u.db("o_image").where({ id }).delete();
    if (image.filePath) await u.oss.deleteFile(image.filePath);

    res.status(200).send(success({ message: "图片删除成功" }));
  },
);

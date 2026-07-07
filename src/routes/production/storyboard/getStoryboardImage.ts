import express from "express";
import u from "@/utils";
import { success } from "@/lib/responseFormat";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

async function ensureStoryboardImageHistory(storyboardId: number) {
  const storyboard = await u.db("o_storyboard").where("id", storyboardId).select("id", "filePath", "imageId").first();
  if (!storyboard?.filePath) return storyboard;

  const existing = await u.db("o_image").where("storyboardId", storyboardId).count("id as count").first();
  if (Number((existing as { count?: number })?.count) > 0) return storyboard;

  const [imageId] = await u.db("o_image").insert({
    storyboardId,
    filePath: storyboard.filePath,
    type: "storyboard",
    state: "已完成",
  });
  await u.db("o_storyboard").where("id", storyboardId).update({ imageId });
  return { ...storyboard, imageId };
}

export default router.post(
  "/",
  validateFields({
    storyboardId: z.number(),
  }),
  async (req, res) => {
    const { storyboardId } = req.body;
    const storyboard = await ensureStoryboardImageHistory(storyboardId);
    if (!storyboard) return res.status(404).send({ code: 404, message: "分镜不存在" });

    const rawTempAssets = await u
      .db("o_image")
      .where("storyboardId", storyboardId)
      .select("id", "filePath", "storyboardId", "type", "state");

    const tempAssets = await Promise.all(
      rawTempAssets.map(async (item) => ({
        ...item,
        filePath: item.filePath ? await u.oss.getSmallImageUrl(item.filePath) : "",
        selected: storyboard.imageId != null && Number(item.id) === Number(storyboard.imageId),
      })),
    );

    res.status(200).send(
      success({
        id: storyboardId,
        imageId: storyboard.imageId ?? null,
        tempAssets,
      }),
    );
  },
);

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

// 获取生成图片（资产或分镜）
export default router.post(
  "/",
  validateFields({
    assetsId: z.number().optional(),
    storyboardId: z.number().optional(),
  }),
  async (req, res) => {
    const { assetsId, storyboardId } = req.body;

    if (storyboardId || (assetsId && !(await u.db("o_assets").where("id", assetsId).first()))) {
      const sid = storyboardId ?? assetsId!;
      const storyboard = await ensureStoryboardImageHistory(sid);
      if (!storyboard) return res.status(404).send({ code: 404, message: "分镜不存在" });

      const rawTempAssets = await u
        .db("o_image")
        .where("storyboardId", sid)
        .select("id", "filePath", "storyboardId", "type", "state");

      const tempAssets = await Promise.all(
        rawTempAssets.map(async (item) => ({
          ...item,
          filePath: item.filePath ? await u.oss.getSmallImageUrl(item.filePath) : "",
          selected: storyboard.imageId != null && Number(item.id) === Number(storyboard.imageId),
        })),
      );

      return res.status(200).send(
        success({
          id: sid,
          imageId: storyboard.imageId ?? null,
          tempAssets,
        }),
      );
    }

    const assets = await u.db("o_assets").where("id", assetsId).select("id", "imageId", "type").first();

    const rawTempAssets = await u.db("o_image").where("assetsId", assetsId).select("id", "filePath", "assetsId", "type", "state");

    const tempAssets = await Promise.all(
      rawTempAssets.map(async (item) => ({
        ...item,
        filePath: item.filePath ? await u.oss.getSmallImageUrl(item.filePath) : "",
        selected: assets?.imageId != null && Number(item.id) === Number(assets.imageId),
      })),
    );

    const data = {
      id: assets!.id,
      imageId: assets!.imageId ?? null,
      tempAssets,
    };
    res.status(200).send(success(data));
  },
);

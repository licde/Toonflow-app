import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { invalidateStoryboardsForAsset } from "@/ruleEngine/heal/applyStoryboardLifecycle";

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
    const [imageId] = await u.db("o_image").insert({
      filePath: u.replaceUrl(url),
      state: "已完成",
      assetsId: id,
    });
    await u.db("o_assets").where({ id }).update({ flowId, imageId });
    // Look change → invalidate linked storyboard stills
    const invalidated = await invalidateStoryboardsForAsset(u.db, id).catch(() => 0);
    res.status(200).send(success({ message: "更新提示词成功", invalidatedStoryboards: invalidated }));
  },
);

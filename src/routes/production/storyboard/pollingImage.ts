import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    ids: z.array(z.number()),
  }),
  async (req, res) => {
    const { ids } = req.body;
    const data = await u.db("o_storyboard").whereIn("id", ids).select("id", "state", "reason", "filePath", "prompt", "videoDesc", "videoPrompt", "generateStartTime", "createTime");
    const now = Date.now();
    const result = await Promise.all(
      data.map(async (item: any) => {
        const start = item.generateStartTime || item.createTime || now;
        return {
          ...item,
          elapsedMs: now - start,
          src: item.filePath ? await u.oss.getSmallImageUrl(item.filePath) : null,
        };
      }),
    );
    res.status(200).send(success(result));
  },
);

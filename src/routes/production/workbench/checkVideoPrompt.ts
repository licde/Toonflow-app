import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    trackIds: z.array(z.number()),
  }),
  async (req, res) => {
    const { projectId, scriptId, trackIds } = req.body;
    const promptList = await u
      .db("o_videoTrack")
      .where("projectId", projectId)
      .where("scriptId", scriptId)
      .whereIn("id", trackIds)
      // 需完善 = prompt landed but not burnable — poll must hydrate (≠ leave 生成中 forever)
      .whereIn("state", ["已完成", "生成失败", "需完善"])
      .select("id", "state", "reason", "prompt");
    const enriched = promptList.map((row) => {
      let burnAllowed: boolean | undefined;
      try {
        const r = typeof row.reason === "string" && row.reason.trim().startsWith("{") ? JSON.parse(row.reason) : null;
        if (r && typeof r.burnAllowed === "boolean") burnAllowed = r.burnAllowed;
      } catch {
        /* ignore */
      }
      if (row.state === "需完善") burnAllowed = false;
      if (row.state === "已完成" && burnAllowed === undefined) burnAllowed = true;
      return { ...row, burnAllowed };
    });
    res.status(200).send(success(enriched));
  },
);

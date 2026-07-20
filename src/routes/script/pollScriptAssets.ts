import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { extractJobKey, getExtractSummary } from "@/lib/extractSummaryStore";

const router = express.Router();

/** extractState: 0=提取中 1=成功 2=排队 -1=失败 */
export const EXTRACT_STATE = {
  running: 0,
  ok: 1,
  queued: 2,
  fail: -1,
} as const;

export default router.post(
  "/",
  validateFields({
    ids: z.array(z.number()),
    projectId: z.number().optional(),
  }),
  async (req, res) => {
    const { ids, projectId } = req.body;
    const rows = await u
      .db("o_script")
      .whereIn("id", ids)
      .select("id", "extractState", "errorReason", "projectId");

    const stillRunning = rows.filter((r) => r.extractState === EXTRACT_STATE.running || r.extractState === EXTRACT_STATE.queued);
    const done = rows.filter((r) => r.extractState !== EXTRACT_STATE.running && r.extractState !== EXTRACT_STATE.queued);

    let summary;
    if (projectId) {
      summary = getExtractSummary(extractJobKey(projectId, ids));
    }

    res.status(200).send(
      success({
        scripts: rows,
        pending: stillRunning.map((r) => r.id),
        completed: done.map((r) => r.id),
        summary,
        extractStateEnum: EXTRACT_STATE,
      }),
    );
  },
);

import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { classifyGenerationFailure } from "@/ruleEngine/bundle/generationFailureHelper";

const router = express.Router();

function parseFailureFeedback(reason: string | null | undefined, storyboardId: number, prompt?: string) {
  if (!reason) return undefined;
  try {
    const parsed = JSON.parse(reason);
    if (parsed?.feedback) return parsed.feedback;
    if (parsed?.message) return parsed;
  } catch {
    /* plain text reason */
  }
  return undefined;
}

export default router.post(
  "/",
  validateFields({
    ids: z.array(z.number()),
  }),
  async (req, res) => {
    const { ids } = req.body;
    const data = await u.db("o_storyboard").whereIn("id", ids).whereNot("state", "生成中").select("id", "state", "reason", "filePath", "prompt");
    const result = await Promise.all(
      data.map(async (item) => {
        const base = {
          ...item,
          src: item.filePath ? await u.oss.getSmallImageUrl(item.filePath) : null,
        };
        if (item.state === "生成失败" && item.reason && item.id != null) {
          let feedback = parseFailureFeedback(item.reason, item.id, item.prompt ?? undefined);
          if (!feedback) {
            feedback = await classifyGenerationFailure({
              modality: "image",
              shotId: String(item.id),
              error: item.reason,
              prompt: item.prompt ?? undefined,
            });
          }
          return { ...base, feedback, notify: true };
        }
        return base;
      }),
    );
    res.status(200).send(success(result));
  },
);

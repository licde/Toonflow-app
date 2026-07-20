/**
 * Batch compose still prompts (no image spend) — description fidelity write-back.
 */
import express from "express";
import u from "@/utils";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { batchComposeAndPersistStillPrompts } from "@/ruleEngine/compilers/persistStillPrompt";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    storyboardIds: z.array(z.number()).min(1),
    mode: z.enum(["full", "refine", "fidelity"]).optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, storyboardIds, mode } = req.body as {
        projectId: number;
        scriptId: number;
        storyboardIds: number[];
        mode?: "full" | "refine" | "fidelity";
      };
      const out = await batchComposeAndPersistStillPrompts(u.db, {
        projectId,
        scriptId,
        storyboardIds,
        mode: mode ?? "full",
      });
      const okCount = out.results.filter((r) => r.ok).length;
      const firstFail = out.results.find((r) => !r.ok);
      const failMsg =
        firstFail?.userMessage ||
        firstFail?.blockReason ||
        "未能补全提示词（请查看 results 明细）";
      return res.status(200).send(
        success({
          message: `已补全 ${okCount}/${out.results.length} 条分镜提示词`,
          results: out.results,
          userMessage: okCount
            ? `已按设计补全 ${okCount} 条可拍提示词（不耗生图额度）`
            : failMsg,
        }),
      );
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);

import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { executeStructuredGeneration } from "@/services/generationContext/Executor";
import taskRecord from "@/utils/taskRecord";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    storyboardIds: z.array(z.number()).optional(),
    phases: z.array(z.enum(["variants", "images", "videos", "assemble"])).optional(),
    tier: z.enum(["1K", "2K", "4K"]).optional(),
    audio: z.boolean().optional(),
    concurrency: z.number().min(1).max(10).optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, storyboardIds, phases, tier, audio, concurrency } = req.body;

    const done = await taskRecord(projectId, "结构化批量生成", "batchGenerateFromStructured", {
      describe: "五阶段结构化生成",
      content: { scriptId, phases },
    });

    res.status(200).send(success({ message: "批量生成已启动", scriptId }));

    try {
      const result = await executeStructuredGeneration({
        projectId,
        scriptId,
        storyboardIds,
        phases: phases ?? ["variants", "images", "videos"],
        tier: tier ?? "2K",
        audio,
        concurrency: concurrency ?? 3,
      });
      await done(1, JSON.stringify({ errors: result.errors.length, assemble: !!result.assembleResult }));
    } catch (e) {
      await done(-1, u.error(e).message);
    }
  },
);

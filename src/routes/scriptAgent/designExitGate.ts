import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { runDesignExitGate } from "@/ruleEngine/design/designExitGate";
import { syncPackIdAliases } from "@/ruleEngine/genre/loadGenreTemplatePack";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    stageId: z.string(),
    optimizeRound: z.number().optional(),
  }),
  async (req, res) => {
    const { projectId, stageId, optimizeRound } = req.body;
    const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
    let plan: Record<string, unknown> = {};
    if (row?.data) {
      try {
        plan = JSON.parse(row.data as string);
      } catch {
        plan = {};
      }
    }
    syncPackIdAliases(plan);
    const designExitGate = runDesignExitGate(stageId, plan, { optimizeRound });
    return res.status(200).send(
      success({
        designExitGate,
        cta: designExitGate.ok ? "进入下一阶段" : "本阶段优化",
        literaryHintFallbackOnly: true,
      }),
    );
  },
);

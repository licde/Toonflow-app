import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { runDesignExitGate } from "@/ruleEngine/design/designExitGate";
import { syncPackIdAliases, getGenreTemplateFromPlan } from "@/ruleEngine/genre/loadGenreTemplatePack";
import { healViralDesignRouter } from "@/ruleEngine/design/healViralDesignRouter";
import { setLiteraryLocked, isLiteraryLocked } from "@/ruleEngine/design/viralDoctrine";

const router = express.Router();

const STAGE_ALIASES: Record<string, string> = {
  W3: "W3",
  W3_script: "W3",
  W3_selfcheck: "W3",
  matrixConfirm: "P03",
  P03: "P03",
  P0: "P0",
  designBrief: "designBrief",
  GB: "GB",
  SB: "SB",
  AS: "AS",
  CD: "CD",
  W1: "W1",
  W2: "W2",
  G: "G",
  globalAnchors: "G",
  P06: "P06",
  storyCore: "P06",
};

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    stepId: z.string(),
    status: z.enum(["pending", "done", "blocked"]),
    acknowledgeWeakPath: z.boolean().optional(),
    optimizeRound: z.number().optional(),
    autoHeal: z.boolean().optional(),
    unlockLiterary: z.boolean().optional(),
  }),
  async (req, res) => {
    const {
      projectId,
      stepId,
      status,
      acknowledgeWeakPath,
      optimizeRound,
      autoHeal,
      unlockLiterary,
    } = req.body as {
      projectId: number;
      stepId: string;
      status: "pending" | "done" | "blocked";
      acknowledgeWeakPath?: boolean;
      optimizeRound?: number;
      autoHeal?: boolean;
      unlockLiterary?: boolean;
    };
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

    if (unlockLiterary) {
      setLiteraryLocked(plan, false);
    }

    const depth = getGenreTemplateFromPlan(plan).adaptationDepth || "viral";
    // viral depth: acknowledgeWeakPath cannot skip hard exit gates
    if (acknowledgeWeakPath && depth === "viral" && status === "done") {
      return res.status(400).send({
        code: 400,
        message: "viral 深度禁止 acknowledgeWeakPath 跳过设计硬闸",
        data: { forbidWeakPathSkip: true, cta: "本阶段优化或调 repair_viral_design" },
      });
    }

    let exitGate: ReturnType<typeof runDesignExitGate> | undefined;
    let healResult: ReturnType<typeof healViralDesignRouter> | undefined;
    const stageId = STAGE_ALIASES[stepId] || stepId;

    if (status === "done" && !acknowledgeWeakPath) {
      if (["P0", "P03", "P06", "W1", "W2", "W3", "designBrief", "GB", "SB", "AS", "CD", "G"].includes(stageId)) {
        exitGate = runDesignExitGate(stageId, plan, { optimizeRound });
        if (!exitGate.ok && autoHeal !== false && depth === "viral") {
          healResult = healViralDesignRouter(plan, stageId, { maxRounds: 1 });
          plan = healResult.plan;
          exitGate = healResult.exitGate ?? runDesignExitGate(stageId, plan, { optimizeRound });
        }
        if (!exitGate.ok) {
          return res.status(400).send({
            code: 400,
            message: exitGate.userMessage,
            data: {
              designExitGate: exitGate,
              heal: healResult
                ? {
                    rounds: healResult.rounds,
                    changeDiff: healResult.changeDiff,
                    needsUserConfirm: healResult.needsUserConfirm,
                    rollbackTo: healResult.rollbackTo,
                  }
                : undefined,
              cta: "本阶段优化",
              forbidProductionRework: true,
            },
          });
        }
        // W3 pass → literary lock
        if (stageId === "W3" && exitGate.ok && !isLiteraryLocked(plan)) {
          setLiteraryLocked(plan, true);
        }
      }
    }

    let stepStatus: Record<string, { status: string; completedAt?: number; weakPath?: boolean }> = {};
    try {
      stepStatus = JSON.parse(String(plan._stepStatus ?? "{}"));
    } catch {
      stepStatus = {};
    }
    stepStatus[stepId] = {
      status: acknowledgeWeakPath && status === "done" ? "done" : status,
      completedAt: status === "done" ? Date.now() : undefined,
      weakPath: Boolean(acknowledgeWeakPath),
    };
    plan._stepStatus = JSON.stringify(stepStatus);
    if (acknowledgeWeakPath) {
      const pd = (plan.planData as Record<string, unknown>) ?? {};
      pd.weakPathAudit = [
        ...((pd.weakPathAudit as unknown[]) ?? []),
        { stepId, at: Date.now(), reason: "acknowledgeWeakPath" },
      ].slice(-50);
      plan.planData = pd;
    }

    const payload = JSON.stringify(plan);
    if (row) {
      await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
    } else {
      await u.db("o_agentWorkData").insert({ projectId, key: "scriptAgent", data: payload, createTime: Date.now() });
    }
    return res.status(200).send(
      success({
        stepStatus,
        designExitGate: exitGate,
        literaryLocked: isLiteraryLocked(plan),
        healChangeDiff: healResult?.changeDiff,
      }),
    );
  },
);

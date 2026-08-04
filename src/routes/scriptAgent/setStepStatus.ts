import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { runDesignExitGate } from "@/ruleEngine/design/designExitGate";
import { syncPackIdAliases, getGenreTemplateFromPlan } from "@/ruleEngine/genre/loadGenreTemplatePack";
import { healViralDesignRouter } from "@/ruleEngine/design/healViralDesignRouter";
import { setLiteraryLocked, isLiteraryLocked } from "@/ruleEngine/design/viralDoctrine";
import {
  clearDebtAfterRedesignPass,
  isRedesignRequired,
  getKeepLegacyAck,
} from "@/ruleEngine/design/redesignContract";

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
    forceExpand: z.boolean().optional(),
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
      forceExpand,
    } = req.body as {
      projectId: number;
      stepId: string;
      status: "pending" | "done" | "blocked";
      acknowledgeWeakPath?: boolean;
      optimizeRound?: number;
      autoHeal?: boolean;
      unlockLiterary?: boolean;
      forceExpand?: boolean;
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
        exitGate = runDesignExitGate(stageId, plan, { optimizeRound, forceExpand: Boolean(forceExpand) });
        const litFailed =
          exitGate.failedIds.some((id) => /^DEX-LIT-|^DEX-PROP-CONT|IRD-CONFIRM/.test(id));
        // Viral full auto-heal; lit debt also auto-closes on SB even outside viral depth
        if (!exitGate.ok && autoHeal !== false && (depth === "viral" || (litFailed && stageId === "SB"))) {
          // High-confidence design auto-close first, then domain heal one round (viral only)
          try {
            const { runDesignAutoClose } =
              require("@/ruleEngine/design/designAutoClose") as typeof import("@/ruleEngine/design/designAutoClose");
            const ac = runDesignAutoClose(plan, {
              stageId,
              maxRounds: 1,
              failedIds: exitGate.failedIds,
              forceExpand: Boolean(forceExpand),
            });
            plan = ac.plan;
            exitGate = ac.exitGate;
          } catch {
            /* optional */
          }
          if (!exitGate.ok && depth === "viral") {
            healResult = healViralDesignRouter(plan, stageId, { maxRounds: 1 });
            plan = healResult.plan;
            exitGate =
              healResult.exitGate ??
              runDesignExitGate(stageId, plan, { optimizeRound, forceExpand: Boolean(forceExpand) });
          }
        }
        // W3: core redesignPass green while only LITERARY-STALE remains → clear debt and re-exit
        if (stageId === "W3" && exitGate && isRedesignRequired(plan)) {
          const debtClear = clearDebtAfterRedesignPass(plan, { exitGate });
          if (debtClear.cleared) {
            exitGate = runDesignExitGate(stageId, plan, { optimizeRound, forceExpand: Boolean(forceExpand) });
            try {
              const pd = (plan.planData as Record<string, unknown>) ?? {};
              const shots =
                ((pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ??
                  (plan.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ??
                  []) as Record<string, unknown>[];
              if (shots.length) {
                const { cascadeForwardStale } =
                  require("@/ruleEngine/quality/forwardStaleCascade") as typeof import("@/ruleEngine/quality/forwardStaleCascade");
                cascadeForwardStale({ shots, forwardStages: ["SB", "MD-IMG", "EN"] });
              }
            } catch {
              /* optional */
            }
          }
        }
        if (!exitGate.ok) {
          const { filterAuthorMustFixIds } =
            require("@/ruleEngine/exportGate") as typeof import("@/ruleEngine/exportGate");
          const mustFail = filterAuthorMustFixIds(exitGate.failedIds);
          const confirmResidual = exitGate.failedIds.some(
            (id) => id === "IRD-CONFIRM" || /CONFIRM/i.test(id),
          );
          // C-only residual：不 400，记台账继续写 step（设计≡智能愈）
          if (mustFail.length === 0 && !confirmResidual) {
            try {
              const metaSoft =
                ((plan.planData as { meta?: Record<string, unknown> } | undefined)?.meta ??
                  (plan.meta as Record<string, unknown> | undefined) ??
                  {}) as Record<string, unknown>;
              metaSoft.designExitIncomplete = true;
              metaSoft.laneSoftResidual = exitGate.failedIds;
              if (plan.planData) (plan.planData as { meta?: unknown }).meta = metaSoft;
              else plan.meta = metaSoft;
            } catch {
              /* optional */
            }
            // fall through to write stepStatus
          } else {
          const meta =
            ((plan.planData as { meta?: Record<string, unknown> } | undefined)?.meta ??
              (plan.meta as Record<string, unknown> | undefined) ??
              {}) as Record<string, unknown>;
          const litCta = String(meta.litDebtCta ?? "");
          const litAct = String(meta.litDebtPrimaryAction ?? "");
          // V5-10: stamp smartDesignProposals so RulePanel has Confirm surface
          let smartDesignProposals: unknown[] | undefined;
          try {
            const { stampSmartDesignProposals } =
              require("@/ruleEngine/design/smartProposalMerger") as typeof import("@/ruleEngine/design/smartProposalMerger");
            smartDesignProposals = stampSmartDesignProposals(plan as Record<string, unknown>, exitGate.failedIds, {
              reverseTarget: stageId,
            });
            const payloadStamp = JSON.stringify(plan);
            if (row) {
              await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payloadStamp, updateTime: Date.now() });
            }
          } catch {
            /* optional */
          }
          const isAuthorMust = mustFail.length > 0;
          return res.status(400).send({
            code: 400,
            message: exitGate.userMessage,
            data: {
              designExitGate: exitGate,
              smartDesignProposals,
              redesignRequired: isRedesignRequired(plan),
              heal: healResult
                ? {
                    rounds: healResult.rounds,
                    changeDiff: healResult.changeDiff,
                    needsUserConfirm: healResult.needsUserConfirm,
                    rollbackTo: healResult.rollbackTo,
                  }
                : undefined,
              litDebtPrimaryAction: litAct || undefined,
              litDebtCta: litCta || undefined,
              irdConfirmRequired: Boolean(meta.irdConfirmRequired || exitGate.failedIds.includes("IRD-CONFIRM")),
              cta: litCta
                ? litCta
                : isRedesignRequired(plan)
                  ? "请按新规范重设计至 W3 验收"
                  : !isAuthorMust && confirmResidual
                    ? "请 Confirm 智能拆/增强后再 setStepStatus"
                    : exitGate.failedIds.some((id) => /^DEX-LIT-|^DEX-PROP-CONT/.test(id))
                      ? "文学细节债：请批准增强互斥句或智能拆镜后再 setStepStatus"
                      : exitGate.userMessage
                        ? "按失败清单同轮重写 JSON 后再 setStepStatus（禁止只改 passed）"
                        : "本阶段优化",
              forbidProductionRework: true,
              chatRetryRequired: isAuthorMust,
              laneDiagnostics: {
                mustIds: mustFail,
                residual: exitGate.failedIds,
              },
            },
          });
          }
        }
        if (stageId === "W3" && exitGate.ok && !isLiteraryLocked(plan)) {
          setLiteraryLocked(plan, true);
        }
        // W1 = redesign entry only — never clearLiteraryStale here
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
        redesignRequired: isRedesignRequired(plan),
        keepLegacyAck: getKeepLegacyAck(plan) ?? null,
        healChangeDiff: healResult?.changeDiff,
        splitApplied: exitGate?.splitApplied,
        splitExpandedCount: exitGate?.splitExpandedCount,
        splitLog: exitGate?.splitLog,
      }),
    );
  },
);

/**
 * POST /api/scriptAgent/videoIntentOps — diagnose / apply / dryRun (video IRD).
 */
import express from "express";
import { success, error } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import {
  diagnoseVideoIntent,
  applyVideoIntentPatches,
} from "@/ruleEngine/design/videoIntentReverse";
import {
  applyCascadeAndReGate,
  syncShotsToStoryboardDb,
} from "@/ruleEngine/design/applyIntentWriteback";
import { buildSmartProposalsFromTriggers } from "@/ruleEngine/design/smartProposalMerger";

const router = express.Router();

async function loadPlan(projectId: number) {
  const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  const plan = row?.data ? JSON.parse(row.data) : {};
  return { row, plan };
}

async function savePlan(projectId: number, row: { id?: number } | undefined, plan: unknown) {
  const payload = JSON.stringify(plan);
  if (row?.id) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
  else await u.db("o_agentWorkData").insert({ projectId, key: "scriptAgent", data: payload, createTime: Date.now() });
}

function shotsFromPlan(plan: Record<string, unknown>): Record<string, unknown>[] {
  const pd = (plan.planData as Record<string, unknown>) ?? plan;
  const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] }) ?? {};
  return [...(pack.shots ?? [])];
}

function writeShots(plan: Record<string, unknown>, shots: Record<string, unknown>[]) {
  const pd = ((plan.planData as Record<string, unknown>) ??= {});
  const pack = ((pd.preDesignPack as Record<string, unknown>) ??= {});
  pack.shots = shots;
  pd.preDesignPack = pack;
  plan.planData = pd;
}

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    action: z.enum(["diagnose", "apply", "dryRun"]),
    shotIndex: z.number().optional(),
    patchIds: z.array(z.string()).optional(),
    forceApply: z.boolean().optional(),
    scriptId: z.number().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, action, shotIndex, patchIds, forceApply, scriptId } = req.body as {
        projectId: number;
        action: string;
        shotIndex?: number;
        patchIds?: string[];
        forceApply?: boolean;
        scriptId?: number;
      };
      const { row, plan } = await loadPlan(projectId);
      const shots = shotsFromPlan(plan as Record<string, unknown>);
      const diagnosed = diagnoseVideoIntent({ shots, shotIndex });

      if (action === "diagnose" || action === "dryRun") {
        // V5-10: auto-build smart proposals from video findings
        try {
          const triggers = diagnosed.findings
            .filter((f) => f.severity === "BLOCK" || f.severity === "WARN")
            .map((f) => ({
              trigger: f.id,
              reverseTarget: "EN",
              ruleId: f.id,
              reason: f.message,
              shotIndex: f.shotIndex,
            }));
          if (triggers.length) {
            const existing = Array.isArray((plan as { smartDesignProposals?: unknown[] }).smartDesignProposals)
              ? ((plan as { smartDesignProposals: import("@/ruleEngine/design/smartProposalMerger").SmartProposal[] })
                  .smartDesignProposals)
              : [];
            const built = buildSmartProposalsFromTriggers(triggers);
            const byT = new Set(existing.map((p) => p.trigger));
            const merged = [...existing, ...built.filter((b) => !byT.has(b.trigger))];
            (plan as { smartDesignProposals?: unknown }).smartDesignProposals = merged;
            await savePlan(projectId, row, plan);
          }
        } catch {
          /* optional */
        }
        return res.status(200).send(
          success({
            ...diagnosed,
            action,
            smartDesignProposals: (plan as { smartDesignProposals?: unknown }).smartDesignProposals,
            primaryNextStep: diagnosed.ok ? "burn" : "chat_repair",
            userMessage: diagnosed.ok
              ? "视频设计契约已过"
              : diagnosed.findings.map((f) => f.message).join("；"),
            ctaLabel: diagnosed.ctaLabel || (diagnosed.ok ? "继续" : "确认视频设计修复"),
          }),
        );
      }

      if (action === "apply") {
        const highConf = diagnosed.patches.filter((p) => (p.confidence ?? 0) >= 0.7);
        if (diagnosed.confirmRequired && !forceApply && !patchIds?.length && highConf.length === 0) {
          return res.status(400).send(
            error("视频设计债须 Confirm（传 forceApply 或 patchIds）", {
              code: "VID-IRD-CONFIRM",
              ...diagnosed,
              primaryNextStep: "chat_repair",
              ctaLabel: diagnosed.ctaLabel || "确认视频设计修复",
            }),
          );
        }
        const allowIds = patchIds?.length
          ? new Set(patchIds)
          : forceApply
            ? null
            : new Set(highConf.map((p) => p.id));
        const { shots: next, applied } = applyVideoIntentPatches({
          shots,
          patches: diagnosed.patches,
          patchIds: allowIds ? [...allowIds] : patchIds,
        });
        writeShots(plan as Record<string, unknown>, next);
        const wb = applyCascadeAndReGate({ plan: plan as Record<string, unknown>, shots: next });
        writeShots(plan as Record<string, unknown>, wb.shots);
        await savePlan(projectId, row, plan);
        let syncedStoryboard = false;
        if (scriptId && wb.shots.length) {
          syncedStoryboard = await syncShotsToStoryboardDb({
            db: u.db,
            projectId,
            scriptId,
            shots: wb.shots,
          });
        }
        const again = diagnoseVideoIntent({ shots: wb.shots, shotIndex });
        return res.status(200).send(
          success({
            applied,
            before: diagnosed,
            after: again,
            ok: again.ok && wb.designExitPass,
            exitGate: wb.exitGate,
            exitReassert: wb.exitGate,
            designExitPass: wb.designExitPass,
            cascade: wb.cascade,
            syncedStoryboard,
            primaryNextStep: again.ok && wb.designExitPass ? "burn" : "chat_repair",
            ctaLabel: again.ctaLabel,
            userMessage:
              again.ok && wb.designExitPass
                ? "视频设计债已清"
                : [...again.findings.map((f) => f.message), ...(wb.exitGate.failedIds.length ? [`exit:${wb.exitGate.failedIds.join(",")}`] : [])].join(
                    "；",
                  ),
          }),
        );
      }

      return res.status(400).send(error("unknown action"));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

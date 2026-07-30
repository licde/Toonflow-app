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
  }),
  async (req, res) => {
    try {
      const { projectId, action, shotIndex, patchIds, forceApply } = req.body as {
        projectId: number;
        action: string;
        shotIndex?: number;
        patchIds?: string[];
        forceApply?: boolean;
      };
      const { row, plan } = await loadPlan(projectId);
      const shots = shotsFromPlan(plan as Record<string, unknown>);
      const diagnosed = diagnoseVideoIntent({ shots, shotIndex });

      if (action === "diagnose" || action === "dryRun") {
        return res.status(200).send(
          success({
            ...diagnosed,
            action,
            primaryNextStep: diagnosed.ok ? "burn" : "chat_repair",
            userMessage: diagnosed.ok
              ? "视频设计契约已过"
              : diagnosed.findings.map((f) => f.message).join("；"),
            ctaLabel: diagnosed.ctaLabel || (diagnosed.ok ? "继续" : "确认视频设计修复"),
          }),
        );
      }

      if (action === "apply") {
        if (diagnosed.confirmRequired && !forceApply && !patchIds?.length) {
          return res.status(400).send(
            error("视频设计债须 Confirm（传 forceApply 或 patchIds）", {
              code: "VID-IRD-CONFIRM",
              ...diagnosed,
              primaryNextStep: "chat_repair",
              ctaLabel: diagnosed.ctaLabel || "确认视频设计修复",
            }),
          );
        }
        const { shots: next, applied } = applyVideoIntentPatches({
          shots,
          patches: diagnosed.patches,
          patchIds,
        });
        writeShots(plan as Record<string, unknown>, next);
        await savePlan(projectId, row, plan);
        const again = diagnoseVideoIntent({ shots: next, shotIndex });
        return res.status(200).send(
          success({
            applied,
            before: diagnosed,
            after: again,
            ok: again.ok,
            primaryNextStep: again.ok ? "burn" : "chat_repair",
            ctaLabel: again.ctaLabel,
            userMessage: again.ok ? "视频设计债已清" : again.findings.map((f) => f.message).join("；"),
          }),
        );
      }

      return res.status(400).send(error("unknown action"));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

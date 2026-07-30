/**
 * POST /api/scriptAgent/smartProposalOps
 * actions: list | build | confirm | reject | apply
 * Confirm → mergeConfirmedProposals → persist o_agentWorkData (W93 / IC-02).
 */
import express from "express";
import { success, error } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import {
  buildSmartProposalsFromTriggers,
  confirmSmartProposal,
  mergeConfirmedProposals,
  type SmartProposal,
} from "@/ruleEngine/design/smartProposalMerger";
import { cascadeForwardStale } from "@/ruleEngine/quality/forwardStaleCascade";

const router = express.Router();

async function loadPlan(projectId: number) {
  const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  const plan = row?.data ? JSON.parse(row.data) : {};
  return { row, plan: plan as Record<string, unknown> };
}

async function savePlan(projectId: number, row: { id?: number } | undefined, plan: unknown) {
  const payload = JSON.stringify(plan);
  if (row?.id) await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
  else await u.db("o_agentWorkData").insert({ projectId, key: "scriptAgent", data: payload, createTime: Date.now() });
}

function getProposals(plan: Record<string, unknown>): SmartProposal[] {
  const raw = plan.smartDesignProposals;
  return Array.isArray(raw) ? (raw as SmartProposal[]) : [];
}

function setProposals(plan: Record<string, unknown>, proposals: SmartProposal[]) {
  plan.smartDesignProposals = proposals;
  const pd = ((plan.planData as Record<string, unknown>) ??= {});
  pd.smartDesignProposals = proposals;
  plan.planData = pd;
}

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    action: z.enum(["list", "build", "confirm", "reject", "apply"]),
    proposalId: z.string().optional(),
    fork: z.string().optional(),
    triggers: z
      .array(
        z.object({
          trigger: z.string(),
          reverseTarget: z.string().optional(),
          ruleId: z.string().optional(),
          reason: z.string().optional(),
          shotIndex: z.number().optional(),
        }),
      )
      .optional(),
    scriptId: z.number().optional(),
  }),
  async (req, res) => {
    const { projectId, action, proposalId, fork, triggers } = req.body as {
      projectId: number;
      action: "list" | "build" | "confirm" | "reject" | "apply";
      proposalId?: string;
      fork?: string;
      triggers?: { trigger: string; reverseTarget?: string; ruleId?: string; reason?: string; shotIndex?: number }[];
    };

    const { row, plan } = await loadPlan(projectId);
    let proposals = getProposals(plan);

    if (action === "list") {
      return res.json(success({ proposals, pending: proposals.filter((p) => p.status === "pending_user_confirm").length }));
    }

    if (action === "build") {
      const built = buildSmartProposalsFromTriggers(triggers ?? []);
      const byTrigger = new Map(proposals.map((p) => [p.trigger, p]));
      for (const b of built) {
        if (!byTrigger.has(b.trigger)) proposals.push(b);
      }
      setProposals(plan, proposals);
      await savePlan(projectId, row, plan);
      return res.json(success({ proposals, built: built.length }));
    }

    if (action === "confirm" || action === "reject") {
      if (!proposalId) return res.status(400).json(error("proposalId required"));
      proposals = confirmSmartProposal(
        proposals,
        proposalId,
        action === "confirm" ? "confirmed" : "rejected",
        fork,
      );
      setProposals(plan, proposals);
      await savePlan(projectId, row, plan);
      return res.json(
        success({
          proposals,
          status: action === "confirm" ? "confirmed" : "rejected",
          note: action === "confirm" ? "已确认；调用 apply 才写镜字段" : "已拒绝",
        }),
      );
    }

    if (action === "apply") {
      // Apply all confirmed (or single id if provided)
      if (proposalId) {
        proposals = confirmSmartProposal(proposals, proposalId, "confirmed", fork);
      }
      const asBundle = plan as unknown as import("@/ruleEngine/bundle/types").ScriptBundle;
      const merged = mergeConfirmedProposals(asBundle, proposals);
      Object.assign(plan, merged.bundle);
      setProposals(plan, merged.proposals);

      // Cascade stale on shots after merge write
      try {
        const shots = (merged.bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
        if (shots.length) {
          const cascaded = cascadeForwardStale({ shots, forwardStages: ["SB", "MD-IMG", "EN"] });
          const pd = ((plan.planData as Record<string, unknown>) ??= {});
          const pack = ((pd.preDesignPack as Record<string, unknown>) ??= {});
          pack.shots = cascaded.shots;
          pd.preDesignPack = pack;
          plan.planData = pd;
        }
      } catch {
        /* optional cascade */
      }

      await savePlan(projectId, row, plan);

      return res.json(
        success({
          proposals: merged.proposals,
          merged: merged.merged,
          appliedIds: merged.appliedIds,
          fixPlanItems: merged.fixPlanItems,
          note: "confirmed proposals merged + persisted to o_agentWorkData; re-run designExit before export",
        }),
      );
    }

    return res.status(400).json(error("unknown action"));
  },
);

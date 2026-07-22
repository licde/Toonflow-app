import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { normalizeVisualBeatTags, defaultTagsFromPurpose } from "@/ruleEngine/design/visualBeatPolicy";
import { suggestVisualBeatTags } from "@/ruleEngine/design/visualBeatSuggestor";
import { runShotExpanders } from "@/ruleEngine/design/expanderRegistry";
import { setVisBeatOverrideOnShot, planForwardReentry } from "@/ruleEngine/design/visBeatLifecycle";
import { buildVisBeatDryRunPanel, exemplarSuggestTags } from "@/ruleEngine/design/visBeatEnhance";
import { runContractStructureHeal } from "@/ruleEngine/heal/contractStructureHeal";
import { preDesignShotsToPanels } from "@/ruleEngine/bundle/preDesignPackAdapter";
import { syncStoryboardToDb } from "@/ruleEngine/bundle/storyboardSync";
import type { PreDesignShot } from "@/ruleEngine/bundle/types";

const router = express.Router();

/** Simple per-project rate limit for confirm/split (P5 a11y/security). */
const rateBuckets = new Map<string, { n: number; resetAt: number }>();
function checkVisBeatRateLimit(projectId: number, action: string, maxPerMin = 30): boolean {
  if (!["confirmExpand", "proposeSplit", "setOverride"].includes(action)) return true;
  const key = `${projectId}:${action}`;
  const now = Date.now();
  let b = rateBuckets.get(key);
  if (!b || now > b.resetAt) {
    b = { n: 0, resetAt: now + 60_000 };
    rateBuckets.set(key, b);
  }
  b.n += 1;
  return b.n <= maxPerMin;
}

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

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    action: z.enum([
      "setTags",
      "suggestTags",
      "proposeSplit",
      "confirmExpand",
      "setOverride",
      "dryRunPanel",
      "forwardReentry",
    ]),
    shotIndex: z.number().optional(),
    visualBeatTags: z.array(z.string()).optional(),
    purpose: z.string().optional(),
    overrideReason: z.string().optional(),
    note: z.string().optional(),
    pillarsVisBeatV2: z.enum(["off", "shadow", "enforce"]).optional(),
    scriptId: z.number().optional(),
    syncStoryboard: z.boolean().optional(),
  }),
  async (req, res) => {
    const {
      projectId,
      action,
      shotIndex,
      visualBeatTags,
      purpose,
      overrideReason,
      note,
      pillarsVisBeatV2,
      scriptId,
      syncStoryboard,
    } = req.body as {
      projectId: number;
      action: string;
      shotIndex?: number;
      visualBeatTags?: string[];
      purpose?: string;
      overrideReason?: string;
      note?: string;
      pillarsVisBeatV2?: "off" | "shadow" | "enforce";
      scriptId?: number;
      syncStoryboard?: boolean;
    };

    if (!checkVisBeatRateLimit(projectId, action)) {
      return res.status(429).json({ message: "visBeatOps rate limit — retry after 60s" });
    }

    const { row, plan } = await loadPlan(projectId);
    const pd = (plan.planData ??= {}) as Record<string, unknown>;
    if (pillarsVisBeatV2) {
      pd.meta = { ...((pd.meta as object) ?? {}), pillarsVisBeatV2 };
    }
    const pack = (pd.preDesignPack ??= { shots: [] }) as { shots: Record<string, unknown>[] };
    const shots = pack.shots ?? [];

    if (action === "suggestTags") {
      const shot = shots.find((s) => Number(s.shotIndex) === shotIndex) ?? shots[0];
      const text = String(shot?.visualDescription ?? "");
      const sug = exemplarSuggestTags(text);
      const pattern = suggestVisualBeatTags({ text });
      return res.json(
        success({
          suggestedTags: [...new Set([...sug.suggestedTags, ...pattern.suggestedTags])],
          confidence: Math.max(sug.confidence, pattern.confidence),
          legislates: false,
        }),
      );
    }

    if (action === "setTags") {
      const idx = shots.findIndex((s) => Number(s.shotIndex) === shotIndex);
      if (idx < 0) return res.status(400).json({ message: "shot not found" });
      const tags =
        visualBeatTags?.length
          ? normalizeVisualBeatTags(visualBeatTags)
          : defaultTagsFromPurpose(purpose);
      shots[idx] = { ...shots[idx], visualBeatTags: tags, suggestedVisualBeatTags: undefined };
      pack.shots = shots;
      await savePlan(projectId, row, plan);
      return res.json(success({ shotIndex, visualBeatTags: tags }));
    }

    if (action === "setOverride") {
      const idx = shots.findIndex((s) => Number(s.shotIndex) === shotIndex);
      if (idx < 0) return res.status(400).json({ message: "shot not found" });
      shots[idx] = setVisBeatOverrideOnShot(shots[idx], {
        reason: overrideReason || "director_lock",
        at: new Date().toISOString(),
        note,
      });
      pack.shots = shots;
      await savePlan(projectId, row, plan);
      return res.json(success({ shotIndex, override: shots[idx].visBeatOverride }));
    }

    if (action === "confirmExpand" || action === "proposeSplit") {
      const meta = (pd.meta as Record<string, unknown>) ?? { pillarsVisBeatV2: "enforce" };
      const healed = runContractStructureHeal({
        plan,
        shots,
        applyClusters: true,
      });
      const forced = runShotExpanders(healed.shots as Record<string, unknown>[], {
        meta: { ...meta, pillarsVisBeatV2: meta.pillarsVisBeatV2 ?? "enforce" },
      });
      pack.shots = forced.shots;
      pd.preDesignPack = pack;
      let syncResult: unknown;
      if (syncStoryboard && scriptId) {
        const panels = preDesignShotsToPanels(forced.shots as PreDesignShot[], { enrichFromDesign: true });
        syncResult = await syncStoryboardToDb(u.db, projectId, scriptId, panels, { preserveMedia: true });
      }
      await savePlan(projectId, row, plan);
      return res.json(
        success({
          action,
          shotCount: forced.shots.length,
          log: forced.log,
          healPatches: healed.healSummary.patches,
          syncResult,
        }),
      );
    }

    if (action === "dryRunPanel") {
      return res.json(success({ panel: buildVisBeatDryRunPanel(shots, pd.meta as Record<string, unknown>) }));
    }

    if (action === "forwardReentry") {
      const planRe = planForwardReentry(shots);
      for (const s of shots) {
        const id = String(s.clientId ?? s.shotIndex ?? "");
        if (planRe.staleClientIds.includes(id)) {
          s.promptState = "stale";
          s.composeHash = undefined;
        }
      }
      pack.shots = shots;
      await savePlan(projectId, row, plan);
      return res.json(success(planRe));
    }

    return res.status(400).json({ message: `unknown action ${action}` });
  },
);

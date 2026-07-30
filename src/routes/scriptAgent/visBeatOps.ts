import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { normalizeVisualBeatTags, defaultTagsFromPurpose } from "@/ruleEngine/design/visualBeatPolicy";
import { suggestVisualBeatTags } from "@/ruleEngine/design/visualBeatSuggestor";
import { setVisBeatOverrideOnShot, planForwardReentry } from "@/ruleEngine/design/visBeatLifecycle";
import { buildVisBeatDryRunPanel, exemplarSuggestTags } from "@/ruleEngine/design/visBeatEnhance";
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
      // Delegate to IRD + SplitOrchestrator nucleus (no parallel expand write path)
      const meta = (pd.meta as Record<string, unknown>) ?? { pillarsVisBeatV2: "enforce" };
      const { runStillIntentHeal } =
        require("@/ruleEngine/design/stillIntentReverse") as typeof import("@/ruleEngine/design/stillIntentReverse");
      const { runSplitOrchestrator } =
        require("@/ruleEngine/design/splitOrchestrator") as typeof import("@/ruleEngine/design/splitOrchestrator");
      const { pushDesignSplitUndo, peekPackageVersion, runForwardReentryAfterRepair } =
        require("@/ruleEngine/design/designSplitLifecycle") as typeof import("@/ruleEngine/design/designSplitLifecycle");

      pushDesignSplitUndo(projectId, {
        planData: { ...pd },
        shots: [...shots],
        packageVersion: peekPackageVersion(shots),
      });

      const mini = {
        preDesignPack: { shots },
        planData: pd,
        meta,
      } as never;
      const ird = runStillIntentHeal(mini, {
        forceApply: action === "confirmExpand",
        meta,
        planData: pd,
      });
      let next = ird.shots;
      const orch = runSplitOrchestrator({
        planData: pd,
        shots: next,
        meta: { ...meta, pillarsVisBeatV2: meta.pillarsVisBeatV2 ?? "enforce" },
        applyVisBeatExpanders: true,
        applyClauseSplit: false,
      });
      next = orch.shots;
      Object.assign(pd, orch.planData);
      const re = runForwardReentryAfterRepair({
        planData: pd,
        shots: next,
        meta,
        applyVisBeatExpanders: false,
        applySemanticSplit: false,
        applyClauseSplit: false,
      });
      next = re.shots;
      pack.shots = next;
      pd.preDesignPack = pack;
      ((pd.meta as Record<string, unknown>) ?? (pd.meta = {})).irdProvenance = {
        appliedAt: new Date().toISOString(),
        via: "visBeatOps→IRD",
        patchIds: ird.applied,
      };
      (pd.meta as Record<string, unknown>).designExitRequiredAfterIrd = true;

      // Homology with stillIntentOps: force designExit after VisBeat expand
      let designExitGate: unknown;
      let designExitOk = true;
      try {
        const { runDesignAutoClose } =
          require("@/ruleEngine/design/designAutoClose") as typeof import("@/ruleEngine/design/designAutoClose");
        const ac = runDesignAutoClose(plan as never, { forceExpand: false });
        const nested = (plan as { preDesignPack?: { shots?: Record<string, unknown>[] } }).preDesignPack;
        if (nested?.shots?.length) {
          next = nested.shots;
          pack.shots = next;
          pd.preDesignPack = pack;
        }
        designExitGate = ac.exitGate;
        designExitOk = Boolean(ac.exitGate?.ok);
        (pd.meta as Record<string, unknown>).designExitRequiredAfterIrd = !designExitOk;
      } catch {
        try {
          const { runDesignExitGate } =
            require("@/ruleEngine/design/designExitGate") as typeof import("@/ruleEngine/design/designExitGate");
          const exit = runDesignExitGate("SB", plan, { forceExpand: false });
          designExitGate = exit;
          designExitOk = exit.ok;
          (pd.meta as Record<string, unknown>).designExitRequiredAfterIrd = !designExitOk;
        } catch {
          /* optional */
        }
      }

      let syncResult: unknown;
      if (syncStoryboard !== false && scriptId) {
        const panels = preDesignShotsToPanels(next as PreDesignShot[], { enrichFromDesign: true });
        try {
          syncResult = await syncStoryboardToDb(u.db, projectId, scriptId, panels, { preserveMedia: true });
        } catch (e) {
          return res.status(500).json({
            message: `IMPORT-SPLIT-SYNC: ${e instanceof Error ? e.message : e}`,
            code: "IMPORT-SPLIT-SYNC",
          });
        }
      }
      await savePlan(projectId, row, plan);
      return res.json(
        success({
          action,
          shotCount: next.length,
          irdApplied: ird.applied,
          irdRefused: ird.refused,
          log: orch.log,
          syncResult,
          designExitGate,
          designExitOk,
          designExitRequired: !designExitOk,
          a11yAnnounce: designExitOk
            ? "VisBeat 已委托 IRD 应用；designExit 已过"
            : "VisBeat 已委托 IRD 应用；designExit 未过绿，请继续智能设计/Confirm",
          forwardReentryRequired: !designExitOk,
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

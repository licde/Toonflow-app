/**
 * Design split Propose/Confirm/Undo/dryRun — parity with visBeatOps + SplitOrchestrator.
 */
import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { runSplitOrchestrator, dryRunSplitOrchestrator } from "@/ruleEngine/design/splitOrchestrator";
import { decideSplitForShot, decideSplitForLine } from "@/ruleEngine/design/designSplitDecision";
import {
  pushDesignSplitUndo,
  popDesignSplitUndo,
  peekPackageVersion,
  recordDesignSplitTelemetry,
  runForwardReentryAfterRepair,
} from "@/ruleEngine/design/designSplitLifecycle";
import { diagnoseNar, diagnoseDc01 } from "@/ruleEngine/design/gateDiagnose";
import { preDesignShotsToPanels } from "@/ruleEngine/bundle/preDesignPackAdapter";
import { syncStoryboardToDb } from "@/ruleEngine/bundle/storyboardSync";
import type { PreDesignShot } from "@/ruleEngine/bundle/types";

const router = express.Router();

const rateBuckets = new Map<string, { n: number; resetAt: number }>();
function checkDesignSplitRateLimit(projectId: number, action: string, maxPerMin = 30): boolean {
  if (!["confirmClusterSplit", "proposeClauseSplit", "undo", "forwardReentry"].includes(action)) return true;
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
      "proposeClauseSplit",
      "confirmClusterSplit",
      "dryRun",
      "undo",
      "forwardReentry",
      "decideLine",
    ]),
    lineId: z.string().optional(),
    text: z.string().optional(),
    packageVersion: z.number().optional(),
    scriptId: z.number().optional(),
    syncStoryboard: z.boolean().optional(),
    applyClauseSplit: z.boolean().optional(),
    applyVisBeatExpanders: z.boolean().optional(),
  }),
  async (req, res) => {
    const {
      projectId,
      action,
      lineId,
      text,
      packageVersion,
      scriptId,
      syncStoryboard,
      applyClauseSplit,
      applyVisBeatExpanders,
    } = req.body as {
      projectId: number;
      action: string;
      lineId?: string;
      text?: string;
      packageVersion?: number;
      scriptId?: number;
      syncStoryboard?: boolean;
      applyClauseSplit?: boolean;
      applyVisBeatExpanders?: boolean;
    };

    if (!checkDesignSplitRateLimit(projectId, action)) {
      return res.status(429).json({
        message: "designSplitOps rate limit — retry after 60s",
        a11yHint: "请稍候再确认拆镜；确认按钮请带 aria-busy",
      });
    }

    const { row, plan } = await loadPlan(projectId);
    const pd = (plan.planData ??= {}) as Record<string, unknown>;
    const pack = (pd.preDesignPack ??= { shots: [] }) as { shots: Record<string, unknown>[] };
    const shots = pack.shots ?? [];
    const meta = (pd.meta as Record<string, unknown>) ?? {};

    if (action === "decideLine") {
      const lines =
        ((pd.dialoguePlan as { lines?: { lineId?: string; text?: string; splitHint?: string; functions?: string[]; reactionAction?: string }[] })
          ?.lines ?? []) as {
          lineId?: string;
          text?: string;
          splitHint?: string;
          functions?: string[];
          reactionAction?: string;
        }[];
      const line = lineId ? lines.find((l) => l.lineId === lineId) : { text, functions: [] };
      const decision = decideSplitForLine(line ?? { text });
      return res.json(success({ decision, a11yLabel: `建议动作：${decision.action}` }));
    }

    if (action === "dryRun") {
      recordDesignSplitTelemetry("dry_run");
      const dry = dryRunSplitOrchestrator({ planData: pd, shots, meta });
      const proposals = shots.map((s) => decideSplitForShot(s, meta));
      return res.json(
        success({
          ...dry,
          proposals,
          a11ySummary: `预估台词行 ${dry.predictedPlanLineCount}，镜数 ${dry.predictedShotCount}，NAR 残留 ${dry.predictedNarFails.length}`,
        }),
      );
    }

    if (action === "proposeClauseSplit") {
      recordDesignSplitTelemetry("propose");
      const proposals = shots.map((s) => ({
        shotIndex: s.shotIndex,
        ...decideSplitForShot(s, meta),
      }));
      const dry = dryRunSplitOrchestrator({ planData: pd, shots, meta });
      return res.json(
        success({
          proposals,
          dryRun: dry,
          confirmRequired: true,
          a11yHint: "请确认后再落盘拆行；可撤销上一版",
        }),
      );
    }

    if (action === "confirmClusterSplit") {
      const curVer = peekPackageVersion(shots);
      if (packageVersion != null && packageVersion !== curVer) {
        return res.status(409).json({
          message: `packageVersion conflict: client=${packageVersion} server=${curVer}`,
        });
      }
      pushDesignSplitUndo(projectId, {
        packageVersion: curVer,
        planData: structuredClone(pd),
        shots: structuredClone(shots),
      });
      const orch = runSplitOrchestrator({
        planData: pd,
        shots,
        meta,
        applyClauseSplit: applyClauseSplit !== false,
        applyVisBeatExpanders: applyVisBeatExpanders !== false,
      });
      const dc = orch.dcFails ?? diagnoseDc01({ planData: orch.planData, shots: orch.shots });
      if (dc.length) {
        return res.status(400).json({
          message: `Confirm 后 DC-01 未清零，拒绝落盘：${dc
            .slice(0, 4)
            .map((d) => d.message ?? d.id)
            .join("; ")}`,
          dc01: dc,
          log: orch.log,
          narFails: orch.narFails,
          a11yAnnounce: "拆分后台词覆盖未齐，请补 lineId 或 forwardReentry 后再确认",
        });
      }
      Object.assign(pd, orch.planData);
      pack.shots = orch.shots;
      pd.preDesignPack = pack;
      let syncResult: unknown;
      if (syncStoryboard && scriptId) {
        const panels = preDesignShotsToPanels(orch.shots as PreDesignShot[], { enrichFromDesign: true });
        syncResult = await syncStoryboardToDb(u.db, projectId, scriptId, panels, { preserveMedia: true });
      }
      await savePlan(projectId, row, plan);
      recordDesignSplitTelemetry("confirm", `appended nar=${orch.narFails.length}`);
      return res.json(
        success({
          action,
          shotCount: orch.shots.length,
          packageVersion: peekPackageVersion(orch.shots),
          log: orch.log,
          narFails: orch.narFails,
          dc01: dc,
          syncResult,
          a11yAnnounce: `已确认拆分，共 ${orch.shots.length} 镜；请 forwardReentry`,
          forwardReentryRequired: true,
        }),
      );
    }

    if (action === "undo") {
      const snap = popDesignSplitUndo(projectId, packageVersion);
      if (!snap) {
        recordDesignSplitTelemetry("undo", "miss");
        return res.status(404).json({ message: "no undo snapshot (or packageVersion mismatch)" });
      }
      Object.assign(pd, snap.planData);
      pack.shots = snap.shots;
      pd.preDesignPack = pack;
      await savePlan(projectId, row, plan);
      recordDesignSplitTelemetry("undo", "ok");
      return res.json(
        success({
          restoredPackageVersion: snap.packageVersion,
          shotCount: snap.shots.length,
          a11yAnnounce: "已撤销上一版拆分",
        }),
      );
    }

    if (action === "forwardReentry") {
      const re = runForwardReentryAfterRepair({ planData: pd, shots, meta });
      Object.assign(pd, re.planData);
      pack.shots = re.shots;
      pd.preDesignPack = pack;
      let syncResult: unknown;
      if (syncStoryboard && scriptId) {
        const panels = preDesignShotsToPanels(re.shots as PreDesignShot[], { enrichFromDesign: true });
        syncResult = await syncStoryboardToDb(u.db, projectId, scriptId, panels, { preserveMedia: true });
      }
      await savePlan(projectId, row, plan);
      return res.json(success({ ...re.reentry, log: re.log, syncResult, narFails: diagnoseNar({ planData: pd, shots: re.shots }) }));
    }

    return res.status(400).json({ message: `unknown action ${action}` });
  },
);

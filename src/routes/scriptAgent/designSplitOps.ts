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
import { persistSplitTripleAtomic } from "@/ruleEngine/design/splitWritebackAtomic";
import { migrateStockLipPackage } from "@/ruleEngine/design/stockLipMigrate";

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
      "stockMigrate",
    ]),
    lineId: z.string().optional(),
    text: z.string().optional(),
    packageVersion: z.number().optional(),
    scriptId: z.number().optional(),
    syncStoryboard: z.boolean().optional(),
    applyClauseSplit: z.boolean().optional(),
    applyVisBeatExpanders: z.boolean().optional(),
    /** forwardReentry：默认禁语义扩；Confirm 后再拆传 true */
    forceExpand: z.boolean().optional(),
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
      forceExpand,
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
      forceExpand?: boolean;
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

    if (action === "stockMigrate") {
      if (!scriptId) {
        return res.status(400).json({ message: "stockMigrate requires scriptId for triple writeback" });
      }
      const mig = migrateStockLipPackage(plan);
      Object.assign(pd, (plan.planData as object) ?? {});
      pack.shots = ((plan.planData as { preDesignPack?: { shots?: typeof pack.shots } })?.preDesignPack?.shots ??
        pack.shots) as typeof pack.shots;
      pd.preDesignPack = pack;
      const wb = await persistSplitTripleAtomic({
        db: u.db,
        projectId,
        scriptId,
        plan,
        shots: pack.shots as Record<string, unknown>[],
        saveAgentWork: async (p) => savePlan(projectId, row, p),
        syncStoryboard: syncStoryboard !== false,
      });
      if (!wb.ok) {
        return res.status(500).json({
          message: wb.healFailed ?? "stock migrate writeback failed",
          code: wb.code,
          ...mig,
        });
      }
      return res.json(success({ ...mig, writeback: wb, a11yAnnounce: "存量口型债已迁移重拆" }));
    }

    if (action === "dryRun") {
      recordDesignSplitTelemetry("dry_run");
      const dry = dryRunSplitOrchestrator({ planData: pd, shots, meta });
      const proposals = shots.map((s) => decideSplitForShot(s, meta));
      return res.json(
        success({
          ...dry,
          proposals,
          confidence: dry.confidence,
          autoEligible: dry.autoEligible,
          a11ySummary: `预估台词行 ${dry.predictedPlanLineCount}，镜数 ${dry.predictedShotCount}，NAR 残留 ${dry.predictedNarFails.length}，置信 ${dry.confidence}`,
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
      // Homology with import: Confirm expand → continuity + egress slot heal
      try {
        const mini = {
          ...plan,
          planData: pd,
          preDesignPack: pack,
          meta: meta ?? {},
        } as import("@/ruleEngine/bundle/types").ScriptBundle;
        const { importDesignSlotHeal } =
          require("@/ruleEngine/design/importDesignSlotHeal") as typeof import("@/ruleEngine/design/importDesignSlotHeal");
        const healed = importDesignSlotHeal(mini);
        pack.shots = (mini.preDesignPack?.shots ?? pack.shots) as typeof pack.shots;
        pd.preDesignPack = pack;
        if (healed.summary.healed) {
          (meta as Record<string, unknown>).designSlotHealSummary = healed.summary as unknown as Record<
            string,
            unknown
          >;
        }
      } catch {
        /* optional */
      }
      try {
        const { pruneIntentGraphOnBundle } =
          require("@/ruleEngine/design/intentGraphPrune") as typeof import("@/ruleEngine/design/intentGraphPrune");
        pruneIntentGraphOnBundle({
          preDesignPack: pack,
          planData: pd,
          meta: meta as Record<string, unknown>,
        });
      } catch {
        /* optional */
      }
      try {
        const { reindexDerivedTables } =
          require("@/ruleEngine/bundle/reindexDerivedTables") as typeof import("@/ruleEngine/bundle/reindexDerivedTables");
        reindexDerivedTables({
          ...plan,
          planData: pd,
          preDesignPack: pack,
        } as never);
      } catch {
        /* optional */
      }
      // Confirm 后强制 designExit 重检（抬时已在 orchestrator；超限残留须继续 Confirm）
      let designExitGate: unknown;
      let designExitOk = true;
      try {
        const { runDesignAutoClose } =
          require("@/ruleEngine/design/designAutoClose") as typeof import("@/ruleEngine/design/designAutoClose");
        const ac = runDesignAutoClose(plan, { stageId: "SB", maxRounds: 1, forceExpand: false });
        Object.assign(pd, (ac.plan.planData as object) ?? {});
        const nested = (ac.plan.planData as { preDesignPack?: { shots?: unknown[] } } | undefined)?.preDesignPack;
        if (nested?.shots?.length) {
          pack.shots = nested.shots as typeof pack.shots;
          pd.preDesignPack = pack;
        }
        designExitGate = ac.exitGate;
        designExitOk = Boolean(ac.exitGate?.ok);
        (pd.meta as Record<string, unknown>) = {
          ...((pd.meta as object) ?? {}),
          designExitRequiredAfterIrd: !designExitOk,
        };
      } catch {
        try {
          const { runDesignExitGate } =
            require("@/ruleEngine/design/designExitGate") as typeof import("@/ruleEngine/design/designExitGate");
          const exit = runDesignExitGate("SB", plan, { forceExpand: false });
          designExitGate = exit;
          designExitOk = exit.ok;
        } catch {
          /* optional */
        }
      }
      let syncResult: unknown;
      const mustSync = Boolean(scriptId) && (syncStoryboard !== false);
      if (mustSync && scriptId) {
        const wb = await persistSplitTripleAtomic({
          db: u.db,
          projectId,
          scriptId,
          plan,
          shots: (pack.shots ?? orch.shots) as Record<string, unknown>[],
          saveAgentWork: async (p) => savePlan(projectId, row, p),
          syncStoryboard: true,
        });
        if (!wb.ok) {
          return res.status(500).json({
            message: `IMPORT-SPLIT-SYNC: ${wb.healFailed}`,
            code: wb.code ?? "IMPORT-SPLIT-SYNC",
          });
        }
        syncResult = wb.syncResult;
        pack.shots = ((plan.planData as { preDesignPack?: { shots?: typeof pack.shots } })?.preDesignPack
          ?.shots ?? pack.shots) as typeof pack.shots;
      } else {
        await savePlan(projectId, row, plan);
      }
      recordDesignSplitTelemetry("confirm", `appended nar=${orch.narFails.length}`);
      return res.json(
        success({
          action,
          shotCount: (pack.shots as unknown[])?.length ?? orch.shots.length,
          packageVersion: peekPackageVersion((pack.shots as Record<string, unknown>[]) ?? orch.shots),
          log: orch.log,
          narFails: orch.narFails,
          dc01: dc,
          syncResult,
          designExitGate,
          designExitOk,
          designExitRequired: !designExitOk,
          a11yAnnounce: designExitOk
            ? `已确认拆分，共 ${(pack.shots as unknown[])?.length ?? orch.shots.length} 镜；designExit 已过`
            : `已确认拆分；designExit 未过，请按失败清单继续修后 forwardReentry`,
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
      // 默认 mirror-only；forceExpand 才 residual B / lip / VisBeat（与 setStepStatus 同核）
      const allowSemantic = Boolean(forceExpand) || applyVisBeatExpanders === true;
      const re = runForwardReentryAfterRepair({
        planData: pd,
        shots,
        meta,
        applyClauseSplit: applyClauseSplit !== false,
        applyVisBeatExpanders: allowSemantic,
        applySemanticSplit: allowSemantic,
      });
      Object.assign(pd, re.planData);
      pack.shots = re.shots;
      pd.preDesignPack = pack;
      let syncResult: unknown;
      const mustSync = Boolean(scriptId) && (syncStoryboard !== false);
      if (mustSync && scriptId) {
        const wb = await persistSplitTripleAtomic({
          db: u.db,
          projectId,
          scriptId,
          plan,
          shots: re.shots as Record<string, unknown>[],
          saveAgentWork: async (p) => savePlan(projectId, row, p),
          syncStoryboard: true,
        });
        if (!wb.ok) {
          return res.status(500).json({
            message: `IMPORT-SPLIT-SYNC: ${wb.healFailed}`,
            code: wb.code ?? "IMPORT-SPLIT-SYNC",
          });
        }
        syncResult = wb.syncResult;
      } else {
        await savePlan(projectId, row, plan);
      }
      return res.json(
        success({
          ...re.reentry,
          log: re.log,
          syncResult,
          semanticExpand: allowSemantic,
          narFails: diagnoseNar({ planData: pd, shots: re.shots }),
        }),
      );
    }

    return res.status(400).json({ message: `unknown action ${action}` });
  },
);

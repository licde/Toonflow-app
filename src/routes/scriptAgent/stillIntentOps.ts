/**
 * Still Intent Ops — diagnose / apply / undo / dryRun (IRD FE/BE contract).
 */
import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import {
  diagnoseStillIntent,
  applyStillIntentPatches,
  type IrdDiagnoseResult,
} from "@/ruleEngine/design/stillIntentReverse";
import {
  pushDesignSplitUndo,
  popDesignSplitUndo,
  peekPackageVersion,
  runForwardReentryAfterRepair,
} from "@/ruleEngine/design/designSplitLifecycle";
import { runSplitOrchestrator } from "@/ruleEngine/design/splitOrchestrator";
import { preDesignShotsToPanels } from "@/ruleEngine/bundle/preDesignPackAdapter";
import { syncStoryboardToDb } from "@/ruleEngine/bundle/storyboardSync";
import type { PreDesignShot } from "@/ruleEngine/bundle/types";
import { getShotDesignIntentsFromPlan } from "@/ruleEngine/design/shotDesignIntent";
import { isLiteraryLocked } from "@/ruleEngine/design/viralDoctrine";

const router = express.Router();

const rateBuckets = new Map<string, { n: number; resetAt: number }>();
function checkRate(projectId: number, action: string, maxPerMin = 30): boolean {
  if (!["apply", "undo", "diagnose"].includes(action)) return true;
  const key = `${projectId}:ird:${action}`;
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
    action: z.enum(["diagnose", "apply", "undo", "dryRun", "suggestFill", "applyFill", "applyEnhance"]),
    packageVersion: z.number().optional(),
    scriptId: z.number().optional(),
    syncStoryboard: z.boolean().optional(),
    patchIds: z.array(z.string()).optional(),
    forceApply: z.boolean().optional(),
    shotIndex: z.number().optional(),
    literaryDetailLlmFill: z.boolean().optional(),
    intentVisualEnhance: z.boolean().optional(),
    importTrack: z.boolean().optional(),
    confidence: z.number().optional(),
    fills: z
      .array(z.object({ shotIndex: z.number(), append: z.string() }))
      .optional(),
  }),
  async (req, res) => {
    const {
      projectId,
      action,
      packageVersion,
      scriptId,
      syncStoryboard,
      patchIds,
      forceApply,
      shotIndex,
      literaryDetailLlmFill,
      intentVisualEnhance,
      importTrack,
      confidence,
      fills,
    } = req.body as {
      projectId: number;
      action: string;
      packageVersion?: number;
      scriptId?: number;
      syncStoryboard?: boolean;
      patchIds?: string[];
      forceApply?: boolean;
      shotIndex?: number;
      literaryDetailLlmFill?: boolean;
      intentVisualEnhance?: boolean;
      importTrack?: boolean;
      confidence?: number;
      fills?: Array<{ shotIndex: number; append: string }>;
    };

    if (
      !checkRate(
        projectId,
        action === "applyFill" || action === "applyEnhance"
          ? "apply"
          : action === "suggestFill"
            ? "diagnose"
            : action,
      )
    ) {
      return res.status(429).json({ message: "stillIntentOps rate limit — retry after 60s" });
    }

    const { row, plan } = await loadPlan(projectId);
    const pd = (plan.planData as Record<string, unknown>) ?? plan;
    const meta = (pd.meta as Record<string, unknown>) ?? {};
    const chatStrict = Boolean((plan as { chatStrict?: boolean }).chatStrict ?? meta.chatStrict);
    const literaryLocked = (() => {
      try {
        return isLiteraryLocked(plan as never);
      } catch {
        return Boolean(meta.literaryLocked);
      }
    })();
    const isImport =
      importTrack ??
      Boolean(meta.importTrack || meta.importOkNotExitPass || (plan as { importTrack?: boolean }).importTrack);
    let shots = shotsFromPlan(plan);
    if (shotIndex != null) shots = shots.filter((s) => Number(s.shotIndex) === shotIndex);

    const intents = getShotDesignIntentsFromPlan(plan as Record<string, unknown>);

    if (action === "diagnose" || action === "dryRun") {
      const diagnose = diagnoseStillIntent(shotsFromPlan(plan), {
        chatStrict,
        literaryLocked,
        meta,
        planData: pd,
        intents,
      });
      // V5-10: auto-build smartDesignProposals for RulePanel when debt present
      let smartDesignProposals: unknown[] | undefined;
      try {
        const codes = diagnose.irdProvenance?.codes ?? [];
        if (codes.length || !diagnose.ok) {
          const { stampSmartDesignProposals } =
            require("@/ruleEngine/design/smartProposalMerger") as typeof import("@/ruleEngine/design/smartProposalMerger");
          const failed =
            codes.length > 0
              ? codes
              : diagnose.primaryAction && diagnose.primaryAction !== "none"
                ? [String(diagnose.primaryAction)]
                : ["IRD-CONFIRM"];
          smartDesignProposals = stampSmartDesignProposals(plan as Record<string, unknown>, failed, {
            reverseTarget: "SB",
            reasons: Object.fromEntries(
              failed.map((id) => [id, diagnose.ctaLabel || `静帧意图：${diagnose.primaryAction}`]),
            ),
          });
          pd.smartDesignProposals = smartDesignProposals;
          plan.planData = pd;
          (plan as { smartDesignProposals?: unknown }).smartDesignProposals = smartDesignProposals;
          if (action === "diagnose") await savePlan(projectId, row, plan);
        }
      } catch {
        /* optional stamp */
      }
      return res.json(
        success({
          action,
          ...diagnose,
          smartDesignProposals,
          packageVersion: peekPackageVersion(shotsFromPlan(plan)),
          a11yAnnounce:
            diagnose.primaryAction === "presentation_fork"
              ? "请选择修复路径：改叙事或改镜级构图，禁止空跳手改"
              : diagnose.primaryAction === "confirm_enhance" || diagnose.primaryAction === "apply_auto_enhance"
              ? `可增强描写，缺槽：${(diagnose.missingSlots ?? []).slice(0, 4).join("、") || "结构"}`
              : diagnose.primaryAction === "hand_edit_vd" && (diagnose.missingSlots?.length ?? 0) > 0
                ? `须手改描写，缺槽：${diagnose.missingSlots!.slice(0, 4).join("、")}`
                : diagnose.confirmRequired
                  ? "需确认智能反推补丁后再应用"
                  : diagnose.ok
                    ? "静帧意图诊断通过"
                    : "存在可应用设计补丁",
        }),
      );
    }

    if (action === "suggestFill") {
      const { buildLitFillSuggestions } =
        require("@/ruleEngine/design/literaryDetailLlmFill") as typeof import("@/ruleEngine/design/literaryDetailLlmFill");
      const sug = buildLitFillSuggestions({
        shots: shotsFromPlan(plan),
        shotIndex,
        literaryDetailLlmFill:
          literaryDetailLlmFill ?? Boolean((meta as { literaryDetailLlmFill?: boolean }).literaryDetailLlmFill),
        intentVisualEnhance:
          intentVisualEnhance ?? Boolean((meta as { intentVisualEnhance?: boolean }).intentVisualEnhance),
        chatStrict,
        literaryLocked,
        importTrack: isImport,
        confidence,
        meta,
      });
      return res.json(
        success({
          action: "suggestFill",
          ...sug,
          a11yAnnounce: sug.enabled ? "已生成文学细节增强建议（须 Confirm）" : "增强补填未开启",
        }),
      );
    }

    const runEnhanceApply = async (act: string) => {
      if (chatStrict && !forceApply) {
        return res.status(400).json({
          message: "chatStrict: applyEnhance/applyFill 须 Confirm/forceApply",
          code: "IRD-CHAT-STRICT",
        });
      }
      {
        const curVer = peekPackageVersion(shotsFromPlan(plan));
        if (packageVersion != null && packageVersion !== curVer) {
          return res.status(409).json({
            message: `packageVersion conflict: client=${packageVersion} server=${curVer}`,
            code: "IRD-PKG-VERSION",
            packageVersion: curVer,
          });
        }
      }
      if (literaryLocked && !forceApply) {
        const { buildLitFillSuggestions } =
          require("@/ruleEngine/design/literaryDetailLlmFill") as typeof import("@/ruleEngine/design/literaryDetailLlmFill");
        const sugPreview = buildLitFillSuggestions({
          shots: shotsFromPlan(plan),
          shotIndex,
          literaryDetailLlmFill: literaryDetailLlmFill ?? Boolean((meta as { literaryDetailLlmFill?: boolean }).literaryDetailLlmFill),
          intentVisualEnhance: intentVisualEnhance ?? Boolean((meta as { intentVisualEnhance?: boolean }).intentVisualEnhance),
          chatStrict,
          literaryLocked: true,
          importTrack: isImport,
          confidence,
          meta,
        });
        meta.litEnhanceLockedPending = sugPreview.suggestions.length > 0;
        meta.irdLiteraryLocked = true;
        pd.meta = meta;
        plan.planData = pd;
        await savePlan(projectId, row, plan);
        return res.status(400).json({
          message: "literaryLocked: 禁静默增强改 VD；可 Confirm/forceApply 或仅写 sidecar 元数据",
          code: "IRD-LITERARY-LOCKED",
          ok: false,
          primaryAction: "confirm_enhance",
          suggestions: sugPreview.suggestions,
          refused: ["literaryLocked"],
        });
      }
      const { applyLitFillToShots, buildLitFillSuggestions } =
        require("@/ruleEngine/design/literaryDetailLlmFill") as typeof import("@/ruleEngine/design/literaryDetailLlmFill");
      const flag =
        literaryDetailLlmFill ?? Boolean((meta as { literaryDetailLlmFill?: boolean }).literaryDetailLlmFill);
      const woundFlag =
        intentVisualEnhance ?? Boolean((meta as { intentVisualEnhance?: boolean }).intentVisualEnhance ?? true);
      const fullShots = shotsFromPlan(plan);
      pushDesignSplitUndo(projectId, {
        planData: { ...pd },
        shots: fullShots,
        packageVersion: peekPackageVersion(fullShots),
      });
      let fillList = fills ?? [];
      if (!fillList.length) {
        const sug = buildLitFillSuggestions({
          shots: fullShots,
          shotIndex,
          literaryDetailLlmFill: flag || act === "applyEnhance",
          intentVisualEnhance: woundFlag,
          chatStrict,
          literaryLocked,
          importTrack: isImport,
          confidence,
          meta,
        });
        fillList = sug.suggestions.map((s) => ({
          shotIndex: s.shotIndex,
          append: s.suggestedAppend,
        }));
      }
      const applied = applyLitFillToShots({
        shots: fullShots,
        fills: fillList,
        chatStrict,
        literaryLocked,
        forceApply,
        literaryDetailLlmFill: flag || act === "applyEnhance",
        intentVisualEnhance: woundFlag,
        importTrack: isImport,
        confidence: confidence ?? (forceApply ? 1 : undefined),
        meta,
      });
      writeShots(plan, applied.shots);
      try {
        const { bumpPackageVersionOnShots } =
          require("@/ruleEngine/design/designSplitLifecycle") as typeof import("@/ruleEngine/design/designSplitLifecycle");
        bumpPackageVersionOnShots(
          applied.shots,
          applied.applied?.length ? applied.applied : fillList.map((f) => f.shotIndex),
        );
      } catch {
        /* optional */
      }
      try {
        const { regenerateModalityPromptsAfterDesign } =
          require("@/ruleEngine/design/modalityPromptRegen") as typeof import("@/ruleEngine/design/modalityPromptRegen");
        regenerateModalityPromptsAfterDesign({ shots: applied.shots, forceAll: true });
      } catch {
        /* optional */
      }
      try {
        const pdMeta = (pd.meta as Record<string, unknown>) ?? {};
        const re = runForwardReentryAfterRepair({
          planData: pd,
          shots: applied.shots,
          meta: pdMeta,
        });
        if (re?.shots) writeShots(plan, re.shots as never);
        else {
          const { cascadeForwardStale } =
            require("@/ruleEngine/quality/forwardStaleCascade") as typeof import("@/ruleEngine/quality/forwardStaleCascade");
          const { runCascadeWhenIdle } =
            require("@/ruleEngine/design/genInflightGuard") as typeof import("@/ruleEngine/design/genInflightGuard");
          runCascadeWhenIdle(projectId, () => {
            cascadeForwardStale({
              shots: applied.shots,
              forwardStages: ["SB", "MD-IMG", "EN", "MD-VID"],
            });
          });
        }
      } catch {
        try {
          const { cascadeForwardStale } =
            require("@/ruleEngine/quality/forwardStaleCascade") as typeof import("@/ruleEngine/quality/forwardStaleCascade");
          cascadeForwardStale({
            shots: applied.shots,
            forwardStages: ["SB", "MD-IMG", "EN", "MD-VID"],
          });
        } catch {
          /* optional */
        }
      }
      // bump enhance↔split thrash counter
      const thrash = Number(meta.litEnhanceSplitThrash ?? 0) + (applied.applied.length ? 1 : 0);
      meta.litEnhanceSplitThrash = thrash;
      if (thrash >= 3 && !forceApply) {
        meta.litEnhanceForceHandEdit = true;
      }
      pd.meta = meta;
      plan.planData = pd;
      await savePlan(projectId, row, plan);

      let exitReassert: unknown;
      let designExitOk = true;
      try {
        const { runDesignExitGate } =
          require("@/ruleEngine/design/designExitGate") as typeof import("@/ruleEngine/design/designExitGate");
        exitReassert = runDesignExitGate("SB", plan as Record<string, unknown>, {
          chatStrict,
          forceExpand: false,
        });
        designExitOk = Boolean((exitReassert as { ok?: boolean })?.ok);
      } catch {
        /* optional */
      }

      let syncResult: unknown;
      if (syncStoryboard !== false && scriptId) {
        try {
          const panels = preDesignShotsToPanels(applied.shots as PreDesignShot[], { enrichFromDesign: true });
          syncResult = await syncStoryboardToDb(u.db, projectId, scriptId, panels, { preserveMedia: true });
        } catch {
          /* best-effort */
        }
      }

      return res.json(
        success({
          action: act,
          applied: applied.applied,
          refused: applied.refused,
          ok: applied.applied.length > 0 && applied.ok && designExitOk,
          literaryLocked,
          code: applied.applied.length === 0 && applied.refused.includes("literaryLocked")
            ? "IRD-LITERARY-LOCKED"
            : applied.applied.length === 0
              ? "IRD-NO-APPLY"
              : undefined,
          demoted: applied.demoted,
          importOkNotExitPass: Boolean(isImport && applied.ok),
          packageVersion: peekPackageVersion(applied.shots),
          exitReassert,
          exitGate: exitReassert,
          designExitPass: designExitOk,
          designExitRequired: !designExitOk,
          syncResult,
          forceHandEdit: Boolean(meta.litEnhanceForceHandEdit),
          a11yAnnounce: designExitOk
            ? `已应用增强；designExit 已过`
            : `已应用增强；designExit 未过绿`,
        }),
      );
    };

    if (action === "applyFill" || action === "applyEnhance") {
      return runEnhanceApply(action);
    }

    if (action === "undo") {
      const snap = popDesignSplitUndo(projectId, packageVersion);
      if (!snap) {
        return res.status(404).json({ message: "no IRD/undo snapshot (or packageVersion mismatch)" });
      }
      Object.assign(pd, snap.planData);
      writeShots(plan, snap.shots);
      let syncResult: unknown;
      if (syncStoryboard !== false && scriptId) {
        try {
          const panels = preDesignShotsToPanels(snap.shots as PreDesignShot[], { enrichFromDesign: true });
          syncResult = await syncStoryboardToDb(u.db, projectId, scriptId, panels, { preserveMedia: true });
        } catch (e) {
          return res.status(500).json({
            message: `IMPORT-SPLIT-SYNC: ${e instanceof Error ? e.message : e}`,
            code: "IMPORT-SPLIT-SYNC",
          });
        }
      }
      await savePlan(projectId, row, plan);
      // P1e: undo restores snapshot only — never forge designExitPass / hq_ok
      let postUndoDiagnose: unknown;
      try {
        postUndoDiagnose = diagnoseStillIntent(shotsFromPlan(plan), {
          chatStrict: true,
          intents,
          meta: (pd.meta as Record<string, unknown>) ?? {},
          planData: pd,
        });
      } catch {
        /* optional */
      }
      return res.json(
        success({
          action: "undo",
          shotCount: snap.shots.length,
          syncResult,
          a11yAnnounce: "已撤销上一版 IRD/拆镜",
          designExitPass: false,
          forgedPass: false,
          diagnose: postUndoDiagnose,
        }),
      );
    }

    if (action === "apply") {
      if (chatStrict && !forceApply) {
        const diagnose = diagnoseStillIntent(shotsFromPlan(plan), { chatStrict: true, intents, meta, planData: pd });
        return res.status(400).json({
          message: "chatStrict: IRD apply 仅提案；传 forceApply 或关闭 chatStrict",
          code: "IRD-CHAT-STRICT",
          diagnose,
        });
      }
      if (literaryLocked && !forceApply) {
        return res.status(400).json({
          message: "literaryLocked: 禁静默改文学 VD；请 Confirm/解锁",
          code: "IRD-LITERARY-LOCKED",
        });
      }

      const fullShots = shotsFromPlan(plan);
      pushDesignSplitUndo(projectId, { planData: { ...pd }, shots: fullShots, packageVersion: peekPackageVersion(fullShots) });

      const diagnose: IrdDiagnoseResult = diagnoseStillIntent(fullShots, {
        chatStrict,
        literaryLocked,
        meta,
        planData: pd,
        intents,
      });
      const applied = applyStillIntentPatches(fullShots, diagnose, {
        chatStrict,
        literaryLocked,
        forceApply,
        patchIds,
        meta,
        planData: pd,
        intents,
      });

      let nextShots = applied.shots;
      if (applied.applied.some((id) => /split/.test(id))) {
        const orch = runSplitOrchestrator({
          planData: pd,
          shots: nextShots,
          meta,
          applyVisBeatExpanders: false,
          applyClauseSplit: false,
        });
        nextShots = orch.shots;
        Object.assign(pd, orch.planData);
      }

      const re = runForwardReentryAfterRepair({ planData: pd, shots: nextShots, meta });
      Object.assign(pd, re.planData);
      nextShots = re.shots;
      writeShots(plan, nextShots);

      // Confirm / apply 同核：cam-fit untilClear（高置信拆净；残留 IRD-CONFIRM）
      let camFit: { applied: number; remainingMustSplit: number; confirmRequired: boolean } | undefined;
      try {
        const { runCamFitUntilClear } =
          require("@/ruleEngine/export/camFitHygiene") as typeof import("@/ruleEngine/export/camFitHygiene");
        const mini = {
          preDesignPack: { shots: nextShots },
          planData: pd,
          characterDesign: (plan as { characterDesign?: unknown }).characterDesign,
          meta: pd.meta as Record<string, unknown>,
        } as never;
        camFit = runCamFitUntilClear(mini, { chatStrict: false, maxRounds: 5 });
        nextShots =
          ((mini as { preDesignPack?: { shots?: Record<string, unknown>[] } }).preDesignPack?.shots ??
            nextShots) as Record<string, unknown>[];
        writeShots(plan, nextShots);
        if (camFit.confirmRequired) {
          (pd.meta as Record<string, unknown>).irdConfirmRequired = true;
        }
      } catch {
        /* optional */
      }

      ((pd.meta as Record<string, unknown>) ?? (pd.meta = {})).irdProvenance = applied.irdProvenance;
      (pd.meta as Record<string, unknown>).importOkNotExitPass = true;
      (pd.meta as Record<string, unknown>).designExitRequiredAfterIrd = true;

      let syncResult: unknown;
      if (syncStoryboard !== false && scriptId) {
        try {
          const panels = preDesignShotsToPanels(nextShots as PreDesignShot[], { enrichFromDesign: true });
          syncResult = await syncStoryboardToDb(u.db, projectId, scriptId, panels, { preserveMedia: true });
        } catch (e) {
          return res.status(500).json({
            message: `IMPORT-SPLIT-SYNC: ${e instanceof Error ? e.message : e}`,
            code: "IMPORT-SPLIT-SYNC",
          });
        }
      }

      // Homology with designSplitOps: force designExit recheck after IRD apply
      let designExitGate: unknown;
      let designExitOk = true;
      try {
        const { runDesignAutoClose } =
          require("@/ruleEngine/design/designAutoClose") as typeof import("@/ruleEngine/design/designAutoClose");
        const ac = runDesignAutoClose(plan as never, { forceExpand: false });
        const nested = (plan as { preDesignPack?: { shots?: Record<string, unknown>[] } }).preDesignPack;
        if (nested?.shots?.length) {
          nextShots = nested.shots;
          writeShots(plan, nextShots);
          pd.preDesignPack = nested as typeof pd.preDesignPack;
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

      await savePlan(projectId, row, plan);
      return res.json(
        success({
          action: "apply",
          applied: applied.applied,
          refused: applied.refused,
          skipped: applied.skipped,
          shotCount: nextShots.length,
          diagnose,
          camFit,
          syncResult,
          packageVersion: peekPackageVersion(nextShots),
          designExitGate,
          designExitOk,
          designExitRequired: !designExitOk,
          exitReassert: designExitGate,
          exitGate: designExitGate,
          designExitPass: designExitOk,
          a11yAnnounce: designExitOk
            ? `已应用 ${applied.applied.length} 条 IRD 补丁；designExit 已过`
            : `已应用 ${applied.applied.length} 条 IRD 补丁；designExit 未过绿，请继续智能设计/Confirm`,
          forwardReentryRequired: !designExitOk,
        }),
      );
    }

    return res.status(400).json({ message: `unknown action ${action}` });
  },
);

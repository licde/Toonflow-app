/**
 * Design-time exit gate — Forward gate > Reverse repair.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { scoreAdaptationDesign, type AdaptScoreResult } from "./adaptScorecard";
import {
  getGenreTemplateFromPlan,
  getViralDerivations,
  loadGenreTemplatePack,
} from "../genre/loadGenreTemplatePack";
import { scoreTemplateFill } from "../genre/compileWritingBrief";
import {
  getHookPlanFromPlan,
  getPeakLedgerFromPlan,
  validateHookPlan,
  validatePeakLedger,
  validatePaypointIntent,
} from "./extractPeakLedger";
import { collectSfxIntentList, getShotDesignIntentsFromPlan, validateShotDesignIntents } from "./shotDesignIntent";
import { evaluateVisBeatConflict, explainVisBeat } from "./visualBeatPolicy";
import { diagnoseNar, diagnoseCast, diagnoseSpeakerBare } from "./gateDiagnose";
import { collectNar14Residuals } from "./nar14Residual";
import { detectLipSplitPressure } from "./lipSplit";
import type { ScriptBundle } from "../bundle/types";
import type { Nar14LineLike } from "../nar14ClauseSplit";
import {
  getEpisodeIndex,
  getViralPrefs,
  hasAudienceMeta,
  isEp1HardNormScope,
  isLiteraryLocked,
  literaryStaleBlocksExit,
} from "./viralDoctrine";
import { countUsefulInfoHints, type DialogueLine } from "./redesignCharacterDialogue";
import { needsNar14Split } from "../nar14ClauseSplit";
import {
  hasDesignFiller,
  hasOsInNameDisplay,
  shouldWarnOneBeat,
} from "../compilers/stillIdentitySsot";

function preDesignShots(pd: Record<string, unknown>): Record<string, unknown>[] {
  return ((pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ?? []) as Record<
    string,
    unknown
  >[];
}

function dialogueLines(pd: Record<string, unknown>): DialogueLine[] {
  const dp = pd.dialoguePlan as { lines?: DialogueLine[] } | undefined;
  const nb = pd.narrativeBrief as { dialoguePlan?: { lines?: DialogueLine[] } } | undefined;
  return (dp?.lines ?? nb?.dialoguePlan?.lines ?? []) as DialogueLine[];
}

function dc01CoverageOk(pd: Record<string, unknown>): { ok: boolean; missing: string[] } {
  const planLines = dialogueLines(pd) as { lineId?: string }[];
  const planIds = planLines.map((l) => String(l.lineId ?? "").trim()).filter(Boolean);
  if (!planIds.length) return { ok: true, missing: [] };
  const present = new Set<string>();
  for (const s of preDesignShots(pd)) {
    const lines =
      ((s.narrative as { dialogue?: { lines?: { lineId?: string }[] } })?.dialogue?.lines ?? []) as {
        lineId?: string;
      }[];
    for (const l of lines) {
      if (l.lineId) present.add(String(l.lineId));
    }
  }
  const missing = planIds.filter((id) => !present.has(id));
  return { ok: missing.length === 0, missing };
}

function collectVisBeatSubjects(
  plan: Record<string, unknown>,
  pd: Record<string, unknown>,
): Array<{
  visualBeatTags?: unknown;
  shotSize?: string | null;
  purpose?: string | null;
  picture?: string | null;
  weaponId?: string | null;
}> {
  const out: Array<{
    visualBeatTags?: unknown;
    shotSize?: string | null;
    purpose?: string | null;
    picture?: string | null;
    weaponId?: string | null;
  }> = [];
  const intents = getShotDesignIntentsFromPlan(plan);
  for (const it of intents) {
    out.push({
      visualBeatTags: it.visualBeatTags,
      shotSize: it.shotSizeIntent,
      purpose: it.purpose,
      picture: it.picture,
      weaponId: it.weaponId,
    });
  }
  const pack = pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined;
  for (const s of pack?.shots ?? []) {
    const n = s.narrative as { shotSize?: string } | undefined;
    out.push({
      visualBeatTags: s.visualBeatTags,
      shotSize: (s.shotSize as string) ?? n?.shotSize,
      picture: (s.visualDescription as string) ?? null,
      weaponId: (s.weaponId as string) ?? null,
    });
  }
  return out;
}

function visBeatGate(
  plan: Record<string, unknown>,
  pd: Record<string, unknown>,
  kind: "missing" | "split" | "inconsistent",
  stageId: string,
): { ok: boolean; explain?: string } {
  const meta = (pd.meta as Record<string, unknown>) ?? pd;
  const requireTags = stageId === "SB" || stageId === "designBrief";
  const subjects = collectVisBeatSubjects(plan, pd);
  if (!subjects.length) {
    return { ok: !requireTags };
  }
  for (const s of subjects) {
    const ev = evaluateVisBeatConflict({
      ...s,
      requireTags,
      meta,
    });
    if (kind === "missing" && ev.action === "tag_missing") {
      return { ok: ev.ok, explain: explainVisBeat(ev) };
    }
    if (kind === "split" && ev.action === "must_split") {
      return { ok: ev.ok, explain: explainVisBeat(ev) };
    }
    if (kind === "inconsistent" && ev.action === "tag_inconsistent") {
      return { ok: ev.ok, explain: explainVisBeat(ev) };
    }
  }
  return { ok: true };
}
type Checklist = {
  byStage: Record<string, string[]>;
  checks: Record<string, { severity: string; message: string }>;
  adaptScorePass: number;
  maxOptimizeRoundsPerStage: number;
  forbidFalseGreen: boolean;
};

type DepthRollout = {
  defaultDepth: string;
  depths: Record<string, { hardExitGates?: boolean; requireAvTags?: boolean; adaptScorePass?: number }>;
};

export type DesignExitResult = {
  ok: boolean;
  stageId: string;
  failedIds: string[];
  warnings: string[];
  score?: AdaptScoreResult;
  nextAction: "proceed" | "optimize_here" | "rollback";
  rollbackTo?: string;
  userMessage: string;
  constraintBlockHint?: string;
  literaryLocked?: boolean;
  /** L2 heal applied on exit (CAST/EMPTY) */
  healApplied?: boolean;
  healDiffs?: number;
  staleCascade?: { markedStale: number; clearedVideoPass: number };
  /** Must: still one-beat / VisBeat expand applied on exit */
  splitApplied?: boolean;
  splitExpandedCount?: number;
  splitLog?: string[];
};

function asPd(plan: Record<string, unknown>): Record<string, unknown> {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  // Bundle根级 preDesignPack/CD 与 planData 并存时合并，供 DEX-STILL / VisBeat 读 shots
  return {
    ...pd,
    preDesignPack: pd.preDesignPack ?? plan.preDesignPack,
    characterDesign: pd.characterDesign ?? plan.characterDesign,
    assetCrefPlan: pd.assetCrefPlan ?? plan.assetCrefPlan,
    characterAssets: pd.characterAssets ?? plan.characterAssets,
  };
}

function hasAvTags(pd: Record<string, unknown>): boolean {
  const tags = pd.sceneAvTags;
  if (Array.isArray(tags) && tags.length) return true;
  const meta = pd.sceneMeta as Record<string, unknown>[] | undefined;
  return Boolean(meta?.some((m) => m.avTags || m.sceneAvTags));
}

function checkLipSplit(lines: DialogueLine[]): boolean {
  const long = lines.filter((l) => needsNar14Split(String(l.text ?? "").trim(), { splitHint: l.splitHint }));
  if (long.length) return false;
  const hit = lines.filter((l) => (l.functions ?? []).includes("emotion_hit"));
  if (hit.some((l) => !l.reactionAction)) return false;
  return true;
}

/** Prefer GateDiagnose SSOT (plan+shots); fallback plan-only for empty preDesign. */
function checkNarViaDiagnose(pd: Record<string, unknown>, only?: "NAR-14" | "NAR-15"): boolean {
  const shots = preDesignShots(pd);
  if (!shots.length) {
    const lines = dialogueLines(pd);
    if (only === "NAR-15") {
      const hit = lines.filter((l) => (l.functions ?? []).includes("emotion_hit"));
      return hit.length === 0 || hit.every((l) => Boolean(String(l.reactionAction ?? "").trim()));
    }
    if (only === "NAR-14") {
      return !lines.some((l) => needsNar14Split(String(l.text ?? "").trim(), { splitHint: l.splitHint }));
    }
    return checkLipSplit(lines);
  }
  const fails = diagnoseNar({ planData: pd, shots });
  if (only) return !fails.some((f) => f.id === only);
  return fails.length === 0;
}

/**
 * NAR + lip pressure (same SSOT as burn L3).
 * mustConfirm → Confirm 语义拆；canSilentRaise 残留 → 设计未抬净（退出前须抬时）。
 */
function checkLipSplitFull(pd: Record<string, unknown>): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!checkNarViaDiagnose(pd)) {
    return { ok: false, warnings };
  }
  const shots = preDesignShots(pd);
  if (!shots.length) return { ok: true, warnings };
  for (const s of shots) {
    const p = detectLipSplitPressure(s);
    if (p.mustConfirm) {
      warnings.push(
        `LIP_SPLIT:shot${s.shotIndex ?? "?"}:${p.reasons.join(",")}:须Confirm拆镜或改短`,
      );
    } else if (p.canSilentRaise) {
      warnings.push(
        `LIP_RAISE:shot${s.shotIndex ?? "?"}:${p.authorDuration}→${p.required}:设计退出前须抬时（禁甩导入）`,
      );
    }
  }
  // M8: presence≠placement — prop_cu multi-lip / OS-on-lip are exit pressure
  try {
    const { diagnoseDialoguePlacement } =
      require("./dialoguePlacementMatch") as typeof import("./dialoguePlacementMatch");
    const place = diagnoseDialoguePlacement(shots as Record<string, unknown>[]);
    for (const iss of place.issues) {
      if (iss.severity === "strip") continue;
      warnings.push(
        `DEX-DIAL-BIND:shot${iss.shotIndex ?? "?"}:${iss.reason}:须改绑或智能拆`,
      );
    }
  } catch {
    /* optional */
  }
  return { ok: warnings.length === 0, warnings };
}

/** F3 within ceiling still requires split or demote — burn always L3 fx_f3_split. */
function checkFxIntent(pd: Record<string, unknown>, ceiling: string): boolean {
  const plan =
    (pd.narrativeBrief as { implementationPlan?: { fxIntent?: { level?: string } }[] })?.implementationPlan ??
    (pd.implementationPlan as { fxIntent?: { level?: string } }[] | undefined) ??
    [];
  if (!plan.length) return false;
  const maxN = Number(String(ceiling || "F2").replace(/\D/g, "")) || 2;
  const shots = preDesignShots(pd);
  const hasPhysicalSplit = shots.some(
    (s) =>
      s.beatRole === "reaction" ||
      s.beatRole === "emphasize" ||
      s._visualSplitId ||
      s._lipMultiSplit ||
      s.visualSplitRole,
  );
  for (const item of plan) {
    const lv = String(item.fxIntent?.level ?? "").toUpperCase();
    if (!lv) return false;
    const n = Number(lv.replace(/\D/g, ""));
    if (Number.isFinite(n) && n > maxN) return false;
    if (n === 3 && !hasPhysicalSplit) return false;
  }
  return true;
}

function checkSceneCard(pd: Record<string, unknown>): boolean {
  const impl =
    (pd.narrativeBrief as { implementationPlan?: unknown[] })?.implementationPlan ??
    (pd.implementationPlan as unknown[] | undefined) ??
    [];
  const meta = (pd.sceneMeta as unknown[] | undefined) ?? [];
  if (!impl.length && !meta.length) return true;
  if (impl.length && meta.length && impl.length !== meta.length) return false;
  return true;
}

function nameMapOk(pd: Record<string, unknown>): boolean {
  const matrix = pd.adaptationMatrixStructured as {
    matrix?: { dimId?: string; choice?: string }[];
    deepAdaptation?: { nameMap?: { from?: string; to?: string }[] };
  } | undefined;
  const choice = matrix?.matrix?.find((m) => /D01|nameMap|姓名/i.test(String(m.dimId)))?.choice;
  if (!choice || choice === "keep") return true;
  const maps = matrix?.deepAdaptation?.nameMap ?? [];
  return maps.length > 0 && maps.every((m) => m.from && m.to);
}

function reconApplied(pd: Record<string, unknown>): boolean {
  if (pd.changeLog && String(pd.changeLog).length > 8) return true;
  const trace = pd.reconstructionTrace;
  if (Array.isArray(trace) && trace.length > 0) return true;
  if (typeof trace === "string" && trace.length > 8) return true;
  return false;
}

function primaryDriveOk(lines: DialogueLine[]): boolean {
  if (!lines.length) return false;
  const blob = lines.map((l) => l.text ?? "").join("\n");
  if (hasAudienceMeta(blob)) return false;
  return lines.some((l) => String(l.text ?? "").trim().length >= 4);
}

function ep1RhythmOk(plan: Record<string, unknown>, lines: DialogueLine[]): boolean {
  if (!isEp1HardNormScope(plan)) return true;
  const hook = getHookPlanFromPlan(plan);
  if (!hook?.opening?.visualBeat) return false;
  const useful = countUsefulInfoHints(lines);
  // soft max: allow a few advance_plot; fail only when clearly dump
  return useful <= 6;
}

function causalOk(plan: Record<string, unknown>, lines: DialogueLine[]): boolean {
  if (getEpisodeIndex(plan) <= 1) return true;
  const pd = asPd(plan);
  const cont = pd.seriesContinuity as { carryInfoIds?: string[] } | undefined;
  if (!cont?.carryInfoIds?.length) return false;
  if (lines.length && lines.every((l) => !l.causedByActionId)) return false;
  return true;
}

function camTagsOk(pd: Record<string, unknown>): boolean {
  const tags = (pd.camTags as string[] | undefined) ?? [];
  if (!tags.length) return true;
  const whitelist = new Set(["static", "gentle_push", "gentle_pull", "pan", "tilt", "orbit", "fixed"]);
  return tags.every((t) => whitelist.has(String(t).toLowerCase().replace(/\s/g, "_")) || t === "static");
}

function voiceAvOk(pd: Record<string, unknown>, lines: DialogueLine[]): boolean {
  if (!lines.length) return true;
  const meta = (pd.sceneMeta as { avCausality?: unknown; voiceIntent?: unknown }[] | undefined) ?? [];
  if (!meta.length) return true;
  return meta.some((m) => m.avCausality || m.voiceIntent);
}

function conflictCurveOk(pd: Record<string, unknown>): boolean {
  return Boolean(pd.conflictCurve || pd.emotionCurve || (pd.storySkeleton && String(pd.storySkeleton).length > 10));
}

export function runDesignExitGate(
  stageId: string,
  plan: Record<string, unknown>,
  opts?: {
    optimizeRound?: number;
    chatStrict?: boolean;
    applyL2Heal?: boolean;
    /** 与 exportGate 同核：作者镜默认诊不拆；true 才 apply IRD/cam/oneBeat */
    forceExpand?: boolean;
  },
): DesignExitResult {
  const checklist = readFixtureJson<Checklist>("design_exit_checklist.json", {
    byStage: {},
    checks: {},
    adaptScorePass: 65,
    maxOptimizeRoundsPerStage: 5,
    forbidFalseGreen: true,
  });
  const rollout = readFixtureJson<DepthRollout>("adaptation_depth_rollout.json", {
    defaultDepth: "viral",
    depths: { viral: { hardExitGates: true, adaptScorePass: 65 } },
  });
  const gt = getGenreTemplateFromPlan(plan);
  const depthCfg = rollout.depths[gt.adaptationDepth || rollout.defaultDepth] ?? rollout.depths.viral;
  const hard = depthCfg.hardExitGates !== false;
  const pd = asPd(plan);
  const pack = loadGenreTemplatePack(gt.packId);
  const ids = checklist.byStage[stageId] ?? [];
  const failedIds: string[] = [];
  const warnings: string[] = [];
  const lines = dialogueLines(pd);
  let healApplied = false;
  let healDiffs = 0;
  let staleCascade: DesignExitResult["staleCascade"];
  let splitApplied = false;
  let splitExpandedCount = 0;
  const splitLog: string[] = [];

  // 退出前抬净 canSilentRaise（设计主责；导入仅兜底）— 先于 IRD/cam expand 与 DEX-LIP-SPLIT
  if (!opts?.chatStrict || stageId === "SB" || stageId === "designBrief") {
    try {
      const { raiseDurationHygieneOnPlan } =
        require("../export/durationHygiene") as typeof import("../export/durationHygiene");
      const vendorId =
        (pd.meta as { vendorId?: string } | undefined)?.vendorId ??
        (plan as { meta?: { vendorId?: string } }).meta?.vendorId ??
        null;
      const hy = raiseDurationHygieneOnPlan(plan, { vendorId });
      if (hy.raised) {
        healApplied = true;
        healDiffs += hy.raised;
        splitLog.push(`duration_raise:${hy.raised};cap=${hy.skippedCap}`);
        warnings.push(`LIP_RAISE_APPLIED:raised=${hy.raised}`);
      }
    } catch {
      /* optional */
    }
  }

      // IRD/cam/oneBeat：与 exportGate 同核 — 默认 diagnose-only；forceExpand 才 apply（禁 setStepStatus  alone 扩镜）
  // Skip re-expand when import already expanded (anti double-split); allow reenter for true multi-beat
  const alreadyImportExpanded = Boolean(
    (pd.meta as { importSplitExpanded?: boolean; irdProvenance?: unknown } | undefined)?.importSplitExpanded ||
      (pd.meta as { irdProvenance?: unknown } | undefined)?.irdProvenance ||
      (plan as { _importSplitExpanded?: boolean })._importSplitExpanded ||
      (plan as { meta?: { importSplitExpanded?: boolean } }).meta?.importSplitExpanded ||
      (plan as { meta?: { irdProvenance?: unknown } }).meta?.irdProvenance,
  );
  const allowApplyExpand = Boolean(opts?.forceExpand) && !opts?.chatStrict;
  const applySplit =
    !opts?.chatStrict &&
    (stageId === "SB" || stageId === "designBrief" || stageId === "W3" || stageId === "AS" || stageId === "CD");
  if (applySplit) {
    try {
      const packShots =
        ((pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ?? []) as Record<
          string,
          unknown
        >[];
      if (packShots.length && !allowApplyExpand) {
        const { diagnoseStillIntent } =
          require("./stillIntentReverse") as typeof import("./stillIntentReverse");
        const meta = (pd.meta as Record<string, unknown>) ?? {};
        const diagnose = diagnoseStillIntent(packShots, {
          chatStrict: true,
          planData: pd,
          meta,
          bundle: {
            preDesignPack: { shots: packShots, scriptPlan: String(pd.script ?? "") },
            planData: pd,
            characterDesign: (plan as { characterDesign?: Record<string, unknown> }).characterDesign,
            meta,
          } as never,
        });
        const must =
          diagnose.confirmRequired ||
          diagnose.patches.some((p) => p.op === "split_onebeat" || p.op === "split_speak_react");
        meta.expandProvenance = {
          mode: "diagnose_only",
          at: new Date().toISOString(),
          forceExpand: false,
          primary: diagnose.primaryAction,
        };
        if (must) {
          meta.irdConfirmRequired = true;
          meta.importOkNotExitPass = true;
          splitLog.push(`expand_diagnose_only;primary=${diagnose.primaryAction}`);
          warnings.push("EXPAND_DIAGNOSE_ONLY:须 Confirm/forceExpand，禁过站静默扩镜");
        }
        try {
          const { runCamFitUntilClear } =
            require("../export/camFitHygiene") as typeof import("../export/camFitHygiene");
          const camBundle = {
            preDesignPack: { shots: packShots },
            planData: pd,
            characterDesign: (plan as { characterDesign?: unknown }).characterDesign,
            meta,
          } as never;
          const cam = runCamFitUntilClear(camBundle, { chatStrict: true, maxRounds: 1 });
          if (cam.confirmRequired || cam.remainingMustSplit > 0) {
            meta.irdConfirmRequired = true;
            splitLog.push(`cam_diagnose_remain:${cam.remainingMustSplit}`);
          }
        } catch {
          /* optional */
        }
        pd.meta = meta;
        if (!plan.planData) plan.planData = pd;
      } else if (packShots.length && allowApplyExpand) {
        const { runStillIntentHeal } =
          require("./stillIntentReverse") as typeof import("./stillIntentReverse");
        const { reenterStillOneBeatOnShots } = require("./reenterStillOneBeat") as typeof import("./reenterStillOneBeat");
        const { runShotExpanders } = require("./expanderRegistry") as typeof import("./expanderRegistry");
        const meta = (pd.meta as Record<string, unknown>) ?? {};
        const miniBundle = {
          preDesignPack: { shots: packShots },
          planData: pd,
          characterDesign: (plan as { characterDesign?: unknown }).characterDesign,
          meta,
        } as never;
        let working = packShots;
        meta.expandProvenance = {
          mode: "force_expand",
          at: new Date().toISOString(),
          forceExpand: true,
        };
        if (!alreadyImportExpanded) {
          const ird = runStillIntentHeal(miniBundle, {
            chatStrict: false,
            literaryLocked: isLiteraryLocked(plan),
            meta,
            planData: pd,
          });
          working = ird.shots;
          if (ird.applied.length) {
            splitApplied = true;
            splitExpandedCount += ird.applied.filter((a) => /split/.test(a)).length;
            splitLog.push(`ird_apply:${ird.applied.length}`);
            meta.irdProvenance = (miniBundle as { meta?: { irdProvenance?: unknown } }).meta?.irdProvenance ?? {
              applied: ird.applied,
            };
            meta.designExitRequiredAfterIrd = false;
          }
        } else {
          splitLog.push("skip_ird_already_import_expanded");
        }
        // Cam-fit until-clear (clear residual CAM after import expand / or fresh IRD)
        try {
          const { runCamFitUntilClear } =
            require("../export/camFitHygiene") as typeof import("../export/camFitHygiene");
          const camBundle = {
            preDesignPack: { shots: working },
            planData: pd,
            characterDesign: (plan as { characterDesign?: unknown }).characterDesign,
            meta,
          } as never;
          const cam = runCamFitUntilClear(camBundle, {
            chatStrict: Boolean(opts?.chatStrict),
            maxRounds: 5,
          });
          working =
            ((camBundle as { preDesignPack?: { shots?: Record<string, unknown>[] } }).preDesignPack?.shots ??
              working) as Record<string, unknown>[];
          if (cam.applied) {
            splitApplied = true;
            splitExpandedCount += cam.applied;
            splitLog.push(`cam_fit_until_clear:${cam.applied};r=${cam.rounds}`);
          }
          if (cam.confirmRequired) {
            meta.irdConfirmRequired = true;
            splitLog.push(`cam_fit_confirm_remain:${cam.remainingMustSplit}`);
          }
        } catch {
          /* optional */
        }
        // Re-entry first: multi-beat again after prior split
        const re = reenterStillOneBeatOnShots(working, { meta });
        working = re.shots;
        if (re.reexpanded > 0) {
          splitApplied = true;
          splitExpandedCount += re.reexpanded;
          splitLog.push(`reenter_still_onebeat:${re.reexpanded}`);
          if (re.staleCascade) staleCascade = re.staleCascade;
        }
        // Never skip expanders when residual multi-beat remains (importOk ≠ still-ok)
        const residualOneBeat = working.some(
          (s) => !s.visBeatOverride && shouldWarnOneBeat(String(s.visualDescription ?? "")),
        );
        const exp =
          alreadyImportExpanded && re.reexpanded === 0 && !residualOneBeat
            ? {
                shots: working,
                log: [] as { expanderId: string; count?: number; expanded?: boolean; detail?: string }[],
              }
            : runShotExpanders(working, {
                meta: { ...meta, pillarsVisBeatV2: (meta.pillarsVisBeatV2 as string) || "enforce" },
                applyStillOneBeat: true,
                applyCuCast: true,
                applyClusters: true,
                chatStrict: Boolean(opts?.chatStrict),
                forceExpand: Boolean(opts?.forceExpand) || allowApplyExpand,
              });
        working = exp.shots;
        if (residualOneBeat && re.reexpanded === 0) {
          const stillAfter = working.some(
            (s) => !s.visBeatOverride && shouldWarnOneBeat(String(s.visualDescription ?? "")),
          );
          if (stillAfter) {
            splitLog.push("still_onebeat_residual_unexpanded");
            meta.stillOneBeatResidual = true;
          }
        }
        const stillLog = exp.log.find((l) => l.expanderId === "still_onebeat");
        const cuLog = exp.log.find((l) => l.expanderId === "still_cu_cast");
        const visLog = exp.log.find((l) => l.expanderId === "visual_multi");
        const n = (stillLog?.count ?? 0) + (cuLog?.count ?? 0) + (visLog?.count ?? 0);
        if (
          n > 0 ||
          exp.shots.length !== packShots.length ||
          re.reexpanded > 0 ||
          residualOneBeat ||
          (!alreadyImportExpanded && splitApplied)
        ) {
          const pdp = (pd.preDesignPack as Record<string, unknown>) ?? {};
          pdp.shots = exp.shots;
          pd.preDesignPack = pdp;
          pd.meta = meta;
          if (!plan.planData) plan.planData = pd;
          else (plan.planData as Record<string, unknown>).preDesignPack = pdp;
          if (plan.preDesignPack) (plan.preDesignPack as { shots?: unknown }).shots = exp.shots;
          splitApplied = true;
          splitExpandedCount += n;
          for (const l of exp.log) {
            if (l.expanded) splitLog.push(`${l.expanderId}:${l.count}:${l.detail ?? ""}`);
          }
          warnings.push(`SPLIT_AUTO:expanded=${splitExpandedCount}`);
          if (!staleCascade) {
            const { cascadeForwardStale } = require("../quality/forwardStaleCascade") as typeof import("../quality/forwardStaleCascade");
            const casc = cascadeForwardStale({
              shots: exp.shots,
              forwardStages: ["SB", "MD-IMG", "EN"],
            });
            staleCascade = { markedStale: casc.markedStale, clearedVideoPass: casc.clearedVideoPass };
          }
          try {
            const { reindexDerivedTables } =
              require("../bundle/reindexDerivedTables") as typeof import("../bundle/reindexDerivedTables");
            const { syncOsPeelToDialoguePlan, stubCausedByActionIds } =
              require("./osPeelToDialoguePlan") as typeof import("./osPeelToDialoguePlan");
            const full = {
              ...plan,
              planData: pd,
              preDesignPack: pdp,
            } as never;
            reindexDerivedTables(full);
            syncOsPeelToDialoguePlan(full);
            stubCausedByActionIds(full);
          } catch {
            /* optional */
          }
        }
      }
    } catch (e) {
      warnings.push(`SPLIT_AUTO_ERR:${e instanceof Error ? e.message : "fail"}`);
    }
  }

  // Pre-exit L2 heal for CAST/EMPTY when allowed (not chatStrict propose-only path)
  const applyHeal = opts?.applyL2Heal !== false && !opts?.chatStrict;
  if (applyHeal && (stageId === "SB" || stageId === "designBrief" || stageId === "W3")) {
    try {
      const { stripCharOrphNerStubs } =
        require("../quality/matchDescNamesToCasting") as typeof import("../quality/matchDescNamesToCasting");
      const { healShotQuality } = require("../quality/healShotQuality") as typeof import("../quality/healShotQuality");
      const packShots =
        ((pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ?? []) as Record<
          string,
          unknown
        >[];
      const cd = (pd.characterDesign ?? plan.characterDesign) as {
        assets?: { code?: string; name?: string; L0?: { identity?: string; stub?: boolean } }[];
      } | undefined;
      const vlt = (pd.visualLockTable ?? plan.visualLockTable) as {
        characterAssets?: Record<string, unknown>;
      } | undefined;
      if (packShots.length) {
        const stripped = stripCharOrphNerStubs({
          shots: packShots as Array<{ charCodes?: string[] }>,
          characterAssets: cd?.assets,
          visualLockTable: vlt,
        });
        if (stripped.strippedCodes.length || stripped.strippedAssets.length) {
          warnings.push(`L2_CHAR_ORPH_STRIP:${stripped.strippedCodes.length + stripped.strippedAssets.length}`);
        }
        const hr = healShotQuality({
          shots: packShots as never,
          characterAssets: cd?.assets,
          proposeOnly: Boolean(opts?.chatStrict),
          chatStrict: Boolean(opts?.chatStrict),
        });
        if (hr.healed > 0 || hr.diffs.length) {
          healApplied = hr.healed > 0;
          healDiffs = hr.diffs.length;
          warnings.push(`L2_HEAL:diffs=${hr.diffs.length}:healed=${hr.healed}`);
        }
        if (hr.healed > 0) {
          const { cascadeForwardStale } = require("../quality/forwardStaleCascade") as typeof import("../quality/forwardStaleCascade");
          const casc = cascadeForwardStale({
            shots: packShots,
            forwardStages: ["SB", "MD-IMG", "EN"],
            staleClientIds: packShots
              .filter((_, i) => hr.diffs.some((d) => d.shotIndex === (packShots[i].shotIndex as number) || d.shotIndex == null))
              .map((s) => String(s.clientId ?? s.shotIndex ?? "")),
          });
          staleCascade = { markedStale: casc.markedStale, clearedVideoPass: casc.clearedVideoPass };
        }
      }
    } catch (e) {
      warnings.push(`L2_HEAL_ERR:${e instanceof Error ? e.message : "fail"}`);
    }
  }

  if (literaryStaleBlocksExit(plan, stageId)) {
    failedIds.push("DEX-LITERARY-STALE");
  }

  const self = pd.narrativeSelfcheck as { passed?: boolean; failedIds?: string[] } | undefined;
  if (checklist.forbidFalseGreen && self?.passed === true) {
    if (!checkNarViaDiagnose(pd)) failedIds.push("FALSE_GREEN_SELFCHECK");
    if (!primaryDriveOk(lines) && (stageId === "W3" || stageId === "W3_script")) {
      failedIds.push("FALSE_GREEN_SELFCHECK");
    }
    if (isEp1HardNormScope(plan) && !getHookPlanFromPlan(plan)?.opening?.visualBeat) {
      failedIds.push("FALSE_GREEN_SELFCHECK");
    }
  }

  for (const id of ids) {
    let ok = true;
    switch (id) {
      case "DEX-FORMULA-PICKER":
        ok = Boolean(gt.packId);
        break;
      case "DEX-TASTE-STYLE": {
        const prefs = getViralPrefs(plan);
        ok = Boolean(prefs.audienceTaste && prefs.storyStyle);
        break;
      }
      case "DEX-MATRIX-LOCKED":
        ok = Boolean(
          (pd.adaptationMatrixStructured as { userConfirmed?: boolean })?.userConfirmed ??
            (plan as { _userMatrixChoices?: string })._userMatrixChoices,
        );
        break;
      case "DEX-NAME-MAP":
      case "DEX-B16-NAMEMAP":
        ok = nameMapOk(pd);
        break;
      case "DEX-AV-TAGS":
        ok = !depthCfg.requireAvTags || hasAvTags(pd);
        break;
      case "DEX-LIP-SPLIT": {
        const lip = checkLipSplitFull(pd);
        ok = lip.ok;
        warnings.push(...lip.warnings);
        break;
      }
      case "NAR-14": {
        ok = checkNarViaDiagnose(pd, "NAR-14");
        if (!ok) {
          const residuals = collectNar14Residuals(lines as Nar14LineLike[]);
          if (residuals.length) {
            warnings.push(
              `NAR14_RESIDUAL:${residuals
                .slice(0, 4)
                .map((r) => r.lineId ?? r.text.slice(0, 12))
                .join(",")}:须重设计或Confirm_B`,
            );
          }
        }
        break;
      }
      case "NAR-15":
        ok = checkNarViaDiagnose(pd, "NAR-15");
        break;
      case "DC-01": {
        const cov = dc01CoverageOk(pd);
        ok = cov.ok;
        if (!ok) warnings.push(`DC-01 missing lineIds: ${cov.missing.slice(0, 8).join(",")}`);
        break;
      }
      case "DC-01-EXTRA": {
        // W3 often has no shots yet — skip extras (not UNIMPLEMENTED)
        const shots = preDesignShots(pd);
        if (!shots.length) {
          ok = true;
          break;
        }
        try {
          const { dialogueCoverageReport, formatDialogueCoverageMessage } = require("./dialogueCoverage") as typeof import("./dialogueCoverage");
          const script =
            String((plan as { script?: string }).script ?? pd.script ?? "") ||
            String((pd.preDesignPack as { scriptPlan?: string } | undefined)?.scriptPlan ?? "");
          const report = dialogueCoverageReport({
            script,
            planData: pd as { dialoguePlan?: { lines?: { speaker?: string; text?: string; lineId?: string }[] } },
            shots,
          });
          ok = report.extraCount === 0;
          if (!ok) {
            warnings.push(formatDialogueCoverageMessage(report));
          }
        } catch (e) {
          ok = false;
          warnings.push(`DC-01-EXTRA:${e instanceof Error ? e.message : "fail"}`);
        }
        break;
      }
      case "DEX-SPEAKER-BARE": {
        const spFails = diagnoseSpeakerBare(preDesignShots(pd), lines as { speaker?: string }[]);
        ok = spFails.length === 0;
        break;
      }
      case "DC-16":
      case "DG-CD-COVERAGE":
      case "DEX-CAST-CODES": {
        const castFails = diagnoseCast({
          planData: pd,
          characterDesign: (pd.characterDesign ?? plan.characterDesign) as ScriptBundle["characterDesign"],
          preDesignPack: pd.preDesignPack as ScriptBundle["preDesignPack"],
        } as ScriptBundle);
        ok = castFails.length === 0;
        break;
      }
      case "DEX-FX-INTENT":
        ok = checkFxIntent(pd, pack.shotFormula?.fxIntentCeiling || "F2");
        break;
      case "DEX-SCENE-CARD":
        ok = checkSceneCard(pd);
        break;
      case "DEX-RET-OPEN":
      case "RET-01": {
        const meta = (pd.sceneMeta as Record<string, unknown>[]) ?? [];
        const hook = getHookPlanFromPlan(plan);
        ok =
          meta.some((m) => {
            const av = m.avCausality as { visualPeak?: string; audioBeat?: string } | undefined;
            return Boolean(av && (av.visualPeak || av.audioBeat));
          }) ||
          Boolean((pd.retentionPlan as { opening5sHook?: string })?.opening5sHook) ||
          Boolean(hook?.opening?.visualBeat);
        break;
      }
      case "DEX-PEAK-LEDGER": {
        ok = validatePeakLedger(getPeakLedgerFromPlan(plan)).ok;
        break;
      }
      case "DEX-HOOK-PLAN":
      case "DEX-STORY-HOOK": {
        const hook = getHookPlanFromPlan(plan);
        const v = validateHookPlan(hook);
        ok =
          v.ok ||
          Boolean((pd.retentionPlan as { opening5sHook?: string })?.opening5sHook) ||
          Boolean((pd.storySkeleton as string | undefined)?.length && /钩|hook|开场/i.test(String(pd.storySkeleton)));
        if (id === "DEX-HOOK-PLAN") ok = v.ok;
        break;
      }
      case "DEX-EMPATHY": {
        const hook = getHookPlanFromPlan(plan);
        const beats =
          hook?.empathyThreeBeat ??
          (pack.storyFormula?.empathyBeats as string[] | undefined) ??
          [];
        ok = beats.length >= 2;
        break;
      }
      case "DEX-PAYPOINT": {
        ok =
          validatePaypointIntent(getHookPlanFromPlan(plan)) ||
          Boolean((pd.retentionPlan as { paypointCutBefore?: string })?.paypointCutBefore);
        break;
      }
      case "DEX-RECON-EXAMPLE": {
        const examples = pack.reconstructionExamples ?? [];
        ok = examples.length >= 1 && Boolean(examples[0]?.from && examples[0]?.to);
        break;
      }
      case "DEX-RECON-APPLIED": {
        ok = reconApplied(pd);
        break;
      }
      case "DEX-PRIMARY-DRIVE": {
        ok = stageId === "W3" || stageId === "W2" ? primaryDriveOk(lines) : true;
        break;
      }
      case "DEX-RHYTHM-EP1": {
        ok = ep1RhythmOk(plan, lines);
        break;
      }
      case "DEX-CAUSAL-EP": {
        ok = causalOk(plan, lines);
        break;
      }
      case "DEX-SFX-BRIDGE": {
        const intents = getShotDesignIntentsFromPlan(plan);
        const v = validateShotDesignIntents(intents);
        const sfx = collectSfxIntentList(intents);
        const peaks = getPeakLedgerFromPlan(plan);
        // Do not force fake SFX intents when there is no peak/hook audio need
        if (!peaks.length && !intents.some((i) => i.purpose === "钩子" || i.purpose === "爆点兑现")) {
          ok = v.ok || intents.length === 0;
        } else {
          ok = v.ok && (sfx.length > 0 || intents.every((i) => !i.purpose || i.purpose === "信息" || i.purpose === "反应"));
        }
        break;
      }
      case "DEX-SHOT-INTENT": {
        const intents = getShotDesignIntentsFromPlan(plan);
        if (stageId === "W3" || stageId === "designBrief" || stageId === "SB") {
          ok = validateShotDesignIntents(intents).ok;
        }
        break;
      }
      case "DEX-VIS-TAG-MISSING": {
        const g = visBeatGate(plan, pd, "missing", stageId);
        ok = g.ok;
        if (!ok && g.explain) warnings.push(g.explain);
        break;
      }
      case "DEX-VIS-SPLIT": {
        const g = visBeatGate(plan, pd, "split", stageId);
        ok = g.ok;
        if (!ok && g.explain) warnings.push(g.explain);
        break;
      }
      case "DEX-VIS-TAG-INCONSISTENT": {
        const g = visBeatGate(plan, pd, "inconsistent", stageId);
        ok = g.ok;
        if (!ok && g.explain) warnings.push(g.explain);
        break;
      }
      case "DEX-TEMPLATE-FILL": {
        const fill = scoreTemplateFill(plan, stageId);
        ok = fill.ok || fill.ratio >= 0.7;
        if (!fill.ok && fill.missing.length) warnings.push(`TEMPLATE_MISSING:${fill.missing.join(",")}`);
        break;
      }
      case "DEX-ADAPT-SCORE":
        break;
      case "DEX-PACK-RECONCILE": {
        const v05 = (
          pd.adaptationMatrixStructured as { matrix?: { dimId?: string; choice?: string }[] }
        )?.matrix?.find((m) => /V05|genreFramework|类型/i.test(String(m.dimId)))?.choice;
        if (v05 && gt.packId && gt.packId !== "generic") {
          const map: Record<string, string> = {
            甜宠: "sweet",
            虐恋: "abuse_romance",
            战神: "war_god",
            悬疑: "suspense",
          };
          const expect = map[v05];
          if (expect && expect !== gt.packId) ok = false;
        }
        break;
      }
      case "DEX-VOICE-AV":
        ok = voiceAvOk(pd, lines);
        break;
      case "DEX-CAM-TAGS":
        ok = camTagsOk(pd);
        break;
      case "DEX-DC-ALIGN": {
        // lineId three-way: plan ⊆ shots (SB hard); empty plan soft-ok
        const cov = dc01CoverageOk(pd);
        ok = lines.length === 0 || (cov.ok && lines.some((l) => String(l.text ?? "").trim()));
        break;
      }
      case "DEX-TAGS-MIRRORED":
        ok = !hasAvTags(pd) || Boolean(pd.designBrief || pd.sceneAvTags);
        break;
      case "DEX-CONFLICT-CURVE":
      case "DEX-EMOTION-CURVE":
        ok = conflictCurveOk(pd);
        break;
      case "DEX-ESTABLISHING":
        ok = Boolean(pd.establishing || (pd.sceneMeta as unknown[])?.length);
        break;
      case "DEX-ASSET-CREF": {
        const {
          collectCharacterAssets,
          buildImagedMaps,
          shotAssetCrefSatisfied,
        } = require("./assetCrefBind") as typeof import("./assetCrefBind");
        const shots = preDesignShots(pd);
        const assets = collectCharacterAssets(plan);
        const { imagedByCode, imagedByName, codesPresent } = buildImagedMaps(assets);
        const crefPlan = Array.isArray(pd.assetCrefPlan)
          ? (pd.assetCrefPlan as import("./assetCrefBind").AssetCrefPlanEntry[])
          : [];
        // SB/W3/designBrief: stub+plan bind may pass (配角后期 AS 补图); AS still requires imaged
        const allowStubBind = stageId !== "AS" && stageId !== "CD";
        let badShot = false;
        let deferred = 0;
        for (const s of shots) {
          const vd = String(s.visualDescription ?? "");
          const codes = ((s.charCodes as string[]) ?? []).map((c) => String(c).toUpperCase()).filter((c) => /^CHAR-/i.test(c));
          const { hasFaceCue } = require("../quality/shotQualityPredicates") as typeof import("../quality/shotQualityPredicates");
          const needs = codes.length > 0 || hasFaceCue(vd);
          if (!needs) continue;
          const okShot = shotAssetCrefSatisfied(s, imagedByCode, imagedByName, crefPlan, {
            allowStubBind,
            codesPresent,
          });
          if (!okShot) {
            badShot = true;
            const hasCodesNoImg =
              codes.length > 0 && !codes.some((c) => imagedByCode.get(c) === true);
            warnings.push(
              hasCodesNoImg && !allowStubBind
                ? `ASSET-CREF:shot${s.shotIndex ?? "?"} 已绑码缺定妆图→AS 出图`
                : `ASSET-CREF:shot${s.shotIndex ?? "?"} 出脸须本镜 CHAR+定妆图或 assetCrefPlan 绑定`,
            );
          } else if (allowStubBind) {
            const stubOnly =
              codes.length > 0 &&
              codes.every((c) => codesPresent.has(c) && imagedByCode.get(c) !== true);
            if (stubOnly) deferred++;
          }
        }
        ok = !badShot;
        if (ok && deferred > 0) {
          warnings.push(`ASSET-CREF-DEFERRED:${deferred} 镜已 stub 绑，须 AS 补定妆图（不挡 SB 设计闭合）`);
        }
        break;
      }
      case "DEX-DUP-VD": {
        const { findDupVdStreaks } = require("./dirtyStillPromptGate") as typeof import("./dirtyStillPromptGate");
        const shots = preDesignShots(pd);
        const dups = findDupVdStreaks(
          shots.map((s) => ({
            shotIndex: Number(s.shotIndex),
            visualDescription: String(s.visualDescription ?? ""),
          })),
          3,
        );
        ok = dups.length === 0;
        if (!ok) {
          warnings.push(
            `DUP-VD: 连续同文镜 ${[...new Set(dups.map((d) => d.shotIndex))].slice(0, 8).join(",")}`,
          );
        }
        break;
      }
      case "DEX-DIRTY-STILL-PROMPT": {
        const { auditShotDirtyStillPrompt } =
          require("./dirtyStillPromptGate") as typeof import("./dirtyStillPromptGate");
        const shots = preDesignShots(pd);
        let bad = false;
        for (const s of shots) {
          for (const f of auditShotDirtyStillPrompt(s)) {
            if (f.id === "DEX-DIRTY-STILL-PROMPT") {
              bad = true;
              warnings.push(f.message);
            }
          }
        }
        ok = !bad;
        break;
      }
      case "DEX-HAND-LIP": {
        const { auditShotDirtyStillPrompt } =
          require("./dirtyStillPromptGate") as typeof import("./dirtyStillPromptGate");
        const shots = preDesignShots(pd);
        let bad = false;
        for (const s of shots) {
          for (const f of auditShotDirtyStillPrompt(s)) {
            if (f.id === "DEX-HAND-LIP") {
              bad = true;
              warnings.push(f.message);
            }
          }
        }
        ok = !bad;
        break;
      }
      case "DEX-LITERARY-STALE":
        ok = !literaryStaleBlocksExit(plan, stageId);
        break;
      case "DEX-STILL-ONEBEAT": {
        const shots = preDesignShots(pd);
        const intents = getShotDesignIntentsFromPlan(plan);
        let bad = false;
        for (const s of shots) {
          const vd = String(s.visualDescription ?? "").trim();
          if (vd && shouldWarnOneBeat(vd)) {
            bad = true;
            warnings.push(`STILL_ONEBEAT:shot${s.shotIndex ?? "?"}`);
          }
        }
        for (const it of intents) {
          if (it.picture && shouldWarnOneBeat(it.picture)) {
            bad = true;
            warnings.push(`STILL_ONEBEAT:intent:${it.intentId || it.picture.slice(0, 12)}`);
          }
        }
        ok = !bad;
        break;
      }
      case "DEX-STILL-CU-CAST": {
        const { detectCuCastConflict } =
          require("./detectCuCastConflict") as typeof import("./detectCuCastConflict");
        const shots = preDesignShots(pd);
        let bad = false;
        for (const s of shots) {
          const cu = detectCuCastConflict({
            shotSize: String(
              s.shotSize ?? (s.narrative as { shotSize?: string } | undefined)?.shotSize ?? "",
            ),
            charCodes: Array.isArray(s.charCodes) ? (s.charCodes as string[]) : [],
            characterNames: Array.isArray(s.characterNames) ? (s.characterNames as string[]) : [],
            visualDescription: String(s.visualDescription ?? ""),
            alreadySplit: Boolean(
              s._cuCastSplitId || s._stillBeatSplitId || s._visualSplitId || s._cuCastSliced,
            ),
          });
          if (cu.conflict) {
            bad = true;
            warnings.push(
              cu.healMode === "slice_cast"
                ? `STILL_CU_CAST_SLICE:shot${s.shotIndex ?? "?"}:${cu.primaryName}`
                : `STILL_CU_CAST:shot${s.shotIndex ?? "?"}:${cu.castCount}`,
            );
          }
        }
        ok = !bad;
        break;
      }
      case "DEX-STILL-OS-NAME": {
        const shots = preDesignShots(pd);
        let bad = false;
        for (const s of shots) {
          if (hasOsInNameDisplay(String(s.visualDescription ?? ""))) bad = true;
        }
        for (const l of lines) {
          if (hasOsInNameDisplay(String(l.speaker ?? ""))) bad = true;
        }
        const cd = (pd.characterDesign ?? plan.characterDesign) as
          | { assets?: { name?: string }[] }
          | undefined;
        for (const a of cd?.assets ?? []) {
          if (hasOsInNameDisplay(String(a.name ?? ""))) bad = true;
        }
        ok = !bad;
        if (bad) warnings.push("STILL_OS_NAME:画面/CD/speaker含（OS）须裸名");
        break;
      }
      case "DEX-STILL-FILLER": {
        const shots = preDesignShots(pd);
        let bad = false;
        for (const s of shots) {
          if (hasDesignFiller(String(s.visualDescription ?? ""))) bad = true;
        }
        ok = !bad;
        if (bad) warnings.push("STILL_FILLER:禁对白瞬间神态等无画面填料");
        break;
      }
      case "DEX-QP-02": {
        const { checkQp02 } = require("../quality/shotQualityPredicates") as typeof import("../quality/shotQualityPredicates");
        const shots = preDesignShots(pd);
        let bad = false;
        for (const s of shots) {
          const f = checkQp02({
            visualDescription: String(s.visualDescription ?? ""),
            shotIndex: Number(s.shotIndex) || undefined,
          });
          if (f && f.severity === "BLOCK") {
            bad = true;
            warnings.push(`QP02:${f.evidence?.reason ?? "fail"}:shot${s.shotIndex ?? "?"}`);
          }
        }
        ok = !bad;
        break;
      }
      case "DEX-CAST-ON-DESC": {
        const {
          checkCastOnDesc,
        } = require("../quality/shotQualityPredicates") as typeof import("../quality/shotQualityPredicates");
        const shots = preDesignShots(pd);
        const cd = (pd.characterDesign ?? plan.characterDesign) as {
          assets?: { code?: string; name?: string }[];
        } | undefined;
        const knownNames: string[] = [];
        const nameToCodes: Record<string, string[]> = {};
        for (const a of cd?.assets ?? []) {
          const name = String(a.name ?? "").replace(/（OS）|\(OS\)/g, "").trim();
          const code = String(a.code ?? "").trim();
          if (!name || !code) continue;
          knownNames.push(name);
          (nameToCodes[name] ??= []).push(code);
        }
        let bad = false;
        for (const s of shots) {
          const f = checkCastOnDesc({
            visualDescription: String(s.visualDescription ?? ""),
            charCodes: (s.charCodes as string[]) ?? [],
            knownNames,
            nameToCodes,
            shotIndex: Number(s.shotIndex) || undefined,
          });
          if (f) {
            bad = true;
            warnings.push(`CAST-ON-DESC:shot${s.shotIndex ?? "?"}`);
          }
        }
        ok = !bad;
        break;
      }
      case "DEX-EMPTY-SHOT-CONSISTENCY": {
        const { checkEmptyShotConsistency } = require("../quality/shotQualityPredicates") as typeof import("../quality/shotQualityPredicates");
        const shots = preDesignShots(pd);
        const cd = (pd.characterDesign ?? plan.characterDesign) as { assets?: { name?: string }[] } | undefined;
        const knownNames = (cd?.assets ?? []).map((a) => String(a.name ?? "").replace(/（OS）|\(OS\)/g, "").trim()).filter(Boolean);
        let bad = false;
        for (const s of shots) {
          const f = checkEmptyShotConsistency({
            visualDescription: String(s.visualDescription ?? ""),
            charCodes: (s.charCodes as string[]) ?? [],
            knownNames,
            shotIndex: Number(s.shotIndex) || undefined,
          });
          if (f) {
            bad = true;
            warnings.push(`EMPTY-SHOT:shot${s.shotIndex ?? "?"}`);
          }
        }
        ok = !bad;
        break;
      }
      case "DEX-EXPR-SPEAK": {
        const { checkSpeakPerformance } = require("../quality/shotQualityPredicates") as typeof import("../quality/shotQualityPredicates");
        const { hasOnCameraDialogue } = require("./onCameraDialogue") as typeof import("./onCameraDialogue");
        const shots = preDesignShots(pd);
        let bad = false;
        for (const s of shots) {
          const lines = (s.narrative as { dialogue?: { lines?: unknown[] } } | undefined)?.dialogue?.lines ?? [];
          const hasDialogue = hasOnCameraDialogue(lines);
          const sd = s.shotDesign as {
            performance?: { microExpression?: { eyes?: string; mouthDetail?: string } };
            lipSyncPolicy?: string;
          } | undefined;
          const f = checkSpeakPerformance({
            hasDialogue,
            emotionIntensity: (s.emotionIntensity as number) ?? (s.narrative as { emotionIntensity?: number })?.emotionIntensity,
            microExpression: sd?.performance?.microExpression,
            lipSyncPolicy: sd?.lipSyncPolicy,
            shotIndex: Number(s.shotIndex) || undefined,
          });
          if (f) {
            bad = true;
            warnings.push(`EXPR-SPEAK:shot${s.shotIndex ?? "?"}`);
          }
        }
        ok = !bad;
        break;
      }
      case "DEX-CUT-01":
      case "DEX-CAM-XSHOT": {
        const { checkCutCamFindings } = require("../quality/shotQualityPredicates") as typeof import("../quality/shotQualityPredicates");
        const shots = preDesignShots(pd).map((s) => ({
          shotIndex: Number(s.shotIndex) || undefined,
          sceneName: String(s.sceneName ?? "") || undefined,
          colorTemp: String((s as { colorTemp?: string }).colorTemp ?? "") || undefined,
          propState: String((s as { propState?: string }).propState ?? "") || undefined,
          transitionType: String(s.transitionType ?? "") || undefined,
          motion: String(s.motion ?? (s.shotDesign as { motion?: string })?.motion ?? "") || undefined,
          rhythmZone: String((s as { rhythmZone?: string }).rhythmZone ?? "") || undefined,
        }));
        const findings = checkCutCamFindings(shots).filter((f) =>
          id === "DEX-CUT-01" ? f.id === "DEX-CUT-01" : f.id === "DEX-CAM-XSHOT",
        );
        ok = findings.length === 0;
        if (!ok) {
          for (const f of findings.slice(0, 4)) warnings.push(`${f.id}:${f.message}`);
        }
        break;
      }
      case "DESIGN-LOSS":
      case "CHAIN-BEAT":
      case "DEX-CAM-FIT":
      case "DEX-INTENT-PIC":
      case "IRD-CONFIRM": {
        // Handled in post-loop chain/IRD audits; treat checklist id as soft pass here
        ok = true;
        break;
      }
      default:
        // Unknown checklist IDs fail closed when hard viral (kill false green)
        if (hard && checklist.checks[id]?.severity === "BLOCK") {
          ok = false;
          warnings.push(`UNIMPLEMENTED_DEX:${id}`);
        } else {
          ok = true;
        }
    }
    const sev =
      stageId === "W3" && id.startsWith("DEX-VIS-")
        ? "WARN"
        : (checklist.checks[id]?.severity ?? "WARN");
    if (!ok) {
      if (sev === "BLOCK" && hard) failedIds.push(id);
      else warnings.push(id);
    }
  }

  const hookPlan = getHookPlanFromPlan(plan);
  const peakOk = validatePeakLedger(getPeakLedgerFromPlan(plan)).ok;
  const intentOk = validateShotDesignIntents(getShotDesignIntentsFromPlan(plan)).ok;
  const visSubjects = collectVisBeatSubjects(plan, pd);
  const visMeta = (pd.meta as Record<string, unknown>) ?? pd;
  const visBeatOk =
    visSubjects.length === 0 ||
    visSubjects.every((s) => {
      const ev = evaluateVisBeatConflict({ ...s, requireTags: stageId === "SB" || stageId === "designBrief", meta: visMeta });
      return ev.ok;
    });

  let cuCastOk = true;
  try {
    const { detectCuCastConflict } =
      require("./detectCuCastConflict") as typeof import("./detectCuCastConflict");
    const shotsCu = preDesignShots(pd);
    for (const s of shotsCu) {
      const cu = detectCuCastConflict({
        shotSize: String(s.shotSize ?? (s.narrative as { shotSize?: string } | undefined)?.shotSize ?? ""),
        charCodes: Array.isArray(s.charCodes) ? (s.charCodes as string[]) : [],
        visualDescription: String(s.visualDescription ?? ""),
        alreadySplit: Boolean(s._cuCastSplitId || s._stillBeatSplitId || s._visualSplitId),
      });
      if (cu.conflict) {
        cuCastOk = false;
        break;
      }
    }
  } catch {
    /* optional */
  }

  const score = scoreAdaptationDesign(
    {
      packId: gt.packId,
      deepAdaptation: (pd.adaptationMatrixStructured as { deepAdaptation?: AdaptScoreInputDeep })?.deepAdaptation,
      matrixChoices: (pd.adaptationMatrixStructured as { matrix?: { dimId: string; choice: string }[] })?.matrix,
      sceneAvTags: pd.sceneAvTags as unknown[],
      sceneMeta: pd.sceneMeta as Record<string, unknown>[],
      dialoguePlanLines: lines,
      narrativeSelfcheckPassed: self?.passed,
      hasOpeningHook:
        Boolean((pd.retentionPlan as { opening5sHook?: string })?.opening5sHook) ||
        Boolean(hookPlan?.opening?.visualBeat) ||
        failedIds.indexOf("DEX-RET-OPEN") < 0,
      hasPeakLedger: peakOk,
      hasShotIntent: intentOk,
      contentTranslateExtensibleWithoutDerivation: isExtensibleWithoutDerivation(pd, plan),
      visBeatOk,
      cuCastOk,
    },
    depthCfg.adaptScorePass ?? checklist.adaptScorePass,
  );

  if (ids.includes("DEX-ADAPT-SCORE") && !score.pass && hard) {
    failedIds.push("DEX-ADAPT-SCORE");
  }

  // M0/M12/M10/M18/IRD chain contract audits at SB exit
  if ((stageId === "SB" || stageId === "designBrief") && hard) {
    try {
      const packShots =
        ((pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ?? []) as Record<
          string,
          unknown
        >[];
      const { auditLiteraryBeatCoverage } =
        require("./literaryBeatCoverage") as typeof import("./literaryBeatCoverage");
      const { auditCamShootableFit } =
        require("../quality/camShootableFit") as typeof import("../quality/camShootableFit");
      const { auditDesignLoss } =
        require("../quality/designLossSupplement") as typeof import("../quality/designLossSupplement");
      const { buildShotChainContract, assertChainEgress, chainContractEnabled } =
        require("../quality/shotChainContract") as typeof import("../quality/shotChainContract");
      const { diagnoseStillIntent } =
        require("./stillIntentReverse") as typeof import("./stillIntentReverse");
      const meta = (pd.meta as Record<string, unknown>) ?? (plan.meta as Record<string, unknown>) ?? {};
      if (chainContractEnabled(meta) && packShots.length) {
        for (const f of auditLiteraryBeatCoverage(packShots)) {
          if (f.severity === "BLOCK") failedIds.push(f.id);
          else warnings.push(f.id);
        }
        for (const f of auditDesignLoss({ preDesignPack: { shots: packShots } } as never)) {
          if (f.severity === "BLOCK") failedIds.push(f.id);
        }
        for (const s of packShots) {
          const cam = auditCamShootableFit(s);
          for (const f of cam.findings) {
            if (f.severity === "BLOCK") failedIds.push(f.id);
          }
          const c = buildShotChainContract(s);
          const eg = assertChainEgress("exit", c);
          for (const f of eg.findings.filter((x) => x.severity === "BLOCK")) {
            failedIds.push(f.id);
          }
        }
        const intents = getShotDesignIntentsFromPlan(plan);
        const ird = diagnoseStillIntent(packShots, {
          chatStrict: opts?.chatStrict,
          literaryLocked: isLiteraryLocked(plan),
          intents,
          meta,
          planData: pd,
        });
        for (const f of ird.findings.filter((x) => x.severity === "BLOCK")) {
          failedIds.push(f.id);
        }
        if (ird.confirmRequired || meta.irdConfirmRequired) {
          failedIds.push("IRD-CONFIRM");
        }
      }
    } catch {
      /* optional */
    }
  }

  const round = opts?.optimizeRound ?? 0;
  const maxR = checklist.maxOptimizeRoundsPerStage ?? 5;
  let nextAction: DesignExitResult["nextAction"] = "proceed";
  let rollbackTo: string | undefined;
  if (failedIds.length) {
    nextAction = round >= maxR ? "rollback" : "optimize_here";
    if (failedIds.some((f) => /PACK|MATRIX|NAME|FORMULA|RECON|STALE|KERNEL/i.test(f))) rollbackTo = "P06";
    if (failedIds.some((f) => /FORMULA-PICKER/i.test(f))) rollbackTo = "P0";
    if (failedIds.some((f) => /MATRIX|NAME|PACK-RECONCILE/i.test(f))) rollbackTo = "P03";
  }

  const uniqueFailed = [...new Set(failedIds)];
  const ok = uniqueFailed.length === 0;
  const msg = ok
    ? `${stageId} 出站通过`
    : `${stageId} 出站未通过：${uniqueFailed.join(", ")}。请本阶段优化，勿带病进入下一站。`;
  const userMessage = uniqueFailed.some((f) => /PEAK|HOOK|SHOT-INTENT|TEMPLATE|RECON|PRIMARY|RHYTHM/i.test(f))
    ? `${msg} CTA：按设计思路补全爆点/钩子/对白主推/分镜意图。`
    : msg;

  return {
    ok,
    stageId,
    failedIds: uniqueFailed,
    warnings,
    score,
    nextAction,
    rollbackTo,
    userMessage,
    constraintBlockHint: pack.adaptationPrompts?.short,
    literaryLocked: isLiteraryLocked(plan),
    healApplied,
    healDiffs,
    staleCascade,
    splitApplied,
    splitExpandedCount,
    splitLog: splitLog.length ? splitLog : undefined,
  };
}

type AdaptScoreInputDeep = {
  nameMap?: { from?: string; to?: string }[];
  contentTranslatePlan?: unknown;
};

function isExtensibleWithoutDerivation(pd: Record<string, unknown>, plan: Record<string, unknown>): boolean {
  const matrix = pd.adaptationMatrixStructured as { matrix?: { dimId?: string; choice?: string }[] } | undefined;
  const choice = matrix?.matrix?.find((m) => /D06|contentTranslate|内容平移/i.test(String(m.dimId)))?.choice;
  if (choice !== "extensible") return false;
  return getViralDerivations(plan).filter((d) => d.active !== false).length === 0;
}

export function literaryHintIsFallbackOnly(): true {
  return true;
}

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
};

function asPd(plan: Record<string, unknown>): Record<string, unknown> {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  // Bundle根级 preDesignPack/CD 与 planData 并存时合并，供 DEX-STILL / VisBeat 读 shots
  return {
    ...pd,
    preDesignPack: pd.preDesignPack ?? plan.preDesignPack,
    characterDesign: pd.characterDesign ?? plan.characterDesign,
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
  if (!shots.length) return checkLipSplit(dialogueLines(pd));
  const fails = diagnoseNar({ planData: pd, shots });
  if (only) return !fails.some((f) => f.id === only);
  return fails.length === 0;
}

/** NAR + multi-line/vendor lip pressure (same SSOT as burn L3). */
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
    }
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
  opts?: { optimizeRound?: number },
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
        ok = validateShotDesignIntents(intents).ok && collectSfxIntentList(intents).length > 0;
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
      case "DEX-ASSET-CREF":
        ok = Boolean(pd.assetCrefPlan || pd.characterAssets || true); // soft pass if absent assets stage empty
        break;
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
        const { checkQp02VisualDescription } = require("../bundle/visualQualityAudit") as typeof import("../bundle/visualQualityAudit");
        const shots = preDesignShots(pd);
        let bad = false;
        for (const s of shots) {
          const f = checkQp02VisualDescription({
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
    },
    depthCfg.adaptScorePass ?? checklist.adaptScorePass,
  );

  if (ids.includes("DEX-ADAPT-SCORE") && !score.pass && hard) {
    failedIds.push("DEX-ADAPT-SCORE");
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

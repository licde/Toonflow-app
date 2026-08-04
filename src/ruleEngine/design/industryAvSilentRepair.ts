/**
 * Industry AV Wave-2 — design-satisfy silent smart repair (homologous with autoClose).
 * Priority: face_split > onebeat (caller) > near_promote > av_atoms.
 * Never hard-blocks; writes design SSOT + durable changelog; marks adaptDiff.
 */
import { assessFaceBudget } from "../compilers/faceBudgetPolicy";
import {
  grammarDefaultForIntent,
  loadCinematicShotGrammar,
  shotSizeWiderThanNear,
  softGrammarHints,
} from "../compilers/cinematicShotGrammar";
import {
  ensureScreenSideOnShot,
  ensureEyelineDirOnShot,
  auditAxis180Pair,
  auditAxis180Chain,
  flipSpatialSideKeyword,
  readShotScreenSide,
} from "./screenSideAxis";
import { hasOnCameraDialogue } from "./onCameraDialogue";
import {
  applyRepairAsDesignToShot,
  planIndustryAvRepair,
  type RepairChangelogEntry,
} from "./repairAsDesign";
import {
  applySplitChildContinuity,
  buildSplitChildContinuitySeed,
} from "../compilers/splitChildContinuity";

export type IndustrySilentRepairResult = {
  shots: Record<string, unknown>[];
  changed: number;
  changelog: RepairChangelogEntry[];
  diffs: string[];
  residualDebts: string[];
};

const PRIORITY = [
  "face_split",
  "reaction_expand",
  "near_promote",
  "av_atoms",
  "eyeline",
  "grammar_defaults",
] as const;

function isReactionShot(shot: Record<string, unknown>): boolean {
  const role = String(shot.visualSplitRole ?? shot.beatRole ?? "").toLowerCase();
  if (/reaction|listen|react/.test(role)) return true;
  const tags = Array.isArray(shot.visualTags)
    ? (shot.visualTags as string[]).join(" ")
    : String(shot.visualTags ?? "");
  if (/\breaction\b|face_cu/.test(tags) && /反应|微怔|听者/.test(String(shot.visualDescription ?? ""))) {
    return true;
  }
  return /反应近景|听者微怔|反应特写/.test(String(shot.visualDescription ?? ""));
}

function isRevealOrPropInsert(shot: Record<string, unknown>): boolean {
  if (isReactionShot(shot)) return false;
  const role = String(shot.visualSplitRole ?? shot.beatRole ?? "").toLowerCase();
  if (/insert|reveal|prop/.test(role)) return true;
  const vd = String(shot.visualDescription ?? "");
  // Contact softenv / cheek paper — not a literary reveal needing reaction expand
  if (/贴颊|纸角|软环境|接触/.test(vd) && !/揭示|亮出|展开休书|甩出/.test(vd)) return false;
  return /揭示|亮出|展开|插入|特写递|物件|纸页翻开|甩出|抛出|递出/.test(vd);
}

function nextHasSpeakOrEmotionCliff(
  next: Record<string, unknown> | undefined,
  reveal: Record<string, unknown>,
): boolean {
  if (next && speakIntent(next)) return true;
  const lines =
    ((reveal.narrative as { dialogue?: { lines?: Array<{ functions?: string[]; reactionAction?: string }> } })
      ?.dialogue?.lines ?? []) as Array<{ functions?: string[]; reactionAction?: string }>;
  if (lines.some((l) => (l.functions ?? []).includes("emotion_hit") || Boolean(String(l.reactionAction ?? "").trim()))) {
    return true;
  }
  // Solo reveal with no following reaction beat — still expand when VD implies cliff
  return /决绝|震惊|愣住|骤然|爆发/.test(String(reveal.visualDescription ?? ""));
}

function isDesignLocked(shot: Record<string, unknown>): boolean {
  return shot.designLock === true || shot.authorOverrideLock === true;
}

function speakIntent(shot: Record<string, unknown>): boolean {
  const onCam = hasOnCameraDialogue(
    (shot.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue?.lines,
  );
  const lip = String(
    (shot.shotDesign as { lipSyncPolicy?: string } | undefined)?.lipSyncPolicy ?? "",
  );
  return onCam || /dialogue_native|native/i.test(lip);
}

function appendChangelog(
  shot: Record<string, unknown>,
  entry: Omit<RepairChangelogEntry, "at" | "packageVersion"> & { at?: string },
): RepairChangelogEntry {
  const full: RepairChangelogEntry = {
    ...entry,
    at: entry.at ?? new Date().toISOString(),
    packageVersion: Number(shot.packageVersion ?? 0),
  };
  const prev = Array.isArray(shot.repairChangelog) ? (shot.repairChangelog as RepairChangelogEntry[]) : [];
  shot.repairChangelog = [...prev, full].slice(-40);
  return full;
}

/** Promote dialogue-wide shots to 近景 (design SSOT). Idempotent. */
export function silentNearPromoteShot(shot: Record<string, unknown>): RepairChangelogEntry | null {
  if (isDesignLocked(shot) || !speakIntent(shot)) return null;
  if (shot._industryNearPromoted === true) return null;
  const size = String(shot.shotSize ?? (shot.narrative as { shotSize?: string })?.shotSize ?? "");
  if (!shotSizeWiderThanNear(size) && /近景|特写/.test(size)) return null;
  if (!shotSizeWiderThanNear(size) && size) return null;
  const before = size || "(empty)";
  const def = grammarDefaultForIntent("speak_lip");
  const nextSize = def?.shotSize ?? "近景";
  if (String(shot.shotSize ?? "") === nextSize) {
    shot._industryNearPromoted = true;
    return null;
  }
  shot.shotSize = nextSize;
  const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
  narr.shotSize = nextSize;
  shot.narrative = narr;
  let vd = String(shot.visualDescription ?? "");
  if (vd && !/面容可读|抬视线/.test(vd)) {
    vd = `${vd}${vd.endsWith("。") ? "" : "。"}面容可读，抬视线。`;
    shot.visualDescription = vd;
  }
  const sd = { ...((shot.shotDesign as Record<string, unknown>) ?? {}) };
  if (!sd.cameraMotion) sd.cameraMotion = def?.cameraMotion ?? "静止";
  if (!sd.lipSyncPolicy) sd.lipSyncPolicy = "dialogue_native";
  if (!sd.faceBudget) sd.faceBudget = def?.faceBudget ?? "must";
  shot.shotDesign = sd;
  shot.promptState = "stale";
  shot.videoStale = true;
  shot._industryNearPromoted = true;
  shot.packageVersion = Number(shot.packageVersion ?? 0) + 1;
  return appendChangelog(shot, {
    slot: "shotSize",
    before,
    after: nextSize,
    reason: "silent_near_promote",
    trigger: "dialogue_shot_too_wide",
  });
}

/** Fill grammar defaults without overriding author lock. */
export function applyGrammarDefaultsToShot(shot: Record<string, unknown>): RepairChangelogEntry[] {
  if (isDesignLocked(shot)) return [];
  const out: RepairChangelogEntry[] = [];
  const vdIntent = String(shot.visualDescription ?? "");
  const intent = speakIntent(shot)
    ? "speak_lip"
    : /过肩|OTS|过肩镜头/i.test(vdIntent)
      ? "ots"
      : /特写|道具|纸角/.test(vdIntent)
        ? "prop_cu"
        : "action_primary";
  const def = grammarDefaultForIntent(intent);
  if (!def) return out;
  if (!String(shot.shotSize ?? "").trim() && def.shotSize) {
    const before = String(shot.shotSize ?? "");
    shot.shotSize = def.shotSize;
    out.push(
      appendChangelog(shot, {
        slot: "shotSize",
        before: before || "(empty)",
        after: def.shotSize,
        reason: "grammar_default",
        trigger: "design_satisfy_defaults",
      }),
    );
  }
  const sd = { ...((shot.shotDesign as Record<string, unknown>) ?? {}) };
  let sdChanged = false;
  if (!sd.cameraMotion && def.cameraMotion) {
    sd.cameraMotion = def.cameraMotion;
    sdChanged = true;
  }
  if (speakIntent(shot) && !sd.lipSyncPolicy) {
    sd.lipSyncPolicy = "dialogue_native";
    sdChanged = true;
  }
  if (!sd.faceBudget && def.faceBudget) {
    sd.faceBudget = def.faceBudget;
    sdChanged = true;
  }
  if (sdChanged) {
    shot.shotDesign = sd;
    out.push(
      appendChangelog(shot, {
        slot: "shotDesign",
        before: "",
        after: JSON.stringify({ cameraMotion: sd.cameraMotion, lipSyncPolicy: sd.lipSyncPolicy }),
        reason: "grammar_default",
        trigger: "design_satisfy_defaults",
      }),
    );
  }
    if (intent === "ots") {
    const axisHint = softGrammarHints(["axis180"])[0] ?? "保持180度轴线，过肩对切不越轴";
    const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
    const beats = Array.isArray(narr.avBeats) ? [...(narr.avBeats as string[])] : [];
    if (!beats.includes(axisHint)) {
      const before = beats.join("|");
      beats.push(axisHint);
      narr.avBeats = beats;
      shot.narrative = narr;
      out.push(
        appendChangelog(shot, {
          slot: "narrative.avBeats",
          before: before || "(empty)",
          after: beats.join("|"),
          reason: "ots_axis180_default",
          trigger: "eyeline_axis",
        }),
      );
    }
  }
  if (out.length) {
    shot.packageVersion = Number(shot.packageVersion ?? 0) + 1;
    shot.promptState = "stale";
  }
  return out;
}

/** Design-time AV atoms: breath / static cam / sfx hints. */
export function applyAvAtomsToShot(shot: Record<string, unknown>): RepairChangelogEntry[] {
  if (isDesignLocked(shot) || !speakIntent(shot)) return [];
  if (shot._industryAvAtoms === true) return [];
  const out: RepairChangelogEntry[] = [];
  const hints = softGrammarHints(["dialogueBreath", "staticOnSpeak", "axis", "jCut", "lCut", "axis180"]);
  const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
  const beats = Array.isArray(narr.avBeats) ? [...(narr.avBeats as string[])] : [];
  for (const h of hints) {
    if (h && !beats.includes(h)) beats.push(h);
  }
  if (beats.length) {
    narr.avBeats = beats;
    shot.narrative = narr;
    out.push(
      appendChangelog(shot, {
        slot: "narrative.avBeats",
        before: "",
        after: beats.join("|"),
        reason: "av_atoms_design_time",
        trigger: "cam_speak",
      }),
    );
  }
  const sd = { ...((shot.shotDesign as Record<string, unknown>) ?? {}) };
  if (speakIntent(shot) && sd.cameraMotion !== "静止") {
    const before = String(sd.cameraMotion ?? "");
    sd.cameraMotion = "静止";
    shot.shotDesign = sd;
    out.push(
      appendChangelog(shot, {
        slot: "shotDesign.cameraMotion",
        before,
        after: "静止",
        reason: "static_on_speak",
        trigger: "cam_speak",
      }),
    );
  }
  if (!String((shot as { microExpression?: string }).microExpression ?? "").trim() && speakIntent(shot)) {
    (shot as { microExpression?: string }).microExpression = "抬视线，口型可读";
    out.push(
      appendChangelog(shot, {
        slot: "microExpression",
        before: "",
        after: "抬视线，口型可读",
        reason: "face_read_default",
        trigger: "face_unreadability",
      }),
    );
  }
  shot._industryAvAtoms = true;
  if (out.length) {
    shot.packageVersion = Number(shot.packageVersion ?? 0) + 1;
    shot.promptState = "stale";
    shot.videoStale = true;
  }
  return out;
}

/** Same-scene left/right eyeline heal (keyword). */
export function healEyelinePair(
  prev: Record<string, unknown> | null,
  shot: Record<string, unknown>,
): { entry?: RepairChangelogEntry; debt?: string } {
  if (!prev || isDesignLocked(shot)) return {};
  const pScene = String(prev.sceneCode ?? prev.sceneName ?? "");
  const cScene = String(shot.sceneCode ?? shot.sceneName ?? "");
  if (pScene && cScene && pScene !== cScene) return {};
  const pSp = String(
    (prev.narrative as { spatialRelation?: string })?.spatialRelation ?? prev.spatialRelation ?? "",
  );
  const cSp = String(
    (shot.narrative as { spatialRelation?: string })?.spatialRelation ?? shot.spatialRelation ?? "",
  );
  const pLeft = /左/.test(pSp);
  const pRight = /右/.test(pSp);
  const cLeft = /左/.test(cSp);
  const cRight = /右/.test(cSp);
  // Flip without axis note → soft debt (never block)
  if ((pLeft && cLeft && pRight === false && cRight === false) || (pRight && cRight && !pLeft && !cLeft)) {
    if (/对切|正反打|过肩/.test(String(shot.visualDescription ?? "") + cSp)) {
      return { debt: "eyeline_axis_ambiguous" };
    }
    const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
    const before = cSp;
    const fixed = pLeft ? cSp.replace(/左/g, "右") : cSp.replace(/右/g, "左");
    if (fixed !== cSp && cSp) {
      const axisHint = softGrammarHints(["axis180"])[0] ?? "保持180度轴线，过肩对切不越轴";
      const beats = Array.isArray(narr.avBeats) ? [...(narr.avBeats as string[])] : [];
      if (!beats.includes(axisHint)) beats.push(axisHint);
      narr.spatialRelation = fixed;
      narr.avBeats = beats;
      shot.narrative = narr;
      shot.promptState = "stale";
            ensureScreenSideOnShot(shot);
return {
        entry: appendChangelog(shot, {
          slot: "spatialRelation",
          before,
          after: fixed,
          reason: "eyeline_axis_heal",
          trigger: "eyeline_axis",
        }),
      };
    }return { debt: "eyeline_axis_unresolved" };
  }
  return {};
}

/**
 * After reveal/prop insert, if next shot is not a reaction and cliff/dialogue follows,
 * silently expand a reaction MCU using grammar `reaction` defaults. Idempotent.
 */
export function expandRevealThenReaction(
  shots: Record<string, unknown>[],
): { shots: Record<string, unknown>[]; expanded: number; changelog: RepairChangelogEntry[] } {
  const out: Record<string, unknown>[] = [];
  let expanded = 0;
  const changelog: RepairChangelogEntry[] = [];
  const reactDef = grammarDefaultForIntent("reaction");

  for (let i = 0; i < shots.length; i++) {
    const s = shots[i]!;
    const next = shots[i + 1];
    if (
      isDesignLocked(s) ||
      s._industryReactionExpanded === true ||
      s._faceBudgetSplitId ||
      s.burnParentForbidden ||
      !isRevealOrPropInsert(s)
    ) {
      out.push(s);
      continue;
    }
    if (next && isReactionShot(next)) {
      out.push(s);
      continue;
    }
    if (!nextHasSpeakOrEmotionCliff(next, s)) {
      out.push(s);
      continue;
    }

    const splitId = `react-${s.clientId ?? s.shotIndex ?? out.length}-${Date.now()}`;
    const parent = {
      ...s,
      _industryReactionExpanded: true,
      _visualSplitId: String(s._visualSplitId ?? splitId),
    };
    const seed = buildSplitChildContinuitySeed(parent);
    const ra =
      String(
        (
          (s.narrative as { dialogue?: { lines?: Array<{ reactionAction?: string }> } })?.dialogue
            ?.lines ?? []
        ).find((l) => String(l.reactionAction ?? "").trim())?.reactionAction ?? "",
      ).trim() || "听者微怔";
    const size = reactDef?.shotSize ?? "近景";
    const reactionChild: Record<string, unknown> = applySplitChildContinuity(
      {
        ...s,
        clientId: `${s.clientId ?? s.shotIndex}-reaction`,
        shotIndex: Number(s.shotIndex ?? 0) + 0.05,
        visualSplitRole: "reaction",
        beatRole: "reaction",
        _visualSplitId: splitId,
        _industryReactionExpanded: true,
        shotSize: size,
        visualDescription: `${size}。${ra}，面容可读。`,
        narrative: {
          ...((s.narrative as object) ?? {}),
          shotSize: size,
          dialogue: { lines: [] },
          // LGIA: reaction child is held/face — not parent's approaching bend soup
          stillPhase: "held",
          stillPhaseSource: "split_child_policy",
          stillPhaseReason: "reaction_held_face",
          contactStartState: "at_locus",
        },
        shotDesign: {
          ...((s.shotDesign as object) ?? {}),
          lipSyncPolicy: "silent",
          cameraMotion: reactDef?.cameraMotion ?? "静止",
          faceBudget: reactDef?.faceBudget ?? "must",
        },
        visualTags: ["reaction", "face_cu"],
        promptState: "stale",
        videoStale: true,
        filePath: undefined,
        packageVersion: Number(s.packageVersion ?? 0) + 1,
      },
      seed,
    );
    changelog.push(
      appendChangelog(parent, {
        slot: "split",
        before: "reveal_only",
        after: "reveal_then_reaction",
        reason: "missing_reaction_after_reveal",
        trigger: "reveal_then_reaction",
      }),
    );
    parent.promptState = "stale";
    parent.videoStale = true;
    parent.packageVersion = Number(parent.packageVersion ?? 0) + 1;
    out.push(parent, reactionChild);
    expanded += 1;
  }
  return { shots: out, expanded, changelog };
}

/**
 * Expand bow+speak+wide into action + dialogue MCU children (silent).
 * Idempotent via _faceBudgetSplitId.
 */
export function expandActionThenDialogueMcu(
  shots: Record<string, unknown>[],
): { shots: Record<string, unknown>[]; expanded: number; changelog: RepairChangelogEntry[] } {
  const out: Record<string, unknown>[] = [];
  let expanded = 0;
  const changelog: RepairChangelogEntry[] = [];
  for (const s of shots) {
    if (isDesignLocked(s) || s._faceBudgetSplitId || s._stillBeatSplitId || s._visualSplitId) {
      out.push(s);
      continue;
    }
    const vd = String(s.visualDescription ?? "");
    const onCam = speakIntent(s);
    const budget = assessFaceBudget({
      visualDescription: vd,
      shotSize: String(s.shotSize ?? ""),
      hasDialogue: onCam,
      lipSyncPolicy: String((s.shotDesign as { lipSyncPolicy?: string })?.lipSyncPolicy ?? ""),
      videoIntentClass: onCam ? "speak_lip" : undefined,
      realizationOccupancy: String(s.realizationOccupancy ?? ""),
      intentOccupancy: String(s.intentOccupancy ?? ""),
    });
    if (!budget.unreachable) {
      out.push(s);
      continue;
    }
    const splitId = `facebud-${s.clientId ?? s.shotIndex ?? out.length}-${Date.now()}`;
    const parent = { ...s, burnParentForbidden: true, _faceBudgetSplitId: splitId, irdConfirmRequired: false };
    const seed = buildSplitChildContinuitySeed(parent);
    const actionChild: Record<string, unknown> = applySplitChildContinuity(
      {
        ...s,
        clientId: `${s.clientId ?? s.shotIndex}-action`,
        shotIndex: Number(s.shotIndex ?? 0),
        visualSplitRole: "action",
        beatRole: "action",
        _visualSplitId: splitId,
        _faceBudgetSplitId: splitId,
        shotSize: grammarDefaultForIntent("action_primary")?.shotSize ?? "中景",
        visualDescription: vd.replace(/[，,]?\s*[^。]*说[^。]*/g, "").trim() || vd,
        narrative: {
          ...((s.narrative as object) ?? {}),
          dialogue: { lines: [] },
          // LGIA: action child inherits parent stillPhase (process freeze)
          stillPhase:
            (s.narrative as { stillPhase?: string } | undefined)?.stillPhase ?? "approaching",
          stillPhaseSource: "split_child_inherit",
          stillPhaseReason: "face_split_action_inherit",
          literaryPrimary:
            (s.narrative as { literaryPrimary?: string } | undefined)?.literaryPrimary,
        },
        shotDesign: {
          ...((s.shotDesign as object) ?? {}),
          lipSyncPolicy: "silent",
          faceBudget: "optional",
        },
        promptState: "stale",
        videoStale: true,
      },
      seed,
    );
    const speakDef = grammarDefaultForIntent("speak_lip");
    const speakChild: Record<string, unknown> = applySplitChildContinuity(
      {
        ...s,
        clientId: `${s.clientId ?? s.shotIndex}-speak`,
        shotIndex: Number(s.shotIndex ?? 0) + 0.1,
        visualSplitRole: "speak",
        beatRole: "speak",
        _visualSplitId: splitId,
        _faceBudgetSplitId: splitId,
        shotSize: speakDef?.shotSize ?? "近景",
        visualDescription: /面容可读|抬视线/.test(vd)
          ? vd
          : `${vd.replace(/弯腰|俯身|低头|跪持/g, "抬视线").slice(0, 180)}${vd.endsWith("。") ? "" : "。"}近景面容可读，抬视线口型。`,
        narrative: {
          ...((s.narrative as object) ?? {}),
          // LGIA: speak child is held/face dialogue — not parent approaching soup
          stillPhase: "held",
          stillPhaseSource: "split_child_policy",
          stillPhaseReason: "face_split_speak_held",
          literaryPrimary:
            (s.narrative as { literaryPrimary?: string } | undefined)?.literaryPrimary,
        },
        shotDesign: {
          ...((s.shotDesign as object) ?? {}),
          lipSyncPolicy: "dialogue_native",
          cameraMotion: "静止",
          faceBudget: "must",
        },
        promptState: "stale",
        videoStale: true,
        _industryNearPromoted: true,
      },
      seed,
    );
    parent.promptState = "stale";
    changelog.push(
      appendChangelog(parent, {
        slot: "split",
        before: "single_bow_speak",
        after: "action_then_dialogue_mcu",
        reason: "face_budget_unreachable",
        trigger: "face_budget_unreachable",
      }),
    );
    out.push(parent, actionChild, speakChild);
    expanded += 1;
  }
  return { shots: out, expanded, changelog };
}

/**
 * Wave-3: consecutive on-camera dialogue → stamp L-cut on prev + J-cut on next (design avBeats).
 * Idempotent; never invents literary lines.
 */
export function ensureAdjacentJlCutAvBeats(
  shots: Record<string, unknown>[],
): { changed: number; changelog: RepairChangelogEntry[] } {
  const changelog: RepairChangelogEntry[] = [];
  let changed = 0;
  const jCut = softGrammarHints(["jCut"])[0] ?? "下句声先入再切画";
  const lCut = softGrammarHints(["lCut"])[0] ?? "本镜声延至下画";
  for (let i = 0; i < shots.length - 1; i++) {
    const a = shots[i]!;
    const b = shots[i + 1]!;
    if (isDesignLocked(a) || isDesignLocked(b)) continue;
    if (!speakIntent(a) || !speakIntent(b)) continue;
    const sceneA = String(a.sceneCode ?? a.sceneName ?? "");
    const sceneB = String(b.sceneCode ?? b.sceneName ?? "");
    if (sceneA && sceneB && sceneA !== sceneB) continue;
    const stamp = (shot: Record<string, unknown>, hint: string, reason: string) => {
      const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
      const beats = Array.isArray(narr.avBeats) ? [...(narr.avBeats as string[])] : [];
      if (beats.includes(hint) || beats.some((x) => x.includes(hint.slice(0, 4)))) return false;
      const before = beats.join("|");
      beats.push(hint);
      narr.avBeats = beats;
      shot.narrative = narr;
      shot.promptState = "stale";
      shot.videoStale = true;
      shot.packageVersion = Number(shot.packageVersion ?? 0) + 1;
      changelog.push(
        appendChangelog(shot, {
          slot: "narrative.avBeats",
          before: before || "(empty)",
          after: beats.join("|"),
          reason,
          trigger: "jl_cut_adjacent",
        }),
      );
      return true;
    };
    if (stamp(a, lCut, "silent_l_cut_adjacent")) changed += 1;
    if (stamp(b, jCut, "silent_j_cut_adjacent")) changed += 1;
  }
  return { changed, changelog };
}

/** Run full industry silent repair pass in priority order. */
export function runIndustryAvSilentRepair(
  shotsIn: Record<string, unknown>[],
  opts?: { skipSplit?: boolean; maxMs?: number },
): IndustrySilentRepairResult {
  const t0 = Date.now();
  const maxMs = opts?.maxMs ?? 8000;
  let shots = shotsIn.map((s) => ({ ...s }));
  const changelog: RepairChangelogEntry[] = [];
  const diffs: string[] = [];
  const residualDebts: string[] = [];

  // 1) face split first
  if (!opts?.skipSplit) {
    const ex = expandActionThenDialogueMcu(shots);
    shots = ex.shots;
    changelog.push(...ex.changelog);
    if (ex.expanded) diffs.push(`face_split×${ex.expanded}`);
  }
  // LGIA: IntentGraph + stillPhase stamp (design refinement first)
  {
    try {
      const { applyLiteraryIntentGraphToShot } =
        require("../compilers/literaryIntentGraph") as typeof import("../compilers/literaryIntentGraph");
      for (const sh of shots) {
        if (isDesignLocked(sh)) continue;
        const r = applyLiteraryIntentGraphToShot(sh);
        if (r.changed) {
          for (const d of r.diffs) {
            changelog.push(
              appendChangelog(sh, {
                slot: d.split(":")[0] ?? "lgia",
                before: "(empty)",
                after: d,
                reason: "lgia_intent_graph",
                trigger: "lgia",
              }),
            );
            diffs.push(`lgia:${d}`);
          }
        }
        if (r.graph.stillPhasePlan.stillPhase === "approaching") {
          residualDebts.push("still_phase_approaching");
        }
      }
    } catch {
      /* optional */
    }
  }
  if (Date.now() - t0 > maxMs) {
    residualDebts.push("industry_repair_timeout");
    return { shots, changed: changelog.length, changelog, diffs, residualDebts };
  }

  // 1b) reveal → reaction silent expand
  {
    const rx = expandRevealThenReaction(shots);
    shots = rx.shots;
    changelog.push(...rx.changelog);
    if (rx.expanded) diffs.push(`reaction_expand×${rx.expanded}`);
  }
    // 1c) adjacent dialogue J/L-cut avBeats
  {
    const jl = ensureAdjacentJlCutAvBeats(shots);
    changelog.push(...jl.changelog);
    if (jl.changed) diffs.push(`jl_cut×${jl.changed}`);
  }
    // 1d) Wave-4 screenSide SSOT + axis180 same-side soft heal
  {
    for (const sh of shots) {
      ensureScreenSideOnShot(sh);
      ensureEyelineDirOnShot(sh);
      // Wave-11: fill unknown side/eyeline from local/real face box (soft)
      try {
        const { ensureScreenSideFromFaceBox, ensureEyelineFromFaceBoxLookingRoom } =
          require("./faceBoxAxisSoft") as typeof import("./faceBoxAxisSoft");
        const s = ensureScreenSideFromFaceBox(sh);
        if (s.changed) {
          changelog.push(
            appendChangelog(sh, {
              slot: "narrative.screenSide",
              before: "(empty)",
              after: s.side,
              reason: "screenSide_from_face_box",
              trigger: "face_box_soft",
            }),
          );
          diffs.push(`screenSideBox:${sh.clientId ?? sh.shotIndex}`);
        }
        const e = ensureEyelineFromFaceBoxLookingRoom(sh);
        if (e.changed) {
          changelog.push(
            appendChangelog(sh, {
              slot: "narrative.eyelineDir",
              before: "(empty)",
              after: e.dir,
              reason: "eyeline_from_face_box_looking_room",
              trigger: "face_box_soft",
            }),
          );
          diffs.push(`eyelineBox:${sh.clientId ?? sh.shotIndex}`);
        }
      } catch {
        /* optional */
      }
    }
    for (let i = 1; i < shots.length; i++) {
      const prev = shots[i - 1]!;
      const cur = shots[i]!;
      if (isDesignLocked(cur)) continue;
      const axis = auditAxis180Pair(prev, cur);
      if (axis.ok) continue;
      if (axis.finding === "axis180_same_side" || axis.finding === "axis180_same_side_face_box") {
        const narr = { ...((cur.narrative as Record<string, unknown>) ?? {}) };
        const before = String(narr.spatialRelation ?? "");
        const fixed = flipSpatialSideKeyword(before);
        if (!fixed || fixed === before) {
          residualDebts.push(axis.finding);
          continue;
        }
        narr.spatialRelation = fixed;
        cur.narrative = narr;
        ensureScreenSideOnShot(cur);
        cur.promptState = "stale";
        cur.videoStale = true;
        changelog.push(
          appendChangelog(cur, {
            slot: "spatialRelation",
            before: before || "(empty)",
            after: fixed,
            reason: axis.finding === "axis180_same_side_face_box" ? "axis180_face_box_heal" : "axis180_pair_heal",
            trigger: "eyeline_axis",
          }),
        );
        diffs.push(`axis180:${cur.clientId ?? cur.shotIndex}`);
        continue;
      }
      if (axis.finding === "axis180_same_eyeline") {
        const { flipEyelineKeyword } = require("./screenSideAxis") as typeof import("./screenSideAxis");
        const before = String(cur.visualDescription ?? "");
        const fixed = flipEyelineKeyword(before);
        if (!fixed || fixed === before) {
          residualDebts.push("axis180_same_eyeline");
          continue;
        }
        cur.visualDescription = fixed;
        ensureEyelineDirOnShot(cur);
        cur.promptState = "stale";
        cur.videoStale = true;
        changelog.push(
          appendChangelog(cur, {
            slot: "visualDescription",
            before: before || "(empty)",
            after: fixed,
            reason: "axis180_eyeline_heal",
            trigger: "eyeline_axis",
          }),
        );
        // Also refresh eyelineDir SSOT after VD flip
        const narrE = { ...((cur.narrative as Record<string, unknown>) ?? {}) };
        const eyeBefore = String(narrE.eyelineDir ?? "(empty)");
        ensureEyelineDirOnShot(cur);
        const eyeAfter = String(
          ((cur.narrative as { eyelineDir?: string } | undefined)?.eyelineDir ?? "") || "(empty)",
        );
        if (eyeBefore !== eyeAfter) {
          changelog.push(
            appendChangelog(cur, {
              slot: "narrative.eyelineDir",
              before: eyeBefore,
              after: eyeAfter,
              reason: "eyelineDir_stamp",
              trigger: "eyeline_axis",
            }),
          );
        }
        diffs.push(`axis180_eyeline:${cur.clientId ?? cur.shotIndex}`);
      }
    }
    // Wave-14/15: episode/scene axis chain rollup + soft axis notes on scene
    try {
      const chain = auditAxis180Chain(shots);
      for (const p of chain.pairFindings) {
        if (!residualDebts.includes(p.finding)) residualDebts.push(p.finding);
      }
      if (chain.chainFinding) {
        residualDebts.push(chain.chainFinding);
        diffs.push(`axis180_chain:${chain.chainFinding}`);
        const axisHint = softGrammarHints(["axis180"])[0] ?? "保持180度轴线，过肩对切不越轴";
        const riskScenes = new Set(
          Object.entries(chain.sceneFailCounts)
            .filter(([, n]) => n >= 2)
            .map(([sc]) => sc),
        );
        for (const sh of shots) {
          if (isDesignLocked(sh)) continue;
          const scene = String(sh.sceneCode ?? sh.sceneName ?? "_");
          if (!riskScenes.has(scene) && !riskScenes.has("_")) continue;
          const blob = `${String(sh.visualDescription ?? "")} ${String(
            (sh.narrative as { spatialRelation?: string } | undefined)?.spatialRelation ?? "",
          )}`;
          if (!/过肩|OTS|对切|正反打|反打|对视/.test(blob)) continue;
          const narr = { ...((sh.narrative as Record<string, unknown>) ?? {}) };
          const beats = Array.isArray(narr.avBeats) ? [...(narr.avBeats as string[])] : [];
          if (beats.some((b) => /180|轴线|不越轴/.test(String(b)))) continue;
          beats.push(axisHint);
          narr.avBeats = beats;
          narr.axisChainNote = chain.chainFinding;
          sh.narrative = narr;
          sh.promptState = "stale";
          sh.videoStale = true;
          changelog.push(
            appendChangelog(sh, {
              slot: "narrative.avBeats",
              before: "(empty)",
              after: axisHint.slice(0, 40),
              reason: "axis180_chain_soft_note",
              trigger: "axis180_chain",
            }),
          );
          diffs.push(`axisChainNote:${sh.clientId ?? sh.shotIndex}`);
        }
      }
    } catch {
      /* optional */
    }
  }
  // Wave-5A/B / Wave-6: composition soft / measured residuals (never hard-block)
  // Wave-14: silent heal provisional / measured-fail composition via RepairAsDesign
  {
    try {
      const { assessComposition } =
        require("../compilers/compositionAssess") as typeof import("../compilers/compositionAssess");
      const {
        readFaceBoxNormFromMeta,
        readProvisionalFaceBoxFromMeta,
        keyOrAdapterPresentFromMeta,
      } = require("../compilers/faceBoxNormFromMeta") as typeof import("../compilers/faceBoxNormFromMeta");
      const { ensureTransitionAudioFromAvBeats } =
        require("../compilers/transitionAudioStamp") as typeof import("../compilers/transitionAudioStamp");
      const HEAL_COMP = new Set([
        "headroom_soft_provisional",
        "looking_room_soft_provisional",
        "headroom_tight",
        "looking_room_fail",
        "headroom_undeclared",
        "looking_room_undeclared",
      ]);
      for (const sh of shots) {
        const meta = sh as Record<string, unknown>;
        const keyPresent = keyOrAdapterPresentFromMeta(meta);
        const faceBox = readFaceBoxNormFromMeta(meta);
        const provisional = faceBox ? null : readProvisionalFaceBoxFromMeta(meta);
        if (faceBox && !(meta.faceBoxNorm as unknown)) meta.faceBoxNorm = faceBox;
        const r = assessComposition({
          keyOrAdapterPresent: keyPresent,
          faceBoxNorm: faceBox,
          provisionalFaceBoxNorm: provisional,
          visualDescription: String(sh.visualDescription ?? ""),
          shotSize: String(sh.shotSize ?? (sh.narrative as { shotSize?: string } | undefined)?.shotSize ?? ""),
          spatialRelation: String(
            (sh.narrative as { spatialRelation?: string } | undefined)?.spatialRelation ?? "",
          ),
          faceBudget: String((sh as { faceBudget?: string }).faceBudget ?? ""),
        });
        for (const f of r.findings) residualDebts.push(f.id);
        if (r.pixelDimStatus === "unmeasured" && r.findings.length) {
          residualDebts.push("composition_unmeasured");
        }
        if (r.pixelDimStatus === "measured_fail") residualDebts.push("composition_measured_fail");
        (sh as { pixelDimStatus?: string }).pixelDimStatus = r.pixelDimStatus;

        if (!isDesignLocked(sh)) {
          // Wave-16: stamp framing room SSOT from box + findings
          try {
            const { ensureFramingRoomFromFaceBox, stampFramingRoomFromFindings } =
              require("./framingRoomSoft") as typeof import("./framingRoomSoft");
            const fr = ensureFramingRoomFromFaceBox(sh);
            const st = stampFramingRoomFromFindings(
              sh,
              r.findings.map((f) => f.id),
            );
            if (fr.changed || st.changed) {
              changelog.push(
                appendChangelog(sh, {
                  slot: "narrative.headroomStatus",
                  before: "(empty)",
                  after: `${String((sh.narrative as { headroomStatus?: string })?.headroomStatus ?? "")}/${String((sh.narrative as { lookingRoomStatus?: string })?.lookingRoomStatus ?? "")}`,
                  reason: "framing_room_soft",
                  trigger: "composition_framing",
                }),
              );
              diffs.push(`framingRoom:${sh.clientId ?? sh.shotIndex}`);
            }
            // Wave-17: soft residual debts from framing SSOT
            const hr = String((sh.narrative as { headroomStatus?: string } | undefined)?.headroomStatus ?? "");
            const lr = String((sh.narrative as { lookingRoomStatus?: string } | undefined)?.lookingRoomStatus ?? "");
            if (hr === "tight") residualDebts.push("framing_headroom_tight");
            if (lr === "tight") residualDebts.push("framing_looking_room_tight");
          } catch {
            /* optional */
          }
          for (const f of r.findings) {
            if (!HEAL_COMP.has(f.id)) continue;
            const plan = planIndustryAvRepair({ kind: f.id, shot: sh, hint: f.hint ?? f.message });
            if (!plan.writes.length) continue;
            const before = String(sh.visualDescription ?? "");
            const applied = applyRepairAsDesignToShot(sh, plan);
            if (applied.applied.length) {
              changelog.push(
                appendChangelog(sh, {
                  slot: "visualDescription",
                  before: before || "(empty)",
                  after: String(sh.visualDescription ?? "").slice(0, 120),
                  reason: `composition_heal:${f.id}`,
                  trigger: r.provisionalSoft ? "composition_provisional" : "composition_soft",
                }),
              );
              diffs.push(`compHeal:${f.id}:${sh.clientId ?? sh.shotIndex}`);
            }
          }
        }

        // Wave-6: design-side transitionAudio mirror from avBeats (not full NLE)
        const ta = ensureTransitionAudioFromAvBeats(sh);
        if (ta.changed) {
          changelog.push(
            appendChangelog(sh, {
              slot: "narrative.transitionAudio",
              before: "(empty)",
              after: ta.stamp?.note ?? "",
              reason: "transition_audio_from_avBeats",
              trigger: "jl_cut",
            }),
          );
          diffs.push(`transitionAudio:${sh.clientId ?? sh.shotIndex}`);
        }
      }
    } catch {
      /* optional */
    }
  }
  if (Date.now() - t0 > maxMs) {
    residualDebts.push("industry_repair_timeout");
    return { shots, changed: changelog.length, changelog, diffs, residualDebts };
  }

  // 2–5 per shot
  let prev: Record<string, unknown> | null = null;
  for (const s of shots) {
    if (s.burnParentForbidden && s._faceBudgetSplitId && !s._visualSplitId) {
      prev = s;
      continue;
    }
    for (const step of PRIORITY) {
      if (Date.now() - t0 > maxMs) {
        residualDebts.push("industry_repair_timeout");
        break;
      }
      if (step === "face_split" || step === "reaction_expand") continue;
      if (step === "grammar_defaults") {
        changelog.push(...applyGrammarDefaultsToShot(s));
      } else if (step === "near_promote") {
        // Skip near-promote on action child after face split
        if (String(s.visualSplitRole ?? "") === "action") continue;
        const e = silentNearPromoteShot(s);
        if (e) {
          changelog.push(e);
          diffs.push(`near:${s.clientId ?? s.shotIndex}`);
        }
      } else if (step === "av_atoms") {
        changelog.push(...applyAvAtomsToShot(s));
      } else if (step === "eyeline") {
        const h = healEyelinePair(prev, s);
        if (h.entry) changelog.push(h.entry);
        if (h.debt) residualDebts.push(h.debt);
      }
    }
    // RepairAsDesign industry kinds
    if (speakIntent(s) && /面容|抬脸|低头/.test(String(s.visualDescription ?? ""))) {
      const plan = planIndustryAvRepair({ kind: "face_unreadability", shot: s });
      if (plan.writes.length && !isDesignLocked(s)) {
        applyRepairAsDesignToShot(s, plan);
      }
    }
    prev = s;
  }

  loadCinematicShotGrammar(); // warm cache
  return {
    shots,
    changed: changelog.length,
    changelog,
    diffs: [...new Set(diffs)],
    residualDebts: [...new Set(residualDebts)],
  };
}

export function collectRepairChangelog(shots: Record<string, unknown>[]): RepairChangelogEntry[] {
  const all: RepairChangelogEntry[] = [];
  for (const s of shots) {
    if (Array.isArray(s.repairChangelog)) all.push(...(s.repairChangelog as RepairChangelogEntry[]));
  }
  return all.slice(-80);
}

const UNDOABLE_SLOTS = new Set([
  "shotSize",
  "visualDescription",
  "microExpression",
  "spatialRelation",
  "narrative.screenSide",
  "narrative.eyelineDir",
  "shotDesign.cameraMotion",
  "narrative.avBeats",
]);

/** Restore one changelog entry's `before` onto the shot. Split expands are not auto-collapsed. */
export function undoRepairChangelogEntry(
  shot: Record<string, unknown>,
  entry: RepairChangelogEntry,
): { ok: boolean; residual?: string } {
  if (isDesignLocked(shot)) return { ok: false, residual: "design_locked" };
  if (entry.slot === "split" || entry.reason?.includes("split") || entry.after === "reveal_then_reaction") {
    return { ok: false, residual: "undo_split_manual" };
  }
  if (!UNDOABLE_SLOTS.has(entry.slot) && entry.slot !== "shotDesign") {
    return { ok: false, residual: `undo_unsupported:${entry.slot}` };
  }
  const before = entry.before === "(empty)" ? "" : entry.before;
  if (entry.slot === "shotSize") {
    shot.shotSize = before || undefined;
    const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
    if (before) narr.shotSize = before;
    else delete narr.shotSize;
    shot.narrative = narr;
    delete shot._industryNearPromoted;
  } else if (entry.slot === "visualDescription") {
    shot.visualDescription = before;
  } else if (entry.slot === "microExpression") {
    (shot as { microExpression?: string }).microExpression = before || undefined;
  } else if (entry.slot === "spatialRelation") {
    const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
    narr.spatialRelation = before;
    // Clear stamped side so ensureScreenSide re-derives from restored spatial
    delete narr.screenSide;
    shot.narrative = narr;
    try {
      ensureScreenSideOnShot(shot);
    } catch {
      /* optional */
    }
  } else if (entry.slot === "narrative.screenSide") {
    const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
    if (before) narr.screenSide = before;
    else delete narr.screenSide;
    shot.narrative = narr;
  } else if (entry.slot === "narrative.eyelineDir") {
    const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
    if (before && before !== "(empty)") narr.eyelineDir = before;
    else delete narr.eyelineDir;
    shot.narrative = narr;
  } else if (entry.slot === "shotDesign.cameraMotion") {
    const sd = { ...((shot.shotDesign as Record<string, unknown>) ?? {}) };
    sd.cameraMotion = before || undefined;
    shot.shotDesign = sd;
  } else if (entry.slot === "narrative.avBeats") {
    const narr = { ...((shot.narrative as Record<string, unknown>) ?? {}) };
    narr.avBeats = before ? before.split("|").filter(Boolean) : [];
    shot.narrative = narr;
    delete shot._industryAvAtoms;
  } else if (entry.slot === "shotDesign") {
    // best-effort: leave shotDesign; mark residual
    return { ok: false, residual: "undo_shotDesign_manual" };
  }
  const log = Array.isArray(shot.repairChangelog)
    ? [...(shot.repairChangelog as RepairChangelogEntry[])]
    : [];
  const idx = log.findIndex(
    (e) => e.at === entry.at && e.slot === entry.slot && e.after === entry.after && e.before === entry.before,
  );
  if (idx >= 0) log.splice(idx, 1);
  log.push({
    slot: entry.slot,
    before: entry.after,
    after: before || "(empty)",
    reason: "undo_silent_repair",
    trigger: entry.trigger,
    at: new Date().toISOString(),
    packageVersion: Number(shot.packageVersion ?? 0),
  });
  shot.repairChangelog = log.slice(-40);
  shot.packageVersion = Number(shot.packageVersion ?? 0) + 1;
  shot.promptState = "stale";
  shot.videoStale = true;
  return { ok: true };
}

/** Undo last N undoable silent-repair entries on a shot (cross-session via persisted changelog). */
export function undoLastIndustryRepairs(
  shot: Record<string, unknown>,
  count = 1,
): { undone: number; residuals: string[] } {
  const log = Array.isArray(shot.repairChangelog)
    ? [...(shot.repairChangelog as RepairChangelogEntry[])]
    : [];
  const residuals: string[] = [];
  let undone = 0;
  for (let n = 0; n < count; n++) {
    let target: RepairChangelogEntry | undefined;
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i]!;
      if (e.reason === "undo_silent_repair") continue;
      target = e;
      break;
    }
    if (!target) break;
    const r = undoRepairChangelogEntry(shot, target);
    if (r.ok) {
      undone += 1;
      // refresh local log from shot
      log.length = 0;
      log.push(...((shot.repairChangelog as RepairChangelogEntry[]) ?? []));
    } else if (r.residual) {
      residuals.push(r.residual);
      // skip this entry so we can try older ones
      const idx = log.findIndex(
        (e) =>
          e.at === target!.at &&
          e.slot === target!.slot &&
          e.after === target!.after &&
          e.before === target!.before,
      );
      if (idx >= 0) log.splice(idx, 1);
    }
  }
  return { undone, residuals };
}

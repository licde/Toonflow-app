/**
 * SplitOrchestrator — after A/B/C split: mirror → shot sync → NAR/DC01 recheck → duration/ledger.
 * Compatible with runShotExpanders (VisBeat): call expanders first, then this for dialogue fields.
 */
import {
  expandLinesByClauseSplit,
  type Nar14LineLike,
} from "../nar14ClauseSplit";
import { runShotExpanders } from "./expanderRegistry";
import { diagnoseNar } from "./gateDiagnose";
import { rebindLedgerAfterExpand } from "./visBeatLedgerRebind";
import { healNar14ResidualWithB } from "./nar14Residual";
import { healLipMultiLineWithB } from "./lipSplit";
import { diagnoseDc01 } from "./gateDiagnose";
import { resolveRequiredDuration, DEFAULT_EPISODE_DURATION_CAP } from "../compilers/resolveRequiredDuration";
import { mirrorAndSyncPlanToShots } from "./dialogueMirrorSsot";

export type OrchestratorLog = { step: string; detail?: string; count?: number };

/** @deprecated use dialogueMirrorSsot — re-export for callers */
export { mirrorAndSyncPlanToShots } from "./dialogueMirrorSsot";

export function runSplitOrchestrator(
  input: {
    planData?: Record<string, unknown> | null;
    shots: Record<string, unknown>[];
    meta?: Record<string, unknown> | null;
    applyClauseSplit?: boolean;
    applyVisBeatExpanders?: boolean;
    /** false：仅 mirror/时长；禁 residual B / 同文唇拆（autoHeal diagnose-only） */
    applySemanticSplit?: boolean;
    profileId?: string;
  },
): {
  planData: Record<string, unknown>;
  shots: Record<string, unknown>[];
  log: OrchestratorLog[];
  narFails: ReturnType<typeof diagnoseNar>;
  dcFails: ReturnType<typeof diagnoseDc01>;
} {
  const log: OrchestratorLog[] = [];
  const planData = { ...(input.planData ?? {}) } as Record<string, unknown>;
  let shots = [...input.shots];
  const allowSemantic = input.applySemanticSplit !== false;

  // 1) VisBeat / weapon / cluster expanders first (compat)
  if (allowSemantic && input.applyVisBeatExpanders !== false) {
    const exp = runShotExpanders(shots, {
      meta: input.meta,
      profileId: input.profileId,
      applyClusters: true,
      applyStillOneBeat: true,
    });
    shots = exp.shots;
    for (const l of exp.log) {
      if (l.expanded) log.push({ step: `expander:${l.expanderId}`, count: l.count, detail: l.detail });
    }
  } else if (!allowSemantic) {
    log.push({ step: "semantic_split_skipped", detail: "diagnose_only" });
  }

  // 2) Clause split on plan + shots
  if (input.applyClauseSplit !== false) {
    const dp = (planData.dialoguePlan as { lines?: Nar14LineLike[] } | undefined) ?? { lines: [] };
    if (dp.lines?.length) {
      const { lines, splitCount } = expandLinesByClauseSplit(dp.lines);
      planData.dialoguePlan = { ...dp, lines };
      if (splitCount) log.push({ step: "clause_split_plan", count: splitCount });
    }
    shots = shots.map((s) => {
      const n = { ...((s.narrative as object) ?? {}) } as { dialogue?: { lines?: Nar14LineLike[] } };
      const raw = n.dialogue?.lines ?? [];
      if (!raw.length) return s;
      const { lines, splitCount } = expandLinesByClauseSplit(raw);
      if (splitCount) log.push({ step: "clause_split_shot", count: splitCount, detail: String(s.shotIndex ?? "") });
      n.dialogue = { lines };
      return { ...s, narrative: n };
    });
  }

  // 3) Mirror + append missing lineIds to shots
  let planLines =
    ((planData.dialoguePlan as { lines?: Nar14LineLike[] } | undefined)?.lines ?? []) as Nar14LineLike[];
  const sync = mirrorAndSyncPlanToShots(planLines, shots);
  shots = sync.shots;
  log.push({ step: "mirror_sync", count: sync.mirrored, detail: `appended=${sync.appended}` });

  // 3a) Placement heal + OS peel (M8) before semantic expand
  try {
    const { healMisboundDialoguePlacement, matchDialogueLinesToShots } =
      require("./dialoguePlacementMatch") as typeof import("./dialoguePlacementMatch");
    const place = healMisboundDialoguePlacement(shots);
    shots = place.shots;
    if (place.stripped || place.peeledToAudio) {
      log.push({
        step: "placement_heal",
        count: place.stripped + place.peeledToAudio,
        detail: `remain=${place.remainingPressure}`,
      });
    }
    const match = matchDialogueLinesToShots({ planLines, shots });
    if (match.confirmCount) {
      log.push({ step: "placement_match_confirm", count: match.confirmCount });
    }
  } catch {
    /* optional */
  }
  try {
    const { syncOsPeelToDialoguePlan } =
      require("./osPeelToDialoguePlan") as typeof import("./osPeelToDialoguePlan");
    const fake = { preDesignPack: { shots }, planData } as import("../bundle/types").ScriptBundle;
    const os = syncOsPeelToDialoguePlan(fake, { stripOsLip: true });
    shots = (fake.preDesignPack?.shots ?? shots) as Record<string, unknown>[];
    planData.dialoguePlan = (fake.planData as { dialoguePlan?: unknown })?.dialoguePlan ?? planData.dialoguePlan;
    planLines =
      ((planData.dialoguePlan as { lines?: Nar14LineLike[] } | undefined)?.lines ?? []) as Nar14LineLike[];
    if (os.added || os.lipStripped) {
      log.push({ step: "os_peel", count: os.added + os.lipStripped, detail: `added=${os.added};lipStrip=${os.lipStripped}` });
    }
  } catch {
    /* optional */
  }

  // 3b) Residual NAR-14 → B cluster（仅 Confirm/forceExpand 语义轨）
  if (allowSemantic) {
    const residualHeal = healNar14ResidualWithB({ planLines, shots, profileId: input.profileId });
    if (residualHeal.expandedCount || residualHeal.bound) {
      planData.dialoguePlan = {
        ...((planData.dialoguePlan as object) ?? {}),
        lines: residualHeal.planLines,
      };
      planLines = residualHeal.planLines;
      shots = residualHeal.shots;
      log.push({
        step: "nar14_residual_B",
        count: residualHeal.expandedCount,
        detail: `bound=${residualHeal.bound};remain=${residualHeal.remainingResiduals.length}`,
      });
    }

    // 3c) Multi-line lip pressure → cluster split (Confirm 语义子镜；禁 autoHeal 静默同文)
    const lipHeal = healLipMultiLineWithB({ shots, profileId: input.profileId });
    if (lipHeal.expandedCount || lipHeal.healedShotIndexes.length) {
      shots = lipHeal.shots;
      log.push({
        step: "lip_multi_B",
        count: lipHeal.expandedCount,
        detail: `healed=${lipHeal.healedShotIndexes.join(",")};remain=${lipHeal.remainingPressure}`,
      });
    }
  }

  // 3d) Re-align durations after split (same kernel: LIP/DFW + snap + episodeCap)
  {
    try {
      const { raiseDurationHygieneOnly } =
        require("../export/durationHygiene") as typeof import("../export/durationHygiene");
      const fake = { preDesignPack: { shots }, planData, meta: input.meta } as import("../bundle/types").ScriptBundle;
      const hy = raiseDurationHygieneOnly(fake, {
        vendorId: (input.meta as { vendorId?: string } | undefined)?.vendorId ?? null,
        episodeCap: DEFAULT_EPISODE_DURATION_CAP,
      });
      shots = (fake.preDesignPack?.shots ?? shots) as Record<string, unknown>[];
      log.push({
        step: "duration_raise_capped",
        count: hy.raised,
        detail: `episodeCap=${DEFAULT_EPISODE_DURATION_CAP};raised=${hy.raised};skip_split=${hy.skippedNeedsSplit};cap=${hy.skippedCap}`,
      });
    } catch {
      let used = shots.reduce((a, s) => a + Math.max(0, Number(s.duration ?? 0)), 0);
      shots = shots.map((s) => {
        const remaining = Math.max(0, DEFAULT_EPISODE_DURATION_CAP - used + Math.max(0, Number(s.duration ?? 0)));
        const req = resolveRequiredDuration(s, { episodeCapRemaining: remaining });
        if (req.needsSplit || req.overVendorMax) return s;
        if (req.canSilentRaise && req.required > req.authorDuration) {
          used = used - Math.max(0, Number(s.duration ?? 0)) + req.required;
          return { ...s, duration: req.required };
        }
        return s;
      });
      log.push({
        step: "duration_raise_capped",
        detail: `episodeCap=${DEFAULT_EPISODE_DURATION_CAP};used≈${Math.round(used)}`,
      });
    }
  }

  // 4) Ledger rebind
  const reb = rebindLedgerAfterExpand(shots);
  shots = reb.shots;
  if (reb.rebound) log.push({ step: "ledger_rebind", count: reb.rebound });

  // 4b) Orchestrator tail: recompose + camFit + audio linkage (design ≡ import)
  if (allowSemantic) {
    try {
      const { recomposeChildrenAfterSplit } =
        require("./recomposeAfterSplit") as typeof import("./recomposeAfterSplit");
      const rc = recomposeChildrenAfterSplit(shots);
      if (rc?.shots?.length) {
        shots = rc.shots;
        log.push({ step: "recompose_children", count: rc.recomposed ?? rc.shots.length });
      }
    } catch {
      /* optional */
    }
    try {
      const { runCamFitUntilClear } =
        require("../export/camFitHygiene") as typeof import("../export/camFitHygiene");
      const fake = { preDesignPack: { shots }, planData, meta: input.meta } as import("../bundle/types").ScriptBundle;
      const cam = runCamFitUntilClear(fake, { chatStrict: false, maxRounds: 2 });
      shots = (fake.preDesignPack?.shots ?? shots) as Record<string, unknown>[];
      log.push({
        step: "cam_fit_tail",
        detail: `confirm=${cam.confirmRequired};remain=${cam.remainingMustSplit}`,
      });
    } catch {
      /* optional */
    }
    try {
      const { resolveAudioShotLinkage } =
        require("../quality/audioShotLinkage") as typeof import("../quality/audioShotLinkage");
      let mustAudio = 0;
      for (const s of shots) {
        const link = resolveAudioShotLinkage(s as never);
        if (link?.role === "must_split_speak_reaction") mustAudio++;
      }
      if (mustAudio) log.push({ step: "audio_shot_linkage", count: mustAudio, detail: "must_split_remain" });
    } catch {
      /* optional */
    }
    try {
      const { rebindAudioVoiceAfterSplit } =
        require("./audioVoiceRebind") as typeof import("./audioVoiceRebind");
      const reb = rebindAudioVoiceAfterSplit(shots);
      shots = reb.shots;
      if (reb.rebound || reb.clearedOrphanLip) {
        log.push({
          step: "audio_voice_rebind",
          count: reb.rebound + reb.clearedOrphanLip,
          detail: `rebound=${reb.rebound};orphanLipCleared=${reb.clearedOrphanLip}`,
        });
      }
    } catch {
      /* optional */
    }
    try {
      const { sliceChildrenAfterSplit } =
        require("./orchestratorTailSlice") as typeof import("./orchestratorTailSlice");
      const sl = sliceChildrenAfterSplit(shots);
      shots = sl.shots;
      log.push({
        step: "tail_slice",
        count: sl.microSliced + sl.durationSliced,
        detail: `chainBeatBlocks=${sl.chainBeatBlocks};micro=${sl.microSliced};dur=${sl.durationSliced}`,
      });
    } catch {
      /* optional */
    }
    try {
      // speaker→CHAR: bind codes from dialogue speakers when casting table present
      const casting =
        (planData.castingSheet as { characters?: { name?: string; code?: string }[] } | undefined)
          ?.characters ??
        (planData.characterDesign as { characters?: { name?: string; code?: string }[] } | undefined)
          ?.characters ??
        [];
      if (casting.length) {
        let charHealed = 0;
        const nameToCode = new Map(
          casting
            .filter((c) => c.name && c.code)
            .map((c) => [String(c.name).replace(/（OS）|\(OS\)/g, "").trim(), String(c.code)]),
        );
        shots = shots.map((s) => {
          const lines = (
            (s.narrative as { dialogue?: { lines?: { speaker?: string }[] } } | undefined)?.dialogue
              ?.lines ?? []
          );
          const codes = new Set<string>(Array.isArray(s.charCodes) ? (s.charCodes as string[]) : []);
          let hit = false;
          for (const l of lines) {
            const sp = String(l.speaker ?? "")
              .replace(/（OS）|\(OS\)/g, "")
              .trim();
            const code = nameToCode.get(sp);
            if (code && !codes.has(code)) {
              codes.add(code);
              hit = true;
            }
          }
          if (!hit) return s;
          charHealed++;
          return { ...s, charCodes: [...codes] };
        });
        if (charHealed) log.push({ step: "speaker_char_heal", count: charHealed });
      }
    } catch {
      /* optional */
    }
  }

  // 5) packageVersion bump
  shots = shots.map((s) => ({
    ...s,
    packageVersion: Number(s.packageVersion ?? 0) + 1,
  }));

  const narFails = diagnoseNar({ planData, shots });
  log.push({ step: "nar_recheck", count: narFails.length });
  const dcFails = diagnoseDc01({ planData, shots });
  log.push({ step: "dc01_recheck", count: dcFails.length });

  return { planData, shots, log, narFails, dcFails };
}

/** Dry-run: predict lineId/shot deltas without mutating. */
export function dryRunSplitOrchestrator(input: {
  planData?: Record<string, unknown> | null;
  shots: Record<string, unknown>[];
  meta?: Record<string, unknown> | null;
}): {
  predictedPlanLineCount: number;
  predictedShotCount: number;
  predictedNarFails: ReturnType<typeof diagnoseNar>;
  log: OrchestratorLog[];
  confidence: number;
  autoEligible: boolean;
  autoMin: number;
  pressureShots: number;
} {
  const r = runSplitOrchestrator({
    ...input,
    shots: input.shots.map((s) => structuredClone(s)),
    planData: input.planData ? structuredClone(input.planData) : {},
  });
  const planLines =
    ((r.planData.dialoguePlan as { lines?: unknown[] } | undefined)?.lines ?? []).length;
  const { detectLipSplitPressure } = require("./lipSplit") as typeof import("./lipSplit");
  const { scoreSplitConfidence, loadSplitAutoMin } =
    require("./splitConfidenceSsot") as typeof import("./splitConfidenceSsot");
  const pressureShots = input.shots.filter((s) => detectLipSplitPressure(s).mustConfirm).length;
  const conf = scoreSplitConfidence({
    lineCount: pressureShots,
    hasDifferentiatedVd: true,
    propCuConflict: pressureShots > 0 && r.log.some((l) => /placement|prop/i.test(l.step)),
  });
  return {
    predictedPlanLineCount: planLines,
    predictedShotCount: r.shots.length,
    predictedNarFails: r.narFails,
    log: r.log,
    confidence: conf.confidence,
    autoEligible: conf.autoEligible,
    autoMin: loadSplitAutoMin(),
    pressureShots,
  };
}

/**
 * Theme-glue untilClear seal — design ≡ smart-heal homology.
 * PROP-CONT (declare-only propState) + INTENT-PIC (picture←VD sidecar) must reach PASS.
 * Never invent literary VD; never leave these as Chat/import BLOCK after seal.
 */
import type { ScriptBundle } from "../bundle/types";
import {
  softHealPropContinuityDeclareOnly,
  auditPropContinuity,
  hydrateShotsPropState,
} from "../compilers/propContinuitySsot";
import {
  getShotDesignIntentsFromPlan,
  syncIntentPicturesFromShots,
  auditIntentPictureSync,
  type ShotDesignIntent,
} from "./shotDesignIntent";

export type ThemeGlueSealResult = {
  sealedIds: string[];
  propMutated: number;
  propBlocksLeft: number;
  intentSynced: number;
  intentBlocksLeft: number;
};

function shotsOf(bundle: ScriptBundle): Record<string, unknown>[] {
  const root = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
  const nested = (
    (bundle.planData as { preDesignPack?: { shots?: Record<string, unknown>[] } } | undefined)
      ?.preDesignPack?.shots ?? []
  ) as Record<string, unknown>[];
  // Prefer longer live list (expand writes root; nested may lag)
  if (root.length >= nested.length && root.length) return root;
  if (nested.length) return nested;
  return root;
}

function writeShots(bundle: ScriptBundle, shots: Record<string, unknown>[]): void {
  const pack = {
    ...(bundle.preDesignPack ?? {}),
    shots,
  };
  bundle.preDesignPack = pack as ScriptBundle["preDesignPack"];
  const pd = ((bundle.planData as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  pd.preDesignPack = pack;
  bundle.planData = pd as ScriptBundle["planData"];
}

function writeIntents(bundle: ScriptBundle, intents: ShotDesignIntent[]): void {
  const pd = ((bundle.planData as Record<string, unknown>) ?? {}) as Record<string, unknown>;
  pd.shotDesignIntent = intents;
  const nb = (pd.narrativeBrief as Record<string, unknown> | undefined) ?? {};
  if (nb.shotDesignIntent || !pd.narrativeBrief) {
    nb.shotDesignIntent = intents;
    pd.narrativeBrief = nb;
  }
  bundle.planData = pd as ScriptBundle["planData"];
}

function toPropInputs(shots: Record<string, unknown>[]) {
  return shots.map((s, i) => {
    const narr = s.narrative as
      | { propState?: string; transitionType?: string; shotSize?: string }
      | undefined;
    return {
      shotIndex: Number(s.shotIndex) || i + 1,
      visualDescription: String(s.visualDescription ?? ""),
      sceneName: String(s.sceneName ?? (s as { scene?: string }).scene ?? ""),
      transitionType: String(s.transitionType ?? narr?.transitionType ?? ""),
      propState: String(s.propState ?? narr?.propState ?? ""),
      shotSize: String(s.shotSize ?? narr?.shotSize ?? ""),
      xorSplit: Boolean((s as { _litXorSplit?: boolean })._litXorSplit),
      _stillBeatSplitId: (s as { _stillBeatSplitId?: string })._stillBeatSplitId ?? null,
      _visualSplitId: (s as { _visualSplitId?: string })._visualSplitId ?? null,
    };
  });
}

/** 1:1 sidecar：每镜 shotIndex + picture←VD（禁发明散文，仅同步）。 */
export function alignIntentsToShotsHomology(input: {
  intents: ShotDesignIntent[];
  shots: { shotIndex?: number; visualDescription?: string | null; duration?: number; shotSize?: string }[];
}): { intents: ShotDesignIntent[]; synced: number } {
  const shots = input.shots;
  if (!shots.length) return { intents: input.intents, synced: 0 };
  let synced = 0;
  const byIdx = new Map<number, ShotDesignIntent>();
  for (const it of input.intents) {
    const idx = Number((it as { shotIndex?: number }).shotIndex ?? it.sceneRef) || 0;
    if (idx && !byIdx.has(idx)) byIdx.set(idx, { ...it });
  }
  const next: ShotDesignIntent[] = shots.map((s, i) => {
    const idx = Number(s.shotIndex) || i + 1;
    const vd = String(s.visualDescription ?? "").trim();
    // Prefer prior intent at same array ordinal when duplicate shotIndex
    const prev = input.intents[i] ?? byIdx.get(idx);
    const picture = vd || String(prev?.picture ?? "").trim() || `镜${idx}画面`;
    const dur = Number(s.duration) || Number(prev?.durationSec) || 3;
    const sz = String(s.shotSize ?? prev?.shotSizeIntent ?? "近景");
    if (!prev || prev.picture !== picture || Number((prev as { shotIndex?: number }).shotIndex) !== idx) {
      synced += 1;
    }
    return {
      ...(prev ?? {}),
      intentId: prev?.intentId ?? `intent-shot-${i + 1}`,
      purpose: (prev?.purpose as ShotDesignIntent["purpose"]) || "信息",
      emotionGoal: prev?.emotionGoal || "叙事推进",
      picture: picture.slice(0, 240),
      shotSizeIntent: sz,
      cutIntent: prev?.cutIntent || "切",
      audioIntent: prev?.audioIntent || "环境",
      durationSec: dur > 0 ? dur : 3,
      shotIndex: idx,
      sceneRef: idx,
    } as ShotDesignIntent;
  });
  const syncedAudit = syncIntentPicturesFromShots({ intents: next, shots });
  return { intents: syncedAudit.intents, synced: synced + syncedAudit.synced };
}

/**
 * Seal theme-glue debts on bundle in place. Call after autoClose and before exit harvest.
 */
export function sealThemeGlueUntilClear(bundle: ScriptBundle): ThemeGlueSealResult {
  const sealedIds: string[] = [];
  let shots = [...shotsOf(bundle)];
  if (!shots.length) {
    return {
      sealedIds,
      propMutated: 0,
      propBlocksLeft: 0,
      intentSynced: 0,
      intentBlocksLeft: 0,
    };
  }

  // PROP-CONT: heal the live shot array directly (禁写 stale nested)
  let propMutated = 0;
  let propBlocksLeft = 0;
  for (let round = 0; round < 4; round++) {
    const input = toPropInputs(shots);
    const healed = softHealPropContinuityDeclareOnly(hydrateShotsPropState(input));
    propMutated += healed.mutated;
    propBlocksLeft = healed.blocksLeft;
    for (let i = 0; i < shots.length; i++) {
      const ps = healed.shots[i]?.propState;
      if (!ps) continue;
      shots[i] = {
        ...shots[i]!,
        propState: ps,
        narrative: {
          ...((shots[i]!.narrative as object) ?? {}),
          propState: ps,
        },
      };
    }
    if (healed.mutated === 0 || healed.blocksLeft === 0) break;
  }
  writeShots(bundle, shots);

  const propAudit = auditPropContinuity(toPropInputs(shots));
  propBlocksLeft = propAudit.filter((f) => f.severity === "BLOCK").length;
  if (propBlocksLeft === 0) {
    sealedIds.push("DEX-PROP-CONT");
  } else {
    // Last-resort: rewrite every BLOCK neighbor as →continues on the later shot
    const { propStateBaseTokens, hydratePropStateFromVd } =
      require("../compilers/propContinuitySsot") as typeof import("../compilers/propContinuitySsot");
    for (const f of propAudit.filter((x) => x.severity === "BLOCK")) {
      const idx = Number(f.shotIndex) || 0;
      const i = shots.findIndex((s, si) => (Number(s.shotIndex) || si + 1) === idx);
      if (i <= 0) continue;
      const prev = toPropInputs(shots)[i - 1]!;
      const bases = [
        ...new Set([
          ...(hydratePropStateFromVd(prev.visualDescription) || "").split("|").filter(Boolean),
          ...propStateBaseTokens(prev.propState),
        ]),
      ].slice(0, 4);
      const carry = `${bases.join("|") || "held"}→continues`;
      shots[i] = {
        ...shots[i]!,
        propState: carry,
        narrative: {
          ...((shots[i]!.narrative as object) ?? {}),
          propState: carry,
        },
      };
      propMutated += 1;
    }
    writeShots(bundle, shots);
    propBlocksLeft = auditPropContinuity(toPropInputs(shots)).filter((f) => f.severity === "BLOCK").length;
    // untilClear: seal only when audit PASS — no policy-green with residual BLOCK
    if (propBlocksLeft === 0) sealedIds.push("DEX-PROP-CONT");
  }

  // INTENT-PIC：全量 1:1 同源
  const intents = getShotDesignIntentsFromPlan({
    planData: bundle.planData,
    preDesignPack: bundle.preDesignPack,
  } as Record<string, unknown>);
  const aligned = alignIntentsToShotsHomology({
    intents,
    shots: shots.map((s) => ({
      shotIndex: Number(s.shotIndex) || undefined,
      visualDescription: String(s.visualDescription ?? ""),
      duration: Number(s.duration) || undefined,
      shotSize: String(s.shotSize ?? ""),
    })),
  });
  writeIntents(bundle, aligned.intents);
  const intentAudit = auditIntentPictureSync({
    intents: aligned.intents,
    shots: shots.map((s) => ({
      shotIndex: Number(s.shotIndex) || undefined,
      visualDescription: String(s.visualDescription ?? ""),
    })),
  });
  const intentBlocksLeft = intentAudit.findings.filter((f) => f.severity === "BLOCK").length;
  // untilClear: seal INTENT only when audit PASS (no residual BLOCK policy-green)
  if (intentBlocksLeft === 0) {
    sealedIds.push("DEX-INTENT-PIC");
    if (aligned.synced > 0 || aligned.intents.length > 0) {
      sealedIds.push("DEX-SHOT-INTENT");
    }
  }

  return {
    sealedIds: [...new Set(sealedIds)],
    propMutated,
    propBlocksLeft,
    intentSynced: aligned.synced,
    intentBlocksLeft,
  };
}

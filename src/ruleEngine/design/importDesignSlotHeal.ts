/**
 * Import design slot heal — rewrite imagePrompt from VD even when shots already exist.
 * Decoupled from skipAutoDesignSb / LLM autoDesign.
 */
import type { ScriptBundle } from "../bundle/types";
import {
  clearInheritedGeneration,
  isSplitChildShot,
  recomposeChildrenAfterSplit,
} from "./recomposeAfterSplit";
import { composeStillPrompt } from "../compilers/composeStillPrompt";
import { healPromptFidelityAnchors } from "./healPromptFidelityAnchors";
import { inheritContinuityAlongEdges } from "./splitContinuityInherit";
import { writeWarehouseDebtToBundle } from "../bundle/warehouseDebtMeta";

export type DesignSlotHealSummary = {
  healed: number;
  fidelityHealed: number;
  continuityInherited: number;
  recomposed: number;
  egressRewritten: number;
  genCleared: number;
  /** Shots marked for silent prop-plate prefetch at gen (warehouse reuse / synth persist) */
  propPrefetchMarked: number;
};

function stampDesignIntentSilentPrefetch(s: Record<string, unknown>): boolean {
  try {
    const { deriveDesignIntentProfile, profileNeedsPropPlate } =
      require("../compilers/designIntentProfile") as typeof import("../compilers/designIntentProfile");
    const sd = s.shotDesign as
      | {
          performance?: { microExpression?: { eyes?: string; mouthDetail?: string } };
          composition?: { foreground?: string; background?: string };
          cameraAnchor?: { shotSize?: string };
        }
      | undefined;
    const micro = sd?.performance?.microExpression;
    const microStr = micro ? [micro.eyes, micro.mouthDetail].filter(Boolean).join("/") : undefined;
    const profile = deriveDesignIntentProfile({
      visualDescription: String(s.visualDescription ?? ""),
      imagePrompt: String((s.generation as { imagePrompt?: string } | undefined)?.imagePrompt ?? ""),
      shotSize: String(s.shotSize ?? sd?.cameraAnchor?.shotSize ?? ""),
      background: sd?.composition?.background,
      foreground: sd?.composition?.foreground,
      microExpression: microStr,
    });
    s.designIntentProfile = {
      classes: profile.classes,
      plateMode: profile.plateMode,
      glyphPolicy: profile.glyphPolicy,
      glyphText: profile.glyphText,
      propClassId: profile.propClassId,
      primaryObjective: profile.primaryObjective,
      secondaryBudget: profile.secondaryBudget,
      fragment: profile.fragment,
      poseOccupancy: profile.poseOccupancy,
      gripLocus: profile.gripLocus,
      seatingXorPickup: profile.seatingXorPickup,
      dofBudget: profile.dofBudget,
      formScale: profile.formScale,
    };
    if (profileNeedsPropPlate(profile)) {
      s._needsPropPrefetch = true;
      s._propPlateSoftDefer = true; // soft_defer — never block import
      return true;
    }
    try {
      const { profileNeedsFragmentPlate } =
        require("../compilers/designIntentProfile") as typeof import("../compilers/designIntentProfile");
      if (profileNeedsFragmentPlate(profile)) {
        s._needsFragmentPrefetch = true;
        s._propPlateSoftDefer = true;
        return true;
      }
    } catch {
      /* optional */
    }
  } catch {
    /* optional */
  }
  return false;
}

function rewriteShotEgress(s: Record<string, unknown>): boolean {
  const vd = String(s.visualDescription ?? "").trim();
  if (!vd) return false;
  const gen = (s.generation as { imagePrompt?: string } | undefined) ?? {};
  const img = String(gen.imagePrompt ?? "").trim();
  const drift =
    isSplitChildShot(s) ||
    !img ||
    (vd && img && !img.toLowerCase().includes(vd.slice(0, Math.min(4, vd.length)).toLowerCase()));
  if (!drift && !isSplitChildShot(s)) return false;

  if (isSplitChildShot(s)) clearInheritedGeneration(s);

  const sd = s.shotDesign as
    | {
        performance?: { microExpression?: { eyes?: string; mouthDetail?: string } };
        composition?: { foreground?: string; background?: string };
        cameraAnchor?: { shotSize?: string; bgBlur?: boolean };
      }
    | undefined;
  const micro = sd?.performance?.microExpression;
  const microStr = micro ? [micro.eyes, micro.mouthDetail].filter(Boolean).join("/") : undefined;
  try {
    const composed = composeStillPrompt(
      {
        visualDescription: vd,
        shotSize: String(s.shotSize ?? sd?.cameraAnchor?.shotSize ?? ""),
        foreground: sd?.composition?.foreground,
        background: sd?.composition?.background,
        microExpression: microStr,
        qualityMode: "draft",
        episodeShot: s,
      },
      { mode: "full" },
    );
    let prompt = String(composed.prompt ?? "").trim() || vd;
    if (sd?.cameraAnchor?.bgBlur && !/blur|bokeh|景深/i.test(prompt)) {
      prompt = `${prompt}，浅景深 bokeh blur`;
    }
    const nextGen = { ...((s.generation as Record<string, unknown>) ?? {}), imagePrompt: prompt };
    s.generation = nextGen;
    s.promptState = "composed";

    const fid = healPromptFidelityAnchors({
      visualDescription: vd,
      visualBody: prompt,
      videoPrompt: String((nextGen as { videoPrompt?: string }).videoPrompt ?? ""),
    });
    if (fid.injected.length) {
      s.visualDescription = fid.visualDescription;
      nextGen.imagePrompt = fid.visualBody;
      s.generation = nextGen;
    }
    return true;
  } catch {
    const nextGen = { ...((s.generation as Record<string, unknown>) ?? {}), imagePrompt: vd };
    s.generation = nextGen;
    s.promptState = "stale";
    return true;
  }
}

/**
 * Run on any import/prepare path that has shots — whether or not expand ran.
 */
export function importDesignSlotHeal(bundle: ScriptBundle): {
  bundle: ScriptBundle;
  summary: DesignSlotHealSummary;
} {
  const shots = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
  if (!shots.length) {
    return {
      bundle,
      summary: {
        healed: 0,
        fidelityHealed: 0,
        continuityInherited: 0,
        recomposed: 0,
        egressRewritten: 0,
        genCleared: 0,
        propPrefetchMarked: 0,
      },
    };
  }

  const cont = inheritContinuityAlongEdges({ shots });
  const rc = recomposeChildrenAfterSplit(cont.shots);
  let healed = 0;
  let fidelityHealed = 0;
  let genCleared = 0;
  let propPrefetchMarked = 0;

  for (const s of rc.shots) {
    if (isSplitChildShot(s)) genCleared += 1;
    if (stampDesignIntentSilentPrefetch(s)) propPrefetchMarked += 1;
    const before = String((s.generation as { imagePrompt?: string } | undefined)?.imagePrompt ?? "");
    if (rewriteShotEgress(s)) {
      healed += 1;
      const after = String((s.generation as { imagePrompt?: string } | undefined)?.imagePrompt ?? "");
      if (after !== before && after.includes(String(s.visualDescription ?? "").slice(0, 2))) {
        /* ok */
      }
      const fid = healPromptFidelityAnchors({
        visualDescription: String(s.visualDescription ?? ""),
        visualBody: after,
      });
      if (fid.injected.length) {
        s.visualDescription = fid.visualDescription;
        const g = { ...((s.generation as Record<string, unknown>) ?? {}), imagePrompt: fid.visualBody };
        s.generation = g;
        fidelityHealed += 1;
      }
    }
  }

  if (bundle.preDesignPack) {
    (bundle.preDesignPack as { shots: unknown }).shots = rc.shots;
  }

  // IntentGraph prop_cont prune (XOR oral)
  try {
    const { pruneIntentGraphOnBundle } =
      require("./intentGraphPrune") as typeof import("./intentGraphPrune");
    pruneIntentGraphOnBundle(bundle as never);
  } catch {
    /* optional */
  }

  const summary: DesignSlotHealSummary = {
    healed,
    fidelityHealed,
    continuityInherited: cont.inherited,
    recomposed: rc.recomposed,
    egressRewritten: rc.egressRewritten,
    genCleared,
    propPrefetchMarked,
  };

  writeWarehouseDebtToBundle(bundle, {
    designSlotHealSummary: summary as unknown as Record<string, unknown>,
  });

  // Bump packageVersion on heal
  const meta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
  meta.packageVersion = Number(meta.packageVersion ?? 0) + 1;
  meta.silentPropPrefetch = propPrefetchMarked > 0;
  meta.warehouseDebtDecision = "soft_defer"; // never brick import on prop plate debt
  for (const s of rc.shots) {
    s.packageVersion = Number(s.packageVersion ?? 0) + 1;
  }

  return { bundle, summary };
}

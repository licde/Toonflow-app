/**
 * Materialize debut → shot1 and endHook → last shot from design packs.
 */
import type { ScriptBundle } from "./types";

export interface MaterializeReport {
  debutApplied: boolean;
  endHookApplied: boolean;
  patches: string[];
}

export function materializePackaging(bundle: ScriptBundle): { bundle: ScriptBundle; report: MaterializeReport } {
  const patches: string[] = [];
  const shots = [...((bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[])];
  if (!shots.length) {
    return { bundle, report: { debutApplied: false, endHookApplied: false, patches } };
  }

  let debutApplied = false;
  const debut = bundle.debutIntroPack as { characters?: unknown[]; scenes?: unknown[]; beatHint?: string } | undefined;
  if (debut && (debut.characters?.length || debut.scenes?.length || debut.beatHint)) {
    const s0 = { ...shots[0] };
    const narr = { ...((s0.narrative as object) ?? {}) } as Record<string, unknown>;
    if (!narr.debutBeat) {
      narr.debutBeat = debut.beatHint ?? "debut_intro";
      patches.push("shot1.narrative.debutBeat");
    }
    if (!s0.packagingTag) {
      s0.packagingTag = "debut";
      patches.push("shot1.packagingTag=debut");
    }
    s0.narrative = narr;
    shots[0] = s0;
    debutApplied = true;
  }

  let endHookApplied = false;
  const endHook =
    (bundle as { endHookPack?: { hook?: string; recapHint?: string } }).endHookPack ??
    (bundle.continuity as { endHook?: string; recapHint?: string } | undefined);
  const hookText =
    (typeof endHook === "object" && endHook && ("hook" in endHook ? endHook.hook : (endHook as { endHook?: string }).endHook)) ||
    (bundle.continuity as { unresolvedHooks?: string[] } | undefined)?.unresolvedHooks?.[0];
  if (hookText) {
    const last = { ...shots[shots.length - 1] };
    const narr = { ...((last.narrative as object) ?? {}) } as Record<string, unknown>;
    if (!narr.endHook) {
      narr.endHook = hookText;
      patches.push(`shot${shots.length}.narrative.endHook`);
    }
    if (!last.packagingTag) {
      last.packagingTag = "endHook";
      patches.push(`shot${shots.length}.packagingTag=endHook`);
    }
    last.narrative = narr;
    shots[shots.length - 1] = last;
    endHookApplied = true;
  }

  const next: ScriptBundle = {
    ...bundle,
    preDesignPack: {
      scriptPlan: bundle.preDesignPack?.scriptPlan ?? "",
      ...bundle.preDesignPack,
      shots: shots as NonNullable<ScriptBundle["preDesignPack"]>["shots"],
    },
  };

  return { bundle: next, report: { debutApplied, endHookApplied, patches } };
}

/**
 * Burn-path lipSyncPolicy resolve — never treat missing as silent for on-camera dialogue.
 */
export function resolveLipSyncPolicyFromShot(shot: Record<string, unknown> | null | undefined): string {
  if (!shot) return "";
  const sd = shot.shotDesign as { lipSyncPolicy?: string } | undefined;
  const narr = shot.narrative as { lipSyncPolicy?: string } | undefined;
  const direct = shot.lipSyncPolicy;
  return String(sd?.lipSyncPolicy ?? narr?.lipSyncPolicy ?? direct ?? "").trim();
}

/** Default policy when on-camera dialogue and author left policy empty. */
export const DEFAULT_ONCAM_LIP_POLICY = "subtle_natural";

/**
 * Homology heal: on-camera dialogue + none/silent → subtle_natural (write shotDesign).
 * Never invents dialogue; strips "no lip sync" from videoPrompt.
 */
export function softHealNoLipDialogueOnShots(
  shots: Record<string, unknown>[],
): { upgraded: number; shotIndexes: number[] } {
  const { hasOnCameraDialogue } =
    require("../design/onCameraDialogue") as typeof import("../design/onCameraDialogue");
  const shotIndexes: number[] = [];
  let upgraded = 0;
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i]!;
    const narr = (s.narrative as Record<string, unknown> | undefined) ?? {};
    const lines = narr.dialogue
      ? (narr.dialogue as { lines?: unknown }).lines
      : (s as { dialogue?: { lines?: unknown } }).dialogue?.lines;
    if (!hasOnCameraDialogue(lines)) continue;
    const pol = resolveLipSyncPolicyFromShot(s).toLowerCase();
    const gen = (s.generation as Record<string, unknown> | undefined) ?? {};
    const vp = String(gen.videoPrompt ?? s.videoPrompt ?? "");
    const needs = /^(none|silent)$/i.test(pol) || /no\s*lip[- ]*sync/i.test(vp);
    if (!needs) continue;
    const sd = { ...((s.shotDesign as object) ?? {}), lipSyncPolicy: DEFAULT_ONCAM_LIP_POLICY };
    s.shotDesign = sd;
    s.lipSyncPolicy = DEFAULT_ONCAM_LIP_POLICY;
    narr.lipSyncPolicy = DEFAULT_ONCAM_LIP_POLICY;
    s.narrative = narr;
    if (/no\s*lip[- ]*sync/i.test(vp)) {
      const cleaned = vp.replace(/no\s*lip[- ]*sync[,]*/gi, "").replace(/,\s*,/g, ",").trim();
      gen.videoPrompt = cleaned;
      s.generation = gen;
      if (s.videoPrompt != null) s.videoPrompt = cleaned;
    }
    upgraded++;
    shotIndexes.push(Number(s.shotIndex) || i + 1);
  }
  return { upgraded, shotIndexes };
}

export function softHealNoLipDialogueOnBundle(bundle: {
  planData?: unknown;
  preDesignPack?: { shots?: Record<string, unknown>[] };
}): { upgraded: number; shotIndexes: number[] } {
  const pd = (bundle.planData as Record<string, unknown> | undefined) ?? {};
  const pack =
    (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ??
    bundle.preDesignPack ??
    { shots: [] };
  const shots = [...(pack.shots ?? [])];
  if (!shots.length) return { upgraded: 0, shotIndexes: [] };
  const r = softHealNoLipDialogueOnShots(shots);
  if (r.upgraded > 0) {
    pack.shots = shots;
    if (bundle.preDesignPack) bundle.preDesignPack.shots = shots;
    if (bundle.planData && typeof bundle.planData === "object") {
      const pdx = bundle.planData as { preDesignPack?: { shots?: unknown } };
      if (pdx.preDesignPack) pdx.preDesignPack.shots = shots;
      else (bundle.planData as { preDesignPack: unknown }).preDesignPack = pack;
    }
  }
  return r;
}

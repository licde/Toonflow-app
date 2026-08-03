/**
 * Design-time mouth ⊕ lipSync ⊕ dialogue XOR — heal SSOT, never invent dialogue.
 * dialogue_native + closed mouth → speak_ready (同源智修); callers may BLOCK if refuseHeal.
 */
export const CLOSED_MOUTH_RE = /neutral_closed|闭口|抿嘴|closed.?mouth/i;
export const SPEAK_READY_MOUTH = "speak_ready";

export type MouthXorShot = {
  shotIndex?: number;
  shotDesign?: {
    lipSyncPolicy?: string;
    performance?: {
      microExpression?: string | { eyes?: string; mouthDetail?: string };
    };
  };
  narrative?: {
    dialogue?: { lines?: unknown };
    lipSyncPolicy?: string;
  };
  lipSyncPolicy?: string;
};

export function isStrongLipPolicy(policy: string): boolean {
  const p = String(policy ?? "")
    .toLowerCase()
    .replace(/-/g, "_");
  return (
    p === "dialogue_native" ||
    p === "natural" ||
    p === "natural_emphasized" ||
    p.includes("natural") ||
    p === "subtle_natural" ||
    p === "subtle"
  );
}

export function resolveLipForXor(shot: MouthXorShot): string {
  return String(
    shot.shotDesign?.lipSyncPolicy ?? shot.narrative?.lipSyncPolicy ?? shot.lipSyncPolicy ?? "",
  ).trim();
}

export function hasLiteraryOnCamDialogue(shot: MouthXorShot): boolean {
  try {
    const { hasOnCameraDialogue } =
      require("./onCameraDialogue") as typeof import("./onCameraDialogue");
    const lines =
      shot.narrative?.dialogue?.lines ??
      (shot as { dialogue?: { lines?: unknown } }).dialogue?.lines;
    return hasOnCameraDialogue(lines);
  } catch {
    const lines = (shot.narrative?.dialogue?.lines ?? []) as { text?: string }[];
    return Array.isArray(lines) && lines.some((l) => String(l?.text ?? "").trim().length >= 2);
  }
}

export function mouthXorConflict(shot: MouthXorShot): {
  conflict: boolean;
  mouth?: string;
  lipSyncPolicy: string;
} {
  const lip = resolveLipForXor(shot);
  const micro = shot.shotDesign?.performance?.microExpression;
  let mouth = "";
  if (typeof micro === "string") mouth = micro;
  else if (micro && typeof micro === "object") mouth = String(micro.mouthDetail ?? "");
  const conflict =
    hasLiteraryOnCamDialogue(shot) && isStrongLipPolicy(lip) && CLOSED_MOUTH_RE.test(mouth);
  return { conflict, mouth: mouth || undefined, lipSyncPolicy: lip };
}

/** Heal closed mouth → speak_ready on shotDesign.performance; preserve eyes. */
export function healMouthXorOnShot(
  shot: MouthXorShot,
  opts?: { refuseHeal?: boolean },
): { healed: boolean; blocked: boolean; message?: string } {
  const { conflict, mouth, lipSyncPolicy } = mouthXorConflict(shot);
  if (!conflict) return { healed: false, blocked: false };
  if (opts?.refuseHeal) {
    return {
      healed: false,
      blocked: true,
      message: `VID-MOUTH-XOR：对白+${lipSyncPolicy} 禁止 mouthDetail=${mouth}`,
    };
  }
  const sd = { ...(shot.shotDesign ?? {}) } as NonNullable<MouthXorShot["shotDesign"]>;
  const perf = { ...(sd.performance ?? {}) };
  const prev = perf.microExpression;
  if (typeof prev === "string") {
    perf.microExpression = prev.replace(CLOSED_MOUTH_RE, SPEAK_READY_MOUTH);
  } else if (prev && typeof prev === "object") {
    perf.microExpression = {
      ...prev,
      mouthDetail: SPEAK_READY_MOUTH,
    };
  } else {
    perf.microExpression = { mouthDetail: SPEAK_READY_MOUTH };
  }
  sd.performance = perf;
  shot.shotDesign = sd;
  return { healed: true, blocked: false, message: `mouth ${mouth}→${SPEAK_READY_MOUTH}` };
}

export function healMouthXorOnShots(
  shots: MouthXorShot[],
  opts?: { refuseHeal?: boolean },
): { healed: number; blocked: number; shotIndexes: number[] } {
  let healed = 0;
  let blocked = 0;
  const shotIndexes: number[] = [];
  for (let i = 0; i < shots.length; i++) {
    const r = healMouthXorOnShot(shots[i]!, opts);
    if (r.healed || r.blocked) shotIndexes.push(Number(shots[i]!.shotIndex) || i + 1);
    if (r.healed) healed++;
    if (r.blocked) blocked++;
  }
  return { healed, blocked, shotIndexes };
}

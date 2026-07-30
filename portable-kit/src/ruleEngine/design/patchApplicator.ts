/**
 * Typed patch applicator — writes known patchKeys onto shot / package fields.
 */
export type PatchMap = Record<string, unknown>;

export interface ApplyPatchResult {
  shot: Record<string, unknown>;
  applied: string[];
}

function ensureGen(shot: Record<string, unknown>): Record<string, unknown> {
  if (!shot.generation || typeof shot.generation !== "object") shot.generation = {};
  return shot.generation as Record<string, unknown>;
}

function ensureNarrative(shot: Record<string, unknown>): Record<string, unknown> {
  if (!shot.narrative || typeof shot.narrative !== "object") shot.narrative = {};
  return shot.narrative as Record<string, unknown>;
}

/** Apply a flat patch object onto one shot (mutates copy). */
export function applyPatchesToShot(shotIn: Record<string, unknown>, patch: PatchMap): ApplyPatchResult {
  const shot = structuredClone(shotIn);
  const applied: string[] = [];
  const gen = ensureGen(shot);
  const narr = ensureNarrative(shot);

  if (patch.imageAppend != null || patch.promptPrefix != null) {
    const extra = String(patch.imageAppend ?? patch.promptPrefix ?? "");
    gen.imagePrompt = `${String(gen.imagePrompt ?? "")}${extra}`.trim();
    applied.push("imageAppend");
  }
  if (patch.motion != null) {
    gen.videoPrompt = String(patch.motion);
    applied.push("motion");
  }
  if (patch.duration != null) {
    const d = Number(patch.duration);
    if (Number.isFinite(d) && d > 0) {
      narr.duration = d;
      (shot as { duration?: number }).duration = d;
      applied.push("duration");
    }
  }
  if (patch.generate_audio === true || patch.generate_audio === 1 || patch.restoreDialogue) {
    (shot as { forceAudioHint?: boolean }).forceAudioHint = true;
    if (patch.restoreDialogue && !narr.dialogue) {
      narr.dialogue = { lines: [{ speaker: "VO", text: String(patch.restoreDialogue) }] };
    }
    applied.push("generate_audio");
  }
  if (patch.shouldGenerateImage === true || patch.shouldGenerateImage === 1) {
    (shot as { shouldGenerateImage?: number }).shouldGenerateImage = 1;
    applied.push("shouldGenerateImage");
  }
  if (typeof patch.videoPrompt === "string") {
    gen.videoPrompt = patch.videoPrompt;
    applied.push("videoPrompt");
  }
  if (typeof patch.audioPrompt === "string") {
    gen.audioPrompt = patch.audioPrompt;
    applied.push("audioPrompt");
  }
  if (typeof patch.fxPrompt === "string") {
    gen.fxPrompt = patch.fxPrompt;
    applied.push("fxPrompt");
  }
  if (typeof patch.fxFeasibility === "string" && patch.fxFeasibility.trim()) {
    (shot as { fxFeasibility?: string }).fxFeasibility = patch.fxFeasibility.trim();
    gen.fxFeasibility = patch.fxFeasibility.trim();
    applied.push("fxFeasibility");
  }
  if (typeof patch.imagePrompt === "string") {
    gen.imagePrompt = patch.imagePrompt;
    applied.push("imagePrompt");
  }
  if (typeof patch.sceneCode === "string" && patch.sceneCode.trim()) {
    const code = patch.sceneCode.trim();
    (shot as { sceneCode?: string }).sceneCode = code;
    narr.sceneCode = code;
    applied.push(`sceneCode:${code}`);
  }

  return { shot, applied };
}

export function applyPatchesToEpisodePackage(
  pkg: { shots?: Record<string, unknown>[] },
  patches: { shotId?: string; patch: PatchMap }[],
): { pkg: typeof pkg; applied: string[] } {
  const next = structuredClone(pkg);
  const all: string[] = [];
  for (const p of patches) {
    const shot =
      (p.shotId ? next.shots?.find((s) => String((s as { id?: string }).id) === p.shotId) : undefined) ??
      next.shots?.[0];
    if (!shot) continue;
    const r = applyPatchesToShot(shot, p.patch);
    Object.assign(shot, r.shot);
    all.push(...r.applied);
  }
  return { pkg: next, applied: all };
}

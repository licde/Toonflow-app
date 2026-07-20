/**
 * FLF end-frame literary fidelity — checklist + orphan end-frame detection.
 */
import {
  buildLiteraryFidelityChecklist,
  assertLiteraryFidelity,
  type StillFidelityItem,
} from "../compilers/literaryFidelityChecklist";

export interface FlfEndFrameInput {
  endBeatDescription?: string | null;
  endFramePrompt?: string | null;
  endFramePath?: string | null;
  storyboardId?: number | null;
  /** Next shot continuityFrom — if end frame claimed but path missing → orphan */
  nextContinuityFrom?: string | null;
  modeId?: string | null;
  characterNames?: string[];
}

export interface FlfEndFrameResult {
  required: boolean;
  ok: boolean;
  orphan: boolean;
  checklist: StillFidelityItem[];
  missing: string[];
  reason?: string;
  strengthen?: Record<string, string>;
}

export function isFlfMode(modeId?: string | null): boolean {
  const id = String(modeId ?? "");
  return /firstLastFrame|startEndRequired|endFrameOptional|startFrameOptional/i.test(id);
}

export function assertFlfEndFrameFidelity(input: FlfEndFrameInput): FlfEndFrameResult {
  const required = isFlfMode(input.modeId);
  const desc = String(input.endBeatDescription ?? "").trim();
  const prompt = String(input.endFramePrompt ?? "").trim();
  const path = String(input.endFramePath ?? "").trim();

  if (!required) {
    return { required: false, ok: true, orphan: false, checklist: [], missing: [] };
  }

  // Orphan: continuity claims end but no asset
  const orphan =
    Boolean(String(input.nextContinuityFrom ?? "").trim()) && !path && !prompt && !desc;

  if (!desc && !prompt) {
    return {
      required: true,
      ok: false,
      orphan,
      checklist: [],
      missing: ["end_beat_description"],
      reason: "missing_end_literary",
      strengthen: { modeHint: "reroll_flf" },
    };
  }

  const checklist = buildLiteraryFidelityChecklist({
    description: desc || prompt,
    characterNames: input.characterNames ?? [],
    requireDualIdentity: (input.characterNames?.length ?? 0) >= 2,
  });
  const assert = assertLiteraryFidelity(prompt || desc, checklist);
  const missing = assert.missing.map((m) => m.id);
  if (orphan) missing.push("orphan_end_frame");

  return {
    required: true,
    ok: assert.ok && !orphan && Boolean(path || prompt),
    orphan,
    checklist,
    missing,
    reason: orphan ? "orphan_end_frame" : assert.ok ? undefined : "end_fidelity_fail",
    strengthen: orphan || !assert.ok ? { modeHint: "reroll_flf" } : undefined,
  };
}

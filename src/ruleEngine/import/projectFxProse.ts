/**
 * Import-time FX projection: visualEffect / fxFeasibilityAudit.desc → generation.fxPrompt.
 * Never invents prose; never writes letter-grade stubs.
 */
import type { ScriptBundle } from "../bundle/types";
import { proseFromVisualEffect } from "../bundle/normalizePreDesignPack";

export interface FxProjectResult {
  projected: { shotIndex: number; from: string }[];
  strippedLetterStubs: number[];
}

export function projectFxProseOnBundle(bundle: ScriptBundle): FxProjectResult {
  const projected: { shotIndex: number; from: string }[] = [];
  const strippedLetterStubs: number[] = [];
  const shots = bundle.preDesignPack?.shots ?? [];
  const auditItems =
    (bundle as { fxFeasibilityAudit?: { items?: { shotIndex?: number; level?: string; desc?: string }[] } })
      .fxFeasibilityAudit?.items ?? [];

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i] as {
      shotIndex?: number;
      visualEffect?: string;
      generation?: { fxPrompt?: string };
    };
    const idx = shot.shotIndex ?? i + 1;
    const existing = String(shot.generation?.fxPrompt ?? "").trim();
    if (/^F[0-5]$/i.test(existing)) {
      shot.generation = { ...shot.generation, fxPrompt: undefined };
      delete (shot.generation as { fxPrompt?: string }).fxPrompt;
      strippedLetterStubs.push(idx);
    }
    const slot = String(shot.generation?.fxPrompt ?? "").trim();
    if (slot && !/^F[0-5]$/i.test(slot)) continue;

    const fromVe = proseFromVisualEffect(shot.visualEffect);
    const fromAudit = String(auditItems.find((it) => it.shotIndex === idx)?.desc ?? "").trim();
    const prose = fromVe || fromAudit;
    if (!prose) continue;
    shot.generation = { ...shot.generation, fxPrompt: prose };
    projected.push({ shotIndex: idx, from: fromVe ? "visualEffect" : "fxFeasibilityAudit.desc" });
  }

  return { projected, strippedLetterStubs };
}

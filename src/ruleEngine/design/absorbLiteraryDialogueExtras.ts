/**
 * Import/soft-track heal: literary DC-01-EXTRA → absorb into dialoguePlan (align plan),
 * never invent plot; never absorb duration/punct noise (strip first).
 * Design hard: autoClose may call same kernel; Exit still rechecks after absorb.
 */
import type { ScriptBundle } from "../bundle/types";
import {
  asDialogueLineObjects,
  dialogueCoverageReport,
  isNonLiteraryDialogueKey,
  normalizeDialogueKey,
  stripNonLiteraryDialogueFromShots,
} from "./dialogueCoverage";

export type AbsorbLiteraryExtrasResult = {
  absorbed: number;
  strippedNoise: number;
  extrasLeft: number;
  lineIds: string[];
};

function stableExtraId(text: string): string {
  const k = normalizeDialogueKey(text).slice(0, 24);
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) {
    h ^= k.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `IMP-EXTRA-${(h >>> 0).toString(16)}`;
}

function findShotLine(
  shots: Record<string, unknown>[],
  extraKey: string,
): { speaker?: string; text: string } | null {
  const want = normalizeDialogueKey(extraKey);
  for (const s of shots) {
    const lines = asDialogueLineObjects(
      (s.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue?.lines,
    );
    for (const l of lines) {
      const text = String(l.text ?? "").trim();
      if (!text) continue;
      const key = normalizeDialogueKey(text);
      if (key === want || key.includes(want) || want.includes(key)) {
        return { speaker: l.speaker ? String(l.speaker) : undefined, text };
      }
    }
  }
  return { text: extraKey };
}

/**
 * Mutates bundle.planData.dialoguePlan + strips noise from shots.
 * Literary extras → appended to plan; noise → stripped from shots.
 */
export function absorbLiteraryDialogueExtrasOnBundle(
  bundle: ScriptBundle,
  opts?: { maxAbsorb?: number },
): AbsorbLiteraryExtrasResult {
  const maxAbsorb = opts?.maxAbsorb ?? 24;
  const pack = bundle.preDesignPack ?? { shots: [] };
  let shots = [...((pack.shots ?? []) as Record<string, unknown>[])];

  const noise = stripNonLiteraryDialogueFromShots(shots);
  shots = noise.shots;
  if (bundle.preDesignPack) (bundle.preDesignPack as { shots: unknown }).shots = shots;

  const pd = ((bundle.planData as Record<string, unknown> | undefined) ??
    ((bundle as { planData: Record<string, unknown> }).planData = {})) as Record<string, unknown>;
  const plan =
    (pd.dialoguePlan as { lines?: { speaker?: string; text?: string; lineId?: string }[] } | undefined) ??
    (pd.dialoguePlan = { lines: [] });
  if (!Array.isArray(plan.lines)) plan.lines = [];

  const report = dialogueCoverageReport({
    script: String(bundle.script ?? ""),
    planData: pd as ScriptBundle["planData"],
    shots,
  });

  const existingKeys = new Set(
    plan.lines.map((l) => normalizeDialogueKey(String(l.text ?? ""))).filter(Boolean),
  );
  const existingIds = new Set(plan.lines.map((l) => String(l.lineId ?? "")).filter(Boolean));
  const absorbedIds: string[] = [];
  let absorbed = 0;

  for (const ek of report.extraKeys) {
    if (absorbed >= maxAbsorb) break;
    if (isNonLiteraryDialogueKey(ek)) continue;
    const hit = findShotLine(shots, ek);
    if (!hit?.text || isNonLiteraryDialogueKey(hit.text)) continue;
    const key = normalizeDialogueKey(hit.text);
    if (!key || existingKeys.has(key)) continue;
    // Skip if already covered by fuzzy expected (re-check after prior absorbs)
    if (
      [...existingKeys].some((e) => e.includes(key) || key.includes(e))
    ) {
      continue;
    }
    let lineId = stableExtraId(hit.text);
    if (existingIds.has(lineId)) lineId = `${lineId}-${absorbed}`;
    plan.lines.push({
      speaker: hit.speaker || "角色",
      text: hit.text,
      lineId,
    });
    existingKeys.add(key);
    existingIds.add(lineId);
    absorbedIds.push(lineId);
    absorbed++;
  }

  pd.dialoguePlan = plan;
  if (bundle.planData && typeof bundle.planData === "object") {
    (bundle.planData as Record<string, unknown>).dialoguePlan = plan;
  }

  const after = dialogueCoverageReport({
    script: String(bundle.script ?? ""),
    planData: pd as ScriptBundle["planData"],
    shots,
  });

  return {
    absorbed,
    strippedNoise: noise.stripped,
    extrasLeft: after.extraCount,
    lineIds: absorbedIds,
  };
}

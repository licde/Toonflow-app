/**
 * Import heal: declare F0 on empty undeclared FX shots.
 * Never invents fxPrompt prose. Upserts fxFeasibilityAudit.items + demotes false FX=pass.
 * Also demotes stale F1+ audit/intent with no FX materials (e.g. after lip-split shotIndex shift).
 */
import type { ScriptBundle } from "../bundle/types";
import { proseFromVisualEffect } from "../bundle/normalizePreDesignPack";

export interface DeclareF0Result {
  declared: number[];
  demotedFxAudit: boolean;
}

function ensureAuditItems(
  bundle: ScriptBundle,
): { shotIndex?: number; level?: string; feasible?: boolean; desc?: string }[] {
  const root = bundle as {
    fxFeasibilityAudit?: { items?: { shotIndex?: number; level?: string; feasible?: boolean; desc?: string }[] };
  };
  if (!root.fxFeasibilityAudit) root.fxFeasibilityAudit = { items: [] };
  if (!Array.isArray(root.fxFeasibilityAudit.items)) root.fxFeasibilityAudit.items = [];
  return root.fxFeasibilityAudit.items;
}

function isFxProse(text: string): boolean {
  const t = text.trim();
  return Boolean(t && !/^F[0-5]$/i.test(t) && !/^FX:\s*F[0-5]$/i.test(t) && t.length >= 4);
}

function upsertF0(
  items: { shotIndex?: number; level?: string; feasible?: boolean; desc?: string }[],
  shotNum: number,
): void {
  const existing = items.find((it) => it.shotIndex === shotNum);
  if (existing) {
    existing.level = "F0";
    existing.feasible = true;
    existing.desc = existing.desc && !/^F[1-5]/i.test(existing.desc) ? existing.desc : "无特效";
  } else {
    items.push({ shotIndex: shotNum, level: "F0", feasible: true, desc: "无特效" });
  }
}

export function declareF0OnBundle(bundle: ScriptBundle): DeclareF0Result {
  const shots = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
  const declared: number[] = [];
  const items = ensureAuditItems(bundle);

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    const idx = (shot.shotIndex as number | undefined) ?? i + 1;
    const veProse = proseFromVisualEffect(typeof shot.visualEffect === "string" ? shot.visualEffect : undefined);
    const fxRaw = String(
      (shot.generation as { fxPrompt?: string } | undefined)?.fxPrompt ?? shot.fxPrompt ?? "",
    ).trim();
    const fxProse = isFxProse(fxRaw);

    const localGrade = String(
      (shot as { fxFeasibility?: string }).fxFeasibility ??
        (shot.generation as { fxFeasibility?: string } | undefined)?.fxFeasibility ??
        "",
    )
      .toUpperCase()
      .replace(/^FX:/, "")
      .trim();
    const auditGrade = String(items.find((it) => it.shotIndex === idx)?.level ?? "")
      .toUpperCase()
      .replace(/^FX:/, "")
      .trim();
    // Ignore stale audit F1+ when no visualEffect
    const grade =
      localGrade ||
      (auditGrade && (!/^F[1-5]$/.test(auditGrade) || veProse) ? auditGrade : "");

    // Real FX materials: keep (do not demote to F0)
    if (veProse) continue;
    if (fxProse && /^F[1-3]$/.test(grade)) continue;

    // No visualEffect → F0 track; strip orphan fxPrompt
    const gen = (shot.generation as Record<string, unknown> | undefined) ?? {};
    delete gen.fxPrompt;
    delete shot.fxPrompt;
    shot.fxFeasibility = "F0";
    shot.generation = { ...gen, fxFeasibility: "F0" };
    upsertF0(items, idx);
    if (grade !== "F0" && grade !== "NONE") declared.push(idx);
  }

  let demotedFxAudit = false;
  const audit = bundle.modalityPromptAudit as Record<string, unknown> | undefined;
  if (audit && declared.length > 0) {
    const fxPass =
      audit.FX === "pass" ||
      (audit as { modalities?: { FX?: string } }).modalities?.FX === "pass";
    if (fxPass) {
      audit.FX = "partial";
      const mods = (audit as { modalities?: Record<string, string> }).modalities;
      if (mods && mods.FX === "pass") mods.FX = "partial";
      demotedFxAudit = true;
    }
  }

  return { declared, demotedFxAudit };
}

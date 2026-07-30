import type { ScriptBundle, PreDesignShot } from "./types";
import type { BundleGap } from "./auditTypes";
import { compileFromShotDesign } from "./compileFromShotDesign";
import { normalizeFxLevel } from "../fixtures/policyFixtures";

function sceneMetaList(bundle: ScriptBundle): Record<string, unknown>[] {
  const pd = bundle.planData as { sceneMeta?: Record<string, unknown>[] } | undefined;
  return pd?.sceneMeta ?? [];
}

function implementationPlan(bundle: ScriptBundle): Record<string, unknown>[] {
  const nb = (bundle.planData as { narrativeBrief?: { implementationPlan?: Record<string, unknown>[] } })?.narrativeBrief;
  return nb?.implementationPlan ?? [];
}

export function auditModalityChainGaps(bundle: ScriptBundle, tier: "T1" | "T2" | "T3" = "T3"): BundleGap[] {
  if (tier !== "T3") return [];
  const gaps: BundleGap[] = [];
  const shots = bundle.preDesignPack?.shots ?? [];
  const sceneMetas = sceneMetaList(bundle);
  const fxAudit = bundle.fxFeasibilityAudit as { items?: { shotIndex?: number; level?: string; feasibility?: string }[] } | undefined;
  const modAudit = bundle.modalityPromptAudit as Record<string, unknown> | undefined;
  const debut = bundle.debutIntroPack as { items?: { fxLevel?: string; degradeFixPlan?: string }[] } | undefined;

  sceneMetas.forEach((sm, i) => {
    const av = sm.avCausality as { audioBeat?: string; visualPeak?: string } | undefined;
    const fxIntent = sm.fxIntent as { level?: string } | undefined;
    const shotIdx = (sm.sceneRef as number) ?? i + 1;
    const shot = shots.find((s, j) => (s.shotIndex ?? j + 1) === shotIdx);

    if (fxIntent?.level && shot && !shot.visualEffect?.trim()) {
      gaps.push({
        id: "MOD-01",
        severity: "WARN",
        message: "W3 fxIntent 有但 SB 无 visualEffect",
        chainId: "modality_feasibility",
        trigger: "modality_fx_missing",
        field: "visualEffect",
        shotIndex: shotIdx,
      });
    }

    if (av?.audioBeat && shot) {
      const hasDialogue = (shot.narrative?.dialogue?.lines?.length ?? 0) > 0;
      if (hasDialogue && !shot.generation?.audioPrompt?.trim()) {
        gaps.push({
          id: "MOD-03",
          severity: "WARN",
          message: "W3 audioBeat 有但台词镜无 audioPrompt",
          chainId: "modality_feasibility",
          trigger: "modality_aud_missing",
          field: "generation.audioPrompt",
          shotIndex: shotIdx,
        });
      }
    }
  });

  shots.forEach((shot, i) => {
    const idx = shot.shotIndex ?? i + 1;
    const fxSlot = String(shot.generation?.fxPrompt ?? "").trim();
    const fxProse = Boolean(fxSlot) && !/^F[0-5]$/i.test(fxSlot);
    if (shot.visualEffect?.trim() && !fxProse) {
      gaps.push({
        id: "MOD-02",
        severity: "WARN",
        message: "SB visualEffect 有但无 generation.fxPrompt 散文（audit item 不能代替槽）",
        chainId: "modality_feasibility",
        trigger: "modality_fx_missing",
        field: "generation.fxPrompt",
        shotIndex: idx,
      });
    }

    if (shot.retentionTier?.startsWith("0-2") && shot.generation?.videoPrompt) {
      const vid = shot.generation.videoPrompt.toLowerCase();
      if (!/static|motion-from-frame/.test(vid)) {
        gaps.push({
          id: "MOD-05",
          severity: "WARN",
          message: "retentionTier 0-2s 镜 VID 无 static/motion-from-frame",
          chainId: "modality_compile",
          trigger: "modality_slot_missing",
          field: "generation.videoPrompt",
          shotIndex: idx,
        });
      }
    }

    // F14: dialogue shot missing audioPrompt — WARN at audit; burn path hard-gates separately
    const dial = shot.narrative?.dialogue?.lines ?? [];
    const hasDial = Array.isArray(dial) && dial.some((l) => String(typeof l === "string" ? l : l?.text ?? "").trim());
    if (hasDial && !String(shot.generation?.audioPrompt ?? "").trim()) {
      gaps.push({
        id: "MOD-03",
        severity: "WARN",
        message: "台词镜缺 generation.audioPrompt",
        chainId: "modality_feasibility",
        trigger: "modality_aud_missing",
        field: "generation.audioPrompt",
        shotIndex: idx,
      });
    }
  });

  debut?.items?.forEach((item, i) => {
    const lvl = item.fxLevel ?? "";
    if (/F[3-9]/.test(lvl) && !item.degradeFixPlan) {
      gaps.push({
        id: "MOD-06",
        severity: "WARN",
        message: "debutIntroPack.fxLevel > F2 且无 degradeFixPlan",
        chainId: "packaging",
        trigger: "fx_infeasible",
        field: "debutIntroPack",
        shotIndex: i + 1,
      });
    }
  });

  const slots = ["IMG", "VID", "AUD", "FX"];
  for (const slot of slots) {
    const key = slot === "IMG" ? "IMG" : slot;
    if (modAudit && modAudit[key] === undefined && modAudit[slot.toLowerCase()] === undefined) {
      const anyShotMissing = shots.some((s) => {
        const g = s.generation;
        if (slot === "IMG") return !g?.imagePrompt?.trim();
        if (slot === "VID") return !g?.videoPrompt?.trim();
        if (slot === "AUD") return (s.narrative?.dialogue?.lines?.length ?? 0) > 0 && !g?.audioPrompt?.trim();
        if (slot === "FX") return Boolean(s.visualEffect?.trim()) && !g?.fxPrompt?.trim();
        return false;
      });
      if (anyShotMissing) {
        gaps.push({
          id: "MOD-07",
          severity: "WARN",
          message: `modalityPromptAudit.${key} slot 空或镜级缺失`,
          chainId: "modality_compile",
          trigger: "modality_slot_missing",
          field: `modalityPromptAudit.${key}`,
        });
      }
    }
  }

  void implementationPlan;
  return gaps;
}

export function enrichShotGenerationFromDesign(shot: PreDesignShot, opts?: { visualLockTable?: Record<string, unknown> }): PreDesignShot {
  const gen = { ...shot.generation };
  const compiled = compileFromShotDesign(shot);
  if (!gen.imagePrompt?.trim() && compiled.imagePrompt) gen.imagePrompt = compiled.imagePrompt;
  if (!gen.videoPrompt?.trim() && compiled.videoPrompt) gen.videoPrompt = compiled.videoPrompt;

  const codes = shot.charCodes ?? [];
  const lock = opts?.visualLockTable as { characterAssets?: Record<string, string> } | undefined;
  if (gen.imagePrompt?.trim() && codes.length && lock?.characterAssets) {
    for (const code of codes) {
      const cref = `--cref ${code}`;
      if (!gen.imagePrompt.includes(cref)) {
        gen.imagePrompt = `${gen.imagePrompt}, ${cref}`;
      }
    }
  }

  // Strong contract mark: VD || dialogue — import does not BLOCK, generation heals or true-gap BLOCKs
  const vd = String(shot.visualDescription ?? "").trim();
  const dial = shot.narrative?.dialogue?.lines ?? [];
  const hasDial = Array.isArray(dial) && dial.some((l) => String(typeof l === "string" ? l : l?.text ?? "").trim());
  const designGaps: string[] = [];
  if (!vd) designGaps.push("missing_visualDescription");
  if (!hasDial && !vd) designGaps.push("missing_dialogue_and_vd");
  if (designGaps.length) {
    (gen as { designGaps?: string[] }).designGaps = designGaps;
  }

  return { ...shot, generation: gen };
}

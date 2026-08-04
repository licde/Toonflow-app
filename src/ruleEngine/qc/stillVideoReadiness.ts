/**
 * stillVideoReadiness — separates still pass from I2V-ready.
 * Intent-first: only missing still hard-blocks burn; atom/heuristic debts are soft ledger.
 * Prefers literaryEffectsQualified when Key absent (no visualPass required for literary bar).
 */
import { deriveStillAtomContract } from "../compilers/stillAtomContract";

export type StillVideoReadinessResult = {
  stillPass: boolean;
  i2vReady: boolean;
  reason?: string;
  /** All misses (soft + critical) for ledger / repair routing */
  criticalMisses: string[];
  /** Soft absorbable at burn (heal_then_burn ledger) */
  softMisses?: string[];
  /** Hard blockers — only missing still / no file class */
  hardMisses?: string[];
};

/** Only true absence of still hard-blocks I2V; everything else is debt ledger. */
function isHardMiss(m: string): boolean {
  return m === "still_quality:missing";
}

function isSoftMiss(m: string): boolean {
  return !isHardMiss(m);
}

export function assessStillVideoReadiness(input: {
  stillQuality?: string | null;
  visualPass?: boolean | null;
  sheetLeak?: boolean | null;
  fidelityItems?: Array<{ id: string; pass: boolean; evidence?: string }>;
  promptUsed?: string | null;
  i2vCriticalFacts?: string[] | null;
  visualDescription?: string | null;
  /** May carry contaminationClass / deliveryTier / literaryEffectsQualified */
  stillMeta?: Record<string, unknown> | null;
  contract?: import("../design/deriveGenerationContract").GenerationContract | null;
  /** Explicit literary bar (overrides meta when set) */
  literaryEffectsQualified?: boolean | null;
}): StillVideoReadinessResult {
  const meta = input.stillMeta ?? {};
  const litQualified =
    input.literaryEffectsQualified === true || meta.literaryEffectsQualified === true;
  const litExplicitFail =
    input.literaryEffectsQualified === false || meta.literaryEffectsQualified === false;
  // With Key: stillPass needs hq_ok + visualPass. Without Key / unmeasured: literary qualify may stand in.
  const classicPass =
    String(input.stillQuality ?? "") === "hq_ok" && input.visualPass === true && !input.sheetLeak;
  const q = String(input.stillQuality ?? "");
  const stillPass =
    classicPass ||
    (litQualified && !input.sheetLeak && q !== "missing") ||
    // Intent-first: any non-missing still with file-backed burn may stand in as soft pass
    (q !== "missing" && q.length > 0 && !input.sheetLeak);
  const misses: string[] = [];
  if (q === "weak" || q === "draft" || q === "missing") {
    misses.push(`still_quality:${q || "missing"}`);
  }
  if (input.visualPass === false && q === "hq_ok") {
    misses.push("visualPass_false");
  }
  const contam = String(meta.contaminationClass ?? "").trim();
  if (contam && contam !== "none") {
    const phase = String(meta.stillPhase ?? "");
    // LGIA: approaching incomplete grip / approach atoms ≠ hard contam for I2V soft ledger
    if (
      (phase === "approaching" || phase === "mid_contact") &&
      (contam === "contact_zombie" || contam === "plate_geometry")
    ) {
      misses.push(`contam_soft:${contam}`);
    } else {
      misses.push(`contam:${contam}`);
    }
  }
  if (String(meta.deliveryTier ?? "") === "draft") misses.push("delivery:draft");
  if (meta.keyOptional === true) misses.push("key_optional");
  if (String(meta.pixelDimStatus ?? "") === "unmeasured") misses.push("pixel_unmeasured");
  if (litExplicitFail) {
    misses.push("literary_effects_unqualified");
    const missing = meta.missingEffects;
    if (Array.isArray(missing)) {
      for (const m of missing.slice(0, 4)) {
        const id = typeof m === "string" ? m : String((m as { id?: string })?.id ?? "");
        if (id) misses.push(`lit:${id}`);
      }
    }
  }
  for (const item of input.fidelityItems ?? []) {
    // Skip unmeasured Key-absent items — not pixel fails
    if (/unmeasured|vlm_infra_unmeasured/i.test(String(item.evidence ?? ""))) continue;
    if (
      !item.pass &&
      /contact|prop|readable|single_frame|identity|background|occupancy|action/i.test(item.id)
    ) {
      misses.push(item.id);
    }
  }
  const prompt = String(input.promptUsed ?? "");
  if (/四视图|拼版|character sheet/i.test(prompt)) misses.push("sheet_layout");
  if (/配角站立|完整立像|半身立像/.test(prompt) && /特写|贴颊|纸角/.test(prompt)) {
    misses.push("secondary_dominance");
  }

  for (const fact of input.i2vCriticalFacts ?? []) {
    const text = String(fact ?? "").trim();
    if (!text) continue;
    if (/^站位：/.test(text)) continue;
    const tokens = text
      .split(/[：:\s，,、|/]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !/禁止|必须|真实/.test(t));
    const hit = tokens.some(
      (t) => prompt.includes(t) || String(input.visualDescription ?? "").includes(t),
    );
    if (!hit && /贴合|划过|纸角|休书|触肤|清晰入画|可读/.test(text)) {
      const core = /贴合|划过|纸角|休书|触肤|清晰|可读/.exec(text)?.[0];
      if (core && !(prompt.includes(core) || String(input.visualDescription ?? "").includes(core))) {
        misses.push(`i2v_fact:${core}`);
      }
    } else if (!hit && tokens.length && /contact|prop|geom/i.test(text)) {
      misses.push(`i2v_fact:${tokens[0]}`);
    }
  }

  const atoms = deriveStillAtomContract({
    contract: input.contract ?? null,
    visualDescription: input.visualDescription ?? String(input.stillMeta?.visualDescription ?? ""),
    prompt,
  });
  for (const m of atoms.mustFail) misses.push(m);

  if (input.stillMeta?.grayStudio === true || input.stillMeta?.sceneDominanceEvidence) {
    const dom = input.stillMeta.sceneDominanceEvidence as { grayStudio?: boolean } | undefined;
    if (input.stillMeta.grayStudio === true || dom?.grayStudio) misses.push("gray_studio");
  }
  if (
    meta.softEnvMissingHonest === true ||
    meta.softEnv_missing === true ||
    (meta.keepSoftEnvRef === true &&
      meta.softEnvPlatePresent === false &&
      meta.softEnvBakedIntoIdentity !== true)
  ) {
    misses.push("softEnv_missing");
  }
  if (meta.grayStudio === true) misses.push("gray_studio");

  const uniq = [...new Set(misses)];
  const softMisses = uniq.filter(isSoftMiss);
  const hardMisses = uniq.filter(isHardMiss);
  // Intent-first: only missing still hard-blocks; atom debts (secondary_dominance, missing_prop_pose_locus, …) soft
  const i2vReady = hardMisses.length === 0 && q !== "missing" && (stillPass || softMisses.length > 0 || q.length > 0);
  return {
    stillPass,
    i2vReady,
    reason: i2vReady
      ? softMisses.length
        ? `soft:${softMisses[0]}`
        : undefined
      : hardMisses[0] ?? softMisses[0] ?? (!stillPass ? "still_not_pass" : "i2v_blocked"),
    criticalMisses: uniq,
    softMisses,
    hardMisses,
  };
}

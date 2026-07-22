/**
 * Still prompt pipeline SSOT — touch → assemble → measure → restore → fidelity inject → egress.
 * Routes must call runStillPromptPipeline; do not ad-hoc assemble in generate/batch/persist.
 */
import { touchPromptForVendor } from "./vendorPromptAdapter";
import { assemblePromptWithSlots, type IdentitySlot } from "../kernels/promptKernel";
import type { DesignFields } from "../design/designFieldRegistry";
import { applyDesignFieldRegistry } from "../design/designFieldRegistry";
import {
  assertStillLiteraryBody,
  loadStillPromptPipelineConfig,
  measureLiteraryBody,
  type LiteraryBodyMeasure,
} from "./assertStillLiteraryBody";
import { assertStillDescCoverage, type StillDescCoverageResult } from "./stillDescCoverage";
import type { ComposeStillResult } from "./composeStillPrompt";
import { precheckContentPolicy } from "./contentPolicyAdapter";
import {
  assertLiteraryFidelity,
  buildLiteraryFidelityChecklist,
  type StillFidelityItem,
} from "./literaryFidelityChecklist";
import { normalizeStillEgressPrompt } from "./stillEgressNormalize";
import { healStillRecipePolicy } from "./stillRecipePolicy";
import { readFixtureJson } from "../utils/fixturesPath";

export interface StillPromptPipelineInput {
  composed: ComposeStillResult;
  description?: string | null;
  characterNames?: string[] | null;
  identitySlots?: IdentitySlot[];
  fields?: DesignFields;
  aspectRatioFallback?: string;
  modality?: "image" | "video";
  mode?: string;
  /** Prebuilt checklist; else built from description */
  checklist?: StillFidelityItem[];
}

export interface StillPromptPipelineResult {
  egressPrompt: string;
  literaryChars: number;
  collapsed: boolean;
  collapsedReason?: string;
  healed: boolean;
  autoHealed: string[];
  coverage: StillDescCoverageResult;
  literaryOk: boolean;
  measure: LiteraryBodyMeasure;
  pipelineVersion: string;
  stages: string[];
  allowHqOk: boolean;
  fidelityOk: boolean;
  fidelityMissing: string[];
  checklist: StillFidelityItem[];
  /** Recipe policy self-heal ids for FE / reverse */
  recipeHeals?: string[];
}

interface LoopCfg {
  l0MaxInjectRounds?: number;
}

function loadLoopCfg(): LoopCfg {
  return readFixtureJson<LoopCfg>("still_visual_fidelity_loop.json", { l0MaxInjectRounds: 2 });
}

export function demoteImageDesignFieldsForAssemble(
  fields: DesignFields | undefined,
  literaryOk: boolean,
): DesignFields {
  const f: DesignFields = { ...(fields ?? {}) };
  const cfg = loadStillPromptPipelineConfig().imageDesignTail;
  if (!literaryOk) {
    if (cfg?.exprGuard === "append_only_if_literary_ok") f.exprGuard = false;
    if (cfg?.negativeAV === "append_only_if_literary_ok") f.negativeAV = false;
  }
  return f;
}

function appendSafeDesignTail(prompt: string, fields: DesignFields | undefined, literaryOk: boolean): string {
  if (!literaryOk || !fields) return prompt;
  const cfg = loadStillPromptPipelineConfig().imageDesignTail;
  const tailFields: DesignFields = {
    fxPrompt: cfg?.allowFxOneLine === false ? null : fields.fxPrompt,
    exprGuard: cfg?.exprGuard === "append_only_if_literary_ok" ? true : fields.exprGuard,
    negativeAV: cfg?.negativeAV === "append_only_if_literary_ok" ? true : fields.negativeAV,
  };
  return applyDesignFieldRegistry(prompt, tailFields, { modality: "image" }).prompt;
}

function restoreLiteraryFromComposed(
  composed: ComposeStillResult,
  identitySlots: IdentitySlot[],
  aspectRatioFallback?: string,
): string {
  const touched = touchPromptForVendor(composed.prompt, aspectRatioFallback);
  let base = touched.vendorPrompt;
  const assembled = assemblePromptWithSlots({
    basePrompt: base,
    identitySlots,
    fields: {},
    modality: "image",
  });
  base = assembled.prompt;
  if (composed.orderedCrefCodes?.length && !/--cref\s+CHAR-/i.test(base)) {
    base = `${base.trim()} --cref ${composed.orderedCrefCodes.join(" ")}`.replace(/\s{2,}/g, " ");
  }
  return base;
}

function injectMissingFidelity(prompt: string, missing: StillFidelityItem[]): string {
  let next = prompt;
  for (const m of missing) {
    const bit = (m.healInject || "").trim();
    if (!bit) continue;
    if (next.includes(bit.slice(0, Math.min(8, bit.length)))) continue;
    next = `${next.trim()}，${bit}`;
  }
  return next;
}

export function runStillPromptPipeline(input: StillPromptPipelineInput): StillPromptPipelineResult {
  const cfg = loadStillPromptPipelineConfig();
  const loopCfg = loadLoopCfg();
  const stages: string[] = ["touch"];
  const autoHealed: string[] = [];
  const modality = input.modality ?? "image";
  const identitySlots = input.identitySlots ?? [];
  const maxRounds = cfg.collapse?.maxRounds ?? 1;
  const injectRounds = loopCfg.l0MaxInjectRounds ?? 2;
  const names = input.characterNames ?? [];
  const description = input.description ?? input.composed.visualBody;
  const checklist =
    input.checklist ??
    buildLiteraryFidelityChecklist({
      description,
      characterNames: names,
      requireDualIdentity: names.length >= 2,
    });

  const touched = touchPromptForVendor(input.composed.prompt, input.aspectRatioFallback);
  let prompt = touched.vendorPrompt;
  const policy = precheckContentPolicy(prompt);
  if (policy.hasSensitiveTerms) prompt = policy.softenedPrompt;

  let pre = measureLiteraryBody(prompt);
  const fieldsForAssemble = demoteImageDesignFieldsForAssemble(input.fields, pre.ok);

  stages.push("assemble");
  const assembled = assemblePromptWithSlots({
    basePrompt: prompt,
    identitySlots,
    fields: modality === "image" ? fieldsForAssemble : input.fields ?? {},
    modality,
    mode: input.mode,
  });
  prompt = assembled.prompt;

  let measure = measureLiteraryBody(prompt);
  let healed = false;
  let collapsed = measure.collapsed;

  if (measure.collapsed && cfg.collapse?.action === "silent_restore_composed") {
    for (let r = 0; r < maxRounds; r++) {
      stages.push("heal_restore_literary");
      prompt = restoreLiteraryFromComposed(input.composed, identitySlots, input.aspectRatioFallback);
      const afterRestore = measureLiteraryBody(prompt);
      if (afterRestore.ok) {
        prompt = appendSafeDesignTail(prompt, input.fields, true);
      }
      measure = measureLiteraryBody(prompt);
      healed = true;
      autoHealed.push("restore_literary_body");
      collapsed = measure.collapsed;
      if (!measure.collapsed) break;
    }
  } else if (!measure.collapsed) {
    stages.push("design_tail");
    prompt = appendSafeDesignTail(prompt, input.fields, true);
    measure = measureLiteraryBody(prompt);
  }

  stages.push("fidelity_assert");
  let fidelity = assertLiteraryFidelity(prompt, checklist);
  for (let r = 0; r < injectRounds && !fidelity.ok; r++) {
    stages.push("silent_inject_missing");
    prompt = injectMissingFidelity(prompt, fidelity.missing);
    for (const m of fidelity.missing) autoHealed.push(`inject:${m.id}`);
    healed = true;
    fidelity = assertLiteraryFidelity(prompt, checklist);
    if (fidelity.ok) break;
  }

  stages.push("coverage");
  const coverage = assertStillDescCoverage({
    prompt,
    description,
    characterNames: names,
  });

  const literaryOk = measure.ok;
  const fidelityOk = fidelity.ok;
  const allowHqOk = literaryOk && coverage.ok && fidelityOk && input.composed.ok && !collapsed;

  stages.push("egress");
  const normalized = normalizeStillEgressPrompt(prompt.replace(/\s{2,}/g, " ").trim());
  if (normalized.changed) {
    stages.push("egress_normalize");
    for (const n of normalized.notes) autoHealed.push(`egress:${n}`);
  }
  const recipeHeal = healStillRecipePolicy(normalized.prompt);
  if (recipeHeal.changed) {
    stages.push("recipe_heal");
    for (const id of recipeHeal.healed) autoHealed.push(`recipe:${id}`);
  }
  const fromCompose = input.composed.recipeHeals ?? [];
  const recipeHeals = [...new Set([...fromCompose, ...recipeHeal.healed])];
  return {
    egressPrompt: recipeHeal.prompt,
    literaryChars: measure.chars,
    collapsed,
    collapsedReason: measure.collapsedReason,
    healed: healed || recipeHeal.changed,
    autoHealed,
    coverage,
    literaryOk,
    measure,
    pipelineVersion: cfg.version,
    stages,
    allowHqOk,
    fidelityOk,
    fidelityMissing: fidelity.missing.map((m) => m.id),
    checklist,
    recipeHeals: recipeHeals.length ? recipeHeals : undefined,
  };
}

export function gateStillEgressPrompt(prompt: string): ReturnType<typeof assertStillLiteraryBody> {
  return assertStillLiteraryBody(prompt);
}

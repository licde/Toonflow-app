import type { ScriptBundle } from "../bundle/types";

export interface ForwardTraceItem {
  dimension: string;
  chainId: string;
  sourceStage: string;
  sourceField: string;
  targetStage: string;
  targetField: string;
  derivation: string;
  preserveOnRePush: boolean;
  modality?: string;
}

export interface ForwardTraceResult {
  version: string;
  traces: ForwardTraceItem[];
}

function countDialogueLines(script: string): number {
  return (script.match(/：|:/g) ?? []).length;
}

export function buildForwardTrace(bundle: ScriptBundle, tier: "T1" | "T2" | "T3" = "T1"): ForwardTraceResult {
  const traces: ForwardTraceItem[] = [];
  const brief = bundle.designBrief as Record<string, unknown> | undefined;
  const shots = bundle.preDesignPack?.shots ?? [];

  traces.push({
    dimension: "dialogue",
    chainId: "dialogue",
    sourceStage: "W3",
    sourceField: "script",
    targetStage: "SB",
    targetField: "narrative.dialogue.lines",
    derivation: "one-line-one-shot",
    preserveOnRePush: true,
  });

  if (brief?.emotionCurveOutline || (brief as { B4?: unknown })?.B4) {
    traces.push({
      dimension: "av",
      chainId: "av",
      sourceStage: "B",
      sourceField: "designBrief.B4",
      targetStage: "SB",
      targetField: "emotion",
      derivation: "emotion-arc",
      preserveOnRePush: false,
    });
  }

  if ((brief as { assetHints?: { scenes?: string[] } })?.assetHints?.scenes?.length || shots.length) {
    traces.push({
      dimension: "scene",
      chainId: "scene",
      sourceStage: "B",
      sourceField: "designBrief.B6.scenes",
      targetStage: "SB",
      targetField: "sceneName",
      derivation: "scene-map",
      preserveOnRePush: false,
    });
  }

  if ((brief as { infoLinkageChain?: unknown[] })?.infoLinkageChain?.length) {
    traces.push({
      dimension: "story",
      chainId: "story",
      sourceStage: "B",
      sourceField: "designBrief.B5",
      targetStage: "SB",
      targetField: "markers",
      derivation: "info-linkage",
      preserveOnRePush: false,
    });
  }

  if ((brief as { B12?: unknown[] })?.B12?.length
    || shots.some((s) => (s as { shotSize?: string; narrative?: { transitionType?: string } }).shotSize
      || (s as { narrative?: { transitionType?: string } }).narrative?.transitionType)) {
    traces.push({
      dimension: "camera",
      chainId: "camera",
      sourceStage: "B",
      sourceField: (brief as { B12?: unknown[] })?.B12?.length ? "designBrief.B12" : "SB.shotSize",
      targetStage: "SB",
      targetField: "transitionType",
      derivation: "camera-transition",
      preserveOnRePush: false,
    });
  }

  if (bundle.continuity && (
    bundle.continuity.prevEpisodeSummary
    || bundle.continuity.characterState
    || (bundle.continuity.unresolvedHooks?.length ?? 0) > 0
  )) {
    traces.push({
      dimension: "continuity",
      chainId: "continuity",
      sourceStage: "continuity",
      sourceField: bundle.continuity.prevEpisodeSummary ? "prevEpisodeSummary" : "characterState",
      targetStage: "W3",
      targetField: "script",
      derivation: "cross-episode",
      preserveOnRePush: true,
    });
  }

  traces.push({
    dimension: "script",
    chainId: "adaptation",
    sourceStage: "W3",
    sourceField: "script",
    targetStage: "B",
    targetField: "designBrief",
    derivation: "post-w3-brief",
    preserveOnRePush: true,
  });

  if (tier === "T3") {
    for (const m of ["IMG", "VID", "AUD", "FX"]) {
      traces.push({
        dimension: m,
        chainId: "modality_compile",
        sourceStage: "EN",
        sourceField: "generation.compiled",
        targetStage: "MD",
        targetField: `modalityPromptAudit.${m}`,
        derivation: "en-to-md",
        preserveOnRePush: false,
        modality: m,
      });
    }
    traces.push({
      dimension: "generation",
      chainId: "generation",
      sourceStage: "MD",
      sourceField: "modalityPromptAudit",
      targetStage: "Vendor",
      targetField: "generationFeedback",
      derivation: "md-to-vendor",
      preserveOnRePush: false,
    });
  }

  const hasAsset = shots.some((s) => ((s as { charCodes?: string[] }).charCodes?.length ?? 0) > 0)
    || Boolean((bundle as { characterDesign?: unknown }).characterDesign);
  if (hasAsset) {
    traces.push({
      dimension: "asset",
      chainId: "asset",
      sourceStage: "CD",
      sourceField: "characterDesign",
      targetStage: "EN",
      targetField: "charCodes",
      derivation: "cd-to-en-cref",
      preserveOnRePush: false,
    });
  }

  if (bundle.rulePackVersion || (bundle as { ruleAudit?: unknown }).ruleAudit
    || (bundle as { fixPlan?: unknown[] }).fixPlan?.length
    || (bundle as { rePushPlan?: unknown[] }).rePushPlan?.length) {
    traces.push({
      dimension: "repair",
      chainId: "repair",
      sourceStage: "SD",
      sourceField: "fixPlan",
      targetStage: "rePush",
      targetField: "rePushPlan",
      derivation: "sf-to-repush",
      preserveOnRePush: false,
    });
  }

  return { version: "2.0.1", traces };
}

export function enrichBundleForwardTrace(bundle: ScriptBundle, tier: "T1" | "T2" | "T3" = "T1"): ScriptBundle {
  const ft = buildForwardTrace(bundle, tier);
  return { ...bundle, forwardTrace: ft as unknown as Record<string, unknown> };
}

export function traceCoverageOk(bundle: ScriptBundle): boolean {
  const ft = bundle.forwardTrace as ForwardTraceResult | undefined;
  if (!ft?.traces?.length) return false;
  const dims = new Set(ft.traces.map((t) => t.dimension));
  return dims.has("dialogue") && (dims.has("av") || dims.has("scene")) && ft.traces.length >= 5;
}

export function dialogueLineCountMismatch(bundle: ScriptBundle): boolean {
  const script = bundle.script ?? "";
  const expected = countDialogueLines(script);
  if (!expected) return false;
  const shots = bundle.preDesignPack?.shots ?? [];
  const actual = shots.filter((s) => {
    const lines = (s as { narrative?: { dialogue?: { lines?: unknown[] } } }).narrative?.dialogue?.lines;
    return (lines?.length ?? 0) > 0;
  }).length;
  return actual < expected;
}

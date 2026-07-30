import type { ScriptBundle } from "../bundle/types";

export {
  normalizeDialogueKey,
  collectScriptDialogueTexts,
  expandShotDialogueLines,
  collectExpectedDialogue,
  dialogueCoverageReport,
  flattenDialogueText,
  dialogueLineCountMismatch,
} from "./dialogueCoverage";
export type { DialogueCoverageReport, DialogueLineLike, DialoguePlanData } from "./dialogueCoverage";

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

  if ((brief as { infoLinkageChain?: unknown[] })?.infoLinkageChain?.length
    || (brief as { B5?: unknown[] })?.B5?.length) {
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
    || bundle.continuity.recapHint
    || (bundle.continuity.unresolvedHooks?.length ?? 0) > 0
  )) {
    const sourceField = bundle.continuity.prevEpisodeSummary
      ? "prevEpisodeSummary"
      : bundle.continuity.recapHint
        ? "recapHint"
        : bundle.continuity.characterState
          ? "characterState"
          : "unresolvedHooks";
    traces.push({
      dimension: "continuity",
      chainId: "continuity",
      sourceStage: "continuity",
      sourceField,
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

  const plan = bundle.planData as Record<string, unknown> | undefined;
  if (plan?.adaptationMatrixStructured) {
    traces.push({
      dimension: "adaptation",
      chainId: "adaptation_deep",
      sourceStage: "P03",
      sourceField: "adaptationMatrixStructured",
      targetStage: "W2",
      targetField: "adaptationStrategy",
      derivation: "matrix-to-strategy",
      preserveOnRePush: true,
    });
  }
  if (plan?.informationLedger || plan?.dialoguePlan) {
    traces.push({
      dimension: "story",
      chainId: "narrative_drive",
      sourceStage: "W3",
      sourceField: "informationLedger",
      targetStage: "SB",
      targetField: "markers",
      derivation: "ledger-to-sb",
      preserveOnRePush: true,
    });
  }
  if (plan?.viralAdaptation || plan?.retentionPlan) {
    traces.push({
      dimension: "av",
      chainId: "retention",
      sourceStage: "P03",
      sourceField: "retentionPlan",
      targetStage: "SB",
      targetField: "retentionTier",
      derivation: "retention-to-sb",
      preserveOnRePush: false,
    });
  }
  if (shots.some((s) => (s as { shotDesign?: unknown }).shotDesign)) {
    traces.push({
      dimension: "IMG",
      chainId: "generation_apply",
      sourceStage: "SB",
      sourceField: "shotDesign",
      targetStage: "MD",
      targetField: "generation.imagePrompt",
      derivation: "design-to-prompt",
      preserveOnRePush: false,
    });
  }

  const nb = (plan as { narrativeBrief?: { implementationPlan?: unknown[] } })?.narrativeBrief;
  if (nb?.implementationPlan?.length) {
    traces.push({
      dimension: "generation",
      chainId: "modality_feasibility",
      sourceStage: "W3",
      sourceField: "narrativeBrief.implementationPlan",
      targetStage: "MD",
      targetField: "generation",
      derivation: "implementation-plan-to-prompt",
      preserveOnRePush: true,
    });
  }
  const sceneMeta = (plan as { sceneMeta?: unknown[] })?.sceneMeta;
  if (sceneMeta?.length) {
    traces.push({
      dimension: "av",
      chainId: "modality_feasibility",
      sourceStage: "W3",
      sourceField: "sceneMeta.avCausality",
      targetStage: "SB",
      targetField: "audioCue",
      derivation: "av-causality-to-sb",
      preserveOnRePush: false,
    });
  }

  if (bundle.debutIntroPack || (plan as { endCardPack?: unknown })?.endCardPack) {
    traces.push({
      dimension: "story",
      chainId: "packaging",
      sourceStage: "W3",
      sourceField: "debutIntroPack",
      targetStage: "SB",
      targetField: "establishing",
      derivation: "packaging-debut",
      preserveOnRePush: false,
    });
  }

  const viral = plan?.viralAdaptation as { clipPoints30s?: unknown[]; paypointSchedule?: unknown[] } | undefined;
  if (viral?.clipPoints30s?.length || viral?.paypointSchedule?.length) {
    traces.push({
      dimension: "story",
      chainId: "viral_clip",
      sourceStage: "W1",
      sourceField: "viralAdaptation",
      targetStage: "SB",
      targetField: "clip30sCandidate",
      derivation: "viral-to-sb",
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

  // B14–B23 / identity / motion forward coverage (ClosureGate SSOT)
  const bFields = ["B7", "B8", "B12", "B14", "B15", "B16", "B17", "B18", "B19", "B20", "B21", "B22", "B23"] as const;
  for (const bf of bFields) {
    if ((brief as Record<string, unknown>)?.[bf] != null) {
      traces.push({
        dimension: "story",
        chainId: "adaptation_deep",
        sourceStage: "B",
        sourceField: `designBrief.${bf}`,
        targetStage: bf === "B16" ? "P03" : bf === "B20" ? "W3" : "SB",
        targetField: "preDesignPack",
        derivation: `brief-${bf}`,
        preserveOnRePush: false,
      });
    }
  }

  if (shots.some((s) => (s as { charCodes?: string[] }).charCodes?.length || (s as { sceneCode?: string }).sceneCode)) {
    traces.push({
      dimension: "asset",
      chainId: "asset",
      sourceStage: "BP",
      sourceField: "charCodes|sceneCode",
      targetStage: "EN",
      targetField: "generation.identitySlots",
      derivation: "identity-slot-forward",
      preserveOnRePush: true,
    });
  }

  if (shots.some((s) => (s as { emotion?: unknown }).emotion != null || (s as { narrative?: { emotionIntensity?: unknown } }).narrative?.emotionIntensity != null)) {
    traces.push({
      dimension: "av",
      chainId: "av",
      sourceStage: "SB",
      sourceField: "emotion",
      targetStage: "EN",
      targetField: "compiled.emotion",
      derivation: "emotion-field-forward",
      preserveOnRePush: false,
      modality: "IMG+VID",
    });
  }

  if (brief?.voiceProfile || (brief as { assetHints?: { voices?: unknown } })?.assetHints?.voices) {
    traces.push({
      dimension: "av",
      chainId: "generation",
      sourceStage: "BP",
      sourceField: "voiceProfile",
      targetStage: "AUD",
      targetField: "audioPrompt",
      derivation: "bp-to-aud",
      preserveOnRePush: false,
      modality: "AUD",
    });
  }

  if (shots.some((s) => (s as { motion?: unknown }).motion || (s as { cameraMove?: unknown }).cameraMove)) {
    traces.push({
      dimension: "camera",
      chainId: "camera",
      sourceStage: "SB",
      sourceField: "motion",
      targetStage: "EN",
      targetField: "generation.motion",
      derivation: "B12-motion-to-en",
      preserveOnRePush: false,
    });
  }

  if ((plan as { retentionHooks?: unknown })?.retentionHooks || (plan as { narrativeDrive?: unknown })?.narrativeDrive) {
    traces.push({
      dimension: "story",
      chainId: "retention",
      sourceStage: "W3",
      sourceField: "retentionHooks",
      targetStage: "SB",
      targetField: "packaging",
      derivation: "retention-narrative-drive",
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

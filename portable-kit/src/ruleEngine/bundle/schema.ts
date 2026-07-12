import { z } from "zod";

export const bundleMetaSchema = z.object({
  episodeKey: z.string().optional(),
  episodeName: z.string().optional(),
  episodeIndex: z.number().optional(),
  projectId: z.number().optional(),
  scriptId: z.number().optional(),
  prevEpisodeKey: z.string().nullable().optional(),
  bundleHash: z.string().optional(),
  provenance: z
    .object({
      source: z.string().optional(),
      chapterRange: z.string().optional(),
      novelTitle: z.string().optional(),
      novelId: z.number().nullable().optional(),
      eventTrace: z
        .array(z.object({ novelRef: z.string().optional(), scriptRef: z.string().optional(), shotRef: z.string().optional() }))
        .optional(),
    })
    .optional(),
});

const designBriefSchema = z
  .object({
    B1: z.string().optional(),
    B2: z.string().optional(),
    B3: z.string().optional(),
    B4: z.array(z.number()).optional(),
    B5: z.array(z.string()).optional(),
    B6: z.record(z.string(), z.string()).optional(),
    B7: z.array(z.string()).optional(),
    B8: z.array(z.object({ position: z.string(), type: z.string() })).optional(),
    B9: z.array(z.object({ from: z.string(), to: z.string(), reason: z.string() })).optional(),
    B10: z.string().optional(),
    B11: z.array(z.string()).optional(),
    B12: z.record(z.string(), z.string()).optional(),
    B13: z.array(z.string()).optional(),
    emotionCurveOutline: z.array(z.number()).optional(),
    rhythmOutline: z.record(z.string(), z.string()).optional(),
    infoLinkageChain: z.array(z.string()).optional(),
    arcToneMap: z.record(z.string(), z.string()).optional(),
    visualLockHints: z.array(z.string()).optional(),
    paypointMarkers: z.array(z.object({ position: z.string(), type: z.string() })).optional(),
    sceneTransitionPlan: z.array(z.object({ from: z.string(), to: z.string(), reason: z.string() })).optional(),
    emotionCurveType: z.string().optional(),
  })
  .optional();

const generationSchema = z.object({
  imagePrompt: z.string().optional(),
  videoPrompt: z.string().optional(),
  audioPrompt: z.string().optional(),
  fxPrompt: z.string().optional(),
});

const preDesignShotSchema = z.object({
  shotIndex: z.number().optional(),
  type: z.string().optional(),
  sceneName: z.string().optional(),
  duration: z.number().optional(),
  shotSize: z.string().optional(),
  emotion: z.number().optional(),
  visualDescription: z.string().optional(),
  visualEffect: z.string().optional(),
  charCodes: z.array(z.string()).optional(),
  generation: generationSchema.optional(),
  narrative: z
    .object({
      dialogue: z
        .object({
          lines: z.array(z.object({ speaker: z.string().optional(), text: z.string().optional() })).optional(),
        })
        .optional(),
      markers: z.array(z.record(z.string(), z.unknown())).optional(),
      transitionType: z.string().optional(),
      rhythmZone: z.string().optional(),
      spatialRelation: z.string().optional(),
      emotionIntensity: z.number().optional(),
      sceneName: z.string().optional(),
      type: z.string().optional(),
    })
    .optional(),
  markers: z.array(z.record(z.string(), z.unknown())).optional(),
});

const preDesignPackSchema = z
  .object({
    scriptPlan: z.string(),
    shots: z.array(preDesignShotSchema).min(1),
    externalHashCheck: z.object({ match: z.boolean().optional(), hash: z.string().optional() }).optional(),
    preDesignQuality: z.object({ overall: z.string().optional(), supervision: z.string().optional() }).optional(),
    sceneCodeMap: z.record(z.string(), z.string()).optional(),
  })
  .optional();

const storyboardPanelSchema = z.object({
  id: z.number().optional(),
  clientId: z.string().optional(),
  flowId: z.number().optional(),
  duration: z.number(),
  prompt: z.string(),
  videoDesc: z.string().optional(),
  shouldGenerateImage: z.number().optional(),
  associateAssetsIds: z.array(z.number()).optional(),
  track: z.string().optional(),
  state: z.string().optional(),
  src: z.string().nullable().optional(),
  index: z.number().optional(),
});

export const scriptBundleSchema = z.object({
  bundleVersion: z.string().optional(),
  bundleType: z.literal("script"),
  rulePackVersion: z.string().optional(),
  meta: bundleMetaSchema,
  script: z.string().min(1),
  characters: z.array(z.string()).optional(),
  scenes: z.array(z.string()).optional(),
  continuity: z
    .object({
      prevEpisodeSummary: z.string().optional(),
      characterState: z.record(z.string(), z.string()).optional(),
      unresolvedHooks: z.array(z.string()).optional(),
      recapHint: z.string().optional(),
    })
    .optional(),
  anchors: z
    .object({
      visual: z.array(z.string()).optional(),
      emotionCarry: z.string().optional(),
    })
    .optional(),
  planData: z.record(z.string(), z.unknown()).optional(),
  designBrief: designBriefSchema,
  preDesignPack: preDesignPackSchema,
  ruleAudit: z.record(z.string(), z.unknown()).optional(),
  smartDetection: z.record(z.string(), z.unknown()).optional(),
  fixPlan: z.array(z.unknown()).optional(),
  linkageRepairPlan: z.array(z.unknown()).optional(),
  rePushPlan: z.array(z.unknown()).optional(),
  linkageAudit: z.record(z.string(), z.unknown()).optional(),
  forwardTrace: z.record(z.string(), z.unknown()).optional(),
  smartDesignProposals: z.array(z.record(z.string(), z.unknown())).optional(),
  supervisionReport: z.record(z.string(), z.unknown()).optional(),
  qualityDiagnostics: z.record(z.string(), z.unknown()).optional(),
  identityAudit: z.record(z.string(), z.unknown()).optional(),
  fxFeasibilityAudit: z.record(z.string(), z.unknown()).optional(),
  narrativeCausalityGraph: z.record(z.string(), z.unknown()).optional(),
  debutIntroPack: z.record(z.string(), z.unknown()).optional(),
  productionReasonableness: z.record(z.string(), z.unknown()).optional(),
  modalityPromptAudit: z.record(z.string(), z.unknown()).optional(),
  modalityAudit: z.record(z.string(), z.unknown()).optional(),
  assetPipeline: z.record(z.string(), z.unknown()).optional(),
  characterDesign: z.record(z.string(), z.unknown()).optional(),
  visualLockTable: z.record(z.string(), z.unknown()).optional(),
  flowData: z
    .object({
      scriptPlan: z.string().optional(),
      storyboardTable: z.string().optional(),
      storyboard: z.array(storyboardPanelSchema).optional(),
    })
    .optional(),
  _comment: z.string().optional(),
});

export const episodeBundleSchema = z.object({
  bundleVersion: z.string().optional(),
  rulePackVersion: z.string().optional(),
  meta: bundleMetaSchema,
  flowData: z.object({
    script: z.string(),
    scriptPlan: z.string().optional().default(""),
    storyboardTable: z.string().optional().default(""),
    assets: z.array(z.any()).optional().default([]),
    storyboard: z.array(storyboardPanelSchema).optional().default([]),
    workbench: z.object({ videoList: z.array(z.any()).optional() }).optional(),
  }),
  package: z.any().optional(),
  validationReport: z.any().nullable().optional(),
  _comment: z.string().optional(),
});

export const seriesBundleSchema = z.object({
  bundleVersion: z.string().optional(),
  meta: z.object({ projectId: z.number().optional(), seriesName: z.string().optional() }),
  project: z.any().optional(),
  episodes: z.array(episodeBundleSchema),
});

export function stripCommentFields<T extends Record<string, unknown>>(obj: T): T {
  const { _comment, ...rest } = obj;
  return rest as T;
}

export function detectBundleType(raw: unknown): "script" | "episode" | "series" | "legacy" {
  if (!raw || typeof raw !== "object") return "legacy";
  const o = raw as Record<string, unknown>;
  if (o.bundleType === "script") return "script";
  if (Array.isArray(o.episodes)) return "series";
  if (o.flowData && typeof o.flowData === "object") return "episode";
  if (o.script !== undefined && !o.bundleType) return "legacy";
  return "legacy";
}

export function normalizeLegacyFlowData(raw: Record<string, unknown>): { flowData: Record<string, unknown>; meta: Record<string, unknown> } {
  if (raw.flowData) {
    return { flowData: raw.flowData as Record<string, unknown>, meta: (raw.meta as Record<string, unknown>) ?? {} };
  }
  return {
    flowData: raw,
    meta: { episodeKey: raw.episodeKey, episodeName: raw.episodeName },
  };
}

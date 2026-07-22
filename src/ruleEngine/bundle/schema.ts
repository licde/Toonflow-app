import { z } from "zod";

/** Chat export may emit explicit `null` for omitted optional fields */
const nullishStr = () => z.string().nullish();
const nullishRecord = () => z.record(z.string(), z.unknown()).nullish();

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

const infoLinkageItemSchema = z
  .object({
    type: z.string().optional(),
    desc: z.string().optional(),
    payoffEp: z.number().optional(),
    payoffLabel: z.string().optional(),
  })
  .passthrough();

const assetHintsSchema = z
  .object({
    characters: z.array(z.string()).optional(),
    scenes: z.array(z.string()).optional(),
    props: z.array(z.string()).optional(),
  })
  .passthrough();

const rhythmZoneItemSchema = z
  .object({
    scene: z.string().optional(),
    zone: z.string().optional(),
    beats: z.number().optional(),
  })
  .passthrough();

const spatialAnchorItemSchema = z
  .object({
    scene: z.string().optional(),
    axis: z.string().optional(),
    anchors: z.array(z.string()).optional(),
  })
  .passthrough();

const toneLockSchema = z.union([
  z.string(),
  z
    .object({
      genre: z.string().optional(),
      ratio: z.record(z.string(), z.unknown()).optional(),
    })
    .passthrough(),
]);

const platformSpecSchema = z.union([
  z.string(),
  z
    .object({
      platform: z.string().optional(),
      duration: z.string().optional(),
      subtitleStyle: z.string().optional(),
    })
    .passthrough(),
]);

const audioMoodSchema = z.union([z.string(), z.record(z.string(), z.string())]);

const designBriefSchema = z
  .object({
    B1: z.string().optional(),
    B2: z.string().optional(),
    B3: toneLockSchema.optional(),
    B4: z.array(z.number()).optional(),
    B5: z.array(z.union([z.string(), infoLinkageItemSchema])).optional(),
    B6: z.union([assetHintsSchema, z.record(z.string(), z.string())]).optional(),
    B7: z.string().optional(),
    B8: z.string().optional(),
    B9: audioMoodSchema.optional(),
    B10: platformSpecSchema.optional(),
    B11: z.array(z.string()).optional(),
    B12: z.union([z.array(rhythmZoneItemSchema), z.record(z.string(), z.string())]).optional(),
    B13: z.array(z.union([z.string(), spatialAnchorItemSchema])).optional(),
    emotionCurveOutline: z.array(z.number()).optional(),
    rhythmOutline: z.record(z.string(), z.string()).optional(),
    infoLinkageChain: z.array(z.union([z.string(), infoLinkageItemSchema])).optional(),
    arcToneMap: z.record(z.string(), z.string()).optional(),
    visualLockHints: z.array(z.string()).optional(),
    paypointMarkers: z.array(z.object({ position: z.string(), type: z.string(), desc: z.string().optional() }).passthrough()).optional(),
    sceneTransitionPlan: z.array(z.object({ from: z.string(), to: z.string(), reason: z.string() }).passthrough()).optional(),
    emotionCurveType: z.string().optional(),
    B14: z.array(z.object({ position: z.string(), type: z.string(), desc: z.string().optional() }).passthrough()).optional(),
    B15: z.array(z.object({ clipHookId: z.string().optional(), hook: z.string().optional(), duration: z.string().optional() }).passthrough()).optional(),
    B16: z.record(z.string(), z.unknown()).optional(),
    B17: z.union([z.array(z.record(z.string(), z.unknown())), z.record(z.string(), z.unknown())]).optional(),
    B18: z.record(z.string(), z.unknown()).optional(),
    B19: z.record(z.string(), z.unknown()).optional(),
    B20: z.array(z.string()).optional(),
    B21: z.record(z.string(), z.unknown()).optional(),
    B22: z.record(z.string(), z.unknown()).optional(),
    B23: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .optional();

const shotDesignSchema = z
  .object({
    composition: nullishRecord(),
    blocking: z.array(z.record(z.string(), z.unknown())).nullish(),
    performance: nullishRecord(),
    cameraAnchor: nullishRecord(),
    lipSyncPolicy: nullishStr(),
  })
  .nullish();

const generationSchema = z.object({
  imagePrompt: nullishStr(),
  videoPrompt: nullishStr(),
  audioPrompt: nullishStr(),
  fxPrompt: nullishStr(),
});

const preDesignShotSchema = z
  .object({
    shotIndex: z.number().optional(),
    type: nullishStr(),
    sceneName: nullishStr(),
    duration: z.number().optional(),
    shotSize: nullishStr(),
    emotion: z.number().optional(),
    visualDescription: nullishStr(),
    visualEffect: nullishStr(),
    audioCue: nullishStr(),
    fxLevel: nullishStr(),
    charCodes: z.array(z.string()).optional(),
    /** VisBeat L0 tags — law for conflict_matrix; not inventable by suggestor alone */
    visualBeatTags: z.array(z.string()).optional(),
    suggestedVisualBeatTags: z.array(z.string()).optional(),
    weaponId: nullishStr(),
    generation: generationSchema.optional(),
    shotDesign: shotDesignSchema,
    retentionTier: nullishStr(),
    clip30sCandidate: z.boolean().optional(),
    rhythm31545: z.record(z.string(), z.unknown()).optional(),
    /** legacy top-level; normalize hoists into narrative.spatialRelation */
    spatialRelation: nullishStr(),
    narrative: z
      .object({
        dialogue: z
          .object({
            lines: z
              .array(
                z.object({
                  speaker: z.string().optional(),
                  text: z.string().optional(),
                  lineId: z.string().optional(),
                  functions: z.array(z.string()).optional(),
                  causedByActionId: z.string().optional(),
                  subtext: z.string().optional(),
                  /** Chat-confirmed split intent; must survive parse → hydrate → burn */
                  splitHint: z.string().optional(),
                  reactionAction: z.string().optional(),
                }),
              )
              .optional(),
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
      .passthrough()
      .optional(),
    markers: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough();

const preDesignPackSchema = z
  .object({
    scriptPlan: z.string(),
    shots: z.array(preDesignShotSchema).min(1),
    externalHashCheck: z.object({ match: z.boolean().optional(), hash: z.string().optional() }).optional(),
    preDesignQuality: z.object({ overall: z.string().optional(), supervision: z.string().optional() }).optional(),
    sceneCodeMap: z.record(z.string(), z.string()).optional(),
    episodeBeat: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
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
  planData: z
    .object({
      narrativeBrief: z
        .object({
          adaptationConstraints: z.array(z.record(z.string(), z.unknown())).optional(),
          deepAdaptation: z.record(z.string(), z.unknown()).optional(),
          storyKernel: z.string().optional(),
          mustResolveIssues: z.array(z.string()).optional(),
          reconstructionTrace: z.array(z.record(z.string(), z.unknown())).optional(),
          empathyPlan: z.record(z.string(), z.unknown()).optional(),
          densityBudget: z.record(z.string(), z.unknown()).optional(),
          retentionBeats: z.record(z.string(), z.unknown()).optional(),
          infoDeliveryPlan: z.array(z.record(z.string(), z.unknown())).optional(),
          dialogueRules: z.record(z.string(), z.unknown()).optional(),
          implementationPlan: z.array(z.record(z.string(), z.unknown())).optional(),
          seriesContinuity: z.record(z.string(), z.unknown()).optional(),
        })
        .passthrough()
        .optional(),
      sceneMeta: z
        .array(
          z
            .object({
              sceneRef: z.union([z.number(), z.string()]).optional(),
              opening5sHook: nullishStr(),
              avCausality: z.record(z.string(), z.unknown()).optional(),
              fxIntent: z.record(z.string(), z.unknown()).optional(),
              densityScore: z.record(z.string(), z.unknown()).optional(),
            })
            .passthrough(),
        )
        .optional(),
    })
    .passthrough()
    .optional(),
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
  videoAudioPolicy: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  narrativeCausalityGraph: z.record(z.string(), z.unknown()).optional(),
  debutIntroPack: z.record(z.string(), z.unknown()).optional(),
  productionReasonableness: z.record(z.string(), z.unknown()).optional(),
  modalityPromptAudit: z.record(z.string(), z.unknown()).optional(),
  modalityAudit: z.record(z.string(), z.unknown()).optional(),
  assetPipeline: z.record(z.string(), z.unknown()).optional(),
  characterDesign: z.record(z.string(), z.unknown()).optional(),
  visualLockTable: z.record(z.string(), z.unknown()).optional(),
  narrativeSelfcheck: z.record(z.string(), z.unknown()).optional(),
  flowData: z
    .object({
      scriptPlan: z.string().optional(),
      storyboardTable: z.string().optional(),
      storyboard: z.array(storyboardPanelSchema).optional(),
    })
    .passthrough()
    .optional(),
  _comment: z.string().optional(),
}).passthrough();

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

export { prepareBundleRaw, prepareBundleWithLog, parseBundleJson, tryFixPasteJson, stripChatRepairPrefix } from "./bundleShapePipeline";
export type { PrepareBundleResult, ShapeSalvageEntry } from "./bundleShapePipeline";
export { getRegisteredShapeIds, SHAPE_REGISTRY } from "./shapeRegistry";
export { auditShapeResidualGaps } from "./shapeResidualAudit";
export { normalizeDeepAdaptation, normalizeRenameMap, normalizeDeepAdaptationInBundle } from "./normalizeDeepAdaptation";

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

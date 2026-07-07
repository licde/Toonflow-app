import { z } from "zod";
import { normalizePackInput } from "./packNormalizer";

export const DRAMA_PACK_VERSION = "1.2";

const VisualLockItemSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  prompt: z.string().optional().default(""),
  desc: z.string().optional().default(""),
  lockFace: z.string().optional(),
  stages: z
    .array(
      z.object({
        name: z.string(),
        episodeRange: z.string().optional(),
        visualMark: z.string().optional(),
      }),
    )
    .optional(),
});

const PerformanceSchema = z
  .object({
    bodyWeight: z.string().optional(),
    shoulders: z.string().optional(),
    breath: z.string().optional(),
    gaze: z.string().optional(),
    hands: z.string().optional(),
    mouth: z.string().optional(),
    transition: z.string().optional(),
    microExpression: z
      .object({
        flush: z.string().optional(),
        eyes: z.string().optional(),
        pupil: z.string().optional(),
        mouthDetail: z.string().optional(),
      })
      .passthrough()
      .optional(),
    physiological: z
      .object({
        sweat: z.string().optional(),
        breathVisible: z.string().optional(),
        pallor: z.string().optional(),
        swallow: z.string().optional(),
        tremor: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .optional();

const StoryboardShotSchema = z
  .object({
    time: z.string().optional(),
    shotType: z.string().optional(),
    visualId: z.string().optional(),
    content: z.string().optional(),
    sound: z.string().optional().default(""),
    dialogue: z.string().optional().default(""),
    duration: z.number().positive(),
    assetCodes: z.array(z.string()).optional().default([]),
    imagePrompt: z.string().optional(),
    videoPrompt: z.string().optional(),
    track: z.string().optional(),
    type: z.enum(["PURE-SCENE", "PURE-PROP", "CHAR-SCENE", "CHAR-PROP"]).optional(),
    cameraAngle: z.string().optional(),
    characterFacing: z.string().optional(),
    positionInScene: z.string().optional(),
    transitionType: z.string().optional(),
    transitionDuration: z.string().optional(),
    emotionIntensity: z.number().int().min(1).max(5).optional(),
    colorTone: z.string().optional(),
    performance: PerformanceSchema,
    personalitySwitch: z
      .union([
        z
          .object({
            enabled: z.boolean().optional(),
            from: z.string().optional(),
            to: z.string().optional(),
            progress: z.string().optional(),
            visualMark: z.string().optional(),
          })
          .passthrough(),
        z.null(),
      ])
      .optional(),
  })
  .passthrough();

const ProductionSpecSchema = z
  .object({
    characterDesign: z.record(z.string(), z.unknown()).optional(),
    sceneDesign: z.record(z.string(), z.unknown()).optional(),
    propDesign: z.record(z.string(), z.unknown()).optional(),
    colorToneMapping: z.record(z.string(), z.unknown()).optional(),
    performanceBaseline: z.record(z.string(), z.string()).optional(),
    shotTypeRules: z.array(z.unknown()).optional(),
    constraints: z.record(z.string(), z.string()).optional(),
    imagePromptTemplates: z.record(z.string(), z.string()).optional(),
    soundDesign: z.record(z.string(), z.unknown()).optional(),
    dialogueActionSync: z.record(z.string(), z.unknown()).optional(),
    transitionRules: z.record(z.string(), z.unknown()).optional(),
    editingRules: z.record(z.string(), z.unknown()).optional(),
    continuityLock: z.record(z.string(), z.unknown()).optional(),
    costTiers: z.record(z.string(), z.unknown()).optional(),
    aiFailover: z.record(z.string(), z.string()).optional(),
  })
  .passthrough()
  .optional();

const EpisodeSchema = z
  .object({
    name: z.string().min(1),
    script: z.string().min(1),
    emotionBeats: z.string().optional().default(""),
    dialogueValidation: z.string().optional().default(""),
    directorNotes: z.union([z.string(), z.array(z.string())]).optional().default(""),
    rhythmReview: z.string().optional().default(""),
    sensoryReview: z.string().optional().default(""),
    storyboard: z.array(StoryboardShotSchema).optional().default([]),
    keyPrompts: z
      .array(
        z.object({
          scene: z.string(),
          imagePrompt: z.string().optional(),
          videoPrompt: z.string().optional(),
        }),
      )
      .optional()
      .default([]),
  })
  .passthrough();

const DramaPackCoreSchema = z.object({
  version: z.string().default(DRAMA_PACK_VERSION),
  meta: z
    .object({
      title: z.string().min(1),
      episodeCount: z.number().int().positive().optional(),
      tone: z.string().optional(),
      artStyleHint: z.string().optional(),
      packFormat: z.string().optional(),
      lastUpdated: z.string().optional(),
    })
    .passthrough(),
  plan: z.object({
    storySkeleton: z.string().optional().default(""),
    adaptationStrategy: z.string().optional().default(""),
    stylePosition: z.string().optional().default(""),
    adaptationMatrix: z.string().optional().default(""),
    characterBible: z.string().optional().default(""),
    dialogueStyleAnchor: z.string().optional().default(""),
    visualLock: z
      .object({
        characters: z.array(VisualLockItemSchema).optional().default([]),
        scenes: z.array(VisualLockItemSchema).optional().default([]),
        props: z.array(VisualLockItemSchema).optional().default([]),
        globalStyle: z
          .object({
            tone: z.string().optional(),
            texture: z.string().optional(),
            lighting: z.string().optional(),
          })
          .optional(),
      })
      .optional()
      .default({ characters: [], scenes: [], props: [] }),
  }),
  productionSpec: ProductionSpecSchema,
  episodes: z.array(EpisodeSchema).min(1),
}).passthrough();

export { DramaPackCoreSchema };
export const DramaPackSchema = z.preprocess((input) => normalizePackInput(input).normalized, DramaPackCoreSchema);

export type DramaPack = z.infer<typeof DramaPackCoreSchema>;
export type DramaPackEpisode = z.infer<typeof EpisodeSchema>;
export type DramaPackStoryboardShot = z.infer<typeof StoryboardShotSchema>;
export type VisualLockItem = z.infer<typeof VisualLockItemSchema>;

export type AssetType = "role" | "scene" | "tool";

export function lockCodeRemark(code: string): string {
  return `lockCode:${code}`;
}

export function parseLockCode(remark: string | null | undefined): string | null {
  if (!remark) return null;
  const m = remark.match(/^lockCode:(.+)$/);
  return m ? m[1] : null;
}

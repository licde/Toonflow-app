import { z } from "zod";

const dialogueSchema = z
  .object({
    type: z.string().optional(),
    text: z.string().optional(),
    speaker: z.string().nullable().optional(),
    emotion: z.string().optional(),
  })
  .passthrough();

const shotSchema = z
  .object({
    镜号: z.number(),
    time: z.string().optional(),
    shotType: z.string().optional(),
    sceneName: z.string().optional(),
    type: z.string().optional(),
    imagePrompt: z.string().optional(),
    videoPrompt: z.string().optional(),
    assetCodes: z.array(z.string()).optional(),
    dialogue: dialogueSchema.nullable().optional(),
  })
  .passthrough();

const episodeSchema = z.object({
  name: z.string(),
  script: z.string().optional(),
  storyboard: z.array(shotSchema).optional(),
});

export const structuredScriptSchema = z.object({
  version: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  productionSpec: z.record(z.string(), z.unknown()).optional(),
  characterAssets: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  episodes: z.array(episodeSchema).min(1),
});

export type ParsedStructuredScript = z.infer<typeof structuredScriptSchema>;

export function validateStructuredScript(data: unknown) {
  return structuredScriptSchema.safeParse(data);
}

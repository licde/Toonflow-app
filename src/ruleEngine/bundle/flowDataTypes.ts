import { z } from "zod";

/** Canvas flowData — shared by ruleEngine bundle layer and productionAgent (Lite-1 decouple). */
export const storyboardPanelSchema = z.object({
  id: z.number().optional(),
  duration: z.number().optional(),
  prompt: z.string().optional(),
  videoDesc: z.string().optional(),
  shouldGenerateImage: z.number().optional(),
  associateAssetsIds: z.array(z.number()).optional(),
  src: z.string().nullable().optional(),
  index: z.number().nullable().optional(),
});

export const flowDataSchema = z.object({
  script: z.string(),
  scriptPlan: z.string(),
  storyboardTable: z.string(),
  assets: z.array(z.record(z.string(), z.unknown())),
  storyboard: z.array(storyboardPanelSchema),
  workbench: z.object({ videoList: z.array(z.record(z.string(), z.unknown())).optional() }).optional(),
});

export type FlowData = z.infer<typeof flowDataSchema>;
export type EpisodeFlowData = FlowData;

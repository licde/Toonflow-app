import type { PipelineStage } from "./types";

export interface StageContract {
  stage: PipelineStage;
  inputs: string[];
  outputs: string[];
  gates: string[];
}

export const STAGE_CONTRACTS: StageContract[] = [
  { stage: "N-1", inputs: ["novel"], outputs: ["script"], gates: [] },
  { stage: "P0", inputs: ["novel", "script"], outputs: ["script", "scriptMeta"], gates: ["scriptMeta"] },
  { stage: "G", inputs: ["project"], outputs: ["projectBlueprint"], gates: ["tier0Blueprint"] },
  { stage: "BP", inputs: ["projectBlueprint", "script"], outputs: ["assets"], gates: ["anchorAssets"] },
  { stage: "GB", inputs: ["scriptPlan"], outputs: ["episodeBeat"], gates: ["emotionCurve"] },
  { stage: "SB", inputs: ["storyboardTable", "script"], outputs: ["episodePackage.shots"], gates: ["dialogueFidelity", "shotSchema"] },
  { stage: "EN", inputs: ["episodePackage"], outputs: ["compiled"], gates: ["h4Compile"] },
  { stage: "MD", inputs: ["compiled", "storyboard.filePath"], outputs: ["image", "video", "audio"], gates: ["modeAgnes", "preflight"] },
  { stage: "P2", inputs: ["videoTracks"], outputs: ["timeline", "export"], gates: ["h4Post"] },
];

export function getStageContract(stage: PipelineStage): StageContract | undefined {
  return STAGE_CONTRACTS.find((s) => s.stage === stage);
}

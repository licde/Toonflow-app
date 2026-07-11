import type { GenerationFeedbackPort, GenerationFeedbackInput } from "./index";
import { FEEDBACK_ROUTING } from "../validators/autoFix";

export const generationFeedbackPort: GenerationFeedbackPort = {
  async classifyFailure(input: GenerationFeedbackInput) {
    const patches: { fieldPath: string; rollbackLayer: string; suggestion: string }[] = [];
    if (/首位帧|first.?frame|reference/i.test(input.error)) {
      patches.push({ fieldPath: "storyboardId", rollbackLayer: "MD", suggestion: "生成首位帧分镜图" });
    }
    if (/prompt|提示词/i.test(input.error)) {
      patches.push({ fieldPath: "generation.compiled.video", rollbackLayer: "EN", suggestion: "重新 dry-run 编译" });
    }
    if (/台词|dialogue/i.test(input.error)) {
      patches.push({ fieldPath: "narrative.dialogue.lines", rollbackLayer: "SB", suggestion: "检查台词字数与保真" });
    }
    const ruleId = Object.entries(FEEDBACK_ROUTING).find(([, layer]) => patches[0]?.rollbackLayer === layer)?.[0];
    return { ruleId, upstreamPatches: patches };
  },
};

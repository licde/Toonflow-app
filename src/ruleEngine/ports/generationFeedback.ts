import type { GenerationFeedbackPort, GenerationFeedbackInput } from "./index";
import { FEEDBACK_ROUTING } from "../validators/autoFix";
import { getRepairPriorityOrder } from "../design/reverseRouteEngine";

/** 四模态修复优先级：VID/IMG → AUD → FX → SB（P0-P3） */
const REPAIR_PRIORITY: { pattern: RegExp; layer: string; suggestion: string; fieldPath: string; priority: number }[] = [
  { pattern: /首位帧|first.?frame|reference.?image|singleImage/i, layer: "MD", suggestion: "生成首位帧分镜图", fieldPath: "generation.referenceImage", priority: 0 },
  { pattern: /motion|运镜|camera.?roll|face.?morph/i, layer: "EN", suggestion: "运镜白名单重编译 EN-VID", fieldPath: "generation.compiled.video", priority: 0 },
  { pattern: /duration|时长|1.?30/i, layer: "SB", suggestion: "调整 SB duration 1-30s", fieldPath: "duration", priority: 0 },
  { pattern: /cref|--cref|CHAR-SCENE/i, layer: "EN", suggestion: "补 --cref 重编译 EN-IMG", fieldPath: "generation.compiled.image", priority: 0 },
  { pattern: /no people|PURE|negative/i, layer: "EN", suggestion: "PURE 词前置 EN-IMG", fieldPath: "generation.compiled.image", priority: 0 },
  { pattern: /native.?audio|generate_audio|dialogue-native|语音/i, layer: "EN", suggestion: "对齐 native 语音 EN-AUD", fieldPath: "generation.compiled.audio", priority: 1 },
  { pattern: /voiceProfile|voice|gender|female|male/i, layer: "BP", suggestion: "voiceProfile 对齐 BP L6", fieldPath: "voiceProfile", priority: 1 },
  { pattern: /台词|dialogue|lines/i, layer: "SB", suggestion: "检查台词字数与保真", fieldPath: "narrative.dialogue.lines", priority: 1 },
  { pattern: /特效|fx|F5|火焰|无法实现/i, layer: "SB", suggestion: "fxFeasibility 降级或拆镜", fieldPath: "visualEffect", priority: 1 },
  { pattern: /prompt|提示词/i, layer: "EN", suggestion: "重新 dry-run 编译", fieldPath: "generation.compiled", priority: 2 },
  { pattern: /人物|identity/i, layer: "EN", suggestion: "identityAudit 重编译 EN", fieldPath: "generation.compiled", priority: 2 },
];

function inferRuleId(error: string, layer: string): string | undefined {
  if (/首位帧|first.?frame|singleImage/i.test(error)) return "video_first_frame_missing";
  if (/motion|运镜/i.test(error)) return "motion_overflow";
  if (/cref/i.test(error)) return "img_cref_missing";
  if (/native.?audio|generate_audio/i.test(error)) return "native_audio_mismatch";
  if (/voice|gender/i.test(error)) return "aud_voice_mismatch";
  if (/fx|F5|特效/i.test(error)) return "fx_infeasible";
  if (/identity/i.test(error)) return "identity_mismatch";
  return Object.entries(FEEDBACK_ROUTING).find(([, l]) => l === layer)?.[0];
}

export const generationFeedbackPort: GenerationFeedbackPort = {
  async classifyFailure(input: GenerationFeedbackInput) {
    const patches: { fieldPath: string; rollbackLayer: string; suggestion: string; priority: number }[] = [];
    for (const rule of REPAIR_PRIORITY) {
      if (rule.pattern.test(input.error)) {
        patches.push({
          fieldPath: rule.fieldPath,
          rollbackLayer: rule.layer,
          suggestion: rule.suggestion,
          priority: rule.priority,
        });
      }
    }
    patches.sort((a, b) => {
      const order = getRepairPriorityOrder();
      const layerIdx = (layer: string) => {
        const hit = order.findIndex((o) => layer.toUpperCase().includes(o) || o.includes(layer.toUpperCase()));
        return hit < 0 ? 99 : hit;
      };
      return layerIdx(a.rollbackLayer) - layerIdx(b.rollbackLayer) || a.priority - b.priority;
    });
    const top = patches[0];
    const ruleId = top ? inferRuleId(input.error, top.rollbackLayer) : undefined;
    return {
      ruleId,
      upstreamPatches: patches.map(({ fieldPath, rollbackLayer, suggestion }) => ({
        fieldPath,
        rollbackLayer,
        suggestion,
      })),
    };
  },
};

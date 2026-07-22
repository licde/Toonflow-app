import type { GenerationFeedbackPort, GenerationFeedbackInput, GenerationFeedbackResult } from "./index";
import { FEEDBACK_ROUTING } from "../validators/autoFix";
import { getRepairPriorityOrder } from "../design/reverseRouteEngine";
import { applyContentPolicy, isContentPolicyError } from "../compilers/contentPolicyAdapter";
import { stripVendorTokens } from "../compilers/vendorPromptAdapter";

/** 四模态修复优先级：VID/IMG → AUD → FX → SB（P0-P3） */
const REPAIR_PRIORITY: { pattern: RegExp; layer: string; suggestion: string; fieldPath: string; priority: number; category?: string }[] = [
  { pattern: /is not a function|TypeError|Cannot read propert/i, layer: "INFRA", suggestion: "运行时异常（勿当台词保真）；检查分镜台词结构后重试", fieldPath: "generation.runtime", priority: 0, category: "runtime_type_error" },
  { pattern: /Client network socket disconnected before secure TLS|socket disconnected before secure TLS|network socket disconnected|TLS connection was established|ECONNRESET|ETIMEDOUT/i, layer: "INFRA", suggestion: "网络/TLS 中断，检查代理与上游连通（勿改提示词）", fieldPath: "generation.network", priority: 0, category: "tls_socket" },
  { pattern: /queue is full|rate.?limit|retry later|429|RPM|upstream.?busy/i, layer: "INFRA", suggestion: "上游繁忙，稍后重试（勿改提示词）", fieldPath: "generation.vendor", priority: 0, category: "vendor_passthrough" },
  { pattern: /DERIVE_PARENT_REF_MISSING|衍生图缺少父图/i, layer: "AS", suggestion: "先生成父资产图再衍生", fieldPath: "assets.parent.src", priority: 0, category: "derive_parent_ref_missing" },
  { pattern: /IMAGE_MODE_REF_MISMATCH|图像模式 .+ 需要/i, layer: "EN", suggestion: "按文生/单图/多参考调整参考图数量", fieldPath: "generation.references", priority: 0, category: "image_mode_ref_mismatch" },
  { pattern: /PROMPT_GEN_MEDIA_MISSING|PROMPT_GEN_CONTEXT_MISSING|缺少分镜或资产/i, layer: "AS", suggestion: "补全分镜/资产绑定后重生成提示词", fieldPath: "workbench.info", priority: 0, category: "prompt_gen_media_missing" },
  { pattern: /unable to generate|content.?policy|内容策略|moderation|safety/i, layer: "EN", suggestion: "敏感词降级后重试", fieldPath: "generation.compiled.image", priority: 0, category: "content_policy" },
  { pattern: /uploadReferenceAsset is not defined|AssetPort|公网 URL|ossURL|preflightPublicUrl|参考素材公网/i, layer: "EN", suggestion: "配置 ossURL（ngrok）并确认 AssetPort 已注入", fieldPath: "generation.referenceImage", priority: 0, category: "missing_reference_upload" },
  { pattern: /首位帧|first.?frame|reference.?image|singleImage/i, layer: "MD", suggestion: "生成首位帧分镜图", fieldPath: "generation.referenceImage", priority: 0, category: "missing_reference" },
  { pattern: /motion|运镜|camera.?roll|face.?morph/i, layer: "EN", suggestion: "运镜白名单重编译 EN-VID", fieldPath: "generation.compiled.video", priority: 0 },
  { pattern: /duration|时长|1.?30/i, layer: "SB", suggestion: "调整 SB duration 1-30s", fieldPath: "duration", priority: 0 },
  { pattern: /cref|--cref|CHAR-SCENE/i, layer: "EN", suggestion: "补 --cref 重编译 EN-IMG", fieldPath: "generation.compiled.image", priority: 0, category: "cref_missing" },
  { pattern: /no people|PURE|negative/i, layer: "EN", suggestion: "PURE 词前置 EN-IMG", fieldPath: "generation.compiled.image", priority: 0 },
  { pattern: /native.?audio|generate_audio|dialogue-native|语音/i, layer: "EN", suggestion: "对齐 native 语音 EN-AUD", fieldPath: "generation.compiled.audio", priority: 1 },
  { pattern: /voiceProfile|voice|gender|female|male/i, layer: "BP", suggestion: "voiceProfile 对齐 BP L6", fieldPath: "voiceProfile", priority: 1 },
  { pattern: /台词|dialogue_hash|缺台词/i, layer: "SB", suggestion: "检查台词字数与保真", fieldPath: "narrative.dialogue.lines", priority: 1 },
  { pattern: /特效|fx|F5|火焰|无法实现|infeasible/i, layer: "W3", suggestion: "高难 FX 回 W3 改描写或拆镜", fieldPath: "visualEffect", priority: 0, category: "fx_f5_unhandled" },
  { pattern: /identity|换脸|wrong.?character|人物不一致/i, layer: "CD", suggestion: "身份冲突回 CD/BP", fieldPath: "charCodes", priority: 0, category: "identity_mismatch" },
  { pattern: /prompt|提示词/i, layer: "EN", suggestion: "重新 dry-run 编译", fieldPath: "generation.compiled", priority: 2 },
  { pattern: /人物|identity/i, layer: "CD", suggestion: "identityAudit 回 CD/BP", fieldPath: "generation.compiled", priority: 2, category: "identity_mismatch" },
];

function inferRuleId(error: string, layer: string): string | undefined {
  if (/is not a function|TypeError|Cannot read propert/i.test(error)) return "runtime_type_error";
  if (/Client network socket disconnected before secure TLS|socket disconnected before secure TLS|TLS connection|ECONNRESET|ETIMEDOUT/i.test(error)) return "tls_socket";
  if (/queue is full|rate.?limit|retry later/i.test(error)) return "vendor_passthrough";
  if (/DERIVE_PARENT_REF_MISSING|衍生图缺少父图/i.test(error)) return "derive_parent_ref_missing";
  if (/IMAGE_MODE_REF_MISMATCH/i.test(error)) return "image_mode_ref_mismatch";
  if (/PROMPT_GEN_MEDIA_MISSING|PROMPT_GEN_CONTEXT_MISSING|缺少分镜或资产/i.test(error)) return "prompt_gen_media_missing";
  if (isContentPolicyError(error)) return "content_policy";
  if (/uploadReferenceAsset is not defined|ossURL|公网 URL|AssetPort|preflightPublicUrl/i.test(error)) return "missing_reference_upload";
  if (/首位帧|first.?frame|singleImage/i.test(error)) return "video_first_frame_missing";
  if (/motion|运镜/i.test(error)) return "motion_overflow";
  if (/cref/i.test(error)) return "img_cref_missing";
  if (/native.?audio|generate_audio/i.test(error)) return "native_audio_mismatch";
  if (/voice|gender/i.test(error)) return "aud_voice_mismatch";
  if (/fx|F5|特效|infeasible/i.test(error)) return "fx_f5_unhandled";
  if (/identity|换脸|wrong.?character/i.test(error)) return "identity_mismatch";
  if (/identity/i.test(error)) return "identity_mismatch";
  return Object.entries(FEEDBACK_ROUTING).find(([, l]) => l === layer)?.[0];
}

function buildSuggestedPrompt(input: GenerationFeedbackInput, category?: string): string | undefined {
  if (!input.prompt) return undefined;
  if (category === "vendor_passthrough" || category === "tls_socket") return undefined;
  if (category === "content_policy" || isContentPolicyError(input.error)) {
    const policy = applyContentPolicy(stripVendorTokens(input.prompt));
    return policy.replacements.length ? policy.softenedPrompt : undefined;
  }
  return undefined;
}

export const generationFeedbackPort: GenerationFeedbackPort = {
  async classifyFailure(input: GenerationFeedbackInput): Promise<GenerationFeedbackResult> {
    const patches: { fieldPath: string; rollbackLayer: string; suggestion: string; priority: number; category?: string }[] = [];
    for (const rule of REPAIR_PRIORITY) {
      if (rule.pattern.test(input.error)) {
        patches.push({
          fieldPath: rule.fieldPath,
          rollbackLayer: rule.layer,
          suggestion: rule.suggestion,
          priority: rule.priority,
          category: rule.category,
        });
      }
    }
    // Empty patches → INFRA (never silent EN via generation_feedback)
    if (!patches.length) {
      patches.push({
        fieldPath: "generation.unknown",
        rollbackLayer: "INFRA",
        suggestion: "未分类厂商/网络错误，勿改提示词，检查上游",
        priority: 0,
        category: "vendor_passthrough",
      });
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
    const ruleId = top ? inferRuleId(input.error, top.rollbackLayer) : "vendor_passthrough";
    const category = top?.category ?? ruleId;
    const suggestedPrompt = buildSuggestedPrompt(input, category);
    const contentPolicyWarnings =
      suggestedPrompt && input.prompt
        ? applyContentPolicy(stripVendorTokens(input.prompt)).warnings
        : undefined;

    return {
      ruleId,
      category,
      suggestedPrompt,
      contentPolicyWarnings,
      upstreamPatches: patches.map(({ fieldPath, rollbackLayer, suggestion }) => ({
        fieldPath,
        rollbackLayer,
        suggestion,
      })),
    };
  },
};

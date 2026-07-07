import type { PackFieldRule } from "../packFieldRegistry";
import { stripPromptTokens } from "../hintTranslator";

/** 仅处理 productionSpec.constraints 中的「禁止词」strip；must-include 由 imagePromptRulesRule 负责 */
export const constraintsRule: PackFieldRule = {
  id: "constraints",
  channel: "imagePrompt",
  priority: 50,
  specBlock: "constraints",
  apply(state, rctx) {
    const spec = rctx.ctx.pack.productionSpec ?? {};
    const constraints = spec.constraints as Record<string, string> | undefined;
    if (rctx.shot.type && constraints?.[rctx.shot.type]) {
      const text = constraints[rctx.shot.type];
      if (/必须包含/.test(text)) return;
      const forbidden = text
        .replace(/^禁止[:：]\s*/, "")
        .split(/[,，]/)
        .map((w) => w.trim())
        .filter(Boolean);
      for (const word of forbidden) {
        if (!word.trim()) continue;
        const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
        state.imagePrompt = state.imagePrompt.replace(re, "").replace(/\s+/g, " ").trim();
      }
    }
    if (rctx.mode === "merge") {
      state.imagePrompt = stripPromptTokens(state.imagePrompt);
    }
    state.imagePrompt = state.imagePrompt.replace(/\s+/g, " ").trim();
  },
};

import type { PackFieldRule } from "../packFieldRegistry";
import { getImagePromptRuleForType } from "../imagePromptRuleParser";

export const imagePromptRulesRule: PackFieldRule = {
  id: "imagePromptRules",
  channel: "imagePrompt",
  priority: 15,
  specBlock: "imagePromptRules",
  apply(state, rctx) {
    const spec = rctx.ctx.pack.productionSpec as Record<string, unknown> | undefined;
    const parsed = getImagePromptRuleForType(spec, rctx.shot.type);
    if (!parsed) return;

    for (const frag of parsed.mustInclude) {
      state.imagePrompt = state.mergeFragment(state.imagePrompt, frag);
    }

    for (const word of parsed.mustNot) {
      if (!word.trim()) continue;
      const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      state.imagePrompt = state.imagePrompt.replace(re, "").replace(/\s+/g, " ").trim();
    }
  },
};

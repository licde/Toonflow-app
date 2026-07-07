import type { PackFieldRule } from "../packFieldRegistry";

export const colorToneRule: PackFieldRule = {
  id: "colorToneMapping",
  channel: "imagePrompt",
  priority: 10,
  apply(state, rctx) {
    const entry = rctx.ctx.colorToneMap.get(rctx.shot.colorTone || "");
    if (!entry) return;
    const toneHint = [entry.tone, entry.colorTemp != null ? `${entry.colorTemp}K` : "", entry.saturation != null ? `saturation ${entry.saturation}%` : ""]
      .filter(Boolean)
      .join(", ");
    state.imagePrompt = state.mergeFragment(state.imagePrompt, toneHint);
  },
};

import type { PackFieldRule } from "../packFieldRegistry";

export const colorToneContrastRule: PackFieldRule = {
  id: "colorToneContrast",
  channel: "imagePrompt",
  priority: 12,
  specBlock: "colorToneMapping",
  apply(state, rctx) {
    const tone = rctx.shot.colorTone;
    if (!tone) return;
    const mapping = rctx.ctx.colorToneMap.get(tone) as { contrast?: number } | undefined;
    if (mapping?.contrast != null) {
      state.imagePrompt = state.mergeFragment(state.imagePrompt, `contrast ${mapping.contrast}`);
    }
  },
};

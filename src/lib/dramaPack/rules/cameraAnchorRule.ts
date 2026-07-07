import type { PackFieldRule } from "../packFieldRegistry";
import { translateCameraAnchor, translateVisualFocus } from "../hintTranslator";

export const cameraAnchorRule: PackFieldRule = {
  id: "cameraAnchor",
  channel: "imagePrompt",
  priority: 40,
  apply(state, rctx) {
    const angle = rctx.shot.cameraAngle;
    if (angle) {
      const entry = rctx.ctx.cameraAnchorMap.get(angle);
      const cacheKey = entry?.anchor || angle;
      let translated = rctx.ctx.anchorTranslationCache.get(cacheKey);
      if (!translated) {
        translated = translateCameraAnchor(entry);
        if (translated) rctx.ctx.anchorTranslationCache.set(cacheKey, translated);
      }
      if (translated) state.imagePrompt = state.mergeFragment(state.imagePrompt, translated);
    }

    const visualFocus = (rctx.shot as Record<string, unknown>).visualFocus as Record<string, string> | undefined;
    const vfHint = translateVisualFocus(visualFocus);
    if (vfHint) state.imagePrompt = state.mergeFragment(state.imagePrompt, vfHint);

    // A-情绪特写 boost close-up
    if (/A-情绪特写|情绪特写/.test(visualFocus?.["层级"] || "")) {
      state.imagePrompt = state.mergeFragment(state.imagePrompt, "close-up, emotional focus, shallow depth of field");
    }
  },
};

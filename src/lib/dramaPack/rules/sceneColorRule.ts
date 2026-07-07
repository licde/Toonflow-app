import type { PackFieldRule } from "../packFieldRegistry";

export const sceneColorRule: PackFieldRule = {
  id: "sceneColorLock",
  channel: "imagePrompt",
  priority: 20,
  apply(state, rctx) {
    const sceneCode = (rctx.shot.assetCodes ?? []).find((c) => c.startsWith("SCENE-"));
    if (!sceneCode) return;
    const sceneDesign = rctx.ctx.pack.productionSpec?.sceneDesign as Record<string, { baseTemp?: number | string }> | undefined;
    if (sceneDesign?.[sceneCode]?.baseTemp) {
      state.imagePrompt = state.mergeFragment(state.imagePrompt, `color temperature ${sceneDesign[sceneCode].baseTemp}K`);
    }
  },
};

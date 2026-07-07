import type { PackFieldRule } from "../packFieldRegistry";
import { isNightCeoShot } from "../personaPolicy";

export const sceneNightRule: PackFieldRule = {
  id: "sceneNightRouting",
  channel: "imagePrompt",
  priority: 18,
  specBlock: "sceneColorLock",
  apply(state, rctx) {
    const raw = rctx.shot as Record<string, unknown>;
    if (!isNightCeoShot(raw)) return;

    const locks = rctx.ctx.pack.productionSpec?.sceneColorLock as
      | Array<{ scene?: string; baseTemp?: number | string; tone?: string }>
      | undefined;
    const night = locks?.find((l) => l.scene === "SCENE-CEO-night");
    if (night?.baseTemp != null) {
      state.imagePrompt = state.mergeFragment(state.imagePrompt, `color temperature ${night.baseTemp}K`);
    }
    if (night?.tone) {
      state.imagePrompt = state.mergeFragment(state.imagePrompt, night.tone);
    }
  },
};

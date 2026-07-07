import type { PackFieldRule } from "../packFieldRegistry";

const SHOT_EN: Record<string, string> = {
  全景: "wide shot",
  远景: "long shot",
  中景: "medium shot",
  近景: "medium close-up",
  特写: "close-up",
  大特写: "extreme close-up",
};

export const shotTypeRecommendRule: PackFieldRule = {
  id: "shotTypeRecommend",
  channel: "imagePrompt",
  priority: 8,
  specBlock: "shotTypeRules",
  apply(state, rctx) {
    if (state.imagePrompt.trim().length > 40) return;
    const intensity = rctx.shot.emotionIntensity;
    if (intensity == null) return;
    const rules = rctx.ctx.pack.productionSpec?.shotTypeRules as
      | Array<{ intensity?: number; recommended?: string[] }>
      | undefined;
    const rule = rules?.find((r) => r.intensity === intensity);
    const rec = rule?.recommended?.[0];
    if (!rec) return;
    const en = SHOT_EN[rec] || rec;
    state.imagePrompt = state.mergeFragment(state.imagePrompt, en);
  },
};

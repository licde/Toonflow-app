import type { PackFieldRule } from "../packFieldRegistry";

export const postProductionRule: PackFieldRule = {
  id: "postProductionHints",
  channel: "postProduction",
  priority: 10,
  apply(state, rctx) {
    const spec = rctx.ctx.pack.productionSpec ?? {};
    const tone = rctx.shot.colorTone || "";
    const hints: Record<string, string> = {};

    const bgm = spec.bgmRules as Record<string, { style?: string; bpm?: string; volume?: string }> | undefined;
    if (tone && bgm?.[tone]?.style) {
      hints.bgmHint = [bgm[tone].style, bgm[tone].bpm ? `${bgm[tone].bpm}bpm` : ""].filter(Boolean).join(", ");
    } else if (tone) {
      for (const ep of rctx.ctx.pack.episodes) {
        const pl = (ep as Record<string, unknown>).productLayer as { bgm?: Record<string, string> } | undefined;
        if (pl?.bgm?.[tone]) {
          hints.bgmHint = pl.bgm[tone];
          break;
        }
      }
    }

    const subtitle = spec.subtitleRules as Record<string, { font?: string; color?: string; style?: string }> | undefined;
    const dialogue = rctx.shot.dialogue || "";
    if (/独白|OS|内心/.test(dialogue) && subtitle?.["独白"]) {
      hints.subtitleHint = `${subtitle["独白"].font ?? ""} ${subtitle["独白"].style ?? ""}`.trim();
    } else if (subtitle?.["对话"]) {
      hints.subtitleHint = `${subtitle["对话"].font ?? ""}`.trim();
    }

    const platform = spec.platformAdaption as Record<string, Record<string, string>> | undefined;
    if (platform?.["默认"]) {
      hints.platformHint = Object.entries(platform["默认"])
        .map(([k, v]) => `${k}:${v}`)
        .join("; ");
    }

    state.postProductionHints = hints;
  },
};

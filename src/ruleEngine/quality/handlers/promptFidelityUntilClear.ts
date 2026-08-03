/**
 * PROMPT_FIDELITY untilClear — L0 egress must cover VD mustAppear anchors.
 * Compare egress (promptUsed) vs VD — never VD self-compare.
 */
import {
  healPromptFidelityAnchors,
  missedAnchorTokens,
} from "../../design/healPromptFidelityAnchors";
import type { UntilClearFinding, UntilClearHealPatch, UntilClearHandlerCtx } from "../untilClearRuntime";

export const CLASS_ID = "PROMPT_FIDELITY";

export function detect(ctx: UntilClearHandlerCtx): UntilClearFinding[] {
  const vd = String(ctx.visualDescription ?? "");
  if (vd.trim().length < 4) return [];
  const missing = ctx.descCoverageMissing ?? [];
  if (missing.some((x) => /PROMPT-FIDELITY|mustAppear|锚点|必须出现/.test(x))) {
    return [
      {
        classId: CLASS_ID,
        layer: "L0_prompt",
        code: "PROMPT-FIDELITY",
        message: "提示词未覆盖设计锚点",
        debtKind: "coverage",
      },
    ];
  }
  const egress = String(
    (ctx as { promptUsed?: string }).promptUsed ??
      (ctx as { imagePrompt?: string }).imagePrompt ??
      "",
  ).trim();
  // No egress yet → skip (not a VD self-compare false pass)
  if (!egress || egress === vd) return [];
  const state = missedAnchorTokens({
    visualDescription: vd,
    imagePrompt: egress,
  });
  if (state.missed.length >= 2) {
    return [
      {
        classId: CLASS_ID,
        layer: "L0_prompt",
        code: "PROMPT-FIDELITY",
        message: `提示词未覆盖设计锚点（${state.missed.slice(0, 3).join("、")}）`,
        debtKind: "coverage",
      },
    ];
  }
  return [];
}

export function heal(ctx: UntilClearHandlerCtx): UntilClearHealPatch {
  const r = healPromptFidelityAnchors({
    visualDescription: ctx.visualDescription,
    visualBody: String(
      (ctx as { promptUsed?: string }).promptUsed ??
        (ctx as { imagePrompt?: string }).imagePrompt ??
        ctx.visualDescription ??
        "",
    ),
  });
  return {
    actuators: ["prompt_inject", "fidelity_edit", "regen_storyboard_hq"],
    injectLines: r.injected.length
      ? [`必须出现：${r.injected.join("、")}`]
      : r.plan.writes.map((w) => String(w.value)),
    primaryNextStep: "batch_still",
    ctaLabel: "增强锚点并生成",
  };
}

export function reassert(ctx: UntilClearHandlerCtx): boolean {
  return detect(ctx).length === 0;
}

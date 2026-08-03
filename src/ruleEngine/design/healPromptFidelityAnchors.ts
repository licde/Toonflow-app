/**
 * PROMPT-FIDELITY heal — dual-write VD + egress until anchor coverage meets need.
 * Contract debt diagnosis → repair-as-design; never HTTP-blocks generate/burn.
 */
import { extractDescPredicates } from "../compilers/extractDescPredicates";
import { buildRepairAsDesignPlan, type RepairAsDesignPlan } from "./shootableArchitecture";

/** Canonical token → accepted surface aliases (substring OK if any alias hits). */
export const ANCHOR_ALIAS: Record<string, string[]> = {
  端坐: ["端坐", "坐于", "坐在", "高坐", "稳坐"],
  太师椅: ["太师椅", "高位椅", "椅上"],
  跪: ["跪", "下跪", "跪于", "跪在"],
  蒲团: ["蒲团", "垫上"],
  抄书: ["抄书", "誊写", "书写"],
  摩挲: ["摩挲", "揉搓", "抚"],
  扳指: ["扳指", "玉扳指"],
  划过: ["划过", "掠过", "贴颊"],
  纸角: ["纸角", "休书", "信笺", "信纸", "纸"],
  捡: ["捡", "捡起", "拾起"],
};

export function expandAnchorAliases(token: string): string[] {
  const t = String(token ?? "").trim();
  if (!t) return [];
  const mapped = ANCHOR_ALIAS[t];
  if (mapped) return [...new Set([t, ...mapped])];
  return [t];
}

export function bodyCoversToken(body: string, token: string): boolean {
  const b = String(body ?? "");
  return expandAnchorAliases(token).some((a) => a.length >= 2 && b.includes(a));
}

export function missedAnchorTokens(input: {
  visualDescription?: string | null;
  knownNames?: string[];
  imagePrompt?: string | null;
  videoPrompt?: string | null;
}): { anchors: string[]; hits: string[]; missed: string[]; need: number } {
  const pack = extractDescPredicates({
    description: String(input.visualDescription ?? ""),
    characterNames: input.knownNames,
  });
  const anchors = (pack.mustAppear ?? []).filter((t) => t.length >= 2);
  const body = `${input.imagePrompt ?? ""}\n${input.videoPrompt ?? ""}`;
  const hits = anchors.filter((t) => bodyCoversToken(body, t));
  const missed = anchors.filter((t) => !bodyCoversToken(body, t));
  const need = Math.min(2, anchors.length);
  return { anchors, hits, missed, need };
}

export type HealFidelityResult = {
  ok: boolean;
  visualBody: string;
  visualDescription: string;
  injected: string[];
  sources: string[];
  plan: RepairAsDesignPlan;
  softDefer: boolean;
  debtKind?: "prompt_fidelity";
};

/**
 * Inject missing mustAppear tokens into egress (+ VD SSOT) until hit>=need.
 */
export function healPromptFidelityAnchors(input: {
  visualDescription?: string | null;
  visualBody?: string | null;
  knownNames?: string[];
  videoPrompt?: string | null;
}): HealFidelityResult {
  let vd = String(input.visualDescription ?? "").trim();
  let body = String(input.visualBody ?? "").trim();
  const sources: string[] = [];
  const injected: string[] = [];

  let state = missedAnchorTokens({
    visualDescription: vd || body,
    knownNames: input.knownNames,
    imagePrompt: body,
    videoPrompt: input.videoPrompt,
  });

  if (state.anchors.length === 0 || state.hits.length >= state.need) {
    return {
      ok: true,
      visualBody: body,
      visualDescription: vd,
      injected,
      sources,
      plan: buildRepairAsDesignPlan({ writes: [], blocksBurn: false }),
      softDefer: false,
    };
  }

  // Prefer injecting enough missed tokens to reach need
  const toInject = state.missed.slice(0, Math.max(0, state.need - state.hits.length));
  if (toInject.length) {
    const line = `必须出现：${toInject.join("、")}`;
    if (!body.includes(line) && !toInject.every((t) => bodyCoversToken(body, t))) {
      body = `${body}${body.endsWith("。") || !body ? "" : "。"}${line}`;
      sources.push("repair.fidelity.injectAnchors");
      injected.push(...toInject);
    }
    // Dual-write VD SSOT so next compose does not re-drop
    for (const t of toInject) {
      if (!bodyCoversToken(vd, t) && !vd.includes(t)) {
        vd = `${vd}${vd.endsWith("。") || !vd ? "" : "。"}${t}`;
        sources.push("repair.fidelity.writebackVd");
      }
    }
  }

  state = missedAnchorTokens({
    visualDescription: vd || body,
    knownNames: input.knownNames,
    imagePrompt: body,
    videoPrompt: input.videoPrompt,
  });

  const covered = state.hits.length >= state.need || state.anchors.length === 0;
  const plan = buildRepairAsDesignPlan({
    writes: injected.map((t) => ({
      slot: "visualDescription",
      value: t,
      reason: "prompt_fidelity_anchor",
    })),
    blocksBurn: !covered,
  });

  return {
    ok: covered,
    visualBody: body,
    visualDescription: vd,
    injected: [...new Set(injected)],
    sources: [...new Set(sources)],
    plan,
    softDefer: !covered,
    debtKind: covered ? undefined : "prompt_fidelity",
  };
}

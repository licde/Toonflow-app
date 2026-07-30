/**
 * Still literary body measure — strip design tails / tokens before counting.
 * SSOT paired with data/fixtures/still_prompt_pipeline.json
 */
import { readFixtureJson } from "../utils/fixturesPath";

export interface StillPromptPipelineConfig {
  version: string;
  minLiteraryChars: number;
  stripBeforeMeasure: string[];
  stageOrder: string[];
  imageDesignTail?: {
    allowFxOneLine?: boolean;
    exprGuard?: string;
    negativeAV?: string;
  };
  collapse?: {
    action?: string;
    maxRounds?: number;
  };
}

const FALLBACK: StillPromptPipelineConfig = {
  version: "1.0.0",
  minLiteraryChars: 24,
  stripBeforeMeasure: [
    "FX:",
    "QF-EXPR",
    "no subtitle",
    "no watermark",
    "no Logo",
    "identity[",
    "--cref",
    "--sref",
    "--ar",
    "keep face identity",
    "mediaSlots[",
  ],
  stageOrder: [
    "literaryBody",
    "hardConstraints",
    "identityBinding",
    "anchors",
    "recipe",
    "designTail",
    "identityTokens",
  ],
  imageDesignTail: {
    allowFxOneLine: true,
    exprGuard: "append_only_if_literary_ok",
    negativeAV: "append_only_if_literary_ok",
  },
  collapse: { action: "silent_restore_composed", maxRounds: 1 },
};

export function loadStillPromptPipelineConfig(): StillPromptPipelineConfig {
  return readFixtureJson<StillPromptPipelineConfig>("still_prompt_pipeline.json", FALLBACK);
}

/** Strip design tails / identity tokens for literary measure. */
export function stripStillDesignNoise(prompt: string, patterns?: string[]): string {
  const cfg = patterns ?? loadStillPromptPipelineConfig().stripBeforeMeasure;
  let t = String(prompt ?? "");
  // Remove --cref/--sref/--ar blocks
  t = t.replace(/(?:^|\s)--(?:cref|sref)\s+[^\n]*?(?=(?:\s--(?:cref|sref|ar)\b)|$)/gi, " ");
  t = t.replace(/(?:^|\s)--ar\s+\S+/gi, " ");
  t = t.replace(/identity\[[^\]]*]/gi, " ");
  t = t.replace(/mediaSlots\[[^\]]*]/gi, " ");
  for (const p of cfg) {
    if (!p) continue;
    if (p === "FX:") {
      t = t.replace(/FX\s*:[^,.\n]*/gi, " ");
      continue;
    }
    if (p === "QF-EXPR") {
      t = t.replace(/[^,.\n]*QF-EXPR[^,.\n]*/gi, " ");
      continue;
    }
    const re = new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    t = t.replace(re, " ");
  }
  // Drop leftover English boilerplate crumbs
  t = t.replace(/\b(?:keep face identity|no exaggerated expression rewrite|no subtitle|no watermark|no Logo)\b/gi, " ");
  return t.replace(/[,\s]{2,}/g, " ").trim();
}

export interface LiteraryBodyMeasure {
  ok: boolean;
  chars: number;
  literaryBody: string;
  collapsed: boolean;
  collapsedReason?: string;
  minLiteraryChars: number;
  pipelineVersion: string;
}

/**
 * Measure literary / shootable body after stripping design tails.
 */
export function measureLiteraryBody(prompt?: string | null): LiteraryBodyMeasure {
  const cfg = loadStillPromptPipelineConfig();
  const literaryBody = stripStillDesignNoise(String(prompt ?? ""));
  const chars = literaryBody.replace(/\s+/g, "").length;
  const ok = chars >= cfg.minLiteraryChars;
  let collapsedReason: string | undefined;
  if (!ok) {
    const raw = String(prompt ?? "").trim();
    if (!raw) collapsedReason = "empty_prompt";
    else if (/^FX\s*:/i.test(raw) || (/FX\s*:/i.test(raw) && chars < cfg.minLiteraryChars))
      collapsedReason = "fx_only_tail";
    else collapsedReason = "literary_too_thin";
  }
  return {
    ok,
    chars,
    literaryBody,
    collapsed: !ok,
    collapsedReason,
    minLiteraryChars: cfg.minLiteraryChars,
    pipelineVersion: cfg.version,
  };
}

/** Assert helper — returns ok + reason for gates. */
export function assertStillLiteraryBody(prompt?: string | null): {
  ok: boolean;
  reason?: string;
  measure: LiteraryBodyMeasure;
} {
  const measure = measureLiteraryBody(prompt);
  if (measure.ok) return { ok: true, measure };
  return {
    ok: false,
    reason: measure.collapsedReason ?? "literary_body_required",
    measure,
  };
}

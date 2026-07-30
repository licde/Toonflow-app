/**
 * Safe root-brace completion for truncated ScriptBundle JSON.
 * Only closes when depth>0 and truncation is NOT mid-string / mid-escape.
 * Mid-array/object truncation that still ends outside a string may get braces,
 * but incomplete arrays (missing ]) still fail JSON.parse → JSON_INCOMPLETE.
 */
import type { ShapeSalvageEntry } from "./shapeSalvageTypes";

export type BraceScan = {
  depth: number;
  inString: boolean;
  escape: boolean;
  /** Last non-whitespace char outside string */
  lastSignificant: string | null;
};

export function scanJsonBraceState(text: string): BraceScan {
  let depth = 0;
  let inString = false;
  let escape = false;
  let lastSignificant: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      lastSignificant = '"';
      continue;
    }
    if (/\s/.test(ch)) continue;
    lastSignificant = ch;
    if (ch === "{" || ch === "[") depth += 1;
    else if (ch === "}" || ch === "]") depth -= 1;
  }
  return { depth, inString, escape, lastSignificant };
}

export class JsonIncompleteError extends Error {
  readonly code = "JSON_INCOMPLETE";
  constructor(
    message: string,
    readonly detail?: { depth?: number; inString?: boolean; reason?: string },
  ) {
    super(message);
    this.name = "JsonIncompleteError";
  }
}

/**
 * If JSON.parse fails, try appending N closing `}` when scan shows depth N,
 * not in-string, and last significant is `}` or `]` (closed value) — i.e. root only missing.
 */
export function tryCompleteRootBraces(text: string): {
  text: string;
  salvaged: boolean;
  bracesAdded: number;
  entry?: ShapeSalvageEntry;
  reject?: JsonIncompleteError;
} {
  const trimmed = String(text ?? "").trimEnd();
  if (!trimmed) {
    return {
      text: trimmed,
      salvaged: false,
      bracesAdded: 0,
      reject: new JsonIncompleteError("空 JSON", { reason: "empty" }),
    };
  }

  try {
    JSON.parse(trimmed);
    return { text: trimmed, salvaged: false, bracesAdded: 0 };
  } catch {
    /* fall through */
  }

  const scan = scanJsonBraceState(trimmed);
  if (scan.inString || scan.escape) {
    return {
      text: trimmed,
      salvaged: false,
      bracesAdded: 0,
      reject: new JsonIncompleteError(
        "JSON 截断在字符串中部，禁止瞎补。请重出完整 Bundle（JSON_INCOMPLETE）。",
        { depth: scan.depth, inString: true, reason: "mid_string" },
      ),
    };
  }
  if (scan.depth <= 0) {
    return {
      text: trimmed,
      salvaged: false,
      bracesAdded: 0,
      reject: new JsonIncompleteError("JSON 无法解析（非缺根闭合）。请检查语法（JSON_INCOMPLETE）。", {
        depth: scan.depth,
        reason: "parse_fail",
      }),
    };
  }
  // Only safe when last closed value — missing root `}` after complete planData
  const last = scan.lastSignificant;
  if (last !== "}" && last !== "]") {
    return {
      text: trimmed,
      salvaged: false,
      bracesAdded: 0,
      reject: new JsonIncompleteError(
        "JSON 截断在对象/数组中部，禁止瞎补。请重出完整 preDesignPack（JSON_INCOMPLETE）。",
        { depth: scan.depth, reason: "mid_structure", inString: false },
      ),
    };
  }

  const n = Math.min(scan.depth, 8);
  const candidate = trimmed + "}".repeat(n);
  try {
    JSON.parse(candidate);
    return {
      text: candidate,
      salvaged: true,
      bracesAdded: n,
      entry: {
        ruleId: "SH-JSON-BRACE",
        path: "$",
        action: `append_${n}_root_braces`,
      },
    };
  } catch {
    return {
      text: trimmed,
      salvaged: false,
      bracesAdded: 0,
      reject: new JsonIncompleteError(
        "JSON 不完整且无法安全补闭合（JSON_INCOMPLETE）。勿当作「集无可用分镜」。",
        { depth: scan.depth, reason: "brace_still_fail" },
      ),
    };
  }
}

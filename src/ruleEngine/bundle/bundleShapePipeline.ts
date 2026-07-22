import { coerceShotStringFields } from "./coerceShotStringFields";
import { runShapeRegistry } from "./shapeRegistry";

import { ShapeSalvageLog, type PrepareBundleResult, type ShapeSalvageEntry } from "./shapeSalvageTypes";

export type { PrepareBundleResult, ShapeSalvageEntry };

const MAP_FIELDS = ["nameMap", "relationMap", "substitutions"] as const;
const SHOT_NUM_KEYS = new Set(["shotIndex", "duration", "emotion"]);

function stripCommentFields<T extends Record<string, unknown>>(obj: T): T {
  const { _comment, ...rest } = obj;
  return rest as T;
}

/**
 * C0: salvage known illegal arrow-pseudo-object members inside map fields.
 * e.g. `"nameMap": { "温如瓷→沈清瓷", "兰芝珩→萧玄珩" }` → array of {from,to}.
 */
export function tryFixPasteJson(text: string): string {
  let out = text;
  for (const field of MAP_FIELDS) {
    const re = new RegExp(`("${field}"\\s*:\\s*)\\{([^{}]*)\\}`, "g");
    out = out.replace(re, (full, prefix: string, body: string) => {
      if (/"[^"]+"\s*:/.test(body)) return full;
      const keys = [...body.matchAll(/"([^"\\]*)"/g)].map((m) => m[1]!);
      if (!keys.length) return full;
      if (!keys.some((k) => /→|->|⇒/.test(k))) return full;
      const pairs = keys
        .map((k) => {
          const parts = k.split(/\s*(?:→|->|⇒)\s*/).map((p) => p.trim()).filter(Boolean);
          if (parts.length < 2) return null;
          return `{"from":${JSON.stringify(parts[0])},"to":${JSON.stringify(parts.slice(1).join("→"))}}`;
        })
        .filter(Boolean);
      if (!pairs.length) return full;
      return `${prefix}[${pairs.join(",")}]`;
    });
  }
  // trailing commas before } or ]
  out = out.replace(/,\s*([}\]])/g, "$1");
  return out;
}

/** Parse bundle JSON text with optional repair-prefix strip + C0 tryFix on failure. */
export function stripChatRepairPrefix(text: string): string {
  const raw = String(text ?? "");
  const trimmed = raw.trimStart();
  const looksLikeRepair =
    trimmed.startsWith("【闭环修复清单") ||
    trimmed.startsWith("待处理规则") ||
    trimmed.includes("【BLOCK 明细】") ||
    trimmed.includes("SCHEMA_SHAPE_BLOCK");
  if (!looksLikeRepair) return raw;

  // Prefer object that declares bundleVersion / bundleType (skip inline {level,desc} in hints)
  const markers = ['"bundleVersion"', '"bundleType"', '"preDesignPack"', '"designBrief"'];
  let best = -1;
  for (const m of markers) {
    const idx = raw.indexOf(m);
    if (idx < 0) continue;
    // walk back to opening brace
    let i = idx;
    while (i > 0 && raw[i] !== "{") i--;
    if (raw[i] === "{" && (best < 0 || i < best)) best = i;
  }
  if (best >= 0) return raw.slice(best);

  const firstBrace = raw.indexOf("\n{");
  if (firstBrace >= 0) return raw.slice(firstBrace + 1);
  const brace = raw.indexOf("{");
  if (brace >= 0) return raw.slice(brace);
  return raw;
}

/** Parse bundle JSON text with optional C0 tryFix on failure. */
export function parseBundleJson(text: string): unknown {
  const stripped = stripChatRepairPrefix(text);
  try {
    return JSON.parse(stripped);
  } catch (first) {
    const fixed = tryFixPasteJson(stripped);
    try {
      return JSON.parse(fixed);
    } catch {
      throw first instanceof Error ? first : new Error(String(first));
    }
  }
}

function omitNullLeaves(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) {
    return value
      .map(omitNullLeaves)
      .filter((v) => v !== undefined);
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null) continue;
      const next = omitNullLeaves(v);
      if (next === undefined && v !== undefined && typeof v !== "object") continue;
      if (next === undefined && (v === null || v === undefined)) continue;
      out[k] = next;
    }
    return out;
  }
  return value;
}

function coerceShotNumbers(bundle: Record<string, unknown>): void {
  const pack = bundle.preDesignPack;
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) return;
  const shots = (pack as Record<string, unknown>).shots;
  if (!Array.isArray(shots)) return;
  for (const shot of shots) {
    if (!shot || typeof shot !== "object" || Array.isArray(shot)) continue;
    const s = shot as Record<string, unknown>;
    for (const key of SHOT_NUM_KEYS) {
      const v = s[key];
      if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) {
        s[key] = Number(v);
      }
    }
    const narrative = s.narrative;
    if (narrative && typeof narrative === "object" && !Array.isArray(narrative)) {
      const n = narrative as Record<string, unknown>;
      const ei = n.emotionIntensity;
      if (typeof ei === "string" && ei.trim() !== "" && Number.isFinite(Number(ei))) {
        n.emotionIntensity = Number(ei);
      }
    }
  }
}

/**
 * BundleShapePipeline entry (C0–C2 salvage):
 * string → tryFix+parse; strip _comment; omit null leaves; coerce shot nums; shape registry.
 */
export function prepareBundleWithLog(raw: unknown): PrepareBundleResult {
  const log = new ShapeSalvageLog();
  let obj: unknown = raw;
  if (typeof raw === "string") {
    obj = parseBundleJson(raw);
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error("ScriptBundle 根节点必须是 object");
  }
  const stripped = stripCommentFields(obj as Record<string, unknown>);
  const omitted = omitNullLeaves(stripped) as Record<string, unknown>;
  coerceShotNumbers(omitted);
  coerceShotStringFields(omitted, log);
  runShapeRegistry(omitted, log);
  return { bundle: omitted, shapeSalvageLog: log.entries };
}

/** @deprecated prefer prepareBundleWithLog when salvage log is needed */
export function prepareBundleRaw(raw: unknown): Record<string, unknown> {
  return prepareBundleWithLog(raw).bundle;
}

/**
 * Dialogue coverage SSOT — H3 / DC-01 / CHAT-DLG-01 share this model.
 * Rule: merge-across-shots OK; dropping an expected line is not.
 */
import { stableHash } from "../utils/hash";
import type { ScriptBundle } from "../bundle/types";

export type DialogueLineObject = {
  speaker?: string;
  text?: string;
  lineId?: string;
  type?: string;
  splitHint?: string;
  reactionAction?: string;
  functions?: string[];
  causedByActionId?: string;
  subtext?: string;
};

export type DialogueLineLike = DialogueLineObject | string;

export type DialoguePlanData = {
  dialoguePlan?: { lines?: { speaker?: string; text?: string; lineId?: string }[] };
};

/**
 * Normalize dual-shape dialogue.lines (string | structured[]) to objects.
 * Never assume Array — string lines caused "lines.find is not a function" (Untitled-1).
 */
export function asDialogueLineObjects(lines: unknown): DialogueLineObject[] {
  if (lines == null) return [];
  if (typeof lines === "string") {
    const t = lines.trim();
    if (!t) return [];
    return t.split(/\n+/).map((part) => {
      const m = part.match(/^([^：:]{1,20})[：:]\s*(.*)$/);
      if (m) return { speaker: m[1].trim(), text: (m[2] ?? "").trim() };
      return { text: part.trim() };
    }).filter((l) => Boolean(l.text));
  }
  if (!Array.isArray(lines)) return [];
  return lines.map((l) => {
    if (typeof l === "string") return { text: l };
    if (l && typeof l === "object") return l as DialogueLineObject;
    return { text: String(l ?? "") };
  });
}

export function normalizeDialogueKey(raw: string): string {
  return String(raw ?? "")
    .replace(/^["「『"'']+|["」』"'']+$/g, "")
    .replace(/\s+/g, "")
    .replace(/[。！？!?…~～]/g, "")
    .trim()
    .toLowerCase();
}

/** Duration / timing / punct-soup mistaken as dialogue (e.g. ：3s / ：：：：：：3s / 时长：3s). */
export function isNonLiteraryDialogueKey(raw: string): boolean {
  const k = normalizeDialogueKey(raw);
  if (!k) return true;
  // Pure punctuation / colon soup
  if (!/[\u4e00-\u9fffA-Za-z0-9]/.test(k) || /^[-:：\s._·•]+$/.test(k)) return true;
  // Repeated single char (:::: / ……)
  if (/^(.)\1{2,}$/.test(k)) return true;
  // Duration tokens — allow any leading colon/punct soup before number+s
  if (/^[:：\s.\-_·•]*\d+(\.\d+)?\s*s$/i.test(k)) return true;
  if (/^[:：\s.\-_·•]*\d+(\.\d+)?秒$/.test(k)) return true;
  if (/^时长/.test(k)) return true;
  if (/^\d+\s*[-–—~～]\s*\d+\s*s$/i.test(k)) return true;
  // Colon soup then digits then s/秒 (：：：：3s / ::::2.5s)
  if (/^[:：\s.\-_·•]{2,}\d/.test(k) && /(?:s|秒)$/i.test(k)) return true;
  // Digit-only duration without literary Han/Latin body
  if (/^\d+(\.\d+)?s$/i.test(k) || /^\d+(\.\d+)?秒$/.test(k)) return true;
  // Speaker-less colon + duration blob (：：3s embedded)
  if (!/[\u4e00-\u9fffA-Za-z]/.test(k) && /\d/.test(k) && /(?:s|秒)$/i.test(k)) return true;
  return false;
}

/** Drop duration-only / punct-soup dialogue rows (never invent literary lines). */
export function stripDurationOnlyDialogueLines(lines: unknown): DialogueLineObject[] {
  return asDialogueLineObjects(lines).filter((l) => {
    const text = String(l.text ?? "").trim();
    const blob = `${l.speaker ?? ""}${text}`;
    if (isNonLiteraryDialogueKey(text) || isNonLiteraryDialogueKey(blob)) return false;
    if (/^时长\s*[:：]/.test(text)) return false;
    if (/^[:：\s.\-_]*\d+(\.\d+)?\s*s$/i.test(text)) return false;
    // Keep real literary lines even if short; drop empty shells without lineId
    return Boolean(text) || Boolean(l.lineId);
  });
}

/**
 * Homology strip for import / exportGate / preflight / autoClose:
 * remove non-literary dialogue rows from every shot narrative.dialogue.lines.
 */
export function stripNonLiteraryDialogueFromShots(
  shots: Record<string, unknown>[],
): { shots: Record<string, unknown>[]; stripped: number } {
  let stripped = 0;
  const next = shots.map((s) => {
    const narr = { ...((s.narrative as object) ?? {}) } as {
      dialogue?: { lines?: unknown };
      lines?: string;
    };
    let changed = false;
    if (narr.dialogue != null && narr.dialogue.lines != null) {
      const before = asDialogueLineObjects(narr.dialogue.lines);
      const cleaned = stripDurationOnlyDialogueLines(narr.dialogue.lines);
      if (cleaned.length < before.length) {
        stripped += before.length - cleaned.length;
        narr.dialogue = { ...(typeof narr.dialogue === "object" ? narr.dialogue : {}), lines: cleaned };
        changed = true;
      }
    }
    if (typeof narr.lines === "string" && narr.lines.trim()) {
      const parts = narr.lines
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p && !isNonLiteraryDialogueKey(p));
      const joined = parts.join("\n");
      if (joined !== narr.lines.trim()) {
        stripped += 1;
        narr.lines = joined;
        changed = true;
      }
    }
    // Flat dialogueLines / dialogue string fields
    for (const key of ["dialogueLines", "dialogue"] as const) {
      const v = s[key];
      if (typeof v === "string" && v.trim() && isNonLiteraryDialogueKey(v)) {
        stripped += 1;
        return { ...s, [key]: "", narrative: changed ? narr : s.narrative };
      }
    }
    return changed ? { ...s, narrative: narr } : s;
  });
  return { shots: next, stripped };
}

/** Flatten structured or string dialogue into plain text (V10 / PR-09 / PR-10). */
export function flattenDialogueText(lines: unknown): string {
  if (lines == null) return "";
  if (typeof lines === "string") return lines;
  if (!Array.isArray(lines)) return String(lines);
  return lines
    .map((l) => (typeof l === "string" ? l : (l as { text?: string }).text ?? ""))
    .filter(Boolean)
    .join("");
}

/** Speaker-aware script dialogue texts (skip △ / 场 / 人物 / titles). */
export function collectScriptDialogueTexts(script: string): string[] {
  const out: string[] = [];
  for (const raw of script.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("△") || /^场\d/.test(line) || /^人物/.test(line)) continue;
    const m = line.match(/^([^：:]{1,20})[：:]\s*(.*)$/);
    if (!m) continue;
    const speaker = m[1].trim();
    if (!speaker || speaker.length > 8 || /EP\d|第\d集|传\s*EP/i.test(speaker)) continue;
    const text = normalizeDialogueKey(m[2] || line);
    if (text) out.push(text);
  }
  return out;
}

export function expandShotDialogueLines(shots: unknown[]): { keys: string[]; lineIds: string[] } {
  const keys: string[] = [];
  const lineIds: string[] = [];
  for (const s of shots) {
    const narr = (s as { narrative?: { dialogue?: { lines?: DialogueLineLike[] | string }; lines?: string } })
      ?.narrative;
    const lines = narr?.dialogue?.lines;
    if (typeof lines === "string" && lines.trim()) {
      for (const part of lines.split(/\n+/)) {
        const m = part.match(/^([^：:]{1,20})[：:]\s*(.*)$/);
        const text = normalizeDialogueKey(m?.[2] ?? part);
        if (text && !isNonLiteraryDialogueKey(text)) keys.push(text);
      }
      continue;
    }
    if (Array.isArray(lines)) {
      for (const l of lines) {
        if (typeof l === "string") {
          const text = normalizeDialogueKey(l);
          if (text && !isNonLiteraryDialogueKey(text)) keys.push(text);
          continue;
        }
        if (l?.lineId) lineIds.push(String(l.lineId));
        const text = normalizeDialogueKey(l?.text ?? "");
        if (text && !isNonLiteraryDialogueKey(text)) keys.push(text);
        else if (l?.speaker) {
          const blob = normalizeDialogueKey(`${l.speaker}${l.text ?? ""}`);
          if (blob && !isNonLiteraryDialogueKey(blob)) keys.push(blob);
        }
      }
      continue;
    }
    if (typeof narr?.lines === "string" && narr.lines.trim()) {
      for (const part of narr.lines.split(/\n+/)) {
        const m = part.match(/^([^：:]{1,20})[：:]\s*(.*)$/);
        const text = normalizeDialogueKey(m?.[2] ?? part);
        if (text && !isNonLiteraryDialogueKey(text)) keys.push(text);
      }
    }
  }
  return { keys, lineIds };
}

export function collectExpectedDialogue(input: {
  script?: string;
  planData?: DialoguePlanData | ScriptBundle["planData"];
}): { keys: string[]; lineIds: string[] } {
  const plan = input.planData as DialoguePlanData | undefined;
  const planLines = plan?.dialoguePlan?.lines;
  const scriptKeys = collectScriptDialogueTexts(input.script ?? "");
  if (planLines?.length) {
    const planKeys = planLines.map((l) => normalizeDialogueKey(l.text ?? "")).filter(Boolean);
    const lineIds = planLines.map((l) => String(l.lineId ?? "")).filter(Boolean);
    // True script∪plan: union keys (plan lineIds retained for id-mode coverage)
    const seen = new Set<string>();
    const keys: string[] = [];
    for (const k of [...planKeys, ...scriptKeys]) {
      if (!k || seen.has(k)) continue;
      // fuzzy dedupe
      if ([...seen].some((e) => e.includes(k) || k.includes(e))) continue;
      seen.add(k);
      keys.push(k);
    }
    return { keys, lineIds };
  }
  return { keys: scriptKeys, lineIds: [] };
}

export interface DialogueCoverageReport {
  ok: boolean;
  missingCount: number;
  missingKeys: string[];
  /** Shot lines not in script∪plan (intrusion). */
  extraCount: number;
  extraKeys: string[];
  expectedKeys: string[];
  actualKeys: string[];
  expectedHash: string;
  actualHash: string;
  /** Coverage OK but normalized sequence differs (order / punctuation). */
  orderMismatch: boolean;
}

function keyCovered(key: string, actualKeySet: Set<string>): boolean {
  if (actualKeySet.has(key)) return true;
  return [...actualKeySet].some((a) => a.includes(key) || key.includes(a));
}

export function dialogueCoverageReport(input: {
  script: string;
  shots: unknown[];
  planData?: DialoguePlanData | ScriptBundle["planData"];
  /** filtered: ok ignores full-plan missing; only extras on touched shots can fail ok */
  shotScope?: "full" | "filtered";
}): DialogueCoverageReport {
  const expected = collectExpectedDialogue(input);
  const actual = expandShotDialogueLines(input.shots);
  const expectedHash = stableHash(expected.keys.join("|"));
  const actualHash = stableHash(actual.keys.join("|"));
  const filtered = input.shotScope === "filtered";

  if (!expected.keys.length && !expected.lineIds.length) {
    return {
      ok: true,
      missingCount: 0,
      missingKeys: [],
      extraCount: 0,
      extraKeys: [],
      expectedKeys: expected.keys,
      actualKeys: actual.keys,
      expectedHash,
      actualHash,
      orderMismatch: false,
    };
  }

  const actualKeySet = new Set(actual.keys);
  const actualIdSet = new Set(actual.lineIds);
  const expectedKeySet = new Set(expected.keys.filter(Boolean));
  const missingKeys: string[] = [];
  const extraKeys: string[] = [];

  if (expected.lineIds.length && actualIdSet.size > 0) {
    for (let i = 0; i < expected.lineIds.length; i++) {
      const id = expected.lineIds[i];
      if (!actualIdSet.has(id)) {
        const miss = id || expected.keys[i] || "";
        if (miss) missingKeys.push(miss);
      }
    }
  } else {
    for (const key of expected.keys) {
      if (!key) continue;
      if (!keyCovered(key, actualKeySet)) missingKeys.push(key);
    }
  }

  // Extra / intrusion: shot keys not covered by expected (script∪plan)
  // Skip empty/placeholder noise (--- / : : / blank reaction)
  if (expectedKeySet.size > 0) {
    for (const key of actual.keys) {
      if (!key) continue;
      if (isNonLiteraryDialogueKey(key)) continue;
      if (!/[\u4e00-\u9fffA-Za-z0-9]/.test(key) || /^[-:：\s.]+$/.test(key)) continue;
      if (!keyCovered(key, expectedKeySet)) extraKeys.push(key);
    }
  }

  const missingCount = missingKeys.length;
  const extraCount = extraKeys.length;
  // Filtered touch: do not fail ok on full-episode missing
  const ok = filtered ? extraCount === 0 : missingCount === 0 && extraCount === 0;
  const orderMismatch =
    missingCount === 0 && extraCount === 0 && expected.keys.length > 0 && expectedHash !== actualHash;

  return {
    ok,
    missingCount,
    missingKeys,
    extraCount,
    extraKeys,
    expectedKeys: expected.keys,
    actualKeys: actual.keys,
    expectedHash,
    actualHash,
    orderMismatch,
  };
}

/** Human DC-01 message — never「缺 0 条」when failure is extras. */
export function formatDialogueCoverageMessage(
  report: Pick<DialogueCoverageReport, "ok" | "missingCount" | "missingKeys" | "extraCount" | "extraKeys">,
  opts?: { filtered?: boolean },
): string {
  if (report.ok && !opts?.filtered) return "R2 coverage OK";
  const missSample = report.missingKeys[0] ? String(report.missingKeys[0]).slice(0, 40) : "";
  const extraSample = (report.extraKeys ?? [])
    .find((k) => /[\u4e00-\u9fffA-Za-z0-9]/.test(String(k)))
    ?.toString()
    .slice(0, 40);
  const parts: string[] = [];

  if (opts?.filtered) {
    if (report.extraCount > 0) {
      parts.push(`局部触达乱入：多 ${report.extraCount} 条不在 script∪plan${extraSample ? `（如「${extraSample}」）` : ""}`);
    } else if (report.missingCount > 0) {
      parts.push(`局部触达未覆盖全集：缺 ${report.missingCount} 条${missSample ? `（如「${missSample}」）` : ""}— 不按全集 BLOCK`);
    } else {
      parts.push("局部触达台词覆盖 OK");
    }
    return `台词覆盖（局部触达未按全集 BLOCK）：${parts.join("；")}；shotScope=filtered`;
  }

  if (report.ok) return "R2 coverage OK";
  if (report.missingCount > 0) {
    parts.push(`台词覆盖不足：缺 ${report.missingCount} 条${missSample ? `（如「${missSample}」）` : ""}`);
  }
  if (report.extraCount > 0) {
    parts.push(`台词乱入：多 ${report.extraCount} 条不在 script∪plan${extraSample ? `（如「${extraSample}」）` : ""}`);
  }
  if (!parts.length) {
    parts.push("台词覆盖失败（哈希/顺序不一致）");
  }
  return parts.join("；");
}

/** DC-01 / linkage: true when coverage fails. */
export function dialogueLineCountMismatch(bundle: ScriptBundle): boolean {
  return !dialogueCoverageReport({
    script: bundle.script ?? "",
    shots: bundle.preDesignPack?.shots ?? [],
    planData: bundle.planData,
  }).ok;
}

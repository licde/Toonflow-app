import crypto from "crypto";
import { countDialogueChars } from "../dialogueMetrics";

export function stableHash(input: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex").slice(0, 16);
}

/**
 * @deprecated Prefer `collectScriptDialogueTexts` / `dialogueCoverageReport` from dialogueCoverage.
 * Speaker-aware stub so legacy callers no longer treat every prose line as dialogue.
 */
export function extractDialogueLines(text: string): string[] {
  const out: string[] = [];
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("△") || /^场\d/.test(line) || /^人物/.test(line)) continue;
    const m = line.match(/^([^：:]{1,20})[：:]\s*(.*)$/);
    if (!m) continue;
    const speaker = m[1].trim();
    if (!speaker || speaker.length > 8 || /EP\d|第\d集|传\s*EP/i.test(speaker)) continue;
    const body = (m[2] || "").trim();
    if (body) out.push(body);
  }
  return out;
}

/** @deprecated use dialogueMetrics.countDialogueChars (ellipsis ×3). */
export function dialogueCharCount(text: string): number {
  return countDialogueChars(text);
}

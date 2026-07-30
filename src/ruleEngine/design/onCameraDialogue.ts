/**
 * On-camera vs offscreen dialogue SSOT — lip / mouth / EXPR share this.
 * OS/VO/narration count as "has audio" elsewhere but NOT as on-camera lip.
 */
import { asDialogueLineObjects, isNonLiteraryDialogueKey, type DialogueLineObject } from "./dialogueCoverage";

const OFFSCREEN_TYPE =
  /^(os|vo|v\.?o\.?|narration|旁白|画外|画外音|内心独白|内心|offscreen|off[-_]?screen|voice[-_]?over)$/i;

export function isOffscreenLine(line: DialogueLineObject | string | null | undefined): boolean {
  if (line == null) return false;
  if (typeof line === "string") {
    return /（OS）|\(OS\)|画外|旁白|VO\b/i.test(line);
  }
  const t = String((line as { type?: string }).type ?? "").trim();
  if (t && OFFSCREEN_TYPE.test(t)) return true;
  const sp = String(line.speaker ?? "");
  if (/（OS）|\(OS\)|画外|旁白/i.test(sp)) return true;
  const text = String(line.text ?? "");
  if (/^【?(旁白|画外|OS|VO)】?/i.test(text)) return true;
  return false;
}

function isLiteraryOnCameraLine(line: DialogueLineObject): boolean {
  const text = String(line.text ?? "").trim();
  return Boolean(text) && !isOffscreenLine(line) && !isNonLiteraryDialogueKey(text);
}

/** True when at least one on-camera (lip-relevant) dialogue line exists. */
export function hasOnCameraDialogue(lines: unknown): boolean {
  const objs = asDialogueLineObjects(lines);
  return objs.some((l) => isLiteraryOnCameraLine(l));
}

/** Any spoken/written line including OS (for audio/duration). */
export function hasAnyDialogueLine(lines: unknown): boolean {
  return asDialogueLineObjects(lines).some((l) => String(l.text ?? "").trim());
}

export function onCameraDialogueTexts(lines: unknown): string[] {
  return asDialogueLineObjects(lines)
    .filter((l) => isLiteraryOnCameraLine(l))
    .map((l) => String(l.text).trim());
}

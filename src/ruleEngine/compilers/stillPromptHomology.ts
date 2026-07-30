/**
 * Preview / persist / vendor prompt homology — same strip + egress normalize.
 * Prevents lock-soup previous bodies and UI≠vendor drift.
 */
import { stripStaleBindingFromPrevious, previousBodyIsSheetLockSoup } from "./composeStillPrompt";
import { normalizeStillEgressPrompt, demoteSheetLockSoup } from "./stillEgressNormalize";

export function homologizeStillPromptForStore(prompt: string): {
  prompt: string;
  changed: boolean;
  notes: string[];
} {
  const notes: string[] = [];
  let next = String(prompt ?? "").trim();
  if (!next) return { prompt: next, changed: false, notes };

  // Always strip lock soup before store — literary body must lead
  const stripped = stripStaleBindingFromPrevious(next);
  if (stripped !== next) {
    notes.push("strip_stale_binding");
    next = stripped;
  }
  // Residual short sheet leads
  next = next
    .replace(/^角色参考若为四视图[^。]*[。．]?/g, "")
    .replace(/^严禁复刻多格[^。]*[。．]?/g, "")
    .replace(/^四视图仅借身份[^。]*[。．]?/g, "")
    .trim();

  if (previousBodyIsSheetLockSoup(next) || /严禁复刻多格|character sheet/i.test(next.slice(0, 80))) {
    const again = stripStaleBindingFromPrevious(next);
    if (again !== next) {
      notes.push("strip_stale_binding_2");
      next = again;
    }
  }

  const demoted = demoteSheetLockSoup(next);
  if (demoted.changed) {
    notes.push("demote_sheet_lock");
    next = demoted.prompt;
  }

  const norm = normalizeStillEgressPrompt(next);
  if (norm.changed) {
    notes.push(...norm.notes);
    next = norm.prompt;
  }

  // Never leave lock residue leading the body
  next = next.replace(/^[。；，\s]+/, "").replace(/^严禁复刻[^。]*[。]?/, "").trim();
  return { prompt: next, changed: notes.length > 0 || next !== String(prompt ?? "").trim(), notes };
}

/** Ingress: previous body must be literary-first before refine. */
export function homologizePreviousVisualBody(body: string | null | undefined): string {
  const raw = String(body ?? "").trim();
  if (!raw) return "";
  if (previousBodyIsSheetLockSoup(raw)) return "";
  return stripStaleBindingFromPrevious(raw);
}

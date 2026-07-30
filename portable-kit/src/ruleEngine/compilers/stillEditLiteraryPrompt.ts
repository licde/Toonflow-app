/**
 * Literary-only prompt for ImageEdit / first-gen parity — Content contract base.
 * Does NOT append 【Edit焦点】 — stillImageEdit.buildEditFocusPrompt is SSOT.
 */
import { buildLiteraryEgressBase, stripCollidingRecipeLayers } from "./stillLiteraryIntentSsot";

const CONTRACT_EN_RE =
  /vertical\s*9:16[\s\S]{0,200}?first frame|subtle on the locked character face[\s\S]{0,120}?|power blocking[\s\S]{0,80}?|high detail composition[\s\S]{0,80}?/gi;
const QF_EXPR_RE = /keep face identity[\s\S]{0,80}?QF-EXPR[^\n,]*/gi;
const NOISE_TAIL_RE = /,\s*--cref|,?\s*identity\[|no subtitle|no watermark|no Logo/gi;

/**
 * Build literary egress base for Edit / first-gen — full VD + hard constraints + binding.
 * Truncation prefers dropping recipe noise, never hard-constraint clauses.
 */
export function buildLiteraryEditPrompt(input: {
  fullPrompt?: string | null;
  description?: string | null;
  fixHints?: string[];
  characterNames?: string[] | null;
}): string {
  const vd = String(input.description ?? "").trim();
  const full = String(input.fullPrompt ?? "")
    .replace(CONTRACT_EN_RE, " ")
    .replace(QF_EXPR_RE, " ")
    .replace(NOISE_TAIL_RE, " ")
    .replace(/\n?【Edit焦点】[^\n]*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const { base, truncated } = buildLiteraryEgressBase({
    visualDescription: vd || undefined,
    fullPrompt: full || undefined,
    characterNames: input.characterNames,
    maxChars: 2200,
  });

  let body = base;
  if (!body && full) {
    body = stripCollidingRecipeLayers(full, { hasSeating: /端坐|蒲团|太师椅|权力反差/.test(full) }).cleaned.slice(
      0,
      1200,
    );
  }
  // Ensure fixHints' literary tokens already in base when possible (hints appended by Edit SSOT)
  void truncated;
  body = body.replace(/\n?【Edit焦点】[^\n]*/g, "").trim();
  try {
    const { preserveLiteraryCoreForEdit } =
      require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
    body = preserveLiteraryCoreForEdit({
      literaryPrompt: body,
      visualDescription: vd || undefined,
    });
  } catch {
    /* optional */
  }
  return body;
}

/** Alias for first-gen / compose parity callers */
export const buildLiteraryFirstGenBase = buildLiteraryEditPrompt;

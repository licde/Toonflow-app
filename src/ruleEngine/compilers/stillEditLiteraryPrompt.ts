/**
 * Literary-only prompt for ImageEdit — strip T2I contract English / QF-EXPR noise.
 * Does NOT append 【Edit焦点】 — stillImageEdit.buildEditFocusPrompt is SSOT.
 */
const CONTRACT_EN_RE =
  /vertical\s*9:16[\s\S]{0,200}?first frame|subtle on the locked character face[\s\S]{0,120}?|power blocking[\s\S]{0,80}?|high detail composition[\s\S]{0,80}?/gi;
const QF_EXPR_RE = /keep face identity[\s\S]{0,80}?QF-EXPR[^\n,]*/gi;
const NOISE_TAIL_RE = /,\s*--cref|,?\s*identity\[|no subtitle|no watermark|no Logo/gi;

export function buildLiteraryEditPrompt(input: {
  fullPrompt?: string | null;
  description?: string | null;
  fixHints?: string[];
}): string {
  let body = String(input.description ?? "").trim();
  const full = String(input.fullPrompt ?? "");
  if (!body && full) {
    body = full
      .replace(CONTRACT_EN_RE, " ")
      .replace(QF_EXPR_RE, " ")
      .replace(NOISE_TAIL_RE, " ")
      .replace(/\n?【Edit焦点】[^\n]*/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 900);
  } else if (full) {
    // Keep hard-constraint / binding Chinese slices from egress when present
    const hard = full.match(/场面硬约束[：:][^。]{0,200}/)?.[0];
    const bind = full.match(/站位绑定[：:][^。]{0,120}/)?.[0];
    if (hard && !body.includes("场面硬约束")) body = `${body} ${hard}`.trim();
    if (bind && !body.includes("站位绑定")) body = `${body} ${bind}`.trim();
  }
  // Strip any accidental focus lines — Edit SSOT adds one in buildEditFocusPrompt
  body = body.replace(/\n?【Edit焦点】[^\n]*/g, "").trim();
  return body;
}

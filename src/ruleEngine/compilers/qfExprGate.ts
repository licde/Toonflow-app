/**
 * QF-EXPR — strip face-rewrite phrases from video prompts (plan M1).
 */
const FACE_REWRITE_RE =
  /改脸|换脸|重塑五官|整容级|face\s*swap|change\s*(the\s*)?face|alter\s*facial|reshape\s*face|different\s*face/gi;

const MICRO_EXPR_HINT =
  "subtle micro-expression on the locked character face (do not alter facial identity); expression detail belongs in storyboard still";

export interface QfExprResult {
  hit: boolean;
  cleaned: string;
  stripped: string[];
  ruleId: "QF-EXPR-01";
}

export function detectAndStripQfExpr(prompt: string): QfExprResult {
  const stripped: string[] = [];
  let cleaned = String(prompt ?? "");
  cleaned = cleaned.replace(FACE_REWRITE_RE, (m) => {
    stripped.push(m);
    return "";
  });
  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();
  if (stripped.length && !/micro-expression|微表情/i.test(cleaned)) {
    cleaned = cleaned ? `${cleaned}. ${MICRO_EXPR_HINT}` : MICRO_EXPR_HINT;
  }
  return {
    hit: stripped.length > 0,
    cleaned,
    stripped,
    ruleId: "QF-EXPR-01",
  };
}

export function softPatchQfExpr(prompt: string): { prompt: string; patched: boolean; ruleId?: string } {
  const r = detectAndStripQfExpr(prompt);
  return { prompt: r.cleaned, patched: r.hit, ruleId: r.hit ? r.ruleId : undefined };
}

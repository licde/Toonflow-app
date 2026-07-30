/**
 * QF-EXPR — strip face-rewrite phrases from video prompts (plan M1).
 * Soft patch prefers Chinese micro-expression; never re-inject EN storyboard-still shell (B10).
 */
const FACE_REWRITE_RE =
  /改脸|换脸|重塑五官|整容级|face\s*swap|change\s*(the\s*)?face|alter\s*facial|reshape\s*face|different\s*face/gi;

/** EN QF / storyboard shells that must not burn as vendor body */
const EN_QF_SHELL_RE =
  /subtle\s*micro-expression\s*on\s*the\s*locked\s*character\s*face[^.。；;\n]*/gi;
const EN_STORYBOARD_STILL_RE =
  /expression\s*detail\s*belongs\s*in\s*storyboard\s*still[^.。；;\n]*/gi;

const MICRO_EXPR_HINT_ZH =
  "锁定脸型上的细微微表情（禁止改面容身份）；表情细节属分镜静帧";

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
  cleaned = cleaned.replace(EN_QF_SHELL_RE, (m) => {
    stripped.push(m);
    return "";
  });
  cleaned = cleaned.replace(EN_STORYBOARD_STILL_RE, (m) => {
    stripped.push(m);
    return "";
  });
  cleaned = cleaned.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();
  // Only inject ZH micro hint when face-rewrite was stripped and no micro-expression already present
  if (stripped.length && !/micro-expression|微表情/i.test(cleaned)) {
    cleaned = cleaned ? `${cleaned}。${MICRO_EXPR_HINT_ZH}` : MICRO_EXPR_HINT_ZH;
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

/** Strip EN QF shells without injecting any replacement (sanitize second pass). */
export function stripEnQfShells(prompt: string): { prompt: string; stripped: boolean } {
  let t = String(prompt ?? "");
  const before = t;
  t = t.replace(EN_QF_SHELL_RE, " ").replace(EN_STORYBOARD_STILL_RE, " ");
  t = t.replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").trim();
  return { prompt: t, stripped: t !== before.trim() };
}

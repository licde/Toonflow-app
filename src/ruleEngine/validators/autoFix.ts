import fs from "fs";
import path from "path";
import type { ValidationIssue } from "../types";

const AUTO_FIX: Record<string, (patch: Record<string, unknown>) => Record<string, unknown>> = {
  V3: (p) => ({ imageAppend: p.append ?? " --ar 1:1" }),
  "MODE-AGNES": (p) => ({ shouldGenerateImage: p.shouldGenerateImage ?? 1 }),
  V1: (p) => ({ type: p.type ?? "CHAR-SCENE" }),
  V2: (p) => ({ promptPrefix: p.prefix ?? "no people, no characters, " }),
  V10: (p) => ({ trimDialogue: p.trim ?? true }),
  H9: (p) => ({ append: p.append ?? " --ar 1:1" }),
  R2: (p) => ({ restoreDialogue: p.text ?? "" }),
  W12: (p) => ({ addHook: p.hook ?? "视觉+情感悬念" }),
  W13: (p) => ({ addClosingHook: p.hook ?? "未解问题" }),
  B1: (p) => ({ emotionCurve: p.curve ?? [] }),
  B2: (p) => ({ shotSize: p.shotSize ?? "CU" }),
  Y8: (p) => ({ genderTerms: p.terms ?? ["male", "man"] }),
  Y9: (p) => ({ emotionTag: p.emotion ?? 5 }),
  Y10: (p) => ({ cameraMove: p.move ?? "static" }),
  "QP-01": (p) => ({ addScene: p.scene ?? "补场" }),
  "QP-02": (p) => ({ visualDescription: p.desc ?? "具体画面描述" }),
  "PR-01": (p) => ({ splitShot: p.split ?? true }),
  "PR-04": (p) => ({ shotSize: p.shotSize ?? "CU" }),
  identity_mismatch: (p) => ({ recompileEN: true, genderTerms: p.terms }),
  fx_degrade: (p) => ({ feasibility: p.level ?? "F2", degradeHint: p.hint }),
  "AG-GATE-01": (p) => ({ referenceImage: p.url ?? "generate-storyboard-frame" }),
  "AG-GATE-02": (p) => ({ motion: p.motion ?? "slow pan" }),
  "AG-GATE-03": (p) => ({ duration: p.duration ?? 5 }),
  "AG-GATE-04": (p) => ({ stripNegative: true }),
  "QF-EXPR-01": (p) => ({ emotionWords: p.words ?? ["眉头紧蹙", "唇线绷紧"] }),
  "QF-EXPR-06": (p) => ({ removeFaceRewrite: true }),
  "SD-IMG-01": (p) => ({ cref: p.cref ?? "CHAR-CODE" }),
  "SD-IMG-02": (p) => ({ promptPrefix: p.prefix ?? "no people, no characters, " }),
  "SD-VID-01": (p) => ({ shouldGenerateImage: 1, referenceImage: p.url }),
  "SD-AUD-02": (p) => ({ voiceProfile: p.profile ?? "male" }),
  "SD-FX-02": (p) => ({ feasibility: "F2", degradeHint: p.hint ?? "拆镜或后期" }),
  "PR-CAM-01": (p) => ({ motion: p.motion ?? "slow pan" }),
  video_first_frame_missing: (p) => ({ referenceImage: p.url ?? "generate-storyboard-frame" }),
  motion_overflow: (p) => ({ motion: p.motion ?? "slow pan" }),
  native_audio_mismatch: (p) => ({ generate_audio: true, audioRoute: "dialogue-native" }),
  img_cref_missing: (p) => ({ cref: p.cref ?? "CHAR-CODE" }),
  aud_voice_mismatch: (p) => ({ voiceProfile: p.profile }),
};

export const FEEDBACK_ROUTING: Record<string, string> = {
  H2: "GB",
  H3: "SB",
  H4: "EN",
  H5: "EN",
  V1: "SB",
  V10: "SB",
  R2: "W3",
  "MODE-AGNES": "MD",
  identity_mismatch: "EN",
  fx_degrade: "SB",
  "PR-01": "SB",
  "QP-17": "SB",
  "QP-18": "EN",
  "AG-GATE-01": "MD",
  "AG-GATE-02": "EN",
  "AG-GATE-03": "SB",
  "AG-GATE-04": "MD",
  "QF-EXPR-01": "EN",
  "QF-EXPR-06": "EN",
  "SD-IMG-01": "EN",
  "SD-IMG-02": "EN",
  "SD-VID-01": "MD",
  "SD-AUD-02": "BP",
  "SD-FX-02": "SB",
  "PR-CAM-01": "EN",
  video_first_frame_missing: "MD",
  motion_overflow: "EN",
  native_audio_mismatch: "EN",
  img_cref_missing: "EN",
  aud_voice_mismatch: "BP",
};

let fixTemplatesCache: { ruleId: string; rePushTarget?: string }[] | null = null;

function loadFixTemplates(): { ruleId: string; rePushTarget?: string }[] {
  if (fixTemplatesCache) return fixTemplatesCache;
  const p = path.join(process.cwd(), "data", "skills", "_generated", "fix_templates.json");
  if (fs.existsSync(p)) {
    fixTemplatesCache = JSON.parse(fs.readFileSync(p, "utf-8"));
    for (const t of fixTemplatesCache ?? []) {
      if (t.rePushTarget) FEEDBACK_ROUTING[t.ruleId] = t.rePushTarget;
    }
    return fixTemplatesCache ?? [];
  }
  return [];
}

export function applyAutoFix(issues: ValidationIssue[]): { applied: string[]; patches: Record<string, unknown>[]; rePushTargets: string[] } {
  loadFixTemplates();
  const applied: string[] = [];
  const patches: Record<string, unknown>[] = [];
  const rePushTargets: string[] = [];
  for (const issue of issues) {
    if (!issue.autoFix || issue.autoFix.confidence < 0.8) continue;
    const fn = AUTO_FIX[issue.ruleId];
    if (fn) {
      patches.push({ shotId: issue.shotId, fieldPath: issue.fieldPath, ruleId: issue.ruleId, ...fn(issue.autoFix.patch) });
      applied.push(issue.ruleId);
      const target = FEEDBACK_ROUTING[issue.ruleId];
      if (target) rePushTargets.push(target);
    }
  }
  return { applied, patches, rePushTargets: [...new Set(rePushTargets)] };
}

export function routeFeedback(ruleOrTrigger: string): string {
  loadFixTemplates();
  return FEEDBACK_ROUTING[ruleOrTrigger] ?? "SB";
}

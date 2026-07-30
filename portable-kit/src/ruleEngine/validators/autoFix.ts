import fs from "fs";
import path from "path";
import type { ValidationIssue } from "../types";

export const AUTO_FIX: Record<string, (patch: Record<string, unknown>) => Record<string, unknown>> = {
  V3: (p) => ({ imageAppend: p.append ?? " --ar 1:1" }),
  "MODE-AGNES": (p) => ({ shouldGenerateImage: p.shouldGenerateImage ?? 1 }),
  V1: (p) => ({ type: p.type ?? "CHAR-SCENE" }),
  V2: (p) => ({ promptPrefix: p.prefix ?? "no people, no characters, " }),
  V10: (p) => ({ splitShot: p.split ?? true }),
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
  "QP-02": (p) => {
    // Forbid inventing stub shorter than QP-02 floor — only accept explicit desc
    const desc = String(p.desc ?? "").trim();
    if (desc.length >= 8) return { visualDescription: desc };
    return { visualDescription: undefined, refuseInvent: true, ruleId: "QP-02" };
  },
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
  "PR-09": (p) => ({ duration: p.duration ?? 5, lipPhrase: "speaking, lip-sync" }),
  "PR-10": (p) => ({ osMark: true }),
  "PR-11": (p) => ({ propState: p.propState ?? "inherit" }),
  "PR-12": (p) => ({ spatialRelation: p.spatial ?? "left-right blocking" }),
  "LANG-AUD-01": (p) => ({ audioPrompt: p.audio ?? "中文对白 VOICE" }),
  "FX-GRADE-01": (p) => ({ feasibility: "F2", degradeHint: p.hint ?? "降级或拆镜" }),
  "CAM-SPEAK": (p) => ({ motion: p.motion ?? "static hold" }),
  "CAM-VARIETY": (p) => ({ motion: p.motion ?? "subtle push" }),
  content_policy_rewrite: (p) => ({ rewriteLayer: p.layer ?? "SB" }),
  video_first_frame_missing: (p) => ({ referenceImage: p.url ?? "generate-storyboard-frame" }),
  motion_overflow: (p) => ({ motion: p.motion ?? "slow pan" }),
  native_audio_mismatch: (p) => ({ generate_audio: true, audioRoute: "dialogue-native" }),
  media_probe_mute: (p) => ({ generate_audio: true, audioRoute: "dialogue-native" }),
  orphan_stub_no_image: (p) => ({ shouldGenerateImage: 1, stripStub: true }),
  polish_failed: (p) => ({ rePolish: true }),
  img_cref_missing: (p) => ({ cref: p.cref ?? "CHAR-CODE", shouldGenerateImage: 1 }),
  aud_voice_mismatch: (p) => ({ voiceProfile: p.profile }),
};

export const FEEDBACK_ROUTING: Record<string, string> = {
  runtime_type_error: "INFRA",
  emotion_structure: "EN",
  dialogue_hash_mismatch: "SB",
  H2: "GB",
  H3: "SB",
  H4: "EN",
  H5: "EN",
  V1: "SB",
  V10: "SB",
  R2: "W3",
  "QP-01": "W3",
  "QP-02": "SB",
  "QP-03": "W3",
  "QP-04": "SB",
  "QP-05": "W3",
  "QP-06": "GB",
  "QP-07": "W1",
  "QP-08": "W2",
  "QP-09": "W3",
  "QP-10": "designBrief",
  "QP-11": "AS",
  "QP-12": "EN",
  "QP-13": "SB",
  "QP-14": "EN",
  "QP-15": "SB",
  "QP-16": "EN",
  "QP-19": "W3",
  "PR-09": "SB",
  "PR-14": "SB",
  "PR-15": "EN",
  tls_socket: "INFRA",
  "TLS-SOCKET": "INFRA",
  ECONNRESET: "INFRA",
  "QP-20": "W3",
  "MODE-AGNES": "MD",
  identity_mismatch: "CD",
  wrong_character_ref: "CD",
  fx_degrade: "SB",
  "PR-01": "SB",
  "PR-10": "SB",
  "PR-11": "BP",
  "PR-12": "SB",
  "PR-16": "W3",
  "MOD-01": "W3",
  "MOD-02": "W3",
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
  "SD-FX-02": "W3",
  "PR-CAM-01": "EN",
  video_first_frame_missing: "MD",
  still_firstframe_dirty: "MD",
  still_firstframe_weak: "MD",
  still_firstframe_stale: "MD",
  dirty_still_prompt: "MD",
  motion_overflow: "EN",
  native_audio_mismatch: "EN",
  img_cref_missing: "EN",
  cref_missing: "EN",
  cref_unbound: "AS",
  aud_voice_mismatch: "BP",
  mode_rules_mismatch: "MD",
  prompt_gen_media_missing: "AS",
  derive_parent_ref_missing: "AS",
  derive_prompt_empty: "AS",
  image_mode_ref_mismatch: "EN",
  vendor_passthrough: "INFRA",
  missing_reference_upload: "INFRA",
  fx_infeasible: "W3",
  fx_f5_unhandled: "W3",
  packaging_debut_missing: "W3",
  content_policy: "EN",
  content_policy_rewrite: "SB",
  lang_aud_mismatch: "EN",
  "LANG-AUD-01": "EN",
  fx_empty: "SB",
  "FX-GRADE-01": "SB",
  cam_speak: "EN",
  "CAM-SPEAK": "EN",
  cam_variety: "SB",
  "CAM-VARIETY": "SB",
  oss_ref_missing: "INFRA",
  audio_force_mismatch: "MD",
  scene_break: "SB",
  modality_fx_missing: "W3",
  modality_aud_missing: "MD",
  duration_clamp: "SB",
  emotion_composition: "GB",
  story_link_broken: "W3",
  narrative_graph_broken: "W3",
  pr_lip_duration: "SB",
  pr_os_voice: "SB",
  pr_prop_state: "BP",
  pr_spatial: "SB",
  pr_expr_feasibility: "SB",
  pr_vendor_fx: "EN",
  img_pure_negative: "EN",
  modality_slot_missing: "MD",
  retention_opening_missing: "W3",
  narrative_info_gap: "W3",
  narrative_dialogue_function: "W3",
  packaging_end_preview: "W3",
  generation_design_drift: "SB",
  adaptation_deep_empty: "P03",
  design_spec_upstream: "GB",
  viral_clip_shortfall: "W1",
  narrative_split_hint: "W3",
  shot_camera_invalid: "EN",
  generation_feedback: "EN",
  debut_missing: "W3",
};

interface FixTemplateEntry {
  ruleId: string;
  rePushTarget?: string;
  patchKeys?: string[];
  description?: string;
  patchTemplate?: { action?: string; hint?: string };
}

let fixTemplatesCache: FixTemplateEntry[] | null = null;
let reverseRoutingHydrated = false;

/** Hydrate FEEDBACK_ROUTING dual-keys from reverse_route_table (SSOT). */
function hydrateFeedbackFromReverseTable(): void {
  if (reverseRoutingHydrated) return;
  reverseRoutingHydrated = true;
  try {
    const p = path.join(process.cwd(), "data", "fixtures", "reverse_route_table.json");
    if (!fs.existsSync(p)) return;
    const table = JSON.parse(fs.readFileSync(p, "utf-8")) as {
      routes?: { trigger?: string; reverseTarget?: string; ruleIds?: string[] }[];
    };
    for (const r of table.routes ?? []) {
      if (!r.reverseTarget) continue;
      if (r.trigger) FEEDBACK_ROUTING[r.trigger] = r.reverseTarget;
      for (const id of r.ruleIds ?? []) FEEDBACK_ROUTING[id] = r.reverseTarget;
    }
  } catch {
    /* ignore */
  }
}

function loadFixTemplates(): FixTemplateEntry[] {
  hydrateFeedbackFromReverseTable();
  if (fixTemplatesCache) return fixTemplatesCache;
  const p = path.join(process.cwd(), "data", "skills", "_generated", "fix_templates.json");
  if (fs.existsSync(p)) {
    fixTemplatesCache = JSON.parse(fs.readFileSync(p, "utf-8"));
    for (const t of fixTemplatesCache ?? []) {
      if (t.rePushTarget) FEEDBACK_ROUTING[t.ruleId] = t.rePushTarget;
      if (AUTO_FIX[t.ruleId]) continue;
      if (t.patchKeys?.length) {
        AUTO_FIX[t.ruleId] = (patch) => {
          const out: Record<string, unknown> = {};
          for (const k of t.patchKeys ?? []) out[k] = patch[k];
          return out;
        };
      } else {
        AUTO_FIX[t.ruleId] = (patch) => ({
          action: t.patchTemplate?.action ?? "revise",
          hint: patch.hint ?? t.patchTemplate?.hint ?? t.description ?? "revise",
        });
      }
    }
    return fixTemplatesCache ?? [];
  }
  return [];
}

export function getLoadedFixTemplateCount(): number {
  return loadFixTemplates().length;
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
  hydrateFeedbackFromReverseTable();
  loadFixTemplates();
  const keyed = FEEDBACK_ROUTING[ruleOrTrigger];
  if (keyed) return keyed;
  // Ban silent-SB: unmatched → DepthPolicy (INFRA / deep target), never default SB
  // Lazy require avoids circular init with reverseKernel ↔ autoFix
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { resolveReverseTargetDeep } = require("../kernels/reverseKernel") as typeof import("../kernels/reverseKernel");
  return resolveReverseTargetDeep(ruleOrTrigger);
}

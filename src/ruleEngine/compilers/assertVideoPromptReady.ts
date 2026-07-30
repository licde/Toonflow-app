/**
 * assertVideoPromptReady — stub + thin-shell gate (persist ≡ burn).
 * VP-THIN-SHELL → reverse trigger video_prompt_stub.
 */
import { isVideoPromptStub, SILENT_AUDIO_RE } from "./sanitizeVideoPrompt";
import type { ShotCompileContext } from "./hydrateShotCompileContext";

export type VideoPromptReadyResult = {
  ok: boolean;
  code?: "VP-XML-ASK-STUB" | "VP-THIN-SHELL" | "VP-CROSS-SHOT-SIDECAR" | "VP-MOTION-TEMPLATE" | "VP-CAMERA-DURATION-DUP" | "VP-SECTION-GLUE";
  reasons: string[];
  reverseTrigger?: "video_prompt_stub";
};

const LOCK_FACE_SHELL =
  /锁定脸型身份|禁止夸张(?:改脸)?|无字幕无水印无Logo|表情细节属分镜静帧|设计连贯/g;

/** Visual body after stripping identity/lock shells — need literary CJK. */
export function visualLiteraryBody(prompt: string): string {
  const visual = prompt.match(/\[Visual\]([\s\S]*?)(?=\[Motion\]|$)/i)?.[1] ?? prompt;
  return visual
    .replace(LOCK_FACE_SHELL, " ")
    .replace(/请提供[^。；;\n]{0,120}/g, " ")
    .replace(/[,.，。；;\s]+/g, " ")
    .trim();
}

export function isVideoPromptThinShell(
  prompt?: string | null,
  ctx?: Pick<ShotCompileContext, "dialogueLines" | "durationSec" | "gaps"> | null,
): boolean {
  const t = String(prompt ?? "").trim();
  if (!t) return true;
  if (isVideoPromptStub(t)) return true;

  const lit = visualLiteraryBody(t);
  const cjk = (lit.match(/[\u4e00-\u9fff]/g) ?? []).length;
  if (/\[Visual\]/i.test(t) && cjk < 8) return true;

  const motion = t.match(/\[Motion\]([\s\S]*?)(?=\[Camera\]|$)/i)?.[1] ?? "";
  const motionBody = motion.replace(/motion-from-frame[^\n,]*/gi, " ").replace(/[,.\s]+/g, " ").trim();
  if (/\[Motion\]/i.test(t) && /motion-from-frame/i.test(motion) && motionBody.length < 4) return true;

  const audio = t.match(/\[Audio\]([\s\S]*?)(?=\[Narrative\]|$)/i)?.[1] ?? "";
  const hasDial = (ctx?.dialogueLines?.length ?? 0) > 0;
  if (hasDial && (SILENT_AUDIO_RE.test(audio) || /无对白/.test(audio))) return true;

  if (ctx?.durationSec && ctx.durationSec > 0) {
    const cam = t.match(/\[Camera\]([\s\S]*?)(?=\[Audio\]|$)/i)?.[1] ?? "";
    const m = cam.match(/(?:时长|duration)\s*(\d+)\s*s/i);
    if (m) {
      const shown = Number(m[1]);
      // Only flag silent-default vs content (e.g. 5s shell vs lip 16s) — NOT vendor snap 21→30
      if (Number.isFinite(shown) && shown > 0 && shown <= 5 && ctx.durationSec >= 12) return true;
    }
  }

  return false;
}

export function assertVideoPromptReady(
  prompt?: string | null,
  ctx?: ShotCompileContext | null,
): VideoPromptReadyResult {
  const t = String(prompt ?? "").trim();
  const reasons: string[] = [];

  if (!t) {
    return {
      ok: false,
      code: "VP-THIN-SHELL",
      reasons: ["empty_prompt"],
      reverseTrigger: "video_prompt_stub",
    };
  }

  if (isVideoPromptStub(t)) {
    if (/请提供/.test(t)) reasons.push("xml_ask_stub");
    if (/时长\s*Ns|duration\s*Ns/i.test(t)) reasons.push("duration_Ns");
    if (/\[Motion\]\s*\n?-:\s*/i.test(t)) reasons.push("motion_dash");
    return {
      ok: false,
      code: /请提供/.test(t) ? "VP-XML-ASK-STUB" : "VP-THIN-SHELL",
      reasons: reasons.length ? reasons : ["stub"],
      reverseTrigger: "video_prompt_stub",
    };
  }

  if (isVideoPromptThinShell(t, ctx ?? null)) {
    const lit = visualLiteraryBody(t);
    if ((lit.match(/[\u4e00-\u9fff]/g) ?? []).length < 8) reasons.push("empty_visual");
    if (/\[Motion\][\s\S]*?motion-from-frame/i.test(t)) reasons.push("bare_motion_from_frame");
    if ((ctx?.dialogueLines?.length ?? 0) > 0 && /无对白/.test(t)) reasons.push("silent_despite_dialogue");
    if (ctx?.gaps?.missingVisualDescription) reasons.push("gap_vd");
    return {
      ok: false,
      code: "VP-THIN-SHELL",
      reasons: reasons.length ? reasons : ["thin_shell"],
      reverseTrigger: "video_prompt_stub",
    };
  }

  const motion = t.match(/\[Motion\]([\s\S]*?)(?=\[Camera\]|$)/i)?.[1] ?? "";
  if (/\[Motion\]/i.test(t) && (/\n\s*-:\s/.test(motion) || /^-:\s/.test(motion.trim()) || /0s-Ns/i.test(motion))) {
    return {
      ok: false,
      code: "VP-MOTION-TEMPLATE",
      reasons: ["motion_template_dash"],
      reverseTrigger: "video_prompt_stub",
    };
  }

  const cam = t.match(/\[Camera\]([\s\S]*?)(?=\[Audio\]|$)/i)?.[1] ?? "";
  const durHits = [...cam.matchAll(/(?:时长|duration)\s*\d+(?:\.\d+)?\s*s/gi)];
  if (durHits.length > 1) {
    return {
      ok: false,
      code: "VP-CAMERA-DURATION-DUP",
      reasons: ["camera_duration_dup"],
      reverseTrigger: "video_prompt_stub",
    };
  }

  if (/[^\n][ \t]*\[(?:Motion|Camera|Audio|Narrative)\]/i.test(t)) {
    return {
      ok: false,
      code: "VP-SECTION-GLUE",
      reasons: ["section_headers_glued"],
      reverseTrigger: "video_prompt_stub",
    };
  }

  if (/PEAK-sc\d+/i.test(t) && ctx?.shotIndex != null) {
    const peaks = t.match(/PEAK-sc(\d+)/gi) ?? [];
    for (const p of peaks) {
      const n = Number(p.replace(/PEAK-sc/i, ""));
      if (Number.isFinite(n) && n !== Number(ctx.shotIndex) && n !== Number(ctx.shotIndex) + 1) {
        // allow sc matching sceneRef loosely; hard fail only obvious sc1 when shotIndex>=1 and peak is sc1 and shot is 2+
        if (Number(ctx.shotIndex) >= 1 && n === 0) {
          /* sceneRef 0 */
        } else if (Number(ctx.shotIndex) >= 1 && /PEAK-sc1\b/i.test(p) && Number(ctx.shotIndex) !== 0) {
          // shotIndex 1 should be sc2 often — flag cross if PEAK-sc1 and shotIndex===1 with sceneRef 1
          if (ctx.sceneRef != null && Number(ctx.sceneRef) !== 0 && Number(ctx.sceneRef) !== 1) {
            reasons.push("cross_shot_peak");
          }
        }
      }
    }
    if (reasons.includes("cross_shot_peak")) {
      return {
        ok: false,
        code: "VP-CROSS-SHOT-SIDECAR",
        reasons,
        reverseTrigger: "video_prompt_stub",
      };
    }
  }

  return { ok: true, reasons: [] };
}

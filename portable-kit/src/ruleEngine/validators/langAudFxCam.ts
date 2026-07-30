/**
 * Language / FX / camera speak gates + LANG-01 videoPrompt scan.
 */
export interface GateFinding {
  ruleId: string;
  severity: "BLOCK" | "WARN" | "INFO";
  message: string;
  shotIndex?: number;
  reverseTrigger?: string;
  evidence?: Record<string, unknown>;
}

const EN_SPOKEN =
  /\b(he said|she said|I am|I'm|you are|we're|hello|please|thank you|yes\.|no\.|what are you|I love you|don't|won't|can't)\b/i;
const CJK = /[\u4e00-\u9fff]/;
/** Quoted Latin dialogue-like spans (likely translated lines). */
const QUOTED_EN_DIALOGUE = /["「]([A-Za-z][^"」]{8,})["」]/;
const AUDIO_EN_BLOCK = /\b(monologue|voiceover|dialogue)\s*:\s*[A-Za-z]{8,}/i;

export function checkLangAud01(input: {
  dialogueLines?: string;
  audioPrompt?: string;
  shotIndex?: number;
}): GateFinding | null {
  const dialogue = input.dialogueLines ?? "";
  const audio = input.audioPrompt ?? "";
  if (!dialogue.trim() && !audio.trim()) return null;
  const dialogueIsCjk = CJK.test(dialogue);
  const spokenEnInAudio = EN_SPOKEN.test(audio) && !CJK.test(audio.split(/VOICE|BGM|SFX/i)[0] ?? audio);
  if (dialogueIsCjk && spokenEnInAudio) {
    return {
      ruleId: "LANG-AUD-01",
      severity: "BLOCK",
      message: `镜 ${input.shotIndex ?? "?"} 中文台词镜 audioPrompt 出现英文独白/对白`,
      shotIndex: input.shotIndex,
      reverseTrigger: "lang_aud_mismatch",
      evidence: { sample: audio.slice(0, 80) },
    };
  }
  if (dialogueIsCjk && AUDIO_EN_BLOCK.test(audio)) {
    return {
      ruleId: "LANG-AUD-01",
      severity: "BLOCK",
      message: `镜 ${input.shotIndex ?? "?"} audio 含英文旁白/对白块`,
      shotIndex: input.shotIndex,
      reverseTrigger: "lang_aud_mismatch",
    };
  }
  return null;
}

/** LANG-01: Chinese SB dialogue must not appear as English spoken lines in videoPrompt. */
export function checkLangVid01(input: {
  dialogueLines?: string;
  videoPrompt?: string;
  shotIndex?: number;
}): GateFinding | null {
  const dialogue = input.dialogueLines ?? "";
  const video = input.videoPrompt ?? "";
  if (!dialogue.trim() || !video.trim()) return null;
  if (!CJK.test(dialogue)) return null;

  const audioSection = video.match(/\[Audio\]([\s\S]*?)(?=\[Narrative\]|$)/i)?.[1] ?? video;
  const spokenHit = EN_SPOKEN.test(audioSection) && !CJK.test(audioSection);
  const quoted = QUOTED_EN_DIALOGUE.exec(audioSection);
  const taggedEn = AUDIO_EN_BLOCK.test(audioSection);

  if (spokenHit || quoted || taggedEn) {
    const sample = (quoted?.[1] ?? audioSection.replace(/\s+/g, " ").trim()).slice(0, 60);
    return {
      ruleId: "LANG-01",
      severity: "BLOCK",
      message: `镜 ${input.shotIndex ?? "?"} 中文台词被写成英文出现在 videoPrompt（禁译进 VID）`,
      shotIndex: input.shotIndex,
      reverseTrigger: "lang_vid_mismatch",
      evidence: { sample, sourceHasCjk: true },
    };
  }
  return null;
}

/**
 * FX policy (dual-track):
 * - Explicit F0 / NONE + empty FX → PASS
 * - Undeclared empty FX (no grade) at export/preflight → BLOCK (must declare F0)
 * - Letter-grade stub fxPrompt ("F2") → BLOCK when claimed F1+
 * - F1–F3 without real prose → BLOCK when requireFxProse / burn honesty
 * - F4/F5 or infeasible text → BLOCK
 */
export function checkFxGrade(input: {
  fxPrompt?: string;
  fxFeasibility?: string | number | null;
  shotIndex?: number;
  /** When true (export/preflight), undeclared empty FX → BLOCK (declare F0). */
  warnUndeclared?: boolean;
  /** When true, F1+ without executable prose BLOCKs (burn / export honesty). */
  requireFxProse?: boolean;
}): GateFinding | null {
  const fx = (input.fxPrompt ?? "").trim();
  const grade = String(input.fxFeasibility ?? "")
    .toUpperCase()
    .replace(/^FX:/, "")
    .trim();
  if (/^F[345]$/.test(grade) || /不可行|需拆镜|F5|F4/.test(fx)) {
    return {
      ruleId: "FX-GRADE-01",
      severity: "BLOCK",
      message: `镜 ${input.shotIndex ?? "?"} FX 等级 ${grade || "高难"} ${/^F3$/.test(grade) ? "需拆镜" : "硬拦截"}`,
      shotIndex: input.shotIndex,
      reverseTrigger: "fx_infeasible",
      evidence: { grade, fxSample: fx.slice(0, 40) },
    };
  }

  const gradeStub = !fx || /^F[0-5]$/i.test(fx) || /^FX:\s*F[0-5]$/i.test(fx);
  const needsProse = /^F[1-3]$/.test(grade) || (input.requireFxProse && grade && grade !== "F0" && grade !== "NONE");

  if (needsProse && gradeStub) {
    return {
      ruleId: "FX-GRADE-01",
      severity: "BLOCK",
      message: `镜 ${input.shotIndex ?? "?"} FX ${grade || "F1+"} 缺可执行 fxPrompt（禁等级字母当散文）`,
      shotIndex: input.shotIndex,
      reverseTrigger: "fx_empty",
      evidence: { grade, fxSample: fx.slice(0, 40), repairReasons: ["compile_fx_from_visualEffect"] },
    };
  }

  // Explicit F0 / NONE + empty FX = no-VFX pass; undeclared empty → BLOCK at export
  if (!fx && (!grade || grade === "F0" || grade === "NONE")) {
    if (input.warnUndeclared && !grade) {
      return {
        ruleId: "FX-GRADE-01",
        severity: "BLOCK",
        message: `镜 ${input.shotIndex ?? "?"} FX 空未声明 F0 — 须在 fxFeasibility / fxFeasibilityAudit.items 声明 level:F0（无特效不写 fxPrompt）`,
        shotIndex: input.shotIndex,
        reverseTrigger: "fx_empty",
        evidence: { repairReasons: ["declare_f0_empty"] },
      };
    }
    return null;
  }
  return null;
}

export function checkCamSpeak(input: {
  hasDialogue?: boolean;
  cameraMotion?: string;
  videoPrompt?: string;
  shotIndex?: number;
}): GateFinding | null {
  if (!input.hasDialogue) return null;
  const cam = `${input.cameraMotion ?? ""} ${input.videoPrompt ?? ""}`;
  if (/whip.?pan|crash.?zoom|dutch.?extreme|handheld.?shake|速切|甩镜/i.test(cam)) {
    return {
      ruleId: "CAM-SPEAK",
      severity: "BLOCK",
      message: `镜 ${input.shotIndex ?? "?"} 台词镜运镜过激（口型稳定优先）`,
      shotIndex: input.shotIndex,
      reverseTrigger: "cam_speak",
    };
  }
  return null;
}

export function checkCamVariety(input: { cameraMotions: string[] }): GateFinding | null {
  const norms = input.cameraMotions
    .map((c) => (c || "static").toLowerCase().replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (norms.length < 3) return null;
  const staticCount = norms.filter((c) => /^(static|固定|静止)/.test(c)).length;
  if (norms.every((c) => c === norms[0])) {
    return {
      ruleId: "CAM-VARIETY",
      severity: "WARN",
      message: `连续 ${norms.length} 镜运镜同质（${norms[0]}）`,
      reverseTrigger: "cam_variety",
    };
  }
  if (staticCount >= 4 && staticCount === norms.length) {
    return {
      ruleId: "CAM-VARIETY",
      severity: "BLOCK",
      message: `连续 ${staticCount} 镜均为 static`,
      reverseTrigger: "cam_variety",
    };
  }
  return null;
}

export function runLangAudFxCamGates(
  shots: {
    shotIndex?: number;
    dialogueLines?: string;
    audioPrompt?: string;
    videoPrompt?: string;
    fxPrompt?: string;
    fxFeasibility?: string | null;
    cameraMotion?: string;
  }[],
): GateFinding[] {
  const out: GateFinding[] = [];
  for (const s of shots) {
    for (const fn of [
      () => checkLangAud01(s),
      () => checkLangVid01(s),
      () => checkFxGrade(s),
      () =>
        checkCamSpeak({
          hasDialogue: Boolean(s.dialogueLines?.trim()),
          cameraMotion: s.cameraMotion,
          videoPrompt: s.videoPrompt,
          shotIndex: s.shotIndex,
        }),
    ]) {
      const hit = fn();
      if (hit) out.push(hit);
    }
  }
  const variety = checkCamVariety({ cameraMotions: shots.map((s) => s.cameraMotion ?? "static") });
  if (variety) out.push(variety);
  return out;
}

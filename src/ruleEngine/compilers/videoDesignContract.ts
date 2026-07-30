/**
 * Video design hard contract helpers — lit atom survive, pad duration, audioMode body, exit≠ready.
 */
import { auditLiteraryDetailQuality } from "./stillLiteraryDetailQuality";
import { classifyVideoIntent, type VideoAudioMode, type VideoIntentClass } from "./videoIntentPolicy";
import { isNonLiteraryDialogueKey, asDialogueLineObjects } from "../design/dialogueCoverage";
import { diagnoseVideoIntent } from "../design/videoIntentReverse";
import { stripPseudoDialogueFromVideoPrompt } from "../heal/videoHomologyHeal";
import { applyViralMotionMediateToPrompt } from "./viralMotionMediate";

export type VideoDesignContractFinding = {
  id: string;
  severity: "BLOCK" | "WARN";
  message: string;
};

/** Build Audio section body from audioMode (intentPolicy matrix). */
export function audioBodyForMode(input: {
  audioMode: VideoAudioMode;
  dialogueLines?: string[];
  sfx?: string | null;
  ambient?: string | null;
}): string {
  const dial = (input.dialogueLines ?? [])
    .map((t) => String(t ?? "").trim())
    .filter((t) => t && !isNonLiteraryDialogueKey(t));
  const sfx = String(input.sfx ?? "").trim();
  const ambient = String(input.ambient ?? "环境底噪").trim();
  const sfxLine = sfx ? `音效：${sfx}` : "";

  switch (input.audioMode) {
    case "dialogue_lip":
      if (!dial.length) return `无对白。仅环境音效。\n${sfxLine}`.trim();
      return `${dial.map((d) => `"${d}"`).join("\n")}\n口型同步开启。\n${sfxLine}`.trim();
    case "sfx_peak":
      return `无对白。仅环境音效。\n${sfxLine || "音效：事件峰"}\n${ambient}`.trim();
    case "os_or_ambient":
      if (dial.length) return `${dial.map((d) => `（OS）${d}`).join("\n")}\n${sfxLine}`.trim();
      return `无对白。仅环境音效。\n${sfxLine}`.trim();
    case "ambient":
      return `无对白。仅环境音效。\n${sfxLine}\n${ambient}`.trim();
    case "dialogue_or_ambient":
    default:
      if (dial.length) return `${dial.map((d) => `"${d}"`).join("\n")}\n口型同步开启。\n${sfxLine}`.trim();
      return `无对白。仅环境音效。\n${sfxLine}`.trim();
  }
}

/** BLOCK when burn duration >> author beat without literary/lip basis. */
export function assertNoPadDuration(input: {
  authorBeatSec: number;
  burnDurationSec: number;
  hasLiteraryDialogue?: boolean;
  lipMin?: number;
}): VideoDesignContractFinding | null {
  const author = Math.max(0, Number(input.authorBeatSec) || 0);
  const burn = Math.max(0, Number(input.burnDurationSec) || 0);
  if (!(author > 0) || !(burn > 0)) return null;
  const floor = Math.max(author, input.hasLiteraryDialogue ? Number(input.lipMin) || 0 : 0);
  // Allow +1s vendor snap; block +2s or more pad without dialogue/lip
  if (burn >= floor + 2 && !input.hasLiteraryDialogue && !(Number(input.lipMin) > author)) {
    return {
      id: "DUR-PAD",
      severity: "BLOCK",
      message: `无信息抬长：作者节拍 ${author}s → 烧片 ${burn}s；禁止无对白/口型依据灌水`,
    };
  }
  return null;
}

/** Literary contact/XOR atoms in VD must appear in video Visual body (declare-only). */
export function assertVideoLiteraryAtomsSurvive(input: {
  visualDescription?: string | null;
  videoPrompt?: string | null;
  shotSize?: string | null;
}): VideoDesignContractFinding[] {
  const vd = String(input.visualDescription ?? "").trim();
  const prompt = String(input.videoPrompt ?? "");
  if (vd.length < 8) return [];
  const findings: VideoDesignContractFinding[] = [];
  try {
    const audit = auditLiteraryDetailQuality({
      visualDescription: vd,
      shotSize: String(input.shotSize ?? ""),
    });
    const blocks = audit.findings.filter((f) => f.severity === "BLOCK");
    // Survival: if VD already has mutex / contact tokens, Visual section must keep them
    const visualSec = /\[Visual\]\s*([\s\S]*?)(?=\n\[|$)/i.exec(prompt)?.[1] ?? prompt;
    for (const tok of ["纸未入口", "仅颊触", "非口含", "互斥", "另镜"]) {
      if (vd.includes(tok) && !visualSec.includes(tok)) {
        findings.push({
          id: "DEX-VID-LIT-SURVIVE",
          severity: "BLOCK",
          message: `文学原子「${tok}」未进入视频 Visual`,
        });
      }
    }
    // Sparse VD with open LIT debt → not video-ready
    if (blocks.some((b) => /DEX-LIT-CONTACT|DEX-LIT-ANCHOR|DEX-LIT-CONTACT-XOR/.test(b.id))) {
      findings.push({
        id: "DEX-VID-LIT-SPARSE",
        severity: "BLOCK",
        message: "VD 文学细节债未清；须 still/video IRD 增强或拆镜后再烧",
      });
    }
  } catch {
    /* optional */
  }
  return findings;
}

/** still→video intent hard check. */
export function assertStillVideoIntentMap(input: {
  stillIntentClass?: string | null;
  videoIntentClass?: string | null;
  visualDescription?: string | null;
  dialogueLines?: string[] | null;
  voiceType?: string | null;
}): VideoDesignContractFinding | null {
  const cls = classifyVideoIntent({
    visualDescription: input.visualDescription,
    stillIntentClass: input.stillIntentClass,
    dialogueLines: input.dialogueLines ?? [],
  });
  const tagged = String(input.videoIntentClass ?? "").trim();
  const voice = String(input.voiceType ?? "").toLowerCase();
  const still = String(input.stillIntentClass ?? "").toLowerCase();
  const silentFace =
    cls.intentClass === "react_silent" ||
    cls.intentClass === "prop_cu" ||
    /ecu_face|prop_cu|hand_cu|cheek|face_cu/.test(still);
  if (silentFace && tagged === "fx_peak" && /lip/.test(voice)) {
    return {
      id: "DEX-VID-INTENT-MAP",
      severity: "BLOCK",
      message: `意图错挂：推导 ${cls.intentClass}/${still || "—"} 却标 fx_peak+lip`,
    };
  }
  return null;
}

/** designExitPass ≠ videoPromptReady — package-level gate. */
export function assertVideoPromptReadyFromShots(input: {
  shots: Record<string, unknown>[];
  vendorId?: string | null;
}): {
  ok: boolean;
  findings: VideoDesignContractFinding[];
  primaryNextStep: "chat_repair" | "burn";
  ctaLabel: string;
} {
  const d = diagnoseVideoIntent({ shots: input.shots });
  const findings: VideoDesignContractFinding[] = d.findings.map((f) => ({
    id: f.id,
    severity: f.severity,
    message: f.message,
  }));
  return {
    ok: d.ok,
    findings,
    primaryNextStep: d.ok ? "burn" : "chat_repair",
    ctaLabel: d.ctaLabel || (d.ok ? "继续生成" : "确认视频设计修复"),
  };
}

/** Homology scrub for burn prompt: pseudo Audio + viral mediate. */
export function scrubVideoPromptForBurn(input: {
  prompt: string;
  vendorId?: string | null;
  dialogueLines?: string[];
}): { prompt: string; changes: string[]; block?: VideoDesignContractFinding } {
  const changes: string[] = [];
  let prompt = input.prompt;
  const stripped = stripPseudoDialogueFromVideoPrompt(prompt);
  if (stripped.changed) {
    prompt = stripped.prompt;
    changes.push("strip_pseudo_audio");
  }
  const med = applyViralMotionMediateToPrompt({ prompt, vendorId: input.vendorId });
  if (med.confirmRequired) {
    return {
      prompt,
      changes,
      block: {
        id: "DEX-VID-CAM-MEDIATE",
        severity: "BLOCK",
        message: med.message || "运镜无法调解到当前厂商白名单",
      },
    };
  }
  if (med.changes.length) {
    prompt = med.prompt;
    changes.push(...med.changes);
  }
  const literary = (input.dialogueLines ?? []).filter((t) => t && !isNonLiteraryDialogueKey(t));
  if (!literary.length && /口型同步开启/.test(prompt)) {
    prompt = prompt.replace(/口型同步开启。?/g, "");
    changes.push("strip_orphan_lip");
  }
  // F0 grade is no-VFX — strip mistaken prose echoes
  if (/视觉特效呼应\s*[：:]\s*F0\b/i.test(prompt)) {
    prompt = prompt.replace(/\n?视觉特效呼应\s*[：:]\s*F0[^\n]*/gi, "");
    changes.push("strip_f0_fx_echo");
  }
  return { prompt, changes };
}

export function literaryDialogueTexts(lines: unknown): string[] {
  return asDialogueLineObjects(lines)
    .map((l) => String(l.text ?? "").trim())
    .filter((t) => t && !isNonLiteraryDialogueKey(t));
}

export type { VideoIntentClass, VideoAudioMode };

/**
 * Video Intent Reverse (VIRD) — diagnose / apply for video design debt.
 * Homology with stillIntentOps: Confirm over silent regen of prompts.
 */
import { isNonLiteraryDialogueKey, asDialogueLineObjects } from "./dialogueCoverage";
import { classifyVideoIntent, type VideoIntentClass } from "../compilers/videoIntentPolicy";
import { hasOnCameraDialogue } from "./onCameraDialogue";

export type VideoIrdPrimaryAction =
  | "confirm_enhance"
  | "hand_edit_vd"
  | "confirm_voice_mode"
  | "confirm_beat_duration"
  | "confirm_cam_mediate"
  | "none";

export type VideoIrdFinding = {
  id: string;
  severity: "BLOCK" | "WARN";
  message: string;
  shotIndex: number;
  missingSlots?: string[];
};

export type VideoIrdPatch = {
  id: string;
  op:
    | "strip_pseudo_lines"
    | "set_voice_none"
    | "set_beat_duration"
    | "append_motion_verb"
    | "set_video_intent";
  shotIndex: number;
  before: unknown;
  after: unknown;
};

export type VideoIrdDiagnoseResult = {
  ok: boolean;
  findings: VideoIrdFinding[];
  patches: VideoIrdPatch[];
  primaryAction: VideoIrdPrimaryAction;
  confirmRequired: boolean;
  missingSlots: string[];
  ctaLabel: string;
};

const MOTION_VERB_RE =
  /划|擦|甩|咬|颤|推|拉|跟|移|转|抬|落|跪|坐|走|停|闪|爆|灭|渗|贴合|拂过|攥|握/;
const THIN_MOTION_RE = /事件拍点|轻微跟随|微表情呼吸|静止持镜|微动作跟随/;

function shotVd(s: Record<string, unknown>): string {
  return String(s.visualDescription ?? (s.narrative as { visualDescription?: string } | undefined)?.visualDescription ?? "").trim();
}

function shotLines(s: Record<string, unknown>): unknown {
  const n = s.narrative as { dialogue?: { lines?: unknown }; lines?: unknown } | undefined;
  return n?.dialogue?.lines ?? n?.lines ?? s.lines;
}

function voiceType(s: Record<string, unknown>): string {
  const n = s.narrative as { voiceIntent?: { type?: string } } | undefined;
  const sd = s.shotDesign as { lipSyncPolicy?: string } | undefined;
  return String(n?.voiceIntent?.type ?? sd?.lipSyncPolicy ?? "").toLowerCase();
}

function beatDurationOf(s: Record<string, unknown>): number {
  const n = s.narrative as { duration?: number; beatDuration?: number } | undefined;
  return Number(n?.beatDuration ?? s.beatDuration ?? n?.duration ?? s.duration ?? 0) || 0;
}

function motionBlob(s: Record<string, unknown>): string {
  const gen = s.generation as { videoPrompt?: string; videoDesc?: string } | undefined;
  return `${gen?.videoPrompt ?? ""}\n${gen?.videoDesc ?? ""}\n${String(s.motion ?? "")}`;
}

/** Diagnose video design debt for preDesign shots. */
export function diagnoseVideoIntent(input: {
  shots: Record<string, unknown>[];
  shotIndex?: number;
}): VideoIrdDiagnoseResult {
  const findings: VideoIrdFinding[] = [];
  const patches: VideoIrdPatch[] = [];
  const indices =
    input.shotIndex != null && Number.isFinite(input.shotIndex)
      ? [Number(input.shotIndex)]
      : input.shots.map((_, i) => i);

  for (const i of indices) {
    const s = input.shots[i];
    if (!s) continue;
    const vd = shotVd(s);
    const linesRaw = shotLines(s);
    const objs = asDialogueLineObjects(linesRaw);
    const pseudo = objs.filter((l) => isNonLiteraryDialogueKey(String(l.text ?? "")));
    const literary = objs.filter((l) => !isNonLiteraryDialogueKey(String(l.text ?? "")) && String(l.text ?? "").trim());
    const onCam = hasOnCameraDialogue(linesRaw as never) && literary.length > 0;
    const vt = voiceType(s);
    const beat = beatDurationOf(s);
    const motion = motionBlob(s);
    const cls = classifyVideoIntent({
      visualDescription: vd,
      stillIntentClass: String((s as { stillIntentClass?: string }).stillIntentClass ?? ""),
      dialogueLines: literary.map((l) => String(l.text ?? "")),
      shotSize: String((s.narrative as { shotSize?: string } | undefined)?.shotSize ?? s.shotSize ?? ""),
    });

    if (pseudo.length) {
      findings.push({
        id: "DEX-VID-PSEUDO-LINE",
        severity: "BLOCK",
        message: `镜${i + 1}：台词槽含时长伪台词（${pseudo.map((p) => p.text).join("/")}），禁止作对白`,
        shotIndex: i,
        missingSlots: ["literaryLines"],
      });
      patches.push({
        id: `strip-pseudo-${i}`,
        op: "strip_pseudo_lines",
        shotIndex: i,
        before: linesRaw,
        after: literary,
      });
    }

    if (!onCam && (/lip|required|subtle/.test(vt) || vt === "lip")) {
      findings.push({
        id: "DEX-VID-VOICE-MODE",
        severity: "BLOCK",
        message: `镜${i + 1}：无出镜对白却 voiceIntent/lip=${vt || "lip"}`,
        shotIndex: i,
        missingSlots: ["voiceIntent"],
      });
      patches.push({
        id: `voice-none-${i}`,
        op: "set_voice_none",
        shotIndex: i,
        before: vt,
        after: "none",
      });
    }

    if (!(beat > 0)) {
      findings.push({
        id: "DEX-VID-BEAT-DUR",
        severity: "BLOCK",
        message: `镜${i + 1}：缺 beatDuration/作者时长；禁止无依据抬到厂商默认秒`,
        shotIndex: i,
        missingSlots: ["beatDuration"],
      });
      const suggest = onCam ? 4 : /特写|cu/i.test(vd) ? 2 : 3;
      patches.push({
        id: `beat-${i}`,
        op: "set_beat_duration",
        shotIndex: i,
        before: beat,
        after: suggest,
      });
    }

    const thinMotion =
      !MOTION_VERB_RE.test(vd) &&
      (THIN_MOTION_RE.test(motion) || !/0s-|Motion/i.test(motion));
    if (vd.length >= 8 && thinMotion && !MOTION_VERB_RE.test(motion)) {
      findings.push({
        id: "DEX-VID-MOTION-VERB",
        severity: "BLOCK",
        message: `镜${i + 1}：Motion/VD 缺可执行拍点动词（仅有意图默认词）`,
        shotIndex: i,
        missingSlots: ["motionVerb"],
      });
      // Extract short action head from VD for Confirm apply (no invent beyond VD peel)
      const head = vd.replace(/[。；;\n].*$/, "").slice(0, 48);
      if (head && MOTION_VERB_RE.test(head)) {
        patches.push({
          id: `motion-${i}`,
          op: "append_motion_verb",
          shotIndex: i,
          before: motion.slice(0, 80),
          after: head,
        });
      }
    }

    // Contact-event: require multi-phase executable beats (not sole 微表情呼吸)
    try {
      const { isContactEventVd, buildContactEventMotionBeats } =
        require("../compilers/contactEventPolicy") as typeof import("../compilers/contactEventPolicy");
      if (isContactEventVd(vd)) {
        const phaseCount = (motion.match(/\d+(?:\.\d+)?s-\d+(?:\.\d+)?s\s*:/g) || []).length;
        const hasVerb = /划过|拂过|贴合|颊触|甩|抵|压|摩挲|擦过/.test(motion);
        const soleMicro = /微表情呼吸/.test(motion) && phaseCount < 2;
        if (phaseCount < 2 || !hasVerb || soleMicro) {
          findings.push({
            id: "VID-CONTACT-BEATS",
            severity: "BLOCK",
            message: `镜${i + 1}：接触事件 Motion 须 ≥2 可执行分相（禁仅微表情呼吸）`,
            shotIndex: i,
            missingSlots: ["contactBeats", "executableBeats"],
          });
          const beats = buildContactEventMotionBeats({
            visualDescription: vd,
            durationSec: Number((s as { duration?: number }).duration) || beat || 2,
          });
          if (beats?.body) {
            patches.push({
              id: `contact-beats-${i}`,
              op: "append_motion_verb",
              shotIndex: i,
              before: motion.slice(0, 80),
              after: beats.body,
            });
          }
        }
      }
    } catch {
      /* optional */
    }

    // Intent mismatch: react/prop CU tagged fx_peak with lip pressure
    if (
      (cls.intentClass === "react_silent" || cls.intentClass === "prop_cu") &&
      String((s as { videoIntentClass?: string }).videoIntentClass ?? "") === "fx_peak" &&
      /lip/.test(vt)
    ) {
      findings.push({
        id: "DEX-VID-INTENT-MAP",
        severity: "BLOCK",
        message: `镜${i + 1}：仍意图偏 ${cls.intentClass} 却挂 fx_peak+lip`,
        shotIndex: i,
        missingSlots: ["videoIntentClass"],
      });
      patches.push({
        id: `intent-${i}`,
        op: "set_video_intent",
        shotIndex: i,
        before: "fx_peak",
        after: cls.intentClass,
      });
    }
  }

  const blocks = findings.filter((f) => f.severity === "BLOCK");
  const slots = [...new Set(blocks.flatMap((f) => f.missingSlots ?? []))];
  let primaryAction: VideoIrdPrimaryAction = "none";
  if (slots.includes("literaryLines") || slots.includes("motionVerb")) primaryAction = "hand_edit_vd";
  else if (slots.includes("contactBeats") || slots.includes("executableBeats")) primaryAction = "confirm_enhance";
  else if (slots.includes("voiceIntent")) primaryAction = "confirm_voice_mode";
  else if (slots.includes("beatDuration")) primaryAction = "confirm_beat_duration";
  else if (slots.includes("videoIntentClass")) primaryAction = "confirm_enhance";
  else if (blocks.length) primaryAction = "confirm_enhance";

  const ctaLabel =
    slots.includes("contactBeats") || slots.includes("executableBeats")
      ? "重编译接触分相 Motion"
      : primaryAction === "confirm_voice_mode"
      ? "确认关闭口型"
      : primaryAction === "confirm_beat_duration"
        ? "确认节拍时长"
        : primaryAction === "hand_edit_vd"
          ? "手改VD/台词"
          : primaryAction === "confirm_enhance"
            ? "确认视频设计修复"
            : "";

  return {
    ok: blocks.length === 0,
    findings,
    patches,
    primaryAction,
    confirmRequired: blocks.length > 0,
    missingSlots: slots,
    ctaLabel,
  };
}

/** Apply safe structural patches (strip pseudo / voice none / beat / intent). */
export function applyVideoIntentPatches(input: {
  shots: Record<string, unknown>[];
  patches: VideoIrdPatch[];
  patchIds?: string[];
}): { shots: Record<string, unknown>[]; applied: string[] } {
  const allow = input.patchIds?.length ? new Set(input.patchIds) : null;
  const shots = input.shots.map((s) => ({ ...s }));
  const applied: string[] = [];
  for (const p of input.patches) {
    if (allow && !allow.has(p.id)) continue;
    const s = shots[p.shotIndex];
    if (!s) continue;
    const narr = { ...((s.narrative as object) ?? {}) } as Record<string, unknown>;
    if (p.op === "strip_pseudo_lines") {
      const lit = Array.isArray(p.after) ? p.after : [];
      narr.dialogue = { type: "dialogue", lines: lit };
      narr.lines = lit;
      s.narrative = narr;
      s.lines = lit;
      applied.push(p.id);
    } else if (p.op === "set_voice_none") {
      narr.voiceIntent = { type: "none" };
      s.narrative = narr;
      const sd = { ...((s.shotDesign as object) ?? {}) } as Record<string, unknown>;
      sd.lipSyncPolicy = "none";
      s.shotDesign = sd;
      applied.push(p.id);
    } else if (p.op === "set_beat_duration") {
      const sec = Number(p.after) || 2;
      narr.beatDuration = sec;
      narr.duration = sec;
      s.narrative = narr;
      s.beatDuration = sec;
      s.duration = sec;
      applied.push(p.id);
    } else if (p.op === "set_video_intent") {
      s.videoIntentClass = p.after as VideoIntentClass;
      applied.push(p.id);
    } else if (p.op === "append_motion_verb") {
      const gen = { ...((s.generation as object) ?? {}) } as Record<string, unknown>;
      const prev = String(gen.videoDesc ?? "");
      const verb = String(p.after ?? "").trim();
      if (verb && !prev.includes(verb)) {
        gen.videoDesc = `${verb}。${prev}`.trim();
        s.generation = gen;
        applied.push(p.id);
      }
    }
  }
  return { shots, applied };
}

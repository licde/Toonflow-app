/**
 * Audio × shot-type linkage SSOT (M10/M2 companion).
 *
 * Principle: 一镜一拍 + 一镜一主声源意图。
 * - 须拆（must-split）：口播说话拍 + 反应拍同镜；对白对比/AB；互斥运镜；口型超长
 * - 可愈（auto_adapt）：OS/VO 压在反应/特写上可同镜（无口型）；对白猛推夹 static；缺 audio seed；时长只升
 * - 音效：不单独强制拆镜；随主拍；无 adapter 记 unknown≠满分（SFX-UNBACKED）
 */
import { asDialogueLineObjects } from "../design/dialogueCoverage";
import { hasOnCameraDialogue, hasAnyDialogueLine, isOffscreenLine } from "../design/onCameraDialogue";
import { isClearedSpeakSplitChild } from "../design/splitChildVisual";
import type { ChainBreakAt } from "./shotChainContract";

export type AudioShotRole =
  | "speak_on_cam"
  | "os_vo_on_reaction"
  | "sfx_ride"
  | "silent_visual"
  | "must_split_speak_reaction";

export type AudioShotLinkage = {
  role: AudioShotRole;
  /** Prefer CU/MS for speak; ECU/OS for listen */
  preferredShotSize?: "CU" | "MS" | "ECU" | "WS";
  preferStatic: boolean;
  needLip: boolean;
  healHint?: "clamp_static" | "seed_audio" | "strip_orphan_speech";
  mustSplit: boolean;
  splitHint?: "reaction_shot" | "reveal_then_reaction" | "lip_split";
  breakAt: ChainBreakAt;
  reason: string;
};

const SPEAK_AND_REACT =
  /(说|开口|道).{0,24}(愣|怔|反应|听|侧目|咬唇|攥|握拳)|(愣|怔|反应|听者).{0,24}(说|开口)/;
const CONTRAST_AB = /(对比|一边.{0,8}一边|先.{0,6}后.{0,6}(说|答)|对峙双方)/;

/**
 * Decide linkage for one shot — call at exit / cam fit / sanitize.
 */
export function resolveAudioShotLinkage(shot: Record<string, unknown>): AudioShotLinkage {
  if (isClearedSpeakSplitChild(shot)) {
    return {
      role: "speak_on_cam",
      preferredShotSize: "CU",
      preferStatic: true,
      needLip: true,
      healHint: "clamp_static",
      mustSplit: false,
      breakAt: "cam_heal",
      reason: "已拆说话子镜（无 reactionAction）",
    };
  }
  // Cleared reaction child
  const role = String(shot.visualSplitRole ?? shot.beatRole ?? "").toLowerCase();
  if (
    (shot._stillBeatSplitId || shot._visualSplitId) &&
    /reaction|listen|听|insert/.test(role)
  ) {
    return {
      role: "os_vo_on_reaction",
      preferredShotSize: "ECU",
      preferStatic: true,
      needLip: false,
      mustSplit: false,
      breakAt: "ok",
      reason: "已拆反应子镜",
    };
  }

  const narr = shot.narrative as {
    dialogue?: { lines?: unknown };
    shotSize?: string;
    sound?: { sfx?: string };
  } | undefined;
  const lines = asDialogueLineObjects(narr?.dialogue?.lines);
  const vd = String(shot.visualDescription ?? "");
  const size = String(shot.shotSize ?? narr?.shotSize ?? "");
  const onCam = hasOnCameraDialogue(lines);
  const anyDial = hasAnyDialogueLine(lines);
  const onlyOs = anyDial && !onCam && lines.every((l) => !String(l.text ?? "").trim() || isOffscreenLine(l));
  const sfx =
    String(narr?.sound?.sfx ?? shot.audioCue ?? (shot.generation as { audioPrompt?: string })?.audioPrompt ?? "")
      .trim().length > 0 && /sfx|音效|环境/i.test(String(narr?.sound?.sfx ?? shot.audioCue ?? ""));
  const hasReactionAction = lines.some((l) => String((l as { reactionAction?: string }).reactionAction ?? "").trim());
  const hasSplitHint = lines.some((l) => /reaction|听者|拆/i.test(String((l as { splitHint?: string }).splitHint ?? "")));

  // Literary multi-intent: speak + reaction / contrast → must split
  if (
    SPEAK_AND_REACT.test(vd) ||
    (onCam && hasReactionAction) ||
    (onCam && hasSplitHint) ||
    (onCam && /反应镜|听者|过肩/.test(vd) && /说|开口|道/.test(vd))
  ) {
    return {
      role: "must_split_speak_reaction",
      preferredShotSize: "CU",
      preferStatic: true,
      needLip: true,
      mustSplit: true,
      splitHint: "reaction_shot",
      breakAt: "cam_split",
      reason: "口播与反应同镜不可拍，须拆说话镜+反应镜",
    };
  }
  if (CONTRAST_AB.test(vd) && onCam) {
    return {
      role: "must_split_speak_reaction",
      preferStatic: true,
      needLip: true,
      mustSplit: true,
      splitHint: "reveal_then_reaction",
      breakAt: "split",
      reason: "对白对比/AB 须拆镜覆盖双方拍点",
    };
  }

  if (onCam) {
    return {
      role: "speak_on_cam",
      preferredShotSize: /ECU|大特/.test(size) ? "ECU" : "CU",
      preferStatic: true,
      needLip: true,
      healHint: "clamp_static",
      mustSplit: false,
      breakAt: "cam_heal",
      reason: "出镜对白：单拍 CU/MS + static + lip；猛推运镜可愈夹 static",
    };
  }

  if (onlyOs) {
    return {
      role: "os_vo_on_reaction",
      preferredShotSize: /ECU|大特|特写/.test(size) ? "ECU" : "CU",
      preferStatic: true,
      needLip: false,
      healHint: "seed_audio",
      mustSplit: false,
      breakAt: "audio",
      reason: "OS/独白/旁白可压在反应镜/特写上同镜（无口型）；禁写张嘴说话",
    };
  }

  if (sfx || /音效|sfx/i.test(String(shot.videoDesc ?? ""))) {
    return {
      role: "sfx_ride",
      preferStatic: false,
      needLip: false,
      mustSplit: false,
      breakAt: "ok",
      reason: "音效随主视觉拍，不单独强制拆",
    };
  }

  return {
    role: "silent_visual",
    preferStatic: false,
    needLip: false,
    healHint: "strip_orphan_speech",
    mustSplit: false,
    breakAt: "ok",
    reason: "无对白：禁残留口播/lip；仅环境可留",
  };
}

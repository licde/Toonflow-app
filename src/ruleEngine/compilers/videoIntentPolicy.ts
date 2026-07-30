/**
 * Video Intent Classifier SSOT — mirror stillIntentPolicy.
 * Coverage = declared videoIntentClasses + safe degrade for unknown.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { classifyStillIntent, type StillIntentClass } from "./stillIntentPolicy";
import { isNonLiteraryDialogueKey } from "../design/dialogueCoverage";

export type VideoIntentClass =
  | "speak_lip"
  | "prop_cu"
  | "react_silent"
  | "empty_os"
  | "fx_peak"
  | "unknown";

export type VideoAudioMode = "dialogue_lip" | "dialogue_or_ambient" | "ambient" | "os_or_ambient" | "sfx_peak";

export type VideoIntentPolicyRow = {
  motionDefault: string;
  cameraMotion: string;
  audioMode: VideoAudioMode;
  forceShotSize?: string;
  preferShotSizeFromDesign?: boolean;
};

export type VideoIntentClassification = {
  intentClass: VideoIntentClass;
  policy: VideoIntentPolicyRow;
  stillIntentClass?: StillIntentClass | string;
  confidence: "high" | "med" | "low";
  reasons: string[];
};

type VideoDoctrine = {
  stillToVideoMap?: Record<string, VideoIntentClass>;
  intentPolicyMatrix?: Record<string, VideoIntentPolicyRow>;
};

const FALLBACK_POLICY: Record<VideoIntentClass, VideoIntentPolicyRow> = {
  speak_lip: {
    motionDefault: "静止持镜",
    cameraMotion: "静止",
    audioMode: "dialogue_lip",
    preferShotSizeFromDesign: true,
  },
  prop_cu: {
    motionDefault: "微动作跟随",
    cameraMotion: "轻微运镜",
    audioMode: "dialogue_or_ambient",
    forceShotSize: "特写",
    preferShotSizeFromDesign: true,
  },
  react_silent: {
    motionDefault: "微表情呼吸",
    cameraMotion: "轻微运镜",
    audioMode: "ambient",
    preferShotSizeFromDesign: true,
  },
  empty_os: {
    motionDefault: "缓推",
    cameraMotion: "缓推",
    audioMode: "os_or_ambient",
    preferShotSizeFromDesign: true,
  },
  fx_peak: {
    motionDefault: "事件拍点",
    cameraMotion: "轻微运镜",
    audioMode: "sfx_peak",
    preferShotSizeFromDesign: true,
  },
  unknown: {
    motionDefault: "轻微跟随",
    cameraMotion: "轻微运镜",
    audioMode: "dialogue_or_ambient",
    preferShotSizeFromDesign: true,
  },
};

let cachedDoctrine: VideoDoctrine | null = null;

export function loadVideoLiteraryIntentDoctrine(): VideoDoctrine {
  if (cachedDoctrine) return cachedDoctrine;
  cachedDoctrine = readFixtureJson<VideoDoctrine>("video_literary_intent_doctrine.json", {});
  return cachedDoctrine;
}

const PROP_CU_RE =
  /扳指|指尖|手腕|手部特写|道具特写|物件特写|摩挲|玉简|玉佩|书信|信笺/;
const OS_VO_RE = /（\s*OS\s*）|\bOS\b|画外|旁白|独白|VO\b|voice.?over/i;
const EMPTY_RE = /空镜|无人物|无人|环境空镜|only\s*env/i;
const FX_PEAK_RE = /摔杯|骤灭|爆|崩|闪|特效|peak|FX:/i;
const CU_SIZE_RE = /特写|大特|cu\b|ecu|close.?up/i;

const DIRECT_VIDEO_INTENTS = new Set<VideoIntentClass>([
  "speak_lip",
  "prop_cu",
  "react_silent",
  "empty_os",
  "fx_peak",
  "unknown",
]);

function mapStillToVideo(still?: string | null): VideoIntentClass | null {
  if (!still) return null;
  const key = still.trim();
  if (DIRECT_VIDEO_INTENTS.has(key as VideoIntentClass)) return key as VideoIntentClass;
  const map = loadVideoLiteraryIntentDoctrine().stillToVideoMap ?? {};
  return map[key] ?? null;
}

function policyOf(cls: VideoIntentClass): VideoIntentPolicyRow {
  const matrix = loadVideoLiteraryIntentDoctrine().intentPolicyMatrix ?? {};
  return matrix[cls] ?? FALLBACK_POLICY[cls] ?? FALLBACK_POLICY.unknown;
}

/**
 * Classify video intent from design fields + optional persisted stillIntentClass.
 */
export function classifyVideoIntent(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  dialogueLines?: string[] | null;
  stillIntentClass?: string | null;
  fxLevel?: string | null;
  promptBlob?: string | null;
}): VideoIntentClassification {
  const reasons: string[] = [];
  const vd = String(input.visualDescription ?? "").trim();
  const blob = `${vd}\n${input.promptBlob ?? ""}`;
  const size = String(input.shotSize ?? "");
  const lines = (input.dialogueLines ?? [])
    .map((t) => String(t ?? "").trim())
    .filter((t) => t && !isNonLiteraryDialogueKey(t));
  const hasDial = lines.length > 0;
  const inherited = mapStillToVideo(input.stillIntentClass);
  if (input.stillIntentClass) reasons.push(`inherit_still:${input.stillIntentClass}`);

  // Derive from content (may override inherit when signals stronger)
  let derived: VideoIntentClass = "unknown";
  if (EMPTY_RE.test(blob) || OS_VO_RE.test(blob)) {
    derived = "empty_os";
    reasons.push("empty_or_os_signal");
  } else if (PROP_CU_RE.test(blob) || (CU_SIZE_RE.test(size) && PROP_CU_RE.test(vd))) {
    derived = "prop_cu";
    reasons.push("prop_cu_signal");
  } else if (FX_PEAK_RE.test(blob) || /F[1-5]/i.test(String(input.fxLevel ?? ""))) {
    derived = "fx_peak";
    reasons.push("fx_peak_signal");
  } else if (hasDial) {
    derived = "speak_lip";
    reasons.push("has_dialogue");
  } else if (CU_SIZE_RE.test(size) || /微表情|凝视|眼神/.test(vd)) {
    derived = "react_silent";
    reasons.push("react_silent_signal");
  } else if (!vd && !hasDial) {
    // Try still classifier on blob for seating etc.
    const still = classifyStillIntent({ visualDescription: vd || blob, shotSize: size });
    const mapped = mapStillToVideo(still.intentClass);
    if (mapped && mapped !== "unknown") {
      derived = mapped;
      reasons.push(`still_reclassify:${still.intentClass}`);
    }
  }

  // Prefer content-derived when strong; else inherit
  let intentClass: VideoIntentClass = derived;
  if (derived === "unknown" && inherited) {
    intentClass = inherited;
    reasons.push("use_inherited");
  } else if (inherited === "prop_cu" && (derived === "speak_lip" || derived === "unknown")) {
    // Hand/prop CU with dialogue → prop_cu keeps framing, audio still lip via audioMode
    intentClass = "prop_cu";
    reasons.push("prop_cu_over_speak");
  } else if (inherited && derived === "unknown") {
    intentClass = inherited;
  } else if (inherited && !hasDial && (derived === "fx_peak" || derived === "speak_lip")) {
    // Stale track seed (F0/fx_peak blob, pseudo dial) must not override package intentClass
    intentClass = inherited;
    reasons.push("persisted_over_stale_seed");
  }

  if (intentClass === "unknown") reasons.push("unknown_safe_degrade");

  const confidence: "high" | "med" | "low" =
    reasons.some((r) => r.startsWith("inherit") || r.includes("signal") || r === "has_dialogue")
      ? inherited && derived !== "unknown"
        ? "high"
        : "med"
      : "low";

  return {
    intentClass,
    policy: policyOf(intentClass),
    stillIntentClass: input.stillIntentClass ?? undefined,
    confidence,
    reasons,
  };
}

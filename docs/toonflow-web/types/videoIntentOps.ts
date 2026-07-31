/**

 * videoIntentOps / VIRD FE contract — mirror BE videoIntentReverse + VIDEO_INTENT_OPS_CONTRACT.md.

 * Prefer confirm_enhance / hand_edit_vd / confirm_voice_mode over sole regen prompt.

 */



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

  shotIndex?: number;

  missingSlots?: string[];

};



export type DesignIntentHit = {

  id: string;

  label: string;

  pass: boolean;

  expected?: string;

  actual?: string;

};



export type DesignIntentFidelityResult = {

  pass: boolean;

  items: DesignIntentHit[];

  repairs?: string[];

  virdFindings?: VideoIrdFinding[];

};



export type VideoBurnNextStep =

  | "burn"

  | "chat_repair"

  | "human_review"

  | "retry_shot"

  | "soft_patch"

  | "raise_duration"

  | "split_shot"

  | "batch_still"

  | "regen_storyboard_hq";



export type VideoIrdDiagnoseResponse = {

  ok: boolean;

  findings: VideoIrdFinding[];

  primaryAction: VideoIrdPrimaryAction;

  confirmRequired?: boolean;

  patches?: unknown[];

  missingSlots?: string[];

  ctaLabel?: string;

  primaryNextStep?: VideoBurnNextStep;

  userMessage?: string;

  a11yAnnounce?: string;

  reverseTrigger?: string | null;

  code?: string | null;

};



export function videoIrdCtaLabel(input: {

  primaryAction?: VideoIrdPrimaryAction | string | null;

  missingSlots?: string[] | null;

  primaryNextStep?: string | null;

  reverseTrigger?: string | null;

  code?: string | null;

  pixelDimStatus?: "unmeasured" | "measured_fail" | "measured_pass" | string | null;

  qcWeak?: boolean | null;

}): string {

  if (input.pixelDimStatus === "unmeasured" || (input.qcWeak && input.primaryNextStep === "human_review")) {

    if (

      input.reverseTrigger === "still_prop_missing" ||

      /CONTACT|PROP/i.test(String(input.code ?? ""))

    ) {

      return "接触未测 · 重出带道具静照";

    }

    return "未测·人审（非失败）";

  }

  const slots = (input.missingSlots ?? []).filter(Boolean);

  if (

    input.reverseTrigger === "still_prop_missing" ||

    input.reverseTrigger === "still_video_contact_handoff" ||

    input.code === "STILL-CONTACT-HANDOFF" ||

    slots.includes("propInFrame")

  ) {

    return "重出带道具静照";

  }

  if (

    input.reverseTrigger === "vid_contact_beats" ||

    slots.includes("contactBeats") ||

    slots.includes("executableBeats")

  ) {

    return "重编译接触分相 Motion";

  }

  if (input.primaryNextStep === "human_review") {

    if (slots.includes("propInFrame") || slots.includes("contactBeats")) {

      return "接触未测 · 重出带道具静照";

    }

    return "SVQ 未测维 · 人审";

  }

  if (isVideoPromptStaleSignal(input)) return "重编译视频提示词";

  if (input.primaryAction === "confirm_enhance") {

    return slots.length ? `批准增强补${slots.slice(0, 3).join("/")}` : "批准视频设计增强";

  }

  if (input.primaryAction === "hand_edit_vd") {

    return slots.length ? `手改VD补${slots.slice(0, 3).join("/")}` : "手改VD";

  }

  if (input.primaryAction === "confirm_voice_mode") return "确认 voiceIntent / 口型模式";

  if (input.primaryAction === "confirm_beat_duration") return "确认 beatDuration 节拍秒";

  if (input.primaryAction === "confirm_cam_mediate") return "确认运镜调解";

  return "查看视频设计诊断";

}



export function isVideoPromptStaleSignal(input: {

  reverseTrigger?: string | null;

  code?: string | null;

  userMessage?: string | null;

  ctaLabel?: string | null;

}): boolean {

  const blob = [

    input.reverseTrigger,

    input.code,

    input.userMessage,

    input.ctaLabel,

  ]

    .map((s) => String(s ?? ""))

    .join(" ");

  return /VIDEO-PROMPT-STALE|video_prompt_stale|提示词.*过期|须重编译/i.test(blob);

}



export function flattenVideoMissingSlots(findings: VideoIrdFinding[] | null | undefined): string[] {

  const out = new Set<string>();

  for (const f of findings ?? []) {

    if (f.severity !== "BLOCK") continue;

    for (const s of f.missingSlots ?? []) {

      if (s) out.add(String(s));

    }

  }

  return [...out];

}



export function isSvqHumanReviewStep(step?: string | null): boolean {

  return String(step ?? "") === "human_review";

}



export function isDesignIntentFidelityDebt(

  fidelity?: DesignIntentFidelityResult | null,

): boolean {

  if (!fidelity) return false;

  if (fidelity.pass === false) return true;

  return (fidelity.virdFindings ?? []).some((f) => f.severity === "BLOCK");

}



export function isVideoIrdDebtMeta(meta: {

  ok?: boolean | null;

  primaryAction?: string | null;

  primaryNextStep?: string | null;

  missingSlots?: string[] | null;

  ctaLabel?: string | null;

  reverseTrigger?: string | null;

  code?: string | null;

  userMessage?: string | null;

  designIntentFidelity?: DesignIntentFidelityResult | null;

}): boolean {

  if (isDesignIntentFidelityDebt(meta.designIntentFidelity)) return true;

  if (meta.ok === false) return true;

  if ((meta.missingSlots ?? []).length > 0) return true;

  if (isVideoPromptStaleSignal(meta)) return true;

  const action = String(meta.primaryAction ?? "");

  if (

    action === "confirm_enhance" ||

    action === "hand_edit_vd" ||

    action === "confirm_voice_mode" ||

    action === "confirm_beat_duration" ||

    action === "confirm_cam_mediate"

  ) {

    return true;

  }

  return (

    meta.primaryNextStep === "chat_repair" &&

    /视频|voice|beat|运镜|伪台词|DEX-VID|重编译/i.test(String(meta.ctaLabel ?? ""))

  );

}



export function isQcSoftDeliverOnly(meta: {

  playable?: boolean | null;

  videoPass?: boolean | null;

  motionPassAt?: string | null;

  qcWeak?: boolean | null;

  pixelDimStatus?: string | null;

}): boolean {

  if (meta.videoPass === true || meta.motionPassAt) return false;

  if (meta.playable === true) return true;

  if (meta.qcWeak === true) return true;

  if (meta.pixelDimStatus === "unmeasured" || meta.pixelDimStatus === "measured_fail") return true;

  return false;

}



/** Thin generation.videoPrompt stub — static,duration / bare motion-from-frame without multi-phase Motion (G8). */
export function isThinVideoPromptStub(prompt: string): boolean {
  const t = String(prompt ?? "").trim();
  if (!t) return true;
  if (/static,\s*duration/i.test(t)) return true;
  const motion = t.match(/\[Motion\]([\s\S]*?)(?=\[Camera\]|$)/i)?.[1] ?? t;
  if (/motion-from-frame/i.test(motion)) {
    const phases = motion.match(/\d+(?:\.\d+)?s-\d+(?:\.\d+)?s\s*:/g) ?? [];
    const body = motion.replace(/motion-from-frame[^\n;；]*/gi, " ").replace(/\s+/g, " ").trim();
    if (phases.length < 2 && body.length < 12) return true;
  }
  return false;
}

/** Spine compile/burn-ready — not a thin shell and has Visual+Motion body (G8). */
export function spineReady(prompt: string): boolean {
  const t = String(prompt ?? "").trim();
  if (isThinVideoPromptStub(t)) return false;
  if (!/\[Visual\]/i.test(t) || !/\[Motion\]/i.test(t)) return false;
  const visual = t.match(/\[Visual\]([\s\S]*?)(?=\[Motion\]|$)/i)?.[1]?.replace(/\s+/g, "") ?? "";
  const motion = t.match(/\[Motion\]([\s\S]*?)(?=\[Camera\]|$)/i)?.[1]?.replace(/\s+/g, "") ?? "";
  return visual.length >= 8 && motion.length >= 4;
}

export function shouldOfferVideoHumanRejudge(meta: {

  playable?: boolean | null;

  videoPass?: boolean | null;

  motionPassAt?: string | null;

  qcWeak?: boolean | null;

  pixelDimStatus?: string | null;

}): boolean {

  return isQcSoftDeliverOnly(meta);

}



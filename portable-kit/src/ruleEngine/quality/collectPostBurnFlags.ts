/**
 * Collect post-burn QC flags — unknown ≠ stub 0.7 pass.
 */
import { sampleVideoFrames, judgeMotionFidelity, resolveMotionAction } from "../qc/videoMotionVlm";
import { loadSvqDoctrine, dimPolicyOf } from "./loadSvqDoctrine";

export type PostBurnFlagBag = {
  flags: {
    identityOk?: boolean;
    emotionOk?: boolean;
    lipOk?: boolean;
    camVarietyOk?: boolean;
    audioOk?: boolean;
    retentionOk?: boolean;
    packagingOk?: boolean;
    motionOk?: boolean;
    visBeatOk?: boolean;
    litDetailOk?: boolean;
    litContactXorOk?: boolean;
  };
  /** Explicit unknown dims (must not score as 0.7) */
  unknownDims: string[];
  skippedDims: string[];
  motionAction?: string;
  notes: string[];
};

export function collectPostBurnFlags(input: {
  visualPass?: boolean;
  audioPass?: boolean;
  hasDialogue?: boolean;
  identityOk?: boolean;
  emotionOk?: boolean;
  lipOk?: boolean;
  motionIntent?: string;
  /** When true, a real VLM adapter produced observedScore */
  vlmObservedScore?: number;
  vlmContinuityScore?: number;
  vlmAdapterPresent?: boolean;
  asrTranscript?: string | null;
  asrAdapterPresent?: boolean;
  camVarietyOk?: boolean;
  retentionOk?: boolean;
  packagingOk?: boolean;
  visBeatOk?: boolean;
  litDetailOk?: boolean;
  litContactXorOk?: boolean;
  /** VD for literary audit when lit flags omitted */
  visualDescription?: string | null;
  shotSize?: string | null;
  durationSec?: number;
}): PostBurnFlagBag {
  const doc = loadSvqDoctrine();
  const unknownDims: string[] = [];
  const skippedDims: string[] = [];
  const notes: string[] = [];
  const flags: PostBurnFlagBag["flags"] = {};

  const setDim = (id: string, value: boolean | undefined, measured: boolean) => {
    const policy = dimPolicyOf(id);
    if (policy === "skip") {
      skippedDims.push(id);
      return;
    }
    if (!measured) {
      if (policy === "must") unknownDims.push(id);
      else skippedDims.push(id);
      return;
    }
    if (id === "identity_cast") flags.identityOk = value;
    if (id === "emotion_clarity") flags.emotionOk = value;
    if (id === "dialogue_lip") flags.lipOk = value;
    if (id === "cam_variety") flags.camVarietyOk = value;
    if (id === "audio_mood") flags.audioOk = value;
    if (id === "retention_hook") flags.retentionOk = value;
    if (id === "packaging") flags.packagingOk = value;
    if (id === "motion_fidelity") flags.motionOk = value;
    if (id === "vis_beat") flags.visBeatOk = value;
    if (id === "lit_detail") flags.litDetailOk = value;
    if (id === "lit_contact_xor") flags.litContactXorOk = value;
  };

  setDim("identity_cast", input.identityOk ?? input.visualPass, input.identityOk !== undefined || input.visualPass !== undefined);
  setDim("emotion_clarity", input.emotionOk, input.emotionOk !== undefined);

  if (input.hasDialogue) {
    setDim("dialogue_lip", input.lipOk, input.lipOk !== undefined);
    const asrMeasured =
      Boolean(input.asrAdapterPresent && input.asrTranscript != null) ||
      (doc.asr.skipWhenNoAdapter && !input.asrAdapterPresent);
    if (doc.asr.skipWhenNoAdapter && !input.asrAdapterPresent) {
      skippedDims.push("audio_mood");
      notes.push("asr_skipped_no_adapter");
    } else {
      const audioOk = input.audioPass !== false && (input.asrTranscript != null ? input.asrTranscript.length > 0 : input.audioPass);
      setDim("audio_mood", audioOk, asrMeasured || input.audioPass !== undefined);
    }
  } else {
    skippedDims.push("dialogue_lip", "audio_mood");
  }

  // Motion: stub without adapter => unknown for must
  sampleVideoFrames({ durationSec: input.durationSec });
  let motionAction: string | undefined;
  if (input.vlmAdapterPresent && input.vlmObservedScore != null) {
    const judge = judgeMotionFidelity({
      expectedMotion: input.motionIntent,
      observedScore: input.vlmObservedScore,
      continuityScore: input.vlmContinuityScore,
    });
    motionAction = resolveMotionAction(judge);
    setDim("motion_fidelity", !judge.mismatch && !judge.severe, true);
  } else if (doc.vlm.stubIsUnknown) {
    if (input.motionIntent) {
      setDim("motion_fidelity", undefined, false);
      notes.push("vlm_unknown_no_adapter");
    } else {
      skippedDims.push("motion_fidelity");
    }
  }

  setDim("cam_variety", input.camVarietyOk, input.camVarietyOk !== undefined);
  setDim("retention_hook", input.retentionOk, input.retentionOk !== undefined);
  setDim("packaging", input.packagingOk, input.packagingOk !== undefined);
  setDim("vis_beat", input.visBeatOk, input.visBeatOk !== undefined);

  let litDetailOk = input.litDetailOk;
  let litXorOk = input.litContactXorOk;
  let litMeasured = input.litDetailOk !== undefined || input.litContactXorOk !== undefined;
  if (!litMeasured && String(input.visualDescription ?? "").trim()) {
    try {
      const { auditLiteraryDetailQuality } =
        require("../compilers/stillLiteraryDetailQuality") as typeof import("../compilers/stillLiteraryDetailQuality");
      const a = auditLiteraryDetailQuality({
        visualDescription: input.visualDescription,
        shotSize: input.shotSize,
      });
      litDetailOk = !a.findings.some(
        (f) =>
          f.severity === "BLOCK" &&
          (f.id === "DEX-LIT-CONTACT" || f.id === "DEX-LIT-ANCHOR" || f.id === "DEX-PROP-CONT"),
      );
      litXorOk = !a.findings.some((f) => f.severity === "BLOCK" && f.id === "DEX-LIT-CONTACT-XOR");
      litMeasured = true;
    } catch {
      /* optional */
    }
  }
  // 无 VD/旗标时 skip，勿当 unknown 假红（must 仅在测得时生效）
  if (!litMeasured) {
    skippedDims.push("lit_detail", "lit_contact_xor");
    notes.push("lit_skipped_unmeasured");
  } else {
    setDim("lit_detail", litDetailOk, true);
    setDim("lit_contact_xor", litXorOk, true);
  }

  return { flags, unknownDims: [...new Set(unknownDims)], skippedDims: [...new Set(skippedDims)], motionAction, notes };
}

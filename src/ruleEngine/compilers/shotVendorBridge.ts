/**
 * ShotVendorBridge — map design fields to controllable vendor API params vs text-only.
 */
import type { DesignFields } from "../design/designFieldRegistry";
import { compileShotSize, compileCamera, compileEmotionCue } from "./contentFieldCompiler";
import { snapDurationToVendorMap, VENDOR_DURATION_BUCKETS } from "../vendor-packs/videoVendorPack";

export type VendorControllableKey = "duration" | "audio" | "resolution" | "mode" | "aspectRatio" | "referenceCount";
export type TextOnlyKey = "shotSize" | "camera" | "microExpr" | "emotion" | "colorTemp" | "fx" | "spatial";

export interface VendorCapability {
  vendorId?: string;
  controllable: VendorControllableKey[];
  textOnly: TextOnlyKey[];
  nativeAudio?: boolean;
  /**
   * Reserved: true only when vendor exposes a real expression API param.
   * When false/undefined — text-declare only; never BLOCK burn for missing native expression.
   */
  nativeExpression?: boolean;
  durationBuckets?: number[];
}

/** Default: most video vendors accept duration/audio/refs/mode; shotSize is prompt-only. */
export const DEFAULT_VIDEO_CAPABILITY: VendorCapability = {
  controllable: ["duration", "audio", "resolution", "mode", "aspectRatio", "referenceCount"],
  textOnly: ["shotSize", "camera", "microExpr", "emotion", "colorTemp", "fx", "spatial"],
  nativeAudio: true,
  nativeExpression: false,
  durationBuckets: VENDOR_DURATION_BUCKETS.default,
};

export interface BridgeInput {
  designFields: DesignFields;
  request?: {
    duration?: number;
    audio?: boolean;
    resolution?: string;
    mode?: string | string[];
    aspectRatio?: string;
  };
  referenceCount?: number;
  capability?: VendorCapability;
  lipMin?: number;
}

export interface BridgeResult {
  params: {
    duration: number;
    audio: boolean;
    resolution?: string;
    mode?: string | string[];
    aspectRatio?: string;
    referenceCount: number;
  };
  textHardening: string[];
  bridging: { controllable: string[]; textOnly: string[] };
  warnings: string[];
  durationSnapOk?: boolean;
}

function resolveDuration(fields: DesignFields, req?: number): number {
  const fromField =
    typeof fields.duration === "number"
      ? fields.duration
      : typeof fields.duration === "string"
        ? Number(String(fields.duration).replace(/s$/i, ""))
        : NaN;
  if (Number.isFinite(fromField) && fromField > 0) return Math.round(fromField);
  if (req != null && Number.isFinite(req) && req > 0) return Math.round(req);
  return 5;
}

/**
 * Build vendor API params + text hardening fragments for fields without API slots.
 */
export function bridgeShotToVendor(input: BridgeInput): BridgeResult {
  const cap = input.capability ?? DEFAULT_VIDEO_CAPABILITY;
  const fields = input.designFields;
  const warnings: string[] = [];
  const textHardening: string[] = [];

  let duration = resolveDuration(fields, input.request?.duration);
  const buckets = cap.durationBuckets ?? VENDOR_DURATION_BUCKETS.default;
  const snap = snapDurationToVendorMap(duration, buckets, { lipMin: input.lipMin });
  duration = snap.duration;
  if (snap.warning) warnings.push(snap.warning);

  // Dialogue / forceAudioHint wins over explicit false — avoid silent AV drop
  let audio = Boolean(fields.forceAudioHint || fields.dialogue || input.request?.audio);
  if (audio && cap.nativeAudio === false) {
    warnings.push("bridging:vendor_no_native_audio");
    audio = false;
  }

  if (fields.shotSize) {
    const frag = compileShotSize(fields.shotSize);
    if (frag) textHardening.push(frag);
    if (cap.textOnly.includes("shotSize")) warnings.push("bridging:text_only:shotSize");
  }
  if (fields.camera) {
    const frag = compileCamera(fields.camera);
    if (frag) textHardening.push(frag);
    if (cap.textOnly.includes("camera")) warnings.push("bridging:text_only:camera");
  }
  if (fields.emotion != null) {
    const frag = compileEmotionCue(fields.emotion);
    if (frag) textHardening.push(frag);
    if (cap.nativeExpression !== true) warnings.push("bridging:text_only:emotion");
  }
  if (fields.spatialRelation?.startsWith("microExpr:")) {
    // Always ZH text-declare; never inject EN "micro-expression" shell
    const microBody = fields.spatialRelation.replace(/^microExpr:/, "").trim();
    if (microBody) textHardening.push(`微表情：${microBody}`);
    warnings.push("bridging:text_only:microExpr");
    if (cap.nativeExpression !== true) warnings.push("bridging:nativeExpression_skip");
  }

  return {
    params: {
      duration,
      audio,
      resolution: input.request?.resolution,
      mode: input.request?.mode,
      aspectRatio: input.request?.aspectRatio,
      referenceCount: input.referenceCount ?? 0,
    },
    textHardening,
    bridging: {
      controllable: [...cap.controllable],
      textOnly: [...cap.textOnly],
    },
    warnings,
    durationSnapOk: snap.ok,
  };
}

/** Append text_only constraints into prompt Camera/Visual areas. */
export function applyTextHardening(prompt: string, fragments: string[]): string {
  const bits = fragments.filter((f) => f && !prompt.includes(f));
  if (!bits.length) return prompt;
  const line = bits.join(", ");
  if (/\[Camera\]/i.test(prompt)) {
    return prompt.replace(/\[Camera\]/i, `[Camera]\n${line}`);
  }
  return `${prompt.trim()}\n${line}`;
}

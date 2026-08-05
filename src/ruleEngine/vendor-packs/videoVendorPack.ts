/**
 * Thin vendor prompt packs + duration bucket snap.
 */
import type { VendorCapability } from "../compilers/shotVendorBridge";

export type VendorPackId = "agnesai" | "wan" | "seedance" | "klingai" | "minimax" | "vidu" | "default";

export interface VendorPackResult {
  prompt: string;
  duration: number;
  audio: boolean;
  warnings: string[];
  packId: VendorPackId;
}

/** Discrete duration maps (seconds) used when model config not passed. */
export const VENDOR_DURATION_BUCKETS: Record<string, number[]> = {
  agnesai: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30],
  wan: [5, 10],
  volcengine: [4, 5, 6, 8, 10, 12, 15],
  seedance: [4, 5, 6, 8, 10, 12, 15],
  klingai: [5, 10],
  minimax: [6, 10],
  vidu: [4, 5, 6, 8],
  default: [4, 5, 6, 8, 10],
};

export function snapDurationToVendorMap(
  durationSec: number,
  buckets: number[],
  opts?: { lipMin?: number },
): { duration: number; ok: boolean; warning?: string } {
  const want = Math.max(1, Math.round(durationSec));
  const lip = opts?.lipMin != null ? Math.ceil(opts.lipMin) : 0;
  const target = Math.max(want, lip);
  const sorted = [...buckets].sort((a, b) => a - b);
  const hit = sorted.find((b) => b >= target);
  if (hit != null) return { duration: hit, ok: true };
  const max = sorted[sorted.length - 1] ?? target;
  if (lip > max) {
    return { duration: max, ok: false, warning: `lipMin ${lip}s exceeds vendor max ${max}s — split required` };
  }
  return { duration: max, ok: true, warning: `clamped to vendor max ${max}s` };
}

export function applyVendorPromptPack(input: {
  prompt: string;
  vendorId?: string | null;
  templatePath?: string | null;
  duration: number;
  audio: boolean;
  lipMin?: number;
  nativeAudio?: boolean;
}): VendorPackResult {
  const warnings: string[] = [];
  const vid = String(input.vendorId ?? "agnesai").toLowerCase();
  const tpl = String(input.templatePath ?? "").toLowerCase();
  let packId: VendorPackId = "default";
  let prompt = input.prompt;

  if (/seedance|volcengine.?sd2/i.test(vid) || /seedance/i.test(tpl)) {
    packId = "seedance";
    // @图N → @图片N for Seedance Chinese pack (keep ordinals)
    prompt = prompt.replace(/@图(\d+)/g, "@图片$1");
  } else if (/wan/i.test(vid) || /wan2\.6|wan2/i.test(tpl)) {
    packId = "wan";
    // Wan: honest dialect — strip @图; emit video.tun_stripped for ledger when multi-ref expected
    if (/@图\d|@图片\d/i.test(prompt)) {
      prompt = prompt.replace(/@图(?:片)?\d+\s*[：:][^\n]*/g, "").replace(/@图(?:片)?\d+/g, "");
      warnings.push("wan_strip_at_refs");
      warnings.push("video.tun_stripped");
    }
  } else if (/kling/i.test(vid)) {
    packId = "klingai";
  } else if (/minimax/i.test(vid)) {
    packId = "minimax";
  } else if (/vidu/i.test(vid)) {
    packId = "vidu";
  } else if (/agnes/i.test(vid)) {
    packId = "agnesai";
    // 图N-first: Agnes multi-param KEEPS @图N; only strip negative: channel
    if (/negative\s*:/i.test(prompt)) {
      prompt = prompt.replace(/negative\s*:[^\n]*/gi, "");
      warnings.push("agnes_strip_negative_only");
    }
  }

  // No native audio: strip all lip sync instructions (ZH + legacy EN)
  if (input.nativeAudio === false || packId === "klingai" || packId === "minimax") {
    if (/口型同步|lip-sync|lip sync|对白嘴型|嘴型自然/i.test(prompt)) {
      prompt = prompt
        .replace(/口型同步开启。?/g, "")
        .replace(/口型轻微同步，嘴型自然。?/g, "")
        .replace(/对白嘴型自然。?/g, "")
        .replace(/lip-sync\s*active\.?/gi, "")
        .replace(/natural mouth movement[^\n,]*/gi, "")
        .replace(/subtle lip sync[^\n,]*/gi, "");
      warnings.push("vendor_strip_lip_no_native_audio");
    }
  }

  const bucketKey =
    packId === "seedance"
      ? "seedance"
      : packId === "wan"
        ? "wan"
        : packId === "klingai"
          ? "klingai"
          : packId === "minimax"
            ? "minimax"
            : packId === "vidu"
              ? "vidu"
              : packId === "agnesai"
                ? "agnesai"
                : "default";
  const snap = snapDurationToVendorMap(input.duration, VENDOR_DURATION_BUCKETS[bucketKey] ?? VENDOR_DURATION_BUCKETS.default, {
    lipMin: input.lipMin,
  });
  if (snap.warning) warnings.push(snap.warning);

  let audio = input.audio;
  const nativeAudio = input.nativeAudio !== false && packId !== "klingai" && packId !== "minimax";
  if (audio && !nativeAudio) {
    warnings.push("vendor_no_native_audio");
    // Keep prompt lip guidance; API audio may still be forced false by caller
  }

  return {
    prompt: prompt.replace(/\n{3,}/g, "\n\n").trim(),
    duration: snap.duration,
    audio: nativeAudio ? audio : false,
    warnings,
    packId,
  };
}

export function enhanceVendorCapability(vendorId?: string | null): VendorCapability & {
  nativeAudio: boolean;
  nativeExpression: boolean;
  durationBuckets: number[];
} {
  const key = String(vendorId ?? "agnesai").toLowerCase().replace(/[^a-z0-9]/g, "");
  const nativeAudio = !/kling|minimax/.test(key);
  const durationBuckets =
    VENDOR_DURATION_BUCKETS[key.includes("seedance") || key.includes("volc") ? "seedance" : key.includes("kling") ? "klingai" : key.includes("wan") ? "wan" : key.includes("minimax") ? "minimax" : key.includes("agnes") ? "agnesai" : "default"] ??
    VENDOR_DURATION_BUCKETS.default;
  return {
    vendorId: vendorId ?? "agnesai",
    controllable: ["duration", "audio", "resolution", "mode", "aspectRatio", "referenceCount"],
    textOnly: ["shotSize", "camera", "microExpr", "emotion", "colorTemp", "fx", "spatial"],
    nativeAudio,
    nativeExpression: false,
    durationBuckets,
  };
}

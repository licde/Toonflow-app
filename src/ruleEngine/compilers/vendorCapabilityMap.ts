/**
 * Per-vendor video capability map. Agnes is the default; others override diffs only.
 */
import type { VendorCapability } from "./shotVendorBridge";
import { DEFAULT_VIDEO_CAPABILITY } from "./shotVendorBridge";
import { enhanceVendorCapability, VENDOR_DURATION_BUCKETS } from "../vendor-packs/videoVendorPack";

export type VendorCapabilityEx = VendorCapability & {
  nativeAudio?: boolean;
  durationBuckets?: number[];
};

const AGNES_CAPABILITY: VendorCapabilityEx = {
  vendorId: "agnesai",
  controllable: ["duration", "audio", "resolution", "mode", "aspectRatio", "referenceCount"],
  textOnly: ["shotSize", "camera", "microExpr", "emotion", "colorTemp", "fx", "spatial"],
  nativeAudio: true,
  durationBuckets: VENDOR_DURATION_BUCKETS.agnesai,
};

/** Diffs relative to Agnes default — only list when different. */
const VENDOR_OVERRIDES: Record<string, Partial<VendorCapabilityEx>> = {
  agnesai: AGNES_CAPABILITY,
  agnes: AGNES_CAPABILITY,
  klingai: {
    vendorId: "klingai",
    nativeAudio: false,
    durationBuckets: VENDOR_DURATION_BUCKETS.klingai,
  },
  minimax: {
    vendorId: "minimax",
    nativeAudio: false,
    durationBuckets: VENDOR_DURATION_BUCKETS.minimax,
  },
  vidu: {
    vendorId: "vidu",
    nativeAudio: true,
    durationBuckets: VENDOR_DURATION_BUCKETS.vidu,
  },
  volcengine: {
    vendorId: "volcengine",
    nativeAudio: true,
    durationBuckets: VENDOR_DURATION_BUCKETS.volcengine,
  },
  seedance: {
    vendorId: "seedance",
    nativeAudio: true,
    durationBuckets: VENDOR_DURATION_BUCKETS.seedance,
  },
  wan: {
    vendorId: "wan",
    nativeAudio: true,
    durationBuckets: VENDOR_DURATION_BUCKETS.wan,
  },
  grsai: {
    vendorId: "grsai",
  },
};

export function resolveVendorCapability(vendorId?: string | null): VendorCapabilityEx {
  const key = String(vendorId ?? "agnesai")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  const enhanced = enhanceVendorCapability(vendorId);
  const hit =
    VENDOR_OVERRIDES[key] ||
    VENDOR_OVERRIDES[key.replace(/ai$/, "")] ||
    (key.includes("agnes")
      ? AGNES_CAPABILITY
      : key.includes("kling")
        ? VENDOR_OVERRIDES.klingai
        : key.includes("seedance") || key.includes("volc")
          ? VENDOR_OVERRIDES.volcengine
          : key.includes("wan")
            ? VENDOR_OVERRIDES.wan
            : key.includes("minimax")
              ? VENDOR_OVERRIDES.minimax
              : undefined);
  if (!hit) {
    return {
      ...DEFAULT_VIDEO_CAPABILITY,
      vendorId: vendorId ?? "agnesai",
      nativeAudio: enhanced.nativeAudio,
      durationBuckets: enhanced.durationBuckets,
    };
  }
  return {
    vendorId: hit.vendorId ?? vendorId ?? "agnesai",
    controllable: hit.controllable ?? AGNES_CAPABILITY.controllable,
    textOnly: hit.textOnly ?? AGNES_CAPABILITY.textOnly,
    nativeAudio: hit.nativeAudio ?? enhanced.nativeAudio,
    durationBuckets: hit.durationBuckets ?? enhanced.durationBuckets,
  };
}

/** Infer vendor from model string like "agnesai:xxx" or "klingai:..." */
export function vendorIdFromModel(model?: string): string {
  if (!model) return "agnesai";
  const m = String(model).split(/[:/]/)[0]?.toLowerCase() ?? "agnesai";
  return m || "agnesai";
}

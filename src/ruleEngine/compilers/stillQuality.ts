/**
 * Storyboard still quality SSOT — IMG-STILL-QA gate (plan M1 / v4 / HQ enrich).
 */
export type StillQuality = "missing" | "weak" | "hq_ok";

/** English fragment (kept for vendor bilingual). */
export const STILL_HQ_COMPOSITION_CONTRACT =
  "vertical 9:16 safe area, power blocking, clear face toward camera, subject not cropped, high detail composition for video first frame";

/** Chinese + English first-frame recipe for hq_update. */
export const STILL_HQ_FIRST_FRAME_RECIPE_ZH_EN =
  "竖屏9:16安全区构图，权力位站位清晰，正脸朝向镜头且主体不裁切，高细节视频首帧；微表情落在锁定脸型上，禁止重塑五官身份。" +
  " " +
  STILL_HQ_COMPOSITION_CONTRACT +
  "; face identity from character refs, environment from scene refs, do not blend faces into background";

export interface StillQualityMeta {
  stillQuality: StillQuality;
  stillQualityAt?: string;
  compositionContractApplied?: boolean;
  qualityMode?: "hq_update" | "draft" | string;
  composeSources?: string[];
  promptUsed?: string;
  videoStale?: boolean;
  healLogTail?: string;
  resolvedQuality?: string;
  /** still prompt lifecycle */
  promptState?: "empty" | "dirty" | "composed" | "refined" | "fidelity" | "stale" | "hq_ok";
  composeMode?: "full" | "refine" | "fidelity" | string;
  composeHash?: string;
  composedAt?: string;
  entityAnchors?: string[];
  /** L1 visual fidelity pass timestamp */
  visualPassAt?: string;
  visualPass?: boolean;
  fidelityItems?: Array<{ id: string; pass: boolean; evidence?: string }>;
  literaryChars?: number;
  collapsed?: boolean;
  autoHealed?: string[];
  pipelineVersion?: string;
  /** keep/upload path — must not forge visualPass */
  keepPath?: boolean;
  fidelityStopReason?: string;
  audioPass?: boolean;
  audioPassAt?: string;
  videoPass?: boolean;
  videoPassAt?: string;
}

export function stillQualityAllowsBurn(q?: StillQuality | null): boolean {
  return q === "hq_ok";
}

/**
 * Burn gate: only persisted meta.stillQuality === hq_ok counts.
 * Request-time qualityMode must NOT grant burn (G7).
 */
export function inferStillQuality(input: {
  filePath?: string | null;
  imageId?: number | null;
  meta?: Partial<StillQualityMeta> | null;
  /** @deprecated ignored for hq_ok — kept for call-site compat */
  qualityMode?: string | null;
  /** When true (default), hq_ok without visualPassAt degrades to weak */
  requireVisualPass?: boolean;
}): StillQuality {
  if (input.meta?.stillQuality === "missing") return "missing";
  if (input.meta?.stillQuality === "weak") return "weak";
  if (input.meta?.stillQuality === "hq_ok") {
    const requireVp = input.requireVisualPass !== false;
    if (requireVp && !input.meta.visualPassAt && input.meta.visualPass !== true) {
      return "weak";
    }
    return "hq_ok";
  }
  const hasFile = Boolean(input.filePath || input.imageId);
  return hasFile ? "weak" : "missing";
}

/**
 * Mark hq_ok only when visualPass is proven.
 * Does NOT invent visualPassAt — keep/upload paths must pass L1 or stay weak.
 */
export function markHqOk(meta?: Partial<StillQualityMeta> | null): StillQualityMeta {
  const now = new Date().toISOString();
  const hasVisualPass = meta?.visualPass === true || Boolean(meta?.visualPassAt);
  if (!hasVisualPass) {
    return {
      ...(meta ?? {}),
      stillQuality: "weak",
      stillQualityAt: now,
      compositionContractApplied: Boolean(meta?.compositionContractApplied),
      qualityMode: meta?.qualityMode ?? "hq_update",
      videoStale: meta?.videoStale ?? false,
      promptState: meta?.promptState ?? "composed",
      visualPass: false,
      visualPassAt: undefined,
    };
  }
  return {
    ...(meta ?? {}),
    stillQuality: "hq_ok",
    stillQualityAt: now,
    compositionContractApplied: true,
    qualityMode: "hq_update",
    videoStale: false,
    promptState: "hq_ok",
    visualPass: true,
    visualPassAt: meta?.visualPassAt ?? now,
  };
}

/** Explicit keep/upload: never forge visualPass; force weak unless caller already has L1. */
export function markKeepStill(meta?: Partial<StillQualityMeta> | null): StillQualityMeta {
  const now = new Date().toISOString();
  const hasVisualPass = meta?.visualPass === true && Boolean(meta?.visualPassAt);
  if (hasVisualPass) {
    return markHqOk(meta);
  }
  return {
    ...(meta ?? {}),
    stillQuality: "weak",
    stillQualityAt: now,
    qualityMode: "hq_update",
    visualPass: false,
    visualPassAt: undefined,
    promptState: "composed",
    keepPath: true,
  } as StillQualityMeta;
}

export function invalidateStillQuality(meta?: Partial<StillQualityMeta> | null): StillQualityMeta {
  return {
    ...(meta ?? {}),
    stillQuality: "weak",
    stillQualityAt: new Date().toISOString(),
    compositionContractApplied: false,
    promptState: "stale",
  };
}

export function markVideoStale(meta?: Partial<StillQualityMeta> | null): StillQualityMeta {
  return {
    ...(meta ?? {}),
    stillQuality: meta?.stillQuality ?? "hq_ok",
    videoStale: true,
    stillQualityAt: new Date().toISOString(),
  };
}

export function parseStillMetaFromReason(reason: unknown): Partial<StillQualityMeta> | null {
  if (reason == null) return null;
  try {
    const obj = typeof reason === "string" ? JSON.parse(reason) : reason;
    if (!obj || typeof obj !== "object") return null;
    return obj as Partial<StillQualityMeta>;
  } catch {
    return null;
  }
}

export function mergeReasonMeta(existingReason: unknown, patch: Record<string, unknown>): string {
  const prev = parseStillMetaFromReason(existingReason) ?? {};
  return JSON.stringify({ ...prev, ...patch });
}

export function resolveImageQualityAnchor(requested: string, projectQuality?: string | null): string {
  const rank = (q: string) => (q === "4K" ? 3 : q === "2K" ? 2 : 1);
  const req = requested || "1K";
  const proj = projectQuality || "1K";
  return rank(proj) > rank(req) ? proj : req;
}

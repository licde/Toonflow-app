/**
 * Storyboard still quality SSOT — IMG-STILL-QA gate (plan M1 / v4 / HQ enrich).
 */
export type StillQuality = "missing" | "weak" | "hq_ok";

/** Chinese first-frame recipe for hq_update (no English duplicate — egress strips EN). */
export const STILL_HQ_COMPOSITION_CONTRACT =
  "vertical 9:16 safe area, power blocking, clear face toward camera, subject not cropped, high detail composition for video first frame";

export const STILL_HQ_FIRST_FRAME_RECIPE_ZH_EN =
  "竖屏9:16安全区构图，正脸朝向镜头且主体不裁切，高细节视频首帧；微表情落在锁定脸型上，禁止重塑五官身份。";

export interface StillQualityMeta {
  stillQuality: StillQuality;
  stillQualityAt?: string;
  compositionContractApplied?: boolean;
  qualityMode?: "hq_update" | "draft" | string;
  composeSources?: string[];
  promptUsed?: string;
  /** Actuator-compressed bytes when different from promptUsed */
  vendorPromptUsed?: string;
  /** Alias of literaryDescHash for ingress forceFull parity */
  literaryHash?: string;
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
  /** Recipe policy self-heal ids (still_recipe_policy egress) */
  recipeHeals?: string[];
  /** literary visualDescription hash at compose time — desc change → stale */
  literaryDescHash?: string;
  /** M7: VD+dialogue+duration design fingerprint at video/still compile — drift → recompile */
  designContentHash?: string;
  dialogueFingerprint?: string;
  /** Literary primary effects L0+L1 (no Comfy / no Key) */
  literaryEffectsQualified?: boolean;
  missingEffects?: Array<string | { id?: string; tier?: string; bar?: string; reason?: string }>;
  localPoseSignals?: Record<string, unknown>;
  repairInjectLines?: string[];
  repairDeltaHints?: string[];
  videoMotionStartHint?: string;
  literaryCtaLabel?: string;
  /** keep/upload path — must not forge visualPass */
  keepPath?: boolean;
  fidelityStopReason?: string;
  /** VLM single_frame fail / collage leak — burn must treat as weak */
  sheetLeak?: boolean;
  pendingHumanRejudge?: boolean;
  vlmError?: string;
  audioPass?: boolean;
  audioPassAt?: string;
  videoPass?: boolean;
  videoPassAt?: string;
  generationContract?: Record<string, unknown>;
  contractVersion?: string;
  contractHash?: string;
  evidenceBoundHash?: string;
  i2vReady?: boolean;
  i2vBlockReason?: string;
  autoRepairStage?: string;
  autoRepairRound?: number;
  autoRepairBudgetLeft?: number;
  handoffReason?: string;
  /** VD/shotDesign changed — FE should rebuild flow / not reuse stale flowId soup */
  flowStaleHint?: boolean;
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
    visualPass: false,
    visualPassAt: undefined,
    // VD / shotDesign change → old compose hash / egress soup must not refine
    composeHash: undefined,
    literaryDescHash: undefined,
    literaryHash: undefined,
    flowStaleHint: true,
  };
}

/**
 * When visualDescription changes vs last compose hash, mark still/prompt stale (cannot burn old still).
 */
export function markStillStaleOnDescChange(
  meta: Partial<StillQualityMeta> | null | undefined,
  currentLiteraryDesc: string | null | undefined,
): StillQualityMeta | null {
  const desc = String(currentLiteraryDesc ?? "").trim();
  if (!desc || !meta?.literaryDescHash) return null;
  let h = 2166136261;
  const s = desc.replace(/\s+/g, "");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const nowHash = (h >>> 0).toString(16);
  if (nowHash === meta.literaryDescHash) return null;
  return invalidateStillQuality({ ...meta, videoStale: true });
}

/**
 * M7: VD/dialogue/duration designContentHash drift → videoStale (must recompile before burn).
 */
export function markVideoStaleOnDesignContentChange(
  meta: Partial<StillQualityMeta> | null | undefined,
  currentDesignContentHash: string | null | undefined,
): StillQualityMeta | null {
  const now = String(currentDesignContentHash ?? "").trim();
  const prev = String(meta?.designContentHash ?? "").trim();
  if (!now || !prev || now === prev) return null;
  return {
    ...(meta ?? {}),
    stillQuality: meta?.stillQuality ?? "hq_ok",
    videoStale: true,
    promptState: "stale",
    stillQualityAt: new Date().toISOString(),
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
    if (typeof reason === "string") {
      const s = reason.trim();
      if (!s) return null;
      if (!s.startsWith("{")) return { message: s } as Partial<StillQualityMeta> & { message: string };
      const obj = JSON.parse(s);
      if (!obj || typeof obj !== "object") return null;
      return obj as Partial<StillQualityMeta>;
    }
    if (typeof reason === "object") return reason as Partial<StillQualityMeta>;
    return null;
  } catch {
    return typeof reason === "string" && reason.trim()
      ? ({ message: String(reason) } as Partial<StillQualityMeta> & { message: string })
      : null;
  }
}

export function mergeReasonMeta(existingReason: unknown, patch: Record<string, unknown>): string {
  let prev: Record<string, unknown> = {};
  try {
    if (typeof existingReason === "string") {
      const s = existingReason.trim();
      if (!s) prev = {};
      else if (s.startsWith("{")) prev = JSON.parse(s);
      else prev = { message: s };
    } else if (existingReason && typeof existingReason === "object") {
      prev = { ...(existingReason as Record<string, unknown>) };
    }
  } catch {
    prev =
      typeof existingReason === "string" && existingReason.trim()
        ? { message: String(existingReason) }
        : {};
  }
  return JSON.stringify({ ...prev, ...patch });
}

/** API hydrate: FE reload / poll must see stillQuality (state「已完成」≠ hq_ok). */
export function stillApiFieldsFromReason(reason: unknown): {
  stillQuality?: string;
  visualPass?: boolean;
  sheetLeak?: boolean;
  ctaLabel?: string;
  userMessage?: string;
  primaryNextStep?: string;
  stateHint?: "weak_keep" | "ok";
  /** Vendor egress — FE「实际出图词」; edit surface stays o_storyboard.prompt */
  promptUsed?: string;
  vendorPromptUsed?: string;
} {
  const meta = parseStillMetaFromReason(reason);
  if (!meta) return {};
  const stillQuality = meta.stillQuality as string | undefined;
  const visualPass = meta.visualPass as boolean | undefined;
  const stateHint =
    stillQuality === "weak"
      ? ("weak_keep" as const)
      : stillQuality === "hq_ok" && visualPass === true
        ? ("ok" as const)
        : undefined;
  return {
    stillQuality,
    visualPass,
    sheetLeak: meta.sheetLeak as boolean | undefined,
    ctaLabel:
      (meta.ctaLabel as string | undefined) ||
      (stillQuality === "weak" ? "智能修复" : undefined),
    userMessage:
      (meta.userMessage as string | undefined) ||
      (stillQuality === "weak" ? "弱图不可作视频首帧 — 请点「智能修复」重出 HQ 静照" : undefined),
    primaryNextStep: (meta.primaryNextStep ??
      (meta as { nextStep?: string }).nextStep ??
      (stillQuality === "weak" ? "regen_storyboard_hq" : undefined)) as string | undefined,
    stateHint,
    promptUsed: meta.promptUsed ? String(meta.promptUsed).slice(0, 2000) : undefined,
    vendorPromptUsed: meta.vendorPromptUsed
      ? String(meta.vendorPromptUsed).slice(0, 2000)
      : undefined,
  };
}

/** Hard pixel ids — human rejudge cannot hq_ok / 可燃片 while any fail or sheetLeak uncleared */
const HUMAN_REJUDGE_HARD_PIXEL =
  /single_frame|cast_cardinality|background_readable|contact_geom|primary_look/i;

export function resolveStillHumanRejudgeOutcome(input: {
  items: Array<{ id: string; pass: boolean }>;
  prev?: Partial<StillQualityMeta> | null;
  modality?: "still" | "audio";
}): {
  allPass: boolean;
  burnOk: boolean;
  stillQuality: StillQuality;
  visualPass: boolean;
  sheetLeak: boolean;
  ctaLabel: string;
  userMessage: string;
  humanOverride?: "vlm_infra" | "human_checklist";
  infraOverride: boolean;
} {
  const modality = input.modality ?? "still";
  const allPass = input.items.every((i) => i.pass);
  const hardFail = input.items.some(
    (i) => HUMAN_REJUDGE_HARD_PIXEL.test(i.id) && !i.pass,
  );
  const prevSheet = Boolean(input.prev?.sheetLeak);
  const sheetCleared = input.items.some(
    (i) => /single_frame/i.test(i.id) && i.pass,
  );
  const sheetLeak = prevSheet && !sheetCleared;
  const infraOverride =
    input.prev?.pendingHumanRejudge === true ||
    /VLM_API_KEY_MISSING|vlm_error|vlm_infra/i.test(String((input.prev as { vlmError?: string } | null)?.vlmError ?? ""));
  const hasBgItem = input.items.some((i) => /background_readable/i.test(i.id));
  const bgFail = input.items.some((i) => /background_readable/i.test(i.id) && !i.pass);
  // Gray studio: missing background_readable checklist item cannot stamp hq_ok (V5_FLOW_IMPL_GAPS)
  const grayStudioBlock =
    modality !== "audio" &&
    (!hasBgItem || bgFail || Boolean((input.prev as { grayStudio?: boolean } | null)?.grayStudio));
  const burnOk =
    modality === "audio"
      ? allPass
      : allPass && !hardFail && !sheetLeak && !grayStudioBlock;
  if (modality === "audio") {
    return {
      allPass,
      burnOk,
      stillQuality: (input.prev?.stillQuality as StillQuality) ?? "weak",
      visualPass: Boolean(input.prev?.visualPass),
      sheetLeak: prevSheet,
      ctaLabel: allPass ? "可燃片" : "继续修复",
      userMessage: allPass ? "人工改判已写入语料" : "人工改判已写入语料（未全过）",
      humanOverride: allPass ? "human_checklist" : undefined,
      infraOverride,
    };
  }
  return {
    allPass,
    burnOk,
    stillQuality: burnOk ? "hq_ok" : "weak",
    visualPass: burnOk,
    sheetLeak: sheetLeak || hardFail && input.items.some((i) => /single_frame/i.test(i.id) && !i.pass),
    ctaLabel: burnOk ? "可燃片" : grayStudioBlock ? "补灰棚检测后重审" : "继续修复",
    userMessage: burnOk
      ? infraOverride
        ? "人工改判已通过（VLM 基建覆盖）；可燃片，审计见 humanOverride"
        : "人工改判已写入语料"
      : grayStudioBlock
        ? "人审禁止在缺 background_readable / 灰棚未测时直接 hq_ok；弱图不可作视频首帧"
        : hardFail || sheetLeak
          ? "人工改判未过拼版/人数/灰棚硬项；弱图不可作视频首帧"
          : "人工改判已写入语料（未全过）",
    humanOverride: burnOk ? (infraOverride ? "vlm_infra" : "human_checklist") : undefined,
    infraOverride,
  };
}

export function resolveImageQualityAnchor(requested: string, projectQuality?: string | null): string {
  const rank = (q: string) => (q === "4K" ? 3 : q === "2K" ? 2 : 1);
  const req = requested || "1K";
  const proj = projectQuality || "1K";
  return rank(proj) > rank(req) ? proj : req;
}

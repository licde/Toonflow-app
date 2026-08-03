/**
 * Shootable-first architecture SSOT — IntentGraph / ComposeProfile /
 * RepairAsDesignPlan / DeliveryTier / vendor capability reverse.
 * Repair ≡ design writeback; never blocks generate except true unshootable.
 *
 * Non-block contract (still visual + first-frame):
 * - Generate/试拍: never HTTP-reject on contract debt → debt + heal + deliveryTier.
 * - Burn / I2V inherit: may gate on draft/weak/contamination (homologous regen still).
 * - LLM AV enhance: L2/L3 only after Seal L0; never reseal occupancy/subject.
 */
export type IntentGraphEdgeKind = "beat_seq" | "prop_cont" | "xor_mutex" | "look_cont";

export type IntentGraphEdge = {
  kind: IntentGraphEdgeKind;
  fromShotKey: string;
  toShotKey: string;
  note?: string;
};

export type IntentGraph = {
  version: "1";
  edges: IntentGraphEdge[];
  suggestedDeliveryTier?: DeliveryTier;
};

export type ComposeProfile = "lean" | "hq";

export type DeliveryTier = "draft" | "preview" | "burn";

export type RepairWriteSlot =
  | "visualDescription"
  | "microExpression"
  | "propPose"
  | "dialogueCoverage"
  | "audioCue"
  | "sfx"
  | "fxPrompt"
  | "avCausality"
  | "shotSize"
  | "contactRoleXor"
  | "woundVisible"
  | "propReadable"
  | "contactStruct"
  | "gripStruct"
  | "groundOrPathStruct"
  | "surfaceStruct"
  | "thresholdStruct";

export type RepairAsDesignWrite = {
  slot: RepairWriteSlot | string;
  value: string;
  reason?: string;
};

export type RepairAsDesignPlan = {
  version: "1";
  writes: RepairAsDesignWrite[];
  regenAfterWrite: boolean;
  /** Always false except empty VD / missing identity / vendor down */
  blocksGenerate: false;
  blocksBurn: boolean;
  vendorConstraint?: string;
  budgetRound?: number;
  budgetLeft?: number;
};

export type VendorCapabilityProfile = {
  id: "seedream_multiref" | "comfy_contact_softenv" | "audio_compile" | "video_i2v" | string;
  maxPromptChars?: number;
  contactGeomReliable: boolean;
  softEnvReliable: boolean;
  allowsDualContactSingleFrame: boolean;
  notes?: string[];
};

export const VENDOR_CAPABILITY_MATRIX: VendorCapabilityProfile[] = [
  {
    id: "seedream_multiref",
    maxPromptChars: 720,
    contactGeomReliable: false,
    softEnvReliable: true,
    allowsDualContactSingleFrame: false,
    notes: ["一境一拍 lean 短中文", "接触镜可试拍不承诺一次 hq"],
  },
  {
    id: "comfy_contact_softenv",
    maxPromptChars: 1200,
    contactGeomReliable: true,
    softEnvReliable: true,
    allowsDualContactSingleFrame: false,
    notes: ["接触+softEnv 优选", "不可用时降级 Seedream 不灰按钮"],
  },
  {
    id: "audio_compile",
    contactGeomReliable: true,
    softEnvReliable: true,
    allowsDualContactSingleFrame: true,
    notes: ["sfx 与场景一致；contact 用 vocab sfxHint"],
  },
  {
    id: "video_i2v",
    contactGeomReliable: false,
    softEnvReliable: true,
    allowsDualContactSingleFrame: false,
    notes: ["烧片要 hq_ok；草稿轨可弱首帧"],
  },
];

export function resolveVendorCapability(
  actuatorId?: string | null,
): VendorCapabilityProfile {
  const id = String(actuatorId ?? "seedream_multiref");
  return (
    VENDOR_CAPABILITY_MATRIX.find((v) => v.id === id) ??
    VENDOR_CAPABILITY_MATRIX[0]!
  );
}

/** True unshootable — only these may hard-block generate. */
export function isTrulyUnshootable(input: {
  visualDescription?: string | null;
  hasIdentityRef?: boolean | null;
  vendorAvailable?: boolean | null;
}): { unshootable: boolean; reason?: string } {
  const vd = String(input.visualDescription ?? "").trim();
  if (vd.length < 4) return { unshootable: true, reason: "empty_vd" };
  if (input.hasIdentityRef === false) return { unshootable: true, reason: "missing_identity" };
  if (input.vendorAvailable === false) return { unshootable: true, reason: "vendor_down" };
  return { unshootable: false };
}

/**
 * Face-budget conflict is shootable debt (Confirm split), not true-unshootable.
 * Re-exports assessFaceBudget for IRD / qualityDecision homology.
 */
export function assessShootableFaceBudget(
  input: Parameters<typeof import("../compilers/faceBudgetPolicy").assessFaceBudget>[0],
): ReturnType<typeof import("../compilers/faceBudgetPolicy").assessFaceBudget> {
  const { assessFaceBudget } =
    require("../compilers/faceBudgetPolicy") as typeof import("../compilers/faceBudgetPolicy");
  return assessFaceBudget(input);
}

export function buildRepairAsDesignPlan(input: {
  writes: RepairAsDesignWrite[];
  blocksBurn?: boolean;
  vendorConstraint?: string;
  budgetRound?: number;
  budgetLeft?: number;
}): RepairAsDesignPlan {
  return {
    version: "1",
    writes: input.writes,
    regenAfterWrite: true,
    blocksGenerate: false,
    blocksBurn: Boolean(input.blocksBurn),
    vendorConstraint: input.vendorConstraint,
    budgetRound: input.budgetRound,
    budgetLeft: input.budgetLeft,
  };
}

/** Slim dual-contact VD to cheek-only for shootable-first (design repair, not gate). */
export function slimVdForShootable(vd: string): { vd: string; slimmed: boolean; suggestedSplit: boolean } {
  const raw = String(vd ?? "").trim();
  const dual =
    /划过|贴颊|颊触|纸角|贴合/.test(raw) && /咬|渗血|血珠|紧咬/.test(raw);
  if (!dual) return { vd: raw, slimmed: false, suggestedSplit: false };
  let next = raw
    .replace(/[，,]?\s*她?紧咬下唇[^。；;]*/g, "")
    .replace(/[，,]?\s*紧咬下唇[^。；;]*/g, "")
    .replace(/[，,]?\s*渗出血珠[^。；;]*/g, "")
    .replace(/[，,]?\s*咬唇[^。；;]*/g, "")
    .replace(/。。+/g, "。")
    .replace(/，+/g, "，")
    .trim();
  if (!/纸未入口|仅颊触/.test(next)) next = `${next}${next.endsWith("。") ? "" : "。"}纸未入口；仅颊触非口含。`;
  return { vd: next.slice(0, 220), slimmed: next !== raw, suggestedSplit: true };
}

export type StillCtaKind =
  | "generate"
  | "enhance_and_generate"
  | "split_and_generate"
  | "continue_repair"
  | "burn_ready"
  | "configure_vendor"
  | "enqueue_identity"
  | "enqueue_identity_and_generate";

/** Shared Chat/Web CTA resolver — never gray generate for contract debt. */
export function resolveStillPrimaryCta(meta: {
  primaryNextStep?: string | null;
  irdPrimaryAction?: string | null;
  stillQuality?: string | null;
  visualPass?: boolean | null;
  deliveryTier?: DeliveryTier | null;
  keyOptional?: boolean;
  pixelDimStatus?: string | null;
  missingIdentity?: boolean;
  debtKind?: string | null;
  /** contact_zombie | plate_geometry | off_beat_cu | … — never blocks generate */
  contaminationClass?: string | null;
}): { kind: StillCtaKind; label: string; blocksGenerate: boolean } {
  if (meta.missingIdentity || meta.debtKind === "missing_identity") {
    return { kind: "enqueue_identity_and_generate", label: "补定妆并继续生成", blocksGenerate: false };
  }
  if (meta.debtKind === "prompt_fidelity") {
    return { kind: "enhance_and_generate", label: "增强锚点并生成", blocksGenerate: false };
  }
  const contam = String(meta.contaminationClass ?? "").trim();
  if (contam && contam !== "none") {
    const labelByClass: Record<string, string> = {
      off_beat_cu: "本拍隔离重出",
      contact_zombie: "重出动作主导静帧",
      locus_mangled: "重出动作主导静帧",
      plate_geometry: "挂真道具板后重出",
      glyph_identity: "挂真道具板后重出",
    };
    return {
      kind: "continue_repair",
      label: labelByClass[contam] ?? "继续生成修复",
      blocksGenerate: false,
    };
  }
  if (
    meta.debtKind === "contact_zombie" ||
    meta.debtKind === "plate_geometry" ||
    meta.debtKind === "action_misfire" ||
    meta.debtKind === "locus_mangled"
  ) {
    return {
      kind: "continue_repair",
      label:
        meta.debtKind === "plate_geometry"
          ? "挂真道具板后重出"
          : meta.debtKind === "action_misfire"
            ? "重出动作主导静帧"
            : "继续生成修复",
      blocksGenerate: false,
    };
  }
  if (meta.stillQuality === "hq_ok" && meta.visualPass === true) {
    return { kind: "burn_ready", label: "可烧视频", blocksGenerate: false };
  }
  const step = String(meta.primaryNextStep ?? "");
  const ird = String(meta.irdPrimaryAction ?? "");
  if (ird === "confirm_split" || step === "split_shot") {
    return { kind: "split_and_generate", label: "智拆并生成", blocksGenerate: false };
  }
  if (
    ird === "confirm_enhance" ||
    ird === "apply_auto_enhance" ||
    step === "chat_repair"
  ) {
    return { kind: "enhance_and_generate", label: "增强设计并生成", blocksGenerate: false };
  }
  if (
    step === "regen_storyboard_hq" ||
    step === "retry_shot" ||
    step === "batch_still" ||
    meta.pixelDimStatus === "unmeasured" ||
    meta.keyOptional
  ) {
    return { kind: "continue_repair", label: "继续生成修复", blocksGenerate: false };
  }
  return { kind: "generate", label: "生成静帧", blocksGenerate: false };
}

export function deliveryTierFromStill(meta: {
  stillQuality?: string | null;
  visualPass?: boolean | null;
}): DeliveryTier {
  if (meta.stillQuality === "hq_ok" && meta.visualPass === true) return "burn";
  if (meta.stillQuality === "weak" || meta.stillQuality === "hq_ok") return "preview";
  return "draft";
}

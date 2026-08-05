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
    contactGeomReliable: true,
    softEnvReliable: true,
    allowsDualContactSingleFrame: false,
    notes: [
      "默认全目标 Seedream（含接触）",
      "EN 7 字段 vendor；对白/可读字中文引号",
      "多参考≤20 角色有序；缺槽只治愈不阻断",
    ],
  },
  {
    id: "comfy_contact_softenv",
    maxPromptChars: 1200,
    contactGeomReliable: true,
    softEnvReliable: true,
    allowsDualContactSingleFrame: false,
    notes: ["仅 forceComfy 实验", "默认关闭；不作为接触失败归因"],
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
  | "realization_soft"
  | "one_click_heal"
  | "burn_ready"
  | "configure_vendor"
  | "enqueue_identity"
  | "enqueue_identity_and_generate";

function sealedSsotOk(meta: {
  stillPhase?: string | null;
  composeSources?: string[] | null;
  ssotSealed?: boolean | null;
}): boolean {
  if (meta.ssotSealed === true) return true;
  if (String(meta.stillPhase ?? "").trim()) return true;
  const src = meta.composeSources ?? [];
  return src.some((s) => /ff\.ssot_only_egress|ssot\.phase/.test(String(s)));
}

/** Export for finalize/batch — detect sole-spine seal from composed sources. */
export function isStillSsotSealed(meta: {
  stillPhase?: string | null;
  composeSources?: string[] | null;
  ssotSealed?: boolean | null;
  sources?: string[] | null;
}): boolean {
  return sealedSsotOk({
    stillPhase: meta.stillPhase,
    composeSources: meta.composeSources ?? meta.sources,
    ssotSealed: meta.ssotSealed,
  });
}

/** Sealed weak still: never let lit「补场景软板」masquerade as design rewrite. */
export function sealedRealizationCtaLabel(opts?: {
  keyUnmeasured?: boolean;
  refInterference?: boolean;
}): string {
  if (opts?.keyUnmeasured) return "继续生成（密封OK·像素未测）";
  if (opts?.refInterference) return "减冲突增强后重出（设计已密封）";
  return "减冲突增强后重出（设计已密封）";
}

export function sealedRealizationUserMessage(opts?: {
  keyUnmeasured?: boolean;
  refInterference?: boolean;
}): string {
  const bits = ["设计已密封（SSOT egress）"];
  if (opts?.refInterference) bits.push("参考可能干扰构图（identity/prop/softEnv）");
  if (opts?.keyUnmeasured) bits.push("像素未测（Key 可选，非失败）");
  bits.push("请减冲突增强或同词再出；非须重开设计");
  return bits.join("；");
}

function plateOrRealizationDebt(meta: {
  debtKind?: string | null;
  contaminationClass?: string | null;
  realizationDegraded?: boolean | null;
}): boolean {
  const d = String(meta.debtKind ?? "");
  const c = String(meta.contaminationClass ?? "");
  if (meta.realizationDegraded === true) return true;
  if (/prop_plate|plate_geometry|glyph_identity|contamination|action_misfire|locus_mangled|contact_zombie/.test(d))
    return true;
  if (c && c !== "none" && /plate_geometry|glyph_identity|contact_zombie|locus_mangled|off_beat_cu/.test(c))
    return true;
  return false;
}

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
  stillPhase?: string | null;
  composeSources?: string[] | null;
  ssotSealed?: boolean | null;
  realizationDegraded?: boolean | null;
  oneClickRepairKind?: string | null;
}): { kind: StillCtaKind; label: string; blocksGenerate: boolean } {
  if (meta.missingIdentity || meta.debtKind === "missing_identity") {
    return { kind: "enqueue_identity_and_generate", label: "补定妆并继续生成", blocksGenerate: false };
  }
  // Homologous one-click heal (shotSize/split/图N) — never blocks
  const ock = String(meta.oneClickRepairKind ?? "");
  if (ock === "design_refine") {
    return { kind: "enhance_and_generate", label: "设计细化·补挂图N资产", blocksGenerate: false };
  }
  if (ock && ock !== "none" && ock !== "confirm_required") {
    return {
      kind: "one_click_heal",
      label:
        ock === "split" || ock === "shotSize_and_split"
          ? "一键智拆并生成"
          : ock === "shotSize"
            ? "一键改景别并生成"
            : ock === "partial_edit"
              ? "局部智能修复"
              : ock === "restore_scene"
                ? "一键智能修复·恢复场景板"
                : ock === "rebind_ordinal"
                  ? "一键智能修复·重绑@图N"
                  : ock === "recompile_keep_ordinal"
                    ? "一键智能修复·重编译保留@图N"
                    : ock === "regen_still_then_burn"
                    ? "一键智能修复·先重出静照"
                    : "一键智能修复",
      blocksGenerate: false,
    };
  }
  if (ock === "confirm_required") {
    return { kind: "split_and_generate", label: "确认智拆/改景别后生成", blocksGenerate: false };
  }
  // Sealed SSOT + plate/realization debt → soft realization (not enhance writing VD)
  if (sealedSsotOk(meta) && plateOrRealizationDebt(meta)) {
    return {
      kind: "realization_soft",
      label: "减冲突增强后重出（设计已密封）",
      blocksGenerate: false,
    };
  }
  if (sealedSsotOk(meta) && (meta.keyOptional || meta.pixelDimStatus === "unmeasured")) {
    return {
      kind: "realization_soft",
      label: "继续生成（密封OK·像素未测）",
      blocksGenerate: false,
    };
  }
  if (meta.debtKind === "prompt_fidelity" && !sealedSsotOk(meta)) {
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
      kind: sealedSsotOk(meta) ? "realization_soft" : "continue_repair",
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
      kind: sealedSsotOk(meta) ? "realization_soft" : "continue_repair",
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
  // Sealed OK: never promote chat_repair → enhance VD rewrite
  if (
    (ird === "confirm_enhance" || ird === "apply_auto_enhance" || step === "chat_repair") &&
    !sealedSsotOk(meta)
  ) {
    return { kind: "enhance_and_generate", label: "增强设计并生成", blocksGenerate: false };
  }
  if (step === "chat_repair" && sealedSsotOk(meta)) {
    return { kind: "realization_soft", label: "继续生成修复（设计已密封）", blocksGenerate: false };
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

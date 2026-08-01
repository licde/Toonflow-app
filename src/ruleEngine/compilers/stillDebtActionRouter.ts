/**
 * Unified still debt → action router (compose / HQ / IRD / fidelity / burn homology).
 * Priority: split > XOR soft > slice_cast / single slot > wound > propReadable.
 * Never wash-green face-CU dual contact with soft XOR phrase.
 */
import type { BurnNextStep } from "./burnGateEnvelope";
import { buildPrimaryBlock } from "./primaryBlock";

export type StillDebtKind =
  | "lit_contact_xor"
  | "cast_multi_on_face_cu"
  | "sheet_layout_leak"
  | "contact_prop_missing"
  | "weak_prop"
  | "vlm_key_missing"
  | "none";

export type StillDebtAction =
  | "split_shot"
  | "slice_cast"
  | "drop_scene_ref"
  | "enhance_literary"
  | "regen_prop_still"
  | "stop_fidelity_honest"
  | "pass";

export type StillDebtRouteResult = {
  kind: StillDebtKind;
  action: StillDebtAction;
  primaryNextStep: BurnNextStep;
  ctaLabel: string;
  userMessage: string;
  /** Sources for compose / meta homology */
  sources: string[];
  /** When true, fidelity loop must not burn Edit / i2i on failed collage */
  stopFidelityBurn: boolean;
  missingSlots?: string[];
};

const PRIORITY: StillDebtKind[] = [
  "lit_contact_xor",
  "cast_multi_on_face_cu",
  "sheet_layout_leak",
  "contact_prop_missing",
  "weak_prop",
  // G0: Key annotate last — never preempt structure debt
  "vlm_key_missing",
];

function blockFor(step: BurnNextStep, userMessage: string, sources: string[]): StillDebtRouteResult {
  const primary = buildPrimaryBlock(step, { stage: "prompt", userMessageOverride: userMessage });
  return {
    kind: "none",
    action:
      step === "split_shot"
        ? "split_shot"
        : step === "chat_repair"
          ? "enhance_literary"
          : "pass",
    primaryNextStep: primary.primaryNextStep,
    ctaLabel: primary.ctaLabel ?? "",
    userMessage: primary.userMessage,
    sources,
    stopFidelityBurn: false,
  };
}

/**
 * Route a single shot's literary / visual debt to one actionable next step.
 */
export function routeStillDebtAction(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  promptBlob?: string | null;
  castNames?: string[] | null;
  charCodes?: string[] | null;
  sheetLeak?: boolean | null;
  vlmErrorCode?: string | null;
  vlmError?: string | null;
  /** draft / import soft track → no hard route */
  softTrack?: boolean | null;
  /** Already XOR/onebeat split child — skip dual-contact re-detect */
  litXorSplitId?: string | null;
  stillBeatSplitId?: string | null;
  xorSplit?: boolean | null;
}): StillDebtRouteResult {
  const sources: string[] = ["debt.router"];
  if (input.softTrack) {
    return {
      kind: "none",
      action: "pass",
      primaryNextStep: "batch_still",
      ctaLabel: "",
      userMessage: "",
      sources: [...sources, "debt.softTrack"],
      stopFidelityBurn: false,
    };
  }

  const alreadySplit = Boolean(
    input.litXorSplitId || input.stillBeatSplitId || input.xorSplit,
  );
  if (alreadySplit) sources.push("debt.alreadySplit");

  const err = String(input.vlmErrorCode || input.vlmError || "");
  // G0: do not early-return on Key — structure debt first; Key only annotate if nothing else
  const keyAbsent = /VLM_API_KEY_MISSING|缺少API\s*Key|api\s*key/i.test(err);

  const vd = String(input.visualDescription ?? "").trim();
  const sz = String(input.shotSize ?? "");
  const blob = `${vd}\n${String(input.promptBlob ?? "")}`;

  const detected: StillDebtKind[] = [];

  try {
    const { needsLitContactXorSplit } =
      require("../design/expandLitContactXor") as typeof import("../design/expandLitContactXor");
    // Homology: literaryPrompt may arrive only as promptBlob (repair/Edit paths)
    const xorText = vd.length >= 8 ? vd : String(input.promptBlob ?? "").trim();
    if (
      !alreadySplit &&
      needsLitContactXorSplit({
        visualDescription: xorText,
        shotSize: sz,
        _litXorSplitId: input.litXorSplitId,
        _stillBeatSplitId: input.stillBeatSplitId,
        xorSplit: input.xorSplit,
      })
    ) {
      detected.push("lit_contact_xor");
    }
  } catch {
    /* optional */
  }

  try {
    const { detectCuCastConflict } =
      require("../design/detectCuCastConflict") as typeof import("../design/detectCuCastConflict");
    const cu = detectCuCastConflict({
      shotSize: sz,
      charCodes: input.charCodes ?? [],
      characterNames: input.castNames ?? [],
      visualDescription: vd,
      prompt: blob,
    });
    if (cu.conflict) {
      detected.push("cast_multi_on_face_cu");
    }
  } catch {
    /* optional */
  }

  if (
    input.sheetLeak ||
    /四视图|定妆拼版|多宫格|character\s*sheet|turnaround/i.test(blob)
  ) {
    try {
      const { promptImpliesSheetCollageLeak } =
        require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
      if (input.sheetLeak || promptImpliesSheetCollageLeak(blob)) {
        detected.push("sheet_layout_leak");
      }
    } catch {
      if (input.sheetLeak) detected.push("sheet_layout_leak");
    }
  }

  // Contact-event: prop missing in still prompt / scar-only → must regen prop still (before weak_prop)
  if (!detected.includes("lit_contact_xor") && vd.length >= 8) {
    try {
      const {
        isContactEventVd,
        matchContactEventVd,
        textHasPropInFrame,
        woundVisibleIsNotProp,
      } = require("./contactEventPolicy") as typeof import("./contactEventPolicy");
      if (isContactEventVd(vd)) {
        const m = matchContactEventVd(vd);
        const stillSide = String(input.promptBlob ?? "");
        // Only flag when we have a still blob that lacks prop, or meta-less compose path
        if (
          stillSide.length >= 8 &&
          (!textHasPropInFrame(stillSide, m) || woundVisibleIsNotProp(stillSide))
        ) {
          detected.push("contact_prop_missing");
        } else if (stillSide.length < 8 && !textHasPropInFrame(vd, m)) {
          // VD itself missing readable prop alias after verb — enhance
          detected.push("weak_prop");
        }
      }
    } catch {
      /* optional */
    }
  }

  // weak_prop only when no higher XOR/cast/contact_prop — residual CONTACT without dual
  if (!detected.includes("lit_contact_xor") && !detected.includes("contact_prop_missing") && vd.length >= 8) {
    try {
      const { auditLiteraryDetailQuality } =
        require("./stillLiteraryDetailQuality") as typeof import("./stillLiteraryDetailQuality");
      const audit = auditLiteraryDetailQuality({ visualDescription: vd, shotSize: sz });
      const weak = audit.findings.some(
        (f) =>
          f.severity === "BLOCK" &&
          (f.id === "DEX-LIT-CONTACT" || f.id === "DEX-PROP-CONT" || f.id === "DEX-LIT-ANCHOR"),
      );
      if (weak) detected.push("weak_prop");
    } catch {
      /* optional */
    }
  }

  const kind = PRIORITY.find((k) => detected.includes(k)) ?? "none";
  sources.push(`debt.kind.${kind}`);

  if (kind === "lit_contact_xor") {
    const primary = buildPrimaryBlock("split_shot", {
      stage: "prompt",
      userMessageOverride:
        "文学双接触须拆镜（颊触镜 + 口创镜）：禁止同镜含纸咬唇，禁止仅用互斥句洗绿出图",
    });
    return {
      kind,
      action: "split_shot",
      primaryNextStep: primary.primaryNextStep,
      ctaLabel: primary.ctaLabel ?? "确认智能拆镜",
      userMessage: primary.userMessage,
      sources: [...sources, "debt.splitXor"],
      stopFidelityBurn: true,
      missingSlots: ["contactRoleXor"],
    };
  }

  if (kind === "cast_multi_on_face_cu") {
    try {
      const { detectCuCastConflict } =
        require("../design/detectCuCastConflict") as typeof import("../design/detectCuCastConflict");
      const cu = detectCuCastConflict({
        shotSize: sz,
        charCodes: input.charCodes ?? [],
        characterNames: input.castNames ?? [],
        visualDescription: vd,
        prompt: blob,
      });
      if (cu.healMode === "slice_cast" && cu.primaryName) {
        const primary = buildPrimaryBlock("chat_repair", {
          stage: "prompt",
          userMessageOverride: `特写只出「${cu.primaryName}」：已可按文学降出场人数，禁止群像同框出图`,
        });
        return {
          kind,
          action: "slice_cast",
          primaryNextStep: primary.primaryNextStep,
          ctaLabel: "按文学降出场人数",
          userMessage: primary.userMessage,
          sources: [...sources, "debt.sliceCast"],
          stopFidelityBurn: false,
          missingSlots: ["castCardinality"],
        };
      }
    } catch {
      /* fall through split */
    }
    return {
      ...blockFor("split_shot", "特写×多人冲突；须智能拆，禁止文学Edit/换布局洗绿", [
        ...sources,
        "debt.splitCuCast",
      ]),
      kind,
      action: "split_shot",
      stopFidelityBurn: true,
      missingSlots: ["castCardinality"],
    };
  }

  if (kind === "sheet_layout_leak") {
    const primary = buildPrimaryBlock("regen_storyboard_hq", {
      stage: "prompt",
      userMessageOverride: "参考含四视图/拼版布局泄漏；须丢场景参考并裁身份板后重抽",
      ctaLabelOverride: "禁拼版重抽",
    });
    return {
      kind,
      action: "drop_scene_ref",
      primaryNextStep: primary.primaryNextStep,
      ctaLabel: primary.ctaLabel ?? "禁拼版重抽",
      userMessage: primary.userMessage,
      sources: [...sources, "debt.dropSceneRef"],
      stopFidelityBurn: false,
      missingSlots: ["singleFrame"],
    };
  }

  if (kind === "contact_prop_missing") {
    const primary = buildPrimaryBlock("regen_storyboard_hq", {
      stage: "prompt",
      userMessageOverride:
        "接触事件镜静帧缺道具入画（浅痕≠道具）：须重出带道具接触静照，禁止只改视频词",
      ctaLabelOverride: "重出带道具静照",
    });
    return {
      kind,
      action: "regen_prop_still",
      primaryNextStep: primary.primaryNextStep,
      ctaLabel: primary.ctaLabel ?? "重出带道具静照",
      userMessage: primary.userMessage,
      sources: [...sources, "debt.contactPropMissing"],
      stopFidelityBurn: true,
      missingSlots: ["propInFrame", "contactGeom"],
    };
  }

  if (kind === "weak_prop") {
    const primary = buildPrimaryBlock("chat_repair", {
      stage: "prompt",
      userMessageOverride: "文学接触/锚点债未清：请批准增强或手改 VD，禁止只 regen",
    });
    return {
      kind,
      action: "enhance_literary",
      primaryNextStep: primary.primaryNextStep,
      ctaLabel: primary.ctaLabel ?? "批准文学增强",
      userMessage: primary.userMessage,
      sources: [...sources, "debt.enhanceLit"],
      stopFidelityBurn: false,
      missingSlots: ["contact"],
    };
  }

  // G0: Key-absent alone — annotate optional diagnostic; never primary CTA「去配置 Key」/ missingSlots vlmApiKey
  if (keyAbsent) {
    return {
      kind: "vlm_key_missing",
      action: "pass",
      primaryNextStep: "batch_still",
      ctaLabel: "",
      userMessage: "像素诊断 Key 可选；结构债已过则按 L0/启发式继续（Key 不挡质量流）",
      sources: [...sources, "debt.vlmKeyOptionalAnnotate"],
      stopFidelityBurn: false,
    };
  }

  return {
    kind: "none",
    action: "pass",
    primaryNextStep: "batch_still",
    ctaLabel: "",
    userMessage: "",
    sources,
    stopFidelityBurn: false,
  };
}

/** Homology helper: face-CU dual must never soft-inject wash-green. */
export function faceCuDualRequiresSplit(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
}): boolean {
  try {
    const { needsLitContactXorSplit } =
      require("../design/expandLitContactXor") as typeof import("../design/expandLitContactXor");
    return needsLitContactXorSplit({
      visualDescription: input.visualDescription,
      shotSize: input.shotSize,
    });
  } catch {
    return false;
  }
}

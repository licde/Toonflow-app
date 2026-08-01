/**
 * HQ literary-debt gate — compose/Exit homology.
 * Shootable-first: dual contact / lit debt → advise + slim, never hard-block generate.
 * Soft XOR phrase disabled on main path (debt router homology).
 * Burn still requires design alignment (requireFixBeforeBurn), not forbidRegen.
 */
import type { BurnNextStep } from "./burnGateEnvelope";
import { buildPrimaryBlock } from "./primaryBlock";
import {
  auditLiteraryDetailQuality,
  hasContactRoleXorSatisfaction,
} from "./stillLiteraryDetailQuality";
import { routeStillDebtAction } from "./stillDebtActionRouter";
import { slimVdForShootable } from "../design/shootableArchitecture";

const LIT_BLOCK_IDS = new Set([
  "DEX-LIT-CONTACT-XOR",
  "DEX-LIT-CONTACT",
  "DEX-LIT-ANCHOR",
  "DEX-LIT-EXPR",
  "DEX-PROP-CONT",
  "DEX-LIT-DRIFT",
]);

export type LitHqGateResult =
  | { action: "pass"; sources: string[]; visualDescription: string; promptAppend?: string }
  | {
      action: "advise";
      sources: string[];
      visualDescription: string;
      adviseReason: string;
      primaryNextStep: BurnNextStep;
      userMessage: string;
      ctaLabel?: string;
      missingSlots: string[];
      /** Require design fix before burn — never blocks generate */
      requireFixBeforeBurn: true;
    }
  | {
      /** @deprecated Prefer advise; kept for importSoftTrack tests that expect block */
      action: "block";
      sources: string[];
      visualDescription: string;
      blockReason: string;
      primaryNextStep: BurnNextStep;
      userMessage: string;
      ctaLabel?: string;
      missingSlots: string[];
    };

function isLitBlockId(id: string): boolean {
  return LIT_BLOCK_IDS.has(id) || /^DEX-LIT-/.test(id) || id === "DEX-PROP-CONT";
}

/**
 * @deprecated Soft XOR wash-green — kept for tests only; HQ main path must not call.
 */
export function softInjectXorHeal(vd: string, promptSlice: string): { text: string; applied: boolean } {
  if (hasContactRoleXorSatisfaction(vd) || hasContactRoleXorSatisfaction(promptSlice)) {
    return { text: promptSlice, applied: false };
  }
  const heal = "互斥：纸未入口；颊触与口创不同时含纸咬唇";
  if (promptSlice.includes("纸未入口") || promptSlice.includes("互斥")) {
    return { text: promptSlice, applied: false };
  }
  return { text: `${promptSlice.trim()}。${heal}`, applied: true };
}

function toAdvise(input: {
  sources: string[];
  vd: string;
  reason: string;
  primaryNextStep: BurnNextStep;
  userMessage: string;
  ctaLabel?: string;
  missingSlots: string[];
}): LitHqGateResult {
  return {
    action: "advise",
    sources: [...input.sources, "lit.hq.advise", "shootable.first"],
    visualDescription: input.vd,
    adviseReason: input.reason,
    primaryNextStep: input.primaryNextStep,
    userMessage: input.userMessage,
    ctaLabel: input.ctaLabel,
    missingSlots: input.missingSlots,
    requireFixBeforeBurn: true,
  };
}

/**
 * HQ gate for compose: face-CU dual → advise split + slim VD; residual → advise enhance.
 * Shootable-first default: never action=block (generate may continue).
 * Set hardBlock=true only for legacy tests that assert refuse.
 */
export function gateStillLitDebtForHq(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  qualityMode?: "hq_update" | "draft" | string | null;
  /** When true, skip hard block (import demote track) */
  importSoftTrack?: boolean;
  /** Explicit opt-in only — never default on (wash-green banned) */
  allowXorSoftInject?: boolean;
  /** Legacy: emit action=block instead of advise (tests only) */
  hardBlock?: boolean;
}): LitHqGateResult {
  const sources: string[] = [];
  let vd = String(input.visualDescription ?? "").trim();
  if (input.qualityMode === "draft" || input.importSoftTrack) {
    return { action: "pass", sources, visualDescription: vd };
  }
  if (input.qualityMode && input.qualityMode !== "hq_update") {
    return { action: "pass", sources, visualDescription: vd };
  }

  const emit = (advise: Extract<LitHqGateResult, { action: "advise" }>): LitHqGateResult => {
    if (input.hardBlock) {
      return {
        action: "block",
        sources: advise.sources.filter((s) => s !== "shootable.first"),
        visualDescription: advise.visualDescription,
        blockReason: advise.adviseReason,
        primaryNextStep: advise.primaryNextStep,
        userMessage: advise.userMessage,
        ctaLabel: advise.ctaLabel,
        missingSlots: advise.missingSlots,
      };
    }
    return advise;
  };

  // Unified debt router first (split > soft)
  const routed = routeStillDebtAction({
    visualDescription: vd,
    shotSize: input.shotSize,
  });
  sources.push(...routed.sources);
  if (routed.action === "split_shot" && routed.kind === "lit_contact_xor") {
    const slim = slimVdForShootable(vd);
    if (slim.slimmed) {
      vd = slim.vd;
      sources.push("lit.hq.slimXorCheek");
    }
    return emit(
      toAdvise({
        sources: [...sources, "lit.hq.preferSplit"],
        vd,
        reason: "DEX-LIT-CONTACT-XOR",
        primaryNextStep: routed.primaryNextStep,
        userMessage:
          "文学双接触建议智拆（颊触/口创）；已瘦身为可拍颊触描写，仍可生成；烧片前请拆齐或增强。",
        ctaLabel: "智拆并生成",
        missingSlots: routed.missingSlots ?? ["contactRoleXor"],
      }),
    );
  }
  if (routed.kind === "contact_prop_missing" || routed.action === "regen_prop_still") {
    return emit(
      toAdvise({
        sources: [...sources, "lit.hq.contactProp"],
        vd,
        reason: "DEX-PROP-IN-FRAME",
        primaryNextStep: "batch_still",
        userMessage:
          routed.userMessage ||
          "接触事件建议补道具入画；仍可生成试拍，烧片前须道具可见。",
        ctaLabel: routed.ctaLabel || "增强道具并生成",
        missingSlots: routed.missingSlots ?? ["propInFrame", "contactGeom"],
      }),
    );
  }

  // Contact-event VD without prop alias readable → advise (not block generate)
  try {
    const { isContactEventVd, textHasPropInFrame, matchContactEventVd } =
      require("./contactEventPolicy") as typeof import("./contactEventPolicy");
    if (isContactEventVd(vd)) {
      const m = matchContactEventVd(vd);
      if (!textHasPropInFrame(vd, m)) {
        const primary = buildPrimaryBlock("chat_repair", {
          stage: "prompt",
          userMessageOverride: `接触事件缺道具入画声明（${m.propCanonical || "道具"}）：建议增强补 prop+geom；仍可试拍，禁止无道具 hq_ok 烧片`,
          ctaLabelOverride: "增强设计并生成",
        });
        return emit(
          toAdvise({
            sources: [...sources, "lit.hq.contactEventVd"],
            vd,
            reason: "DEX-PROP-IN-FRAME",
            primaryNextStep: "batch_still",
            userMessage: primary.userMessage,
            ctaLabel: primary.ctaLabel,
            missingSlots: ["propInFrame", "contactGeom"],
          }),
        );
      }
    }
  } catch {
    /* optional */
  }

  const runAudit = (text: string) =>
    auditLiteraryDetailQuality({
      visualDescription: text,
      shotSize: input.shotSize,
    });

  let audit = runAudit(vd);
  let blocks = audit.findings.filter((f) => f.severity === "BLOCK" && isLitBlockId(f.id));

  if (
    input.allowXorSoftInject === true &&
    blocks.some((f) => f.id === "DEX-LIT-CONTACT-XOR") &&
    blocks.every((f) => f.id === "DEX-LIT-CONTACT-XOR")
  ) {
    const inj = softInjectXorHeal(vd, vd);
    if (inj.applied) {
      vd = inj.text;
      sources.push("lit.hq.xorSoftInject");
      audit = runAudit(vd);
      blocks = audit.findings.filter((f) => f.severity === "BLOCK" && isLitBlockId(f.id));
    }
  }

  if (!blocks.length) {
    if (sources.length) sources.push("lit.hq.pass");
    return { action: "pass", sources, visualDescription: vd };
  }

  const missingSlots = [
    ...new Set(blocks.flatMap((f) => (f.missingSlots ?? f.missing ?? []).map(String)).filter(Boolean)),
  ];
  const hasXor = blocks.some((f) => f.id === "DEX-LIT-CONTACT-XOR");
  if (hasXor) {
    const slim = slimVdForShootable(vd);
    if (slim.slimmed) {
      vd = slim.vd;
      sources.push("lit.hq.slimXorCheek");
    }
  }
  const nextStep: BurnNextStep = hasXor ? "split_shot" : "chat_repair";
  const primary = buildPrimaryBlock(nextStep, {
    stage: "prompt",
    userMessageOverride: hasXor
      ? `文学互斥债建议拆镜（${missingSlots.slice(0, 4).join("/") || "contactRoleXor"}）；已尽量瘦身可拍，仍可生成`
      : `文学细节建议增强（${blocks.map((f) => f.id).slice(0, 3).join(",")}）；仍可生成试拍，烧片前请对齐`,
  });
  return emit(
    toAdvise({
      sources,
      vd,
      reason: blocks[0]?.id ?? "DEX-LIT-CONTACT",
      primaryNextStep: hasXor ? "split_shot" : "batch_still",
      userMessage: primary.userMessage,
      ctaLabel: hasXor ? "智拆并生成" : "增强设计并生成",
      missingSlots,
    }),
  );
}

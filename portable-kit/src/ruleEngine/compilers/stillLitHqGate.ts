/**
 * HQ literary-debt gate — compose/Exit homology.
 * Design/HQ: face-CU dual contact → prefer split_shot (never soft-inject wash-green).
 * Soft XOR phrase disabled on main path (debt router homology).
 */
import type { BurnNextStep } from "./burnGateEnvelope";
import { buildPrimaryBlock } from "./primaryBlock";
import {
  auditLiteraryDetailQuality,
  hasContactRoleXorSatisfaction,
} from "./stillLiteraryDetailQuality";
import { routeStillDebtAction } from "./stillDebtActionRouter";

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

/**
 * HQ gate for compose: face-CU dual → split_shot; residual BLOCK → refuse.
 * Soft XOR inject is off by default (allowXorSoftInject must be explicit true).
 */
export function gateStillLitDebtForHq(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  qualityMode?: "hq_update" | "draft" | string | null;
  /** When true, skip hard block (import demote track) */
  importSoftTrack?: boolean;
  /** Explicit opt-in only — never default on (wash-green banned) */
  allowXorSoftInject?: boolean;
}): LitHqGateResult {
  const sources: string[] = [];
  let vd = String(input.visualDescription ?? "").trim();
  if (input.qualityMode === "draft" || input.importSoftTrack) {
    return { action: "pass", sources, visualDescription: vd };
  }
  if (input.qualityMode && input.qualityMode !== "hq_update") {
    return { action: "pass", sources, visualDescription: vd };
  }

  // Unified debt router first (split > soft)
  const routed = routeStillDebtAction({
    visualDescription: vd,
    shotSize: input.shotSize,
  });
  sources.push(...routed.sources);
  if (routed.action === "split_shot" && routed.kind === "lit_contact_xor") {
    return {
      action: "block",
      sources: [...sources, "lit.hq.preferSplit", "lit.hq.block"],
      visualDescription: vd,
      blockReason: "DEX-LIT-CONTACT-XOR",
      primaryNextStep: routed.primaryNextStep,
      userMessage: routed.userMessage,
      ctaLabel: routed.ctaLabel || "确认智能拆镜",
      missingSlots: routed.missingSlots ?? ["contactRoleXor"],
    };
  }
  if (routed.kind === "contact_prop_missing" || routed.action === "regen_prop_still") {
    return {
      action: "block",
      sources: [...sources, "lit.hq.contactProp", "lit.hq.block"],
      visualDescription: vd,
      blockReason: "DEX-PROP-IN-FRAME",
      primaryNextStep: routed.primaryNextStep,
      userMessage: routed.userMessage,
      ctaLabel: routed.ctaLabel || "重出带道具静照",
      missingSlots: routed.missingSlots ?? ["propInFrame", "contactGeom"],
    };
  }

  // Contact-event VD without prop alias readable → BLOCK (no VLM may not hq_ok)
  try {
    const { isContactEventVd, textHasPropInFrame, matchContactEventVd } =
      require("./contactEventPolicy") as typeof import("./contactEventPolicy");
    if (isContactEventVd(vd)) {
      const m = matchContactEventVd(vd);
      if (!textHasPropInFrame(vd, m)) {
        const primary = buildPrimaryBlock("chat_repair", {
          stage: "prompt",
          userMessageOverride: `接触事件缺道具入画声明（${m.propCanonical || "道具"}）：请 Confirm 增强补 prop+geom，禁止无道具 hq_ok`,
          ctaLabelOverride: "批准增强补propInFrame",
        });
        return {
          action: "block",
          sources: [...sources, "lit.hq.contactEventVd", "lit.hq.block"],
          visualDescription: vd,
          blockReason: "DEX-PROP-IN-FRAME",
          primaryNextStep: primary.primaryNextStep,
          userMessage: primary.userMessage,
          ctaLabel: primary.ctaLabel,
          missingSlots: ["propInFrame", "contactGeom"],
        };
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

  // Soft inject only when explicitly opted in AND not face-CU dual (router already split those)
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
  const nextStep: BurnNextStep = hasXor ? "split_shot" : "chat_repair";
  const primary = buildPrimaryBlock(nextStep, {
    stage: "prompt",
    userMessageOverride: hasXor
      ? `文学互斥债未清（${missingSlots.slice(0, 4).join("/") || "contactRoleXor"}）：请拆镜，禁止带债出图`
      : `文学细节债未清（${blocks.map((f) => f.id).slice(0, 3).join(",")}）：请增强/手改 VD 后再生成`,
  });
  sources.push("lit.hq.block");
  return {
    action: "block",
    sources,
    visualDescription: vd,
    blockReason: blocks[0]?.id ?? "DEX-LIT-CONTACT",
    primaryNextStep: primary.primaryNextStep,
    userMessage: primary.userMessage,
    ctaLabel: primary.ctaLabel,
    missingSlots,
  };
}

/**
 * Smart repair routing for still fidelity failures — layout | identity | bg | config.
 */
import type { VlmItemResult } from "./stillLiteraryVlmJudge";
import type { StillFidelityItem } from "../compilers/literaryFidelityChecklist";
import { VLM_API_KEY_MISSING } from "./vlmKeyResolve";

export type StillRepairRoute = "layout" | "identity" | "bg" | "config" | "human" | "none";

export interface StillRepairDecision {
  route: StillRepairRoute;
  nextStep: "regen_storyboard_hq" | "chat_repair" | "batch_still" | "burn";
  ctaLabel: string;
  userMessage: string;
  preserveLayout: boolean;
  swapLayoutTemplate: boolean;
  layoutPreserveEdit: boolean;
  settingsDeepLink?: string;
}

const LAYOUT_KINDS = new Set(["seating", "composition", "forbidden"]);
const IDENTITY_KINDS = new Set(["identity", "role_action", "prop"]);
const BG_KINDS = new Set(["atmosphere"]);

export function routeStillRepair(input: {
  itemResults?: VlmItemResult[];
  checklist?: StillFidelityItem[];
  vlmError?: string | null;
  vlmErrorCode?: string | null;
  missingCref?: boolean;
  bgPolicy?: "drop" | "demote" | "keep" | null;
}): StillRepairDecision {
  if (input.missingCref) {
    return {
      route: "human",
      nextStep: "batch_still",
      ctaLabel: "去生成角色定妆",
      userMessage: "座次镜缺少角色定妆参考，请先批量生成定妆图后再高质量出图",
      preserveLayout: false,
      swapLayoutTemplate: false,
      layoutPreserveEdit: false,
    };
  }

  const err = String(input.vlmErrorCode || input.vlmError || "");
  if (err.includes(VLM_API_KEY_MISSING) || /缺少API\s*Key|api\s*key/i.test(err)) {
    return {
      route: "config",
      nextStep: "chat_repair",
      ctaLabel: "去配置火山引擎 API Key",
      userMessage: "视觉评审缺少 API Key，请配置后再验收；成图未标记为高质量通过",
      preserveLayout: true,
      swapLayoutTemplate: false,
      layoutPreserveEdit: false,
      settingsDeepLink: "/settings/vendor?focus=volcengine&field=apiKey",
    };
  }

  const failed = (input.itemResults ?? []).filter((i) => !i.pass);
  if (!failed.length) {
    return {
      route: "none",
      nextStep: "burn",
      ctaLabel: "继续",
      userMessage: "",
      preserveLayout: false,
      swapLayoutTemplate: false,
      layoutPreserveEdit: false,
    };
  }

  const byId = new Map((input.checklist ?? []).map((c) => [c.id, c]));
  let layoutHits = 0;
  let identityHits = 0;
  let bgHits = 0;
  for (const f of failed) {
    const kind = byId.get(f.id)?.kind;
    const id = f.id || "";
    if (kind && LAYOUT_KINDS.has(kind)) layoutHits++;
    else if (kind && IDENTITY_KINDS.has(kind)) identityHits++;
    else if (kind && BG_KINDS.has(kind)) bgHits++;
    else if (/seating|composition|forbidden|座|跪|端坐|香案/i.test(id + (f.fixHint ?? ""))) layoutHits++;
    else if (/identity|角色|脸|定妆|cref/i.test(id + (f.fixHint ?? ""))) identityHits++;
    else if (/atmosphere|烛|背景/i.test(id + (f.fixHint ?? ""))) bgHits++;
    else identityHits++;
  }

  // Background fails only matter when keep policy
  if (input.bgPolicy && input.bgPolicy !== "keep") bgHits = 0;

  if (layoutHits >= identityHits && layoutHits > 0) {
    return {
      route: "layout",
      nextStep: "regen_storyboard_hq",
      ctaLabel: "换布局重抽",
      userMessage: "构图/座次未达标，将换布局底图重抽（不堆文学硬约束）",
      preserveLayout: false,
      swapLayoutTemplate: true,
      layoutPreserveEdit: false,
    };
  }

  if (identityHits > 0) {
    return {
      route: "identity",
      nextStep: "regen_storyboard_hq",
      ctaLabel: "保布局修身份",
      userMessage: "人物/身份未达标，将保留构图锚点做 ImageEdit",
      preserveLayout: true,
      swapLayoutTemplate: false,
      layoutPreserveEdit: true,
    };
  }

  if (bgHits > 0 && input.bgPolicy === "keep") {
    return {
      route: "bg",
      nextStep: "regen_storyboard_hq",
      ctaLabel: "补场景参考",
      userMessage: "场景建立镜背景要素不足，可恢复场景参考后重抽",
      preserveLayout: true,
      swapLayoutTemplate: false,
      layoutPreserveEdit: false,
    };
  }

  return {
    route: "identity",
    nextStep: "regen_storyboard_hq",
    ctaLabel: "重新高质量生成",
    userMessage: "静照未通过文学保真，请重新高质量生成",
    preserveLayout: true,
    swapLayoutTemplate: false,
    layoutPreserveEdit: true,
  };
}

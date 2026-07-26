/**
 * Smart repair routing for still fidelity failures — layout | identity | bg | config.
 */
import type { VlmItemResult } from "./stillLiteraryVlmJudge";
import type { StillFidelityItem } from "../compilers/literaryFidelityChecklist";
import { VLM_API_KEY_MISSING } from "./vlmKeyResolve";

export type StillRepairRoute = "layout" | "identity" | "bg" | "config" | "human" | "none";

export interface StillRepairDecision {
  route: StillRepairRoute;
  nextStep: "regen_storyboard_hq" | "chat_repair" | "batch_still" | "burn" | "split_shot";
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
  /** When true, layout/cast budget exhausted → reverse to design split, not endless regen */
  exhausted?: boolean;
  sheetLeak?: boolean;
  /** Design framing — CU×cast 走智能拆而非换布局假愈 */
  shotSize?: string | null;
  literaryPrompt?: string | null;
  castNames?: string[] | null;
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

  // CU×cast 结构债优先于「无失败项→burn」：智能适配反推拆镜，禁止文学 Edit/换布局假愈
  try {
    const { diagnoseStructuralStillEditBlock } =
      require("../design/detectCuCastConflict") as typeof import("../design/detectCuCastConflict");
    const structural = diagnoseStructuralStillEditBlock({
      literaryPrompt: input.literaryPrompt,
      shotSize: input.shotSize,
      castNames: input.castNames,
    });
    if (structural.block) {
      return {
        route: "human",
        nextStep: "split_shot",
        ctaLabel: "回设计智能拆镜",
        userMessage: structural.message || "特写×多人冲突；须智能拆，禁止文学Edit/换布局洗绿",
        preserveLayout: false,
        swapLayoutTemplate: false,
        layoutPreserveEdit: false,
      };
    }
  } catch {
    /* optional */
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

  // Cast overcrowd / seat missing → never lock bad still as layout anchor
  const castFail = failed.some((f) => {
    const id = f.id || "";
    const hint = f.fixHint ?? "";
    return /cast_cardinality|出镜人数|第三人|超员|群像/.test(id + hint);
  });
  const seatFail = failed.some((f) => {
    const id = f.id || "";
    const hint = f.fixHint ?? "";
    const kind = byId.get(f.id)?.kind;
    return (
      kind === "seating" ||
      /太师椅|蒲团|无座|缺座|端坐|跪于|furniture|seatMissing/i.test(id + hint)
    );
  });
  const sheetFail =
    input.sheetLeak ||
    failed.some((f) => /single_frame|拼版|四视|turnaround|character.?sheet|四宫格/i.test(f.id + (f.fixHint ?? "")));

  const bgReadableFail = failed.some((f) =>
    /background_readable|灰棚|纯色摄影棚|grey.?void|empty.?studio/i.test(
      `${f.id}${f.fixHint ?? ""}${(f as { evidence?: string }).evidence ?? ""}`,
    ),
  );

  // Action/fight family=none — never lock bad still as layout_preserve
  let actionNoLayout = false;
  try {
    const { selectLayoutFamily } =
      require("./stillCompositionSpec") as typeof import("./stillCompositionSpec");
    const fam = selectLayoutFamily({
      visualDescription: input.literaryPrompt,
      shotSize: input.shotSize,
      characterCount: (input.castNames ?? []).length || undefined,
    });
    actionNoLayout =
      fam.reason === "action_primary_no_layout" || fam.reason === "fight_action_no_layout";
  } catch {
    actionNoLayout = /动作主体|弯腰|捡|扑|撕|对打|武打/.test(String(input.literaryPrompt ?? ""));
  }

  if (input.exhausted === true) {
    return {
      route: "human",
      nextStep: "split_shot",
      ctaLabel: "回设计智能拆镜",
      userMessage: "静帧修复预算耗尽；请回 SB 智能拆镜或改描写，禁止无限 regen；弱图不可作视频首帧",
      preserveLayout: false,
      swapLayoutTemplate: false,
      layoutPreserveEdit: false,
    };
  }

  if (sheetFail) {
    return {
      route: "layout",
      nextStep: "regen_storyboard_hq",
      ctaLabel: "禁拼版重抽",
      userMessage: "成图像定妆拼版/多格；禁止保构图；将换布局重抽或回设计；弱图不可作视频首帧",
      preserveLayout: false,
      swapLayoutTemplate: true,
      layoutPreserveEdit: false,
    };
  }

  if (bgReadableFail) {
    return {
      route: "layout",
      nextStep: "regen_storyboard_hq",
      ctaLabel: "禁灰棚重抽",
      userMessage: "成图背景为灰棚/纯色摄影棚空白；禁止保构图；将换布局或不带布局重抽；弱图不可作视频首帧",
      preserveLayout: false,
      swapLayoutTemplate: true,
      layoutPreserveEdit: false,
    };
  }

  if (castFail || seatFail) {
    return {
      route: "layout",
      nextStep: "regen_storyboard_hq",
      ctaLabel: seatFail ? "换布局重抽（座次）" : "换布局重抽（人数）",
      userMessage: seatFail
        ? "座次/家具未达标，禁止保构图锁死无座图；将换布局或不带布局重烧；弱图不可作视频首帧"
        : "出镜人数不符，禁止保构图锁死超员图；将换布局或不带布局重烧；弱图不可作视频首帧",
      preserveLayout: false,
      swapLayoutTemplate: true,
      layoutPreserveEdit: false,
    };
  }

  if (identityHits > 0) {
    return {
      route: "identity",
      nextStep: "regen_storyboard_hq",
      ctaLabel: actionNoLayout ? "重抽（禁保构图）" : "保布局修身份",
      userMessage: actionNoLayout
        ? "动作/武打镜人物未达标；禁止保构图锁死；将重抽；弱图不可作视频首帧"
        : "人物/身份未达标，将保留构图锚点做 ImageEdit；弱图不可作视频首帧",
      preserveLayout: !actionNoLayout,
      swapLayoutTemplate: actionNoLayout,
      layoutPreserveEdit: !actionNoLayout,
    };
  }

  if (bgHits > 0 && input.bgPolicy === "keep") {
    return {
      route: "bg",
      nextStep: "regen_storyboard_hq",
      ctaLabel: "补场景参考",
      userMessage: "场景建立镜背景要素不足，可恢复场景参考后重抽；弱图不可作视频首帧",
      preserveLayout: true,
      swapLayoutTemplate: false,
      layoutPreserveEdit: false,
    };
  }

  return {
    route: "identity",
    nextStep: "regen_storyboard_hq",
    ctaLabel: actionNoLayout ? "重抽（禁保构图）" : "重新高质量生成",
    userMessage: actionNoLayout
      ? "动作/武打镜未通过文学保真；禁止保构图；请重出 HQ；弱图不可作视频首帧"
      : "静照未通过文学保真，请重新高质量生成；弱图不可作视频首帧",
    preserveLayout: !actionNoLayout,
    swapLayoutTemplate: actionNoLayout,
    layoutPreserveEdit: !actionNoLayout,
  };
}

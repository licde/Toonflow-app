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
  /** When design debt open — FE LitDetailDebtBar chips */
  missingSlots?: string[];
  irdPrimaryAction?: string;
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
  /** Prefer pure VD for lit debt audit (not full compose prompt) */
  visualDescription?: string | null;
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

  // Unified debt router (XOR / CU-cast / VLM key / sheet) before fidelity heuristics
  try {
    const { routeStillDebtAction } =
      require("../compilers/stillDebtActionRouter") as typeof import("../compilers/stillDebtActionRouter");
    const debt = routeStillDebtAction({
      visualDescription: input.visualDescription,
      shotSize: input.shotSize,
      promptBlob: input.literaryPrompt,
      castNames: input.castNames,
      sheetLeak: input.sheetLeak,
      vlmErrorCode: input.vlmErrorCode,
      vlmError: input.vlmError,
    });
    if (debt.kind === "vlm_key_missing") {
      const { stillQualityUserMessage } =
        require("../quality/practiceCompleteness") as typeof import("../quality/practiceCompleteness");
      return {
        route: "config",
        nextStep: "chat_repair",
        ctaLabel: "可选：配置诊断 Key 后人审",
        userMessage: stillQualityUserMessage({ keyAbsent: true }),
        preserveLayout: true,
        swapLayoutTemplate: false,
        layoutPreserveEdit: false,
        settingsDeepLink: "/settings/vendor?focus=volcengine&field=apiKey",
      };
    }
    if (debt.action === "split_shot") {
      return {
        route: "human",
        nextStep: "split_shot",
        ctaLabel: debt.ctaLabel || "回设计智能拆镜",
        userMessage: debt.userMessage,
        preserveLayout: false,
        swapLayoutTemplate: false,
        layoutPreserveEdit: false,
        missingSlots: debt.missingSlots,
        irdPrimaryAction: "confirm_split",
      };
    }
    if (debt.action === "drop_scene_ref" && input.sheetLeak) {
      const bgAlso = (input.itemResults ?? []).some(
        (f) =>
          !f.pass &&
          /background_readable|灰棚|纯色摄影棚|grey.?void|empty.?studio/i.test(
            `${f.id}${f.fixHint ?? ""}${(f as { evidence?: string }).evidence ?? ""}`,
          ),
      );
      if (bgAlso) {
        return {
          route: "layout",
          nextStep: "regen_storyboard_hq",
          ctaLabel: "禁灰棚重抽",
          userMessage:
            "成图灰棚/纯色空白且疑似拼版泄漏；禁止仅丢场景参考；须换布局保场景可读后重抽；弱图不可作视频首帧",
          preserveLayout: false,
          swapLayoutTemplate: true,
          layoutPreserveEdit: false,
        };
      }
      return {
        route: "layout",
        nextStep: "regen_storyboard_hq",
        ctaLabel: debt.ctaLabel || "禁拼版重抽",
        userMessage: debt.userMessage,
        preserveLayout: false,
        swapLayoutTemplate: true,
        layoutPreserveEdit: false,
      };
    }
    if (debt.action === "regen_prop_still" || debt.kind === "contact_prop_missing") {
      return {
        route: "human",
        nextStep: "regen_storyboard_hq",
        ctaLabel: debt.ctaLabel || "重出带道具静照",
        userMessage: debt.userMessage,
        preserveLayout: true,
        swapLayoutTemplate: false,
        layoutPreserveEdit: false,
        missingSlots: debt.missingSlots ?? ["propInFrame", "contactGeom"],
        irdPrimaryAction: "confirm_enhance",
      };
    }
    if (debt.action === "enhance_literary" && debt.missingSlots?.includes("propInFrame")) {
      return {
        route: "human",
        nextStep: "chat_repair",
        ctaLabel: debt.ctaLabel || "批准增强补propInFrame",
        userMessage: debt.userMessage,
        preserveLayout: true,
        swapLayoutTemplate: false,
        layoutPreserveEdit: false,
        missingSlots: debt.missingSlots,
        irdPrimaryAction: "confirm_enhance",
      };
    }
  } catch {
    /* optional — fall through legacy */
  }

  const err = String(input.vlmErrorCode || input.vlmError || "");
  if (err.includes(VLM_API_KEY_MISSING) || /缺少API\s*Key|api\s*key/i.test(err)) {
    const { stillQualityUserMessage } =
      require("../quality/practiceCompleteness") as typeof import("../quality/practiceCompleteness");
    return {
      route: "config",
      nextStep: "chat_repair",
      ctaLabel: "可选：配置诊断 Key 后人审",
      userMessage: stillQualityUserMessage({ keyAbsent: true }),
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
  if (!failed.length && !input.exhausted) {
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

  // Literary design debt → IRD action (confirm_enhance / split / hand_edit), never sole regen
  const vdForLit = String(input.visualDescription ?? "").trim() || String(input.literaryPrompt ?? "").trim();
  if (vdForLit.length >= 8 && (failed.length > 0 || input.exhausted)) {
    try {
      const { diagnoseStillIntent, irdCtaLabelFromAction } =
        require("../design/stillIntentReverse") as typeof import("../design/stillIntentReverse");
      const d = diagnoseStillIntent(
        [{ shotIndex: 1, visualDescription: vdForLit, shotSize: String(input.shotSize ?? "") }],
        {},
      );
      const litBlocks = d.findings.filter(
        (f) =>
          f.severity === "BLOCK" &&
          (/^DEX-LIT-/.test(f.id) || f.id === "DEX-PROP-CONT"),
      );
      if (litBlocks.length) {
        const missingSlots =
          d.missingSlots?.length
            ? d.missingSlots
            : [
                ...new Set(
                  litBlocks.flatMap((f) => f.missingSlots ?? []).map((s) => String(s)).filter(Boolean),
                ),
              ];
        const primaryAction =
          d.primaryAction === "confirm_enhance" ||
          d.primaryAction === "apply_auto_enhance" ||
          d.primaryAction === "confirm_split"
            ? d.primaryAction
            : "hand_edit_vd";
        const nextStep =
          primaryAction === "confirm_split" ? ("split_shot" as const) : ("chat_repair" as const);
        return {
          route: "human",
          nextStep,
          ctaLabel: irdCtaLabelFromAction({ primaryAction, missingSlots }),
          userMessage: missingSlots.length
            ? `文学细节契约未过（缺 ${missingSlots.join("/")}）；请${primaryAction === "confirm_enhance" || primaryAction === "apply_auto_enhance" ? "批准增强或" : ""}手改/拆镜，禁止只 regen；弱图不可作视频首帧`
            : "文学细节契约未过；请增强/手改 VD，禁止只 regen；弱图不可作视频首帧",
          preserveLayout: false,
          swapLayoutTemplate: false,
          layoutPreserveEdit: false,
          missingSlots: missingSlots.length ? missingSlots : undefined,
          irdPrimaryAction: primaryAction,
        };
      }
    } catch {
      /* optional */
    }
  }

  if (!failed.length) {
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

  const byId = new Map((input.checklist ?? []).map((c) => [c.id, c]));
  let layoutHits = 0;
  let identityHits = 0;
  let bgHits = 0;
  for (const f of failed) {
    const kind = byId.get(f.id)?.kind;
    const id = f.id || "";
    // contact/primary_look have dedicated CTA — don't let composition kind drown them into layout swap
    if (/contact_geom|contact:|primary_look/i.test(id)) {
      identityHits++;
      continue;
    }
    if (kind && LAYOUT_KINDS.has(kind)) layoutHits++;
    else if (kind && IDENTITY_KINDS.has(kind)) identityHits++;
    else if (kind && BG_KINDS.has(kind)) bgHits++;
    else if (/seating|composition|forbidden|座|跪|端坐|香案/i.test(id + (f.fixHint ?? ""))) layoutHits++;
    else if (/identity|角色|脸|定妆|cref/i.test(id + (f.fixHint ?? ""))) identityHits++;
    else if (/atmosphere|烛|背景/i.test(id + (f.fixHint ?? ""))) bgHits++;
    else identityHits++;
  }

  // Background fails: under demote/drop still heal VD-named atmosphere (烛火等) — 禁零化 untilClear
  if (input.bgPolicy && input.bgPolicy !== "keep") {
    const atmFail = failed.some((f) => /atmosphere|烛|背景可辨|background_readable/i.test(`${f.id}${f.fixHint ?? ""}`));
    if (!atmFail) bgHits = 0;
  }

  // Action/fight family=none — never lock bad still as layout_preserve
  let actionNoLayout = false;
  try {
    const { selectLayoutFamily } =
      require("./stillCompositionSpec") as typeof import("./stillCompositionSpec");
    const fam = selectLayoutFamily({
      visualDescription: input.visualDescription ?? input.literaryPrompt,
      shotSize: input.shotSize,
      characterCount: (input.castNames ?? []).length || undefined,
    });
    actionNoLayout =
      fam.reason === "action_primary_no_layout" || fam.reason === "fight_action_no_layout";
  } catch {
    actionNoLayout = /动作主体|弯腰|捡|扑|撕|对打|武打/.test(
      String(input.visualDescription ?? input.literaryPrompt ?? ""),
    );
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
    // Practice: grey-void / bg fail must not be "healed" solely by drop_scene_ref (worsens 无背景)
    if (bgReadableFail) {
      return {
        route: "layout",
        nextStep: "regen_storyboard_hq",
        ctaLabel: "禁灰棚重抽",
        userMessage:
          "成图灰棚/纯色空白且疑似拼版泄漏；禁止仅丢场景参考；须换布局保场景可读后重抽；弱图不可作视频首帧",
        preserveLayout: false,
        swapLayoutTemplate: true,
        layoutPreserveEdit: false,
      };
    }
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

  // Declared contact geometry / primary look — Edit heal, not layout swap
  const geomFail = failed.some((f) => /contact_geom|contact:/i.test(f.id || ""));
  const lookFail = failed.some((f) => /primary_look/i.test(f.id || ""));
  if (geomFail || lookFail) {
    let contactPropCta = false;
    try {
      const { isContactEventVd } =
        require("../compilers/contactEventPolicy") as typeof import("../compilers/contactEventPolicy");
      contactPropCta = isContactEventVd(String(input.visualDescription ?? input.literaryPrompt ?? ""));
    } catch {
      /* optional */
    }
    return {
      route: "identity",
      nextStep: "regen_storyboard_hq",
      ctaLabel: contactPropCta && geomFail ? "重出带道具静照" : geomFail ? "修接触几何" : "修主look",
      userMessage:
        contactPropCta && geomFail
          ? "接触事件几何/道具未入画；须重出带道具接触静照，禁止仅浅痕；弱图不可作视频首帧"
          : geomFail
            ? "接触几何未贴合声明落点；将按 Edit 焦点修贴合/划过，禁止悬空；弱图不可作视频首帧"
            : "主look 未对齐 VD 主角定妆；将按主look 修衣装色系，禁止混用；弱图不可作视频首帧",
      preserveLayout: !actionNoLayout,
      swapLayoutTemplate: actionNoLayout,
      layoutPreserveEdit: !actionNoLayout,
      missingSlots: contactPropCta && geomFail ? ["propInFrame", "contactGeom"] : undefined,
      irdPrimaryAction: contactPropCta && geomFail ? "confirm_enhance" : undefined,
    };
  }

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

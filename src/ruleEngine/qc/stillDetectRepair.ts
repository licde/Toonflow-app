/**
 * Post-still detect → repair route. Dirty still must not burn as first frame.
 * Intent-aligned fork: weak still → batch_still; stale → chat_repair; true dirty hand+eye → dirty_still_prompt.
 */
import { assertStillFirstFrameContract } from "./stillFirstFrameGate";
import { degradeHqWithoutVisualPass } from "./stillVisualFidelityLoop";
import { stillDirtyPrimaryAction } from "../design/stillIntentReverse";
import { classifyStillIntent } from "../compilers/stillIntentPolicy";

function collectLitDebt(vd: string, shotSize: string): {
  missingSlots: string[];
  litDebt: boolean;
} {
  try {
    const { auditLiteraryDetailQuality } =
      require("../compilers/stillLiteraryDetailQuality") as typeof import("../compilers/stillLiteraryDetailQuality");
    const d = auditLiteraryDetailQuality({ visualDescription: vd, shotSize });
    const blocks = d.findings.filter((f) => f.severity === "BLOCK");
    const slots = blocks.flatMap((f) => f.missingSlots ?? f.missing ?? []);
    return {
      litDebt: blocks.length > 0,
      missingSlots: [...new Set(slots.map((s) => String(s)).filter(Boolean))],
    };
  } catch {
    return { litDebt: false, missingSlots: [] };
  }
}

function litDebtMessage(missingSlots: string[]): string {
  if (!missingSlots.length) {
    return "静帧弱且文学细节/道具契约未过；请手改 VD（禁只 regen）";
  }
  return `静帧弱且文学细节缺槽：${missingSlots.join("/")}；请手改 VD（禁只 regen）`;
}

export function assertStillDetectForBurn(input: {
  stillPrompt?: string | null;
  stillFilePath?: string | null;
  literaryDesc?: string | null;
  literaryDescHashAtCompose?: string | null;
  stillMeta?: {
    stillQuality?: string | null;
    visualPassAt?: string | null;
    visualPass?: boolean | null;
    sheetLeak?: boolean | null;
    pendingHumanRejudge?: boolean | null;
    fidelityStopReason?: string | null;
    vlmError?: string | null;
    fidelityItems?: Array<{ id: string; pass?: boolean; evidence?: string; fixHint?: string }>;
  } | null;
  fidelityFailed?: boolean;
  shot?: Record<string, unknown> | null;
  /** Explicit quality for first-frame gate (prefer generateVideo path) */
  stillQuality?: string | null;
  /** Optional precomputed sheetLeak (generateVideo / batch); else derived from meta+prompt */
  sheetLeak?: boolean | null;
}): {
  ok: boolean;
  severity: "ok" | "BLOCK";
  code?: string;
  message?: string;
  reverseTrigger?: string;
  primaryNextStep?: "batch_still" | "chat_repair" | "split_shot";
  stillQuality?: "hq_ok" | "weak" | "missing" | null;
  irdPrimaryAction?: string;
  intentClass?: string;
  /** Structure slots still missing — FE CTA / RH-LIT point here, not sole batch_still */
  missingSlots?: string[];
  ctaLabel?: string;
} {
  const shot = (input.shot ?? {
    visualDescription: input.literaryDesc,
  }) as Record<string, unknown>;
  const vd = String(shot.visualDescription ?? input.literaryDesc ?? "");
  const shotSize = String(shot.shotSize ?? "");
  const intent = classifyStillIntent({
    visualDescription: vd,
    promptBlob: `${vd}\n${input.stillPrompt ?? ""}`,
  });

  // Contact-event: still lacks prop → BLOCK regen（同源 stillContactVideoHandoff）
  try {
    const { assertStillContactVideoHandoff } =
      require("./stillContactVideoHandoff") as typeof import("./stillContactVideoHandoff");
    const meta = (input.stillMeta ?? {}) as Record<string, unknown>;
    const contact = assertStillContactVideoHandoff({
      visualDescription: vd,
      stillPrompt: input.stillPrompt,
      stillMeta: meta,
      propMissing: Boolean(meta.propMissing),
      stillQuality: input.stillQuality ?? (meta.stillQuality as string | undefined),
    });
    if (!contact.ok && contact.severity === "BLOCK") {
      let cta = "重出带道具静照";
      try {
        const { irdCtaLabelFromAction } =
          require("../design/stillIntentReverse") as typeof import("../design/stillIntentReverse");
        cta = irdCtaLabelFromAction({
          primaryAction: "batch_still_hq",
          missingSlots: contact.missingSlots ?? ["propInFrame", "contactGeom"],
        });
      } catch {
        /* keep default */
      }
      return {
        ok: false,
        severity: "BLOCK",
        code: contact.code ?? "STILL-CONTACT-HANDOFF",
        message: contact.message ?? "接触事件静帧缺道具",
        reverseTrigger: contact.reverseTrigger ?? "still_prop_missing",
        primaryNextStep: "batch_still",
        stillQuality: "weak",
        missingSlots: contact.missingSlots ?? ["propInFrame", "contactGeom"],
        ctaLabel: cta,
        intentClass: intent.intentClass,
      };
    }
  } catch {
    /* optional */
  }

  if (input.fidelityFailed) {
    const irdAct = stillDirtyPrimaryAction(shot, { fidelityFailed: true });
    const { missingSlots, litDebt } = collectLitDebt(vd, shotSize);
    const enhanceAct =
      irdAct === "confirm_enhance" || irdAct === "apply_auto_enhance" || irdAct === "confirm_split";
    const forceEdit = (litDebt || irdAct === "hand_edit_vd") && !enhanceAct;
    const toDesign =
      forceEdit ||
      enhanceAct ||
      irdAct === "confirm_split" ||
      irdAct === "apply_auto" ||
      irdAct === "hand_edit_vd" ||
      irdAct === "confirm_enhance" ||
      irdAct === "apply_auto_enhance";
    const next = forceEdit
      ? "chat_repair"
      : enhanceAct
        ? irdAct === "confirm_split" || irdAct === "apply_auto"
          ? "split_shot"
          : "chat_repair"
        : toDesign
          ? irdAct === "confirm_split" || irdAct === "apply_auto"
            ? "split_shot"
            : "chat_repair"
          : "batch_still";
    const hasXor = missingSlots.includes("contactRoleXor");
    return {
      ok: false,
      severity: "BLOCK",
      code: "STILL-FIRSTFRAME-WEAK",
      message: forceEdit
        ? litDebtMessage(missingSlots)
        : enhanceAct
          ? hasXor
            ? "颊触与口创同镜须互斥或拆镜；可批准增强/拆镜，禁止只 regen"
            : "文学结构可增强；请批准增强或手改 VD，禁止只 regen"
          : toDesign
            ? "静帧保真失败且设计层有缺口；请 IRD/拆镜或改 VD，禁止只 regen"
            : "静帧保真环未过，禁止作视频首帧；请 hq_update 重出静照（非改 VD）",
      reverseTrigger: hasXor
        ? "lit_detail_contact_xor"
        : forceEdit || enhanceAct
          ? "lit_detail_contact"
          : toDesign
            ? "still_firstframe_dirty"
            : "still_firstframe_weak",
      primaryNextStep: next,
      stillQuality: "weak",
      irdPrimaryAction: forceEdit ? "hand_edit_vd" : irdAct,
      intentClass: intent.intentClass,
      missingSlots: (forceEdit || enhanceAct) && missingSlots.length ? missingSlots : undefined,
      ctaLabel:
        forceEdit || enhanceAct
          ? (() => {
              try {
                const { irdCtaLabelFromAction } =
                  require("../design/stillIntentReverse") as typeof import("../design/stillIntentReverse");
                return irdCtaLabelFromAction({
                  primaryAction: forceEdit ? "hand_edit_vd" : irdAct,
                  missingSlots,
                });
              } catch {
                return missingSlots.length ? `手改VD补${missingSlots.slice(0, 3).join("/")}` : "手改VD";
              }
            })()
          : undefined,
    };
  }
  const degraded = degradeHqWithoutVisualPass(input.stillMeta ?? null);
  if (degraded === "weak" || degraded === "missing") {
    const irdAct = stillDirtyPrimaryAction(shot, { layoutOnly: true });
    const { missingSlots, litDebt } = collectLitDebt(vd, shotSize);
    const forceEdit = litDebt || irdAct === "hand_edit_vd";
    const toDesign =
      forceEdit || irdAct === "confirm_split" || irdAct === "apply_auto" || irdAct === "hand_edit_vd";
    let debtCta: { primaryNextStep: "batch_still" | "chat_repair" | "split_shot"; ctaLabel: string } | null =
      null;
    if (!toDesign && !forceEdit) {
      try {
        const { runUntilClearDetect, untilClearBurnCta } =
          require("../quality/untilClearRuntime") as typeof import("../quality/untilClearRuntime");
        const findings = runUntilClearDetect({
          phase: "video_burn",
          visualDescription: vd,
          shotSize,
          stillQuality: degraded ?? input.stillQuality,
          visualPass: input.stillMeta?.visualPass,
          visualPassAt: input.stillMeta?.visualPassAt,
          fidelityItems: (input.stillMeta?.fidelityItems ?? []).map((i) => ({
            id: i.id,
            pass: i.pass !== false,
            fixHint: i.fixHint,
          })),
        });
        if (findings.length) debtCta = untilClearBurnCta(findings);
      } catch {
        /* optional */
      }
    }
    return {
      ok: false,
      severity: "BLOCK",
      code: degraded === "missing" ? "STILL-FIRSTFRAME-MISSING" : "STILL-FIRSTFRAME-WEAK",
      message: forceEdit
        ? litDebtMessage(missingSlots)
        : toDesign
          ? "静帧质量未达标且检出设计码；请 stillIntentOps"
          : debtCta
            ? `静帧质量未达标（${debtCta.ctaLabel}）`
            : "静帧质量未达标（缺 visualPass），请重出 HQ 静照后再烧视频",
      reverseTrigger: forceEdit
        ? "lit_detail_anchor"
        : toDesign
          ? "still_firstframe_dirty"
          : "still_firstframe_weak",
      primaryNextStep: toDesign
        ? forceEdit || irdAct === "hand_edit_vd"
          ? "chat_repair"
          : "split_shot"
        : debtCta?.primaryNextStep ?? "batch_still",
      stillQuality: degraded,
      irdPrimaryAction: forceEdit ? "hand_edit_vd" : irdAct,
      intentClass: intent.intentClass,
      missingSlots: forceEdit && missingSlots.length ? missingSlots : undefined,
      ctaLabel: forceEdit
        ? (() => {
            try {
              const { irdCtaLabelFromAction } =
                require("../design/stillIntentReverse") as typeof import("../design/stillIntentReverse");
              return irdCtaLabelFromAction({
                primaryAction: "hand_edit_vd",
                missingSlots,
              });
            } catch {
              return missingSlots.length ? `手改VD补${missingSlots.slice(0, 3).join("/")}` : "手改VD";
            }
          })()
        : toDesign
          ? undefined
          : debtCta?.ctaLabel ?? "重出HQ静照",
    };
  }
  let sheetLeak =
    input.sheetLeak != null ? Boolean(input.sheetLeak) : Boolean(input.stillMeta?.sheetLeak);
  let infraGap = false;
  try {
    const { isStillVlmInfraGap } =
      require("./resolveStillForBurn") as typeof import("./resolveStillForBurn");
    infraGap = isStillVlmInfraGap(input.stillMeta as Record<string, unknown> | null);
  } catch {
    infraGap =
      input.stillMeta?.pendingHumanRejudge === true ||
      String(input.stillMeta?.fidelityStopReason ?? "") === "vlm_error";
  }
  try {
    const { promptImpliesSheetCollageLeak, detectSheetLeakFromVlmItems } =
      require("../compilers/stillFirstFrameLiterarySsot") as typeof import("../compilers/stillFirstFrameLiterarySsot");
    // Sticky sheetLeak from VLM-infra placeholders is not pixel collage (unless caller cleared)
    if (input.sheetLeak == null && infraGap && sheetLeak) {
      const items = input.stillMeta?.fidelityItems;
      if (!items?.length || !detectSheetLeakFromVlmItems(items)) {
        sheetLeak = false;
      }
    }
    if (input.sheetLeak == null) {
      sheetLeak = sheetLeak || promptImpliesSheetCollageLeak(input.stillPrompt);
    }
  } catch {
    if (input.sheetLeak == null && infraGap) sheetLeak = false;
  }
  // Detect path: do not re-block VLM infra weak here (degrade already skipped); real sheetLeak still blocks.
  // generateVideo may pass stillQuality=weak under infra — ignore that for first_frame (homology test-still-burn-resolve).
  const ff = assertStillFirstFrameContract({
    stillPrompt: input.stillPrompt,
    stillFilePath: input.stillFilePath,
    requireStill: true,
    literaryDesc: input.literaryDesc ?? undefined,
    literaryDescHashAtCompose: input.literaryDescHashAtCompose ?? undefined,
    stillQuality: sheetLeak ? "weak" : infraGap ? undefined : input.stillQuality ?? undefined,
    sheetLeak,
  });
  if (!ff.ok && ff.severity === "BLOCK") {
    if (ff.reverseTrigger === "still_firstframe_stale") {
      return {
        ok: false,
        severity: "BLOCK",
        code: ff.code ?? "STILL-FIRSTFRAME-STALE",
        message: ff.message ?? "静照已过期",
        reverseTrigger: "still_firstframe_stale",
        primaryNextStep: "chat_repair",
        stillQuality: "weak",
        intentClass: ff.intentClass ?? intent.intentClass,
      };
    }
    if (ff.reverseTrigger === "dirty_still_prompt" || intent.dirtyHandEye) {
      return {
        ok: false,
        severity: "BLOCK",
        code: ff.code ?? "STILL-FIRSTFRAME-DIRTY",
        message: ff.message ?? "真脏手+脸",
        reverseTrigger: "dirty_still_prompt",
        primaryNextStep: "chat_repair",
        stillQuality: "weak",
        intentClass: ff.intentClass ?? intent.intentClass,
      };
    }
    // Real collage: keep 禁拼版重抽 — never mash with unrelated split_shot IRD
    if (sheetLeak || ff.reverseTrigger === "still_firstframe_weak") {
      return {
        ok: false,
        severity: "BLOCK",
        code: ff.code ?? "STILL-FIRSTFRAME-WEAK",
        message: ff.message ?? "静照未过高质量",
        reverseTrigger: ff.reverseTrigger ?? "still_firstframe_weak",
        primaryNextStep: "batch_still",
        stillQuality: "weak",
        intentClass: ff.intentClass ?? intent.intentClass,
        ctaLabel: sheetLeak ? "禁拼版重抽" : undefined,
      };
    }
    const irdAct = stillDirtyPrimaryAction(shot, {});
    const { missingSlots, litDebt } = collectLitDebt(vd, shotSize);
    const forceEdit = litDebt || irdAct === "hand_edit_vd";
    const toDesign =
      forceEdit || irdAct === "confirm_split" || irdAct === "apply_auto" || irdAct === "hand_edit_vd";
    return {
      ok: false,
      severity: "BLOCK",
      code: ff.code ?? "STILL-FIRSTFRAME-DIRTY",
      message: forceEdit ? litDebtMessage(missingSlots) : (ff.message ?? "首帧契约失败"),
      reverseTrigger: forceEdit ? "lit_detail_anchor" : (ff.reverseTrigger ?? "still_firstframe_dirty"),
      primaryNextStep: toDesign
        ? forceEdit || irdAct === "hand_edit_vd"
          ? "chat_repair"
          : "split_shot"
        : "batch_still",
      stillQuality: "weak",
      irdPrimaryAction: forceEdit ? "hand_edit_vd" : irdAct,
      intentClass: ff.intentClass ?? intent.intentClass,
      missingSlots: forceEdit && missingSlots.length ? missingSlots : undefined,
      ctaLabel: forceEdit
        ? (() => {
            try {
              const { irdCtaLabelFromAction } =
                require("../design/stillIntentReverse") as typeof import("../design/stillIntentReverse");
              return irdCtaLabelFromAction({
                primaryAction: "hand_edit_vd",
                missingSlots,
              });
            } catch {
              return missingSlots.length ? `手改VD补${missingSlots.slice(0, 3).join("/")}` : "手改VD";
            }
          })()
        : undefined,
    };
  }
  return { ok: true, severity: "ok", stillQuality: "hq_ok", intentClass: intent.intentClass };
}

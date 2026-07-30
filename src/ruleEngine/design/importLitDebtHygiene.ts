/**
 * Import-track lit debt hygiene — smart-expand XOR split first; soft-fill residual; never claims designExitPass.
 */
import type { ShapeSalvageEntry } from "../bundle/shapeSalvageTypes";

export type ImportLitHygieneResult = {
  softFilled: number[];
  splitCount: number;
  primaryAction?: string;
  ctaLabel?: string;
  confirmRequired: boolean;
  missingSlots: string[];
  warnMessage?: string;
  shots?: Record<string, unknown>[];
};

export function runImportLitDebtHygiene(input: {
  shots: Record<string, unknown>[];
  meta: Record<string, unknown>;
  shapeSalvageLog?: ShapeSalvageEntry[];
}): ImportLitHygieneResult {
  const out: ImportLitHygieneResult = {
    softFilled: [],
    splitCount: 0,
    confirmRequired: false,
    missingSlots: [],
  };
  let shots = input.shots;
  if (!shots.length) return out;

  try {
    const { getEnhancementFillPolicy, auditLiteraryDetailQuality } =
      require("../compilers/stillLiteraryDetailQuality") as typeof import("../compilers/stillLiteraryDetailQuality");
    const { applyLitFillToShots, buildLitFillSuggestions } =
      require("./literaryDetailLlmFill") as typeof import("./literaryDetailLlmFill");
    const { diagnoseStillIntent } =
      require("./stillIntentReverse") as typeof import("./stillIntentReverse");
    const { expandLitContactXor } =
      require("./expandLitContactXor") as typeof import("./expandLitContactXor");
    const { sliceFieldsAfterIrdSplit } =
      require("./sliceFieldsAfterIrdSplit") as typeof import("./sliceFieldsAfterIrdSplit");

    const hasLitDebt = shots.some((s) => {
      const a = auditLiteraryDetailQuality({
        visualDescription: String(s.visualDescription ?? ""),
        shotSize: String(s.shotSize ?? ""),
      });
      return a.findings.some(
        (f) =>
          f.severity === "BLOCK" &&
          (/^DEX-LIT-/.test(f.id) || f.id === "DEX-PROP-CONT"),
      );
    });
    // Also detect face-CU dual-contact even if soft XOR phrase already present
    const hasFaceDual =
      !hasLitDebt &&
      shots.some((s) => {
        const vd = String(s.visualDescription ?? "");
        const sz = String(s.shotSize ?? "");
        const faceCu = /特写|近景|CU/i.test(sz) || /侧脸|正脸|特写/.test(vd);
        return faceCu && /划过|贴/.test(vd) && /咬|渗血|血珠/.test(vd) && !s._litXorSplitId;
      });
    if (!hasLitDebt && !hasFaceDual) return out;

    // P0: same-kernel smart split (split > XOR soft-fill) — import does NOT hard-block warehouse
    const lx = expandLitContactXor(shots, { forceExpand: true, chatStrict: false });
    if (lx.expandedCount > 0) {
      shots = lx.shots;
      try {
        shots = sliceFieldsAfterIrdSplit(shots).shots;
      } catch {
        /* optional */
      }
      out.splitCount = lx.expandedCount;
      out.shots = shots;
      // Mark forward stages stale so children do not inherit parent collage / video pass
      for (const s of shots) {
        if (s._litXorSplitId) {
          s.promptState = "stale";
          s.composeHash = undefined;
          s.stillQuality = undefined;
          s.visualPass = false;
          s.visualPassAt = undefined;
        }
      }
      try {
        const { cascadeForwardStale } =
          require("../quality/forwardStaleCascade") as typeof import("../quality/forwardStaleCascade");
        cascadeForwardStale({
          shots,
          forwardStages: ["SB", "MD-IMG", "EN"],
        });
      } catch {
        /* optional */
      }
      // mutate caller's array in place for exportGate
      input.shots.length = 0;
      input.shots.push(...shots);
      input.meta.importOkNotExitPass = true;
      input.meta.litImportSmartSplit = lx.expandedCount;
      input.meta.importSplitExpanded = true;
      (input.shapeSalvageLog ??= []).push({
        ruleId: "SH-LIT-IMPORT-SMART-SPLIT",
        path: "preDesignPack.shots",
        action: `expanded=${lx.expandedCount};log=${lx.log.slice(0, 4).join("|")}`,
      });
    } else if (lx.confirmRequired) {
      out.confirmRequired = true;
      out.primaryAction = "confirm_split";
      out.ctaLabel = "确认拆镜（颊触与口创分镜）";
      input.meta.irdConfirmRequired = true;
      input.meta.litDebtPrimaryAction = "confirm_split";
      input.meta.litDebtCta = out.ctaLabel;
      input.meta.importOkNotExitPass = true;
      input.meta.litDebtImportPending = true;
    }

    // Residual CONTACT/ANCHOR soft-fill (not XOR dual — already split or confirm)
    const residual = shots.filter((s) => {
      if (s._litXorSplitId) return false;
      const a = auditLiteraryDetailQuality({
        visualDescription: String(s.visualDescription ?? ""),
        shotSize: String(s.shotSize ?? ""),
      });
      return a.findings.some(
        (f) =>
          f.severity === "BLOCK" &&
          (f.id === "DEX-LIT-CONTACT" || f.id === "DEX-LIT-ANCHOR" || f.id === "DEX-LIT-EXPR"),
      );
    });
    if (residual.length && getEnhancementFillPolicy().allowImportStructureSoftFill) {
      const meta = { ...input.meta, importTrack: true };
      const sug = buildLitFillSuggestions({
        shots: residual,
        literaryDetailLlmFill: true,
        intentVisualEnhance: true,
        importTrack: true,
        confidence: 0.85,
        meta,
      });
      if (sug.suggestions.length) {
        const filled = applyLitFillToShots({
          shots,
          fills: sug.suggestions.map((s) => ({ shotIndex: s.shotIndex, append: s.suggestedAppend })),
          literaryDetailLlmFill: true,
          intentVisualEnhance: true,
          importTrack: true,
          confidence: 0.85,
          forceApply: true,
          meta,
        });
        if (filled.applied.length) {
          out.softFilled = filled.applied;
          input.meta.litImportSoftFilled = filled.applied;
          input.meta.importOkNotExitPass = true;
          (input.shapeSalvageLog ??= []).push({
            ruleId: "SH-LIT-IMPORT-SOFT-FILL",
            path: "preDesignPack.shots[].visualDescription",
            action: `filled=${filled.applied.join(",")}`,
          });
        }
      }
    }

    const ird = diagnoseStillIntent(shots, { meta: { ...input.meta, importTrack: true } });
    out.primaryAction = out.splitCount
      ? "apply_auto"
      : out.primaryAction || ird.primaryAction;
    out.ctaLabel = out.splitCount
      ? `已智能拆颊触/口创（${out.splitCount}）`
      : out.ctaLabel || ird.ctaLabel;
    out.missingSlots = ird.missingSlots ?? [];
    if (!out.splitCount && (ird.primaryAction === "confirm_split" || ird.primaryAction === "confirm_enhance")) {
      out.confirmRequired = true;
      input.meta.irdConfirmRequired = true;
      input.meta.litDebtPrimaryAction = ird.primaryAction;
      input.meta.litDebtCta = ird.ctaLabel;
      input.meta.litDebtImportPending = true;
      input.meta.importOkNotExitPass = true;
    }

    if (out.confirmRequired && !(input.shapeSalvageLog ?? []).some((e) => e.ruleId === "SH-LIT-IMPORT-CONFIRM")) {
      (input.shapeSalvageLog ??= []).push({
        ruleId: "SH-LIT-IMPORT-CONFIRM",
        path: "meta.litDebtPrimaryAction",
        action: `action=${out.primaryAction};cta=${out.ctaLabel ?? ""}`,
      });
    }

    out.warnMessage = out.splitCount
      ? `【可导入 · 已智能拆文学双接触】扩 ${out.splitCount} 组颊触/口创；importOk≠designExitPass，须设计 Exit 复检`
      : out.confirmRequired
        ? `【可导入 · 文学债须设计确认】${out.ctaLabel || out.primaryAction || "confirm"}；importOk≠designExitPass`
        : out.softFilled.length
          ? `【可导入 · 已文学结构软填】镜 ${out.softFilled.join(",")}；仍须设计 Exit 复检`
          : undefined;
  } catch {
    /* optional */
  }
  return out;
}

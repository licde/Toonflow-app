/**
 * preserveMedia 行数门辅助：导入智拆后镜数可≠作者原包 / 库内，按 clientId 保媒体。
 */
import type { ScriptBundle, StoryboardPanelInput } from "./types";
import type { ShapeSalvageEntry } from "./shapeSalvageTypes";

/** 导入轨智拆（exportGate salvage / lit XOR / oneBeat…）标记 */
export function detectImportSmartExpand(
  bundle: ScriptBundle,
  linkedPanels: StoryboardPanelInput[],
  shapeSalvageLog?: ShapeSalvageEntry[],
): boolean {
  const meta = (bundle as { meta?: Record<string, unknown> }).meta ?? {};
  if (meta.importSplitExpanded || meta.litImportSmartSplit || meta.mergeCountSmartExpand) return true;
  if ((bundle as { _importSplitExpanded?: boolean })._importSplitExpanded) return true;
  if (
    (shapeSalvageLog ?? []).some((e) =>
      /SMART-SPLIT|IMPORT-EXPAND|LIT-IMPORT-SMART|forceExpand|expanded=/i.test(
        `${e.ruleId ?? ""} ${e.action ?? ""}`,
      ),
    )
  ) {
    return true;
  }
  return linkedPanels.some((p) => {
    const x = p as Record<string, unknown>;
    return Boolean(
      x._stillBeatSplitId ||
        x._visualSplitId ||
        x._litXorSplitId ||
        x._cuCastSplitId ||
        x.xorSplit ||
        x._splitFrom,
    );
  });
}

/** 是否允许 preserveMedia 在库内≠待写入时继续（禁下标绑媒体） */
export function allowPreserveMediaCountMismatch(input: {
  existingN: number;
  incomingN: number;
  rawN: number;
  diagnoseOnly: boolean;
  expandAppliedPrepare: boolean;
  forceExpand?: boolean;
  acknowledgeKeepLegacy?: boolean;
  importSmartExpand: boolean;
}): { allow: boolean; note?: string } {
  if (input.existingN <= 0 || input.incomingN === input.existingN) {
    return { allow: true };
  }
  const authorStable =
    input.diagnoseOnly && input.rawN > 0 && input.incomingN === input.rawN;
  if (authorStable) {
    return {
      allow: true,
      note: `preserveMedia: 库内 ${input.existingN} → 作者 ${input.incomingN}（diagnose-only SSOT）`,
    };
  }
  if (input.importSmartExpand || input.forceExpand || input.acknowledgeKeepLegacy) {
    if (input.importSmartExpand && !input.forceExpand) {
      return {
        allow: true,
        note: `preserveMedia: 库内 ${input.existingN} → 智拆后 ${input.incomingN}（作者原 ${input.rawN}；按 clientId 保媒体）`,
      };
    }
    return { allow: true };
  }
  const runawayInflate =
    input.rawN > 0 && input.incomingN >= Math.max(input.rawN * 2, input.rawN + 8);
  const inflateRisk =
    runawayInflate ||
    (input.expandAppliedPrepare && input.incomingN !== input.rawN);
  if (inflateRisk || !authorStable) {
    return { allow: false };
  }
  return { allow: true };
}

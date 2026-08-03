/**
 * Warehouse debt SSOT — importOk≠exit / lip / ird / expandProvenance.
 * Survives into EpisodePackage so production gates read the same markers.
 */
import type { EpisodePackage } from "../types";
import type { ScriptBundle } from "./types";

export type WarehouseDebtMeta = {
  importOkNotExitPass?: boolean;
  importDiagnoseOnly?: boolean;
  lipConfirmRequired?: boolean;
  irdConfirmRequired?: boolean;
  importSplitExpanded?: boolean;
  expandProvenance?: Record<string, unknown>;
  designSlotHealSummary?: Record<string, unknown>;
  designExitIncomplete?: boolean;
};

export function extractWarehouseDebtFromBundle(bundle: ScriptBundle | Record<string, unknown>): WarehouseDebtMeta {
  const b = bundle as ScriptBundle & {
    meta?: Record<string, unknown>;
    irdConfirmRequired?: boolean;
    _importSplitExpanded?: boolean;
  };
  const bMeta = (b.meta ?? {}) as Record<string, unknown>;
  const pdMeta = ((b.planData as { meta?: Record<string, unknown> } | undefined)?.meta ??
    {}) as Record<string, unknown>;
  const meta = { ...pdMeta, ...bMeta };
  return {
    importOkNotExitPass: Boolean(meta.importOkNotExitPass),
    importDiagnoseOnly: Boolean(meta.importDiagnoseOnly),
    lipConfirmRequired: Boolean(meta.lipConfirmRequired),
    irdConfirmRequired: Boolean(
      meta.irdConfirmRequired || b.irdConfirmRequired || pdMeta.irdConfirmRequired,
    ),
    importSplitExpanded: Boolean(
      meta.importSplitExpanded || b._importSplitExpanded || pdMeta.importSplitExpanded,
    ),
    expandProvenance:
      (meta.expandProvenance as Record<string, unknown> | undefined) ??
      (pdMeta.expandProvenance as Record<string, unknown> | undefined),
    designSlotHealSummary: meta.designSlotHealSummary as Record<string, unknown> | undefined,
    designExitIncomplete: Boolean(meta.designExitIncomplete),
  };
}

/** Sync debt into both bundle.meta and planData.meta (single write surface). */
export function writeWarehouseDebtToBundle(
  bundle: ScriptBundle,
  debt: Partial<WarehouseDebtMeta>,
): void {
  const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
  const pd = ((bundle.planData as Record<string, unknown> | undefined) ??
    ((bundle as { planData?: Record<string, unknown> }).planData = {}));
  const pdMeta = ((pd.meta as Record<string, unknown> | undefined) ??
    ((pd as { meta?: Record<string, unknown> }).meta = {}));
  for (const [k, v] of Object.entries(debt)) {
    if (v === undefined) continue;
    bMeta[k] = v;
    pdMeta[k] = v;
  }
  if (debt.irdConfirmRequired) {
    (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
  }
  if (debt.importSplitExpanded) {
    (bundle as { _importSplitExpanded?: boolean })._importSplitExpanded = true;
  }
}

export function applyWarehouseDebtToPackage(
  pkg: EpisodePackage,
  debt: WarehouseDebtMeta,
): EpisodePackage {
  const next = {
    ...pkg,
    warehouseDebt: { ...(pkg.warehouseDebt ?? {}), ...debt },
    meta: { ...((pkg as { meta?: Record<string, unknown> }).meta ?? {}), ...debt },
  } as EpisodePackage & { meta?: WarehouseDebtMeta };
  return next;
}

export function readWarehouseDebtFromPackage(
  pkg: EpisodePackage | null | undefined,
): WarehouseDebtMeta {
  if (!pkg) return {};
  const wd = pkg.warehouseDebt ?? {};
  const meta = (pkg as { meta?: WarehouseDebtMeta }).meta ?? {};
  return {
    importOkNotExitPass: Boolean(wd.importOkNotExitPass ?? meta.importOkNotExitPass),
    importDiagnoseOnly: Boolean(wd.importDiagnoseOnly ?? meta.importDiagnoseOnly),
    lipConfirmRequired: Boolean(wd.lipConfirmRequired ?? meta.lipConfirmRequired),
    irdConfirmRequired: Boolean(wd.irdConfirmRequired ?? meta.irdConfirmRequired),
    importSplitExpanded: Boolean(wd.importSplitExpanded ?? meta.importSplitExpanded),
    expandProvenance: wd.expandProvenance ?? meta.expandProvenance,
    designSlotHealSummary: wd.designSlotHealSummary ?? meta.designSlotHealSummary,
    designExitIncomplete: Boolean(wd.designExitIncomplete ?? meta.designExitIncomplete),
  };
}

export function warehouseDebtBlocksVideo(debt: WarehouseDebtMeta): boolean {
  return Boolean(debt.lipConfirmRequired || debt.importOkNotExitPass || debt.irdConfirmRequired);
}

export function warehouseDebtStillEnhance(debt: WarehouseDebtMeta): {
  enhance: boolean;
  ctaLabel: string;
  userMessage: string;
} {
  if (!warehouseDebtBlocksVideo(debt) && !debt.designExitIncomplete) {
    return { enhance: false, ctaLabel: "", userMessage: "" };
  }
  return {
    enhance: true,
    ctaLabel: "智能修复",
    userMessage:
      "importOk≠designExitPass：仓债未闭（可 draft，draft≠hq_ok≠设计已闭）。请点「智能修复」槽愈/Confirm 智拆后再当 HQ。",
  };
}

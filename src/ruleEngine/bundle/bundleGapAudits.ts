import type { ScriptBundle } from "./types";
import type { BundleGapAuditResult, GapRepairMode } from "./auditTypes";
import { auditAdaptationGaps } from "./adaptationAudit";
import { auditRetentionGaps } from "./retentionAudit";
import { auditNarrativeDriveGaps } from "./narrativeDriveAudit";
import { auditPackagingGaps } from "./packagingAudit";
import { auditGenerationApplyGaps } from "./generationApplyAudit";
import { auditDesignSpecGaps } from "./designSpecAudit";
import { auditScriptViralGaps } from "./scriptViralAudit";
import { auditModalityChainGaps } from "./modalityChainAudit";

function resolveRepairMode(gaps: { chainId?: string }[]): GapRepairMode {
  const chains = new Set(gaps.map((g) => g.chainId).filter(Boolean));
  if (chains.size > 1) return "rePush";
  if (chains.size === 1 && gaps.length > 1) return "linkageRepair";
  return "fixPlan";
}

export function auditAllBundleGaps(bundle: ScriptBundle, tier: "T1" | "T2" | "T3" = "T3"): BundleGapAuditResult {
  const adaptationGaps = auditAdaptationGaps(bundle);
  const retentionGaps = auditRetentionGaps(bundle);
  const narrativeDriveGaps = auditNarrativeDriveGaps(bundle);
  const packagingGaps = auditPackagingGaps(bundle);
  const generationApplyGaps = auditGenerationApplyGaps(bundle, tier);
  const designSpecGaps = auditDesignSpecGaps(bundle);
  const scriptViralGaps = auditScriptViralGaps(bundle);
  const modalityGaps = auditModalityChainGaps(bundle, tier);

  const allGaps = [
    ...adaptationGaps,
    ...retentionGaps,
    ...narrativeDriveGaps,
    ...packagingGaps,
    ...generationApplyGaps,
    ...designSpecGaps,
    ...scriptViralGaps,
    ...modalityGaps,
  ];

  const triggers = [...new Set(allGaps.map((g) => g.trigger).filter(Boolean))] as string[];
  const repairMode = resolveRepairMode(allGaps);

  return {
    adaptationGaps,
    retentionGaps,
    narrativeDriveGaps,
    packagingGaps,
    generationApplyGaps,
    designSpecGaps,
    scriptViralGaps,
    modalityGaps,
    allGaps,
    triggers,
    repairMode,
  };
}

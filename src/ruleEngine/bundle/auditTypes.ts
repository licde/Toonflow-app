export type GapSeverity = "WARN" | "BLOCK";

export interface BundleGap {
  id: string;
  severity: GapSeverity;
  message: string;
  chainId?: string;
  trigger?: string;
  field?: string;
  shotIndex?: number;
}

export type GapRepairMode = "fixPlan" | "linkageRepair" | "rePush";

export interface BundleGapAuditResult {
  adaptationGaps: BundleGap[];
  retentionGaps: BundleGap[];
  narrativeDriveGaps: BundleGap[];
  packagingGaps: BundleGap[];
  generationApplyGaps: BundleGap[];
  designSpecGaps: BundleGap[];
  scriptViralGaps: BundleGap[];
  modalityGaps: BundleGap[];
  allGaps: BundleGap[];
  triggers: string[];
  repairMode: GapRepairMode;
}

/** Copy to Toonflow-web — matches POST /api/ruleEngine/inspectBundle response */

export type ClosureTier = "T1" | "T2" | "T3";

export interface ClosureCheck {
  id: string;
  passed: boolean;
  message?: string;
  severity?: "BLOCK" | "WARN" | "INFO";
}

export interface ReverseHint {
  dimension: string;
  chainId: string;
  symptom: string;
  reverseTarget: string;
  preserveFields?: string[];
  ruleId?: string;
}

export interface RepairHint {
  id: string;
  chatTemplate?: string;
  ruleId?: string;
  qpId?: string;
}

export interface RePushPlanItem {
  trigger: string;
  reverseTarget: string;
  preserveFields: string[];
  presentationFork?: "fork-A" | "fork-B" | null;
  status?: "pending" | "applied";
}

export interface InspectBundleResult {
  tier: ClosureTier;
  blocked: boolean;
  rulePackVersion: string;
  closureChecks: {
    dc: ClosureCheck[];
    pc: ClosureCheck[];
    gc: ClosureCheck[];
    ic: ClosureCheck[];
    blocked: boolean;
  };
  forwardTrace?: { version?: string; traces?: unknown[] };
  reverseHints?: ReverseHint[];
  repairHints?: RepairHint[];
  rePushPlan?: RePushPlanItem[];
  warnings?: string[];
}

export interface DryRunImportResponse extends InspectBundleResult {
  preImport?: InspectBundleResult;
  willCreateScript?: boolean;
  willOverwriteLayers?: string[];
  storyboardCount?: number;
}

export type ClosureDimension = "dc" | "pc" | "gc" | "ic";

export const CLOSURE_DIMENSION_LABELS: Record<ClosureDimension, string> = {
  dc: "设计闭环 DC",
  pc: "制作闭环 PC",
  gc: "生成闭环 GC",
  ic: "智能修复 IC",
};

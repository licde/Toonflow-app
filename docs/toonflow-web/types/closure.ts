/** Copy to Toonflow-web — matches POST /api/ruleEngine/inspectBundle response */

export type ClosureTier = "T1" | "T2" | "T3";

export interface ClosureCheck {
  id: string;
  passed: boolean;
  message?: string;
  severity?: "BLOCK" | "WARN" | "INFO" | "OPTIMIZE";
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
  id?: string;
  trigger: string;
  reverseTarget: string;
  preserveFields?: string[];
  presentationFork?: "fork-A" | "fork-B" | null;
  reason?: string;
  status?: "pending" | "applied" | "in_progress" | "completed" | "exhausted";
}

/** W93 / IC-02 smart proposal — Confirm then apply via smartProposalOps */
export interface SmartDesignProposal {
  id?: string;
  ruleId: string;
  trigger: string;
  proposal: string;
  targetStage: string;
  status: "pending_user_confirm" | "confirmed" | "rejected" | "applied";
  shotIndex?: number;
  confidence?: number;
  presentationFork?: { fork: string; label: string }[];
}

export function forkLabel(fork: RePushPlanItem["presentationFork"] | string | null | undefined): string {
  if (fork === "fork-A") return "改 W3 △ 叙事描述";
  if (fork === "fork-B") return "改 SB spatialRelation 镜级";
  return "";
}

export interface ClosureReport {
  missing?: string[];
  optimize?: string[];
  chains?: string[];
}

export interface ChatPromptGap {
  id: string;
  shotIndex?: number;
  severity: "BLOCK" | "WARN";
  message: string;
  field?: string;
}

export interface MergeReport {
  action: "create" | "update" | "match";
  scriptId: number;
  storyboardReplaced: boolean;
  storyboardCount: number;
  blueprintMerged: boolean;
  assetsSeeded?: number;
  importMode?: string;
  mergeStrategy?: string;
}

export interface ExportGateSummary {
  exportAllowed: boolean;
  chatRepairText?: string;
  /** SB designExit failed */
  designExitIncomplete?: boolean;
  /** Prefer this for preview toast — 阻断时不以 salvage 冒充已修；须重设计优先于设计未闭合 */
  previewStatusLine?: string;
  redesignRequired?: boolean;
  blocks?: { id: string; message?: string; field?: string; shotIndex?: number }[];
  warns?: { id: string; message?: string }[];
  repairHints?: RepairHint[];
  missingFieldSummary?: string;
  missingFieldReport?: unknown[];
  rePushPlan?: RePushPlanItem[];
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
  chatPromptGaps?: ChatPromptGap[];
  closureReport?: ClosureReport;
  modalityGaps?: unknown[];
  adaptationGaps?: unknown[];
  retentionGaps?: unknown[];
  /** One-copy repair brief when available from inspect/exportGate */
  chatRepairText?: string;
  /** W93 smart proposals (also pass as RulePanel prop) */
  smartDesignProposals?: SmartDesignProposal[];
}

export interface DryRunImportResponse {
  preImport?: InspectBundleResult;
  willCreateScript?: boolean;
  willOverwriteLayers?: string[];
  storyboardCount?: number;
  /** Author pack before prepare */
  rawShotCount?: number;
  /** After prepareBundleForInspect */
  postPrepareCount?: number;
  expandDelta?: number;
  continuityEdgeCount?: number;
  designSlotHealSummary?: Record<string, unknown>;
  rePushApplied?: number;
  rePushSoftDeferred?: number;
  importDiagnoseOnly?: boolean;
  irdConfirmRequired?: boolean;
  importOkNotExitPass?: boolean;
  designExitIncomplete?: boolean;
  mergeStrategy?: string;
  warnings?: string[];
  skipAutoDesignSb?: boolean;
  closureChecks?: InspectBundleResult["closureChecks"];
  endpoint?: "ext" | "int";
  /** SSOT for import preview CTA — wire to RulePanel */
  exportGate?: ExportGateSummary;
  chatRepairText?: string;
  tier?: ClosureTier;
  previewStatusLine?: string;
}

export interface ImportScriptResult {
  scriptId: number;
  idMap: Record<string, number>;
  mergeReport?: MergeReport;
  preImport?: InspectBundleResult;
  postImport?: unknown;
  chatPromptGaps?: ChatPromptGap[];
  ruleConsistencyGaps?: { id: string; severity: string; message: string; field?: string }[];
  pathGuard?: { recommended: string; severity: string; message: string };
  autoDesignJobId?: string;
  dryRun?: DryRunImportResponse;
  exportGate?: ExportGateSummary;
  chatRepairText?: string;
}

export type ClosureDimension = "dc" | "pc" | "gc" | "ic";

export const CLOSURE_DIMENSION_LABELS: Record<ClosureDimension, string> = {
  dc: "设计闭环 DC",
  pc: "制作闭环 PC",
  gc: "生成闭环 GC",
  ic: "智能修复 IC",
};

/** API envelope from backend */
export interface ApiEnvelope<T> {
  code: number;
  data: T;
  message: string;
}

export class ApiError extends Error {
  status: number;
  details: Record<string, unknown>;
  chatRepairText?: string;

  constructor(status: number, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    this.chatRepairText = typeof details.chatRepairText === "string" ? details.chatRepairText : undefined;
  }
}

export async function unwrapApi<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let details: Record<string, unknown> = {};
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body && typeof body === "object") {
        message = String((body as { message?: string }).message ?? message);
        details = ((body as { data?: Record<string, unknown> }).data ?? body) as Record<string, unknown>;
      }
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }
    throw new ApiError(res.status, message, details);
  }
  const body = await res.json();
  if (body && typeof body === "object" && "data" in body && "code" in body) {
    return body.data as T;
  }
  return body as T;
}

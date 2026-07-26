/**
 * DesignSplit FE contract — mirror POST /api/scriptAgent/designSplitOps
 * Unified ConfirmBar for lip / NAR / VisBeat / IRD (M9).
 */
export type DesignSplitOpsAction =
  | "proposeClauseSplit"
  | "confirmClusterSplit"
  | "dryRun"
  | "undo"
  | "forwardReentry"
  | "decideLine"
  | "stockMigrate";

export type DesignSplitOpsRequest = {
  projectId: number;
  action: DesignSplitOpsAction;
  lineId?: string;
  text?: string;
  packageVersion?: number;
  scriptId?: number;
  syncStoryboard?: boolean;
  applyClauseSplit?: boolean;
  applyVisBeatExpanders?: boolean;
  forceExpand?: boolean;
};

export type DesignSplitDryRunResult = {
  predictedPlanLineCount: number;
  predictedShotCount: number;
  confidence: number;
  autoEligible: boolean;
  autoMin: number;
  pressureShots: number;
  a11ySummary?: string;
};

/** ConfirmBar a11y: busy while confirm; announce result. Undo via designSplitLifecycle (primary). */
export type DesignSplitConfirmBarProps = {
  explain: string;
  a11yHint?: string;
  ariaBusy?: boolean;
  confidence?: number;
  autoEligible?: boolean;
  onConfirm: () => void;
  onUndo?: () => void;
  onDryRun?: () => void;
};

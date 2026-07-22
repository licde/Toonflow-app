/**
 * DesignSplit FE contract — mirror POST /api/scriptAgent/designSplitOps
 */
export type DesignSplitOpsAction =
  | "proposeClauseSplit"
  | "confirmClusterSplit"
  | "dryRun"
  | "undo"
  | "forwardReentry"
  | "decideLine";

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
};

/** ConfirmBar a11y: busy while confirm; announce result. */
export type DesignSplitConfirmBarProps = {
  explain: string;
  a11yHint?: string;
  ariaBusy?: boolean;
  onConfirm: () => void;
  onUndo?: () => void;
  onDryRun?: () => void;
};

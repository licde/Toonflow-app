/**
 * VisBeat FE contract types — mirror POST /api/scriptAgent/visBeatOps
 * @see docs/toonflow-web/VISBEAT_OPS_CONTRACT.md
 */
export type VisBeatMode = "off" | "shadow" | "enforce";

export type VisBeatOpsAction =
  | "setTags"
  | "suggestTags"
  | "proposeSplit"
  | "confirmExpand"
  | "setOverride"
  | "dryRunPanel"
  | "forwardReentry";

export type VisBeatOpsRequest = {
  projectId: number;
  action: VisBeatOpsAction;
  shotIndex?: number;
  visualBeatTags?: string[];
  purpose?: string;
  overrideReason?: string;
  note?: string;
  pillarsVisBeatV2?: VisBeatMode;
  scriptId?: number;
  syncStoryboard?: boolean;
};

export type VisBeatDryRunRow = {
  shotIndex: number | string;
  tags: string[];
  action: string;
  matrixRowId?: string;
  explain?: string;
  mode: VisBeatMode;
};

export type VisBeatConfirmBarProps = {
  matrixRowId?: string;
  explain: string;
  onConfirmSplit: () => void;
  onOverride: (reason: string) => void;
};

/**
 * Storyboard display SSOT — one label from o_storyboard.index / package shotIndex.
 * Never use v-for array index or trackList order as 镜号.
 */
export function storyboardDisplayNo(input: {
  index?: number | null;
  shotIndex?: number | null;
  packageShotIndex?: number | null;
}): number {
  if (input.index != null && Number.isFinite(Number(input.index))) {
    return Math.max(1, Math.floor(Number(input.index)) + 1);
  }
  const pkg = input.packageShotIndex ?? input.shotIndex;
  if (pkg != null && Number.isFinite(Number(pkg))) {
    return Math.max(1, Math.floor(Number(pkg)));
  }
  return 1;
}

export function formatStoryboardBadge(displayNo: number): string {
  const n = Math.max(1, Math.floor(displayNo));
  return `S${String(n).padStart(2, "0")}`;
}

export function formatTrackSegmentLabel(displayNo: number): string {
  return `第${Math.max(1, Math.floor(displayNo))}段`;
}

export type VisSyncDriftResult = {
  code: "VIS-SYNC-DRIFT" | null;
  drifted: boolean;
  tableRowCount: number;
  panelCount: number;
  livePanelCount: number;
  splitChildCount: number;
  orphanCount: number;
  message?: string;
  ctaLabel?: string;
};

/**
 * Detect table vs panel count drift.
 * Split children (_stillBeatSplitId / _visualSplitId) do not count as extras for drift.
 */
export function detectVisSyncDrift(input: {
  tableRowCount: number;
  panels: Array<{
    id?: number | null;
    index?: number | null;
    reason?: string | null;
    _stillBeatSplitId?: string | null;
    _visualSplitId?: string | null;
  }>;
}): VisSyncDriftResult {
  const tableRowCount = Math.max(0, Number(input.tableRowCount) || 0);
  let splitChildCount = 0;
  let livePanelCount = 0;
  for (const p of input.panels) {
    const reason = String(p.reason ?? "");
    let split = Boolean(p._stillBeatSplitId || p._visualSplitId);
    if (!split && reason.trim().startsWith("{")) {
      try {
        const r = JSON.parse(reason) as Record<string, unknown>;
        split = Boolean(r._stillBeatSplitId || r._visualSplitId || r.stillBeatSplitId);
      } catch {
        /* ignore */
      }
    }
    if (split) splitChildCount += 1;
    else livePanelCount += 1;
  }
  const panelCount = input.panels.length;
  const orphanCount = Math.max(0, livePanelCount - tableRowCount);
  const drifted =
    tableRowCount > 0 && livePanelCount > 0 && livePanelCount !== tableRowCount;
  return {
    code: drifted ? "VIS-SYNC-DRIFT" : null,
    drifted,
    tableRowCount,
    panelCount,
    livePanelCount,
    splitChildCount,
    orphanCount,
    message: drifted
      ? `分镜表 ${tableRowCount} 行与面板主链 ${livePanelCount} 条不一致（含拆镜子板 ${splitChildCount}）`
      : undefined,
    ctaLabel: drifted ? "按分镜表重同步面板" : undefined,
  };
}

/** Sort tracks by min linked panel index, then attach displayNo from primary panel. */
export function sortTracksByStoryboardIndex<
  T extends { id?: number; storyboardIndexMin?: number | null; displayNo?: number },
>(tracks: T[]): T[] {
  return [...tracks].sort((a, b) => {
    const ai = a.storyboardIndexMin ?? a.displayNo ?? 9999;
    const bi = b.storyboardIndexMin ?? b.displayNo ?? 9999;
    return Number(ai) - Number(bi);
  });
}

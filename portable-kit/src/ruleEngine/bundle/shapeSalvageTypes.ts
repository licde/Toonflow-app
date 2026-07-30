/** One salvage action recorded during BundleShapePipeline. */
export interface ShapeSalvageEntry {
  ruleId: string;
  path: string;
  action: string;
}

export class ShapeSalvageLog {
  readonly entries: ShapeSalvageEntry[] = [];

  push(ruleId: string, path: string, action: string): void {
    this.entries.push({ ruleId, path, action });
  }

  merge(other: ShapeSalvageLog): void {
    this.entries.push(...other.entries);
  }
}

export interface PrepareBundleResult {
  bundle: Record<string, unknown>;
  shapeSalvageLog: ShapeSalvageEntry[];
}

/** Human-readable summary for Chat/UI: what import already adapted. */
export function formatShapeSalvageSummary(entries: ShapeSalvageEntry[] | undefined | null): string | undefined {
  if (!entries?.length) return undefined;
  const byRule = new Map<string, number>();
  for (const e of entries) {
    byRule.set(e.ruleId, (byRule.get(e.ruleId) ?? 0) + 1);
  }
  const counts = [...byRule.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => `${id}×${n}`)
    .join("，");
  const sample = entries
    .slice(0, 5)
    .map((e) => `- [${e.ruleId}] ${e.path}: ${e.action}`)
    .join("\n");
  return `【已自动适配 ${entries.length} 项】${counts}\n下次导出请写权威形，避免依赖 salvage/heal。\n${sample}${entries.length > 5 ? `\n…另 ${entries.length - 5} 项见 shapeSalvageLog` : ""}`;
}

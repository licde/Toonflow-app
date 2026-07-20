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

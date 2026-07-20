/** In-memory extract job summaries (async extractAssets). */
export interface ExtractAssetSummary {
  projectId: number;
  scriptIds: number[];
  new: number;
  linked: number;
  existing: number;
  skipped: number;
  errors: { scriptId: number; error: string }[];
  completedAt?: number;
}

const summaries = new Map<string, ExtractAssetSummary>();

export function extractJobKey(projectId: number, scriptIds: number[]): string {
  return `${projectId}:${[...scriptIds].sort((a, b) => a - b).join(",")}`;
}

export function setExtractSummary(key: string, summary: ExtractAssetSummary): void {
  summaries.set(key, summary);
}

export function getExtractSummary(key: string): ExtractAssetSummary | undefined {
  return summaries.get(key);
}

export function mergeExtractSummary(key: string, partial: Partial<ExtractAssetSummary>): void {
  const prev = summaries.get(key) ?? { projectId: partial.projectId ?? 0, scriptIds: partial.scriptIds ?? [], new: 0, linked: 0, existing: 0, skipped: 0, errors: [] };
  summaries.set(key, {
    ...prev,
    ...partial,
    new: (prev.new ?? 0) + (partial.new ?? 0),
    linked: (prev.linked ?? 0) + (partial.linked ?? 0),
    existing: (prev.existing ?? 0) + (partial.existing ?? 0),
    skipped: (prev.skipped ?? 0) + (partial.skipped ?? 0),
    errors: [...(prev.errors ?? []), ...(partial.errors ?? [])],
  });
}

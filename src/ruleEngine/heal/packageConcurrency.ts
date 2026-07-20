/**
 * Optimistic concurrency for import heal / propose confirm (M2).
 */
export interface VersionedPackage {
  packageVersion: number;
  snapshotId: string;
}

export function nextPackageVersion(current?: number | null): number {
  return Math.max(0, Number(current ?? 0)) + 1;
}

export function assertPackageVersion(
  expected: number | undefined,
  actual: number | undefined,
): { ok: boolean; message?: string } {
  if (expected == null) return { ok: true };
  if (Number(actual ?? 0) !== Number(expected)) {
    return {
      ok: false,
      message: `包版本冲突：期望 ${expected}，当前 ${actual ?? 0}（请刷新后重试）`,
    };
  }
  return { ok: true };
}

export function newSnapshotId(): string {
  return `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

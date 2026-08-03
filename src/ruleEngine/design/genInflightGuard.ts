/**
 * Generation in-flight guard — queue cascadeForwardStale / SB sync while still/video gen runs.
 */
const inflight = new Map<string, { kind: "still" | "video"; startedAt: number }>();
const pendingCascade = new Map<
  string,
  Array<{
    run: () => void;
  }>
>();

function projectKey(projectId: number | string): string {
  return `p:${projectId}`;
}

export function markGenerationInflight(
  projectId: number | string,
  kind: "still" | "video" = "still",
): void {
  inflight.set(projectKey(projectId), { kind, startedAt: Date.now() });
}

export function clearGenerationInflight(projectId: number | string): void {
  const key = projectKey(projectId);
  inflight.delete(key);
  const q = pendingCascade.get(key) ?? [];
  pendingCascade.delete(key);
  for (const item of q) {
    try {
      item.run();
    } catch {
      /* best effort flush */
    }
  }
}

export function isGenerationInflight(projectId: number | string): boolean {
  const row = inflight.get(projectKey(projectId));
  if (!row) return false;
  // Auto-expire after 10 minutes to avoid permanent deadlock
  if (Date.now() - row.startedAt > 10 * 60 * 1000) {
    clearGenerationInflight(projectId);
    return false;
  }
  return true;
}

/**
 * Run cascade immediately, or queue until generation clears.
 */
export function runCascadeWhenIdle(
  projectId: number | string,
  run: () => void,
): { deferred: boolean } {
  if (!isGenerationInflight(projectId)) {
    run();
    return { deferred: false };
  }
  const key = projectKey(projectId);
  const q = pendingCascade.get(key) ?? [];
  q.push({ run });
  pendingCascade.set(key, q);
  return { deferred: true };
}

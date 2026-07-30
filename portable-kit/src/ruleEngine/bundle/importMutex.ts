/**
 * Per-project import mutex — prevent double-import races.
 */
const locks = new Map<number, { owner: string; at: number }>();
const WAIT_MS = 120_000;

export class ImportLockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportLockError";
  }
}

export async function withImportLock<T>(projectId: number, owner: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  while (locks.has(projectId)) {
    if (Date.now() - start > WAIT_MS) {
      const cur = locks.get(projectId);
      throw new ImportLockError(`IMPORT_LOCKED project=${projectId} owner=${cur?.owner}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  locks.set(projectId, { owner, at: Date.now() });
  try {
    return await fn();
  } finally {
    const cur = locks.get(projectId);
    if (cur?.owner === owner) locks.delete(projectId);
  }
}

export function isImportLocked(projectId: number): boolean {
  return locks.has(projectId);
}

/** test helper */
export function __resetImportLocks(): void {
  locks.clear();
}

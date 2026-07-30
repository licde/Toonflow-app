/**
 * Per-storyboard mutex — prevent draft∥hq race on same shot reason/filePath.
 */
const locks = new Map<number, Promise<void>>();

export async function withStoryboardLock<T>(
  storyboardId: number,
  fn: () => Promise<T>,
): Promise<T> {
  const id = Number(storyboardId);
  const prev = locks.get(id) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  locks.set(
    id,
    prev.then(() => gate),
  );
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(id) === gate) locks.delete(id);
  }
}

export function isStoryboardLocked(storyboardId: number): boolean {
  return locks.has(Number(storyboardId));
}

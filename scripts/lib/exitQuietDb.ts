/**
 * Release better-sqlite3 so sync test scripts can exit (beforeExit often never fires).
 */
export async function exitQuietDb(code = 0): Promise<never> {
  try {
    const mod = await import("../../src/utils/db");
    if (typeof mod.destroyDb === "function") await mod.destroyDb();
  } catch {
    /* db never imported */
  }
  process.exit(code);
}

/**
 * Resolve storyboard still path for video burn — never false-MISSING when a usable still exists.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KnexLike = any;

export type ResolvedStillForBurn = {
  storyboardId?: number;
  filePath: string;
  prompt: string;
  reasonRaw?: string | null;
  row?: Record<string, unknown> | null;
  /** How the still was found (debug / FE) */
  resolveSource?: string;
};

function pathOf(row?: Record<string, unknown> | null): string {
  return String(row?.filePath ?? "").trim();
}

function pack(row: Record<string, unknown> | undefined, source: string): ResolvedStillForBurn {
  if (!row) {
    return { filePath: "", prompt: "", resolveSource: source };
  }
  return {
    storyboardId: row.id != null ? Number(row.id) : undefined,
    filePath: pathOf(row),
    prompt: String(row.prompt ?? "").trim(),
    reasonRaw: row.reason != null ? String(row.reason) : null,
    row,
    resolveSource: source,
  };
}

async function byId(
  db: KnexLike,
  id: number,
  projectId: number,
  scriptId: number,
): Promise<Record<string, unknown> | undefined> {
  let row = await db("o_storyboard").where({ id, projectId, scriptId }).first();
  if (!row) row = await db("o_storyboard").where({ id, projectId }).first();
  if (!row) row = await db("o_storyboard").where({ id }).first();
  return row as Record<string, unknown> | undefined;
}

/** Prefer a row that already has a still filePath. */
async function byTrackWithFile(
  db: KnexLike,
  trackId: number,
  projectId: number,
  scriptId: number,
): Promise<Record<string, unknown> | undefined> {
  let row = await db("o_storyboard")
    .where({ trackId, projectId, scriptId })
    .whereRaw("filePath IS NOT NULL AND trim(filePath) != ''")
    .orderBy("id", "desc")
    .first();
  if (row) return row as Record<string, unknown>;
  row = await db("o_storyboard")
    .where({ trackId, projectId })
    .whereRaw("filePath IS NOT NULL AND trim(filePath) != ''")
    .orderBy("id", "desc")
    .first();
  if (row) return row as Record<string, unknown>;
  row = await db("o_storyboard").where({ trackId, projectId, scriptId }).first();
  if (!row) row = await db("o_storyboard").where({ trackId, projectId }).first();
  return row as Record<string, unknown> | undefined;
}

async function byIndexWithFile(
  db: KnexLike,
  projectId: number,
  scriptId: number,
  index: number,
): Promise<Record<string, unknown> | undefined> {
  const row = await db("o_storyboard")
    .where({ projectId, scriptId, index })
    .whereRaw("filePath IS NOT NULL AND trim(filePath) != ''")
    .orderBy("id", "desc")
    .first();
  return row as Record<string, unknown> | undefined;
}

/**
 * Prefer uploadData storyboard id; else track-bound still with filePath;
 * if chosen row has empty path, fall back to same track/index with a real file.
 */
export async function resolveStillForBurn(input: {
  db: KnexLike;
  projectId: number;
  scriptId: number;
  trackId?: number | null;
  uploadStoryboardId?: number | null;
  /** Optional package shot storyboardId hints */
  packageStoryboardIds?: number[] | null;
}): Promise<ResolvedStillForBurn> {
  const db = input.db;
  const candidates: { row?: Record<string, unknown>; source: string }[] = [];

  if (input.uploadStoryboardId != null && Number.isFinite(Number(input.uploadStoryboardId))) {
    const id = Number(input.uploadStoryboardId);
    candidates.push({ row: await byId(db, id, input.projectId, input.scriptId), source: "upload" });
  }

  if (input.trackId != null) {
    candidates.push({
      row: await byTrackWithFile(db, Number(input.trackId), input.projectId, input.scriptId),
      source: "track",
    });
  }

  for (const pid of input.packageStoryboardIds ?? []) {
    if (pid == null || !Number.isFinite(Number(pid))) continue;
    candidates.push({
      row: await byId(db, Number(pid), input.projectId, input.scriptId),
      source: `package:${pid}`,
    });
  }

  // Prefer first candidate that has a real file
  for (const c of candidates) {
    if (c.row && pathOf(c.row)) return pack(c.row, c.source);
  }

  // Chosen row empty → try same index sibling with file
  const seed = candidates.find((c) => c.row)?.row;
  if (seed && seed.index != null) {
    const sib = await byIndexWithFile(db, input.projectId, input.scriptId, Number(seed.index));
    if (sib && pathOf(sib)) return pack(sib, "index_fallback");
  }

  // Last resort when no track: any still with file on this script
  if (input.trackId == null) {
    const any = await db("o_storyboard")
      .where({ projectId: input.projectId, scriptId: input.scriptId })
      .whereRaw("filePath IS NOT NULL AND trim(filePath) != ''")
      .orderBy("id", "desc")
      .first();
    if (any && pathOf(any as Record<string, unknown>)) {
      return pack(any as Record<string, unknown>, "script_any_with_file");
    }
  }

  if (seed) return pack(seed, "empty_seed");
  return { filePath: "", prompt: "", resolveSource: "none" };
}

/** True when gap is only missing diagnostic Key (not vendor/poll failure). G0: never softAllow quality. */
export function isStillKeyAbsentOnly(meta: Record<string, unknown> | null | undefined): boolean {
  if (!meta) return false;
  const err = String(meta.vlmError ?? "");
  const keyMiss = /VLM_API_KEY_MISSING|缺少API\s*Key|缺少可用的视觉评审/i.test(err);
  if (!keyMiss) return false;
  // True vendor infra (timeout/429) is not key-only
  if (/timeout|ECONNRESET|429|TLS|vendor/i.test(err) && !/VLM_API_KEY_MISSING/.test(err)) return false;
  return true;
}

/** VLM infra miss — vendor/poll/draft skip. Key-absent alone is NOT softAllow-eligible (G0). */
export function isStillVlmInfraGap(meta: Record<string, unknown> | null | undefined): boolean {
  if (!meta) return false;
  // G0: Key-only → not an infra soft-allow gap
  if (isStillKeyAbsentOnly(meta) && meta.infraEditBypassUsed !== true) {
    const stop = String(meta.fidelityStopReason ?? "");
    // pendingHumanRejudge from Key-miss alone should not softAllow burn
    if (stop === "vlm_error" || /VLM_API_KEY_MISSING/.test(String(meta.vlmError ?? ""))) {
      return false;
    }
  }
  if (meta.infraEditBypassUsed === true) return true;
  const stop = String(meta.fidelityStopReason ?? "");
  if (stop === "disabled" || stop === "skipped_draft") return true;
  if (stop === "vlm_error") {
    // vendor error without key-only
    if (!isStillKeyAbsentOnly(meta)) return true;
    return false;
  }
  const err = String(meta.vlmError ?? "");
  if (/timeout|ECONNRESET|429|TLS|vendor_passthrough/i.test(err)) return true;
  if (meta.pendingHumanRejudge === true && !isStillKeyAbsentOnly(meta)) return true;
  return false;
}

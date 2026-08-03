/**
 * Resolve storyboard still path for video burn — never false-MISSING when a usable still exists.
 * Prefer upload/sealed intent shot over track-latest (avoids cheek CU covering bend MS).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KnexLike = any;

export type ResolvedStillForBurn = {
  storyboardId?: number;
  filePath: string;
  /** Literary / edit SSOT (o_storyboard.prompt) */
  prompt: string;
  /** Vendor pipeline egress for sheetLeak/contact/mouth gates */
  promptUsed?: string;
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
  let promptUsed = "";
  try {
    const { parseStillMetaFromReason } =
      require("../compilers/stillQuality") as typeof import("../compilers/stillQuality");
    const meta = parseStillMetaFromReason(row.reason);
    promptUsed = String(meta?.promptUsed ?? "").trim();
  } catch {
    try {
      const raw = row.reason != null ? JSON.parse(String(row.reason)) : null;
      promptUsed = String((raw as { promptUsed?: string } | null)?.promptUsed ?? "").trim();
    } catch {
      /* keep empty */
    }
  }
  return {
    storyboardId: row.id != null ? Number(row.id) : undefined,
    filePath: pathOf(row),
    prompt: String(row.prompt ?? "").trim(),
    promptUsed: promptUsed || undefined,
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

/** Score still for bend-intent burn: prefer bend_pickup / 弯腰 over cheek-hold. */
export function scoreStillForBendIntent(row: Record<string, unknown> | null | undefined): number {
  if (!row || !pathOf(row)) return -1;
  let score = 1;
  const prompt = `${row.prompt ?? ""}`;
  let meta: Record<string, unknown> = {};
  try {
    const { parseStillMetaFromReason } =
      require("../compilers/stillQuality") as typeof import("../compilers/stillQuality");
    meta = (parseStillMetaFromReason(row.reason) as Record<string, unknown>) ?? {};
  } catch {
    /* keep */
  }
  const seal = meta.primaryIntentSeal as { poseOccupancy?: string } | undefined;
  const occ = String(
    meta.poseOccupancy ?? seal?.poseOccupancy ?? meta.realizationOccupancy ?? "",
  );
  const blob = `${prompt} ${JSON.stringify(meta)}`;
  if (occ === "bend_pickup" || /弯腰|捡起|俯身捡|捡纸/.test(blob)) score += 50;
  if (/贴颊|划过面颊|cheek|纸角划过/.test(blob) && !/弯腰|捡起/.test(blob)) score -= 40;
  if (meta.literaryEffectsQualified === true) score += 5;
  if (String(meta.stillQuality ?? "") === "hq_ok") score += 3;
  if (String(meta.stillQuality ?? "") === "weak") score += 1;
  return score;
}

/** Prefer a row that already has a still filePath; among track rows prefer bend intent. */
async function byTrackWithFile(
  db: KnexLike,
  trackId: number,
  projectId: number,
  scriptId: number,
): Promise<{ row?: Record<string, unknown>; source: string }> {
  const load = async (where: Record<string, unknown>) => {
    const rows = (await db("o_storyboard")
      .where(where)
      .whereRaw("filePath IS NOT NULL AND trim(filePath) != ''")
      .orderBy("id", "desc")
      .limit(12)) as Record<string, unknown>[];
    return rows;
  };
  let rows = await load({ trackId, projectId, scriptId });
  if (!rows.length) rows = await load({ trackId, projectId });
  if (!rows.length) {
    const row =
      (await db("o_storyboard").where({ trackId, projectId, scriptId }).first()) ||
      (await db("o_storyboard").where({ trackId, projectId }).first());
    return { row: row as Record<string, unknown> | undefined, source: "track_empty" };
  }
  let best = rows[0];
  let bestScore = scoreStillForBendIntent(best);
  let bestSource = "track_latest";
  for (const r of rows) {
    const s = scoreStillForBendIntent(r);
    if (s > bestScore) {
      best = r;
      bestScore = s;
      bestSource = "track_bend_intent";
    }
  }
  return { row: best, source: bestSource };
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
 * Prefer uploadData storyboard id; else track-bound still with bend-intent preference;
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
    const uploadRow = await byId(db, id, input.projectId, input.scriptId);
    if (uploadRow && pathOf(uploadRow)) {
      return pack(uploadRow, "upload");
    }
    candidates.push({ row: uploadRow, source: "upload" });
  }

  if (input.trackId != null) {
    const trackHit = await byTrackWithFile(db, Number(input.trackId), input.projectId, input.scriptId);
    candidates.push(trackHit);
  }

  for (const pid of input.packageStoryboardIds ?? []) {
    if (pid == null || !Number.isFinite(Number(pid))) continue;
    candidates.push({
      row: await byId(db, Number(pid), input.projectId, input.scriptId),
      source: `package:${pid}`,
    });
  }

  // Prefer first candidate that has a real file (upload already returned if had file)
  let bestPacked: ResolvedStillForBurn | null = null;
  let bestScore = -1;
  for (const c of candidates) {
    if (c.row && pathOf(c.row)) {
      const s = scoreStillForBendIntent(c.row);
      // upload/package with file already preferred above; track uses intent score
      if (s > bestScore) {
        bestScore = s;
        bestPacked = pack(c.row, c.source);
      }
    }
  }
  if (bestPacked) return bestPacked;

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

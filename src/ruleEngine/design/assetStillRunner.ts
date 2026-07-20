/**
 * AssetStillRunner — consume missingAssetImageQueue / still_queue heal mode.
 * Reuses existing rows with completed stills; only seeds when none found.
 */
import type { Knex } from "knex";
import { normalizeAssetCode } from "../codes/assetCodeContract";
import { lookupKeysForCode, type CodeAliasMap } from "../codes/assetCodeAlias";
import { assetCodeRemark, charCodeRemark } from "../bundle/assetSeedFromBundle";

export interface StillQueueItem {
  code: string;
  kind?: string;
  action: string;
}

export interface StillRunnerResult {
  queued: number;
  seeded: number;
  linked: number;
  assetIds: number[];
  unresolved: string[];
  message: string;
}

type AssetRow = {
  id: number;
  remark?: string;
  prompt?: string;
  name?: string;
  describe?: string;
  imageId?: number | null;
  filePath?: string | null;
  type?: string;
  hasImage?: boolean;
};

function ensureCodesInRemark(remark: string, codes: string[]): string {
  const tags = remark
    .split(";")
    .map((t) => t.trim())
    .filter((t) => t && t !== "orphanStub:1");
  for (const code of codes) {
    const n = normalizeAssetCode(code) ?? code;
    if (!n) continue;
    if (!tags.some((t) => t === `assetCode:${n}` || t.includes(`assetCode:${n}`))) {
      tags.push(assetCodeRemark(n));
    }
    if (/^CHAR-/i.test(n) && !tags.some((t) => t === `charCode:${n}` || t.includes(`charCode:${n}`))) {
      tags.push(charCodeRemark(n));
    }
  }
  return [...new Set(tags)].join(";");
}

function rowHasImage(
  a: AssetRow,
  imageById: Map<number, { filePath?: string | null; state?: string | null }>,
): boolean {
  if (!a.imageId) return false;
  const im = imageById.get(a.imageId);
  const fp = im?.filePath;
  const stateOk = !im?.state || im.state === "已完成" || im.state === "生成成功";
  const stateBad = im?.state === "生成中" || im.state === "生成失败";
  return Boolean(fp && String(fp).trim() && stateOk && !stateBad);
}

function findBestAsset(
  rows: AssetRow[],
  code: string,
  alias?: CodeAliasMap,
  displayName?: string,
): AssetRow | undefined {
  const keys = new Set(lookupKeysForCode(code, alias));
  keys.add(code);
  const candidates: AssetRow[] = [];
  for (const key of keys) {
    for (const a of rows) {
      if (String(a.remark ?? "").includes(`assetCode:${key}`)) candidates.push(a);
    }
  }
  if (displayName) {
    for (const a of rows) {
      if (a.name === displayName) candidates.push(a);
    }
  }
  const uniq = new Map<number, AssetRow>();
  for (const c of candidates) uniq.set(c.id, c);
  const list = [...uniq.values()];
  if (!list.length) return undefined;
  list.sort((a, b) => {
    const ah = a.hasImage ? 1 : 0;
    const bh = b.hasImage ? 1 : 0;
    if (ah !== bh) return bh - ah;
    const astub = /stillSeed:1|orphanStub:1|stub for/i.test(String(a.remark ?? "") + (a.prompt ?? "")) ? 1 : 0;
    const bstub = /stillSeed:1|orphanStub:1|stub for/i.test(String(b.remark ?? "") + (b.prompt ?? "")) ? 1 : 0;
    if (astub !== bstub) return astub - bstub;
    return a.id - b.id;
  });
  return list[0];
}

/**
 * Resolve codes → o_assets ids; seed only when no row exists; stamp codes; link script.
 */
export async function runAssetStillQueue(
  db: Knex,
  projectId: number,
  queue: StillQueueItem[],
  opts?: {
    codeAlias?: CodeAliasMap;
    scriptId?: number;
    displayNames?: Record<string, string>;
  },
): Promise<StillRunnerResult> {
  const assetIds: number[] = [];
  const unresolved: string[] = [];
  let seeded = 0;
  let linked = 0;
  const alias = opts?.codeAlias;
  const displayNames = opts?.displayNames ?? {};

  const rows = (await db("o_assets")
    .where({ projectId })
    .select("id", "remark", "prompt", "name", "describe", "imageId", "type")
    .catch(() => [])) as AssetRow[];

  const imageIds = rows.map((a) => a.imageId).filter((id): id is number => typeof id === "number" && id > 0);
  const images =
    imageIds.length > 0
      ? await db("o_image")
          .whereIn("id", imageIds)
          .select("id", "filePath", "state")
          .catch(() => [] as { id: number; filePath?: string | null; state?: string | null }[])
      : [];
  const imageById = new Map(images.map((im) => [im.id, im]));
  for (const r of rows) r.hasImage = rowHasImage(r, imageById);

  // Drop orphan stillSeed rows (no image) when a better same-code row exists
  let purgedOrphans = 0;
  const seedOrphans = rows.filter(
    (a) =>
      !a.hasImage &&
      /stillSeed:1/i.test(String(a.remark ?? "")) &&
      !a.imageId,
  );
  for (const orphan of seedOrphans) {
    const codeM = String(orphan.remark ?? "").match(/assetCode:([A-Za-z]+-[A-Za-z0-9]+)/i);
    if (!codeM) continue;
    const code = normalizeAssetCode(codeM[1]) ?? codeM[1];
    const better = findBestAsset(
      rows.filter((r) => r.id !== orphan.id),
      code,
      alias,
      displayNames[code],
    );
    if (better?.hasImage || (better && better.id !== orphan.id && !/stillSeed:1/i.test(String(better.remark ?? "")))) {
      await db("o_scriptAssets").where({ assetId: orphan.id }).delete().catch(() => 0);
      await db("o_assets2Storyboard").where({ assetId: orphan.id }).delete().catch(() => 0);
      await db("o_assets").where({ id: orphan.id }).delete().catch(() => 0);
      const idx = rows.findIndex((r) => r.id === orphan.id);
      if (idx >= 0) rows.splice(idx, 1);
      purgedOrphans++;
    }
  }

  for (const item of queue) {
    if (item.action !== "generate_still" && item.action !== "seed_asset") continue;
    const code = normalizeAssetCode(item.code) ?? item.code;
    const aliased = alias?.[code] && alias[code] !== code ? alias[code]! : code;
    const stampCodes = [...new Set([code, aliased].filter(Boolean))];
    const display = displayNames[code] || displayNames[aliased];
    let hit = findBestAsset(rows, code, alias, display);

    if (!hit && item.action === "seed_asset") {
      const kind = item.kind ?? (/^SCENE-/i.test(code) ? "SCENE" : /^PROP-/i.test(code) ? "PROP" : "CHAR");
      const type = kind === "SCENE" ? "scene" : kind === "PROP" ? "tool" : "role";
      const name =
        display ||
        (kind === "SCENE" && !/^SCENE-\d+$/i.test(code) ? code : undefined) ||
        code;
      const prompt =
        kind === "SCENE"
          ? `${name} environment plate, PURE-SCENE: empty, no people, no characters`
          : `角色设定 ${name}`;
      const remark = ensureCodesInRemark(`stillSeed:1`, stampCodes);
      const [newId] = await db("o_assets").insert({
        projectId,
        scriptId: opts?.scriptId ?? null,
        name,
        type,
        prompt,
        describe: name,
        remark,
        startTime: Date.now(),
      });
      hit = { id: newId, remark, prompt, name, describe: name, hasImage: false };
      rows.push(hit);
      seeded++;
    }

    if (!hit) {
      unresolved.push(code);
      continue;
    }

    const remark = ensureCodesInRemark(String(hit.remark ?? ""), stampCodes);
    const patch: Record<string, unknown> = { remark };
    const label = display || hit.name || code;
    if (!hit.hasImage && (/^stub for\b/i.test(String(hit.prompt ?? "")) || !String(hit.prompt ?? "").trim())) {
      patch.prompt =
        item.kind === "SCENE" || /^SCENE-/i.test(code)
          ? `${label} environment plate, PURE-SCENE: empty, no people, no characters`
          : `角色设定 ${label}`;
      patch.describe = label;
      patch.promptState = null;
    } else if (
      /^SCENE-\d+$/i.test(String(hit.describe ?? "")) ||
      hit.describe === code ||
      !String(hit.describe ?? "").trim()
    ) {
      patch.describe = label;
    }
    if (hit.name === code && label !== code && !/^SCENE-\d+$/i.test(label) && !/^CHAR-/i.test(label)) {
      patch.name = label;
    }
    if (opts?.scriptId) patch.scriptId = opts.scriptId;
    await db("o_assets").where({ id: hit.id }).update(patch);
    hit.remark = remark;

    if (opts?.scriptId) {
      const exists = await db("o_scriptAssets")
        .where({ scriptId: opts.scriptId, assetId: hit.id })
        .first()
        .catch(() => null);
      if (!exists) {
        await db("o_scriptAssets").insert({ scriptId: opts.scriptId, assetId: hit.id });
        linked++;
      }
    }

    assetIds.push(hit.id);
  }

  const withImage = assetIds.filter((id) => rows.find((r) => r.id === id)?.hasImage).length;
  const needGen = assetIds.length - withImage;

  return {
    queued: assetIds.length,
    seeded,
    linked,
    assetIds: [...new Set(assetIds)],
    unresolved,
    message:
      assetIds.length > 0
        ? withImage === assetIds.length
          ? `Linked ${assetIds.length} assets (all have stills, no regen needed)` +
            (purgedOrphans ? `; purged ${purgedOrphans} orphan seeds` : "")
          : `Prepared ${assetIds.length} assets (${withImage} with stills, ${needGen} need batch gen)` +
            (seeded ? `; seeded ${seeded}` : "") +
            (linked ? `; linked ${linked}` : "") +
            (purgedOrphans ? `; purged ${purgedOrphans} orphan seeds` : "")
        : `No assets resolved (${unresolved.join(",") || "empty"})`,
  };
}

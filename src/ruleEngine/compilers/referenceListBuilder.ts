import type { Knex } from "knex";
import u from "@/utils";
import { parsePromptRefs } from "./vendorPromptAdapter";
import { normalizeAssetCode, normalizeAssetCodes } from "../codes/assetCodeContract";
import { resolveShotIdentityBinding } from "./resolveShotIdentityBinding";

export interface ReferenceWarning {
  code: string;
  assetId?: number;
  message: string;
}

export async function resolveCrefCodesToAssetIds(
  db: Knex,
  projectId: number,
  codes: string[],
  codeToId?: Record<string, number>,
  /** Prefer this order (identity binding SSOT) */
  preferredOrder?: string[],
): Promise<{ assetIds: number[]; warnings: ReferenceWarning[] }> {
  const assetIds: number[] = [];
  const warnings: ReferenceWarning[] = [];
  const unresolved: string[] = [];

  const orderNorm = (preferredOrder ?? []).map((c) => c.toUpperCase());
  const codeList = normalizeAssetCodes(codes);
  const sortedCodes =
    orderNorm.length > 0
      ? [
          ...orderNorm.filter((c) => codeList.some((x) => x.toUpperCase() === c)),
          ...codeList.filter((c) => !orderNorm.includes(c.toUpperCase())),
        ]
      : codeList;

  for (const code of sortedCodes) {
    const canon = normalizeAssetCode(code) ?? code;
    const id = codeToId?.[canon] ?? codeToId?.[code];
    if (id) {
      assetIds.push(id);
      continue;
    }
    unresolved.push(canon);
  }

  if (unresolved.length) {
    const assets = await db("o_assets").where({ projectId }).select("id", "name", "imageId", "prompt", "describe", "remark");
    for (const code of unresolved) {
      const suffix = code.replace(/^CHAR-/, "");
      const codeTag = `charCode:${code}`;
      const assetTag = `assetCode:${code}`;
      const hit = assets.find(
        (a) =>
          a.remark === codeTag ||
          a.remark === assetTag ||
          (a.remark && String(a.remark).includes(codeTag)) ||
          (a.remark && String(a.remark).includes(assetTag)) ||
          a.name === code ||
          a.name?.includes(suffix) ||
          (a.describe && String(a.describe).includes(code)) ||
          (a.prompt && String(a.prompt).includes(code)),
      );
      if (hit) assetIds.push(hit.id!);
      else warnings.push({ code, message: `未找到资产 ${code}` });
    }
  }

  // Re-order unique ids by preferredOrder when codeToId reverse map available
  const uniqueIds = [...new Set(assetIds)];
  if (uniqueIds.length) {
    const rows = await db("o_assets").whereIn("id", uniqueIds).select("id", "name", "imageId");
    for (const row of rows) {
      if (!row.imageId) {
        warnings.push({
          code: row.name ?? String(row.id),
          assetId: row.id,
          message: `请先生成角色参考图：${row.name ?? row.id}`,
        });
      }
    }
  }

  return { assetIds: uniqueIds, warnings };
}

export async function mergeAssociateAssetIds(
  db: Knex,
  projectId: number,
  existingIds: number[],
  prompt: string,
  charCodes: string[] = [],
  codeToId?: Record<string, number>,
  preferredOrder?: string[],
): Promise<{ assetIds: number[]; warnings: ReferenceWarning[] }> {
  const refs = parsePromptRefs(prompt);
  const codes = [...new Set([...charCodes, ...refs.crefs, ...refs.srefs])];
  const order = preferredOrder?.length
    ? preferredOrder
    : resolveShotIdentityBinding({
        description: prompt,
        assetCodes: codes.filter((c) => /^CHAR-/i.test(c)),
      }).orderedCodes;
  const resolved = await resolveCrefCodesToAssetIds(db, projectId, codes, codeToId, order);
  // Keep preferred CHAR order, then remaining ids
  const orderedIds: number[] = [];
  const seen = new Set<number>();
  for (const id of resolved.assetIds) {
    if (!seen.has(id)) {
      seen.add(id);
      orderedIds.push(id);
    }
  }
  for (const id of existingIds) {
    if (!seen.has(id)) {
      seen.add(id);
      orderedIds.push(id);
    }
  }
  return {
    assetIds: orderedIds,
    warnings: resolved.warnings,
  };
}

export async function buildReferenceListFromAssetIds(
  db: Knex,
  assetIds: number[],
): Promise<{ type: "image"; base64: string }[]> {
  if (!assetIds.length) return [];

  const assets = await db("o_assets").whereIn("id", assetIds).select("id", "imageId");
  const byAsset = new Map(assets.map((a) => [a.id!, a]));
  const imageIds = assetIds.map((id) => byAsset.get(id)?.imageId).filter(Boolean) as number[];
  if (!imageIds.length) return [];

  const imagePaths = await db("o_image").whereIn("id", imageIds).select("id", "filePath");
  const byImage = new Map(imagePaths.map((r) => [r.id!, r]));
  const list: { type: "image"; base64: string }[] = [];

  // Preserve assetIds order (= identity binding order)
  for (const assetId of assetIds) {
    const asset = byAsset.get(assetId);
    if (!asset?.imageId) continue;
    const row = byImage.get(asset.imageId);
    if (!row?.filePath) continue;
    try {
      const base64 = await u.oss.getImageBase64(row.filePath);
      list.push({ type: "image", base64 });
    } catch {
      /* skip broken refs */
    }
  }
  return list;
}

export async function buildReferenceListForStoryboard(
  db: Knex,
  projectId: number,
  storyboardId: number,
  prompt: string,
  charCodes: string[] = [],
  preferredOrder?: string[],
): Promise<{ referenceList: { type: "image"; base64: string }[]; warnings: ReferenceWarning[] }> {
  const assetRows = await db("o_assets2Storyboard").where("storyboardId", storyboardId).orderBy("rowid").pluck("assetId");
  const order =
    preferredOrder?.length
      ? preferredOrder
      : resolveShotIdentityBinding({
          description: prompt,
          assetCodes: [...charCodes, ...parsePromptRefs(prompt).crefs].filter((c) => /^CHAR-/i.test(c)),
        }).orderedCodes;
  const merged = await mergeAssociateAssetIds(db, projectId, assetRows as number[], prompt, charCodes, undefined, order);
  const referenceList = await buildReferenceListFromAssetIds(db, merged.assetIds);
  return { referenceList, warnings: merged.warnings };
}

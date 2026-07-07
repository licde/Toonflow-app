import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { parseLockCode } from "@/lib/dramaPack/schema";
import {
  isTopLevelParentRow,
  lockCodeBase,
  resolveAssetTierFromRow,
} from "@/lib/dramaPack/assetLockCodeUtils";

const router = express.Router();

type AssetRow = {
  id: number;
  assetsId?: number | null;
  name: string;
  remark?: string | null;
  type: string;
  filePath?: string | null;
  state?: string | null;
  errorReason?: string | null;
  describe?: string | null;
  prompt?: string | null;
  promptState?: string | null;
  imageId?: number | null;
  [key: string]: unknown;
};

async function withSrc(row: AssetRow) {
  return {
    ...row,
    lockCode: parseLockCode(row.remark ?? ""),
    assetTier: resolveAssetTierFromRow(row.remark, row.assetsId),
    src: row.filePath ? await filterTypeGetFileUrl(row.filePath, row.type) : "",
  };
}

// 获取资产
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    type: z.string(),
    name: z.string().optional(),
    page: z.number(),
    limit: z.number(),
  }),
  async (req, res) => {
    const { projectId, type, name, page = 1, limit = 10 } = req.body;
    const offset = (page - 1) * limit;

    let allQuery = u
      .db("o_assets")
      .leftJoin("o_image", "o_assets.imageId", "o_image.id")
      .select("o_assets.*", "o_image.filePath", "o_image.state", "o_image.errorReason")
      .where("o_assets.projectId", projectId)
      .andWhere("o_assets.type", type);
    if (name) {
      allQuery = allQuery.andWhere("o_assets.name", "like", `%${name}%`);
    }
    const allRows = (await allQuery) as AssetRow[];

    if (type === "role") {
      const parents = allRows.filter((r) => isTopLevelParentRow(type, r.remark, r.assetsId));
      const deriveByParentId = allRows.filter((r) => r.assetsId != null);
      const t1ByBase = new Map<string, AssetRow[]>();
      for (const row of allRows) {
        const code = parseLockCode(row.remark ?? "");
        if (!code || !code.includes(":") || row.assetsId != null) continue;
        const base = lockCodeBase(code);
        if (!t1ByBase.has(base)) t1ByBase.set(base, []);
        t1ByBase.get(base)!.push(row);
      }

      const pageParents = parents.slice(offset, offset + limit);
      const result = await Promise.all(
        pageParents.map(async (parent) => {
          const baseCode = parseLockCode(parent.remark ?? "") ?? "";
          const t1Children = baseCode ? t1ByBase.get(baseCode) ?? [] : [];
          const idChildren = deriveByParentId.filter((c) => c.assetsId === parent.id);
          const sonAssets = await Promise.all(
            [...idChildren, ...t1Children].map((c) => withSrc(c)),
          );
          const enriched = await withSrc(parent);
          return {
            ...enriched,
            sonAssets,
            ...(parent.type === "audio"
              ? { sex: parent.describe?.split("|")[0], describe: parent.describe?.split("|")[1] }
              : {}),
          };
        }),
      );

      return res.status(200).send(success({ data: result, total: parents.length }));
    }

    const parentAssets = allRows.filter((r) => r.assetsId == null);
    const childAssets = allRows.filter((r) => r.assetsId != null);
    const pageParents = parentAssets.slice(offset, offset + limit);

    const result = await Promise.all(
      pageParents.map(async (parent) => {
        const sonAssets = await Promise.all(
          childAssets.filter((c) => c.assetsId === parent.id).map((c) => withSrc(c)),
        );
        const enriched = await withSrc(parent);
        return {
          ...enriched,
          sonAssets,
          ...(parent.type === "audio"
            ? { sex: parent.describe?.split("|")[0], describe: parent.describe?.split("|")[1] }
            : {}),
        };
      }),
    );

    res.status(200).send(success({ data: result, total: parentAssets.length }));
  },
);

async function filterTypeGetFileUrl(url: string, type: string) {
  if (type == "role" || type == "tool" || type == "scene") {
    return await u.oss.getSmallImageUrl(url);
  }
  return await u.oss.getFileUrl(url);
}

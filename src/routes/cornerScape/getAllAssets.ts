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
  type: string;
  remark?: string | null;
  filePath?: string | null;
  [key: string]: unknown;
};

async function enrichAssetRow(parent: AssetRow, repleAssets: Record<number, { id: number; name: string }[]>) {
  const historyImages = await u.db("o_image").where("assetsId", parent.id).andWhere("state", "已完成").select("id", "filePath");
  const historyImagesWithUrl = await Promise.all(
    historyImages.map(async (img: { id: number; filePath?: string | null }) => ({
      id: img.id,
      filePath: img.filePath && (await u.oss.getSmallImageUrl(img.filePath)),
    })),
  );
  return {
    ...parent,
    lockCode: parseLockCode(parent.remark ?? ""),
    assetTier: resolveAssetTierFromRow(parent.remark, parent.assetsId),
    filePath: parent.filePath && (await u.oss.getSmallImageUrl(parent.filePath!)),
    historyImages: historyImagesWithUrl,
    relepedAudio: repleAssets[parent.id] ?? [],
  };
}

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    type: z.array(z.string()).optional(),
  }),
  async (req, res) => {
    const { projectId, type } = req.body;

    let allQuery = u
      .db("o_assets")
      .leftJoin("o_image", "o_assets.imageId", "o_image.id")
      .select(
        "o_assets.*",
        "o_image.filePath",
        "o_image.state",
        "o_image.model",
        "o_image.resolution",
        "o_image.errorReason",
        "o_image.id as imageId",
      )
      .where("o_assets.projectId", projectId)
      .andWhere("o_assets.type", "<>", "clip")
      .andWhere("o_assets.type", "<>", "audio")
      .modify((qb) => {
        if (type && type.length > 0) qb.whereIn("o_assets.type", type);
      })
      .orderByRaw(`CASE o_assets.type WHEN 'role' THEN 1 WHEN 'scene' THEN 2 WHEN 'tool' THEN 3 ELSE 4 END`);

    const allRows = (await allQuery) as AssetRow[];

    const allIds = allRows.map((r) => r.id);
    const assets2AudioData = await u
      .db("o_assetsRole2Audio")
      .leftJoin("o_assets", "o_assets.id", "o_assetsRole2Audio.assetsAudioId")
      .whereIn("o_assetsRole2Audio.assetsRoleId", allIds)
      .select("o_assets.id", "o_assets.name", "o_assetsRole2Audio.assetsRoleId");
    const repleAssets: Record<number, { id: number; name: string }[]> = {};
    assets2AudioData.forEach((item: { assetsRoleId: number; id: number; name: string }) => {
      if (!repleAssets[item.assetsRoleId]) repleAssets[item.assetsRoleId] = [item];
      else repleAssets[item.assetsRoleId].push(item);
    });

    const includeRole = !type?.length || type.includes("role");
    const nonRoleRows = allRows.filter((r) => r.type !== "role");
    const roleRows = allRows.filter((r) => r.type === "role");

    let result: unknown[] = [];

    if (includeRole && roleRows.length) {
      const parents = roleRows.filter((r) => isTopLevelParentRow("role", r.remark, r.assetsId));
      const deriveByParentId = roleRows.filter((r) => r.assetsId != null);
      const t1ByBase = new Map<string, AssetRow[]>();
      for (const row of roleRows) {
        const code = parseLockCode(row.remark ?? "");
        if (!code || !code.includes(":") || row.assetsId != null) continue;
        const base = lockCodeBase(code);
        if (!t1ByBase.has(base)) t1ByBase.set(base, []);
        t1ByBase.get(base)!.push(row);
      }

      const roleResult = await Promise.all(
        parents.map(async (parent) => {
          const baseCode = parseLockCode(parent.remark ?? "") ?? "";
          const t1Children = baseCode ? t1ByBase.get(baseCode) ?? [] : [];
          const idChildren = deriveByParentId.filter((c) => c.assetsId === parent.id);
          const sonAssets = await Promise.all(
            [...idChildren, ...t1Children].map((c) => enrichAssetRow(c, repleAssets)),
          );
          const enriched = await enrichAssetRow(parent, repleAssets);
          return { ...enriched, sonAssets };
        }),
      );
      result = result.concat(roleResult);
    }

    const otherResult = await Promise.all(nonRoleRows.map((row) => enrichAssetRow(row, repleAssets)));
    result = result.concat(otherResult);

    res.status(200).send(success(result));
  },
);

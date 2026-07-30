import type { Knex } from "knex";
import u from "@/utils";
import { parsePromptRefs } from "./vendorPromptAdapter";
import { normalizeAssetCode, normalizeAssetCodes } from "../codes/assetCodeContract";
import { resolveShotIdentityBinding } from "./resolveShotIdentityBinding";
import { formatMissingAssetRowWarning, formatMissingLookImageWarning } from "./refWarnMessage";

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
      // 1) remark / exact code tags — unique
      const tagged = assets.filter(
        (a) =>
          a.remark === codeTag ||
          a.remark === assetTag ||
          (a.remark && String(a.remark).includes(codeTag)) ||
          (a.remark && String(a.remark).includes(assetTag)) ||
          a.name === code ||
          (a.describe && String(a.describe).includes(code)) ||
          (a.prompt && String(a.prompt).includes(code)),
      );
      if (tagged.length === 1) {
        assetIds.push(tagged[0]!.id!);
        continue;
      }
      if (tagged.length > 1) {
        warnings.push({
          code,
          message: `资产码歧义（${tagged.length} 条命中），已跳过模糊绑定：${code}`,
        });
        continue;
      }
      // 2) name exact / unique longest includes — refuse peer-sister collision
      const exactName = assets.filter((a) => a.name === suffix || a.name === code);
      if (exactName.length === 1) {
        assetIds.push(exactName[0]!.id!);
        continue;
      }
      const fuzzy = assets
        .filter((a) => {
          const nm = String(a.name ?? "");
          if (!nm || !suffix) return false;
          // Prefer full suffix in name; never short stem-only (沈清)
          return nm === suffix || nm.includes(suffix) || (suffix.length >= 3 && suffix.includes(nm) && nm.length >= 3);
        })
        .sort((a, b) => String(b.name ?? "").length - String(a.name ?? "").length);
      if (fuzzy.length === 1) {
        assetIds.push(fuzzy[0]!.id!);
        continue;
      }
      if (fuzzy.length > 1) {
        // Unique longest only if strictly longer than runners-up
        const top = String(fuzzy[0]!.name ?? "").length;
        const uniqueTop = fuzzy.filter((a) => String(a.name ?? "").length === top);
        if (uniqueTop.length === 1 && top >= suffix.length) {
          assetIds.push(uniqueTop[0]!.id!);
          continue;
        }
        warnings.push({
          code,
          message: `姓名相似资产歧义（${fuzzy.map((a) => a.name).join("/")}），拒绝错误关联：${code}`,
        });
        continue;
      }
      warnings.push({ code, message: formatMissingAssetRowWarning(code) });
    }
  }

  // Re-order unique ids by preferredOrder when codeToId reverse map available
  const uniqueIds = [...new Set(assetIds)];
  if (uniqueIds.length) {
    const rows = await db("o_assets").whereIn("id", uniqueIds).select("id", "name", "imageId", "remark", "type");
    for (const row of rows) {
      if (!row.imageId) {
        const m = String(row.remark ?? "").match(/(?:assetCode|charCode):([A-Za-z]+-[A-Za-z0-9]+)/i);
        const code = m?.[1]?.toUpperCase() ?? "";
        const isScene =
          /^SCENE-/i.test(code) ||
          row.type === "scene" ||
          /scene|场景/i.test(String(row.type ?? "")) ||
          /scene|场景/i.test(String(row.name ?? ""));
        warnings.push({
          code: row.name ?? String(row.id),
          assetId: row.id,
          message: formatMissingLookImageWarning(row.name ?? String(row.id), isScene ? code || "SCENE-?" : code),
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
  opts?: { excludeScene?: boolean },
): Promise<{ assetIds: number[]; warnings: ReferenceWarning[] }> {
  const refs = parsePromptRefs(prompt);
  const codes = [...new Set([...charCodes, ...refs.crefs, ...refs.srefs])].filter((c) => {
    if (opts?.excludeScene && /^SCENE-/i.test(c)) return false;
    return true;
  });
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

  let finalIds = orderedIds;
  if (opts?.excludeScene && finalIds.length) {
    const rows = await db("o_assets")
      .whereIn("id", finalIds)
      .select("id", "type", "remark", "name");
    const sceneIds = new Set<number>();
    for (const a of rows as Array<{ id: number; type?: string; remark?: string; name?: string }>) {
      const m = String(a.remark ?? "").match(/(?:assetCode|charCode):([A-Za-z]+-[A-Za-z0-9]+)/i);
      const code = m?.[1]?.toUpperCase() ?? "";
      const isScene =
        a.type === "scene" ||
        /^SCENE-/i.test(code) ||
        /scene|场景/i.test(String(a.type ?? "")) ||
        /scene|场景/i.test(String(a.name ?? ""));
      if (isScene) sceneIds.add(a.id);
    }
    finalIds = finalIds.filter((id) => !sceneIds.has(id));
  }

  return {
    assetIds: finalIds,
    warnings: resolved.warnings,
  };
}

export async function buildReferenceListFromAssetIds(
  db: Knex,
  assetIds: number[],
  opts?: {
    /** @deprecated ignored — turnaround sheets are cropped to identity plate */
    excludeTurnaroundSheet?: boolean;
    /** Crop 四视图 → single front plate (default true for storyboard) */
    cropTurnaroundToPlate?: boolean;
  },
): Promise<{ type: "image"; base64: string }[]> {
  if (!assetIds.length) return [];

  const assets = await db("o_assets")
    .whereIn("id", assetIds)
    .select("id", "imageId", "prompt", "remark", "describe", "type");
  const byAsset = new Map(assets.map((a) => [a.id!, a]));
  const imageIds = assetIds.map((id) => byAsset.get(id)?.imageId).filter(Boolean) as number[];
  if (!imageIds.length) return [];

  const imagePaths = await db("o_image").whereIn("id", imageIds).select("id", "filePath");
  const byImage = new Map(imagePaths.map((r) => [r.id!, r]));
  const list: { type: "image"; base64: string }[] = [];

  const cropOn = opts?.cropTurnaroundToPlate !== false;
  const { isTurnaroundSheetAsset } =
    require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
  const { cropTurnaroundSheetToIdentityPlate } =
    require("./cropTurnaroundToIdentityPlate") as typeof import("./cropTurnaroundToIdentityPlate");

  void opts?.excludeTurnaroundSheet;
  for (const assetId of assetIds) {
    const asset = byAsset.get(assetId);
    if (!asset?.imageId) continue;
    const row = byImage.get(asset.imageId);
    if (!row?.filePath) continue;
    try {
      let base64 = await u.oss.getImageBase64(row.filePath);
      const isSheet = isTurnaroundSheetAsset({
        prompt: (asset as { prompt?: string }).prompt,
        remark: (asset as { remark?: string }).remark,
        describe: (asset as { describe?: string }).describe,
        type: (asset as { type?: string }).type,
      });
      if (cropOn && isSheet) {
        const cropped = await cropTurnaroundSheetToIdentityPlate(base64, {
          assumeSheet: true,
          threeViewStrip: true,
        });
        if (cropped.cropped && cropped.base64) base64 = cropped.base64;
      } else if (cropOn && String((asset as { type?: string }).type ?? "") !== "scene") {
        // Unmarked character: only wide-strip crop (never assumeSheet — 方图单帧勿切半)
        const cropped = await cropTurnaroundSheetToIdentityPlate(base64, { assumeSheet: false });
        if (cropped.cropped && cropped.base64) base64 = cropped.base64;
      }
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
  opts?: { excludeScene?: boolean },
): Promise<{
  referenceList: { type: "image"; base64: string }[];
  warnings: ReferenceWarning[];
  sceneRefsDropped?: number;
  /** True when at least one character cref is a turnaround/四视图 sheet */
  turnaroundCrefUsed?: boolean;
}> {
  const assetRows = await db("o_assets2Storyboard").where("storyboardId", storyboardId).orderBy("rowid").pluck("assetId");
  const order =
    preferredOrder?.length
      ? preferredOrder
      : resolveShotIdentityBinding({
          description: prompt,
          assetCodes: [...charCodes, ...parsePromptRefs(prompt).crefs].filter((c) => /^CHAR-/i.test(c)),
        }).orderedCodes;
  const beforeCount = (assetRows as number[]).length;
  const merged = await mergeAssociateAssetIds(
    db,
    projectId,
    assetRows as number[],
    prompt,
    charCodes,
    undefined,
    order,
    { excludeScene: opts?.excludeScene },
  );

  // Keep 四视图 as identity cref; warn so compose can tighten single-frame lock (no-VLM path)
  const { isTurnaroundSheetAsset } =
    require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
  const assetIds = merged.assetIds;
  const sheetWarnings: ReferenceWarning[] = [...merged.warnings];
  let turnaroundCrefUsed = false;
  if (assetIds.length) {
    const rows = await db("o_assets")
      .whereIn("id", assetIds)
      .select("id", "name", "prompt", "remark", "describe", "type");
    for (const a of rows as Array<{
      id: number;
      name?: string;
      prompt?: string;
      remark?: string;
      describe?: string;
      type?: string;
    }>) {
      if (
        isTurnaroundSheetAsset({
          prompt: a.prompt,
          remark: a.remark,
          describe: a.describe,
          type: a.type,
        })
      ) {
        turnaroundCrefUsed = true;
        sheetWarnings.push({
          code: a.name ?? String(a.id),
          assetId: a.id,
          message: `四视图已裁正面单帧作身份锁：${a.name ?? a.id}`,
        });
      }
    }
  }

  const referenceList = await buildReferenceListFromAssetIds(db, assetIds, {
    cropTurnaroundToPlate: true,
  });
  // Aspect heuristic: crop ultra-wide / marked 定妆格 (never assumeSheet on scene / single plates)
  {
    const { cropTurnaroundSheetToIdentityPlate } =
      require("./cropTurnaroundToIdentityPlate") as typeof import("./cropTurnaroundToIdentityPlate");
    const sheetIds = new Set<number>();
    if (assetIds.length) {
      const rows = await db("o_assets")
        .whereIn("id", assetIds)
        .select("id", "prompt", "remark", "describe", "type");
      for (const a of rows as Array<{
        id: number;
        prompt?: string;
        remark?: string;
        describe?: string;
        type?: string;
      }>) {
        if (
          isTurnaroundSheetAsset({
            prompt: a.prompt,
            remark: a.remark,
            describe: a.describe,
            type: a.type,
          })
        ) {
          sheetIds.add(a.id);
        }
      }
    }
    for (let i = 0; i < referenceList.length; i++) {
      const item = referenceList[i]!;
      const aid = assetIds[i];
      const assumeSheet = aid != null && sheetIds.has(aid);
      const cropped = await cropTurnaroundSheetToIdentityPlate(item.base64, { assumeSheet });
      if (cropped.cropped && cropped.base64) {
        referenceList[i] = { type: "image", base64: cropped.base64 };
        turnaroundCrefUsed = true;
        sheetWarnings.push({
          code: `ref${i}`,
          message: `参考已裁单帧身份板（${cropped.reason}）`,
        });
      }
    }
  }
  const sceneRefsDropped =
    opts?.excludeScene && beforeCount > merged.assetIds.length
      ? beforeCount - merged.assetIds.length
      : opts?.excludeScene
        ? Math.max(0, beforeCount - merged.assetIds.length)
        : 0;
  // Face CU / excludeScene: at most one cropped identity plate (never multi-cref collage)
  if (opts?.excludeScene && referenceList.length > 1) {
    sheetWarnings.push({
      code: "faceCuCap",
      message: `特写仅保留1张身份板（丢弃${referenceList.length - 1}张额外参考）`,
    });
    referenceList.splice(1);
  }
  return { referenceList, warnings: sheetWarnings, sceneRefsDropped, turnaroundCrefUsed };
}

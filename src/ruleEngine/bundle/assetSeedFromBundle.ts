import type { Knex } from "knex";
import type { ScriptBundle, StoryboardPanelInput } from "./types";
import { parsePromptRefs } from "../compilers/vendorPromptAdapter";
import { normalizeStateVariants } from "./normalizeCharacterDesign";
import { normalizeAssetCode } from "../codes/assetCodeContract";
import { getBundleAlias, lookupKeysForCode, resolveAliasedCode } from "../codes/assetCodeAlias";
import { allocateSceneCodes, normalizePropCode, rewriteSceneColorLock } from "./normalizePreDesignPack";
import {
  flattenCharacterVisualBrief,
  flattenPropBrief,
  flattenSceneBrief,
  type CdAssetLike,
} from "./assetVisualBrief";

export interface AssetSeedResult {
  codeToId: Record<string, number>;
  nameToId: Record<string, number>;
  seeded: number;
  derivatives: number;
  linked: number;
  allAssetIds: number[];
  weakPromptCount: number;
  derivativeSkipReason?: string;
  propSeeded: number;
  speakerSeeded: number;
  sceneSeeded: number;
  speakerWarns?: string[];
}

type CdAsset = CdAssetLike;

function normalizeAssetDisplayName(name: string): string {
  return name.replace(/\s+/g, "").trim();
}

function findNameId(
  nameToId: Record<string, number>,
  name: string,
): number | undefined {
  if (nameToId[name]) return nameToId[name];
  const norm = normalizeAssetDisplayName(name);
  for (const [k, id] of Object.entries(nameToId)) {
    if (normalizeAssetDisplayName(k) === norm) return id;
  }
  return undefined;
}

/** True when describe should be overwritten with displayName / prompt summary. */
export function shouldRefreshDescribe(
  describe: string | null | undefined,
  code?: string,
): boolean {
  const d = (describe ?? "").trim();
  if (!d) return true;
  if (code && d === code) return true;
  if (/^SCENE-\d+$/i.test(d)) return true;
  if (/^CHAR-\d+$/i.test(d)) return true;
  if (/^stub for\b/i.test(d)) return true;
  return false;
}

export function computeDerivativeSkipReason(assets: CdAsset[]): string | undefined {
  if (!assets.length) return undefined;
  let anyVariants = false;
  let anyArcOnly = false;
  for (const asset of assets) {
    const variants = normalizeStateVariants(asset.L6?.stateVariants);
    if (variants.length) anyVariants = true;
    const arc = asset.L6?.arcVisual;
    if (typeof arc === "string" && arc.trim() && !variants.length) anyArcOnly = true;
  }
  if (anyVariants) return undefined;
  if (anyArcOnly) return "arcVisual_only_no_stateVariants";
  return "no_L6_stateVariants";
}

function promptFromCdAsset(asset: CdAsset): { prompt: string; weak: boolean; stub: boolean } {
  const stub = asset.L0?.stub === true;
  const flat = flattenCharacterVisualBrief(asset);
  return { prompt: flat.brief, weak: flat.weak, stub };
}

function visualDescribe(asset: CdAsset, name: string): string {
  const flat = flattenCharacterVisualBrief(asset);
  return flat.describe || name;
}

export function assetCodeRemark(code: string): string {
  return `assetCode:${code}`;
}

export function charCodeRemark(code: string): string {
  return `charCode:${code}`;
}

export function deriveOfRemark(parentCode: string, variantName: string): string {
  return `deriveOf:${parentCode}|${variantName}`;
}

function hasTag(remark: string | null | undefined, tag: string): boolean {
  return Boolean(remark && remark.includes(tag));
}

function isStubPrompt(prompt: string | null | undefined): boolean {
  return Boolean(prompt && /^stub for\b/i.test(prompt.trim()));
}

async function upsertNamedAsset(
  db: Knex,
  projectId: number,
  existing: {
    id?: number;
    name?: string | null;
    prompt?: string | null;
    remark?: string | null;
    describe?: string | null;
    promptState?: string | null;
  }[],
  nameToId: Record<string, number>,
  opts: {
    name: string;
    type: "role" | "scene" | "tool";
    prompt: string;
    remark?: string;
    assetsId?: number;
    /** Prefer matching by assetCode remark when name differs */
    code?: string;
    /** Short Chinese describe for UI（场景描述） */
    describe?: string;
  },
): Promise<{ id: number; created: boolean }> {
  const displayDescribe = (opts.describe ?? opts.name).slice(0, 500);

  // Prefer existing row with same assetCode
  if (opts.code) {
    const byCode = existing.find(
      (a) => a.remark && String(a.remark).includes(`assetCode:${opts.code}`),
    );
    if (byCode?.id) {
      nameToId[opts.name] = byCode.id;
      const protectedDone =
        byCode.promptState === "已完成" || String(byCode.remark ?? "").includes("aiCompleted:1");
      const patch: Record<string, unknown> = {};
      if (
        !protectedDone &&
        opts.prompt &&
        (!byCode.prompt?.trim() || isStubPrompt(byCode.prompt))
      ) {
        patch.prompt = opts.prompt.slice(0, 2000);
      }
      if (
        !protectedDone &&
        (shouldRefreshDescribe(byCode.describe, opts.code) ||
          shouldRefreshDescribe(byCode.describe, byCode.name ?? undefined))
      ) {
        patch.describe = displayDescribe;
      }
      if (byCode.name !== opts.name && opts.name && !/^SCENE-\d+/i.test(opts.name)) {
        // Upgrade code-named stub to Chinese name
        if (!byCode.name || byCode.name === opts.code || /^SCENE-\d+/i.test(String(byCode.name))) {
          patch.name = opts.name;
          nameToId[opts.name] = byCode.id;
          // Name upgrade always refreshes describe when it was code-like
          if (shouldRefreshDescribe(byCode.describe, opts.code) || shouldRefreshDescribe(byCode.describe, String(byCode.name))) {
            patch.describe = displayDescribe;
          }
        }
      }
      // When name already Chinese but describe stuck as SCENE-00x / code
      if (
        !protectedDone &&
        opts.name &&
        !/^SCENE-\d+/i.test(opts.name) &&
        shouldRefreshDescribe(byCode.describe, opts.code)
      ) {
        patch.describe = displayDescribe;
        if (opts.prompt && (isStubPrompt(byCode.prompt) || shouldRefreshDescribe(byCode.prompt, opts.code))) {
          patch.prompt = opts.prompt.slice(0, 2000);
        }
      }
      if (!protectedDone && opts.remark && !hasTag(byCode.remark as string | undefined, opts.remark.split("|")[0]!)) {
        const prev = (byCode.remark as string | undefined) ?? "";
        // Strip orphanStub when upgrading to real seed
        const cleaned = prev
          .split(";")
          .filter((t) => t && t !== "orphanStub:1")
          .join(";");
        patch.remark = cleaned && !cleaned.includes(opts.remark) ? `${cleaned};${opts.remark}` : opts.remark;
      } else if (
        !protectedDone &&
        byCode.remark &&
        String(byCode.remark).includes("orphanStub:1") &&
        opts.prompt &&
        !isStubPrompt(opts.prompt)
      ) {
        patch.remark = String(byCode.remark)
          .split(";")
          .filter((t) => t && t !== "orphanStub:1")
          .join(";");
      }
      if (opts.assetsId != null) patch.assetsId = opts.assetsId;
      if (Object.keys(patch).length) {
        await db("o_assets").where({ id: byCode.id }).update(patch);
        Object.assign(byCode, patch);
      }
      return { id: byCode.id, created: false };
    }
  }

  let id = findNameId(nameToId, opts.name) ?? nameToId[opts.name];
  if (!id) {
    const [newId] = await db("o_assets").insert({
      projectId,
      name: opts.name,
      type: opts.type,
      prompt: opts.prompt.slice(0, 2000),
      describe: displayDescribe,
      remark: opts.remark,
      assetsId: opts.assetsId,
      startTime: Date.now(),
    });
    id = newId;
    nameToId[opts.name] = id;
    existing.push({ id, name: opts.name, prompt: opts.prompt, remark: opts.remark, describe: displayDescribe });
    return { id, created: true };
  }

  const row = existing.find((a) => a.id === id);
  const patch: Record<string, unknown> = {};
  if (opts.prompt && (!row?.prompt?.trim() || isStubPrompt(row.prompt))) {
    patch.prompt = opts.prompt.slice(0, 2000);
  }
  if (shouldRefreshDescribe(row?.describe, opts.code) || shouldRefreshDescribe(row?.describe, row?.name ?? undefined)) {
    patch.describe = displayDescribe;
  }
  if (opts.remark && !hasTag(row?.remark as string | undefined, opts.remark.split("|")[0]!)) {
    const prev = (row?.remark as string | undefined) ?? "";
    patch.remark = prev && !prev.includes(opts.remark) ? `${prev};${opts.remark}` : opts.remark;
  }
  if (opts.assetsId != null) patch.assetsId = opts.assetsId;
  if (Object.keys(patch).length) {
    await db("o_assets").where({ id }).update(patch);
  }
  return { id, created: false };
}

export async function seedAssetsFromBundle(db: Knex, projectId: number, bundle: ScriptBundle): Promise<AssetSeedResult> {
  const codeToId: Record<string, number> = {};
  const nameToId: Record<string, number> = {};
  const allAssetIds = new Set<number>();
  let seeded = 0;
  let derivatives = 0;
  let weakPromptCount = 0;
  let propSeeded = 0;
  let speakerSeeded = 0;
  let sceneSeeded = 0;
  let derivativeSkipReason: string | undefined;

  const existing = await db("o_assets").where({ projectId }).select("id", "name", "prompt", "remark", "describe", "promptState");
  for (const a of existing) {
    if (a.name) nameToId[a.name] = a.id!;
    // Index codes from remark
    const m = String(a.remark ?? "").match(/assetCode:([A-Z]+-[A-Z0-9]+)/i);
    if (m?.[1] && a.id) {
      const c = normalizeAssetCode(m[1]) ?? m[1];
      codeToId[c] = a.id;
    }
  }

  const alias = getBundleAlias(bundle);
  const cd = bundle.characterDesign as { assets?: CdAsset[] } | undefined;
  const assets = cd?.assets ?? [];

  for (const asset of assets) {
    const code = asset.code ? normalizeAssetCode(asset.code) ?? asset.code : undefined;
    const name = asset.name ?? code;
    if (!name) continue;

    const { prompt: promptText, weak, stub } = promptFromCdAsset(asset);
    if (weak) weakPromptCount++;
    const remarkParts = [
      code ? `${charCodeRemark(code)};${assetCodeRemark(code)}` : undefined,
      stub || asset.L0?.stub ? "cdStub:1;batchExclude:1;weakPrompt:1" : weak ? "weakPrompt:1" : undefined,
    ].filter(Boolean);
    const remark = remarkParts.length ? remarkParts.join(";") : undefined;
    const up = await upsertNamedAsset(db, projectId, existing, nameToId, {
      name,
      type: "role",
      prompt: promptText,
      describe: visualDescribe(asset, name),
      remark,
      code,
    });
    if (up.created) seeded++;
    if (code) {
      codeToId[code] = up.id;
      // Index digit aliases → same id
      for (const [dig, slug] of Object.entries(alias)) {
        if (slug === code) codeToId[dig] = up.id;
      }
    }
    allAssetIds.add(up.id);

    if (stub || asset.L0?.stub) {
      // Stubs: no stateVariants / derivatives
      continue;
    }

    const variants = normalizeStateVariants(asset.L6?.stateVariants);
    for (const v of variants) {
      const rawName = v.name ?? "variant";
      const vName = `${name}-${rawName}`;
      const visual = (v.visual ?? "").trim();
      if (!visual) continue;
      const deriveRemark = code
        ? `${deriveOfRemark(code, rawName)};${charCodeRemark(code)}`
        : undefined;
      if (nameToId[vName]) {
        allAssetIds.add(nameToId[vName]!);
        continue;
      }
      const [derivId] = await db("o_assets").insert({
        projectId,
        name: vName,
        type: "role",
        prompt: visual.slice(0, 2000),
        describe: visual.slice(0, 500),
        assetsId: up.id,
        remark: deriveRemark,
        startTime: Date.now(),
      });
      nameToId[vName] = derivId;
      allAssetIds.add(derivId);
      derivatives++;
    }
  }

  derivativeSkipReason = computeDerivativeSkipReason(assets);

  const vlt = bundle.visualLockTable as {
    sceneColorLock?: Record<string, unknown>;
    anchorProps?: Record<string, { name?: string; significance?: string; material?: string; form?: string }>;
  } | undefined;

  // Ensure SCENE-* keys even if import skipped normalizePreDesignPack
  let sceneLock = vlt?.sceneColorLock ?? {};
  const hasChineseSceneKey = Object.keys(sceneLock).some((k) => /[\u4e00-\u9fff]/.test(k) && !/^SCENE-/i.test(k));
  if (hasChineseSceneKey) {
    const shotNames = (bundle.preDesignPack?.shots ?? [])
      .map((s) => (s as { sceneName?: string }).sceneName)
      .filter(Boolean) as string[];
    const lockNames = Object.keys(sceneLock).filter((k) => /[\u4e00-\u9fff]/.test(k));
    const sceneMap = allocateSceneCodes([...new Set([...shotNames, ...lockNames])]);
    sceneLock = rewriteSceneColorLock(sceneLock, sceneMap);
    if (bundle.visualLockTable && typeof bundle.visualLockTable === "object") {
      (bundle.visualLockTable as { sceneColorLock: typeof sceneLock }).sceneColorLock = sceneLock;
    }
  }

  for (const [rawCode, sceneRaw] of Object.entries(sceneLock)) {
    const code = normalizeAssetCode(rawCode) ?? rawCode;
    if (!/^SCENE-/i.test(code) && !/^SCENE-/i.test(rawCode)) continue;

    const sceneObj =
      typeof sceneRaw === "string"
        ? { name: undefined as string | undefined, colorTemp: sceneRaw, raw: sceneRaw }
        : {
            ...(sceneRaw as {
              name?: string;
              colorTemp?: string;
              dominantHue?: string;
              anchorElements?: string[];
            }),
            raw: undefined as string | undefined,
          };

    let displayName = sceneObj.name ?? code;
    if (displayName === code || /^SCENE-\d+$/i.test(displayName)) {
      const shotName = (bundle.preDesignPack?.shots ?? []).find(
        (s) => (s as { sceneCode?: string }).sceneCode === code,
      )?.sceneName;
      if (shotName) displayName = shotName;
    }
    const flat = flattenSceneBrief(
      {
        name: displayName,
        colorTemp: sceneObj.colorTemp,
        dominantHue: sceneObj.dominantHue,
        anchorElements: sceneObj.anchorElements,
        raw: typeof sceneRaw === "string" ? sceneRaw : sceneObj.colorTemp,
      },
      displayName,
    );
    const remark = [assetCodeRemark(code), flat.weak ? "weakPrompt:1" : undefined].filter(Boolean).join(";");
    if (flat.weak) weakPromptCount++;
    const up = await upsertNamedAsset(db, projectId, existing, nameToId, {
      name: displayName,
      type: "scene",
      prompt: flat.brief,
      describe: flat.describe,
      remark,
      code,
    });
    if (up.created) {
      seeded++;
      sceneSeeded++;
    }
    codeToId[code] = up.id;
    allAssetIds.add(up.id);
  }

  for (const [rawCode, prop] of Object.entries(vlt?.anchorProps ?? {})) {
    const code = normalizePropCode(rawCode) ?? normalizeAssetCode(rawCode) ?? rawCode;
    const name = prop.name ?? code;
    const flat = flattenPropBrief(prop, code);
    const remark = [assetCodeRemark(code), flat.weak ? "weakPrompt:1" : undefined].filter(Boolean).join(";");
    if (flat.weak) weakPromptCount++;
    const up = await upsertNamedAsset(db, projectId, existing, nameToId, {
      name,
      type: "tool",
      prompt: flat.brief,
      describe: flat.describe,
      remark,
      code,
    });
    if (up.created) {
      seeded++;
      propSeeded++;
    }
    codeToId[code] = up.id;
    allAssetIds.add(up.id);
  }

  // Speakers without CD entries (WARN-level; do not block main closure)
  // After ensureCdSpeakerStubs, orphans should be rare — skip if CD/name already seeded.
  const speakers =
    (bundle as { _speakerOrphans?: { name: string; code: string }[] })._speakerOrphans ?? [];
  const speakerWarns: string[] = [];
  for (const sp of speakers) {
    const code = sp.code;
    const name = sp.name;
    speakerWarns.push(`speaker_orphan:${name}:${code}`);
    if (codeToId[code] || findNameId(nameToId, name)) {
      const id = codeToId[code] ?? findNameId(nameToId, name)!;
      codeToId[code] = id;
      allAssetIds.add(id);
      continue;
    }
    const up = await upsertNamedAsset(db, projectId, existing, nameToId, {
      name,
      type: "role",
      prompt: `配角 ${name}`,
      describe: name,
      remark: `${charCodeRemark(code)};${assetCodeRemark(code)};speakerSeed:1;batchExclude:1;weakPrompt:1`,
      code,
    });
    if (up.created) {
      seeded++;
      speakerSeeded++;
      weakPromptCount++;
    }
    codeToId[code] = up.id;
    allAssetIds.add(up.id);
  }

  return {
    codeToId,
    nameToId,
    seeded,
    derivatives,
    linked: 0,
    allAssetIds: [...allAssetIds],
    weakPromptCount,
    derivativeSkipReason,
    propSeeded,
    speakerSeeded,
    sceneSeeded,
    speakerWarns,
  };
}

/** Link bundle-seeded assets to script so getFlowData / 分镜 cref 可解析。 */
export async function linkSeededAssetsToScript(
  db: Knex,
  scriptId: number,
  seed: AssetSeedResult,
  opts?: { replaceAll?: boolean; pruneStale?: boolean },
): Promise<{ linked: number; pruned: number }> {
  const assetIds = seed.allAssetIds?.length
    ? [...new Set(seed.allAssetIds)]
    : [...new Set(Object.values(seed.codeToId))];
  if (!assetIds.length) return { linked: 0, pruned: 0 };
  let pruned = 0;
  if (opts?.replaceAll) {
    await db("o_scriptAssets").where({ scriptId }).delete();
  } else if (opts?.pruneStale && assetIds.length) {
    pruned = await db("o_scriptAssets")
      .where({ scriptId })
      .whereNotIn("assetId", assetIds)
      .delete();
  }
  const existing = await db("o_scriptAssets").where({ scriptId }).whereIn("assetId", assetIds).pluck("assetId");
  const existingSet = new Set(existing as number[]);
  const rows = assetIds.filter((id) => !existingSet.has(id)).map((assetId) => ({ scriptId, assetId }));
  if (rows.length) await db("o_scriptAssets").insert(rows);
  await db("o_assets").whereIn("id", assetIds).whereNull("scriptId").update({ scriptId });
  return { linked: rows.length, pruned };
}

/**
 * On replaceAll import: remove orphanStub SCENE rows and ordinal-code dirty rows
 * outside keepCodes so secondary import does not pile stubs / SCENE-00x ghosts.
 */
export async function purgeOrphanStubScenes(
  db: Knex,
  projectId: number,
  keepCodes: Set<string>,
): Promise<number> {
  const rows = await db("o_assets")
    .where({ projectId, type: "scene" })
    .select("id", "name", "remark", "prompt", "describe");
  let deleted = 0;
  for (const r of rows) {
    const remark = String(r.remark ?? "");
    const m = remark.match(/assetCode:(SCENE-[A-Z0-9]+)/i);
    const code = m?.[1] ? normalizeAssetCode(m[1]) ?? m[1] : null;
    if (code && keepCodes.has(code)) continue; // seed upsert refreshes describe

    const stubby = remark.includes("orphanStub:1") || isStubPrompt(r.prompt);
    const ordinalGhost =
      /^SCENE-\d+$/i.test(String(r.name ?? "")) ||
      (/^SCENE-\d+$/i.test(String(r.describe ?? "")) && (!r.name || /^SCENE-/i.test(String(r.name))));
    if (!stubby && !ordinalGhost) continue;

    await db("o_scriptAssets").where({ assetId: r.id }).delete();
    await db("o_assets").where({ id: r.id }).delete();
    deleted++;
  }
  return deleted;
}

export function linkPanelsToAssets(
  panels: StoryboardPanelInput[],
  shots: { charCodes?: string[]; sceneCode?: string }[],
  codeToId: Record<string, number>,
  nameToId: Record<string, number>,
  alias?: Record<string, string>,
): StoryboardPanelInput[] {
  return panels.map((panel, i) => {
    const refs = parsePromptRefs(panel.prompt ?? "");
    const codes = [
      ...new Set([
        ...(shots[i]?.charCodes ?? []),
        ...(shots[i]?.sceneCode ? [shots[i]!.sceneCode!] : []),
        ...refs.crefs,
        ...refs.srefs,
      ]),
    ];
    const ids = new Set<number>(panel.associateAssetsIds ?? []);
    for (const code of codes) {
      const resolved = resolveAliasedCode(code, alias);
      for (const key of lookupKeysForCode(code, alias)) {
        if (codeToId[key]) ids.add(codeToId[key]!);
      }
      if (codeToId[resolved]) ids.add(codeToId[resolved]!);
      else if (nameToId[code]) ids.add(nameToId[code]!);
    }
    return { ...panel, associateAssetsIds: [...ids] };
  });
}

/**
 * Shared shot identity resolver — single SSOT for workbench CHAR/SCENE/PROP.
 * Used by getShotSpecDiff, generateVideoPrompt, generateVideo, fillModeMatrix, batchGenerateVideo.
 */
import type { Knex } from "knex";
import { normalizeAssetCode } from "../codes/assetCodeContract";
import { buildCodeAliasMap, type CodeAliasMap } from "../codes/assetCodeAlias";
import type { ScriptBundle } from "../bundle/types";
import type { EpisodeShot } from "../types";
import {
  loadBoundAssetsForStoryboard,
  parseCrefsSrefsFromPrompt,
} from "./compileOrGenerateVideoPrompt";
import {
  gateIdentityImages,
  buildMissingAssetImageQueue,
  type IdentityImageGateResult,
} from "./identityAssetGate";
import { loadProjectBlueprint } from "../storage/episodePackageStore";

export type BoundAssetRef = {
  assetId: number;
  code?: string;
  name?: string;
  filePath?: string | null;
};

export interface ResolveShotIdentityInput {
  db: Knex;
  projectId: number;
  storyboardId?: number | null;
  shot?: EpisodeShot | null;
  /** Extra prompt blob (track prompt / request body) */
  extraPrompt?: string;
  /** Optional pre-loaded bound assets (merged with storyboard links) */
  boundAssets?: BoundAssetRef[];
  /** When true, DB errors on bound-asset load throw instead of returning [] */
  failClosedBound?: boolean;
  bundle?: ScriptBundle | null;
  codeAlias?: CodeAliasMap;
}

export interface ResolvedShotIdentity {
  charCodes: string[];
  sceneCode: string | null;
  propCodes: string[];
  promptBlob: string;
  boundAssets: BoundAssetRef[];
  codeAlias: CodeAliasMap;
  sceneName: string;
}

function uniqCodes(codes: (string | undefined | null)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of codes) {
    if (!raw) continue;
    const n = normalizeAssetCode(raw) ?? String(raw).trim().toUpperCase();
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export async function blueprintToBundle(db: Knex, projectId: number): Promise<ScriptBundle> {
  const blueprint = (await loadProjectBlueprint(db, projectId)) ?? {};
  const rawCa = blueprint.characterAssets;
  const cdAssets = Array.isArray(rawCa)
    ? rawCa
    : rawCa && typeof rawCa === "object"
      ? Object.entries(rawCa as Record<string, unknown>).map(([code, v]) =>
          v && typeof v === "object" ? { code, ...(v as object) } : { code, name: String(v ?? code) },
        )
      : ((blueprint.characterDesign as { assets?: unknown[] } | undefined)?.assets ?? []);
  return {
    characterDesign: { assets: cdAssets },
    visualLockTable: {
      sceneColorLock:
        (blueprint.sceneColorLock as Record<string, unknown>) ??
        (blueprint.visualLockTable as { sceneColorLock?: Record<string, unknown> } | undefined)?.sceneColorLock,
      characterAssets:
        typeof rawCa === "object" && !Array.isArray(rawCa)
          ? Object.fromEntries(
              Object.entries(rawCa as Record<string, unknown>).map(([k, v]) => [
                k,
                typeof v === "string" ? v : (v as { name?: string })?.name ?? k,
              ]),
            )
          : undefined,
    },
    preDesignPack: blueprint.preDesignPack as ScriptBundle["preDesignPack"],
  } as ScriptBundle;
}

async function resolveSceneByName(
  db: Knex,
  projectId: number,
  sceneName: string,
  bundle: ScriptBundle,
): Promise<string | null> {
  if (!sceneName || /^SCENE-/i.test(sceneName)) return null;
  const lock =
    (bundle.visualLockTable as { sceneColorLock?: Record<string, { name?: string }> } | undefined)
      ?.sceneColorLock ?? {};
  for (const [code, meta] of Object.entries(lock)) {
    if (meta?.name === sceneName || meta?.name?.includes(sceneName) || sceneName.includes(meta?.name ?? "\0")) {
      return normalizeAssetCode(code) ?? code;
    }
  }
  const row = await db("o_assets")
    .where({ projectId, type: "scene", name: sceneName })
    .select("remark")
    .first()
    .catch(() => null);
  const m = String(row?.remark ?? "").match(/assetCode:(SCENE-[A-Za-z0-9]+)/i);
  return m?.[1] ? normalizeAssetCode(m[1]) ?? m[1] : null;
}

/**
 * Resolve CHAR/SCENE/PROP for one shot — order is SSOT:
 * 1. narrative.sceneCode / assetCodes
 * 2. --cref/--sref from prompt blob
 * 3. o_assets2Storyboard bound codes
 * 4. sceneName → lock / o_assets.remark
 * 5. digit↔slug via codeAlias
 */
export async function resolveShotIdentity(input: ResolveShotIdentityInput): Promise<ResolvedShotIdentity> {
  const { db, projectId, shot } = input;
  const bundle = input.bundle ?? (await blueprintToBundle(db, projectId));
  const codeAlias = input.codeAlias ?? buildCodeAliasMap(bundle);

  const storyboardId = input.storyboardId ?? shot?.storyboardId ?? null;
  let boundAssets: BoundAssetRef[] = [...(input.boundAssets ?? [])];
  if (storyboardId != null) {
    try {
      const linked = await loadBoundAssetsForStoryboard(db, storyboardId, {
        failClosed: input.failClosedBound === true,
      });
      const byId = new Map(boundAssets.map((b) => [b.assetId, b]));
      for (const b of linked) byId.set(b.assetId, b);
      boundAssets = [...byId.values()];
    } catch (e) {
      if (input.failClosedBound) throw e;
    }
  }

  let sbPrompt = "";
  if (storyboardId != null) {
    const sb = await db("o_storyboard").where({ id: storyboardId }).select("prompt").first().catch(() => null);
    sbPrompt = String(sb?.prompt ?? "");
  }

  const promptBlob = [
    shot?.generation?.imagePrompt,
    shot?.generation?.videoPrompt,
    shot?.generation?.videoDesc,
    sbPrompt,
    input.extraPrompt,
  ]
    .map((s) => String(s ?? "").trim())
    .find((s) => s.length > 0) ?? "";

  const { crefs, srefs } = parseCrefsSrefsFromPrompt(promptBlob);
  const assetCodes = (shot?.narrative?.assetCodes ?? []).filter(Boolean) as string[];
  const sceneName = String(shot?.narrative?.sceneName ?? "").trim();

  let sceneCode =
    (shot?.narrative?.sceneCode ? normalizeAssetCode(shot.narrative.sceneCode) ?? shot.narrative.sceneCode : null) ??
    assetCodes.find((c) => /^SCENE-/i.test(c)) ??
    srefs[0] ??
    boundAssets.find((a) => a.code && /^SCENE-/i.test(a.code))?.code ??
    null;

  if (!sceneCode && sceneName) {
    sceneCode = await resolveSceneByName(db, projectId, sceneName, bundle);
  }

  if (sceneCode && codeAlias[sceneCode]) {
    /* SCENE aliases rare; keep canonical */
  }

  const charCodes = uniqCodes([
    ...assetCodes.filter((c) => /^CHAR-/i.test(c)),
    ...crefs,
    ...boundAssets.map((a) => a.code).filter((c): c is string => Boolean(c && /^CHAR-/i.test(c))),
  ]).map((c) => {
    const aliased = codeAlias[c];
    return aliased && /^CHAR-/i.test(aliased) ? aliased : c;
  });

  const propCodes = uniqCodes([
    ...assetCodes.filter((c) => /^PROP-/i.test(c)),
    ...boundAssets.map((a) => a.code).filter((c): c is string => Boolean(c && /^PROP-/i.test(c))),
  ]);

  if (sceneCode) {
    const n = normalizeAssetCode(sceneCode) ?? sceneCode;
    sceneCode = codeAlias[n] && /^SCENE-/i.test(codeAlias[n]!) ? codeAlias[n]! : n;
  }

  return {
    charCodes: uniqCodes(charCodes),
    sceneCode,
    propCodes: uniqCodes(propCodes),
    promptBlob,
    boundAssets,
    codeAlias,
    sceneName,
  };
}

export async function gateIdentityForShot(
  input: ResolveShotIdentityInput & {
    requireSceneWhenCharScene?: boolean;
  },
): Promise<{
  identity: ResolvedShotIdentity;
  gate: IdentityImageGateResult;
  missingQueue: ReturnType<typeof buildMissingAssetImageQueue>;
}> {
  const identity = await resolveShotIdentity(input);
  const gate = await gateIdentityImages(input.db, input.projectId, {
    prompt: identity.promptBlob,
    charCodes: identity.charCodes,
    sceneCode: identity.sceneCode,
    propCodes: identity.propCodes,
    codeAlias: identity.codeAlias,
    boundAssets: identity.boundAssets,
    requireSceneWhenCharScene: input.requireSceneWhenCharScene,
  });
  return {
    identity,
    gate,
    missingQueue: buildMissingAssetImageQueue(gate.gaps),
  };
}

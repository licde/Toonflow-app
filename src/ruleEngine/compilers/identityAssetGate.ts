/**
 * Identity asset image gate — cref/sref codes must bind to assets with completed stills.
 * Missing image / stub quality → AS/CD, never silent green.
 */
import type { Knex } from "knex";
import { normalizeAssetCode } from "../codes/assetCodeContract";
import { lookupKeysForCode, type CodeAliasMap } from "../codes/assetCodeAlias";
import { parsePromptRefs } from "./vendorPromptAdapter";

export interface IdentityImageGap {
  code: string;
  kind: "CHAR" | "SCENE" | "PROP" | "UNKNOWN";
  reason: "no_asset" | "no_image" | "cref_without_file" | "missing_scene" | "stub_quality";
}

export interface IdentityImageGateResult {
  ok: boolean;
  gaps: IdentityImageGap[];
  bound: { code: string; assetId: number; hasImage: boolean }[];
  reverseTrigger?: string;
}

function kindOf(code: string): IdentityImageGap["kind"] {
  if (/^CHAR-/i.test(code)) return "CHAR";
  if (/^SCENE-/i.test(code)) return "SCENE";
  if (/^PROP-/i.test(code)) return "PROP";
  return "UNKNOWN";
}

type IndexedRow = { id: number; hasImage: boolean; stubQuality: boolean; name?: string };

/** Prefer row that already has a completed still over heal-seeded stub duplicates. */
export function pickBetterRow(prev: IndexedRow | undefined, next: IndexedRow): IndexedRow {
  if (!prev) return next;
  if (prev.hasImage !== next.hasImage) return prev.hasImage ? prev : next;
  if (prev.stubQuality !== next.stubQuality) return prev.stubQuality ? next : prev;
  return prev.id <= next.id ? prev : next;
}

function stubQualityOf(
  a: { remark?: string; prompt?: string | null; name?: string | null },
  code: string,
): boolean {
  return (
    String(a.remark ?? "").includes("orphanStub:1") ||
    String(a.remark ?? "").includes("stillSeed:1") ||
    /^stub for\b/i.test(String(a.prompt ?? "")) ||
    (kindOf(code) === "SCENE" && (a.name === code || /^SCENE-\d+$/i.test(String(a.name ?? ""))))
  );
}

/**
 * Check that identity codes referenced by prompt / slots have o_assets rows with
 * a completed o_image.filePath (not merely a placeholder imageId).
 */
export async function gateIdentityImages(
  db: Knex,
  projectId: number,
  input: {
    prompt?: string;
    charCodes?: string[];
    sceneCode?: string | null;
    propCodes?: string[];
    requireSceneWhenCharScene?: boolean;
    /** digit↔slug aliases; CD slug is SSOT */
    codeAlias?: CodeAliasMap;
    /** Workbench-selected assets with images — SSOT when user already attached stills */
    boundAssets?: { assetId: number; code?: string; name?: string; filePath?: string | null }[];
  },
): Promise<IdentityImageGateResult> {
  const refs = parsePromptRefs(input.prompt ?? "");
  const codes = new Set<string>();
  for (const c of [...(input.charCodes ?? []), ...(input.propCodes ?? []), ...refs.crefs, ...refs.srefs]) {
    const n = normalizeAssetCode(c) ?? c.trim().toUpperCase();
    if (n) codes.add(n);
  }
  if (input.sceneCode) {
    const n = normalizeAssetCode(input.sceneCode) ?? input.sceneCode;
    codes.add(n);
  }

  const gaps: IdentityImageGap[] = [];
  const bound: IdentityImageGateResult["bound"] = [];

  if (input.requireSceneWhenCharScene !== false) {
    const hasChar = [...codes].some((c) => /^CHAR-/i.test(c));
    const hasScene = [...codes].some((c) => /^SCENE-/i.test(c));
    if (hasChar && !hasScene && !input.sceneCode) {
      gaps.push({ code: "SCENE-?", kind: "SCENE", reason: "missing_scene" });
    }
  }

  if (!codes.size && !gaps.length) {
    return { ok: true, gaps: [], bound: [] };
  }

  const assets = await db("o_assets")
    .leftJoin("o_image", "o_image.id", "o_assets.imageId")
    .where("o_assets.projectId", projectId)
    .select(
      "o_assets.id",
      "o_assets.remark",
      "o_assets.imageId",
      "o_assets.name",
      "o_assets.prompt",
      "o_image.filePath",
      "o_image.state as imageState",
    )
    .catch(
      () =>
        [] as {
          id: number;
          remark?: string;
          imageId?: number | null;
          filePath?: string | null;
          name?: string;
          prompt?: string | null;
          imageState?: string | null;
        }[],
    );

  const byCode = new Map<string, IndexedRow>();
  const byName = new Map<string, IndexedRow>();

  for (const a of assets) {
    const fp = a.filePath;
    const stateOk = !a.imageState || a.imageState === "已完成" || a.imageState === "生成成功";
    const stateBad = a.imageState === "生成中" || a.imageState === "生成失败";
    const hasImage = Boolean(fp && String(fp).trim() && stateOk && !stateBad);

    const remarkCodes = [
      ...String(a.remark ?? "").matchAll(/(?:assetCode|charCode):([A-Za-z]+-[A-Za-z0-9]+)/gi),
    ].map((m) => normalizeAssetCode(m[1]) ?? m[1].toUpperCase());

    for (const code of remarkCodes) {
      const row: IndexedRow = {
        id: a.id,
        hasImage,
        stubQuality: stubQualityOf(a, code),
        name: a.name,
      };
      byCode.set(code, pickBetterRow(byCode.get(code), row));
    }
    if (a.name) {
      const row: IndexedRow = {
        id: a.id,
        hasImage,
        stubQuality: stubQualityOf(a, a.name),
        name: a.name,
      };
      byName.set(a.name, pickBetterRow(byName.get(a.name), row));
    }
  }

  // Bound assets from workbench (user picked rows with filePath)
  const boundByCode = new Map<string, IndexedRow>();
  for (const b of input.boundAssets ?? []) {
    const hasImage = Boolean(b.filePath && String(b.filePath).trim());
    const codes = new Set<string>();
    if (b.code) {
      const n = normalizeAssetCode(b.code) ?? b.code.toUpperCase();
      codes.add(n);
      if (input.codeAlias) {
        for (const k of lookupKeysForCode(n, input.codeAlias)) codes.add(k);
      }
    }
    for (const c of codes) {
      boundByCode.set(
        c,
        pickBetterRow(boundByCode.get(c), {
          id: b.assetId,
          hasImage,
          stubQuality: false,
          name: b.name,
        }),
      );
    }
    if (b.name) {
      boundByCode.set(
        b.name,
        pickBetterRow(boundByCode.get(b.name), {
          id: b.assetId,
          hasImage,
          stubQuality: false,
          name: b.name,
        }),
      );
    }
  }

  for (const code of codes) {
    let hit = byCode.get(code);
    if (!hit && input.codeAlias) {
      for (const key of lookupKeysForCode(code, input.codeAlias)) {
        hit = byCode.get(key);
        if (hit) break;
      }
    }
    if (!hit) hit = boundByCode.get(code);
    if (!hit && input.codeAlias) {
      for (const key of lookupKeysForCode(code, input.codeAlias)) {
        hit = boundByCode.get(key);
        if (hit) break;
      }
    }
    if (!hit) hit = byName.get(code);
    if (!hit) {
      gaps.push({ code, kind: kindOf(code), reason: "no_asset" });
      continue;
    }
    bound.push({ code, assetId: hit.id, hasImage: hit.hasImage });
    if (hit.stubQuality && !hit.hasImage) {
      gaps.push({ code, kind: kindOf(code), reason: "stub_quality" });
      continue;
    }
    if (!hit.hasImage) {
      gaps.push({ code, kind: kindOf(code), reason: "no_image" });
    }
  }

  const ok = gaps.length === 0;
  let reverseTrigger: string | undefined;
  if (!ok) {
    if (gaps.some((g) => g.reason === "stub_quality")) reverseTrigger = "orphan_stub_no_image";
    else if (gaps.some((g) => g.reason === "no_image" || g.reason === "no_asset")) reverseTrigger = "img_cref_missing";
    else reverseTrigger = "missing_scene";
  }

  return { ok, gaps, bound, reverseTrigger };
}

/** Queue entries for missing stills — no_asset seeds first; never fake-green generate. */
export function buildMissingAssetImageQueue(
  gaps: IdentityImageGap[],
): { code: string; kind: string; action: "seed_asset" | "generate_still" }[] {
  return gaps
    .filter((g) => g.reason === "no_image" || g.reason === "no_asset" || g.reason === "stub_quality")
    .filter((g) => g.code !== "SCENE-?")
    .map((g) => ({
      code: g.code,
      kind: g.kind,
      action: g.reason === "no_asset" ? ("seed_asset" as const) : ("generate_still" as const),
    }));
}

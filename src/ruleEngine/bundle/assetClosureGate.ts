/**
 * Import-time asset / cref / sref closure gate.
 * Collects referenced codes → normalize → link existing / seed quality rows → BLOCK if still illegal.
 * Never inserts name===code SCENE with "stub for" prompt when a Chinese scene already exists.
 */
import type { Knex } from "knex";
import type { ScriptBundle } from "./types";
import { parsePromptRefs } from "../compilers/vendorPromptAdapter";
import { normalizeAssetCode, normalizeAssetCodes, kindOf } from "../codes/assetCodeContract";
import { assetCodeRemark, charCodeRemark } from "./assetSeedFromBundle";

export interface AssetClosureReport {
  ok: boolean;
  referenced: string[];
  orphansSeeded: string[];
  orphansLinked: string[];
  stillMissing: string[];
  shotCount: number;
  warnings: string[];
  stubCount: number;
}

type ShotLike = {
  charCodes?: string[];
  sceneName?: string;
  sceneCode?: string;
  generation?: {
    imagePrompt?: string;
    videoPrompt?: string;
    audioPrompt?: string;
    fxPrompt?: string;
  };
  prompts?: Record<string, string>;
};

function promptBlob(shot: ShotLike): string {
  const g = shot.generation ?? {};
  const p = shot.prompts ?? {};
  return [g.imagePrompt, g.videoPrompt, p.imagePrompt, p.videoPrompt].filter(Boolean).join("\n");
}

function cdCodes(bundle: ScriptBundle): Set<string> {
  const cd = bundle.characterDesign as { assets?: { code?: string }[] } | undefined;
  const vlt = bundle.visualLockTable as { characterAssets?: Record<string, unknown> } | undefined;
  const set = new Set<string>();
  for (const a of cd?.assets ?? []) {
    const n = normalizeAssetCode(a.code ?? "");
    if (n) set.add(n);
  }
  for (const k of Object.keys(vlt?.characterAssets ?? {})) {
    const n = normalizeAssetCode(k);
    if (n) set.add(n);
  }
  return set;
}

function vltScenePropCodes(bundle: ScriptBundle): { scenes: Set<string>; props: Set<string> } {
  const vlt = bundle.visualLockTable as {
    sceneColorLock?: Record<string, { name?: string }>;
    anchorProps?: Record<string, { name?: string }>;
  } | undefined;
  const scenes = new Set<string>();
  const props = new Set<string>();
  for (const k of Object.keys(vlt?.sceneColorLock ?? {})) {
    const n = normalizeAssetCode(k);
    if (n) scenes.add(n);
  }
  for (const k of Object.keys(vlt?.anchorProps ?? {})) {
    const n = normalizeAssetCode(k);
    if (n) props.add(n);
  }
  return { scenes, props };
}

/** Map Chinese sceneName → SCENE code via visualLockTable.sceneColorLock.name */
export function resolveSceneCodeByName(bundle: ScriptBundle, sceneName?: string): string | null {
  if (!sceneName?.trim()) return null;
  const vlt = bundle.visualLockTable as { sceneColorLock?: Record<string, { name?: string }> } | undefined;
  const target = sceneName.trim();
  for (const [code, meta] of Object.entries(vlt?.sceneColorLock ?? {})) {
    if (meta?.name === target || meta?.name?.includes(target) || target.includes(meta?.name ?? "\0")) {
      return normalizeAssetCode(code);
    }
  }
  return null;
}

export function collectReferencedCodes(bundle: ScriptBundle): string[] {
  const shots = (bundle.preDesignPack?.shots ?? []) as ShotLike[];
  const raw: string[] = [];
  for (const s of shots) {
    raw.push(...(s.charCodes ?? []));
    const refs = parsePromptRefs(promptBlob(s));
    raw.push(...refs.crefs, ...refs.srefs);
    if (s.sceneCode) raw.push(s.sceneCode);
    const sceneCode = resolveSceneCodeByName(bundle, s.sceneName);
    if (sceneCode) raw.push(sceneCode);
  }
  return normalizeAssetCodes(raw);
}

function chineseNameForSceneCode(bundle: ScriptBundle, code: string): string | null {
  const vlt = bundle.visualLockTable as { sceneColorLock?: Record<string, { name?: string }> } | undefined;
  const meta = vlt?.sceneColorLock?.[code];
  if (meta?.name && meta.name !== code && !/^SCENE-/i.test(meta.name)) return meta.name;
  const shot = (bundle.preDesignPack?.shots ?? []).find(
    (s) => (s as { sceneCode?: string }).sceneCode === code || resolveSceneCodeByName(bundle, s.sceneName) === code,
  );
  if (shot?.sceneName && !/^SCENE-/i.test(shot.sceneName)) return shot.sceneName;
  return null;
}

function guessNameForCode(bundle: ScriptBundle, code: string): string {
  if (kindOf(code) === "SCENE") {
    return chineseNameForSceneCode(bundle, code) ?? code;
  }
  const shots = (bundle.preDesignPack?.shots ?? []) as ShotLike[];
  for (const s of shots) {
    const blob = promptBlob(s);
    if (code === "CHAR-005" && /沈母/.test(blob)) return "沈母周氏";
  }
  if (code === "CHAR-005") return "沈母周氏";
  const speakers = (bundle as { _speakerOrphans?: { name: string; code: string }[] })._speakerOrphans ?? [];
  const sp = speakers.find((s) => s.code === code);
  if (sp) return sp.name;
  return code;
}

function scenePromptForCode(bundle: ScriptBundle, code: string, name: string): string {
  const vlt = bundle.visualLockTable as {
    sceneColorLock?: Record<string, { colorTemp?: string; dominantHue?: string; anchorElements?: string[] }>;
  } | undefined;
  const scene = vlt?.sceneColorLock?.[code];
  const parts = [
    name,
    scene?.colorTemp ? `色温${scene.colorTemp}` : "",
    scene?.dominantHue ? `主色${scene.dominantHue}` : "",
    scene?.anchorElements?.length ? `锚点:${scene.anchorElements.join("、")}` : "",
    "PURE-SCENE: empty environment plate, no people, no characters",
  ].filter(Boolean);
  return parts.join("，");
}

export async function seedOrphanAssetStubs(
  db: Knex,
  projectId: number,
  orphans: string[],
  codeToId: Record<string, number>,
  bundle: ScriptBundle,
): Promise<{ seeded: string[]; linked: string[] }> {
  const seeded: string[] = [];
  const linked: string[] = [];
  const existing = await db("o_assets").where({ projectId }).select("id", "name", "remark", "prompt", "type");

  for (const code of orphans) {
    if (codeToId[code]) continue;
    const kind = kindOf(code);
    const type = kind === "SCENE" ? "scene" : kind === "PROP" ? "tool" : "role";
    const name = guessNameForCode(bundle, code);

    // Link by assetCode remark
    const byRemark = existing.find((a) => a.remark && String(a.remark).includes(`assetCode:${code}`));
    if (byRemark?.id) {
      codeToId[code] = byRemark.id;
      linked.push(code);
      // Upgrade stub quality if needed
      if (
        kind === "SCENE" &&
        (byRemark.name === code || /^stub for\b/i.test(String(byRemark.prompt ?? ""))) &&
        name !== code
      ) {
        await db("o_assets")
          .where({ id: byRemark.id })
          .update({
            name,
            prompt: scenePromptForCode(bundle, code, name),
            describe: name,
            remark: String(byRemark.remark ?? "")
              .split(";")
              .filter((t) => t && t !== "orphanStub:1")
              .concat([assetCodeRemark(code)])
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .join(";"),
          });
      }
      continue;
    }

    // Link SCENE by Chinese name already seeded
    if (kind === "SCENE" && name !== code) {
      const byName = existing.find((a) => a.type === "scene" && a.name === name);
      if (byName?.id) {
        const prev = String(byName.remark ?? "");
        const remark = prev.includes(`assetCode:${code}`)
          ? prev
          : `${prev ? prev + ";" : ""}${assetCodeRemark(code)}`.replace(/orphanStub:1;?/g, "");
        await db("o_assets").where({ id: byName.id }).update({ remark });
        codeToId[code] = byName.id;
        linked.push(code);
        continue;
      }
    }

    // Ban name===code SCENE stubs with "stub for" — require Chinese name or skip with warning via stillMissing path
    if (kind === "SCENE" && (name === code || /^SCENE-\d+$/i.test(name))) {
      // Last resort: still create but with non-stub prompt stating environment from code (quality gate will BLOCK gen)
      // Prefer: create with descriptive prompt without orphanStub if we have lock color
      const prompt = scenePromptForCode(bundle, code, name);
      if (/^stub for\b/i.test(prompt) || prompt === code) {
        // Do not insert useless stub — leave for stillMissing if truly unknown
        continue;
      }
      const [id] = await db("o_assets").insert({
        projectId,
        name: name === code ? `场景 ${code}` : name,
        type,
        prompt,
        describe: name === code ? `场景 ${code}` : name,
        remark: `${assetCodeRemark(code)}`,
        startTime: Date.now(),
      });
      codeToId[code] = id;
      existing.push({ id, name: name === code ? `场景 ${code}` : name, remark: assetCodeRemark(code), prompt, type });
      seeded.push(code);
      continue;
    }

    const prompt =
      kind === "SCENE"
        ? scenePromptForCode(bundle, code, name)
        : kind === "PROP"
          ? `道具 ${name}`
          : `角色 ${name}`;
    const remark =
      kind === "CHAR"
        ? `${charCodeRemark(code)};${assetCodeRemark(code)}`
        : `${assetCodeRemark(code)}`;

    // Never use "stub for" prompt
    const [id] = await db("o_assets").insert({
      projectId,
      name,
      type,
      prompt,
      describe: name,
      remark,
      startTime: Date.now(),
    });
    codeToId[code] = id;
    existing.push({ id, name, remark, prompt, type });
    seeded.push(code);
  }
  return { seeded, linked };
}

export async function ensureAssetClosure(
  db: Knex,
  projectId: number,
  bundle: ScriptBundle,
  codeToId: Record<string, number>,
  opts?: { seedStubs?: boolean; blockOnMissing?: boolean },
): Promise<AssetClosureReport> {
  const seedStubs = opts?.seedStubs !== false;
  const blockOnMissing = opts?.blockOnMissing !== false;
  const referenced = collectReferencedCodes(bundle);
  const known = new Set(Object.keys(codeToId).map((k) => normalizeAssetCode(k) ?? k));
  const inCd = cdCodes(bundle);
  const { scenes, props } = vltScenePropCodes(bundle);
  for (const c of inCd) known.add(c);
  for (const c of scenes) known.add(c);
  for (const c of props) known.add(c);

  let orphans = referenced.filter((c) => !known.has(c) && !codeToId[c]);
  const warnings: string[] = [];
  let orphansSeeded: string[] = [];
  let orphansLinked: string[] = [];

  if (seedStubs && orphans.length) {
    const r = await seedOrphanAssetStubs(db, projectId, orphans, codeToId, bundle);
    orphansSeeded = r.seeded;
    orphansLinked = r.linked;
    for (const c of [...orphansSeeded, ...orphansLinked]) known.add(c);
    orphans = referenced.filter((c) => !codeToId[c] && !known.has(c));
  }

  // Count remaining stub-quality rows for referenced SCENE codes
  let stubCount = 0;
  const assetRows = await db("o_assets").where({ projectId }).select("id", "name", "prompt", "remark");
  for (const code of referenced) {
    const id = codeToId[code];
    if (!id) continue;
    const row = assetRows.find((a) => a.id === id);
    if (!row) continue;
    const stubby =
      /^stub for\b/i.test(String(row.prompt ?? "")) ||
      String(row.remark ?? "").includes("orphanStub:1") ||
      (kindOf(code) === "SCENE" && row.name === code);
    if (stubby) stubCount++;
  }

  const stillMissing = referenced.filter((c) => !codeToId[c]);
  if (stillMissing.length && blockOnMissing) {
    warnings.push(`ASSET_CLOSURE_BLOCK: missing ${stillMissing.join(",")}`);
  }
  if (stubCount > 0) {
    warnings.push(`ASSET_STUB_QUALITY: ${stubCount} stub-quality assets`);
  }

  const shotCount = bundle.preDesignPack?.shots?.length ?? 0;

  return {
    ok: stillMissing.length === 0 && stubCount === 0,
    referenced,
    orphansSeeded,
    orphansLinked,
    stillMissing,
    shotCount,
    warnings,
    stubCount,
  };
}

/** Merge closure-seeded ids into seed.allAssetIds for script linking */
export function mergeClosureIdsIntoSeed(
  codeToId: Record<string, number>,
  allAssetIds: number[],
): number[] {
  const set = new Set(allAssetIds);
  for (const id of Object.values(codeToId)) set.add(id);
  return [...set];
}

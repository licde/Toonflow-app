/**
 * High-confidence asset cref bind + design-time stub seed.
 * Design (SB): stub + charCodes/assetCrefPlan may pass; AS/compose still need real stills.
 * Does not invent fake image URLs.
 */
import { matchDescNamesToCasting } from "../quality/matchDescNamesToCasting";
import { hasFaceCue } from "../quality/shotQualityPredicates";
import { asDialogueLineObjects } from "./dialogueCoverage";

export type AssetCrefPlanEntry = {
  shotIndex?: number;
  clientId?: string;
  codes: string[];
  /** Design deferred still — AS must fill real image later */
  deferredStill?: boolean;
};

export type AssetCrefBindChange = {
  ruleId: string;
  detail: string;
  path?: string;
};

function asPd(plan: Record<string, unknown>): Record<string, unknown> {
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  return plan.planData as Record<string, unknown>;
}

export function isAssetImaged(a: Record<string, unknown>): boolean {
  return Boolean(
    a.hasImage === true ||
      String(a.filePath ?? "").trim() ||
      a.imageId ||
      String(a.stillUrl ?? "").trim(),
  );
}

export function isAssetStub(a: Record<string, unknown>): boolean {
  const l0 = a.L0 as { stub?: boolean } | undefined;
  return Boolean(l0?.stub === true || a.crefDeferred === true || a.stub === true);
}

export function collectCharacterAssets(plan: Record<string, unknown>): Record<string, unknown>[] {
  const pd = asPd(plan);
  return (pd.characterAssets ??
    (pd.characterDesign as { assets?: Record<string, unknown>[] } | undefined)?.assets ??
    (plan.characterDesign as { assets?: Record<string, unknown>[] } | undefined)?.assets ??
    []) as Record<string, unknown>[];
}

function writeCharacterAssets(plan: Record<string, unknown>, assets: Record<string, unknown>[]): void {
  const pd = asPd(plan);
  const cd = {
    ...((pd.characterDesign as object) ?? {}),
    ...(((plan as { characterDesign?: object }).characterDesign as object) ?? {}),
    assets,
  };
  pd.characterDesign = cd;
  pd.characterAssets = assets;
  plan.planData = pd;
  (plan as { characterDesign: unknown }).characterDesign = cd;
}

export function buildImagedMaps(assets: Record<string, unknown>[]): {
  imagedByCode: Map<string, boolean>;
  imagedByName: Map<string, boolean>;
  nameToCodes: Record<string, string[]>;
  knownNames: string[];
  codesPresent: Set<string>;
} {
  const imagedByCode = new Map<string, boolean>();
  const imagedByName = new Map<string, boolean>();
  const nameToCodes: Record<string, string[]> = {};
  const knownNames: string[] = [];
  const codesPresent = new Set<string>();
  for (const a of assets) {
    const code = String(a.code ?? a.assetCode ?? "").toUpperCase();
    const name = String(a.name ?? "")
      .replace(/\s+/g, "")
      .replace(/（OS）|\(OS\)/gi, "")
      .trim();
    const hasImg = isAssetImaged(a);
    if (code && /^CHAR-/i.test(code)) {
      codesPresent.add(code);
      imagedByCode.set(code, hasImg || imagedByCode.get(code) === true);
    }
    if (name) {
      knownNames.push(name);
      imagedByName.set(name, hasImg || imagedByName.get(name) === true);
      if (code) {
        (nameToCodes[name] ??= []).push(code);
      }
    }
  }
  return { imagedByCode, imagedByName, nameToCodes, knownNames, codesPresent };
}

function planCodesForShot(shot: Record<string, unknown>, crefPlan: AssetCrefPlanEntry[]): string[] {
  const idx = shot.shotIndex != null ? Number(shot.shotIndex) : undefined;
  const cid = shot.clientId != null ? String(shot.clientId) : undefined;
  const out: string[] = [];
  for (const e of crefPlan) {
    const hit =
      (idx != null && e.shotIndex != null && Number(e.shotIndex) === idx) ||
      (cid && e.clientId && String(e.clientId) === cid);
    if (!hit) continue;
    for (const c of e.codes ?? []) out.push(String(c).toUpperCase());
  }
  return out;
}

/**
 * Produce path: need imaged CHAR.
 * Design path (allowStubBind): CHAR code present in CD (stub ok) + bound on shot/plan.
 */
export function shotAssetCrefSatisfied(
  shot: Record<string, unknown>,
  imagedByCode: Map<string, boolean>,
  imagedByName: Map<string, boolean>,
  crefPlan: AssetCrefPlanEntry[],
  opts?: { allowStubBind?: boolean; codesPresent?: Set<string> },
): boolean {
  const vd = String(shot.visualDescription ?? "");
  const codes = ((shot.charCodes as string[]) ?? []).map((c) => String(c).toUpperCase()).filter((c) => /^CHAR-/i.test(c));
  const needs = codes.length > 0 || hasFaceCue(vd);
  if (!needs) return true;
  if (codes.some((c) => imagedByCode.get(c) === true)) return true;
  for (const [nm, img] of imagedByName) {
    if (img && nm.length >= 2 && vd.includes(nm)) return true;
  }
  const planCodes = planCodesForShot(shot, crefPlan);
  if (planCodes.some((c) => imagedByCode.get(c) === true)) return true;

  if (opts?.allowStubBind) {
    const present = opts.codesPresent ?? new Set<string>();
    if (codes.some((c) => present.has(c))) return true;
    if (planCodes.some((c) => present.has(c))) return true;
  }
  return false;
}

function upsertCrefPlan(
  crefPlan: AssetCrefPlanEntry[],
  shot: Record<string, unknown>,
  codes: string[],
  deferredStill: boolean,
): boolean {
  const idx = shot.shotIndex != null ? Number(shot.shotIndex) : undefined;
  const cid = shot.clientId != null ? String(shot.clientId) : undefined;
  const existingEntry = crefPlan.find(
    (e) =>
      (idx != null && e.shotIndex != null && Number(e.shotIndex) === idx) ||
      (cid && e.clientId && String(e.clientId) === cid),
  );
  const uniq = [...new Set(codes.map((c) => c.toUpperCase()))];
  if (existingEntry) {
    const merged = [...new Set([...(existingEntry.codes ?? []).map((c) => String(c).toUpperCase()), ...uniq])];
    let changed = merged.length !== (existingEntry.codes?.length ?? 0);
    existingEntry.codes = merged;
    if (deferredStill && !existingEntry.deferredStill) {
      existingEntry.deferredStill = true;
      changed = true;
    }
    return changed;
  }
  crefPlan.push({ shotIndex: idx, clientId: cid, codes: uniq, deferredStill: deferredStill || undefined });
  return true;
}

function shotSpeakers(shot: Record<string, unknown>): string[] {
  const n = (shot.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue?.lines;
  return asDialogueLineObjects(n)
    .map((l) => String(l.speaker ?? "").replace(/（OS）|\(OS\)/gi, "").trim())
    .filter((s) => s.length >= 2 && !/APP|UI|系统|旁白|OS|VO/i.test(s));
}

function planDialogueSpeakers(plan: Record<string, unknown>): string[] {
  const pd = asPd(plan);
  const lines =
    (pd.dialoguePlan as { lines?: { speaker?: string }[] } | undefined)?.lines ??
    ((pd.narrativeBrief as { dialoguePlan?: { lines?: { speaker?: string }[] } } | undefined)?.dialoguePlan?.lines ??
      []);
  return lines
    .map((l) => String(l.speaker ?? "").replace(/（OS）|\(OS\)/gi, "").trim())
    .filter((s) => s.length >= 2 && !/APP|UI|系统|旁白/i.test(s));
}

function nextStubCode(assets: Record<string, unknown>[], name: string): string {
  const hit = assets.find((a) => String(a.name ?? "").replace(/\s+/g, "") === name);
  if (hit) {
    const c = String(hit.code ?? hit.assetCode ?? "").toUpperCase();
    if (c) return c;
  }
  const n = assets.filter((a) => /^CHAR-STUB-/i.test(String(a.code ?? ""))).length + 1;
  return `CHAR-STUB-${String(n).padStart(2, "0")}`;
}

function ensureStubAsset(assets: Record<string, unknown>[], name: string, codeHint?: string): string {
  const clean = name.replace(/\s+/g, "").trim();
  const existing = assets.find((a) => {
    const nm = String(a.name ?? "").replace(/\s+/g, "");
    const code = String(a.code ?? a.assetCode ?? "").toUpperCase();
    return nm === clean || (codeHint && code === codeHint.toUpperCase());
  });
  if (existing) {
    const code = String(existing.code ?? existing.assetCode ?? "").toUpperCase();
    if (!isAssetImaged(existing)) {
      existing.crefDeferred = true;
      const l0 = { ...((existing.L0 as object) ?? {}), stub: true, identity: clean };
      existing.L0 = l0;
    }
    return code;
  }
  const code = (codeHint || nextStubCode(assets, clean)).toUpperCase();
  assets.push({
    code,
    name: clean,
    L0: { stub: true, identity: clean },
    crefDeferred: true,
    hasImage: false,
  });
  return code;
}

/**
 * Design-time: seed CD stubs + bind charCodes/assetCrefPlan so SB can exit;
 * marks deferredStill for AS to fill real stills. No fake URLs.
 * Practice: deferredStill (定妆延期) ≠ contact prop still — prop-missing burn still BLOCKS.
 */
export function ensureAssetCrefDesignSeed(plan: Record<string, unknown>): {
  applied: boolean;
  changes: AssetCrefBindChange[];
  deferredStill: number;
} {
  const pd = asPd(plan);
  const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? { shots: [] };
  const shots = pack.shots ?? [];
  if (!shots.length) return { applied: false, changes: [], deferredStill: 0 };

  let assets = [...collectCharacterAssets(plan)];
  let { imagedByCode, imagedByName, nameToCodes, knownNames, codesPresent } = buildImagedMaps(assets);
  let crefPlan: AssetCrefPlanEntry[] = Array.isArray(pd.assetCrefPlan)
    ? [...(pd.assetCrefPlan as AssetCrefPlanEntry[])]
    : [];
  const changes: AssetCrefBindChange[] = [];
  let applied = false;
  let deferredStill = 0;
  const planSpeakers = planDialogueSpeakers(plan);

  for (const shot of shots) {
    const vd = String(shot.visualDescription ?? "");
    let codes = ((shot.charCodes as string[]) ?? []).map((c) => String(c).toUpperCase()).filter((c) => /^CHAR-/i.test(c));
    const needs = codes.length > 0 || hasFaceCue(vd);
    if (!needs) continue;
    if (shotAssetCrefSatisfied(shot, imagedByCode, imagedByName, crefPlan, { allowStubBind: true, codesPresent })) {
      continue;
    }

    // 1) Prefer unique CD name hits
    const matched = matchDescNamesToCasting({ visualDescription: vd, knownNames, nameToCodes });
    const bindCodes: string[] = [];
    for (const b of matched.bound) bindCodes.push(b.code.toUpperCase());

    // 2) Existing codes without image → ensure stub flag + plan
    for (const c of codes) {
      if (!codesPresent.has(c)) {
        const code = ensureStubAsset(assets, c.replace(/^CHAR-/i, "") || `镜${shot.shotIndex ?? ""}`, c);
        bindCodes.push(code);
      } else {
        bindCodes.push(c);
        const a = assets.find((x) => String(x.code ?? "").toUpperCase() === c);
        if (a && !isAssetImaged(a)) {
          a.crefDeferred = true;
          a.L0 = { ...((a.L0 as object) ?? {}), stub: Boolean((a.L0 as { stub?: boolean })?.stub) || true };
        }
      }
    }

    // 3) Shot / plan speakers mentioned or on-cam → seed stubs (配角后期补图)
    const speakers = [...new Set([...shotSpeakers(shot), ...planSpeakers.filter((s) => vd.includes(s))])];
    for (const sp of speakers) {
      if (sp.length < 2) continue;
      const code = ensureStubAsset(assets, sp);
      bindCodes.push(code);
    }

    // 4) Face cue with still nothing → seed face stub from shot index (design defer)
    if (!bindCodes.length && hasFaceCue(vd)) {
      const label = `出脸镜${shot.shotIndex ?? "x"}`;
      const code = ensureStubAsset(assets, label);
      bindCodes.push(code);
    }

    if (!bindCodes.length) continue;

    const uniq = [...new Set(bindCodes)];
    const cc = ((shot.charCodes as string[]) ?? []).map((c) => String(c).toUpperCase());
    const add = uniq.filter((c) => !cc.includes(c));
    if (add.length) {
      shot.charCodes = [...cc, ...add];
      applied = true;
    }
    const needsImg = uniq.some((c) => !imagedByCode.get(c));
    if (upsertCrefPlan(crefPlan, shot, uniq, needsImg)) applied = true;
    if (needsImg) {
      deferredStill++;
      changes.push({
        ruleId: "DEX-ASSET-CREF",
        detail: `designStub+deferredStill shot ${shot.shotIndex ?? "?"} codes=${uniq.join(",")}`,
        path: "characterDesign.assets|assetCrefPlan",
      });
    } else {
      changes.push({
        ruleId: "DEX-ASSET-CREF",
        detail: `designBind shot ${shot.shotIndex ?? "?"} codes=${uniq.join(",")}`,
        path: "preDesignPack.shots[].charCodes",
      });
    }

    // refresh maps after seed
    ({ imagedByCode, imagedByName, nameToCodes, knownNames, codesPresent } = buildImagedMaps(assets));
  }

  if (applied) {
    writeCharacterAssets(plan, assets);
    pd.assetCrefPlan = crefPlan;
    pd.preDesignPack = { ...pack, shots };
    plan.planData = pd;
    if ((plan as { preDesignPack?: unknown }).preDesignPack) {
      (plan as { preDesignPack: { shots?: unknown[] } }).preDesignPack = {
        ...((plan as { preDesignPack: object }).preDesignPack as object),
        shots,
      };
    }
  }

  return { applied, changes, deferredStill };
}

/**
 * Bind unique CD names to charCodes; write assetCrefPlan when imaged;
 * then design-seed stubs for remaining face shots (SB pass / AS still).
 */
export function ensureAssetCrefBind(plan: Record<string, unknown>): {
  applied: boolean;
  changes: AssetCrefBindChange[];
  needsAsStill: number;
  deferredStill?: number;
} {
  const pd = asPd(plan);
  const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? { shots: [] };
  const shots = pack.shots ?? [];
  if (!shots.length) return { applied: false, changes: [], needsAsStill: 0 };

  const assets = collectCharacterAssets(plan);
  const { imagedByCode, imagedByName, nameToCodes, knownNames } = buildImagedMaps(assets);
  let crefPlan: AssetCrefPlanEntry[] = Array.isArray(pd.assetCrefPlan)
    ? [...(pd.assetCrefPlan as AssetCrefPlanEntry[])]
    : [];
  const changes: AssetCrefBindChange[] = [];
  let applied = false;

  for (const shot of shots) {
    const vd = String(shot.visualDescription ?? "");
    const existing = ((shot.charCodes as string[]) ?? []).map((c) => String(c).toUpperCase());
    const needs = existing.some((c) => /^CHAR-/i.test(c)) || hasFaceCue(vd);
    if (!needs) continue;

    const matched = matchDescNamesToCasting({
      visualDescription: vd,
      knownNames,
      nameToCodes,
    });
    if (matched.bound.length) {
      const add = matched.bound.map((b) => b.code.toUpperCase()).filter((c) => !existing.includes(c));
      if (add.length) {
        shot.charCodes = [...existing, ...add];
        applied = true;
        changes.push({
          ruleId: "DEX-ASSET-CREF",
          detail: `bound charCodes ${add.join(",")} on shot ${shot.shotIndex ?? "?"}`,
          path: "preDesignPack.shots[].charCodes",
        });
      }
    }

    const codesNow = ((shot.charCodes as string[]) ?? []).map((c) => String(c).toUpperCase()).filter((c) => /^CHAR-/i.test(c));
    const imagedCodes = codesNow.filter((c) => imagedByCode.get(c) === true);
    for (const b of matched.bound) {
      const c = b.code.toUpperCase();
      if (imagedByCode.get(c) === true && !imagedCodes.includes(c)) imagedCodes.push(c);
    }
    if (!imagedCodes.length) {
      for (const [nm, img] of imagedByName) {
        if (img && nm.length >= 2 && vd.includes(nm)) {
          const codes = (nameToCodes[nm] ?? []).map((c) => c.toUpperCase());
          if (codes.length === 1) imagedCodes.push(codes[0]!);
        }
      }
    }

    if (imagedCodes.length) {
      if (upsertCrefPlan(crefPlan, shot, imagedCodes, false)) {
        applied = true;
        changes.push({
          ruleId: "DEX-ASSET-CREF",
          detail: `wrote assetCrefPlan shot ${shot.shotIndex ?? "?"}`,
          path: "planData.assetCrefPlan",
        });
      }
      const cc = ((shot.charCodes as string[]) ?? []).map((c) => String(c).toUpperCase());
      const missing = imagedCodes.filter((c) => !cc.includes(c));
      if (missing.length) {
        shot.charCodes = [...cc, ...missing];
        applied = true;
      }
    }
  }

  if (applied) {
    pd.assetCrefPlan = crefPlan;
    pd.preDesignPack = { ...pack, shots };
    plan.planData = pd;
    if ((plan as { preDesignPack?: unknown }).preDesignPack) {
      (plan as { preDesignPack: { shots?: unknown[] } }).preDesignPack = {
        ...((plan as { preDesignPack: object }).preDesignPack as object),
        shots,
      };
    }
  }

  const seed = ensureAssetCrefDesignSeed(plan);
  return {
    applied: applied || seed.applied,
    changes: [...changes, ...seed.changes],
    needsAsStill: seed.deferredStill,
    deferredStill: seed.deferredStill,
  };
}

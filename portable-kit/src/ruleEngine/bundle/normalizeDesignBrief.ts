import type { ShapeSalvageLog } from "./shapeSalvageTypes";

const PAYOFF_SEMANTIC = /本集|current|same.?ep|this.?ep/i;

function isPayoffSemanticString(s: string): boolean {
  return PAYOFF_SEMANTIC.test(s);
}

function coerceFiniteNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

/** SH-B5-PAYOFF: payoffEp numeric string → number; semantic string → payoffLabel. */
function normalizeInfoLinkageItem(item: Record<string, unknown>, path: string, log: ShapeSalvageLog): void {
  const pe = item.payoffEp;
  if (pe === undefined || pe === null) return;
  if (typeof pe === "number" && Number.isFinite(pe)) return;

  if (typeof pe === "string") {
    const num = coerceFiniteNumber(pe);
    if (num !== undefined) {
      item.payoffEp = num;
      log.push("SH-B5-PAYOFF", path, `payoffEp string→number(${num})`);
      return;
    }
    if (isPayoffSemanticString(pe) || pe.trim().length > 0) {
      item.payoffLabel = pe;
      delete item.payoffEp;
      log.push("SH-B5-PAYOFF", path, `payoffEp→payoffLabel("${pe}")`);
    }
  }
}

function normalizeLinkageArray(arr: unknown[], basePath: string, log: ShapeSalvageLog): void {
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (item && typeof item === "object" && !Array.isArray(item)) {
      normalizeInfoLinkageItem(item as Record<string, unknown>, `${basePath}[${i}]`, log);
    }
  }
}

/** SH-B4-NUM: coerce numeric strings in number arrays. */
function normalizeNumberArray(arr: unknown[], basePath: string, log: ShapeSalvageLog, ruleId: string): void {
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (typeof v === "string") {
      const n = coerceFiniteNumber(v);
      if (n !== undefined) {
        arr[i] = n;
        log.push(ruleId, `${basePath}[${i}]`, `string→number(${n})`);
      }
    }
  }
}

/** Default beat count when Chat wrote a narrative summary into beats. */
function defaultBeatsForZone(zone: unknown): number {
  if (typeof zone !== "string") return 1;
  const z = zone.trim();
  if (z === "承" || z === "转") return 2;
  if (z === "合") return 3;
  return 1;
}

/** SH-B12-BEATS: numeric string → number; narrative string → summary + default beats. */
function normalizeB12Items(arr: unknown[], basePath: string, log: ShapeSalvageLog): void {
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const beats = o.beats;
    if (typeof beats === "string") {
      const n = coerceFiniteNumber(beats);
      if (n !== undefined) {
        o.beats = n;
        log.push("SH-B12-BEATS", `${basePath}[${i}].beats`, `string→number(${n})`);
      } else if (beats.trim()) {
        const summary = beats.trim();
        if (typeof o.summary !== "string" || !String(o.summary).trim()) {
          o.summary = summary;
        } else if (typeof o.beatSummary !== "string" || !String(o.beatSummary).trim()) {
          o.beatSummary = summary;
        }
        const def = defaultBeatsForZone(o.zone);
        o.beats = def;
        log.push(
          "SH-B12-BEATS",
          `${basePath}[${i}].beats`,
          `narrative→summary+beats=${def} ("${summary.slice(0, 24)}${summary.length > 24 ? "…" : ""}")`,
        );
      }
    }
  }
}

/** Compress B13-like {axis,anchors} into a spatialRelation string. */
export function formatSpatialRelationObject(obj: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof obj.axis === "string" && obj.axis.trim()) {
    parts.push(`axis=${obj.axis.trim()}`);
  }
  if (Array.isArray(obj.anchors)) {
    const anchors = obj.anchors
      .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
      .map((a) => a.trim());
    if (anchors.length) parts.push(`anchors=${anchors.join("|")}`);
  }
  if (typeof obj.scene === "string" && obj.scene.trim()) {
    parts.push(`scene=${obj.scene.trim()}`);
  }
  if (parts.length) return parts.join("；");
  try {
    return JSON.stringify(obj).slice(0, 200);
  } catch {
    return "spatial";
  }
}

const META_NUM_KEYS = ["episodeIndex", "projectId", "scriptId"] as const;

/** SH-META-NUM */
function normalizeMetaNumbers(meta: Record<string, unknown>, log: ShapeSalvageLog): void {
  for (const key of META_NUM_KEYS) {
    const v = meta[key];
    if (typeof v === "string") {
      const n = coerceFiniteNumber(v);
      if (n !== undefined) {
        meta[key] = n;
        log.push("SH-META-NUM", `meta.${key}`, `string→number(${n})`);
      }
    }
  }
}

/** SH-GEN-NULL: strip null from generation prompt slots. */
function normalizeGenerationNulls(bundle: Record<string, unknown>, log: ShapeSalvageLog): void {
  const pack = bundle.preDesignPack;
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) return;
  const shots = (pack as Record<string, unknown>).shots;
  if (!Array.isArray(shots)) return;
  const slots = ["imagePrompt", "videoPrompt", "audioPrompt", "fxPrompt"] as const;
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    if (!shot || typeof shot !== "object" || Array.isArray(shot)) continue;
    const gen = (shot as Record<string, unknown>).generation;
    if (!gen || typeof gen !== "object" || Array.isArray(gen)) continue;
    const g = gen as Record<string, unknown>;
    for (const slot of slots) {
      if (g[slot] === null) {
        delete g[slot];
        log.push("SH-GEN-NULL", `preDesignPack.shots[${i}].generation.${slot}`, "null→omit");
      }
    }
  }
}

function extractInfoId(item: unknown): string | undefined {
  if (typeof item === "string" && item.trim()) return item.trim();
  if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
  const o = item as Record<string, unknown>;
  if (typeof o.infoId === "string" && o.infoId.trim()) return o.infoId.trim();
  if (typeof o.id === "string" && o.id.trim()) return o.id.trim();
  return undefined;
}

/** SH-B20: object[] `{infoId,delivery}` → infoId string[] */
function normalizeB20(brief: Record<string, unknown>, log: ShapeSalvageLog): void {
  const b20 = brief.B20;
  if (!Array.isArray(b20)) return;
  if (b20.every((x) => typeof x === "string")) return;
  const ids: string[] = [];
  for (let i = 0; i < b20.length; i++) {
    const id = extractInfoId(b20[i]);
    if (id) ids.push(id);
    else if (b20[i] != null) {
      const fallback = JSON.stringify(b20[i]).slice(0, 80);
      ids.push(fallback);
      log.push("SH-B20", `designBrief.B20[${i}]`, `object→fallback string`);
    }
  }
  brief.B20 = ids;
  log.push("SH-B20", "designBrief.B20", `object[]→string[](${ids.length})`);
}

/** SH-B23: object[] → `{ retentionInfoDelivery, items }` */
function normalizeB23(brief: Record<string, unknown>, log: ShapeSalvageLog): void {
  const b23 = brief.B23;
  if (b23 == null) return;
  if (typeof b23 === "object" && !Array.isArray(b23)) return;
  if (!Array.isArray(b23)) return;
  const items = b23.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Record<string, unknown>[];
  const ids = items.map((x) => extractInfoId(x)).filter((x): x is string => !!x);
  brief.B23 = {
    retentionInfoDelivery: ids,
    items,
  };
  log.push("SH-B23", "designBrief.B23", `array→record(retentionInfoDelivery=${ids.length},items=${items.length})`);
}

/** SH-SHOT-SPATIAL: object→string then hoist shots[].spatialRelation → narrative.spatialRelation */
export function normalizeShotSpatialInBundle(bundle: Record<string, unknown>, log: ShapeSalvageLog): void {
  const pack = bundle.preDesignPack;
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) return;
  const shots = (pack as Record<string, unknown>).shots;
  if (!Array.isArray(shots)) return;
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    if (!shot || typeof shot !== "object" || Array.isArray(shot)) continue;
    const s = shot as Record<string, unknown>;
    const top = s.spatialRelation;
    if (top == null) continue;

    let spatialStr: string | undefined;
    if (typeof top === "string" && top.trim()) {
      spatialStr = top.trim();
    } else if (top && typeof top === "object" && !Array.isArray(top)) {
      spatialStr = formatSpatialRelationObject(top as Record<string, unknown>);
      log.push(
        "SH-SHOT-SPATIAL",
        `preDesignPack.shots[${i}].spatialRelation`,
        `object→string "${spatialStr.slice(0, 48)}${spatialStr.length > 48 ? "…" : ""}"`,
      );
    } else {
      continue;
    }

    let narrative = s.narrative;
    if (!narrative || typeof narrative !== "object" || Array.isArray(narrative)) {
      narrative = {};
      s.narrative = narrative;
    }
    const n = narrative as Record<string, unknown>;
    if (typeof n.spatialRelation !== "string" || !n.spatialRelation.trim()) {
      n.spatialRelation = spatialStr;
      log.push("SH-SHOT-SPATIAL", `preDesignPack.shots[${i}].spatialRelation`, "hoist→narrative.spatialRelation");
    }
    delete s.spatialRelation;
  }
}

/**
 * Normalize designBrief linkage + numeric arrays (Phase 2 registry batch).
 */
export function normalizeDesignBriefInBundle(bundle: Record<string, unknown>, log: ShapeSalvageLog): void {
  const db = bundle.designBrief;
  if (db && typeof db === "object" && !Array.isArray(db)) {
    const brief = db as Record<string, unknown>;
    if (Array.isArray(brief.B5)) normalizeLinkageArray(brief.B5, "designBrief.B5", log);
    if (Array.isArray(brief.infoLinkageChain)) normalizeLinkageArray(brief.infoLinkageChain, "designBrief.infoLinkageChain", log);
    if (Array.isArray(brief.B4)) normalizeNumberArray(brief.B4, "designBrief.B4", log, "SH-B4-NUM");
    if (Array.isArray(brief.emotionCurveOutline)) {
      normalizeNumberArray(brief.emotionCurveOutline, "designBrief.emotionCurveOutline", log, "SH-B4-NUM");
    }
    const b12 = brief.B12;
    if (Array.isArray(b12)) normalizeB12Items(b12, "designBrief.B12", log);
    normalizeB20(brief, log);
    normalizeB23(brief, log);
  }

  const meta = bundle.meta;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    normalizeMetaNumbers(meta as Record<string, unknown>, log);
  }

  normalizeGenerationNulls(bundle, log);
  normalizeShotSpatialInBundle(bundle, log);
}

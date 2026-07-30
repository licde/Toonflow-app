/**
 * Frost-import shape salvage — pre-Zod only; never invents literary content.
 * SH-SERIES-CONT / SH-SCENE-AV-TAGS / SH-MICRO-EXPR / SH-BRIEF-STRING.
 */
import type { ShapeSalvageLog } from "./shapeSalvageTypes";

const INF_RE = /\bINF-[\w-]+\b/gi;

function tryParseJsonObject(raw: string): Record<string, unknown> | null {
  const t = String(raw ?? "").trim();
  if (!t.startsWith("{") && !t.startsWith("[")) return null;
  try {
    const v = JSON.parse(t) as unknown;
    if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch {
    /* not JSON */
  }
  return null;
}

function collectCarryInfoIds(bundle: Record<string, unknown>, prose: string): string[] {
  const fromProse = [...prose.matchAll(INF_RE)].map((m) => m[0]!.toUpperCase());
  const brief = (bundle.designBrief ??
    (bundle.planData as { designBrief?: unknown } | undefined)?.designBrief) as
    | { B20?: unknown }
    | undefined;
  const b20 = brief?.B20;
  const fromB20: string[] = [];
  if (Array.isArray(b20)) {
    for (const item of b20) {
      if (typeof item === "string" && /^INF-/i.test(item)) fromB20.push(item.toUpperCase());
      else if (item && typeof item === "object" && !Array.isArray(item)) {
        const id = String((item as { infoId?: string; id?: string }).infoId ?? (item as { id?: string }).id ?? "");
        if (/^INF-/i.test(id)) fromB20.push(id.toUpperCase());
      }
    }
  }
  return [...new Set([...fromProse, ...fromB20])];
}

function splitTagString(raw: string): string[] {
  return String(raw)
    .split(/[,，;；|/\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** SH-SERIES-CONT: prose string → { ep1Summary, carryInfoIds? }. */
export function salvageSeriesContinuity(bundle: Record<string, unknown>, log: ShapeSalvageLog): void {
  const pd = bundle.planData;
  if (!pd || typeof pd !== "object" || Array.isArray(pd)) return;
  const plan = pd as Record<string, unknown>;
  let nb = plan.narrativeBrief;

  if (typeof nb === "string") {
    const parsed = tryParseJsonObject(nb);
    if (parsed) {
      plan.narrativeBrief = parsed;
      nb = parsed;
      log.push("SH-BRIEF-STRING", "planData.narrativeBrief", "string→object");
    } else {
      plan.narrativeBrief = { storyKernel: nb };
      nb = plan.narrativeBrief;
      log.push("SH-BRIEF-STRING", "planData.narrativeBrief", "prose→storyKernel");
    }
  }

  if (!nb || typeof nb !== "object" || Array.isArray(nb)) return;
  const brief = nb as Record<string, unknown>;
  const sc = brief.seriesContinuity;
  if (typeof sc !== "string") return;
  const prose = sc.trim();
  if (!prose) {
    delete brief.seriesContinuity;
    log.push("SH-SERIES-CONT", "planData.narrativeBrief.seriesContinuity", "empty_string→omit");
    return;
  }
  const carryInfoIds = collectCarryInfoIds(bundle, prose);
  const next: Record<string, unknown> = { ep1Summary: prose };
  if (carryInfoIds.length) next.carryInfoIds = carryInfoIds;
  brief.seriesContinuity = next;
  log.push(
    "SH-SERIES-CONT",
    "planData.narrativeBrief.seriesContinuity",
    `string→record;carry=${carryInfoIds.length}`,
  );
}

/** SH-SCENE-AV-TAGS: comma string → string[]; hoist union to planData.sceneAvTags. */
export function salvageSceneAvTags(bundle: Record<string, unknown>, log: ShapeSalvageLog): void {
  const pd = bundle.planData;
  if (!pd || typeof pd !== "object" || Array.isArray(pd)) return;
  const plan = pd as Record<string, unknown>;
  const meta = plan.sceneMeta;
  const allTags = new Set<string>();

  if (Array.isArray(meta)) {
    for (let i = 0; i < meta.length; i++) {
      const row = meta[i];
      if (!row || typeof row !== "object" || Array.isArray(row)) continue;
      const m = row as Record<string, unknown>;
      for (const key of ["sceneAvTags", "avTags"] as const) {
        const v = m[key];
        if (typeof v === "string" && v.trim()) {
          const arr = splitTagString(v);
          m[key] = arr;
          for (const t of arr) allTags.add(t);
          log.push("SH-SCENE-AV-TAGS", `planData.sceneMeta[${i}].${key}`, `string→array(${arr.length})`);
        } else if (Array.isArray(v)) {
          for (const t of v) if (typeof t === "string" && t.trim()) allTags.add(t.trim());
        }
      }
    }
  }

  const top = plan.sceneAvTags;
  if (typeof top === "string" && top.trim()) {
    const arr = splitTagString(top);
    plan.sceneAvTags = arr;
    for (const t of arr) allTags.add(t);
    log.push("SH-SCENE-AV-TAGS", "planData.sceneAvTags", `string→array(${arr.length})`);
  } else if (Array.isArray(top)) {
    for (const t of top) if (typeof t === "string" && t.trim()) allTags.add(t.trim());
  } else if (allTags.size && (top == null || (Array.isArray(top) && top.length === 0))) {
    plan.sceneAvTags = [...allTags];
    log.push("SH-SCENE-AV-TAGS", "planData.sceneAvTags", `hoist_from_sceneMeta(${allTags.size})`);
  }
}

function looksNamedMicroMap(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj);
  if (!keys.length) return false;
  if (keys.every((k) => k === "eyes" || k === "mouthDetail" || k === "byName" || k === "flush" || k === "pupil")) {
    return false;
  }
  return keys.some((k) => {
    const v = obj[k];
    return v && typeof v === "object" && !Array.isArray(v) && ("eyes" in (v as object) || "mouthDetail" in (v as object));
  });
}

/** SH-MICRO-EXPR: named-character map → compileable eyes/mouthDetail + byName stash. */
export function salvageMicroExpression(bundle: Record<string, unknown>, log: ShapeSalvageLog): void {
  const packs = [bundle.preDesignPack, (bundle.planData as { preDesignPack?: unknown } | undefined)?.preDesignPack];
  for (const pack of packs) {
    if (!pack || typeof pack !== "object" || Array.isArray(pack)) continue;
    const shots = (pack as { shots?: unknown }).shots;
    if (!Array.isArray(shots)) continue;
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      if (!shot || typeof shot !== "object" || Array.isArray(shot)) continue;
      const s = shot as Record<string, unknown>;
      const sd = s.shotDesign;
      if (!sd || typeof sd !== "object" || Array.isArray(sd)) continue;
      const design = sd as Record<string, unknown>;
      const perf = design.performance;
      if (!perf || typeof perf !== "object" || Array.isArray(perf)) continue;
      const p = perf as Record<string, unknown>;
      const micro = p.microExpression;
      if (!micro || typeof micro !== "object" || Array.isArray(micro)) continue;
      const m = micro as Record<string, unknown>;
      if (!looksNamedMicroMap(m)) continue;

      const byName: Record<string, { eyes?: string; mouthDetail?: string }> = {};
      for (const [name, val] of Object.entries(m)) {
        if (!val || typeof val !== "object" || Array.isArray(val)) continue;
        const row = val as { eyes?: string; mouthDetail?: string };
        byName[name] = { eyes: row.eyes, mouthDetail: row.mouthDetail };
      }
      const names = Object.keys(byName);
      if (!names.length) continue;

      const chars = Array.isArray(s.characters) ? (s.characters as string[]).map(String) : [];
      const prefer =
        names.find((n) => chars.some((c) => c.includes(n) || n.includes(c))) ??
        names[0]!;
      const pick = byName[prefer] ?? byName[names[0]!]!;
      p.microExpression = {
        eyes: pick.eyes ?? "",
        mouthDetail: pick.mouthDetail ?? "",
        byName,
        primaryName: prefer,
      };
      log.push(
        "SH-MICRO-EXPR",
        `preDesignPack.shots[${Number(s.shotIndex) || i}].shotDesign.performance.microExpression`,
        `named_map→compile;primary=${prefer};n=${names.length}`,
      );
    }
  }
}

/** Run all frost pre-Zod salvages. */
export function runFrostShapeSalvage(bundle: Record<string, unknown>, log: ShapeSalvageLog): void {
  salvageSeriesContinuity(bundle, log);
  salvageSceneAvTags(bundle, log);
  salvageMicroExpression(bundle, log);
}

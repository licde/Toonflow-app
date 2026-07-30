import type { ShapeSalvageLog } from "./shapeSalvageTypes";

const SHOT_STRING_FIELDS = ["visualEffect", "audioCue"] as const;

function pickString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/** Coerce Chat object visualEffect (MOD-01 / V62) → canonical string + optional fxLevel. */
export function coerceVisualEffectObject(obj: Record<string, unknown>): { text: string; fxLevel?: string } {
  const level = pickString(obj.level, obj.type, obj.fxLevel, obj.grade);
  const desc = pickString(obj.desc, obj.content, obj.description, obj.text, obj.summary);
  if (level && desc) return { text: `${level}: ${desc}`, fxLevel: level };
  if (desc) return { text: desc, fxLevel: level };
  if (level) return { text: level, fxLevel: level };
  const compact = JSON.stringify(obj);
  return { text: compact.length > 120 ? compact.slice(0, 117) + "..." : compact };
}

/** Coerce audioCue object → beat/desc string or compact JSON. */
export function coerceAudioCueObject(obj: Record<string, unknown>): string {
  const beat = pickString(obj.beat, obj.audioBeat, obj.desc, obj.type, obj.cue);
  if (beat) return beat;
  const compact = JSON.stringify(obj);
  return compact.length > 120 ? compact.slice(0, 117) + "..." : compact;
}

function snapshotChineseSceneKeys(bundle: Record<string, unknown>, log: ShapeSalvageLog): void {
  const lock =
    (bundle.visualLockTable as { sceneColorLock?: Record<string, unknown> } | undefined)?.sceneColorLock ??
    (bundle.assetPipeline as { sceneColorLock?: Record<string, unknown> } | undefined)?.sceneColorLock;
  if (!lock || typeof lock !== "object") return;
  for (const key of Object.keys(lock)) {
    if (/[\u4e00-\u9fff]/.test(key)) {
      log.push("SH-SCENE-KEY-RAW", `visualLockTable.sceneColorLock.${key}`, "chinese_key_will_rewrite_on_normalize");
    }
  }
}

/**
 * L1: coerce shot-level nullishStr fields when Chat emits objects (Zod runs after this).
 */
export function coerceShotStringFields(bundle: Record<string, unknown>, log: ShapeSalvageLog): void {
  snapshotChineseSceneKeys(bundle, log);

  const pack = bundle.preDesignPack;
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) return;
  const shots = (pack as Record<string, unknown>).shots;
  if (!Array.isArray(shots)) return;

  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    if (!shot || typeof shot !== "object" || Array.isArray(shot)) continue;
    const s = shot as Record<string, unknown>;
    const basePath = `preDesignPack.shots[${i}]`;

    const ve = s.visualEffect;
    if (ve && typeof ve === "object" && !Array.isArray(ve)) {
      const { text, fxLevel } = coerceVisualEffectObject(ve as Record<string, unknown>);
      s.visualEffect = text;
      if (fxLevel && !s.fxLevel) s.fxLevel = fxLevel;
      log.push("SH-VISUAL-EFFECT-OBJ", `${basePath}.visualEffect`, `object→string "${text.slice(0, 40)}${text.length > 40 ? "…" : ""}"`);
    }

    const ac = s.audioCue;
    if (ac && typeof ac === "object" && !Array.isArray(ac)) {
      const text = coerceAudioCueObject(ac as Record<string, unknown>);
      s.audioCue = text;
      log.push("SH-AUDIO-CUE-OBJ", `${basePath}.audioCue`, `object→string "${text.slice(0, 40)}${text.length > 40 ? "…" : ""}"`);
    }

    for (const field of SHOT_STRING_FIELDS) {
      const v = s[field];
      if (v != null && typeof v !== "string") {
        s[field] = String(v);
        log.push("SH-SHOT-STR-COERCE", `${basePath}.${field}`, `${typeof v}→string`);
      }
    }
  }
}

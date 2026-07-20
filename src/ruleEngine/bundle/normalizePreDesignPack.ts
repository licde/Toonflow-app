/**
 * Normalize preDesignPack shots before import — SCENE codes, PROP codes, FX/voice/micro/color.
 * Rewrites Chinese-keyed sceneColorLock → SCENE-* → { name, colorTemp }.
 */
import type { PreDesignShot, PreDesignPack, ScriptBundle } from "./types";
import { normalizeAssetCode } from "../codes/assetCodeContract";
import { buildCodeAliasMap, resolveAliasedCode } from "../codes/assetCodeAlias";
import { speakersMissingFromCd } from "./designExportHelpers";
import { flattenDialogueText } from "../design/dialogueCoverage";
import { measureDialogue } from "../dialogueMetrics";

/** Stable SCENE-* allocator from sceneName list. */
export function allocateSceneCodes(sceneNames: string[]): Map<string, string> {
  const map = new Map<string, string>();
  let n = 1;
  for (const raw of sceneNames) {
    const name = String(raw ?? "").trim();
    if (!name || map.has(name)) continue;
    map.set(name, `SCENE-${String(n).padStart(3, "0")}`);
    n++;
  }
  return map;
}

export function normalizePropCode(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const via = normalizeAssetCode(t);
  if (via) return via;
  const m = t.match(/^PROP[_-]?([A-Za-z0-9]+)$/i);
  if (m) return `PROP-${m[1].toUpperCase()}`;
  return null;
}

export type SceneLockEntry = { name: string; colorTemp?: string; dominantHue?: string; anchorElements?: string[] };

/**
 * Rewrite Chinese-keyed or string-valued sceneColorLock into SCENE-* → { name, colorTemp }.
 * Uses sceneMap (Chinese name → SCENE code) as SSOT.
 */
export function rewriteSceneColorLock(
  lock: Record<string, unknown> | undefined,
  sceneMap: Map<string, string>,
): Record<string, SceneLockEntry> {
  const out: Record<string, SceneLockEntry> = {};

  // First: ensure every allocated scene has an entry
  for (const [name, code] of sceneMap) {
    out[code] = { name, ...(out[code] ?? {}) };
  }

  if (!lock) return out;

  for (const [key, val] of Object.entries(lock)) {
    const k = key.trim();
    if (!k) continue;

    let code = normalizeAssetCode(k);
    let name: string | undefined;
    let colorTemp: string | undefined;
    let dominantHue: string | undefined;
    let anchorElements: string[] | undefined;

    if (typeof val === "string") {
      colorTemp = val;
      if (code?.startsWith("SCENE-")) {
        name = out[code]?.name ?? k;
      } else {
        // Chinese / free-text key
        name = k;
        code = sceneMap.get(k) ?? code ?? undefined;
        if (!code && sceneMap.size) {
          // fuzzy: find sceneMap entry that matches
          for (const [n, c] of sceneMap) {
            if (n === k || n.includes(k) || k.includes(n)) {
              code = c;
              name = n;
              break;
            }
          }
        }
      }
    } else if (val && typeof val === "object") {
      const o = val as SceneLockEntry;
      name = o.name ?? (code?.startsWith("SCENE-") ? out[code]?.name : k);
      colorTemp = o.colorTemp;
      dominantHue = o.dominantHue;
      anchorElements = o.anchorElements;
      if (!code?.startsWith("SCENE-")) {
        const byName = name ? sceneMap.get(name) : undefined;
        code = byName ?? sceneMap.get(k) ?? code ?? undefined;
      }
    }

    if (!code?.startsWith("SCENE-")) continue;
    out[code] = {
      name: name ?? out[code]?.name ?? code,
      ...(colorTemp ? { colorTemp } : out[code]?.colorTemp ? { colorTemp: out[code]!.colorTemp } : {}),
      ...(dominantHue ? { dominantHue } : {}),
      ...(anchorElements?.length ? { anchorElements } : {}),
    };
  }

  return out;
}

function microToCue(shot: PreDesignShot): string | undefined {
  const perf = (shot.shotDesign as { performance?: { microExpression?: { eyes?: string; mouthDetail?: string } } } | undefined)
    ?.performance?.microExpression;
  if (!perf) return undefined;
  const bits = [perf.eyes, perf.mouthDetail].filter(Boolean);
  return bits.length ? `microExpr:${bits.join("/")}` : undefined;
}

function cameraFromVideoPrompt(vp?: string): string | undefined {
  if (!vp) return undefined;
  if (/static/i.test(vp)) return "static";
  if (/slow\s*zoom|push/i.test(vp)) return "dolly in / push in";
  if (/track/i.test(vp)) return "tracking shot";
  if (/pan/i.test(vp)) return "pan";
  return undefined;
}

function colorFromRewrittenLock(
  sceneCode: string | undefined,
  lock: Record<string, SceneLockEntry>,
): string | undefined {
  if (!sceneCode) return undefined;
  return lock[sceneCode]?.colorTemp;
}

function voiceFromCd(
  charCodes: string[] | undefined,
  bundle: ScriptBundle,
  voiceIntent?: { speaker?: string; tone?: string },
): string | undefined {
  if (voiceIntent?.tone) {
    const sp = voiceIntent.speaker ? `${voiceIntent.speaker}:` : "";
    return `voice:${sp}${voiceIntent.tone}`;
  }
  const assets = (bundle.characterDesign as { assets?: { code?: string; L5?: { timbre?: string } }[] } | undefined)?.assets ?? [];
  for (const code of charCodes ?? []) {
    const n = normalizeAssetCode(code) ?? code;
    const hit = assets.find((a) => (normalizeAssetCode(a.code ?? "") ?? a.code) === n);
    if (hit?.L5?.timbre) return `voice:${hit.L5.timbre}`;
  }
  return undefined;
}

function cdNameSet(bundle: ScriptBundle): Set<string> {
  const assets = (bundle.characterDesign as { assets?: { name?: string; code?: string }[] } | undefined)?.assets ?? [];
  const set = new Set<string>();
  for (const a of assets) {
    if (a.name) set.add(a.name.trim());
    if (a.code) set.add(a.code.trim());
  }
  return set;
}

function collectSpeakerOrphans(shots: PreDesignShot[], bundle: ScriptBundle): string[] {
  const known = cdNameSet(bundle);
  const orphans = new Set<string>();
  for (const s of shots) {
    const lines =
      (s.narrative as { dialogue?: { lines?: { speaker?: string }[] } } | undefined)?.dialogue?.lines ?? [];
    for (const l of lines) {
      const sp = l.speaker?.trim();
      if (!sp) continue;
      if (known.has(sp)) continue;
      // skip if speaker matches a known char by substring of code names
      let hit = false;
      for (const k of known) {
        if (k.includes(sp) || sp.includes(k)) {
          hit = true;
          break;
        }
      }
      if (!hit) orphans.add(sp);
    }
  }
  return [...orphans];
}

function slugSpeakerCode(name: string): string {
  const ascii = name.replace(/[^\w]+/g, "").toUpperCase();
  if (ascii.length >= 2) return `CHAR-${ascii.slice(0, 16)}`;
  // Chinese → hash-ish stable
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `CHAR-SP${(h % 10000).toString().padStart(4, "0")}`;
}

type DialoguePlanLine = {
  lineId?: string;
  splitHint?: string;
  reactionAction?: string;
  functions?: string[];
};

/** Mirror dialoguePlan splitHint/reactionAction/functions onto shots[].narrative.dialogue.lines by lineId. */
export function mirrorDialoguePlanToShots(bundle: ScriptBundle): number {
  const planLines =
    (bundle.planData as { dialoguePlan?: { lines?: DialoguePlanLine[] } } | undefined)?.dialoguePlan?.lines ?? [];
  if (!planLines.length) return 0;
  const byId = new Map<string, DialoguePlanLine>();
  for (const pl of planLines) {
    if (pl.lineId) byId.set(pl.lineId, pl);
  }
  let mirrored = 0;
  for (const shot of bundle.preDesignPack?.shots ?? []) {
    const lines = shot.narrative?.dialogue?.lines ?? [];
    for (const line of lines) {
      const lid = (line as { lineId?: string }).lineId;
      if (!lid) continue;
      const src = byId.get(lid);
      if (!src) continue;
      const l = line as {
        splitHint?: string;
        reactionAction?: string;
        functions?: string[];
      };
      if (src.splitHint && !l.splitHint) {
        l.splitHint = src.splitHint;
        mirrored++;
      }
      if (src.reactionAction && !l.reactionAction) {
        l.reactionAction = src.reactionAction;
        mirrored++;
      }
      if (src.functions?.length && (!l.functions || !l.functions.length)) {
        l.functions = [...src.functions];
        mirrored++;
      }
    }
  }
  return mirrored;
}

/**
 * No-op stubs removed: auto-writing splitHint/reactionAction caused false-green import
 * while hydrate/burn still blocked. Keep mirrorDialoguePlanToShots only.
 */
export function healDialoguePlanMetadata(_bundle: ScriptBundle): number {
  return 0;
}

export function healShotDialogueMetadata(_bundle: ScriptBundle): number {
  return 0;
}

function cloneShotForDialogueBatch(template: PreDesignShot, lines: Record<string, unknown>[], maxSec: number): PreDesignShot {
  const shot: PreDesignShot = {
    ...template,
    generation: { ...template.generation },
    narrative: {
      ...template.narrative,
      dialogue: { lines: lines as NonNullable<NonNullable<PreDesignShot["narrative"]>["dialogue"]>["lines"] },
    },
  };
  const text = flattenDialogueText(lines);
  const metrics = measureDialogue({ text, speechSpeed: 4 });
  shot.duration = Math.min(maxSec, Math.max(1, metrics.minDurationSec || template.duration || 2));
  const vp = shot.generation?.videoPrompt ?? "";
  if (vp && text.trim() && !/口型|lip|speaking|嘴型/i.test(vp)) {
    shot.generation = { ...shot.generation, videoPrompt: `${vp}, speaking lip-sync` };
  }
  return shot;
}

/** Split shots whose combined dialogue exceeds lip budget (PR-09 / LIP-01). */
export function splitOverloadedDialogueShots(bundle: ScriptBundle, maxSec = DURATION_CAP_SEC): number {
  const pack = bundle.preDesignPack;
  if (!pack?.shots?.length) return 0;
  const out: PreDesignShot[] = [];
  let splits = 0;

  for (const template of pack.shots) {
    const lines = [...(template.narrative?.dialogue?.lines ?? [])];
    if (!lines.length) {
      out.push(template);
      continue;
    }

    let batch: typeof lines = [];
    for (const line of lines) {
      const candidate = [...batch, line];
      const text = flattenDialogueText(candidate);
      const metrics = measureDialogue({ text, speechSpeed: 4 });
      if (metrics.minDurationSec > maxSec && batch.length > 0) {
        out.push(cloneShotForDialogueBatch(template, batch, maxSec));
        batch = [line];
        splits++;
      } else {
        batch = candidate;
      }
    }
    if (batch.length) out.push(cloneShotForDialogueBatch(template, batch, maxSec));
  }

  out.forEach((s, i) => {
    s.shotIndex = i + 1;
  });
  pack.shots = out;
  return splits;
}

/** Ensure B6 ∪ dialogue speakers have minimal characterDesign.assets entries.
 * Note: stubs set L0.stub=true — DC-16 / auditCastCoverage still BLOCK (anti green-wash).
 * Import may seed stubs as safety net; exportAllowed must not pass on stub-only cast.
 */
export function ensureCdSpeakerStubs(bundle: ScriptBundle): string[] {
  const missing = speakersMissingFromCd(bundle);
  if (!missing.length) return [];

  const cd = (bundle.characterDesign ?? { assets: [] }) as {
    assets: {
      code?: string;
      name?: string;
      L0?: { stub?: boolean; visual?: string };
      L6?: { arcVisual?: string };
    }[];
  };
  cd.assets = cd.assets ?? [];
  const added: string[] = [];

  for (const name of missing) {
    const code = slugSpeakerCode(name);
    if (cd.assets.some((a) => a.name === name || a.code === code)) continue;
    cd.assets.push({
      code,
      name,
      L0: { stub: true },
      L6: { arcVisual: name },
    });
    added.push(name);

    const vlt = (bundle.visualLockTable ?? {}) as { characterAssets?: Record<string, string> };
    vlt.characterAssets = vlt.characterAssets ?? {};
    vlt.characterAssets[code] = name;
    bundle.visualLockTable = vlt;
  }
  bundle.characterDesign = cd;
  return added;
}

function parseFxLevelFromVisualEffect(ve?: string): string | undefined {
  if (!ve?.trim()) return undefined;
  const m = ve.trim().match(/^(F[0-5])\s*[:：]/i);
  if (m) return m[1]!.toUpperCase();
  if (/^F[0-5]$/i.test(ve.trim())) return ve.trim().toUpperCase();
  return undefined;
}

const DURATION_CAP_SEC = 30;

function alignShotDurationFromDialogue(shot: PreDesignShot, warnings: string[]): void {
  const lines = shot.narrative?.dialogue?.lines ?? [];
  if (!lines.length) return;
  const text = flattenDialogueText(lines);
  if (!text.trim()) return;
  const metrics = measureDialogue({ text, speechSpeed: 4 });
  if (metrics.minDurationSec <= 0) return;
  const needed = Math.min(DURATION_CAP_SEC, Math.max(1, metrics.minDurationSec));
  const current = shot.duration ?? 0;
  if (needed > current) {
    if (metrics.minDurationSec > DURATION_CAP_SEC) {
      warnings.push(`duration_over_cap:shot${shot.shotIndex ?? "?"}:${metrics.minDurationSec}s`);
    }
    shot.duration = needed;
  }
}

/** Strip leading "F1:" / "F2：" grade prefix; return executable prose or empty. */
export function proseFromVisualEffect(ve?: string | null): string {
  const raw = String(ve ?? "").trim();
  if (!raw || /^F[0-5]$/i.test(raw)) return "";
  return raw.replace(/^F[0-5]\s*[:：\-–—]\s*/i, "").trim();
}

function alignFxFromVisualEffect(shot: PreDesignShot): void {
  const level =
    parseFxLevelFromVisualEffect(typeof shot.visualEffect === "string" ? shot.visualEffect : undefined) ??
    (shot.fxLevel && /^F[0-5]$/i.test(String(shot.fxLevel)) ? String(shot.fxLevel).toUpperCase() : undefined);
  if (level && /^F[0-5]$/.test(level)) {
    (shot as { fxFeasibility?: string }).fxFeasibility = level;
    shot.generation = shot.generation ?? {};
    (shot.generation as { fxFeasibility?: string }).fxFeasibility = level;
  }
  const existing = shot.generation?.fxPrompt?.trim() ?? "";
  const prose =
    proseFromVisualEffect(typeof shot.visualEffect === "string" ? shot.visualEffect : undefined) ||
    (!/^F[0-5]$/i.test(existing) ? existing : "");
  if (prose) {
    shot.generation = { ...shot.generation, fxPrompt: prose };
    return;
  }
  // Never persist letter-grade as fxPrompt (anti-pattern → FX-GRADE / MOD-02 false path)
  if (/^F[0-5]$/i.test(existing)) {
    const { fxPrompt: _drop, ...rest } = shot.generation ?? {};
    shot.generation = rest;
  }
}

export interface NormalizePreDesignResult {
  shots: PreDesignShot[];
  sceneMap: Map<string, string>;
  rewrittenSceneLock: Record<string, SceneLockEntry>;
  speakerOrphans: { name: string; code: string }[];
  warnings: string[];
}

export interface NormalizePreDesignOpts {
  /** Import/dryRun: mirror dialogue, CD stubs, lip split. Export gate: false (strict semantic check). */
  ingestHeal?: boolean;
}

/**
 * Normalize shots + rewrite sceneColorLock onto bundle.visualLockTable.
 */
export function normalizePreDesignPack(bundle: ScriptBundle, opts: NormalizePreDesignOpts = {}): NormalizePreDesignResult {
  const ingestHeal = opts.ingestHeal !== false;
  const pack = bundle.preDesignPack;
  const warnings: string[] = [];
  if (!pack?.shots?.length) {
    return {
      shots: [],
      sceneMap: new Map(),
      rewrittenSceneLock: {},
      speakerOrphans: [],
      warnings: ["no_shots"],
    };
  }

  mirrorDialoguePlanToShots(bundle);
  if (ingestHeal) {
    healDialoguePlanMetadata(bundle);
    healShotDialogueMetadata(bundle);
    const stubbed = ensureCdSpeakerStubs(bundle);
    if (stubbed.length) warnings.push(`cd_speaker_stub:${stubbed.join(",")}`);
  }

  const sceneNames = pack.shots.map((s) => s.sceneName ?? "").filter(Boolean);
  const sceneMap = allocateSceneCodes(sceneNames);
  const rawLock =
    (bundle.visualLockTable as { sceneColorLock?: Record<string, unknown> } | undefined)?.sceneColorLock ??
    (bundle.assetPipeline as { sceneColorLock?: Record<string, unknown> } | undefined)?.sceneColorLock;
  const rewrittenSceneLock = rewriteSceneColorLock(rawLock, sceneMap);

  // Write back SSOT lock keyed by SCENE-*
  if (!bundle.visualLockTable || typeof bundle.visualLockTable !== "object") {
    (bundle as { visualLockTable?: Record<string, unknown> }).visualLockTable = {};
  }
  (bundle.visualLockTable as { sceneColorLock: Record<string, SceneLockEntry> }).sceneColorLock = rewrittenSceneLock;

  const impl = (
    bundle.planData as {
      narrativeBrief?: {
        implementationPlan?: {
          sceneRef?: number;
          fxIntent?: { level?: string };
          voiceIntent?: { speaker?: string; tone?: string };
        }[];
      };
    } | undefined
  )?.narrativeBrief?.implementationPlan;

  const shots = pack.shots.map((raw, i) => {
    const shot: PreDesignShot = { ...raw, generation: { ...raw.generation }, narrative: { ...raw.narrative } };
    const sceneName = shot.sceneName?.trim();
    const sceneCode = sceneName ? sceneMap.get(sceneName) : undefined;
    if (sceneCode) {
      (shot as { sceneCode?: string }).sceneCode = sceneCode;
      const img = shot.generation?.imagePrompt ?? "";
      if (img && !/--sref\s+/i.test(img)) {
        shot.generation = { ...shot.generation, imagePrompt: `${img} --sref ${sceneCode}` };
      }
    } else if (sceneName) {
      warnings.push(`scene_unmapped:${sceneName}`);
    }

    if (shot.charCodes?.length) {
      // Placeholder — remapped after alias map is built (see below)
      shot.charCodes = shot.charCodes.map((c) => normalizeAssetCode(c) ?? c);
    }

    let fx = shot.generation?.fxPrompt?.trim();
    const auditLevel = (
      bundle as { fxFeasibilityAudit?: { items?: { shotIndex?: number; level?: string }[] } }
    ).fxFeasibilityAudit?.items?.find((it) => it.shotIndex === (shot.shotIndex ?? i + 1))?.level;
    // Match implementationPlan by scene order (unique sceneName), not ceil(shotIndex/2)
    const sceneOrder: string[] = [];
    for (const s of pack.shots) {
      const n = String(s.sceneName ?? "").trim();
      if (n && !sceneOrder.includes(n)) sceneOrder.push(n);
    }
    const sceneOrd = sceneName ? sceneOrder.indexOf(sceneName) + 1 : 0;
    const planHit =
      (sceneOrd > 0 ? impl?.find((p) => p.sceneRef === sceneOrd) : undefined) ??
      impl?.find((p) => p.sceneRef === (shot as { sceneRef?: number }).sceneRef);
    // Do NOT fallback to impl[min(i,len-1)] — causes P2 ghost-scene intent bleed
    const intentLevel = planHit?.fxIntent?.level ?? (shot as { fxIntent?: { level?: string } }).fxIntent?.level;
    const projectedLevel = String(auditLevel ?? intentLevel ?? "")
      .toUpperCase()
      .replace(/^FX:/, "")
      .trim();

    // Project feasibility carefully:
    // - audit / shot-local level always wins
    // - scene F0/NONE may declare empty no-VFX shots
    // - scene F1+ MUST NOT paint every shot in the scene — only when shot has FX materials
    const hasFxMaterial =
      Boolean(proseFromVisualEffect(typeof shot.visualEffect === "string" ? shot.visualEffect : undefined)) ||
      Boolean(String(shot.generation?.fxPrompt ?? "").trim() && !/^F[0-5]$/i.test(String(shot.generation?.fxPrompt ?? "").trim())) ||
      Boolean(auditLevel && /^F[1-5]$/i.test(String(auditLevel)));
    const mayProjectIntent =
      Boolean(auditLevel) ||
      projectedLevel === "F0" ||
      projectedLevel === "NONE" ||
      hasFxMaterial;

    if (projectedLevel && /^F[0-5]$/.test(projectedLevel) && mayProjectIntent) {
      (shot as { fxFeasibility?: string }).fxFeasibility = projectedLevel;
      shot.generation = { ...shot.generation, fxFeasibility: projectedLevel } as typeof shot.generation;
    }
    // Strip legacy letter stubs left in fxPrompt
    fx = shot.generation?.fxPrompt?.trim() ?? "";
    if (/^F[0-5]$/i.test(fx)) {
      const { fxPrompt: _drop, ...rest } = shot.generation ?? {};
      shot.generation = rest;
      fx = "";
    }

    const colorTemp = colorFromRewrittenLock(sceneCode, rewrittenSceneLock);
    if (colorTemp) {
      (shot as { colorTemp?: string }).colorTemp = colorTemp;
      if (shot.narrative) shot.narrative = { ...shot.narrative, colorTone: colorTemp } as typeof shot.narrative;
    }

    const micro = microToCue(shot);
    if (micro && shot.narrative) {
      (shot.narrative as { spatialRelation?: string }).spatialRelation =
        (shot.narrative as { spatialRelation?: string }).spatialRelation ?? micro;
    }

    const emotion =
      shot.narrative && "emotionIntensity" in (shot.narrative as object)
        ? (shot.narrative as { emotionIntensity?: number }).emotionIntensity
        : shot.emotion;
    if (emotion == null && shot.narrative) {
      (shot.narrative as { emotionIntensity?: number }).emotionIntensity = 4;
    }

    const cam = cameraFromVideoPrompt(shot.generation?.videoPrompt);
    if (cam) (shot as { camera?: string }).camera = cam;

    const voiceIntent = impl?.find((p) => p.voiceIntent)?.voiceIntent;
    const voice = voiceFromCd(shot.charCodes, bundle, voiceIntent);
    if (voice) (shot as { voice?: string }).voice = voice;

    alignFxFromVisualEffect(shot);
    alignShotDurationFromDialogue(shot, warnings);

    return shot;
  });

  // Normalize G4 prop codes
  const g4 = (bundle.planData as { globalAnchors?: { G4_anchorProps?: { code?: string; name?: string }[] } } | undefined)
    ?.globalAnchors?.G4_anchorProps;
  if (g4) {
    for (const p of g4) {
      if (p.code) {
        const n = normalizePropCode(p.code);
        if (n) p.code = n;
      }
    }
  }

  // Normalize debutIntroPack props
  const debut = bundle.debutIntroPack as { props?: { code?: string; name?: string }[] } | undefined;
  if (debut?.props) {
    for (const p of debut.props) {
      if (p.code) {
        const n = normalizePropCode(p.code);
        if (n) p.code = n;
      }
    }
  }

  // Ensure G4/debut props also land in visualLockTable.anchorProps for seed
  if (!bundle.visualLockTable || typeof bundle.visualLockTable !== "object") {
    (bundle as { visualLockTable?: Record<string, unknown> }).visualLockTable = {};
  }
  const vlt = bundle.visualLockTable as {
    sceneColorLock?: Record<string, SceneLockEntry>;
    anchorProps?: Record<string, { name?: string; significance?: string }>;
  };
  if (!vlt.anchorProps) vlt.anchorProps = {};
  const mergeProp = (code: string, name?: string, significance?: string) => {
    if (!vlt.anchorProps![code]) {
      vlt.anchorProps![code] = { name: name ?? code, ...(significance ? { significance } : {}) };
    } else if (name && !vlt.anchorProps![code]!.name) {
      vlt.anchorProps![code]!.name = name;
    }
  };
  for (const p of g4 ?? []) {
    if (p.code) mergeProp(p.code, p.name);
  }
  for (const p of debut?.props ?? []) {
    if (p.code) mergeProp(p.code, p.name);
  }

  const orphanNames = collectSpeakerOrphans(shots, bundle);
  const speakerOrphans = orphanNames.map((name) => ({ name, code: slugSpeakerCode(name) }));
  (bundle as { _speakerOrphans?: { name: string; code: string }[] })._speakerOrphans = speakerOrphans;

  // CD slug SSOT: remap digit charCodes / --cref to slug aliases
  const alias = buildCodeAliasMap(bundle);
  for (const shot of shots) {
    if (shot.charCodes?.length) {
      shot.charCodes = shot.charCodes.map((c) => resolveAliasedCode(normalizeAssetCode(c) ?? c, alias));
    }
    const img = shot.generation?.imagePrompt ?? "";
    if (img && /--cref\s+CHAR-\d+/i.test(img)) {
      shot.generation = {
        ...shot.generation,
        imagePrompt: img.replace(/--cref\s+(CHAR-\d+)/gi, (_m, dig: string) => {
          const resolved = resolveAliasedCode(dig, alias);
          return `--cref ${resolved}`;
        }),
      };
    }
  }

  bundle.preDesignPack = { ...bundle.preDesignPack!, shots };
  let splitCount = 0;
  if (ingestHeal) {
    splitCount = splitOverloadedDialogueShots(bundle, DURATION_CAP_SEC);
    if (splitCount > 0) warnings.push(`dialogue_shot_split:${splitCount}`);
  }
  const finalShots = bundle.preDesignPack.shots;

  return { shots: finalShots, sceneMap, rewrittenSceneLock, speakerOrphans, warnings };
}

/** Apply normalized shots back onto bundle.preDesignPack */
export function applyNormalizedShotsToBundle(bundle: ScriptBundle, shots: PreDesignShot[]): void {
  if (!bundle.preDesignPack) return;
  bundle.preDesignPack = { ...bundle.preDesignPack, shots };
}

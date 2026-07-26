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
import { assetDisplayName } from "./assetLabel";
import { isAllowedTransition, loadCameraMotionWhitelist } from "../qualityGate/cameraWhitelist";
import type { ShapeSalvageEntry } from "./shapeSalvageTypes";
import { ShapeSalvageLog } from "./shapeSalvageTypes";
import { expandLinesByClauseSplit, type Nar14LineLike } from "../nar14ClauseSplit";
import { normalizeDialogueSpeaker } from "../compilers/normalizeDialogueSpeaker";
import { ensureShotPerformanceDefaults } from "../emotion/defaultPerformance";
import { detectLipSplitPressure } from "../design/lipSplit";
import { resolveRequiredDuration } from "../compilers/resolveRequiredDuration";

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
  const assets = (bundle.characterDesign as { assets?: { name?: unknown; code?: string }[] } | undefined)?.assets ?? [];
  const set = new Set<string>();
  for (const a of assets) {
    const label = assetDisplayName(a.name);
    if (label) set.add(label);
    if (a.code) set.add(String(a.code).trim());
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
  const bare = normalizeDialogueSpeaker(name).name || name;
  const ascii = bare.replace(/[^\w]+/g, "").toUpperCase();
  if (ascii.length >= 2) return `CHAR-${ascii.slice(0, 16)}`;
  // Chinese → hash-ish stable
  let h = 0;
  for (let i = 0; i < bare.length; i++) h = (h * 31 + bare.charCodeAt(i)) >>> 0;
  return `CHAR-SP${(h % 10000).toString().padStart(4, "0")}`;
}

/** Strip 名（OS） wrappers on all dialogue speakers; tag type=os when detected. */
export function normalizeBundleDialogueSpeakers(bundle: ScriptBundle): number {
  let n = 0;
  const touchLine = (line: { speaker?: string; type?: string; [k: string]: unknown }) => {
    const raw = String(line.speaker ?? "").trim();
    if (!raw) return;
    const { name, isOs } = normalizeDialogueSpeaker(raw);
    if (name && name !== raw) {
      line.speaker = name;
      n += 1;
    } else if (!name && isOs) {
      line.speaker = "旁白";
      n += 1;
    }
    if (isOs && !line.type) {
      line.type = "os";
    }
  };
  for (const shot of bundle.preDesignPack?.shots ?? []) {
    for (const line of shot.narrative?.dialogue?.lines ?? []) {
      touchLine(line as { speaker?: string; type?: string });
    }
  }
  const planLines =
    (bundle.planData as { dialoguePlan?: { lines?: { speaker?: string; type?: string }[] } } | undefined)?.dialoguePlan
      ?.lines ?? [];
  for (const line of planLines) touchLine(line);
  return n;
}

/** Same OS strip as speakers — CD/asset display names must be bare casting names. */
export function normalizeCharacterDesignOsNames(bundle: ScriptBundle): number {
  let n = 0;
  const assets =
    (bundle.characterDesign as { assets?: { name?: unknown; [k: string]: unknown }[] } | undefined)?.assets ?? [];
  for (const a of assets) {
    const raw = String(a.name ?? "").trim();
    if (!raw) continue;
    const { name } = normalizeDialogueSpeaker(raw);
    if (name && name !== raw) {
      a.name = name;
      n += 1;
    }
  }
  // visualLockTable.characterAssets is Record<code, name> (canonical); tolerate rare array shape
  const vltTable = bundle.visualLockTable as
    | { characterAssets?: Record<string, unknown> | Array<{ name?: unknown; code?: string }> }
    | undefined;
  const ca = vltTable?.characterAssets;
  if (Array.isArray(ca)) {
    for (const a of ca) {
      const raw = String(a.name ?? "").trim();
      if (!raw) continue;
      const { name } = normalizeDialogueSpeaker(raw);
      if (name && name !== raw) {
        a.name = name;
        n += 1;
      }
    }
  } else if (ca && typeof ca === "object") {
    for (const code of Object.keys(ca)) {
      const raw = String(ca[code] ?? "").trim();
      if (!raw) continue;
      const { name } = normalizeDialogueSpeaker(raw);
      if (name && name !== raw) {
        ca[code] = name;
        n += 1;
      }
    }
  }
  return n;
}

/**
 * Import/export salvage: build longer shootable visualDescription from existing shot fields.
 * Never invent literary placeholders (QP-02 softPatch false).
 * Returns healed count; unsalvageable indexes go to warnings via caller.
 */
export function healShortVisualDescriptionFromDesign(bundle: ScriptBundle): {
  healed: number;
  unsalvageable: number[];
} {
  const { checkQp02VisualDescription, qp02MinChars } = require("./visualQualityAudit") as typeof import("./visualQualityAudit");
  let healed = 0;
  const unsalvageable: number[] = [];
  const min = qp02MinChars();

  const collectCandidates = (shot: PreDesignShot, vd: string): string[] => {
    const sd = (shot.shotDesign ?? {}) as Record<string, unknown>;
    const comp = (sd.composition ?? {}) as { foreground?: string; background?: string };
    const blocking = (sd.blocking ?? {}) as { bodyAction?: string; spatial?: string };
    const perf = (sd.performance ?? {}) as { expression?: string; action?: string; gesture?: string };
    const narrative = (shot.narrative ?? {}) as {
      sceneName?: string;
      shotSize?: string;
      markers?: { desc?: string }[];
    };
    const scene = String(shot.sceneName ?? narrative.sceneName ?? "").trim();
    const size = String(shot.shotSize ?? narrative.shotSize ?? "").trim();
    const picture = String(sd.picture ?? "").trim();
    const fgBg = [comp.foreground, comp.background].filter(Boolean).join("，");
    const body = String(blocking.bodyAction ?? perf.action ?? perf.gesture ?? "").trim();
    const expr = String(perf.expression ?? "").trim();
    const markerBlob = (narrative.markers ?? [])
      .map((m) => String(m.desc ?? "").trim())
      .filter(Boolean)
      .join("。");

    const out: string[] = [];
    const push = (s: string) => {
      const t = s.replace(/\s+/g, " ").trim();
      if (t.length >= min) out.push(t);
    };
    push(picture);
    push(fgBg);
    push(body);
    push([body, expr].filter(Boolean).join("，"));
    push(markerBlob);
    // Compose from existing crumbs only (scene/size/vd/body) — no canned filler
    if (scene && vd) push(`${scene}。${vd}`);
    if (scene && size && vd) push(`${scene}，${size}。${vd}`);
    if (scene && body) push(`${scene}。${body}`);
    if (scene && picture) push(`${scene}。${picture}`);
    if (fgBg && vd) push(`${fgBg}。${vd}`);
    if (body && vd) push(`${body}。${vd}`);
    if (scene && fgBg && vd) push(`${scene}，${fgBg}。${vd}`);
    return [...new Set(out)];
  };

  for (const shot of bundle.preDesignPack?.shots ?? []) {
    const idx = Number(shot.shotIndex) || 0;
    const vd = String(shot.visualDescription ?? "").trim();
    const fail = checkQp02VisualDescription({ visualDescription: vd, shotIndex: idx || undefined });
    if (!fail || fail.severity !== "BLOCK") continue;

    let picked: string | undefined;
    for (const c of collectCandidates(shot, vd)) {
      const ok = checkQp02VisualDescription({ visualDescription: c });
      if (!ok || ok.severity !== "BLOCK") {
        picked = c;
        break;
      }
    }
    if (picked) {
      shot.visualDescription = picked;
      healed += 1;
    } else if (idx) {
      unsalvageable.push(idx);
    }
  }
  return { healed, unsalvageable };
}

type DialoguePlanLine = {
  lineId?: string;
  splitHint?: string;
  reactionAction?: string;
  functions?: string[];
};

/** Mirror SSOT — never dump missing lineIds onto first dialogue shot. */
export function mirrorDialoguePlanToShots(bundle: ScriptBundle): number {
  const { mirrorDialoguePlanToShotsSsot } =
    require("../design/dialogueMirrorSsot") as typeof import("../design/dialogueMirrorSsot");
  return mirrorDialoguePlanToShotsSsot(bundle);
}

/**
 * No-op stubs removed: auto-writing splitHint/reactionAction caused false-green import
 * while hydrate/burn still blocked. Keep mirrorDialoguePlanToShots only.
 * NAR-14 relief is physical clause-split via applyNar14ClauseSplitInBundle (not inventing hints).
 */
export function healDialoguePlanMetadata(_bundle: ScriptBundle): number {
  return 0;
}

export function healShotDialogueMetadata(_bundle: ScriptBundle): number {
  return 0;
}

/**
 * Physical NAR-14 clause split on dialoguePlan + shots (safe: preserves text, no invented splitHint).
 * Runs on both Chat-strict and ingest paths.
 */
export function applyNar14ClauseSplitInBundle(bundle: ScriptBundle, healLog?: ShapeSalvageLog): number {
  let total = 0;
  const plan = bundle.planData as { dialoguePlan?: { lines?: Nar14LineLike[] } } | undefined;
  if (plan?.dialoguePlan?.lines?.length) {
    const { lines, splitCount } = expandLinesByClauseSplit(plan.dialoguePlan.lines);
    if (splitCount > 0) {
      plan.dialoguePlan.lines = lines;
      total += splitCount;
      healLog?.push("SH-NAR-CLAUSE-SPLIT", "planData.dialoguePlan.lines", `+${splitCount} clause lines`);
    }
  }
  for (const shot of bundle.preDesignPack?.shots ?? []) {
    const raw = (shot.narrative?.dialogue?.lines ?? []) as Nar14LineLike[];
    if (!raw.length) continue;
    const { lines, splitCount } = expandLinesByClauseSplit(raw);
    if (splitCount <= 0) continue;
    shot.narrative = {
      ...shot.narrative,
      dialogue: { ...shot.narrative?.dialogue, lines: lines as NonNullable<NonNullable<PreDesignShot["narrative"]>["dialogue"]>["lines"] },
    };
    total += splitCount;
    healLog?.push(
      "SH-NAR-CLAUSE-SPLIT",
      `preDesignPack.shots[${shot.shotIndex ?? "?"}].dialogue.lines`,
      `+${splitCount} clause lines`,
    );
  }
  return total;
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
 * Distinct from CHAR-ORPH NER invent stubs (those are stripped; never invent from visualDescription).
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

function alignShotDurationFromDialogue(shot: PreDesignShot, warnings: string[], healLog?: ShapeSalvageLog): void {
  const lines = shot.narrative?.dialogue?.lines ?? [];
  if (!lines.length) return;
  // Respect lip-split SSOT: never silent-raise into needsSplit / overVendorMax
  const req = resolveRequiredDuration(shot);
  if (req.needsSplit || req.overVendorMax) {
    warnings.push(`duration_align_skip_needs_split:shot${shot.shotIndex ?? "?"}`);
    return;
  }
  const text = flattenDialogueText(lines);
  if (!text.trim()) return;
  const metrics = measureDialogue({ text, speechSpeed: 4 });
  if (metrics.minDurationSec <= 0) return;
  const vendorCap = req.vendorMax > 0 ? req.vendorMax : DURATION_CAP_SEC;
  const needed = Math.min(vendorCap, DURATION_CAP_SEC, Math.max(1, metrics.minDurationSec));
  const current = shot.duration ?? 0;
  if (needed > current) {
    if (metrics.minDurationSec > DURATION_CAP_SEC) {
      warnings.push(`duration_over_cap:shot${shot.shotIndex ?? "?"}:${metrics.minDurationSec}s`);
    }
    const prev = current;
    shot.duration = needed;
    healLog?.push(
      "SH-DURATION-ALIGN",
      `preDesignPack.shots[${shot.shotIndex ?? "?"}].duration`,
      `${prev}→${needed}s`,
    );
  }
}

const TRANSITION_ALIAS: Record<string, string> = {
  硬切: "切",
  软切: "切",
  溶解: "叠化",
  交叉叠化: "叠化",
  cut: "cut",
  "hard cut": "切",
  "soft cut": "切",
};

function healTransitionType(shot: PreDesignShot, healLog?: ShapeSalvageLog): void {
  const wl = loadCameraMotionWhitelist();
  const narr = shot.narrative as { transitionType?: string } | undefined;
  const top = (shot as { transitionType?: string }).transitionType;
  const raw = String(narr?.transitionType ?? top ?? "").trim();
  if (!raw) return;
  if (isAllowedTransition(raw, wl)) return;
  const mapped = TRANSITION_ALIAS[raw] ?? TRANSITION_ALIAS[raw.toLowerCase()] ?? wl.defaultTransition;
  if (narr) narr.transitionType = mapped;
  if (top != null) (shot as { transitionType?: string }).transitionType = mapped;
  healLog?.push(
    "SH-TRANSITION",
    `preDesignPack.shots[${shot.shotIndex ?? "?"}].transitionType`,
    `${raw}→${mapped}`,
  );
}

function parseFxLevelToken(raw: unknown): string | undefined {
  const t = String(raw ?? "").trim();
  if (!t) return undefined;
  const m = t.match(/^(F[0-5])\b/i);
  return m ? m[1]!.toUpperCase() : undefined;
}

function healFxFeasibilityF0(shot: PreDesignShot, healLog?: ShapeSalvageLog): void {
  const existing =
    parseFxLevelToken((shot as { fxFeasibility?: string }).fxFeasibility) ??
    parseFxLevelToken(shot.generation && (shot.generation as { fxFeasibility?: string }).fxFeasibility);
  if (existing) return;
  const fromVe =
    parseFxLevelToken(typeof shot.visualEffect === "string" ? shot.visualEffect : undefined) ??
    parseFxLevelToken((shot as { fxLevel?: string }).fxLevel);
  if (fromVe !== "F0") return;
  (shot as { fxFeasibility?: string }).fxFeasibility = "F0";
  shot.generation = { ...shot.generation, fxFeasibility: "F0" } as typeof shot.generation;
  healLog?.push("SH-FX-F0", `preDesignPack.shots[${shot.shotIndex ?? "?"}]`, "visualEffect F0→fxFeasibility");
}

function healMinimalGenerationPrompts(shot: PreDesignShot, healLog?: ShapeSalvageLog): void {
  const vd = String(shot.visualDescription ?? "").trim();
  const audioCue = String(shot.audioCue ?? "").trim();
  const lines = shot.narrative?.dialogue?.lines ?? [];
  const dialogueText = flattenDialogueText(lines).trim();
  shot.generation = shot.generation ?? {};
  const gen = shot.generation;

  if (!String(gen.imagePrompt ?? "").trim() && vd) {
    gen.imagePrompt = vd;
    healLog?.push(
      "SH-IMG-SEED",
      `preDesignPack.shots[${shot.shotIndex ?? "?"}].generation.imagePrompt`,
      "from visualDescription",
    );
  }

  if (!String(gen.audioPrompt ?? "").trim() && (audioCue || dialogueText)) {
    const summary = (audioCue || dialogueText).slice(0, 80);
    gen.audioPrompt = audioCue
      ? `音效与对白：${summary}`
      : `口型同步对白：${summary}${dialogueText.length > 80 ? "…" : ""}`;
    healLog?.push(
      "SH-AUD-SEED",
      `preDesignPack.shots[${shot.shotIndex ?? "?"}].generation.audioPrompt`,
      audioCue ? "from audioCue" : "from dialogue",
    );
  }

  if (!String(gen.videoPrompt ?? "").trim() && vd) {
    const lip = dialogueText ? ", speaking lip-sync" : "";
    gen.videoPrompt = `${vd}${lip}`;
    healLog?.push(
      "SH-VID-SEED",
      `preDesignPack.shots[${shot.shotIndex ?? "?"}].generation.videoPrompt`,
      "from visualDescription",
    );
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
  semanticHealLog: ShapeSalvageEntry[];
}

export interface NormalizePreDesignOpts {
  /** Import/dryRun: mirror dialogue, CD stubs, lip split. Export gate: false (strict semantic check). */
  ingestHeal?: boolean;
  /** Propose-only heal (preview/chatStrict): diffs without persist. */
  chatStrict?: boolean;
}

/**
 * Normalize shots + rewrite sceneColorLock onto bundle.visualLockTable.
 */
export function normalizePreDesignPack(bundle: ScriptBundle, opts: NormalizePreDesignOpts = {}): NormalizePreDesignResult {
  const ingestHeal = opts.ingestHeal !== false;
  const pack = bundle.preDesignPack;
  const warnings: string[] = [];
  const healLog = new ShapeSalvageLog();
  if (!pack?.shots?.length) {
    return {
      shots: [],
      sceneMap: new Map(),
      rewrittenSceneLock: {},
      speakerOrphans: [],
      warnings: ["no_shots"],
      semanticHealLog: [],
    };
  }

  mirrorDialoguePlanToShots(bundle);
  // Strip duration-only pseudo dialogue (：3s / 时长：3s) so DC-01 EXTRA cannot recur
  try {
    const { stripDurationOnlyDialogueLines } = require("../design/dialogueCoverage") as typeof import("../design/dialogueCoverage");
    for (const shot of pack.shots ?? []) {
      const narr = (shot as { narrative?: { dialogue?: { lines?: unknown } } }).narrative;
      if (!narr?.dialogue || narr.dialogue.lines == null) continue;
      const cleaned = stripDurationOnlyDialogueLines(narr.dialogue.lines);
      const before = Array.isArray(narr.dialogue.lines)
        ? narr.dialogue.lines.length
        : typeof narr.dialogue.lines === "string"
          ? 1
          : 0;
      if (cleaned.length < before) {
        narr.dialogue.lines = cleaned;
        warnings.push("strip_duration_dialogue");
        healLog.push("DC-01", "narrative.dialogue.lines", "strip_duration_only");
      }
    }
  } catch {
    /* optional */
  }
  // Always: physical clause-split (no invented splitHint) — Chat-strict + ingest
  const clauseSplits = applyNar14ClauseSplitInBundle(bundle, healLog);
  if (clauseSplits > 0) warnings.push(`nar14_clause_split:${clauseSplits}`);
  // Residual NAR-14 / lip multi-B: Confirm-only（designSplitOps），禁 ingest 静默同文扩镜
  if (ingestHeal && pack.shots?.length) {
    const planLines =
      ((bundle.planData as { dialoguePlan?: { lines?: Nar14LineLike[] } } | undefined)?.dialoguePlan?.lines ??
        []) as Nar14LineLike[];
    const pressure = (pack.shots as Record<string, unknown>[]).filter((s) =>
      detectLipSplitPressure(s).mustConfirm,
    ).length;
    if (pressure > 0) {
      warnings.push(`lip_confirm_required:${pressure}`);
      healLog.push("LIP-01", "preDesignPack.shots", `confirm_only;pressure=${pressure};no_silent_lip_multi_B`);
      const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
      bMeta.lipConfirmRequired = true;
      bMeta.importOkNotExitPass = true;
    }
    if (planLines.some((l) => Boolean((l as { _nar14Residual?: boolean })._nar14Residual))) {
      warnings.push("nar14_confirm_required:ingest_skips_silent_B");
      healLog.push("NAR-14", "preDesignPack.shots", "confirm_only;no_silent_residual_B");
    }
  }
  // Strip 名（OS） before CD stubs / orphan slug so identity matches bare names
  const speakerNorm = normalizeBundleDialogueSpeakers(bundle);
  if (speakerNorm > 0) warnings.push(`speaker_os_normalize:${speakerNorm}`);
  const cdOsNorm = normalizeCharacterDesignOsNames(bundle);
  if (cdOsNorm > 0) warnings.push(`cd_os_normalize:${cdOsNorm}`);
  const vdSalvage = healShortVisualDescriptionFromDesign(bundle);
  if (vdSalvage.healed > 0) warnings.push(`qp02_vd_salvage:${vdSalvage.healed}`);
  if (vdSalvage.unsalvageable.length) {
    warnings.push(`qp02_vd_unsalvageable:shot${vdSalvage.unsalvageable.join(",")}`);
  }
  // Re-mirror after split so shot lines pick up plan metadata on shared roots
  mirrorDialoguePlanToShots(bundle);
  if (ingestHeal) {
    healDialoguePlanMetadata(bundle);
    healShotDialogueMetadata(bundle);
    try {
      const { applyDesignLossSupplement } =
        require("../quality/designLossSupplement") as typeof import("../quality/designLossSupplement");
      const loss = applyDesignLossSupplement(bundle, { proposeOnly: Boolean(opts.chatStrict) });
      for (const w of loss.warnings) warnings.push(w);
      if (loss.supplemented) warnings.push(`design_loss_supplemented:${loss.supplemented}`);
      if (loss.unsalvageable.length) {
        warnings.push(`design_loss_unsalvageable:${loss.unsalvageable.length}`);
        (bundle as { designLossUnsalvageable?: unknown }).designLossUnsalvageable = loss.unsalvageable;
      }
    } catch {
      /* optional */
    }
    // Order: strip NER CHAR-ORPH → cast bind (healShotQuality) → speaker stubs → audit
    const { stripCharOrphNerStubs } =
      require("../quality/matchDescNamesToCasting") as typeof import("../quality/matchDescNamesToCasting");
    const cdAssets = ((bundle.characterDesign as { assets?: unknown[] } | undefined)?.assets ??
      []) as Array<{ code?: string; name?: string; L0?: { identity?: string; stub?: boolean } }>;
    const vlt = (bundle.visualLockTable ?? {}) as { characterAssets?: Record<string, unknown> };
    const stripped = stripCharOrphNerStubs({
      shots: pack.shots as Array<{ charCodes?: string[] }>,
      characterAssets: cdAssets,
      visualLockTable: vlt,
    });
    if (stripped.strippedCodes.length || stripped.strippedAssets.length) {
      warnings.push(
        `char_orph_strip:${[...stripped.strippedCodes, ...stripped.strippedAssets].slice(0, 12).join(",")}`,
      );
      if (bundle.characterDesign) {
        (bundle.characterDesign as { assets: typeof cdAssets }).assets = cdAssets;
      }
      bundle.visualLockTable = vlt;
    }
    const { healShotQuality } = require("../quality/healShotQuality") as typeof import("../quality/healShotQuality");
    const sq = healShotQuality({
      shots: pack.shots as never[],
      characterAssets: (bundle.characterDesign?.assets ?? []) as never[],
      proposeOnly: Boolean(opts.chatStrict),
      chatStrict: Boolean(opts.chatStrict),
    });
    if (sq.healed > 0) warnings.push(`shot_quality_heal:${sq.healed}`);
    if (sq.diffs.length) {
      warnings.push(`shot_quality_diffs:${sq.diffs.length}`);
      (bundle as { shotQualityDiffs?: unknown }).shotQualityDiffs = sq.diffs;
    }
    if (sq.unsalvageable.length) {
      warnings.push(`shot_quality_unsalvageable:${sq.unsalvageable.map((u) => u.shotIndex ?? "?").join(",")}`);
      (bundle as { shotQualityUnsalvageable?: unknown }).shotQualityUnsalvageable = sq.unsalvageable;
    }
    if (sq.residual.length) {
      (bundle as { shotQualityResidual?: unknown }).shotQualityResidual = sq.residual;
    }
    try {
      const { hasOnCameraDialogue, onCameraDialogueTexts } =
        require("../design/onCameraDialogue") as typeof import("../design/onCameraDialogue");
      let seeded = 0;
      for (const shot of pack.shots) {
        const gen = (shot.generation ?? {}) as { audioPrompt?: string };
        const lines = shot.narrative?.dialogue?.lines ?? [];
        if (hasOnCameraDialogue(lines) && !String(gen.audioPrompt ?? "").trim()) {
          const texts = onCameraDialogueTexts(lines);
          if (texts.length && !opts.chatStrict) {
            shot.generation = { ...gen, audioPrompt: texts.join("\n") };
            seeded += 1;
          }
        }
      }
      if (seeded) warnings.push(`audio_prompt_seed:${seeded}`);
    } catch {
      /* optional */
    }
    // M10: on-cam / aggressive → clamp camera static (observable auto_adapt)
    try {
      const { auditCamShootableFit } =
        require("../quality/camShootableFit") as typeof import("../quality/camShootableFit");
      let clamped = 0;
      for (const shot of pack.shots as Record<string, unknown>[]) {
        const cam = auditCamShootableFit(shot);
        if (cam.healHint === "clamp_static" && !opts.chatStrict) {
          shot.camera = "static";
          const narr = (shot.narrative as Record<string, unknown>) ?? {};
          narr.camera = "static";
          shot.narrative = narr;
          clamped += 1;
        }
      }
      if (clamped) warnings.push(`cam_speak_clamp_static:${clamped}`);
    } catch {
      /* optional */
    }
    // Speaker stubs AFTER orphan strip — real missing speakers still BLOCK until L0.identity
    const stubbed = ensureCdSpeakerStubs(bundle);
    if (stubbed.length) warnings.push(`cd_speaker_stub:${stubbed.join(",")}`);
    let perfN = 0;
    for (const shot of pack.shots) {
      // High-intensity already residual in healShotQuality; defaults only for low intensity
      if (ensureShotPerformanceDefaults(shot as never)) perfN += 1;
    }
    if (perfN > 0) warnings.push(`performance_default:${perfN}`);
    // New imports enable duration_norms cps (migrate flag) — history unset keeps legacy
    const meta = (bundle as { meta?: Record<string, unknown> }).meta ?? {};
    if (meta.pillarsDurationV2 == null) {
      (bundle as { meta?: Record<string, unknown> }).meta = { ...meta, pillarsDurationV2: true };
      warnings.push("pillarsDurationV2:true");
    }
    const meta2 = (bundle as { meta?: Record<string, unknown> }).meta ?? {};
    if (meta2.pillarsChainContractV1 == null) {
      (bundle as { meta?: Record<string, unknown> }).meta = { ...meta2, pillarsChainContractV1: true };
      warnings.push("pillarsChainContractV1:true");
    }
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
    if (ingestHeal) {
      healFxFeasibilityF0(shot, healLog);
      healMinimalGenerationPrompts(shot, healLog);
      healTransitionType(shot, healLog);
      alignShotDurationFromDialogue(shot, warnings, healLog);
    }

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

  // CD slug SSOT: remap digit charCodes / --cref to slug aliases; SCENE out of --cref
  const alias = buildCodeAliasMap(bundle);
  for (const shot of shots) {
    if (shot.charCodes?.length) {
      shot.charCodes = shot.charCodes.map((c) => resolveAliasedCode(normalizeAssetCode(c) ?? c, alias));
    }
    let img = shot.generation?.imagePrompt ?? "";
    if (img) {
      // Move --cref SCENE-* → --sref SCENE-*
      const sceneFromCref: string[] = [];
      img = img.replace(/--cref\s+((?:(?!--sref|--ar)\S+\s*)+)/gi, (_m, block: string) => {
        const toks = String(block).trim().split(/\s+/).filter(Boolean);
        const chars = toks.filter((t) => /^CHAR-/i.test(t));
        for (const t of toks) {
          if (/^SCENE-/i.test(t)) sceneFromCref.push(t.toUpperCase());
        }
        return chars.length ? `--cref ${chars.join(" ")}` : " ";
      });
      if (sceneFromCref.length) {
        const existing = img.match(/--sref\s+([^\n]+?)(?=\s+--(?:cref|ar)\b|$)/i);
        const merged = [...new Set([...(existing?.[1]?.trim().split(/\s+/) ?? []), ...sceneFromCref])];
        if (existing) {
          img = img.replace(/--sref\s+[^\n]+?(?=\s+--(?:cref|ar)\b|$)/i, `--sref ${merged.join(" ")}`);
        } else {
          img = `${img.trim()} --sref ${merged.join(" ")}`.trim();
        }
      }
      if (/--cref\s+CHAR-\d+/i.test(img)) {
        img = img.replace(/--cref\s+(CHAR-\d+)/gi, (_m, dig: string) => {
          const resolved = resolveAliasedCode(dig, alias);
          return `--cref ${resolved}`;
        });
      }
      shot.generation = { ...shot.generation, imagePrompt: img.replace(/\s{2,}/g, " ").trim() };
    }
  }

  bundle.preDesignPack = { ...bundle.preDesignPack!, shots };
  // Never silent same-VD lip-split on ingest — Confirm via designSplitOps / raise≤vendor only
  if (ingestHeal) {
    warnings.push("dialogue_shot_split:skipped_confirm_only");
  }
  const finalShots = bundle.preDesignPack.shots;

  return {
    shots: finalShots,
    sceneMap,
    rewrittenSceneLock,
    speakerOrphans,
    warnings,
    semanticHealLog: healLog.entries,
  };
}

/** Apply normalized shots back onto bundle.preDesignPack */
export function applyNormalizedShotsToBundle(bundle: ScriptBundle, shots: PreDesignShot[]): void {
  if (!bundle.preDesignPack) return;
  bundle.preDesignPack = { ...bundle.preDesignPack, shots };
}

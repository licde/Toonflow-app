/**
 * Shared helpers for design-phase export gates (speakers, scene keys, self-report mismatch).
 */
import type { ScriptBundle } from "./types";
import { normalizeAssetCode } from "../codes/assetCodeContract";
import { collectReferencedCodes } from "./assetClosureGate";
import { assetDisplayName } from "./assetLabel";
import { collectNar14Nar15Fails, type Nar14LineLike } from "../nar14ClauseSplit";

export function collectDialogueSpeakers(bundle: ScriptBundle): Set<string> {
  const names = new Set<string>();
  for (const s of bundle.preDesignPack?.shots ?? []) {
    for (const line of s.narrative?.dialogue?.lines ?? []) {
      const sp = (line as { speaker?: string }).speaker?.trim();
      if (sp) names.add(sp);
    }
  }
  const plan = (bundle.planData as { dialoguePlan?: { lines?: { speaker?: string }[] } } | undefined)?.dialoguePlan;
  for (const line of plan?.lines ?? []) {
    const sp = line.speaker?.trim();
    if (sp) names.add(sp);
  }
  const brief = bundle.designBrief as { B6?: { characters?: string[] } } | undefined;
  for (const c of brief?.B6?.characters ?? []) {
    if (c?.trim()) names.add(c.trim());
  }
  return names;
}

export function collectCdCharacterNames(bundle: ScriptBundle): Set<string> {
  const names = new Set<string>();
  const cd = bundle.characterDesign as { assets?: { code?: string; name?: unknown }[] } | undefined;
  for (const a of cd?.assets ?? []) {
    const label = assetDisplayName(a.name);
    if (label) names.add(label);
    const code = a.code ? normalizeAssetCode(a.code) ?? a.code : undefined;
    if (code) names.add(code);
  }
  const vlt = bundle.visualLockTable as { characterAssets?: Record<string, unknown> } | undefined;
  for (const [code, raw] of Object.entries(vlt?.characterAssets ?? {})) {
    const n = normalizeAssetCode(code) ?? code;
    if (n) names.add(n);
    const label = assetDisplayName(raw);
    if (label) names.add(label);
  }
  return names;
}

export function speakersMissingFromCd(bundle: ScriptBundle): string[] {
  const speakers = collectDialogueSpeakers(bundle);
  const cd = collectCdCharacterNames(bundle);
  const missing: string[] = [];
  for (const sp of speakers) {
    if (cd.has(sp)) continue;
    const partial = [...cd].some((n) => n.includes(sp) || sp.includes(n));
    if (!partial) missing.push(sp);
  }
  return missing;
}

export type CdAssetLike = {
  code?: string;
  name?: string;
  L0?: { stub?: boolean; identity?: string; gender?: string; visual?: string };
};

/**
 * DC-16 / DG-CD cast coverage: speakers ∪ B6 ∪ on-screen CHAR codes must be in CD/VLT
 * with real (non-stub) L0.identity. Stub-only entries still fail (anti green-wash).
 */
export function auditCastCoverage(bundle: ScriptBundle): {
  missingSpeakers: string[];
  missingCodes: string[];
  stubOrIncomplete: string[];
  genderWarn: string[];
  labels: string[];
  block: boolean;
} {
  const missingSpeakers = speakersMissingFromCd(bundle);
  const referenced = collectReferencedCodes(bundle);
  const speakers = collectDialogueSpeakers(bundle);

  const cd = bundle.characterDesign as { assets?: CdAssetLike[] } | undefined;
  const assets = cd?.assets ?? [];
  const cdCodes = new Set(
    assets
      .map((a) => (a.code ? normalizeAssetCode(a.code) ?? a.code : ""))
      .filter(Boolean),
  );
  const vlt = bundle.visualLockTable as { characterAssets?: Record<string, string> } | undefined;
  for (const code of Object.keys(vlt?.characterAssets ?? {})) {
    const n = normalizeAssetCode(code) ?? code;
    if (n) cdCodes.add(n);
  }

  const missingCodes: string[] = [];
  for (const code of referenced) {
    if (!code.startsWith("CHAR-")) continue;
    if (!cdCodes.has(code)) missingCodes.push(code);
  }

  const stubOrIncomplete: string[] = [];
  const genderWarn: string[] = [];
  for (const a of assets) {
    const label = assetDisplayName(a.name) || a.code || "?";
    const code = a.code ? normalizeAssetCode(a.code) ?? a.code : undefined;
    const nameStr = assetDisplayName(a.name);
    const nameHit = nameStr
      ? speakers.has(nameStr) || [...speakers].some((n) => n.includes(nameStr) || nameStr.includes(n))
      : false;
    const codeHit = code ? referenced.includes(code) : false;
    const isRelevant = nameHit || codeHit || a.L0?.stub === true;

    if (a.L0?.stub === true) {
      stubOrIncomplete.push(label);
      continue;
    }
    if (isRelevant) {
      const identity = String(a.L0?.identity ?? "").trim();
      if (!identity || identity === label || identity === a.code) {
        stubOrIncomplete.push(label);
      }
    }
    if (nameHit && !String(a.L0?.gender ?? "").trim()) {
      genderWarn.push(label);
    }
  }

  const labels = [...new Set([...missingSpeakers, ...missingCodes, ...stubOrIncomplete])];
  return {
    missingSpeakers,
    missingCodes,
    stubOrIncomplete,
    genderWarn,
    labels,
    block: labels.length > 0,
  };
}

export function sceneColorLockHasChineseKeys(bundle: ScriptBundle): string[] {
  const lock = (bundle.visualLockTable as { sceneColorLock?: Record<string, unknown> } | undefined)?.sceneColorLock ?? {};
  return Object.keys(lock).filter((k) => /[\u4e00-\u9fff]/.test(k));
}

export function serverNarrativeSelfcheckFails(bundle: ScriptBundle): { id: string; message: string }[] {
  /** Same kernel as diagnoseNar (GateDiagnose SSOT) — keep inline to avoid circular import. */
  const planLines =
    ((bundle.planData as { dialoguePlan?: { lines?: Nar14LineLike[] } } | undefined)?.dialoguePlan?.lines ??
      []) as Nar14LineLike[];
  const shotLines = (bundle.preDesignPack?.shots ?? []).map((s) => ({
    shotIndex: (s as { shotIndex?: number }).shotIndex,
    lines: (s.narrative?.dialogue?.lines ?? []) as Nar14LineLike[],
  }));
  return collectNar14Nar15Fails(planLines, shotLines).map((f) => ({ id: f.id, message: f.message }));
}

export function linkageAssetChainFalseGreen(bundle: ScriptBundle): boolean {
  const audit = bundle.linkageAudit as { chains?: { chainId?: string; status?: string }[] } | undefined;
  const assetChain = audit?.chains?.find((c) => c.chainId === "资产");
  if (!assetChain || assetChain.status !== "pass") return false;
  return speakersMissingFromCd(bundle).length > 0;
}

export function modalityAuditFalseGreen(bundle: ScriptBundle): boolean {
  const audit = bundle.modalityPromptAudit as Record<string, unknown> | undefined;
  if (!audit) return false;
  const fxPass =
    audit.FX === "pass" ||
    (audit as { modalities?: { FX?: string } }).modalities?.FX === "pass" ||
    Number((audit as { passRate?: number }).passRate) === 100;
  if (!fxPass) return false;
  const shots = bundle.preDesignPack?.shots ?? [];
  if (shots.length < 3) return false;
  // Mixed or all-empty: FX=pass is false-green whenever any shot fails dual-track
  return undeclaredEmptyFxShotIndexes(bundle).length > 0;
}

/** Letter stub or empty — not executable FX prose. */
function isFxProseText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/^F[0-5]$/i.test(t) || /^FX:\s*F[0-5]$/i.test(t)) return false;
  return t.length >= 4;
}

function shotFxGrade(bundle: ScriptBundle, shot: Record<string, unknown>, shotIndex?: number): string {
  const auditItems =
    (bundle as { fxFeasibilityAudit?: { items?: { shotIndex?: number; level?: string }[] } }).fxFeasibilityAudit
      ?.items ?? [];
  const local = String(
    (shot as { fxFeasibility?: string }).fxFeasibility ??
      (shot.generation as { fxFeasibility?: string } | undefined)?.fxFeasibility ??
      (shot as { fxLevel?: string }).fxLevel ??
      "",
  )
    .toUpperCase()
    .replace(/^FX:/, "")
    .trim();
  if (/^F[0-5]$/.test(local) || local === "NONE") return local.startsWith("F") ? local : "NONE";

  // visualEffect "F0" / "F0: …" counts as declared no-VFX (Chat canonical)
  const ve = String(shot.visualEffect ?? "").trim();
  const veGrade = ve.match(/^(F[0-5])\b/i)?.[1]?.toUpperCase();
  if (veGrade === "F0") return "F0";
  if (veGrade && /^F[1-5]$/.test(veGrade)) {
    // F1+ in visualEffect alone is a level hint; dual-track still needs prose unless feasibility set
  }

  const fromAudit = String(auditItems.find((it) => it.shotIndex === shotIndex)?.level ?? "")
    .toUpperCase()
    .replace(/^FX:/, "")
    .trim();
  // Stale audit after shot split: F1+ without materials does not count as declared
  if (/^F[1-5]$/.test(fromAudit)) {
    const fx = shotFxPromptText(shot);
    if (!fx && !ve) return "";
  }
  if (/^F[0-5]$/.test(fromAudit) || fromAudit === "NONE") return fromAudit === "NONE" ? "NONE" : fromAudit;
  return "";
}

function shotFxPromptText(shot: Record<string, unknown>): string {
  const n = (shot.narrative as Record<string, unknown>) ?? {};
  const gen = (shot.generation as Record<string, unknown>) ?? {};
  return String(shot.fxPrompt ?? n.fxPrompt ?? gen.fxPrompt ?? "").trim();
}

/** Shots with empty fxPrompt and no F0/NONE declaration. */
export function undeclaredEmptyFxShotIndexes(bundle: ScriptBundle): number[] {
  const out: number[] = [];
  const shots = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    const idx = (s.shotIndex as number | undefined) ?? i + 1;
    const fx = shotFxPromptText(s);
    const grade = shotFxGrade(bundle, s, idx);
    if (!fx && !grade) out.push(idx);
  }
  return out;
}

/**
 * Dual-track: each shot must be F0/NONE (no prose) XOR executable fxPrompt.
 * Returns shot indexes that violate the rule.
 */
export function fxDualTrackViolations(bundle: ScriptBundle): { shotIndex: number; reason: string }[] {
  const out: { shotIndex: number; reason: string }[] = [];
  const shots = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    const idx = (s.shotIndex as number | undefined) ?? i + 1;
    const fx = shotFxPromptText(s);
    const grade = shotFxGrade(bundle, s, idx);
    const prose = isFxProseText(fx);
    if (!fx && !grade) {
      out.push({ shotIndex: idx, reason: "空未声明F0" });
      continue;
    }
    // F0 + prose is soft (Chat may leave leftover); prefer empty fxPrompt for no-VFX
    if ((grade === "F0" || grade === "NONE") && prose) {
      continue;
    }
    if (/^F[1-3]$/.test(grade) && !prose) {
      out.push({ shotIndex: idx, reason: `${grade}缺散文fxPrompt` });
    }
  }
  return out;
}

/**
 * Still multi-character identity coverage — one face per named role before vendor spend.
 */
import { buildPrimaryBlock } from "./primaryBlock";
import type { BurnNextStep } from "./burnGateEnvelope";
import type { ComposeStillCharHint } from "./composeStillPrompt";

export interface StillIdentityChar {
  code?: string;
  name?: string;
  hasImage?: boolean;
  kind?: "character" | "scene";
}

export interface StillIdentityCoverageResult {
  ok: boolean;
  code?: "IMG-CREF-CHAR" | "IMG-CREF";
  missing: Array<{ code?: string; name?: string }>;
  requiredCodes: string[];
  imagedCodes: string[];
  userMessage?: string;
  ctaLabel?: string;
  primaryNextStep?: BurnNextStep;
}

/** Collect required character codes/names from linked assets + dialogue speakers. */
export function collectRequiredStillChars(input: {
  characters?: StillIdentityChar[] | ComposeStillCharHint[] | null;
  dialogueSpeakers?: string[] | null;
}): StillIdentityChar[] {
  const byKey = new Map<string, StillIdentityChar>();
  for (const c of input.characters ?? []) {
    if (c.kind === "scene") continue;
    const key = (c.code || c.name || "").toUpperCase();
    if (!key) continue;
    byKey.set(key, { code: c.code, name: c.name, hasImage: c.hasImage, kind: "character" });
  }
  for (const sp of input.dialogueSpeakers ?? []) {
    const name = String(sp ?? "").trim();
    if (!name) continue;
    // Match existing by name substring
    let hit = false;
    for (const [, c] of byKey) {
      if (c.name && (c.name.includes(name) || name.includes(c.name))) {
        hit = true;
        break;
      }
    }
    if (!hit) {
      byKey.set(`NAME:${name}`, { name, hasImage: false, kind: "character" });
    }
  }
  return [...byKey.values()];
}

export function assertStillIdentityCoverage(input: {
  characters?: StillIdentityChar[] | ComposeStillCharHint[] | null;
  dialogueSpeakers?: string[] | null;
  /** When false, skip hard gate (compose-only). Default true for generate. */
  enforce?: boolean;
}): StillIdentityCoverageResult {
  if (input.enforce === false) {
    return { ok: true, missing: [], requiredCodes: [], imagedCodes: [] };
  }
  const required = collectRequiredStillChars(input);
  // Only gate when ≥2 named roles (dual/multi) — single missing lead still handled elsewhere
  const chars = required.filter((c) => c.code || c.name);
  if (chars.length < 2) {
    return {
      ok: true,
      missing: [],
      requiredCodes: chars.map((c) => c.code || c.name || "").filter(Boolean),
      imagedCodes: chars.filter((c) => c.hasImage).map((c) => c.code || c.name || "").filter(Boolean),
    };
  }
  const missing = chars.filter((c) => !c.hasImage);
  const requiredCodes = chars.map((c) => c.code || c.name || "").filter(Boolean);
  const imagedCodes = chars.filter((c) => c.hasImage).map((c) => c.code || c.name || "").filter(Boolean);
  if (!missing.length) {
    return { ok: true, missing: [], requiredCodes, imagedCodes };
  }
  const label = missing.map((m) => m.name || m.code || "角色").join("、");
  const primary = buildPrimaryBlock("batch_still", {
    stage: "prompt",
    userMessageOverride: `${label}还没有定妆图，双人镜会融成同一张脸；请先生成定妆再出静照`,
  });
  return {
    ok: false,
    code: "IMG-CREF-CHAR",
    missing: missing.map((m) => ({ code: m.code, name: m.name })),
    requiredCodes,
    imagedCodes,
    userMessage: primary.userMessage,
    ctaLabel: "去生成定妆",
    primaryNextStep: primary.primaryNextStep,
  };
}

/** Speakers from package shot narrative.dialogue.lines */
export function speakersFromShot(shot: Record<string, unknown> | null | undefined): string[] {
  if (!shot) return [];
  const lines =
    (shot.narrative as { dialogue?: { lines?: { speaker?: string }[] } } | undefined)?.dialogue?.lines ?? [];
  return [...new Set(lines.map((l) => String(l.speaker ?? "").trim()).filter(Boolean))];
}

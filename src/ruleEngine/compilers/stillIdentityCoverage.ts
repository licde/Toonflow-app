/**
 * Still multi-character identity coverage — casting sheet only (one face per CHAR).
 */
import { buildPrimaryBlock } from "./primaryBlock";
import type { BurnNextStep } from "./burnGateEnvelope";
import type { ComposeStillCharHint } from "./composeStillPrompt";
import { looksLikeSceneName } from "./hydrateComposeStillContext";
import { normalizeDialogueSpeaker, normalizeDialogueSpeakers } from "./normalizeDialogueSpeaker";
import { buildRequiredCast, isTrueDualCast } from "./castingSheet";

export interface StillIdentityChar {
  code?: string;
  name?: string;
  hasImage?: boolean;
  kind?: "character" | "scene";
}

export interface StillIdentityCoverageResult {
  ok: boolean;
  code?: "IMG-CREF-CHAR" | "IMG-CREF" | "DC-16";
  missing: Array<{ code?: string; name?: string }>;
  requiredCodes: string[];
  imagedCodes: string[];
  unmappedSpeakers?: string[];
  userMessage?: string;
  ctaLabel?: string;
  primaryNextStep?: BurnNextStep;
}

export function countRoleReferenceCredits(urls?: string[] | null): number {
  let n = 0;
  for (const u of urls ?? []) {
    const p = String(u ?? "").toLowerCase();
    if (!p.trim()) continue;
    if (/\/scene\/|scene-/.test(p) && !/\/role\/|\/character\/|char-/.test(p)) continue;
    if (/\/role\/|\/character\/|\/char\/|char-/.test(p)) n += 1;
  }
  return n;
}

export function charCrefCodesFromPrompt(codes?: string[] | null): string[] {
  return [...new Set((codes ?? []).map((c) => String(c).toUpperCase()).filter((c) => /^CHAR-/i.test(c)))];
}

export function applyLookCreditsForChars<T extends StillIdentityChar>(
  chars: T[],
  opts: { referenceUrls?: string[] | null; promptCrefCodes?: string[] | null },
): T[] {
  const roleCredits = countRoleReferenceCredits(opts.referenceUrls);
  const crefSet = new Set(charCrefCodesFromPrompt(opts.promptCrefCodes));
  let remainingRole = roleCredits;
  return chars.map((c) => {
    if (c.hasImage) return c;
    const code = (c.code || "").toUpperCase();
    if (code && crefSet.has(code)) {
      return { ...c, hasImage: true };
    }
    if (remainingRole > 0) {
      remainingRole -= 1;
      return { ...c, hasImage: true };
    }
    return c;
  });
}

/** Collect required characters from casting sheet — no description NER phantoms. */
export function collectRequiredStillChars(input: {
  characters?: StillIdentityChar[] | ComposeStillCharHint[] | null;
  dialogueSpeakers?: string[] | null;
  nameToCode?: Record<string, string> | null;
  refusePhantomNames?: boolean;
}): StillIdentityChar[] {
  const cast = buildRequiredCast({
    characters: input.characters as StillIdentityChar[],
    dialogueSpeakers: input.dialogueSpeakers,
    nameToCode: input.nameToCode,
    refusePhantomNames: input.refusePhantomNames !== false,
  });
  return cast.chars;
}

export function assertStillIdentityCoverage(input: {
  characters?: StillIdentityChar[] | ComposeStillCharHint[] | null;
  dialogueSpeakers?: string[] | null;
  referenceUrls?: string[] | null;
  promptCrefCodes?: string[] | null;
  nameToCode?: Record<string, string> | null;
  enforce?: boolean;
}): StillIdentityCoverageResult {
  if (input.enforce === false) {
    return { ok: true, missing: [], requiredCodes: [], imagedCodes: [] };
  }

  const cast = buildRequiredCast({
    characters: input.characters as StillIdentityChar[],
    dialogueSpeakers: input.dialogueSpeakers,
    nameToCode: input.nameToCode,
    refusePhantomNames: true,
  });

  if (cast.unmappedSpeakers.length) {
    const label = cast.unmappedSpeakers.join("、");
    const primary = buildPrimaryBlock("chat_repair", {
      stage: "prompt",
      userMessageOverride: `${label}不在定妆册（CD）中，请补 CHAR 码与人设后再出静照`,
    });
    return {
      ok: false,
      code: "DC-16",
      missing: cast.unmappedSpeakers.map((name) => ({ name })),
      requiredCodes: [],
      imagedCodes: [],
      unmappedSpeakers: cast.unmappedSpeakers,
      userMessage: primary.userMessage,
      ctaLabel: "去补人设",
      primaryNextStep: primary.primaryNextStep,
    };
  }

  let chars = cast.chars.filter((c) => c.code || c.name);
  // Dual gate only for true dual CHAR codes (casting sheet)
  if (!isTrueDualCast(chars) && chars.length < 2) {
    return {
      ok: true,
      missing: [],
      requiredCodes: chars.map((c) => c.code || c.name || "").filter(Boolean),
      imagedCodes: chars.filter((c) => c.hasImage).map((c) => c.code || c.name || "").filter(Boolean),
    };
  }
  // Single coded char + phantom-free: skip dual look gate when not true dual
  if (!isTrueDualCast(chars)) {
    return {
      ok: true,
      missing: [],
      requiredCodes: chars.map((c) => c.code || c.name || "").filter(Boolean),
      imagedCodes: chars.filter((c) => c.hasImage).map((c) => c.code || c.name || "").filter(Boolean),
    };
  }

  chars = applyLookCreditsForChars(chars, {
    referenceUrls: input.referenceUrls,
    promptCrefCodes: input.promptCrefCodes,
  });
  const missing = chars.filter((c) => c.code && /^CHAR-/i.test(c.code) && !c.hasImage);
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

export function speakersFromShot(shot: Record<string, unknown> | null | undefined): string[] {
  if (!shot) return [];
  const lines =
    (shot.narrative as { dialogue?: { lines?: { speaker?: string }[] } } | undefined)?.dialogue?.lines ?? [];
  return normalizeDialogueSpeakers(lines.map((l) => String(l.speaker ?? "").trim()).filter(Boolean));
}

export { normalizeDialogueSpeaker, normalizeDialogueSpeakers, looksLikeSceneName };

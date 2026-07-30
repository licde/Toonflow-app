/** Strip Chat/rule-engine vendor tokens (--cref/--sref/--ar) before Agnes API calls. */

import { normalizeAssetCodeLoose, normalizeAssetCodes } from "../codes/assetCodeContract";

export interface ParsedPromptRefs {
  crefs: string[];
  srefs: string[];
  aspectRatio?: string;
}

const CREF_RE = /--cref\s+([^\n]+?)(?=\s+--(?:sref|ar)\b|$)/gi;
const SREF_RE = /--sref\s+([^\n]+?)(?=\s+--(?:cref|ar)\b|$)/gi;
const CREF_BLOCK_RE = /--cref\s+((?:(?!--sref|--ar)\S+\s*)+)/gi;
const SREF_BLOCK_RE = /--sref\s+((?:(?!--cref|--ar)\S+\s*)+)/gi;
const AR_RE = /--ar\s+(\d+\s*:\s*\d+)/i;

function extractCodesFromBlock(block: string): string[] {
  const found: string[] = [];
  // Digit forms + semantic slugs (CHAR-QINGCI)
  const embedded =
    /(CHAR|SCENE|PROP|INF|P)[\s\-_]*0*\d+|(CHAR|SCENE|PROP)[-_][A-Za-z][A-Za-z0-9]*/gi;
  for (const m of block.matchAll(embedded)) found.push(m[0]);
  for (const tok of block.trim().split(/[,，、;/|]+/)) {
    const t = tok.trim();
    if (t && !t.startsWith("--") && /(CHAR|SCENE|PROP|INF|P)/i.test(t)) found.push(t);
  }
  return normalizeAssetCodes(found).filter((c) => normalizeAssetCodeLoose(c).includes("-"));
}

/**
 * AR SSOT: project.videoRatio always wins at vendor touch.
 * Strip residual --ar from prompt text; PURE-PROP may keep 1:1 via separate append.
 */
export function applyProjectAspectRatio(
  prompt: string,
  projectVideoRatio?: string | null,
  opts?: { pureProp?: boolean },
): TouchPromptResult {
  const touched = touchPromptForVendor(prompt, projectVideoRatio ?? undefined);
  if (opts?.pureProp && !touched.aspectRatio) {
    return { ...touched, aspectRatio: "1:1" };
  }
  return {
    ...touched,
    aspectRatio: resolveAspectRatio(projectVideoRatio ?? undefined, undefined),
  };
}

export function parsePromptRefs(prompt: string): ParsedPromptRefs {
  const crefs: string[] = [];
  const srefs: string[] = [];
  for (const m of prompt.matchAll(CREF_BLOCK_RE)) crefs.push(...extractCodesFromBlock(m[1]));
  if (!crefs.length) {
    for (const m of prompt.matchAll(CREF_RE)) crefs.push(...extractCodesFromBlock(m[1]));
  }
  for (const m of prompt.matchAll(SREF_BLOCK_RE)) srefs.push(...extractCodesFromBlock(m[1]));
  if (!srefs.length) {
    for (const m of prompt.matchAll(SREF_RE)) srefs.push(...extractCodesFromBlock(m[1]));
  }
  const arMatch = prompt.match(AR_RE);
  const aspectRatio = arMatch ? arMatch[1].replace(/\s/g, "") : undefined;
  return {
    crefs: [...new Set(crefs.map(normalizeAssetCodeLoose))],
    srefs: [...new Set(srefs.map(normalizeAssetCodeLoose))],
    aspectRatio,
  };
}

export function stripVendorTokens(prompt: string): string {
  return prompt
    .replace(/,?\s*--cref\s+(?:(?!--sref|--ar)\S+\s*)+/gi, "")
    .replace(/,?\s*--sref\s+(?:(?!--cref|--ar)\S+\s*)+/gi, "")
    .replace(/,?\s*--ar\s+\d+\s*:\s*\d+/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,\s*/g, ", ")
    .replace(/^,\s*/, "")
    .replace(/,\s*$/, "")
    .trim();
}

export interface TouchPromptResult {
  vendorPrompt: string;
  crefs: string[];
  srefs: string[];
  aspectRatio?: string;
}

export function resolveAspectRatio(projectRatio?: string, promptAr?: string): string | undefined {
  const project = projectRatio?.trim();
  if (project) return project.replace(/\s/g, "");
  return promptAr?.replace(/\s/g, "");
}

export function touchPromptForVendor(prompt: string, fallbackAspectRatio?: string): TouchPromptResult {
  const refs = parsePromptRefs(prompt);
  return {
    vendorPrompt: stripVendorTokens(prompt),
    crefs: refs.crefs,
    srefs: refs.srefs,
    aspectRatio: resolveAspectRatio(fallbackAspectRatio, refs.aspectRatio),
  };
}

export { normalizeAssetCodeLoose as normalizeCharCode };

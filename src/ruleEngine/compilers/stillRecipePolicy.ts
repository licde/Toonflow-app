/**
 * Still recipe policy SSOT — fixture-driven identity lock / continuity / egress self-heal.
 * Extend via still_recipe_policy.json — do not hardcode new if/else cases.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type EgressForbiddenPattern = {
  id: string;
  when?: "charCodeCount<2" | string;
  re: string;
  replaceWith?: "single" | string;
};

export type StillRecipePolicy = {
  version?: string;
  identityLock: {
    selectBy?: string;
    neverUseReferenceUrlCountForMulti?: boolean;
    single: string;
    multiChar: string;
    seatingIdentity: string;
    seatingSeatLock: string;
  };
  continuity: {
    maxChars: number;
    omitNeighborShotSize?: boolean;
    omitSoftRefPhrase?: boolean;
    ecuOmitEntirely?: boolean;
    ecuShotSizePattern?: string;
  };
  recipeLayerPrefixes?: string[];
  egressForbiddenPatterns: EgressForbiddenPattern[];
};

const FALLBACK: StillRecipePolicy = {
  version: "fallback",
  identityLock: {
    selectBy: "charCodeCount",
    neverUseReferenceUrlCountForMulti: true,
    single: "锁定角色定妆参考脸型，禁止重塑五官身份",
    multiChar: "锁定定妆脸型与身份，禁止按参考图拼贴成多格/拼图",
    seatingIdentity:
      "身份锁定：脸型来自角色定妆参考；姿态与家具以描写为准，场景参考只补背景木作/匾额，不得替换太师椅或蒲团",
    seatingSeatLock:
      "座次锁：场景参考仅作环境纹理，禁止把香案/供桌/站立礼佛仪式升为主构图；太师椅与蒲团必须按描写出现",
  },
  continuity: {
    maxChars: 40,
    omitNeighborShotSize: true,
    omitSoftRefPhrase: true,
    ecuOmitEntirely: true,
    ecuShotSizePattern: "ecu|extreme|大特|特写",
  },
  recipeLayerPrefixes: [
    "背景弱化",
    "景别：",
    "必须出现",
    "锁定角色",
    "严格锁定",
    "身份锁定",
    "座次锁",
    "权力位",
  ],
  egressForbiddenPatterns: [
    {
      id: "multi_lock_single_cref",
      when: "charCodeCount<2",
      re: "严格锁定多参考身份[^。；;]*[。；;]?",
      replaceWith: "single",
    },
    {
      id: "phantom_dual_face",
      when: "charCodeCount<2",
      re: "(?<![\\u4e00-\\u9fff])[\\u4e00-\\u9fff]{2,6}与[\\u4e00-\\u9fff]{2,6}不同脸[^。；;]*[。；;]?",
      replaceWith: "",
    },
    {
      id: "generic_mouth",
      re: "嘴部自然微张或闭合|目光交汇，嘴部自然微张[^。；;]*[。；;]?",
      replaceWith: "",
    },
  ],
};

export function loadStillRecipePolicy(): StillRecipePolicy {
  const raw = readFixtureJson<Partial<StillRecipePolicy>>("still_recipe_policy.json", FALLBACK);
  return {
    ...FALLBACK,
    ...raw,
    identityLock: { ...FALLBACK.identityLock, ...(raw.identityLock ?? {}) },
    continuity: { ...FALLBACK.continuity, ...(raw.continuity ?? {}) },
    recipeLayerPrefixes: raw.recipeLayerPrefixes?.length
      ? raw.recipeLayerPrefixes
      : FALLBACK.recipeLayerPrefixes,
    egressForbiddenPatterns: raw.egressForbiddenPatterns?.length
      ? raw.egressForbiddenPatterns
      : FALLBACK.egressForbiddenPatterns,
  };
}

/** Collapse duplicate recipe-layer sentences (keep last occurrence per prefix). */
export function dedupeRecipeLayerPrefixes(
  prompt: string,
  prefixes?: string[],
): { prompt: string; removed: number } {
  const prefs = prefixes?.length ? prefixes : loadStillRecipePolicy().recipeLayerPrefixes ?? [];
  let next = String(prompt ?? "");
  let removed = 0;
  for (const prefix of prefs) {
    const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`${esc}[^。；;\\n]*[。；;]?`, "g");
    const matches = next.match(re);
    if (!matches || matches.length < 2) continue;
    const keep = matches[matches.length - 1]!;
    let seen = 0;
    next = next.replace(re, () => {
      seen++;
      if (seen < matches.length) {
        removed++;
        return " ";
      }
      return keep;
    });
  }
  next = next.replace(/\s{2,}/g, " ").replace(/[。；;]\s*[。；;]+/g, "。").trim();
  return { prompt: next, removed };
}

/** Unique CHAR-* codes from prompt text. */
export function countCharCodesInPrompt(prompt: string): number {
  const found = String(prompt ?? "").match(/CHAR-[A-Z0-9]+/gi) ?? [];
  return new Set(found.map((c) => c.toUpperCase())).size;
}

export function isEcuShotSize(shotSize?: string | null, pattern?: string): boolean {
  const re = new RegExp(pattern || "ecu|extreme|大特|特写", "i");
  return re.test(String(shotSize ?? ""));
}

/** Apply continuity policy: omit on ECU, else truncate. */
export function applyContinuityPolicy(
  inject: string | null | undefined,
  shotSize: string | null | undefined,
  policy?: StillRecipePolicy,
): { text: string | null; omitted: boolean; truncated: boolean } {
  const p = policy ?? loadStillRecipePolicy();
  const raw = String(inject ?? "").trim();
  if (!raw) return { text: null, omitted: false, truncated: false };
  if (p.continuity.ecuOmitEntirely && isEcuShotSize(shotSize, p.continuity.ecuShotSizePattern)) {
    return { text: null, omitted: true, truncated: false };
  }
  const max = Math.max(8, Number(p.continuity.maxChars) || 40);
  if (raw.length <= max) return { text: raw, omitted: false, truncated: false };
  return { text: raw.slice(0, max), omitted: false, truncated: true };
}

export function pickIdentityLockLines(input: {
  charCodeCount: number;
  /** When true, emit single lock even if charCodeCount is 0 (name-only casting present). */
  hasCharacters?: boolean;
  seatingHard?: boolean;
  policy?: StillRecipePolicy;
}): { lines: string[]; mode: "none" | "single" | "multi" | "seating" } {
  const p = input.policy ?? loadStillRecipePolicy();
  if (input.seatingHard) {
    return {
      lines: [p.identityLock.seatingIdentity, p.identityLock.seatingSeatLock],
      mode: "seating",
    };
  }
  if (input.charCodeCount >= 2) {
    return { lines: [p.identityLock.multiChar], mode: "multi" };
  }
  if (input.charCodeCount >= 1 || input.hasCharacters) {
    return { lines: [p.identityLock.single], mode: "single" };
  }
  return { lines: [], mode: "none" };
}

export type RecipeHealResult = {
  prompt: string;
  healed: string[];
  changed: boolean;
  charCodeCount: number;
};

/**
 * Self-heal forbidden recipe phrases using policy patterns.
 * Only rewrites recipe sentences — does not touch literary body semantics beyond matched spans.
 */
export function healStillRecipePolicy(
  prompt: string,
  opts?: { charCodeCount?: number; policy?: StillRecipePolicy },
): RecipeHealResult {
  const policy = opts?.policy ?? loadStillRecipePolicy();
  const charCodeCount = opts?.charCodeCount ?? countCharCodesInPrompt(prompt);
  const healed: string[] = [];
  let next = String(prompt ?? "");

  for (const pat of policy.egressForbiddenPatterns) {
    if (pat.when === "charCodeCount<2" && charCodeCount >= 2) continue;
    let re: RegExp;
    try {
      re = new RegExp(pat.re, "gi");
    } catch {
      continue;
    }
    if (!re.test(next)) continue;
    re.lastIndex = 0;
    const replacement =
      pat.replaceWith === "single"
        ? `${policy.identityLock.single.replace(/[。；;]*$/, "")}。`
        : pat.replaceWith === undefined
          ? ""
          : String(pat.replaceWith);
    next = next.replace(re, replacement ? `${replacement}` : " ");
    healed.push(pat.id);
  }

  next = next
    .replace(/,\s*。/g, "。")
    .replace(/\s{2,}/g, " ")
    .replace(/[。；;]\s*[。；;]+/g, "。")
    .replace(/\s+([。；;,])/g, "$1")
    .trim();

  const deduped = dedupeRecipeLayerPrefixes(next, policy.recipeLayerPrefixes);
  if (deduped.removed) {
    next = deduped.prompt;
    healed.push(`recipe_layer_dedupe:${deduped.removed}`);
  }

  try {
    const { stripIdentityNoiseFromBody, dedupeNarrativeClauses } = require("./stillIdentitySsot") as typeof import("./stillIdentitySsot");
    const stripped = stripIdentityNoiseFromBody(next);
    if (stripped !== next) {
      next = stripped;
      healed.push("identity_noise_strip");
    }
    const dedupNar = dedupeNarrativeClauses(next);
    if (dedupNar !== next) {
      next = dedupNar;
      healed.push("narrative_clause_dedupe");
    }
  } catch {
    /* optional */
  }

  try {
    const { sanitizeFirstFrameEgressSoup } =
      require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
    const cleaned = sanitizeFirstFrameEgressSoup(next);
    if (cleaned !== next) {
      next = cleaned;
      healed.push("first_frame_soup_sanitize");
    }
  } catch {
    /* optional */
  }

  return {
    prompt: next,
    healed,
    changed: healed.length > 0,
    charCodeCount,
  };
}

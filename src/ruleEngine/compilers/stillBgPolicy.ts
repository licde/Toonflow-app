/**
 * Still background policy SSOT — composition/character first; SCENE refs demoted by default.
 */
import { extractDescPredicates, type DescPredicatePack } from "./extractDescPredicates";

export type StillBgPolicy = "drop" | "demote" | "keep";

export interface StillBgPolicyInput {
  description?: string | null;
  characterNames?: string[] | null;
  shotSize?: string | null;
  /** Precomputed pack; if omitted, extracted from description */
  pack?: DescPredicatePack | null;
  /** Explicit scene-establishing intent from shot metadata */
  sceneEstablishingHint?: boolean | null;
}

export interface StillBgPolicyResult {
  policy: StillBgPolicy;
  excludeScene: boolean;
  omitSrefToken: boolean;
  /** Soft Chinese guidance when demote/drop */
  bgGuidance?: string;
  reason: string;
  pack: DescPredicatePack;
  sceneEstablishing: boolean;
}

const ESTABLISHING_SHOT =
  /^(els|ws|ls|wide|establishing)$|全景|远景|大远景|建立镜头|establishing/i;

export function isSceneEstablishingShot(shotSize?: string | null): boolean {
  const s = String(shotSize ?? "").trim();
  if (!s) return false;
  return ESTABLISHING_SHOT.test(s);
}

/**
 * Resolve whether SCENE/--sref pixels and tokens should be kept.
 * seatingHard → drop; establishing + no action predicates → keep; else demote.
 */
export function resolveStillBgPolicy(input: StillBgPolicyInput): StillBgPolicyResult {
  const pack =
    input.pack ??
    extractDescPredicates({
      description: input.description,
      characterNames: input.characterNames,
    });
  const sceneEstablishing =
    Boolean(input.sceneEstablishingHint) ||
    (isSceneEstablishingShot(input.shotSize) && pack.predicates.length === 0);

  if (pack.hasSeatingOrKneel) {
    return {
      policy: "drop",
      excludeScene: true,
      omitSrefToken: true,
      bgGuidance: "背景弱化：浅景深虚化环境，禁止香案/供桌升为主构图",
      reason: "seatingHard",
      pack,
      sceneEstablishing: false,
    };
  }

  if (sceneEstablishing) {
    return {
      policy: "keep",
      excludeScene: false,
      omitSrefToken: false,
      reason: "sceneEstablishing",
      pack,
      sceneEstablishing: true,
    };
  }

  // Character-centric mid: keep soft readable interior (never grey-void / empty studio).
  // Scene pixels stay as weak --sref; altar must not become main composition.
  return {
    policy: "demote",
    excludeScene: false,
    omitSrefToken: false,
    bgGuidance:
      "背景弱化：浅景深，保留室内环境可辨（木作/墙面/烛光），禁止灰棚/纯色摄影棚空白背景，禁止香案升为主构图",
    reason: "characterCentric",
    pack,
    sceneEstablishing: false,
  };
}

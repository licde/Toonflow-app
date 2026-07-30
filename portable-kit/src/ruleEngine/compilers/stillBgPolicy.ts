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
 * seatingHard / face CU → drop; establishing + no action → keep; else demote.
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

  // Face CU / 侧脸特写：场景参考会把构图拉成殿内群像，必须丢 SCENE 像素
  const sz = String(input.shotSize ?? "");
  const desc = String(input.description ?? "");
  const faceCu =
    /特写|近景|ecu|\bcu\b/i.test(sz) ||
    (/特写|侧脸|正脸|面颊|咬唇|渗血/.test(desc) && !/全景|远景|中景对峙|双人同框/.test(desc));
  if (faceCu) {
    return {
      policy: "drop",
      excludeScene: true,
      omitSrefToken: true,
      // Homology with excludeScene: do not name temple/hall props that invite SCENE layout
      bgGuidance: "背景弱化：浅景深虚化环境，禁止环境抢特写构图，禁止群像",
      reason: "faceCuDropScene",
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

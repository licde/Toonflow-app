/**
 * Still background policy SSOT — composition/character first; SCENE refs demoted by default.
 * soft_env: drop establishing dominance but keep soft interior readable (via keepSoftEnvRef + guidance).
 */
import { extractDescPredicates, type DescPredicatePack } from "./extractDescPredicates";

export type StillBgPolicy = "drop" | "demote" | "keep";

export type StillBgMode = "keep_plate" | "soft_env" | "atmosphere_only";

export interface StillBgPolicyInput {
  description?: string | null;
  characterNames?: string[] | null;
  shotSize?: string | null;
  /** Precomputed pack; if omitted, extracted from description */
  pack?: DescPredicatePack | null;
  /** Explicit scene-establishing intent from shot metadata */
  sceneEstablishingHint?: boolean | null;
  /** Workflow has SCENE linked — enables soft_env plate retention */
  hasSceneLink?: boolean | null;
}

export type SoftEnvContinuity = "must" | "optional" | "none";

export interface StillBgPolicyResult {
  policy: StillBgPolicy;
  /** Modality bg mode (literary-led soft_env when SCENE linked) */
  bgMode: StillBgMode;
  excludeScene: boolean;
  /** Keep one soft env SCENE plate after identity when excludeScene */
  keepSoftEnvRef: boolean;
  /**
   * Continuity: when SCENE linked + soft_env, background must survive vendor refs
   * (own slot or bake into identity). Never naked-drop under prop budget.
   */
  softEnvContinuity: SoftEnvContinuity;
  omitSrefToken: boolean;
  /** Soft Chinese guidance when demote/drop */
  bgGuidance?: string;
  reason: string;
  pack: DescPredicatePack;
  sceneEstablishing: boolean;
}

function continuityOf(keepSoft: boolean, hasSceneLink: boolean): SoftEnvContinuity {
  if (keepSoft && hasSceneLink) return "must";
  if (keepSoft) return "optional";
  return "none";
}

const ESTABLISHING_SHOT =
  /^(els|ws|ls|wide|establishing)$|全景|远景|大远景|建立镜头|establishing/i;

export function isSceneEstablishingShot(shotSize?: string | null): boolean {
  const s = String(shotSize ?? "").trim();
  if (!s) return false;
  return ESTABLISHING_SHOT.test(s);
}

function softInteriorGuidance(desc: string, seating: boolean): string {
  const atm = /烛火|烛光|月光|暖光|冷光|夜色|灯火/.exec(desc)?.[0];
  if (seating) {
    return atm
      ? `背景弱化：浅景深虚化环境，保留${atm}氛围可辨，禁止香案/供桌升为主构图，禁止灰棚/纯色摄影棚空白背景`
      : "背景弱化：浅景深虚化环境，保留室内轮廓可辨，禁止香案/供桌升为主构图，禁止灰棚/纯色摄影棚空白背景";
  }
  return atm
    ? `背景弱化：浅景深虚化环境，保留${atm}氛围可辨，禁止灰棚/纯色摄影棚空白背景，禁止环境抢特写构图，禁止群像`
    : "背景弱化：浅景深虚化环境，保留室内轮廓可辨（墙面/木作），禁止灰棚/纯色摄影棚空白背景，禁止环境抢特写构图，禁止群像";
}

/**
 * Resolve whether SCENE/--sref pixels and tokens should be kept.
 * seatingHard / face CU → drop establishing + soft_env if SCENE linked; establishing + no action → keep; else demote.
 */
export function resolveStillBgPolicy(input: StillBgPolicyInput): StillBgPolicyResult {
  const pack =
    input.pack ??
    extractDescPredicates({
      description: input.description,
      characterNames: input.characterNames,
    });
  const hasSceneLink = Boolean(input.hasSceneLink);
  const sceneEstablishing =
    Boolean(input.sceneEstablishingHint) ||
    (isSceneEstablishingShot(input.shotSize) && pack.predicates.length === 0);

  if (pack.hasSeatingOrKneel) {
    const keepSoft = hasSceneLink;
    return {
      policy: "drop",
      bgMode: keepSoft ? "soft_env" : "atmosphere_only",
      excludeScene: true,
      keepSoftEnvRef: keepSoft,
      softEnvContinuity: continuityOf(keepSoft, hasSceneLink),
      omitSrefToken: !keepSoft,
      bgGuidance: softInteriorGuidance(String(input.description ?? ""), true),
      reason: "seatingHard",
      pack,
      sceneEstablishing: false,
    };
  }

  // Face CU / 侧脸特写：场景参考会把构图拉成殿内群像，必须丢 establishing 抢戏
  const sz = String(input.shotSize ?? "");
  const desc = String(input.description ?? "");
  const faceCu =
    /特写|近景|ecu|\bcu\b/i.test(sz) ||
    (/特写|侧脸|正脸|面颊|咬唇|渗血/.test(desc) && !/全景|远景|中景对峙|双人同框/.test(desc));
  if (faceCu) {
    const keepSoft = hasSceneLink;
    return {
      policy: "drop",
      bgMode: keepSoft ? "soft_env" : "atmosphere_only",
      excludeScene: true,
      keepSoftEnvRef: keepSoft,
      softEnvContinuity: continuityOf(keepSoft, hasSceneLink),
      omitSrefToken: !keepSoft,
      bgGuidance: softInteriorGuidance(desc, false),
      reason: "faceCuDropScene",
      pack,
      sceneEstablishing: false,
    };
  }

  if (sceneEstablishing) {
    return {
      policy: "keep",
      bgMode: "keep_plate",
      excludeScene: false,
      keepSoftEnvRef: false,
      softEnvContinuity: "none",
      omitSrefToken: false,
      reason: "sceneEstablishing",
      pack,
      sceneEstablishing: true,
    };
  }

  // Character-centric mid: keep soft readable interior (never grey-void / empty studio).
  return {
    policy: "demote",
    bgMode: hasSceneLink ? "soft_env" : "atmosphere_only",
    excludeScene: false,
    keepSoftEnvRef: hasSceneLink,
    softEnvContinuity: continuityOf(hasSceneLink, hasSceneLink),
    omitSrefToken: false,
    bgGuidance:
      "背景弱化：浅景深，保留室内环境可辨（木作/墙面/烛光），禁止灰棚/纯色摄影棚空白背景，禁止香案升为主构图",
    reason: "characterCentric",
    pack,
    sceneEstablishing: false,
  };
}

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
  /** Package shotDesign.cameraAnchor.bgBlur — soft rim, not establishing */
  bgBlur?: boolean | null;
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

function softInteriorGuidance(desc: string, seating: boolean, faceCuSoftEnv = false): string {
  const atm = /烛火|烛光|月光|暖光|冷光|夜色|灯火/.exec(desc)?.[0];
  // faceCu + soft_env: atmosphere rim, not "shallow DOF punch-out subject from sharp plate"
  if (faceCuSoftEnv) {
    return atm
      ? `背景氛围：保留${atm}与室内木作轮廓作软环境边（勿锐利建立镜头抢戏），主体融入殿内色温，禁止灰棚/纯色摄影棚空白背景，禁止群像`
      : "背景氛围：保留室内轮廓/木作作软环境边（勿锐利建立镜头抢戏），主体融入环境色温，禁止灰棚/纯色摄影棚空白背景，禁止群像";
  }
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
  // Shot-size wins: MS/WS/FS never faceCu from wound words alone (面颊浅痕 on mid action).
  const sz = String(input.shotSize ?? "");
  const desc = String(input.description ?? "");
  const midWide =
    /中景|全景|远景|大远景|中全景|\bms\b|\bws\b|\bfs\b|medium|wide|establishing/i.test(sz) ||
    /^(?:中景|全景|远景|大远景)/.test(desc.trim()) ||
    /中景[。，,]/.test(desc);
  const sizeIsCu = /特写|近景|大特|ecu|\bcu\b/i.test(sz);
  const faceCu =
    sizeIsCu ||
    (!midWide &&
      (/特写|侧脸|正脸|咬唇|渗血/.test(desc) || (/面颊/.test(desc) && /特写|近景/.test(desc))) &&
      !/全景|远景|中景对峙|双人同框|中景/.test(desc));
  // Face CU + explicit bgBlur: soft rim only — never treat as establishing keep_plate
  const bgBlur = Boolean(input.bgBlur);
  if (faceCu) {
    const keepSoft = hasSceneLink;
    return {
      policy: "drop",
      bgMode: keepSoft ? "soft_env" : "atmosphere_only",
      excludeScene: true,
      keepSoftEnvRef: keepSoft,
      softEnvContinuity: continuityOf(keepSoft, hasSceneLink),
      omitSrefToken: !keepSoft,
      bgGuidance: softInteriorGuidance(desc, false, keepSoft || bgBlur),
      reason: bgBlur ? "faceCuDropScene:bgBlur" : "faceCuDropScene",
      pack,
      sceneEstablishing: false,
    };
  }

  // bend / action_primary: scene-first — keep softEnv when SCENE linked; fragment is Should/ZH
  const bendOrAction =
    /弯腰|捡起|捡拾|俯身|触地捡/.test(desc) ||
    (/中景|近景/.test(desc) && /捡|拾/.test(desc));
  try {
    const { resolveBgFragment } =
      require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
    const frag = resolveBgFragment({ visualDescription: desc });
    if (frag.stripFullSecondary || bendOrAction) {
      let fragmentOverFull = false;
      try {
        const { isNoComfyNoKeyDoctrine } =
          require("../quality/literaryPrimaryEffects") as typeof import("../quality/literaryPrimaryEffects");
        fragmentOverFull = isNoComfyNoKeyDoctrine().fragmentOverFullSoftEnv;
      } catch {
        /* scene-first default */
      }
      // Scene-first: keep hall when linked; only drop when doctrine forces fragment-over-full without scene
      // LGIA: bgBlur===false → no shallow-DOF push; prefer skirt fragment / readable interior without Buddha dominance
      const noShallow = input.bgBlur === false;
      const keepHall = hasSceneLink && !fragmentOverFull && !noShallow;
      // bgBlur:false → atmosphere only; do not hang full SCENE softEnv (佛像/香案 risk)
      const softHallNoDof = hasSceneLink && noShallow;
      const dropHall = fragmentOverFull && !hasSceneLink;
      return {
        policy: "demote",
        bgMode: softHallNoDof
          ? "atmosphere_only"
          : keepHall
            ? "soft_env"
            : dropHall
              ? "atmosphere_only"
              : hasSceneLink
                ? "soft_env"
                : "atmosphere_only",
        excludeScene: false,
        keepSoftEnvRef: keepHall || (hasSceneLink && !fragmentOverFull && !noShallow),
        softEnvContinuity: continuityOf(keepHall || (hasSceneLink && !noShallow), hasSceneLink),
        omitSrefToken: !(keepHall || softHallNoDof || hasSceneLink),
        bgGuidance: noShallow
          ? keepHall || softHallNoDof || hasSceneLink
            ? "背景：主场景环境轮廓可辨（木作/烛光），禁止浅景深抢戏，禁止香案/佛像升为主构图；裙摆/衣角碎片优先，禁止次角完整正脸抢戏，禁止灰棚白棚"
            : "背景仅次角裙摆/衣角等碎片，禁止浅景深抢戏，禁止次角完整正脸或持道具抢戏；保留气氛轮廓可辨，禁止灰棚"
          : keepHall || hasSceneLink
            ? "背景：主场景浅景深虚化（殿内轮廓/烛光可辨），禁止灰棚白棚；裙摆/衣角可为加强虚化，禁止次角完整正脸抢戏"
            : "背景仅次角裙摆/衣角等碎片虚化浅景深，禁止次角完整正脸或持道具抢戏；保留气氛轮廓可辨，禁止灰棚",
        reason: noShallow
          ? bendOrAction
            ? "bend_action:bgBlur_false"
            : `bg_fragment:${frag.kind}:bgBlur_false`
          : keepHall || (hasSceneLink && !fragmentOverFull)
            ? bendOrAction
              ? "bend_action:keep_softEnv"
              : `bg_fragment:${frag.kind}:keep_softEnv`
            : bendOrAction && !frag.stripFullSecondary
              ? "bend_action:atmosphere"
              : dropHall
                ? `bg_fragment:${frag.kind}:over_softEnv`
                : `bg_fragment:${frag.kind}`,
        pack,
        sceneEstablishing: false,
      };
    }
  } catch {
    /* optional */
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

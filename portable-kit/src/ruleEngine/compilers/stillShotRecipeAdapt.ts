/**
 * Still recipe adaptation SSOT — recipe layers adapt to shot intent; never hard-stamp onto VD.
 * Mode detection delegates to classifyStillIntent (same kernel as dirty/family).
 */
import { stripCollidingRecipeLayers } from "./stillLiteraryIntentSsot";
import { classifyStillIntent } from "./stillIntentPolicy";

export type StillRecipeShotMode =
  | "hand_cu"
  | "prop_cu"
  | "os_vo"
  | "empty"
  | "ecu_face"
  | "face_or_scene";

export type StillRecipeAdapt = {
  mode: StillRecipeShotMode;
  /** Skip 权力位…正脸清晰 / 正脸可见 narrative */
  omitFacePowerBlocking: boolean;
  /** Skip 微表情 / 脸型 micro lines */
  omitFaceMicroExpression: boolean;
  /** Use hand/prop-safe HQ recipe instead of face-toward-camera */
  useNonFaceHqRecipe: boolean;
  /** Identity lock: hand/prop texture instead of 脸型 */
  useNonFaceIdentityLock: boolean;
  /** must-appear: only primary hand/prop actor + props, not full cast */
  limitMustAppearToPrimary: boolean;
  /** Skip mouth/lip recipe hardening */
  omitMouthLipGuard: boolean;
  /** Skip skeleton「正脸可见」synthesize */
  omitFaceSkeleton: boolean;
  /** Shared classifier class (observability) */
  intentClass?: string;
};

export function detectStillRecipeShotMode(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  picture?: string | null;
  videoDesc?: string | null;
  /** Predicate seating hard — forces non-hand */
  hasSeatingOrKneel?: boolean;
}): StillRecipeShotMode {
  return classifyStillIntent(input).recipeMode;
}

export function resolveStillRecipeAdapt(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  picture?: string | null;
  videoDesc?: string | null;
  hasSeatingOrKneel?: boolean;
}): StillRecipeAdapt {
  const cls = classifyStillIntent(input);
  let mode = cls.recipeMode;
  // Belt: seating predicate forces face_or_scene
  if ((input.hasSeatingOrKneel || cls.seating) && (mode === "hand_cu" || mode === "prop_cu")) {
    mode = "face_or_scene";
  }
  const nonFace =
    mode === "hand_cu" || mode === "prop_cu" || mode === "empty" || mode === "os_vo" || !cls.flags.allowFaceRecipe;
  return {
    mode,
    omitFacePowerBlocking: nonFace || mode === "ecu_face",
    omitFaceMicroExpression: nonFace,
    useNonFaceHqRecipe: nonFace,
    useNonFaceIdentityLock: mode === "hand_cu" || mode === "prop_cu",
    limitMustAppearToPrimary: mode === "hand_cu" || mode === "prop_cu" || mode === "empty",
    omitMouthLipGuard: mode === "hand_cu" || mode === "prop_cu" || mode === "empty" || mode === "os_vo",
    omitFaceSkeleton: nonFace,
    intentClass: cls.intentClass,
  };
}

export const HAND_CU_HQ_RECIPE =
  "竖屏9:16安全区构图，手部/道具主体清晰不裁切，浅景深背景虚化，高细节视频首帧；本镜只出手与道具细节，禁止同帧出人像头面部抢戏。";

export const HAND_CU_IDENTITY_LOCK = "锁定角色定妆手部/袖口/配饰纹理参考，禁止重塑手部身份细节。";

export const PROP_CU_HQ_RECIPE =
  "竖屏9:16安全区构图，道具主体清晰不裁切，浅景深，高细节视频首帧；本镜以物件为主，禁止硬加人像头面部抢戏。";

export { stripCollidingRecipeLayers };

/** Recipe layer prefixes — must not be written back into visualDescription. */
export function isRecipeLayerLine(line: string, prefixes?: string[]): boolean {
  const t = String(line ?? "").trim();
  if (!t) return false;
  const prefs = prefixes?.length
    ? prefixes
    : [
        "背景弱化",
        "景别：",
        "必须出现",
        "锁定角色",
        "严格锁定",
        "身份锁定",
        "座次锁",
        "权力位",
        "场面硬约束",
        "微表情",
        "竖屏9:16",
        "continuity:",
        "本镜只出手",
      ];
  return prefs.some((p) => t.startsWith(p) || t.includes(`。${p}`) || new RegExp(`(?:^|[。；;])\\s*${escapeRe(p)}`).test(t));
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strip recipe/adaptation layers from a blob — keep literary VD only. */
export function stripRecipeLayersFromText(text: string, prefixes?: string[]): string {
  const parts = String(text ?? "")
    .split(/[。；;\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const kept = parts.filter((p) => !isRecipeLayerLine(p, prefixes));
  return kept.join("。").replace(/。。+/g, "。").trim();
}

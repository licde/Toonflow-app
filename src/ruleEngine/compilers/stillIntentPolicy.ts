/**
 * Still Intent Classifier SSOT — one classify, full-chain policy.
 * Coverage = declared intentClasses + safe degrade for unknown (never infinite literary).
 */
import {
  hasExplicitHandCuMark,
  isCuShotSize,
  isMidWideShotSize,
  loadLiteraryIntentDoctrine,
  resolveActionPrimaryHit,
  resolveSeatingHardForProduction,
  type LiteraryIntentDoctrine,
} from "./stillLiteraryIntentSsot";
import type { StillRecipeShotMode } from "./stillShotRecipeAdapt";

export type StillIntentClass =
  | "seating_power_mid"
  | "action_primary_mid"
  | "confront_mid"
  | "ots_mid"
  | "reaction_mid"
  | "hand_cu_explicit"
  | "prop_cu"
  | "ecu_face"
  | "empty_or_os"
  | "ensemble"
  | "unknown";

export type StillIntentFlags = {
  peelContinuity: boolean;
  allowFaceRecipe: boolean;
  twoStageLayout: boolean;
  /** Weak still without design loss → re-out HQ, not chat_repair VD */
  primaryNextOnWeakStill: "batch_still" | "chat_repair";
};

export type StillIntentClassification = {
  intentClass: StillIntentClass;
  recipeMode: StillRecipeShotMode;
  layoutFamilyId?: string;
  seating: boolean;
  handCuExplicit: boolean;
  /** True dirty: explicit hand-CU framing + face cues same beat */
  dirtyHandEye: boolean;
  faceCuesPresent: boolean;
  highLow: { hasHigh: boolean; hasLow: boolean };
  flags: StillIntentFlags;
  confidence: "high" | "med" | "low";
  reasons: string[];
  /** Continuity/recipe-peeled literary blob used for framing decisions */
  framingText: string;
};

/** Spatial power cues — shared with resolveShotIdentityBinding (B6). */
export const POWER_HIGH_RE =
  /(?:端坐|太师椅|高位|上座|主位|坐于高|坐在高|高座|居高临下|俯视)/;
export const POWER_LOW_RE =
  /(?:跪[在地地]?|蒲团|低位|下跪|跪地|跪于|坐于低|坐在低|低头隐忍)/;

const FACE_CUE =
  /正脸|正脸清晰|正脸可见|正脸朝向|眼神|凝视|面容|面部|冷厉|冰冷犀利|眉|瞳|脸型|微表情|锁定脸型/;
const PROP_CU =
  /道具特写|物件特写|特写.{0,4}(玉简|玉佩|书信|信笺|刀|剑|杯|盏|烛|灯|戒指)|特写[^。]{0,8}(道具|物件)/;
const OS_VO = /（\s*OS\s*）|\bOS\b|画外|旁白|独白|VO\b|voice.?over/i;
const EMPTY_SHOT = /空镜|无人物|无人|环境空镜|only\s*env/i;
const ECU_FACE = /大特|ecu|extreme\s*close|面部特写|眼部特写|脸部特写/i;
const CONFRONT = /对峙|左右分立|相向而立|剑拔弩张|对视僵持/;
const OTS = /过肩|OTS|听者肩|over.?shoulder/i;
const REACTION = /反应镜|偏听者|reaction/i;
const HAND_CU_FRAMING = /手部特写|手部特(?!写)/;

/** Neighbor continuity must not legislate this shot's hand-CU framing.
 * Preserve literary atoms that appear AFTER the continuity clause (same line or next sentence).
 */
export function peelContinuityNoise(text: string): string {
  let t = String(text ?? "");
  // Keep seating/power atoms that were glued after a continuity span on the same physical line
  const salvage: string[] = [];
  const salvageRe =
    /(权力反差|太师椅|蒲团|端坐|跪于|跪低位|高坐|低跪|站位绑定|居高临下)/g;
  t = t.replace(/\bcontinuity\s*:([^\n]*)/gi, (_full, rest: string) => {
    const hits = String(rest).match(salvageRe);
    if (hits?.length) salvage.push(...hits);
    // Drop only the continues-from head; keep trailing clause after first 。；;
    const after = String(rest).split(/[。；;]/).slice(1).join("。").trim();
    return after ? ` ${after} ` : " ";
  });
  t = t.replace(/continues?\s+from([^\n]*)/gi, (_full, rest: string) => {
    const hits = String(rest).match(salvageRe);
    if (hits?.length) salvage.push(...hits);
    const after = String(rest).split(/[。；;]/).slice(1).join("。").trim();
    return after ? ` ${after} ` : " ";
  });
  t = t
    .replace(/承接上镜[^\n。；;]*/g, " ")
    .replace(/邻镜[^\n。；;]{0,40}/g, " ");
  if (salvage.length) {
    const uniq = [...new Set(salvage)];
    // Only re-append atoms not already present in remaining framing
    const missing = uniq.filter((a) => !t.includes(a));
    if (missing.length) t = `${t} ${missing.join("，")}`;
  }
  return t;
}

/** Strip recipe / forbid-face injects so prior compose tails don't false-classify. */
export function peelRecipeFaceNoise(text: string): string {
  return String(text ?? "")
    .replace(/禁止[^。；;\n]{0,48}(?:正脸|眼神|面部|面容|微表情|脸型)[^。；;\n]{0,24}/g, " ")
    .replace(/禁(?:硬加|同帧)[^。；;\n]{0,32}(?:正脸|人像头面部|面部)[^。；;\n]{0,16}/g, " ")
    .replace(/本镜只出手与道具[^。；;\n]{0,40}/g, " ")
    .replace(/本镜以物件为主[^。；;\n]{0,40}/g, " ")
    .replace(/权力位：[^。；;\n]*正脸[^。；;\n]*/g, " ")
    .replace(/竖屏9:16[^。；;\n]*正脸朝向镜头[^。；;\n]*/g, " ")
    .replace(/微表情落在锁定脸型上[^。；;\n]*/g, " ")
    .replace(/身份锁定：[^。；;\n]*/g, " ")
    .replace(/座次锁：[^。；;\n]*/g, " ")
    .replace(/严格锁定多参考身份[^。；;\n]*/g, " ")
    .replace(/出镜人数[：:][^。；;\n]*/g, " ");
}

export function peelFramingText(text: string): string {
  return peelRecipeFaceNoise(peelContinuityNoise(text)).replace(/\s{2,}/g, " ").trim();
}

type PolicyRow = {
  dirtyHandEye: boolean;
  allowFaceRecipe: boolean;
  twoStageLayout: boolean;
  primaryNextOnWeakStill: "batch_still" | "chat_repair";
  recipeMode?: StillRecipeShotMode;
};

const DEFAULT_MATRIX: Record<StillIntentClass, PolicyRow> = {
  seating_power_mid: {
    dirtyHandEye: false,
    allowFaceRecipe: true,
    twoStageLayout: true,
    primaryNextOnWeakStill: "batch_still",
    recipeMode: "face_or_scene",
  },
  action_primary_mid: {
    dirtyHandEye: false,
    allowFaceRecipe: true,
    twoStageLayout: false,
    primaryNextOnWeakStill: "batch_still",
    recipeMode: "face_or_scene",
  },
  confront_mid: {
    dirtyHandEye: false,
    allowFaceRecipe: true,
    twoStageLayout: true,
    primaryNextOnWeakStill: "batch_still",
    recipeMode: "face_or_scene",
  },
  ots_mid: {
    dirtyHandEye: false,
    allowFaceRecipe: true,
    twoStageLayout: true,
    primaryNextOnWeakStill: "batch_still",
    recipeMode: "face_or_scene",
  },
  reaction_mid: {
    dirtyHandEye: false,
    allowFaceRecipe: true,
    twoStageLayout: true,
    primaryNextOnWeakStill: "batch_still",
    recipeMode: "face_or_scene",
  },
  hand_cu_explicit: {
    dirtyHandEye: true, // only when face also present — applied below
    allowFaceRecipe: false,
    twoStageLayout: false,
    primaryNextOnWeakStill: "chat_repair",
    recipeMode: "hand_cu",
  },
  prop_cu: {
    dirtyHandEye: false,
    allowFaceRecipe: false,
    twoStageLayout: false,
    primaryNextOnWeakStill: "batch_still",
    recipeMode: "prop_cu",
  },
  ecu_face: {
    dirtyHandEye: false,
    allowFaceRecipe: true,
    twoStageLayout: false,
    primaryNextOnWeakStill: "batch_still",
    recipeMode: "ecu_face",
  },
  empty_or_os: {
    dirtyHandEye: false,
    allowFaceRecipe: false,
    twoStageLayout: false,
    primaryNextOnWeakStill: "batch_still",
    recipeMode: "empty",
  },
  ensemble: {
    dirtyHandEye: false,
    allowFaceRecipe: true,
    twoStageLayout: false,
    primaryNextOnWeakStill: "batch_still",
    recipeMode: "face_or_scene",
  },
  unknown: {
    dirtyHandEye: false,
    allowFaceRecipe: true,
    twoStageLayout: false,
    primaryNextOnWeakStill: "batch_still",
    recipeMode: "face_or_scene",
  },
};

function loadMatrix(doctrine?: LiteraryIntentDoctrine): Record<StillIntentClass, PolicyRow> {
  const extra = (doctrine as { intentPolicyMatrix?: Partial<Record<StillIntentClass, Partial<PolicyRow>>> } | undefined)
    ?.intentPolicyMatrix;
  if (!extra) return { ...DEFAULT_MATRIX };
  const out = { ...DEFAULT_MATRIX };
  for (const key of Object.keys(extra) as StillIntentClass[]) {
    out[key] = { ...out[key], ...extra[key] };
  }
  return out;
}

const ECU_MOUTH =
  /唇部特写|咬唇|紧咬下唇|lip_bite|渗出血珠|口鼻特写|大特写.?唇|局部特写.?唇/i;

function deriveRecipeMode(
  framing: string,
  seating: boolean,
  handCuExplicit: boolean,
  shotSize?: string | null,
  doctrine?: LiteraryIntentDoctrine,
): StillRecipeShotMode {
  if (EMPTY_SHOT.test(framing)) return "empty";
  if (OS_VO.test(framing) && !handCuExplicit) return "os_vo";
  // Oral / lips insert before mid-wide seating collapse
  if (ECU_MOUTH.test(framing) && !/弯腰|捡起|休书/.test(framing)) return "ecu_mouth";
  if (seating || isMidWideShotSize(shotSize, doctrine)) {
    if (ECU_FACE.test(framing) && !seating) return "ecu_face";
    return "face_or_scene";
  }
  if (handCuExplicit) return "hand_cu";
  if (PROP_CU.test(framing)) return "prop_cu";
  if (ECU_FACE.test(framing)) return "ecu_face";
  if (isCuShotSize(shotSize, doctrine) && handCuExplicit) return "hand_cu";
  if (isCuShotSize(shotSize, doctrine) && ECU_MOUTH.test(framing)) return "ecu_mouth";
  return "face_or_scene";
}

function pickIntentClass(input: {
  framing: string;
  seating: boolean;
  handCuExplicit: boolean;
  recipeMode: StillRecipeShotMode;
  characterCount?: number;
  castNames?: string[] | null;
  extraLexicon?: string[] | null;
}): { intentClass: StillIntentClass; confidence: "high" | "med" | "low"; reasons: string[] } {
  const reasons: string[] = [];
  const n = Math.max(0, input.characterCount ?? 0);

  if (input.recipeMode === "empty" || input.recipeMode === "os_vo") {
    reasons.push("empty_or_os");
    return { intentClass: "empty_or_os", confidence: "high", reasons };
  }
  if (input.recipeMode === "hand_cu" || (input.handCuExplicit && !input.seating)) {
    reasons.push("hand_cu_explicit");
    return { intentClass: "hand_cu_explicit", confidence: "high", reasons };
  }
  if (input.recipeMode === "prop_cu") {
    reasons.push("prop_cu");
    return { intentClass: "prop_cu", confidence: "high", reasons };
  }
  if (input.recipeMode === "ecu_mouth") {
    reasons.push("ecu_mouth");
    return { intentClass: "ecu_face", confidence: "high", reasons };
  }
  // True seating (furniture / power signals) wins over action extract
  if (input.seating) {
    reasons.push("seating_power");
    return { intentClass: "seating_power_mid", confidence: "high", reasons };
  }
  // Declared VD/script actions (seed + novel extract + episode lexicon); no StageA
  const ap = resolveActionPrimaryHit({
    text: input.framing,
    castNames: input.castNames,
    hasSeatingOrKneel: false,
    extraLexicon: input.extraLexicon,
  });
  if (ap.hit) {
    reasons.push("action_primary", ...ap.sources.map((s) => `ap:${s}`));
    return { intentClass: "action_primary_mid", confidence: "high", reasons };
  }
  if (CONFRONT.test(input.framing) && n >= 2) {
    reasons.push("confront");
    return { intentClass: "confront_mid", confidence: "med", reasons };
  }
  if (OTS.test(input.framing) && n >= 2) {
    reasons.push("ots");
    return { intentClass: "ots_mid", confidence: "med", reasons };
  }
  if (REACTION.test(input.framing) && n >= 1) {
    reasons.push("reaction");
    return { intentClass: "reaction_mid", confidence: "med", reasons };
  }
  if (input.recipeMode === "ecu_face") {
    reasons.push("ecu_face");
    return { intentClass: "ecu_face", confidence: "high", reasons };
  }
  if (n >= 4) {
    reasons.push("ensemble");
    return { intentClass: "ensemble", confidence: "med", reasons };
  }
  reasons.push("unknown_safe_degrade");
  return { intentClass: "unknown", confidence: "low", reasons };
}

/**
 * Classify still literary intent → policy for dirty / recipe / family / firstframe.
 */
export function classifyStillIntent(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  picture?: string | null;
  videoDesc?: string | null;
  hasSeatingOrKneel?: boolean;
  characterCount?: number;
  /** Cast names — improves VD name-adjacent action extract */
  characterNames?: string[] | null;
  /** Sibling / episode VDs — harvest lexicon only; current shot must still declare the verb */
  episodeVisualDescriptions?: Array<string | null | undefined> | null;
  /** Extra blob (e.g. composed prompt tail) — peeled with VD for dirty check */
  promptBlob?: string | null;
}): StillIntentClassification {
  const doctrine = loadLiteraryIntentDoctrine();
  const matrix = loadMatrix(doctrine);
  const rawBlob = [
    String(input.visualDescription ?? ""),
    String(input.picture ?? ""),
    String(input.videoDesc ?? ""),
    String(input.shotSize ?? ""),
    String(input.promptBlob ?? ""),
  ]
    .filter(Boolean)
    .join("\n");
  const framing = peelFramingText(rawBlob);

  const seating = resolveSeatingHardForProduction({
    text: framing,
    hasSeatingOrKneelPack: input.hasSeatingOrKneel === true,
    doctrine,
  });
  const handCuExplicit = hasExplicitHandCuMark(framing, doctrine);
  const faceCuesPresent = FACE_CUE.test(framing);
  const recipeMode = deriveRecipeMode(framing, seating, handCuExplicit, input.shotSize, doctrine);

  const castNames = (input.characterNames ?? []).filter(Boolean);
  let extraLexicon: string[] = [];
  if (input.episodeVisualDescriptions?.length) {
    try {
      const { harvestActionLexiconFromEpisode } =
        require("./stillActionPrimarySsot") as typeof import("./stillActionPrimarySsot");
      extraLexicon = harvestActionLexiconFromEpisode(input.episodeVisualDescriptions, {
        castNames,
        doctrine,
      });
    } catch {
      /* optional */
    }
  }
  const picked = pickIntentClass({
    framing,
    seating,
    handCuExplicit,
    recipeMode,
    characterCount: input.characterCount,
    castNames,
    extraLexicon,
  });
  const row = matrix[picked.intentClass] ?? matrix.unknown;

  // Dirty only when explicit hand-CU framing + face, and not seating/confront mid without 手部特写
  let dirtyHandEye = false;
  if (picked.intentClass === "hand_cu_explicit" || recipeMode === "hand_cu" || recipeMode === "prop_cu") {
    dirtyHandEye = handCuExplicit && faceCuesPresent;
  } else if (
    picked.intentClass === "seating_power_mid" ||
    picked.intentClass === "confront_mid" ||
    (recipeMode === "face_or_scene" && seating)
  ) {
    // Mid seating: only dirty if shot itself declares 手部特写 (not 扳指动作)
    dirtyHandEye = HAND_CU_FRAMING.test(framing) && faceCuesPresent;
  } else {
    dirtyHandEye = handCuExplicit && faceCuesPresent;
  }
  // Policy row can force dirtyHandEye false for seating classes
  if (!row.dirtyHandEye && picked.intentClass !== "hand_cu_explicit") {
    if (picked.intentClass === "seating_power_mid" || picked.intentClass === "confront_mid") {
      dirtyHandEye = HAND_CU_FRAMING.test(framing) && faceCuesPresent;
    }
  }

  let layoutFamilyId: string | undefined;
  try {
    const { selectLayoutFamily } = require("../qc/stillCompositionSpec") as typeof import("../qc/stillCompositionSpec");
    const fam = selectLayoutFamily({
      visualDescription: framing,
      shotSize: input.shotSize,
      characterCount: Math.max(1, input.characterCount ?? (seating ? 2 : 1)),
      hasSeatingOrKneel: seating && picked.intentClass === "seating_power_mid",
      recipeMode: row.recipeMode ?? recipeMode,
      intentSeating: seating && picked.intentClass === "seating_power_mid",
      intentRecipeMode: row.recipeMode ?? recipeMode,
    });
    layoutFamilyId = fam.familyId;
  } catch {
    /* optional bridge */
  }

  return {
    intentClass: picked.intentClass,
    // empty_or_os may be empty OR os_vo — keep derived mode
    recipeMode:
      picked.intentClass === "empty_or_os" ? recipeMode : (row.recipeMode ?? recipeMode),
    layoutFamilyId,
    seating: seating && picked.intentClass !== "action_primary_mid",
    handCuExplicit,
    dirtyHandEye,
    faceCuesPresent,
    highLow: {
      hasHigh: POWER_HIGH_RE.test(framing),
      hasLow: POWER_LOW_RE.test(framing),
    },
    flags: {
      peelContinuity: true,
      allowFaceRecipe: row.allowFaceRecipe,
      twoStageLayout: row.twoStageLayout,
      primaryNextOnWeakStill: row.primaryNextOnWeakStill,
    },
    confidence: picked.confidence,
    reasons: picked.reasons,
    framingText: framing,
  };
}

/** Convenience: dirty hand+eye from shared classifier. */
export function isDirtyHandEyeIntent(text: string): boolean {
  return classifyStillIntent({ visualDescription: text, promptBlob: text }).dirtyHandEye;
}

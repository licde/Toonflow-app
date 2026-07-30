/**
 * Still Composition Spec — LayoutFamily selection + binding templates.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import type { StillRecipeShotMode } from "../compilers/stillShotRecipeAdapt";

export type SpatialRole =
  | "center"
  | "high"
  | "low"
  | "left"
  | "right"
  | "fg_shoulder"
  | "bg_face"
  | "favor_listener"
  | "soft_speaker"
  | "witness"
  | "outlier"
  | "pair_left"
  | "pair_right";

export type LayoutFamilyId =
  | "insert_hand_or_prop"
  | "establishing_empty"
  | "ensemble_4plus"
  | "high_sit_low_kneel_2p"
  | "power_triangle_3p"
  | "two_plus_one_3p"
  | "ots_2p"
  | "reaction_favor_2p"
  | "confront_lr_2p"
  | "single_throne_sit"
  | "single_kneel"
  | "single_hero"
  | "none";

export interface LayoutFamilyDef {
  minCast?: number;
  maxCast?: number;
  twoStage?: boolean;
  spatialRoles?: SpatialRole[];
  templateId?: string | null;
  furnitureAnchors?: string[];
  bindingTemplate?: string | null;
}

export interface StillCompositionSpec {
  version?: string;
  freeze?: {
    neverNerInventCast?: boolean;
    neverWriteLayoutToVd?: boolean;
    familyFailNotDesignExit?: boolean;
    familyFailDesignExitSeverity?: "WARN" | "BLOCK" | "OFF";
    familyFailNote?: string;
    poseProviderTemplateOnly?: boolean;
  };
  selectionPriority?: string[];
  conflictResolve?: string[];
  signals?: Record<string, string[]>;
  families?: Record<string, LayoutFamilyDef>;
  bindingTemplates?: Record<string, string>;
  refBudget?: Record<string, number>;
  repairByFamily?: Record<string, Record<string, string>>;
  castCardinalityLineTemplate?: string;
  castCardinalityEmptyTemplate?: string;
}

const FALLBACK: StillCompositionSpec = {
  version: "1.0.0",
  selectionPriority: [
    "insert_hand_or_prop",
    "establishing_empty",
    "ensemble_4plus",
    "high_sit_low_kneel_2p",
    "power_triangle_3p",
    "confront_lr_2p",
    "single_throne_sit",
    "single_kneel",
    "single_hero",
  ],
  families: {
    none: { twoStage: false, minCast: 0, maxCast: 99 },
    high_sit_low_kneel_2p: {
      minCast: 2,
      maxCast: 2,
      twoStage: true,
      spatialRoles: ["high", "low"],
      templateId: "high_sit_low_kneel_2p",
      bindingTemplate: "seating_high_low",
    },
  },
  castCardinalityLineTemplate:
    "出镜人数：仅{N}人（{NAMES}）；禁止第{Nplus1}人、路人、群像、重复分身。",
  castCardinalityEmptyTemplate: "出镜人数：0人；禁止人物主体抢戏。",
};

let cached: StillCompositionSpec | null = null;

export function loadStillCompositionSpec(): StillCompositionSpec {
  if (cached) return cached;
  cached = {
    ...FALLBACK,
    ...readFixtureJson<Partial<StillCompositionSpec>>("still_composition_spec.json", {}),
    families: {
      ...FALLBACK.families,
      ...readFixtureJson<Partial<StillCompositionSpec>>("still_composition_spec.json", {}).families,
    },
  };
  return cached;
}

export function resetStillCompositionSpecCache(): void {
  cached = null;
}

function hitSignal(blob: string, patterns: string[] | undefined): boolean {
  if (!patterns?.length) return false;
  return patterns.some((p) => {
    try {
      return new RegExp(p, "i").test(blob);
    } catch {
      return blob.includes(p);
    }
  });
}

export function selectLayoutFamily(input: {
  visualDescription?: string | null;
  shotSize?: string | null;
  characterCount: number;
  hasSeatingOrKneel?: boolean;
  recipeMode?: StillRecipeShotMode | null;
  /** When set, prefer classifier seating / recipe (same kernel as dirty). */
  intentSeating?: boolean;
  intentRecipeMode?: StillRecipeShotMode | null;
  /** Cast names for action-primary homology (optional). */
  characterNames?: string[] | null;
}): { familyId: LayoutFamilyId; family: LayoutFamilyDef; reason: string } {
  const spec = loadStillCompositionSpec();
  let blob = `${input.visualDescription ?? ""}\n${input.shotSize ?? ""}`;
  try {
    const { peelFramingText } = require("../compilers/stillIntentPolicy") as typeof import("../compilers/stillIntentPolicy");
    blob = `${peelFramingText(String(input.visualDescription ?? ""))}\n${input.shotSize ?? ""}`;
  } catch {
    /* optional */
  }
  const n = Math.max(0, input.characterCount | 0);
  const sig = spec.signals ?? {};
  const seating =
    input.intentSeating === true ||
    input.hasSeatingOrKneel === true ||
    hitSignal(blob, sig.seatingHard);
  const recipe = input.intentRecipeMode ?? input.recipeMode;

  if (recipe === "hand_cu" || recipe === "prop_cu" || hitSignal(blob, sig.insert)) {
    return {
      familyId: "insert_hand_or_prop",
      family: spec.families!.insert_hand_or_prop!,
      reason: "recipe_insert",
    };
  }
  if (recipe === "empty" || recipe === "os_vo" || hitSignal(blob, sig.empty)) {
    return {
      familyId: "establishing_empty",
      family: spec.families!.establishing_empty!,
      reason: "empty_or_os",
    };
  }
  // Action mid from VD-declared verbs (seed + novel extract) — never StageA throne
  {
    try {
      const { resolveActionPrimaryHit } =
        require("../compilers/stillActionPrimarySsot") as typeof import("../compilers/stillActionPrimarySsot");
      const ap = resolveActionPrimaryHit({
        text: blob,
        castNames: input.characterNames,
        hasSeatingOrKneel: seating && /端坐|太师椅|蒲团|跪于|权力反差/.test(blob),
      });
      if (ap.hit) {
        return {
          familyId: "none",
          family: spec.families!.none ?? { twoStage: false },
          reason: "action_primary_no_layout",
        };
      }
    } catch {
      const actionMid =
        /弯腰|捡|捏|指节|持|递|抽|撕|咬|刺|抄书|起身|推门|开门|摔杯|拍案|掩面|拭泪|转身|拦|追|泼|攥|掀|拂袖/.test(
          blob,
        );
      const hardFurniture =
        /端坐|太师椅|蒲团|跪于|跪低位|高坐|低跪|权力反差/.test(blob) ||
        (/高位/.test(blob) && /低位/.test(blob));
      if (actionMid && !hardFurniture) {
        return {
          familyId: "none",
          family: spec.families!.none ?? { twoStage: false },
          reason: "action_primary_no_layout",
        };
      }
    }
  }
  // Face CU × multi-cast: never grab 3p/2p families — compose reverses to split_shot
  try {
    const { resolveFaceCuFraming } =
      require("../design/detectCuCastConflict") as typeof import("../design/detectCuCastConflict");
    const fr = resolveFaceCuFraming({
      shotSize: input.shotSize,
      visualDescription: input.visualDescription ?? blob,
      prompt: blob,
    });
    if (n >= 2 && (recipe === "ecu_face" || fr.faceCu)) {
      return {
        familyId: "none",
        family: spec.families!.none ?? { twoStage: false },
        reason: "cu_cast_conflict",
      };
    }
  } catch {
    try {
      const { isCuShotSize } =
        require("../compilers/stillLiteraryIntentSsot") as typeof import("../compilers/stillLiteraryIntentSsot");
      if (n >= 2 && (recipe === "ecu_face" || isCuShotSize(input.shotSize))) {
        return {
          familyId: "none",
          family: spec.families!.none ?? { twoStage: false },
          reason: "cu_cast_conflict",
        };
      }
    } catch {
      /* optional */
    }
  }

  if (n >= 4) {
    return {
      familyId: "ensemble_4plus",
      family: spec.families!.ensemble_4plus!,
      reason: "cast_ge_4",
    };
  }
  // Fight / martial mid — never throne StageA (declare action verbs)
  if (
    !seating &&
    /斩|砍|挥剑|格挡|闪避|对打|交手|武打|厮杀/.test(blob)
  ) {
    return {
      familyId: "none",
      family: spec.families!.none ?? { twoStage: false },
      reason: "fight_action_no_layout",
    };
  }
  if (seating && n >= 2 && /端坐|太师椅/.test(blob) && /跪|蒲团/.test(blob)) {
    return {
      familyId: "high_sit_low_kneel_2p",
      family: spec.families!.high_sit_low_kneel_2p!,
      reason: "seating_hard_2p",
    };
  }
  if (n >= 3) {
    // Only explicit witness → triangle; bare N=3 must NOT auto StageA (三人对话误套)
    if (hitSignal(blob, sig.witness)) {
      return {
        familyId: "power_triangle_3p",
        family: spec.families!.power_triangle_3p!,
        reason: "witness_3p",
      };
    }
    if (seating) {
      return {
        familyId: "two_plus_one_3p",
        family: spec.families!.two_plus_one_3p!,
        reason: "seating_cast_3",
      };
    }
  }
  if (n >= 2 && hitSignal(blob, sig.ots)) {
    return { familyId: "ots_2p", family: spec.families!.ots_2p!, reason: "ots" };
  }
  if (n >= 2 && hitSignal(blob, sig.reaction)) {
    return {
      familyId: "reaction_favor_2p",
      family: spec.families!.reaction_favor_2p!,
      reason: "reaction",
    };
  }
  if (n >= 2 && hitSignal(blob, sig.confront) && !seating) {
    return {
      familyId: "confront_lr_2p",
      family: spec.families!.confront_lr_2p!,
      reason: "confront",
    };
  }
  if (n === 1 && /端坐|太师椅/.test(blob) && !/跪/.test(blob)) {
    return {
      familyId: "single_throne_sit",
      family: spec.families!.single_throne_sit!,
      reason: "single_sit",
    };
  }
  if (n === 1 && /跪|蒲团/.test(blob)) {
    return {
      familyId: "single_kneel",
      family: spec.families!.single_kneel!,
      reason: "single_kneel",
    };
  }
  if (n === 1 || recipe === "ecu_face") {
    return {
      familyId: "single_hero",
      family: spec.families!.single_hero!,
      reason: "single_hero",
    };
  }
  if (seating && n >= 2) {
    return {
      familyId: "high_sit_low_kneel_2p",
      family: spec.families!.high_sit_low_kneel_2p!,
      reason: "seating_fallback_2p",
    };
  }
  return {
    familyId: "none",
    family: spec.families!.none ?? { twoStage: false },
    reason: "none",
  };
}

export function formatFamilyBindingLine(input: {
  familyId: LayoutFamilyId;
  names: string[];
  /** 1-based ordinals for cref slots after optional layout anchor */
  crefOrdinals: number[];
}): string | undefined {
  const spec = loadStillCompositionSpec();
  const fam = spec.families?.[input.familyId];
  const key = fam?.bindingTemplate;
  if (!key) return undefined;
  let tpl = spec.bindingTemplates?.[key];
  if (!tpl) return undefined;
  const names = input.names;
  const ords = input.crefOrdinals;
  tpl = tpl
    .replace(/\{(\d+)\}/g, (_, i) => names[Number(i)] ?? "")
    .replace(/\{ord(\d+)\}/g, (_, i) => String(ords[Number(i)] ?? Number(i) + 1));
  return tpl;
}

export function buildCastLineFromCompositionSpec(names: string[]): string {
  const spec = loadStillCompositionSpec();
  const unique = [...new Set(names.map((n) => String(n ?? "").trim()).filter((n) => n.length >= 2))];
  if (!unique.length) return spec.castCardinalityEmptyTemplate ?? "";
  const n = unique.length;
  const tpl =
    spec.castCardinalityLineTemplate ??
    FALLBACK.castCardinalityLineTemplate!;
  return tpl
    .replace(/\{N\}/g, String(n))
    .replace(/\{Nplus1\}/g, String(n + 1))
    .replace(/\{NAMES\}/g, unique.join("、"));
}

export function resolveRepairAction(input: {
  familyId?: string | null;
  failClass: "seatMissing" | "castOvercrowd" | "wrongFamily" | "faceBlend";
}): "swap" | "preserve" | "focus" | "regen" {
  const spec = loadStillCompositionSpec();
  const byFam = spec.repairByFamily?.[input.familyId ?? ""] ?? {};
  const def = spec.repairByFamily?.default ?? {};
  const raw = byFam[input.failClass] ?? def[input.failClass] ?? "focus";
  if (raw === "swap" || raw === "preserve" || raw === "focus" || raw === "regen") return raw;
  return "focus";
}

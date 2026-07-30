import { normalizeCharacterDesignInBundle } from "./normalizeCharacterDesign";
import { normalizeDeepAdaptationInBundle } from "./normalizeDeepAdaptation";
import { normalizeDesignBriefInBundle } from "./normalizeDesignBrief";
import { runFrostShapeSalvage } from "./frostShapeSalvage";
import type { ShapeSalvageLog } from "./shapeSalvageTypes";

export interface ShapeRegistryEntry {
  id: string;
  description: string;
  paths: string[];
}

/** Canonical registry — new shape variants add one entry here. */
export const SHAPE_REGISTRY: ShapeRegistryEntry[] = [
  { id: "SH-NULL", description: "Leaf null → omit", paths: ["*"] },
  { id: "SH-SHOT-NUM", description: "Shot numeric string coerce", paths: ["preDesignPack.shots[].shotIndex|duration|emotion"] },
  { id: "SH-MAPS", description: "deepAdaptation maps → [{from,to}]", paths: ["planData.adaptationMatrixStructured.deepAdaptation.*Map"] },
  { id: "SH-B16", description: "B16 record mirror from nameMap", paths: ["designBrief.B16"] },
  { id: "SY-ARROW-OBJ", description: "Illegal arrow pseudo-object in maps JSON", paths: ["*.nameMap|relationMap|substitutions"] },
  { id: "SH-B5-PAYOFF", description: "payoffEp semantic string → payoffLabel", paths: ["designBrief.B5[]", "designBrief.infoLinkageChain[]"] },
  { id: "SH-B12-BEATS", description: "B12.beats numeric string→number; narrative→summary+default beats", paths: ["designBrief.B12[].beats"] },
  { id: "SH-B4-NUM", description: "B4/emotionCurveOutline numeric strings", paths: ["designBrief.B4[]", "designBrief.emotionCurveOutline[]"] },
  { id: "SH-GEN-NULL", description: "generation slot null → omit", paths: ["preDesignPack.shots[].generation.*"] },
  { id: "SH-META-NUM", description: "meta episodeIndex etc string → number", paths: ["meta.episodeIndex|projectId|scriptId"] },
  { id: "SH-L6-VARIANTS", description: "L6.stateVariants record → [{name,visual}]", paths: ["characterDesign.assets[].L6.stateVariants"] },
  { id: "SH-B20", description: "B20 object[] → infoId string[]", paths: ["designBrief.B20"] },
  { id: "SH-B23", description: "B23 array → {retentionInfoDelivery,items}", paths: ["designBrief.B23"] },
  { id: "SH-CD-LKEYS", description: "L0_identity→L0 / L6_arcVisual→L6", paths: ["characterDesign.assets[].L*"] },
  { id: "SH-SHOT-SPATIAL", description: "shot.spatialRelation B13-object→string then hoist→narrative", paths: ["preDesignPack.shots[].spatialRelation"] },
  { id: "SH-VISUAL-EFFECT-OBJ", description: "visualEffect object {level,desc} → string + fxLevel", paths: ["preDesignPack.shots[].visualEffect"] },
  { id: "SH-AUDIO-CUE-OBJ", description: "audioCue object → string", paths: ["preDesignPack.shots[].audioCue"] },
  { id: "SH-SCENE-KEY-RAW", description: "Chinese sceneColorLock keys logged before normalize rewrite", paths: ["visualLockTable.sceneColorLock"] },
  { id: "SH-CD-SPEAKER-STUB", description: "B6/dialogue speakers → characterDesign minimal stub", paths: ["characterDesign.assets[]"] },
  { id: "SH-JSON-BRACE", description: "Safe append missing root }", paths: ["$"] },
  { id: "SH-HOIST-PDP", description: "planData.preDesignPack → top", paths: ["preDesignPack"] },
  { id: "SH-HOIST-CD", description: "planData.characterDesign → top", paths: ["characterDesign"] },
  { id: "SH-HOIST-VLT", description: "planData.visualLockTable → top", paths: ["visualLockTable"] },
  { id: "SH-HOIST-BRIEF", description: "planData.designBrief → top", paths: ["designBrief"] },
  { id: "SH-HOIST-CONFLICT", description: "top vs nested PDP conflict WARN", paths: ["preDesignPack"] },
  { id: "SH-SERIES-CONT", description: "seriesContinuity prose string → record", paths: ["planData.narrativeBrief.seriesContinuity"] },
  { id: "SH-BRIEF-STRING", description: "narrativeBrief JSON/prose string → object", paths: ["planData.narrativeBrief"] },
  { id: "SH-SCENE-AV-TAGS", description: "sceneAvTags comma string → array + hoist", paths: ["planData.sceneMeta[].sceneAvTags", "planData.sceneAvTags"] },
  { id: "SH-MICRO-EXPR", description: "named microExpression map → compileable eyes/mouth", paths: ["preDesignPack.shots[].shotDesign.performance.microExpression"] },
];

export function getRegisteredShapeIds(): string[] {
  return SHAPE_REGISTRY.map((e) => e.id);
}

/**
 * Run all registered normalizers in fixed order (after null omit + shot coerce in pipeline).
 */
export function runShapeRegistry(bundle: Record<string, unknown>, log: ShapeSalvageLog): void {
  normalizeDeepAdaptationInBundle(bundle);
  normalizeDesignBriefInBundle(bundle, log);
  normalizeCharacterDesignInBundle(bundle, log);
  runFrostShapeSalvage(bundle, log);
}

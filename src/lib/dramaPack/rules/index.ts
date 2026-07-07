import type { PackFieldRule } from "../packFieldRegistry";
import { colorToneRule } from "./colorToneRule";
import { colorToneContrastRule } from "./colorToneContrastRule";
import { cameraAnchorRule } from "./cameraAnchorRule";
import { facePrefixRule } from "./facePrefixRule";
import { imagePromptRulesRule } from "./imagePromptRulesRule";
import { constraintsRule } from "./constraintsRule";
import { sceneColorRule } from "./sceneColorRule";
import { sceneNightRule } from "./sceneNightRule";
import { shotTypeRecommendRule } from "./shotTypeRecommendRule";
import { postProductionRule } from "./postProductionRule";

export const PACK_FIELD_RULES: PackFieldRule[] = [
  shotTypeRecommendRule,
  imagePromptRulesRule,
  colorToneRule,
  colorToneContrastRule,
  sceneColorRule,
  sceneNightRule,
  facePrefixRule,
  cameraAnchorRule,
  constraintsRule,
  postProductionRule,
];

/** productionRuleEngine 内建规则（非 Registry 文件，但已应用） */
export const ENGINE_BUILTIN_RULES = [
  { id: "transitionRules", channel: "videoDesc", status: "applied" },
  { id: "dialogueActionSync", channel: "videoDesc", status: "applied" },
  { id: "soundDesign", channel: "videoDesc", status: "applied" },
  { id: "systemUIAppearance", channel: "videoDesc", status: "applied" },
  { id: "emotionPerformanceMapping", channel: "videoDesc", status: "applied-fallback" },
  { id: "personalitySwitch", channel: "associate", status: "applied" },
  { id: "L6-personality", channel: "videoDesc", status: "applied-partial" },
  { id: "L6-trigger", channel: "videoDesc", status: "applied" },
];

export {
  colorToneRule,
  colorToneContrastRule,
  cameraAnchorRule,
  facePrefixRule,
  imagePromptRulesRule,
  constraintsRule,
  sceneColorRule,
  sceneNightRule,
  shotTypeRecommendRule,
  postProductionRule,
};

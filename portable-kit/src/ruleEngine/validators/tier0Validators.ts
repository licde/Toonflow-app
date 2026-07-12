import type { EpisodeShot, ResolvedConfig, ShotType, ValidationIssue } from "../types";
import { dialogueCharCount } from "../utils/hash";

const SHOT_TYPES: ShotType[] = ["CHAR-SCENE", "PURE-SCENE", "PURE-PROP", "CHAR-PROP"];

export function validateTier0Shots(shots: EpisodeShot[], config: ResolvedConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const shot of shots) {
    const type = shot.narrative.type;
    if (!type || !SHOT_TYPES.includes(type)) {
      issues.push({
        ruleId: "V1",
        tier: 0,
        severity: "BLOCK",
        shotId: shot.id,
        fieldPath: "narrative.type",
        message: `镜 ${shot.index + 1} type 必须为 ${SHOT_TYPES.join("|")}`,
        rollbackLayer: "SB",
        autoFix: { patch: { type: "CHAR-SCENE" }, confidence: 0.6 },
      });
    }
    if (type === "PURE-SCENE") {
      const img = shot.generation.compiled?.image ?? shot.generation.imagePrompt ?? "";
      if (!/^.{0,120}no people/i.test(img) && !img.includes("no characters")) {
        issues.push({
          ruleId: "V2",
          tier: 0,
          severity: "BLOCK",
          shotId: shot.id,
          fieldPath: "generation.compiled.image",
          message: "PURE-SCENE 需在 imagePrompt 前部含 no people, no characters",
          rollbackLayer: "EN",
        });
      }
    }
    if (type === "PURE-PROP") {
      const img = shot.generation.compiled?.image ?? "";
      if (img && !img.includes("--ar 1:1")) {
        issues.push({
          ruleId: "V3",
          tier: 0,
          severity: "WARN",
          shotId: shot.id,
          fieldPath: "generation.compiled.image",
          message: "PURE-PROP 建议含 --ar 1:1",
          rollbackLayer: "EN",
          autoFix: { patch: { append: " --ar 1:1" }, confidence: 0.9 },
        });
      }
    }
    const lines = shot.narrative.dialogue?.lines ?? shot.narrative.lines ?? "";
    if (lines) {
      const count = dialogueCharCount(lines);
      const isMono = shot.narrative.dialogue?.type === "monologue" || /独白|画外/.test(lines);
      const limit = isMono ? 12 : 15;
      if (count > limit) {
        issues.push({
          ruleId: "V10",
          tier: 0,
          severity: "BLOCK",
          shotId: shot.id,
          fieldPath: "narrative.dialogue.lines",
          message: `台词 ${count} 字超过上限 ${limit}`,
          rollbackLayer: "SB",
        });
      }
    }
    if (config.platformProfile.vertical && shot.narrative.shotSize === "wide shot") {
      issues.push({
        ruleId: "V11",
        tier: 1,
        severity: "WARN",
        shotId: shot.id,
        fieldPath: "narrative.shotSize",
        message: "竖屏项目建议避免过多 wide shot",
        rollbackLayer: "SB",
      });
    }
  }
  return issues;
}

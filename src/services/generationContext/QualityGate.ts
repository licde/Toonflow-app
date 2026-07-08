import type { StructuredShot } from "../structuredScript/types";

export interface QualityGateInput {
  shot: StructuredShot;
  prompt: string;
  hasReferenceImages: boolean;
}

/** M2 分镜图质量门禁（M1 规则预检） */
export function runQualityGate(input: QualityGateInput): import("./types").QualityGateResult {
  const issues: string[] = [];
  let score = 100;

  if (!input.prompt || input.prompt.length < 10) {
    issues.push("prompt 过短");
    score -= 40;
  }

  const type = input.shot.type ?? "CHAR-SCENE";
  if (type === "PURE-SCENE" && !/no people|no characters/i.test(input.prompt)) {
    issues.push("PURE-SCENE 缺少 no people 约束");
    score -= 15;
  }
  if (type === "PURE-PROP" && !/isolated|no hands/i.test(input.prompt)) {
    issues.push("PURE-PROP 缺少 isolated 约束");
    score -= 15;
  }

  const intensity = input.shot.emotionIntensity ?? 1;
  const shotType = input.shot.shotType ?? "";
  if (intensity >= 4 && /全景|远景/.test(shotType)) {
    issues.push("高强度情绪镜使用了远景景别");
    score -= 20;
  }

  if ((type === "CHAR-SCENE" || type === "CHAR-PROP") && !input.hasReferenceImages) {
    issues.push("角色镜缺少参考图");
    score -= 25;
  }

  const forbidden = ["nsfw", "nude", "violence"];
  for (const w of forbidden) {
    if (input.prompt.toLowerCase().includes(w)) {
      issues.push(`包含禁止词: ${w}`);
      score -= 50;
    }
  }

  return {
    passed: score >= 60,
    score,
    issues,
    retryHint: issues.length ? "调整 prompt 或补充参考图后重试" : undefined,
  };
}

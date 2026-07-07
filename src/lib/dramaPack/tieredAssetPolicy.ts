/** T1 服化 stage 白名单策略：禁止情绪 lockCode、禁止跨角色 persona stage */

import { wardrobeStageFromVisualId } from "./visualIdParser";

export const EMOTION_STAGE_NAMES = new Set([
  "震惊", "社死", "慌乱", "紧张", "困惑", "石化", "绝望", "恐惧", "崩溃", "麻木",
  "打哈欠", "准备行动", "门外犹豫", "推门", "侧目", "手抖", "扫视", "开口", "挑眉",
  "泼咖啡", "擦袖口", "最后希望", "拒绝", "任务失败", "大群社死", "埋桌", "夜景转场",
  "兰总夜晚", "雪辞初登场",
]);

export function isEmotionStageName(name: string): boolean {
  return EMOTION_STAGE_NAMES.has(name);
}

export const WARDROBE_FALLBACK: Record<string, string> = {
  "CHAR-WRJ": "日常",
  "CHAR-LZH": "白天",
  "CHAR-XC": "夜晚",
};

export function isPersonaStageOnWrongChar(charCode: string, stageName: string): boolean {
  if (/雪辞/.test(stageName) && charCode !== "CHAR-XC") return true;
  if (/白天工作/.test(stageName) && charCode === "CHAR-XC") return true;
  return false;
}

/** visualEvolution stage 仅当名称在 L4 或分镜引用 prompt 中存在时保留 */
export function isAllowedStageName(
  charCode: string,
  stageName: string,
  l4Keys: Set<string>,
  stagePromptKeys: Set<string>,
): boolean {
  if (!stageName.trim()) return false;
  if (isEmotionStageName(stageName)) return false;
  if (isPersonaStageOnWrongChar(charCode, stageName)) return false;
  if (l4Keys.has(stageName) || stagePromptKeys.has(stageName)) return true;
  return false;
}

/** 情绪 visualId → 服化 stage 名（非情绪 lockCode） */
export function mapVisualIdToWardrobeStage(
  visualId: string | undefined,
  charCode: string,
): string | null {
  const fromParser = wardrobeStageFromVisualId(visualId, charCode);
  if (fromParser) {
    if (isEmotionStageName(fromParser)) return WARDROBE_FALLBACK[charCode] ?? null;
    return fromParser;
  }
  if (!visualId) return WARDROBE_FALLBACK[charCode] ?? null;
  const dash = visualId.lastIndexOf("-");
  if (dash < 0) return WARDROBE_FALLBACK[charCode] ?? null;
  const suffix = visualId.slice(dash + 1);
  if (isEmotionStageName(suffix)) return WARDROBE_FALLBACK[charCode] ?? null;
  const allowed = ["日常", "白天", "夜晚", "潜入", "落魄"];
  if (allowed.includes(suffix)) return suffix;
  return WARDROBE_FALLBACK[charCode] ?? null;
}

export function isAllowedDerivativeLockCode(code: string, allowedStages: Set<string>): boolean {
  const m = code.match(/^(CHAR-[^:]+):(.+)$/);
  if (!m) return true;
  const stageName = m[2];
  if (isEmotionStageName(stageName)) return false;
  return allowedStages.has(code) || allowedStages.has(stageName);
}

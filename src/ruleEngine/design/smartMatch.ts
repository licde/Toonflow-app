/**
 * Smart match pack + dimension draft from source material heuristics.
 */
import { catalogForPicker, loadGenreTemplatePack } from "../genre/loadGenreTemplatePack";
import { readFixtureJson } from "../utils/fixturesPath";

export type SmartMatchResult = {
  recommendedPackId: string;
  reasons: string[];
  catalog: ReturnType<typeof catalogForPicker>;
  recommendedMatrixDraft: { dimId: string; choice: string; reason: string }[];
  confidence: number;
};

export function smartMatchViralFormula(sourceText: string): SmartMatchResult {
  const text = String(sourceText || "");
  const reasons: string[] = [];
  let packId = "generic";
  let confidence = 0.45;

  if (/战神|身份|打脸|下跪|逆袭|首富|赘婿/.test(text)) {
    packId = "war_god";
    reasons.push("检出逆袭/打脸/身份材料 → 战神公式");
    confidence = 0.82;
  } else if (/虐|分手|背叛|牺牲|泪/.test(text)) {
    packId = "abuse_romance";
    reasons.push("检出虐恋/背叛痛感材料 → 虐恋公式");
    confidence = 0.78;
  } else if (/甜|宠|心动|告白|恋爱/.test(text)) {
    packId = "sweet";
    reasons.push("检出甜宠/心动材料 → 甜宠公式");
    confidence = 0.75;
  } else if (/悬疑|凶手|真相|谜/.test(text)) {
    packId = "suspense";
    reasons.push("检出悬疑/解谜材料 → 悬疑公式");
    confidence = 0.72;
  } else {
    reasons.push("未强匹配，默认通用公式，可改选");
  }

  const catalog = readFixtureJson<{ deepDimensions?: { dimId: string; defaultChoice?: string; name?: string }[] }>(
    "adaptation_matrix_catalog.json",
    {},
  );
  const draft: SmartMatchResult["recommendedMatrixDraft"] = [];
  for (const d of catalog.deepDimensions ?? []) {
    draft.push({
      dimId: d.dimId,
      choice: d.defaultChoice || "keep",
      reason: `默认推荐 ${d.name || d.dimId}`,
    });
  }
  draft.push({
    dimId: "V05_genreFramework",
    choice: packId === "war_god" ? "战神" : packId === "sweet" ? "甜宠" : packId === "abuse_romance" ? "虐恋" : packId === "suspense" ? "悬疑" : "战神",
    reason: "与推荐公式对齐",
  });
  draft.push({
    dimId: "emotion_logic",
    choice: packId === "sweet" ? "sweet" : packId === "abuse_romance" ? "angst" : packId === "war_god" ? "power" : "blend",
    reason: "情感逻辑预填",
  });

  void loadGenreTemplatePack(packId);
  return {
    recommendedPackId: packId,
    reasons,
    catalog: catalogForPicker(),
    recommendedMatrixDraft: draft,
    confidence,
  };
}

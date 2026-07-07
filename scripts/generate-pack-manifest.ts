#!/usr/bin/env tsx
/**
 * 从 packFieldRegistry 自动生成 docs/pack-field-manifest.md
 */
import fs from "fs";
import path from "path";
import { FIELD_RULE_MANIFEST, KNOWN_SPEC_BLOCKS } from "../src/lib/dramaPack/packFieldRegistry";
import { ENGINE_BUILTIN_RULES } from "../src/lib/dramaPack/rules";

const lines: string[] = [
  "# Drama Pack 字段清单（Manifest）",
  "",
  "> **自动生成**：`yarn drama-pack manifest`。勿手改 Registry 段；可追加说明段落于文末。",
  "",
  "## Registry Rules（imagePrompt / postProduction）",
  "",
  "| Rule ID | Channel | Spec Block | Status |",
  "|---------|---------|------------|--------|",
];

for (const r of FIELD_RULE_MANIFEST) {
  lines.push(`| \`${r.id}\` | ${r.channel} | \`${r.specBlock}\` | ${r.status} |`);
}

lines.push(
  "",
  "## productionRuleEngine 内建规则（非 Registry 文件）",
  "",
  "| Rule ID | Channel | Status |",
  "|---------|---------|--------|",
);
for (const r of ENGINE_BUILTIN_RULES) {
  lines.push(`| \`${r.id}\` | ${r.channel} | ${r.status} |`);
}

lines.push("", "## productionSpec 已知块", "", "| Block | Registry 状态 |", "|-------|---------------|");

const applied = new Set(FIELD_RULE_MANIFEST.map((r) => r.specBlock).filter(Boolean));
const engineApplied = new Set([
  "transitionRules",
  "dialogueActionSync",
  "soundDesign",
  "systemUIAppearance",
  "emotionPerformanceMapping",
  "performanceBaseline",
  "imagePromptTemplates",
]);
const partialApplied = new Set(["shotTypeRules", "productLayer"]);
const validateOnly = [
  "outputFormatRules",
  "editingRules",
  "validation",
  "sceneGenerationRules",
  "episodeOpenRules",
  "emotionCurveDimensions",
  "characterAssetRules",
];
for (const block of [...KNOWN_SPEC_BLOCKS].sort()) {
  let status = "archived";
  if (applied.has(block)) status = "applied (rule)";
  else if (engineApplied.has(block)) status = "applied (engine)";
  else if (partialApplied.has(block)) status = "partial";
  else if (validateOnly.includes(block)) status = "validate-only";
  lines.push(`| \`${block}\` | ${status} |`);
}

lines.push(
  "",
  "## CLI",
  "",
  "```bash",
  "yarn drama-pack validate ./my-pack.json",
  "yarn drama-pack coverage ./my-pack.json",
  "yarn drama-pack sync <projectId> ./my-pack.json",
  "yarn drama-pack manifest   # 重新生成本文件",
  "```",
  "",
);

const outPath = path.resolve(__dirname, "../docs/pack-field-manifest.md");
fs.writeFileSync(outPath, lines.join("\n"), "utf8");
console.log(`已生成 ${outPath}（${FIELD_RULE_MANIFEST.length} rules, ${KNOWN_SPEC_BLOCKS.size} spec blocks）`);

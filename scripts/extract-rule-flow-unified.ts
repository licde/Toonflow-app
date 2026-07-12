/**
 * 合并 browser + internal rule flow → rule_flow_unified.json
 * yarn extract:rule-flow-unified
 */
import fs from "fs";
import path from "path";

const fixturesDir = path.join(process.cwd(), "data", "fixtures");
const stageIndexPath = path.join(process.cwd(), "data", "skills", "_generated", "rule_stage_index.json");
const stageGraphPath = path.join(process.cwd(), "data", "rule-packs", "stage_graph.yaml");

function loadStageGraph(): { stageId: string; track: string; tier: string; name: string }[] {
  if (!fs.existsSync(stageGraphPath)) return BROWSER_STAGES_FALLBACK;
  const yaml = fs.readFileSync(stageGraphPath, "utf-8");
  const stages: { stageId: string; track: string; tier: string; name: string }[] = [];
  let current: { id?: string; name?: string; layer?: string; tier?: string } = {};
  for (const line of yaml.split("\n")) {
    const idMatch = line.match(/^\s+- id:\s*(\S+)/);
    if (idMatch) {
      if (current.id) stages.push({ stageId: current.id, track: "both", tier: current.tier ?? "T1", name: current.name ?? current.id });
      current = { id: idMatch[1] };
      continue;
    }
    const nameMatch = line.match(/^\s+name:\s*(.+)/);
    if (nameMatch) current.name = nameMatch[1].trim();
    const layerMatch = line.match(/^\s+layer:\s*(\S+)/);
    if (layerMatch) current.layer = layerMatch[1];
    const tierMatch = line.match(/^\s+tier:\s*(\S+)/);
    if (tierMatch) current.tier = tierMatch[1];
  }
  if (current.id) stages.push({ stageId: current.id, track: "both", tier: current.tier ?? "T1", name: current.name ?? current.id });
  stages.push({ stageId: "validate", track: "internal", tier: "all", name: "RuleEngine validate" });
  return stages.length > 1 ? stages : BROWSER_STAGES_FALLBACK;
}

const BROWSER_STAGES_FALLBACK = [
  { stageId: "P0", track: "browser", tier: "T1", name: "源材料预检" },
  { stageId: "P03", track: "browser", tier: "T1", name: "改编矩阵" },
  { stageId: "P06", track: "browser", tier: "T1", name: "故事核心" },
  { stageId: "P08", track: "browser", tier: "T1", name: "改编后检" },
  { stageId: "P09", track: "browser", tier: "T1", name: "改编加固" },
  { stageId: "G", track: "both", tier: "T1", name: "全局锚点" },
  { stageId: "W1", track: "both", tier: "T1", name: "故事骨架" },
  { stageId: "W2", track: "both", tier: "T1", name: "改编策略" },
  { stageId: "W3", track: "both", tier: "T1", name: "分集剧本" },
  { stageId: "designBrief", track: "browser", tier: "T1", name: "设计联动 brief" },
  { stageId: "GB", track: "both", tier: "T1", name: "导演规划" },
  { stageId: "SB", track: "both", tier: "T1", name: "分镜结构" },
  { stageId: "EN", track: "both", tier: "T2", name: "引擎编译" },
  { stageId: "CD", track: "browser", tier: "T2", name: "角色设计" },
  { stageId: "AS", track: "browser", tier: "T2", name: "资产流水线" },
  { stageId: "BP", track: "browser", tier: "T2", name: "蓝图" },
  { stageId: "MD", track: "both", tier: "T3", name: "四模态 prompt" },
  { stageId: "validate", track: "internal", tier: "all", name: "RuleEngine validate" },
];

const INTERNAL_GAPS = [
  { id: "I1", gap: "INT validate ~8 rules", owner: "INT", wave: "INT-1" },
  { id: "I2", gap: "o_storyboard missing fields", owner: "合流", wave: "P1" },
  { id: "I3", gap: "BP not wired", owner: "Chat+INT", wave: "P1" },
  { id: "I4", gap: "autoFix 3 hardcoded", owner: "合流", wave: "P1" },
  { id: "I5", gap: "GenerationFeedback weak", owner: "合流", wave: "P1" },
  { id: "I6", gap: "videoDesc free text", owner: "INT", wave: "P1" },
  { id: "I7", gap: "generation failure no回流", owner: "INT", wave: "P1" },
  { id: "I8", gap: "continuityTracking writeback", owner: "INT", wave: "P2" },
  { id: "I9", gap: "H3 causality validator", owner: "合流", wave: "INT-1" },
  { id: "I10", gap: "autoDesign heuristic only", owner: "合流", wave: "P1" },
];

function main() {
  fs.mkdirSync(fixturesDir, { recursive: true });
  let stageRules: Record<string, string[]> = {};
  if (fs.existsSync(stageIndexPath)) {
    stageRules = JSON.parse(fs.readFileSync(stageIndexPath, "utf-8"));
  }

  const unified = {
    version: "2.0.1",
    rulePackVersion: "2.0.1",
    stages: loadStageGraph().map((s) => ({
      ...s,
      ruleIds: stageRules[s.stageId] ?? [],
    })),
    internalGaps: INTERNAL_GAPS,
    confluencePipeline: [
      "importScript|importBundle",
      "resolveContext",
      "merge preDesignPack.shots",
      "autoDesign skip SB if shots",
      "validate INT + QP",
      "dryRun modalityPromptAudit",
      "QualityGate",
      "ModalityOrchestrator",
      "generationFeedback",
      "continuity writeback",
    ],
  };

  const browserChat = {
    version: "2.0.1",
    track: "browser",
    stages: unified.stages.filter((s) => s.track !== "internal"),
    linkageChains: ["dialogue", "asset", "continuity", "av", "story", "repair"],
  };

  fs.writeFileSync(path.join(fixturesDir, "rule_flow_unified.json"), JSON.stringify(unified, null, 2));
  fs.writeFileSync(path.join(fixturesDir, "rule_flow_browser_chat.json"), JSON.stringify(browserChat, null, 2));

  const internal = {
    version: "2.0.1",
    track: "internal",
    stages: unified.stages.filter((s) => s.track !== "browser"),
    validators: ["V1", "V2", "V3", "V10", "R2", "H3", "MODE-AGNES", "dialogueFidelityGate"],
    plannedTier0: ["V4", "V5", "V6", "H2", "H4", "H5"],
  };
  fs.writeFileSync(path.join(fixturesDir, "rule_flow_internal.json"), JSON.stringify(internal, null, 2));
  console.log("Wrote rule_flow_unified.json + rule_flow_browser_chat.json + rule_flow_internal.json");
}

main();

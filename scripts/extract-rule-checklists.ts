/**
 * 双源提取 P/G/W + 规则层.json → rule_cards, fix_templates, checklists
 * yarn extract:rule-checklists
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
const mainFlowPath = path.join(root, "主流程.txt");
const rulesPath = path.join(root, "规则层.json");
const outDir = path.join(root, "data", "skills", "_generated");

interface RuleCard {
  ruleId: string;
  layer: string;
  stage: string;
  implLevel: "guideline" | "checklist" | "structured" | "audit";
  severity: "BLOCK" | "WARN" | "INFO";
  title: string;
  checkPrompt: string;
  passCriteria: string;
  failAction: string;
  outputField: string | null;
  sourceText: string;
  linkedRules: string[];
}

const STAGE_MAP: Record<string, string> = {
  P: "P0",
  G: "G",
  W: "W3",
  B: "designBrief",
  V: "SB",
  M: "EN",
  S: "EN",
  Y: "EN",
  H: "validate",
  R: "W3",
};

function parseMainFlowPgw(): RuleCard[] {
  const text = fs.readFileSync(mainFlowPath, "utf-8");
  const cards: RuleCard[] = [];
  const pMatch = text.match(/P1-P6[\s\S]*?P13-P18[\s\S]*?改造方向/);
  if (pMatch) {
    for (let i = 1; i <= 6; i++) {
      cards.push({
        ruleId: `P${i}`,
        layer: "P",
        stage: "P0",
        implLevel: "checklist",
        severity: "BLOCK",
        title: `六维度评分 P${i}`,
        checkPrompt: `对源材料维度 P${i} 评分 1-10 并附理由`,
        passCriteria: "有分数与段落定位",
        failAction: "补全评分后重检",
        outputField: "planData.preCheck",
        sourceText: "主流程.txt §3.1",
        linkedRules: ["P7"],
      });
    }
    for (let i = 7; i <= 18; i++) {
      cards.push({
        ruleId: `P${i}`,
        layer: "P",
        stage: i <= 12 ? "P0" : i <= 15 ? "P03" : "P0",
        implLevel: "checklist",
        severity: i <= 12 ? "BLOCK" : "WARN",
        title: `P层规则 P${i}`,
        checkPrompt: `检查 P${i} 合规`,
        passCriteria: "符合主流程 P 层边界",
        failAction: "修订 P 阶段产出",
        outputField: "planData",
        sourceText: "主流程.txt §3.1",
        linkedRules: [],
      });
    }
  }
  for (let i = 1; i <= 5; i++) {
    cards.push({
      ruleId: `G${i}`,
      layer: "G",
      stage: "G",
      implLevel: "structured",
      severity: "BLOCK",
      title: `全局锚点 G${i}`,
      checkPrompt: `G${i} 锚点已写入 planData.globalAnchors`,
      passCriteria: "字段非空且可观测",
      failAction: "补全 G 锚点",
      outputField: "planData.globalAnchors",
      sourceText: "主流程.txt §3.2",
      linkedRules: [],
    });
  }
  for (let i = 1; i <= 46; i++) {
    const stage = i <= 5 ? "W1" : i <= 15 ? "W2" : "W3";
    cards.push({
      ruleId: `W${i}`,
      layer: "W",
      stage,
      implLevel: i <= 16 ? "structured" : "checklist",
      severity: i >= 41 ? "BLOCK" : "WARN",
      title: `编剧规则 W${i}`,
      checkPrompt: `W${i} 自检`,
      passCriteria: "符合主流程 W 层定义",
      failAction: "修订 W 阶段",
      outputField: stage === "W3" ? "script" : "planData",
      sourceText: "主流程.txt §3.3",
      linkedRules: [],
    });
  }
  return cards;
}

function loadRulesJson(): Record<string, unknown> {
  const raw = fs.readFileSync(rulesPath, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    const fixed = raw.replace(/\\([^"\\/bfnrtu])/g, "\\\\$1");
    return JSON.parse(fixed);
  }
}

function parseRulesJson(): RuleCard[] {
  const json = loadRulesJson();
  const plan = (json as { ruleDetailPlan?: Record<string, unknown> }).ruleDetailPlan ?? json;
  const cards: RuleCard[] = [];
  for (const [layerKey, layerVal] of Object.entries(plan)) {
    if (!layerKey.includes("层") || typeof layerVal !== "object") continue;
    const layerPrefix = layerKey.charAt(0);
    for (const [ruleId, ruleVal] of Object.entries(layerVal as Record<string, unknown>)) {
      if (ruleId === "count" || ruleId === "description" || typeof ruleVal !== "object") continue;
      const r = ruleVal as { current?: string; 完善后内容?: string };
      const content = r["完善后内容"] ?? r.current ?? "";
      cards.push({
        ruleId,
        layer: layerPrefix,
        stage: STAGE_MAP[layerPrefix] ?? "SB",
        implLevel: "checklist",
        severity: ruleId.startsWith("H") ? "BLOCK" : "WARN",
        title: ruleId,
        checkPrompt: content.slice(0, 200),
        passCriteria: content.slice(0, 300),
        failAction: `修订 ${STAGE_MAP[layerPrefix] ?? "SB"} 或触发 fixPlan`,
        outputField: null,
        sourceText: "规则层.json",
        linkedRules: [],
      });
    }
  }
  return cards;
}

function dedupeCards(cards: RuleCard[]): RuleCard[] {
  const map = new Map<string, RuleCard>();
  for (const c of cards) {
    if (!map.has(c.ruleId)) map.set(c.ruleId, c);
  }
  return [...map.values()];
}

function renderChecklist(cards: RuleCard[], filter: (c: RuleCard) => boolean, title: string): string {
  const byStage = new Map<string, RuleCard[]>();
  for (const c of cards.filter(filter)) {
    const list = byStage.get(c.stage) ?? [];
    list.push(c);
    byStage.set(c.stage, list);
  }
  let md = `# ${title}\n\nrulePackVersion: 2.0.1\n\n`;
  for (const [stage, list] of byStage) {
    md += `## ${stage}\n\n`;
    for (const c of list) {
      md += `- [ ] **${c.ruleId}** ${c.title} — ${c.checkPrompt.slice(0, 120)}\n`;
    }
    md += "\n";
  }
  return md;
}

interface FixTemplateOut {
  ruleId: string;
  confidence: number;
  patchTemplate: { field: string; action: string; hint?: string };
  rePushTarget: string;
  patchKeys?: string[];
  description: string;
}

const FEEDBACK_MAP: Record<string, string> = {
  H2: "GB",
  H3: "SB",
  H4: "EN",
  H5: "EN",
  V1: "SB",
  V10: "SB",
  R2: "W3",
  "MODE-AGNES": "MD",
  identity_mismatch: "EN",
  fx_degrade: "SB",
  "PR-01": "SB",
  W1: "W1",
  B3: "SB",
  D21: "SB",
  D22: "W3",
};

const PATCH_KEY_MAP: Record<string, string[]> = {
  V1: ["type"],
  V2: ["prefix"],
  V3: ["append"],
  V10: ["trim"],
  H9: ["append"],
  R2: ["text"],
  W12: ["hook"],
  W13: ["hook"],
  B1: ["curve"],
  B2: ["shotSize"],
  Y8: ["terms"],
  Y9: ["emotion"],
  Y10: ["move"],
};

function loadRouteRePushMap(): Record<string, string> {
  const routePath = path.join(root, "data", "fixtures", "reverse_route_table.json");
  const map = { ...FEEDBACK_MAP };
  if (!fs.existsSync(routePath)) return map;
  const routes = (JSON.parse(fs.readFileSync(routePath, "utf-8")).routes ?? []) as {
    trigger: string;
    ruleIds?: string[];
    reverseTarget: string;
  }[];
  for (const r of routes) {
    map[r.trigger] = r.reverseTarget;
    for (const id of r.ruleIds ?? []) map[id] = r.reverseTarget;
  }
  return map;
}

function buildFixTemplates(): FixTemplateOut[] {
  const json = loadRulesJson();
  const lib = (json as { autoFixLibrary?: { fixTemplates?: { ruleId: string; template: string }[] } }).autoFixLibrary;
  const fromLibrary = lib?.fixTemplates ?? [];
  const rePushMap = loadRouteRePushMap();
  const byId = new Map<string, FixTemplateOut>();

  for (const entry of fromLibrary) {
    byId.set(entry.ruleId, {
      ruleId: entry.ruleId,
      confidence: 0.85,
      patchTemplate: { field: "auto", action: "revise", hint: entry.template },
      rePushTarget: rePushMap[entry.ruleId] ?? "SB",
      patchKeys: PATCH_KEY_MAP[entry.ruleId],
      description: entry.template.slice(0, 300),
    });
  }

  const extras: FixTemplateOut[] = [
    "QP-01", "QP-02", "PR-01", "PR-04", "identity_mismatch", "fx_degrade",
    "AG-GATE-01", "AG-GATE-02", "video_first_frame_missing", "motion_overflow",
    "native_audio_mismatch", "img_cref_missing", "aud_voice_mismatch", "PR-CAM-01",
  ].map((ruleId) => ({
    ruleId,
    confidence: 0.85,
    patchTemplate: { field: "auto", action: "revise" },
    rePushTarget: rePushMap[ruleId] ?? "SB",
    patchKeys: PATCH_KEY_MAP[ruleId],
    description: `Runtime trigger template for ${ruleId}`,
  }));
  for (const e of extras) {
    if (!byId.has(e.ruleId)) byId.set(e.ruleId, e);
  }

  return [...byId.values()];
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const pgw = parseMainFlowPgw();
  const jsonRules = parseRulesJson();
  const all = dedupeCards([...pgw, ...jsonRules]);

  fs.writeFileSync(path.join(outDir, "rule_cards.json"), JSON.stringify(all, null, 2), "utf-8");

  const pgwMd = renderChecklist(all, (c) => ["P", "G", "W"].includes(c.layer), "P+G+W 规则自检");
  fs.writeFileSync(path.join(outDir, "rule_checklists_pgw.md"), pgwMd, "utf-8");

  const linkageMd = renderChecklist(all, (c) => c.layer === "B" || c.ruleId === "H1", "设计联动 B+H1");
  fs.writeFileSync(path.join(outDir, "rule_checklists_linkage.md"), linkageMd, "utf-8");

  const designMd = renderChecklist(
    all,
    (c) => !["P", "G", "W"].includes(c.layer) && c.layer !== "B",
    "附录 B 设计执行规则",
  );
  fs.writeFileSync(path.join(outDir, "rule_checklists_design_appendix.md"), designMd, "utf-8");

  const fixTemplates = buildFixTemplates();
  fs.writeFileSync(path.join(outDir, "fix_templates.json"), JSON.stringify(fixTemplates, null, 2), "utf-8");

  const stageIndex = all.reduce(
    (acc, c) => {
      acc[c.stage] = acc[c.stage] ?? [];
      if (!acc[c.stage].includes(c.ruleId)) acc[c.stage].push(c.ruleId);
      return acc;
    },
    {} as Record<string, string[]>,
  );
  fs.writeFileSync(path.join(outDir, "rule_stage_index.json"), JSON.stringify(stageIndex, null, 2), "utf-8");

  console.log(`rule_cards: ${all.length}, fix_templates: ${fixTemplates.length}`);
  console.log("输出:", outDir);
}

main();

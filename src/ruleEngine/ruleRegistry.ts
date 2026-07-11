import fs from "fs";
import path from "path";

export interface RuleDefinition {
  id: string;
  layer: string;
  tier: 0 | 1 | 2 | 3;
  maturity: "proven" | "draft" | "stub" | "disabled";
  fieldPaths: string[];
  description: string;
  failureMode: "BLOCK" | "WARN" | "SKIP";
}

const RULE_PACK_VERSION = "2.0.0";

let cachedRules: RuleDefinition[] | null = null;

function inferTier(id: string): 0 | 1 | 2 | 3 {
  if (/^V[1-9]$|^V10$|^H3-|^R2/.test(id)) return 0;
  if (/^V\d+|^H[1-5]/.test(id)) return 1;
  if (/^W\d+|^G\d+/.test(id)) return 2;
  return 3;
}

function parseRulesJson(content: string): { ruleDetailPlan?: Record<string, unknown> } {
  try {
    return JSON.parse(content);
  } catch {
    const sanitized = content.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
    return JSON.parse(sanitized);
  }
}

function loadFromJson(): RuleDefinition[] {
  const candidates = [path.join(process.cwd(), "规则层.json"), path.resolve(__dirname, "../../规则层.json")];
  const jsonPath = candidates.find((p) => fs.existsSync(p));
  if (!jsonPath) return getBuiltinRules();
  try {
    const raw = parseRulesJson(fs.readFileSync(jsonPath, "utf-8"));
    const rules: RuleDefinition[] = [];
    const plan = raw.ruleDetailPlan ?? {};
    for (const [layerKey, layerVal] of Object.entries(plan)) {
      if (typeof layerVal !== "object" || layerVal === null || ["version", "description", "lastUpdated"].includes(layerKey)) continue;
      const layer = layerKey.split("_")[0] ?? layerKey;
      for (const [ruleId, ruleVal] of Object.entries(layerVal as Record<string, unknown>)) {
        if (ruleId === "count" || ruleId === "description" || typeof ruleVal !== "object" || ruleVal === null) continue;
        const r = ruleVal as Record<string, string>;
        rules.push({
          id: ruleId,
          layer,
          tier: inferTier(ruleId),
          maturity: inferTier(ruleId) === 0 ? "proven" : inferTier(ruleId) === 1 ? "draft" : "stub",
          fieldPaths: inferFieldPaths(ruleId),
          description: r.current ?? r["完善后内容"] ?? ruleId,
          failureMode: inferTier(ruleId) === 0 ? "BLOCK" : "WARN",
        });
      }
    }
    return rules.length ? rules : getBuiltinRules();
  } catch (e) {
    console.warn("[ruleRegistry] 加载规则层.json 失败，使用内置规则", e);
    return getBuiltinRules();
  }
}

function inferFieldPaths(ruleId: string): string[] {
  const map: Record<string, string[]> = {
    V1: ["narrative.type"],
    V2: ["generation.compiled.image"],
    V3: ["generation.compiled.image", "narrative.type"],
    V10: ["narrative.dialogue.lines", "narrative.lines"],
    H3: ["narrative.dialogue.lines"],
    R2: ["narrative.dialogue.lines"],
    AG: ["generation.compiled.image", "storyboardId"],
  };
  return map[ruleId] ?? ["narrative"];
}

function getBuiltinRules(): RuleDefinition[] {
  return [
    { id: "V1", layer: "V", tier: 0, maturity: "proven", fieldPaths: ["narrative.type"], description: "分镜 type 枚举", failureMode: "BLOCK" },
    { id: "V10", layer: "V", tier: 0, maturity: "proven", fieldPaths: ["narrative.dialogue.lines"], description: "台词字数", failureMode: "BLOCK" },
    { id: "H3", layer: "H", tier: 0, maturity: "proven", fieldPaths: ["narrative.dialogue.lines"], description: "台词保真", failureMode: "BLOCK" },
    { id: "AG-AUD-07", layer: "AG", tier: 0, maturity: "proven", fieldPaths: ["narrative.sound.sfx"], description: "音效路径", failureMode: "WARN" },
    { id: "MODE-AGNES", layer: "AG", tier: 0, maturity: "proven", fieldPaths: ["storyboardId"], description: "Agnes 首位帧", failureMode: "BLOCK" },
  ];
}

export function getRules(): RuleDefinition[] {
  if (!cachedRules) cachedRules = loadFromJson();
  return cachedRules;
}

export function getRulePackVersion(): string {
  return RULE_PACK_VERSION;
}

export function getTier0Rules(): RuleDefinition[] {
  return getRules().filter((r) => r.tier === 0 && r.maturity === "proven");
}

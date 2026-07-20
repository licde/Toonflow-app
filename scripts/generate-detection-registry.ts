/**
 * Merge DC/PC/GC/IC checklists + bundle gap patterns → closure_detection_registry.json
 * yarn generate:detection-registry
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const FIXTURES = path.join(ROOT, "data/fixtures");

interface ChecklistItem {
  id: string;
  severity?: string;
  field?: string;
  rule?: string;
}

interface RegistryEntry {
  id: string;
  level: "DC" | "PC" | "GC" | "IC" | "GAP" | "PR";
  domain: string;
  chainId: string;
  description: string;
  fieldPaths: string[];
  tier: ("T1" | "T2" | "T3")[];
  stage: ("import" | "preflight" | "pre-generate" | "post-generate" | "ui-display")[];
  severity: "BLOCK" | "WARN" | "INFO";
  modality?: "IMG" | "VID" | "AUD" | "FX" | null;
  handler: string;
  runtimeHooks: string[];
  implemented: boolean;
  repairHintId?: string;
}

const DOMAIN_BY_FIELD: Record<string, string> = {
  dialogue: "NAR",
  av: "MOD",
  story: "NAR",
  scene: "DSG",
  camera: "MOD",
  adaptation: "ADP",
  debut: "PKG",
  compile: "GEN",
  linkage: "DSG",
  forwardTrace: "DSG",
  continuity: "DSG",
  asset: "PKG",
  av_modality: "MOD",
  story_fx: "MOD",
  identityAudit: "MOD",
  fxFeasibilityAudit: "MOD",
  productionReasonableness: "GEN",
  narrativeCausalityGraph: "NAR",
  debutIntroPack: "PKG",
  modalityPromptAudit: "MOD",
  externalHashCheck: "DSG",
  linkageAudit: "DSG",
};

const CHAIN_BY_DOMAIN: Record<string, string> = {
  ADP: "adaptation",
  RET: "retention",
  NAR: "narrative_drive",
  PKG: "packaging",
  GEN: "generation_apply",
  DSG: "designBrief",
  VIR: "viral_clip",
  MOD: "modality_compile",
};

const GAP_ENTRIES: Omit<RegistryEntry, "level">[] = [
  {
    id: "GEN-01",
    domain: "GEN",
    chainId: "generation_apply",
    description: "高情绪镜缺 shotDesign.performance",
    fieldPaths: ["shotDesign.performance", "narrative.emotionIntensity"],
    tier: ["T2", "T3"],
    stage: ["import", "preflight"],
    severity: "WARN",
    handler: "generationApplyAudit",
    runtimeHooks: ["preflightProduction", "inspectBundle"],
    implemented: true,
  },
  {
    id: "GEN-04",
    domain: "MOD",
    chainId: "modality_compile",
    description: "lipSyncPolicy 与 videoPrompt 一致",
    fieldPaths: ["shotDesign.lipSyncPolicy", "generation.videoPrompt"],
    tier: ["T3"],
    stage: ["import", "preflight"],
    severity: "WARN",
    handler: "generationApplyAudit",
    runtimeHooks: ["preflightProduction"],
    implemented: true,
  },
  {
    id: "RET-01",
    domain: "RET",
    chainId: "retention",
    description: "ep1 缺 opening5s 钩子",
    fieldPaths: ["retentionPlan.ep1.opening5s"],
    tier: ["T3"],
    stage: ["import"],
    severity: "WARN",
    handler: "retentionAudit",
    runtimeHooks: ["inspectBundle"],
    implemented: true,
  },
  {
    id: "RET-02",
    domain: "RET",
    chainId: "retention",
    description: "ep1 rhythm31545 三拍",
    fieldPaths: ["retentionPlan.ep1.first30s.rhythm31545"],
    tier: ["T3"],
    stage: ["import", "preflight"],
    severity: "WARN",
    handler: "retentionAudit",
    runtimeHooks: ["preflightProduction", "inspectBundle"],
    implemented: true,
  },
  {
    id: "NAR-01",
    domain: "NAR",
    chainId: "narrative_drive",
    description: "informationLedger emotionTarget",
    fieldPaths: ["informationLedger.emotionTarget"],
    tier: ["T3"],
    stage: ["import"],
    severity: "WARN",
    handler: "narrativeDriveAudit",
    runtimeHooks: ["inspectBundle"],
    implemented: true,
  },
  {
    id: "MOD-01",
    domain: "MOD",
    chainId: "modality_compile",
    description: "台词镜缺 audioPrompt",
    fieldPaths: ["generation.audioPrompt"],
    tier: ["T3"],
    stage: ["import", "preflight"],
    severity: "WARN",
    handler: "modalityChainAudit",
    runtimeHooks: ["preflightProduction"],
    implemented: true,
  },
];

const PR_ENTRIES: Omit<RegistryEntry, "level">[] = [
  {
    id: "PR-04",
    domain: "NAR",
    chainId: "dialogue",
    description: "台词镜须有角色",
    fieldPaths: ["charCodes", "narrative.dialogue.lines"],
    tier: ["T3"],
    stage: ["import", "preflight"],
    severity: "BLOCK",
    handler: "prValidator.checkDialogueHasCharacter",
    runtimeHooks: ["preflightProduction", "inspectBundle"],
    implemented: true,
  },
  {
    id: "PR-09",
    domain: "NAR",
    chainId: "dialogue",
    description: "镜时长 ≥ 台词朗读所需秒数",
    fieldPaths: ["duration", "narrative.dialogue.lines"],
    tier: ["T3"],
    stage: ["preflight", "pre-generate"],
    severity: "BLOCK",
    modality: "VID",
    handler: "prValidator.checkDialogueDuration",
    runtimeHooks: ["preflightProduction", "batchGenerateVideo"],
    implemented: true,
    repairHintId: "RH-PR-09",
  },
  {
    id: "PR-14",
    domain: "GEN",
    chainId: "generation_apply",
    description: "高强度情绪镜时长≥2s",
    fieldPaths: ["emotion", "duration"],
    tier: ["T3"],
    stage: ["import", "preflight"],
    severity: "BLOCK",
    handler: "prValidator.checkHighEmotionDuration",
    runtimeHooks: ["preflightProduction"],
    implemented: true,
  },
];

function loadChecklist(file: string): ChecklistItem[] {
  const p = path.join(FIXTURES, file);
  if (!fs.existsSync(p)) return [];
  return (JSON.parse(fs.readFileSync(p, "utf-8")) as { checks?: ChecklistItem[] }).checks ?? [];
}

function stageForLevel(level: string, id: string): RegistryEntry["stage"] {
  if (level === "GC") return id.startsWith("GC-06") || id.startsWith("GC-07") ? ["post-generate"] : ["post-generate", "preflight"];
  if (level === "PC") return ["import", "preflight", "pre-generate"];
  if (level === "DC") return ["import", "preflight"];
  return ["import"];
}

function hooksForLevel(level: string): string[] {
  if (level === "GC") return ["checkVideoStateList", "pollingImage", "generationFeedback"];
  if (level === "PC" || level === "DC") return ["inspectBundle", "dryRunImport", "preflightProduction"];
  return ["inspectBundle"];
}

function checklistToRegistry(level: "DC" | "PC" | "GC" | "IC", checks: ChecklistItem[]): RegistryEntry[] {
  const gcImplemented = new Set(["GC-01", "GC-02", "GC-03", "GC-04", "GC-05", "GC-06", "GC-07", "GC-08"]);
  const icImplemented = new Set(["IC-01", "IC-02", "IC-03", "IC-04", "IC-05", "IC-06"]);
  return checks.map((c) => {
    const field = c.field ?? c.id;
    const domain = DOMAIN_BY_FIELD[field] ?? (level === "GC" ? "GEN" : level === "IC" ? "DSG" : "MOD");
    const implemented = level === "DC" || level === "PC"
      ? true
      : level === "GC"
        ? gcImplemented.has(c.id)
        : icImplemented.has(c.id);
    const handler = level === "DC"
      ? "designClosureDryRun"
      : level === "PC"
        ? "productionClosureDryRun"
        : level === "GC" || level === "IC"
          ? "closureRegistry"
          : "productionClosureDryRun";
    return {
      id: c.id,
      level,
      domain,
      chainId: CHAIN_BY_DOMAIN[domain] ?? "repair",
      description: c.rule ?? c.id,
      fieldPaths: [field],
      tier: level === "DC" ? (["T1", "T2", "T3"] as const) : (["T2", "T3"] as const),
      stage: stageForLevel(level, c.id),
      severity: (c.severity as RegistryEntry["severity"]) ?? "WARN",
      handler,
      runtimeHooks: hooksForLevel(level),
      implemented,
    };
  });
}

function main() {
  const entries: RegistryEntry[] = [
    ...checklistToRegistry("DC", loadChecklist("design_closure_checklist.json")),
    ...checklistToRegistry("PC", loadChecklist("production_closure_checklist.json")),
    ...checklistToRegistry("GC", loadChecklist("generation_closure_checklist.json")),
    ...checklistToRegistry("IC", loadChecklist("intelligent_closure_checklist.json")),
    ...GAP_ENTRIES.map((e) => ({ ...e, level: "GAP" as const })),
    ...PR_ENTRIES.map((e) => ({ ...e, level: "PR" as const })),
  ];

  const byId = new Map<string, RegistryEntry>();
  for (const e of entries) byId.set(e.id, e);

  const out = {
    version: "2.0.1",
    description: "全局闭环检测注册表 SSOT — DC/PC/GC/IC + GAP + PR",
    generatedAt: new Date().toISOString(),
    entries: [...byId.values()],
  };

  const outPath = path.join(FIXTURES, "closure_detection_registry.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`Wrote ${out.entries.length} entries → ${outPath}`);
}

main();

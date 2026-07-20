/**
 * Closure gap matrix CI —逐项对照讨论域 vs 代码落点
 * yarn audit:closure-gaps
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();

type RingStatus = "OK" | "GAP" | "PARTIAL";

interface DomainRow {
  domain: string;
  spec: RingStatus;
  schema: RingStatus;
  forward: RingStatus;
  audit: RingStatus;
  reverse: RingStatus;
  repair: RingStatus;
  smart: RingStatus;
}

function exists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

function fileHas(rel: string, needle: string): boolean {
  if (!exists(rel)) return false;
  return fs.readFileSync(path.join(ROOT, rel), "utf-8").includes(needle);
}

function auditDomain(
  domain: string,
  opts: {
    specDocs: string[];
    schemaNeedles: string[];
    forwardNeedle: string;
    auditFile: string;
    gapField: string;
    triggers: string[];
    repairPrefix: string;
    smartNeedle: string;
  },
): DomainRow {
  const spec = opts.specDocs.some((d) => exists(d)) ? "OK" : "GAP";
  const schema = opts.schemaNeedles.every(
    (n) =>
      fileHas("src/ruleEngine/bundle/schema.ts", n)
      || fileHas("src/ruleEngine/bundle/types.ts", n)
      || fileHas("data/fixtures/script-bundle-template-v2.json", n),
  )
    ? "OK"
    : opts.schemaNeedles.some((n) => fileHas("src/ruleEngine/bundle/schema.ts", n)) ? "PARTIAL" : "GAP";
  const forward = fileHas("src/ruleEngine/design/forwardTrace.ts", opts.forwardNeedle) ? "OK" : "GAP";
  const audit = exists(opts.auditFile) && fileHas("src/ruleEngine/bundle/bundleGapAudits.ts", opts.gapField) ? "OK" : "GAP";
  const reverse = opts.triggers.every((t) => fileHas("data/fixtures/reverse_route_table.json", t)) ? "OK" : "PARTIAL";
  const repair = fileHas("data/fixtures/repair_hint_catalog.json", opts.repairPrefix) ? "OK" : "PARTIAL";
  const smart = fileHas("src/ruleEngine/portable/inspectBundle.ts", opts.smartNeedle) ? "OK" : "GAP";
  return { domain, spec, schema, forward, audit, reverse, repair, smart };
}

function main() {
  const rows: DomainRow[] = [
    auditDomain("ADP", {
      specDocs: ["data/fixtures/adaptation_matrix_catalog.json", "data/skills/browser_chat/stages/P03_matrix.md"],
      schemaNeedles: ["adaptationMatrixStructured", "B16", "retentionTier"],
      forwardNeedle: "adaptation_deep",
      auditFile: "src/ruleEngine/bundle/adaptationAudit.ts",
      gapField: "adaptationGaps",
      triggers: ["adaptation_deep_empty"],
      repairPrefix: "RH-ADP",
      smartNeedle: "adaptationGaps",
    }),
    auditDomain("RET", {
      specDocs: ["docs/RETENTION_LADDER_STANDARD.md"],
      schemaNeedles: ["retentionTier", "B18"],
      forwardNeedle: "retention",
      auditFile: "src/ruleEngine/bundle/retentionAudit.ts",
      gapField: "retentionGaps",
      triggers: ["retention_opening_missing"],
      repairPrefix: "RH-RET",
      smartNeedle: "retentionGaps",
    }),
    auditDomain("NAR", {
      specDocs: ["docs/NARRATIVE_DRIVE_SYSTEM.md", "data/fixtures/narrative_drive_spec.json"],
      schemaNeedles: ["informationLedger", "B20", "causedByActionId"],
      forwardNeedle: "narrative_drive",
      auditFile: "src/ruleEngine/bundle/narrativeDriveAudit.ts",
      gapField: "narrativeDriveGaps",
      triggers: ["narrative_info_gap", "narrative_dialogue_function"],
      repairPrefix: "RH-NAR",
      smartNeedle: "narrativeDriveGaps",
    }),
    auditDomain("PKG", {
      specDocs: ["data/skills/browser_chat/stages/production_debut_intro.md"],
      schemaNeedles: ["debutIntroPack", "retentionTier"],
      forwardNeedle: "packaging",
      auditFile: "src/ruleEngine/bundle/packagingAudit.ts",
      gapField: "packagingGaps",
      triggers: ["packaging_debut_missing", "packaging_end_preview"],
      repairPrefix: "RH-PKG",
      smartNeedle: "packagingGaps",
    }),
    auditDomain("GEN", {
      specDocs: ["docs/PROMPT_STANDARD.md"],
      schemaNeedles: ["shotDesign"],
      forwardNeedle: "generation_apply",
      auditFile: "src/ruleEngine/bundle/generationApplyAudit.ts",
      gapField: "generationApplyGaps",
      triggers: ["generation_design_drift"],
      repairPrefix: "RH-GEN",
      smartNeedle: "generationApplyGaps",
    }),
    auditDomain("DSG", {
      specDocs: ["docs/DESIGN_SPEC_CHECKLIST.md"],
      schemaNeedles: ["B14", "B21"],
      forwardNeedle: "designBrief",
      auditFile: "src/ruleEngine/bundle/designSpecAudit.ts",
      gapField: "designSpecGaps",
      triggers: ["design_spec_upstream"],
      repairPrefix: "RH-DSG",
      smartNeedle: "designSpecGaps",
    }),
    auditDomain("VIR", {
      specDocs: ["docs/VIRAL_SHORT_VIDEO_STANDARD.md", "data/fixtures/viral_video_spec.json"],
      schemaNeedles: ["clip30sCandidate", "B15"],
      forwardNeedle: "viral_clip",
      auditFile: "src/ruleEngine/bundle/scriptViralAudit.ts",
      gapField: "scriptViralGaps",
      triggers: ["viral_clip_shortfall"],
      repairPrefix: "RH-VIR",
      smartNeedle: "scriptViralGaps",
    }),
    auditDomain("MOD", {
      specDocs: ["data/skills/browser_chat/modality_closure_checklist.md", "docs/PROMPT_STANDARD.md"],
      schemaNeedles: ["sceneMeta", "implementationPlan", "audioCue", "fxPrompt"],
      forwardNeedle: "modality_feasibility",
      auditFile: "src/ruleEngine/bundle/modalityChainAudit.ts",
      gapField: "modalityGaps",
      triggers: ["modality_fx_missing", "modality_aud_missing", "modality_slot_missing"],
      repairPrefix: "RH-MOD",
      smartNeedle: "modalityGaps",
    }),
  ];

  const gaps = rows.filter((r) => Object.values(r).some((v) => v === "GAP"));
  const report = { generatedAt: new Date().toISOString(), rows, gapCount: gaps.length, allClosed: gaps.length === 0 };
  const outPath = path.join(ROOT, "reports/closure_gap_audit.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("=== Closure Gap Matrix ===\n");
  for (const r of rows) {
    const status = [r.spec, r.schema, r.forward, r.audit, r.reverse, r.repair, r.smart];
    const ok = status.every((s) => s === "OK");
    console.log(`${ok ? "✓" : "✗"} ${r.domain}  Spec=${r.spec} Schema=${r.schema} Fwd=${r.forward} Audit=${r.audit} Rev=${r.reverse} Repair=${r.repair} Smart=${r.smart}`);
  }
  console.log(`\nReport: ${outPath}`);
  if (gaps.length) {
    console.error(`\n${gaps.length} domain(s) have GAP rings`);
    process.exit(1);
  }
  console.log("\n=== closure-gaps OK ===");
}

main();

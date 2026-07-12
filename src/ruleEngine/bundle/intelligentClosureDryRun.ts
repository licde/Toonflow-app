import fs from "fs";
import path from "path";
import type { ScriptBundle } from "../bundle/types";
import { hasUnconfirmedProposals, type SmartProposal } from "../design/smartProposalMerger";
import { bidirectionalCoverageOk } from "../design/bidirectionalTrace";
import { classifyChainBreaks } from "../design/chainBreakClassifier";
import { validateLinkageChains } from "../design/linkageValidator";
import type { ProductionClosureCheck } from "../bundle/types";

function loadRepairCatalog(): { qpId?: string; id: string }[] {
  const p = path.join(process.cwd(), "data", "fixtures", "repair_hint_catalog.json");
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf-8")).hints ?? [];
}

export function runIntelligentClosureDryRun(bundle: ScriptBundle): ProductionClosureCheck[] {
  const proposals = (bundle as ScriptBundle & { smartDesignProposals?: SmartProposal[] }).smartDesignProposals ?? [];
  const supervision = (bundle as ScriptBundle & { supervisionReport?: { grade?: string; blockNext?: boolean } }).supervisionReport;
  const fixPlan = (bundle as ScriptBundle & { fixPlan?: { items?: { autoApplicable?: boolean; confidence?: number }[] } }).fixPlan;
  const hints = loadRepairCatalog();
  const qpTriggers = (bundle as ScriptBundle & { qualityDiagnostics?: { qpIds?: string[] } }).qualityDiagnostics?.qpIds ?? [];

  const missingHints = qpTriggers.filter((q) => !hints.some((h) => h.qpId === q));
  const brokenCount = validateLinkageChains(bundle).filter((l) => l.broken).length;
  const lowConfidence = (fixPlan?.items ?? []).some(
    (i) => i.autoApplicable && (i.confidence ?? 1) < 0.8,
  );

  return [
    {
      id: "IC-01",
      passed: missingHints.length === 0,
      message: missingHints.length ? `QP 缺 repairHint: ${missingHints.join(",")}` : "repairHint OK",
      severity: "WARN",
    },
    {
      id: "IC-02",
      passed: !hasUnconfirmedProposals(proposals),
      message: hasUnconfirmedProposals(proposals) ? "W93 未确认" : "proposals OK",
      severity: "BLOCK",
    },
    {
      id: "IC-03",
      passed: !supervision?.blockNext && supervision?.grade !== "D",
      message: "supervision",
      severity: "BLOCK",
    },
    {
      id: "IC-04",
      passed: !lowConfidence,
      message: lowConfidence ? "confidence<0.8" : "autoApplicable OK",
      severity: "WARN",
    },
    {
      id: "IC-05",
      passed: bidirectionalCoverageOk(bundle) || !bundle.forwardTrace,
      message: bidirectionalCoverageOk(bundle) ? "bidirectional OK" : "reverseHints 覆盖不足",
      severity: "WARN",
    },
    {
      id: "IC-06",
      passed: brokenCount === 0 || classifyChainBreaks(brokenCount) !== undefined,
      message: brokenCount <= 1 ? "linkageRepairPlan" : "rePushPlan",
      severity: "INFO",
    },
  ];
}

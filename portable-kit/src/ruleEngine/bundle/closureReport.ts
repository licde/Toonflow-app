import type { BundleGap } from "./auditTypes";
import type { ChatPromptGap } from "./chatPromptAudit";
import type { ProductionClosureCheck } from "./types";

export interface ClosureChainStatus {
  chainId: string;
  forward: "OK" | "GAP";
  reverse: "OK" | "GAP";
}

export interface ClosureReport {
  missing: BundleGap[];
  optimize: BundleGap[];
  chains: ClosureChainStatus[];
}

const OPTIMIZE_IDS = new Set(["GEN-02", "GEN-03", "GEN-04", "GEN-05", "GEN-06", "MOD-04", "MOD-05", "MOD-06"]);

function classifyGap(gap: BundleGap): "missing" | "optimize" {
  if (OPTIMIZE_IDS.has(gap.id)) return "optimize";
  if (gap.message.includes("不一致") || gap.message.includes("未进") || gap.message.includes("质量弱")) return "optimize";
  return "missing";
}

export function buildClosureReport(input: {
  allGaps: BundleGap[];
  chatPromptGaps?: ChatPromptGap[];
  closureChecks?: { dc: ProductionClosureCheck[]; pc: ProductionClosureCheck[]; gc: ProductionClosureCheck[]; ic: ProductionClosureCheck[] };
  tier?: "T1" | "T2" | "T3";
}): ClosureReport {
  const tier = input.tier ?? "T3";
  const chatAsGaps: BundleGap[] = (input.chatPromptGaps ?? [])
    .filter((g) => tier === "T3" || !g.id.startsWith("CHAT-MD"))
    .map((g) => ({
      id: g.id,
      severity: g.severity === "BLOCK" ? "WARN" : "WARN",
      message: g.message,
      chainId: g.id.startsWith("CHAT-") ? "modality_compile" : "dialogue",
      field: g.field,
      shotIndex: g.shotIndex,
    }));

  const combined = [...input.allGaps, ...chatAsGaps];
  const missing: BundleGap[] = [];
  const optimize: BundleGap[] = [];
  for (const g of combined) {
    (classifyGap(g) === "optimize" ? optimize : missing).push(g);
  }

  const chainIds = new Set(combined.map((g) => g.chainId).filter(Boolean) as string[]);
  const chains: ClosureChainStatus[] = [...chainIds].map((chainId) => ({
    chainId,
    forward: combined.some((g) => g.chainId === chainId) ? "GAP" : "OK",
    reverse: combined.some((g) => g.chainId === chainId && g.trigger) ? "GAP" : "OK",
  }));

  if (input.closureChecks) {
    const failed = [
      ...input.closureChecks.dc,
      ...input.closureChecks.pc,
      ...input.closureChecks.gc,
      ...input.closureChecks.ic,
    ].filter((c) => !c.passed);
    for (const f of failed) {
      missing.push({
        id: f.id,
        severity: "WARN",
        message: f.message,
        chainId: "repair",
      });
    }
  }

  return { missing, optimize, chains };
}

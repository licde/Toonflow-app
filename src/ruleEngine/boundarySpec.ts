import { getRules } from "./ruleRegistry";

export interface BoundarySpec {
  ruleId: string;
  scope: string[];
  preconditions: string[];
  enums?: Record<string, string[]>;
  failureMode: "BLOCK" | "WARN" | "SKIP";
  rollbackLayer: string;
  tier: number;
  maturity: string;
}

export function loadBoundarySpecs(): BoundarySpec[] {
  return getRules().map((r) => ({
    ruleId: r.id,
    scope: r.fieldPaths,
    preconditions: r.tier === 0 ? ["maturity=proven"] : [],
    failureMode: r.failureMode,
    rollbackLayer: inferRollback(r.layer),
    tier: r.tier,
    maturity: r.maturity,
  }));
}

function inferRollback(layer: string): string {
  if (layer === "V" || layer === "H") return "SB";
  if (layer === "G" || layer === "W") return "GB";
  if (layer === "Y" || layer === "EN") return "EN";
  if (layer === "AG") return "MD";
  return "SB";
}

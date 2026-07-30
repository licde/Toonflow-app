import type { ScriptBundle } from "../types";
import { buildForwardTrace } from "../../design/forwardTrace";
import { bidirectionalCoverageOk, buildReverseHints } from "../../design/bidirectionalTrace";
import { resolveReverseTarget } from "../../design/reverseRouteEngine";
import { RuntimeGapCollector } from "../runtimeGapRegistry";

export interface MatrixExpect {
  roles: number;
  scenes: number;
  props: number;
  minDerivatives: number;
  shots: number;
  requiredForwardChains: string[];
  modalitiesT3: string[];
  symptomRoutes: Record<string, string>;
  promptCompile: { image: string; video: string };
}

/** Dimension A: forward / reverse / bidirectional on golden bundle. */
export function runSemanticMatrix(bundle: ScriptBundle, expect: MatrixExpect, gaps: RuntimeGapCollector): void {
  const ft = buildForwardTrace(bundle, "T3");
  const chainIds = new Set(ft.traces.map((t) => t.chainId));

  for (const need of expect.requiredForwardChains) {
    if (!chainIds.has(need) && !ft.traces.some((t) => t.dimension === need || t.chainId.includes(need))) {
      gaps.push("A", "FT-MISS", `正推缺少链 ${need}`);
    }
  }

  const mods = new Set(ft.traces.map((t) => t.modality).filter(Boolean));
  for (const m of expect.modalitiesT3) {
    if (!mods.has(m)) gaps.push("A", "FT-MISS", `T3 正推缺少模态 ${m}`);
  }

  const enriched = { ...bundle, forwardTrace: ft as unknown as Record<string, unknown> } as ScriptBundle;
  const hints = buildReverseHints(enriched, "T3");
  if (hints.length < ft.traces.length) {
    gaps.push("A", "RV-MISS", `反推 hints ${hints.length} < forward traces ${ft.traces.length}`);
  }
  if (!bidirectionalCoverageOk(enriched)) {
    gaps.push("A", "RV-MISS", "bidirectionalCoverageOk failed");
  }

  for (const [symptom, target] of Object.entries(expect.symptomRoutes)) {
    const resolved = resolveReverseTarget(symptom);
    if (resolved !== target) {
      gaps.push("A", "RV-MISS", `症状 ${symptom} 期望反推 ${target} 实际 ${resolved}`);
    }
  }
}

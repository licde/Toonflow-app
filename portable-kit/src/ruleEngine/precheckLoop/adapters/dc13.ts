import { createHash } from "crypto";
import { validateLinkageChains } from "../../design/linkageValidator";
import { readFixtureJson } from "../../utils/fixturesPath";
import type { CheckAdapter, DiagnosisFinding, SuggestedPatch } from "../types";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "../types";
import { dc01Adapter } from "./dc01";

function fingerprintOf(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

function loadHint(id: string): string {
  const catalog = readFixtureJson<{ hints?: { id: string; chatTemplate?: string }[] }>(
    "repair_hint_catalog.json",
    { hints: [] },
  );
  return catalog.hints?.find((h) => h.id === id)?.chatTemplate ?? "请按断链维度回修对应舞台字段。";
}

export const dc13Adapter: CheckAdapter = {
  id: "DC-13",

  diagnose(ctx): DiagnosisFinding {
    const chains = validateLinkageChains(ctx.bundle, ctx.scope);
    const hard = chains.filter((c) => c.broken);
    const soft = chains.filter((c) => c.softBroken);
    const isFiltered =
      ctx.scope?.mode === "filtered" || ctx.scope?.storyboardIds != null;

    const repairReasons: string[] = [];
    if (isFiltered && soft.length && !hard.length) repairReasons.push("filtered_scope");
    if (hard.some((c) => c.chainId === "dialogue")) repairReasons.push("unique_missing_line");
    if (hard.length > 1) repairReasons.push("ambiguous_target");

    const passed = hard.length === 0;
    const primary = hard[0] ?? soft[0];
    const message = passed
      ? soft.length
        ? `linkage OK（${soft.length} 条局部 WARN 已降级）`
        : "linkage OK"
      : `linkage ${hard.length} broken：${hard.map((c) => `${c.chainId}(${c.message})`).join("；")}`;

    const repairHintId =
      hard.some((c) => c.chainId === "dialogue") || soft.some((c) => c.chainId === "dialogue")
        ? "RH-QP-03"
        : "RH-QP-10";

    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      id: "DC-13",
      passed,
      severity: passed ? (soft.length ? "WARN" : "BLOCK") : "BLOCK",
      message,
      evidence: {
        brokenCount: hard.length,
        softBrokenCount: soft.length,
        brokenChains: hard.map((c) => ({
          chainId: c.chainId,
          message: c.message,
          detail: c.detail,
        })),
        softBrokenChains: soft.map((c) => ({
          chainId: c.chainId,
          message: c.message,
          detail: c.detail,
        })),
        shotScope: isFiltered ? "filtered" : "full",
        storyboardIds: ctx.scope?.storyboardIds,
        repairReasons: [...new Set(repairReasons)],
        repairHintTemplate: loadHint(repairHintId),
      },
      chainId: primary?.chainId ?? "linkage",
      trigger: hard[0] ? `${hard[0].chainId}_broken` : undefined,
      repairHintId,
      fieldPaths: ["linkage"],
      fingerprint: fingerprintOf({
        id: "DC-13",
        hard: hard.map((c) => c.chainId),
        soft: soft.map((c) => c.chainId),
        scope: isFiltered ? "filtered" : "full",
      }),
    };
  },

  suggestRepair(finding, ctx): SuggestedPatch[] {
    if (finding.passed) return [];
    const broken = (finding.evidence.brokenChains as { chainId: string }[]) ?? [];
    if (broken.length === 1 && broken[0].chainId === "dialogue") {
      // Reuse DC-01 dialogue append heuristics
      const dc01 = dc01Adapter.diagnose(ctx);
      if (!dc01.passed && dc01Adapter.suggestRepair) {
        return dc01Adapter.suggestRepair(dc01, ctx).map((p) => ({ ...p, checkId: "DC-13" }));
      }
    }
    return [];
  },
};

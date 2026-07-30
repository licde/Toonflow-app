import { createHash } from "crypto";
import { softPatchQfExpr } from "../../compilers/qfExprGate";
import type { CheckAdapter, DiagnosisFinding, SuggestedPatch } from "../types";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "../types";

function fingerprintOf(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

function shotsOf(ctx: { bundle: { preDesignPack?: { shots?: unknown[] } } }) {
  return (ctx.bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
}

function videoOf(s: Record<string, unknown>): string {
  return String(s.videoPrompt ?? (s.generation as { videoPrompt?: string })?.videoPrompt ?? "");
}

/** QF-EXPR-01 — strip face-rewrite / EN QF shells; inject ZH micro-expression hint. */
export const qfExprAdapter: CheckAdapter = {
  id: "QF-EXPR-01",
  diagnose(ctx): DiagnosisFinding {
    const shots = shotsOf(ctx);
    const hits: { shotIndex?: number }[] = [];
    for (const s of shots) {
      const r = softPatchQfExpr(videoOf(s));
      if (r.patched) hits.push({ shotIndex: s.shotIndex as number | undefined });
    }
    const passed = hits.length === 0;
    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      id: "QF-EXPR-01",
      passed,
      severity: passed ? "INFO" : "WARN",
      message: passed ? "QF 表情门 OK" : `QF 改脸/英文壳 ${hits.length} 镜`,
      evidence: { hits: hits.slice(0, 8), repairReasons: passed ? [] : ["soft_patch_qf_expr"] },
      chainId: "video",
      trigger: passed ? undefined : "expr_speak_missing",
      repairHintId: "RH-QF-EXPR-01",
      fieldPaths: ["generation.videoPrompt"],
      fingerprint: fingerprintOf({ id: "QF-EXPR-01", hits }),
    };
  },
  suggestRepair(finding, ctx): SuggestedPatch[] {
    if (finding.passed) return [];
    const shots = shotsOf(ctx);
    const patches: SuggestedPatch[] = [];
    for (const s of shots) {
      const idx = Math.max(0, Number(s.shotIndex ?? 0) - 1);
      const before = videoOf(s);
      const r = softPatchQfExpr(before);
      if (!r.patched) continue;
      patches.push({
        checkId: "QF-EXPR-01",
        path: `preDesignPack.shots.${idx}.videoPrompt`,
        patch: { op: "setVideoPrompt", shotIndex: idx, videoPrompt: r.prompt },
        confidence: 0.9,
        reason: "strip face-rewrite / EN QF shell",
      });
    }
    return patches.slice(0, 3);
  },
};

import { createHash } from "crypto";
import { resolveRequiredDuration } from "../../compilers/resolveRequiredDuration";
import type { CheckAdapter, DiagnosisFinding, SuggestedPatch } from "../types";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "../types";

function fingerprintOf(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

function shotsOf(ctx: { bundle: { preDesignPack?: { shots?: unknown[] } } }) {
  return (ctx.bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
}

/** LIP-01 / PR-09 — raise duration to lipMin when short. */
export const lip01Adapter: CheckAdapter = {
  id: "LIP-01",
  diagnose(ctx): DiagnosisFinding {
    const shots = shotsOf(ctx);
    const fails: {
      shotIndex?: number;
      duration: number;
      lipMin: number;
      required: number;
      needsSplit: boolean;
      overVendorMax: boolean;
    }[] = [];
    for (const s of shots) {
      const idx = s.shotIndex as number | undefined;
      const meta = (ctx.bundle as { meta?: { pillarsDurationV2?: boolean } }).meta;
      const req = resolveRequiredDuration(s, {
        pillarsDurationV2: meta?.pillarsDurationV2 === true,
      });
      if (!req.texts.length) continue;
      const duration = req.authorDuration;
      if (req.needsSplit || req.overVendorMax || (duration > 0 && duration < req.required)) {
        fails.push({
          shotIndex: idx,
          duration,
          lipMin: req.lipMin,
          required: req.required,
          needsSplit: req.needsSplit || req.overVendorMax,
          overVendorMax: req.overVendorMax,
        });
      }
    }
    const passed = fails.length === 0;
    const splitFail = fails.find((f) => f.needsSplit);
    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      id: "LIP-01",
      passed,
      severity: "BLOCK",
      message: passed
        ? "口型时长 OK"
        : splitFail
          ? `镜 ${splitFail.shotIndex ?? "?"} 多句口型预算不足，建议拆镜`
          : `镜 ${fails[0]?.shotIndex ?? "?"} 时长 ${fails[0]?.duration}s < required ${fails[0]?.required}s`,
      evidence: {
        fails: fails.slice(0, 8),
        /** D13: must match precheck_repair_decision soft_patch_when */
        repairReasons: passed ? [] : splitFail ? ["split_hint"] : ["raise_duration"],
      },
      chainId: "dialogue",
      trigger: passed ? undefined : "pr_lip_duration",
      repairHintId: "RH-PR-09",
      fieldPaths: ["duration"],
      fingerprint: fingerprintOf({ id: "LIP-01", fails }),
    };
  },
  suggestRepair(finding, ctx): SuggestedPatch[] {
    if (finding.passed) return [];
    const shots = shotsOf(ctx);
    const patches: SuggestedPatch[] = [];
    for (const s of shots) {
      const idx = Math.max(0, Number(s.shotIndex ?? 0) - 1);
      const req = resolveRequiredDuration(s);
      if (!req.canSilentRaise) continue;
      patches.push({
        checkId: "LIP-01",
        path: `preDesignPack.shots.${idx}.duration`,
        patch: { op: "setDuration", shotIndex: idx, duration: req.required },
        confidence: 0.9,
        reason: `raise_duration ${req.authorDuration} → ${req.required}`,
      });
    }
    return patches.slice(0, 3);
  },
};

import { createHash } from "crypto";
import { checkFxGrade } from "../../validators/langAudFxCam";
import type { CheckAdapter, DiagnosisFinding, SuggestedPatch } from "../types";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "../types";

function fingerprintOf(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

function shotsOf(ctx: { bundle: { preDesignPack?: { shots?: unknown[] }; fxFeasibilityAudit?: { items?: { shotIndex?: number; level?: string }[] } } }) {
  return (ctx.bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
}

/** FX-GRADE-01 — soft_patch only declares F0 on empty undeclared shots; never invents FX prose. */
export const fx01Adapter: CheckAdapter = {
  id: "FX-GRADE-01",
  diagnose(ctx): DiagnosisFinding {
    const auditItems =
      (ctx.bundle as { fxFeasibilityAudit?: { items?: { shotIndex?: number; level?: string }[] } }).fxFeasibilityAudit
        ?.items ?? [];
    const shots = shotsOf(ctx);
    const undeclared: number[] = [];
    const hard: { shotIndex?: number; message: string }[] = [];
    for (const s of shots) {
      const idx = s.shotIndex as number | undefined;
      const fx = String((s.generation as { fxPrompt?: string })?.fxPrompt ?? (s as { fxPrompt?: string }).fxPrompt ?? "");
      const feas = String(
        (s as { fxFeasibility?: string }).fxFeasibility ??
          (s.generation as { fxFeasibility?: string })?.fxFeasibility ??
          auditItems.find((it) => it.shotIndex === idx)?.level ??
          "",
      );
      const hit = checkFxGrade({ fxPrompt: fx, fxFeasibility: feas, shotIndex: idx, warnUndeclared: true });
      if (!hit) continue;
      const reasons = (hit.evidence?.repairReasons as string[] | undefined) ?? [];
      if (reasons.includes("declare_f0_empty")) undeclared.push(idx ?? 0);
      else if (hit.severity === "BLOCK") hard.push({ shotIndex: idx, message: hit.message });
    }
    const passed = hard.length === 0 && undeclared.length === 0;
    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      id: "FX-GRADE-01",
      passed,
      severity: hard.length || undeclared.length ? "BLOCK" : "INFO",
      message: passed
        ? "FX 声明 OK"
        : hard.length
          ? hard[0].message
          : `${undeclared.length} 镜 FX 空未声明 F0`,
      evidence: {
        undeclared,
        hard,
        repairReasons: undeclared.length ? ["declare_f0_empty"] : [],
      },
      chainId: "fx",
      trigger: hard.length ? "fx_infeasible" : undeclared.length ? "fx_empty" : undefined,
      repairHintId: "RH-FX-01",
      fieldPaths: ["fxFeasibility", "generation.fxFeasibility"],
      fingerprint: fingerprintOf({ id: "FX-GRADE-01", undeclared, hard }),
    };
  },
  suggestRepair(finding, ctx): SuggestedPatch[] {
    if (finding.passed) return [];
    const undeclared = (finding.evidence.undeclared as number[]) ?? [];
    if (!undeclared.length) return [];
    const patches: SuggestedPatch[] = [];
    for (const shotIndex1Based of undeclared.slice(0, 12)) {
      const idx = Math.max(0, Number(shotIndex1Based) - 1);
      patches.push({
        checkId: "FX-GRADE-01",
        path: `preDesignPack.shots.${idx}.fxFeasibility`,
        patch: { op: "setFxFeasibility", shotIndex: idx, fxFeasibility: "F0" },
        confidence: 0.9,
        reason: "declare F0 for empty no-VFX shot",
      });
    }
    return patches;
  },
};

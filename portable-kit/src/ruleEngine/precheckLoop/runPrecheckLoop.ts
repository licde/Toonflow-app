/**
 * runPrecheckLoop — diagnose → route/decide → repair → verify
 * Pure core; DB/HTTP/obs via ports only.
 */

import { readFixtureJson } from "../utils/fixturesPath";
import { listAdapters } from "./adapters";
import { decideRepairMode, loadRepairDecisionPolicy } from "./policy";
import {
  createInMemoryPatchApplier,
  noopObservability,
  type ObservabilityPort,
  type PatchApplierPort,
} from "./ports";
import type {
  DiagnosisFinding,
  LoopResult,
  PrecheckScope,
  RepairHintPayload,
  RunPrecheckLoopInput,
  SuggestedPatch,
} from "./types";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "./types";
import type { ScriptBundle } from "../bundle/types";

export interface RunPrecheckLoopDeps {
  obs?: ObservabilityPort;
  applier?: PatchApplierPort;
}

function loadRepairHint(id: string | undefined, finding?: DiagnosisFinding): RepairHintPayload | undefined {
  if (!id) return undefined;
  const catalog = readFixtureJson<{
    hints?: { id: string; chatTemplate?: string; ruleId?: string }[];
  }>("repair_hint_catalog.json", { hints: [] });
  const h = catalog.hints?.find((x) => x.id === id);
  if (!h) return undefined;
  const samples = (finding?.evidence?.missingSamples as string[]) ?? [];
  const extra = samples.length ? ` 缺失样例：${samples.map((s) => `「${s}」`).join("、")}。` : "";
  return {
    id: h.id,
    ruleId: h.ruleId,
    chatTemplate: `${h.chatTemplate ?? ""}${extra}`.trim(),
  };
}

function diagnoseAll(
  bundle: ScriptBundle,
  scope: PrecheckScope | undefined,
  checks: string[] | undefined,
): DiagnosisFinding[] {
  return listAdapters(checks).map((a) =>
    a.diagnose({ bundle, scope, checks }),
  );
}

function collectPatches(
  findings: DiagnosisFinding[],
  bundle: ScriptBundle,
  scope: PrecheckScope | undefined,
): SuggestedPatch[] {
  const out: SuggestedPatch[] = [];
  for (const f of findings) {
    if (f.passed) continue;
    const adapter = listAdapters([f.id])[0];
    if (!adapter?.suggestRepair) continue;
    out.push(...adapter.suggestRepair(f, { bundle, scope }));
  }
  return out;
}

export function runPrecheckLoop(
  input: RunPrecheckLoopInput,
  deps: RunPrecheckLoopDeps = {},
): LoopResult {
  const obs = deps.obs ?? noopObservability;
  const applier = deps.applier ?? createInMemoryPatchApplier();
  const policy = loadRepairDecisionPolicy();
  let bundle = input.bundle;
  let round = input.round ?? 0;
  const maxRounds = input.maxRounds ?? policy.defaultMaxRounds ?? 2;

  let findings = diagnoseAll(bundle, input.scope, input.checks);
  obs.emit({ kind: "diagnose", findings, checkIds: findings.map((f) => f.id) });

  const blockingFail = findings.some((f) => !f.passed && f.severity === "BLOCK");
  if (!blockingFail && findings.every((f) => f.passed)) {
    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      ok: true,
      exhausted: false,
      round,
      findings,
      decision: { mode: "ok", reason: "all checks passed" },
      verified: true,
    };
  }

  let patches = collectPatches(findings, bundle, input.scope);
  let decisionMeta = decideRepairMode({ findings, patches, policy });

  // Soft-apply loop
  const applied: string[] = [];
  let exhausted = false;

  while (
    input.apply &&
    decisionMeta.mode === "soft_patch" &&
    patches.length > 0 &&
    round < (input.maxRounds ?? decisionMeta.maxRounds)
  ) {
    const eligible = patches.filter((p) => p.confidence >= decisionMeta.minConfidence);
    if (!eligible.length) break;

    const prevFp = findings
      .filter((f) => !f.passed)
      .map((f) => f.fingerprint)
      .sort()
      .join("|");

    const appliedResult = applier.apply(bundle, eligible);
    bundle = appliedResult.bundle;
    applied.push(...appliedResult.applied);
    round += 1;
    obs.emit({
      kind: "repair",
      checkIds: eligible.map((p) => p.checkId),
      result: { ok: false, exhausted: false, round, decision: { mode: "soft_patch", reason: decisionMeta.reason } },
    });

    findings = diagnoseAll(bundle, input.scope, input.checks);
    obs.emit({ kind: "verify", findings });

    const stillBlock = findings.some((f) => !f.passed && f.severity === "BLOCK");
    if (!stillBlock) {
      return {
        schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
        ok: true,
        exhausted: false,
        round,
        findings,
        decision: { mode: "ok", reason: "healed after soft_patch" },
        patches: eligible,
        applied,
        verified: true,
        repairHint: loadRepairHint(decisionMeta.repairHintId, findings[0]),
      };
    }

    const nextFp = findings
      .filter((f) => !f.passed)
      .map((f) => f.fingerprint)
      .sort()
      .join("|");
    if (nextFp === prevFp || nextFp === input.prevFingerprint) {
      exhausted = true;
      obs.emit({ kind: "exhausted", findings, result: { ok: false, exhausted: true, round, decision: { mode: "human", reason: "fingerprint_unchanged" } } });
      break;
    }

    patches = collectPatches(findings, bundle, input.scope);
    decisionMeta = decideRepairMode({ findings, patches, policy });
    if (round >= (input.maxRounds ?? decisionMeta.maxRounds)) {
      exhausted = true;
      break;
    }
  }

  const primaryFail = findings.find((f) => !f.passed) ?? findings[0];
  const ok = !findings.some((f) => !f.passed && f.severity === "BLOCK");

  return {
    schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
    ok,
    exhausted,
    round,
    findings,
    decision: {
      mode: exhausted ? "human" : decisionMeta.mode,
      reason: exhausted ? "exhausted" : decisionMeta.reason,
      minConfidence: decisionMeta.minConfidence,
    },
    patches,
    applied: applied.length ? applied : undefined,
    repairHint: loadRepairHint(decisionMeta.repairHintId, primaryFail),
    verified: input.apply === true,
  };
}

/** Map LoopResult findings into ProductionClosureCheck-compatible rows (with detail). */
export function findingsToClosureChecks(
  findings: DiagnosisFinding[],
): { id: string; passed: boolean; message: string; severity: string; detail?: Record<string, unknown> }[] {
  return findings.map((f) => ({
    id: f.id,
    passed: f.passed,
    message: f.message,
    severity: f.severity,
    detail: f.evidence,
  }));
}

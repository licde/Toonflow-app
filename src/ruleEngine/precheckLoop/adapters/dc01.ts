import { createHash } from "crypto";
import {
  collectExpectedDialogue,
  dialogueCoverageReport,
  formatDialogueCoverageMessage,
  normalizeDialogueKey,
} from "../../design/dialogueCoverage";
import { readFixtureJson } from "../../utils/fixturesPath";
import type { ScriptBundle } from "../../bundle/types";
import type {
  CheckAdapter,
  DiagnosisFinding,
  PrecheckContext,
  SuggestedPatch,
} from "../types";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "../types";

function fingerprintOf(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

function sampleKeys(keys: string[], n = 3): string[] {
  return keys.slice(0, n).map((k) => (k.length > 40 ? `${k.slice(0, 40)}…` : k));
}

function expectedSourceOf(bundle: ScriptBundle): "dialoguePlan" | "script" {
  const plan = bundle.planData as { dialoguePlan?: { lines?: unknown[] } } | undefined;
  return plan?.dialoguePlan?.lines?.length ? "dialoguePlan" : "script";
}

function matchModeOf(bundle: ScriptBundle, shots: unknown[]): "lineId" | "text" {
  const expected = collectExpectedDialogue({
    script: bundle.script ?? "",
    planData: bundle.planData,
  });
  const actualLineIds: string[] = [];
  for (const s of shots) {
    const lines = (s as { narrative?: { dialogue?: { lines?: unknown } } })?.narrative?.dialogue?.lines;
    if (!Array.isArray(lines)) continue;
    for (const l of lines) {
      if (l && typeof l === "object" && (l as { lineId?: string }).lineId) {
        actualLineIds.push(String((l as { lineId: string }).lineId));
      }
    }
  }
  return expected.lineIds.length ? "lineId" : "text";
}

function loadHintTemplate(id: string): string {
  const catalog = readFixtureJson<{
    hints?: { id: string; chatTemplate?: string }[];
  }>("repair_hint_catalog.json", { hints: [] });
  return catalog.hints?.find((h) => h.id === id)?.chatTemplate ?? "请对照剧本原文，修正分镜台词，禁止删改字词。";
}

function shotDialogueEmpty(shot: unknown): boolean {
  const lines = (shot as { narrative?: { dialogue?: { lines?: unknown } } })?.narrative?.dialogue?.lines;
  if (lines == null) return true;
  if (typeof lines === "string") return !lines.trim();
  if (Array.isArray(lines)) return lines.length === 0;
  return true;
}

function inferLineForKey(
  bundle: ScriptBundle,
  key: string,
): { speaker: string; text: string; lineId?: string } {
  const plan = bundle.planData as {
    dialoguePlan?: { lines?: { speaker?: string; text?: string; lineId?: string }[] };
  } | undefined;
  for (const l of plan?.dialoguePlan?.lines ?? []) {
    if (normalizeDialogueKey(l.text ?? "") === key || String(l.lineId ?? "") === key) {
      return {
        speaker: l.speaker ?? "角色",
        text: String(l.text ?? "").trim() || key,
        lineId: l.lineId ? String(l.lineId) : undefined,
      };
    }
  }
  for (const raw of (bundle.script ?? "").split(/\r?\n/)) {
    const m = raw.trim().match(/^([^：:]{1,20})[：:]\s*(.*)$/);
    if (!m) continue;
    if (normalizeDialogueKey(m[2] || "") === key) {
      return { speaker: m[1].trim() || "角色", text: (m[2] || "").trim() || key };
    }
  }
  return { speaker: "角色", text: key };
}

function inferSpeakerForKey(bundle: ScriptBundle, key: string): string {
  return inferLineForKey(bundle, key).speaker;
}

export const dc01Adapter: CheckAdapter = {
  id: "DC-01",

  diagnose(ctx: PrecheckContext): DiagnosisFinding {
    const shots = ctx.bundle.preDesignPack?.shots ?? [];
    // storyboardIds explicitly provided (including empty array) ⇒ filtered touch path
    const isFiltered =
      ctx.scope?.mode === "filtered" || ctx.scope?.storyboardIds != null;

    const report = dialogueCoverageReport({
      script: ctx.bundle.script ?? "",
      shots,
      planData: ctx.bundle.planData,
      shotScope: isFiltered ? "filtered" : "full",
    });
    const source = expectedSourceOf(ctx.bundle);
    const mode = matchModeOf(ctx.bundle, shots);
    const samples = sampleKeys(report.missingKeys);
    const repairReasons: string[] = [];

    if (isFiltered && !report.ok) {
      repairReasons.push("filtered_scope");
    }
    if (mode === "lineId" && !report.ok) {
      // Only human-escalate when we cannot resolve lineId for a missing key
      const trulyUnresolved = report.missingKeys.filter((key) => !inferLineForKey(ctx.bundle, key).lineId);
      if (trulyUnresolved.length) repairReasons.push("lineId_mode_mismatch");
    }
    if (source === "dialoguePlan" && !report.ok) {
      const scriptOnly = dialogueCoverageReport({
        script: ctx.bundle.script ?? "",
        shots,
        planData: undefined,
      });
      if (scriptOnly.ok !== report.ok) repairReasons.push("plan_script_conflict");
    }

    // Filtered scope: never BLOCK generate on full-episode expected vs partial shots
    let severity: DiagnosisFinding["severity"] = "BLOCK";
    let passed = report.ok;
    let message = formatDialogueCoverageMessage(report);

    // Filtered scope: never BLOCK; also do not hang reverse trigger →SB on soft-pass
    if (isFiltered && !report.ok) {
      severity = "WARN";
      passed = true; // do not block touch; evidence still surfaces miss for operators
      message = formatDialogueCoverageMessage(report, { filtered: true });
      repairReasons.push("filtered_scope");
    }

    if (!report.ok && !isFiltered && report.missingCount === 1) {
      repairReasons.push("unique_missing_line");
    }

    const emptyShot = shots.findIndex((s) => shotDialogueEmpty(s));
    if (!report.ok && emptyShot >= 0) repairReasons.push("empty_target_shot");

    const evidence: Record<string, unknown> = {
      missingCount: report.missingCount,
      missingKeys: report.missingKeys.slice(0, 20),
      missingSamples: samples,
      expectedSource: source,
      matchMode: mode,
      expectedCount: report.expectedKeys.length,
      actualCount: report.actualKeys.length,
      expectedHash: report.expectedHash,
      actualHash: report.actualHash,
      orderMismatch: report.orderMismatch,
      shotScope: isFiltered ? "filtered" : "full",
      storyboardIds: ctx.scope?.storyboardIds,
      repairReasons: [...new Set(repairReasons)],
      repairHintTemplate: loadHintTemplate("RH-QP-03"),
    };

    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      id: "DC-01",
      passed,
      severity: report.ok || isFiltered ? severity : "BLOCK",
      message,
      evidence,
      chainId: "dialogue",
      // Soft-pass filtered: omit trigger so FE does not show dialogue_hash_mismatch→SB
      trigger: report.ok || (isFiltered && passed) ? undefined : "dialogue_hash_mismatch",
      repairHintId: "RH-QP-03",
      fieldPaths: ["narrative.dialogue.lines"],
      fingerprint: fingerprintOf({
        id: "DC-01",
        missing: report.missingKeys,
        scope: isFiltered ? "filtered" : "full",
        mode,
        source,
      }),
    };
  },

  suggestRepair(finding, ctx): SuggestedPatch[] {
    if (finding.passed || finding.evidence.shotScope === "filtered") return [];
    const missing = (finding.evidence.missingKeys as string[]) ?? [];
    if (!missing.length) return [];

    const shots = ctx.bundle.preDesignPack?.shots ?? [];
    if (!shots.length) return [];

    const emptyIdx = shots.findIndex((s) => shotDialogueEmpty(s));
    const targetIdx = emptyIdx >= 0 ? emptyIdx : shots.length - 1;
    const reasons = (finding.evidence.repairReasons as string[]) ?? [];
    const matchMode = String(finding.evidence.matchMode ?? "text");

    let confidence = 0.5;
    if (missing.length === 1 && reasons.includes("unique_missing_line")) confidence = 0.85;
    if (emptyIdx >= 0 && reasons.includes("empty_target_shot")) confidence = Math.max(confidence, 0.9);
    if (reasons.includes("ambiguous_target") || reasons.includes("plan_script_conflict")) confidence = 0.4;
    if (missing.length > 3) confidence = Math.min(confidence, 0.55);

    const lines = missing.map((key) => {
      const line = inferLineForKey(ctx.bundle, key);
      // Always attach lineId+原文 when known (lineId mode requires it; text mode benefits too)
      return {
        speaker: line.speaker,
        text: line.text,
        ...(line.lineId ? { lineId: line.lineId } : {}),
      };
    });
    if (matchMode === "lineId" && lines.some((l) => !l.lineId)) {
      confidence = Math.min(confidence, 0.4);
    }

    return [
      {
        checkId: "DC-01",
        path: `preDesignPack.shots.${targetIdx}.narrative.dialogue.lines`,
        patch: {
          op: "appendDialogueLines",
          shotIndex: targetIdx,
          lines,
        },
        confidence,
        reason:
          emptyIdx >= 0
            ? `append ${missing.length} missing line(s) into empty shot ${targetIdx + 1}`
            : `append ${missing.length} missing line(s) into shot ${targetIdx + 1}`,
      },
    ];
  },
};

/**
 * GateDiagnose SSOT — one ruleId → one diagnose; designExit/export/dryRun only mount.
 */
import { collectNar14Nar15Fails, type Nar14LineLike, type NarFail } from "../nar14ClauseSplit";
import { auditCastCoverage } from "../bundle/designExportHelpers";
import type { ScriptBundle } from "../bundle/types";
import { readFixtureJson } from "../utils/fixturesPath";

export type GateFinding = {
  id: string;
  message: string;
  severity?: "BLOCK" | "WARN";
  lineId?: string;
  shotIndex?: number;
  field?: string;
  reverseTrigger?: string;
};

export type MountRow = {
  ruleId: string;
  stages: string[];
  severity: Record<string, "BLOCK" | "WARN" | "off">;
  dualTrack: "must" | "auto" | "silent";
  reverseTarget?: string;
  reverseTrigger?: string;
  depth?: { viral?: string; light?: string };
};

export type MountMatrix = {
  version: string;
  rows: MountRow[];
};

export function loadDesignGateMountMatrix(): MountMatrix {
  return readFixtureJson<MountMatrix>("design_gate_mount_matrix.json", { version: "1.0.0", rows: [] });
}

export function collectPlanAndShotLines(input: {
  planData?: Record<string, unknown> | null;
  shots?: Array<Record<string, unknown>> | null;
}): { planLines: Nar14LineLike[]; shotLines: { shotIndex?: number; lines: Nar14LineLike[] }[] } {
  const pd = input.planData ?? {};
  const planLines =
    ((pd.dialoguePlan as { lines?: Nar14LineLike[] } | undefined)?.lines ??
      (pd.narrativeBrief as { dialoguePlan?: { lines?: Nar14LineLike[] } } | undefined)?.dialoguePlan?.lines ??
      []) as Nar14LineLike[];
  const shotLines = (input.shots ?? []).map((s) => {
    const n = s.narrative as { dialogue?: { lines?: Nar14LineLike[] } } | undefined;
    return {
      shotIndex: Number(s.shotIndex ?? 0) || undefined,
      lines: (n?.dialogue?.lines ?? []) as Nar14LineLike[],
    };
  });
  return { planLines, shotLines };
}

/** NAR-14/15 diagnose — plan + shots (same as export). */
export function diagnoseNar(input: {
  planData?: Record<string, unknown> | null;
  shots?: Array<Record<string, unknown>> | null;
}): GateFinding[] {
  const { planLines, shotLines } = collectPlanAndShotLines(input);
  return collectNar14Nar15Fails(planLines, shotLines).map((f: NarFail) => ({
    id: f.id,
    message: f.message,
    lineId: f.lineId,
    shotIndex: f.shotIndex,
    field: f.field,
    reverseTrigger: f.id === "NAR-15" ? "nar15_reaction" : "nar14_split",
  }));
}

export function diagnoseNarOk(input: {
  planData?: Record<string, unknown> | null;
  shots?: Array<Record<string, unknown>> | null;
  only?: "NAR-14" | "NAR-15";
}): boolean {
  const fails = diagnoseNar(input);
  if (input.only) return !fails.some((f) => f.id === input.only);
  return fails.length === 0;
}

export function diagnoseCast(bundle: ScriptBundle): GateFinding[] {
  const a = auditCastCoverage(bundle);
  if (!a.block) return [];
  return [
    {
      id: "DC-16",
      message: `说话人/上镜码未入 CD 或仅为 stub：${a.labels.join("、")}`,
      reverseTrigger: "dc16_cast",
    },
    {
      id: "DG-CD-COVERAGE",
      message: `characterDesign 配角入册缺口（DC-16）：${a.labels.join("、")}`,
      reverseTrigger: "dc16_cast",
    },
  ];
}

/** Non-human / UI speakers that must not be CAST characters. */
const NON_HUMAN_SPEAKER = /^(APP|UI|系统|旁白系统|SFX|BGM|字幕)$/i;

export function diagnoseSpeakerBare(shots: Array<Record<string, unknown>>, planLines?: Nar14LineLike[]): GateFinding[] {
  const finds: GateFinding[] = [];
  const check = (speaker: string, where: string) => {
    const sp = String(speaker ?? "").trim();
    if (!sp) return;
    if (/\(OS\)|\(VO\)|（OS）|（VO）/i.test(sp)) {
      finds.push({
        id: "DEX-SPEAKER-BARE",
        message: `${where}: speaker 含 OS/VO，应裸名 + type 字段：${sp}`,
        reverseTrigger: "speaker_bare",
      });
    }
    if (NON_HUMAN_SPEAKER.test(sp)) {
      finds.push({
        id: "DEX-SPEAKER-BARE",
        message: `${where}: 非人/UI 不可作 speaker：${sp}`,
        reverseTrigger: "speaker_bare",
      });
    }
  };
  for (const l of planLines ?? []) check(String(l.speaker ?? ""), "dialoguePlan");
  for (const s of shots) {
    const lines = ((s.narrative as { dialogue?: { lines?: { speaker?: string }[] } })?.dialogue?.lines ?? []) as {
      speaker?: string;
    }[];
    for (const l of lines) check(String(l.speaker ?? ""), `shot${s.shotIndex ?? "?"}`);
  }
  return finds;
}

export function mountSeverity(
  ruleId: string,
  stageId: string,
  depth: string,
  matrix?: MountMatrix,
): "BLOCK" | "WARN" | "off" {
  const m = matrix ?? loadDesignGateMountMatrix();
  const row = m.rows.find((r) => r.ruleId === ruleId);
  if (!row) return "off";
  if (!row.stages.includes(stageId) && !row.stages.includes("*")) return "off";
  const depthKey = depth === "light" ? "light" : "viral";
  const fromDepth = row.depth?.[depthKey as "viral" | "light"];
  if (fromDepth === "BLOCK" || fromDepth === "WARN" || fromDepth === "off") return fromDepth;
  return row.severity[stageId] ?? row.severity["*"] ?? "WARN";
}

export function diagnoseDc01(input: {
  planData?: Record<string, unknown> | null;
  shots?: Array<Record<string, unknown>> | null;
}): GateFinding[] {
  const { planLines } = collectPlanAndShotLines(input);
  const planIds = planLines.map((l) => String(l.lineId ?? "").trim()).filter(Boolean);
  if (!planIds.length) return [];
  const present = new Set<string>();
  for (const s of input.shots ?? []) {
    const lines =
      ((s.narrative as { dialogue?: { lines?: { lineId?: string }[] } })?.dialogue?.lines ?? []) as {
        lineId?: string;
      }[];
    for (const l of lines) {
      if (l.lineId) present.add(String(l.lineId));
    }
  }
  const missing = planIds.filter((id) => !present.has(id));
  if (!missing.length) return [];
  return [
    {
      id: "DC-01",
      message: `dialoguePlan lineId 未覆盖到 shots：${missing.slice(0, 12).join(", ")}${missing.length > 12 ? "…" : ""}`,
      reverseTrigger: "dialogue_hash_mismatch",
      field: "preDesignPack.shots[].narrative.dialogue.lines[].lineId",
    },
  ];
}

/** Depth policy: viral hard BLOCK; light may WARN (export still hard for must-track). */
export function depthMountPolicy(depth: string): { hardExit: boolean; lightWarnOk: boolean } {
  if (depth === "light") return { hardExit: false, lightWarnOk: true };
  return { hardExit: true, lightWarnOk: false };
}

/** CI helper: export block ids that lack a mount row (orphan). */
export function findOrphanExportRuleIds(exportBlockIds: string[], matrix?: MountMatrix): string[] {
  const m = matrix ?? loadDesignGateMountMatrix();
  const known = new Set(m.rows.map((r) => r.ruleId));
  return exportBlockIds.filter((id) => !known.has(id) && !id.startsWith("DFW-") && !id.startsWith("MOD-"));
}

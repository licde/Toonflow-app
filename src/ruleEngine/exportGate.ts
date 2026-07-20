/**
 * T3 design export gate — server authority before Chat export / import.
 */
import { inspectBundle } from "./portable/inspectBundle";
import type { InspectBundleResult } from "./portable/types";
import { readFixtureJson } from "./utils/fixturesPath";
import { prepareBundleForInspect } from "./bundle/prepareBundleForInspect";
import { prepareBundleWithLog } from "./bundle/schema";
import { runDesignPhaseGates, type DesignGateFinding } from "./bundle/designPhaseGates";
import { auditBundleIntegrity, type IntegrityGap } from "./bundle/bundleIntegrityAudit";
import { auditImplementationFieldWalk, buildMissingFieldReport, type FieldWalkGap, type MissingFieldRow } from "./bundle/auditImplementationFieldWalk";
import { auditCastCoverage } from "./bundle/designExportHelpers";
import type { ScriptBundle } from "./bundle/types";
import type { ClosureTier } from "./portable/types";

export interface ExportGateRepairHint {
  id: string;
  chatTemplate?: string;
  ruleId?: string;
}

export interface ExportGateCoverage {
  matrixTotal: number;
  blocks: number;
  warns: number;
  softPatchEligible: number;
}

export interface ClosureSnapshot {
  tier: ClosureTier;
  blocked: boolean;
  blockIds: string[];
  warnIds: string[];
  checkedAt: string;
  rulePackVersion: string;
  /** DC-16 cast diagnostics for troubleshoot */
  speakerOrphans?: string[];
  stubCodes?: string[];
  castGapLabels?: string[];
}

export interface ExportGateResult {
  exportAllowed: boolean;
  tier: ClosureTier;
  bundle: ScriptBundle;
  inspected: InspectBundleResult;
  designFindings: DesignGateFinding[];
  integrityGaps: IntegrityGap[];
  fieldWalkGaps: FieldWalkGap[];
  missingFieldReport: MissingFieldRow[];
  missingFieldSummary: string;
  repairHints: ExportGateRepairHint[];
  closureSnapshot: ClosureSnapshot;
  coverage: ExportGateCoverage;
  blocks: { id: string; message: string; field?: string }[];
  warns: { id: string; message: string; field?: string }[];
  shapeSalvageLog?: import("./bundle/shapeSalvageTypes").ShapeSalvageEntry[];
  /** One-copy Chat repair brief (SSOT) */
  chatRepairText: string;
}

function loadRepairHints(ids: string[]): ExportGateRepairHint[] {
  const catalog = readFixtureJson<{
    hints?: { id: string; ruleId: string; qpId?: string; chatTemplate?: string; checkIds?: string[] }[];
  }>("repair_hint_catalog.json", { hints: [] });
  const idSet = new Set(ids);
  return (catalog.hints ?? [])
    .filter(
      (h) =>
        idSet.has(h.ruleId) ||
        idSet.has(h.id) ||
        (h.qpId && idSet.has(h.qpId)) ||
        (h.checkIds?.some((c) => idSet.has(c)) ?? false),
    )
    .map((h) => ({ id: h.id, chatTemplate: h.chatTemplate, ruleId: h.ruleId }));
}

function aggregateRepairHints(
  inspected: InspectBundleResult,
  designFindings: DesignGateFinding[],
  fieldWalk: FieldWalkGap[],
): ExportGateRepairHint[] {
  const ids = new Set<string>();
  for (const c of [
    ...(inspected.closureChecks?.dc ?? []),
    ...(inspected.closureChecks?.pc ?? []),
    ...(inspected.closureChecks?.gc ?? []),
    ...(inspected.closureChecks?.ic ?? []),
  ]) {
    if (!c.passed && c.id) ids.add(c.id);
  }
  for (const i of inspected.qualityGate?.issues ?? []) {
    if (i.id) ids.add(i.id);
  }
  for (const g of inspected.chatPromptGaps ?? []) {
    if (g.id) ids.add(g.id);
  }
  for (const f of designFindings) {
    ids.add(f.id);
  }
  for (const f of fieldWalk) {
    ids.add(f.id);
  }
  const fromInspect = inspected.repairHints ?? [];
  const loaded = loadRepairHints([...ids]);
  const byId = new Map<string, ExportGateRepairHint>();
  for (const h of [...fromInspect, ...loaded]) {
    if (!byId.has(h.id)) byId.set(h.id, h);
  }
  return [...byId.values()];
}

export interface ChatRepairBlockLine {
  id: string;
  message: string;
  shotIndex?: number;
  field?: string;
}

const CHAT_REPAIR_BLOCK_CAP = 24;

/**
 * One-copy Chat repair brief: rule ids + missing fields + BLOCK lines + RH templates.
 */
export function buildAggregatedChatRepairText(
  hints: ExportGateRepairHint[],
  blockIds: string[],
  missingSummary?: string,
  blocks?: ChatRepairBlockLine[],
): string {
  const lines = [
    "【闭环修复清单 — 请按项修改 JSON 字段，勿只改 audit 自报 / modalityPromptAudit】",
    `待处理规则：${[...new Set(blockIds)].join(", ") || "（无 BLOCK）"}`,
    "",
  ];
  const orphanBlocks = (blocks ?? []).filter((b) => /孤儿场|场镜基数|幽灵场/.test(b.message));
  if (orphanBlocks.length) {
    lines.push("【主因·结构】勿只补其他场的 fxPrompt：");
    for (const b of orphanBlocks.slice(0, 8)) {
      lines.push(`- ${b.id}: ${b.message}`);
    }
    lines.push("");
  }
  if (blocks?.length) {
    lines.push("【BLOCK 明细】");
    for (const b of blocks.slice(0, CHAT_REPAIR_BLOCK_CAP)) {
      const loc =
        b.shotIndex != null ? `镜${b.shotIndex}` : b.field?.trim() ? b.field : "";
      lines.push(`- ${b.id}${loc ? ` (${loc})` : ""}: ${b.message}`);
    }
    if (blocks.length > CHAT_REPAIR_BLOCK_CAP) {
      lines.push(`…另有 ${blocks.length - CHAT_REPAIR_BLOCK_CAP} 项 BLOCK`);
    }
    lines.push("");
  }
  if (missingSummary?.trim()) {
    lines.push("【缺失字段清单 — implementationPlan→SB→MD】", missingSummary.trim(), "");
  }
  for (const h of hints) {
    if (h.chatTemplate) lines.push(`[${h.id}] ${h.chatTemplate}`);
  }
  lines.push(
    "",
    "改完后重新 dryRun/exportGate 再导入；merge 保持 preserveMedia。回推舞台仅跳转，不改数据。",
  );
  return lines.join("\n");
}

/** Payload for import/export 400 when export gate blocks. */
export function formatExportGateBlockPayload(result: ExportGateResult): Record<string, unknown> {
  const chatRepairText = buildAggregatedChatRepairText(
    result.repairHints,
    result.closureSnapshot.blockIds,
    result.missingFieldSummary,
    result.blocks,
  );
  return {
    code: "EXPORT_GATE_BLOCK",
    exportAllowed: false,
    tier: result.tier,
    blocks: result.blocks,
    warns: result.warns,
    repairHints: result.repairHints,
    chatRepairText,
    missingFieldReport: result.missingFieldReport,
    missingFieldSummary: result.missingFieldSummary,
    closureSnapshot: result.closureSnapshot,
    coverage: result.coverage,
    fieldWalkGaps: result.fieldWalkGaps,
    designFindings: result.designFindings,
    shapeSalvageLog: result.shapeSalvageLog,
    rePushPlan: result.inspected?.rePushPlan ?? [],
  };
}

export interface RunExportGateOpts {
  tier?: ClosureTier;
  /** Caller already ran prepareBundleForInspect */
  bundle?: ScriptBundle;
  alreadyPrepared?: boolean;
  shapeSalvageLog?: import("./bundle/shapeSalvageTypes").ShapeSalvageEntry[];
  /**
   * Import/dryRun may accept server salvage. Chat export (default false) BLOCKs when
   * shape salvage had to coerce object-shaped shot fields (visualEffect etc.).
   */
  allowShapeSalvage?: boolean;
}

export function runExportGate(raw: unknown, opts: RunExportGateOpts = {}): ExportGateResult {
  const prep =
    opts.alreadyPrepared && opts.bundle
      ? {
          bundle: opts.bundle,
          tier: opts.tier ?? inferTier(opts.bundle),
          shapeSalvageLog: opts.shapeSalvageLog ?? prepareBundleWithLog(raw).shapeSalvageLog,
        }
      : prepareBundleForInspect(raw, { ingestHeal: false });
  const bundle = prep.bundle;
  const tier = opts.tier ?? prep.tier;

  const designGates = runDesignPhaseGates(bundle);
  const integrityGaps = auditBundleIntegrity(bundle);
  const fieldWalkReport = buildMissingFieldReport(bundle);
  const fieldWalkGaps = auditImplementationFieldWalk(bundle);
  const inspected = inspectBundle(bundle, { tier, alreadyParsed: true });

  const blocks: { id: string; message: string; field?: string }[] = [];
  const warns: { id: string; message: string; field?: string }[] = [];

  for (const f of designGates.findings) {
    const row = { id: f.id, message: f.message, field: f.field };
    if (f.severity === "BLOCK") blocks.push(row);
    else warns.push(row);
  }
  for (const g of integrityGaps) {
    const row = { id: g.id, message: g.message, field: g.field };
    if (g.severity === "BLOCK") blocks.push(row);
    else if (g.severity === "WARN") warns.push(row);
  }
  for (const g of fieldWalkGaps) {
    const row = { id: g.id, message: g.message, field: g.field };
    if (g.severity === "BLOCK") blocks.push(row);
    else warns.push(row);
  }
  for (const i of inspected.qualityGate?.issues ?? []) {
    const row = { id: i.id, message: i.message, field: i.evidence ? JSON.stringify(i.evidence) : undefined };
    if (i.severity === "BLOCK") blocks.push(row);
    else warns.push(row);
  }
  if (inspected.blocked && tier === "T3") {
    for (const c of [
      ...(inspected.closureChecks?.dc ?? []),
      ...(inspected.closureChecks?.pc ?? []),
    ]) {
      if (!c.passed && c.severity === "BLOCK" && c.id) {
        if (!blocks.some((b) => b.id === c.id)) {
          blocks.push({ id: c.id, message: c.message ?? c.id });
        }
      }
    }
  }

  const salvageLog = prep.shapeSalvageLog ?? [];
  const chatShapeBlocks = salvageLog.filter((e) =>
    /SH-VISUAL-EFFECT-OBJ|SH-AUDIO-CUE-OBJ/.test(e.ruleId),
  );
  if (opts.allowShapeSalvage !== true && chatShapeBlocks.length) {
    const veN = chatShapeBlocks.filter((e) => e.ruleId === "SH-VISUAL-EFFECT-OBJ").length;
    blocks.push({
      id: "DG-CHAT-SHAPE-VE",
      message: `Chat 导出形态违规：需将 visualEffect/audioCue 写成 string（检测到 ${chatShapeBlocks.length} 处对象形态，含 visualEffect×${veN}）。请按 RH-MOD-01 修改 JSON，勿依赖服务器 salvage。`,
      field: "preDesignPack.shots[].visualEffect",
    });
  }

  const matrix = readFixtureJson<{ entries?: { id: string; softPatch?: boolean }[] }>("quality_matrix.json", { entries: [] });
  const matrixTotal = matrix.entries?.length ?? 0;
  const blockIds = [...new Set(blocks.map((b) => b.id))];
  const warnIds = [...new Set(warns.map((w) => w.id))];
  const softPatchEligible = (matrix.entries ?? []).filter((e) => e.softPatch && blockIds.includes(e.id)).length;

  const exportAllowed = blocks.length === 0 && !(tier === "T3" && inspected.blocked && blockIds.length > 0);

  let repairHints = aggregateRepairHints(inspected, designGates.findings, fieldWalkGaps);
  if (blocks.some((b) => b.id === "DG-CHAT-SHAPE-VE") && !repairHints.some((h) => h.id === "RH-MOD-01")) {
    const mod = loadRepairHints(["RH-MOD-01"]);
    repairHints = [...repairHints, ...mod];
  }

  const cast = auditCastCoverage(bundle);
  const closureSnapshot: ClosureSnapshot = {
    tier,
    blocked: !exportAllowed,
    blockIds,
    warnIds,
    checkedAt: new Date().toISOString(),
    rulePackVersion: inspected.rulePackVersion,
    speakerOrphans: cast.missingSpeakers,
    stubCodes: cast.stubOrIncomplete,
    castGapLabels: cast.labels,
  };

  // Cast gaps → missingFieldReport rows for troubleshoot
  const castRows: MissingFieldRow[] = cast.labels.map((label, i) => ({
    id: `DC-16-${i + 1}`,
    severity: "BLOCK" as const,
    sourcePath: "dialogue.speaker|charCodes|B6.characters",
    targetPath: "characterDesign.assets",
    fieldId: label,
    message: `配角入册缺口: ${label}（须 code/name/L0.identity，禁止仅 stub）`,
    repairHintId: "RH-DC-16",
  }));
  const missingFieldReport = [...fieldWalkReport.rows, ...castRows];
  const missingFieldSummary = [fieldWalkReport.summary, cast.block ? `DC-16: ${cast.labels.join("、")}` : ""]
    .filter(Boolean)
    .join("\n");

  return {
    exportAllowed,
    tier,
    bundle,
    inspected,
    designFindings: designGates.findings,
    integrityGaps,
    fieldWalkGaps,
    missingFieldReport,
    missingFieldSummary,
    repairHints,
    closureSnapshot,
    coverage: {
      matrixTotal,
      blocks: blockIds.length,
      warns: warnIds.length,
      softPatchEligible,
    },
    blocks,
    warns,
    shapeSalvageLog: prep.shapeSalvageLog,
    chatRepairText: buildAggregatedChatRepairText(repairHints, blockIds, missingFieldSummary, blocks),
  };
}

function inferTier(bundle: ScriptBundle): ClosureTier {
  if (bundle.modalityPromptAudit) return "T3";
  const shots = bundle.preDesignPack?.shots ?? [];
  if (shots.some((s) => s.generation?.imagePrompt?.trim())) return "T3";
  if (bundle.characterDesign || bundle.visualLockTable) return "T2";
  return "T1";
}

export class ExportGateBlockError extends Error {
  readonly details: ExportGateResult;

  constructor(result: ExportGateResult) {
    const ids = result.blocks.map((b) => b.id).join(", ");
    super(`EXPORT_GATE_BLOCK: ${ids}`);
    this.name = "ExportGateBlockError";
    this.details = result;
  }
}

export function assertExportAllowed(raw: unknown, opts?: RunExportGateOpts): ExportGateResult {
  const result = runExportGate(raw, opts);
  if (!result.exportAllowed) throw new ExportGateBlockError(result);
  return result;
}

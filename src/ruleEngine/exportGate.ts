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
import { buildChatRepairDeeplinks, formatDeeplinkSection } from "./design/chatRepairDeeplink";
import { classifyNar14ForChatRepair } from "./design/nar14Residual";
import { classifyLipForChatRepair } from "./design/lipSplit";
import { auditCastCoverage } from "./bundle/designExportHelpers";
import type { ScriptBundle } from "./bundle/types";
import type { Nar14LineLike } from "./nar14ClauseSplit";
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
  /** Human-readable「已自动适配」when salvage ran */
  shapeSalvageSummary?: string;
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

const DEFAULT_MUST_EDIT = new Set([
  "NAR-15",
  "DC-16",
  "DG-CD-COVERAGE",
  "DG-FALSE-GREEN-FX",
  "DG-NAR-SELFCHECK",
  "DG-FX-DUAL-TRACK",
  "DG-SCENE-ORPHAN-FX",
  "DG-CHAT-SHAPE-VE",
  "DEX-VIS-SPLIT",
  "DEX-LIP-SPLIT",
  "LIP-01",
  "QP-02",
  "DEX-QP-02",
  "CHAT-SB-01",
]);

const DEFAULT_AUTO_ADAPT = new Set([
  "DFW-DURATION",
  "MOD-03",
  "MOD-IMG-M1",
  "MOD-VID-M1",
  "MOD-AUD-M1",
  "DG-SCENE-KEY",
  // NAR-14 / DEX-VIS-SPLIT are NOT blanket auto — see classifyBlockId
]);

function loadRepairLayerSets(): { mustEdit: Set<string>; autoAdapt: Set<string> } {
  try {
    const matrix = readFixtureJson<{
      mustEditBlockIds?: string[];
      autoAdaptBlockIds?: string[];
    }>("semantic_gate_dual_track_matrix.json", {});
    return {
      mustEdit: new Set([...(matrix.mustEditBlockIds ?? []), ...DEFAULT_MUST_EDIT]),
      autoAdapt: new Set(
        [...(matrix.autoAdaptBlockIds ?? []), ...DEFAULT_AUTO_ADAPT].filter(
          (id) => id !== "NAR-14" && id !== "DEX-VIS-SPLIT" && id !== "LIP-01",
        ),
      ),
    };
  } catch {
    return { mustEdit: DEFAULT_MUST_EDIT, autoAdapt: DEFAULT_AUTO_ADAPT };
  }
}

function classifyBlockId(
  id: string,
  layers: { mustEdit: Set<string>; autoAdapt: Set<string> },
  ctx?: { nar14Class?: "must" | "auto" | "none"; lipClass?: "must" | "auto" | "none" },
): "must" | "auto" | "other" {
  if (id === "NAR-14" || id.startsWith("NAR-14")) {
    if (ctx?.nar14Class === "auto") return "auto";
    return "must"; // residual or unknown → 须手改
  }
  if (id === "LIP-01" || id === "PR-09" || id === "DEX-LIP-SPLIT") {
    if (ctx?.lipClass === "auto") return "auto";
    return "must"; // needsSplit/lipOver → 须手改; only silent raise → auto
  }
  if (id === "DEX-VIS-SPLIT" || id.startsWith("VIS-MULTI")) return "must";
  if (layers.autoAdapt.has(id)) return "auto";
  if (layers.mustEdit.has(id) || id.startsWith("NAR-15") || id.startsWith("DC-16")) return "must";
  if (id.startsWith("DFW-") || id.startsWith("MOD-")) return "auto";
  return "other";
}

/**
 * One-copy Chat repair brief: rule ids + missing fields + BLOCK lines + RH templates.
 * Layers 【须手改】vs【导入将自动适配】 so users do not rework auto-healable items.
 */
export function buildAggregatedChatRepairText(
  hints: ExportGateRepairHint[],
  blockIds: string[],
  missingSummary?: string,
  blocks?: ChatRepairBlockLine[],
  opts?: {
    planLines?: Nar14LineLike[];
    shots?: Record<string, unknown>[];
    warnIds?: string[];
    warnRows?: { id: string; message: string }[];
  },
): string {
  const layers = loadRepairLayerSets();
  const nar14Class = classifyNar14ForChatRepair({
    planLines: opts?.planLines,
    shots: opts?.shots,
    blockHasNar14: blockIds.some((id) => id === "NAR-14" || id.startsWith("NAR-14")),
  });
  const lipClass = classifyLipForChatRepair({
    shots: opts?.shots,
    blockHasLip01: blockIds.some((id) => id === "LIP-01" || id === "PR-09" || id === "DEX-LIP-SPLIT"),
  });
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

  const mustBlocks: ChatRepairBlockLine[] = [];
  const autoBlocks: ChatRepairBlockLine[] = [];
  const otherBlocks: ChatRepairBlockLine[] = [];
  for (const b of blocks ?? []) {
    const kind = classifyBlockId(b.id, layers, { nar14Class, lipClass });
    if (kind === "must") mustBlocks.push(b);
    else if (kind === "auto") autoBlocks.push(b);
    else otherBlocks.push(b);
  }

  const pushBlockSection = (title: string, list: ChatRepairBlockLine[]) => {
    if (!list.length) return;
    lines.push(title);
    for (const b of list.slice(0, CHAT_REPAIR_BLOCK_CAP)) {
      const loc = b.shotIndex != null ? `镜${b.shotIndex}` : b.field?.trim() ? b.field : "";
      lines.push(`- ${b.id}${loc ? ` (${loc})` : ""}: ${b.message}`);
    }
    if (list.length > CHAT_REPAIR_BLOCK_CAP) {
      lines.push(`…另有 ${list.length - CHAT_REPAIR_BLOCK_CAP} 项`);
    }
    lines.push("");
  };

  pushBlockSection(
    "【须手改 · Chat 契约】NAR 残句/重设计、DC、真缺 F0·散文/假 audit — 导入不会替你编造；残句须改短/显式 splitHint/Confirm 拆镜",
    mustBlocks,
  );
  pushBlockSection(
    "【导入将自动适配 · 可不手改】duration / 空 prompt 种子 / 中文 sceneKey / 形态 salvage；NAR-14 仅标点 A 拆净或已 B 绑 hint 清零 — 残句≠可不手改",
    autoBlocks,
  );
  pushBlockSection("【其他 BLOCK】", otherBlocks);

  // Always emit layer legend so Chat/UI can rely on headers even when one bucket is empty
  if ((blocks?.length ?? 0) > 0 && autoBlocks.length === 0) {
    lines.push(
      "【导入将自动适配 · 可不手改】（本包暂无此类 BLOCK；若仅有 duration/空 prompt/sceneKey，dryRun·落库会修）",
      "",
    );
  }
  if ((blocks?.length ?? 0) > 0 && mustBlocks.length === 0) {
    lines.push("【须手改 · Chat 契约】（本包暂无 NAR/DC 等须手改项）", "");
  }

  if (missingSummary?.trim()) {
    const missLines = missingSummary.trim().split("\n");
    const autoMiss = missLines.filter((l) => /MOD-03|MOD-IMG|MOD-VID|DFW-DURATION|audioPrompt|imagePrompt|videoPrompt|duration/i.test(l));
    const mustMiss = missLines.filter((l) => !autoMiss.includes(l));
    if (mustMiss.length) {
      lines.push("【缺失字段 · 须手改】", ...mustMiss, "");
    }
    if (autoMiss.length) {
      lines.push("【缺失字段 · 导入将自动适配】", ...autoMiss, "");
    }
  }
  // Primary RH = match current BLOCK ids only; demote catalog noise that made packs look "all red"
  const blockSet = new Set(blockIds);
  const hintPrimary: ExportGateRepairHint[] = [];
  const hintSecondary: ExportGateRepairHint[] = [];
  for (const h of hints) {
    const hit =
      blockSet.size === 0 ||
      blockSet.has(h.id) ||
      (h.ruleId ? blockSet.has(h.ruleId) : false) ||
      blockSet.has(String(h.id).replace(/^RH-/, "")) ||
      [...blockSet].some((bid) => h.id.includes(bid) || (h.ruleId && h.ruleId.includes(bid)));
    if (hit) hintPrimary.push(h);
    else hintSecondary.push(h);
  }
  for (const h of hintPrimary) {
    if (h.chatTemplate) lines.push(`[${h.id}] ${h.chatTemplate}`);
  }
  if (hintSecondary.length && blockSet.size > 0) {
    lines.push("", "【参考 RH · 非本包主因 BLOCK】下列非当前待处理规则，勿当作本包全红：");
    for (const h of hintSecondary.slice(0, 4)) {
      if (h.chatTemplate) lines.push(`[${h.id}] ${h.chatTemplate}`);
    }
  } else if (blockSet.size === 0) {
    for (const h of hintSecondary) {
      if (h.chatTemplate) lines.push(`[${h.id}] ${h.chatTemplate}`);
    }
  }
  const deeplinkSec = formatDeeplinkSection(buildChatRepairDeeplinks(blockIds));
  if (deeplinkSec) lines.push("", deeplinkSec);
  const visBlocks = (blocks ?? []).filter((b) => /DEX-VIS|VIS-MULTI|VIS-BEAT|VIS-TAG|VIS-SYNC/i.test(b.id));
  if (visBlocks.length || blockIds.some((id) => /DEX-VIS|VIS-MULTI|VIS-BEAT|VIS-TAG/i.test(id))) {
    lines.push(
      "",
      "【VisBeat · 须手改 Confirm】DEX-VIS-SPLIT / VIS-MULTI-BEAT 不进「可不手改」；须 Confirm 拆镜（confirmClusterSplit|VisBeatConfirmBar）或艺术 override，禁止只靠 suggestor 静默拆。",
      "允许 visualBeatTags：reveal,prop_insert,reaction,face_cu,establish,action,speak,os_vo",
      "深链：toonflow://stage/SB?trigger=visual_multi_beat → EN；Suggestor 不得直接立法",
    );
    for (const b of visBlocks.slice(0, 6)) {
      lines.push(`- ${b.id}: ${b.message}`);
    }
  }
  const stillIds = [...new Set([...blockIds, ...(opts?.warnIds ?? [])])].filter((id) =>
    /DEX-STILL|STILL-FIRSTFRAME/i.test(id),
  );
  const stillWarns = (opts?.warnRows ?? []).filter((w) => /DEX-STILL|STILL-FIRSTFRAME/i.test(w.id));
  if (stillIds.length || stillWarns.length) {
    lines.push(
      "",
      "【静帧 Identity · Chat 须改】DEX-STILL-* / 首帧脏：先回 SB 改 visualDescription（单拍裸名、禁（OS）人名、禁对白瞬间神态），再重出静照；禁止只 regen。",
      "深链：toonflow://stage/SB?trigger=still_firstframe_dirty",
    );
    for (const id of stillIds.slice(0, 8)) lines.push(`- ${id}`);
    for (const w of stillWarns.slice(0, 6)) lines.push(`- ${w.id}: ${w.message}`);
  }
  lines.push(
    "",
    "须手改项改正后重新 exportGate；仅自动适配项可直接 dryRun/导入。merge 保持 preserveMedia。回推舞台仅跳转，不改数据。",
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
    {
      warnIds: result.closureSnapshot.warnIds,
      warnRows: result.warns,
    },
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

  // Still identity WARN relay for Chat (DEX-STILL-*) — designExit severity=WARN
  try {
    const { shouldWarnOneBeat, hasOsInNameDisplay, hasDesignFiller } = require("./compilers/stillIdentitySsot") as typeof import("./compilers/stillIdentitySsot");
    const shotsForStill = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
    for (const s of shotsForStill) {
      const vd = String(s.visualDescription ?? "").trim();
      if (vd && shouldWarnOneBeat(vd) && !warns.some((w) => w.id === "DEX-STILL-ONEBEAT")) {
        warns.push({ id: "DEX-STILL-ONEBEAT", message: "visualDescription 多拍须拆镜或 VisBeat Confirm", field: "visualDescription" });
      }
      if (vd && hasOsInNameDisplay(vd) && !warns.some((w) => w.id === "DEX-STILL-OS-NAME")) {
        warns.push({ id: "DEX-STILL-OS-NAME", message: "画面描写含（OS）须裸名", field: "visualDescription" });
      }
      if (vd && hasDesignFiller(vd) && !warns.some((w) => w.id === "DEX-STILL-FILLER")) {
        warns.push({ id: "DEX-STILL-FILLER", message: "禁对白瞬间神态等无画面填料", field: "visualDescription" });
      }
    }
    const cdAssets = (bundle.characterDesign as { assets?: { name?: string }[] } | undefined)?.assets ?? [];
    for (const a of cdAssets) {
      if (hasOsInNameDisplay(String(a.name ?? "")) && !warns.some((w) => w.id === "DEX-STILL-OS-NAME")) {
        warns.push({ id: "DEX-STILL-OS-NAME", message: "CD.name 含（OS）须裸名", field: "characterDesign.assets.name" });
      }
    }
  } catch {
    /* optional */
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
  if (warnIds.some((id) => id.startsWith("DEX-STILL")) && !repairHints.some((h) => h.id === "RH-STILL-FIRSTFRAME")) {
    repairHints = [...repairHints, ...loadRepairHints(["RH-STILL-FIRSTFRAME"])];
  }

  const cast = auditCastCoverage(bundle);
  const planLines =
    ((bundle.planData as { dialoguePlan?: { lines?: Nar14LineLike[] } } | undefined)?.dialoguePlan?.lines ??
      []) as Nar14LineLike[];
  const shotRows = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];

  // Authority: overwrite Chat false-green selfcheck when server NAR fails
  const serverNar = designGates.findings.filter((f) => f.id === "NAR-14" || f.id === "NAR-15" || f.id === "DG-NAR-SELFCHECK");
  if (serverNar.length || blockIds.some((id) => /^NAR-1[45]$/.test(id) || id === "DG-NAR-SELFCHECK")) {
    const narSelf = (bundle.narrativeSelfcheck ?? {}) as { passed?: boolean; failedIds?: string[] };
    const failIds = [
      ...new Set([
        ...(narSelf.failedIds ?? []),
        ...designGates.findings.filter((f) => f.id === "NAR-14" || f.id === "NAR-15").map((f) => f.id),
      ]),
    ];
    bundle.narrativeSelfcheck = {
      ...narSelf,
      passed: false,
      failedIds: failIds.length ? failIds : ["NAR-14"],
      serverOverwritten: true,
      checkedAt: new Date().toISOString(),
    };
  }

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
    shapeSalvageSummary: prep.shapeSalvageSummary,
    chatRepairText: buildAggregatedChatRepairText(repairHints, blockIds, missingFieldSummary, blocks, {
      planLines,
      shots: shotRows,
      warnIds,
      warnRows: warns,
    }),
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

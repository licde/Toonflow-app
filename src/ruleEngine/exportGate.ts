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
import {
  classifyLipForChatRepairDetailed,
  detectLipSplitPressure,
} from "./design/lipSplit";
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
  /** SB designExit failed — true when【设计未闭合】banner applies */
  designExitIncomplete?: boolean;
  /** UI toast SSOT — 阻断时不以「已自动修复」冒充契约已修 */
  previewStatusLine: string;
  /** Design-layer auto-close summary (NAR-15/DC mirror/EXTRA noise) */
  autoClosed?: {
    applied: boolean;
    clearedIds: string[];
    remainingFailedIds: string[];
    changes: { ruleId: string; detail: string; path?: string }[];
    chatRetryRequired: boolean;
  };
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
  "DEX-LITERARY-STALE",
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
  "DEX-CAM-FIT",
  // Theme-glue untilClear (G14) — 勿诱手改 JSON
  "DEX-PROP-CONT",
  "DEX-INTENT-PIC",
  "DEX-SHOT-INTENT",
  "FALSE_GREEN_SELFCHECK",
  "DG-CAM-FIT-FALSE-GREEN",
  "DG-NAR-SELFCHECK",
  "FX-GRADE-01",
  "DEX-EXPR-SPEAK",
  "CHAT-AUD-01",
  "PROMPT-FIDELITY",
  "PROMPT_FIDELITY",
  // NAR-14 / DEX-VIS-SPLIT are NOT blanket auto — see classifyBlockId
]);

function loadRepairLayerSets(): {
  mustEdit: Set<string>;
  autoAdapt: Set<string>;
  untilClearAuto: Set<string>;
} {
  try {
    const matrix = readFixtureJson<{
      mustEditBlockIds?: string[];
      autoAdaptBlockIds?: string[];
      importSalvageRegistry?: { ruleId?: string; untilClear?: boolean; confirmOnly?: boolean }[];
    }>("semantic_gate_dual_track_matrix.json", {});
    const untilClearAuto = new Set(
      (matrix.importSalvageRegistry ?? [])
        .filter(
          (e) =>
            e.untilClear === true &&
            e.confirmOnly !== true &&
            e.ruleId &&
            e.ruleId !== "IRD-CONFIRM" &&
            !String(e.ruleId).startsWith("DEX-LIT-") &&
            e.ruleId !== "DEX-DUP-VD" &&
            e.ruleId !== "DEX-QP-02",
        )
        .map((e) => String(e.ruleId)),
    );
    // Derived false-green honesty — clear by root heal / selfcheck overwrite, not hand JSON
    untilClearAuto.add("FALSE_GREEN_SELFCHECK");
    untilClearAuto.add("DG-CAM-FIT-FALSE-GREEN");
    untilClearAuto.add("DG-NAR-SELFCHECK");
    return {
      mustEdit: new Set([...(matrix.mustEditBlockIds ?? []), ...DEFAULT_MUST_EDIT]),
      autoAdapt: new Set(
        [...(matrix.autoAdaptBlockIds ?? []), ...DEFAULT_AUTO_ADAPT, ...untilClearAuto].filter(
          (id) => id !== "NAR-14" && id !== "DEX-VIS-SPLIT" && id !== "LIP-01",
        ),
      ),
      untilClearAuto,
    };
  } catch {
    return { mustEdit: DEFAULT_MUST_EDIT, autoAdapt: DEFAULT_AUTO_ADAPT, untilClearAuto: DEFAULT_AUTO_ADAPT };
  }
}

function classifyBlockId(
  id: string,
  layers: { mustEdit: Set<string>; autoAdapt: Set<string>; untilClearAuto?: Set<string> },
  ctx?: {
    nar14Class?: "must" | "auto" | "none";
    lipClass?: "must" | "auto" | "none";
    /** Pack has mustConfirm lip shots — DFW-DURATION must not claim 导入可愈 for those. */
    lipMustPresent?: boolean;
    /** Only raiseable lip left — design should raise; Chat 主责 not 导入. */
    lipRaiseOnly?: boolean;
  },
): "must" | "auto" | "other" {
  if (id === "NAR-14" || id.startsWith("NAR-14")) {
    if (ctx?.nar14Class === "auto") return "auto";
    return "must"; // residual or unknown → 须手改
  }
  if (id === "LIP-01" || id === "PR-09" || id === "DEX-LIP-SPLIT") {
    if (ctx?.lipClass === "auto") return "auto"; // 仅残留可抬（兜底文案）；设计主路径应已抬净
    return "must"; // needsSplit/lipOver → 须手改
  }
  if (id === "DFW-DURATION") {
    // 同镜/同包：超限 LIP 须手改时禁 DFW「导入可愈」互斥谎称；可抬残留归设计主责
    if (ctx?.lipMustPresent || ctx?.lipRaiseOnly) return "must";
    return "auto";
  }
  if (id === "DEX-VIS-SPLIT" || id.startsWith("VIS-MULTI")) return "must";
  if (id === "DEX-LITERARY-STALE") return "must";
  if (id === "DEX-DUP-VD" || id === "DEX-QP-02" || id === "QP-02") return "must";
  // Theme glue untilClear wins over mustEdit listing (mustEdit = chatBlock, ≠ 手改 JSON)
  if (layers.untilClearAuto?.has(id) || layers.autoAdapt.has(id)) return "auto";
  if (layers.mustEdit.has(id) || id.startsWith("NAR-15") || id.startsWith("DC-16")) return "must";
  if (id.startsWith("DFW-") || id.startsWith("MOD-")) return "auto";
  if (/^(DG-.*FALSE-GREEN|.*SELFCHECK)/i.test(id)) return "auto";
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
    shapeSalvageLog?: { ruleId: string; path?: string; action?: string }[];
    /** SB designExit failed — banner 设计未闭合 */
    designExitIncomplete?: boolean;
    /** Auto-close cleared rule ids (e.g. NAR-15) for banner copy */
    autoClosedClearedIds?: string[];
  },
): string {
  const layers = loadRepairLayerSets();
  const nar14Class = classifyNar14ForChatRepair({
    planLines: opts?.planLines,
    shots: opts?.shots,
    blockHasNar14: blockIds.some((id) => id === "NAR-14" || id.startsWith("NAR-14")),
  });
  const lipDetail = classifyLipForChatRepairDetailed({
    shots: opts?.shots,
    blockHasLip01: blockIds.some((id) => id === "LIP-01" || id === "PR-09" || id === "DEX-LIP-SPLIT"),
  });
  const lipClass = lipDetail.pack;
  const lipMustPresent = lipDetail.mustShotIndexes.length > 0;
  const lipRaiseOnly = lipDetail.raiseShotIndexes.length > 0 && !lipMustPresent;
  const mustPending: string[] = [];
  const autoPending: string[] = [];
  const clearedSet = new Set(opts?.autoClosedClearedIds ?? []);
  for (const id of [...new Set(blockIds)]) {
    if (clearedSet.has(id)) continue; // sealed theme-glue must not reappear as pending auto
    const kind = classifyBlockId(id, layers, {
      nar14Class,
      lipClass,
      lipMustPresent,
      lipRaiseOnly,
    });
    if (kind === "must") mustPending.push(id);
    else if (kind === "auto") autoPending.push(id);
    else mustPending.push(id); // other → still list as pending for visibility but RH says server path
  }
  const lines = [
    "【闭环修复清单 — 请按项修改 JSON 字段，勿只改 audit 自报 / modalityPromptAudit】",
    `待处理规则：${mustPending.join(", ") || "（无须手改 BLOCK）"}`,
    autoPending.length
      ? `服务端 untilClear / 自动适配：${autoPending.join(", ")}（勿手改自报字段）`
      : "",
    "",
  ].filter((l, i, arr) => !(l === "" && arr[i - 1] === ""));
  if (lipDetail.mixed) {
    lines.push(
      `【LIP 逐镜】超限/多句须 Confirm：镜 ${lipDetail.mustShotIndexes.join(",") || "—"}；可抬短镜应由设计抬时（勿与 DFW「导入可愈」混称）：镜 ${lipDetail.raiseShotIndexes.join(",") || "—"}`,
      "",
    );
  } else if (lipRaiseOnly) {
    lines.push(
      "【LIP 抬时】短镜可抬：设计侧调 duration（autoClose/export 会抬）；导入仅兜底愈，不拦导入。",
      "",
    );
  } else if (lipMustPresent) {
    lines.push(
      "【反推设计 · 超限/多句口型】台词所需 > 厂商上限或同镜多句：设计不过绿，须 SB Confirm 语义拆（confirmClusterSplit）或改短。导入不静默同文拆、亦不因本项硬拦（importOk≠designExitPass）。",
      "",
    );
  }
  if (blockIds.includes("DEX-LITERARY-STALE")) {
    lines.push(
      "【须重设计】公式已更换。请按新规范重走设计，勿只改旧字段。",
      "选项：A 按新规范重设计（推荐） / B 保留旧稿继续补洞（须 acknowledgeKeepLegacy）",
      "",
    );
  }
  if (opts?.designExitIncomplete) {
    // 时长可抬项属设计主责，禁止横幅甩「服务端适配时长」
    if (mustPending.length === 0) {
      lines.push(
        "【可导入 · 设计未完全闭合】剩余 CAM-FIT 等可由服务端诊愈；时长短镜须设计侧抬时或 Confirm。importOk≠designExitPass。精品请回 SB Confirm/写权威双镜形后再 export。",
        "",
      );
    } else {
      lines.push(
        "【设计未闭合 · 反推 SB/W3】本项属设计契约（非导入口硬拦）。请 Confirm/改短后 forwardReentry 再 export；导入只愈可愈项，importOk≠designExitPass。",
        "",
      );
    }
  }
  if (blockIds.includes("NAR-15") || blocks?.some((b) => b.id === "NAR-15")) {
    lines.push(
      "【NAR-15】仍有 emotion_hit 缺 reactionAction（服务端已尝试占位 RA；若本条仍在=写回失败或锁稿路径未触达）。须在 dialoguePlan.lines 同写听者可见反应，禁只改 narrativeSelfcheck.passed。",
      "",
    );
  } else if (opts?.autoClosedClearedIds?.includes("NAR-15")) {
    lines.push(
      "【NAR-15】已自动闭合：服务端已补占位 reactionAction（raSource=heal_placeholder）。若要精品反应请回 W3 手改后再 forwardReentry。",
    );
    if (mustPending.some((id) => id === "LIP-01" || id === "DEX-LIP-SPLIT" || id === "DFW-DURATION")) {
      lines.push("注意：NAR 闭合≠设计完成；仍有口型超限须 Confirm 语义拆（或可抬短镜须设计抬时）。");
    }
    lines.push("");
  }
  if (blockIds.includes("DEX-SHOT-INTENT") || blocks?.some((b) => b.id === "DEX-SHOT-INTENT")) {
    lines.push(
      "【DEX-SHOT-INTENT】shotDesignIntent 仍缺 picture/durationSec（服务端已尝试从 peak/分镜 VD 派生；若本条仍在=无镜可派生或锁稿未写回）。reverseTarget=W3。",
      "",
    );
  } else if (opts?.autoClosedClearedIds?.includes("DEX-SHOT-INTENT")) {
    lines.push(
      "【DEX-SHOT-INTENT】已自动闭合：已从 peakLedger 或分镜 VD/时长补 sidecar intents。",
      "",
    );
  }
  if (blockIds.includes("DEX-PROP-CONT") || blocks?.some((b) => b.id === "DEX-PROP-CONT")) {
    // Theme-glue: never emit 未清零 — sealed/strip path is SSOT; residual = WARN only
    lines.push(
      "【DEX-PROP-CONT】已自动闭合：declare-only propState 顺延已写入（未发明 VD）。精品交待可回 SB。",
      "",
    );
  } else if (opts?.autoClosedClearedIds?.includes("DEX-PROP-CONT")) {
    lines.push(
      "【DEX-PROP-CONT】已自动闭合：已 declare-only 写入 propState 顺延（未发明 VD 道具）。精品交待可回 SB。",
      "",
    );
  }
  if (blockIds.includes("DEX-INTENT-PIC") || blocks?.some((b) => b.id === "DEX-INTENT-PIC")) {
    lines.push(
      "【DEX-INTENT-PIC】已自动闭合：picture↔VD 同核（sidecar 1:1）。",
      "",
    );
  } else if (opts?.autoClosedClearedIds?.includes("DEX-INTENT-PIC")) {
    lines.push(
      "【DEX-INTENT-PIC】已自动闭合：已将 shotDesignIntent.picture 与 visualDescription 同核。",
      "",
    );
  }
  if (
    blockIds.includes("DG-CAM-FIT-FALSE-GREEN") ||
    blockIds.includes("FALSE_GREEN_SELFCHECK") ||
    blocks?.some((b) => b.id === "DG-CAM-FIT-FALSE-GREEN" || b.id === "FALSE_GREEN_SELFCHECK")
  ) {
    lines.push(
      "【假绿派生】DG-CAM-FIT-FALSE-GREEN / FALSE_GREEN_SELFCHECK：服务端已覆写 narrativeSelfcheck.passed=false；根因走 DEX-CAM-FIT untilClear / Confirm 拆，勿手改自报字段。",
      "",
    );
  }
  if (blockIds.includes("DEX-ASSET-CREF") || blocks?.some((b) => b.id === "DEX-ASSET-CREF")) {
    const crefMsgs = (blocks ?? []).filter((b) => b.id === "DEX-ASSET-CREF").map((b) => b.message);
    const needAs = crefMsgs.some((m) => /缺定妆图|needsAsStill|已绑码缺/.test(m));
    lines.push(
      needAs
        ? "【DEX-ASSET-CREF】缺定妆真图：设计期可 stub 延期；回 AS 出图后再烧。导入不发明假 --cref。"
        : "【DEX-ASSET-CREF】出脸未完成设计绑：服务端将尝试 stub+assetCrefPlan；仍红则回 SB/AS。",
      "",
    );
  } else if (opts?.autoClosedClearedIds?.includes("DEX-ASSET-CREF")) {
    lines.push(
      "【DEX-ASSET-CREF】已自动闭合（设计期）：已 stub/绑 charCodes+assetCrefPlan；定妆真图延期 AS 补，生成前仍须带图。",
      "",
    );
  }
  if (autoPending.length) {
    lines.push(
      `【服务端将愈 · 勿改 JSON】${autoPending.join(", ")} — 含 DEX-CAM-FIT 等 auto；勿手拆镜号/删 reactionAction；下次仍须写权威双镜形`,
      "",
    );
  }

  const salvage = opts?.shapeSalvageLog ?? [];
  const struct = salvage.filter((e) => /SH-JSON-BRACE|SH-HOIST-/.test(e.ruleId));
  if (struct.length) {
    const ids = [...new Set(struct.map((e) => e.ruleId))].join("，");
    lines.push(
      `【已结构 salvage】${ids} — 下列为剩余真闸；勿再把 preDesignPack/characterDesign 只写进 planData，勿因假空集重写整包。`,
      "",
    );
  }
  if (blockIds.includes("JSON_INCOMPLETE")) {
    lines.push(
      "【主因·JSON 不完整】解析失败（截断/中段损坏）。禁止当成「集无可用分镜 / DG-EMPTY」。请重出可 JSON.parse 的完整根对象。",
      "",
    );
  }
  const orphanBlocks = (blocks ?? []).filter((b) => /孤儿场|场镜基数|幽灵场/.test(b.message));
  if (orphanBlocks.length) {
    lines.push("【主因·结构】勿只补其他场的 fxPrompt：");
    for (const b of orphanBlocks.slice(0, 8)) {
      lines.push(`- ${b.id}: ${b.message}`);
    }
    lines.push("");
  }

  // Self-heal-induced QP-02 (IRD/lip placeholder) — do not treat as blank literary rewrite
  const healInducedShots = (opts?.shots ?? []).filter((s) => s._healInducedVd || /听者反应特写/.test(String(s.visualDescription ?? "")));
  const qp02Blocks = (blocks ?? []).filter((b) => b.id === "QP-02" || /too_short|画面描述过短/.test(b.message));
  if (qp02Blocks.length && healInducedShots.length) {
    lines.push(
      "【自愈自伤 · 非文学空洞】下列 QP-02 疑似 IRD/lip 拆镜短占位；请 Confirm/重切父 VD，勿整包重写：",
    );
    for (const b of qp02Blocks.slice(0, 8)) {
      const loc = b.shotIndex != null ? `镜${b.shotIndex}` : b.field?.trim() ? b.field : "";
      lines.push(`- ${b.id}${loc ? ` (${loc})` : ""}: ${b.message}`);
    }
    lines.push("[RH-QP-02-HEAL] 服务端应重切或 Confirm；禁止只改 audit / 整集重设计。", "");
  }

  const mustBlocks: ChatRepairBlockLine[] = [];
  const autoBlocks: ChatRepairBlockLine[] = [];
  const otherBlocks: ChatRepairBlockLine[] = [];
  const lipCtx = { nar14Class, lipClass, lipMustPresent, lipRaiseOnly };
  for (const b of blocks ?? []) {
    // 逐镜：超限镜上的 DFW 不得进「导入可愈」
    if (
      (b.id === "DFW-DURATION" || b.id === "LIP-01" || b.id === "PR-09" || b.id === "DEX-LIP-SPLIT") &&
      b.shotIndex != null &&
      opts?.shots?.length
    ) {
      const p = detectLipSplitPressure(
        opts.shots.find((s) => Number(s.shotIndex) === Number(b.shotIndex)) ?? {},
      );
      if (p.mustConfirm) {
        mustBlocks.push(b);
        continue;
      }
      if (p.canSilentRaise && (b.id === "DFW-DURATION" || b.id === "LIP-01")) {
        mustBlocks.push(b); // 设计主责抬时，不进导入可愈
        continue;
      }
    }
    const kind = classifyBlockId(b.id, layers, lipCtx);
    if (kind === "must") mustBlocks.push(b);
    else if (kind === "auto") autoBlocks.push(b);
    else otherBlocks.push(b);
  }

  const { dedupeChatRepairBlocks } = require("./design/planFromBundleForDesignExit") as typeof import("./design/planFromBundleForDesignExit");
  let mustDeduped = dedupeChatRepairBlocks(mustBlocks);
  const hasDc01 =
    mustDeduped.some((b) => b.id === "DC-01" || b.id === "DC-01-EXTRA") ||
    blockIds.includes("DC-01") ||
    blockIds.includes("DC-01-EXTRA");
  const dc13Secondary = hasDc01 ? mustDeduped.filter((b) => b.id === "DC-13") : [];
  if (dc13Secondary.length) {
    mustDeduped = mustDeduped.filter((b) => b.id !== "DC-13");
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
    "【须手改 · Chat 契约】NAR 残句/重设计、DC、真缺 F0·散文/假 audit、超限口型 Confirm、设计侧抬时 — 导入不会替你编造；残句须改短/显式 splitHint/Confirm 拆镜",
    mustDeduped,
  );
  if (dc13Secondary.length) {
    pushBlockSection("【附从 · 随 DC-01 修】", dc13Secondary);
  }
  pushBlockSection(
    "【导入将自动适配 · 可不手改 / 勿改 JSON】空 prompt / sceneKey / 形态 salvage / DEX-CAM-FIT 智能拆（untilClear）；时长仅历史残留兜底（设计主责已抬）；NAR-14 仅标点 A 拆净 — 残句≠可不手改",
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
  if ((blocks?.length ?? 0) > 0 && mustDeduped.length === 0 && dc13Secondary.length === 0) {
    lines.push("【须手改 · Chat 契约】（本包暂无 NAR/DC 等须手改项）", "");
  }

  if (missingSummary?.trim()) {
    const missLines = missingSummary.trim().split("\n");
    const autoMiss = missLines.filter((l) => {
      if (/DFW-DURATION|duration/i.test(l) && (lipMustPresent || lipRaiseOnly)) return false;
      return /MOD-03|MOD-IMG|MOD-VID|DFW-DURATION|audioPrompt|imagePrompt|videoPrompt|duration/i.test(l);
    });
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
    const pickTrigger = (): string => {
      if (stillIds.includes("DEX-STILL-CU-CAST")) return "still_cu_cast";
      if (stillIds.includes("DEX-STILL-ONEBEAT")) return "still_onebeat_multi";
      if (stillIds.some((id) => /STILL-FIRSTFRAME-STALE|DEX-STILL-STALE/i.test(id))) return "still_firstframe_stale";
      if (stillIds.some((id) => /STILL-FIRSTFRAME-WEAK|MISSING/i.test(id))) return "still_firstframe_weak";
      if (stillIds.some((id) => /DIRTY|OS-NAME|FILLER|HAND/i.test(id))) return "dirty_still_prompt";
      return "still_firstframe_dirty";
    };
    const trig = pickTrigger();
    lines.push(
      "",
      "【静帧 Identity · Chat 须改】DEX-STILL-*：设计期强契约；导入不硬拦。优先智能拆/Confirm，禁止只 regen。",
      `深链：toonflow://stage/SB?trigger=${trig}`,
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

/** UI toast SSOT — never lead with salvage count when must-blocks remain. */
export function buildExportPreviewStatusLine(input: {
  exportAllowed: boolean;
  tier?: string;
  blocks?: { id: string }[];
  shapeSalvageLog?: unknown[];
  designExitIncomplete?: boolean;
  autoClosedClearedIds?: string[];
  /** 延期定妆 / 口型须 Confirm / 非法同文占比 */
  deferredStill?: number;
  lipConfirmRequired?: boolean;
  illegalSameVdRatio?: number;
  /** 文学债须设计 Confirm（拆/增强）或已智能拆 */
  litConfirmRequired?: boolean;
  litDebtCta?: string;
  litSmartSplit?: boolean;
}): string {
  const tier = input.tier ?? "T3";
  const ids = [...new Set((input.blocks ?? []).map((b) => b.id))].slice(0, 8);
  const salvageN = input.shapeSalvageLog?.length ?? 0;
  const closed = (input.autoClosedClearedIds ?? []).filter(Boolean);
  const closedNote = closed.length ? `已自动闭合 ${closed.slice(0, 4).join(",")}` : "";
  const deferred =
    (input.deferredStill ?? 0) > 0 ? `定妆延期 ${input.deferredStill}` : "";
  const lipNote = input.lipConfirmRequired ? "口型须Confirm语义拆" : "";
  const litNote = input.litSmartSplit
    ? "文学双接触已智能拆"
    : input.litConfirmRequired
      ? input.litDebtCta
        ? `文学债须Confirm：${input.litDebtCta}`
        : "文学债须Confirm拆镜/增强"
      : "";
  const dupNote =
    typeof input.illegalSameVdRatio === "number" && input.illegalSameVdRatio >= 0.2
      ? `非法同文占比${Math.round(input.illegalSameVdRatio * 100)}%`
      : "";
  const extrasBase = [closedNote, deferred, lipNote, litNote, dupNote].filter(Boolean);
  if (input.exportAllowed) {
    const head = input.litSmartSplit
      ? "可导入·已智能拆文学债"
      : input.litConfirmRequired
        ? "可导入·文学债未闭合"
        : input.designExitIncomplete
          ? "可导入·未完全闭合"
          : "可导入";
    const extras = [...extrasBase, salvageN ? `形态已适配 ${salvageN}` : ""].filter(Boolean).join(" · ");
    return `预览更新完成 · ${tier} · ${head}${extras ? ` · ${extras}` : ""}`;
  }
  const literaryStale = ids.includes("DEX-LITERARY-STALE");
  const head = literaryStale
    ? "须重设计"
    : input.designExitIncomplete && ids.length === 0
      ? "可导入·未完全闭合"
      : input.designExitIncomplete
        ? "设计未闭合"
        : "阻断";
  const rules = ids.length ? `规则 ${ids.join(",")}` : input.designExitIncomplete ? "无硬 BLOCK·可 dryRun" : "有须手改 BLOCK";
  const mid = extrasBase.length ? ` · ${extrasBase.join(" · ")}` : "";
  return `预览更新完成 · ${tier} · ${head}${mid} · ${rules}（形态适配≠契约已修）`;
}

/** Payload for import/export 400 when export gate blocks. */
export function formatExportGateBlockPayload(result: ExportGateResult): Record<string, unknown> {
  const chatRepairText =
    result.chatRepairText ||
    buildAggregatedChatRepairText(
      result.repairHints,
      result.closureSnapshot.blockIds,
      result.missingFieldSummary,
      result.blocks,
      {
        warnIds: result.closureSnapshot.warnIds,
        warnRows: result.warns,
        shapeSalvageLog: result.shapeSalvageLog,
        designExitIncomplete: result.designExitIncomplete,
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
    designExitIncomplete: result.designExitIncomplete,
    previewStatusLine: result.previewStatusLine,
    autoClosed: result.autoClosed,
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
  /** 保留旧稿继续补洞：跳过 DEX-LITERARY-STALE（须显式确认） */
  acknowledgeKeepLegacy?: boolean;
  /**
   * Import/dryRun: when false (default), cam-fit is diagnose-only (no silent 16→N expand).
   * Chat export with author shots also diagnose-only unless forceExpand (防预览 alone 扩镜).
   */
  forceExpand?: boolean;
}

type ImportSalvageEntry = {
  ruleId: string;
  demoteAfterHeal?: boolean;
  importHeal?: string;
  untilClear?: boolean;
  confirmOnly?: boolean;
  exitDetector?: string;
  healClass?: string;
};

function loadImportSalvageRegistry(): ImportSalvageEntry[] {
  try {
    const matrix = readFixtureJson<{ importSalvageRegistry?: ImportSalvageEntry[] }>(
      "semantic_gate_dual_track_matrix.json",
      {},
    );
    return matrix.importSalvageRegistry ?? [];
  } catch {
    return [];
  }
}

function importSalvageDemoteIds(): Set<string> {
  // Soft-banner on import (BLOCK→WARN + importOkNotExitPass). Not "demote = PASS".
  // - demoteAfterHeal=true && !untilClear: legacy explicit soft-banner
  // - importSoftBanner=true: Confirm residual stamps (IRD-CONFIRM / CAM-FIT)
  // untilClear healable debts (CU-CAST / ONEBEAT / LIT…) must NOT soft-banner as success
  return new Set(
    loadImportSalvageRegistry()
      .filter((e) => {
        const soft = (e as { importSoftBanner?: boolean }).importSoftBanner === true;
        if (soft) return true;
        return e.demoteAfterHeal === true && (e as { untilClear?: boolean }).untilClear !== true;
      })
      .map((e) => e.ruleId),
  );
}
export function runExportGate(raw: unknown, opts: RunExportGateOpts = {}): ExportGateResult {
  try {
    return runExportGateInner(raw, opts);
  } catch (e) {
    const { JsonIncompleteError } = require("./bundle/jsonBraceSalvage") as typeof import("./bundle/jsonBraceSalvage");
    if (e instanceof JsonIncompleteError || (e as { code?: string })?.code === "JSON_INCOMPLETE") {
      const msg = e instanceof Error ? e.message : "JSON_INCOMPLETE";
      const blocks = [{ id: "JSON_INCOMPLETE", message: msg, field: "$" }];
      const repairHints = [
        {
          id: "RH-JSON-INCOMPLETE",
          ruleId: "JSON_INCOMPLETE",
          chatTemplate:
            "【JSON_INCOMPLETE】Bundle JSON 截断或不完整，禁止瞎补中段。请重出完整可 parse 的根对象（含顶层 preDesignPack/characterDesign）。勿当作 DG-EMPTY。",
        },
      ];
      const emptyBundle = { preDesignPack: { shots: [] } } as ScriptBundle;
      return {
        exportAllowed: false,
        tier: "T1",
        bundle: emptyBundle,
        inspected: {
          blocked: true,
          tier: "T1",
          rulePackVersion: "2.1.0",
          qualityGate: { issues: [{ id: "JSON_INCOMPLETE", severity: "BLOCK", message: msg }] },
        } as InspectBundleResult,
        designFindings: [{ id: "JSON_INCOMPLETE", severity: "BLOCK", message: msg }],
        integrityGaps: [],
        fieldWalkGaps: [],
        missingFieldReport: [],
        missingFieldSummary: msg,
        repairHints,
        closureSnapshot: {
          tier: "T1",
          blocked: true,
          blockIds: ["JSON_INCOMPLETE"],
          warnIds: [],
          checkedAt: new Date().toISOString(),
        },
        coverage: { matrixTotal: 0, blocks: 1, warns: 0, softPatchEligible: 0 },
        blocks,
        warns: [],
        shapeSalvageLog: [],
        chatRepairText: buildAggregatedChatRepairText(repairHints, ["JSON_INCOMPLETE"], msg, blocks, {}),
        designExitIncomplete: false,
        previewStatusLine: buildExportPreviewStatusLine({
          exportAllowed: false,
          tier: "T1",
          blocks,
          shapeSalvageLog: [],
        }),
      } as ExportGateResult;
    }
    throw e;
  }
}

function runExportGateInner(raw: unknown, opts: RunExportGateOpts = {}): ExportGateResult {
  const prep =
    opts.alreadyPrepared && opts.bundle
      ? {
          bundle: opts.bundle,
          tier: opts.tier ?? inferTier(opts.bundle),
          shapeSalvageLog: opts.shapeSalvageLog ?? prepareBundleWithLog(raw).shapeSalvageLog,
          shapeSalvageSummary: undefined as string | undefined,
        }
      : prepareBundleForInspect(raw, { ingestHeal: false });
  const bundle = prep.bundle;
  const tier = opts.tier ?? prep.tier;

  // Export hygiene: duration raise-only + high-conf cam-fit split (no full IRD invent)
  try {
    const { raiseDurationHygieneOnly } =
      require("./export/durationHygiene") as typeof import("./export/durationHygiene");
    const vendorId =
      (bundle as { meta?: { vendorId?: string } }).meta?.vendorId ??
      (bundle.planData as { vendorId?: string } | undefined)?.vendorId ??
      null;
    const hy = raiseDurationHygieneOnly(bundle, { vendorId, respectEpisodeCap: false });
    if (hy.raised || hy.skippedCap || hy.skippedOverVendor || hy.skippedNeedsSplit) {
      (prep.shapeSalvageLog ??= []).push({
        ruleId: "SH-DURATION-ALIGN",
        path: "preDesignPack.shots[].duration",
        action: `export_raise:${hy.raised};over_vendor=${hy.skippedOverVendor};cap=${hy.skippedCap};split_note=${hy.skippedNeedsSplit}`,
      });
    }
  } catch {
    /* optional */
  }
  try {
    const { applyCamFitHygieneOnExport, runCamFitUntilClear } =
      require("./export/camFitHygiene") as typeof import("./export/camFitHygiene");
    // Import/dryRun salvage: diagnose-only cam-fit（禁 speak_react 同文增产）；仅 forceExpand 才 apply
    const alreadyExpanded = Boolean(
      (bundle as { _importSplitExpanded?: boolean })._importSplitExpanded ||
        (bundle.meta as { importSplitExpanded?: boolean } | undefined)?.importSplitExpanded,
    );
    const camDiagnoseOnly = !opts.forceExpand || alreadyExpanded;
    const cam = (runCamFitUntilClear ?? applyCamFitHygieneOnExport)(bundle, {
      chatStrict: camDiagnoseOnly,
      maxRounds: camDiagnoseOnly ? 0 : 5,
      autoMinConfidence: 0.7,
    });
    if (cam.applied) {
      (prep.shapeSalvageLog ??= []).push({
        ruleId: "SH-CAM-FIT-UNTIL-CLEAR",
        path: "preDesignPack.shots",
        action: `export_cam_split:${cam.applied};rounds=${cam.rounds};remain=${cam.remainingMustSplit}`,
      });
    } else if (camDiagnoseOnly && cam.remainingMustSplit > 0) {
      (prep.shapeSalvageLog ??= []).push({
        ruleId: "SH-CAM-FIT-DIAGNOSE-ONLY",
        path: "preDesignPack.shots",
        action: `no_expand;remain=${cam.remainingMustSplit}`,
      });
    }
    if (cam.confirmRequired) {
      (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
      const meta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
      meta.irdConfirmRequired = true;
    }
    const metaCam = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
    metaCam.camFitUntilClear = {
      remainingMustSplit: cam.remainingMustSplit,
      applied: cam.applied,
      rounds: cam.rounds,
    };
  } catch {
    /* optional */
  }

  // Design-layer high-confidence auto-close BEFORE designGates/inspect harvest
  // (otherwise NAR-15 findings stay in blocks even after placeholder RA writeback)
  let autoClosed: ExportGateResult["autoClosed"];
  try {
    const { applyDesignAutoCloseToBundle } =
      require("./design/designAutoClose") as typeof import("./design/designAutoClose");
    const ac = applyDesignAutoCloseToBundle(bundle, {
      stageId: "SB",
      // Dirty/DUP heals often need merge then re-audit
      maxRounds: opts.allowShapeSalvage === true ? 5 : 4,
      // 语义扩仅 opts.forceExpand；prepare 已扩则禁二次增产
      forceExpand:
        Boolean(opts.forceExpand) &&
        !Boolean(
          (bundle as { _importSplitExpanded?: boolean })._importSplitExpanded ||
            ((bundle as { meta?: { importSplitExpanded?: boolean } }).meta?.importSplitExpanded),
        ),
    });
    autoClosed = ac.autoClosed;
    if (ac.autoClosed.applied) {
      (prep.shapeSalvageLog ??= []).push({
        ruleId: "SH-DESIGN-AUTO-CLOSE",
        path: "planData.dialoguePlan|preDesignPack.shots",
        action: `cleared=${ac.autoClosed.clearedIds.join(",") || "none"};ops=${ac.autoClosed.changes.length}`,
      });
      // False-green guard: GEN open after AUTO-CLOSE → keep importOk≠exit
      try {
        const { auditGenerationApplyGaps } =
          require("./bundle/generationApplyAudit") as typeof import("./bundle/generationApplyAudit");
        const openGen = auditGenerationApplyGaps(bundle).filter((g) => /^GEN-0[356]$/.test(g.id));
        if (openGen.length) {
          const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
          bMeta.importOkNotExitPass = true;
          bMeta.designExitIncomplete = true;
          (prep.shapeSalvageLog ??= []).push({
            ruleId: "FALSE-GREEN-GEN",
            path: "generation.imagePrompt",
            action: `gen_open:${openGen.map((g) => g.id).join(",")}`,
          });
        }
      } catch {
        /* optional */
      }
    }
  } catch {
    /* optional — fall through; seal still runs */
  }

  // Theme-glue seal: PROP/INTENT untilClear PASS（设计≡智能愈同源；禁残留阻断）
  try {
    const { sealThemeGlueUntilClear } =
      require("./design/sealThemeGlueUntilClear") as typeof import("./design/sealThemeGlueUntilClear");
    const seal = sealThemeGlueUntilClear(bundle);
    if (seal.sealedIds.length || seal.propMutated || seal.intentSynced) {
      (prep.shapeSalvageLog ??= []).push({
        ruleId: "SH-THEME-GLUE-SEAL",
        path: "preDesignPack.shots|planData.shotDesignIntent",
        action: `sealed=${seal.sealedIds.join(",") || "none"};propMut=${seal.propMutated};propLeft=${seal.propBlocksLeft};intentSync=${seal.intentSynced};intentLeft=${seal.intentBlocksLeft}`,
      });
      if (!autoClosed) {
        autoClosed = {
          applied: true,
          clearedIds: seal.sealedIds,
          remainingFailedIds: [],
          changes: seal.sealedIds.map((id) => ({
            ruleId: id,
            detail: "theme_glue_seal",
            path: "sealThemeGlueUntilClear",
          })),
          chatRetryRequired: false,
        };
      } else {
        autoClosed = {
          ...autoClosed,
          applied: true,
          clearedIds: [...new Set([...(autoClosed.clearedIds ?? []), ...seal.sealedIds])],
          remainingFailedIds: (autoClosed.remainingFailedIds ?? []).filter(
            (id) => !seal.sealedIds.includes(id),
          ),
          changes: [
            ...(autoClosed.changes ?? []),
            ...seal.sealedIds.map((id) => ({
              ruleId: id,
              detail: "theme_glue_seal",
              path: "sealThemeGlueUntilClear",
            })),
          ],
        };
      }
    }
  } catch {
    /* optional */
  }

  // Import: empty-clone collapse only — NEVER splitOverloaded（同文唇拆伪设计）
  // allowShapeSalvage 路径始终可 collapse（与 forceExpand 解耦）
  if (opts.allowShapeSalvage === true) {
    try {
      const { collapseCloneVdOnBundle } =
        require("./design/designAutoClose") as typeof import("./design/designAutoClose");
      const col = collapseCloneVdOnBundle(bundle);
      if (col.merged > 0) {
        (prep.shapeSalvageLog ??= []).push({
          ruleId: "SH-CLONE-VD-COLLAPSE",
          path: "preDesignPack.shots",
          action: `${col.before}→${col.after};merged=${col.merged};empty_only`,
        });
      }
    } catch {
      /* optional */
    }
  }
  // postHeal SSOT
  {
    const author = Number(
      (bundle.meta as { prepareShotCounts?: { rawShotCount?: number } } | undefined)?.prepareShotCounts
        ?.rawShotCount ??
        (prep as { shotCounts?: { rawShotCount?: number } }).shotCounts?.rawShotCount ??
        0,
    );
    const postHeal = (bundle.preDesignPack?.shots ?? []).length;
    const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
    const prepCounts =
      (bMeta.prepareShotCounts as Record<string, unknown> | undefined) ??
      ((prep as { shotCounts?: Record<string, unknown> }).shotCounts as Record<string, unknown> | undefined) ??
      {};
    bMeta.shotCounts = {
      ...prepCounts,
      author: author || (prepCounts as { rawShotCount?: number }).rawShotCount || postHeal,
      postPrepare: (prepCounts as { postPrepareCount?: number }).postPrepareCount ?? postHeal,
      postHeal,
    };
    bMeta.prepareShotCounts = {
      ...prepCounts,
      postHeal,
    };
  }

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
  // Early honesty: Chat 假绿 selfcheck → 立即覆写，后续可剥 DG-CAM-FIT-FALSE-GREEN
  {
    const hasCamDebt =
      blocks.some((b) =>
        /DEX-CAM-FIT|DG-CAM-FIT-FALSE-GREEN|IRD-CONFIRM/.test(b.id),
      ) ||
      Boolean((bundle as { meta?: { camFitChatStrictBlocked?: boolean } }).meta?.camFitChatStrictBlocked);
    const narSelf = (bundle.narrativeSelfcheck ?? {}) as {
      passed?: boolean;
      failedIds?: string[];
      serverOverwritten?: boolean;
    };
    if (hasCamDebt && narSelf.passed === true) {
      bundle.narrativeSelfcheck = {
        ...narSelf,
        passed: false,
        failedIds: [...new Set([...(narSelf.failedIds ?? []), "DEX-CAM-FIT"])],
        serverOverwritten: true,
        checkedAt: new Date().toISOString(),
      };
    }
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
  const microSalvage = salvageLog.filter((e) => e.ruleId === "SH-MICRO-EXPR");
  if (opts.allowShapeSalvage !== true && microSalvage.length) {
    warns.push({
      id: "DG-CHAT-SHAPE-MICRO",
      message: `Chat microExpression 名键 map 已 salvage（×${microSalvage.length}）；下次请写 {eyes,mouthDetail}（多角 byName），勿名键根对象`,
      field: "preDesignPack.shots[].shotDesign.performance.microExpression",
    });
  }

  // Still identity — ONEBEAT / CU-CAST / OS / FILLER are Chat BLOCK (import demotes)
  try {
    const { shouldWarnOneBeat, hasOsInNameDisplay, hasDesignFiller } = require("./compilers/stillIdentitySsot") as typeof import("./compilers/stillIdentitySsot");
    const { detectCuCastConflict } =
      require("./design/detectCuCastConflict") as typeof import("./design/detectCuCastConflict");
    const shotsForStill = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
    for (const s of shotsForStill) {
      const vd = String(s.visualDescription ?? "").trim();
      if (vd && shouldWarnOneBeat(vd) && !blocks.some((b) => b.id === "DEX-STILL-ONEBEAT")) {
        blocks.push({
          id: "DEX-STILL-ONEBEAT",
          message: "visualDescription 多拍须智能拆镜后再导出",
          field: "visualDescription",
        });
      }
      const cu = detectCuCastConflict({
        shotSize: String(s.shotSize ?? (s.narrative as { shotSize?: string } | undefined)?.shotSize ?? ""),
        charCodes: Array.isArray(s.charCodes) ? (s.charCodes as string[]) : [],
        characterNames: Array.isArray(s.characterNames) ? (s.characterNames as string[]) : [],
        visualDescription: vd,
        alreadySplit: Boolean(s._cuCastSplitId || s._stillBeatSplitId || s._visualSplitId || s._cuCastSliced),
      });
      if (cu.conflict && cu.healMode === "slice_cast" && cu.primaryName) {
        // 文学单人特写：导出前按意图降出场人数（≠拆镜 Confirm）
        const { sliceShotCastToPrimary } =
          require("./design/detectCuCastConflict") as typeof import("./design/detectCuCastConflict");
        sliceShotCastToPrimary(s, cu.primaryName);
      } else if (cu.conflict && !blocks.some((b) => b.id === "DEX-STILL-CU-CAST")) {
        blocks.push({
          id: "DEX-STILL-CU-CAST",
          message: cu.message,
          field: "shotSize",
        });
      }
      if (vd && hasOsInNameDisplay(vd) && !blocks.some((b) => b.id === "DEX-STILL-OS-NAME")) {
        blocks.push({ id: "DEX-STILL-OS-NAME", message: "画面描写含（OS）须裸名", field: "visualDescription" });
      }
      if (vd && hasDesignFiller(vd) && !blocks.some((b) => b.id === "DEX-STILL-FILLER")) {
        blocks.push({ id: "DEX-STILL-FILLER", message: "禁对白瞬间神态等无画面填料", field: "visualDescription" });
      }
    }
    const cdAssets = (bundle.characterDesign as { assets?: { name?: string }[] } | undefined)?.assets ?? [];
    for (const a of cdAssets) {
      if (hasOsInNameDisplay(String(a.name ?? "")) && !blocks.some((b) => b.id === "DEX-STILL-OS-NAME")) {
        blocks.push({ id: "DEX-STILL-OS-NAME", message: "CD.name 含（OS）须裸名", field: "characterDesign.assets.name" });
      }
    }
  } catch {
    /* optional */
  }

  // M0/M10/M12/M18 chain contract parity with designExit
  try {
    const shotsChain = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
    const meta = (bundle as { meta?: Record<string, unknown> }).meta
      ?? (bundle.planData as { meta?: Record<string, unknown> } | undefined)?.meta;
    const { chainContractEnabled, buildShotChainContract, assertChainEgress } =
      require("./quality/shotChainContract") as typeof import("./quality/shotChainContract");
    const { auditLiteraryBeatCoverage } =
      require("./design/literaryBeatCoverage") as typeof import("./design/literaryBeatCoverage");
    const { auditCamShootableFit } =
      require("./quality/camShootableFit") as typeof import("./quality/camShootableFit");
    const { auditDesignLoss } =
      require("./quality/designLossSupplement") as typeof import("./quality/designLossSupplement");
    if (chainContractEnabled(meta) && shotsChain.length) {
      for (const f of auditLiteraryBeatCoverage(shotsChain)) {
        if (f.severity === "BLOCK" && !blocks.some((b) => b.id === f.id)) {
          blocks.push({ id: f.id, message: f.message, field: "visualDescription" });
        }
      }
      for (const f of auditDesignLoss(bundle as never)) {
        if (f.severity === "BLOCK" && !blocks.some((b) => b.id === f.id)) {
          blocks.push({ id: f.id, message: f.message, field: "visualDescription" });
        }
      }
      for (const s of shotsChain) {
        const cam = auditCamShootableFit(s);
        for (const f of cam.findings) {
          if (f.severity === "BLOCK" && !blocks.some((b) => b.id === f.id)) {
            blocks.push({ id: f.id, message: f.message, field: "camera" });
          }
        }
        const eg = assertChainEgress("exit", buildShotChainContract(s));
        for (const f of eg.findings.filter((x) => x.severity === "BLOCK")) {
          if (!blocks.some((b) => b.id === f.id)) {
            blocks.push({ id: f.id, message: f.message, field: "shotChainContract" });
          }
        }
      }
    }
    // untilClear 后：零 CAM → 剥 DEX-CAM-FIT；残留 → 仅 IRD-CONFIRM（不诱手拆）
    {
      const camCleared = (prep.shapeSalvageLog ?? []).some(
        (e) =>
          (e.ruleId === "SH-CAM-FIT-UNTIL-CLEAR" || e.ruleId === "SH-CAM-FIT-HYGIENE") &&
          /remain=0/.test(String(e.action ?? "")),
      );
      const remain = (bundle as { meta?: { camFitUntilClear?: { remainingMustSplit?: number } } }).meta
        ?.camFitUntilClear?.remainingMustSplit;
      if (remain === 0 || camCleared) {
        for (let i = blocks.length - 1; i >= 0; i--) {
          if (blocks[i]!.id === "DEX-CAM-FIT") blocks.splice(i, 1);
        }
      } else if (blocks.some((b) => b.id === "DEX-CAM-FIT")) {
        for (let i = blocks.length - 1; i >= 0; i--) {
          if (blocks[i]!.id === "DEX-CAM-FIT") blocks.splice(i, 1);
        }
        if (!blocks.some((b) => b.id === "IRD-CONFIRM")) {
          blocks.push({
            id: "IRD-CONFIRM",
            message: "DEX-CAM-FIT 残留低置信须 Confirm 智能拆；勿手改镜号（IRD-CONFIRM）",
            field: "stillIntentOps",
          });
        }
        (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
      }
    }
    if ((bundle as { importSplitSyncFailed?: boolean }).importSplitSyncFailed) {
      blocks.push({
        id: "IMPORT-SPLIT-SYNC",
        message: "拆镜后 storyboard 写库失败，须重试同步",
        field: "o_storyboard",
      });
    }
    // IRD provenance / confirm / hygiene≠still_ok
    const metaIrd = (bundle as { meta?: Record<string, unknown> }).meta
      ?? (bundle.planData as { meta?: Record<string, unknown> } | undefined)?.meta
      ?? {};
    if ((bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired || metaIrd.irdConfirmRequired) {
      if (!blocks.some((b) => b.id === "IRD-CONFIRM")) {
        blocks.push({
          id: "IRD-CONFIRM",
          message: "IRD 低置信补丁待 Confirm；import≠designExitPass，禁止假绿出站",
          field: "stillIntentOps",
        });
      }
    }
    const expandedSilent =
      Boolean(metaIrd.importSplitExpanded) && !metaIrd.irdProvenance;
    if (expandedSilent) {
      warns.push({
        id: "IRD-PROVENANCE-MISSING",
        message: "静默 expand 无 irdProvenance；不得宣称智能设计完成",
        field: "meta.irdProvenance",
      });
    }
    // Hygiene-only note: if no still/chain blocks but salvage was F0/tags style — still not still_ok
    if (
      blocks.length === 0 &&
      (prep.shapeSalvageLog ?? []).some((e) => /F0|fxPrompt|sceneAvTags|causedByActionId/i.test(e.ruleId + e.action))
    ) {
      warns.push({
        id: "HYGIENE-ONLY",
        message: "hygiene_only≠still_ok：结构轨修复不代表静帧首帧质量通过",
        field: "exportGate",
      });
    }
    if (metaIrd.importOkNotExitPass && !warns.some((w) => w.id === "IMPORT_OK_NOT_EXIT")) {
      warns.push({
        id: "IMPORT_OK_NOT_EXIT",
        message: "importOk≠designExitPass；Chat selfcheck/modality 不得单独出站",
        field: "meta.importOkNotExitPass",
      });
    }
  } catch {
    /* optional */
  }

  // SB designExit — after theme-glue seal; chatStrict 不挡 PROP/INTENT 再闸假红
  // （设计≡智能愈同源：主题胶水已 seal 到 PASS，harvest 不得 chatStrict 把它们利回 BLOCK）
  let designExitIncomplete = false;
  try {
    const { runDesignExitGate } = require("./design/designExitGate") as typeof import("./design/designExitGate");
    const {
      planFromBundleForDesignExit,
      deepCloneJson,
      dedupeChatRepairBlocks,
    } = require("./design/planFromBundleForDesignExit") as typeof import("./design/planFromBundleForDesignExit");
    // Final seal on planView writeback path
    try {
      const { sealThemeGlueUntilClear } =
        require("./design/sealThemeGlueUntilClear") as typeof import("./design/sealThemeGlueUntilClear");
      const seal2 = sealThemeGlueUntilClear(bundle);
      if (seal2.sealedIds.length && autoClosed) {
        autoClosed.clearedIds = [...new Set([...(autoClosed.clearedIds ?? []), ...seal2.sealedIds])];
        autoClosed.remainingFailedIds = (autoClosed.remainingFailedIds ?? []).filter(
          (id) => !seal2.sealedIds.includes(id),
        );
      }
    } catch {
      /* optional */
    }
    const planView = deepCloneJson(planFromBundleForDesignExit(bundle));
    const exit = runDesignExitGate("SB", planView, { chatStrict: false });
    if (!exit.ok && exit.failedIds.length) {
      const themeGlue = new Set([
        "DEX-PROP-CONT",
        "DEX-INTENT-PIC",
        "DEX-SHOT-INTENT",
        "DEX-EXPR-SPEAK",
        "CHAT-AUD-01",
        "FX-GRADE-01",
        "FALSE_GREEN_SELFCHECK",
        "DG-CAM-FIT-FALSE-GREEN",
        "DG-NAR-SELFCHECK",
      ]);
      const sealed = new Set(autoClosed?.clearedIds ?? []);
      let failedIds = opts.acknowledgeKeepLegacy
        ? exit.failedIds.filter((id) => id !== "DEX-LITERARY-STALE")
        : exit.failedIds;
      // Theme-glue: sealed or best-effort → strip BLOCK（可 WARN）；禁阻断 Chat/导入
      for (const id of [...failedIds]) {
        if (themeGlue.has(id) && (sealed.has(id) || id === "DEX-PROP-CONT" || id === "DEX-INTENT-PIC")) {
          failedIds = failedIds.filter((x) => x !== id);
          if (!warns.some((w) => w.id === id)) {
            warns.push({
              id,
              message: `【主题胶水已 seal / 不阻断】${id}（declare-only / sidecar 同源；精品可回 SB）`,
              field: "designExitGate.SB",
            });
          }
          if (autoClosed) {
            autoClosed.clearedIds = [...new Set([...(autoClosed.clearedIds ?? []), id])];
            autoClosed.remainingFailedIds = (autoClosed.remainingFailedIds ?? []).filter((x) => x !== id);
          }
        }
      }
      if (failedIds.length) {
        designExitIncomplete = true;
        const checklist = readFixtureJson<{
          checks?: Record<string, { message?: string }>;
        }>("design_exit_checklist.json", {});
        for (const id of failedIds) {
          const msg =
            checklist.checks?.[id]?.message ??
            exit.warnings.find((w) => w.includes(id)) ??
            id;
          if (!blocks.some((b) => b.id === id && b.message === msg)) {
            blocks.push({ id, message: String(msg), field: "designExitGate.SB" });
          }
        }
        const deduped = dedupeChatRepairBlocks(blocks);
        blocks.length = 0;
        blocks.push(...deduped);
      }
    }
    // Surface UNIMPLEMENTED as warn for diagnostics
    for (const w of exit.warnings) {
      if (w.startsWith("UNIMPLEMENTED_DEX:") && !warns.some((x) => x.message === w)) {
        warns.push({ id: "UNIMPLEMENTED_DEX", message: w, field: "designExitGate.SB" });
      }
    }
  } catch {
    /* optional */
  }

  // Drop auto-closed design musts from harvest (belt) — only clearedIds, not mere changes
  // (e.g. empty-clone merge must not strip remaining dialogue DUP-VD)
  const autoCleared = new Set([...(autoClosed?.clearedIds ?? [])]);
  for (const id of autoCleared) {
    if (
      id === "NAR-15" ||
      id === "DEX-SHOT-INTENT" ||
      id === "DEX-INTENT-PIC" ||
      id === "DEX-ASSET-CREF" ||
      id === "DC-01" ||
      id === "DC-01-EXTRA" ||
      id === "DEX-DIRTY-STILL-PROMPT" ||
      id === "DEX-HAND-LIP" ||
      id === "DEX-PROP-CONT" ||
      id === "DEX-EXPR-SPEAK" ||
      id === "CHAT-AUD-01" ||
      id === "FX-GRADE-01" ||
      id === "NO-LIP-DIALOGUE"
    ) {
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i]?.id === id) blocks.splice(i, 1);
      }
    }
  }
  // DEX-DUP-VD: never belt-strip — designExit / registry confirm_only is SSOT（有对白同文须保持 BLOCK）
  // (clearedIds may still include it after empty-only collapse; dialogue dups must stay)

  // designExit 可能在 cam-untilClear 之后又加回 DEX-CAM-FIT：再折叠一次
  {
    const camCleared = (prep.shapeSalvageLog ?? []).some(
      (e) =>
        (e.ruleId === "SH-CAM-FIT-UNTIL-CLEAR" || e.ruleId === "SH-CAM-FIT-HYGIENE") &&
        /remain=0/.test(String(e.action ?? "")),
    );
    const remain = (bundle as { meta?: { camFitUntilClear?: { remainingMustSplit?: number } } }).meta
      ?.camFitUntilClear?.remainingMustSplit;
    if (blocks.some((b) => b.id === "DEX-CAM-FIT")) {
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i]!.id === "DEX-CAM-FIT") blocks.splice(i, 1);
      }
      if (!(remain === 0 || camCleared)) {
        if (!blocks.some((b) => b.id === "IRD-CONFIRM")) {
          blocks.push({
            id: "IRD-CONFIRM",
            message: "DEX-CAM-FIT 残留低置信须 Confirm 智能拆；勿手改镜号（IRD-CONFIRM）",
            field: "stillIntentOps",
          });
        }
        (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
      }
    }
    // 假绿派生：服务端已覆写 selfcheck 或 CAM untilClear 清零 → 剥 DG/FALSE_GREEN（勿诱手改自报）
    const self = bundle.narrativeSelfcheck as
      | { passed?: boolean; serverOverwritten?: boolean }
      | undefined;
    const honestyDone =
      self?.serverOverwritten === true || self?.passed === false || remain === 0 || camCleared;
    if (honestyDone) {
      for (let i = blocks.length - 1; i >= 0; i--) {
        const id = blocks[i]?.id;
        if (id === "DG-CAM-FIT-FALSE-GREEN" || id === "FALSE_GREEN_SELFCHECK" || id === "DG-NAR-SELFCHECK") {
          blocks.splice(i, 1);
        }
      }
      for (let i = designGates.findings.length - 1; i >= 0; i--) {
        const id = designGates.findings[i]?.id;
        if (id === "DG-CAM-FIT-FALSE-GREEN" || id === "FALSE_GREEN_SELFCHECK" || id === "DG-NAR-SELFCHECK") {
          designGates.findings.splice(i, 1);
        }
      }
    }
  }

  // Import/dryRun: demote only registry.demoteAfterHeal（DEX-DUP-VD 等 confirm_only 不 demote）
  if (opts.allowShapeSalvage === true) {
    const demoteSet = importSalvageDemoteIds();
    const demoted: string[] = [];
    for (let i = blocks.length - 1; i >= 0; i--) {
      const id = blocks[i]?.id;
      if (!id || !demoteSet.has(id)) continue;
      const row = blocks[i]!;
      blocks.splice(i, 1);
      if (!warns.some((w) => w.id === id && w.message === row.message)) {
        const isDirtySoft = id === "DEX-DIRTY-STILL-PROMPT" || id === "DEX-HAND-LIP";
        warns.push({
          ...row,
          message: isDirtySoft
            ? `【导入不拦 · 反推设计 Confirm】${row.message}（手+脸真脏须 SB 改 VD 或 VisBeat Confirm 拆；禁导入静默拆；配方适配≠改 VD；importOk≠designExitPass）`
            : `【导入智能愈/勿当 designExitPass】${row.message}`,
        });
      }
      demoted.push(id);
    }
    if (demoted.length) {
      designExitIncomplete = true;
      const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
      bMeta.importOkNotExitPass = true;
      if (demoted.includes("IRD-CONFIRM") || demoted.includes("DEX-CAM-FIT") || demoted.includes("DEX-LIP-SPLIT")) {
        bMeta.importDiagnoseOnly = true;
        (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
      }
      // Lit XOR/CONTACT demoted → same-kernel soft-fill + design Confirm 债（≠ ExitPass）
      // Full lit hygiene also runs below for all import salvage (even if lit not in demoted set)
      if (demoted.some((id) => /^DEX-LIT-|^DEX-PROP-CONT/.test(id))) {
        bMeta.litDebtImportPending = true;
      }
      (prep.shapeSalvageLog ??= []).push({
        ruleId: "SH-IMPORT-SALVAGE-DEMOTE",
        path: "exportGate.blocks",
        action: `demoted=${[...new Set(demoted)].join(",")}`,
      });
    }

    // Always scan shots for lit debt on import (不等 demote 名单 — 防假绿「可导入」)
    {
      const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
      const shots = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
      if (shots.length) {
        try {
          const { runImportLitDebtHygiene } =
            require("./design/importLitDebtHygiene") as typeof import("./design/importLitDebtHygiene");
          const lit = runImportLitDebtHygiene({
            shots,
            meta: bMeta,
            shapeSalvageLog: (prep.shapeSalvageLog ??= []),
          });
          if ((lit.splitCount > 0 || lit.softFilled.length) && bundle.preDesignPack) {
            (bundle.preDesignPack as { shots: unknown }).shots = shots;
            if (bundle.planData && typeof bundle.planData === "object") {
              const pd = bundle.planData as { preDesignPack?: { shots?: unknown } };
              if (pd.preDesignPack) pd.preDesignPack.shots = shots;
            }
          }
          // Lit XOR expand reindexes shots — must re-declare F0 (import heal F0 ran before expand)
          try {
            const { declareF0OnBundle } =
              require("./import/declareF0") as typeof import("./import/declareF0");
            const f0 = declareF0OnBundle(bundle as never);
            if (f0.declared.length) {
              (prep.shapeSalvageLog ??= []).push({
                ruleId: "SH-FX-F0-AFTER-LIT-SPLIT",
                path: "fxFeasibilityAudit.items",
                action: `declared=${f0.declared.join(",")}`,
              });
              if (!warns.some((w) => w.id === "FX-F0-IMPORT")) {
                warns.push({
                  id: "FX-F0-IMPORT",
                  message: `【可导入 · 已声明无特效 F0】镜 ${f0.declared.slice(0, 8).join(",")}（无特效不写 fxPrompt）`,
                  field: "fxFeasibility",
                });
              }
            }
          } catch {
            /* optional */
          }
          // Homology until-clear: F0 + strip noise + absorb literary EXTRA (same kernel as touch)
          try {
            const { softHealTouchHomology } =
              require("./heal/touchHomologyHeal") as typeof import("./heal/touchHomologyHeal");
            const heal = softHealTouchHomology(bundle as never);
            if (heal.absorbed > 0 || heal.strippedNoise > 0 || heal.f0Declared.length) {
              (prep.shapeSalvageLog ??= []).push({
                ruleId: "SH-DC01-ABSORB-EXTRA",
                path: "planData.dialoguePlan.lines",
                action: `cleared=${heal.cleared};noise=${heal.strippedNoise};absorb=${heal.absorbed};left=${heal.extrasLeft};f0=${heal.f0Declared.join(",")}`,
              });
              if (!warns.some((w) => w.id === "DC-01-ABSORB-EXTRA")) {
                warns.push({
                  id: "DC-01-ABSORB-EXTRA",
                  message: heal.cleared
                    ? `【可导入 · 台词/FX 同核已清零】剥离噪点 ${heal.strippedNoise} · 吸收文学 ${heal.absorbed} · F0 ${heal.f0Declared.length}`
                    : `【可导入 · 同核未完全清零】残留 EXTRA ${heal.extrasLeft} / 未声明 FX ${heal.undeclaredFxLeft} — 须设计重做`,
                  field: "planData.dialoguePlan",
                });
              }
            }
            // Splice harvested BLOCKs cleared by homology (no demote-as-success)
            if (heal.extrasLeft === 0) {
              for (let i = blocks.length - 1; i >= 0; i--) {
                const id = String(blocks[i]?.id ?? "");
                if (id === "DC-01-EXTRA" || id === "DC-01" || id === "H3" || id === "R2") {
                  if (/乱入|EXTRA|台词覆盖/.test(String(blocks[i]?.message ?? "")) || id === "DC-01-EXTRA") {
                    blocks.splice(i, 1);
                  }
                }
              }
            }
            if (heal.undeclaredFxLeft === 0) {
              for (let i = blocks.length - 1; i >= 0; i--) {
                const id = String(blocks[i]?.id ?? "");
                if (id === "FX-GRADE-01" || id === "DG-FALSE-GREEN-FX" || id === "DG-FX-DUAL-TRACK") {
                  if (/未声明|F0|空/.test(String(blocks[i]?.message ?? "")) || id !== "FX-GRADE-01") {
                    // Only splice undeclared-empty class; keep F4/F5 hard
                    const msg = String(blocks[i]?.message ?? "");
                    if (/未声明|空未声明|须在 fxFeasibility/.test(msg) || id === "DG-FALSE-GREEN-FX") {
                      blocks.splice(i, 1);
                    }
                  }
                }
              }
            }
            if (!heal.cleared && (heal.extrasLeft > 0 || heal.undeclaredFxLeft > 0)) {
              designExitIncomplete = true;
              bMeta.importOkNotExitPass = true;
            }
          } catch {
            /* optional */
          }
          if (lit.splitCount > 0) {
            designExitIncomplete = true;
            bMeta.importSplitExpanded = true;
            (bundle as { _importSplitExpanded?: boolean })._importSplitExpanded = true;
            if (!warns.some((w) => w.id === "LIT-IMPORT-SMART-SPLIT")) {
              warns.push({
                id: "LIT-IMPORT-SMART-SPLIT",
                message:
                  lit.warnMessage ||
                  `【可导入 · 已智能拆文学双接触】扩 ${lit.splitCount} 组；importOk≠designExitPass`,
                field: "preDesignPack.shots",
              });
            }
          } else if (lit.confirmRequired) {
            designExitIncomplete = true;
            (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired = true;
            if (!warns.some((w) => w.id === "LIT-IMPORT-CONFIRM")) {
              warns.push({
                id: "LIT-IMPORT-CONFIRM",
                message:
                  lit.warnMessage ||
                  `【可导入 · 文学债须设计确认】${lit.ctaLabel || "确认拆镜/批准增强"}；importOk≠designExitPass`,
                field: "meta.litDebtPrimaryAction",
              });
            }
          } else if (lit.warnMessage && !warns.some((w) => w.id === "LIT-IMPORT-SOFT")) {
            warns.push({
              id: "LIT-IMPORT-SOFT",
              message: lit.warnMessage,
              field: "preDesignPack.shots",
            });
          }
        } catch {
          /* optional */
        }
      }
    }

    // 导入：先同核智能拆；仅残留低置信 Confirm 才 soft（非「永不拆」）
    {
      const lipImportSoft = new Set(["LIP-01", "PR-09", "DFW-DURATION", "DEX-LIP-SPLIT"]);
      const softDemoted: string[] = [];
      const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
      try {
        if (!bMeta.importSplitExpanded && bundle.preDesignPack?.shots?.length) {
          const { healMisboundDialoguePlacement } =
            require("./design/dialoguePlacementMatch") as typeof import("./design/dialoguePlacementMatch");
          const place = healMisboundDialoguePlacement(
            (bundle.preDesignPack.shots as Record<string, unknown>[]).slice(),
          );
          // forceExpand / Chat Confirm：才跑 clause/visbeat/semantic 扩镜
          // 普通导入：只纠错台词落点 + 后续抬时；禁 clause 同文扩出伪设计（1→23）
          if (opts.forceExpand) {
            const { runSplitOrchestrator } =
              require("./design/splitOrchestrator") as typeof import("./design/splitOrchestrator");
            const beforeN = place.shots.length;
            const orch = runSplitOrchestrator({
              planData: (bundle.planData ?? {}) as Record<string, unknown>,
              shots: place.shots,
              meta: bMeta,
              applyClauseSplit: true,
              applyVisBeatExpanders: true,
              applySemanticSplit: true,
            });
            bundle.preDesignPack.shots = orch.shots as never;
            bundle.planData = orch.planData as never;
            (prep.shapeSalvageLog ??= []).push({
              ruleId: "SH-IMPORT-SMART-SPLIT",
              path: "exportGate.preLipSoft",
              action: `shots=${orch.shots.length};steps=${orch.log.map((l) => l.step).join(",")}`,
            });
            // Honesty: only mark expanded when shot count actually grew
            if (orch.shots.length > beforeN) {
              bMeta.importSplitExpanded = true;
              (bundle as { _importSplitExpanded?: boolean })._importSplitExpanded = true;
            }
          } else {
            bundle.preDesignPack.shots = place.shots as never;
            (prep.shapeSalvageLog ??= []).push({
              ruleId: "SH-IMPORT-SMART-SPLIT",
              path: "exportGate.preLipSoft",
              action: `placement_only;shots=${place.shots.length};no_clause_inflate`,
            });
            // Honesty: placement-only must NOT set importSplitExpanded (designExit would skip IRD)
          }
        }
      } catch {
        /* best-effort */
      }
      const shotsForLip = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
      let anyLipConfirm = false;
      for (const s of shotsForLip) {
        try {
          const { detectLipSplitPressure } =
            require("./design/lipSplit") as typeof import("./design/lipSplit");
          if (detectLipSplitPressure(s).mustConfirm) anyLipConfirm = true;
        } catch {
          /* optional */
        }
      }
      for (let i = blocks.length - 1; i >= 0; i--) {
        const row = blocks[i]!;
        if (!lipImportSoft.has(row.id)) continue;
        blocks.splice(i, 1);
        const msg = anyLipConfirm
          ? `【导入已智能拆 · 残留须 Confirm】${row.message}（confirmClusterSplit；importOk≠designExitPass）`
          : `【导入已智能拆/抬时】${row.message}`;
        if (!warns.some((w) => w.id === row.id && w.message === msg)) {
          warns.push({ ...row, message: msg });
        }
        softDemoted.push(row.id);
      }
      if (softDemoted.length) {
        if (anyLipConfirm) designExitIncomplete = true;
        bMeta.importOkNotExitPass = anyLipConfirm ? true : bMeta.importOkNotExitPass;
        if (anyLipConfirm) {
          bMeta.lipConfirmRequired = true;
          (bundle as { lipConfirmRequired?: boolean }).lipConfirmRequired = true;
        } else {
          bMeta.lipConfirmRequired = false;
        }
        (prep.shapeSalvageLog ??= []).push({
          ruleId: anyLipConfirm ? "SH-IMPORT-LIP-RESIDUAL" : "SH-IMPORT-LIP-HEALED",
          path: "exportGate.blocks",
          action: `soft=${[...new Set(softDemoted)].join(",")};confirm=${anyLipConfirm}`,
        });
      }
    }

    // 导入闭环：DIRTY/HAND-LIP 愈后残留 = 设计 Confirm 债；导入口 soft 不硬拦（禁静默拆手脸）
    {
      const dirtyImportSoft = new Set(["DEX-DIRTY-STILL-PROMPT", "DEX-HAND-LIP"]);
      const softDemoted: string[] = [];
      for (let i = blocks.length - 1; i >= 0; i--) {
        const row = blocks[i]!;
        if (!dirtyImportSoft.has(row.id)) continue;
        blocks.splice(i, 1);
        const msg = `【导入不拦 · 反推设计 Confirm】${row.message}（手+脸真脏须 SB 改 VD 或 VisBeat Confirm 拆；禁导入静默拆；importOk≠designExitPass）`;
        if (!warns.some((w) => w.id === row.id && w.message === msg)) {
          warns.push({ ...row, message: msg });
        }
        softDemoted.push(row.id);
      }
      if (softDemoted.length) {
        designExitIncomplete = true;
        const bMeta = ((bundle as { meta?: Record<string, unknown> }).meta ??= {});
        bMeta.importOkNotExitPass = true;
        bMeta.dirtyStillConfirmRequired = true;
        (prep.shapeSalvageLog ??= []).push({
          ruleId: "SH-IMPORT-DIRTY-NONBLOCK",
          path: "exportGate.blocks",
          action: `soft=${[...new Set(softDemoted)].join(",")}`,
        });
      }
    }
  }

  // Pack/formula switched → redesign required (unless keep-legacy ack)
  try {
    const {
      isBundleLiteraryStale,
      LITERARY_STALE_USER_MESSAGE,
    } = require("./design/viralDoctrine") as typeof import("./design/viralDoctrine");
    const { setKeepLegacyAck } = require("./design/redesignContract") as typeof import("./design/redesignContract");
    if (opts.acknowledgeKeepLegacy && isBundleLiteraryStale(bundle)) {
      const planView = { planData: (bundle.planData ?? {}) as Record<string, unknown> };
      setKeepLegacyAck(planView, "acknowledgeKeepLegacy");
      bundle.planData = { ...(bundle.planData as object), ...planView.planData } as ScriptBundle["planData"];
    }
    if (isBundleLiteraryStale(bundle) && !opts.acknowledgeKeepLegacy) {
      if (!blocks.some((b) => b.id === "DEX-LITERARY-STALE")) {
        blocks.push({
          id: "DEX-LITERARY-STALE",
          message: LITERARY_STALE_USER_MESSAGE,
          field: "planData.genreTemplate",
        });
      }
    } else if (opts.acknowledgeKeepLegacy) {
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i]?.id === "DEX-LITERARY-STALE") blocks.splice(i, 1);
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
  if (blocks.some((b) => b.id === "JSON_INCOMPLETE") && !repairHints.some((h) => h.id === "RH-JSON-INCOMPLETE")) {
    repairHints = [...repairHints, ...loadRepairHints(["RH-JSON-INCOMPLETE", "JSON_INCOMPLETE"])];
  }
  if (blocks.some((b) => b.id === "DEX-LITERARY-STALE") && !repairHints.some((h) => h.id === "RH-LITERARY-STALE")) {
    repairHints = [...repairHints, ...loadRepairHints(["RH-LITERARY-STALE", "DEX-LITERARY-STALE"])];
  }
  if (warnIds.some((id) => id === "NESTED_PACK_ONLY") && !repairHints.some((h) => h.id === "RH-HOIST-NEST")) {
    repairHints = [...repairHints, ...loadRepairHints(["RH-HOIST-NEST", "NESTED_PACK_ONLY"])];
  }
  if (warnIds.some((id) => id.startsWith("DEX-STILL")) && !repairHints.some((h) => h.id === "RH-STILL-FIRSTFRAME")) {
    repairHints = [...repairHints, ...loadRepairHints(["RH-STILL-FIRSTFRAME"])];
  }
  if (
    (prep.shapeSalvageLog ?? []).some((e) => e.ruleId === "SH-SERIES-CONT" || e.ruleId === "SH-BRIEF-STRING") &&
    !repairHints.some((h) => h.id === "RH-SERIES-CONT")
  ) {
    repairHints = [...repairHints, ...loadRepairHints(["RH-SERIES-CONT"])];
  }

  const cast = auditCastCoverage(bundle);
  const planLines =
    ((bundle.planData as { dialoguePlan?: { lines?: Nar14LineLike[] } } | undefined)?.dialoguePlan?.lines ??
      []) as Nar14LineLike[];
  const shotRows = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];

  if (
    blockIds.includes("QP-02") &&
    shotRows.some((s) => s._healInducedVd || /听者反应特写/.test(String(s.visualDescription ?? ""))) &&
    !repairHints.some((h) => h.id === "RH-QP-02-HEAL")
  ) {
    repairHints = [...repairHints, ...loadRepairHints(["RH-QP-02-HEAL"])];
  }

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
  // chatStrict / 未物理拆 CAM：禁假绿 selfcheck + modality
  if (
    blockIds.includes("IRD-CONFIRM") ||
    blockIds.includes("DEX-CAM-FIT") ||
    Boolean((bundle as { meta?: { camFitChatStrictBlocked?: boolean } }).meta?.camFitChatStrictBlocked)
  ) {
    const narSelf = (bundle.narrativeSelfcheck ?? {}) as { passed?: boolean; failedIds?: string[] };
    if (narSelf.passed === true || blockIds.includes("DEX-CAM-FIT") || blockIds.includes("IRD-CONFIRM")) {
      bundle.narrativeSelfcheck = {
        ...narSelf,
        passed: false,
        failedIds: [...new Set([...(narSelf.failedIds ?? []), "DEX-CAM-FIT"])],
        serverOverwritten: true,
        checkedAt: new Date().toISOString(),
      };
    }
    const mod = (bundle.modalityPromptAudit ?? {}) as Record<string, string>;
    if (mod.IMG === "pass" || mod.VID === "pass" || mod.FX === "pass") {
      bundle.modalityPromptAudit = {
        ...mod,
        ...(mod.IMG === "pass" ? { IMG: "fail" } : {}),
        ...(mod.VID === "pass" ? { VID: "fail" } : {}),
        ...(mod.FX === "pass" ? { FX: "fail" } : {}),
        serverOverwritten: "DEX-CAM-FIT",
      } as never;
    }
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

  // V5-10 / V5-C1: stamp smartDesignProposals from BLOCK ids for RulePanel/Chat homology
  try {
    const { stampSmartDesignProposals } =
      require("./design/smartProposalMerger") as typeof import("./design/smartProposalMerger");
    if (blockIds.length) {
      stampSmartDesignProposals(bundle as unknown as Record<string, unknown>, blockIds, {
        reverseTarget: "SB",
      });
    }
  } catch {
    /* optional */
  }

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
    designExitIncomplete,
    autoClosed,
    chatRepairText: buildAggregatedChatRepairText(repairHints, blockIds, missingFieldSummary, blocks, {
      planLines,
      shots: shotRows,
      warnIds,
      warnRows: warns,
      shapeSalvageLog: salvageLog,
      designExitIncomplete,
      autoClosedClearedIds: autoClosed?.clearedIds,
    }),
    previewStatusLine: buildExportPreviewStatusLine({
      exportAllowed,
      tier,
      blocks,
      shapeSalvageLog: prep.shapeSalvageLog,
      designExitIncomplete,
      autoClosedClearedIds: autoClosed?.clearedIds,
      deferredStill: Number(
        ((bundle as { meta?: { deferredStill?: number } }).meta?.deferredStill ??
          (bundle.planData as { assetCrefPlan?: { deferredStill?: boolean }[] } | undefined)?.assetCrefPlan?.filter(
            (e) => e.deferredStill,
          ).length) ?? 0,
      ),
      lipConfirmRequired: Boolean((bundle as { meta?: { lipConfirmRequired?: boolean } }).meta?.lipConfirmRequired),
      litConfirmRequired: Boolean(
        (bundle as { meta?: { irdConfirmRequired?: boolean; litDebtImportPending?: boolean } }).meta
          ?.irdConfirmRequired ||
          (bundle as { meta?: { litDebtImportPending?: boolean } }).meta?.litDebtImportPending ||
          (bundle as { irdConfirmRequired?: boolean }).irdConfirmRequired,
      ),
      litDebtCta: String(
        (bundle as { meta?: { litDebtCta?: string } }).meta?.litDebtCta ?? "",
      ) || undefined,
      litSmartSplit: Boolean(
        (bundle as { meta?: { litImportSmartSplit?: number } }).meta?.litImportSmartSplit ||
          (prep.shapeSalvageLog ?? []).some((e) => e.ruleId === "SH-LIT-IMPORT-SMART-SPLIT"),
      ),
      illegalSameVdRatio: (() => {
        try {
          const shots = bundle.preDesignPack?.shots ?? [];
          if (shots.length < 3) return 0;
          const { findDupVdStreaks, normalizeVdKey } =
            require("./design/dirtyStillPromptGate") as typeof import("./design/dirtyStillPromptGate");
          const dups = findDupVdStreaks(
            shots.map((s) => ({
              shotIndex: Number(s.shotIndex),
              visualDescription: String(s.visualDescription ?? ""),
            })),
            3,
          );
          if (!dups.length) return 0;
          const keys = new Map<string, number>();
          for (const s of shots) {
            const k = normalizeVdKey(String(s.visualDescription ?? ""));
            if (k.length >= 6) keys.set(k, (keys.get(k) ?? 0) + 1);
          }
          let max = 0;
          for (const n of keys.values()) max = Math.max(max, n);
          return max / shots.length;
        } catch {
          return 0;
        }
      })(),
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

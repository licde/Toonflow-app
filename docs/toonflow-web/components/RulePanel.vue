<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  ClosureCheck,
  ClosureDimension,
  InspectBundleResult,
  RepairHint,
  RePushPlanItem,
  SmartDesignProposal,
  RepairChangelogEntry,
} from "@/types/closure";
import { CLOSURE_DIMENSION_LABELS, forkLabel as forkLabelText } from "@/types/closure";
import {
  summarizeZ110Handoff,
  z110HandoffBanner,
  type Z110Handoff,
} from "@/types/z110Handoff";

/** Mirror BE handoffStubSelect for FE copy/download. */
function pickLocalStub(
  z: Z110Handoff | null,
  format: "edl" | "fcp" | "premiere" | "json" | "otio" | "resolve" | "manifest" | "srt",
): { filename: string; text: string } | null {
  if (!z) return null;
  if (format === "edl" && z.edlStub && z.edlStub.length > 8) {
    return { filename: "toonflow.edl", text: z.edlStub };
  }
  if (format === "fcp" && z.fcpXmlStub?.includes("xmeml")) {
    return { filename: "toonflow.fcpxml.xml", text: z.fcpXmlStub };
  }
  if (format === "premiere" && z.premiereXmlStub?.includes("premiereProject")) {
    return { filename: "toonflow.premiere.stub.xml", text: z.premiereXmlStub };
  }
  if (format === "otio" && z.otioStub?.includes("OTIO_SCHEMA")) {
    return { filename: "toonflow.otio.json", text: z.otioStub };
  }
  if (format === "resolve" && z.resolveXmlStub?.includes("resolveProject")) {
    return { filename: "toonflow.resolve.stub.xml", text: z.resolveXmlStub };
  }
  if (format === "manifest" && z.handoffManifest && z.handoffManifest.includes("formats")) {
    return { filename: "toonflow.handoff.manifest.json", text: z.handoffManifest };
  }
  if (format === "srt" && z.srtStub && z.srtStub.length > 12) {
    return { filename: "toonflow.srt", text: z.srtStub };
  }
  if (format === "json") {
    return {
      filename: "toonflow.transitions.json",
      text: JSON.stringify({ timeline: z.timeline ?? null }, null, 2),
    };
  }
  return null;
}

const props = defineProps<{
  result: InspectBundleResult | null;
  loading?: boolean;
  shapeSalvageLog?: { ruleId: string; path: string; action: string }[];
  serverFixedIds?: string[];
  chatMustFixIds?: string[];
  exportAllowed?: boolean | null;
  chatRepairText?: string;
  /** D14: FE consumes userMessage / primaryNextStep only */
  userMessage?: string;
  ctaLabel?: string;
  primaryNextStep?: string;
  healLog?: { at: string; ruleId: string; action: string; detail?: string }[];
  /** IC-02 / W93 smart proposals awaiting Confirm */
  smartDesignProposals?: SmartDesignProposal[] | null;
  /** Wave-2 silent design repair log for toast / debt board */
  repairChangelog?: RepairChangelogEntry[] | null;
  industryResidualDebts?: string[] | null;
  /** Wave-9/12 Z110 NLE handoff stubs */
  z110Handoff?: Z110Handoff | null;
}>();

const emit = defineEmits<{
  copyChat: [text: string];
  copyAllChat: [text: string];
  rePush: [item: RePushPlanItem];
  applyDc01SoftPatch: [];
  applyEmotionStructureHeal: [];
  confirmSmartProposal: [payload: { proposalId: string; fork?: string }];
  rejectSmartProposal: [payload: { proposalId: string }];
  applySmartProposals: [];
  presentationFork: [payload: { proposalId: string; fork: string }];
}>();

const activeTab = ref<ClosureDimension>("dc");
const copyFlash = ref(false);

const dimensions: ClosureDimension[] = ["dc", "pc", "gc", "ic"];

const showDc01SoftPatchCta = computed(() => {
  const plan = props.result?.rePushPlan ?? [];
  return plan.some(
    (p) =>
      p.trigger === "dialogue_hash_mismatch" ||
      /dialogue_hash_mismatch/i.test(String(p.trigger || p.reason || "")),
  );
});

const showEmotionStructureHealCta = computed(() => {
  const plan = props.result?.rePushPlan ?? [];
  return plan.some((p) => {
    const t = String(p.trigger || p.reason || "");
    return (
      /emotion_structure|cam_style|cluster|structure_stale|svq_|motion_mismatch/i.test(t) ||
      (p.reverseTarget === "EN" && /CAM|PR-CAM|structure/i.test(t))
    );
  });
});

const pendingProposals = computed(() => {
  const fromProp = props.smartDesignProposals ?? [];
  const fromResult = (props.result as InspectBundleResult & { smartDesignProposals?: SmartDesignProposal[] } | null)
    ?.smartDesignProposals ?? [];
  const list = fromProp.length ? fromProp : fromResult;
  return list.filter((p) => p.status === "pending_user_confirm" || p.status === "confirmed");
});

const confirmedCount = computed(
  () => pendingProposals.value.filter((p) => p.status === "confirmed").length,
);

function rePushLabel(p: RePushPlanItem): string {
  const trigger = String(p.trigger || p.reason || "");
  if (trigger === "runtime_type_error" || /is not a function|TypeError/i.test(trigger)) {
    return "运行时异常 → 重试生成（非台词保真）";
  }
  if (trigger === "dialogue_hash_mismatch" || /dialogue_hash_mismatch/i.test(trigger)) {
    return "分镜台词与剧本对不上 → 补台词后再生成";
  }
  if (/emotion_structure|structure_stale|cam_style|cluster/i.test(trigger)) {
    return "情绪结构待补齐 → 按当前风格自愈（不改台词）";
  }
  if (p.reverseTarget === "INFRA") {
    return trigger ? `${trigger} → 检查环境后重试` : "基础设施异常 → 重试";
  }
  if (p.reverseTarget === "SB" && /CAM|structure|emotion/i.test(trigger)) {
    return "分镜结构问题 → 一键按当前情绪风格补齐";
  }
  const target = p.reverseTarget ? ` → ${p.reverseTarget}` : "";
  return `${trigger || "回推"}${target}`;
}

/** SSOT: exportAllowed=false wins over soft inspect.blocked / WARN counts */
const isBlocked = computed(() => {
  if (props.exportAllowed === false) return true;
  if (props.exportAllowed === true) return false;
  return Boolean(props.result?.blocked);
});

const checksForTab = computed(() => {
  if (!props.result) return [];
  const list = props.result.closureChecks[activeTab.value] ?? [];
  return [...list].sort((a, b) => {
    const sa = a.passed ? 2 : a.severity === "BLOCK" ? 0 : 1;
    const sb = b.passed ? 2 : b.severity === "BLOCK" ? 0 : 1;
    return sa - sb;
  });
});

const optimizeCount = computed(() => {
  if (!props.result) return 0;
  const cr = props.result.closureReport;
  return (cr?.optimize?.length ?? 0) + (cr?.missing?.length ?? 0) + (props.result.warnings?.length ?? 0);
});

const salvageSummary = computed(() => {
  const log = props.shapeSalvageLog ?? [];
  if (!log.length) return "";
  const byRule = new Map<string, number>();
  for (const e of log) byRule.set(e.ruleId, (byRule.get(e.ruleId) ?? 0) + 1);
  return [...byRule.entries()].map(([id, n]) => `${id}×${n}`).join(" · ");
});

const serverFixedSet = computed(() => new Set(props.serverFixedIds ?? []));

const chatMustHints = computed(() => {
  const hints = props.result?.repairHints ?? [];
  const must = props.chatMustFixIds;
  if (!must?.length) {
    // Filter out salvage-related MOD hints when salvage already ran
    if ((props.shapeSalvageLog ?? []).some((e) => e.ruleId.includes("VISUAL-EFFECT"))) {
      return hints.filter((h) => h.id !== "RH-MOD-01" && !String(h.chatTemplate ?? "").includes("visualEffect as a string"));
    }
    return hints;
  }
  const mustSet = new Set(must);
  return hints.filter((h) => mustSet.has(h.id) || (h.ruleId && mustSet.has(h.ruleId)) || mustSet.has(String(h.ruleId ?? "")));
});

const serverFixedHints = computed(() => {
  const hints = props.result?.repairHints ?? [];
  const fixed = serverFixedSet.value;
  if (!fixed.size && !(props.shapeSalvageLog ?? []).length) return [];
  return hints.filter((h) => fixed.has(h.id) || (h.ruleId && fixed.has(h.ruleId)));
});

function checkClass(c: ClosureCheck): string {
  if (c.passed) return "rule-panel__check--pass";
  if (c.severity === "BLOCK") return "rule-panel__check--block";
  return "rule-panel__check--warn";
}

function forkLabel(fork: RePushPlanItem["presentationFork"]): string {
  return forkLabelText(fork);
}

const changelogLines = computed(() => {
  const fromProp = props.repairChangelog ?? [];
  const fromResult = ((props.result as InspectBundleResult & {
    repairChangelog?: RepairChangelogEntry[];
    exportGate?: { repairChangelog?: RepairChangelogEntry[] };
  } | null)?.repairChangelog ??
    (props.result as InspectBundleResult & {
      exportGate?: { repairChangelog?: RepairChangelogEntry[] };
    } | null)?.exportGate?.repairChangelog ??
    []) as RepairChangelogEntry[];
  const list = fromProp.length ? fromProp : fromResult;
  return list.slice(-6).map((e) => {
    const slot = e.slot || "?";
    const reason = e.reason || "";
    return `${slot}: ${e.before || "(empty)"} → ${e.after || ""}${reason ? " · " + reason : ""}`;
  });
});

const residualDebtLine = computed(() => {
  const debts =
    props.industryResidualDebts ??
    (props.result as InspectBundleResult & { industryResidualDebts?: string[] } | null)
      ?.industryResidualDebts ??
    [];
  if (!debts.length) return "";
  const phase = debts.filter((d) => /still_phase_|lgia\.|contam_soft:/.test(d));
  const rest = debts.filter((d) => !phase.includes(d));
  const bits: string[] = [];
  if (phase.length) bits.push(`分相债：${phase.slice(0, 4).join(", ")}`);
  if (rest.length) bits.push(`残留行业债：${rest.slice(0, 4).join(", ")}`);
  return bits.join(" · ") + (debts.length > 6 ? "…" : "");
});

const z110Banner = computed(() => {
  const z =
    props.z110Handoff ??
    (props.result as InspectBundleResult & { z110Handoff?: Z110Handoff; Z110?: Z110Handoff } | null)
      ?.z110Handoff ??
    (props.result as InspectBundleResult & { Z110?: Z110Handoff } | null)?.Z110 ??
    null;
  return z110HandoffBanner(summarizeZ110Handoff(z));
});

const z110Resolved = computed((): Z110Handoff | null => {
  return (
    props.z110Handoff ??
    (props.result as InspectBundleResult & { z110Handoff?: Z110Handoff; Z110?: Z110Handoff } | null)
      ?.z110Handoff ??
    (props.result as InspectBundleResult & { Z110?: Z110Handoff } | null)?.Z110 ??
    null
  );
});

const z110CopyFlash = ref("");

async function onCopyZ110Stub(
  format: "edl" | "fcp" | "premiere" | "json" | "otio" | "resolve" | "manifest" | "srt",
) {
  const pick = pickLocalStub(z110Resolved.value, format);
  if (!pick) {
    z110CopyFlash.value = `${format} 草稿不可用`;
    return;
  }
  try {
    await navigator.clipboard.writeText(pick.text);
    z110CopyFlash.value = `已复制 ${pick.filename}`;
    emit("copyChat", pick.text);
  } catch {
    z110CopyFlash.value = "复制失败";
  }
}

function onDownloadZ110Stub(
  format: "edl" | "fcp" | "premiere" | "json" | "otio" | "resolve" | "manifest" | "srt",
) {
  const pick = pickLocalStub(z110Resolved.value, format);
  if (!pick) {
    z110CopyFlash.value = `${format} 草稿不可用`;
    return;
  }
  const blob = new Blob([pick.text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = pick.filename;
  a.click();
  URL.revokeObjectURL(url);
  z110CopyFlash.value = `已下载 ${pick.filename}`;
}

/** Wave-14: download each available stub sequentially (browser; no zip dep). */
function onDownloadAllZ110Stubs() {
  const z = z110Resolved.value;
  const formats: Array<"edl" | "fcp" | "premiere" | "otio" | "resolve" | "srt" | "manifest" | "json"> = [
    "edl",
    "fcp",
    "premiere",
    "otio",
    "resolve",
    "srt",
    "manifest",
    "json",
  ];
  let n = 0;
  for (const format of formats) {
    const pick = pickLocalStub(z, format);
    if (!pick) continue;
    const blob = new Blob([pick.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pick.filename;
    a.click();
    URL.revokeObjectURL(url);
    n += 1;
  }
  z110CopyFlash.value = n ? `已下载 ${n} 个交接草稿` : "无可用草稿";
}

function onCopy(h: RepairHint) {
  if (h.chatTemplate) emit("copyChat", h.chatTemplate);
}

const allChatText = computed(() => {
  if (!props.result) return "";
  const direct = props.chatRepairText?.trim() || props.result.chatRepairText?.trim();
  if (direct) return direct;
  const uniqueIds = props.chatMustFixIds?.length
    ? props.chatMustFixIds
    : [
        ...dimensions.flatMap((d) =>
          (props.result?.closureChecks[d] ?? []).filter((c) => c.passed === false).map((c) => c.id),
        ),
        ...((props.result.qualityGate?.blocks ?? []).map((i) => i.id) ?? []),
      ];
  const hintLines = chatMustHints.value
    .map((h) => (h.chatTemplate ? `[${h.id}] ${h.chatTemplate}` : ""))
    .filter(Boolean);
  const fallbackHints = (props.result.repairHints ?? [])
    .slice(0, 20)
    .map((h) => (h.chatTemplate ? `[${h.id}] ${h.chatTemplate}` : ""))
    .filter(Boolean);
  return [
    "【闭环修复清单 — 请按项修改 JSON 字段，勿只改 audit 自报】",
    `待处理规则：${[...new Set(uniqueIds)].join(", ") || "无"}`,
    "",
    ...(hintLines.length ? hintLines : fallbackHints),
    "",
    "改完后重新 dryRun/exportGate 再导入；merge 保持 preserveMedia。回推舞台仅跳转，不改数据。",
  ].join("\n");
});

const morphClosed = computed(
  () => props.exportAllowed === true && !(props.chatMustFixIds ?? []).length,
);

const blockIdLine = computed(() => {
  const ids = [
    ...(props.chatMustFixIds ?? []),
    ...dimensions.flatMap((d) =>
      (props.result?.closureChecks[d] ?? [])
        .filter((c) => !c.passed && c.severity === "BLOCK")
        .map((c) => c.id),
    ),
    ...((props.result?.qualityGate?.blocks ?? []).map((i) => i.id) ?? []),
  ];
  const uniq = [...new Set(ids.filter(Boolean))];
  return uniq.length ? `规则：${uniq.slice(0, 12).join(", ")}${uniq.length > 12 ? "…" : ""}` : "";
});

const primaryBlockHint = computed(() => {
  const text = allChatText.value;
  const m = text.match(/【孤儿场】[^\n]+|【场镜基数】[^\n]+|【幽灵场】[^\n]+|【主因·结构】[^\n]+/);
  if (m) return `主因：${m[0].replace(/^【主因·结构】/, "").trim().slice(0, 120)}`;
  const firstMust = props.chatMustFixIds?.[0];
  return firstMust ? `主因规则：${firstMust}` : "";
});

function onCopyFullBrief() {
  const text = allChatText.value.trim();
  if (!text) return;
  emit("copyAllChat", text);
  copyFlash.value = true;
  setTimeout(() => {
    copyFlash.value = false;
  }, 1600);
}
</script>

<template>
  <div v-if="loading" class="rule-panel rule-panel--loading">闭环检测中…</div>
  <div v-else-if="!result" class="rule-panel rule-panel--empty">暂无闭环数据</div>
  <div v-else class="rule-panel">
    <div v-if="isBlocked" class="rule-panel__banner">
      <div>
        <div>{{ userMessage || "阻断 — 请先完善" }} · rulePack {{ result.rulePackVersion }} · {{ result.tier }}</div>
        <div v-if="ctaLabel" class="rule-panel__primary-hint">主按钮：{{ ctaLabel }}（{{ primaryNextStep || "chat_repair" }}）</div>
        <div v-if="!userMessage && blockIdLine" class="rule-panel__block-ids">{{ blockIdLine }}</div>
        <div v-if="!userMessage && primaryBlockHint" class="rule-panel__primary-hint">{{ primaryBlockHint }}</div>
      </div>
      <button
        v-if="allChatText.trim()"
        type="button"
        class="rule-panel__copy-primary"
        @click="onCopyFullBrief">
        {{ copyFlash ? "已复制" : ctaLabel || "复制闭环修复清单" }}
      </button>
    </div>
    <div v-else-if="morphClosed" class="rule-panel__banner rule-panel__banner--ok">
      形态已闭环，剩余为可选优化 · rulePack {{ result.rulePackVersion }} · {{ result.tier }}
    </div>
    <div v-else class="rule-panel__banner rule-panel__banner--ok">
      {{ optimizeCount ? `${optimizeCount} 项待优化（不阻断导入）` : "闭环通过" }} · rulePack
      {{ result.rulePackVersion }} · {{ result.tier }}
    </div>

    <section v-if="salvageSummary || serverFixedIds?.length || healLog?.length" class="rule-panel__section rule-panel__section--salvage">
      <h4>已自动完善（可展开追溯）</h4>
      <p v-if="salvageSummary">{{ salvageSummary }}</p>
      <ul v-if="serverFixedIds?.length">
        <li v-for="id in serverFixedIds" :key="id">{{ id }}</li>
      </ul>
      <details v-if="healLog?.length" class="rule-panel__heal-log">
        <summary>修复日志 {{ healLog.length }} 条</summary>
        <ul>
          <li v-for="(e, i) in healLog" :key="i">{{ e.ruleId }} · {{ e.action }}{{ e.detail ? ` · ${e.detail}` : "" }}</li>
        </ul>
      </details>
    </section>

        <section v-if="changelogLines.length || residualDebtLine" class="rule-panel__section rule-panel__section--changelog">
      <h4>静默智能修复变更</h4>
      <p v-if="residualDebtLine" class="rule-panel__residual">{{ residualDebtLine }}</p>
      <ul v-if="changelogLines.length">
        <li v-for="(line, i) in changelogLines" :key="i">{{ line }}</li>
      </ul>
    </section>

    <section v-if="z110Banner" class="rule-panel__section rule-panel__section--z110">
      <h4>Z110 声画交接（stub）</h4>
      <p>{{ z110Banner }}</p>
      <p class="rule-panel__residual">EDL/FCPXML/Premiere/OTIO/Resolve 仅为交接草稿，不可当生产工程导入。</p>
      <div class="rule-panel__z110-actions">
        <button type="button" class="rule-panel__copy-primary" @click="onCopyZ110Stub('edl')">复制 EDL</button>
        <button type="button" class="rule-panel__copy-primary" @click="onCopyZ110Stub('fcp')">复制 FCPXML</button>
        <button type="button" class="rule-panel__copy-primary" @click="onCopyZ110Stub('premiere')">复制 Premiere stub</button>
        <button type="button" class="rule-panel__copy-primary" @click="onCopyZ110Stub('otio')">复制 OTIO stub</button>
        <button type="button" class="rule-panel__copy-primary" @click="onCopyZ110Stub('resolve')">复制 Resolve stub</button>
        <button type="button" class="rule-panel__copy-primary" @click="onCopyZ110Stub('manifest')">复制 manifest</button>
        <button type="button" class="rule-panel__copy-primary" @click="onCopyZ110Stub('srt')">复制 SRT</button>
        <button type="button" class="rule-panel__copy-primary" @click="onDownloadZ110Stub('edl')">下载 EDL</button>
        <button type="button" class="rule-panel__copy-primary" @click="onDownloadZ110Stub('srt')">下载 SRT</button>
        <button type="button" class="rule-panel__copy-primary" @click="onDownloadZ110Stub('otio')">下载 OTIO</button>
        <button type="button" class="rule-panel__copy-primary" @click="onDownloadAllZ110Stubs">下载全部 stub</button>
      </div>
      <p v-if="z110CopyFlash" class="rule-panel__residual">{{ z110CopyFlash }}</p>
    </section>

    <section v-if="result.closureReport?.missing?.length" class="rule-panel__section">
      <h4>缺失项</h4>
      <ul>
        <li v-for="(m, i) in result.closureReport.missing" :key="i">{{ m }}</li>
      </ul>
    </section>

    <section v-if="result.chatPromptGaps?.length" class="rule-panel__section">
      <h4>Chat 提示词</h4>
      <ul>
        <li v-for="g in result.chatPromptGaps" :key="g.id + (g.shotIndex ?? '')">
          [{{ g.severity }}] {{ g.shotIndex ? `镜${g.shotIndex} ` : "" }}{{ g.message }}
        </li>
      </ul>
    </section>

    <section v-if="result.modalityGaps?.length" class="rule-panel__section">
      <h4>模态链</h4>
      <ul>
        <li v-for="(g, i) in result.modalityGaps" :key="i">
          {{ (g as { id?: string; message?: string }).id }}: {{ (g as { message?: string }).message }}
        </li>
      </ul>
    </section>

    <section v-if="result.qualityGate?.issues?.length" class="rule-panel__section">
      <h4>统一质量闸</h4>
      <ul>
        <li v-for="(g, i) in result.qualityGate.issues.slice(0, 20)" :key="`${g.id}-${i}`">
          [{{ g.severity }}] {{ g.shotIndex ? `镜${g.shotIndex} ` : "" }}{{ g.id }}: {{ g.message }}
        </li>
      </ul>
    </section>

    <section v-if="result.warnings?.length" class="rule-panel__section">
      <h4>提示</h4>
      <ul>
        <li v-for="(w, i) in result.warnings.slice(0, 20)" :key="i">{{ w }}</li>
      </ul>
    </section>

    <div class="rule-panel__tabs">
      <button
        v-for="d in dimensions"
        :key="d"
        type="button"
        class="rule-panel__tab"
        :class="{ 'rule-panel__tab--active': activeTab === d }"
        @click="activeTab = d">
        {{ CLOSURE_DIMENSION_LABELS[d] }}
        <span
          v-if="result.closureChecks[d].some((c) => !c.passed && c.severity === 'BLOCK')"
          class="rule-panel__badge"
          >!</span
        >
      </button>
    </div>

    <ul class="rule-panel__checks">
      <li v-for="c in checksForTab" :key="c.id" class="rule-panel__check" :class="checkClass(c)">
        <strong>{{ c.id }}</strong>
        <span>{{ c.message ?? (c.passed ? "PASS" : "FAIL") }}</span>
      </li>
    </ul>

    <section v-if="serverFixedHints.length" class="rule-panel__section">
      <h4>已服务端修复（无需再复制）</h4>
      <div v-for="h in serverFixedHints" :key="'fixed-' + h.id" class="rule-panel__hint-card rule-panel__hint-card--done">
        <code>{{ h.id }}</code>
        <p>{{ h.chatTemplate }}</p>
      </div>
    </section>

    <section v-if="showDc01SoftPatchCta" class="rule-panel__section">
      <h4>台词覆盖</h4>
      <p class="rule-panel__dc01-msg">分镜台词与剧本对不上，可一键把缺失台词补进空镜后再生成。</p>
      <button type="button" class="rule-panel__copy-primary" @click="emit('applyDc01SoftPatch')">
        一键补台词
      </button>
    </section>

    <section v-if="showEmotionStructureHealCta" class="rule-panel__section">
      <h4>情绪结构</h4>
      <p class="rule-panel__dc01-msg">只更新情绪契约与分镜结构，不修改台词原文。设计期应已出站；此处为漏网兜底。</p>
      <button type="button" class="rule-panel__copy-primary" @click="emit('applyEmotionStructureHeal')">
        按当前题材公式补齐结构
      </button>
    </section>

    <section v-if="pendingProposals.length" class="rule-panel__section">
      <h4>智能提案 Confirm（W93）</h4>
      <p class="rule-panel__dc01-msg">须先确认路径，再一键 apply 写库；未 Confirm 禁止假绿出站。</p>
      <div v-for="sp in pendingProposals" :key="sp.id || sp.ruleId" class="rule-panel__repush">
        <div>
          <strong>{{ sp.ruleId }}</strong>
          <span> · {{ sp.proposal }}</span>
          <span class="rule-panel__fork">{{ sp.status }} → {{ sp.targetStage }}</span>
        </div>
        <div v-if="sp.presentationFork?.length" class="rule-panel__fork-row">
          <button
            v-for="f in sp.presentationFork"
            :key="f.fork"
            type="button"
            class="rule-panel__copy-primary"
            @click="
              emit('presentationFork', { proposalId: sp.id || sp.ruleId, fork: f.fork });
              emit('confirmSmartProposal', { proposalId: sp.id || sp.ruleId, fork: f.fork });
            "
          >
            {{ f.label }}
          </button>
        </div>
        <div v-else class="rule-panel__fork-row">
          <button
            type="button"
            class="rule-panel__copy-primary"
            @click="emit('confirmSmartProposal', { proposalId: sp.id || sp.ruleId })"
          >
            Confirm
          </button>
          <button type="button" @click="emit('rejectSmartProposal', { proposalId: sp.id || sp.ruleId })">
            拒绝
          </button>
        </div>
      </div>
      <button
        v-if="confirmedCount"
        type="button"
        class="rule-panel__copy-primary"
        @click="emit('applySmartProposals')"
      >
        Apply 已确认提案写库（{{ confirmedCount }}）
      </button>
    </section>

    <section v-if="chatMustHints.length || (isBlocked && allChatText.trim())" class="rule-panel__section">
      <div class="rule-panel__section-header">
        <h4>需 Chat 修改</h4>
        <button type="button" @click="onCopyFullBrief">
          {{ copyFlash ? "已复制" : "复制闭环修复清单" }}
        </button>
      </div>
      <div v-for="h in chatMustHints" :key="h.id" class="rule-panel__hint-card">
        <code>{{ h.id }}</code>
        <p>{{ h.chatTemplate }}</p>
        <button type="button" @click="onCopy(h)">复制到 Chat</button>
      </div>
    </section>

    <section v-if="result.rePushPlan?.length" class="rule-panel__section">
      <h4>回推计划</h4>
      <div v-for="(p, i) in result.rePushPlan" :key="i" class="rule-panel__repush">
        <span>{{ rePushLabel(p) }}</span>
        <span v-if="p.presentationFork" class="rule-panel__fork">{{ forkLabel(p.presentationFork) }}</span>
        <button type="button" @click="emit('rePush', p)">回推 {{ p.reverseTarget }}（仅跳转，未改数据）</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rule-panel {
  font-size: 13px;
}
.rule-panel__banner {
  padding: 10px 12px;
  background: #fff1f0;
  border: 1px solid #ffa39e;
  border-radius: 6px;
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}
.rule-panel__banner--ok {
  background: #f6ffed;
  border-color: #b7eb8f;
}
.rule-panel__copy-primary {
  border: 1px solid #cf1322;
  background: #fff;
  color: #cf1322;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-weight: 600;
  white-space: nowrap;
}
.rule-panel__block-ids {
  margin-top: 4px;
  font-size: 12px;
  color: #a8071a;
  word-break: break-all;
}
.rule-panel__primary-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #cf1322;
  font-weight: 500;
}
.rule-panel__tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.rule-panel__tab {
  padding: 6px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.rule-panel__tab--active {
  border-color: #1677ff;
  color: #1677ff;
}
.rule-panel__badge {
  color: #ff4d4f;
  margin-left: 4px;
}
.rule-panel__checks {
  list-style: none;
  padding: 0;
  margin: 0 0 16px;
}
.rule-panel__check {
  padding: 6px 8px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  gap: 8px;
}
.rule-panel__check--block {
  background: #fff2f0;
}
.rule-panel__check--warn {
  background: #fffbe6;
}
.rule-panel__check--pass {
  opacity: 0.75;
}
.rule-panel__section {
  margin-top: 16px;
}
.rule-panel__section--salvage {
  background: #f6ffed;
  padding: 10px 12px;
  border-radius: 6px;
  border: 1px solid #b7eb8f;
}
.rule-panel__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.rule-panel__hint-card,
.rule-panel__repush {
  border: 1px solid #f0f0f0;
  padding: 10px;
  border-radius: 6px;
  margin-bottom: 8px;
}
.rule-panel__hint-card--done {
  opacity: 0.7;
  background: #fafafa;
}
.rule-panel__fork {
  margin-left: 8px;
  color: #722ed1;
  font-size: 12px;
}
.rule-panel__fork-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.rule-panel__dc01-msg {
  margin: 0 0 8px;
  font-size: 12px;
  color: #666;
}
</style>

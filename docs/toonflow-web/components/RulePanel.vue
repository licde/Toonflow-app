<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  ClosureCheck,
  ClosureDimension,
  InspectBundleResult,
  RepairHint,
  RePushPlanItem,
} from "../types/closure";
import { CLOSURE_DIMENSION_LABELS } from "../types/closure";

const props = defineProps<{
  result: InspectBundleResult | null;
  loading?: boolean;
}>();

const emit = defineEmits<{
  copyChat: [text: string];
  rePush: [item: RePushPlanItem];
}>();

const activeTab = ref<ClosureDimension>("dc");

const dimensions: ClosureDimension[] = ["dc", "pc", "gc", "ic"];

const checksForTab = computed(() => {
  if (!props.result) return [];
  const list = props.result.closureChecks[activeTab.value] ?? [];
  return [...list].sort((a, b) => {
    const sa = a.passed ? 2 : a.severity === "BLOCK" ? 0 : 1;
    const sb = b.passed ? 2 : b.severity === "BLOCK" ? 0 : 1;
    return sa - sb;
  });
});

const failedBlockCount = computed(() => {
  if (!props.result) return 0;
  let n = 0;
  for (const d of dimensions) {
    n += props.result.closureChecks[d].filter((c) => !c.passed && c.severity === "BLOCK").length;
  }
  return n;
});

function checkClass(c: ClosureCheck): string {
  if (c.passed) return "rule-panel__check--pass";
  if (c.severity === "BLOCK") return "rule-panel__check--block";
  return "rule-panel__check--warn";
}

function forkLabel(fork: RePushPlanItem["presentationFork"]): string {
  if (fork === "fork-A") return "改剧本";
  if (fork === "fork-B") return "改分镜";
  return "";
}

function onCopy(h: RepairHint) {
  if (h.chatTemplate) emit("copyChat", h.chatTemplate);
}
</script>

<template>
  <div v-if="loading" class="rule-panel rule-panel--loading">闭环检测中…</div>
  <div v-else-if="!result" class="rule-panel rule-panel--empty">暂无闭环数据</div>
  <div v-else class="rule-panel">
    <div v-if="result.blocked" class="rule-panel__banner">
      阻断：{{ failedBlockCount }} 项 BLOCK 未通过 · rulePack {{ result.rulePackVersion }} · {{ result.tier }}
    </div>
    <div v-else class="rule-panel__banner rule-panel__banner--ok">
      闭环通过 · rulePack {{ result.rulePackVersion }} · {{ result.tier }}
    </div>

    <div class="rule-panel__tabs">
      <button
        v-for="d in dimensions"
        :key="d"
        type="button"
        class="rule-panel__tab"
        :class="{ 'rule-panel__tab--active': activeTab === d }"
        @click="activeTab = d"
      >
        {{ CLOSURE_DIMENSION_LABELS[d] }}
        <span v-if="result.closureChecks[d].some((c) => !c.passed && c.severity === 'BLOCK')" class="rule-panel__badge">!</span>
      </button>
    </div>

    <ul class="rule-panel__checks">
      <li v-for="c in checksForTab" :key="c.id" class="rule-panel__check" :class="checkClass(c)">
        <strong>{{ c.id }}</strong>
        <span>{{ c.message ?? (c.passed ? "PASS" : "FAIL") }}</span>
      </li>
    </ul>

    <section v-if="result.repairHints?.length" class="rule-panel__section">
      <h4>修复话术</h4>
      <div v-for="h in result.repairHints" :key="h.id" class="rule-panel__hint-card">
        <code>{{ h.id }}</code>
        <p>{{ h.chatTemplate }}</p>
        <button type="button" @click="onCopy(h)">复制到 Chat</button>
      </div>
    </section>

    <section v-if="result.rePushPlan?.length" class="rule-panel__section">
      <h4>回推计划</h4>
      <div v-for="(p, i) in result.rePushPlan" :key="i" class="rule-panel__repush">
        <span>{{ p.trigger }} → {{ p.reverseTarget }}</span>
        <span v-if="p.presentationFork" class="rule-panel__fork">{{ forkLabel(p.presentationFork) }}</span>
        <button type="button" @click="emit('rePush', p)">回推 {{ p.reverseTarget }}</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rule-panel { font-size: 13px; }
.rule-panel__banner { padding: 10px 12px; background: #fff1f0; border: 1px solid #ffa39e; border-radius: 6px; margin-bottom: 12px; }
.rule-panel__banner--ok { background: #f6ffed; border-color: #b7eb8f; }
.rule-panel__tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.rule-panel__tab { padding: 6px 10px; border: 1px solid #d9d9d9; border-radius: 4px; background: #fff; cursor: pointer; }
.rule-panel__tab--active { border-color: #1677ff; color: #1677ff; }
.rule-panel__badge { color: #ff4d4f; margin-left: 4px; }
.rule-panel__checks { list-style: none; padding: 0; margin: 0 0 16px; }
.rule-panel__check { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 8px; }
.rule-panel__check--block { background: #fff2f0; }
.rule-panel__check--warn { background: #fffbe6; }
.rule-panel__check--pass { opacity: 0.75; }
.rule-panel__section { margin-top: 16px; }
.rule-panel__hint-card, .rule-panel__repush { border: 1px solid #f0f0f0; padding: 10px; border-radius: 6px; margin-bottom: 8px; }
.rule-panel__fork { margin-left: 8px; color: #722ed1; font-size: 12px; }
</style>

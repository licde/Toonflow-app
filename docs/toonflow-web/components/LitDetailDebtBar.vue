<!-- LitDetailDebtBar — FE contract stub (a11y).
  Wire when primaryAction=hand_edit_vd|confirm_enhance|confirm_split or missingSlots[] from stillIntentOps / burn detect.
  Primary: enhance approve / hand-edit VD / split. Never sole batch_still while slots open. VisBeat owns split-only UI elsewhere. -->
<template>
  <section
    class="lit-debt"
    role="region"
    aria-labelledby="lit-debt-title"
    :aria-describedby="explainId"
  >
    <h3 id="lit-debt-title">{{ title }}</h3>
    <p :id="explainId" class="lit-debt__explain">{{ explainText }}</p>
    <ul v-if="slots.length" class="lit-debt__slots" aria-label="缺结构槽">
      <li v-for="s in slots" :key="s" class="lit-debt__chip">{{ s }}</li>
    </ul>
    <p v-if="findingIds.length" class="lit-debt__row">codes: {{ findingIds.join(" · ") }}</p>
    <div class="lit-debt__actions" role="group" aria-label="文学细节修复">
      <button
        v-if="showEnhance"
        type="button"
        class="lit-debt__primary"
        @click="$emit('confirm-enhance')"
      >
        {{ enhanceLabel }}
      </button>
      <button
        v-if="showSplit"
        type="button"
        class="lit-debt__primary"
        @click="$emit('confirm-split')"
      >
        确认拆镜
      </button>
      <button
        v-if="showRegenPropStill"
        type="button"
        class="lit-debt__primary"
        @click="$emit('batch-still')"
      >
        重出带道具静照
      </button>
      <button
        v-if="showHumanRejudge"
        type="button"
        class="lit-debt__primary lit-debt__human"
        @click="$emit('human-rejudge')"
      >
        {{ humanRejudgeLabel }}
      </button>
      <template v-if="showFork">
        <button
          v-for="f in forkChoices"
          :key="f.fork"
          type="button"
          class="lit-debt__primary lit-debt__fork"
          @click="$emit('presentation-fork', f.fork)"
        >
          {{ f.label }}
        </button>
      </template>
      <button
        v-if="!showFork"
        type="button"
        class="lit-debt__primary"
        @click="$emit('hand-edit-vd')"
      >
        {{ handEditLabel }}
      </button>
      <button
        v-if="suggestFillEnabled"
        type="button"
        class="lit-debt__secondary"
        @click="$emit('suggest-fill')"
      >
        建议补写（须 Confirm）
      </button>
      <button
        v-if="allowWeakRegen && !slots.length && !showRegenPropStill"
        type="button"
        class="lit-debt__ghost"
        @click="$emit('batch-still')"
      >
        仅重出静照（不推荐）
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  flattenMissingSlots,
  irdCtaLabel,
  isEnhanceAction,
  isSplitAction,
  type IrdFinding,
  type IrdPrimaryAction,
} from "../types/stillIntentOps";
import { humanRejudgePrimaryCta, shouldOfferHumanRejudge, type StillMeta } from "../types/stillQuality";

const props = withDefaults(
  defineProps<{
    explain?: string;
    title?: string;
    primaryAction?: IrdPrimaryAction | string;
    missingSlots?: string[];
    findings?: IrdFinding[];
    /** When literaryDetailLlmFill / intentVisualEnhance flag on */
    suggestFillEnabled?: boolean;
    /** Hide enhance CTA for rollback */
    hideEnhance?: boolean;
    /** Only show regen as ghost — never primary while slots open */
    allowWeakRegen?: boolean;
    /** Still meta for Key-optional human rejudge path */
    stillMeta?: StillMeta | null;
    /** designDebt blocks human rejudge until IRD fills slots */
    designDebtBlock?: boolean;
    ctaLabel?: string;
    /** Med-confidence presentation fork choices from IRD */
    presentationFork?: { fork: string; label: string }[] | null;
  }>(),
  {
    suggestFillEnabled: false,
    hideEnhance: false,
    allowWeakRegen: false,
    designDebtBlock: false,
  },
);

defineEmits<{
  (e: "hand-edit-vd"): void;
  (e: "suggest-fill"): void;
  (e: "confirm-enhance"): void;
  (e: "confirm-split"): void;
  (e: "batch-still"): void;
  (e: "human-rejudge"): void;
  (e: "presentation-fork", fork: string): void;
}>();

const slots = computed(() => {
  const fromProp = (props.missingSlots ?? []).filter(Boolean);
  if (fromProp.length) return fromProp;
  return flattenMissingSlots(props.findings);
});

const findingIds = computed(() =>
  [...new Set((props.findings ?? []).filter((f) => f.severity === "BLOCK").map((f) => f.id))],
);

const showHumanRejudge = computed(
  () => !props.designDebtBlock && shouldOfferHumanRejudge(props.stillMeta ?? null),
);

const humanRejudgeLabel = computed(() =>
  humanRejudgePrimaryCta(props.stillMeta ?? null),
);

const showFork = computed(
  () =>
    props.primaryAction === "presentation_fork" ||
    (props.presentationFork?.length ?? 0) > 0,
);

const forkChoices = computed(() => {
  if (props.presentationFork?.length) return props.presentationFork;
  return [
    { fork: "fork-A", label: "改 W3 △ 叙事描述" },
    { fork: "fork-B", label: "改 SB spatialRelation 镜级" },
  ];
});

const showEnhance = computed(
  () =>
    !props.hideEnhance &&
    (isEnhanceAction(props.primaryAction) ||
      slots.value.some((s) => /contact|grip|xor|wound|propReadable|propInFrame|contactGeom/i.test(s))),
);

const showSplit = computed(
  () =>
    isSplitAction(props.primaryAction) ||
    findingIds.value.includes("DEX-LIT-CONTACT-XOR") ||
    slots.value.includes("contactRoleXor"),
);

const showRegenPropStill = computed(
  () =>
    slots.value.includes("propInFrame") ||
    slots.value.includes("contactGeom") ||
    findingIds.value.includes("DEX-PROP-IN-FRAME") ||
    findingIds.value.includes("STILL-CONTACT-HANDOFF"),
);

const enhanceLabel = computed(() =>
  irdCtaLabel({
    primaryAction: props.primaryAction === "apply_auto_enhance" ? "apply_auto_enhance" : "confirm_enhance",
    missingSlots: slots.value,
  }),
);

const handEditLabel = computed(() =>
  props.ctaLabel && !isEnhanceAction(props.primaryAction)
    ? props.ctaLabel
    : irdCtaLabel({ primaryAction: "hand_edit_vd", missingSlots: slots.value }),
);

const explainText = computed(() => {
  if (props.explain) return props.explain;
  if (showFork.value) {
    return "中置信智能修复：请先选择 fork-A（改叙事）或 fork-B（改镜级构图），禁止空跳手改。";
  }
  if (props.designDebtBlock) {
    return "设计债未清（缺 propInFrame/contactGeom 等）；请先 IRD/手改 VD，再人审。人审不能跳过设计债。";
  }
  if (showHumanRejudge.value) {
    return "诊断 Key 可选。当前未测·弱图非失败；主路径为人审通过（未测·非失败），Key 仅作可选增强。";
  }
  if (showRegenPropStill.value) {
    return "接触事件须道具入画（propInFrame+contactGeom）；浅痕≠道具。请批准增强补道具句，或重出带道具静照；禁止只改视频词。";
  }
  if (slots.value.includes("contactRoleXor")) {
    return "颊触与口创同镜须互斥句或拆镜；可批准增强补 contactRoleXor，或手改 VD。禁止只 hq_update。";
  }
  if (slots.value.length) {
    return `缺结构槽 ${slots.value.join("/")}。可批准增强或手改 visualDescription；禁止只 hq_update。`;
  }
  return "文学细节/道具契约未过。请增强或手改 VD；禁止只 regen。";
});
</script>

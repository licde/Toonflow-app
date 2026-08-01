<!-- Literary detail debt bar — enhance / split / hand-edit / human rejudge; never sole regen while slots open. -->

<template>

  <section v-if="show" class="lit-debt" role="region" aria-labelledby="lit-debt-title">

    <h4 id="lit-debt-title" class="lit-debt__title">{{ title }}</h4>

    <p class="lit-debt__explain">{{ explainText }}</p>

    <div v-if="slots.length" class="lit-debt__slots" aria-label="缺结构槽">

      <t-tag v-for="s in slots" :key="s" size="small" theme="warning" variant="light">{{ s }}</t-tag>

    </div>

    <p v-if="findingIds.length" class="lit-debt__codes">codes: {{ findingIds.join(" · ") }}</p>

    <div class="lit-debt__actions" role="group" aria-label="文学细节修复">

      <t-button

        v-if="showEnhance && !hideEnhance"

        size="small"

        theme="primary"

        @click="$emit('confirm-enhance')"

      >

        {{ enhanceLabel }}

      </t-button>

      <t-button v-if="showSplit" size="small" theme="primary" @click="$emit('confirm-split')">

        {{ splitLabel }}

      </t-button>

      <t-button

        v-if="showGenerateContinue"

        size="small"

        theme="primary"

        variant="outline"

        @click="$emit('batch-still')"

      >

        {{ generateContinueLabel }}

      </t-button>

      <t-button

        v-if="showRegenPropStill"

        size="small"

        theme="warning"

        @click="$emit('batch-still')"

      >

        {{ regenPropLabel }}

      </t-button>

      <t-button

        v-if="showHumanRejudge"

        size="small"

        theme="success"

        variant="outline"

        @click="$emit('human-rejudge')"

      >

        {{ humanRejudgeLabel }}

      </t-button>

      <template v-if="showFork">

        <t-button

          v-for="f in forkChoices"

          :key="f.fork"

          size="small"

          theme="primary"

          variant="outline"

          @click="$emit('presentation-fork', f.fork)"

        >

          {{ f.label }}

        </t-button>

      </template>

      <t-button

        v-if="!showFork"

        size="small"

        theme="primary"

        variant="outline"

        @click="$emit('hand-edit-vd')"

      >

        {{ handEditLabel }}

      </t-button>

      <t-button

        v-if="suggestFillEnabled"

        size="small"

        theme="default"

        variant="outline"

        @click="$emit('suggest-fill')"

      >

        建议补写（须 Confirm）

      </t-button>

      <t-button

        v-if="allowWeakRegen && !slots.length && !showRegenPropStill"

        size="small"

        theme="default"

        variant="text"

        @click="$emit('batch-still')"

      >

        仅重出静照（不推荐）

      </t-button>

    </div>

  </section>

</template>



<script setup lang="ts">

import { computed } from "vue";

import {

  flattenMissingSlots,

  irdCtaLabel,

  isEnhanceAction,

  isLitDebtStillMeta,

  isSplitAction,

  type IrdFinding,

  type IrdPrimaryAction,

} from "@/types/stillIntentOps";

import { humanRejudgePrimaryCta, shouldOfferHumanRejudge, resolveStillDebtSemantics, resolveStillPrimaryCtaLabel, type StillMeta } from "@/types/stillQuality";



const props = withDefaults(

  defineProps<{

    explain?: string;

    title?: string;

    primaryAction?: IrdPrimaryAction | string;

    primaryNextStep?: string;

    missingSlots?: string[];

    findings?: IrdFinding[];

    suggestFillEnabled?: boolean;

    hideEnhance?: boolean;

    allowWeakRegen?: boolean;

    stillMeta?: StillMeta | null;

    stillQuality?: string | null;

    designDebtBlock?: boolean;

    ctaLabel?: string;

    presentationFork?: { fork: string; label: string }[] | null;

  }>(),

  {

    title: "文学细节未过 · 须补描写",

    suggestFillEnabled: true,

    hideEnhance: false,

    allowWeakRegen: true,

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



const humanRejudgeLabel = computed(() => humanRejudgePrimaryCta(props.stillMeta ?? null));



const showFork = computed(

  () =>

    props.primaryAction === "presentation_fork" || (props.presentationFork?.length ?? 0) > 0,

);



const forkChoices = computed(() => {

  if (props.presentationFork?.length) return props.presentationFork;

  return [

    { fork: "fork-A", label: "改 W3 △ 叙事描述" },

    { fork: "fork-B", label: "改 SB spatialRelation 镜级" },

  ];

});



const show = computed(

  () =>

    isLitDebtStillMeta({

      primaryNextStep: props.primaryNextStep,

      irdPrimaryAction: props.primaryAction,

      missingSlots: slots.value,

      ctaLabel: props.ctaLabel,

    }) ||

    (props.stillQuality === "weak" && slots.value.length > 0) ||

    showHumanRejudge.value ||

    showFork.value,

);



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



const debtSemantics = computed(() => resolveStillDebtSemantics(props.stillMeta ?? null));

const showRegenPropStill = computed(

  () =>

    slots.value.includes("propInFrame") ||

    slots.value.includes("contactGeom") ||

    slots.value.includes("prop_form") ||

    findingIds.value.includes("DEX-PROP-IN-FRAME") ||

    findingIds.value.includes("STILL-CONTACT-HANDOFF") ||

    findingIds.value.includes("PROP-FORM") ||

    debtSemantics.value.kind === "prop_form" ||

    debtSemantics.value.kind === "prop_plate",

);

const regenPropLabel = computed(() =>
  debtSemantics.value.kind === "prop_form"
    ? "重出形态静照"
    : debtSemantics.value.kind === "prop_plate"
      ? "挂道具板后再生成"
      : "重出带道具静照",
);



const shootableCta = computed(() =>
  resolveStillPrimaryCtaLabel({
    ...(props.stillMeta ?? {}),
    primaryNextStep: props.primaryNextStep ?? props.stillMeta?.primaryNextStep,
    irdPrimaryAction: props.primaryAction ?? props.stillMeta?.irdPrimaryAction,
    stillQuality: (props.stillQuality ?? props.stillMeta?.stillQuality) as StillMeta["stillQuality"],
    ctaLabel: props.ctaLabel ?? props.stillMeta?.ctaLabel,
  }),
);

const splitLabel = computed(() =>
  shootableCta.value.kind === "split_and_generate" ? shootableCta.value.label : "智拆并生成",
);

const showGenerateContinue = computed(
  () =>
    !showRegenPropStill.value &&
    (shootableCta.value.kind === "continue_repair" ||
      shootableCta.value.kind === "generate" ||
      shootableCta.value.kind === "enhance_and_generate" ||
      shootableCta.value.kind === "enqueue_identity_and_generate" ||
      Boolean(props.stillMeta?.requireFixBeforeBurn)),
);

const generateContinueLabel = computed(() => {
  if (shootableCta.value.kind === "enqueue_identity_and_generate") return shootableCta.value.label;
  if (shootableCta.value.kind === "enhance_and_generate") return shootableCta.value.label;
  if (shootableCta.value.kind === "continue_repair") return shootableCta.value.label;
  return "继续生成修复";
});

const enhanceLabel = computed(() => {
  if (shootableCta.value.kind === "enhance_and_generate") return shootableCta.value.label;
  return irdCtaLabel({
    primaryAction: props.primaryAction === "apply_auto_enhance" ? "apply_auto_enhance" : "confirm_enhance",
    missingSlots: slots.value,
  });
});



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

    return "设计债建议先补齐（propInFrame/contactGeom 等）；仍可试拍生成，烧片前须对齐。人审不能假绿 hq。";

  }

  if (debtSemantics.value.kind === "prop_form" || debtSemantics.value.kind === "prop_plate") {
    return debtSemantics.value.explain;
  }

  if (debtSemantics.value.kind === "key_unmeasured" && showHumanRejudge.value) {
    return debtSemantics.value.explain;
  }

  if (showHumanRejudge.value) {

    return "诊断 Key 可选（不挡质量流）。结构债未清禁升 hq；像素未测≠结构已过。Key 仅作可选像素增强。";

  }

  if (showRegenPropStill.value) {

    return "接触事件须道具入画（propInFrame+contactGeom）；浅痕≠道具。请批准增强补道具句，或重出带道具静照；禁止只改视频词。";

  }

  if (
    /lit_contact_mouth_ban|mouthBan/i.test(String(props.reverseTrigger ?? props.code ?? "")) ||
    slots.value.some((s) => /mouthBan|禁口含/i.test(s))
  ) {
    return "接触主题胶水：compose 须含「禁口含/禁纸入口/仅落点触」HARD；缺则增强或手改 VD，禁止只 regen。";
  }

  if (slots.value.includes("contactRoleXor") || showSplit.value) {

    return "颊触与口创同镜建议智拆并生成；已可试拍（系统会尽量瘦身颊触）。烧片前须拆齐或增强对齐。";

  }

  if (slots.value.length) {

    return `缺结构槽 ${slots.value.join("/")}。可「应用补全」按反推契约补描写，或手改 visualDescription；补全后可继续生成。`;

  }

  return "文学细节/道具契约未过。请增强或手改 VD；补全后可继续生成（Key 可选不挡生成）。";

});

</script>



<style scoped>

.lit-debt {

  margin-top: 8px;

  padding: 8px 10px;

  border: 1px solid #f5c6a0;

  background: #fff8f0;

  border-radius: 4px;

}

.lit-debt__title {

  margin: 0 0 4px;

  font-size: 13px;

  font-weight: 600;

}

.lit-debt__explain {

  margin: 0 0 6px;

  font-size: 12px;

  line-height: 1.4;

  color: #666;

}

.lit-debt__codes {

  margin: 0 0 6px;

  font-size: 11px;

  color: #b54708;

}

.lit-debt__slots {

  display: flex;

  flex-wrap: wrap;

  gap: 4px;

  margin-bottom: 8px;

}

.lit-debt__actions {

  display: flex;

  flex-wrap: wrap;

  gap: 6px;

}

</style>



<!-- VisBeat ConfirmBar — FE contract stub (a11y).
  Wire: primaryNextStep=split_shot → POST /api/scriptAgent/stillIntentOps|designSplitOps|visBeatOps
  then force designExit. Also covers DEX-STILL-CU-CAST / still_cu_cast.
  Literary debt (hand_edit_vd / missingSlots) → use LitDetailDebtBar.vue, not this bar. -->
<template>
  <section
    class="visbeat-confirm"
    role="region"
    aria-labelledby="visbeat-confirm-title"
    :aria-describedby="explainId"
  >
    <h3 id="visbeat-confirm-title">{{ splitApplied ? "已语义拆镜" : title }}</h3>
    <p v-if="reverseTrigger" class="visbeat-confirm__row">trigger: {{ reverseTrigger }}</p>
    <p :id="explainId" class="visbeat-confirm__explain">{{ explain }}</p>
    <p v-if="confidence != null" class="visbeat-confirm__row">
      置信 {{ confidence.toFixed(2) }} · {{ autoEligible ? "可 auto" : "须 Confirm" }}
    </p>
    <p v-if="!splitApplied" class="visbeat-confirm__row">
      子镜须景别/运镜/intent.picture 可区分；禁止同文口型克隆（与 designSplitOps 同核 Confirm）
    </p>
    <p v-if="splitApplied && splitExpandedCount" class="visbeat-confirm__row">
      已拆为 {{ splitExpandedCount }} 组拍点
    </p>
    <p v-if="matrixRowId" class="visbeat-confirm__row">矩阵：{{ matrixRowId }}</p>
    <div class="visbeat-confirm__actions" role="group" aria-label="拆镜操作">
      <button
        v-if="!splitApplied"
        type="button"
        class="visbeat-confirm__primary"
        @click="$emit('confirm-split')"
      >
        确认拆镜
      </button>
      <button
        v-if="splitApplied && undoToken"
        type="button"
        class="visbeat-confirm__primary"
        @click="$emit('undo-split', undoToken)"
      >
        撤销拆镜
      </button>
      <button type="button" class="visbeat-confirm__secondary" @click="$emit('override', 'oner_artistic')">
        艺术长镜头
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    explain: string;
    /** 视觉拍点 / 口型超限 / 同文 DUP / CU×cast */
    title?: string;
    matrixRowId?: string;
    /** From envelope: still_cu_cast | still_onebeat_multi | visual_multi_beat … */
    reverseTrigger?: string;
    /** Must: auto split already applied */
    splitApplied?: boolean;
    splitExpandedCount?: number;
    undoToken?: string;
    /** M9 SSOT — same autoMin as lip_split_doctrine */
    confidence?: number;
    autoEligible?: boolean;
  }>(),
  { title: "须 Confirm 语义拆镜" },
);
defineEmits<{
  (e: "confirm-split"): void;
  (e: "override", reason: string): void;
  (e: "undo-split", token: string): void;
}>();
const explainId = "visbeat-confirm-explain";
</script>

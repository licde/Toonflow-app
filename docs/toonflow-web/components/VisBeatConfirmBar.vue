<!-- VisBeat ConfirmBar — FE contract stub (a11y). Wire to POST /api/scriptAgent/visBeatOps -->
<template>
  <section
    class="visbeat-confirm"
    role="region"
    aria-labelledby="visbeat-confirm-title"
    :aria-describedby="explainId"
  >
    <h3 id="visbeat-confirm-title">视觉拍点冲突</h3>
    <p :id="explainId" class="visbeat-confirm__explain">{{ explain }}</p>
    <p v-if="matrixRowId" class="visbeat-confirm__row">矩阵：{{ matrixRowId }}</p>
    <div class="visbeat-confirm__actions" role="group" aria-label="拆镜操作">
      <button type="button" class="visbeat-confirm__primary" @click="$emit('confirm-split')">
        确认拆镜
      </button>
      <button type="button" class="visbeat-confirm__secondary" @click="$emit('override', 'oner_artistic')">
        艺术长镜头
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  explain: string;
  matrixRowId?: string;
}>();
defineEmits<{
  (e: "confirm-split"): void;
  (e: "override", reason: string): void;
}>();
const explainId = "visbeat-confirm-explain";
</script>

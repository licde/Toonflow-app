<!--
  Mount contract: workbench shot detail must render VideoIntentDebtBar + LitDetailDebtBar.
  FE Toonflow-web should import this (or both children) on ShotSpecDrawer / video track panel.
  Never sole-regen prompt; EXPR/LANG/mouth-handoff CTAs live on the bars.
-->
<template>
  <div class="shot-workbench-debt" data-testid="shot-workbench-debt-mount">
    <LitDetailDebtBar
      v-bind="litProps"
      @diagnose="$emit('lit-diagnose')"
      @confirm-apply="$emit('lit-confirm-apply')"
      @hand-edit-vd="$emit('hand-edit-vd')"
      @regen-still="$emit('regen-still')"
    />
    <VideoIntentDebtBar
      v-bind="videoProps"
      @diagnose="$emit('video-diagnose')"
      @confirm-apply="$emit('video-confirm-apply')"
      @hand-edit-vd="$emit('hand-edit-vd')"
      @recompile-prompt="$emit('recompile-prompt')"
      @regen-prop-still="$emit('regen-prop-still')"
      @human-rejudge-video="$emit('human-rejudge-video')"
    />
  </div>
</template>

<script setup lang="ts">
import LitDetailDebtBar from "./LitDetailDebtBar.vue";
import VideoIntentDebtBar from "./VideoIntentDebtBar.vue";

defineProps<{
  litProps?: Record<string, unknown>;
  videoProps?: Record<string, unknown>;
}>();

defineEmits<{
  (e: "lit-diagnose"): void;
  (e: "lit-confirm-apply"): void;
  (e: "hand-edit-vd"): void;
  (e: "regen-still"): void;
  (e: "video-diagnose"): void;
  (e: "video-confirm-apply"): void;
  (e: "recompile-prompt"): void;
  (e: "regen-prop-still"): void;
  (e: "human-rejudge-video"): void;
}>();
</script>

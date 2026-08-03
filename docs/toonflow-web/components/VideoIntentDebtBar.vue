<!-- Video design debt bar — VIRD Confirm; never sole regen prompt. -->
<template>
  <section v-if="show" class="vid-debt" role="region" aria-labelledby="vid-debt-title">
    <h4 id="vid-debt-title" class="vid-debt__title">{{ title }}</h4>
    <p class="vid-debt__explain">{{ explainText }}</p>
    <div v-if="adaptDebtLines.length" class="vid-debt__adapt" aria-label="首帧同源适配">
      <p v-for="(line, i) in adaptDebtLines" :key="i" class="vid-debt__adapt-line">{{ line }}</p>
    </div>
    <div v-if="slots.length" class="vid-debt__slots" aria-label="视频缺槽">
      <t-tag v-for="s in slots" :key="s" size="small" theme="warning" variant="light">{{ s }}</t-tag>
    </div>
    <ul v-if="mergedFindings.length" class="vid-debt__findings">
      <li v-for="(f, i) in mergedFindings.slice(0, 4)" :key="i">{{ f.id }}：{{ f.message }}</li>
    </ul>
    <div class="vid-debt__actions">
      <t-button
        v-if="showRegenPropStill"
        size="small"
        theme="warning"
        @click="$emit('regen-prop-still')"
      >
        重出带道具静照
      </t-button>
      <t-button
        v-if="showRegenFaceStill && !showRegenPropStill"
        size="small"
        theme="warning"
        @click="$emit('regen-prop-still')"
      >
        重出抬脸近景静照
      </t-button>
      <t-button
        v-if="showConfirmSplitFace && !showRegenFaceStill"
        size="small"
        theme="warning"
        variant="outline"
        @click="$emit('confirm-apply')"
      >
        智能修复（动作→对白近景）
      </t-button>
      <t-button
        v-if="showRecompileBeats"
        size="small"
        theme="primary"
        variant="outline"
        @click="$emit('recompile-prompt')"
      >
        重编译接触分相 Motion
      </t-button>
      <t-button
        v-if="canForceApply && !showRegenPropStill && !showRegenFaceStill"
        size="small"
        theme="primary"
        :loading="applying"
        @click="$emit('confirm-apply')"
      >
        {{ applyLabel }}
      </t-button>
      <t-button size="small" theme="default" variant="outline" :loading="diagnosing" @click="$emit('diagnose')">
        诊断视频 IRD
      </t-button>
      <t-button size="small" theme="primary" variant="outline" @click="$emit('hand-edit-vd')">
        {{ handEditLabel }}
      </t-button>
      <t-button
        v-if="showVideoHumanRejudge"
        size="small"
        theme="success"
        variant="outline"
        @click="$emit('human-rejudge-video')"
      >
        成片人审通过（未测·可交付）
      </t-button>
    </div>
    <p v-if="softDeliverHint" class="vid-debt__soft" role="status">{{ softDeliverHint }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  videoIrdCtaLabel,
  isVideoIrdDebtMeta,
  isDesignIntentFidelityDebt,
  shouldOfferVideoHumanRejudge,
  isQcSoftDeliverOnly,
  isThinVideoPromptStub,
  spineReady,
  type VideoIrdFinding,
  type DesignIntentFidelityResult,
} from "@/types/videoIntentOps";

const props = withDefaults(
  defineProps<{
    title?: string;
    explain?: string;
    ok?: boolean | null;
    primaryAction?: string;
    primaryNextStep?: string;
    reverseTrigger?: string | null;
    code?: string | null;
    missingSlots?: string[];
    ctaLabel?: string;
    findings?: VideoIrdFinding[];
    designIntentFidelity?: DesignIntentFidelityResult | null;
    diagnosing?: boolean;
    applying?: boolean;
    /** unmeasured | measured_fail | measured_pass — Key optional honesty */
    pixelDimStatus?: string | null;
    qcWeak?: boolean | null;
    /** Playable file exists ≠ videoPass / motionPass */
    playable?: boolean | null;
    videoPass?: boolean | null;
    motionPassAt?: string | null;
    /** generation.videoPrompt — thin stub / spineReady gate (G8) */
    videoPrompt?: string | null;
    /** realization adapt debt — design / plate / adapted motion */
    realizationAdaptPack?: {
      adapted?: boolean;
      narrativeFootnote?: string;
      motionStartHint?: string;
      mappingKey?: string;
    } | null;
    intentOccupancy?: string | null;
    realizationOccupancy?: string | null;
    realizationDegraded?: boolean | null;
    /** durable silent-repair changelog */
    repairChangelog?: Array<{ slot?: string; before?: string; after?: string; reason?: string }> | null;
    adaptDiff?: string | null;
  }>(),
  {
    title: "视频设计债 · 智能修复",
    findings: () => [],
    diagnosing: false,
    applying: false,
  },
);

defineEmits<{
  (e: "diagnose"): void;
  (e: "confirm-apply"): void;
  (e: "hand-edit-vd"): void;
  (e: "regen-prop-still"): void;
  (e: "recompile-prompt"): void;
  (e: "human-rejudge-video"): void;
}>();

const slots = computed(() => (props.missingSlots ?? []).filter(Boolean));

const adaptDebtLines = computed((): string[] => {
  const lines: string[] = [];
  const intent = String(props.intentOccupancy ?? "");
  const real = String(props.realizationOccupancy ?? intent);
  const pack = props.realizationAdaptPack;
  if (props.adaptDiff) lines.push(`差异：${props.adaptDiff}`);
  if (props.realizationDegraded || pack?.adapted || intent) {
    if (intent) lines.push(`设计意图：${intent === "bend_pickup" ? "弯腰捡拾" : intent}`);
    if (real) lines.push(`首帧实现：${real === "kneel_hold" ? "跪持" : real === "stand_hold" ? "站姿持纸" : real}`);
    if (pack?.motionStartHint || pack?.adapted) {
      lines.push(`已适配动效：${pack?.motionStartHint?.slice(0, 32) ?? "plate-first Motion"}`);
    } else if (pack?.narrativeFootnote) {
      lines.push(`已适配：${pack.narrativeFootnote}`);
    }
  }
  for (const e of (props.repairChangelog ?? []).slice(-3)) {
    lines.push(`静默修复：${e.slot} ${e.before ?? ""}→${e.after ?? ""} (${e.reason ?? ""})`);
  }
  return lines;
});

const fidelityFindings = computed((): VideoIrdFinding[] => {
  if (!isDesignIntentFidelityDebt(props.designIntentFidelity)) return [];
  const fromVird = props.designIntentFidelity?.virdFindings ?? [];
  if (fromVird.length) return fromVird;
  return (props.designIntentFidelity?.items ?? [])
    .filter((i) => !i.pass)
    .map((i) => ({
      id: i.id,
      severity: "BLOCK" as const,
      message: `${i.label}未命中`,
    }));
});

const mergedFindings = computed(() => {
  const base = props.findings ?? [];
  const seen = new Set(base.map((f) => f.id));
  return [...base, ...fidelityFindings.value.filter((f) => !seen.has(f.id))];
});

const show = computed(
  () =>
    props.qcWeak === true ||
    props.pixelDimStatus === "unmeasured" ||
    props.pixelDimStatus === "measured_fail" ||
    isVideoIrdDebtMeta({
      ok: props.ok,
      primaryAction: props.primaryAction,
      primaryNextStep: props.primaryNextStep,
      missingSlots: slots.value,
      ctaLabel: props.ctaLabel,
      reverseTrigger: props.reverseTrigger,
      code: props.code,
      designIntentFidelity: props.designIntentFidelity,
    }),
);

const showRegenPropStill = computed(
  () =>
    props.reverseTrigger === "still_prop_missing" ||
    props.reverseTrigger === "still_video_contact_handoff" ||
    props.code === "STILL-CONTACT-HANDOFF" ||
    slots.value.includes("propInFrame") ||
    slots.value.includes("contactGeom") ||
    mergedFindings.value.some((f) => /PROP-IN-FRAME|CONTACT-HANDOFF|propInFrame/i.test(f.id)),
);

const showRegenFaceStill = computed(
  () =>
    props.code === "REALIZATION-FACE-READABILITY" ||
    props.reverseTrigger === "face_unreadability" ||
    (props.primaryNextStep === "regen_storyboard_hq" &&
      /face|面容|抬脸/i.test(String(props.code ?? "") + String(props.reverseTrigger ?? ""))) ||
    mergedFindings.value.some((f) => /FACE-READ|face_unread|FACE-BUDGET/i.test(f.id)),
);

const showConfirmSplitFace = computed(
  () =>
    props.reverseTrigger === "face_budget_unreachable" ||
    (props.primaryNextStep === "split_shot" &&
      /face_budget|dialogue_shot_too_wide|vis_multi/i.test(
        String(props.reverseTrigger ?? "") + String(props.code ?? ""),
      )) ||
    mergedFindings.value.some((f) => /FACE-BUDGET|face_budget/i.test(f.id)),
);

const showRecompileBeats = computed(
  () =>
    props.reverseTrigger === "vid_contact_beats" ||
    props.code === "REALIZATION-MOTION-MISMATCH" ||
    props.realizationAdaptPack?.adapted === true ||
    slots.value.includes("contactBeats") ||
    slots.value.includes("executableBeats") ||
    mergedFindings.value.some((f) => /contact_phases|CONTACT-BEATS|vid_contact|REALIZATION-MOTION/i.test(f.id)),
);

const explainText = computed(() => {
  if (props.explain) return props.explain;
  if (props.videoPrompt && isThinVideoPromptStub(props.videoPrompt)) {
    return "generation.videoPrompt 为薄壳 stub（static,duration / 裸 motion-from-frame），须 spine 重编后再烧，stub≠burn-ready。";
  }
  if (props.videoPrompt && !spineReady(props.videoPrompt)) {
    return "videoPrompt 未过 spineReady（需 Visual+Motion 实体/多分相）；禁止当 burn-ready。";
  }
  return (
    props.ctaLabel ||
    videoIrdCtaLabel({
      primaryAction: props.primaryAction,
      missingSlots: slots.value,
      primaryNextStep: props.primaryNextStep,
      reverseTrigger: props.reverseTrigger,
      code: props.code,
      pixelDimStatus: props.pixelDimStatus,
      qcWeak: props.qcWeak,
    })
  );
});

const applyLabel = computed(() =>
  videoIrdCtaLabel({
    primaryAction: props.primaryAction,
    missingSlots: slots.value,
    primaryNextStep: props.primaryNextStep,
    reverseTrigger: props.reverseTrigger,
    code: props.code,
    pixelDimStatus: props.pixelDimStatus,
    qcWeak: props.qcWeak,
  }),
);

const handEditLabel = computed(() =>
  slots.value.length ? `手改VD补${slots.value.slice(0, 2).join("/")}` : "手改VD",
);

const canForceApply = computed(() => {
  const a = String(props.primaryAction ?? "");
  return (
    a === "confirm_enhance" ||
    a === "confirm_voice_mode" ||
    a === "confirm_beat_duration" ||
    a === "confirm_cam_mediate" ||
    (props.ok === false && a !== "hand_edit_vd")
  );
});

/** QC_SOFT_DELIVER: file may play but must not claim videoPass */
const softDeliverHint = computed(() => {
  if (
    isQcSoftDeliverOnly({
      playable: props.playable,
      videoPass: props.videoPass,
      motionPassAt: props.motionPassAt,
      qcWeak: props.qcWeak,
      pixelDimStatus: props.pixelDimStatus,
    })
  ) {
    if (props.playable === true && props.videoPass !== true && !props.motionPassAt) {
      return "可播 ≠ 质量通过：文件可预览，但未 videoPass / 人审；禁当交付绿标。";
    }
    return "未测/弱成片：可人审收口交付；Key 可选增强。";
  }
  return "";
});

const showVideoHumanRejudge = computed(() =>
  shouldOfferVideoHumanRejudge({
    playable: props.playable,
    videoPass: props.videoPass,
    motionPassAt: props.motionPassAt,
    qcWeak: props.qcWeak,
    pixelDimStatus: props.pixelDimStatus,
  }),
);
</script>

<style scoped>
.vid-debt {
  margin: 8px 0;
  padding: 8px 10px;
  border-left: 3px solid #e37318;
  background: rgba(227, 115, 24, 0.06);
}
.vid-debt__title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 600;
}
.vid-debt__explain {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--td-text-color-secondary, #666);
}
.vid-debt__soft {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--td-warning-color, #e37318);
}
.vid-debt__adapt-line {
  margin: 2px 0;
  font-size: 11px;
  color: var(--td-text-color-secondary, #666);
}
.vid-debt__adapt {
  margin: 4px 0 6px;
  padding: 4px 6px;
  background: rgba(0, 82, 217, 0.06);
  border-radius: 4px;
}
.vid-debt__slots,
.vid-debt__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
}
.vid-debt__findings {
  margin: 0 0 6px;
  padding-left: 16px;
  font-size: 12px;
  color: #b54708;
}
</style>

import { fieldHandlers } from "../generationContext/fieldHandlers/registry";
import type { AutoApplyPolicy } from "./autoApplyPolicy";
import { getAutoApplyPolicy } from "./autoApplyPolicy";

export interface QualityProfile {
  id: string;
  label: string;
  imageTier: "1K" | "2K" | "4K";
  videoResolution: string;
  audioDefault: boolean;
  concurrency: number;
  qualityGateStrict: boolean;
  description: string;
}

export const QUALITY_PROFILES: QualityProfile[] = [
  {
    id: "draft",
    label: "草稿",
    imageTier: "1K",
    videoResolution: "720p",
    audioDefault: false,
    concurrency: 5,
    qualityGateStrict: false,
    description: "快速预览，低成本",
  },
  {
    id: "prod",
    label: "生产",
    imageTier: "2K",
    videoResolution: "720p",
    audioDefault: true,
    concurrency: 3,
    qualityGateStrict: true,
    description: "默认推荐，平衡质量与速度",
  },
  {
    id: "ultra",
    label: "高质量",
    imageTier: "4K",
    videoResolution: "1080p",
    audioDefault: true,
    concurrency: 2,
    qualityGateStrict: true,
    description: "记忆点/情绪高潮镜优先",
  },
];

const FIELD_REGISTRY_META: Record<string, { level: string; handler: string; deps?: string[] }> = {
  colorTone: { level: "G1", handler: "emotionToneInjector", deps: ["productionSpec.colorToneMapping"] },
  visualId: { level: "G1", handler: "variantSelector", deps: ["characterAssets"] },
  directorNotes: { level: "G0", handler: "creativeIntentMatcher" },
  performance: { level: "G1", handler: "performanceInjector", deps: ["productionSpec.emotionPerformanceMapping"] },
  dialogue: { level: "G1", handler: "dialogueSyncInjector", deps: ["productionSpec.dialogueActionSync"] },
  visualEffect: { level: "G3", handler: "visualEffectRouter" },
  sound: { level: "G4", handler: "soundPostRouter" },
  personalitySwitch: { level: "G2", handler: "personalitySwitchMode" },
  cameraAngle: { level: "G1", handler: "cameraAnchorInjector", deps: ["productionSpec.cameraAnchor"] },
  shotType: { level: "G1", handler: "shotTypeRules", deps: ["productionSpec.shotTypeRules"] },
  sceneName: { level: "G1", handler: "sceneColorLock", deps: ["productionSpec.sceneColorLock"] },
  "L6-trigger": { level: "G1", handler: "l6TriggerLinker", deps: ["characterAssets.L6-personality"] },
  transitionType: { level: "G1", handler: "transitionTypeInjector" },
  keyPrompts: { level: "G0", handler: "creativeIntentMatcher" },
};

export function buildFieldRegistry() {
  const implemented = new Set(fieldHandlers.map((h) => h.field));
  return Object.entries(FIELD_REGISTRY_META).map(([field, meta]) => ({
    field,
    level: meta.level,
    handler: meta.handler,
    deps: meta.deps ?? [],
    implemented: implemented.has(field),
  }));
}

export function buildRenderRules() {
  return {
    textCarrierFields: ["dialogue.text", "visualEffect.content", "voiceover.text"],
    stateColors: {
      未生成: "gray",
      生成中: "loading",
      已完成: "success",
      dirty: "warning",
      archived: "disabled",
      生成失败: "error",
    },
    actionsByState: {
      未生成: ["generateImage", "generateVideo", "validateShot"],
      dirty: ["regenerateImage", "regenerateVideo", "resync", "viewDiff"],
      已完成: ["regenerateImage", "regenerateVideo", "selectVideo", "viewHistory"],
      生成失败: ["regenerateImage", "regenerateVideo", "viewExplain"],
      生成中: ["poll"],
    },
    pollIntervalMs: 2500,
    confirmGlobalRegenerate: true,
  };
}

export async function getStructuredRulesData(opts?: { projectId?: number; scriptId?: number }) {
  let autoApplyPolicy: AutoApplyPolicy | null = null;
  if (opts?.projectId != null && opts.scriptId != null) {
    autoApplyPolicy = await getAutoApplyPolicy(opts.projectId, opts.scriptId);
  }
  return {
    version: "1.0",
    fieldRegistry: buildFieldRegistry(),
    qualityProfiles: QUALITY_PROFILES,
    renderRules: buildRenderRules(),
    autoApplyPolicy,
    scopes: [
      { id: "dirty", label: "仅更新 dirty 镜头", description: "同步后仅重生成有变更的镜头" },
      { id: "all", label: "全局重生成", description: "重生成全部非 archived 镜头，保留旧版本可切换" },
    ],
    phases: [
      { id: "variants", label: "变体元数据" },
      { id: "images", label: "分镜图" },
      { id: "videos", label: "视频" },
      { id: "assemble", label: "拼接 manifest" },
    ],
  };
}

export function resolveQualityProfile(id?: string): QualityProfile {
  return QUALITY_PROFILES.find((p) => p.id === id) ?? QUALITY_PROFILES[1];
}

import { p as projectStore } from './project-C_OB2JAu.js';
import { bD as defineStore, r as ref, c as computed, l as defineComponent, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, j as createVNode, a1 as unref, aM as withCtx, a$ as createTextVNode, b0 as toDisplayString, aS as createBlock, aT as createCommentVNode, b2 as resolveComponent, aU as normalizeClass, F as Fragment, aP as renderList, bH as withModifiers, bM as storeToRefs, w as watch, k as reactive, c0 as useDebounceFn, a as inject, o as onMounted } from './vue-vendor-Cj7sXJnb.js';
import { i as instance } from './axios-B2i2rFrf.js';
import { af as RadioGroup, ag as RadioButton, aj as Switch, B as Button, a3 as Checkbox, M as MessagePlugin, W as DialogPlugin, K as Select, X as Tag, C as Collapse, l as CollapsePanel, T as Textarea, a8 as Image, A as Alert, L as Loading } from './tdesign-C157N6jJ.js';
import { _ as _export_sfc, s as settingStore } from './index-DsDM6Bax.js';
import { I as ImageTools } from './imageTools-CXYQW4aj.js';
import { o as openAssetsSelector } from './assetsCheck-f3IiWWtt.js';
import './dayjs-CuToSpIM.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';
import './index-DTygkZmB.js';
import './modelSelect-Bj3Bcvu6.js';
import './providersLogo-BCbaFq8_.js';

const DEFAULT_STATE_COLORS = {
  未生成: "default",
  生成中: "primary",
  已完成: "success",
  dirty: "warning",
  生成失败: "danger",
  archived: "default"
};
const DEFAULT_POLL_MS = 2500;

async function structuredApi(path, body) {
  const res = await instance.post(`/structured/${path}`, body);
  if (res.code !== 200 && res.code !== 0) throw new Error(res.message || "请求失败");
  return res.data;
}
async function structuredApiOptional(path, body) {
  try {
    return await structuredApi(path, body);
  } catch (e) {
    const err = e;
    if (err?.response?.status === 404) return null;
    throw e;
  }
}
function useStructuredApi() {
  const previewStructured = (json, episodeIndex = 0) => structuredApi("previewStructured", { json, episodeIndex });
  const importStructured = (projectId, json, episodeIndex = 0) => structuredApi(
    "importStructured",
    { projectId, json, episodeIndex }
  );
  const syncStructured = (projectId, scriptId, json, episodeIndex = 0) => structuredApi("syncStructured", { projectId, scriptId, json, episodeIndex });
  const getStructuredGrid = (projectId, scriptId) => structuredApi("getStructuredGrid", { projectId, scriptId });
  const getStructuredRules = (projectId, scriptId) => structuredApiOptional("getStructuredRules", { projectId, scriptId });
  const setStructuredAutoApplyPolicy = (projectId, scriptId, policy) => structuredApiOptional("setStructuredAutoApplyPolicy", { projectId, scriptId, policy });
  const applyStructuredPlan = (projectId, scriptId, opts) => structuredApiOptional("applyStructuredPlan", {
    projectId,
    scriptId,
    mode: opts.mode ?? "manualApply",
    scope: opts.scope,
    qualityProfileId: opts.qualityProfileId,
    phases: opts.phases
  });
  const validateStructuredShot = (projectId, body) => structuredApiOptional("validateStructuredShot", { projectId, ...body });
  const getStructuredShotHistory = (projectId, storyboardId) => structuredApiOptional("getStructuredShotHistory", { projectId, storyboardId });
  const generateShotImage = (projectId, storyboardIds, tier) => structuredApi("generateShotImage", { projectId, storyboardIds, tier });
  const generateShotVideo = (projectId, storyboardIds, audio, resolution) => structuredApi("generateShotVideo", { projectId, storyboardIds, audio, resolution });
  const regenerateShot = (projectId, storyboardId, targets, tier, audio) => structuredApi("regenerateShot", { projectId, storyboardId, targets, tier, audio });
  const selectStoryboardImage = (storyboardId, imageId) => structuredApi("selectStoryboardImage", { storyboardId, imageId });
  const selectStructuredVideo = (storyboardId, videoId) => structuredApi("selectStructuredVideo", { storyboardId, videoId });
  const pollStructured = (storyboardIds) => structuredApi("pollStructured", { storyboardIds });
  const assembleEpisode = (projectId, scriptId, skipConcat = false) => structuredApi("assembleEpisode", { projectId, scriptId, skipConcat });
  const batchGenerateFromStructured = (projectId, scriptId, audio) => structuredApi("batchGenerateFromStructured", {
    projectId,
    scriptId,
    audio,
    phases: ["variants", "images", "videos"]
  });
  async function pollUntilDone(storyboardIds, opts) {
    const interval = opts.intervalMs ?? DEFAULT_POLL_MS;
    const max = opts.maxAttempts ?? 120;
    let last = [];
    for (let i = 0; i < max; i++) {
      last = await pollStructured(storyboardIds);
      opts.onTick?.(last);
      const pending = last.some((s) => s.state === "生成中");
      if (!pending) break;
      await new Promise((r) => setTimeout(r, interval));
    }
    return last;
  }
  return {
    previewStructured,
    importStructured,
    syncStructured,
    getStructuredGrid,
    getStructuredRules,
    setStructuredAutoApplyPolicy,
    applyStructuredPlan,
    validateStructuredShot,
    getStructuredShotHistory,
    generateShotImage,
    generateShotVideo,
    regenerateShot,
    selectStoryboardImage,
    selectStructuredVideo,
    pollStructured,
    assembleEpisode,
    batchGenerateFromStructured,
    pollUntilDone
  };
}

const useStructuredStore = defineStore("structuredProduction", () => {
  const api = useStructuredApi();
  const projectId = ref(0);
  const scriptId = ref(0);
  const productionMode = ref("rules");
  const rules = ref(null);
  const rulesAvailable = ref(true);
  const policy = ref({
    enabled: false,
    autoApplyOnSync: false,
    scope: "dirtyOnly",
    qualityProfileId: "prod",
    phases: ["variants", "images", "videos"]
  });
  const qualityProfileId = ref("prod");
  const shots = ref([]);
  const selectedShotId = ref(null);
  const lastSyncDiff = ref(null);
  const activeTaskId = ref(null);
  const cachedJson = ref(null);
  const fileName = ref("");
  const previewData = ref(null);
  const assembleManifest = ref(null);
  const shotHistory = ref(null);
  const validateResult = ref(null);
  const polling = ref(false);
  const pollProgress = ref("");
  const failedShotIds = ref([]);
  const audioOn = ref(true);
  const showArchived = ref(false);
  const selectedShot = computed(() => shots.value.find((s) => s.id === selectedShotId.value) ?? null);
  const pollIntervalMs = computed(() => rules.value?.renderRules?.pollIntervalMs ?? DEFAULT_POLL_MS);
  const stateTheme = (state) => {
    const key = rules.value?.renderRules?.stateColors?.[state];
    if (key) return key;
    return DEFAULT_STATE_COLORS[state] ?? "default";
  };
  const visibleShots = computed(
    () => showArchived.value ? shots.value : shots.value.filter((s) => s.state !== "archived")
  );
  const storyboardIds = computed(() => shots.value.map((s) => s.id));
  const currentProfile = computed(() => {
    const profiles = rules.value?.qualityProfiles ?? [];
    return profiles.find((p) => p.id === qualityProfileId.value) ?? profiles[0];
  });
  function mergePollIntoShots(pollResults) {
    for (const p of pollResults) {
      const id = p.storyboardId ?? p.id;
      if (!id) continue;
      const shot = shots.value.find((s) => s.id === id);
      if (!shot) continue;
      if (p.state) shot.state = p.state;
      if (p.images?.length) shot.images = p.images;
      if (p.videos?.length) shot.videoVersions = p.videos;
      if (p.error && p.state === "生成失败") failedShotIds.value = [.../* @__PURE__ */ new Set([...failedShotIds.value, id])];
    }
  }
  async function loadRules() {
    if (!projectId.value || !scriptId.value) return;
    try {
      const data = await api.getStructuredRules(projectId.value, scriptId.value);
      rulesAvailable.value = data != null;
      if (data) {
        rules.value = data;
        if (data.autoApplyPolicy) policy.value = { ...policy.value, ...data.autoApplyPolicy };
        if (data.qualityProfiles?.length) {
          qualityProfileId.value = data.qualityProfiles[0].id;
        }
      }
    } catch {
      rulesAvailable.value = false;
    }
  }
  async function refreshGrid() {
    if (!projectId.value || !scriptId.value) return;
    const data = await api.getStructuredGrid(projectId.value, scriptId.value);
    shots.value = data.shots ?? [];
    assembleManifest.value = data.assembleManifest ?? null;
    if (selectedShotId.value && !shots.value.some((s) => s.id === selectedShotId.value)) {
      selectedShotId.value = shots.value[0]?.id ?? null;
    }
  }
  async function init(pid, sid) {
    projectId.value = pid;
    scriptId.value = sid;
    await Promise.all([loadRules(), refreshGrid()]);
    if (!selectedShotId.value && shots.value.length) selectedShotId.value = shots.value[0].id;
  }
  async function loadShotHistory(storyboardId) {
    shotHistory.value = null;
    if (!projectId.value) return;
    shotHistory.value = await api.getStructuredShotHistory(projectId.value, storyboardId) ?? null;
  }
  async function runPoll(ids) {
    const targetIds = ids?.length ? ids : storyboardIds.value;
    if (!targetIds.length) return;
    polling.value = true;
    pollProgress.value = window.$t("workbench.production.wb.structuredPolling");
    try {
      await api.pollUntilDone(targetIds, {
        intervalMs: pollIntervalMs.value,
        onTick: (results) => {
          mergePollIntoShots(results);
          const done = results.filter((r) => r.state !== "生成中").length;
          pollProgress.value = `${done}/${results.length}`;
        }
      });
      await refreshGrid();
    } finally {
      polling.value = false;
      pollProgress.value = "";
    }
  }
  async function savePolicy() {
    if (!rulesAvailable.value || !projectId.value || !scriptId.value) return;
    const merged = await api.setStructuredAutoApplyPolicy(projectId.value, scriptId.value, policy.value);
    if (merged) policy.value = merged;
  }
  function setCachedJson(json, name) {
    cachedJson.value = json;
    fileName.value = name;
  }
  function updateShotInJson(shotNo, patch) {
    if (!cachedJson.value) return;
    const episodes = cachedJson.value.episodes;
    const board = episodes?.[0]?.storyboard;
    if (!board) return;
    const idx = board.findIndex((s) => s.镜号 === shotNo);
    if (idx >= 0) board[idx] = { ...board[idx], ...patch };
  }
  return {
    api,
    projectId,
    scriptId,
    productionMode,
    rules,
    rulesAvailable,
    policy,
    qualityProfileId,
    shots,
    selectedShotId,
    selectedShot,
    lastSyncDiff,
    activeTaskId,
    cachedJson,
    fileName,
    previewData,
    assembleManifest,
    shotHistory,
    validateResult,
    polling,
    pollProgress,
    failedShotIds,
    audioOn,
    showArchived,
    visibleShots,
    storyboardIds,
    currentProfile,
    pollIntervalMs,
    stateTheme,
    init,
    loadRules,
    refreshGrid,
    loadShotHistory,
    runPoll,
    savePolicy,
    setCachedJson,
    updateShotInJson,
    mergePollIntoShots
  };
});

const _hoisted_1$5 = { class: "toolbar f ac jb" };
const _hoisted_2$5 = { class: "left f ac" };
const _hoisted_3$5 = { class: "right f ac" };
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "Toolbar",
  emits: ["refresh"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const store = useStructuredStore();
    const emit = __emit;
    const fileInput = ref(null);
    const previewing = ref(false);
    const importing = ref(false);
    const syncing = ref(false);
    const genImages = ref(false);
    const genVideos = ref(false);
    const applying = ref(false);
    const qualityOptions = computed(
      () => (store.rules?.qualityProfiles ?? []).map((p) => ({ label: p.label ?? p.id, value: p.id }))
    );
    function onFileChange(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          store.setCachedJson(JSON.parse(String(reader.result)), file.name);
        } catch {
          MessagePlugin.error(window.$t("workbench.production.wb.structuredJsonInvalid"));
        }
      };
      reader.readAsText(file);
    }
    async function onPreview() {
      if (!store.cachedJson) return MessagePlugin.warning(window.$t("workbench.production.wb.structuredPickJson"));
      previewing.value = true;
      try {
        store.previewData = await store.api.previewStructured(store.cachedJson);
        MessagePlugin.success(window.$t("workbench.production.wb.structuredPreviewOk"));
      } catch (e) {
        MessagePlugin.error(e.message);
      } finally {
        previewing.value = false;
      }
    }
    async function onImport() {
      if (!store.cachedJson) return MessagePlugin.warning(window.$t("workbench.production.wb.structuredPickJson"));
      importing.value = true;
      try {
        const data = await store.api.importStructured(store.projectId, store.cachedJson);
        if (data.scriptId) store.scriptId = data.scriptId;
        store.previewData = data.preview ?? store.previewData;
        MessagePlugin.success(window.$t("workbench.production.wb.structuredImportOk"));
        await store.refreshGrid();
        emit("refresh");
      } catch (e) {
        MessagePlugin.error(e.message);
      } finally {
        importing.value = false;
      }
    }
    async function onSync() {
      if (!store.cachedJson) return MessagePlugin.warning(window.$t("workbench.production.wb.structuredPickJson"));
      if (!store.scriptId) return MessagePlugin.warning(window.$t("workbench.production.selectPlaceholder"));
      syncing.value = true;
      try {
        store.lastSyncDiff = await store.api.syncStructured(store.projectId, store.scriptId, store.cachedJson);
        if (store.lastSyncDiff.autoApplyResult?.started) {
          store.activeTaskId = store.lastSyncDiff.autoApplyResult.taskId ?? null;
          MessagePlugin.info(store.lastSyncDiff.autoApplyResult.message ?? window.$t("workbench.production.wb.structuredBatchStarted"));
          await store.runPoll();
        }
        await store.refreshGrid();
        emit("refresh");
      } catch (e) {
        MessagePlugin.error(e.message);
      } finally {
        syncing.value = false;
      }
    }
    async function onGenImages() {
      if (!store.storyboardIds.length) await store.refreshGrid();
      if (!store.storyboardIds.length) return;
      genImages.value = true;
      try {
        const tier = store.currentProfile?.imageTier ?? "2K";
        await store.api.generateShotImage(store.projectId, store.storyboardIds, tier);
        await store.runPoll();
      } catch (e) {
        MessagePlugin.error(e.message);
      } finally {
        genImages.value = false;
      }
    }
    async function onGenVideos() {
      if (!store.storyboardIds.length) await store.refreshGrid();
      if (!store.storyboardIds.length) return;
      genVideos.value = true;
      try {
        const res = store.currentProfile?.videoResolution ?? "720p";
        await store.api.generateShotVideo(store.projectId, store.storyboardIds, store.audioOn, res);
        await store.runPoll();
      } catch (e) {
        MessagePlugin.error(e.message);
      } finally {
        genVideos.value = false;
      }
    }
    async function applyPlan(scope) {
      if (!store.scriptId) return MessagePlugin.warning(window.$t("workbench.production.selectPlaceholder"));
      applying.value = true;
      try {
        const data = await store.api.applyStructuredPlan(store.projectId, store.scriptId, {
          scope,
          qualityProfileId: store.qualityProfileId,
          phases: store.policy.phases
        });
        if (!data) {
          MessagePlugin.warning(window.$t("workbench.production.wb.structuredNeedBackend"));
          return;
        }
        if (data.skipped) {
          MessagePlugin.info(window.$t("workbench.production.wb.structuredNoDirty"));
          return;
        }
        store.activeTaskId = data.taskId ?? null;
        MessagePlugin.success(data.message ?? window.$t("workbench.production.wb.structuredBatchStarted"));
        await store.runPoll();
      } catch (e) {
        MessagePlugin.error(e.message);
      } finally {
        applying.value = false;
      }
    }
    function onApplyDirty() {
      applyPlan("dirty");
    }
    function onApplyAll() {
      const needConfirm = store.rules?.renderRules?.confirmGlobalRegenerate !== false;
      if (!needConfirm) {
        applyPlan("all");
        return;
      }
      const dlg = DialogPlugin.confirm({
        header: window.$t("workbench.production.wb.structuredApplyAll"),
        body: window.$t("workbench.production.wb.structuredApplyAllConfirm"),
        onConfirm: () => {
          dlg.destroy();
          applyPlan("all");
        },
        onClose: () => dlg.destroy()
      });
    }
    async function onAssemble() {
      if (!store.scriptId) return MessagePlugin.warning(window.$t("workbench.production.selectPlaceholder"));
      try {
        await store.api.assembleEpisode(store.projectId, store.scriptId);
        await store.refreshGrid();
        MessagePlugin.success(window.$t("workbench.production.wb.structuredAssembleOk"));
      } catch (e) {
        MessagePlugin.error(e.message);
      }
    }
    async function onPolicyChange() {
      await store.savePolicy();
    }
    __expose({ fileInput });
    return (_ctx, _cache) => {
      const _component_t_radio_button = RadioButton;
      const _component_t_radio_group = RadioGroup;
      const _component_t_select = Select;
      const _component_t_switch = Switch;
      const _component_t_button = Button;
      const _component_t_checkbox = Checkbox;
      return openBlock(), createElementBlock("div", _hoisted_1$5, [
        createBaseVNode("div", _hoisted_2$5, [
          createVNode(_component_t_radio_group, {
            modelValue: unref(store).productionMode,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(store).productionMode = $event),
            variant: "default-filled",
            size: "small"
          }, {
            default: withCtx(() => [
              createVNode(_component_t_radio_button, { value: "fast" }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredModeFast")), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_radio_button, { value: "rules" }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredModeRules")), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_radio_button, { value: "refine" }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredModeRefine")), 1)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          unref(qualityOptions).length ? (openBlock(), createBlock(_component_t_select, {
            key: 0,
            modelValue: unref(store).qualityProfileId,
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(store).qualityProfileId = $event),
            options: unref(qualityOptions),
            size: "small",
            "auto-width": "",
            class: "ml",
            placeholder: _ctx.$t("workbench.production.wb.structuredQuality")
          }, null, 8, ["modelValue", "options", "placeholder"])) : createCommentVNode("", true),
          createVNode(_component_t_switch, {
            modelValue: unref(store).policy.enabled,
            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(store).policy.enabled = $event),
            size: "small",
            label: [_ctx.$t("workbench.production.wb.structuredAutoApply"), ""],
            onChange: onPolicyChange
          }, null, 8, ["modelValue", "label"]),
          unref(store).policy.enabled ? (openBlock(), createBlock(_component_t_switch, {
            key: 1,
            modelValue: unref(store).policy.autoApplyOnSync,
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => unref(store).policy.autoApplyOnSync = $event),
            size: "small",
            label: [_ctx.$t("workbench.production.wb.structuredAutoOnSync"), ""],
            onChange: onPolicyChange
          }, null, 8, ["modelValue", "label"])) : createCommentVNode("", true)
        ]),
        createBaseVNode("div", _hoisted_3$5, [
          createBaseVNode("input", {
            ref_key: "fileInput",
            ref: fileInput,
            type: "file",
            accept: ".json,application/json",
            class: "fileInput",
            onChange: onFileChange
          }, null, 544),
          createVNode(_component_t_button, {
            size: "small",
            variant: "outline",
            onClick: _cache[4] || (_cache[4] = ($event) => unref(fileInput)?.click())
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(unref(store).fileName || _ctx.$t("workbench.production.wb.structuredPickJson")), 1)
            ]),
            _: 1
          }),
          createVNode(_component_t_button, {
            size: "small",
            loading: unref(previewing),
            onClick: onPreview
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredPreview")), 1)
            ]),
            _: 1
          }, 8, ["loading"]),
          createVNode(_component_t_button, {
            size: "small",
            theme: "primary",
            loading: unref(importing),
            onClick: onImport
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredImport")), 1)
            ]),
            _: 1
          }, 8, ["loading"]),
          createVNode(_component_t_button, {
            size: "small",
            loading: unref(syncing),
            onClick: onSync
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredSync")), 1)
            ]),
            _: 1
          }, 8, ["loading"]),
          createVNode(_component_t_button, {
            size: "small",
            variant: "outline",
            loading: unref(genImages),
            onClick: onGenImages
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredGenImages")), 1)
            ]),
            _: 1
          }, 8, ["loading"]),
          createVNode(_component_t_button, {
            size: "small",
            variant: "outline",
            loading: unref(genVideos),
            onClick: onGenVideos
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredGenVideos")), 1)
            ]),
            _: 1
          }, 8, ["loading"]),
          createVNode(_component_t_button, {
            size: "small",
            theme: "warning",
            variant: "outline",
            loading: unref(applying),
            onClick: onApplyDirty
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredApplyDirty")), 1)
            ]),
            _: 1
          }, 8, ["loading"]),
          createVNode(_component_t_button, {
            size: "small",
            theme: "danger",
            variant: "outline",
            loading: unref(applying),
            onClick: onApplyAll
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredApplyAll")), 1)
            ]),
            _: 1
          }, 8, ["loading"]),
          createVNode(_component_t_button, {
            size: "small",
            variant: "text",
            onClick: onAssemble
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredAssemble")), 1)
            ]),
            _: 1
          }),
          createVNode(_component_t_checkbox, {
            modelValue: unref(store).audioOn,
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => unref(store).audioOn = $event)
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredAudio")), 1)
            ]),
            _: 1
          }, 8, ["modelValue"])
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const StructuredToolbar = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["__scopeId", "data-v-0d71c408"]]);

const _hoisted_1$4 = { class: "thumb" };
const _hoisted_2$4 = ["src"];
const _hoisted_3$4 = {
  key: 1,
  class: "placeholder"
};
const _hoisted_4$4 = { class: "head f ac jb" };
const _hoisted_5$3 = { class: "no" };
const _hoisted_6$3 = { class: "dur" };
const _hoisted_7$1 = {
  key: 0,
  class: "refLine"
};
const _hoisted_8$1 = {
  key: 1,
  class: "refLine"
};
const _hoisted_9$1 = {
  key: 2,
  class: "refLine"
};
const _hoisted_10$1 = {
  key: 1,
  class: "actions f"
};
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "ShotCard",
  props: {
    shot: {},
    selected: { type: Boolean },
    busyId: {},
    busyAct: {},
    showActions: { type: Boolean }
  },
  emits: ["select", "action"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const store = useStructuredStore();
    const stateTheme = computed(() => store.stateTheme(props.shot.state));
    const hasReference = computed(
      () => props.shot.reference?.sceneName || props.shot.reference?.dialogue?.text || props.shot.reference?.visualEffect?.content
    );
    const quickActions = computed(() => {
      const fromRules = store.rules?.renderRules?.actionsByState?.[props.shot.state];
      const defaults = props.shot.state === "dirty" ? [
        { key: "img", label: window.$t("workbench.production.wb.structuredRegenImage") },
        { key: "vid", label: window.$t("workbench.production.wb.structuredRegenVideo") }
      ] : [
        { key: "img", label: window.$t("workbench.production.wb.structuredRegenImage") },
        { key: "vid", label: window.$t("workbench.production.wb.structuredRegenVideo") }
      ];
      if (!fromRules?.length) return defaults;
      return fromRules.map((a) => {
        if (a === "regenerateImage" || a === "generateImage") return { key: "img", label: window.$t("workbench.production.wb.structuredRegenImage") };
        if (a === "regenerateVideo" || a === "generateVideo") return { key: "vid", label: window.$t("workbench.production.wb.structuredRegenVideo") };
        return { key: a, label: a };
      });
    });
    return (_ctx, _cache) => {
      const _component_i_pic = resolveComponent("i-pic");
      const _component_t_tag = Tag;
      const _component_t_collapse_panel = CollapsePanel;
      const _component_t_collapse = Collapse;
      const _component_t_button = Button;
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["shotCard", { active: __props.selected, dirty: __props.shot.state === "dirty", done: __props.shot.state === "已完成" }]),
        onClick: _cache[0] || (_cache[0] = ($event) => emit("select", __props.shot.id))
      }, [
        createBaseVNode("div", _hoisted_1$4, [
          __props.shot.imageSrc ? (openBlock(), createElementBlock("img", {
            key: 0,
            src: __props.shot.imageSrc,
            alt: ""
          }, null, 8, _hoisted_2$4)) : (openBlock(), createElementBlock("div", _hoisted_3$4, [
            createVNode(_component_i_pic, {
              theme: "outline",
              size: "24",
              fill: "#999"
            })
          ])),
          createVNode(_component_t_tag, {
            size: "small",
            class: "stateTag",
            theme: unref(stateTheme)
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(__props.shot.state), 1)
            ]),
            _: 1
          }, 8, ["theme"])
        ]),
        createBaseVNode("div", _hoisted_4$4, [
          createBaseVNode("span", _hoisted_5$3, "#" + toDisplayString(__props.shot.镜号 ?? "-"), 1),
          createBaseVNode("span", _hoisted_6$3, toDisplayString(__props.shot.duration) + "s", 1)
        ]),
        unref(hasReference) ? (openBlock(), createBlock(_component_t_collapse, {
          key: 0,
          "expand-icon-placement": "right",
          borderless: ""
        }, {
          default: withCtx(() => [
            createVNode(_component_t_collapse_panel, {
              header: _ctx.$t("workbench.production.wb.structuredReference")
            }, {
              default: withCtx(() => [
                __props.shot.reference?.sceneName ? (openBlock(), createElementBlock("p", _hoisted_7$1, toDisplayString(__props.shot.reference.sceneName), 1)) : createCommentVNode("", true),
                __props.shot.reference?.dialogue?.text ? (openBlock(), createElementBlock("p", _hoisted_8$1, toDisplayString(__props.shot.reference.dialogue.text), 1)) : createCommentVNode("", true),
                __props.shot.reference?.visualEffect?.content ? (openBlock(), createElementBlock("p", _hoisted_9$1, toDisplayString(__props.shot.reference.visualEffect.content), 1)) : createCommentVNode("", true)
              ]),
              _: 1
            }, 8, ["header"])
          ]),
          _: 1
        })) : createCommentVNode("", true),
        __props.showActions ? (openBlock(), createElementBlock("div", _hoisted_10$1, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(quickActions), (act) => {
            return openBlock(), createBlock(_component_t_button, {
              key: act.key,
              size: "small",
              variant: "text",
              loading: __props.busyId === __props.shot.id && __props.busyAct === act.key,
              onClick: withModifiers(($event) => emit("action", act.key, __props.shot.id), ["stop"])
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(act.label), 1)
              ]),
              _: 2
            }, 1032, ["loading", "onClick"]);
          }), 128))
        ])) : createCommentVNode("", true)
      ], 2);
    };
  }
});

/* unplugin-vue-components disabled */

const ShotCard = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-cb9bce52"]]);

const _hoisted_1$3 = { class: "shotGrid" };
const _hoisted_2$3 = { class: "head f ac jb" };
const _hoisted_3$3 = {
  key: 0,
  class: "empty"
};
const _hoisted_4$3 = {
  key: 1,
  class: "grid"
};
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "ShotGrid",
  emits: ["action"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const store = useStructuredStore();
    const emit = __emit;
    const busyId = ref(0);
    const busyAct = ref("");
    const title = computed(
      () => store.shots.length ? `${window.$t("workbench.production.wb.structuredGrid")} (${store.visibleShots.length})` : window.$t("workbench.production.wb.structuredGrid")
    );
    function onSelect(id) {
      store.selectedShotId = id;
    }
    function onAction(key, id) {
      emit("action", key, id);
    }
    __expose({ setBusy: (id, act) => {
      busyId.value = id;
      busyAct.value = act;
    }, clearBusy: () => {
      busyId.value = 0;
      busyAct.value = "";
    } });
    return (_ctx, _cache) => {
      const _component_t_checkbox = Checkbox;
      return openBlock(), createElementBlock("div", _hoisted_1$3, [
        createBaseVNode("div", _hoisted_2$3, [
          createBaseVNode("span", null, toDisplayString(unref(title)), 1),
          createVNode(_component_t_checkbox, {
            modelValue: unref(store).showArchived,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(store).showArchived = $event),
            size: "small"
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredShowArchived")), 1)
            ]),
            _: 1
          }, 8, ["modelValue"])
        ]),
        !unref(store).visibleShots.length ? (openBlock(), createElementBlock("div", _hoisted_3$3, toDisplayString(_ctx.$t("workbench.production.wb.structuredEmpty")), 1)) : (openBlock(), createElementBlock("div", _hoisted_4$3, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(store).visibleShots, (s) => {
            return openBlock(), createBlock(ShotCard, {
              key: s.id,
              shot: s,
              selected: unref(store).selectedShotId === s.id,
              "busy-id": unref(busyId),
              "busy-act": unref(busyAct),
              "show-actions": "",
              onSelect,
              onAction
            }, null, 8, ["shot", "selected", "busy-id", "busy-act"]);
          }), 128))
        ]))
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const ShotGrid = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-1e8de66a"]]);

const _hoisted_1$2 = { class: "explainPanel" };
const _hoisted_2$2 = {
  key: 0,
  class: "empty"
};
const _hoisted_3$2 = { class: "section" };
const _hoisted_4$2 = { class: "sectionTitle" };
const _hoisted_5$2 = { class: "meta" };
const _hoisted_6$2 = { class: "section" };
const _hoisted_7 = { class: "sectionTitle" };
const _hoisted_8 = {
  key: 0,
  class: "text"
};
const _hoisted_9 = {
  key: 1,
  class: "text"
};
const _hoisted_10 = {
  key: 2,
  class: "text muted"
};
const _hoisted_11 = { class: "section" };
const _hoisted_12 = { class: "sectionTitle" };
const _hoisted_13 = { class: "label" };
const _hoisted_14 = { class: "label" };
const _hoisted_15 = { class: "label" };
const _hoisted_16 = { class: "label" };
const _hoisted_17 = { class: "row f ac" };
const _hoisted_18 = {
  key: 0,
  class: "section"
};
const _hoisted_19 = { class: "sectionTitle" };
const _hoisted_20 = {
  key: 0,
  class: "diffBlock"
};
const _hoisted_21 = { class: "label" };
const _hoisted_22 = {
  key: 1,
  class: "section"
};
const _hoisted_23 = { class: "sectionTitle" };
const _hoisted_24 = { class: "text" };
const _hoisted_25 = {
  key: 0,
  class: "diffBlock"
};
const _hoisted_26 = { class: "label" };
const _hoisted_27 = {
  key: 1,
  class: "diffBlock"
};
const _hoisted_28 = { class: "label" };
const _hoisted_29 = { class: "section" };
const _hoisted_30 = { class: "sectionTitle" };
const _hoisted_31 = {
  key: 0,
  class: "previewWrap"
};
const _hoisted_32 = { class: "pathRow f ac" };
const _hoisted_33 = { class: "path" };
const _hoisted_34 = {
  key: 1,
  class: "versions"
};
const _hoisted_35 = { class: "section" };
const _hoisted_36 = { class: "sectionTitle" };
const _hoisted_37 = { class: "f ac" };
const _hoisted_38 = {
  key: 2,
  class: "section"
};
const _hoisted_39 = { class: "sectionTitle" };
const _hoisted_40 = { class: "muted" };
const _hoisted_41 = {
  key: 3,
  class: "section"
};
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "ExplainPanel",
  setup(__props) {
    const store = useStructuredStore();
    const { isElectron } = storeToRefs(settingStore());
    const shot = computed(() => store.selectedShot);
    const saving = ref(false);
    const regenImg = ref(false);
    const regenVid = ref(false);
    const editForm = reactive({
      imagePrompt: "",
      videoPrompt: "",
      dialogueText: "",
      visualEffectContent: ""
    });
    watch(
      () => store.selectedShotId,
      async (id) => {
        if (!id || !shot.value) return;
        syncFormFromShot();
        await store.loadShotHistory(id);
        runValidate();
      },
      { immediate: true }
    );
    watch(shot, () => syncFormFromShot());
    function syncFormFromShot() {
      const s = shot.value;
      if (!s) return;
      editForm.imagePrompt = s.prompt ?? s.original?.prompt ?? "";
      editForm.videoPrompt = s.videoPrompt ?? s.original?.videoPrompt ?? "";
      editForm.dialogueText = s.reference?.dialogue?.text ?? "";
      editForm.visualEffectContent = s.reference?.visualEffect?.content ?? "";
    }
    const validateIssues = computed(() => store.validateResult?.issues ?? []);
    const compilePreviewText = computed(() => {
      const cp = store.validateResult?.compilePreview;
      if (!cp) return "";
      const parts = [];
      if (cp.image?.prompt) parts.push(`[image] ${cp.image.prompt}`);
      if (cp.video?.prompt) parts.push(`[video] ${cp.video.prompt}`);
      return parts.join("\n\n");
    });
    const diffForShot = computed(() => {
      if (!shot.value?.镜号) return null;
      return store.lastSyncDiff?.diffByShot?.find((d) => d.shotNo === shot.value.镜号 || d.storyboardId === shot.value.id);
    });
    const imageVersions = computed(() => shot.value?.images ?? []);
    const historyRevisions = computed(() => [
      ...store.shotHistory?.history?.syncRevisions ?? [],
      ...store.shotHistory?.history?.overrideRevisions ?? []
    ]);
    async function runValidate() {
      if (!shot.value || !store.rulesAvailable) return;
      const shotPayload = {
        镜号: shot.value.镜号,
        imagePrompt: editForm.imagePrompt,
        videoPrompt: editForm.videoPrompt,
        dialogue: { text: editForm.dialogueText },
        visualEffect: { content: editForm.visualEffectContent }
      };
      store.validateResult = await store.api.validateStructuredShot(store.projectId, {
        storyboardId: shot.value.id,
        shot: shotPayload,
        target: "both"
      }) ?? null;
    }
    const debouncedValidate = useDebounceFn(runValidate, 500);
    function buildJsonPatch() {
      if (!shot.value?.镜号) return;
      store.updateShotInJson(shot.value.镜号, {
        imagePrompt: editForm.imagePrompt,
        videoPrompt: editForm.videoPrompt,
        dialogue: { ...shot.value.reference?.dialogue ?? {}, text: editForm.dialogueText },
        visualEffect: { ...shot.value.reference?.visualEffect ?? {}, content: editForm.visualEffectContent }
      });
    }
    async function saveAndSync() {
      if (!store.cachedJson) {
        MessagePlugin.warning(window.$t("workbench.production.wb.structuredPickJson"));
        return;
      }
      if (!store.scriptId) return;
      saving.value = true;
      try {
        buildJsonPatch();
        store.lastSyncDiff = await store.api.syncStructured(store.projectId, store.scriptId, store.cachedJson);
        if (store.lastSyncDiff.autoApplyResult?.started) {
          store.activeTaskId = store.lastSyncDiff.autoApplyResult.taskId ?? null;
          await store.runPoll();
        }
        await store.refreshGrid();
        MessagePlugin.success(window.$t("common.editSuccess"));
      } catch (e) {
        MessagePlugin.error(e.message);
      } finally {
        saving.value = false;
      }
    }
    async function regen(act) {
      if (!shot.value) return;
      const loading = act === "img" ? regenImg : regenVid;
      loading.value = true;
      try {
        const tier = store.currentProfile?.imageTier ?? "2K";
        await store.api.regenerateShot(
          store.projectId,
          shot.value.id,
          act === "img" ? ["image"] : ["video"],
          tier,
          store.audioOn
        );
        await store.runPoll([shot.value.id]);
      } catch (e) {
        MessagePlugin.error(e.message);
      } finally {
        loading.value = false;
      }
    }
    async function replaceAssets() {
      const assets = await openAssetsSelector({ multiple: true, title: window.$t("workbench.production.wb.structuredReplaceAsset") });
      if (!assets.length || !shot.value?.镜号) return;
      const codes = assets.map((a) => a.remark || a.name).filter(Boolean);
      store.updateShotInJson(shot.value.镜号, { assetCodes: codes });
      await saveAndSync();
    }
    async function selectImage(imageId) {
      if (!shot.value) return;
      await store.api.selectStoryboardImage(shot.value.id, imageId);
      await store.refreshGrid();
    }
    async function selectVideo(videoId) {
      if (!shot.value) return;
      await store.api.selectStructuredVideo(shot.value.id, videoId);
      await store.refreshGrid();
    }
    function copyPath(path) {
      navigator.clipboard.writeText(path).then(
        () => MessagePlugin.success(window.$t("workbench.production.wb.structuredCopyOk")),
        () => MessagePlugin.error(window.$t("components.imageTools.msg.copyFailed"))
      );
    }
    function openUrl(url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    function openOssFolder() {
      instance.post("/setting/fileManagement/openFolder", { path: "oss" }).catch((e) => MessagePlugin.error(e.message));
    }
    function formatTime(ts) {
      if (!ts) return "";
      return new Date(ts * 1e3).toLocaleString();
    }
    return (_ctx, _cache) => {
      const _component_t_tag = Tag;
      const _component_t_textarea = Textarea;
      const _component_t_button = Button;
      const _component_t_alert = Alert;
      const _component_t_image = Image;
      return openBlock(), createElementBlock("div", _hoisted_1$2, [
        !unref(shot) ? (openBlock(), createElementBlock("div", _hoisted_2$2, toDisplayString(_ctx.$t("workbench.production.wb.structuredSelectShot")), 1)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createBaseVNode("div", _hoisted_3$2, [
            createBaseVNode("div", _hoisted_4$2, [
              _cache[8] || (_cache[8] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
              createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.wb.structuredShotMeta")) + " #" + toDisplayString(unref(shot).镜号), 1)
            ]),
            createVNode(_component_t_tag, {
              theme: unref(store).stateTheme(unref(shot).state)
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(shot).state), 1)
              ]),
              _: 1
            }, 8, ["theme"]),
            createBaseVNode("span", _hoisted_5$2, toDisplayString(unref(shot).duration) + "s · " + toDisplayString(unref(shot).track), 1)
          ]),
          createBaseVNode("div", _hoisted_6$2, [
            createBaseVNode("div", _hoisted_7, [
              _cache[9] || (_cache[9] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
              createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.wb.structuredReference")), 1)
            ]),
            unref(shot).reference?.dialogue?.text ? (openBlock(), createElementBlock("p", _hoisted_8, toDisplayString(unref(shot).reference.dialogue.text), 1)) : createCommentVNode("", true),
            unref(shot).reference?.visualEffect?.content ? (openBlock(), createElementBlock("p", _hoisted_9, toDisplayString(unref(shot).reference.visualEffect.content), 1)) : createCommentVNode("", true),
            unref(shot).original?.prompt ? (openBlock(), createElementBlock("p", _hoisted_10, toDisplayString(_ctx.$t("workbench.production.wb.structuredOriginalPrompt")) + ": " + toDisplayString(unref(shot).original.prompt), 1)) : createCommentVNode("", true)
          ]),
          createBaseVNode("div", _hoisted_11, [
            createBaseVNode("div", _hoisted_12, [
              _cache[10] || (_cache[10] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
              createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.wb.structuredEditPrompt")), 1)
            ]),
            createBaseVNode("label", _hoisted_13, toDisplayString(_ctx.$t("workbench.production.preview.imagePrompt")), 1),
            createVNode(_component_t_textarea, {
              modelValue: unref(editForm).imagePrompt,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(editForm).imagePrompt = $event),
              autosize: { minRows: 2, maxRows: 5 },
              onBlur: unref(debouncedValidate)
            }, null, 8, ["modelValue", "onBlur"]),
            createBaseVNode("label", _hoisted_14, toDisplayString(_ctx.$t("workbench.production.wb.structuredVideoPrompt")), 1),
            createVNode(_component_t_textarea, {
              modelValue: unref(editForm).videoPrompt,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(editForm).videoPrompt = $event),
              autosize: { minRows: 2, maxRows: 5 },
              onBlur: unref(debouncedValidate)
            }, null, 8, ["modelValue", "onBlur"]),
            createBaseVNode("label", _hoisted_15, toDisplayString(_ctx.$t("workbench.production.wb.structuredDialogue")), 1),
            createVNode(_component_t_textarea, {
              modelValue: unref(editForm).dialogueText,
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(editForm).dialogueText = $event),
              autosize: { minRows: 2, maxRows: 4 },
              onBlur: unref(debouncedValidate)
            }, null, 8, ["modelValue", "onBlur"]),
            createBaseVNode("label", _hoisted_16, toDisplayString(_ctx.$t("workbench.production.wb.structuredVisualEffect")), 1),
            createVNode(_component_t_textarea, {
              modelValue: unref(editForm).visualEffectContent,
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => unref(editForm).visualEffectContent = $event),
              autosize: { minRows: 2, maxRows: 4 },
              onBlur: unref(debouncedValidate)
            }, null, 8, ["modelValue", "onBlur"]),
            createBaseVNode("div", _hoisted_17, [
              createVNode(_component_t_button, {
                size: "small",
                loading: unref(saving),
                onClick: saveAndSync
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredSaveSync")), 1)
                ]),
                _: 1
              }, 8, ["loading"]),
              createVNode(_component_t_button, {
                size: "small",
                variant: "outline",
                loading: unref(regenImg),
                onClick: _cache[4] || (_cache[4] = ($event) => regen("img"))
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredRegenImage")), 1)
                ]),
                _: 1
              }, 8, ["loading"]),
              createVNode(_component_t_button, {
                size: "small",
                variant: "outline",
                loading: unref(regenVid),
                onClick: _cache[5] || (_cache[5] = ($event) => regen("vid"))
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredRegenVideo")), 1)
                ]),
                _: 1
              }, 8, ["loading"]),
              createVNode(_component_t_button, {
                size: "small",
                variant: "text",
                onClick: replaceAssets
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredReplaceAsset")), 1)
                ]),
                _: 1
              })
            ])
          ]),
          unref(validateIssues).length || unref(compilePreviewText) ? (openBlock(), createElementBlock("div", _hoisted_18, [
            createBaseVNode("div", _hoisted_19, [
              _cache[11] || (_cache[11] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
              createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.wb.structuredValidate")), 1)
            ]),
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(validateIssues), (issue, i) => {
              return openBlock(), createBlock(_component_t_alert, {
                key: i,
                theme: issue.severity === "error" ? "error" : "warning",
                message: issue.message
              }, null, 8, ["theme", "message"]);
            }), 128)),
            unref(compilePreviewText) ? (openBlock(), createElementBlock("div", _hoisted_20, [
              createBaseVNode("span", _hoisted_21, toDisplayString(_ctx.$t("workbench.production.wb.structuredCompilePreview")), 1),
              createBaseVNode("pre", null, toDisplayString(unref(compilePreviewText)), 1)
            ])) : createCommentVNode("", true)
          ])) : createCommentVNode("", true),
          unref(diffForShot) ? (openBlock(), createElementBlock("div", _hoisted_22, [
            createBaseVNode("div", _hoisted_23, [
              _cache[12] || (_cache[12] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
              createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.wb.structuredSyncDiff")), 1)
            ]),
            createBaseVNode("p", _hoisted_24, toDisplayString(unref(diffForShot).recommendationReason), 1),
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(diffForShot).changedFields, (f) => {
              return openBlock(), createElementBlock("p", {
                key: f,
                class: "tagLine"
              }, [
                createVNode(_component_t_tag, { size: "small" }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(f), 1)
                  ]),
                  _: 2
                }, 1024)
              ]);
            }), 128)),
            unref(diffForShot).promptBefore ? (openBlock(), createElementBlock("div", _hoisted_25, [
              createBaseVNode("span", _hoisted_26, toDisplayString(_ctx.$t("workbench.production.wb.structuredBefore")), 1),
              createBaseVNode("pre", null, toDisplayString(unref(diffForShot).promptBefore), 1)
            ])) : createCommentVNode("", true),
            unref(diffForShot).promptAfter ? (openBlock(), createElementBlock("div", _hoisted_27, [
              createBaseVNode("span", _hoisted_28, toDisplayString(_ctx.$t("workbench.production.wb.structuredAfter")), 1),
              createBaseVNode("pre", null, toDisplayString(unref(diffForShot).promptAfter), 1)
            ])) : createCommentVNode("", true)
          ])) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_29, [
            createBaseVNode("div", _hoisted_30, [
              _cache[13] || (_cache[13] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
              createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.wb.structuredPreviewImage")), 1)
            ]),
            unref(shot).imageSrc ? (openBlock(), createElementBlock("div", _hoisted_31, [
              createVNode(_component_t_image, {
                src: unref(shot).imageSrc,
                fit: "contain",
                class: "previewImg"
              }, {
                overlayContent: withCtx(() => [
                  createVNode(ImageTools, {
                    src: unref(shot).imageSrc,
                    position: "br"
                  }, null, 8, ["src"])
                ]),
                _: 1
              }, 8, ["src"]),
              createBaseVNode("div", _hoisted_32, [
                createBaseVNode("code", _hoisted_33, toDisplayString(unref(shot).imageSrc), 1),
                createVNode(_component_t_button, {
                  size: "small",
                  variant: "text",
                  onClick: _cache[6] || (_cache[6] = ($event) => copyPath(unref(shot).imageSrc))
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredCopyPath")), 1)
                  ]),
                  _: 1
                }),
                createVNode(_component_t_button, {
                  size: "small",
                  variant: "text",
                  onClick: _cache[7] || (_cache[7] = ($event) => openUrl(unref(shot).imageSrc))
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredOpenUrl")), 1)
                  ]),
                  _: 1
                })
              ])
            ])) : createCommentVNode("", true),
            unref(imageVersions).length ? (openBlock(), createElementBlock("div", _hoisted_34, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(imageVersions), (img) => {
                return openBlock(), createElementBlock("div", {
                  key: img.id,
                  class: "verItem f ac jb"
                }, [
                  createBaseVNode("span", null, "#" + toDisplayString(img.id) + " " + toDisplayString(img.active ? "★" : ""), 1),
                  createVNode(_component_t_button, {
                    size: "small",
                    variant: "text",
                    disabled: img.active,
                    onClick: ($event) => selectImage(img.id)
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredSelectVersion")), 1)
                    ]),
                    _: 1
                  }, 8, ["disabled", "onClick"])
                ]);
              }), 128))
            ])) : createCommentVNode("", true)
          ]),
          createBaseVNode("div", _hoisted_35, [
            createBaseVNode("div", _hoisted_36, [
              _cache[14] || (_cache[14] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
              createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.wb.structuredVideoVersions")), 1)
            ]),
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(shot).videoVersions ?? [], (v) => {
              return openBlock(), createElementBlock("div", {
                key: v.id,
                class: "verItem f ac jb"
              }, [
                createBaseVNode("span", null, toDisplayString(v.state) + " #" + toDisplayString(v.id), 1),
                createBaseVNode("div", _hoisted_37, [
                  v.src ? (openBlock(), createBlock(_component_t_button, {
                    key: 0,
                    size: "small",
                    variant: "text",
                    onClick: ($event) => openUrl(v.src)
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredOpenUrl")), 1)
                    ]),
                    _: 1
                  }, 8, ["onClick"])) : createCommentVNode("", true),
                  createVNode(_component_t_button, {
                    size: "small",
                    variant: "text",
                    disabled: v.active,
                    onClick: ($event) => selectVideo(v.id)
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredSelectVersion")), 1)
                    ]),
                    _: 1
                  }, 8, ["disabled", "onClick"])
                ])
              ]);
            }), 128))
          ]),
          unref(historyRevisions).length ? (openBlock(), createElementBlock("div", _hoisted_38, [
            createBaseVNode("div", _hoisted_39, [
              _cache[15] || (_cache[15] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
              createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.wb.structuredHistory")), 1)
            ]),
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(historyRevisions), (rev, i) => {
              return openBlock(), createElementBlock("div", {
                key: i,
                class: "histItem"
              }, [
                createBaseVNode("span", _hoisted_40, toDisplayString(formatTime(rev.at)), 1),
                createBaseVNode("span", null, toDisplayString(rev.changedFields?.join(", ") || rev.reason), 1)
              ]);
            }), 128))
          ])) : createCommentVNode("", true),
          unref(isElectron) ? (openBlock(), createElementBlock("div", _hoisted_41, [
            createVNode(_component_t_button, {
              size: "small",
              variant: "outline",
              onClick: openOssFolder
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredOpenOss")), 1)
              ]),
              _: 1
            })
          ])) : createCommentVNode("", true)
        ], 64))
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const ExplainPanel = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-bbf8a2b0"]]);

const _hoisted_1$1 = { class: "taskBar f ac jb" };
const _hoisted_2$1 = { class: "left f ac" };
const _hoisted_3$1 = { key: 1 };
const _hoisted_4$1 = { key: 2 };
const _hoisted_5$1 = {
  key: 3,
  class: "muted"
};
const _hoisted_6$1 = { class: "right f ac" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "TaskBar",
  setup(__props) {
    const store = useStructuredStore();
    const retrying = ref(false);
    async function retryFailed() {
      if (!store.failedShotIds.length) return;
      retrying.value = true;
      try {
        const tier = store.currentProfile?.imageTier ?? "2K";
        const ids = [...store.failedShotIds];
        for (const id of ids) {
          await store.api.regenerateShot(store.projectId, id, ["image", "video"], tier, store.audioOn);
        }
        store.failedShotIds = [];
        await store.runPoll(ids);
        MessagePlugin.success(window.$t("workbench.production.wb.structuredRetryOk"));
      } catch (e) {
        MessagePlugin.error(e.message);
      } finally {
        retrying.value = false;
      }
    }
    return (_ctx, _cache) => {
      const _component_t_loading = Loading;
      const _component_t_tag = Tag;
      const _component_t_button = Button;
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createBaseVNode("div", _hoisted_2$1, [
          unref(store).polling ? (openBlock(), createBlock(_component_t_loading, {
            key: 0,
            size: "small"
          })) : createCommentVNode("", true),
          unref(store).polling ? (openBlock(), createElementBlock("span", _hoisted_3$1, toDisplayString(unref(store).pollProgress || _ctx.$t("workbench.production.wb.structuredPolling")), 1)) : unref(store).activeTaskId ? (openBlock(), createElementBlock("span", _hoisted_4$1, toDisplayString(_ctx.$t("workbench.production.wb.structuredTaskId")) + ": " + toDisplayString(unref(store).activeTaskId), 1)) : (openBlock(), createElementBlock("span", _hoisted_5$1, toDisplayString(_ctx.$t("workbench.production.wb.structuredTaskIdle")), 1))
        ]),
        createBaseVNode("div", _hoisted_6$1, [
          unref(store).failedShotIds.length ? (openBlock(), createBlock(_component_t_tag, {
            key: 0,
            theme: "danger",
            variant: "light"
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredFailedCount", { count: unref(store).failedShotIds.length })), 1)
            ]),
            _: 1
          })) : createCommentVNode("", true),
          unref(store).failedShotIds.length ? (openBlock(), createBlock(_component_t_button, {
            key: 1,
            size: "small",
            variant: "outline",
            loading: unref(retrying),
            onClick: retryFailed
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredRetryFailed")), 1)
            ]),
            _: 1
          }, 8, ["loading"])) : createCommentVNode("", true),
          createVNode(_component_t_button, {
            size: "small",
            variant: "text",
            onClick: _cache[0] || (_cache[0] = ($event) => unref(store).refreshGrid())
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.wb.structuredRefresh")), 1)
            ]),
            _: 1
          })
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const StructuredTaskBar = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-3fb9827b"]]);

const _hoisted_1 = { class: "structuredProduction fc" };
const _hoisted_2 = {
  key: 0,
  class: "warnings"
};
const _hoisted_3 = {
  key: 1,
  class: "coverage f ac"
};
const _hoisted_4 = { class: "main f" };
const _hoisted_5 = { class: "gridArea" };
const _hoisted_6 = { class: "explainArea" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const store = useStructuredStore();
    const { project } = storeToRefs(projectStore());
    const episodesId = inject("episodesId");
    const gridRef = ref(null);
    async function bootstrap() {
      const pid = Number(project.value?.id);
      const sid = episodesId.value;
      if (!pid || !sid) return;
      await store.init(pid, sid);
    }
    watch(
      () => episodesId.value,
      () => bootstrap()
    );
    onMounted(() => bootstrap());
    function onRefresh() {
      store.loadRules();
    }
    async function onGridAction(key, id) {
      gridRef.value?.setBusy(id, key);
      try {
        const tier = store.currentProfile?.imageTier ?? "2K";
        if (key === "img" || key === "regenerateImage" || key === "generateImage") {
          await store.api.regenerateShot(store.projectId, id, ["image"], tier, store.audioOn);
        } else if (key === "vid" || key === "regenerateVideo" || key === "generateVideo") {
          await store.api.regenerateShot(store.projectId, id, ["video"], tier, store.audioOn);
        }
        await store.runPoll([id]);
      } catch (e) {
        MessagePlugin.error(e.message);
      } finally {
        gridRef.value?.clearBusy();
      }
    }
    return (_ctx, _cache) => {
      const _component_t_alert = Alert;
      const _component_t_tag = Tag;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(StructuredToolbar, { onRefresh }),
        unref(store).previewData?.warnings?.length ? (openBlock(), createElementBlock("div", _hoisted_2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(store).previewData.warnings, (w, i) => {
            return openBlock(), createBlock(_component_t_alert, {
              key: i,
              theme: "warning",
              message: String(w)
            }, null, 8, ["message"]);
          }), 128))
        ])) : createCommentVNode("", true),
        unref(store).previewData?.fieldCoverage ? (openBlock(), createElementBlock("div", _hoisted_3, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(store).previewData.fieldCoverage, (v, k) => {
            return openBlock(), createBlock(_component_t_tag, {
              key: k,
              variant: "outline",
              size: "small"
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(k) + ": " + toDisplayString(v), 1)
              ]),
              _: 2
            }, 1024);
          }), 128))
        ])) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_4, [
          createBaseVNode("div", _hoisted_5, [
            createVNode(ShotGrid, {
              ref_key: "gridRef",
              ref: gridRef,
              onAction: onGridAction
            }, null, 512)
          ]),
          createBaseVNode("div", _hoisted_6, [
            createVNode(ExplainPanel)
          ])
        ]),
        createVNode(StructuredTaskBar)
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-578699e8"]]);

export { index as default };

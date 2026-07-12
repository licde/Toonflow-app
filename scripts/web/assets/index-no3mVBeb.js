import { l as defineComponent, bM as storeToRefs, bU as useModel, w as watch, aS as createBlock, aM as withCtx, bV as mergeModels, aK as openBlock, j as createVNode, bH as withModifiers, a1 as unref, av as isRef, r as ref, bD as defineStore, o as onMounted, aL as createElementBlock, aO as createBaseVNode, b0 as toDisplayString, aT as createCommentVNode, bT as useRoute, a$ as createTextVNode, F as Fragment, aP as renderList, aU as normalizeClass, H as Transition, c as computed, b2 as resolveComponent } from './vue-vendor-Byo5TD6r.js';
import { A as AsyncMdEditor } from './AsyncMdEditor-CJVlVNjS.js';
import { A as AsyncMdPreview } from './AsyncMdPreview-D9IGMFOZ.js';
import { s as settingStore, _ as _export_sfc } from './index-DkAIKrBP.js';
import { P as Pe, g as ge } from './splitpanes-BtsLJCt3.js';
import { i as instance } from './axios-BX4BN6mO.js';
import { C as ChatList, a as ChatMessage, b as ChatSender } from './tdesign-chat-2f-0Epe1.js';
import { p as projectStore } from './project-Cze3Ugcr.js';
import { E as Dialog, o as Space, x as Steps, B as Button, a5 as Popup, U as Tabs, V as TabPanel, W as DialogPlugin, y as StepItem, a4 as Empty } from './tdesign-CfL1pweZ.js';
import { a as useChat, b as useProductionAgentStore, u as useAdaptationNav } from './useAdaptationNav-Bi4oVHb2.js';
import { g as getAdaptationSteps, e as enterProduction } from './ruleEngine-Bk1aW4hN.js';
import './dayjs-CuToSpIM.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';

const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "editMdPreivew",
  props: /* @__PURE__ */ mergeModels({
    content: {}
  }, {
    "modelValue": {
      default: false
    },
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["save"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const { themeSetting } = storeToRefs(settingStore());
    const props = __props;
    const editContent = ref("");
    const dialogVisible = useModel(__props, "modelValue");
    const toolbars = [
      "bold",
      "underline",
      "italic",
      "strikeThrough",
      "-",
      "title",
      "sub",
      "sup",
      "quote",
      "unorderedList",
      "orderedList",
      "task",
      "-",
      "codeRow",
      "code",
      "table",
      "-",
      "revoke",
      "next",
      "=",
      "preview"
    ];
    watch(
      () => dialogVisible.value,
      () => {
        editContent.value = props.content;
      }
    );
    const emit = __emit;
    function onConfirm() {
      emit("save", editContent.value);
      dialogVisible.value = false;
    }
    function onCancel() {
      dialogVisible.value = false;
    }
    function onPaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
          e.preventDefault();
          return;
        }
      }
    }
    return (_ctx, _cache) => {
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        visible: dialogVisible.value,
        "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => dialogVisible.value = $event),
        header: _ctx.$t("components.editMdPreivew.title"),
        width: "90vw",
        "confirm-btn": _ctx.$t("components.editMdPreivew.confirm"),
        "cancel-btn": _ctx.$t("components.editMdPreivew.cancel"),
        onConfirm,
        onCancel,
        onClose: onCancel,
        "close-on-overlay-click": false,
        placement: "center",
        attach: "body"
      }, {
        default: withCtx(() => [
          createVNode(AsyncMdEditor, {
            modelValue: unref(editContent),
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(editContent) ? editContent.value = $event : null),
            theme: unref(themeSetting).mode,
            toolbars,
            footers: [],
            style: { "height": "72vh" },
            onOnUploadImg: () => {
            },
            onDrop: _cache[1] || (_cache[1] = withModifiers(() => {
            }, ["prevent"])),
            onPaste
          }, null, 8, ["modelValue", "theme"])
        ]),
        _: 1
      }, 8, ["visible", "header", "confirm-btn", "cancel-btn"]);
    };
  }
});

function makeScriptAgentStore(projectId) {
  return defineStore(`scriptAgent-${projectId}`, () => {
    const planData = ref({
      storySkeleton: "",
      adaptationStrategy: "",
      script: []
    });
    const { connected, messages, chat, stopGenerate, socket, status, disconnect, connect } = useChat({
      url: `${settingStore().baseUrl}/socket/scriptAgent`,
      auth: () => ({
        isolationKey: `${projectId}:scriptAgent`,
        projectId
      }),
      manageLifecycle: false,
      xmlTags: [
        { tag: "storySkeleton", keepInMessage: false },
        { tag: "adaptationStrategy", keepInMessage: false },
        { tag: "scriptItem", keepInMessage: false }
      ],
      onXmlTag: (data) => {
        const { tag, value, children, status: status2, attrs } = data;
        if (tag === "storySkeleton") {
          planData.value.storySkeleton = value;
        } else if (tag === "adaptationStrategy") {
          planData.value.adaptationStrategy = value;
        } else if (tag === "scriptItem") {
          const name = attrs.name ?? "";
          const content = value;
          if (name) {
            const existingIndex = planData.value.script.findIndex((s) => s.name === name);
            if (existingIndex !== -1) {
              planData.value.script[existingIndex].content = content;
            } else {
              planData.value.script.push({ name, content });
            }
          }
        }
        if (status2 === "complete") {
          setPlanData();
        }
      },
      autoConnect: false
    });
    watch(
      socket,
      (s) => {
        if (s) {
          s.on("getPlanData", (_, callback) => {
            callback(planData.value);
          });
        }
      },
      { immediate: true }
    );
    async function setPlanData() {
      await instance.post("/scriptAgent/setPlanData", { projectId, agentType: "scriptAgent", data: planData.value });
    }
    const thinkLevel = ref(0);
    function updateThinkConfig(value) {
      thinkLevel.value = value;
      if (socket.value) {
        socket.value.emit("updateThinkConfig", { think: value > 0, thinlLevel: value });
      }
    }
    return { connected, messages, chat, stopGenerate, socket, status, planData, setPlanData, connect, disconnect, thinkLevel, updateThinkConfig };
  });
}
const storeMap = /* @__PURE__ */ new Map();
function createScriptAgentStore(projectId) {
  if (!storeMap.has(projectId)) {
    storeMap.set(projectId, makeScriptAgentStore(projectId));
  }
  return storeMap.get(projectId);
}
function useScriptAgentStore() {
  const id = projectStore().project?.id;
  if (!id) throw new Error("No project selected");
  return createScriptAgentStore(id)();
}

const _hoisted_1 = { class: "scriptAgent" };
const _hoisted_2 = {
  key: 0,
  class: "adaptStepsBar"
};
const _hoisted_3 = { class: "adaptStepsHeader f ac jb" };
const _hoisted_4 = { class: "adaptStepsTitle" };
const _hoisted_5 = { class: "box pr" };
const _hoisted_6 = { class: "settingMenu" };
const _hoisted_7 = { class: "settingMenu" };
const _hoisted_8 = ["onClick"];
const _hoisted_9 = {
  key: 0,
  class: "forceGenerateMask"
};
const _hoisted_10 = { class: "forceGenerateCard" };
const _hoisted_11 = { class: "forceGenerateDesc" };
const _hoisted_12 = { class: "forceGenerateActions" };
const _hoisted_13 = { class: "tabsWrapper" };
const _hoisted_14 = {
  key: 0,
  class: "ac"
};
const _hoisted_15 = {
  key: 1,
  class: "ac"
};
const _hoisted_16 = { class: "panelContent" };
const _hoisted_17 = { class: "panelContent" };
const _hoisted_18 = { class: "panelContent" };
const _hoisted_19 = {
  key: 1,
  class: "scriptList"
};
const _hoisted_20 = { class: "scriptCardHeader" };
const _hoisted_21 = { class: "scriptCardHeaderLeft" };
const _hoisted_22 = { class: "scriptIndex" };
const _hoisted_23 = { class: "scriptTitle" };
const _hoisted_24 = { class: "scriptCardActions" };
const _hoisted_25 = {
  key: 0,
  class: "scriptCardBody"
};
const _hoisted_26 = { key: 0 };
const _hoisted_27 = {
  key: 1,
  class: "emptyContent"
};
const _hoisted_28 = {
  key: 2,
  class: "floatCollapseBtn"
};
const _hoisted_29 = { class: "scriptEditForm" };
const _hoisted_30 = { class: "scriptEditField" };
const _hoisted_31 = { class: "scriptEditField" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const { themeSetting } = storeToRefs(settingStore());
    const { project } = storeToRefs(projectStore());
    const { connected, messages, status, planData, thinkLevel } = storeToRefs(useScriptAgentStore());
    const thinkLevelOptions = [
      { label: $t("workbench.scriptAgent.thinkLevel.off"), value: 0 },
      { label: $t("workbench.scriptAgent.thinkLevel.light"), value: 1 },
      { label: $t("workbench.scriptAgent.thinkLevel.deep"), value: 2 },
      { label: $t("workbench.scriptAgent.thinkLevel.extreme"), value: 3 }
    ];
    const route = useRoute();
    const { goProduction } = useAdaptationNav();
    const adaptSteps = ref([]);
    const adaptCurrentStep = ref(0);
    const w3Unlocked = ref(true);
    const enteringProduction = ref(false);
    const canEnterProduction = computed(() => w3Unlocked.value && (planData.value.script?.length ?? 0) > 0);
    const currentTable = ref(1);
    const inputValue = ref("");
    const toolbars = [
      "bold",
      "underline",
      "italic",
      "strikeThrough",
      "-",
      "title",
      "sub",
      "sup",
      "quote",
      "unorderedList",
      "orderedList",
      "task",
      "-",
      "codeRow",
      "code",
      "table",
      "-",
      "revoke",
      "next",
      "=",
      "preview"
    ];
    const defMsg = [
      {
        id: "welcome",
        role: "assistant",
        content: [
          { type: "text", status: "complete", data: $t("workbench.scriptAgent.welcomeMsg") },
          {
            type: "suggestion",
            status: "complete",
            data: [{ title: $t("workbench.scriptAgent.start"), prompt: $t("workbench.scriptAgent.start") }]
          }
        ]
      }
    ];
    onMounted(() => {
      if (messages.value.length <= 0) messages.value = [...defMsg, ...messages.value];
      getPlanData();
      getNovel();
      loadAdaptationSteps();
      useScriptAgentStore().connect();
      if (messages.value.length <= 1) getHistory();
      const mode = route.query.mode;
      if (mode === "original") {
        currentTable.value = 3;
        window.$message.info($t("workbench.scriptAgent.originalModeHint"));
      } else if (mode === "adapt") {
        currentTable.value = 1;
      }
    });
    async function loadAdaptationSteps() {
      if (!project.value?.id) return;
      try {
        const data = await getAdaptationSteps(project.value.id);
        adaptSteps.value = data.steps;
        w3Unlocked.value = data.w3Unlocked;
        const firstPending = data.steps.findIndex((s) => !s.done);
        adaptCurrentStep.value = firstPending === -1 ? data.steps.length - 1 : firstPending;
      } catch {
        adaptSteps.value = [];
      }
    }
    function stepStatusMap(step) {
      if (step.done || step.status === "done") return "finish";
      if (step.locked) return "default";
      if (step.status === "running") return "process";
      return "default";
    }
    async function handleEnterProduction() {
      if (!project.value?.id || !planData.value.script?.length) return;
      const firstScript = planData.value.script[0];
      enteringProduction.value = true;
      try {
        const { data: scripts } = await instance.post("/script/getScrptApi", { projectId: project.value.id, name: firstScript.name });
        const match = scripts.find((s) => s.name === firstScript.name);
        if (match) {
          await enterProduction({ projectId: project.value.id, scriptId: match.id, autoDesign: true });
          goProduction(match.id);
          return;
        }
        window.$message.warning($t("workbench.scriptAgent.noScriptForProduction"));
      } catch (e) {
        window.$message.error(e?.message || $t("workbench.scriptAgent.enterProductionFailed"));
      } finally {
        enteringProduction.value = false;
      }
    }
    const agentWorkDataId = ref();
    async function getPlanData() {
      const { data } = await instance.post("/scriptAgent/getPlanData", { projectId: project.value?.id, agentType: "scriptAgent" });
      planData.value.storySkeleton = data.data.storySkeleton;
      planData.value.adaptationStrategy = data.data.adaptationStrategy;
      planData.value.script = data.data.script || [];
      agentWorkDataId.value = data.id;
    }
    const handleActions = {
      suggestion: (data) => {
        useScriptAgentStore().chat(data?.content?.prompt);
      }
    };
    function handleSend(text) {
      useScriptAgentStore().chat(text);
      inputValue.value = "";
    }
    function handleStop() {
      useScriptAgentStore().stopGenerate();
    }
    const memoryTypeLabel = {
      message: $t("workbench.scriptAgent.memoryType.message"),
      summary: $t("workbench.scriptAgent.memoryType.summary"),
      all: $t("workbench.scriptAgent.memoryType.all")
    };
    function handleClearMemory(type) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.scriptAgent.msg.clearConfirm"),
        body: $t("workbench.scriptAgent.msg.clearBody", { type: memoryTypeLabel[type] }),
        confirmBtn: $t("workbench.scriptAgent.msg.confirmClear"),
        cancelBtn: $t("workbench.scriptAgent.msg.cancel"),
        theme: "warning",
        onConfirm: async () => {
          await instance.post(`/agents/clearMemory`, { projectId: project.value?.id, agentType: "scriptAgent", type });
          window.$message.success($t("workbench.scriptAgent.msg.memoryCleared", { type: memoryTypeLabel[type] }));
          dialog.destroy();
          getHistory();
        }
      });
    }
    function handleReconnect() {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.scriptAgent.msg.reconnect"),
        body: $t("workbench.scriptAgent.msg.notReconnect"),
        confirmBtn: $t("workbench.scriptAgent.msg.keepReconnect"),
        cancelBtn: $t("workbench.scriptAgent.msg.cancel"),
        theme: "warning",
        onConfirm: async () => {
          useProductionAgentStore().reconnect();
          dialog.destroy();
        }
      });
    }
    const loadingHistory = ref(false);
    async function getHistory() {
      loadingHistory.value = true;
      const { data } = await instance.post(`/agents/getMemory`, {
        projectId: project.value?.id,
        agentType: "scriptAgent"
      });
      messages.value = [...defMsg, ...data];
      loadingHistory.value = false;
    }
    const forceGenerateVisible = ref(false);
    const novelData = ref([]);
    function getNovel() {
      instance.post("/novel/getNovelData", { projectId: project.value?.id }).then(({ data }) => {
        novelData.value = data;
        const hasUnfinished = novelData.value.some((item) => item.eventState === 0);
        if (hasUnfinished && !forceGenerateVisible.value) {
          forceGenerateVisible.value = true;
        }
      });
    }
    const dialogVisible = ref(false);
    const editContent = ref("");
    function editMdPreview() {
      if (currentTable.value == 1) editContent.value = planData.value.storySkeleton;
      else if (currentTable.value == 2) editContent.value = planData.value.adaptationStrategy;
      dialogVisible.value = true;
    }
    const scriptEditIndex = ref(-1);
    const scriptEditData = ref({
      name: "",
      content: ""
    });
    const scriptEditVisible = ref(false);
    function editScript(index) {
      const item = planData.value.script[index];
      scriptEditIndex.value = index;
      scriptEditData.value = {
        name: item.name,
        content: item.content
      };
      scriptEditVisible.value = true;
    }
    async function saveScript() {
      if (scriptEditIndex.value < 0) return;
      planData.value.script[scriptEditIndex.value] = { ...scriptEditData.value };
      await useScriptAgentStore().setPlanData();
      await getPlanData();
      window.$message.success($t("workbench.scriptAgent.msg.scriptUpdated"));
      scriptEditVisible.value = false;
    }
    async function delScript(index) {
      const item = planData.value.script[index];
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.scriptAgent.msg.deleteConfirm"),
        body: $t("workbench.scriptAgent.msg.deleteBody"),
        confirmBtn: $t("workbench.scriptAgent.msg.confirmDelete"),
        cancelBtn: $t("workbench.scriptAgent.msg.cancel"),
        theme: "danger",
        onConfirm: async () => {
          if (item.id) {
            await instance.post("/script/delScript", { ids: [item.id] });
            planData.value.script.splice(index, 1);
          } else {
            planData.value.script.splice(index, 1);
          }
          await useScriptAgentStore().setPlanData();
          await getPlanData();
          window.$message.success($t("workbench.scriptAgent.msg.scriptDeleted"));
          dialog.destroy();
        }
      });
    }
    function onConfirm(value) {
      instance.post("/scriptAgent/updateData", {
        id: agentWorkDataId.value,
        data: {
          storySkeleton: currentTable.value == 1 ? value : planData.value.storySkeleton,
          adaptationStrategy: currentTable.value == 2 ? value : planData.value.adaptationStrategy,
          script: planData.value.script
        }
      }).then(() => {
        window.$message.success($t("workbench.scriptAgent.msg.updated"));
        getPlanData();
      }).catch((err) => {
        window.$message.error(err?.message ?? $t("workbench.scriptAgent.msg.error"));
      });
    }
    const showThink = ref(false);
    onMounted(async () => {
      const { data } = await instance.post(`/project/getModelDetails`, { key: "scriptAgent" });
      if (data && data.think) {
        showThink.value = true;
      }
    });
    const collapsedCards = ref({});
    function getScriptCardKey(item, index) {
      if (item.id !== void 0 && item.id !== null) {
        return `id:${item.id}`;
      }
      return `index:${index}`;
    }
    function isCardCollapsed(item, index) {
      return Boolean(collapsedCards.value[getScriptCardKey(item, index)]);
    }
    watch(
      () => planData.value.script?.map((item, index) => getScriptCardKey(item, index)) || [],
      (keys) => {
        const nextCollapsedCards = {};
        keys.forEach((key) => {
          if (collapsedCards.value[key]) {
            nextCollapsedCards[key] = true;
          }
        });
        collapsedCards.value = nextCollapsedCards;
      },
      { immediate: true }
    );
    const isAllCollapsed = computed(() => {
      if (!planData.value.script?.length) return false;
      return planData.value.script.every((item, index) => isCardCollapsed(item, index));
    });
    function toggleCardCollapse(item, index) {
      const key = getScriptCardKey(item, index);
      collapsedCards.value[key] = !collapsedCards.value[key];
    }
    function toggleAllCards() {
      const nextCollapsed = !isAllCollapsed.value;
      const nextCollapsedCards = { ...collapsedCards.value };
      planData.value.script?.forEach((item, index) => {
        nextCollapsedCards[getScriptCardKey(item, index)] = nextCollapsed;
      });
      collapsedCards.value = nextCollapsedCards;
    }
    return (_ctx, _cache) => {
      const _component_t_button = Button;
      const _component_t_space = Space;
      const _component_t_step_item = StepItem;
      const _component_t_steps = Steps;
      const _component_i_setting_config = resolveComponent("i-setting-config");
      const _component_i_api = resolveComponent("i-api");
      const _component_i_delete = resolveComponent("i-delete");
      const _component_i_close = resolveComponent("i-close");
      const _component_i_delete_one = resolveComponent("i-delete-one");
      const _component_t_popup = Popup;
      const _component_i_tips = resolveComponent("i-tips");
      const _component_i_dot = resolveComponent("i-dot");
      const _component_t_empty = Empty;
      const _component_t_tab_panel = TabPanel;
      const _component_i_down = resolveComponent("i-down");
      const _component_i_right = resolveComponent("i-right");
      const _component_i_edit = resolveComponent("i-edit");
      const _component_t_tabs = Tabs;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        unref(adaptSteps).length ? (openBlock(), createElementBlock("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("span", _hoisted_4, toDisplayString(_ctx.$t("workbench.scriptAgent.adaptationSteps")), 1),
            createVNode(_component_t_space, { size: "small" }, {
              default: withCtx(() => [
                createVNode(_component_t_button, {
                  size: "small",
                  variant: "outline",
                  loading: unref(enteringProduction),
                  disabled: !unref(canEnterProduction),
                  onClick: handleEnterProduction
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.scriptAgent.enterProduction")), 1)
                  ]),
                  _: 1
                }, 8, ["loading", "disabled"])
              ]),
              _: 1
            })
          ]),
          createVNode(_component_t_steps, {
            current: unref(adaptCurrentStep),
            readonly: "",
            class: "adaptSteps"
          }, {
            default: withCtx(() => [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(adaptSteps), (step) => {
                return openBlock(), createBlock(_component_t_step_item, {
                  key: step.id,
                  title: step.label,
                  status: stepStatusMap(step),
                  content: step.locked ? step.lockReason : step.done ? _ctx.$t("workbench.scriptAgent.stepDone") : ""
                }, null, 8, ["title", "status", "content"]);
              }), 128))
            ]),
            _: 1
          }, 8, ["current"])
        ])) : createCommentVNode("", true),
        createVNode(unref(Pe), { class: "default-theme data f" }, {
          default: withCtx(() => [
            createVNode(unref(ge), {
              size: 30,
              "min-size": 15,
              class: "operate"
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_5, [
                  createVNode(unref(ChatList), { "clear-history": false }, {
                    default: withCtx(() => [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(unref(messages), (message) => {
                        return openBlock(), createBlock(unref(ChatMessage), {
                          key: message.id,
                          message,
                          name: message.name,
                          placement: message.role === "user" ? "right" : "left",
                          variant: message.role === "user" ? "base" : "outline",
                          handleActions: message.role === "user" ? {} : handleActions,
                          status: message.status,
                          allowContentSegmentCustom: ""
                        }, null, 8, ["message", "name", "placement", "variant", "handleActions", "status"]);
                      }), 128))
                    ]),
                    _: 1
                  }),
                  createVNode(unref(ChatSender), {
                    class: "inputBox",
                    disabled: unref(status) === "pending" || unref(status) === "streaming",
                    modelValue: unref(inputValue),
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => isRef(inputValue) ? inputValue.value = $event : null),
                    loading: unref(status) === "pending" || unref(status) === "streaming",
                    placeholder: "$t('workbench.scriptAgent.inputPlaceholder')",
                    onSend: handleSend,
                    onStop: handleStop
                  }, {
                    "footer-prefix": withCtx(() => [
                      createVNode(_component_t_popup, {
                        trigger: "click",
                        placement: "top-left"
                      }, {
                        content: withCtx(() => [
                          createBaseVNode("div", _hoisted_6, [
                            createBaseVNode("div", {
                              class: "settingMenuItem",
                              onClick: _cache[0] || (_cache[0] = ($event) => handleReconnect())
                            }, [
                              createVNode(_component_i_api, { size: "14" }),
                              createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.scriptAgent.reconnect")), 1)
                            ]),
                            createBaseVNode("div", {
                              class: "settingMenuItem",
                              onClick: _cache[1] || (_cache[1] = ($event) => handleClearMemory("message"))
                            }, [
                              createVNode(_component_i_delete, { size: "14" }),
                              createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.scriptAgent.clearMessageMemory")), 1)
                            ]),
                            createBaseVNode("div", {
                              class: "settingMenuItem",
                              onClick: _cache[2] || (_cache[2] = ($event) => handleClearMemory("summary"))
                            }, [
                              createVNode(_component_i_close, { size: "14" }),
                              createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.scriptAgent.clearSummaryMemory")), 1)
                            ]),
                            createBaseVNode("div", {
                              class: "settingMenuItem danger",
                              onClick: _cache[3] || (_cache[3] = ($event) => handleClearMemory("all"))
                            }, [
                              createVNode(_component_i_delete_one, { size: "14" }),
                              createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.scriptAgent.clearAllMemory")), 1)
                            ])
                          ])
                        ]),
                        default: withCtx(() => [
                          createVNode(_component_t_button, {
                            shape: "square",
                            variant: "outline",
                            size: "small",
                            disabled: unref(status) === "pending" || unref(status) === "streaming"
                          }, {
                            icon: withCtx(() => [
                              createVNode(_component_i_setting_config, { size: "16" })
                            ]),
                            _: 1
                          }, 8, ["disabled"])
                        ]),
                        _: 1
                      }),
                      unref(showThink) ? (openBlock(), createBlock(_component_t_popup, {
                        key: 0,
                        trigger: "click",
                        placement: "top"
                      }, {
                        content: withCtx(() => [
                          createBaseVNode("div", _hoisted_7, [
                            (openBlock(), createElementBlock(Fragment, null, renderList(thinkLevelOptions, (opt) => {
                              return createBaseVNode("div", {
                                key: opt.value,
                                class: normalizeClass(["settingMenuItem", { active: unref(thinkLevel) === opt.value }]),
                                onClick: ($event) => unref(useScriptAgentStore)().updateThinkConfig(opt.value)
                              }, [
                                createBaseVNode("span", null, toDisplayString(opt.label), 1)
                              ], 10, _hoisted_8);
                            }), 64))
                          ])
                        ]),
                        default: withCtx(() => [
                          createVNode(_component_t_button, {
                            size: "small",
                            variant: "outline",
                            theme: ["default", "success", "warning", "danger"][unref(thinkLevel)] || "default",
                            style: { "margin-left": "8px" }
                          }, {
                            icon: withCtx(() => [
                              createVNode(_component_i_tips, { size: "16" })
                            ]),
                            default: withCtx(() => [
                              createTextVNode(" " + toDisplayString(thinkLevelOptions[unref(thinkLevel)]?.label), 1)
                            ]),
                            _: 1
                          }, 8, ["theme"])
                        ]),
                        _: 1
                      })) : createCommentVNode("", true)
                    ]),
                    _: 1
                  }, 8, ["disabled", "modelValue", "loading"]),
                  createVNode(_component_i_dot, {
                    class: "dot",
                    theme: "outline",
                    fill: unref(connected) ? "green" : "red"
                  }, null, 8, ["fill"]),
                  createVNode(Transition, { name: "fade" }, {
                    default: withCtx(() => [
                      unref(forceGenerateVisible) ? (openBlock(), createElementBlock("div", _hoisted_9, [
                        createBaseVNode("div", _hoisted_10, [
                          createBaseVNode("div", _hoisted_11, toDisplayString(_ctx.$t("workbench.scriptAgent.forceGenerate.desc")), 1),
                          createBaseVNode("div", _hoisted_12, [
                            createVNode(_component_t_button, {
                              onClick: _cache[5] || (_cache[5] = ($event) => forceGenerateVisible.value = false)
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(_ctx.$t("workbench.scriptAgent.forceGenerate.confirm")), 1)
                              ]),
                              _: 1
                            })
                          ])
                        ])
                      ])) : createCommentVNode("", true)
                    ]),
                    _: 1
                  })
                ])
              ]),
              _: 1
            }),
            createVNode(unref(ge), {
              size: 70,
              "min-size": 30,
              class: "data"
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_13, [
                  createVNode(_component_t_tabs, {
                    modelValue: unref(currentTable),
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => isRef(currentTable) ? currentTable.value = $event : null)
                  }, {
                    action: withCtx(() => [
                      unref(currentTable) == 1 ? (openBlock(), createElementBlock("div", _hoisted_14, [
                        createVNode(_component_t_button, { onClick: editMdPreview }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.scriptAgent.edit")), 1)
                          ]),
                          _: 1
                        })
                      ])) : unref(currentTable) == 2 ? (openBlock(), createElementBlock("div", _hoisted_15, [
                        createVNode(_component_t_button, { onClick: editMdPreview }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.scriptAgent.edit")), 1)
                          ]),
                          _: 1
                        })
                      ])) : createCommentVNode("", true)
                    ]),
                    default: withCtx(() => [
                      createVNode(_component_t_tab_panel, {
                        value: 1,
                        label: _ctx.$t("workbench.scriptAgent.storySkeleton")
                      }, {
                        default: withCtx(() => [
                          createBaseVNode("div", _hoisted_16, [
                            unref(planData).storySkeleton ? (openBlock(), createBlock(AsyncMdPreview, {
                              key: 0,
                              modelValue: unref(planData).storySkeleton,
                              theme: unref(themeSetting).mode === "auto" ? void 0 : unref(themeSetting).mode
                            }, null, 8, ["modelValue", "theme"])) : (openBlock(), createBlock(_component_t_empty, {
                              key: 1,
                              title: _ctx.$t("workbench.scriptAgent.noContent")
                            }, null, 8, ["title"]))
                          ])
                        ]),
                        _: 1
                      }, 8, ["label"]),
                      createVNode(_component_t_tab_panel, {
                        value: 2,
                        label: _ctx.$t("workbench.scriptAgent.adaptationStrategy")
                      }, {
                        default: withCtx(() => [
                          createBaseVNode("div", _hoisted_17, [
                            unref(planData).adaptationStrategy ? (openBlock(), createBlock(AsyncMdPreview, {
                              key: 0,
                              modelValue: unref(planData).adaptationStrategy,
                              theme: unref(themeSetting).mode === "auto" ? void 0 : unref(themeSetting).mode
                            }, null, 8, ["modelValue", "theme"])) : (openBlock(), createBlock(_component_t_empty, {
                              key: 1,
                              title: _ctx.$t("workbench.scriptAgent.noContent")
                            }, null, 8, ["title"]))
                          ])
                        ]),
                        _: 1
                      }, 8, ["label"]),
                      createVNode(_component_t_tab_panel, {
                        value: 3,
                        label: _ctx.$t("workbench.scriptAgent.script")
                      }, {
                        default: withCtx(() => [
                          createBaseVNode("div", _hoisted_18, [
                            !unref(planData).script?.length ? (openBlock(), createBlock(_component_t_empty, {
                              key: 0,
                              title: _ctx.$t("workbench.scriptAgent.noContent")
                            }, null, 8, ["title"])) : (openBlock(), createElementBlock("div", _hoisted_19, [
                              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(planData).script, (item, index) => {
                                return openBlock(), createElementBlock("div", {
                                  key: getScriptCardKey(item, index),
                                  class: normalizeClass(["scriptCard", { collapsed: isCardCollapsed(item, index) }])
                                }, [
                                  createBaseVNode("div", _hoisted_20, [
                                    createBaseVNode("div", _hoisted_21, [
                                      createBaseVNode("span", _hoisted_22, "#" + toDisplayString(index + 1), 1),
                                      createBaseVNode("span", _hoisted_23, toDisplayString(item.name), 1)
                                    ]),
                                    createBaseVNode("div", _hoisted_24, [
                                      createVNode(_component_t_button, {
                                        size: "small",
                                        variant: "outline",
                                        onClick: ($event) => toggleCardCollapse(item, index)
                                      }, {
                                        icon: withCtx(() => [
                                          !isCardCollapsed(item, index) ? (openBlock(), createBlock(_component_i_down, {
                                            key: 0,
                                            size: "14"
                                          })) : (openBlock(), createBlock(_component_i_right, {
                                            key: 1,
                                            size: "14"
                                          }))
                                        ]),
                                        _: 2
                                      }, 1032, ["onClick"]),
                                      createVNode(_component_t_button, {
                                        size: "small",
                                        onClick: ($event) => editScript(index)
                                      }, {
                                        icon: withCtx(() => [
                                          createVNode(_component_i_edit, { size: "14" })
                                        ]),
                                        _: 1
                                      }, 8, ["onClick"]),
                                      createVNode(_component_t_button, {
                                        theme: "danger",
                                        variant: "outline",
                                        size: "small",
                                        onClick: ($event) => delScript(index)
                                      }, {
                                        icon: withCtx(() => [
                                          createVNode(_component_i_delete, { size: "14" })
                                        ]),
                                        _: 1
                                      }, 8, ["onClick"])
                                    ])
                                  ]),
                                  !isCardCollapsed(item, index) ? (openBlock(), createElementBlock("div", _hoisted_25, [
                                    item.content ? (openBlock(), createElementBlock("pre", _hoisted_26, toDisplayString(item.content), 1)) : (openBlock(), createElementBlock("span", _hoisted_27, toDisplayString(_ctx.$t("workbench.scriptAgent.noContent")), 1))
                                  ])) : createCommentVNode("", true)
                                ], 2);
                              }), 128))
                            ])),
                            unref(planData).script?.length ? (openBlock(), createElementBlock("div", _hoisted_28, [
                              createVNode(_component_t_button, {
                                shape: "circle",
                                size: "large",
                                theme: "primary",
                                onClick: toggleAllCards
                              }, {
                                icon: withCtx(() => [
                                  unref(isAllCollapsed) ? (openBlock(), createBlock(_component_i_right, {
                                    key: 0,
                                    title: "",
                                    size: "18"
                                  })) : (openBlock(), createBlock(_component_i_down, {
                                    key: 1,
                                    size: "18"
                                  }))
                                ]),
                                _: 1
                              })
                            ])) : createCommentVNode("", true)
                          ])
                        ]),
                        _: 1
                      }, 8, ["label"])
                    ]),
                    _: 1
                  }, 8, ["modelValue"])
                ])
              ]),
              _: 1
            })
          ]),
          _: 1
        }),
        createVNode(_sfc_main$1, {
          modelValue: unref(dialogVisible),
          "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => isRef(dialogVisible) ? dialogVisible.value = $event : null),
          onSave: onConfirm,
          content: unref(editContent)
        }, null, 8, ["modelValue", "content"]),
        createVNode(_component_t_dialog, {
          visible: unref(scriptEditVisible),
          "onUpdate:visible": _cache[10] || (_cache[10] = ($event) => isRef(scriptEditVisible) ? scriptEditVisible.value = $event : null),
          header: _ctx.$t("workbench.scriptAgent.editScript"),
          width: "80%",
          top: "10vh",
          placement: "center",
          "confirm-btn": { content: _ctx.$t("workbench.scriptAgent.save"), theme: "primary" },
          onConfirm: saveScript,
          onClose: _cache[11] || (_cache[11] = ($event) => scriptEditVisible.value = false)
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_29, [
              createBaseVNode("div", _hoisted_30, [
                createBaseVNode("strong", null, toDisplayString(unref(scriptEditData).name), 1)
              ]),
              createBaseVNode("div", _hoisted_31, [
                createBaseVNode("label", null, toDisplayString(_ctx.$t("workbench.scriptAgent.content")), 1),
                createVNode(AsyncMdEditor, {
                  modelValue: unref(scriptEditData).content,
                  "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => unref(scriptEditData).content = $event),
                  theme: unref(themeSetting).mode === "auto" ? void 0 : unref(themeSetting).mode,
                  toolbars,
                  footers: [],
                  style: { "height": "50vh" },
                  onOnUploadImg: () => {
                  },
                  onDrop: _cache[9] || (_cache[9] = withModifiers(() => {
                  }, ["prevent"]))
                }, null, 8, ["modelValue", "theme"])
              ])
            ])
          ]),
          _: 1
        }, 8, ["visible", "header", "confirm-btn"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7b089aa5"]]);

export { index as default };

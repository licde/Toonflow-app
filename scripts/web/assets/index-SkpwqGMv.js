import { l as defineComponent, bM as storeToRefs, b_ as useMousePressed, b$ as useMouse, w as watch, K as watchEffect, o as onMounted, b2 as resolveComponent, a7 as resolveDirective, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, j as createVNode, a1 as unref, a$ as createTextVNode, b0 as toDisplayString, bH as withModifiers, E as withDirectives, aM as withCtx, F as Fragment, aP as renderList, aS as createBlock, aU as normalizeClass, aT as createCommentVNode, av as isRef, aQ as normalizeStyle, r as ref } from './vue-vendor-Byo5TD6r.js';
import { i as instance } from './axios-DoLZCC01.js';
import { a as ChatMessage, C as ChatList, b as ChatSender } from './tdesign-chat-2f-0Epe1.js';
import { b as useProductionAgentStore } from './useAdaptationNav-BJTPyVmA.js';
import { p as projectStore, _ as _export_sfc } from './index-Dj17DntQ.js';
import { a5 as Popup, B as Button, W as DialogPlugin } from './tdesign-CfL1pweZ.js';
import './dayjs-CuToSpIM.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';

const _hoisted_1 = { class: "header f ac jb" };
const _hoisted_2 = { class: "text" };
const _hoisted_3 = { class: "close" };
const _hoisted_4 = { class: "chatBox" };
const _hoisted_5 = {
  class: "ac",
  style: { "gap": "5px" }
};
const _hoisted_6 = { class: "settingMenu" };
const _hoisted_7 = { class: "settingMenu" };
const _hoisted_8 = ["onClick"];
const MIN_WIDTH = 400;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: { title: String },
  emits: ["close"],
  setup(__props, { emit: __emit }) {
    const { project } = storeToRefs(projectStore());
    const { connected, messages, status, episodesId, loadingHistory, thinkLevel } = storeToRefs(useProductionAgentStore());
    const thinkLevelOptions = [
      { label: $t("workbench.scriptAgent.thinkLevel.off"), value: 0 },
      { label: $t("workbench.scriptAgent.thinkLevel.light"), value: 1 },
      { label: $t("workbench.scriptAgent.thinkLevel.deep"), value: 2 },
      { label: $t("workbench.scriptAgent.thinkLevel.extreme"), value: 3 }
    ];
    const props = __props;
    const emit = __emit;
    const inputValue = ref("");
    function handleSend(text) {
      useProductionAgentStore().chat(text);
      inputValue.value = "";
    }
    function handleStop() {
      useProductionAgentStore().stopGenerate();
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
    const handleActions = {
      suggestion: (data) => {
        useProductionAgentStore().chat(data?.content?.prompt);
      }
    };
    const memoryTypeLabel = {
      message: $t("workbench.production.chatBox.messageMemory"),
      summary: $t("workbench.production.chatBox.summaryMemory"),
      all: $t("workbench.production.chatBox.allMemory")
    };
    function handleClearMemory(type) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.production.chatBox.confirmClear"),
        body: $t("workbench.production.chatBox.confirmClearBody", { type: memoryTypeLabel[type] }),
        confirmBtn: $t("workbench.production.chatBox.confirmClearBtn"),
        cancelBtn: $t("workbench.production.cancel"),
        theme: "warning",
        onConfirm: async () => {
          await instance.post(`/agents/clearMemory`, { projectId: project.value?.id, agentType: "productionAgent", episodesId: episodesId.value, type });
          window.$message.success($t("workbench.production.chatBox.memoryCleared", { type: memoryTypeLabel[type] }));
          dialog.destroy();
          useProductionAgentStore().getHistory();
        }
      });
    }
    const resizeHandleRef = ref(null);
    const boxWidth = ref(400);
    const { pressed } = useMousePressed({ target: resizeHandleRef });
    const { x } = useMouse();
    const dragStartX = ref(0);
    const dragStartWidth = ref(400);
    watch(pressed, (isPressed) => {
      if (isPressed) {
        dragStartX.value = x.value;
        dragStartWidth.value = boxWidth.value;
      }
    });
    watchEffect(() => {
      if (pressed.value) {
        const maxWidth = window.innerWidth * 0.8;
        boxWidth.value = Math.min(maxWidth, Math.max(MIN_WIDTH, dragStartWidth.value + (dragStartX.value - x.value)));
      }
    });
    const showThink = ref(false);
    onMounted(async () => {
      const { data } = await instance.post(`/project/getModelDetails`, { key: "productionAgent" });
      if (data && data.think) {
        showThink.value = true;
      }
    });
    watch(connected, (newVal) => {
      if (status.value != "idle" && newVal) {
        status.value = "idle";
      }
    });
    return (_ctx, _cache) => {
      const _component_i_dot = resolveComponent("i-dot");
      const _component_i_click_to_fold = resolveComponent("i-click-to-fold");
      const _component_i_setting_config = resolveComponent("i-setting-config");
      const _component_t_button = Button;
      const _component_i_api = resolveComponent("i-api");
      const _component_i_delete = resolveComponent("i-delete");
      const _component_i_close = resolveComponent("i-close");
      const _component_i_delete_one = resolveComponent("i-delete-one");
      const _component_t_popup = Popup;
      const _component_i_tips = resolveComponent("i-tips");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", {
        class: "rightChatBox",
        style: normalizeStyle({ width: unref(boxWidth) + "px" })
      }, [
        createBaseVNode("div", {
          ref_key: "resizeHandleRef",
          ref: resizeHandleRef,
          class: "resizeHandle"
        }, null, 512),
        createBaseVNode("div", _hoisted_1, [
          createBaseVNode("span", _hoisted_2, [
            createVNode(_component_i_dot, {
              theme: "outline",
              fill: unref(connected) ? "green" : "red"
            }, null, 8, ["fill"]),
            createTextVNode(" " + toDisplayString(props.title), 1)
          ]),
          createBaseVNode("div", _hoisted_3, [
            createVNode(_component_i_click_to_fold, {
              size: "18",
              onClick: _cache[0] || (_cache[0] = withModifiers(($event) => emit("close"), ["stop"]))
            })
          ])
        ]),
        withDirectives((openBlock(), createElementBlock("div", _hoisted_4, [
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
            disabled: unref(status) === "pending" || unref(status) === "streaming" || !unref(connected),
            modelValue: unref(inputValue),
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef(inputValue) ? inputValue.value = $event : null),
            loading: unref(status) === "pending" || unref(status) === "streaming",
            placeholder: _ctx.$t("workbench.production.chatBox.inputPlaceholder"),
            onSend: handleSend,
            onStop: handleStop
          }, {
            "footer-prefix": withCtx(() => [
              createBaseVNode("div", _hoisted_5, [
                createVNode(_component_t_popup, {
                  trigger: "click",
                  placement: "top-left"
                }, {
                  content: withCtx(() => [
                    createBaseVNode("div", _hoisted_6, [
                      createBaseVNode("div", {
                        class: "settingMenuItem",
                        onClick: _cache[1] || (_cache[1] = ($event) => handleReconnect())
                      }, [
                        createVNode(_component_i_api, { size: "14" }),
                        createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.scriptAgent.reconnect")), 1)
                      ]),
                      createBaseVNode("div", {
                        class: "settingMenuItem",
                        onClick: _cache[2] || (_cache[2] = ($event) => handleClearMemory("message"))
                      }, [
                        createVNode(_component_i_delete, { size: "14" }),
                        createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.production.chatBox.clearMessageMemory")), 1)
                      ]),
                      createBaseVNode("div", {
                        class: "settingMenuItem",
                        onClick: _cache[3] || (_cache[3] = ($event) => handleClearMemory("summary"))
                      }, [
                        createVNode(_component_i_close, { size: "14" }),
                        createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.production.chatBox.clearSummaryMemory")), 1)
                      ]),
                      createBaseVNode("div", {
                        class: "settingMenuItem danger",
                        onClick: _cache[4] || (_cache[4] = ($event) => handleClearMemory("all"))
                      }, [
                        createVNode(_component_i_delete_one, { size: "14" }),
                        createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.production.chatBox.clearAllMemory")), 1)
                      ])
                    ])
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_t_button, {
                      shape: "square",
                      variant: "outline",
                      size: "small"
                    }, {
                      icon: withCtx(() => [
                        createVNode(_component_i_setting_config, { size: "16" })
                      ]),
                      _: 1
                    })
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
                          onClick: ($event) => unref(useProductionAgentStore)().updateThinkConfig(opt.value)
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
                      theme: ["default", "success", "warning", "danger"][unref(thinkLevel)] || "default"
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
              ])
            ]),
            _: 1
          }, 8, ["disabled", "modelValue", "loading", "placeholder"])
        ])), [
          [_directive_loading, unref(loadingHistory)]
        ])
      ], 4);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-42ab193c"]]);

export { index as default };

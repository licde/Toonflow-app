import { _ as __unplugin_components_0 } from './modelSelect-CP2wRMzT.js';
import { p as providersLogo, m as modelProviderRules } from './providersLogo-BCbaFq8_.js';
import { i as instance } from './axios-BzO0kuq-.js';
import { s as settingStore, _ as _export_sfc } from './index-BvNjvLGR.js';
import { l as defineComponent, bM as storeToRefs, w as watch, o as onMounted, b2 as resolveComponent, a7 as resolveDirective, E as withDirectives, a1 as unref, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, j as createVNode, b0 as toDisplayString, aM as withCtx, a$ as createTextVNode, av as isRef, aS as createBlock, aT as createCommentVNode, F as Fragment, aP as renderList, r as ref, k as reactive } from './vue-vendor-Cj7sXJnb.js';
import { B as Button, ai as Radio, af as RadioGroup, ae as Avatar, X as Tag, H as Form, J as FormItem, ac as InputNumber, ag as RadioButton, E as Dialog, K as Select, O as Option, Y as Card } from './tdesign-C157N6jJ.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "aiConfog" };
const _hoisted_2 = { class: "banner" };
const _hoisted_3 = { class: "content f ac jb" };
const _hoisted_4 = { class: "textContent ac" };
const _hoisted_5 = { class: "btnList f w" };
const _hoisted_6 = { class: "modeRadioGroup ac jb" };
const _hoisted_7 = {
  key: 0,
  class: "cardGrid"
};
const _hoisted_8 = { class: "skillCardHeader" };
const _hoisted_9 = { class: "headerLeft" };
const _hoisted_10 = { class: "skillName" };
const _hoisted_11 = { class: "skillCardBody" };
const _hoisted_12 = {
  key: 1,
  class: "cardGrid"
};
const _hoisted_13 = { class: "skillCardHeader" };
const _hoisted_14 = { class: "headerLeft" };
const _hoisted_15 = { class: "skillName" };
const _hoisted_16 = { class: "skillCardBody jb" };
const _hoisted_17 = { class: "dialogContent" };
const _hoisted_18 = { class: "maxTokenRow" };
const _hoisted_19 = {
  key: 1,
  class: "autoHint"
};
const _hoisted_20 = { class: "dialogContent" };
const _hoisted_21 = { class: "maxTokenRow" };
const _hoisted_22 = {
  key: 1,
  class: "autoHint"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "agentConfog",
  setup(__props) {
    const { isElectron } = storeToRefs(settingStore());
    const modelData = ref([]);
    const modelDataShow = ref(false);
    const currentItem = ref(null);
    const selectValue = ref("");
    const selectLabel = ref("");
    function getProviderLogo(manufacturer) {
      if (!manufacturer) return null;
      const key = Object.keys(providersLogo).find((k) => k.toLowerCase() === manufacturer.toLowerCase());
      return key ? providersLogo[key] : null;
    }
    function inferProviderByModel(modelName, model) {
      const source = `${modelName || ""} ${model || ""}`.trim();
      if (!source) return null;
      const matchedRule = modelProviderRules.find((rule) => rule.pattern.test(source));
      return matchedRule ? providersLogo[matchedRule.provider] : null;
    }
    function getDisplayLogo(item) {
      return getProviderLogo(item.icon) || inferProviderByModel(item.modelName, item.model);
    }
    function getFallbackText(name) {
      return name?.slice(0, 1) || "A";
    }
    const type = ref("");
    const maxTokenMode = ref("auto");
    watch(maxTokenMode, (val) => {
      if (val === "auto" && currentItem.value) {
        currentItem.value.maxOutputTokens = 0;
      }
      if (val === "manual" && currentItem.value && (currentItem.value.maxOutputTokens === 0 || currentItem.value.maxOutputTokens == null)) {
        currentItem.value.maxOutputTokens = 8192;
      }
    });
    function startConfig(item, source) {
      if (item.disabled) return window.$message.warning($t("settings.agent.msg.notAvailable"));
      currentItem.value = item;
      selectValue.value = item.modelName || "";
      selectLabel.value = item.model || "";
      maxTokenMode.value = item.maxOutputTokens === 0 || item.maxOutputTokens == null ? "auto" : "manual";
      modelDataShow.value = true;
      type.value = source;
    }
    const currentVendorId = ref(null);
    function confirmConfig() {
      if (currentItem.value) {
        currentItem.value.model = selectLabel.value;
        currentItem.value.modelName = selectValue.value;
        currentItem.value.vendorId = currentVendorId.value;
      }
      const data = {
        id: currentItem.value?.id,
        name: currentItem.value?.name,
        model: selectLabel.value || selectValue.value.split(/:(.+)/)[1] || currentItem.value?.model,
        modelName: currentItem.value?.modelName,
        vendorId: selectValue.value.split(/:(.+)/)[0],
        desc: currentItem.value?.desc,
        temperature: currentItem.value?.temperature ?? 1,
        maxOutputTokens: currentItem.value?.maxOutputTokens ?? 0
      };
      instance.post("/setting/agentDeploy/updateAgentModel", data).then(() => {
        window.$message.success($t("settings.agent.msg.configSuccess"));
        getAgentDeploy();
      }).catch((err) => {
        window.$message.error(`${$t("settings.agent.msg.updateConfigFailed")}${err.message}`);
      }).finally(() => {
        modelDataShow.value = false;
      });
    }
    const loading = ref(false);
    function getAgentDeploy() {
      instance.post("/setting/agentDeploy/getAgentDeploy").then((res) => {
        modelData.value = res.data.qrdinaryData;
        advancedModelData.value = res.data.advancedData;
      }).catch((err) => {
        window.$message.error(`${$t("settings.agent.msg.getAgentListFailed")}${err.message}`);
      }).finally(() => {
      });
    }
    onMounted(() => {
      getAgentDeploy();
    });
    const advancedModelData = ref([]);
    const agentUseModeVal = ref("0");
    const batchDialogVisible = ref(false);
    const batchSelectedIds = ref([]);
    const batchApplyToAll = ref(false);
    const batchSelectedRaw = ref([]);
    const batchModelValues = reactive({});
    const batchModelLabels = reactive({});
    const batchGlobalModel = ref("");
    const batchGlobalLabel = ref("");
    const batchSettings = ref({ temperature: 1, maxOutputTokens: 0 });
    const batchMaxTokenMode = ref("auto");
    const batchLoading = ref(false);
    watch(batchMaxTokenMode, (val) => {
      if (val === "auto") {
        batchSettings.value.maxOutputTokens = 0;
      }
      if (val === "manual" && (batchSettings.value.maxOutputTokens === 0 || batchSettings.value.maxOutputTokens == null)) {
        batchSettings.value.maxOutputTokens = 8192;
      }
    });
    watch(batchApplyToAll, (val) => {
      if (val) batchSelectedIds.value = [];
    });
    function onBatchAgentsChange(value) {
      const val = Array.isArray(value) ? value : value == null ? [] : [value];
      if (!val || val.length === 0) {
        batchSelectedIds.value = [];
        batchApplyToAll.value = false;
        return;
      }
      if (val.includes("全部")) {
        batchApplyToAll.value = true;
        batchSelectedIds.value = advancedModelData.value.map((m) => m.id);
        batchSelectedRaw.value = ["全部"];
      } else {
        batchApplyToAll.value = false;
        batchSelectedIds.value = val.filter((v) => v !== "全部").map((v) => Number(v));
      }
    }
    async function applyBatchSettings() {
      const targetIds = batchApplyToAll.value ? advancedModelData.value.map((m) => m.id) : batchSelectedIds.value;
      if (!targetIds || targetIds.length === 0) {
        return window.$message.warning("请选择要设置的模型");
      }
      batchLoading.value = true;
      const items = targetIds.map((id) => {
        const item = advancedModelData.value.find((m) => m.id === id);
        if (!item) return null;
        const selectedValue = batchGlobalModel.value || item.modelName;
        const selectedLabel = batchGlobalLabel.value || item.model;
        const vendorId = selectedValue ? String(selectedValue).split(/:(.+)/)[0] : item.vendorId ?? "";
        const modelVal = selectedLabel || (selectedValue ? String(selectedValue).split(/:(.+)/)[1] : "") || item.model;
        return {
          id: item.id,
          name: item.name,
          model: modelVal,
          modelName: selectedValue || item.modelName,
          vendorId,
          desc: item.desc,
          temperature: batchSettings.value.temperature ?? 1,
          maxOutputTokens: batchMaxTokenMode.value === "auto" ? 0 : batchSettings.value.maxOutputTokens ?? 0
        };
      }).filter(Boolean);
      try {
        await instance.post("/setting/agentDeploy/deployAgentModel", { items });
        window.$message.success($t("settings.agent.msg.configSuccess"));
        getAgentDeploy();
        batchDialogVisible.value = false;
      } catch (err) {
        window.$message.error(`${$t("settings.agent.msg.updateConfigFailed")}${err.message ?? ""}`);
      } finally {
        batchLoading.value = false;
      }
    }
    async function getUseModeVal() {
      const { data } = await instance.get("/setting/agentDeploy/getAgentUseMode");
      agentUseModeVal.value = data;
    }
    async function updateUseMode(val) {
      await instance.post("/setting/agentDeploy/updateUseMode", {
        agentUseMode: val
      });
    }
    function onUseModeChange(val) {
      updateUseMode(String(val));
    }
    function batchSetting() {
      batchSelectedIds.value = [];
      batchApplyToAll.value = false;
      batchSelectedRaw.value = [];
      if (advancedModelData.value && advancedModelData.value.length) {
        const first = advancedModelData.value[0];
        batchSettings.value.temperature = first.temperature ?? 1;
        batchSettings.value.maxOutputTokens = first.maxOutputTokens ?? 0;
        batchMaxTokenMode.value = batchSettings.value.maxOutputTokens === 0 ? "auto" : "manual";
        advancedModelData.value.forEach((it) => {
          batchModelValues[it.id] = it.modelName ?? "";
          batchModelLabels[it.id] = it.model ?? "";
        });
        batchGlobalModel.value = first.modelName ?? "";
        batchGlobalLabel.value = first.model ?? "";
      } else {
        batchSettings.value.temperature = 1;
        batchSettings.value.maxOutputTokens = 0;
        batchMaxTokenMode.value = "auto";
      }
      batchDialogVisible.value = true;
    }
    onMounted(() => {
      getUseModeVal();
    });
    async function jumpToWebsite() {
      if (isElectron.value) {
        await fetch(`toonflow://openurlwithbrowser?url=https://platform.deepseek.com`);
      } else {
        window.open("https://platform.deepseek.com", "_blank");
      }
    }
    return (_ctx, _cache) => {
      const _component_i_good_two = resolveComponent("i-good-two");
      const _component_i_share = resolveComponent("i-share");
      const _component_t_button = Button;
      const _component_t_radio = Radio;
      const _component_t_radio_group = RadioGroup;
      const _component_t_avatar = Avatar;
      const _component_t_tag = Tag;
      const _component_t_card = Card;
      const _component_t_form_item = FormItem;
      const _component_t_input_number = InputNumber;
      const _component_t_radio_button = RadioButton;
      const _component_t_form = Form;
      const _component_t_dialog = Dialog;
      const _component_t_option = Option;
      const _component_t_select = Select;
      const _directive_loading = resolveDirective("loading");
      return withDirectives((openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("div", _hoisted_4, [
              createVNode(_component_i_good_two, {
                class: "icon",
                theme: "filled",
                size: "24",
                fill: "currentColor"
              }),
              createBaseVNode("span", null, toDisplayString(_ctx.$t("settings.agent.bannerDesc")), 1)
            ]),
            createBaseVNode("div", _hoisted_5, [
              createVNode(_component_t_button, { onClick: jumpToWebsite }, {
                suffix: withCtx(() => [
                  createVNode(_component_i_share, { theme: "outline" })
                ]),
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("settings.agent.visitWebsite")) + " ", 1)
                ]),
                _: 1
              })
            ])
          ])
        ]),
        createBaseVNode("div", _hoisted_6, [
          createVNode(_component_t_radio_group, {
            modelValue: unref(agentUseModeVal),
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(agentUseModeVal) ? agentUseModeVal.value = $event : null),
            variant: "default-filled",
            onChange: onUseModeChange
          }, {
            default: withCtx(() => [
              createVNode(_component_t_radio, { value: "0" }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("settings.agent.ordinary")), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_radio, { value: "1" }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("settings.agent.advanced")), 1)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          unref(agentUseModeVal) == "1" ? (openBlock(), createBlock(_component_t_button, {
            key: 0,
            theme: "primary",
            onClick: batchSetting
          }, {
            default: withCtx(() => [..._cache[14] || (_cache[14] = [
              createTextVNode("批量设置", -1)
            ])]),
            _: 1
          })) : createCommentVNode("", true)
        ]),
        unref(agentUseModeVal) === "0" ? (openBlock(), createElementBlock("div", _hoisted_7, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(modelData), (item, index) => {
            return openBlock(), createBlock(_component_t_card, {
              hoverShadow: "",
              key: index,
              class: "skillCard f",
              onClick: ($event) => startConfig(item, "普通")
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_8, [
                  createBaseVNode("div", _hoisted_9, [
                    getDisplayLogo(item) ? (openBlock(), createBlock(_component_t_avatar, {
                      key: 0,
                      image: getDisplayLogo(item),
                      shape: "round"
                    }, null, 8, ["image"])) : (openBlock(), createBlock(_component_t_avatar, {
                      key: 1,
                      shape: "round",
                      class: "fallbackAvatar"
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(getFallbackText(item.name)), 1)
                      ]),
                      _: 2
                    }, 1024)),
                    createBaseVNode("span", _hoisted_10, toDisplayString(item.name), 1)
                  ]),
                  item.model && !item.disabled ? (openBlock(), createBlock(_component_t_tag, {
                    key: 0,
                    theme: "primary",
                    variant: "light",
                    size: "small"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(item.model), 1)
                    ]),
                    _: 2
                  }, 1024)) : item.disabled ? (openBlock(), createBlock(_component_t_tag, {
                    key: 1,
                    variant: "light",
                    size: "small"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("settings.agent.notOpen")), 1)
                    ]),
                    _: 1
                  })) : !item.disabled && !item.model ? (openBlock(), createBlock(_component_t_tag, {
                    key: 2,
                    theme: "warning",
                    variant: "light",
                    size: "small"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("settings.agent.notConfigured")), 1)
                    ]),
                    _: 1
                  })) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_11, toDisplayString(item.desc), 1)
              ]),
              _: 2
            }, 1032, ["onClick"]);
          }), 128))
        ])) : (openBlock(), createElementBlock("div", _hoisted_12, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(advancedModelData), (item, index) => {
            return openBlock(), createBlock(_component_t_card, {
              hoverShadow: "",
              key: index,
              class: "skillCard f",
              onClick: ($event) => startConfig(item, "高级")
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_13, [
                  createBaseVNode("div", _hoisted_14, [
                    getDisplayLogo(item) ? (openBlock(), createBlock(_component_t_avatar, {
                      key: 0,
                      image: getDisplayLogo(item),
                      shape: "round"
                    }, null, 8, ["image"])) : (openBlock(), createBlock(_component_t_avatar, {
                      key: 1,
                      shape: "round",
                      class: "fallbackAvatar"
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(getFallbackText(item.name)), 1)
                      ]),
                      _: 2
                    }, 1024)),
                    createBaseVNode("div", null, [
                      createBaseVNode("div", _hoisted_15, toDisplayString(item.name), 1)
                    ])
                  ]),
                  item.model && !item.disabled ? (openBlock(), createBlock(_component_t_tag, {
                    key: 0,
                    theme: "primary",
                    variant: "light",
                    size: "small"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(item.model), 1)
                    ]),
                    _: 2
                  }, 1024)) : item.disabled ? (openBlock(), createBlock(_component_t_tag, {
                    key: 1,
                    variant: "light",
                    size: "small"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("settings.agent.notOpen")), 1)
                    ]),
                    _: 1
                  })) : !item.disabled && !item.model ? (openBlock(), createBlock(_component_t_tag, {
                    key: 2,
                    theme: "warning",
                    variant: "light",
                    size: "small"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("settings.agent.notConfigured")), 1)
                    ]),
                    _: 1
                  })) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_16, [
                  createBaseVNode("div", null, toDisplayString(item.desc), 1),
                  createBaseVNode("div", null, [
                    createVNode(_component_t_tag, {
                      theme: "primary",
                      variant: "light",
                      size: "small",
                      style: { "margin-left": "5px" }
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("settings.agent.temperature")) + "：" + toDisplayString(item.temperature), 1)
                      ]),
                      _: 2
                    }, 1024),
                    createVNode(_component_t_tag, {
                      theme: item.maxOutputTokens === 0 ? "success" : "primary",
                      variant: "light",
                      size: "small",
                      style: { "margin-left": "5px" }
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("settings.agent.maxOutputTokens")) + "：" + toDisplayString(item.maxOutputTokens === 0 ? _ctx.$t("settings.agent.auto") : item.maxOutputTokens), 1)
                      ]),
                      _: 2
                    }, 1032, ["theme"])
                  ])
                ])
              ]),
              _: 2
            }, 1032, ["onClick"]);
          }), 128))
        ])),
        createVNode(_component_t_dialog, {
          visible: unref(modelDataShow),
          "onUpdate:visible": _cache[6] || (_cache[6] = ($event) => isRef(modelDataShow) ? modelDataShow.value = $event : null),
          header: unref(currentItem)?.name + " " + _ctx.$t("settings.agent.modelConfig"),
          width: "480px",
          "on-confirm": confirmConfig,
          "confirm-btn": _ctx.$t("settings.agent.confirm"),
          "cancel-btn": _ctx.$t("settings.agent.cancel")
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_17, [
              unref(currentItem) ? (openBlock(), createBlock(_component_t_form, {
                key: 0,
                "label-align": "top",
                "label-width": 70
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.agent.selectModel")
                  }, {
                    default: withCtx(() => [
                      createVNode(__unplugin_components_0, {
                        modelValue: unref(selectValue),
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(selectValue) ? selectValue.value = $event : null),
                        label: unref(selectLabel),
                        "onUpdate:label": _cache[2] || (_cache[2] = ($event) => isRef(selectLabel) ? selectLabel.value = $event : null),
                        type: "text"
                      }, null, 8, ["modelValue", "label"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  unref(type) == "高级" ? (openBlock(), createBlock(_component_t_form_item, {
                    key: 0,
                    label: _ctx.$t("settings.agent.temperature")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_input_number, {
                        modelValue: unref(currentItem).temperature,
                        "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => unref(currentItem).temperature = $event),
                        style: { "width": "100%" }
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"])) : createCommentVNode("", true),
                  unref(type) == "高级" ? (openBlock(), createBlock(_component_t_form_item, {
                    key: 1,
                    label: _ctx.$t("settings.agent.maxOutputTokens")
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_18, [
                        createVNode(_component_t_radio_group, {
                          modelValue: unref(maxTokenMode),
                          "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => isRef(maxTokenMode) ? maxTokenMode.value = $event : null),
                          variant: "default-filled",
                          size: "small"
                        }, {
                          default: withCtx(() => [
                            createVNode(_component_t_radio_button, { value: "auto" }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(_ctx.$t("settings.agent.auto")), 1)
                              ]),
                              _: 1
                            }),
                            createVNode(_component_t_radio_button, { value: "manual" }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(_ctx.$t("settings.agent.manual")), 1)
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        unref(maxTokenMode) === "manual" ? (openBlock(), createBlock(_component_t_input_number, {
                          key: 0,
                          modelValue: unref(currentItem).maxOutputTokens,
                          "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => unref(currentItem).maxOutputTokens = $event),
                          min: 1,
                          theme: "normal",
                          style: { "flex": "1", "margin-left": "12px" }
                        }, null, 8, ["modelValue"])) : (openBlock(), createElementBlock("span", _hoisted_19, toDisplayString(_ctx.$t("settings.agent.autoHint")), 1))
                      ])
                    ]),
                    _: 1
                  }, 8, ["label"])) : createCommentVNode("", true)
                ]),
                _: 1
              })) : createCommentVNode("", true)
            ])
          ]),
          _: 1
        }, 8, ["visible", "header", "confirm-btn", "cancel-btn"]),
        createVNode(_component_t_dialog, {
          visible: unref(batchDialogVisible),
          "onUpdate:visible": _cache[13] || (_cache[13] = ($event) => isRef(batchDialogVisible) ? batchDialogVisible.value = $event : null),
          header: "批量设置（高级）",
          width: "640px",
          "on-confirm": applyBatchSettings,
          "confirm-btn": _ctx.$t("settings.agent.confirm"),
          "cancel-btn": _ctx.$t("settings.agent.cancel"),
          loading: unref(batchLoading)
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_20, [
              createVNode(_component_t_form, { "label-align": "top" }, {
                default: withCtx(() => [
                  createVNode(_component_t_form_item, { label: "选择agent" }, {
                    default: withCtx(() => [
                      createVNode(_component_t_select, {
                        multiple: "",
                        modelValue: unref(batchSelectedRaw),
                        "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => isRef(batchSelectedRaw) ? batchSelectedRaw.value = $event : null),
                        onChange: onBatchAgentsChange,
                        placeholder: "请选择"
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_t_option, { value: "全部" }, {
                            default: withCtx(() => [..._cache[15] || (_cache[15] = [
                              createTextVNode("全部", -1)
                            ])]),
                            _: 1
                          }),
                          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(advancedModelData), (item) => {
                            return openBlock(), createBlock(_component_t_option, {
                              key: item.id,
                              value: item.id,
                              label: item.name
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(item.name), 1)
                              ]),
                              _: 2
                            }, 1032, ["value", "label"]);
                          }), 128))
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ]),
                    _: 1
                  }),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.agent.selectModel")
                  }, {
                    default: withCtx(() => [
                      createVNode(__unplugin_components_0, {
                        modelValue: unref(batchGlobalModel),
                        "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => isRef(batchGlobalModel) ? batchGlobalModel.value = $event : null),
                        label: unref(batchGlobalLabel),
                        "onUpdate:label": _cache[9] || (_cache[9] = ($event) => isRef(batchGlobalLabel) ? batchGlobalLabel.value = $event : null),
                        type: "text"
                      }, null, 8, ["modelValue", "label"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.agent.temperature")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_input_number, {
                        modelValue: unref(batchSettings).temperature,
                        "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => unref(batchSettings).temperature = $event),
                        style: { "width": "100%" }
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.agent.maxOutputTokens")
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_21, [
                        createVNode(_component_t_radio_group, {
                          modelValue: unref(batchMaxTokenMode),
                          "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => isRef(batchMaxTokenMode) ? batchMaxTokenMode.value = $event : null),
                          variant: "default-filled",
                          size: "small"
                        }, {
                          default: withCtx(() => [
                            createVNode(_component_t_radio_button, { value: "auto" }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(_ctx.$t("settings.agent.auto")), 1)
                              ]),
                              _: 1
                            }),
                            createVNode(_component_t_radio_button, { value: "manual" }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(_ctx.$t("settings.agent.manual")), 1)
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        }, 8, ["modelValue"]),
                        unref(batchMaxTokenMode) === "manual" ? (openBlock(), createBlock(_component_t_input_number, {
                          key: 0,
                          modelValue: unref(batchSettings).maxOutputTokens,
                          "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => unref(batchSettings).maxOutputTokens = $event),
                          min: 1,
                          theme: "normal",
                          style: { "flex": "1", "margin-left": "12px" }
                        }, null, 8, ["modelValue"])) : (openBlock(), createElementBlock("span", _hoisted_22, toDisplayString(_ctx.$t("settings.agent.autoHint")), 1))
                      ])
                    ]),
                    _: 1
                  }, 8, ["label"])
                ]),
                _: 1
              })
            ])
          ]),
          _: 1
        }, 8, ["visible", "confirm-btn", "cancel-btn", "loading"])
      ])), [
        [_directive_loading, unref(loading)]
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

/* unplugin-vue-components disabled */

const agentConfog = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-11fb8c67"]]);

export { agentConfog as default };

import { l as defineComponent, bU as useModel, o as onMounted, aK as openBlock, aS as createBlock, aM as withCtx, aL as createElementBlock, F as Fragment, aP as renderList, aO as createBaseVNode, a$ as createTextVNode, b0 as toDisplayString, a1 as unref, j as createVNode, bH as withModifiers, bV as mergeModels, r as ref } from './vue-vendor-Byo5TD6r.js';
import { m as modelProviderRules, p as providersLogo } from './providersLogo-BCbaFq8_.js';
import { s as settingStore, _ as _export_sfc } from './index-Iu-bOXAU.js';
import { i as instance } from './axios-mQi6SvTz.js';
import { ad as OptionGroup, O as Option, ae as Avatar, B as Button, K as Select } from './tdesign-CfL1pweZ.js';

const _hoisted_1 = { class: "optionItem" };
const _hoisted_2 = { class: "optionMain" };
const _hoisted_3 = { class: "optionLabel" };
const _hoisted_4 = { class: "optionType" };
const _hoisted_5 = { class: "emptyActionWrap" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "modelSelect",
  props: /* @__PURE__ */ mergeModels({
    type: {
      type: String,
      default: "all"
    },
    size: {
      type: String,
      default: "medium"
    },
    placeholder: {
      type: String
    },
    changeConfig: {
      type: Boolean,
      default: false
    }
  }, {
    "modelValue": {
      type: String,
      default: ""
    },
    "modelModifiers": {},
    "label": {},
    "labelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["change"], ["update:modelValue", "update:label"]),
  setup(__props, { emit: __emit }) {
    const selectValue = useModel(__props, "modelValue");
    const selectValueLabel = useModel(__props, "label");
    const props = __props;
    const emit = __emit;
    async function onChange(value, { option }) {
      selectValue.value = value;
      selectValueLabel.value = option.label;
      if (props.changeConfig) {
        const { data } = await instance.post("/modelSelect/getModelDetail", {
          modelId: value
        });
        emit("change", value, data);
      } else {
        emit("change", value);
      }
    }
    const optionsData = ref([]);
    onMounted(() => {
      handleModelChange();
    });
    function onPopupVisibleChange(visible) {
      if (visible) {
        handleModelChange();
      }
    }
    const titleMap = {
      image: $t("components.modelSelect.type.image"),
      text: $t("components.modelSelect.type.text"),
      video: $t("components.modelSelect.type.video")
    };
    function handleModelChange() {
      instance.post("/modelSelect/getModelList", { type: props.type }).then((response) => {
        const groupMap = /* @__PURE__ */ new Map();
        response.data.forEach((item) => {
          const groupKey = item.id;
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
              group: item.name,
              id: item.id,
              children: []
            });
          }
          groupMap.get(groupKey).children.push({
            id: item.id,
            label: item.label,
            value: item.value,
            vendorId: item.vendorId,
            type: titleMap[item.type]
          });
        });
        optionsData.value = Array.from(groupMap.values());
        if (optionsData.value.map((i) => i.children).flat().every((i) => `${i.id}:${i.value}` !== selectValue.value)) {
          selectValue.value = "";
        }
      }).catch((error) => {
        console.error($t("components.modelSelect.msg.fetchModelFailed"), error);
      });
    }
    function getProviderLogoByModel(label, value) {
      const source = `${label || ""} ${value || ""}`.trim();
      if (!source) return null;
      const matchedRule = modelProviderRules.find((rule) => rule.pattern.test(source));
      return matchedRule ? providersLogo[matchedRule.provider] : null;
    }
    function getFallbackText(label) {
      return label?.slice(0, 1)?.toUpperCase() || "M";
    }
    function goVendorConfig() {
      const store = settingStore();
      store.activeMenu = "vendorConfig";
      store.showSetting = true;
    }
    return (_ctx, _cache) => {
      const _component_t_avatar = Avatar;
      const _component_t_option = Option;
      const _component_t_option_group = OptionGroup;
      const _component_t_button = Button;
      const _component_t_select = Select;
      return openBlock(), createBlock(_component_t_select, {
        size: props.size,
        modelValue: selectValue.value,
        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectValue.value = $event),
        placeholder: props.placeholder ?? _ctx.$t("components.modelSelect.placeholder"),
        onChange,
        onPopupVisibleChange
      }, {
        empty: withCtx(() => [
          createBaseVNode("div", _hoisted_5, [
            createVNode(_component_t_button, {
              class: "emptyActionButton",
              size: "small",
              variant: "text",
              theme: "primary",
              onClick: withModifiers(goVendorConfig, ["stop"])
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(_ctx.$t("components.modelSelect.goSetting")), 1)
              ]),
              _: 1
            })
          ])
        ]),
        default: withCtx(() => [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(optionsData), (list, index) => {
            return openBlock(), createBlock(_component_t_option_group, {
              key: index,
              label: list.group
            }, {
              default: withCtx(() => [
                (openBlock(true), createElementBlock(Fragment, null, renderList(list.children, (item) => {
                  return openBlock(), createBlock(_component_t_option, {
                    key: item.id,
                    value: `${item.id}:${item.value}`,
                    label: item.label
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_1, [
                        createBaseVNode("div", _hoisted_2, [
                          getProviderLogoByModel(item.label, item.value) ? (openBlock(), createBlock(_component_t_avatar, {
                            key: 0,
                            size: "24px",
                            shape: "round",
                            image: getProviderLogoByModel(item.label, item.value)
                          }, null, 8, ["image"])) : (openBlock(), createBlock(_component_t_avatar, {
                            key: 1,
                            size: "24px",
                            shape: "round",
                            class: "fallbackAvatar"
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(getFallbackText(item.label)), 1)
                            ]),
                            _: 2
                          }, 1024)),
                          createBaseVNode("div", _hoisted_3, toDisplayString(item.label), 1)
                        ]),
                        createBaseVNode("span", _hoisted_4, toDisplayString(item.type), 1)
                      ])
                    ]),
                    _: 2
                  }, 1032, ["value", "label"]);
                }), 128))
              ]),
              _: 2
            }, 1032, ["label"]);
          }), 128))
        ]),
        _: 1
      }, 8, ["size", "modelValue", "placeholder"]);
    };
  }
});

/* unplugin-vue-components disabled */

const __unplugin_components_0 = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-3d93a23a"]]);

export { __unplugin_components_0 as _ };

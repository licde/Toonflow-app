import { s as settingStore, _ as _export_sfc } from './index-DsDM6Bax.js';
import { l as defineComponent, bM as storeToRefs, aK as openBlock, aL as createElementBlock, j as createVNode, aM as withCtx, a1 as unref, aO as createBaseVNode, b0 as toDisplayString, a$ as createTextVNode, av as isRef, c as computed } from './vue-vendor-Cj7sXJnb.js';
import { J as FormItem, T as Textarea, B as Button, ac as InputNumber, af as RadioGroup, ag as RadioButton, H as Form } from './tdesign-C157N6jJ.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "otherConfig" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "otherConfig",
  setup(__props) {
    const { otherSetting, canvasWheelEvent } = storeToRefs(settingStore());
    const axiosTimeOutInSeconds = computed({
      get: () => {
        const ms = otherSetting.value.axiosTimeOut;
        if (ms == null || isNaN(ms)) return 600;
        return Math.floor(ms / 1e3);
      },
      set: (val) => {
        if (val == null || isNaN(val)) return;
        otherSetting.value.axiosTimeOut = val * 1e3;
      }
    });
    function setDefaultReg() {
      otherSetting.value.chapterReg = "/第\\s*([0-9０-９零一二三四五六七八九十百千万]+)\\s*[章回节]\\s*([^\\n\\r]*)/g";
    }
    return (_ctx, _cache) => {
      const _component_t_button = Button;
      const _component_t_textarea = Textarea;
      const _component_t_form_item = FormItem;
      const _component_t_input_number = InputNumber;
      const _component_t_radio_button = RadioButton;
      const _component_t_radio_group = RadioGroup;
      const _component_t_form = Form;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_t_form, { "label-align": "top" }, {
          default: withCtx(() => [
            createVNode(_component_t_form_item, { name: "chapterReg" }, {
              label: withCtx(() => [
                createBaseVNode("span", null, toDisplayString(_ctx.$t("settings.other.chapterRegex")), 1),
                createVNode(_component_t_button, {
                  style: { "margin-left": "15px" },
                  onClick: setDefaultReg,
                  size: "small"
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("settings.other.restoreDefault")), 1)
                  ]),
                  _: 1
                })
              ]),
              default: withCtx(() => [
                createVNode(_component_t_textarea, {
                  modelValue: unref(otherSetting).chapterReg,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(otherSetting).chapterReg = $event),
                  placeholder: _ctx.$t("settings.other.regexPlaceholder"),
                  style: { "width": "400px" }
                }, null, 8, ["modelValue", "placeholder"])
              ]),
              _: 1
            }),
            createVNode(_component_t_form_item, {
              label: _ctx.$t("settings.other.requestTimeout"),
              name: "axiosTimeOut"
            }, {
              default: withCtx(() => [
                createVNode(_component_t_input_number, {
                  "auto-width": "",
                  suffix: _ctx.$t("settings.other.seconds"),
                  min: 10,
                  modelValue: axiosTimeOutInSeconds.value,
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => axiosTimeOutInSeconds.value = $event),
                  allowInputOverLimit: false,
                  placeholder: _ctx.$t("settings.other.inputSeconds")
                }, null, 8, ["suffix", "modelValue", "placeholder"])
              ]),
              _: 1
            }, 8, ["label"]),
            createVNode(_component_t_form_item, {
              label: _ctx.$t("settings.other.agentCanvasScalingMethod")
            }, {
              default: withCtx(() => [
                createVNode(_component_t_radio_group, {
                  variant: "default-filled",
                  modelValue: unref(canvasWheelEvent),
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(canvasWheelEvent) ? canvasWheelEvent.value = $event : null)
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_radio_button, { value: "zoom" }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("settings.other.zoom")), 1)
                      ]),
                      _: 1
                    }),
                    createVNode(_component_t_radio_button, { value: "scroll" }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("settings.other.scroll")), 1)
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"])
              ]),
              _: 1
            }, 8, ["label"]),
            createVNode(_component_t_form_item, {
              label: _ctx.$t("settings.other.isInteracting")
            }, {
              default: withCtx(() => [
                createVNode(_component_t_radio_group, {
                  variant: "default-filled",
                  modelValue: unref(otherSetting).interacting,
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => unref(otherSetting).interacting = $event)
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_radio_button, { value: false }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("settings.other.closeIsInteracting")), 1)
                      ]),
                      _: 1
                    }),
                    createVNode(_component_t_radio_button, { value: true }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("settings.other.openIsInteracting")), 1)
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"])
              ]),
              _: 1
            }, 8, ["label"]),
            createVNode(_component_t_form_item, {
              label: _ctx.$t("settings.other.assetConcurrency"),
              name: "assetsBatchGenereateSize"
            }, {
              default: withCtx(() => [
                createVNode(_component_t_input_number, {
                  "auto-width": "",
                  suffix: _ctx.$t("settings.other.count"),
                  min: 1,
                  modelValue: unref(otherSetting).assetsBatchGenereateSize,
                  "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => unref(otherSetting).assetsBatchGenereateSize = $event),
                  allowInputOverLimit: false,
                  placeholder: _ctx.$t("settings.other.inputCount")
                }, null, 8, ["suffix", "modelValue", "placeholder"])
              ]),
              _: 1
            }, 8, ["label"]),
            createVNode(_component_t_form_item, {
              label: _ctx.$t("settings.other.scriptEpisodeLength"),
              name: "scriptEpisodeLength"
            }, {
              default: withCtx(() => [
                createVNode(_component_t_input_number, {
                  "auto-width": "",
                  suffix: _ctx.$t("settings.other.chars"),
                  min: 100,
                  modelValue: unref(otherSetting).scriptEpisodeLength,
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => unref(otherSetting).scriptEpisodeLength = $event),
                  allowInputOverLimit: false,
                  placeholder: _ctx.$t("settings.other.inputChars")
                }, null, 8, ["suffix", "modelValue", "placeholder"])
              ]),
              _: 1
            }, 8, ["label"])
          ]),
          _: 1
        })
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const otherConfig = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-24833da1"]]);

export { otherConfig as default };

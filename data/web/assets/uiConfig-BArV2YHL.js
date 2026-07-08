import { s as settingStore, t as toggleThemeWithTransition, a as applyThemeMode, b as applyThemeColor, _ as _export_sfc } from './index-BvNjvLGR.js';
import { l as defineComponent, bM as storeToRefs, w as watch, aK as openBlock, aL as createElementBlock, j as createVNode, aM as withCtx, a1 as unref, a$ as createTextVNode, aO as createBaseVNode, F as Fragment, aP as renderList, aQ as normalizeStyle, aU as normalizeClass } from './vue-vendor-Cj7sXJnb.js';
import { J as FormItem, af as RadioGroup, ag as RadioButton, ah as ColorPicker, H as Form } from './tdesign-C157N6jJ.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "uiConfig" };
const _hoisted_2 = { class: "themeColorConfig" };
const _hoisted_3 = ["onClick"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "uiConfig",
  setup(__props) {
    const { themeSetting } = storeToRefs(settingStore());
    const presetColors = ["#000000", "#0052D9", "#2BA471", "#ED7B2F", "#E34D59", "#7B61FF", "#111111"];
    const normalizeColor = (value) => {
      const hex = (value || "").trim();
      if (!hex) return "#0052D9";
      const normalized = hex.startsWith("#") ? hex : `#${hex}`;
      const match = /^#[0-9a-fA-F]{6}$/.test(normalized);
      return match ? normalized.toUpperCase() : "#0052D9";
    };
    watch(
      () => themeSetting.value.mode,
      (mode) => {
        toggleThemeWithTransition(void 0, () => {
          applyThemeMode(mode);
          applyThemeColor(normalizeColor(themeSetting.value.primaryColor));
        });
      }
    );
    const applyFontSize = (size) => {
      document.documentElement.style.fontSize = `${size}px`;
    };
    applyFontSize(themeSetting.value.fontSize);
    watch(
      () => themeSetting.value.fontSize,
      (size) => applyFontSize(size)
    );
    watch(
      () => themeSetting.value.primaryColor,
      (color) => {
        const normalized = normalizeColor(color);
        if (normalized !== color) {
          themeSetting.value.primaryColor = normalized;
          return;
        }
        applyThemeColor(normalized);
      }
    );
    return (_ctx, _cache) => {
      const _component_t_radio_button = RadioButton;
      const _component_t_radio_group = RadioGroup;
      const _component_t_form_item = FormItem;
      const _component_t_color_picker = ColorPicker;
      const _component_t_form = Form;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_t_form, { labelAlign: "top" }, {
          default: withCtx(() => [
            createVNode(_component_t_form_item, { label: "颜色模式" }, {
              default: withCtx(() => [
                createVNode(_component_t_radio_group, {
                  variant: "default-filled",
                  modelValue: unref(themeSetting).mode,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(themeSetting).mode = $event)
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_radio_button, { value: "auto" }, {
                      default: withCtx(() => [..._cache[3] || (_cache[3] = [
                        createTextVNode("自动", -1)
                      ])]),
                      _: 1
                    }),
                    createVNode(_component_t_radio_button, { value: "light" }, {
                      default: withCtx(() => [..._cache[4] || (_cache[4] = [
                        createTextVNode("浅色", -1)
                      ])]),
                      _: 1
                    }),
                    createVNode(_component_t_radio_button, { value: "dark" }, {
                      default: withCtx(() => [..._cache[5] || (_cache[5] = [
                        createTextVNode("深色", -1)
                      ])]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"])
              ]),
              _: 1
            }),
            createVNode(_component_t_form_item, { label: "主题色" }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_2, [
                  (openBlock(), createElementBlock(Fragment, null, renderList(presetColors, (color) => {
                    return createBaseVNode("button", {
                      key: color,
                      class: normalizeClass(["presetColor", { active: normalizeColor(unref(themeSetting).primaryColor) === color }]),
                      style: normalizeStyle({ backgroundColor: color }),
                      type: "button",
                      onClick: ($event) => unref(themeSetting).primaryColor = color
                    }, null, 14, _hoisted_3);
                  }), 64)),
                  createVNode(_component_t_color_picker, {
                    modelValue: unref(themeSetting).primaryColor,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(themeSetting).primaryColor = $event),
                    "color-modes": ["monochrome"],
                    format: "HEX",
                    "enable-alpha": false
                  }, null, 8, ["modelValue"])
                ])
              ]),
              _: 1
            }),
            createVNode(_component_t_form_item, { label: "字体大小" }, {
              default: withCtx(() => [
                createVNode(_component_t_radio_group, {
                  variant: "default-filled",
                  modelValue: unref(themeSetting).fontSize,
                  "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(themeSetting).fontSize = $event)
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_radio_button, { value: 12 }, {
                      default: withCtx(() => [..._cache[6] || (_cache[6] = [
                        createTextVNode("极小", -1)
                      ])]),
                      _: 1
                    }),
                    createVNode(_component_t_radio_button, { value: 13 }, {
                      default: withCtx(() => [..._cache[7] || (_cache[7] = [
                        createTextVNode("较小", -1)
                      ])]),
                      _: 1
                    }),
                    createVNode(_component_t_radio_button, { value: 14 }, {
                      default: withCtx(() => [..._cache[8] || (_cache[8] = [
                        createTextVNode("小", -1)
                      ])]),
                      _: 1
                    }),
                    createVNode(_component_t_radio_button, { value: 16 }, {
                      default: withCtx(() => [..._cache[9] || (_cache[9] = [
                        createTextVNode("默认", -1)
                      ])]),
                      _: 1
                    }),
                    createVNode(_component_t_radio_button, { value: 18 }, {
                      default: withCtx(() => [..._cache[10] || (_cache[10] = [
                        createTextVNode("大", -1)
                      ])]),
                      _: 1
                    }),
                    createVNode(_component_t_radio_button, { value: 20 }, {
                      default: withCtx(() => [..._cache[11] || (_cache[11] = [
                        createTextVNode("较大", -1)
                      ])]),
                      _: 1
                    }),
                    createVNode(_component_t_radio_button, { value: 22 }, {
                      default: withCtx(() => [..._cache[12] || (_cache[12] = [
                        createTextVNode("极大", -1)
                      ])]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["modelValue"])
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const uiConfig = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-92d133b2"]]);

export { uiConfig as default };

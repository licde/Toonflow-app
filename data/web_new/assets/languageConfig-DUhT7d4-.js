import { u as useI18n } from './i18n-C05S5xzz.js';
import { c as cachedLocale, l as languageList, d as switchLocale, _ as _export_sfc } from './index-CYEzD5Ot.js';
import { I as Icon } from './tdesign-CfL1pweZ.js';
import { l as defineComponent, r as ref, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, b0 as toDisplayString, F as Fragment, aP as renderList, aU as normalizeClass, a1 as unref, aS as createBlock, aT as createCommentVNode } from './vue-vendor-Byo5TD6r.js';
import './markdown-CDQfeHxT.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "languageConfig" };
const _hoisted_2 = { class: "sectionDesc" };
const _hoisted_3 = { class: "langGrid" };
const _hoisted_4 = ["onClick"];
const _hoisted_5 = { class: "langInfo" };
const _hoisted_6 = { class: "langName" };
const _hoisted_7 = { class: "langNative" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "languageConfig",
  setup(__props) {
    const selectedLang = ref(cachedLocale.value ?? "zh-CN");
    const { locale } = useI18n();
    async function selectLang(val) {
      await switchLocale(val);
      locale.value = val;
      selectedLang.value = val;
      window.$message?.success($t("settings.language.msg.saved"));
    }
    return (_ctx, _cache) => {
      const _component_t_icon = Icon;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("p", _hoisted_2, toDisplayString(_ctx.$t("settings.language.desc")), 1),
        createBaseVNode("div", _hoisted_3, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(languageList), (item) => {
            return openBlock(), createElementBlock("div", {
              key: item.value,
              class: normalizeClass(["langCard", { active: unref(selectedLang) === item.value }]),
              onClick: ($event) => selectLang(item.value)
            }, [
              createBaseVNode("div", _hoisted_5, [
                createBaseVNode("div", _hoisted_6, toDisplayString(item.label), 1),
                createBaseVNode("div", _hoisted_7, toDisplayString(item.tips), 1)
              ]),
              unref(selectedLang) === item.value ? (openBlock(), createBlock(_component_t_icon, {
                key: 0,
                name: "check-circle-filled",
                class: "checkIcon"
              })) : createCommentVNode("", true)
            ], 10, _hoisted_4);
          }), 128))
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const languageConfig = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-4b4faadc"]]);

export { languageConfig as default };

import { s as settingStore, _ as _export_sfc } from './index-DkAIKrBP.js';
import { i as instance } from './axios-BX4BN6mO.js';
import { l as defineComponent, bM as storeToRefs, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, a1 as unref, aS as createBlock, aM as withCtx, aO as createBaseVNode, F as Fragment, aP as renderList, b0 as toDisplayString, j as createVNode, a$ as createTextVNode } from './vue-vendor-Byo5TD6r.js';
import { B as Button, Y as Card, a4 as Empty } from './tdesign-CfL1pweZ.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "fileManagement" };
const _hoisted_2 = { class: "folderList" };
const _hoisted_3 = { class: "folderInfo" };
const _hoisted_4 = { class: "folderName" };
const _hoisted_5 = { class: "folderDesc" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "fileManagement",
  setup(__props) {
    const { isElectron } = storeToRefs(settingStore());
    const folderList = [
      { label: "settings.file.folders.data", path: "", desc: "settings.file.folders.dataDesc" },
      { label: "settings.file.folders.logs", path: "logs", desc: "settings.file.folders.logsDesc" },
      { label: "settings.file.folders.oss", path: "oss", desc: "settings.file.folders.ossDesc" },
      { label: "settings.file.folders.skills", path: "skills", desc: "settings.file.folders.skillsDesc" },
      { label: "settings.file.folders.models", path: "models", desc: "settings.file.folders.modelsDesc" },
      { label: "settings.file.folders.web", path: "web", desc: "settings.file.folders.webDesc" },
      { label: "settings.file.folders.serve", path: "serve", desc: "settings.file.folders.serveDesc" },
      { label: "settings.file.folders.vendor", path: "vendor", desc: "settings.file.folders.vendorDesc" }
    ];
    const handleOpenFolder = (path) => {
      instance.post("/setting/fileManagement/openFolder", {
        path
      }).catch((err) => {
        window.$message?.error(err.message || $t("settings.file.openFailed"));
      });
    };
    return (_ctx, _cache) => {
      const _component_t_button = Button;
      const _component_t_card = Card;
      const _component_i_reduce_one = resolveComponent("i-reduce-one");
      const _component_t_empty = Empty;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        unref(isElectron) ? (openBlock(), createBlock(_component_t_card, {
          key: 0,
          title: _ctx.$t("settings.file.quickOpen"),
          bordered: ""
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2, [
              (openBlock(), createElementBlock(Fragment, null, renderList(folderList, (item) => {
                return createBaseVNode("div", {
                  key: item.path,
                  class: "folderItem"
                }, [
                  createBaseVNode("div", _hoisted_3, [
                    createBaseVNode("div", _hoisted_4, toDisplayString(_ctx.$t(item.label)), 1),
                    createBaseVNode("div", _hoisted_5, toDisplayString(_ctx.$t(item.desc)), 1)
                  ]),
                  createVNode(_component_t_button, {
                    theme: "primary",
                    variant: "outline",
                    onClick: ($event) => handleOpenFolder(item.path)
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("settings.file.open")), 1)
                    ]),
                    _: 1
                  }, 8, ["onClick"])
                ]);
              }), 64))
            ])
          ]),
          _: 1
        }, 8, ["title"])) : (openBlock(), createBlock(_component_t_empty, {
          key: 1,
          description: _ctx.$t("settings.file.dockerDesc"),
          title: _ctx.$t("settings.file.desktopOnly")
        }, {
          image: withCtx(() => [
            createVNode(_component_i_reduce_one, {
              theme: "outline",
              fill: "red"
            })
          ]),
          _: 1
        }, 8, ["description", "title"]))
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const fileManagement = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-adb4ff32"]]);

export { fileManagement as default };

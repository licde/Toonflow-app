const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./uiConfig-BArV2YHL.js","./index-BvNjvLGR.js","./markdown-S9HtUHKW.js","./vue-vendor-Cj7sXJnb.js","./dayjs-CuToSpIM.js","./tdesign-C157N6jJ.js","./i18n-DbW3ZkIb.js","./languageConfig-DVdlpHTB.js","./requestConfig-xmqO5-YA.js","./loginConfig-dIe0-_NE.js","./axios-BzO0kuq-.js","./agentConfog-BlNNMRjT.js","./modelSelect-CP2wRMzT.js","./providersLogo-BCbaFq8_.js","./dbConfig-CJiuLaKU.js","./otherConfig-Dlgo3BHt.js","./about-Bt0zGKHR.js","./index-FQhXerfT.js","./project-C_OB2JAu.js","./logoutConfig-CZzgkSfX.js","./vendorConfig-Cqnpq5Mt.js","./AsyncMdPreview-Wrs0kg5K.js","./AsyncMonacoEditor-Mcem67il.js","./memoryConfig-DfnJdsWn.js","./fileManagement-CeCePEbC.js","./skillManagement-CYZuJmEL.js","./AsyncMdEditor-B6a7ynjr.js","./devConfig-DbNd7TI-.js","./promptManage-Chi_BUNp.js","./modelMap-Hzq-pbp-.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-S9HtUHKW.js';
import { s as settingStore, _ as _export_sfc } from './index-BvNjvLGR.js';
import { l as defineComponent, bM as storeToRefs, aK as openBlock, aS as createBlock, aM as withCtx, aO as createBaseVNode, j as createVNode, av as isRef, a1 as unref, aL as createElementBlock, F as Fragment, aP as renderList, a$ as createTextVNode, b0 as toDisplayString, a_ as resolveDynamicComponent, aT as createCommentVNode, bS as defineAsyncComponent, c as computed } from './vue-vendor-Cj7sXJnb.js';
import { aa as Menu, ab as MenuItem, F as Badge, E as Dialog } from './tdesign-C157N6jJ.js';
import './i18n-DbW3ZkIb.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "settingPanel" };
const _hoisted_2 = { class: "settingRight" };
const _hoisted_3 = { class: "sectionTitle" };
const _hoisted_4 = { class: "settingContent" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const { showSetting, activeMenu, needUpdate } = storeToRefs(settingStore());
    const uiConfig = defineAsyncComponent(() => __vitePreload(() => import('./uiConfig-BArV2YHL.js'),true?__vite__mapDeps([0,1,2,3,4,5,6]):void 0,import.meta.url));
    const languageConfig = defineAsyncComponent(() => __vitePreload(() => import('./languageConfig-DVdlpHTB.js'),true?__vite__mapDeps([7,6,3,4,1,2,5]):void 0,import.meta.url));
    const requestConfig = defineAsyncComponent(() => __vitePreload(() => import('./requestConfig-xmqO5-YA.js'),true?__vite__mapDeps([8,1,2,3,4,5,6]):void 0,import.meta.url));
    const loginConfig = defineAsyncComponent(() => __vitePreload(() => import('./loginConfig-dIe0-_NE.js'),true?__vite__mapDeps([9,10,1,2,3,4,5,6]):void 0,import.meta.url));
    const agentConfog = defineAsyncComponent(() => __vitePreload(() => import('./agentConfog-BlNNMRjT.js'),true?__vite__mapDeps([11,12,3,4,13,1,2,5,6,10]):void 0,import.meta.url));
    const dbConfig = defineAsyncComponent(() => __vitePreload(() => import('./dbConfig-CJiuLaKU.js'),true?__vite__mapDeps([14,10,1,2,3,4,5,6]):void 0,import.meta.url));
    const otherConfig = defineAsyncComponent(() => __vitePreload(() => import('./otherConfig-Dlgo3BHt.js'),true?__vite__mapDeps([15,1,2,3,4,5,6]):void 0,import.meta.url));
    const about = defineAsyncComponent(() => __vitePreload(() => import('./about-Bt0zGKHR.js'),true?__vite__mapDeps([16,17,2,3,4,10,1,5,6,18]):void 0,import.meta.url));
    const logoutConfig = defineAsyncComponent(() => __vitePreload(() => import('./logoutConfig-CZzgkSfX.js'),true?__vite__mapDeps([19,3,4,5,1,2,6]):void 0,import.meta.url));
    const vendorConfig = defineAsyncComponent(() => __vitePreload(() => import('./vendorConfig-Cqnpq5Mt.js'),true?__vite__mapDeps([20,3,4,21,2,5,1,6,22,10,13]):void 0,import.meta.url));
    const memoryConfig = defineAsyncComponent(() => __vitePreload(() => import('./memoryConfig-DfnJdsWn.js'),true?__vite__mapDeps([23,10,1,2,3,4,5,6]):void 0,import.meta.url));
    const fileManagement = defineAsyncComponent(() => __vitePreload(() => import('./fileManagement-CeCePEbC.js'),true?__vite__mapDeps([24,1,2,3,4,5,6,10]):void 0,import.meta.url));
    const skillManagement = defineAsyncComponent(() => __vitePreload(() => import('./skillManagement-CYZuJmEL.js'),true?__vite__mapDeps([25,26,2,3,4,5,1,6,21,10]):void 0,import.meta.url));
    const devConfig = defineAsyncComponent(() => __vitePreload(() => import('./devConfig-DbNd7TI-.js'),true?__vite__mapDeps([27,22,2,3,4,5,1,6,10]):void 0,import.meta.url));
    const promptManage = defineAsyncComponent(() => __vitePreload(() => import('./promptManage-Chi_BUNp.js'),true?__vite__mapDeps([28,10,1,2,3,4,5,6,26]):void 0,import.meta.url));
    const modelMap = defineAsyncComponent(() => __vitePreload(() => import('./modelMap-Hzq-pbp-.js'),true?__vite__mapDeps([29,10,1,2,3,4,5,6,26]):void 0,import.meta.url));
    const menuItems = [
      { key: "ui", label: "settings.menu.ui", icon: "i-theme" },
      { key: "language", label: "settings.menu.language", icon: "i-translate" },
      { key: "vendorConfig", label: "settings.menu.vendorConfig", icon: "i-computer" },
      { key: "modelMap", label: "settings.menu.modelMap", icon: "i-computer" },
      { key: "agentConfog", label: "settings.menu.agentConfig", icon: "i-color-filter" },
      { key: "promptManage", label: "settings.menu.promptManage", icon: "i-tips" },
      { key: "skillManagement", label: "settings.menu.skillsSkillsManagement", icon: "i-ring" },
      { key: "memoryConfig", label: "settings.menu.memoryConfig", icon: "i-memory-card-one" },
      { key: "loginConfig", label: "settings.menu.loginConfig", icon: "i-lock" },
      { key: "dbConfig", label: "settings.menu.dbConfig", icon: "i-data" },
      { key: "fileManagement", label: "settings.menu.fileManagement", icon: "i-hard-disk" },
      { key: "otherConfig", label: "settings.menu.otherConfig", icon: "i-application-menu" },
      { key: "requestConfig", label: "settings.menu.requestConfig", icon: "i-api" },
      { key: "devConfig", label: "settings.menu.devConfig", icon: "i-flask" },
      { key: "about", label: "settings.menu.about", icon: "i-info" },
      { key: "logoutConfig", label: "settings.menu.logoutConfig", icon: "i-logout" }
    ];
    const currentMenuItem = computed(() => menuItems.find((item) => item.key === activeMenu.value));
    return (_ctx, _cache) => {
      const _component_t_badge = Badge;
      const _component_t_menu_item = MenuItem;
      const _component_t_menu = Menu;
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        header: _ctx.$t("settings.title"),
        footer: false,
        placement: "center",
        width: "1200px",
        visible: unref(showSetting),
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isRef(showSetting) ? showSetting.value = $event : null)
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_t_menu, {
              class: "settingMenu",
              value: unref(activeMenu),
              "onUpdate:value": _cache[0] || (_cache[0] = ($event) => isRef(activeMenu) ? activeMenu.value = $event : null),
              style: { height: "70vh" }
            }, {
              default: withCtx(() => [
                (openBlock(), createElementBlock(Fragment, null, renderList(menuItems, (item) => {
                  return createVNode(_component_t_menu_item, {
                    key: item.key,
                    value: item.key
                  }, {
                    icon: withCtx(() => [
                      createVNode(_component_t_badge, {
                        count: unref(needUpdate) && item.key === "about" ? 1 : 0,
                        dot: ""
                      }, {
                        default: withCtx(() => [
                          (openBlock(), createBlock(resolveDynamicComponent(item.icon), { class: "icon" }))
                        ]),
                        _: 2
                      }, 1032, ["count"])
                    ]),
                    default: withCtx(() => [
                      createTextVNode(" " + toDisplayString(_ctx.$t(item.label)), 1)
                    ]),
                    _: 2
                  }, 1032, ["value"]);
                }), 64))
              ]),
              _: 1
            }, 8, ["value"]),
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("div", _hoisted_3, toDisplayString(unref(currentMenuItem) ? _ctx.$t(unref(currentMenuItem).label) : ""), 1),
              createBaseVNode("div", _hoisted_4, [
                unref(activeMenu) === "ui" ? (openBlock(), createBlock(unref(uiConfig), { key: 0 })) : createCommentVNode("", true),
                unref(activeMenu) === "language" ? (openBlock(), createBlock(unref(languageConfig), { key: 1 })) : createCommentVNode("", true),
                unref(activeMenu) === "vendorConfig" ? (openBlock(), createBlock(unref(vendorConfig), { key: 2 })) : createCommentVNode("", true),
                unref(activeMenu) === "requestConfig" ? (openBlock(), createBlock(unref(requestConfig), { key: 3 })) : createCommentVNode("", true),
                unref(activeMenu) === "loginConfig" ? (openBlock(), createBlock(unref(loginConfig), { key: 4 })) : createCommentVNode("", true),
                unref(activeMenu) === "agentConfog" ? (openBlock(), createBlock(unref(agentConfog), { key: 5 })) : createCommentVNode("", true),
                unref(activeMenu) === "promptManage" ? (openBlock(), createBlock(unref(promptManage), { key: 6 })) : createCommentVNode("", true),
                unref(activeMenu) === "otherConfig" ? (openBlock(), createBlock(unref(otherConfig), { key: 7 })) : createCommentVNode("", true),
                unref(activeMenu) === "dbConfig" ? (openBlock(), createBlock(unref(dbConfig), { key: 8 })) : createCommentVNode("", true),
                unref(activeMenu) === "about" ? (openBlock(), createBlock(unref(about), { key: 9 })) : createCommentVNode("", true),
                unref(activeMenu) === "logoutConfig" ? (openBlock(), createBlock(unref(logoutConfig), { key: 10 })) : createCommentVNode("", true),
                unref(activeMenu) === "memoryConfig" ? (openBlock(), createBlock(unref(memoryConfig), { key: 11 })) : createCommentVNode("", true),
                unref(activeMenu) === "fileManagement" ? (openBlock(), createBlock(unref(fileManagement), { key: 12 })) : createCommentVNode("", true),
                unref(activeMenu) === "skillManagement" ? (openBlock(), createBlock(unref(skillManagement), { key: 13 })) : createCommentVNode("", true),
                unref(activeMenu) === "devConfig" ? (openBlock(), createBlock(unref(devConfig), { key: 14 })) : createCommentVNode("", true),
                unref(activeMenu) === "modelMap" ? (openBlock(), createBlock(unref(modelMap), { key: 15 })) : createCommentVNode("", true)
              ])
            ])
          ])
        ]),
        _: 1
      }, 8, ["header", "visible"]);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-8d821740"]]);

export { index as default };

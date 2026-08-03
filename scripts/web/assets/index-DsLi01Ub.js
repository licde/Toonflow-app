const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./uiConfig-YlsZDhOs.js","./index-Dj17DntQ.js","./markdown-CDQfeHxT.js","./vue-vendor-Byo5TD6r.js","./dayjs-CuToSpIM.js","./tdesign-CfL1pweZ.js","./i18n-C05S5xzz.js","./languageConfig-CWqJ1cFN.js","./requestConfig-DPDhoXo-.js","./loginConfig-BWVcLeAr.js","./axios-DoLZCC01.js","./agentConfog-einiPeXs.js","./modelSelect-CcPQrTrD.js","./providersLogo-BCbaFq8_.js","./dbConfig-oHR8s6uC.js","./otherConfig-CxwMBUEz.js","./about-C-aQ17Hf.js","./index-0rUyqdkP.js","./logoutConfig-CyP-rqUR.js","./vendorConfig-D0P8Z8zU.js","./AsyncMdPreview-PBX0cZ0A.js","./AsyncMonacoEditor-GUwJB6yx.js","./memoryConfig-Dt8WqJfv.js","./fileManagement-oLAFgnCh.js","./skillManagement-CzGRp7VK.js","./AsyncMdEditor-Borgk8h0.js","./devConfig-BnVyN__V.js","./promptManage-BtI6_ZQg.js","./modelMap-DR-AQZM2.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-CDQfeHxT.js';
import { s as settingStore, _ as _export_sfc } from './index-Dj17DntQ.js';
import { l as defineComponent, bM as storeToRefs, aK as openBlock, aS as createBlock, aM as withCtx, aO as createBaseVNode, j as createVNode, av as isRef, a1 as unref, aL as createElementBlock, F as Fragment, aP as renderList, a$ as createTextVNode, b0 as toDisplayString, a_ as resolveDynamicComponent, aT as createCommentVNode, bS as defineAsyncComponent, c as computed } from './vue-vendor-Byo5TD6r.js';
import { aa as Menu, ab as MenuItem, F as Badge, E as Dialog } from './tdesign-CfL1pweZ.js';
import './i18n-C05S5xzz.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "settingPanel" };
const _hoisted_2 = { class: "settingRight" };
const _hoisted_3 = { class: "sectionTitle" };
const _hoisted_4 = { class: "settingContent" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const { showSetting, activeMenu, needUpdate } = storeToRefs(settingStore());
    const uiConfig = defineAsyncComponent(() => __vitePreload(() => import('./uiConfig-YlsZDhOs.js'),true?__vite__mapDeps([0,1,2,3,4,5,6]):void 0,import.meta.url));
    const languageConfig = defineAsyncComponent(() => __vitePreload(() => import('./languageConfig-CWqJ1cFN.js'),true?__vite__mapDeps([7,6,3,4,1,2,5]):void 0,import.meta.url));
    const requestConfig = defineAsyncComponent(() => __vitePreload(() => import('./requestConfig-DPDhoXo-.js'),true?__vite__mapDeps([8,1,2,3,4,5,6]):void 0,import.meta.url));
    const loginConfig = defineAsyncComponent(() => __vitePreload(() => import('./loginConfig-BWVcLeAr.js'),true?__vite__mapDeps([9,10,1,2,3,4,5,6]):void 0,import.meta.url));
    const agentConfog = defineAsyncComponent(() => __vitePreload(() => import('./agentConfog-einiPeXs.js'),true?__vite__mapDeps([11,12,3,4,13,1,2,5,6,10]):void 0,import.meta.url));
    const dbConfig = defineAsyncComponent(() => __vitePreload(() => import('./dbConfig-oHR8s6uC.js'),true?__vite__mapDeps([14,10,1,2,3,4,5,6]):void 0,import.meta.url));
    const otherConfig = defineAsyncComponent(() => __vitePreload(() => import('./otherConfig-CxwMBUEz.js'),true?__vite__mapDeps([15,1,2,3,4,5,6]):void 0,import.meta.url));
    const about = defineAsyncComponent(() => __vitePreload(() => import('./about-C-aQ17Hf.js'),true?__vite__mapDeps([16,17,2,3,4,10,1,5,6]):void 0,import.meta.url));
    const logoutConfig = defineAsyncComponent(() => __vitePreload(() => import('./logoutConfig-CyP-rqUR.js'),true?__vite__mapDeps([18,3,4,5,1,2,6]):void 0,import.meta.url));
    const vendorConfig = defineAsyncComponent(() => __vitePreload(() => import('./vendorConfig-D0P8Z8zU.js'),true?__vite__mapDeps([19,3,4,20,2,5,1,6,21,10,13]):void 0,import.meta.url));
    const memoryConfig = defineAsyncComponent(() => __vitePreload(() => import('./memoryConfig-Dt8WqJfv.js'),true?__vite__mapDeps([22,10,1,2,3,4,5,6]):void 0,import.meta.url));
    const fileManagement = defineAsyncComponent(() => __vitePreload(() => import('./fileManagement-oLAFgnCh.js'),true?__vite__mapDeps([23,1,2,3,4,5,6,10]):void 0,import.meta.url));
    const skillManagement = defineAsyncComponent(() => __vitePreload(() => import('./skillManagement-CzGRp7VK.js'),true?__vite__mapDeps([24,25,2,3,4,5,1,6,20,10]):void 0,import.meta.url));
    const devConfig = defineAsyncComponent(() => __vitePreload(() => import('./devConfig-BnVyN__V.js'),true?__vite__mapDeps([26,21,2,3,4,5,1,6,10]):void 0,import.meta.url));
    const promptManage = defineAsyncComponent(() => __vitePreload(() => import('./promptManage-BtI6_ZQg.js'),true?__vite__mapDeps([27,10,1,2,3,4,5,6,25]):void 0,import.meta.url));
    const modelMap = defineAsyncComponent(() => __vitePreload(() => import('./modelMap-DR-AQZM2.js'),true?__vite__mapDeps([28,10,1,2,3,4,5,6,25]):void 0,import.meta.url));
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

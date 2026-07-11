const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./mdEditorSetup-CahsRofK.js","./markdown-CDQfeHxT.js","./vue-vendor-Byo5TD6r.js","./dayjs-CuToSpIM.js","./404-CcaQ2Hb9.js","./tdesign-CfL1pweZ.js","./i18n-C05S5xzz.js","./index-tsaIBjJI.js","./axios-PPMfXuH1.js","./project-Cze3Ugcr.js","./index-D7LATaIA.js","./AsyncMdEditor-Cs1zMNgZ.js","./modelSelect-CB7Kqm3T.js","./providersLogo-BCbaFq8_.js","./imageListCache-DK3t0fNV.js","./index-DpXdXXbF.js","./index-CS5uUDMK.js","./loadMammoth-SnzcJmSH.js","./index-CuwXeIFj.js","./assetsCheck-CZspxCvw.js","./index-Cyl7bZ6U.js","./index-CC8hgiKP.js","./AsyncMdPreview-COhKdPFL.js","./splitpanes-BtsLJCt3.js","./tdesign-chat-2f-0Epe1.js","./productionAgent-SRl0F_yl.js","./index-7r7Rl21V.js","./imageTools-Dd_65tJR.js","./index-CgboTaf5.js","./vueflow-RSWomYB5.js","./index-huCR80k2.js","./registerIconPark-DGonzHNw.js","./icons-COBOzgyl.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-CDQfeHxT.js';
import { l as defineComponent, o as onMounted, b as onUnmounted, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, j as createVNode, r as ref, bD as defineStore, bL as useLocalStorage, bM as storeToRefs, w as watch, v as onBeforeMount, n as nextTick, a1 as unref, aS as createBlock, aT as createCommentVNode, aM as withCtx, F as Fragment, c as computed, bN as createRouter, bO as createWebHashHistory, bC as createApp, bP as createPinia, bQ as src_default } from './vue-vendor-Byo5TD6r.js';
import { q as ConfigProvider, r as enUs, z as zhCn, L as Loading, M as MessagePlugin, s as LoadingPlugin, v as vLoading } from './tdesign-CfL1pweZ.js';
import { c as createI18n } from './i18n-C05S5xzz.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1$1 = { class: "titleBar" };
const _hoisted_2 = { class: "titleBar-controls" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "titleBar",
  setup(__props) {
    const isMaximized = ref(false);
    async function electronAction(action) {
      try {
        const res = await fetch(`toonflow://${action}`);
        return await res.json();
      } catch {
      }
    }
    function handleMinimize() {
      electronAction("windowMinimize");
    }
    function handleMaximize() {
      electronAction("windowMaximize");
      isMaximized.value = !isMaximized.value;
    }
    function handleClose() {
      electronAction("windowClose");
    }
    async function syncMaximizedState() {
      try {
        const res = await fetch("toonflow://windowIsMaximized");
        const data = await res.json();
        if (data && typeof data.maximized === "boolean") {
          isMaximized.value = data.maximized;
        }
      } catch {
      }
    }
    onMounted(() => {
      syncMaximizedState();
      window.addEventListener("resize", syncMaximizedState);
    });
    onUnmounted(() => {
      window.removeEventListener("resize", syncMaximizedState);
    });
    return (_ctx, _cache) => {
      const _component_i_round = resolveComponent("i-round");
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        _cache[0] || (_cache[0] = createBaseVNode("div", { class: "titleBar-title" }, [
          createBaseVNode("span", { class: "titleBar-text" }, "ToonFlow")
        ], -1)),
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", {
            class: "titleBar-btn",
            onClick: handleMinimize
          }, [
            createVNode(_component_i_round, {
              theme: "filled",
              size: "13",
              fill: "#febc2e"
            })
          ]),
          createBaseVNode("div", {
            class: "titleBar-btn",
            onClick: handleMaximize
          }, [
            createVNode(_component_i_round, {
              theme: "filled",
              size: "13",
              fill: "#28c840"
            })
          ]),
          createBaseVNode("div", {
            class: "titleBar-btn",
            onClick: handleClose
          }, [
            createVNode(_component_i_round, {
              theme: "filled",
              size: "13",
              fill: "#ff5f57"
            })
          ])
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const _export_sfc = (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
};

const __unplugin_components_1 = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-e684ee76"]]);

const settingStore = defineStore(
  "setting",
  () => {
    const showSetting = ref(false);
    const isElectron = ref(false);
    const canvasWheelEvent = ref("zoom");
    const activeMenu = ref("ui");
    const baseUrl = ref("http://localhost:10588/api");
    const needUpdate = ref(false);
    const otherSetting = ref({
      axiosTimeOut: 60 * 10 * 1e3,
      assetsBatchGenereateSize: 5,
      chapterReg: "/第\\s*([0-9０-９零一二三四五六七八九十百千万]+)\\s*[章回节]\\s*([^\\n\\r]*)/g",
      interacting: true,
      scriptEpisodeLength: 5e3
    });
    const themeSetting = ref({
      mode: "auto",
      primaryColor: "#0052D9",
      fontSize: 16
    });
    const language = ref("zh-CN");
    return { showSetting, baseUrl, otherSetting, themeSetting, language, activeMenu, isElectron, canvasWheelEvent, needUpdate };
  },
  { persist: { pick: ["baseUrl", "otherSetting", "themeSetting", "language"] } }
);

const languageList = [
  { label: "简体中文", tips: "Chinese (Simplified)", value: "zh-CN" },
  { label: "繁體中文", tips: "Chinese (Traditional)", value: "zh-TW" },
  { label: "English", tips: "English", value: "en" },
  { label: "ไทย", tips: "Thai", value: "th-TH" },
  { label: "Tiếng Việt", tips: "Vietnamese", value: "vi-VN" },
  { label: "日本語", tips: "Japanese", value: "ja-JP" },
  { label: "Русский", tips: "Russian", value: "ru-RU" }
];
const INITIAL_LOCALES = ["zh-CN", "en"];
const localeLoaders = {
  "zh-CN": () => __vitePreload(() => import('./zh-CN-CcHGaA-c.js'),true?[]:void 0,import.meta.url),
  "zh-TW": () => __vitePreload(() => import('./zh-TW-B54YoBZG.js'),true?[]:void 0,import.meta.url),
  en: () => __vitePreload(() => import('./en-B5R-M7F9.js'),true?[]:void 0,import.meta.url),
  "th-TH": () => __vitePreload(() => import('./th_TH-aXsdS_1o.js'),true?[]:void 0,import.meta.url),
  "vi-VN": () => __vitePreload(() => import('./vi-VN-ycG_cmGD.js'),true?[]:void 0,import.meta.url),
  "ja-JP": () => __vitePreload(() => import('./ja_JP-C3lXDr6I.js'),true?[]:void 0,import.meta.url),
  "ru-RU": () => __vitePreload(() => import('./ru_RU-CpGuPppm.js'),true?[]:void 0,import.meta.url)
};
const cachedLocale = useLocalStorage("locale", "zh-CN");
let i18n = null;
async function loadLocaleMessages(locale) {
  const loader = localeLoaders[locale];
  if (!loader) {
    throw new Error(`Unsupported locale: ${locale}`);
  }
  const mod = await loader();
  return mod.default;
}
async function setupI18n() {
  const messages = {};
  for (const locale of INITIAL_LOCALES) {
    messages[locale] = await loadLocaleMessages(locale);
  }
  const targetLocale = cachedLocale.value;
  if (!INITIAL_LOCALES.includes(targetLocale)) {
    messages[targetLocale] = await loadLocaleMessages(targetLocale);
  }
  i18n = createI18n({
    legacy: false,
    locale: targetLocale,
    fallbackLocale: "en",
    messages
  });
  return i18n;
}
async function switchLocale(locale) {
  if (!i18n) {
    throw new Error("i18n is not initialized");
  }
  if (!i18n.global.availableLocales.includes(locale)) {
    const messages = await loadLocaleMessages(locale);
    i18n.global.setLocaleMessage(locale, messages);
  }
  i18n.global.locale.value = locale;
  cachedLocale.value = locale;
}

const hexToHsl = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};
const hslToHex = (h, s, l) => {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(h / 60 % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};
const generateColorPalette = (hex) => {
  const { h, s, l } = hexToHsl(hex);
  const lightLevels = [97, 92, 85, 75, 62, l, Math.max(l - 12, 20), Math.max(l - 24, 15), Math.max(l - 36, 10), Math.max(l - 48, 5)];
  return lightLevels.map((level) => hslToHex(h, s, level));
};
const applyThemeMode = (mode) => {
  const targetMode = mode === "auto" ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" : mode;
  if (targetMode === "dark") {
    document.documentElement.setAttribute("theme-mode", "dark");
  } else {
    document.documentElement.removeAttribute("theme-mode");
  }
  if (targetMode === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
};
const applyThemeColor = (color) => {
  const root = document.documentElement;
  const palette = generateColorPalette(color);
  const isDark = root.getAttribute("theme-mode") === "dark";
  const colors = isDark ? [...palette].reverse() : palette;
  colors.forEach((c, i) => root.style.setProperty(`--td-brand-color-${i + 1}`, c));
  ["", "-hover:5", "-focus:2", "-active:7", "-disabled:3", "-light:1", "-light-hover:2"].forEach((suffix) => {
    const [name, level] = suffix.split(":");
    root.style.setProperty(`--td-brand-color${name}`, level ? `var(--td-brand-color-${level})` : "var(--td-brand-color-6)");
  });
  root.style.setProperty("--td-text-color-brand", `var(--td-brand-color-${isDark ? 8 : 7})`);
  root.style.setProperty("--td-text-color-link", "var(--td-brand-color-8)");
};
const toggleThemeWithTransition = (event, callback) => {
  if (!document.startViewTransition) {
    callback();
    return;
  }
  const x = window.innerWidth / 2;
  const y = window.innerHeight / 2;
  const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const root = document.documentElement;
  root.style.setProperty("--x", `${x}px`);
  root.style.setProperty("--y", `${y}px`);
  root.style.setProperty("--r", `${endRadius}px`);
  document.startViewTransition(callback);
};
const initTheme = () => {
  const { themeSetting } = storeToRefs(settingStore());
  applyThemeMode(themeSetting.value.mode);
  applyThemeColor(themeSetting.value.primaryColor);
  if (themeSetting.value.fontSize) {
    document.documentElement.style.fontSize = `${themeSetting.value.fontSize}px`;
  }
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (themeSetting.value.mode === "auto") {
      toggleThemeWithTransition(void 0, () => {
        const targetMode = e.matches ? "dark" : "light";
        if (targetMode === "dark") {
          document.documentElement.setAttribute("theme-mode", "dark");
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.removeAttribute("theme-mode");
          document.documentElement.classList.remove("dark");
        }
        applyThemeColor(themeSetting.value.primaryColor);
      });
    }
  });
};

const _hoisted_1 = {
  key: 0,
  class: "app-loading"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "App",
  setup(__props) {
    const { baseUrl, isElectron } = storeToRefs(settingStore());
    const loading = ref(true);
    watch(
      () => isElectron.value,
      (newVal) => {
        if (newVal) {
          document.body.classList.add("is-electron");
        } else {
          document.body.classList.remove("is-electron");
        }
      },
      { immediate: true }
    );
    onBeforeMount(() => {
    });
    onMounted(async () => {
      getPort();
    });
    async function handleLinkClick(event) {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      const url = target?.getAttribute("data-link") || target?.getAttribute("href");
      if (!url) return false;
      if (isElectron.value) {
        await fetch(`toonflow://openurlwithbrowser?url=${encodeURIComponent(url)}`);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      return false;
    }
    async function getPort() {
      await nextTick();
      await nextTick();
      await nextTick();
      await nextTick();
      try {
        const res = await fetch("toonflow://getAppUrl");
        const data = await res.json();
        if (data?.url) {
          baseUrl.value = data.url;
          isElectron.value = true;
        }
      } catch (error) {
      }
      const { setupMdEditor } = await __vitePreload(async () => { const { setupMdEditor } = await import('./mdEditorSetup-CahsRofK.js');return { setupMdEditor }},true?__vite__mapDeps([0,1,2,3]):void 0,import.meta.url);
      void setupMdEditor(handleLinkClick);
      loading.value = false;
      try {
        const language = navigator.language;
        if (language && languageList.some((item) => item.value === language)) {
          await switchLocale(language);
        }
      } catch (e) {
        console.error("获取语言失败", e);
      }
    }
    const tdesignLocaleMap = {
      "zh-CN": zhCn,
      en: enUs
    };
    const customConfig = {
      calendar: {},
      table: {},
      pagination: {}
    };
    const globalConfig = computed(() => {
      const localeConfig = tdesignLocaleMap[cachedLocale.value] || zhCn;
      return {
        ...localeConfig,
        calendar: { ...localeConfig.calendar, ...customConfig.calendar },
        table: { ...localeConfig.table, ...customConfig.table },
        pagination: { ...localeConfig.pagination, ...customConfig.pagination }
      };
    });
    onBeforeMount(() => {
      initTheme();
    });
    return (_ctx, _cache) => {
      const _component_t_loading = Loading;
      const _component_titleBar = __unplugin_components_1;
      const _component_router_view = resolveComponent("router-view");
      const _component_t_config_provider = ConfigProvider;
      return unref(loading) ? (openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_t_loading, {
          loading: true,
          size: "large",
          text: "加载中..."
        })
      ])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
        unref(isElectron) ? (openBlock(), createBlock(_component_titleBar, { key: 0 })) : createCommentVNode("", true),
        createVNode(_component_t_config_provider, { "global-config": unref(globalConfig) }, {
          default: withCtx(() => [
            createVNode(_component_router_view)
          ]),
          _: 1
        }, 8, ["global-config"])
      ], 64));
    };
  }
});

/* unplugin-vue-components disabled */

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/:catchAll(.*)",
      name: "404",
      meta: {
        title: "404"
      },
      component: () => __vitePreload(() => import('./404-CcaQ2Hb9.js'),true?__vite__mapDeps([4,2,3,5,1,6]):void 0,import.meta.url)
    },
    {
      path: "/",
      redirect: "/workbench"
    },
    {
      path: "/workbench",
      component: () => __vitePreload(() => import('./index-tsaIBjJI.js').then(n => n.i),true?__vite__mapDeps([7,1,2,3,8,5,6,9]):void 0,import.meta.url),
      redirect: "/project",
      children: [
        {
          path: "/project",
          component: () => __vitePreload(() => import('./index-D7LATaIA.js'),true?__vite__mapDeps([10,2,3,8,5,11,1,12,13,9,14,6]):void 0,import.meta.url)
        },
        {
          path: "/task",
          component: () => __vitePreload(() => import('./index-DpXdXXbF.js'),true?__vite__mapDeps([15,3,8,2,5,9,1,6]):void 0,import.meta.url)
        },
        // {
        //   path: "/detail",
        //   component: () => import("@/views/detail/index.vue"),
        // },
        {
          path: "/novel",
          component: () => __vitePreload(() => import('./index-CS5uUDMK.js'),true?__vite__mapDeps([16,2,3,8,5,17,1,9,6]):void 0,import.meta.url)
        },
        {
          path: "/script",
          component: () => __vitePreload(() => import('./index-CuwXeIFj.js'),true?__vite__mapDeps([18,2,3,8,5,19,20,12,13,9,1,6,17,14]):void 0,import.meta.url)
        },
        {
          path: "/scriptAgent",
          component: () => __vitePreload(() => import('./index-CC8hgiKP.js'),true?__vite__mapDeps([21,2,3,11,1,5,22,23,8,24,9,25,6]):void 0,import.meta.url)
        },
        {
          path: "/cornerScape",
          component: () => __vitePreload(() => import('./index-7r7Rl21V.js'),true?__vite__mapDeps([26,27,2,3,5,8,9,12,13,19,20,1,6]):void 0,import.meta.url)
        },
        {
          path: "/production",
          component: () => __vitePreload(() => import('./index-CgboTaf5.js').then(n => n.i),true?__vite__mapDeps([28,1,2,3,29,8,5,9,25]):void 0,import.meta.url)
        },
        {
          path: "/assets",
          component: () => __vitePreload(() => import('./index-Cyl7bZ6U.js'),true?__vite__mapDeps([20,3,12,2,13,8,5,9,1,6]):void 0,import.meta.url)
        },
        ...[]
      ]
    },
    {
      path: "/login",
      component: () => __vitePreload(() => import('./index-huCR80k2.js'),true?__vite__mapDeps([30,6,2,3,8,5,1]):void 0,import.meta.url)
    }
  ]
});
router.beforeEach((to, from, next) => {
  if (to.path === "/login") {
    next();
  } else {
    if (localStorage.getItem("token")) {
      next();
    } else {
      next("/login");
    }
  }
});

function initGlobal(i18n) {
  window.$message = MessagePlugin;
  window.$t = i18n.global.t;
}

const defaultOptions = {
  exclude: [".t-image-viewer__modal-image"]
};
const imageOptimizer = {
  install(_app, userOptions = {}) {
    const options = { ...defaultOptions, ...userOptions };
    const excludeSelector = options.exclude.join(",");
    const style = document.createElement("style");
    style.textContent = `img:not(${excludeSelector}) { content-visibility: auto; }`;
    document.head.appendChild(style);
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.decoding = "async";
          io.unobserve(entry.target);
        }
      }
    });
    const processImage = (img) => {
      if (img.dataset.opt) return;
      if (img.matches(excludeSelector)) return;
      img.loading = "lazy";
      img.dataset.opt = "1";
      io.observe(img);
    };
    const mo = new MutationObserver((mutations) => {
      const imgs = /* @__PURE__ */ new Set();
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLImageElement) {
            imgs.add(node);
          } else if (node instanceof HTMLElement) {
            node.querySelectorAll("img").forEach((img) => imgs.add(img));
          }
        }
      }
      imgs.forEach(processImage);
    });
    const init = () => {
      document.querySelectorAll("img").forEach(processImage);
      mo.observe(document.body, { childList: true, subtree: true });
    };
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init, { once: true }) : init();
  }
};

async function bootstrap() {
  const i18n = await setupI18n();
  initGlobal(i18n);
  const app = createApp(_sfc_main);
  app.use(imageOptimizer);
  const { registerIconPark } = await __vitePreload(async () => { const { registerIconPark } = await import('./registerIconPark-DGonzHNw.js');return { registerIconPark }},true?__vite__mapDeps([31,32,2,3]):void 0,import.meta.url);
  registerIconPark(app);
  app.use(createPinia().use(src_default));
  app.use(router);
  app.use(i18n);
  app.use(LoadingPlugin);
  app.directive("loading", vLoading);
  app.mount("#app");
}
bootstrap();

export { _export_sfc as _, applyThemeMode as a, applyThemeColor as b, cachedLocale as c, switchLocale as d, languageList as l, router as r, settingStore as s, toggleThemeWithTransition as t };

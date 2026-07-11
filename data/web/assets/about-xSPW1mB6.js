import { _ as _imports_0 } from './index-tsaIBjJI.js';
import { i as instance } from './axios-PPMfXuH1.js';
import { d as dayjs } from './dayjs-CuToSpIM.js';
import { bD as defineStore, r as ref, c as computed, l as defineComponent, bM as storeToRefs, w as watch, o as onMounted, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, j as createVNode, aM as withCtx, aO as createBaseVNode, b0 as toDisplayString, a$ as createTextVNode, a1 as unref, aT as createCommentVNode, av as isRef, F as Fragment, aP as renderList, aU as normalizeClass, aQ as normalizeStyle, aS as createBlock } from './vue-vendor-Byo5TD6r.js';
import { u as useI18n } from './i18n-C05S5xzz.js';
import { s as settingStore, _ as _export_sfc } from './index-BPofKOpG.js';
import { X as Tag, F as Badge, B as Button, Y as Card, D as Divider, R as Input, E as Dialog, M as MessagePlugin, W as DialogPlugin } from './tdesign-CfL1pweZ.js';
import './markdown-CDQfeHxT.js';
import './project-Cze3Ugcr.js';

const atomgitLogo = "data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='UTF-8'?%3e%3csvg%20version='1.1'%20xmlns='http://www.w3.org/2000/svg'%20width='96'%20height='96'%3e%3cpath%20d='M0%200%20C2.60491411%203.39771405%202.43893626%206.83010556%202%2011%20C0.20437595%2013.75329021%20-1.05254922%2015.52627461%20-4%2017%20C-9.16062661%2017.49941548%20-9.16062661%2017.49941548%20-12%2017%20C-14.90799783%2014.4555019%20-15.90702057%2013.04601863%20-16.25%209.1875%20C-16.1675%208.465625%20-16.085%207.74375%20-16%207%20C-17.0725%207.639375%20-18.145%208.27875%20-19.25%208.9375%20C-27.64061736%2013.11803647%20-42.1161507%2013.9612831%20-51%2011%20C-51.09796875%2011.67804687%20-51.1959375%2012.35609375%20-51.296875%2013.0546875%20C-52.09650113%2018.03167082%20-53.07549372%2022.54151804%20-55.0625%2027.1875%20C-58.18113878%2034.59280707%20-58.84191514%2041.34103871%20-56%2049%20C-51.69477815%2055.71108112%20-45.90514151%2058.44542058%20-38.375%2060.3125%20C-28.59646317%2061.98237321%20-17.61397475%2061.2378015%20-9%2056%20C-6.49898905%2053.93089054%20-4.42615578%2051.9334749%20-3%2049%20C-2.8015185%2045.84858524%20-2.8015185%2045.84858524%20-3%2043%20C-3.63502441%2042.9498877%20-4.27004883%2042.89977539%20-4.92431641%2042.84814453%20C-7.82522523%2042.61482321%20-10.72505632%2042.37001416%20-13.625%2042.125%20C-14.62402344%2042.04636719%20-15.62304688%2041.96773437%20-16.65234375%2041.88671875%20C-29.19293478%2040.80706522%20-29.19293478%2040.80706522%20-33%2037%20C-32.79953373%2033.85936171%20-32.54877905%2031.72339057%20-30.625%2029.1875%20C-24.50435236%2024.71471903%20-13.19717736%2026.55890184%20-6%2027%20C-2.41396623%2027.60321914%200.69870236%2028.49303823%204%2030%20C4.94875%2030.4125%205.8975%2030.825%206.875%2031.25%20C11.08743551%2034.71906454%2012.65632177%2038.68972676%2014%2043.8125%20C14.64326159%2052.37282738%209.41850308%2059.51339193%204.13671875%2065.7421875%20C-2.45750281%2072.7101218%20-11.41635656%2078.38746195%20-21.19140625%2079.17700195%20C-37.70773611%2079.60385521%20-50.14814106%2078.46993862%20-63%2067%20C-73.50321308%2056.03782298%20-76.52428161%2045.45597262%20-76.2734375%2030.625%20C-75.77333104%2018.46399527%20-69.95822491%208.40894719%20-61.1875%200.1875%20C-43.74979764%20-14.14115465%20-17.3489938%20-15.03579462%200%200%20Z%20'%20fill='%23DA203E'%20transform='translate(80,13)'/%3e%3c/svg%3e";

const toonflowLogo = ""+new URL('logo-C2VG0lQ_.svg', import.meta.url).href+"";

const store = defineStore(
  "index",
  () => {
    const version = ref("v1.0.7");
    const activeMenu = ref("");
    const project = ref(null);
    const projectId = computed(() => {
      return project.value ? Number(project.value.id) : -1;
    });
    const currentScriptId = ref(null);
    async function setProjectById(id) {
      const res = await instance.post("/project/getSingleProject", { id });
      project.value = res.data[0];
      const scriptData = await instance.post("/script/getScrptApi", { projectId: id });
      currentScriptId.value = scriptData.data?.id || null;
    }
    return { version, activeMenu, project, projectId, currentScriptId, setProjectById };
  },
  { persist: false }
);

const _hoisted_1 = { class: "about" };
const _hoisted_2 = { class: "f" };
const _hoisted_3 = { class: "appName" };
const _hoisted_4 = { class: "data" };
const _hoisted_5 = { class: "version" };
const _hoisted_6 = { class: "renew ac" };
const _hoisted_7 = { style: { "margin-left": "5px" } };
const _hoisted_8 = { class: "codeRepository" };
const _hoisted_9 = { class: "f" };
const _hoisted_10 = { class: "github" };
const _hoisted_11 = { style: { "margin-left": "15px" } };
const _hoisted_12 = { style: { "font-size": "15px", "font-weight": "900" } };
const _hoisted_13 = { class: "f" };
const _hoisted_14 = { class: "gitee" };
const _hoisted_15 = { style: { "margin-left": "15px" } };
const _hoisted_16 = { style: { "font-size": "15px", "font-weight": "900" } };
const _hoisted_17 = { class: "license" };
const _hoisted_18 = { class: "f" };
const _hoisted_19 = { class: "data" };
const _hoisted_20 = { style: { "margin-left": "15px" } };
const _hoisted_21 = { style: { "font-size": "12px", "color": "#666" } };
const _hoisted_22 = { class: "updateDialog" };
const _hoisted_23 = { class: "updateHeader" };
const _hoisted_24 = { class: "updateIcon" };
const _hoisted_25 = { class: "updateTitle" };
const _hoisted_26 = {
  key: 0,
  class: "versionCompare"
};
const _hoisted_27 = { class: "versionCard current" };
const _hoisted_28 = { class: "versionLabel" };
const _hoisted_29 = { class: "arrow" };
const _hoisted_30 = { class: "versionCard latest" };
const _hoisted_31 = { class: "versionLabel" };
const _hoisted_32 = {
  key: 1,
  class: "versionTime"
};
const _hoisted_33 = { class: "versionTimeValue" };
const _hoisted_34 = {
  key: 2,
  class: "customUrl"
};
const _hoisted_35 = { class: "sourceSelect" };
const _hoisted_36 = { class: "sourceTitle" };
const _hoisted_37 = { class: "sourceCards" };
const _hoisted_38 = ["onClick"];
const _hoisted_39 = ["src", "alt"];
const _hoisted_40 = { class: "sourceName" };
const _hoisted_41 = {
  key: 0,
  class: "checkMark"
};
const _hoisted_42 = { style: { "display": "flex", "justify-content": "flex-end", "gap": "8px", "padding-top": "4px" } };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "about",
  setup(__props) {
    const { t } = useI18n();
    const { version } = storeToRefs(store());
    const { isElectron, needUpdate } = storeToRefs(settingStore());
    const showCustomUrl = ref(false);
    const customUpdateUrl = ref("");
    const logoClickCount = ref(0);
    let logoClickTimer = null;
    function onLogoClick() {
      logoClickCount.value++;
      if (logoClickCount.value === 1) {
        logoClickTimer = setTimeout(() => {
          logoClickCount.value = 0;
        }, 3e3);
      }
      if (logoClickCount.value >= 3) {
        logoClickCount.value = 0;
        if (logoClickTimer) clearTimeout(logoClickTimer);
        if (showCustomUrl.value) return;
        showCustomUrl.value = true;
        MessagePlugin.info("已开启自定义更新地址");
      }
    }
    const updateDialogVisible = ref(false);
    const updateSource = ref("toonflow");
    const updateSources = ref([
      {
        value: "toonflow",
        label: "ToonFlow",
        iconType: "image",
        iconSrc: toonflowLogo,
        iconClass: "toonflow",
        iconBg: "#ececec",
        disabled: false
      },
      {
        value: "github",
        label: t("settings.about.github"),
        iconType: "component",
        iconName: "github",
        iconClass: "github",
        disabled: true
      },
      {
        value: "atomgit",
        label: "AtomGit",
        iconType: "image",
        iconSrc: atomgitLogo,
        iconClass: "atomgit",
        iconBg: "#f9f9fb",
        disabled: true
      },
      {
        value: "gitee",
        label: t("settings.about.gitee"),
        iconType: "component",
        iconName: "code",
        iconClass: "gitee",
        disabled: true
      }
    ]);
    const updateLoading = ref(false);
    const updateInfo = ref({
      needUpdate: false,
      latestVersion: "",
      reinstall: false,
      time: 0,
      url: "",
      version: ""
    });
    const formattedUpdateTime = computed(() => {
      if (!updateInfo.value.time) {
        return "";
      }
      return dayjs(updateInfo.value.time).format("YYYY-MM-DD HH:mm:ss");
    });
    watch(updateSource, () => {
      updateInfo.value = { needUpdate: false, latestVersion: "", reinstall: false, time: 0, url: "", version: "" };
    });
    async function openLink(url) {
      if (isElectron.value) {
        await fetch(`toonflow://openurlwithbrowser?url=${url}`);
      } else {
        window.open(url, "_blank");
      }
    }
    onMounted(async () => {
      const { data } = await instance.get("/other/getVersion");
      version.value = data;
    });
    function checkUpdate() {
      updateInfo.value = { needUpdate: false, latestVersion: "", reinstall: false, time: 0, url: "", version: "" };
      updateSource.value = "toonflow";
      updateDialogVisible.value = true;
    }
    function getUpdateSourceLabel(source) {
      const sourceMap = {
        toonflow: "ToonFlow",
        github: "GitHub",
        atomgit: "AtomGit",
        gitee: "Gitee"
      };
      return sourceMap[source];
    }
    async function checkUpdateWithSource() {
      updateLoading.value = true;
      try {
        const { data } = await instance.post("/setting/about/checkUpdate", {
          source: updateSource.value,
          url: customUpdateUrl.value || null
        });
        if (customUpdateUrl.value) {
          data.needUpdate = true;
        }
        updateInfo.value = data;
        if (data.needUpdate) {
          window.$message.success(t("settings.about.updateAvailable"));
        } else {
          MessagePlugin.success(t("settings.about.noUpdate"));
        }
      } catch (e) {
        MessagePlugin.error(e.message ?? t("settings.about.updateFailed"));
      } finally {
        updateLoading.value = false;
      }
    }
    async function electronAction(action) {
      try {
        const res = await fetch(`toonflow://${action}`);
        return await res.json();
      } catch {
      }
    }
    async function doConfirmUpdate() {
      updateLoading.value = true;
      try {
        if (updateInfo.value.reinstall) {
          const dialog = DialogPlugin.alert({
            header: t("settings.about.reinstallRequired"),
            body: updateInfo.value.url,
            onConfirm: () => {
              dialog.destroy();
            },
            onClose: () => {
              dialog.destroy();
            }
          });
          try {
            await fetch(`toonflow://openurlwithbrowser?url=${updateInfo.value.url}`);
          } catch (error) {
          }
          return;
        }
        await instance.post("/setting/about/downloadApp", {
          url: updateInfo.value.url,
          reinstall: updateInfo.value.reinstall,
          version: updateInfo.value.version
        });
        electronAction("apprestart");
        MessagePlugin.success(t("settings.about.updateSuccess"));
        updateDialogVisible.value = false;
      } catch (e) {
        MessagePlugin.error(e.message ?? t("settings.about.updateFailed"));
      } finally {
        updateLoading.value = false;
      }
    }
    function confirmUpdate() {
      const reinstallWarning = updateInfo.value.reinstall ? "\n\n检测到该版本需要重新安装更新，安装过程中可能会替换现有安装，请先保存当前工作。" : "";
      const dialog = DialogPlugin.confirm({
        header: "确认更新",
        body: `将通过 ${getUpdateSourceLabel(updateSource.value)} 更新到 v${updateInfo.value.latestVersion}，确认继续吗？${reinstallWarning}`,
        confirmBtn: {
          content: t("settings.about.confirmUpdate"),
          theme: "primary"
        },
        cancelBtn: t("settings.about.cancel"),
        onConfirm: async () => {
          dialog.destroy();
          await doConfirmUpdate();
        },
        onClose: () => dialog.destroy()
      });
    }
    return (_ctx, _cache) => {
      const _component_t_tag = Tag;
      const _component_i_refresh = resolveComponent("i-refresh");
      const _component_t_button = Button;
      const _component_t_badge = Badge;
      const _component_t_card = Card;
      const _component_i_github = resolveComponent("i-github");
      const _component_i_right = resolveComponent("i-right");
      const _component_t_divider = Divider;
      const _component_i_code = resolveComponent("i-code");
      const _component_i_notes = resolveComponent("i-notes");
      const _component_t_input = Input;
      const _component_i_check_one = resolveComponent("i-check-one");
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_t_card, {
          bordered: "",
          style: { width: "100%" },
          class: "logoCard"
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("img", {
                src: _imports_0,
                alt: "ToonFlow Logo",
                class: "logo",
                onClick: onLogoClick
              }),
              createBaseVNode("div", _hoisted_3, [
                _cache[7] || (_cache[7] = createBaseVNode("div", { class: "name" }, "ToonFlow", -1)),
                createBaseVNode("div", _hoisted_4, toDisplayString(_ctx.$t("settings.about.slogan")), 1),
                createBaseVNode("div", _hoisted_5, [
                  createVNode(_component_t_tag, {
                    theme: "primary",
                    shape: "round",
                    size: "small",
                    style: { "padding": "10px" }
                  }, {
                    default: withCtx(() => [
                      createTextVNode("v" + toDisplayString(unref(version)), 1)
                    ]),
                    _: 1
                  })
                ])
              ]),
              createBaseVNode("div", _hoisted_6, [
                createVNode(_component_t_badge, {
                  count: unref(needUpdate) ? 1 : 0,
                  dot: "",
                  offset: [-4, -4]
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_button, {
                      theme: "primary",
                      onClick: checkUpdate
                    }, {
                      icon: withCtx(() => [
                        createVNode(_component_i_refresh, {
                          theme: "outline",
                          size: "18"
                        })
                      ]),
                      default: withCtx(() => [
                        createBaseVNode("span", _hoisted_7, toDisplayString(unref(needUpdate) ? _ctx.$t("settings.about.upToDate") : _ctx.$t("settings.about.checkUpdate")), 1)
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["count"])
              ])
            ])
          ]),
          _: 1
        }),
        createBaseVNode("div", _hoisted_8, [
          createBaseVNode("span", null, toDisplayString(_ctx.$t("settings.about.codeRepository")), 1),
          createVNode(_component_t_card, {
            bordered: "",
            style: { width: "100%" },
            class: "logoCard"
          }, {
            default: withCtx(() => [
              createBaseVNode("div", {
                class: "ac jb",
                style: { "cursor": "pointer" },
                onClick: _cache[0] || (_cache[0] = ($event) => openLink("https://github.com/HBAI-Ltd/Toonflow-app"))
              }, [
                createBaseVNode("div", _hoisted_9, [
                  createBaseVNode("div", _hoisted_10, [
                    createVNode(_component_i_github, {
                      fill: "#000",
                      theme: "outline",
                      size: "22",
                      class: "c",
                      style: { "width": "100%", "height": "100%" }
                    })
                  ]),
                  createBaseVNode("div", _hoisted_11, [
                    createBaseVNode("div", null, [
                      createBaseVNode("span", _hoisted_12, toDisplayString(_ctx.$t("settings.about.githubRepo")), 1)
                    ]),
                    _cache[8] || (_cache[8] = createBaseVNode("div", null, [
                      createBaseVNode("span", { style: { "font-size": "12px", "color": "#666" } }, "https://github.com/HBAI-Ltd/Toonflow-app")
                    ], -1))
                  ])
                ]),
                createVNode(_component_i_right, {
                  theme: "outline",
                  size: "18"
                })
              ]),
              createVNode(_component_t_divider),
              createBaseVNode("div", {
                class: "ac jb",
                style: { "cursor": "pointer" },
                onClick: _cache[1] || (_cache[1] = ($event) => openLink("https://gitee.com/HBAI-Ltd/Toonflow-app"))
              }, [
                createBaseVNode("div", _hoisted_13, [
                  createBaseVNode("div", _hoisted_14, [
                    createVNode(_component_i_code, {
                      fill: "#000",
                      theme: "outline",
                      size: "20",
                      class: "c",
                      style: { "width": "100%", "height": "100%" }
                    })
                  ]),
                  createBaseVNode("div", _hoisted_15, [
                    createBaseVNode("div", null, [
                      createBaseVNode("span", _hoisted_16, toDisplayString(_ctx.$t("settings.about.giteeRepo")), 1)
                    ]),
                    _cache[9] || (_cache[9] = createBaseVNode("div", null, [
                      createBaseVNode("span", { style: { "font-size": "12px", "color": "#666" } }, "https://gitee.com/HBAI-Ltd/Toonflow-app")
                    ], -1))
                  ])
                ]),
                createVNode(_component_i_right, {
                  theme: "outline",
                  size: "18"
                })
              ])
            ]),
            _: 1
          })
        ]),
        createBaseVNode("div", _hoisted_17, [
          createBaseVNode("span", null, toDisplayString(_ctx.$t("settings.about.license")), 1),
          createVNode(_component_t_card, {
            bordered: "",
            style: { width: "100%" },
            class: "logoCard"
          }, {
            default: withCtx(() => [
              createBaseVNode("div", {
                class: "ac jb",
                style: { "cursor": "pointer" },
                onClick: _cache[2] || (_cache[2] = ($event) => openLink("https://github.com/HBAI-Ltd/Toonflow-app?tab=Apache-2.0-1-ov-file"))
              }, [
                createBaseVNode("div", _hoisted_18, [
                  createBaseVNode("div", _hoisted_19, [
                    createVNode(_component_i_notes, {
                      fill: "#000",
                      theme: "outline",
                      size: "20",
                      class: "c",
                      style: { "width": "100%", "height": "100%" }
                    })
                  ]),
                  createBaseVNode("div", _hoisted_20, [
                    _cache[10] || (_cache[10] = createBaseVNode("div", null, [
                      createBaseVNode("span", { style: { "font-size": "15px", "font-weight": "900" } }, "Apache-2.0 License")
                    ], -1)),
                    createBaseVNode("div", null, [
                      createBaseVNode("span", _hoisted_21, toDisplayString(_ctx.$t("settings.about.licenseDesc")), 1)
                    ])
                  ])
                ]),
                createVNode(_component_i_right, {
                  theme: "outline",
                  size: "18"
                })
              ])
            ]),
            _: 1
          })
        ]),
        createVNode(_component_t_dialog, {
          visible: unref(updateDialogVisible),
          "onUpdate:visible": _cache[6] || (_cache[6] = ($event) => isRef(updateDialogVisible) ? updateDialogVisible.value = $event : null),
          header: false,
          "confirm-btn": null,
          "cancel-btn": null,
          "close-on-overlay-click": false,
          width: "600px"
        }, {
          footer: withCtx(() => [
            createBaseVNode("div", _hoisted_42, [
              createVNode(_component_t_button, {
                variant: "outline",
                onClick: _cache[4] || (_cache[4] = ($event) => updateDialogVisible.value = false),
                disabled: unref(updateLoading)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("settings.about.cancel")), 1)
                ]),
                _: 1
              }, 8, ["disabled"]),
              createVNode(_component_t_button, {
                theme: "primary",
                onClick: _cache[5] || (_cache[5] = ($event) => unref(updateInfo).needUpdate ? confirmUpdate() : checkUpdateWithSource()),
                loading: unref(updateLoading)
              }, {
                icon: withCtx(() => [
                  createVNode(_component_i_refresh, {
                    theme: "outline",
                    size: "16"
                  })
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(unref(updateInfo).needUpdate ? _ctx.$t("settings.about.confirmUpdate") : _ctx.$t("settings.about.checkUpdate")), 1)
                ]),
                _: 1
              }, 8, ["loading"])
            ])
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_22, [
              createBaseVNode("div", _hoisted_23, [
                createBaseVNode("div", _hoisted_24, [
                  createVNode(_component_i_refresh, {
                    theme: "outline",
                    size: "28",
                    style: { "color": "var(--td-brand-color)" }
                  })
                ]),
                createBaseVNode("div", _hoisted_25, toDisplayString(unref(updateInfo).needUpdate ? _ctx.$t("settings.about.updateAvailable") : unref(updateInfo).latestVersion ? _ctx.$t("settings.about.noUpdate") : _ctx.$t("settings.about.selectUpdateSource")), 1)
              ]),
              unref(updateInfo).latestVersion ? (openBlock(), createElementBlock("div", _hoisted_26, [
                createBaseVNode("div", _hoisted_27, [
                  createBaseVNode("span", _hoisted_28, toDisplayString(_ctx.$t("settings.about.currentVersion")), 1),
                  createVNode(_component_t_tag, {
                    theme: "default",
                    shape: "round",
                    size: "medium"
                  }, {
                    default: withCtx(() => [
                      createTextVNode("v" + toDisplayString(unref(version)), 1)
                    ]),
                    _: 1
                  })
                ]),
                createBaseVNode("div", _hoisted_29, [
                  createVNode(_component_i_right, {
                    theme: "outline",
                    size: "20",
                    style: { "color": "var(--td-brand-color)" }
                  })
                ]),
                createBaseVNode("div", _hoisted_30, [
                  createBaseVNode("span", _hoisted_31, toDisplayString(_ctx.$t("settings.about.latestVersionLabel")), 1),
                  createVNode(_component_t_tag, {
                    theme: "success",
                    shape: "round",
                    size: "medium"
                  }, {
                    default: withCtx(() => [
                      createTextVNode("v" + toDisplayString(unref(updateInfo).latestVersion), 1)
                    ]),
                    _: 1
                  })
                ])
              ])) : createCommentVNode("", true),
              unref(formattedUpdateTime) ? (openBlock(), createElementBlock("div", _hoisted_32, [
                _cache[11] || (_cache[11] = createBaseVNode("span", { class: "versionTimeLabel" }, "更新时间", -1)),
                createBaseVNode("span", _hoisted_33, toDisplayString(unref(formattedUpdateTime)), 1)
              ])) : createCommentVNode("", true),
              unref(showCustomUrl) ? (openBlock(), createElementBlock("div", _hoisted_34, [
                createVNode(_component_t_input, {
                  modelValue: unref(customUpdateUrl),
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(customUpdateUrl) ? customUpdateUrl.value = $event : null),
                  placeholder: "输入自定义更新地址",
                  clearable: "",
                  style: { "margin-bottom": "12px" }
                }, null, 8, ["modelValue"])
              ])) : createCommentVNode("", true),
              createBaseVNode("div", _hoisted_35, [
                createBaseVNode("span", _hoisted_36, toDisplayString(_ctx.$t("settings.about.selectUpdateSource")), 1),
                createBaseVNode("div", _hoisted_37, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(updateSources), (source) => {
                    return openBlock(), createElementBlock("div", {
                      class: normalizeClass(["sourceCard", { active: unref(updateSource) === source.value, disabled: source.disabled }]),
                      key: source.value,
                      onClick: ($event) => !source.disabled && (updateSource.value = source.value)
                    }, [
                      createBaseVNode("div", {
                        class: normalizeClass(["sourceIcon", source.iconClass]),
                        style: normalizeStyle(source.iconBg ? { background: source.iconBg } : void 0)
                      }, [
                        source.iconType === "image" ? (openBlock(), createElementBlock("img", {
                          key: 0,
                          src: source.iconSrc,
                          alt: source.label,
                          style: { "width": "22px", "height": "22px" }
                        }, null, 8, _hoisted_39)) : source.iconName === "github" ? (openBlock(), createBlock(_component_i_github, {
                          key: 1,
                          theme: "outline",
                          size: "22"
                        })) : source.iconName === "code" ? (openBlock(), createBlock(_component_i_code, {
                          key: 2,
                          theme: "outline",
                          size: "22"
                        })) : createCommentVNode("", true)
                      ], 6),
                      createBaseVNode("span", _hoisted_40, toDisplayString(source.label), 1),
                      unref(updateSource) === source.value ? (openBlock(), createElementBlock("div", _hoisted_41, [
                        createVNode(_component_i_check_one, {
                          theme: "filled",
                          size: "18",
                          style: { "color": "var(--td-brand-color)" }
                        })
                      ])) : createCommentVNode("", true)
                    ], 10, _hoisted_38);
                  }), 128))
                ])
              ])
            ])
          ]),
          _: 1
        }, 8, ["visible"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const about = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-bb0d0c51"]]);

export { about as default };

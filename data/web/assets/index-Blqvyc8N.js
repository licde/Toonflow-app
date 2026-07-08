import { l as defineComponent, bM as storeToRefs, bU as useModel, w as watch, aL as createElementBlock, j as createVNode, aM as withCtx, bV as mergeModels, aK as openBlock, aO as createBaseVNode, b0 as toDisplayString, a1 as unref, a$ as createTextVNode, F as Fragment, aP as renderList, aS as createBlock, r as ref, b2 as resolveComponent, av as isRef, bH as withModifiers, aT as createCommentVNode, c as computed, o as onMounted, b as onUnmounted } from './vue-vendor-Cj7sXJnb.js';
import { i as instance } from './axios-BzO0kuq-.js';
import { o as openAssetsSelector } from './assetsCheck-C3hsdxZF.js';
import { s as settingStore, _ as _export_sfc } from './index-BvNjvLGR.js';
import { E as Dialog, H as Form, J as FormItem, R as Input, T as Textarea, B as Button, a2 as Title, X as Tag, a0 as Upload, s as LoadingPlugin, U as Tabs, V as TabPanel, D as Divider, Z as Table, n as Tooltip, a3 as Checkbox, L as Loading, Y as Card, a4 as Empty, W as DialogPlugin } from './tdesign-C157N6jJ.js';
import { l as loadMammoth } from './loadMammoth-Cd5aeDfC.js';
import { p as projectStore } from './project-C_OB2JAu.js';
import { i as imageListCacheStore } from './imageListCache-NuwaVChp.js';
import './dayjs-CuToSpIM.js';
import './index-7l_O1IwH.js';
import './modelSelect-CP2wRMzT.js';
import './providersLogo-BCbaFq8_.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';

const _hoisted_1$3 = { class: "details" };
const _hoisted_2$3 = {
  class: "fc",
  style: { "width": "100%" }
};
const _hoisted_3$3 = { class: "scriptLen" };
const _hoisted_4$3 = { class: "assets-section" };
const _hoisted_5$3 = { class: "assets-header" };
const _hoisted_6$3 = {
  key: 0,
  class: "assets-list"
};
const _hoisted_7$3 = {
  key: 1,
  class: "assets-empty"
};
const _hoisted_8$3 = { style: { "margin-top": "16px", "text-align": "right" } };
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "editScript",
  props: /* @__PURE__ */ mergeModels({
    item: {}
  }, {
    "modelValue": { type: Boolean, ...{
      default: false
    } },
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["searchScripts"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const { otherSetting } = storeToRefs(settingStore());
    const detailsShow = useModel(__props, "modelValue");
    const props = __props;
    const selectedAssets = ref([]);
    watch(
      () => props.item?.relatedAssets,
      (relatedAssets) => {
        selectedAssets.value = relatedAssets?.map((a) => ({ id: a.id, name: a.name })) ?? [];
      },
      { immediate: true }
    );
    async function handleSelectAssets() {
      const assets = await openAssetsSelector({ title: $t("workbench.script.edit.msg.selectAssetsTitle"), types: ["role", "tool", "scene"] });
      if (assets.length) {
        const existing = new Set(selectedAssets.value.map((a) => a.id));
        for (const a of assets) {
          if (!existing.has(a.id)) {
            selectedAssets.value.push({ id: a.id, name: a.name });
          }
        }
      }
    }
    function removeAsset(id) {
      selectedAssets.value = selectedAssets.value.filter((a) => a.id !== id);
    }
    const emit = __emit;
    async function onConfirm() {
      try {
        await instance.post("/script/updateScript", {
          id: props.item.id,
          name: props.item.name,
          content: props.item.content,
          assets: selectedAssets.value.map((a) => a.id)
        });
        emit("searchScripts");
        detailsShow.value = false;
        window.$message.success($t("workbench.script.edit.msg.updateSuccess"));
      } catch (error) {
        window.$message.error(error?.message ?? $t("workbench.script.edit.msg.updateFailed"));
      } finally {
      }
    }
    return (_ctx, _cache) => {
      const _component_t_typography_title = Title;
      const _component_t_input = Input;
      const _component_t_form_item = FormItem;
      const _component_t_textarea = Textarea;
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_button = Button;
      const _component_t_tag = Tag;
      const _component_t_form = Form;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1$3, [
        createVNode(_component_t_dialog, {
          footer: false,
          visible: detailsShow.value,
          "onUpdate:visible": _cache[3] || (_cache[3] = ($event) => detailsShow.value = $event),
          width: "60vw",
          top: "5vh",
          onConfirm
        }, {
          header: withCtx(() => [
            createVNode(_component_t_typography_title, {
              level: "h4",
              style: { "margin": "0" }
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(_ctx.$t("workbench.script.edit.title")), 1)
              ]),
              _: 1
            })
          ]),
          default: withCtx(() => [
            createVNode(_component_t_form, {
              data: props.item,
              "label-align": "top",
              class: "detailsForm"
            }, {
              default: withCtx(() => [
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("workbench.script.edit.scriptName"),
                  name: "name"
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_input, {
                      modelValue: props.item.name,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => props.item.name = $event),
                      maxlength: 10,
                      placeholder: _ctx.$t("workbench.script.edit.scriptNamePh")
                    }, null, 8, ["modelValue", "placeholder"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("workbench.script.edit.scriptContent"),
                  name: "content"
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_2$3, [
                      createVNode(_component_t_textarea, {
                        modelValue: props.item.content,
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => props.item.content = $event),
                        placeholder: _ctx.$t("workbench.script.edit.scriptContentPh"),
                        autosize: { minRows: 20, maxRows: 20 }
                      }, null, 8, ["modelValue", "placeholder"]),
                      createBaseVNode("div", _hoisted_3$3, toDisplayString(props.item.content.length) + "/" + toDisplayString(unref(otherSetting).scriptEpisodeLength), 1)
                    ])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("workbench.script.edit.relatedAssets"),
                  name: "assets"
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_4$3, [
                      createBaseVNode("div", _hoisted_5$3, [
                        createVNode(_component_t_button, {
                          size: "small",
                          theme: "primary",
                          variant: "outline",
                          onClick: handleSelectAssets
                        }, {
                          icon: withCtx(() => [
                            createVNode(_component_i_plus)
                          ]),
                          default: withCtx(() => [
                            createTextVNode(" " + toDisplayString(_ctx.$t("workbench.script.edit.selectAssets")), 1)
                          ]),
                          _: 1
                        })
                      ]),
                      unref(selectedAssets).length ? (openBlock(), createElementBlock("div", _hoisted_6$3, [
                        (openBlock(true), createElementBlock(Fragment, null, renderList(unref(selectedAssets), (asset) => {
                          return openBlock(), createBlock(_component_t_tag, {
                            key: asset.id,
                            closable: "",
                            variant: "light-outline",
                            onClose: ($event) => removeAsset(asset.id)
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(asset.name), 1)
                            ]),
                            _: 2
                          }, 1032, ["onClose"]);
                        }), 128))
                      ])) : (openBlock(), createElementBlock("div", _hoisted_7$3, toDisplayString(_ctx.$t("workbench.script.edit.noAssets")), 1))
                    ])
                  ]),
                  _: 1
                }, 8, ["label"])
              ]),
              _: 1
            }, 8, ["data"]),
            createBaseVNode("div", _hoisted_8$3, [
              createVNode(_component_t_button, {
                variant: "outline",
                onClick: _cache[2] || (_cache[2] = ($event) => detailsShow.value = false)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.novel.import.prevStep")), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_button, {
                theme: "primary",
                style: { "margin-left": "10px" },
                disabled: props.item.content.length > unref(otherSetting).scriptEpisodeLength,
                onClick: onConfirm
              }, {
                default: withCtx(() => [..._cache[4] || (_cache[4] = [
                  createTextVNode(" 保存 ", -1)
                ])]),
                _: 1
              }, 8, ["disabled"])
            ])
          ]),
          _: 1
        }, 8, ["visible"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const editScript = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-201a7fd3"]]);

const _hoisted_1$2 = { class: "addScript" };
const _hoisted_2$2 = { class: "data" };
const _hoisted_3$2 = { class: "section name" };
const _hoisted_4$2 = { class: "section-label" };
const _hoisted_5$2 = { class: "section upload" };
const _hoisted_6$2 = { class: "section-label" };
const _hoisted_7$2 = { class: "dragIcon" };
const _hoisted_8$2 = { class: "upload-text" };
const _hoisted_9$2 = { class: "upload-hint" };
const _hoisted_10$2 = { class: "section content" };
const _hoisted_11$2 = { class: "section-label" };
const _hoisted_12$2 = { class: "scriptLen" };
const _hoisted_13$1 = { class: "section assets-section" };
const _hoisted_14$1 = { class: "assets-header" };
const _hoisted_15$1 = { class: "section-label" };
const _hoisted_16$1 = {
  key: 0,
  class: "assets-list"
};
const _hoisted_17$1 = {
  key: 1,
  class: "assets-empty"
};
const _hoisted_18$1 = { class: "dialog-footer" };
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "addScript",
  props: {
    "modelValue": { type: Boolean, ...{
      default: false
    } },
    "modelModifiers": {}
  },
  emits: /* @__PURE__ */ mergeModels(["searchScripts"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const { otherSetting } = storeToRefs(settingStore());
    const { project } = storeToRefs(projectStore());
    const addScriptShow = useModel(__props, "modelValue");
    const uploadRef = ref(null);
    const content = ref("");
    const fileList = ref([]);
    const scriptData = ref("");
    const keepLoading = ref(false);
    function triggerUpload() {
      uploadRef.value?.triggerUpload();
    }
    async function readFile(file) {
      const buffer = await file.arrayBuffer();
      if (file.type === "text/plain") {
        return new TextDecoder().decode(buffer);
      }
      const mammoth = await loadMammoth();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value;
    }
    async function handleBeforeUpload(file) {
      const rawFile = file.raw;
      if (!rawFile) {
        window.$message.error($t("workbench.script.add.msg.fileReadFailed"));
        return false;
      }
      const allowTypes = ["text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (rawFile.type === "application/msword") {
        window.$message.warning($t("workbench.script.add.msg.docNotSupported"));
        fileList.value = [];
        return false;
      }
      if (!allowTypes.includes(rawFile.type)) {
        window.$message.error($t("workbench.script.add.msg.unsupportedType"));
        fileList.value = [];
        return false;
      }
      if (rawFile.size > 10 * 1024 * 1024) {
        window.$message.error($t("workbench.script.add.msg.fileTooLarge"));
        fileList.value = [];
        return false;
      }
      const loader = LoadingPlugin({
        fullscreen: true,
        attach: "body",
        text: $t("workbench.script.add.msg.parsing")
      });
      try {
        content.value = await readFile(rawFile);
        scriptData.value = content.value;
      } catch (error) {
        console.error("文件解析失败:", error);
        window.$message.error($t("workbench.script.add.msg.parseFailed"));
        fileList.value = [];
      } finally {
        loader.hide();
      }
      return false;
    }
    async function handleDrop(e) {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        fileList.value = [];
        const file = files[0];
        await handleBeforeUpload({ raw: file });
      }
    }
    const selectedAssets = ref([]);
    async function handleSelectAssets() {
      const assets = await openAssetsSelector({ title: $t("workbench.script.add.msg.selectAssetsTitle"), types: ["role", "tool", "scene"] });
      if (assets.length) {
        const existing = new Set(selectedAssets.value.map((a) => a.id));
        for (const a of assets) {
          if (!existing.has(a.id)) {
            selectedAssets.value.push({ id: a.id, name: a.name });
          }
        }
      }
    }
    function removeAsset(id) {
      selectedAssets.value = selectedAssets.value.filter((a) => a.id !== id);
    }
    function handleCancel() {
      addScriptShow.value = false;
      scriptData.value = "";
      content.value = "";
      fileList.value = [];
      selectedAssets.value = [];
    }
    function closeWin() {
      scriptData.value = "";
      content.value = "";
      fileList.value = [];
      selectedAssets.value = [];
      addScriptShow.value = false;
    }
    const emit = __emit;
    async function handleConfirm() {
      if (!scriptData.value.trim()) {
        window.$message.warning($t("workbench.script.add.msg.enterContent"));
        return;
      }
      if (!scriptName.value.trim()) {
        window.$message.warning($t("workbench.script.add.msg.enterName"));
        return;
      }
      keepLoading.value = true;
      try {
        await instance.post("/script/addScript", {
          name: scriptName.value,
          content: scriptData.value,
          projectId: project.value?.id,
          assets: selectedAssets.value.map((a) => a.id)
        });
        window.$message.success($t("workbench.script.add.msg.addSuccess"));
        closeWin();
        emit("searchScripts");
      } catch (error) {
        console.error("添加剧本失败:", error);
        window.$message.error(error.message ?? $t("workbench.script.add.msg.addFailed"));
      } finally {
        keepLoading.value = false;
      }
    }
    const scriptName = ref("");
    return (_ctx, _cache) => {
      const _component_t_input = Input;
      const _component_t_upload = Upload;
      const _component_i_upload_one = resolveComponent("i-upload-one");
      const _component_t_textarea = Textarea;
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_button = Button;
      const _component_t_tag = Tag;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1$2, [
        createVNode(_component_t_dialog, {
          visible: addScriptShow.value,
          "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => addScriptShow.value = $event),
          width: "60vw",
          top: "5vh",
          header: _ctx.$t("workbench.script.add.title"),
          closable: false,
          maskClosable: false
        }, {
          footer: withCtx(() => [
            createBaseVNode("div", _hoisted_18$1, [
              createVNode(_component_t_button, {
                theme: "default",
                onClick: handleCancel
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.script.add.cancel")), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_button, {
                theme: "primary",
                loading: unref(keepLoading),
                disabled: unref(scriptData).length > unref(otherSetting).scriptEpisodeLength,
                onClick: handleConfirm
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.script.add.confirm")), 1)
                ]),
                _: 1
              }, 8, ["loading", "disabled"])
            ])
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2$2, [
              createBaseVNode("div", _hoisted_3$2, [
                createBaseVNode("span", _hoisted_4$2, toDisplayString(_ctx.$t("workbench.script.add.scriptName")), 1),
                createVNode(_component_t_input, {
                  modelValue: unref(scriptName),
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(scriptName) ? scriptName.value = $event : null),
                  placeholder: _ctx.$t("workbench.script.add.scriptNamePh")
                }, null, 8, ["modelValue", "placeholder"])
              ]),
              createBaseVNode("div", _hoisted_5$2, [
                createBaseVNode("span", _hoisted_6$2, toDisplayString(_ctx.$t("workbench.script.add.uploadFile")), 1),
                createBaseVNode("div", {
                  class: "upload-area",
                  onClick: triggerUpload,
                  onDragover: _cache[2] || (_cache[2] = withModifiers(() => {
                  }, ["prevent"])),
                  onDrop: withModifiers(handleDrop, ["prevent"])
                }, [
                  createVNode(_component_t_upload, {
                    ref_key: "uploadRef",
                    ref: uploadRef,
                    modelValue: unref(fileList),
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(fileList) ? fileList.value = $event : null),
                    theme: "file",
                    multiple: false,
                    max: 1,
                    "before-upload": handleBeforeUpload,
                    style: { "display": "none" }
                  }, null, 8, ["modelValue"]),
                  createBaseVNode("div", _hoisted_7$2, [
                    createVNode(_component_i_upload_one, {
                      theme: "outline",
                      size: "32",
                      fill: "var(--td-brand-color)"
                    })
                  ]),
                  createBaseVNode("p", _hoisted_8$2, toDisplayString(_ctx.$t("workbench.script.add.dragUpload")), 1),
                  createBaseVNode("p", _hoisted_9$2, toDisplayString(_ctx.$t("workbench.script.add.uploadHint")), 1)
                ], 32)
              ]),
              createBaseVNode("div", _hoisted_10$2, [
                createBaseVNode("span", _hoisted_11$2, toDisplayString(_ctx.$t("workbench.script.add.scriptContent")), 1),
                createVNode(_component_t_textarea, {
                  modelValue: unref(scriptData),
                  "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(scriptData) ? scriptData.value = $event : null),
                  placeholder: _ctx.$t("workbench.script.add.scriptContentPh"),
                  name: "description",
                  autosize: { minRows: 12, maxRows: 12 }
                }, null, 8, ["modelValue", "placeholder"]),
                createBaseVNode("div", _hoisted_12$2, toDisplayString(unref(scriptData).length) + "/" + toDisplayString(unref(otherSetting).scriptEpisodeLength), 1)
              ]),
              createBaseVNode("div", _hoisted_13$1, [
                createBaseVNode("div", _hoisted_14$1, [
                  createBaseVNode("span", _hoisted_15$1, toDisplayString(_ctx.$t("workbench.script.add.relatedAssets")), 1),
                  createVNode(_component_t_button, {
                    size: "small",
                    theme: "primary",
                    variant: "outline",
                    onClick: handleSelectAssets
                  }, {
                    icon: withCtx(() => [
                      createVNode(_component_i_plus)
                    ]),
                    default: withCtx(() => [
                      createTextVNode(" " + toDisplayString(_ctx.$t("workbench.script.add.selectAssets")), 1)
                    ]),
                    _: 1
                  })
                ]),
                unref(selectedAssets).length ? (openBlock(), createElementBlock("div", _hoisted_16$1, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(selectedAssets), (asset) => {
                    return openBlock(), createBlock(_component_t_tag, {
                      key: asset.id,
                      closable: "",
                      variant: "light-outline",
                      onClose: ($event) => removeAsset(asset.id)
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(asset.name), 1)
                      ]),
                      _: 2
                    }, 1032, ["onClose"]);
                  }), 128))
                ])) : (openBlock(), createElementBlock("div", _hoisted_17$1, toDisplayString(_ctx.$t("workbench.script.add.noAssets")), 1))
              ])
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const addScript = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-d917c8f4"]]);

const DEFAULT_EPISODE_REGEX = /第\s*([0-9０-９零一二三四五六七八九十百千万]+)\s*集\s*([^\n\r]*)/g;
const CHINESE_NUM_MAP = {
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9
};
const CHINESE_UNIT_MAP = {
  十: 10,
  百: 100,
  千: 1e3
};
function parseNumber(numStr) {
  if (/^\d+$/.test(numStr)) return parseInt(numStr, 10);
  if (/^十[一二三四五六七八九]?$/.test(numStr)) {
    if (numStr.length === 1) return 10;
    return 10 + CHINESE_NUM_MAP[numStr[1]];
  }
  let num = 0, digit = 0;
  for (const c of numStr) {
    if (CHINESE_NUM_MAP[c] !== void 0) digit = CHINESE_NUM_MAP[c];
    else if (CHINESE_UNIT_MAP[c] !== void 0) {
      if (digit === 0 && c === "十") digit = 1;
      num += digit * CHINESE_UNIT_MAP[c];
      digit = 0;
    }
  }
  num += digit;
  return num;
}
function parseRegStr(regStr) {
  const match = regStr.match(/^\/(.*)\/([ igmuy]*)$/);
  if (match) {
    return new RegExp(match[1], match[2].includes("g") ? match[2] : match[2] + "g");
  }
  return new RegExp(regStr, "g");
}
function parseScript(text, customRegStr) {
  let EPISODE_REGEX;
  const regStr = customRegStr?.trim();
  if (regStr) {
    EPISODE_REGEX = parseRegStr(regStr);
  } else {
    EPISODE_REGEX = DEFAULT_EPISODE_REGEX;
  }
  EPISODE_REGEX.lastIndex = 0;
  const matches = Array.from(text.matchAll(EPISODE_REGEX));
  const episodes = [];
  if (matches.length === 0 && text.trim() !== "") {
    episodes.push({ index: 1, chapter: "", text: text.trim() });
  } else {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i][0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const content = text.slice(start, end).replace(/^[\r\n]+/, "").trim();
      episodes.push({
        index: parseNumber(matches[i][1]),
        chapter: matches[i][2]?.trim() ?? "",
        text: content
      });
    }
  }
  episodes.sort((a, b) => a.index - b.index);
  return episodes;
}

const _hoisted_1$1 = { class: "purgeNovel" };
const _hoisted_2$1 = { class: "data" };
const _hoisted_3$1 = {
  class: "regexRow f ac",
  style: { "margin-top": "10px", "gap": "8px" }
};
const _hoisted_4$1 = { class: "regexLabel" };
const _hoisted_5$1 = { class: "dragIcon" };
const _hoisted_6$1 = { class: "uploadText" };
const _hoisted_7$1 = { class: "uploadHint" };
const _hoisted_8$1 = { class: "formItem" };
const _hoisted_9$1 = { class: "label" };
const _hoisted_10$1 = { class: "uploadWrap" };
const _hoisted_11$1 = {
  class: "footerInfo f ac jb",
  style: { "margin-top": "8px" }
};
const _hoisted_12$1 = { class: "charCount" };
const _hoisted_13 = {
  key: 0,
  class: "tips warn"
};
const _hoisted_14 = { style: { "margin-top": "16px", "text-align": "right" } };
const _hoisted_15 = { class: "fc to2Box" };
const _hoisted_16 = { class: "ellipsisText" };
const _hoisted_17 = { class: "selectedInfo" };
const _hoisted_18 = { style: { "margin-top": "16px", "text-align": "right" } };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "batchAddScript",
  props: {
    "modelValue": { type: Boolean },
    "modelModifiers": {}
  },
  emits: /* @__PURE__ */ mergeModels(["select"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const { otherSetting } = storeToRefs(settingStore());
    const { project } = storeToRefs(projectStore());
    const purgeNovelShow = useModel(__props, "modelValue");
    const activeKey = ref("To1");
    const uploadRef = ref();
    const content = ref("");
    const fileList = ref([]);
    const selectedRowKeys = ref([]);
    const nextLoading = ref(false);
    const customRegStr = ref("");
    const regexError = ref("");
    const aiRegexLoading = ref(false);
    watch(customRegStr, (val) => {
      if (!val.trim()) {
        regexError.value = "";
        return;
      }
      try {
        const m = val.match(/^\/(.*)\/([ igmuy]*)$/);
        new RegExp(m ? m[1] : val);
        regexError.value = "";
      } catch {
        regexError.value = $t("workbench.script.import.regexInvalid");
      }
    });
    const columns = [
      { colKey: "row-select", type: "multiple", width: 60 },
      { colKey: "index", title: $t("workbench.script.import.col.chapter"), width: 100 },
      { colKey: "scriptName", title: $t("workbench.script.import.col.scriptName"), width: 200, ellipsis: true },
      { colKey: "scriptData", title: $t("workbench.script.import.col.scriptData"), ellipsis: true }
    ];
    const tableData = computed(() => {
      if (!content.value) return [];
      try {
        return parseScript(content.value, customRegStr.value || void 0).map((ep) => ({
          index: ep.index,
          scriptName: ep.chapter,
          scriptData: ep.text
        }));
      } catch (e) {
        console.error("解析剧本内容出错:", e);
        return [];
      }
    });
    const selectedRows = computed(() => tableData.value.filter((item) => selectedRowKeys.value.includes(item.index)));
    const selectedTextLength = computed(() => selectedRows.value.reduce((sum, item) => sum + item.scriptData.length, 0));
    function triggerUpload() {
      uploadRef.value?.triggerUpload();
    }
    async function handleDrop(e) {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        await handleBeforeUpload({ raw: files[0] });
      }
    }
    async function readFile(file) {
      const buffer = await file.arrayBuffer();
      if (file.type === "text/plain") {
        return new TextDecoder().decode(buffer);
      }
      const mammoth = await loadMammoth();
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      return result.value;
    }
    function requestMethod() {
      return Promise.resolve({
        response: {},
        status: "success"
      });
    }
    async function handleBeforeUpload(file) {
      const rawFile = file.raw;
      if (!rawFile) {
        window.$message.error($t("workbench.novel.import.msg.selectFile"));
        return false;
      }
      const allowTypes = ["text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (rawFile.type === "application/msword") {
        window.$message.warning($t("workbench.novel.import.msg.docNotSupported"));
        return false;
      }
      if (!allowTypes.includes(rawFile.type)) {
        window.$message.error($t("workbench.novel.import.msg.unsupportedType"));
        return false;
      }
      if (rawFile.size > 10 * 1024 * 1024) {
        window.$message.error($t("workbench.novel.import.msg.fileTooLarge"));
        return false;
      }
      LoadingPlugin(true);
      try {
        content.value = await readFile(rawFile);
      } catch {
        window.$message.error($t("workbench.novel.import.msg.parseFailed"));
      } finally {
        LoadingPlugin(false);
      }
      return false;
    }
    function onSelectChange(selectedKeys, context) {
      selectedRowKeys.value = selectedKeys;
    }
    const emit = __emit;
    async function keep() {
      nextLoading.value = true;
      if (!selectedRows.value.length) {
        window.$message.warning($t("workbench.script.import.msg.selectChapters"));
        nextLoading.value = false;
        return;
      }
      try {
        await instance.post("/script/batchAddScript", { projectId: project.value?.id, data: selectedRows.value });
        emit("select");
        window.$message.success($t("workbench.script.import.msg.saveSuccess"));
        purgeNovelShow.value = false;
      } catch (e) {
        window.$message.error(e.message);
      } finally {
        nextLoading.value = false;
      }
    }
    watch(purgeNovelShow, (newVal) => {
      if (!newVal) {
        content.value = "";
        fileList.value = [];
        selectedRowKeys.value = [];
        activeKey.value = "To1";
        customRegStr.value = "";
        regexError.value = "";
      }
    });
    async function getAiRegex() {
      if (!content.value.trim()) {
        window.$message.warning($t("workbench.script.import.msg.selectChapters"));
        return;
      }
      const sample = content.value.slice(0, 2e3);
      aiRegexLoading.value = true;
      try {
        const { data } = await instance.post("/script/getAiRegex", { content: sample });
        if (data) {
          customRegStr.value = data;
        }
      } catch (e) {
        window.$message.error(e.message);
      } finally {
        aiRegexLoading.value = false;
      }
    }
    return (_ctx, _cache) => {
      const _component_t_input = Input;
      const _component_t_button = Button;
      const _component_t_upload = Upload;
      const _component_i_upload_one = resolveComponent("i-upload-one");
      const _component_t_divider = Divider;
      const _component_t_textarea = Textarea;
      const _component_t_tab_panel = TabPanel;
      const _component_t_tooltip = Tooltip;
      const _component_t_table = Table;
      const _component_t_tabs = Tabs;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createVNode(_component_t_dialog, {
          footer: false,
          visible: purgeNovelShow.value,
          "onUpdate:visible": _cache[6] || (_cache[6] = ($event) => purgeNovelShow.value = $event),
          header: _ctx.$t("workbench.script.import.batchTitle"),
          width: "50%",
          placement: "center"
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2$1, [
              createVNode(_component_t_tabs, {
                value: unref(activeKey),
                disabled: ""
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_tab_panel, {
                    value: "To1",
                    label: _ctx.$t("workbench.novel.import.step1"),
                    style: { "height": "680px", "overflow-y": "auto" }
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_3$1, [
                        createBaseVNode("span", _hoisted_4$1, toDisplayString(_ctx.$t("workbench.script.import.episodeRegex")), 1),
                        createVNode(_component_t_input, {
                          modelValue: unref(customRegStr),
                          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(customRegStr) ? customRegStr.value = $event : null),
                          placeholder: _ctx.$t("workbench.script.import.episodeRegexPh"),
                          clearable: "",
                          disabled: unref(aiRegexLoading),
                          style: { "flex": "1" },
                          status: unref(regexError) ? "error" : void 0,
                          tips: unref(regexError) || void 0
                        }, null, 8, ["modelValue", "placeholder", "disabled", "status", "tips"]),
                        createVNode(_component_t_button, {
                          loading: unref(aiRegexLoading),
                          onClick: getAiRegex
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.script.import.getAiRegex")), 1)
                          ]),
                          _: 1
                        }, 8, ["loading"])
                      ]),
                      createBaseVNode("div", {
                        class: "uploadArea",
                        onClick: triggerUpload,
                        onDragover: _cache[2] || (_cache[2] = withModifiers(() => {
                        }, ["prevent"])),
                        onDrop: withModifiers(handleDrop, ["prevent"])
                      }, [
                        createVNode(_component_t_upload, {
                          ref_key: "uploadRef",
                          ref: uploadRef,
                          modelValue: unref(fileList),
                          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(fileList) ? fileList.value = $event : null),
                          theme: "file",
                          multiple: false,
                          max: 1,
                          "before-upload": handleBeforeUpload,
                          "request-method": requestMethod,
                          style: { "display": "none" }
                        }, null, 8, ["modelValue"]),
                        createBaseVNode("div", _hoisted_5$1, [
                          createVNode(_component_i_upload_one, {
                            theme: "outline",
                            size: "32",
                            fill: "var(--td-brand-color)"
                          })
                        ]),
                        createBaseVNode("p", _hoisted_6$1, toDisplayString(_ctx.$t("workbench.script.add.dragUpload")), 1),
                        createBaseVNode("p", _hoisted_7$1, toDisplayString(_ctx.$t("workbench.novel.import.uploadHint")), 1)
                      ], 32),
                      createVNode(_component_t_divider, null, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(_ctx.$t("workbench.novel.import.or")), 1)
                        ]),
                        _: 1
                      }),
                      createBaseVNode("div", _hoisted_8$1, [
                        createBaseVNode("div", _hoisted_9$1, toDisplayString(_ctx.$t("workbench.script.import.pasteLabel")), 1),
                        createBaseVNode("div", _hoisted_10$1, [
                          createVNode(_component_t_textarea, {
                            modelValue: unref(content),
                            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(content) ? content.value = $event : null),
                            placeholder: _ctx.$t("workbench.script.add.scriptContentPh"),
                            autosize: { minRows: 10, maxRows: 10 }
                          }, null, 8, ["modelValue", "placeholder"])
                        ]),
                        createBaseVNode("div", _hoisted_11$1, [
                          createBaseVNode("div", null, [
                            createBaseVNode("span", _hoisted_12$1, toDisplayString(unref(content).length) + " " + toDisplayString(_ctx.$t("workbench.novel.import.chars")), 1),
                            unref(content).length > 0 && unref(content).length < 100 ? (openBlock(), createElementBlock("span", _hoisted_13, toDisplayString(_ctx.$t("workbench.novel.import.tooShort")), 1)) : createCommentVNode("", true)
                          ]),
                          createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.script.import.parsedChapters", { count: unref(tableData).length })), 1)
                        ])
                      ]),
                      createBaseVNode("div", _hoisted_14, [
                        createVNode(_component_t_button, {
                          theme: "primary",
                          style: { "margin-left": "10px" },
                          disabled: !unref(content) || !unref(tableData).length,
                          onClick: _cache[4] || (_cache[4] = ($event) => activeKey.value = "To2")
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.novel.import.nextStep")), 1)
                          ]),
                          _: 1
                        }, 8, ["disabled"])
                      ])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_tab_panel, {
                    value: "To2",
                    label: _ctx.$t("workbench.novel.import.step2"),
                    style: { "height": "680px", "overflow-y": "auto" }
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_15, [
                        createVNode(_component_t_table, {
                          ref: "tableRef",
                          "row-key": "index",
                          data: unref(tableData),
                          columns,
                          "selected-row-keys": unref(selectedRowKeys),
                          hover: "",
                          style: { "flex": "1", "overflow-y": "auto" },
                          onSelectChange
                        }, {
                          chapterData: withCtx(({ row }) => [
                            createVNode(_component_t_tooltip, {
                              content: row.chapterData,
                              placement: "top"
                            }, {
                              default: withCtx(() => [
                                createBaseVNode("span", _hoisted_16, toDisplayString(row.chapterData), 1)
                              ]),
                              _: 2
                            }, 1032, ["content"])
                          ]),
                          _: 1
                        }, 8, ["data", "selected-row-keys"]),
                        createBaseVNode("div", _hoisted_17, toDisplayString(_ctx.$t("workbench.novel.import.selectedInfo", { count: unref(selectedTextLength) })), 1),
                        createBaseVNode("div", _hoisted_18, [
                          createVNode(_component_t_button, {
                            variant: "outline",
                            onClick: _cache[5] || (_cache[5] = ($event) => activeKey.value = "To1")
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("workbench.novel.import.prevStep")), 1)
                            ]),
                            _: 1
                          }),
                          createVNode(_component_t_button, {
                            theme: "primary",
                            style: { "margin-left": "10px" },
                            disabled: unref(selectedTextLength) > unref(otherSetting).scriptEpisodeLength,
                            loading: unref(nextLoading),
                            onClick: keep
                          }, {
                            default: withCtx(() => [..._cache[7] || (_cache[7] = [
                              createTextVNode(" 保存 ", -1)
                            ])]),
                            _: 1
                          }, 8, ["disabled", "loading"])
                        ])
                      ])
                    ]),
                    _: 1
                  }, 8, ["label"])
                ]),
                _: 1
              }, 8, ["value"])
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const batchAddScript = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-cbd3bc11"]]);

const _hoisted_1 = { class: "script" };
const _hoisted_2 = { class: "actionBar w" };
const _hoisted_3 = { class: "actionBar-left f ac" };
const _hoisted_4 = {
  key: 0,
  class: "actionBar-right f ac w"
};
const _hoisted_5 = { class: "contentArea" };
const _hoisted_6 = {
  key: 0,
  class: "emptyState"
};
const _hoisted_7 = {
  key: 1,
  class: "scriptsList f w"
};
const _hoisted_8 = ["onClick"];
const _hoisted_9 = { class: "cardHeader" };
const _hoisted_10 = { class: "cardTitle" };
const _hoisted_11 = { class: "content" };
const _hoisted_12 = { class: "del" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const { clearScriptCache } = imageListCacheStore();
    const { otherSetting } = storeToRefs(settingStore());
    const { project } = storeToRefs(projectStore());
    const scripts = ref([]);
    const searchQuery = ref("");
    const addScriptShow = ref(false);
    const selectedIds = ref([]);
    const scriptLoad = ref(false);
    const batchScriptShow = ref(false);
    const isAllSelected = computed(() => scripts.value.length > 0 && selectedIds.value.length === scripts.value.length);
    function toggleSelect(id) {
      const idx = selectedIds.value.indexOf(id);
      if (idx === -1) {
        selectedIds.value.push(id);
      } else {
        selectedIds.value.splice(idx, 1);
      }
    }
    function toggleSelectAll(checked) {
      if (checked) {
        selectedIds.value = scripts.value.map((s) => s.id);
      } else {
        selectedIds.value = [];
      }
    }
    async function searchScripts() {
      try {
        const res = await instance.post("/script/getScrptApi", {
          projectId: project.value?.id,
          name: searchQuery.value
        });
        scripts.value = res.data;
      } catch (error) {
        console.error("搜索剧本失败:", error);
        window.$message.error($t("workbench.script.msg.searchFailed"));
      }
    }
    onMounted(searchScripts);
    function onChange() {
      searchScripts();
    }
    function handleAddScript() {
      addScriptShow.value = true;
    }
    function handleBatchAddScript() {
      batchScriptShow.value = true;
    }
    async function handleExportScript() {
      if (!selectedIds.value.length) {
        window.$message.warning($t("workbench.script.msg.selectsExport"));
        return;
      }
      try {
        const res = await instance.post("/script/exportScript", { id: selectedIds.value }, { responseType: "blob" });
        const blob = new Blob([res], { type: "application/zip" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `script_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        window.$message.success($t("workbench.script.msg.exportSuccess"));
      } catch (error) {
        console.error("导出剧本失败:", error);
        window.$message.error(error.message ?? $t("workbench.script.msg.exportFailed"));
      }
    }
    const selectedScript = ref({
      id: 0,
      name: "",
      content: ""
    });
    const detailsShow = ref(false);
    function handleScriptClick(item) {
      selectedScript.value = { ...item };
      detailsShow.value = true;
    }
    async function handleDeleteScript(scriptId) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.script.msg.deleteHeader"),
        body: $t("workbench.script.msg.deleteBody"),
        confirmBtn: $t("workbench.script.msg.deleteConfirm"),
        cancelBtn: $t("workbench.script.msg.cancel"),
        theme: "warning",
        onConfirm: async () => {
          try {
            await instance.post("/script/delScript", { ids: [scriptId] });
            window.$message.success($t("workbench.script.msg.deleteSuccess"));
            clearScriptCache(project.value.id, scriptId);
            searchScripts();
            dialog.destroy();
            selectedIds.value = selectedIds.value.filter((i) => i !== scriptId);
          } catch (error) {
            console.error("删除剧本失败:", error);
            window.$message.error($t("workbench.script.msg.deleteFailed"));
            dialog.destroy();
          }
        },
        onClose: () => {
          dialog.destroy();
        }
      });
    }
    async function handleExtractAssets() {
      if (!project.value) return window.$message.error($t("workbench.script.msg.projectNotFound"));
      scriptLoad.value = true;
      try {
        await instance.post("/script/extractAssets", {
          scriptIds: selectedIds.value,
          projectId: project.value.id,
          groupSize: otherSetting.value.assetsBatchGenereateSize
        });
        searchScripts();
        selectedIds.value = [];
      } catch (e) {
        window.$message.error(e?.message || $t("workbench.script.msg.extractFailed"));
      } finally {
        scriptLoad.value = false;
      }
    }
    async function handleBatchDelete() {
      if (!selectedIds.value.length) {
        window.$message.warning($t("workbench.script.msg.selectDelScript"));
        return;
      }
      const extractingIds = new Set(notCompletedData.value.map((s) => s.id));
      if (selectedIds.value.some((id) => extractingIds.has(id))) {
        return window.$message.error($t("workbench.script.msg.extractingInProgress"));
      }
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.script.msg.batchDeleteHeader"),
        body: $t("workbench.script.msg.batchDeleteBody", { count: selectedIds.value.length }),
        confirmBtn: $t("workbench.script.msg.deleteConfirm"),
        cancelBtn: $t("workbench.script.msg.cancel"),
        theme: "warning",
        onConfirm: async () => {
          try {
            await instance.post("/script/delScript", { ids: selectedIds.value });
            window.$message.success($t("workbench.script.msg.batchDeleteSuccess"));
            for (const item of selectedIds.value) {
              clearScriptCache(project.value.id, item);
            }
            searchScripts();
            dialog.destroy();
          } catch (error) {
            console.error("删除剧本失败:", error);
            window.$message.error($t("workbench.script.msg.deleteFailed"));
            dialog.destroy();
          } finally {
            selectedIds.value = [];
          }
        },
        onClose: () => {
          dialog.destroy();
        }
      });
    }
    let pollingTimer = null;
    function startPolling() {
      if (pollingTimer) return;
      pollingTimer = setInterval(async () => {
        if (notCompletedData.value.length === 0) {
          stopPolling();
          return;
        }
        await pollScriptAssets();
      }, 3e3);
    }
    function stopPolling() {
      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
    }
    const notCompletedData = computed(() => {
      return scripts.value.filter((s) => s.extractState == 0);
    });
    async function pollScriptAssets() {
      if (notCompletedData.value.length === 0) return;
      const ids = notCompletedData.value.map((item) => item.id);
      try {
        const { data } = await instance.post("/script/pollScriptAssets", { ids });
        if (data.length) {
          searchScripts();
        }
      } catch (e) {
        console.error("轮询事件状态失败:", e);
      }
    }
    watch(
      () => notCompletedData.value,
      (newVal) => {
        if (newVal.length > 0) {
          startPolling();
        } else {
          stopPolling();
        }
      }
    );
    onUnmounted(() => {
      stopPolling();
    });
    return (_ctx, _cache) => {
      const _component_t_input = Input;
      const _component_i_search = resolveComponent("i-search");
      const _component_t_button = Button;
      const _component_i_plus = resolveComponent("i-plus");
      const _component_i_export = resolveComponent("i-export");
      const _component_i_delete = resolveComponent("i-delete");
      const _component_t_empty = Empty;
      const _component_t_checkbox = Checkbox;
      const _component_t_loading = Loading;
      const _component_t_tag = Tag;
      const _component_t_tooltip = Tooltip;
      const _component_t_card = Card;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createVNode(_component_t_input, {
              placeholder: _ctx.$t("workbench.script.searchPlaceholder"),
              modelValue: unref(searchQuery),
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(searchQuery) ? searchQuery.value = $event : null),
              class: "searchInput",
              clearable: "",
              style: { "width": "300px" }
            }, null, 8, ["placeholder", "modelValue"]),
            createVNode(_component_t_button, {
              theme: "primary",
              onClick: onChange
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_search)
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.script.search")), 1)
              ]),
              _: 1
            }),
            createVNode(_component_t_button, {
              theme: "primary",
              onClick: handleAddScript
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_plus)
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.script.addScript")), 1)
              ]),
              _: 1
            }),
            createVNode(_component_t_button, {
              theme: "primary",
              onClick: handleBatchAddScript
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_plus)
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.script.batchAddScript")), 1)
              ]),
              _: 1
            })
          ]),
          unref(scripts).length ? (openBlock(), createElementBlock("div", _hoisted_4, [
            createVNode(_component_t_button, {
              theme: unref(isAllSelected) ? "default" : "primary",
              variant: "outline",
              onClick: _cache[1] || (_cache[1] = ($event) => toggleSelectAll(!unref(isAllSelected)))
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(unref(isAllSelected) ? _ctx.$t("workbench.script.cancelSelectAll") : _ctx.$t("workbench.script.selectAll")), 1)
              ]),
              _: 1
            }, 8, ["theme"]),
            createVNode(_component_t_button, {
              theme: "primary",
              onClick: handleExportScript,
              disabled: unref(selectedIds).length === 0
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_export)
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.script.exportScript")) + toDisplayString(unref(selectedIds).length ? `(${unref(selectedIds).length})` : ""), 1)
              ]),
              _: 1
            }, 8, ["disabled"]),
            createVNode(_component_t_button, {
              theme: "primary",
              onClick: handleExtractAssets,
              loading: unref(scriptLoad),
              disabled: unref(selectedIds).length === 0
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_export)
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.script.extractAssets")) + toDisplayString(unref(selectedIds).length ? `(${unref(selectedIds).length})` : ""), 1)
              ]),
              _: 1
            }, 8, ["loading", "disabled"]),
            createVNode(_component_t_button, {
              theme: "primary",
              onClick: handleBatchDelete,
              disabled: unref(selectedIds).length === 0
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_delete)
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.script.deleteScript")) + toDisplayString(unref(selectedIds).length ? `(${unref(selectedIds).length})` : ""), 1)
              ]),
              _: 1
            }, 8, ["disabled"])
          ])) : createCommentVNode("", true)
        ]),
        createBaseVNode("div", _hoisted_5, [
          unref(scripts).length === 0 ? (openBlock(), createElementBlock("div", _hoisted_6, [
            createVNode(_component_t_empty)
          ])) : (openBlock(), createElementBlock("div", _hoisted_7, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(scripts), (item, index) => {
              return openBlock(), createElementBlock("div", {
                key: index,
                onClick: ($event) => handleScriptClick(item),
                class: "scriptCard"
              }, [
                createVNode(_component_t_card, {
                  shadow: "",
                  "hover-shadow": "",
                  style: { width: "400px", cursor: "pointer" }
                }, {
                  header: withCtx(() => [
                    createBaseVNode("div", _hoisted_9, [
                      createBaseVNode("span", _hoisted_10, toDisplayString(item.name), 1),
                      createVNode(_component_t_checkbox, {
                        checked: unref(selectedIds).includes(item.id),
                        onClick: _cache[2] || (_cache[2] = withModifiers(() => {
                        }, ["stop"])),
                        onChange: ($event) => toggleSelect(item.id),
                        class: "cardCheckbox"
                      }, null, 8, ["checked", "onChange"])
                    ])
                  ]),
                  default: withCtx(() => [
                    createBaseVNode("span", _hoisted_11, toDisplayString(item.content), 1),
                    item?.extractState == 0 ? (openBlock(), createBlock(_component_t_loading, {
                      key: 0,
                      text: _ctx.$t("workbench.script.msg.extracting"),
                      size: "small"
                    }, null, 8, ["text"])) : createCommentVNode("", true),
                    item?.extractState == 2 ? (openBlock(), createBlock(_component_t_loading, {
                      key: 1,
                      text: _ctx.$t("workbench.script.msg.waitExtract"),
                      size: "small"
                    }, null, 8, ["text"])) : createCommentVNode("", true),
                    item?.extractState == -1 ? (openBlock(), createBlock(_component_t_tooltip, {
                      key: 2,
                      content: item.errorReason,
                      theme: "light"
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_t_tag, {
                          theme: "danger",
                          size: "small"
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.script.msg.extractFailed")), 1)
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["content"])) : item.relatedAssets?.length ? (openBlock(), createElementBlock("div", {
                      key: 3,
                      class: "assetTags",
                      onClick: _cache[3] || (_cache[3] = withModifiers(() => {
                      }, ["stop"]))
                    }, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(item.relatedAssets, (asset) => {
                        return openBlock(), createBlock(_component_t_tag, {
                          key: asset.id,
                          variant: "light-outline",
                          size: "small"
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(asset.name), 1)
                          ]),
                          _: 2
                        }, 1024);
                      }), 128))
                    ])) : createCommentVNode("", true),
                    createBaseVNode("div", _hoisted_12, [
                      createVNode(_component_i_delete, {
                        theme: "outline",
                        size: "18",
                        onClick: withModifiers(($event) => handleDeleteScript(item.id), ["stop"]),
                        style: { "cursor": "pointer" }
                      }, null, 8, ["onClick"])
                    ])
                  ]),
                  _: 2
                }, 1024)
              ], 8, _hoisted_8);
            }), 128))
          ]))
        ]),
        createVNode(editScript, {
          modelValue: unref(detailsShow),
          "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => isRef(detailsShow) ? detailsShow.value = $event : null),
          item: unref(selectedScript),
          onSearchScripts: searchScripts
        }, null, 8, ["modelValue", "item"]),
        createVNode(addScript, {
          modelValue: unref(addScriptShow),
          "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef(addScriptShow) ? addScriptShow.value = $event : null),
          onSearchScripts: searchScripts
        }, null, 8, ["modelValue"]),
        createVNode(batchAddScript, {
          modelValue: unref(batchScriptShow),
          "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => isRef(batchScriptShow) ? batchScriptShow.value = $event : null),
          onSelect: searchScripts
        }, null, 8, ["modelValue"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-4d9bd20e"]]);

export { index as default };

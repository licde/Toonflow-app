import { l as defineComponent, bM as storeToRefs, bU as useModel, w as watch, aL as createElementBlock, j as createVNode, aM as withCtx, bV as mergeModels, aK as openBlock, aO as createBaseVNode, a1 as unref, bH as withModifiers, av as isRef, b0 as toDisplayString, a$ as createTextVNode, aT as createCommentVNode, r as ref, c as computed, b2 as resolveComponent, o as onMounted, b as onUnmounted, aS as createBlock } from './vue-vendor-Byo5TD6r.js';
import { d as dayjs } from './dayjs-CuToSpIM.js';
import { i as instance } from './axios-DoLZCC01.js';
import { s as settingStore, p as projectStore, _ as _export_sfc } from './index-Dj17DntQ.js';
import { l as loadMammoth, a as adaptationFlowBar } from './index-D1_t-VWp.js';
import { E as Dialog, U as Tabs, V as TabPanel, a0 as Upload, D as Divider, T as Textarea, B as Button, Z as Table, n as Tooltip, s as LoadingPlugin, H as Form, J as FormItem, R as Input, o as Space, I as Icon, W as DialogPlugin, L as Loading, a1 as Link } from './tdesign-CfL1pweZ.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './useAdaptationNav-BJTPyVmA.js';

const REEL_REGEX = /^(第[\d一二三四五六七八九十百千]+卷)\s*([^\n第]*)/gm;
const DEFAULT_CHAPTER_REGEX = /第\s*([0-9０-９零一二三四五六七八九十百千万]+)\s*[章回节]\s*([^\n\r]*)/g;
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
function parseNovel(text) {
  REEL_REGEX.lastIndex = 0;
  const reelMatches = Array.from(text.matchAll(REEL_REGEX));
  const reels = [];
  let CHAPTER_REGEX;
  const regStr = settingStore().otherSetting.chapterReg;
  if (regStr) {
    const match = regStr.match(/^\/(.*)\/([igmuy]*)$/);
    if (match) {
      CHAPTER_REGEX = new RegExp(match[1], match[2]);
    } else {
      CHAPTER_REGEX = new RegExp(regStr);
    }
  } else {
    CHAPTER_REGEX = DEFAULT_CHAPTER_REGEX;
  }
  if (reelMatches.length === 0) {
    const chapters = [];
    CHAPTER_REGEX.lastIndex = 0;
    const matches = Array.from(text.matchAll(CHAPTER_REGEX));
    if (matches.length === 0 && text.trim() !== "") {
      chapters.push({ index: 1, chapter: "", text: text.trim() });
    } else {
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index + matches[i][0].length;
        const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
        const content = text.slice(start, end).replace(/^[\r\n]+/, "").trim();
        chapters.push({
          index: parseNumber(matches[i][1].replace(/第|章/g, "")),
          chapter: matches[i][2].trim(),
          text: content
        });
      }
    }
    chapters.sort((a, b) => a.index - b.index);
    reels.push({
      index: 1,
      reel: "正文卷",
      chapters
    });
    return reels;
  }
  const reelMap = /* @__PURE__ */ new Map();
  for (let i = 0; i < reelMatches.length; i++) {
    const match = reelMatches[i];
    const index = match.index;
    const reelRaw = match[1];
    const reelName = match[2]?.trim() || "";
    const end = i + 1 < reelMatches.length ? reelMatches[i + 1].index : text.length;
    const reelSection = text.slice(index, end);
    const chapterMatches = Array.from(reelSection.matchAll(CHAPTER_REGEX));
    const chapters = [];
    if (chapterMatches.length === 0 && reelSection.replace(REEL_REGEX, "").trim() !== "") {
      chapters.push({
        index: 1,
        chapter: "",
        text: reelSection.replace(REEL_REGEX, "").trim()
      });
    }
    for (let j = 0; j < chapterMatches.length; j++) {
      const start = chapterMatches[j].index + chapterMatches[j][0].length;
      const end2 = j + 1 < chapterMatches.length ? chapterMatches[j + 1].index : reelSection.length;
      const content = reelSection.slice(start, end2).replace(/^[\r\n]+/, "").trim();
      chapters.push({
        index: parseNumber(chapterMatches[j][1].replace(/第|章/g, "")),
        chapter: chapterMatches[j][2].trim(),
        text: content
      });
    }
    chapters.sort((a, b) => a.index - b.index);
    if (!reelMap.has(reelName)) {
      reelMap.set(reelName, {
        index: parseNumber(reelRaw.replace(/第|卷/g, "")),
        reel: reelName,
        chapters: []
      });
    }
    reelMap.get(reelName).chapters.push(...chapters);
  }
  const result = Array.from(reelMap.values()).sort((a, b) => a.index - b.index);
  result.forEach((reel) => reel.chapters.sort((a, b) => a.index - b.index));
  return result;
}

const _hoisted_1$2 = { class: "purgeNovel" };
const _hoisted_2$2 = { class: "data" };
const _hoisted_3$2 = { class: "dragIcon" };
const _hoisted_4$1 = { class: "uploadText" };
const _hoisted_5$1 = { class: "uploadHint" };
const _hoisted_6$1 = { class: "formItem" };
const _hoisted_7$1 = { class: "label" };
const _hoisted_8$1 = { class: "uploadWrap" };
const _hoisted_9 = {
  class: "footerInfo f ac jb",
  style: { "margin-top": "8px" }
};
const _hoisted_10 = { class: "charCount" };
const _hoisted_11 = {
  key: 0,
  class: "tips warn"
};
const _hoisted_12 = { style: { "margin-top": "16px", "text-align": "right" } };
const _hoisted_13 = { class: "fc to2Box" };
const _hoisted_14 = { class: "ellipsisText" };
const _hoisted_15 = { class: "selectedInfo" };
const _hoisted_16 = { style: { "margin-top": "16px", "text-align": "right" } };
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "importNovel",
  props: {
    "modelValue": { type: Boolean },
    "modelModifiers": {}
  },
  emits: /* @__PURE__ */ mergeModels(["select"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const { project } = storeToRefs(projectStore());
    const purgeNovelShow = useModel(__props, "modelValue");
    const activeKey = ref("To1");
    const uploadRef = ref();
    const content = ref("");
    const fileList = ref([]);
    const selectedRowKeys = ref([]);
    const nextLoading = ref(false);
    const columns = [
      { colKey: "row-select", type: "multiple", width: 60 },
      { colKey: "index", title: $t("workbench.novel.import.col.chapter"), width: 100 },
      { colKey: "reel", title: $t("workbench.novel.import.col.reel"), width: 100 },
      { colKey: "chapter", title: $t("workbench.novel.import.col.chapterName"), width: 200, ellipsis: true },
      { colKey: "chapterData", title: $t("workbench.novel.import.col.chapterData"), ellipsis: true }
    ];
    const tableData = computed(() => {
      if (!content.value) return [];
      try {
        return parseNovel(content.value).flatMap(
          (reel) => reel.chapters.map((chapter) => ({
            index: chapter.index,
            reel: reel.reel,
            chapter: chapter.chapter,
            chapterData: chapter.text
          }))
        );
      } catch (e) {
        console.error("解析小说内容出错:", e);
        return [];
      }
    });
    const selectedRows = computed(() => tableData.value.filter((item) => selectedRowKeys.value.includes(item.index)));
    const selectedTextLength = computed(() => selectedRows.value.reduce((sum, item) => sum + item.chapterData.length, 0));
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
        window.$message.warning($t("workbench.novel.import.msg.selectChapters"));
        nextLoading.value = false;
        return;
      }
      try {
        await instance.post("/novel/addNovel", { projectId: project.value?.id, data: selectedRows.value });
        nextLoading.value = false;
        emit("select");
        window.$message.success($t("workbench.novel.import.msg.saveSuccess"));
      } catch (e) {
        window.$message.error(e.message);
        nextLoading.value = false;
      } finally {
        nextLoading.value = false;
        purgeNovelShow.value = false;
      }
    }
    watch(purgeNovelShow, (newVal) => {
      if (!newVal) {
        content.value = "";
        fileList.value = [];
        selectedRowKeys.value = [];
        activeKey.value = "To1";
      }
    });
    return (_ctx, _cache) => {
      const _component_t_upload = Upload;
      const _component_i_upload_one = resolveComponent("i-upload-one");
      const _component_t_divider = Divider;
      const _component_t_textarea = Textarea;
      const _component_t_button = Button;
      const _component_t_tab_panel = TabPanel;
      const _component_t_tooltip = Tooltip;
      const _component_t_table = Table;
      const _component_t_tabs = Tabs;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1$2, [
        createVNode(_component_t_dialog, {
          footer: false,
          visible: purgeNovelShow.value,
          "onUpdate:visible": _cache[5] || (_cache[5] = ($event) => purgeNovelShow.value = $event),
          header: _ctx.$t("workbench.novel.import.title"),
          width: "50%",
          placement: "center"
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2$2, [
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
                      createBaseVNode("div", {
                        class: "uploadArea",
                        onClick: triggerUpload,
                        onDragover: _cache[1] || (_cache[1] = withModifiers(() => {
                        }, ["prevent"])),
                        onDrop: withModifiers(handleDrop, ["prevent"])
                      }, [
                        createVNode(_component_t_upload, {
                          ref_key: "uploadRef",
                          ref: uploadRef,
                          modelValue: unref(fileList),
                          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(fileList) ? fileList.value = $event : null),
                          theme: "file",
                          multiple: false,
                          max: 1,
                          "before-upload": handleBeforeUpload,
                          "request-method": requestMethod,
                          style: { "display": "none" }
                        }, null, 8, ["modelValue"]),
                        createBaseVNode("div", _hoisted_3$2, [
                          createVNode(_component_i_upload_one, {
                            theme: "outline",
                            size: "32",
                            fill: "var(--td-brand-color)"
                          })
                        ]),
                        createBaseVNode("p", _hoisted_4$1, toDisplayString(_ctx.$t("workbench.novel.import.dragUpload")), 1),
                        createBaseVNode("p", _hoisted_5$1, toDisplayString(_ctx.$t("workbench.novel.import.uploadHint")), 1)
                      ], 32),
                      createVNode(_component_t_divider, null, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(_ctx.$t("workbench.novel.import.or")), 1)
                        ]),
                        _: 1
                      }),
                      createBaseVNode("div", _hoisted_6$1, [
                        createBaseVNode("div", _hoisted_7$1, toDisplayString(_ctx.$t("workbench.novel.import.pasteLabel")), 1),
                        createBaseVNode("div", _hoisted_8$1, [
                          createVNode(_component_t_textarea, {
                            modelValue: unref(content),
                            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(content) ? content.value = $event : null),
                            placeholder: _ctx.$t("workbench.novel.import.pastePlaceholder"),
                            autosize: { minRows: 12, maxRows: 12 }
                          }, null, 8, ["modelValue", "placeholder"])
                        ]),
                        createBaseVNode("div", _hoisted_9, [
                          createBaseVNode("div", null, [
                            createBaseVNode("span", _hoisted_10, toDisplayString(unref(content).length) + " " + toDisplayString(_ctx.$t("workbench.novel.import.chars")), 1),
                            unref(content).length > 0 && unref(content).length < 100 ? (openBlock(), createElementBlock("span", _hoisted_11, toDisplayString(_ctx.$t("workbench.novel.import.tooShort")), 1)) : createCommentVNode("", true)
                          ]),
                          createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.novel.import.parsedChapters", { count: unref(tableData).length })), 1)
                        ])
                      ]),
                      createBaseVNode("div", _hoisted_12, [
                        createVNode(_component_t_button, {
                          theme: "primary",
                          style: { "margin-left": "10px" },
                          disabled: !unref(content) || !unref(tableData).length,
                          onClick: _cache[3] || (_cache[3] = ($event) => activeKey.value = "To2")
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
                      createBaseVNode("div", _hoisted_13, [
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
                                createBaseVNode("span", _hoisted_14, toDisplayString(row.chapterData), 1)
                              ]),
                              _: 2
                            }, 1032, ["content"])
                          ]),
                          _: 1
                        }, 8, ["data", "selected-row-keys"]),
                        createBaseVNode("div", _hoisted_15, toDisplayString(_ctx.$t("workbench.novel.import.selectedInfo", { count: unref(selectedTextLength) })), 1),
                        createBaseVNode("div", _hoisted_16, [
                          createVNode(_component_t_button, {
                            variant: "outline",
                            onClick: _cache[4] || (_cache[4] = ($event) => activeKey.value = "To1")
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("workbench.novel.import.prevStep")), 1)
                            ]),
                            _: 1
                          }),
                          createVNode(_component_t_button, {
                            theme: "primary",
                            style: { "margin-left": "10px" },
                            loading: unref(nextLoading),
                            onClick: keep
                          }, {
                            default: withCtx(() => [..._cache[6] || (_cache[6] = [
                              createTextVNode(" 保存 ", -1)
                            ])]),
                            _: 1
                          }, 8, ["loading"])
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

const importNovel = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-bf9b9b8c"]]);

const _hoisted_1$1 = { class: "editNodel" };
const _hoisted_2$1 = {
  class: "data",
  style: { "overflow-x": "hidden" }
};
const _hoisted_3$1 = { class: "editNodel-footer" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "editNodel",
  props: /* @__PURE__ */ mergeModels({
    formData: {}
  }, {
    "modelValue": { type: Boolean },
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["select"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const editNodelShow = useModel(__props, "modelValue");
    const props = __props;
    const emit = __emit;
    async function saveChanges() {
      console.log("保存的章节数据:", props.formData);
      try {
        await instance.post("/novel/updateNovel", {
          id: props.formData.id,
          index: props.formData.index,
          reel: props.formData.reel,
          chapter: props.formData.chapter,
          chapterData: props.formData.chapterData,
          event: props.formData.event
        });
        emit("select");
        window.$message.success($t("workbench.novel.editDialog.msg.updateSuccess"));
      } catch (e) {
        window.$message.error(e.message);
      } finally {
        editNodelShow.value = false;
      }
      editNodelShow.value = false;
    }
    return (_ctx, _cache) => {
      const _component_t_input = Input;
      const _component_t_form_item = FormItem;
      const _component_t_textarea = Textarea;
      const _component_t_form = Form;
      const _component_t_button = Button;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createVNode(_component_t_dialog, {
          visible: editNodelShow.value,
          "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => editNodelShow.value = $event),
          header: _ctx.$t("workbench.novel.editDialog.title"),
          width: "50%",
          top: "10vh",
          placement: "center"
        }, {
          footer: withCtx(() => [
            createBaseVNode("div", _hoisted_3$1, [
              createVNode(_component_t_button, {
                onClick: _cache[3] || (_cache[3] = ($event) => editNodelShow.value = false)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.novel.editDialog.cancel")), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_button, {
                theme: "primary",
                onClick: saveChanges
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.novel.editDialog.save")), 1)
                ]),
                _: 1
              })
            ])
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2$1, [
              createVNode(_component_t_form, { "label-width": "80px" }, {
                default: withCtx(() => [
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.novel.editDialog.chapterName")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_input, {
                        placeholder: _ctx.$t("workbench.novel.editDialog.chapterNamePh"),
                        modelValue: __props.formData.chapter,
                        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => __props.formData.chapter = $event)
                      }, null, 8, ["placeholder", "modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.novel.editDialog.eventContent")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_textarea, {
                        modelValue: __props.formData.event,
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => __props.formData.event = $event),
                        placeholder: _ctx.$t("workbench.novel.editDialog.eventContentPh")
                      }, null, 8, ["modelValue", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.novel.editDialog.chapterContent")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_textarea, {
                        placeholder: _ctx.$t("workbench.novel.editDialog.chapterContentPh"),
                        modelValue: __props.formData.chapterData,
                        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => __props.formData.chapterData = $event),
                        autosize: { minRows: 15, maxRows: 15 }
                      }, null, 8, ["placeholder", "modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"])
                ]),
                _: 1
              })
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const editNodel = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-9e187c61"]]);

const _hoisted_1 = {
  class: "novel",
  ref: "novelRef"
};
const _hoisted_2 = {
  class: "headBtn jb ac",
  ref: "headBtnRef"
};
const _hoisted_3 = { class: "f" };
const _hoisted_4 = {
  key: 2,
  class: "eventCell"
};
const _hoisted_5 = { class: "eventPreview" };
const _hoisted_6 = { class: "chapterDataCell" };
const _hoisted_7 = { class: "chapterPreview" };
const _hoisted_8 = { class: "previewDialogContent" };
const PREVIEW_MAX_LENGTH = 80;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const { otherSetting } = storeToRefs(settingStore());
    const { project } = storeToRefs(projectStore());
    const searchText = ref("");
    const columns = ref([
      {
        colKey: "row-select",
        type: "multiple",
        width: 50,
        align: "center"
      },
      {
        colKey: "index",
        title: $t("workbench.novel.col.id"),
        width: 50,
        align: "center"
      },
      { colKey: "reel", title: $t("workbench.novel.col.reel"), width: 100, align: "center", cell: "preview" },
      { colKey: "chapter", title: $t("workbench.novel.col.chapter"), width: 100, ellipsis: true },
      { colKey: "chapterData", title: $t("workbench.novel.col.chapterData"), ellipsis: true },
      { colKey: "event", title: $t("workbench.novel.col.event"), ellipsis: true },
      { colKey: "operation", title: $t("workbench.novel.col.operation"), width: 200, align: "center" }
    ]);
    const editNodelShow = ref(false);
    const formData = ref({ id: -1, index: 0, reel: "", chapter: "", chapterData: "", event: "" });
    const previewVisible = ref(false);
    const previewTitle = ref("");
    const previewContent = ref("");
    function formatPreview(text) {
      if (!text) return $t("workbench.novel.none");
      if (text.length <= PREVIEW_MAX_LENGTH) return text;
      return `${text.slice(0, PREVIEW_MAX_LENGTH)}...`;
    }
    function openPreview(title, content) {
      previewTitle.value = title;
      previewContent.value = content || "";
      previewVisible.value = true;
    }
    const tableData = ref([]);
    const loading = ref(false);
    const selectedRowKeys = ref([]);
    const pagination = ref({
      page: 1,
      pageSize: 10,
      total: 0
    });
    onMounted(() => {
      getNovel();
    });
    onUnmounted(() => {
      stopPolling();
    });
    function onChange() {
      pagination.value.page = 1;
      getNovel();
    }
    function getNovel() {
      loading.value = true;
      instance.post("/novel/getNovel", {
        projectId: project.value?.id,
        page: pagination.value.page,
        limit: pagination.value.pageSize,
        search: searchText.value
      }).then((res) => {
        tableData.value = res.data.data;
        pagination.value.total = res.data.total;
      }).finally(() => {
        loading.value = false;
      });
    }
    function handlePageChange(pageInfo) {
      pagination.value.page = pageInfo.current;
      pagination.value.pageSize = pageInfo.pageSize;
      getNovel();
    }
    const importNovelShow = ref(false);
    function importNovelFn() {
      importNovelShow.value = true;
    }
    function handleSelectChange(value, context) {
      selectedRowKeys.value = value.filter(Boolean);
    }
    function handleBatchDelete() {
      if (selectedRowKeys.value.length === 0) return;
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.novel.msg.batchDeleteHeader"),
        body: $t("workbench.novel.msg.batchDeleteBody", { count: selectedRowKeys.value.length }),
        onConfirm: async () => {
          await instance.post("/novel/batchDeleteNovel", {
            ids: selectedRowKeys.value
          });
          getNovel();
          window.$message.success($t("workbench.novel.msg.batchDeleteSuccess"));
          dialog.destroy();
        }
      });
    }
    function handleEdit(row) {
      editNodelShow.value = true;
      formData.value = { ...row };
    }
    function handleDelete(row) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.novel.msg.deleteHeader"),
        body: $t("workbench.novel.msg.deleteBody", { name: row.chapter }),
        onConfirm: async () => {
          try {
            await instance.post("/novel/delNovel", { id: row.id });
            window.$message.success($t("workbench.novel.msg.deleteSuccess"));
            if (tableData.value.length === 1 && pagination.value.page > 1) {
              pagination.value.page -= 1;
            }
            getNovel();
          } catch (e) {
            window.$message.error(e.message);
          }
          window.$message.success($t("workbench.novel.msg.deleteSuccess"));
          dialog.destroy();
        }
      });
    }
    function startEventAnalysis() {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.novel.msg.eventAnalysisHeader"),
        body: $t("workbench.novel.msg.eventAnalysisBody", { count: selectedRowKeys.value.length }),
        onConfirm: () => {
          dialog.destroy();
          instance.post("/novel/event/generateEvents", {
            projectId: project.value?.id,
            novelIds: selectedRowKeys.value,
            concurrentCount: otherSetting.value.assetsBatchGenereateSize
          }).then((res) => {
            selectedRowKeys.value.length = 0;
            getNovel();
          });
        }
      });
    }
    const notCompultedData = computed(() => {
      return tableData.value.filter((item) => !item.eventState);
    });
    let pollingTimer = null;
    async function pollEventState() {
      if (notCompultedData.value.length === 0) return;
      const ids = notCompultedData.value.map((item) => item.id);
      try {
        const { data } = await instance.post("/novel/getNovelEventState", { ids });
        if (Array.isArray(data)) {
          data.forEach((item) => {
            const target = tableData.value.find((row) => row.id === item.id);
            if (target) {
              target.eventState = item.eventState;
              if (target.eventState == -1) target.errorReason = item.errorReason;
              if (item.event !== void 0) target.event = item.event;
            }
          });
        }
      } catch (e) {
        console.error("轮询事件状态失败:", e);
      }
    }
    function startPolling() {
      if (pollingTimer) return;
      pollingTimer = setInterval(async () => {
        if (notCompultedData.value.length === 0) {
          stopPolling();
          return;
        }
        await pollEventState();
      }, 3e3);
    }
    function stopPolling() {
      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
    }
    watch(notCompultedData, (val) => {
      if (val.length > 0) {
        startPolling();
      } else {
        stopPolling();
      }
    });
    onUnmounted(() => {
      stopPolling();
    });
    return (_ctx, _cache) => {
      const _component_t_icon = Icon;
      const _component_t_button = Button;
      const _component_t_space = Space;
      const _component_t_input = Input;
      const _component_t_loading = Loading;
      const _component_t_link = Link;
      const _component_t_table = Table;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createVNode(_component_t_space, null, {
            default: withCtx(() => [
              createVNode(_component_t_button, {
                theme: "primary",
                onClick: importNovelFn
              }, {
                icon: withCtx(() => [
                  createVNode(_component_t_icon, { name: "add" })
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(_ctx.$t("workbench.novel.importText")), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_button, {
                theme: "danger",
                disabled: unref(selectedRowKeys).length === 0,
                onClick: handleBatchDelete
              }, {
                icon: withCtx(() => [
                  createVNode(_component_t_icon, { name: "delete" })
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(_ctx.$t("workbench.novel.batchDelete")) + " " + toDisplayString(unref(selectedRowKeys).length > 0 ? `(${unref(selectedRowKeys).length})` : ""), 1)
                ]),
                _: 1
              }, 8, ["disabled"]),
              createVNode(_component_t_button, {
                onClick: startEventAnalysis,
                disabled: unref(selectedRowKeys).length === 0
              }, {
                icon: withCtx(() => [
                  createVNode(_component_t_icon, { name: "analytics" })
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(_ctx.$t("workbench.novel.eventAnalysis")) + " " + toDisplayString(unref(selectedRowKeys).length > 0 ? `(${unref(selectedRowKeys).length})` : ""), 1)
                ]),
                _: 1
              }, 8, ["disabled"])
            ]),
            _: 1
          }),
          createBaseVNode("div", _hoisted_3, [
            createVNode(_component_t_input, {
              modelValue: unref(searchText),
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(searchText) ? searchText.value = $event : null),
              placeholder: _ctx.$t("workbench.novel.searchPlaceholder"),
              clearable: "",
              style: { "width": "260px" }
            }, null, 8, ["modelValue", "placeholder"]),
            createVNode(_component_t_button, {
              onClick: onChange,
              style: { "margin-left": "10px" }
            }, {
              icon: withCtx(() => [
                createVNode(_component_t_icon, { name: "search" })
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.novel.search")), 1)
              ]),
              _: 1
            })
          ])
        ], 512),
        createVNode(adaptationFlowBar),
        createVNode(_component_t_table, {
          ref: "tableRef",
          style: { "margin-top": "10px", "flex": "1", "display": "flex", "flex-direction": "column" },
          columns: unref(columns),
          data: unref(tableData),
          "selected-row-keys": unref(selectedRowKeys),
          "select-on-row-click": true,
          keyboardRowHover: false,
          "row-key": "id",
          hover: "",
          stripe: "",
          size: "small",
          pagination: unref(pagination),
          loading: unref(loading),
          "lazy-load": "",
          "table-layout": "fixed",
          onSelectChange: handleSelectChange,
          onPageChange: handlePageChange
        }, {
          startTime: withCtx(({ row }) => [
            createBaseVNode("span", null, toDisplayString(unref(dayjs)(row.startTime).format("YYYY-MM-DD HH:mm:ss")), 1)
          ]),
          event: withCtx(({ row }) => [
            row.eventState == 0 ? (openBlock(), createBlock(_component_t_loading, {
              key: 0,
              size: "small",
              text: _ctx.$t("workbench.novel.generating")
            }, null, 8, ["text"])) : row.eventState == -1 && !row.event ? (openBlock(), createBlock(_component_t_button, {
              key: 1,
              theme: "danger",
              variant: "text",
              size: "small",
              onClick: withModifiers(($event) => openPreview(_ctx.$t("workbench.novel.genFailed"), row?.errorReason), ["stop"])
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(_ctx.$t("workbench.novel.genFailed")), 1)
              ]),
              _: 1
            }, 8, ["onClick"])) : (openBlock(), createElementBlock("div", _hoisted_4, [
              createBaseVNode("div", _hoisted_5, toDisplayString(formatPreview(row.event)), 1),
              row.event && row.event.length > PREVIEW_MAX_LENGTH ? (openBlock(), createBlock(_component_t_link, {
                key: 0,
                theme: "success",
                hover: "color",
                onClick: ($event) => openPreview(_ctx.$t("workbench.novel.col.event"), row.event)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.novel.viewDetail")), 1)
                ]),
                _: 1
              }, 8, ["onClick"])) : createCommentVNode("", true)
            ]))
          ]),
          chapterData: withCtx(({ row }) => [
            createBaseVNode("div", _hoisted_6, [
              createBaseVNode("div", _hoisted_7, toDisplayString(formatPreview(row.chapterData)), 1),
              row.chapterData && row.chapterData.length > PREVIEW_MAX_LENGTH ? (openBlock(), createBlock(_component_t_link, {
                key: 0,
                theme: "success",
                hover: "color",
                onClick: withModifiers(($event) => openPreview(_ctx.$t("workbench.novel.col.chapterData"), row.chapterData), ["stop"])
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.novel.viewDetail")), 1)
                ]),
                _: 1
              }, 8, ["onClick"])) : createCommentVNode("", true)
            ])
          ]),
          operation: withCtx(({ row }) => [
            createVNode(_component_t_space, { size: 0 }, {
              default: withCtx(() => [
                createVNode(_component_t_button, {
                  theme: "primary",
                  disabled: row.eventState == 0,
                  variant: "text",
                  onClick: ($event) => handleEdit(row)
                }, {
                  icon: withCtx(() => [
                    createVNode(_component_t_icon, { name: "edit" })
                  ]),
                  default: withCtx(() => [
                    createTextVNode(" " + toDisplayString(_ctx.$t("workbench.novel.edit")), 1)
                  ]),
                  _: 1
                }, 8, ["disabled", "onClick"]),
                createVNode(_component_t_button, {
                  theme: "danger",
                  disabled: row.eventState == 0,
                  variant: "text",
                  onClick: ($event) => handleDelete(row)
                }, {
                  icon: withCtx(() => [
                    createVNode(_component_t_icon, { name: "delete" })
                  ]),
                  default: withCtx(() => [
                    createTextVNode(" " + toDisplayString(_ctx.$t("workbench.novel.delete")), 1)
                  ]),
                  _: 1
                }, 8, ["disabled", "onClick"])
              ]),
              _: 2
            }, 1024)
          ]),
          _: 1
        }, 8, ["columns", "data", "selected-row-keys", "pagination", "loading"]),
        createVNode(_component_t_dialog, {
          visible: unref(previewVisible),
          "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => isRef(previewVisible) ? previewVisible.value = $event : null),
          header: unref(previewTitle),
          width: "900px",
          placement: "top",
          top: "10vh",
          "destroy-on-close": "",
          footer: false
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_8, toDisplayString(unref(previewContent) || _ctx.$t("workbench.novel.none")), 1)
          ]),
          _: 1
        }, 8, ["visible", "header"]),
        createVNode(importNovel, {
          modelValue: unref(importNovelShow),
          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(importNovelShow) ? importNovelShow.value = $event : null),
          onSelect: getNovel
        }, null, 8, ["modelValue"]),
        createVNode(editNodel, {
          modelValue: unref(editNodelShow),
          "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(editNodelShow) ? editNodelShow.value = $event : null),
          formData: unref(formData),
          onSelect: getNovel
        }, null, 8, ["modelValue", "formData"])
      ], 512);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-9dd35b9d"]]);

export { index as default };

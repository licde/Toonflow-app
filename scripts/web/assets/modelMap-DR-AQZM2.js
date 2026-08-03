import { i as instance } from './axios-DoLZCC01.js';
import { A as AsyncMdEditor } from './AsyncMdEditor-Borgk8h0.js';
import { s as settingStore, _ as _export_sfc } from './index-Dj17DntQ.js';
import { l as defineComponent, bM as storeToRefs, o as onMounted, aK as openBlock, aL as createElementBlock, F as Fragment, aP as renderList, aS as createBlock, aM as withCtx, j as createVNode, a$ as createTextVNode, b0 as toDisplayString, aO as createBaseVNode, aT as createCommentVNode, a1 as unref, r as ref } from './vue-vendor-Byo5TD6r.js';
import { l as CollapsePanel, Z as Table, o as Space, B as Button, I as Icon, X as Tag, E as Dialog, H as Form, J as FormItem, R as Input, K as Select, O as Option, C as Collapse } from './tdesign-CfL1pweZ.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "modelMap" };
const _hoisted_2 = { class: "type" };
const _hoisted_3 = { class: "prompt-select" };
const _hoisted_4 = { class: "prompt-select-header" };
const _hoisted_5 = { class: "prompt-current" };
const _hoisted_6 = { class: "label" };
const _hoisted_7 = { style: { "display": "flex", "align-items": "center", "gap": "6px" } };
const _hoisted_8 = { class: "add-prompt-form" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "modelMap",
  setup(__props) {
    const { themeSetting } = storeToRefs(settingStore());
    const promptToolbars = [
      "bold",
      "italic",
      "strikeThrough",
      "-",
      "unorderedList",
      "orderedList",
      "-",
      "revoke",
      "next",
      "=",
      "preview"
    ];
    const modelMap = ref([]);
    const promptList = ref([]);
    onMounted(() => {
      queryModelMap();
    });
    function getPromptList() {
      instance.get("/setting/modelMap/getPromptList").then((res) => {
        promptList.value = res.data;
      });
    }
    function queryModelMap() {
      instance.post("/setting/modelMap/getImageAndVideoModel").then((res) => {
        modelMap.value = res.data;
      });
    }
    const columns = [
      {
        colKey: "name",
        title: $t("settings.memory.modelMap.name"),
        width: 150,
        align: "left"
      },
      {
        colKey: "model",
        title: $t("settings.memory.modelMap.model"),
        width: 150,
        align: "left"
      },
      {
        colKey: "type",
        title: $t("settings.memory.modelMap.type"),
        width: 50,
        align: "left"
      },
      {
        colKey: "operation",
        title: $t("settings.memory.modelMap.operation"),
        width: 100,
        align: "center",
        fixed: "right",
        cell: "operation"
      }
    ];
    const visible = ref(false);
    const promptForm = ref({
      name: "",
      type: "",
      model: "",
      path: "",
      fileName: ""
    });
    const currentSupplier = ref("");
    function promptEditor(item, value) {
      visible.value = true;
      promptForm.value = value;
      currentSupplier.value = item.id;
      getPromptList();
    }
    const promptColumns = [
      {
        colKey: "name",
        title: $t("settings.memory.modelMap.filenName"),
        width: 150,
        align: "left",
        cell: "name"
      },
      {
        colKey: "type",
        title: $t("settings.memory.modelMap.type"),
        width: 80,
        align: "left"
      },
      {
        colKey: "data",
        title: $t("promptManage.prompt"),
        align: "left",
        cell: "data",
        ellipsis: true
      },
      {
        colKey: "bindOperation",
        title: $t("settings.memory.modelMap.operation"),
        width: 200,
        align: "center",
        fixed: "right",
        cell: "bindOperation"
      }
    ];
    function selectPrompt(row) {
      promptForm.value.fileName = row.name;
      promptForm.value.path = row.path;
    }
    function unselectPrompt() {
      promptForm.value.fileName = "";
      promptForm.value.path = "";
    }
    const addPromptVisible = ref(false);
    const editingPrompt = ref({ isEdit: false, name: "", type: "video", data: "" });
    function openAddPrompt() {
      editingPrompt.value = { isEdit: false, name: "", type: "video", data: "" };
      addPromptVisible.value = true;
    }
    function openEditPrompt(row) {
      editingPrompt.value = { isEdit: true, ...row };
      addPromptVisible.value = true;
    }
    function delPrompt(row) {
      instance.post("/setting/modelMap/deletePrompt", {
        path: row.path
      }).then((res) => {
      });
    }
    async function onAddPromptConfirm() {
      if (!editingPrompt.value.name.trim()) {
        window.$message.warning($t("settings.memory.modelMap.promptNameRequired"));
        return;
      }
      if (editingPrompt.value.isEdit) {
        await instance.post("/setting/modelMap/updatePrompt", {
          name: editingPrompt.value.name,
          type: editingPrompt.value.type,
          data: editingPrompt.value.data
        });
      } else {
        await instance.post("/setting/modelMap/savePrompt", {
          name: editingPrompt.value.name,
          type: editingPrompt.value.type,
          data: editingPrompt.value.data
        });
      }
      window.$message.success($t("settings.memory.modelMap.promptSaveSuccess"));
      addPromptVisible.value = false;
      getPromptList();
    }
    function onConfirm() {
      const data = {
        vendorId: currentSupplier.value,
        model: promptForm.value.model,
        path: promptForm.value.path,
        fileName: promptForm.value.fileName
      };
      instance.post("/setting/modelMap/bindingPrompt", data).then((res) => {
        window.$message.success($t("settings.memory.modelMap.bindingSuccessful"));
      }).catch((err) => {
        window.$message.error($t("settings.memory.modelMap.bindingFailed", err));
      }).finally(() => {
        visible.value = false;
        queryModelMap();
      });
    }
    return (_ctx, _cache) => {
      const _component_t_icon = Icon;
      const _component_t_button = Button;
      const _component_t_space = Space;
      const _component_t_table = Table;
      const _component_t_collapse_panel = CollapsePanel;
      const _component_t_collapse = Collapse;
      const _component_t_tag = Tag;
      const _component_t_dialog = Dialog;
      const _component_t_input = Input;
      const _component_t_form_item = FormItem;
      const _component_t_option = Option;
      const _component_t_select = Select;
      const _component_t_form = Form;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(modelMap.value, (item, index) => {
          return openBlock(), createBlock(_component_t_collapse, {
            key: index,
            style: { "margin-top": "5px" }
          }, {
            default: withCtx(() => [
              createVNode(_component_t_collapse_panel, {
                header: item.name
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_table, {
                    "row-key": "key",
                    data: item.promptList,
                    columns
                  }, {
                    type: withCtx(({ row: subRow }) => [
                      createBaseVNode("div", _hoisted_2, [
                        createBaseVNode("span", null, toDisplayString(subRow.type == "text" ? "文本" : subRow.type == "video" ? "视频" : "图片"), 1)
                      ])
                    ]),
                    operation: withCtx(({ row }) => [
                      createVNode(_component_t_space, { size: 0 }, {
                        default: withCtx(() => [
                          row?.path ? (openBlock(), createBlock(_component_t_button, {
                            key: 0,
                            theme: "danger",
                            variant: "text",
                            onClick: ($event) => promptEditor(item, row)
                          }, {
                            icon: withCtx(() => [
                              createVNode(_component_t_icon, { name: "edit" })
                            ]),
                            default: withCtx(() => [
                              createTextVNode(" " + toDisplayString(_ctx.$t("settings.memory.modelMap.editRefeshWord")), 1)
                            ]),
                            _: 1
                          }, 8, ["onClick"])) : (openBlock(), createBlock(_component_t_button, {
                            key: 1,
                            theme: "primary",
                            variant: "text",
                            onClick: ($event) => promptEditor(item, row)
                          }, {
                            icon: withCtx(() => [
                              createVNode(_component_t_icon, { name: "edit" })
                            ]),
                            default: withCtx(() => [
                              createTextVNode(" " + toDisplayString(_ctx.$t("settings.memory.modelMap.editWord")), 1)
                            ]),
                            _: 1
                          }, 8, ["onClick"]))
                        ]),
                        _: 2
                      }, 1024)
                    ]),
                    _: 2
                  }, 1032, ["data"])
                ]),
                _: 2
              }, 1032, ["header"])
            ]),
            _: 2
          }, 1024);
        }), 128)),
        createVNode(_component_t_dialog, {
          visible: visible.value,
          "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => visible.value = $event),
          header: _ctx.$t("workbench.project.dialog.prompt.title"),
          width: "70%",
          "close-on-overlay-click": false,
          onConfirm,
          placement: "center"
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_3, [
              createBaseVNode("div", _hoisted_4, [
                createBaseVNode("div", _hoisted_5, [
                  createBaseVNode("span", _hoisted_6, toDisplayString(_ctx.$t("settings.memory.modelMap.currentBinding")) + "：", 1),
                  promptForm.value.fileName ? (openBlock(), createBlock(_component_t_tag, {
                    key: 0,
                    theme: "primary",
                    variant: "light"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(promptForm.value.fileName), 1)
                    ]),
                    _: 1
                  })) : (openBlock(), createBlock(_component_t_tag, {
                    key: 1,
                    theme: "warning",
                    variant: "light"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("settings.memory.modelMap.noBinding")), 1)
                    ]),
                    _: 1
                  }))
                ]),
                createVNode(_component_t_button, {
                  theme: "primary",
                  variant: "outline",
                  size: "small",
                  onClick: openAddPrompt
                }, {
                  icon: withCtx(() => [
                    createVNode(_component_t_icon, { name: "add" })
                  ]),
                  default: withCtx(() => [
                    createTextVNode(" " + toDisplayString(_ctx.$t("settings.memory.modelMap.addPrompt")), 1)
                  ]),
                  _: 1
                })
              ]),
              createVNode(_component_t_table, {
                "row-key": "name",
                data: promptList.value,
                columns: promptColumns,
                hover: true,
                "max-height": "50vh",
                style: { "margin-top": "12px" }
              }, {
                name: withCtx(({ row }) => [
                  createBaseVNode("div", _hoisted_7, [
                    createBaseVNode("span", null, toDisplayString(row.name), 1),
                    promptForm.value.path === row.path ? (openBlock(), createBlock(_component_t_tag, {
                      key: 0,
                      size: "small",
                      theme: "success"
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("settings.memory.modelMap.bound")), 1)
                      ]),
                      _: 1
                    })) : createCommentVNode("", true)
                  ])
                ]),
                bindOperation: withCtx(({ row }) => [
                  createVNode(_component_t_space, { size: 0 }, {
                    default: withCtx(() => [
                      promptForm.value.path !== row.path ? (openBlock(), createBlock(_component_t_button, {
                        key: 0,
                        theme: "primary",
                        variant: "text",
                        onClick: ($event) => selectPrompt(row)
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(_ctx.$t("settings.memory.modelMap.editWord")), 1)
                        ]),
                        _: 1
                      }, 8, ["onClick"])) : (openBlock(), createBlock(_component_t_button, {
                        key: 1,
                        theme: "danger",
                        variant: "text",
                        onClick: unselectPrompt
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(_ctx.$t("settings.memory.modelMap.unbind")), 1)
                        ]),
                        _: 1
                      })),
                      createVNode(_component_t_button, {
                        theme: "primary",
                        variant: "text",
                        onClick: ($event) => openEditPrompt(row)
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(_ctx.$t("settings.memory.modelMap.editPrompt")), 1)
                        ]),
                        _: 1
                      }, 8, ["onClick"]),
                      createVNode(_component_t_button, {
                        theme: "danger",
                        variant: "text",
                        onClick: ($event) => delPrompt(row)
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(_ctx.$t("settings.memory.modelMap.delPrompt")), 1)
                        ]),
                        _: 1
                      }, 8, ["onClick"])
                    ]),
                    _: 2
                  }, 1024)
                ]),
                _: 1
              }, 8, ["data"])
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"]),
        createVNode(_component_t_dialog, {
          visible: addPromptVisible.value,
          "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => addPromptVisible.value = $event),
          header: editingPrompt.value.isEdit ? _ctx.$t("settings.memory.modelMap.editPromptTitle") : _ctx.$t("settings.memory.modelMap.addPromptTitle"),
          width: "75%",
          "close-on-overlay-click": false,
          onConfirm: onAddPromptConfirm,
          top: "5vh"
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_8, [
              createVNode(_component_t_form, { "label-align": "top" }, {
                default: withCtx(() => [
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.memory.modelMap.filenName")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_input, {
                        modelValue: editingPrompt.value.name,
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => editingPrompt.value.name = $event),
                        disabled: editingPrompt.value.isEdit,
                        placeholder: _ctx.$t("settings.memory.modelMap.promptNamePlaceholder")
                      }, null, 8, ["modelValue", "disabled", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.memory.modelMap.type")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_select, {
                        modelValue: editingPrompt.value.type,
                        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => editingPrompt.value.type = $event),
                        disabled: editingPrompt.value.isEdit,
                        placeholder: _ctx.$t("settings.memory.modelMap.promptTypePlaceholder")
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_t_option, {
                            value: "video",
                            label: _ctx.$t("settings.memory.modelMap.typeVideo")
                          }, null, 8, ["label"])
                        ]),
                        _: 1
                      }, 8, ["modelValue", "disabled", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("promptManage.prompt")
                  }, {
                    default: withCtx(() => [
                      createVNode(AsyncMdEditor, {
                        theme: unref(themeSetting).mode === "auto" ? "light" : unref(themeSetting).mode,
                        modelValue: editingPrompt.value.data,
                        "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => editingPrompt.value.data = $event),
                        toolbars: promptToolbars,
                        footers: [],
                        style: { "height": "55vh", "width": "100%" },
                        placeholder: _ctx.$t("workbench.project.dialog.prompt.placeholder"),
                        onOnUploadImg: () => {
                        }
                      }, null, 8, ["theme", "modelValue", "placeholder"])
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

const modelMap = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-efe2096a"]]);

export { modelMap as default };

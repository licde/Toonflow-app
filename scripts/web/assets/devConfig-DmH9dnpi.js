import { A as AsyncMonacoEditor } from './AsyncMonacoEditor-dtyhjFm6.js';
import { i as instance } from './axios-BX4BN6mO.js';
import { s as settingStore, _ as _export_sfc } from './index-DkAIKrBP.js';
import { l as defineComponent, bM as storeToRefs, o as onMounted, aK as openBlock, aL as createElementBlock, j as createVNode, aM as withCtx, a$ as createTextVNode, b0 as toDisplayString, av as isRef, a1 as unref, aO as createBaseVNode, r as ref, c as computed } from './vue-vendor-Byo5TD6r.js';
import { A as Alert, J as FormItem, B as Button, aj as Switch, Y as Card, R as Input, Z as Table, E as Dialog, H as Form, W as DialogPlugin } from './tdesign-CfL1pweZ.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "otherConfig" };
const _hoisted_2 = { class: "localStorageHeader" };
const _hoisted_3 = { class: "localStorageCount" };
const _hoisted_4 = { class: "localStorageToolbar" };
const _hoisted_5 = { class: "localStorageActions" };
const _hoisted_6 = { class: "tableActionButtons" };
const _hoisted_7 = { class: "localStorageDialogBody" };
const _hoisted_8 = { class: "localStorageDialogTopBar" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "devConfig",
  setup(__props) {
    const { isElectron } = storeToRefs(settingStore());
    const switchAiDevTool = ref("0");
    const localStorageKeyword = ref("");
    const editingKey = ref("");
    const localStorageDialogVisible = ref(false);
    const localStorageRows = ref([]);
    const localStorageForm = ref({
      key: "",
      value: ""
    });
    const localStorageEditorOptions = {
      fontSize: 13,
      automaticLayout: true,
      minimap: { enabled: false },
      tabSize: 2,
      scrollBeyondLastLine: false,
      wordWrap: "on"
    };
    const localStorageColumns = [
      {
        colKey: "key",
        title: $t("settings.dev.localStorageKey"),
        width: 320,
        ellipsis: true
      },
      {
        colKey: "value",
        title: $t("settings.dev.localStorageValue"),
        ellipsis: true
      },
      {
        colKey: "actions",
        title: $t("settings.dev.actions"),
        width: 280,
        cell: "actions"
      }
    ];
    const filteredLocalStorageRows = computed(() => {
      if (!localStorageKeyword.value.trim()) return localStorageRows.value;
      const keyword = localStorageKeyword.value.trim().toLowerCase();
      return localStorageRows.value.filter((item) => item.key.toLowerCase().includes(keyword) || item.value.toLowerCase().includes(keyword));
    });
    function openDevTool() {
      if (isElectron.value) {
        try {
          fetch("toonflow://openDevTool");
        } catch (error) {
          window.$message?.warning($t("settings.dev.openDevtoolFailed"));
        }
      } else {
        window.$message?.warning($t("settings.dev.notInElectron"));
      }
    }
    async function getSwitchAiDevTool() {
      const { data } = await instance.get("/setting/dev/getSwitchAiDevTool");
      switchAiDevTool.value = data || "0";
    }
    function updateSwitchAiDevTool() {
      instance.post("/setting/dev/updateSwitchAiDevTool", { switchAiDevTool: switchAiDevTool.value });
    }
    function refreshLocalStorage() {
      const rows = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        rows.push({
          key,
          value: localStorage.getItem(key) ?? ""
        });
      }
      localStorageRows.value = rows.sort((a, b) => a.key.localeCompare(b.key));
    }
    function startCreateLocalStorage() {
      resetLocalStorageForm();
      localStorageDialogVisible.value = true;
    }
    function fillLocalStorageForm(row) {
      localStorageForm.value = { ...row };
      editingKey.value = row.key;
      localStorageDialogVisible.value = true;
    }
    function resetLocalStorageForm() {
      localStorageForm.value = { key: "", value: "" };
      editingKey.value = "";
    }
    function saveLocalStorageItem() {
      const nextKey = localStorageForm.value.key.trim();
      if (!nextKey) {
        window.$message.warning($t("settings.dev.msg.localStorageKeyRequired"));
        return;
      }
      const isRename = !!editingKey.value && editingKey.value !== nextKey;
      if (isRename && localStorage.getItem(nextKey) !== null) {
        window.$message.warning($t("settings.dev.msg.localStorageKeyExists"));
        return;
      }
      if (isRename) {
        localStorage.removeItem(editingKey.value);
      }
      localStorage.setItem(nextKey, localStorageForm.value.value ?? "");
      refreshLocalStorage();
      editingKey.value = nextKey;
      localStorageDialogVisible.value = false;
      window.$message.success($t("settings.dev.msg.localStorageSaved"));
    }
    function formatLocalStorageValue() {
      const currentValue = localStorageForm.value.value ?? "";
      if (!currentValue.trim()) {
        window.$message.warning($t("settings.dev.msg.localStorageValueEmpty"));
        return;
      }
      try {
        const parsed = JSON.parse(currentValue);
        localStorageForm.value.value = JSON.stringify(parsed, null, 2);
        window.$message.success($t("settings.dev.msg.localStorageFormatted"));
      } catch {
        window.$message.warning($t("settings.dev.msg.localStorageFormatFailed"));
      }
    }
    function onLocalStorageDialogConfirm() {
      saveLocalStorageItem();
    }
    function onLocalStorageDialogClose() {
      localStorageDialogVisible.value = false;
      resetLocalStorageForm();
    }
    async function copyToClipboard(content) {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
        return;
      }
      const textarea = document.createElement("textarea");
      textarea.value = content;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    async function copyLocalStorageKey(key) {
      try {
        await copyToClipboard(key);
        window.$message.success($t("settings.dev.msg.localStorageKeyCopied"));
      } catch {
        window.$message.warning($t("settings.dev.msg.copyFailed"));
      }
    }
    async function copyLocalStorageValue(value) {
      try {
        await copyToClipboard(value);
        window.$message.success($t("settings.dev.msg.localStorageValueCopied"));
      } catch {
        window.$message.warning($t("settings.dev.msg.copyFailed"));
      }
    }
    function removeLocalStorageItem(key) {
      localStorage.removeItem(key);
      if (editingKey.value === key) {
        resetLocalStorageForm();
      }
      refreshLocalStorage();
      window.$message.success($t("settings.dev.msg.localStorageDeleted"));
    }
    function confirmRemoveLocalStorageItem(key) {
      const dialog = DialogPlugin.confirm({
        header: $t("settings.dev.msg.deleteConfirmTitle"),
        body: $t("settings.dev.msg.deleteConfirmBody", { key }),
        confirmBtn: $t("settings.dev.msg.confirmDelete"),
        cancelBtn: $t("settings.dev.msg.cancel"),
        onConfirm: () => {
          removeLocalStorageItem(key);
          dialog.hide();
        }
      });
    }
    function confirmClearLocalStorage() {
      const dialog = DialogPlugin.confirm({
        header: $t("settings.dev.msg.clearConfirmTitle"),
        body: $t("settings.dev.msg.clearConfirmBody"),
        confirmBtn: $t("settings.dev.msg.confirmClear"),
        cancelBtn: $t("settings.dev.msg.cancel"),
        onConfirm: () => {
          localStorage.clear();
          resetLocalStorageForm();
          refreshLocalStorage();
          window.$message.success($t("settings.dev.msg.localStorageCleared"));
          dialog.hide();
        }
      });
    }
    onMounted(() => {
      getSwitchAiDevTool();
      refreshLocalStorage();
    });
    return (_ctx, _cache) => {
      const _component_t_alert = Alert;
      const _component_t_button = Button;
      const _component_t_form_item = FormItem;
      const _component_t_switch = Switch;
      const _component_t_input = Input;
      const _component_t_table = Table;
      const _component_t_card = Card;
      const _component_t_dialog = Dialog;
      const _component_t_form = Form;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_t_form, { "label-align": "top" }, {
          default: withCtx(() => [
            createVNode(_component_t_alert, { theme: "warning" }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(_ctx.$t("settings.dev.warning")), 1)
              ]),
              _: 1
            }),
            createVNode(_component_t_form_item, {
              label: _ctx.$t("settings.dev.devtool"),
              name: "showTitleBar"
            }, {
              default: withCtx(() => [
                createVNode(_component_t_button, {
                  theme: "primary",
                  onClick: openDevTool
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("settings.dev.openDevtool")), 1)
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }, 8, ["label"]),
            createVNode(_component_t_form_item, {
              label: _ctx.$t("settings.dev.aiDevtool"),
              name: "showTitleBar"
            }, {
              default: withCtx(() => [
                createVNode(_component_t_switch, {
                  modelValue: unref(isElectron),
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(isElectron) ? isElectron.value = $event : null),
                  onChange: getSwitchAiDevTool
                }, null, 8, ["modelValue"])
              ]),
              _: 1
            }, 8, ["label"]),
            createVNode(_component_t_form_item, {
              label: _ctx.$t("settings.dev.switchAiDevTool"),
              name: "showTitleBar"
            }, {
              tips: withCtx(() => [
                createBaseVNode("p", null, toDisplayString(_ctx.$t("settings.dev.devtoolsDoc")) + "：https://ai-sdk.dev/docs/ai-sdk-core/devtools", 1),
                createBaseVNode("p", null, toDisplayString(_ctx.$t("settings.dev.devtoolsDesc")), 1),
                createBaseVNode("p", null, toDisplayString(_ctx.$t("settings.dev.devtoolsDesc2")), 1)
              ]),
              default: withCtx(() => [
                createVNode(_component_t_switch, {
                  customValue: ["1", "0"],
                  modelValue: unref(switchAiDevTool),
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(switchAiDevTool) ? switchAiDevTool.value = $event : null),
                  onChange: updateSwitchAiDevTool
                }, null, 8, ["modelValue"])
              ]),
              _: 1
            }, 8, ["label"]),
            createVNode(_component_t_form_item, {
              label: _ctx.$t("settings.dev.localStorage"),
              name: "localStorageManager",
              class: "localStorageFormItem"
            }, {
              default: withCtx(() => [
                createVNode(_component_t_card, { class: "localStorageCard" }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_2, [
                      createBaseVNode("div", _hoisted_3, toDisplayString(_ctx.$t("settings.dev.localStorageCount", { total: unref(localStorageRows).length, filtered: unref(filteredLocalStorageRows).length })), 1),
                      createBaseVNode("div", _hoisted_4, [
                        createVNode(_component_t_input, {
                          modelValue: unref(localStorageKeyword),
                          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(localStorageKeyword) ? localStorageKeyword.value = $event : null),
                          placeholder: _ctx.$t("settings.dev.localStorageSearchPlaceholder"),
                          clearable: "",
                          class: "localStorageSearch"
                        }, null, 8, ["modelValue", "placeholder"]),
                        createBaseVNode("div", _hoisted_5, [
                          createVNode(_component_t_button, {
                            theme: "primary",
                            variant: "outline",
                            onClick: startCreateLocalStorage
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("settings.dev.add")), 1)
                            ]),
                            _: 1
                          }),
                          createVNode(_component_t_button, {
                            variant: "outline",
                            onClick: refreshLocalStorage
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("settings.dev.refresh")), 1)
                            ]),
                            _: 1
                          }),
                          createVNode(_component_t_button, {
                            theme: "danger",
                            variant: "outline",
                            onClick: confirmClearLocalStorage
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("settings.dev.clearAll")), 1)
                            ]),
                            _: 1
                          })
                        ])
                      ])
                    ]),
                    createVNode(_component_t_table, {
                      data: unref(filteredLocalStorageRows),
                      columns: localStorageColumns,
                      "row-key": "key",
                      size: "small"
                    }, {
                      actions: withCtx(({ row }) => [
                        createBaseVNode("div", _hoisted_6, [
                          createVNode(_component_t_button, {
                            variant: "text",
                            size: "small",
                            onClick: ($event) => copyLocalStorageKey(row.key)
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("settings.dev.copyKey")), 1)
                            ]),
                            _: 1
                          }, 8, ["onClick"]),
                          createVNode(_component_t_button, {
                            variant: "text",
                            size: "small",
                            onClick: ($event) => copyLocalStorageValue(row.value)
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("settings.dev.copyValue")), 1)
                            ]),
                            _: 1
                          }, 8, ["onClick"]),
                          createVNode(_component_t_button, {
                            variant: "text",
                            size: "small",
                            onClick: ($event) => fillLocalStorageForm(row)
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("settings.dev.edit")), 1)
                            ]),
                            _: 1
                          }, 8, ["onClick"]),
                          createVNode(_component_t_button, {
                            theme: "danger",
                            variant: "text",
                            size: "small",
                            onClick: ($event) => confirmRemoveLocalStorageItem(row.key)
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("settings.dev.delete")), 1)
                            ]),
                            _: 1
                          }, 8, ["onClick"])
                        ])
                      ]),
                      _: 1
                    }, 8, ["data"])
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }, 8, ["label"]),
            createVNode(_component_t_dialog, {
              visible: unref(localStorageDialogVisible),
              "onUpdate:visible": _cache[5] || (_cache[5] = ($event) => isRef(localStorageDialogVisible) ? localStorageDialogVisible.value = $event : null),
              header: unref(editingKey) ? _ctx.$t("settings.dev.editing", { key: unref(editingKey) }) : _ctx.$t("settings.dev.creating"),
              "confirm-btn": { content: unref(editingKey) ? _ctx.$t("settings.dev.update") : _ctx.$t("settings.dev.add") },
              "cancel-btn": _ctx.$t("settings.dev.msg.cancel"),
              width: "50vw",
              placement: "center",
              onConfirm: onLocalStorageDialogConfirm,
              onClose: onLocalStorageDialogClose
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_7, [
                  createBaseVNode("div", _hoisted_8, [
                    createVNode(_component_t_input, {
                      modelValue: unref(localStorageForm).key,
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => unref(localStorageForm).key = $event),
                      placeholder: _ctx.$t("settings.dev.localStorageKeyPlaceholder")
                    }, null, 8, ["modelValue", "placeholder"]),
                    createVNode(_component_t_button, {
                      variant: "outline",
                      onClick: formatLocalStorageValue
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("settings.dev.format")), 1)
                      ]),
                      _: 1
                    })
                  ]),
                  createVNode(AsyncMonacoEditor, {
                    value: unref(localStorageForm).value,
                    "onUpdate:value": _cache[4] || (_cache[4] = ($event) => unref(localStorageForm).value = $event),
                    language: "json",
                    theme: "vs-dark",
                    height: 500,
                    options: localStorageEditorOptions
                  }, null, 8, ["value"])
                ])
              ]),
              _: 1
            }, 8, ["visible", "header", "confirm-btn", "cancel-btn"])
          ]),
          _: 1
        })
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const devConfig = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-c6849c6a"]]);

export { devConfig as default };

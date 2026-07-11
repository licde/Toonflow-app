import { i as instance } from './axios-PPMfXuH1.js';
import { r as router, _ as _export_sfc } from './index-BPofKOpG.js';
import { B as Button, Y as Card, K as Select, Z as Table, E as Dialog, R as Input, s as LoadingPlugin, W as DialogPlugin } from './tdesign-CfL1pweZ.js';
import { l as defineComponent, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, j as createVNode, aM as withCtx, aO as createBaseVNode, b0 as toDisplayString, a$ as createTextVNode, r as ref, c as computed } from './vue-vendor-Byo5TD6r.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "dbConfig" };
const _hoisted_2 = { class: "actionInfo" };
const _hoisted_3 = { class: "actionInfo" };
const _hoisted_4 = { class: "actionInfo" };
const _hoisted_5 = { class: "actionInfo" };
const _hoisted_6 = { class: "clearTableAction" };
const _hoisted_7 = { class: "actionInfo" };
const _hoisted_8 = { class: "dbInfoContent" };
const _hoisted_9 = { class: "totalInfo" };
const _hoisted_10 = { class: "confirmContent" };
const _hoisted_11 = { class: "confirmContent" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "dbConfig",
  setup(__props) {
    const firstConfirmVisible = ref(false);
    const secondConfirmVisible = ref(false);
    const dbInfoVisible = ref(false);
    const confirmInput = ref("");
    const currentAction = ref(null);
    const selectedTable = ref("");
    const tableInfoList = ref([]);
    const tableOptions = ref([]);
    const fileInputRef = ref(null);
    const importFileData = ref(null);
    const dbInfoColumns = computed(() => [
      { colKey: "name", title: $t("settings.db.tableName"), width: 220 },
      { colKey: "rowCount", title: $t("settings.db.rowCount"), width: 120 }
    ]);
    const confirmConfigs = {
      deleteAll: {
        title: () => $t("settings.db.msg.clearDbTitle"),
        firstMessage: () => $t("settings.db.msg.firstConfirm"),
        secondMessage: () => $t("settings.db.msg.secondConfirm"),
        keyword: () => $t("settings.db.msg.keyword")
      },
      import: {
        title: () => $t("settings.db.importDb"),
        firstMessage: () => $t("settings.db.msg.importConfirm"),
        secondMessage: () => $t("settings.db.msg.importSecondConfirm"),
        keyword: () => $t("settings.db.msg.keyword")
      }
    };
    const confirmConfig = computed(() => {
      const config = confirmConfigs[currentAction.value || "deleteAll"];
      return {
        title: config.title(),
        firstMessage: config.firstMessage(),
        secondMessage: config.secondMessage(),
        keyword: config.keyword()
      };
    });
    const canConfirm = computed(() => {
      return confirmInput.value === confirmConfig.value.keyword;
    });
    const confirmText = computed(() => {
      return canConfirm.value ? $t("settings.db.msg.confirm") : `${$t("settings.db.msg.pleaseInput")}"${confirmConfig.value.keyword}"`;
    });
    async function loadDbInfo() {
      LoadingPlugin(true);
      try {
        const res = await instance.get("/setting/dbConfig/dbInfo");
        tableInfoList.value = res.data || [];
        tableOptions.value = tableInfoList.value.map((t) => ({
          label: `${t.name} (${t.rowCount})`,
          value: t.name
        }));
        dbInfoVisible.value = true;
      } catch {
        window.$message.error($t("settings.db.msg.loadDbInfoFailed"));
      } finally {
        LoadingPlugin(false);
      }
    }
    async function exportData() {
      LoadingPlugin(true);
      try {
        const res = await instance.get("/setting/dbConfig/exportData", { responseType: "blob" });
        const blob = new Blob([res], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `toonflow-backup-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.$message.success($t("settings.db.msg.exportSuccess"));
      } catch {
        window.$message.error($t("settings.db.msg.exportFailed"));
      } finally {
        LoadingPlugin(false);
      }
    }
    function triggerImport() {
      fileInputRef.value?.click();
    }
    function handleFileSelected(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result);
          if (!data.tables || typeof data.tables !== "object") {
            window.$message.error($t("settings.db.msg.invalidFile"));
            return;
          }
          importFileData.value = data;
          currentAction.value = "import";
          confirmInput.value = "";
          firstConfirmVisible.value = true;
        } catch {
          window.$message.error($t("settings.db.msg.invalidFile"));
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    }
    async function clearTable() {
      if (!selectedTable.value) {
        window.$message.warning($t("settings.db.msg.noTableSelected"));
        return;
      }
      const confirmDlg = DialogPlugin.confirm({
        header: $t("settings.db.clearTable"),
        body: $t("settings.db.msg.clearTableConfirm", { name: selectedTable.value }),
        confirmBtn: { content: $t("settings.db.msg.confirm"), theme: "danger" },
        onConfirm: async () => {
          confirmDlg.hide();
          LoadingPlugin(true);
          try {
            await instance.post("/setting/dbConfig/clearTable", { tableName: selectedTable.value });
            window.$message.success($t("settings.db.msg.clearTableSuccess"));
            selectedTable.value = "";
            await refreshTableOptions();
          } catch {
            window.$message.error($t("settings.db.msg.clearTableFailed"));
          } finally {
            LoadingPlugin(false);
          }
        }
      });
    }
    async function refreshTableOptions() {
      try {
        const res = await instance.get("/setting/dbConfig/dbInfo");
        const list = res.data || [];
        tableInfoList.value = list;
        tableOptions.value = list.map((t) => ({
          label: `${t.name} (${t.rowCount})`,
          value: t.name
        }));
      } catch {
      }
    }
    function deleteAllData() {
      currentAction.value = "deleteAll";
      confirmInput.value = "";
      firstConfirmVisible.value = true;
    }
    function handleFirstConfirm() {
      firstConfirmVisible.value = false;
      secondConfirmVisible.value = true;
    }
    async function handleSecondConfirm() {
      if (!canConfirm.value) return;
      secondConfirmVisible.value = false;
      LoadingPlugin(true);
      try {
        if (currentAction.value === "import" && importFileData.value) {
          await instance.post("/setting/dbConfig/importData", importFileData.value);
          window.$message.success($t("settings.db.msg.importSuccess"));
          importFileData.value = null;
          router.push("/login");
        } else {
          await instance.get("/setting/dbConfig/clearData");
          window.$message.success($t("settings.db.msg.cleared"));
          router.push("/login");
        }
      } catch {
        if (currentAction.value === "import") {
          window.$message.error($t("settings.db.msg.importFailed"));
        } else {
          window.$message.error($t("settings.db.msg.operationFailed"));
        }
      } finally {
        LoadingPlugin(false);
        currentAction.value = null;
        confirmInput.value = "";
        importFileData.value = null;
      }
    }
    function handleCancel() {
      firstConfirmVisible.value = false;
      secondConfirmVisible.value = false;
      currentAction.value = null;
      confirmInput.value = "";
      importFileData.value = null;
      window.$message.info($t("settings.db.msg.cancelled"));
    }
    refreshTableOptions();
    return (_ctx, _cache) => {
      const _component_i_data = resolveComponent("i-data");
      const _component_t_button = Button;
      const _component_t_card = Card;
      const _component_i_download = resolveComponent("i-download");
      const _component_i_upload = resolveComponent("i-upload");
      const _component_t_select = Select;
      const _component_i_delete = resolveComponent("i-delete");
      const _component_i_clear = resolveComponent("i-clear");
      const _component_t_table = Table;
      const _component_t_dialog = Dialog;
      const _component_i_attention = resolveComponent("i-attention");
      const _component_t_input = Input;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_t_card, { class: "actionItem" }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("h4", null, toDisplayString(_ctx.$t("settings.db.dbInfo")), 1),
              createBaseVNode("p", null, toDisplayString(_ctx.$t("settings.db.dbInfoDesc")), 1)
            ]),
            createVNode(_component_t_button, {
              variant: "outline",
              onClick: loadDbInfo
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_data, {
                  theme: "outline",
                  size: "14",
                  fill: "currentColor"
                })
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("settings.db.viewInfo")), 1)
              ]),
              _: 1
            })
          ]),
          _: 1
        }),
        createVNode(_component_t_card, { class: "actionItem" }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_3, [
              createBaseVNode("h4", null, toDisplayString(_ctx.$t("settings.db.exportDb")), 1),
              createBaseVNode("p", null, toDisplayString(_ctx.$t("settings.db.exportDbDesc")), 1)
            ]),
            createVNode(_component_t_button, {
              variant: "outline",
              onClick: exportData
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_download, {
                  theme: "outline",
                  size: "14",
                  fill: "currentColor"
                })
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("settings.db.exportData")), 1)
              ]),
              _: 1
            })
          ]),
          _: 1
        }),
        createVNode(_component_t_card, { class: "actionItem" }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_4, [
              createBaseVNode("h4", null, toDisplayString(_ctx.$t("settings.db.importDb")), 1),
              createBaseVNode("p", null, toDisplayString(_ctx.$t("settings.db.importDbDesc")), 1)
            ]),
            createVNode(_component_t_button, {
              theme: "warning",
              variant: "outline",
              onClick: triggerImport
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_upload, {
                  theme: "outline",
                  size: "14",
                  fill: "currentColor"
                })
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("settings.db.importData")), 1)
              ]),
              _: 1
            }),
            createBaseVNode("input", {
              ref_key: "fileInputRef",
              ref: fileInputRef,
              type: "file",
              accept: ".json",
              style: { "display": "none" },
              onChange: handleFileSelected
            }, null, 544)
          ]),
          _: 1
        }),
        createVNode(_component_t_card, { class: "actionItem clearTableCard" }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_5, [
              createBaseVNode("h4", null, toDisplayString(_ctx.$t("settings.db.clearTable")), 1),
              createBaseVNode("p", null, toDisplayString(_ctx.$t("settings.db.clearTableDesc")), 1)
            ]),
            createBaseVNode("div", _hoisted_6, [
              createVNode(_component_t_select, {
                modelValue: selectedTable.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectedTable.value = $event),
                placeholder: _ctx.$t("settings.db.selectTable"),
                options: tableOptions.value,
                style: { "width": "200px" }
              }, null, 8, ["modelValue", "placeholder", "options"]),
              createVNode(_component_t_button, {
                theme: "warning",
                variant: "outline",
                onClick: clearTable
              }, {
                icon: withCtx(() => [
                  createVNode(_component_i_delete, {
                    theme: "outline",
                    size: "14",
                    fill: "currentColor"
                  })
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(_ctx.$t("settings.db.clearTableBtn")), 1)
                ]),
                _: 1
              })
            ])
          ]),
          _: 1
        }),
        createVNode(_component_t_card, { class: "actionItem" }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_7, [
              createBaseVNode("h4", null, toDisplayString(_ctx.$t("settings.db.clearDb")), 1),
              createBaseVNode("p", null, toDisplayString(_ctx.$t("settings.db.clearDbDesc")), 1)
            ]),
            createVNode(_component_t_button, {
              theme: "danger",
              variant: "outline",
              onClick: deleteAllData
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_clear, {
                  theme: "outline",
                  size: "14",
                  fill: "currentColor"
                })
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("settings.db.clearData")), 1)
              ]),
              _: 1
            })
          ]),
          _: 1
        }),
        createVNode(_component_t_dialog, {
          visible: dbInfoVisible.value,
          "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => dbInfoVisible.value = $event),
          header: _ctx.$t("settings.db.dbInfo"),
          footer: false,
          width: "520px"
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_8, [
              createBaseVNode("p", _hoisted_9, toDisplayString(_ctx.$t("settings.db.totalTables", { count: tableInfoList.value.length })), 1),
              createVNode(_component_t_table, {
                data: tableInfoList.value,
                columns: dbInfoColumns.value,
                "row-key": "name",
                size: "small",
                "max-height": "400",
                bordered: ""
              }, null, 8, ["data", "columns"])
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"]),
        createVNode(_component_t_dialog, {
          visible: firstConfirmVisible.value,
          "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => firstConfirmVisible.value = $event),
          header: confirmConfig.value.title,
          "confirm-btn": { content: _ctx.$t("settings.db.msg.confirm"), theme: "danger" },
          onConfirm: handleFirstConfirm,
          onCancel: handleCancel
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_10, [
              createVNode(_component_i_attention, {
                theme: "filled",
                size: "48",
                fill: "#e34d59"
              }),
              createBaseVNode("p", null, toDisplayString(confirmConfig.value.firstMessage), 1)
            ])
          ]),
          _: 1
        }, 8, ["visible", "header", "confirm-btn"]),
        createVNode(_component_t_dialog, {
          visible: secondConfirmVisible.value,
          "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => secondConfirmVisible.value = $event),
          header: confirmConfig.value.title,
          "confirm-btn": { content: confirmText.value, theme: "danger", disabled: !canConfirm.value },
          onConfirm: handleSecondConfirm,
          onCancel: handleCancel
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_11, [
              createVNode(_component_i_attention, {
                theme: "filled",
                size: "48",
                fill: "#e34d59"
              }),
              createBaseVNode("p", null, toDisplayString(confirmConfig.value.secondMessage), 1),
              createVNode(_component_t_input, {
                modelValue: confirmInput.value,
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => confirmInput.value = $event),
                placeholder: `${_ctx.$t("settings.db.msg.pleaseInput")} ${confirmConfig.value.keyword} ${_ctx.$t("settings.db.confirmAction")}`,
                class: "confirmInput"
              }, null, 8, ["modelValue", "placeholder"])
            ])
          ]),
          _: 1
        }, 8, ["visible", "header", "confirm-btn"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const dbConfig = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-9bae00ea"]]);

export { dbConfig as default };

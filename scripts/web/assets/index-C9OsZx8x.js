import { b as useProductionAgentStore } from './useAdaptationNav-Bi4oVHb2.js';
import { s as saveEpisodePackageRaw, a as syncEpisodePackage, c as compileDryRun } from './ruleEngine-Bk1aW4hN.js';
import { T as Textarea, a0 as Upload, B as Button, a3 as Checkbox, E as Dialog } from './tdesign-CfL1pweZ.js';
import { l as defineComponent, bU as useModel, aK as openBlock, aS as createBlock, aM as withCtx, aO as createBaseVNode, b0 as toDisplayString, j as createVNode, a$ as createTextVNode, bV as mergeModels, r as ref } from './vue-vendor-Byo5TD6r.js';
import { _ as _export_sfc } from './index-DkAIKrBP.js';
import './axios-BX4BN6mO.js';
import './project-Cze3Ugcr.js';
import './markdown-CDQfeHxT.js';
import './dayjs-CuToSpIM.js';
import './i18n-C05S5xzz.js';

const _hoisted_1 = { class: "importFixture" };
const _hoisted_2 = { class: "hint" };
const _hoisted_3 = { class: "actions f ac" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: /* @__PURE__ */ mergeModels({
    projectId: {},
    scriptId: {}
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["imported"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const visible = useModel(__props, "visible");
    const jsonText = ref("");
    const syncPackage = ref(true);
    const runCompile = ref(false);
    const loading = ref(false);
    function stripMeta(obj) {
      const { _comment, ...rest } = obj;
      return rest;
    }
    function parseImportPayload(text) {
      const raw = JSON.parse(text);
      if (!raw || typeof raw !== "object") throw new Error("invalid json");
      if (raw.flowData && typeof raw.flowData === "object") {
        const flowData2 = stripMeta(raw.flowData);
        const pkg2 = raw.package && typeof raw.package === "object" ? stripMeta(raw.package) : void 0;
        return { flowData: flowData2, package: pkg2 };
      }
      const pkg = raw.package && typeof raw.package === "object" ? stripMeta(raw.package) : void 0;
      const flowData = stripMeta(raw);
      delete flowData.package;
      return { flowData, package: pkg };
    }
    function onFileChange(files) {
      const file = files[0]?.raw;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        jsonText.value = String(reader.result ?? "");
      };
      reader.readAsText(file);
    }
    function onClose() {
      jsonText.value = "";
    }
    function onCancel() {
      visible.value = false;
      jsonText.value = "";
    }
    async function onConfirm() {
      if (!props.scriptId) {
        window.$message.warning($t("workbench.production.importFixture.noEpisode"));
        return;
      }
      if (!jsonText.value.trim()) {
        window.$message.warning($t("workbench.production.importFixture.empty"));
        return;
      }
      loading.value = true;
      try {
        const { flowData: imported, package: pkgBody } = parseImportPayload(jsonText.value);
        const store = useProductionAgentStore();
        Object.assign(store.flowData, imported);
        await store.setFlowData(props.scriptId);
        const body = {
          projectId: props.projectId,
          scriptId: props.scriptId,
          script: store.flowData.script,
          scriptPlan: store.flowData.scriptPlan,
          storyboardTable: store.flowData.storyboardTable,
          storyboard: store.flowData.storyboard
        };
        if (pkgBody) {
          await saveEpisodePackageRaw({ ...body, package: pkgBody });
        } else if (syncPackage.value) {
          await syncEpisodePackage(body);
        }
        if (runCompile.value) {
          await compileDryRun(body);
        }
        window.$message.success($t("workbench.production.importFixture.success"));
        visible.value = false;
        emit("imported");
      } catch (e) {
        window.$message.error(e?.message || $t("workbench.production.importFixture.failed"));
      } finally {
        loading.value = false;
      }
    }
    return (_ctx, _cache) => {
      const _component_t_textarea = Textarea;
      const _component_t_button = Button;
      const _component_t_upload = Upload;
      const _component_t_checkbox = Checkbox;
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        visible: visible.value,
        "onUpdate:visible": _cache[3] || (_cache[3] = ($event) => visible.value = $event),
        header: _ctx.$t("workbench.production.importFixture.title"),
        width: 720,
        "confirm-btn": _ctx.$t("workbench.production.importFixture.confirm"),
        "cancel-btn": _ctx.$t("workbench.production.cancel"),
        "confirm-loading": loading.value,
        "close-on-overlay-click": true,
        "close-on-esc-keydown": true,
        "destroy-on-close": "",
        onConfirm,
        onCancel,
        onClose
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("p", _hoisted_2, toDisplayString(_ctx.$t("workbench.production.importFixture.hint")), 1),
            createVNode(_component_t_textarea, {
              modelValue: jsonText.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => jsonText.value = $event),
              placeholder: _ctx.$t("workbench.production.importFixture.placeholder"),
              autosize: { minRows: 12, maxRows: 20 }
            }, null, 8, ["modelValue", "placeholder"]),
            createBaseVNode("div", _hoisted_3, [
              createVNode(_component_t_upload, {
                "auto-upload": false,
                accept: ".json,application/json",
                "show-upload-list": false,
                onChange: onFileChange
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_button, {
                    size: "small",
                    variant: "outline"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("workbench.production.importFixture.upload")), 1)
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              }),
              createVNode(_component_t_checkbox, {
                modelValue: syncPackage.value,
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => syncPackage.value = $event)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.importFixture.syncPackage")), 1)
                ]),
                _: 1
              }, 8, ["modelValue"]),
              createVNode(_component_t_checkbox, {
                modelValue: runCompile.value,
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => runCompile.value = $event)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.importFixture.runCompile")), 1)
                ]),
                _: 1
              }, 8, ["modelValue"])
            ])
          ])
        ]),
        _: 1
      }, 8, ["visible", "header", "confirm-btn", "cancel-btn", "confirm-loading"]);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-85f2e81f"]]);

export { index as default };

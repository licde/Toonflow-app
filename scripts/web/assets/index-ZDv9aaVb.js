import { b as useProductionAgentStore } from './useAdaptationNav-Bi4oVHb2.js';
import { d as dryRunImport, i as importScriptBundle } from './ruleEngine-Bk1aW4hN.js';
import { T as Textarea, a0 as Upload, B as Button, a3 as Checkbox, A as Alert, E as Dialog } from './tdesign-CfL1pweZ.js';
import { l as defineComponent, bU as useModel, aK as openBlock, aS as createBlock, aM as withCtx, aO as createBaseVNode, b0 as toDisplayString, j as createVNode, a$ as createTextVNode, aL as createElementBlock, aT as createCommentVNode, bV as mergeModels, r as ref } from './vue-vendor-Byo5TD6r.js';
import { _ as _export_sfc } from './index-DkAIKrBP.js';
import './axios-BX4BN6mO.js';
import './project-Cze3Ugcr.js';
import './markdown-CDQfeHxT.js';
import './dayjs-CuToSpIM.js';
import './i18n-C05S5xzz.js';

const _hoisted_1 = { class: "importScriptBundle" };
const _hoisted_2 = { class: "hint" };
const _hoisted_3 = { class: "actions f ac" };
const _hoisted_4 = { key: 0 };
const _hoisted_5 = { key: 1 };
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
    const autoDesign = ref(true);
    const loading = ref(false);
    const previewLoading = ref(false);
    const previewSummary = ref(null);
    function parseBundle(text) {
      const raw = JSON.parse(text);
      if (!raw || typeof raw !== "object") throw new Error("invalid json");
      return raw;
    }
    function onFileChange(files) {
      const file = files[0]?.raw;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        jsonText.value = String(reader.result ?? "");
        previewSummary.value = null;
      };
      reader.readAsText(file);
    }
    function resetState() {
      jsonText.value = "";
      previewSummary.value = null;
      autoDesign.value = true;
    }
    function onClose() {
      resetState();
    }
    function onCancel() {
      visible.value = false;
      resetState();
    }
    async function onDryRun() {
      if (!jsonText.value.trim()) {
        window.$message.warning($t("workbench.production.importScriptBundle.empty"));
        return;
      }
      previewLoading.value = true;
      try {
        const bundle = parseBundle(jsonText.value);
        previewSummary.value = await dryRunImport({
          projectId: props.projectId,
          bundle,
          targetScriptId: props.scriptId
        });
      } catch (e) {
        window.$message.error(e?.message || $t("workbench.production.importScriptBundle.failed"));
      } finally {
        previewLoading.value = false;
      }
    }
    async function onConfirm() {
      if (!jsonText.value.trim()) {
        window.$message.warning($t("workbench.production.importScriptBundle.empty"));
        return;
      }
      loading.value = true;
      try {
        const bundle = parseBundle(jsonText.value);
        const result = await importScriptBundle({
          projectId: props.projectId,
          bundle,
          targetScriptId: props.scriptId,
          autoDesign: autoDesign.value
        });
        const store = useProductionAgentStore();
        store.episodesId = result.scriptId;
        await store.getFlowData();
        window.$message.success($t("workbench.production.importScriptBundle.success"));
        visible.value = false;
        resetState();
        emit("imported", result.scriptId);
      } catch (e) {
        window.$message.error(e?.message || $t("workbench.production.importScriptBundle.failed"));
      } finally {
        loading.value = false;
      }
    }
    return (_ctx, _cache) => {
      const _component_t_textarea = Textarea;
      const _component_t_button = Button;
      const _component_t_upload = Upload;
      const _component_t_checkbox = Checkbox;
      const _component_t_alert = Alert;
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        visible: visible.value,
        "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => visible.value = $event),
        header: _ctx.$t("workbench.production.importScriptBundle.title"),
        width: 760,
        "confirm-btn": _ctx.$t("workbench.production.importScriptBundle.confirm"),
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
            createBaseVNode("p", _hoisted_2, toDisplayString(_ctx.$t("workbench.production.importScriptBundle.hint")), 1),
            createVNode(_component_t_textarea, {
              modelValue: jsonText.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => jsonText.value = $event),
              placeholder: _ctx.$t("workbench.production.importScriptBundle.placeholder"),
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
                      createTextVNode(toDisplayString(_ctx.$t("workbench.production.importScriptBundle.upload")), 1)
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              }),
              createVNode(_component_t_checkbox, {
                modelValue: autoDesign.value,
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => autoDesign.value = $event)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.importScriptBundle.autoDesign")), 1)
                ]),
                _: 1
              }, 8, ["modelValue"]),
              createVNode(_component_t_button, {
                size: "small",
                variant: "text",
                loading: previewLoading.value,
                onClick: onDryRun
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.importScriptBundle.preview")), 1)
                ]),
                _: 1
              }, 8, ["loading"])
            ]),
            previewSummary.value ? (openBlock(), createBlock(_component_t_alert, {
              key: 0,
              theme: "warning",
              close: false,
              class: "preview"
            }, {
              message: withCtx(() => [
                previewSummary.value.willCreateScript ? (openBlock(), createElementBlock("div", _hoisted_4, toDisplayString(_ctx.$t("workbench.production.importScriptBundle.willCreate")), 1)) : createCommentVNode("", true),
                previewSummary.value.willOverwriteLayers?.length ? (openBlock(), createElementBlock("div", _hoisted_5, toDisplayString(_ctx.$t("workbench.production.importScriptBundle.willOverwrite")) + ": " + toDisplayString(previewSummary.value.willOverwriteLayers.join(", ")), 1)) : createCommentVNode("", true),
                createBaseVNode("div", null, toDisplayString(_ctx.$t("workbench.production.importScriptBundle.storyboardCount")) + ": " + toDisplayString(previewSummary.value.storyboardCount), 1)
              ]),
              _: 1
            })) : createCommentVNode("", true)
          ])
        ]),
        _: 1
      }, 8, ["visible", "header", "confirm-btn", "cancel-btn", "confirm-loading"]);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d4da5606"]]);

export { index as default };

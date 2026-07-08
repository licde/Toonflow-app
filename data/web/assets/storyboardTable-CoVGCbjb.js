import { l as defineComponent, bM as storeToRefs, bU as useModel, aK as openBlock, aL as createElementBlock, j as createVNode, aM as withCtx, aO as createBaseVNode, b0 as toDisplayString, a$ as createTextVNode, a1 as unref, aS as createBlock, bH as withModifiers, F as Fragment, bV as mergeModels, r as ref } from './vue-vendor-Cj7sXJnb.js';
import { c as _sfc_main$f, P as Position } from './vueflow-BeRgUeVC.js';
import { A as AsyncMdEditor } from './AsyncMdEditor-Cf72DQX2.js';
import { A as AsyncMdPreview } from './AsyncMdPreview-BoZmGdmW.js';
import { s as settingStore, _ as _export_sfc } from './index-DsDM6Bax.js';
import { a as useProductionAgentStore } from './productionAgent-DofsG6cz.js';
import { B as Button, a4 as Empty, Y as Card, E as Dialog } from './tdesign-C157N6jJ.js';
import './dayjs-CuToSpIM.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';
import './axios-B2i2rFrf.js';
import './project-C_OB2JAu.js';

const _hoisted_1 = { class: "titleBar dragHandle pr" };
const _hoisted_2 = { class: "title c" };
const _hoisted_3 = { class: "storyboardList" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "storyboardTable",
  props: /* @__PURE__ */ mergeModels({
    id: {},
    handleIds: {}
  }, {
    "modelValue": { required: true },
    "modelModifiers": {}
  }),
  emits: ["update:modelValue"],
  setup(__props) {
    const { themeSetting } = storeToRefs(settingStore());
    const props = __props;
    const storyboardTable = useModel(__props, "modelValue");
    const editContent = ref("");
    const dialogVisible = ref(false);
    const toolbars = [
      "bold",
      "underline",
      "italic",
      "strikeThrough",
      "-",
      "title",
      "sub",
      "sup",
      "quote",
      "unorderedList",
      "orderedList",
      "task",
      "-",
      "codeRow",
      "code",
      "table",
      "-",
      "revoke",
      "next",
      "=",
      "preview"
    ];
    function openEdit() {
      editContent.value = storyboardTable.value ?? "";
      dialogVisible.value = true;
    }
    function onConfirm() {
      storyboardTable.value = editContent.value;
      dialogVisible.value = false;
      useProductionAgentStore().setFlowData();
    }
    function onCancel() {
      dialogVisible.value = false;
    }
    function onPaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
          e.preventDefault();
          return;
        }
      }
    }
    return (_ctx, _cache) => {
      const _component_t_button = Button;
      const _component_t_empty = Empty;
      const _component_t_card = Card;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock(Fragment, null, [
        createVNode(_component_t_card, { class: "storyboardTable" }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_1, [
              createBaseVNode("div", _hoisted_2, toDisplayString(_ctx.$t("workbench.production.node.storyboardTable.title")), 1),
              createVNode(_component_t_button, {
                size: "small",
                variant: "text",
                onClick: openEdit
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.edit")), 1)
                ]),
                _: 1
              }),
              createVNode(unref(_sfc_main$f), {
                id: props.handleIds.target,
                type: "target",
                position: unref(Position).Left,
                style: { "left": "calc(-1 * var(--td-comp-paddingLR-xl))" }
              }, null, 8, ["id", "position"]),
              createVNode(unref(_sfc_main$f), {
                id: props.handleIds.source,
                type: "source",
                position: unref(Position).Right,
                style: { "right": "calc(-1 * var(--td-comp-paddingLR-xl))" }
              }, null, 8, ["id", "position"])
            ]),
            createBaseVNode("div", _hoisted_3, [
              !storyboardTable.value ? (openBlock(), createBlock(_component_t_empty, {
                key: 0,
                style: { "margin-top": "16px" }
              })) : (openBlock(), createBlock(AsyncMdPreview, {
                key: 1,
                modelValue: storyboardTable.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => storyboardTable.value = $event),
                theme: unref(themeSetting).mode
              }, null, 8, ["modelValue", "theme"]))
            ])
          ]),
          _: 1
        }),
        createVNode(_component_t_dialog, {
          visible: dialogVisible.value,
          "onUpdate:visible": _cache[3] || (_cache[3] = ($event) => dialogVisible.value = $event),
          header: _ctx.$t("workbench.production.node.storyboardTable.editDialog"),
          width: "90vw",
          "confirm-btn": _ctx.$t("workbench.production.save"),
          "cancel-btn": _ctx.$t("workbench.production.cancel"),
          onConfirm,
          onCancel,
          onClose: onCancel,
          "close-on-overlay-click": false,
          placement: "center",
          attach: "body"
        }, {
          default: withCtx(() => [
            createVNode(AsyncMdEditor, {
              modelValue: editContent.value,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => editContent.value = $event),
              theme: unref(themeSetting).mode,
              toolbars,
              footers: [],
              style: { "height": "72vh" },
              onOnUploadImg: () => {
              },
              onDrop: _cache[2] || (_cache[2] = withModifiers(() => {
              }, ["prevent"])),
              onPaste
            }, null, 8, ["modelValue", "theme"])
          ]),
          _: 1
        }, 8, ["visible", "header", "confirm-btn", "cancel-btn"])
      ], 64);
    };
  }
});

/* unplugin-vue-components disabled */

const storyboardTable = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b21ac44c"]]);

export { storyboardTable as default };

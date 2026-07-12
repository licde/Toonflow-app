import { i as instance } from './axios-BX4BN6mO.js';
import { A as AsyncMdEditor } from './AsyncMdEditor-CJVlVNjS.js';
import { s as settingStore, _ as _export_sfc } from './index-DkAIKrBP.js';
import { l as defineComponent, bM as storeToRefs, o as onMounted, aK as openBlock, aL as createElementBlock, F as Fragment, aP as renderList, j as createVNode, aM as withCtx, aO as createBaseVNode, b0 as toDisplayString, a1 as unref, r as ref } from './vue-vendor-Byo5TD6r.js';
import { Y as Card, E as Dialog } from './tdesign-CfL1pweZ.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "promptManage" };
const _hoisted_2 = ["onClick"];
const _hoisted_3 = { class: "data" };
const _hoisted_4 = { class: "jb" };
const _hoisted_5 = { class: "name" };
const _hoisted_6 = { class: "type" };
const _hoisted_7 = { class: "data" };
const _hoisted_8 = { class: "show" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "promptManage",
  setup(__props) {
    const { themeSetting } = storeToRefs(settingStore());
    onMounted(() => {
      getPrompt();
    });
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
    const visible = ref(false);
    const data = ref([]);
    function getPrompt() {
      instance.post("/setting/promptManage/getPrompt").then((res) => {
        data.value = res.data.map((item) => {
          return {
            id: item.id,
            name: item.name,
            type: item.type,
            data: item.data
          };
        });
      });
    }
    function openShow(value) {
      promptData.value = { ...value };
      visible.value = true;
    }
    const promptData = ref({ id: 0, name: "", type: "", data: "" });
    async function onConfirm() {
      await instance.post("/setting/promptManage/updatePrompt", {
        id: promptData.value.id,
        data: promptData.value.data
      });
      window.$message.success($t("workbench.project.dialog.prompt.saveSuccess"));
      getPrompt();
      visible.value = false;
    }
    return (_ctx, _cache) => {
      const _component_t_card = Card;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(data.value, (value) => {
          return openBlock(), createElementBlock("div", {
            key: value.id,
            style: { "cursor": "pointer" },
            onClick: ($event) => openShow(value)
          }, [
            createVNode(_component_t_card, { bordered: "" }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_3, [
                  createBaseVNode("div", _hoisted_4, [
                    createBaseVNode("div", _hoisted_5, toDisplayString(value.name), 1),
                    createBaseVNode("div", _hoisted_6, toDisplayString(value.type), 1)
                  ]),
                  createBaseVNode("div", _hoisted_7, toDisplayString(value.data), 1)
                ])
              ]),
              _: 2
            }, 1024)
          ], 8, _hoisted_2);
        }), 128)),
        createBaseVNode("div", _hoisted_8, [
          createVNode(_component_t_dialog, {
            visible: visible.value,
            "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => visible.value = $event),
            header: _ctx.$t("workbench.project.dialog.prompt.title"),
            width: "70%",
            "close-on-overlay-click": false,
            onConfirm,
            top: "9vh"
          }, {
            default: withCtx(() => [
              createVNode(AsyncMdEditor, {
                theme: unref(themeSetting).mode === "auto" ? "light" : unref(themeSetting).mode,
                modelValue: promptData.value.data,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => promptData.value.data = $event),
                toolbars: promptToolbars,
                footers: [],
                style: { "height": "60vh" },
                placeholder: _ctx.$t("workbench.project.dialog.prompt.placeholder"),
                onOnUploadImg: () => {
                }
              }, null, 8, ["theme", "modelValue", "placeholder"])
            ]),
            _: 1
          }, 8, ["visible", "header"])
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const promptManage = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-596518c2"]]);

export { promptManage as default };

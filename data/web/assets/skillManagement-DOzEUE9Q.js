import { A as AsyncMdEditor } from './AsyncMdEditor-Cf72DQX2.js';
import { A as AsyncMdPreview } from './AsyncMdPreview-BoZmGdmW.js';
import { s as settingStore, _ as _export_sfc } from './index-DsDM6Bax.js';
import { i as instance } from './axios-B2i2rFrf.js';
import { l as defineComponent, bM as storeToRefs, o as onMounted, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, j as createVNode, aS as createBlock, aM as withCtx, b0 as toDisplayString, a$ as createTextVNode, aT as createCommentVNode, a1 as unref, r as ref, c as computed } from './vue-vendor-Cj7sXJnb.js';
import { R as Input, B as Button, E as Dialog, al as Tree, a4 as Empty } from './tdesign-C157N6jJ.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "skillManagement" };
const _hoisted_2 = { class: "sidebarPanel" };
const _hoisted_3 = { class: "treeWrap" };
const _hoisted_4 = { class: "viewPanel" };
const _hoisted_5 = {
  key: 0,
  class: "viewHeader"
};
const _hoisted_6 = { class: "fileName" };
const _hoisted_7 = {
  key: 1,
  class: "previewWrap"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "skillManagement",
  setup(__props) {
    const { themeSetting } = storeToRefs(settingStore());
    const mdToolbars = [
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
    const entries = ref([]);
    const activeEntry = ref("");
    const keyword = ref("");
    const content = ref("");
    const draft = ref("");
    const editVisible = ref(false);
    const isSaving = ref(false);
    const activedKeys = computed(() => activeEntry.value ? [activeEntry.value] : []);
    const filteredEntries = computed(() => {
      let result = entries.value.filter((e) => e.endsWith(".md"));
      if (!keyword.value) return result;
      const kw = keyword.value.toLowerCase();
      return result.filter((e) => e.toLowerCase().includes(kw));
    });
    const treeData = computed(() => {
      const dirMap = /* @__PURE__ */ new Map();
      const rootItems = [];
      for (const filePath of filteredEntries.value) {
        const parts = filePath.split("/").filter(Boolean);
        let parentChildren = rootItems;
        let cur = "";
        for (let i = 0; i < parts.length; i++) {
          cur = cur ? `${cur}/${parts[i]}` : parts[i];
          const isFile = i === parts.length - 1;
          if (isFile) {
            if (!parentChildren.some((c) => c.value === cur)) {
              parentChildren.push({ label: parts[i], value: cur, isFile: true, isRoot: parts.length === 1 });
            }
          } else {
            let dir = dirMap.get(cur);
            if (!dir) {
              dir = { label: parts[i], value: cur, isFile: false, children: [] };
              dirMap.set(cur, dir);
              parentChildren.push(dir);
            }
            parentChildren = dir.children;
          }
        }
      }
      const sortItems = (items) => {
        items.sort((a, b) => {
          if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
          return a.label.localeCompare(b.label);
        });
        items.forEach((item) => item.children && sortItems(item.children));
      };
      sortItems(rootItems);
      return rootItems;
    });
    async function fetchList() {
      try {
        const { data } = await instance.post("/setting/skillManagement/getSkillList");
        entries.value = Array.isArray(data) ? data : [];
      } catch (e) {
        console.error(e);
      }
    }
    async function loadContent(path) {
      try {
        const { data } = await instance.post("/setting/skillManagement/getSkillContent", { path });
        content.value = typeof data === "string" ? data : data?.content || "";
      } catch (e) {
        console.error(e);
        content.value = "";
      }
    }
    async function onTreeActive(value, context) {
      const key = value[value.length - 1];
      const path = typeof key === "string" ? key : String(key || "");
      const node = context.node.data;
      if (!path || !node?.isFile || path === activeEntry.value) return;
      activeEntry.value = path;
      await loadContent(path);
    }
    function openEditDialog() {
      draft.value = content.value;
      editVisible.value = true;
    }
    async function onSave() {
      if (!activeEntry.value) return;
      isSaving.value = true;
      try {
        await instance.post("/setting/skillManagement/saveSkillContent", {
          path: activeEntry.value,
          content: draft.value
        });
        content.value = draft.value;
        editVisible.value = false;
      } catch (e) {
        console.error(e);
      } finally {
        isSaving.value = false;
      }
    }
    onMounted(() => fetchList());
    return (_ctx, _cache) => {
      const _component_t_input = Input;
      const _component_i_folder_open = resolveComponent("i-folder-open");
      const _component_i_file_text = resolveComponent("i-file-text");
      const _component_t_tree = Tree;
      const _component_t_empty = Empty;
      const _component_t_button = Button;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("aside", _hoisted_2, [
          createVNode(_component_t_input, {
            modelValue: keyword.value,
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => keyword.value = $event),
            clearable: "",
            placeholder: _ctx.$t("setting.skillManagement.search")
          }, null, 8, ["modelValue", "placeholder"]),
          createBaseVNode("div", _hoisted_3, [
            treeData.value.length ? (openBlock(), createBlock(_component_t_tree, {
              key: 0,
              activable: "",
              hover: "",
              line: "",
              "expand-on-click-node": "",
              data: treeData.value,
              actived: activedKeys.value,
              onActive: onTreeActive
            }, {
              icon: withCtx(({ node }) => [
                !node.data.isFile ? (openBlock(), createBlock(_component_i_folder_open, {
                  key: 0,
                  theme: "outline",
                  size: "16"
                })) : node.data.isRoot ? (openBlock(), createBlock(_component_i_file_text, {
                  key: 1,
                  theme: "outline",
                  size: "16",
                  fill: "red"
                })) : (openBlock(), createBlock(_component_i_file_text, {
                  key: 2,
                  theme: "outline",
                  size: "16"
                }))
              ]),
              _: 1
            }, 8, ["data", "actived"])) : (openBlock(), createBlock(_component_t_empty, {
              key: 1,
              description: _ctx.$t("setting.skillManagement.empty")
            }, null, 8, ["description"]))
          ])
        ]),
        createBaseVNode("section", _hoisted_4, [
          activeEntry.value ? (openBlock(), createElementBlock("div", _hoisted_5, [
            createBaseVNode("span", _hoisted_6, toDisplayString(activeEntry.value), 1),
            createVNode(_component_t_button, {
              size: "small",
              theme: "primary",
              variant: "outline",
              onClick: openEditDialog
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(_ctx.$t("setting.skillManagement.edit")), 1)
              ]),
              _: 1
            })
          ])) : createCommentVNode("", true),
          activeEntry.value ? (openBlock(), createElementBlock("div", _hoisted_7, [
            createVNode(AsyncMdPreview, {
              theme: unref(themeSetting).mode,
              modelValue: content.value,
              toolbars: [],
              "preview-only": "",
              "preview-theme": "github",
              "code-theme": "atom"
            }, null, 8, ["theme", "modelValue"])
          ])) : (openBlock(), createBlock(_component_t_empty, {
            key: 2,
            description: _ctx.$t("setting.skillManagement.selectOnTheLeft")
          }, null, 8, ["description"]))
        ]),
        createVNode(_component_t_dialog, {
          placement: "center",
          visible: editVisible.value,
          "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => editVisible.value = $event),
          header: _ctx.$t("setting.skillManagement.edit") + ` ${activeEntry.value}`,
          width: "80vw",
          "confirm-btn": _ctx.$t("common.save"),
          "confirm-on-enter": false,
          "on-confirm": onSave,
          loading: isSaving.value
        }, {
          default: withCtx(() => [
            createVNode(AsyncMdEditor, {
              theme: unref(themeSetting).mode,
              modelValue: draft.value,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => draft.value = $event),
              toolbars: mdToolbars,
              "preview-theme": "github",
              "code-theme": "atom",
              style: { "height": "72vh" }
            }, null, 8, ["theme", "modelValue"])
          ]),
          _: 1
        }, 8, ["visible", "header", "confirm-btn", "loading"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const skillManagement = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-a6c368b6"]]);

export { skillManagement as default };

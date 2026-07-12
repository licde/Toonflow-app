import { l as defineComponent, w as watch, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, b0 as toDisplayString, aS as createBlock, aM as withCtx, a$ as createTextVNode, aT as createCommentVNode, j as createVNode, F as Fragment, aP as renderList, aU as normalizeClass, bH as withModifiers, r as ref, c as computed, bM as storeToRefs, bU as useModel, a1 as unref, bV as mergeModels } from './vue-vendor-Byo5TD6r.js';
import { c as _sfc_main$f, P as Position } from './vueflow-RSWomYB5.js';
import { A as AsyncMdEditor } from './AsyncMdEditor-CJVlVNjS.js';
import { A as AsyncMdPreview } from './AsyncMdPreview-D9IGMFOZ.js';
import { _ as _export_sfc, s as settingStore } from './index-DkAIKrBP.js';
import { b as useProductionAgentStore } from './useAdaptationNav-Bi4oVHb2.js';
import { p as projectStore } from './project-Cze3Ugcr.js';
import { v as validateEpisode } from './ruleEngine-Bk1aW4hN.js';
import { B as Button, X as Tag, a4 as Empty, I as Icon, Y as Card, E as Dialog } from './tdesign-CfL1pweZ.js';
import './dayjs-CuToSpIM.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './axios-BX4BN6mO.js';

const _hoisted_1$2 = {
  key: 0,
  class: "rulePanel"
};
const _hoisted_2$2 = { class: "rulePanelHeader f ac" };
const _hoisted_3$1 = { class: "title" };
const _hoisted_4 = {
  key: 0,
  class: "issues"
};
const _hoisted_5 = ["onClick"];
const _hoisted_6 = { class: "msg" };
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    projectId: {},
    scriptId: {},
    script: {},
    scriptPlan: {},
    storyboardTable: {},
    storyboard: {},
    visible: { type: Boolean }
  },
  emits: ["jump", "autofix", "report"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const report = ref(null);
    const loading = ref(false);
    const displayIssues = computed(() => report.value?.issues.filter((i) => i.severity !== "INFO") ?? []);
    async function runValidate() {
      if (!props.scriptId) return;
      loading.value = true;
      try {
        report.value = await validateEpisode({
          projectId: props.projectId,
          scriptId: props.scriptId,
          script: props.script,
          scriptPlan: props.scriptPlan,
          storyboardTable: props.storyboardTable,
          storyboard: props.storyboard
        });
        if (report.value) emit("report", report.value);
      } finally {
        loading.value = false;
      }
    }
    watch(
      () => [props.scriptId, props.storyboardTable],
      () => {
        if (props.visible && props.scriptId) runValidate();
      },
      { immediate: true }
    );
    __expose({ runValidate, report });
    return (_ctx, _cache) => {
      const _component_t_tag = Tag;
      const _component_t_button = Button;
      const _component_t_empty = Empty;
      return __props.visible ? (openBlock(), createElementBlock("div", _hoisted_1$2, [
        createBaseVNode("div", _hoisted_2$2, [
          createBaseVNode("span", _hoisted_3$1, toDisplayString(_ctx.$t("workbench.production.rulePanel.title")), 1),
          report.value ? (openBlock(), createBlock(_component_t_tag, {
            key: 0,
            theme: report.value.passed ? "success" : "danger",
            size: "small"
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(report.value.passed ? "PASS" : `BLOCK ${report.value.blockCount}`), 1)
            ]),
            _: 1
          }, 8, ["theme"])) : createCommentVNode("", true),
          createVNode(_component_t_button, {
            size: "small",
            variant: "text",
            loading: loading.value,
            onClick: runValidate
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.production.rulePanel.refresh")), 1)
            ]),
            _: 1
          }, 8, ["loading"])
        ]),
        report.value ? (openBlock(), createElementBlock("div", _hoisted_4, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(displayIssues.value, (issue, idx) => {
            return openBlock(), createElementBlock("div", {
              key: idx,
              class: normalizeClass(["issue f ac", issue.severity.toLowerCase()]),
              onClick: ($event) => emit("jump", issue.fieldPath)
            }, [
              createVNode(_component_t_tag, {
                theme: issue.severity === "BLOCK" ? "danger" : "warning",
                size: "small"
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(issue.ruleId), 1)
                ]),
                _: 2
              }, 1032, ["theme"]),
              createBaseVNode("span", _hoisted_6, toDisplayString(issue.message), 1),
              issue.autoFix ? (openBlock(), createBlock(_component_t_button, {
                key: 0,
                size: "small",
                variant: "text",
                onClick: withModifiers(($event) => emit("autofix", issue), ["stop"])
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.rulePanel.autofix")), 1)
                ]),
                _: 1
              }, 8, ["onClick"])) : createCommentVNode("", true)
            ], 10, _hoisted_5);
          }), 128)),
          !displayIssues.value.length ? (openBlock(), createBlock(_component_t_empty, {
            key: 0,
            size: "small",
            description: _ctx.$t("workbench.production.rulePanel.empty")
          }, null, 8, ["description"])) : createCommentVNode("", true)
        ])) : createCommentVNode("", true)
      ])) : createCommentVNode("", true);
    };
  }
});

/* unplugin-vue-components disabled */

const rulePanel = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-3609648d"]]);

const _hoisted_1$1 = {
  key: 0,
  class: "pipelineGateBar f ac"
};
const _hoisted_2$1 = { class: "label" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    report: {}
  },
  setup(__props) {
    const props = __props;
    const STAGE_LABELS = {
      P0: "剧本",
      G: "规范",
      BP: "资产",
      GB: "节拍",
      SB: "分镜",
      EN: "编译",
      MD: "触达",
      P2: "后期"
    };
    const iconMap = {
      pass: "check-circle",
      warn: "error-circle",
      block: "close-circle",
      skip: "minus-circle"
    };
    const stages = computed(() => {
      if (!props.report?.stageStatus) return [];
      return Object.entries(props.report.stageStatus).filter(([k]) => STAGE_LABELS[k]).map(([key, status]) => ({ key, label: STAGE_LABELS[key], status }));
    });
    return (_ctx, _cache) => {
      const _component_t_icon = Icon;
      return stages.value.length ? (openBlock(), createElementBlock("div", _hoisted_1$1, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(stages.value, (s) => {
          return openBlock(), createElementBlock("div", {
            key: s.key,
            class: normalizeClass(["stage", s.status])
          }, [
            createBaseVNode("span", _hoisted_2$1, toDisplayString(s.label), 1),
            createVNode(_component_t_icon, {
              name: iconMap[s.status],
              size: "14px"
            }, null, 8, ["name"])
          ], 2);
        }), 128))
      ])) : createCommentVNode("", true);
    };
  }
});

/* unplugin-vue-components disabled */

const pipelineGateBar = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-e719bb31"]]);

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
    const { episodesId, flowData } = storeToRefs(useProductionAgentStore());
    const { project } = storeToRefs(projectStore());
    const projectId = computed(() => Number(project.value?.id ?? 0));
    const validationReport = ref(null);
    function onValidationReport(r) {
      validationReport.value = r;
    }
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
            ]),
            createVNode(pipelineGateBar, { report: validationReport.value }, null, 8, ["report"]),
            createVNode(rulePanel, {
              visible: "",
              "project-id": projectId.value,
              "script-id": unref(episodesId),
              script: unref(flowData).script,
              "script-plan": unref(flowData).scriptPlan,
              "storyboard-table": storyboardTable.value,
              storyboard: unref(flowData).storyboard,
              onReport: onValidationReport
            }, null, 8, ["project-id", "script-id", "script", "script-plan", "storyboard-table", "storyboard"])
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

const storyboardTable = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-24dc98f9"]]);

export { storyboardTable as default };

import { l as defineComponent, w as watch, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, b0 as toDisplayString, aS as createBlock, aM as withCtx, a$ as createTextVNode, aT as createCommentVNode, j as createVNode, F as Fragment, aP as renderList, aU as normalizeClass, bH as withModifiers, r as ref, c as computed, bM as storeToRefs, bU as useModel, a1 as unref, bV as mergeModels } from './vue-vendor-Byo5TD6r.js';
import { c as _sfc_main$f, P as Position } from './vueflow-RSWomYB5.js';
import { A as AsyncMdEditor } from './AsyncMdEditor-Borgk8h0.js';
import { A as AsyncMdPreview } from './AsyncMdPreview-PBX0cZ0A.js';
import { _ as _export_sfc, s as settingStore, p as projectStore } from './index-Dj17DntQ.js';
import { u as useAdaptationNav, b as useProductionAgentStore } from './useAdaptationNav-BJTPyVmA.js';
import { validateEpisode, preflightProduction } from './ruleEngine-l0rUVBgW.js';
import { B as Button, X as Tag, a4 as Empty, I as Icon, Y as Card, E as Dialog } from './tdesign-CfL1pweZ.js';
import './dayjs-CuToSpIM.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './axios-DoLZCC01.js';

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
const _hoisted_7 = {
  key: 2,
  class: "repush"
};
const _hoisted_8 = { class: "msg" };
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
  emits: ["jump", "autofix", "report", "retry", "preflight", "rePush"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const report = ref(null);
    const preflight = ref(null);
    const loading = ref(false);
    const displayIssues = computed(() => {
      const fromPreflight = preflight.value?.detectionResults?.filter((r) => !r.passed && r.severity !== "INFO").map((r) => ({
        ruleId: r.id,
        severity: r.severity,
        message: r.message || r.description,
        fieldPath: r.fieldPaths?.[0] ?? "",
        autoFix: false,
        suggestedPrompt: void 0
      })) ?? [];
      const fromValidate = report.value?.issues?.filter((i) => i.severity !== "INFO") ?? [];
      return [...fromPreflight, ...fromValidate].map((i) => {
        const msg = String(i.message ?? "");
        if (i.ruleId === "PR-09" && /口型|speaking|嘴型/i.test(msg) && i.severity === "BLOCK") {
          return { ...i, severity: "WARN" };
        }
        if (i.ruleId === "MOD-01" && i.severity === "BLOCK") {
          return { ...i, severity: "WARN" };
        }
        return i;
      });
    });
    const summary = computed(() => {
      if (!preflight.value && !report.value) return null;
      const blocks = displayIssues.value.filter((i) => i.severity === "BLOCK").length;
      return { blocked: blocks > 0, blocks };
    });
    async function runValidate() {
      if (!props.scriptId) return;
      loading.value = true;
      try {
        const [v, p] = await Promise.all([
          validateEpisode({
            projectId: props.projectId,
            scriptId: props.scriptId,
            script: props.script,
            scriptPlan: props.scriptPlan,
            storyboardTable: props.storyboardTable,
            storyboard: props.storyboard
          }),
          preflightProduction({ projectId: props.projectId, scriptId: props.scriptId, tier: "T3" }).catch(() => null)
        ]);
        report.value = v;
        preflight.value = p;
        if (report.value) emit("report", report.value);
        if (preflight.value) emit("preflight", preflight.value);
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
    __expose({ runValidate, report, preflight });
    return (_ctx, _cache) => {
      const _component_t_tag = Tag;
      const _component_t_button = Button;
      const _component_t_empty = Empty;
      return __props.visible ? (openBlock(), createElementBlock("div", _hoisted_1$2, [
        createBaseVNode("div", _hoisted_2$2, [
          createBaseVNode("span", _hoisted_3$1, toDisplayString(_ctx.$t("workbench.production.rulePanel.title")), 1),
          summary.value ? (openBlock(), createBlock(_component_t_tag, {
            key: 0,
            theme: summary.value.blocked ? "danger" : "success",
            size: "small"
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(summary.value.blocked ? `BLOCK ${summary.value.blocks}` : "PASS"), 1)
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
        displayIssues.value.length ? (openBlock(), createElementBlock("div", _hoisted_4, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(displayIssues.value, (issue, idx) => {
            return openBlock(), createElementBlock("div", {
              key: idx,
              class: normalizeClass(["issue f ac", issue.severity.toLowerCase()]),
              onClick: ($event) => emit("jump", issue.fieldPath || "")
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
              }, 8, ["onClick"])) : createCommentVNode("", true),
              issue.suggestedPrompt ? (openBlock(), createBlock(_component_t_button, {
                key: 1,
                size: "small",
                variant: "outline",
                onClick: withModifiers(($event) => emit("retry", issue), ["stop"])
              }, {
                default: withCtx(() => [..._cache[0] || (_cache[0] = [
                  createTextVNode("重试", -1)
                ])]),
                _: 1
              }, 8, ["onClick"])) : createCommentVNode("", true)
            ], 10, _hoisted_5);
          }), 128))
        ])) : !loading.value ? (openBlock(), createBlock(_component_t_empty, {
          key: 1,
          size: "small",
          description: _ctx.$t("workbench.production.rulePanel.empty")
        }, null, 8, ["description"])) : createCommentVNode("", true),
        preflight.value?.rePushPlan?.length ? (openBlock(), createElementBlock("div", _hoisted_7, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(preflight.value.rePushPlan, (p, i) => {
            return openBlock(), createElementBlock("div", {
              key: i,
              class: "issue f ac"
            }, [
              createBaseVNode("span", _hoisted_8, toDisplayString(p.trigger) + " → " + toDisplayString(p.reverseTarget), 1),
              createVNode(_component_t_button, {
                size: "small",
                variant: "outline",
                onClick: ($event) => emit("rePush", p)
              }, {
                default: withCtx(() => [..._cache[1] || (_cache[1] = [
                  createTextVNode("回推", -1)
                ])]),
                _: 1
              }, 8, ["onClick"])
            ]);
          }), 128))
        ])) : createCommentVNode("", true)
      ])) : createCommentVNode("", true);
    };
  }
});

/* unplugin-vue-components disabled */

const rulePanel = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-0c26c465"]]);

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

function normalizeStoryboardTableMd(markdown) {
  const raw = String(markdown ?? "").replace(/\r\n/g, "\n").trim();
  if (!raw) return "";
  let s = raw.replace(/\|\s*(\d+(?:\.\d+)?s)\s*\|\s*\|\s*(\d+)\s*\|/gi, "|$1 |\n| $2 |");
  s = s.replace(/\|\s*(\d+(?:\.\d+)?s)\s*\|\s+(\d+)\s*\|/gi, "|$1 |\n| $2 |");
  s = s.replace(/\|\s*\|\s*(\d+)\s*\|\s*(CHAR-SCENE|PURE-SCENE|PURE-PROP|CHAR-PROP)\b/gi, "|\n| $1 | $2");
  const lines = s.split("\n").map((l) => l.trim()).filter(Boolean);
  const HEADER = "| 镜 | 类型 | 场景 | 画面描写 | 景别 | 表演 | 台词 | 时长 |";
  const SEP = "| --- | --- | --- | --- | --- | --- | --- | --- |";
  const isSep = (line) => {
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    return cells.length >= 2 && cells.every((c) => /^:?-+:?$/.test(c));
  };
  const isHeader = (line) => /镜号|^\s*镜\s*$|类型|画面描写|景别|表演/i.test(line) && line.includes("|") && !/CHAR-SCENE|PURE-SCENE|PURE-PROP|CHAR-PROP|\d+\s*s/i.test(line);
  const body = [];
  for (const line of lines) {
    if (isSep(line) || isHeader(line)) continue;
    if (!line.includes("|")) {
      body.push(line);
      continue;
    }
    let row = line;
    if (!row.startsWith("|")) row = `| ${row}`;
    if (!row.endsWith("|")) row = `${row} |`;
    body.push(row);
  }
  if (!body.length) return raw;
  return [HEADER, SEP, ...body].join("\n");
}

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
    const { goDesignStage } = useAdaptationNav();
    const { themeSetting } = storeToRefs(settingStore());
    const { episodesId, flowData } = storeToRefs(useProductionAgentStore());
    const { project } = storeToRefs(projectStore());
    const projectId = computed(() => Number(project.value?.id ?? 0));
    const validationReport = ref(null);
    function onValidationReport(r) {
      validationReport.value = r;
    }
    function onRePush(item) {
      goDesignStage(item.reverseTarget, item.trigger);
    }
    function onAutofix(issue) {
      window.$message.info(`自动修复 ${issue.ruleId ?? ""} → ${issue.fieldPath ?? ""}`);
    }
    const props = __props;
    const storyboardTable = useModel(__props, "modelValue");
    const editContent = ref("");
    const dialogVisible = ref(false);
    if (storyboardTable.value?.trim()) {
      const healed = normalizeStoryboardTableMd(storyboardTable.value);
      if (healed !== storyboardTable.value) storyboardTable.value = healed;
    }
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
      editContent.value = normalizeStoryboardTableMd(storyboardTable.value ?? "");
      dialogVisible.value = true;
    }
    function onConfirm() {
      storyboardTable.value = normalizeStoryboardTableMd(editContent.value);
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
              onReport: onValidationReport,
              onRePush,
              onAutofix
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

const storyboardTable = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1eac8415"]]);

export { storyboardTable as default };

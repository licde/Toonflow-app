import { d as dayjs } from './dayjs-CuToSpIM.js';
import { i as instance } from './axios-PPMfXuH1.js';
import { p as projectStore } from './project-Cze3Ugcr.js';
import { l as defineComponent, bM as storeToRefs, o as onMounted, aL as createElementBlock, aO as createBaseVNode, b0 as toDisplayString, j as createVNode, aM as withCtx, a1 as unref, av as isRef, r as ref, aK as openBlock, a$ as createTextVNode, aS as createBlock, aU as normalizeClass, b2 as resolveComponent } from './vue-vendor-Byo5TD6r.js';
import { B as Button, K as Select, Z as Table, $ as Pagination, n as Tooltip } from './tdesign-CfL1pweZ.js';
import { _ as _export_sfc } from './index-BPofKOpG.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';

const _hoisted_1 = { class: "task" };
const _hoisted_2 = { class: "header" };
const _hoisted_3 = { class: "headerInfo fc" };
const _hoisted_4 = { class: "title" };
const _hoisted_5 = { class: "sub" };
const _hoisted_6 = { class: "list" };
const _hoisted_7 = { class: "search f" };
const _hoisted_8 = { class: "content" };
const _hoisted_9 = { class: "stateText stateFail" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const { project } = storeToRefs(projectStore());
    const columns = [
      { colKey: "taskClass", title: $t("workbench.task.col.taskClass"), width: 120, ellipsis: true },
      { colKey: "relatedObjects", title: $t("workbench.task.col.relatedObjects"), width: 120, ellipsis: true },
      { colKey: "model", title: $t("workbench.task.col.model"), width: 280, ellipsis: true },
      { colKey: "describe", title: $t("workbench.task.col.describe"), ellipsis: true },
      { colKey: "reason", title: $t("workbench.task.col.reason"), ellipsis: true },
      { colKey: "state", title: $t("workbench.task.col.state"), width: 100, cell: "state" },
      { colKey: "startTime", title: $t("workbench.task.col.startTime"), width: 200, cell: "startTime" }
    ];
    const stateOptions = [
      { label: $t("workbench.task.stateAll"), value: "" },
      { label: $t("workbench.task.stateRunning"), value: "进行中" },
      { label: $t("workbench.task.stateCompleted"), value: "已完成" },
      { label: $t("workbench.task.stateFailed"), value: "生成失败" }
    ];
    const pagination = ref({ page: 1, limit: 10, total: 0, loading: false });
    const categoryOptions = ref([]);
    const projectData = ref([]);
    const taskClass = ref("");
    const taskState = ref("");
    const projectId = ref("");
    const taskList = ref([]);
    onMounted(() => {
      getTaskList();
      getCategories();
      getProject();
    });
    function onFilterChange() {
      pagination.value.page = 1;
      getTaskList();
    }
    async function getCategories() {
      const { data } = await instance.post("/task/getTaskCategories").catch(() => ({ data: [] }));
      categoryOptions.value = [
        { label: $t("workbench.task.stateAll"), value: "" },
        ...data.map((i) => ({ label: i.taskClass, value: i.taskClass }))
      ];
    }
    async function getProject() {
      const { data } = await instance.post("/task/getProject").catch(() => ({ data: [] }));
      projectData.value = [{ label: $t("workbench.task.stateAll"), value: "" }, ...data.map((i) => ({ label: i.name, value: i.id }))];
    }
    async function getTaskList() {
      pagination.value.loading = true;
      try {
        const { data } = await instance.post("/task/getTaskApi", {
          page: pagination.value.page,
          limit: pagination.value.limit,
          taskClass: taskClass.value,
          state: taskState.value,
          projectId: projectId.value || project.value?.id
        });
        taskList.value = data.data;
        pagination.value.total = data.total;
      } catch {
        window.$message.error($t("workbench.task.fetchFailed"));
      } finally {
        pagination.value.loading = false;
      }
    }
    return (_ctx, _cache) => {
      const _component_i_redo = resolveComponent("i-redo");
      const _component_t_button = Button;
      const _component_t_select = Select;
      const _component_t_tooltip = Tooltip;
      const _component_t_table = Table;
      const _component_t_pagination = Pagination;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("span", _hoisted_4, toDisplayString(_ctx.$t("workbench.task.title")), 1),
            createBaseVNode("span", _hoisted_5, toDisplayString(_ctx.$t("workbench.task.subtitle")), 1)
          ]),
          createVNode(_component_t_button, { onClick: getTaskList }, {
            icon: withCtx(() => [
              createVNode(_component_i_redo, { size: 20 })
            ]),
            default: withCtx(() => [
              createTextVNode(" " + toDisplayString(_ctx.$t("workbench.task.refresh")), 1)
            ]),
            _: 1
          })
        ]),
        createBaseVNode("div", _hoisted_6, [
          createBaseVNode("div", _hoisted_7, [
            createVNode(_component_t_select, {
              label: _ctx.$t("workbench.task.project"),
              modelValue: unref(projectId),
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(projectId) ? projectId.value = $event : null),
              options: unref(projectData),
              onChange: onFilterChange
            }, null, 8, ["label", "modelValue", "options"]),
            createVNode(_component_t_select, {
              label: _ctx.$t("workbench.task.categoryLabel"),
              modelValue: unref(taskClass),
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(taskClass) ? taskClass.value = $event : null),
              options: unref(categoryOptions),
              onChange: onFilterChange,
              style: { "margin-left": "20px" }
            }, null, 8, ["label", "modelValue", "options"]),
            createVNode(_component_t_select, {
              label: _ctx.$t("workbench.task.stateLabel"),
              modelValue: unref(taskState),
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(taskState) ? taskState.value = $event : null),
              options: stateOptions,
              onChange: onFilterChange,
              style: { "margin-left": "20px" }
            }, null, 8, ["label", "modelValue"])
          ]),
          createBaseVNode("div", _hoisted_8, [
            createVNode(_component_t_table, {
              data: unref(taskList),
              columns,
              "row-key": "id",
              loading: unref(pagination).loading,
              hover: "",
              stripe: ""
            }, {
              state: withCtx(({ row }) => [
                row.state === "生成失败" ? (openBlock(), createBlock(_component_t_tooltip, {
                  key: 0,
                  content: row.reason || _ctx.$t("workbench.task.noFailReason"),
                  placement: "top"
                }, {
                  default: withCtx(() => [
                    createBaseVNode("span", _hoisted_9, toDisplayString(row.state), 1)
                  ]),
                  _: 2
                }, 1032, ["content"])) : (openBlock(), createElementBlock("span", {
                  key: 1,
                  class: normalizeClass(["stateText", row.state === "进行中" ? "stateRunning" : "stateSuccess"])
                }, toDisplayString(row.state), 3))
              ]),
              startTime: withCtx(({ row }) => [
                createBaseVNode("span", null, toDisplayString(unref(dayjs)(row.startTime).format("YYYY-MM-DD HH:mm:ss")), 1)
              ]),
              _: 1
            }, 8, ["data", "loading"]),
            createVNode(_component_t_pagination, {
              class: "paginationWrap",
              current: unref(pagination).page,
              "onUpdate:current": _cache[3] || (_cache[3] = ($event) => unref(pagination).page = $event),
              pageSize: unref(pagination).limit,
              "onUpdate:pageSize": _cache[4] || (_cache[4] = ($event) => unref(pagination).limit = $event),
              "show-sizer": "",
              total: unref(pagination).total,
              onPageSizeChange: getTaskList,
              onCurrentChange: getTaskList
            }, null, 8, ["current", "pageSize", "total"])
          ])
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7d93af9d"]]);

export { index as default };

const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./mammoth-qyhJBxxk.js","./dayjs-CuToSpIM.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-CDQfeHxT.js';
import { u as useAdaptationNav } from './useAdaptationNav-BJTPyVmA.js';
import { p as projectStore, _ as _export_sfc } from './index-Dj17DntQ.js';
import { l as defineComponent, bM as storeToRefs, aK as openBlock, aS as createBlock, aM as withCtx, aO as createBaseVNode, b0 as toDisplayString, j as createVNode, a1 as unref, a$ as createTextVNode, aT as createCommentVNode, c as computed } from './vue-vendor-Byo5TD6r.js';
import { o as Space, B as Button, A as Alert } from './tdesign-CfL1pweZ.js';

let mammothPromise = null;
function loadMammoth() {
  if (!mammothPromise) {
    mammothPromise = __vitePreload(() => import('./mammoth-qyhJBxxk.js').then(n => n.i),true?__vite__mapDeps([0,1]):void 0,import.meta.url);
  }
  return mammothPromise;
}

const _hoisted_1 = { class: "barInner f ac jb" };
const _hoisted_2 = { class: "hint" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    variant: { default: "auto" }
  },
  setup(__props) {
    const props = __props;
    const { project } = storeToRefs(projectStore());
    const { goAdaptation, goOriginal, goExternalRevision } = useAdaptationNav();
    const isNovel = computed(() => project.value?.projectType === "novel");
    const showAdapt = computed(() => {
      if (props.variant === "script") return false;
      if (props.variant === "novel") return true;
      return isNovel.value;
    });
    const showOriginal = computed(() => true);
    const hintText = computed(() => {
      if (props.variant === "script" || !isNovel.value && props.variant === "auto") {
        return $t("workbench.adaptationFlow.hintScript");
      }
      return $t("workbench.adaptationFlow.hintNovel");
    });
    return (_ctx, _cache) => {
      const _component_t_button = Button;
      const _component_t_space = Space;
      const _component_t_alert = Alert;
      return openBlock(), createBlock(_component_t_alert, {
        theme: "info",
        close: false,
        class: "adaptationFlowBar"
      }, {
        message: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("span", _hoisted_2, toDisplayString(hintText.value), 1),
            createVNode(_component_t_space, { size: "small" }, {
              default: withCtx(() => [
                showAdapt.value ? (openBlock(), createBlock(_component_t_button, {
                  key: 0,
                  size: "small",
                  theme: "primary",
                  onClick: unref(goAdaptation)
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.adaptationFlow.startAdapt")), 1)
                  ]),
                  _: 1
                }, 8, ["onClick"])) : createCommentVNode("", true),
                showOriginal.value ? (openBlock(), createBlock(_component_t_button, {
                  key: 1,
                  size: "small",
                  variant: "outline",
                  onClick: unref(goOriginal)
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.adaptationFlow.originalScript")), 1)
                  ]),
                  _: 1
                }, 8, ["onClick"])) : createCommentVNode("", true),
                createVNode(_component_t_button, {
                  size: "small",
                  variant: "outline",
                  onClick: unref(goExternalRevision)
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.adaptationFlow.externalRevision")), 1)
                  ]),
                  _: 1
                }, 8, ["onClick"])
              ]),
              _: 1
            })
          ])
        ]),
        _: 1
      });
    };
  }
});

/* unplugin-vue-components disabled */

const adaptationFlowBar = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7e19648b"]]);

export { adaptationFlowBar as a, loadMammoth as l };

const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./monaco-DgXSjkVc.js","./markdown-S9HtUHKW.js","./vue-vendor-Cj7sXJnb.js","./dayjs-CuToSpIM.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-S9HtUHKW.js';
import { L as Loading } from './tdesign-C157N6jJ.js';
import { l as defineComponent, o as onMounted, a1 as unref, aK as openBlock, aS as createBlock, bF as normalizeProps, m as mergeProps, a_ as resolveDynamicComponent, aL as createElementBlock, j as createVNode, aj as shallowRef } from './vue-vendor-Cj7sXJnb.js';
import { _ as _export_sfc } from './index-BvNjvLGR.js';

const _hoisted_1 = {
  key: 1,
  class: "async-monaco-loading"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ inheritAttrs: false },
  __name: "AsyncMonacoEditor",
  setup(__props) {
    const MonacoEditor = shallowRef(null);
    onMounted(async () => {
      const mod = await __vitePreload(() => import('./monaco-DgXSjkVc.js'),true?__vite__mapDeps([0,1,2,3]):void 0,import.meta.url);
      MonacoEditor.value = mod.default;
    });
    return (_ctx, _cache) => {
      const _component_t_loading = Loading;
      return unref(MonacoEditor) ? (openBlock(), createBlock(resolveDynamicComponent(unref(MonacoEditor)), normalizeProps(mergeProps({ key: 0 }, _ctx.$attrs)), null, 16)) : (openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_t_loading, {
          loading: true,
          size: "small"
        })
      ]));
    };
  }
});

/* unplugin-vue-components disabled */

const AsyncMonacoEditor = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d3b8450f"]]);

export { AsyncMonacoEditor as A };

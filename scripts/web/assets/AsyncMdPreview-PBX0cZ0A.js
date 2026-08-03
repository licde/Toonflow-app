const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./markdown-CDQfeHxT.js","./vue-vendor-Byo5TD6r.js","./dayjs-CuToSpIM.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-CDQfeHxT.js';
import { L as Loading } from './tdesign-CfL1pweZ.js';
import { l as defineComponent, o as onMounted, a1 as unref, aK as openBlock, aS as createBlock, a_ as resolveDynamicComponent, bF as normalizeProps, m as mergeProps, aL as createElementBlock, j as createVNode, aj as shallowRef } from './vue-vendor-Byo5TD6r.js';
import { _ as _export_sfc } from './index-Dj17DntQ.js';

const _hoisted_1 = {
  key: 1,
  class: "async-md-preview-loading"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{ inheritAttrs: false },
  __name: "AsyncMdPreview",
  setup(__props) {
    const Preview = shallowRef(null);
    onMounted(async () => {
      const { MdPreview } = await __vitePreload(async () => { const { MdPreview } = await import('./markdown-CDQfeHxT.js').then(n => n.i);return { MdPreview }},true?__vite__mapDeps([0,1,2]):void 0,import.meta.url);
      Preview.value = MdPreview;
    });
    return (_ctx, _cache) => {
      const _component_t_loading = Loading;
      return unref(Preview) ? (openBlock(), createBlock(resolveDynamicComponent(unref(Preview)), normalizeProps(mergeProps({ key: 0 }, _ctx.$attrs)), null, 16)) : (openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_t_loading, {
          loading: true,
          size: "small"
        })
      ]));
    };
  }
});

/* unplugin-vue-components disabled */

const AsyncMdPreview = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-49f57787"]]);

export { AsyncMdPreview as A };

import { l as defineComponent, aL as createElementBlock, aO as createBaseVNode, j as createVNode, aM as withCtx, aQ as normalizeStyle, a1 as unref, c as computed, a$ as createTextVNode, bR as useRouter, aK as openBlock } from './vue-vendor-Byo5TD6r.js';
import { B as Button } from './tdesign-CfL1pweZ.js';
import { _ as _export_sfc } from './index-BPofKOpG.js';
import './dayjs-CuToSpIM.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "404",
  setup(__props) {
    const router = useRouter();
    function goHome() {
      router.push("/");
    }
    const isElectron = computed(() => {
      return window?.$electron;
    });
    return (_ctx, _cache) => {
      const _component_t_button = Button;
      return openBlock(), createElementBlock("div", {
        class: "notFound",
        style: normalizeStyle({ height: unref(isElectron) ? "calc(100vh - 32px)" : "100vh" })
      }, [
        _cache[1] || (_cache[1] = createBaseVNode("span", { class: "title" }, "404", -1)),
        _cache[2] || (_cache[2] = createBaseVNode("div", { class: "notFoundText" }, "页面不存在", -1)),
        createVNode(_component_t_button, {
          class: "notFoundBtn",
          theme: "primary",
          onClick: goHome
        }, {
          default: withCtx(() => [..._cache[0] || (_cache[0] = [
            createTextVNode("返回首页", -1)
          ])]),
          _: 1
        })
      ], 4);
    };
  }
});

/* unplugin-vue-components disabled */

const _404 = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-83212929"]]);

export { _404 as default };

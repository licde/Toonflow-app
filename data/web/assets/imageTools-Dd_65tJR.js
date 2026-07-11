import { l as defineComponent, aK as openBlock, aL as createElementBlock, aQ as normalizeStyle, a1 as unref, j as createVNode, aM as withCtx, bH as withModifiers, av as isRef, c as computed, r as ref, b2 as resolveComponent } from './vue-vendor-Byo5TD6r.js';
import { n as Tooltip, B as Button, G as ImageViewer } from './tdesign-CfL1pweZ.js';
import { _ as _export_sfc } from './index-BPofKOpG.js';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "imageTools",
  props: {
    src: {},
    placement: { default: "bottom" },
    position: { default: "none" },
    margin: { default: "4px" },
    size: { default: 100 }
  },
  setup(__props) {
    const props = __props;
    const placement = computed(() => props.placement);
    const bigSrc = computed(() => {
      return `${props.src.split("?") ? props.src.split("?")[0] : props.src}`;
    });
    const positionStyle = computed(() => {
      const map = {
        br: { position: "absolute", bottom: props.margin, right: props.margin },
        bl: { position: "absolute", bottom: props.margin, left: props.margin },
        tr: { position: "absolute", top: props.margin, right: props.margin },
        tl: { position: "absolute", top: props.margin, left: props.margin },
        none: { margin: props.margin }
      };
      return map[props.position];
    });
    const previewVisible = ref(false);
    function handlePreview() {
      previewVisible.value = true;
    }
    function triggerAnchorClick(href, filename, newTab = false) {
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      if (newTab) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    async function handleCopy() {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = props.src;
        await new Promise(function(resolve, reject) {
          img.onload = function() {
            resolve();
          };
          img.onerror = function() {
            reject(new Error($t("components.imageTools.msg.imageLoadFailed")));
          };
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise(function(resolve, reject) {
          canvas.toBlob(function(b) {
            if (b) {
              resolve(b);
              return;
            }
            reject(new Error($t("components.imageTools.msg.convertFailed")));
          }, "image/png");
        });
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        window.$message.success($t("components.imageTools.msg.copied"));
      } catch {
        window.$message.error($t("components.imageTools.msg.copyFailed"));
      }
    }
    async function handleDownload() {
      const url = bigSrc.value;
      const filename = url.split("/").pop()?.split("?")[0] || "image";
      let objectUrl = "";
      try {
        const response = await fetch(url, { mode: "cors" });
        if (!response.ok) throw new Error($t("components.imageTools.msg.downloadFailed"));
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        triggerAnchorClick(objectUrl, filename);
        window.$message.success($t("components.imageTools.msg.downloadStarted"));
      } catch {
        triggerAnchorClick(url, filename, true);
        window.$message.warning($t("components.imageTools.msg.downloadBlockedOpenNewWindow"));
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    }
    return (_ctx, _cache) => {
      const _component_i_copy = resolveComponent("i-copy");
      const _component_t_button = Button;
      const _component_t_tooltip = Tooltip;
      const _component_i_expand_text_input = resolveComponent("i-expand-text-input");
      const _component_t_image_viewer = ImageViewer;
      const _component_i_download = resolveComponent("i-download");
      return openBlock(), createElementBlock("div", {
        class: "imageTools",
        style: normalizeStyle(unref(positionStyle))
      }, [
        createVNode(_component_t_tooltip, {
          theme: "primary",
          content: _ctx.$t("components.imageTools.copy"),
          placement: unref(placement)
        }, {
          default: withCtx(() => [
            createVNode(_component_t_button, {
              variant: "outline",
              size: "small",
              shape: "square",
              onClick: withModifiers(handleCopy, ["stop"])
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_copy, { size: "16" })
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["content", "placement"]),
        createVNode(_component_t_tooltip, {
          theme: "primary",
          content: _ctx.$t("components.imageTools.preview"),
          placement: unref(placement)
        }, {
          default: withCtx(() => [
            createVNode(_component_t_image_viewer, {
              visible: unref(previewVisible),
              "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isRef(previewVisible) ? previewVisible.value = $event : null),
              images: [unref(bigSrc)]
            }, {
              trigger: withCtx(() => [
                createVNode(_component_t_button, {
                  variant: "outline",
                  size: "small",
                  shape: "square",
                  onClick: withModifiers(handlePreview, ["stop"])
                }, {
                  icon: withCtx(() => [
                    createVNode(_component_i_expand_text_input, { size: "16" })
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }, 8, ["visible", "images"])
          ]),
          _: 1
        }, 8, ["content", "placement"]),
        createVNode(_component_t_tooltip, {
          theme: "primary",
          content: _ctx.$t("components.imageTools.download"),
          placement: unref(placement)
        }, {
          default: withCtx(() => [
            createVNode(_component_t_button, {
              variant: "outline",
              size: "small",
              shape: "square",
              onClick: withModifiers(handleDownload, ["stop"])
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_download, { size: "16" })
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["content", "placement"])
      ], 4);
    };
  }
});

/* unplugin-vue-components disabled */

const __unplugin_components_0 = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-9fbcb1c5"]]);

export { __unplugin_components_0 as _ };

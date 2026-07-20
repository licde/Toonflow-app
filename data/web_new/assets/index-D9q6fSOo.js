const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./webav-B6CGWgg2.js","./dayjs-CuToSpIM.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-CDQfeHxT.js';
import { c as ca, d as da, N as Ne, H as Ht, t as ti, _ as _r, u as ua, a as ct, F as Fo } from './clip-track-CyE6Hnlt.js';
import { L as Loading, a5 as Popup, B as Button, a8 as Image$1, X as Tag, R as Input, ac as InputNumber, am as Slider, K as Select, O as Option, T as Textarea, W as DialogPlugin } from './tdesign-CfL1pweZ.js';
import { l as defineComponent, r as ref, w as watch, o as onMounted, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, b0 as toDisplayString, F as Fragment, aP as renderList, aS as createBlock, aM as withCtx, a$ as createTextVNode, a_ as resolveDynamicComponent, a1 as unref, j as createVNode, aT as createCommentVNode, k as reactive, b as onUnmounted, c as computed, p as provide, aQ as normalizeStyle } from './vue-vendor-Byo5TD6r.js';
import { _ as _export_sfc } from './index-CYEzD5Ot.js';
import { S as St, I, d as dt, A, R, y as ye } from './webav-B6CGWgg2.js';
import { g as ge, P as Pe } from './splitpanes-BtsLJCt3.js';
import './dayjs-CuToSpIM.js';
import './i18n-C05S5xzz.js';

let setupPromise = null;
function setupWebavLog() {
  if (!setupPromise) {
    setupPromise = __vitePreload(async () => { const {Log} = await import('./webav-B6CGWgg2.js').then(n => n.a);return { Log }},true?__vite__mapDeps([0,1]):void 0,import.meta.url).then(({ Log }) => {
      Log.setLogLevel(Log.warn);
    });
  }
  return setupPromise;
}

function getTextItems() {
  return [
    { id: "text-1", type: "subtitle", name: $t("workbench.production.media.titleText"), preview: "Aa", duration: 3 },
    {
      id: "text-2",
      type: "subtitle",
      name: $t("workbench.production.media.subtitleText"),
      preview: $t("workbench.production.media.subtitlePreview"),
      duration: 3
    },
    { id: "text-3", type: "text", name: $t("workbench.production.media.customText"), preview: "Text", duration: 3 }
  ];
}
function getTransitionItems() {
  return [
    { id: "trans-1", type: "transition", subType: "fade", name: $t("workbench.production.transition.fade"), icon: "i-round" },
    { id: "trans-2", type: "transition", subType: "slide", name: $t("workbench.production.transition.slide"), icon: "i-right" },
    { id: "trans-3", type: "transition", subType: "wipe", name: $t("workbench.production.transition.wipe"), icon: "i-erase" },
    { id: "trans-4", type: "transition", subType: "dissolve", name: $t("workbench.production.transition.dissolve"), icon: "i-platte" },
    { id: "trans-5", type: "transition", subType: "zoom", name: $t("workbench.production.transition.zoom"), icon: "i-zoom-in" },
    { id: "trans-6", type: "transition", subType: "rotate", name: $t("workbench.production.transition.rotate"), icon: "i-redo" }
  ];
}
function getEffectItems() {
  return [
    { id: "fadeIn", type: "effect", effectType: "fadeIn", name: $t("workbench.production.effect.fadeIn"), icon: "i-sun-one" },
    { id: "fadeOut", type: "effect", effectType: "fadeOut", name: $t("workbench.production.effect.fadeOut"), icon: "i-moon" },
    { id: "flash", type: "effect", effectType: "flash", name: $t("workbench.production.effect.flash"), icon: "i-flashlamp" },
    { id: "shake", type: "effect", effectType: "shake", name: $t("workbench.production.effect.shake"), icon: "i-shake" },
    { id: "zoomIn", type: "effect", effectType: "zoomIn", name: $t("workbench.production.effect.zoomIn"), icon: "i-zoom-in" },
    { id: "zoomOut", type: "effect", effectType: "zoomOut", name: $t("workbench.production.effect.zoomOut"), icon: "i-zoom-out" },
    { id: "pulse", type: "effect", effectType: "pulse", name: $t("workbench.production.effect.pulse"), icon: "i-heartbeat" },
    { id: "rotateIn", type: "effect", effectType: "rotateIn", name: $t("workbench.production.effect.rotateIn"), icon: "i-redo" },
    { id: "sticker-1", type: "sticker", name: $t("workbench.production.effect.sticker1"), icon: "i-emotion-happy" },
    { id: "sticker-2", type: "sticker", name: $t("workbench.production.effect.sticker2"), icon: "i-star" }
  ];
}
function getFilterItems() {
  return [
    {
      id: "grayscale",
      type: "filter",
      filterType: "grayscale",
      filterValue: 1,
      name: $t("workbench.production.filter.grayscale"),
      icon: "i-dark-mode"
    },
    { id: "sepia", type: "filter", filterType: "sepia", filterValue: 1, name: $t("workbench.production.filter.sepia"), icon: "i-camera-one" },
    { id: "warm", type: "filter", filterType: "sepia", filterValue: 0.3, name: $t("workbench.production.filter.warm"), icon: "i-fire" },
    { id: "cool", type: "filter", filterType: "hue-rotate", filterValue: 180, name: $t("workbench.production.filter.cool"), icon: "i-snowflake" },
    { id: "saturate", type: "filter", filterType: "saturate", filterValue: 2, name: $t("workbench.production.filter.vivid"), icon: "i-brightness" },
    {
      id: "brightness",
      type: "filter",
      filterType: "brightness",
      filterValue: 1.3,
      name: $t("workbench.production.filter.bright"),
      icon: "i-sun-one"
    },
    {
      id: "contrast",
      type: "filter",
      filterType: "contrast",
      filterValue: 1.5,
      name: $t("workbench.production.filter.highContrast"),
      icon: "i-contrast-view"
    },
    { id: "blur", type: "filter", filterType: "blur", filterValue: 3, name: $t("workbench.production.filter.blur"), icon: "i-fog" },
    {
      id: "invert",
      type: "filter",
      filterType: "invert",
      filterValue: 1,
      name: $t("workbench.production.filter.invert"),
      icon: "i-reverse-rotation"
    },
    {
      id: "opacity",
      type: "filter",
      filterType: "opacity",
      filterValue: 0.5,
      name: $t("workbench.production.filter.semiTransparent"),
      icon: "i-ghost"
    }
  ];
}
function getLibraryTabs() {
  return [
    { id: "video", label: $t("workbench.production.media.video"), icon: "i-video-file" },
    { id: "media", label: $t("workbench.production.media.media"), icon: "i-video" },
    { id: "image", label: $t("workbench.production.media.image"), icon: "i-pic" },
    { id: "audio", label: $t("workbench.production.media.audio"), icon: "i-music" },
    { id: "text", label: $t("workbench.production.media.subtitle"), icon: "i-text" },
    { id: "transition", label: $t("workbench.production.media.transition"), icon: "i-switch-themes" },
    { id: "effect", label: $t("workbench.production.media.effect"), icon: "i-magic" },
    { id: "filter", label: $t("workbench.production.media.filter"), icon: "i-color-filter" }
  ];
}
function formatDuration(seconds) {
  if (seconds === 0) return $t("workbench.production.media.loading");
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return `${secs.toFixed(1)}s`;
}

const _hoisted_1$3 = { class: "mediaLibrary" };
const _hoisted_2$2 = { class: "mediaLibraryHeader" };
const _hoisted_3$2 = { class: "headerTitle jb ac" };
const _hoisted_4$2 = { class: "mediaLibraryTitle" };
const _hoisted_5$2 = { class: "mediaLibraryTabs" };
const _hoisted_6$2 = { class: "mediaLibraryContent" };
const _hoisted_7$2 = {
  key: 0,
  class: "mediaList"
};
const _hoisted_8$2 = ["onDragstart"];
const _hoisted_9$2 = { class: "mediaItemPreview" };
const _hoisted_10$1 = {
  key: 2,
  class: "mediaItemLoading"
};
const _hoisted_11$1 = { class: "mediaItemInfo" };
const _hoisted_12$1 = {
  key: 0,
  class: "selected"
};
const _hoisted_13$1 = { class: "mediaItemName" };
const _hoisted_14$1 = {
  key: 1,
  class: "mediaList"
};
const _hoisted_15$1 = ["onDragstart"];
const _hoisted_16$1 = { class: "mediaItemPreview" };
const _hoisted_17$1 = {
  key: 2,
  class: "mediaItemLoading"
};
const _hoisted_18$1 = { class: "mediaItemInfo" };
const _hoisted_19$1 = { class: "mediaItemName" };
const _hoisted_20$1 = {
  key: 2,
  class: "mediaList"
};
const _hoisted_21$1 = ["onDragstart"];
const _hoisted_22$1 = { class: "mediaItemPreview" };
const _hoisted_23$1 = {
  key: 2,
  class: "mediaItemLoading"
};
const _hoisted_24$1 = { class: "mediaItemInfo" };
const _hoisted_25$1 = { class: "mediaItemName" };
const _hoisted_26$1 = {
  key: 3,
  class: "transitionList"
};
const _hoisted_27$1 = ["onDragstart"];
const _hoisted_28$1 = { class: "transitionItemPreview" };
const _hoisted_29$1 = { class: "transitionItemIcon" };
const _hoisted_30$1 = { class: "transitionItemName" };
const _hoisted_31$1 = {
  key: 4,
  class: "effectList"
};
const _hoisted_32$1 = ["onDragstart"];
const _hoisted_33$1 = { class: "effectItemPreview" };
const _hoisted_34$1 = { class: "effectItemName" };
const _hoisted_35$1 = {
  key: 5,
  class: "filterList"
};
const _hoisted_36$1 = ["onDragstart"];
const _hoisted_37$1 = { class: "filterItemPreview" };
const _hoisted_38$1 = { class: "filterItemName" };
const _hoisted_39$1 = {
  key: 6,
  class: "audioList"
};
const _hoisted_40$1 = ["onDragstart"];
const _hoisted_41$1 = { class: "audioItemPreview" };
const _hoisted_42$1 = {
  key: 0,
  class: "mediaItemLoading"
};
const _hoisted_43$1 = { class: "audioItemInfo" };
const _hoisted_44$1 = { class: "audioItemName" };
const _hoisted_45$1 = {
  key: 7,
  class: "textList"
};
const _hoisted_46$1 = ["onDragstart"];
const _hoisted_47$1 = { class: "textItemPreview" };
const _hoisted_48$1 = { class: "textItemContent" };
const _hoisted_49$1 = { class: "textItemName" };
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "mediaLibrary",
  props: {
    initialVideoItems: { default: () => [] },
    initialMediaItems: { default: () => [] },
    initialAudioItems: { default: () => [] },
    initialImageItems: { default: () => [] }
  },
  setup(__props) {
    const props = __props;
    const activeTab = ref("video");
    const tabs = getLibraryTabs();
    const videoItems = ref([...props.initialVideoItems]);
    const mediaItems = ref([...props.initialMediaItems]);
    const audioItems = ref([...props.initialAudioItems]);
    const imageItems = ref([...props.initialImageItems]);
    const textItems = ref(getTextItems());
    watch(
      () => props.initialVideoItems,
      (newItems) => {
        videoItems.value = [...newItems];
        if (newItems.length > 0) {
          loadVideoThumbnails();
        }
      }
    );
    watch(
      () => props.initialMediaItems,
      (newItems) => {
        mediaItems.value = [...newItems];
        if (newItems.length > 0) {
          loadVideoThumbnails();
        }
      }
    );
    watch(
      () => props.initialAudioItems,
      (newItems) => {
        audioItems.value = [...newItems];
        if (newItems.length > 0) {
          loadAudioWaveforms();
        }
      }
    );
    watch(
      () => props.initialImageItems,
      (newItems) => {
        imageItems.value = [...newItems];
        if (newItems.length > 0) {
          loadImageThumbnails();
        }
      }
    );
    const transitionItems = ref(getTransitionItems());
    const effectItems = ref(getEffectItems());
    const filterItems = ref(getFilterItems());
    async function loadVideoThumbnails() {
      for (const item of mediaItems.value) {
        try {
          const result = await ca(item.url, { count: 10, width: 120 });
          item.duration = result.duration;
          item.thumbnails = result.thumbnails;
          item.thumbnail = result.thumbnails[0] || "";
          item.loading = false;
        } catch (error) {
          console.error(`Failed to load thumbnails for ${item.name}:`, error);
          item.loading = false;
          item.duration = 5;
        }
      }
      for (const item of videoItems.value) {
        try {
          const result = await ca(item.url, { count: 10, width: 120 });
          item.duration = result.duration;
          item.thumbnails = result.thumbnails;
          item.thumbnail = result.thumbnails[0] || "";
          item.loading = false;
        } catch (error) {
          console.error(`Failed to load thumbnails for ${item.name}:`, error);
          item.loading = false;
          item.duration = 5;
        }
      }
    }
    async function loadImageThumbnails() {
      for (const item of imageItems.value) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = () => {
              item.thumbnail = item.url;
              item.loading = false;
              resolve();
            };
            img.onerror = reject;
            img.src = item.url;
          });
        } catch (error) {
          console.error(`Failed to load image ${item.name}:`, error);
          item.loading = false;
        }
      }
    }
    async function loadAudioWaveforms() {
      for (const item of audioItems.value) {
        try {
          const result = await da(item.url, { samples: 50 });
          item.duration = result.duration;
          item.waveformData = result.waveformData;
          item.loading = false;
        } catch (error) {
          console.error(`Failed to load waveform for ${item.name}:`, error);
          item.loading = false;
          item.duration = 30;
        }
      }
    }
    function handleDragStart(event, item) {
      if (!event.dataTransfer) return;
      const dragData = {
        ...item,
        sourceUrl: item.url || item.id
      };
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("application/json", JSON.stringify(dragData));
      event.dataTransfer.setData("text/plain", item.name);
      if (event.target instanceof HTMLElement) {
        event.target.classList.add("dragging");
      }
    }
    function handleDragEnd(event) {
      if (event.target instanceof HTMLElement) {
        event.target.classList.remove("dragging");
      }
    }
    onMounted(() => {
      setTimeout(() => {
        loadVideoThumbnails();
        loadAudioWaveforms();
        loadImageThumbnails();
      }, 100);
    });
    return (_ctx, _cache) => {
      const _component_t_button = Button;
      const _component_t_image = Image$1;
      const _component_t_loading = Loading;
      const _component_i_check_one = resolveComponent("i-check-one");
      const _component_t_popup = Popup;
      const _component_t_tag = Tag;
      const _component_i_music = resolveComponent("i-music");
      return openBlock(), createElementBlock("div", _hoisted_1$3, [
        createBaseVNode("div", _hoisted_2$2, [
          createBaseVNode("div", _hoisted_3$2, [
            createBaseVNode("h3", _hoisted_4$2, toDisplayString(_ctx.$t("workbench.production.editVideo.clipMaterials")), 1),
            _cache[0] || (_cache[0] = createBaseVNode("span", { style: { "font-size": "12px" } }, "视频素材名字按照分镜台组#号数字命名", -1))
          ]),
          createBaseVNode("div", _hoisted_5$2, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(tabs), (tab) => {
              return openBlock(), createBlock(_component_t_button, {
                key: tab.id,
                theme: unref(activeTab) === tab.id ? "primary" : "default",
                variant: unref(activeTab) === tab.id ? "base" : "text",
                size: "small",
                onClick: ($event) => activeTab.value = tab.id
              }, {
                icon: withCtx(() => [
                  (openBlock(), createBlock(resolveDynamicComponent(tab.icon), {
                    theme: "outline",
                    size: "18",
                    style: { "margin-right": "4px" }
                  }))
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(tab.label), 1)
                ]),
                _: 2
              }, 1032, ["theme", "variant", "onClick"]);
            }), 128))
          ])
        ]),
        createBaseVNode("div", _hoisted_6$2, [
          unref(activeTab) === "video" ? (openBlock(), createElementBlock("div", _hoisted_7$2, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(videoItems), (item) => {
              return openBlock(), createElementBlock("div", {
                key: item.id,
                class: "mediaItem",
                draggable: "true",
                onDragstart: ($event) => handleDragStart($event, item),
                onDragend: handleDragEnd
              }, [
                createBaseVNode("div", _hoisted_9$2, [
                  item.thumbnail ? (openBlock(), createBlock(_component_t_image, {
                    key: 0,
                    src: item.thumbnail,
                    fit: "cover",
                    class: "mediaItemThumbnail"
                  }, null, 8, ["src"])) : (openBlock(), createBlock(resolveDynamicComponent(item.icon), {
                    key: 1,
                    theme: "outline",
                    size: "18"
                  })),
                  item.loading ? (openBlock(), createElementBlock("div", _hoisted_10$1, [
                    createVNode(_component_t_loading, { size: "small" })
                  ])) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_11$1, [
                  item.selected ? (openBlock(), createElementBlock("div", _hoisted_12$1, [
                    createVNode(_component_i_check_one, {
                      theme: "filled",
                      size: "16",
                      fill: "#000000"
                    })
                  ])) : createCommentVNode("", true),
                  createBaseVNode("div", _hoisted_13$1, [
                    createVNode(_component_t_popup, {
                      content: item.name
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(item.name), 1)
                      ]),
                      _: 2
                    }, 1032, ["content"])
                  ]),
                  item.duration ? (openBlock(), createBlock(_component_t_tag, {
                    key: 1,
                    size: "small",
                    theme: "default",
                    variant: "light"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(unref(formatDuration)(item.duration)), 1)
                    ]),
                    _: 2
                  }, 1024)) : createCommentVNode("", true)
                ])
              ], 40, _hoisted_8$2);
            }), 128))
          ])) : createCommentVNode("", true),
          unref(activeTab) === "media" ? (openBlock(), createElementBlock("div", _hoisted_14$1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(mediaItems), (item) => {
              return openBlock(), createElementBlock("div", {
                key: item.id,
                class: "mediaItem",
                draggable: "true",
                onDragstart: ($event) => handleDragStart($event, item),
                onDragend: handleDragEnd
              }, [
                createBaseVNode("div", _hoisted_16$1, [
                  item.thumbnail ? (openBlock(), createBlock(_component_t_image, {
                    key: 0,
                    src: item.thumbnail,
                    fit: "cover",
                    class: "mediaItemThumbnail"
                  }, null, 8, ["src"])) : (openBlock(), createBlock(resolveDynamicComponent(item.icon), {
                    key: 1,
                    theme: "outline",
                    size: "18"
                  })),
                  item.loading ? (openBlock(), createElementBlock("div", _hoisted_17$1, [
                    createVNode(_component_t_loading, { size: "small" })
                  ])) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_18$1, [
                  createBaseVNode("div", _hoisted_19$1, [
                    createVNode(_component_t_popup, {
                      content: item.name
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(item.name), 1)
                      ]),
                      _: 2
                    }, 1032, ["content"])
                  ]),
                  item.duration ? (openBlock(), createBlock(_component_t_tag, {
                    key: 0,
                    size: "small",
                    theme: "default",
                    variant: "light"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(unref(formatDuration)(item.duration)), 1)
                    ]),
                    _: 2
                  }, 1024)) : createCommentVNode("", true)
                ])
              ], 40, _hoisted_15$1);
            }), 128))
          ])) : createCommentVNode("", true),
          unref(activeTab) === "image" ? (openBlock(), createElementBlock("div", _hoisted_20$1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(imageItems), (item) => {
              return openBlock(), createElementBlock("div", {
                key: item.id,
                class: "mediaItem",
                draggable: "true",
                onDragstart: ($event) => handleDragStart($event, item),
                onDragend: handleDragEnd
              }, [
                createBaseVNode("div", _hoisted_22$1, [
                  item.thumbnail ? (openBlock(), createBlock(_component_t_image, {
                    key: 0,
                    src: item.thumbnail,
                    fit: "cover",
                    class: "mediaItemThumbnail"
                  }, null, 8, ["src"])) : (openBlock(), createBlock(resolveDynamicComponent(item.icon), {
                    key: 1,
                    theme: "outline",
                    size: "18"
                  })),
                  item.loading ? (openBlock(), createElementBlock("div", _hoisted_23$1, [
                    createVNode(_component_t_loading, { size: "small" })
                  ])) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_24$1, [
                  createBaseVNode("div", _hoisted_25$1, [
                    createVNode(_component_t_popup, {
                      content: item.name
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(item.name), 1)
                      ]),
                      _: 2
                    }, 1032, ["content"])
                  ])
                ])
              ], 40, _hoisted_21$1);
            }), 128))
          ])) : createCommentVNode("", true),
          unref(activeTab) === "transition" ? (openBlock(), createElementBlock("div", _hoisted_26$1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(transitionItems), (transition) => {
              return openBlock(), createElementBlock("div", {
                key: transition.id,
                class: "transitionItem",
                draggable: "true",
                onDragstart: ($event) => handleDragStart($event, transition),
                onDragend: handleDragEnd
              }, [
                createBaseVNode("div", _hoisted_28$1, [
                  createBaseVNode("span", _hoisted_29$1, [
                    (openBlock(), createBlock(resolveDynamicComponent(transition.icon), {
                      theme: "outline",
                      size: "18"
                    }))
                  ])
                ]),
                createBaseVNode("div", _hoisted_30$1, [
                  createVNode(_component_t_popup, {
                    content: transition.name
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(transition.name), 1)
                    ]),
                    _: 2
                  }, 1032, ["content"])
                ])
              ], 40, _hoisted_27$1);
            }), 128))
          ])) : createCommentVNode("", true),
          unref(activeTab) === "effect" ? (openBlock(), createElementBlock("div", _hoisted_31$1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(effectItems), (effect) => {
              return openBlock(), createElementBlock("div", {
                key: effect.id,
                class: "effectItem",
                draggable: "true",
                onDragstart: ($event) => handleDragStart($event, effect),
                onDragend: handleDragEnd
              }, [
                createBaseVNode("div", _hoisted_33$1, [
                  (openBlock(), createBlock(resolveDynamicComponent(effect.icon), {
                    theme: "outline",
                    size: "18"
                  }))
                ]),
                createBaseVNode("div", _hoisted_34$1, [
                  createVNode(_component_t_popup, {
                    content: effect.name
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(effect.name), 1)
                    ]),
                    _: 2
                  }, 1032, ["content"])
                ])
              ], 40, _hoisted_32$1);
            }), 128))
          ])) : createCommentVNode("", true),
          unref(activeTab) === "filter" ? (openBlock(), createElementBlock("div", _hoisted_35$1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(filterItems), (filter) => {
              return openBlock(), createElementBlock("div", {
                key: filter.id,
                class: "filterItem",
                draggable: "true",
                onDragstart: ($event) => handleDragStart($event, filter),
                onDragend: handleDragEnd
              }, [
                createBaseVNode("div", _hoisted_37$1, [
                  (openBlock(), createBlock(resolveDynamicComponent(filter.icon), {
                    theme: "outline",
                    size: "18"
                  }))
                ]),
                createBaseVNode("div", _hoisted_38$1, [
                  createVNode(_component_t_popup, {
                    content: filter.name
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(filter.name), 1)
                    ]),
                    _: 2
                  }, 1032, ["content"])
                ])
              ], 40, _hoisted_36$1);
            }), 128))
          ])) : createCommentVNode("", true),
          unref(activeTab) === "audio" ? (openBlock(), createElementBlock("div", _hoisted_39$1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(audioItems), (audio) => {
              return openBlock(), createElementBlock("div", {
                key: audio.id,
                class: "audioItem",
                draggable: "true",
                onDragstart: ($event) => handleDragStart($event, audio),
                onDragend: handleDragEnd
              }, [
                createBaseVNode("div", _hoisted_41$1, [
                  createVNode(_component_i_music, {
                    theme: "outline",
                    size: "18"
                  }),
                  audio.loading ? (openBlock(), createElementBlock("div", _hoisted_42$1, [
                    createVNode(_component_t_loading, { size: "small" })
                  ])) : createCommentVNode("", true)
                ]),
                createBaseVNode("div", _hoisted_43$1, [
                  createBaseVNode("div", _hoisted_44$1, [
                    createVNode(_component_t_popup, {
                      content: audio.name
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(audio.name), 1)
                      ]),
                      _: 2
                    }, 1032, ["content"])
                  ]),
                  audio.duration ? (openBlock(), createBlock(_component_t_tag, {
                    key: 0,
                    size: "small",
                    theme: "default",
                    variant: "light"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(unref(formatDuration)(audio.duration)), 1)
                    ]),
                    _: 2
                  }, 1024)) : createCommentVNode("", true)
                ])
              ], 40, _hoisted_40$1);
            }), 128))
          ])) : createCommentVNode("", true),
          unref(activeTab) === "text" ? (openBlock(), createElementBlock("div", _hoisted_45$1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(textItems), (text) => {
              return openBlock(), createElementBlock("div", {
                key: text.id,
                class: "textItem",
                draggable: "true",
                onDragstart: ($event) => handleDragStart($event, text),
                onDragend: handleDragEnd
              }, [
                createBaseVNode("div", _hoisted_47$1, [
                  createBaseVNode("span", _hoisted_48$1, toDisplayString(text.preview), 1)
                ]),
                createBaseVNode("div", _hoisted_49$1, [
                  createVNode(_component_t_popup, {
                    content: text.name
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(text.name), 1)
                    ]),
                    _: 2
                  }, 1032, ["content"])
                ])
              ], 40, _hoisted_46$1);
            }), 128))
          ])) : createCommentVNode("", true)
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const mediaLibrary = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-ea61ae0d"]]);

const fadeTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    if (frameA) {
      ctx.globalAlpha = 1 - progress;
      ctx.drawImage(frameA, 0, 0, width, height);
    }
    if (frameB) {
      ctx.globalAlpha = progress;
      ctx.drawImage(frameB, 0, 0, width, height);
    }
    ctx.globalAlpha = 1;
  }
};
const dissolveTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }
    if (frameB) {
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = progress;
      ctx.drawImage(frameB, 0, 0, width, height);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
};
const slideLeftTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutCubic(progress);
    const slideX = width * easedProgress;
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, -slideX, 0, width, height);
    }
    if (frameB) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameB, width - slideX, 0, width, height);
    }
  }
};
const slideRightTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutCubic(progress);
    const slideX = width * easedProgress;
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, slideX, 0, width, height);
    }
    if (frameB) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameB, -width + slideX, 0, width, height);
    }
  }
};
const slideUpTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutCubic(progress);
    const slideY = height * easedProgress;
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, -slideY, width, height);
    }
    if (frameB) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameB, 0, height - slideY, width, height);
    }
  }
};
const slideDownTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutCubic(progress);
    const slideY = height * easedProgress;
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, slideY, width, height);
    }
    if (frameB) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameB, 0, -height + slideY, width, height);
    }
  }
};
const wipeLeftTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutQuad(progress);
    const wipeX = width * easedProgress;
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(width - wipeX, 0, wipeX, height);
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  }
};
const wipeRightTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutQuad(progress);
    const wipeX = width * easedProgress;
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, wipeX, height);
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  }
};
const wipeUpTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutQuad(progress);
    const wipeY = height * easedProgress;
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, height - wipeY, width, wipeY);
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  }
};
const wipeDownTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutQuad(progress);
    const wipeY = height * easedProgress;
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, wipeY);
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  }
};
const zoomInTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutCubic(progress);
    if (frameA) {
      ctx.globalAlpha = 1 - easedProgress * 0.5;
      ctx.drawImage(frameA, 0, 0, width, height);
    }
    if (frameB) {
      const scale = easedProgress;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      const offsetX = (width - scaledWidth) / 2;
      const offsetY = (height - scaledHeight) / 2;
      ctx.globalAlpha = easedProgress;
      ctx.drawImage(frameB, offsetX, offsetY, scaledWidth, scaledHeight);
    }
    ctx.globalAlpha = 1;
  }
};
const zoomOutTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutCubic(progress);
    if (frameB) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameB, 0, 0, width, height);
    }
    if (frameA) {
      const scale = 1 - easedProgress;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;
      const offsetX = (width - scaledWidth) / 2;
      const offsetY = (height - scaledHeight) / 2;
      ctx.globalAlpha = 1 - easedProgress;
      ctx.drawImage(frameA, offsetX, offsetY, scaledWidth, scaledHeight);
    }
    ctx.globalAlpha = 1;
  }
};
const rotateTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutCubic(progress);
    const centerX = width / 2;
    const centerY = height / 2;
    if (frameA && progress < 0.5) {
      const angle = easedProgress * Math.PI;
      const scale = 1 - easedProgress * 2;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.scale(Math.max(0.01, scale), Math.max(0.01, scale));
      ctx.translate(-centerX, -centerY);
      ctx.globalAlpha = 1 - easedProgress * 2;
      ctx.drawImage(frameA, 0, 0, width, height);
      ctx.restore();
    }
    if (frameB && progress >= 0.5) {
      const angle = (easedProgress - 0.5) * Math.PI * 2 - Math.PI;
      const scale = (easedProgress - 0.5) * 2;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      ctx.scale(Math.max(0.01, scale), Math.max(0.01, scale));
      ctx.translate(-centerX, -centerY);
      ctx.globalAlpha = (easedProgress - 0.5) * 2;
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
};
const circleTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutQuad(progress);
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    const radius = maxRadius * easedProgress;
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  }
};
const diamondTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeInOutQuad(progress);
    const centerX = width / 2;
    const centerY = height / 2;
    const maxSize = Math.max(width, height);
    const size = maxSize * easedProgress;
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - size);
      ctx.lineTo(centerX + size, centerY);
      ctx.lineTo(centerX, centerY + size);
      ctx.lineTo(centerX - size, centerY);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  }
};
const clockTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const easedProgress = easeLinear(progress);
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY) * 1.5;
    const angle = easedProgress * Math.PI * 2 - Math.PI / 2;
    if (frameA) {
      ctx.globalAlpha = 1;
      ctx.drawImage(frameA, 0, 0, width, height);
    }
    if (frameB) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, -Math.PI / 2, angle, false);
      ctx.lineTo(centerX, centerY);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
  }
};
const blurTransition = {
  render(ctx, frameA, frameB, progress, width, height) {
    ctx.clearRect(0, 0, width, height);
    const maxBlur = 20;
    const blurA = progress * maxBlur;
    const blurB = (1 - progress) * maxBlur;
    if (frameA) {
      ctx.save();
      ctx.filter = `blur(${blurA}px)`;
      ctx.globalAlpha = 1 - progress;
      ctx.drawImage(frameA, 0, 0, width, height);
      ctx.restore();
    }
    if (frameB) {
      ctx.save();
      ctx.filter = `blur(${blurB}px)`;
      ctx.globalAlpha = progress;
      ctx.drawImage(frameB, 0, 0, width, height);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.filter = "none";
  }
};
function easeLinear(t) {
  return t;
}
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
const transitionRenderers = {
  fade: fadeTransition,
  dissolve: dissolveTransition,
  slide: slideLeftTransition,
  // 默认滑动方向
  "slide-left": slideLeftTransition,
  "slide-right": slideRightTransition,
  "slide-up": slideUpTransition,
  "slide-down": slideDownTransition,
  wipe: wipeRightTransition,
  // 默认擦除方向
  "wipe-left": wipeLeftTransition,
  "wipe-right": wipeRightTransition,
  "wipe-up": wipeUpTransition,
  "wipe-down": wipeDownTransition,
  zoom: zoomInTransition,
  // 默认放大
  "zoom-in": zoomInTransition,
  "zoom-out": zoomOutTransition,
  rotate: rotateTransition,
  circle: circleTransition,
  diamond: diamondTransition,
  clock: clockTransition,
  blur: blurTransition
};
function getTransitionRenderer(type) {
  return transitionRenderers[type] || fadeTransition;
}

function getActiveFiltersAtTime(tracks, timeInSeconds) {
  const filters = [];
  for (const track of tracks) {
    if (track.visible === false) continue;
    if (track.type !== "filter") continue;
    for (const clip of track.clips) {
      const filterClip = clip;
      if (filterClip.type === "filter" && timeInSeconds >= filterClip.startTime && timeInSeconds <= filterClip.endTime) {
        filters.push({
          clipId: filterClip.id,
          trackId: filterClip.trackId,
          filterType: filterClip.filterType,
          filterValue: filterClip.filterValue
        });
      }
    }
  }
  return filters;
}
function getActiveEffectsAtTime(tracks, timeInSeconds) {
  const effects = [];
  for (const track of tracks) {
    if (track.visible === false) continue;
    if (track.type !== "effect") continue;
    for (const clip of track.clips) {
      const effectClip = clip;
      if (effectClip.type === "effect" && timeInSeconds >= effectClip.startTime && timeInSeconds <= effectClip.endTime) {
        const effectTotalDuration = effectClip.endTime - effectClip.startTime;
        const elapsedTime = timeInSeconds - effectClip.startTime;
        const progress = Math.min(elapsedTime / effectTotalDuration, 1);
        effects.push({
          clipId: effectClip.id,
          trackId: effectClip.trackId,
          effectType: effectClip.effectType,
          progress
        });
      }
    }
  }
  return effects;
}
function buildCSSFilter(filters) {
  const filterParts = [];
  for (const filter of filters) {
    let value;
    if (typeof filter.filterValue === "number") {
      value = filter.filterValue;
    } else if (typeof filter.filterValue === "object" && filter.filterValue !== null) {
      value = filter.filterValue.value ?? Object.values(filter.filterValue).find((v) => typeof v === "number") ?? 0;
    } else {
      value = 0;
    }
    switch (filter.filterType) {
      case "blur":
        filterParts.push(`blur(${value}px)`);
        break;
      case "brightness":
        filterParts.push(`brightness(${Math.max(0, value)})`);
        break;
      case "contrast":
        filterParts.push(`contrast(${Math.max(0, value)})`);
        break;
      case "saturate":
      case "saturation":
        filterParts.push(`saturate(${Math.max(0, value)})`);
        break;
      case "grayscale":
        filterParts.push(`grayscale(${Math.min(Math.max(0, value), 1)})`);
        break;
      case "sepia":
        filterParts.push(`sepia(${Math.min(Math.max(0, value), 1)})`);
        break;
      case "invert":
        filterParts.push(`invert(${Math.min(Math.max(0, value), 1)})`);
        break;
      case "hue-rotate":
        filterParts.push(`hue-rotate(${value}deg)`);
        break;
      case "opacity":
        filterParts.push(`opacity(${Math.min(Math.max(0, value), 1)})`);
        break;
      case "drop-shadow":
        if (typeof filter.filterValue === "object" && filter.filterValue !== null) {
          const fv = filter.filterValue;
          const offsetX = fv.offsetX ?? 4;
          const offsetY = fv.offsetY ?? 4;
          const blurRadius = fv.blurRadius ?? 2;
          const color = fv.color ?? "black";
          filterParts.push(`drop-shadow(${offsetX}px ${offsetY}px ${blurRadius}px ${color})`);
        }
        break;
      default:
        console.warn(`Unknown filter type: ${filter.filterType}`);
    }
  }
  return filterParts.join(" ");
}
function applyEffectsToFrame(effects, _frame, _time) {
  let opacity = 1;
  let transform = "";
  for (const effect of effects) {
    switch (effect.effectType) {
      case "fadeIn":
        opacity *= effect.progress;
        break;
      case "fadeOut":
        opacity *= 1 - effect.progress;
        break;
      case "flash": {
        const flashFrequency = 4;
        opacity *= 0.5 + 0.5 * Math.sin(effect.progress * Math.PI * 2 * flashFrequency);
        break;
      }
      case "pulse": {
        const pulseScale = 1 + 0.1 * Math.sin(effect.progress * Math.PI * 4);
        transform += ` scale(${pulseScale})`;
        break;
      }
      case "shake": {
        const shakeIntensity = 10;
        const shakeX = Math.sin(effect.progress * Math.PI * 20) * shakeIntensity * (1 - effect.progress);
        const shakeY = Math.cos(effect.progress * Math.PI * 20) * shakeIntensity * (1 - effect.progress);
        transform += ` translate(${shakeX}px, ${shakeY}px)`;
        break;
      }
      case "zoomIn": {
        const zoomInScale = 0.5 + 0.5 * effect.progress;
        opacity *= effect.progress;
        transform += ` scale(${zoomInScale})`;
        break;
      }
      case "zoomOut": {
        const zoomOutScale = 1 + 0.5 * effect.progress;
        opacity *= 1 - effect.progress;
        transform += ` scale(${zoomOutScale})`;
        break;
      }
      case "slideInLeft": {
        const slideLeftX = -100 * (1 - effect.progress);
        transform += ` translateX(${slideLeftX}%)`;
        break;
      }
      case "slideInRight": {
        const slideRightX = 100 * (1 - effect.progress);
        transform += ` translateX(${slideRightX}%)`;
        break;
      }
      case "rotateIn": {
        const rotateAngle = 360 * (1 - effect.progress);
        opacity *= effect.progress;
        transform += ` rotate(${rotateAngle}deg)`;
        break;
      }
      case "blur-in":
        opacity *= effect.progress;
        break;
      case "blur-out":
        opacity *= 1 - effect.progress;
        break;
      default:
        console.warn(`Unknown effect type: ${effect.effectType}`);
    }
  }
  return { opacity: Math.max(0, Math.min(1, opacity)), transform };
}

const CLIP_ICONS = {
  video: "i-video",
  audio: "i-music",
  subtitle: "i-editor",
  transition: "i-exchange",
  sticker: "i-pic",
  filter: "i-filter",
  effect: "i-flash"
};
const CLIP_TYPE_KEYS = {
  video: "workbench.production.clipType.video",
  audio: "workbench.production.clipType.audio",
  subtitle: "workbench.production.clipType.subtitle",
  transition: "workbench.production.clipType.transition",
  sticker: "workbench.production.clipType.sticker",
  filter: "workbench.production.clipType.filter",
  effect: "workbench.production.clipType.effect"
};
function getClipIcon(clip) {
  return CLIP_ICONS[clip.type] || "i-file-text";
}
function getClipTypeName(type) {
  const key = CLIP_TYPE_KEYS[type];
  return key ? $t(key) : type;
}
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor(seconds % 1 * 100);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

const _hoisted_1$2 = { class: "videoPreview" };
const _hoisted_2$1 = {
  key: 0,
  class: "previewScreenPlaceholder"
};
const _hoisted_3$1 = { class: "placeholderIcon" };
const _hoisted_4$1 = { class: "placeholderText" };
const _hoisted_5$1 = { class: "placeholderTime" };
const _hoisted_6$1 = {
  key: 1,
  class: "previewScreenPlaying"
};
const _hoisted_7$1 = { class: "playingIndicator" };
const _hoisted_8$1 = { class: "previewProgress" };
const _hoisted_9$1 = ["max", "value"];
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "videoPreview",
  props: {
    canvasWidth: { default: 1920 },
    canvasHeight: { default: 1080 }
  },
  emits: ["play", "pause"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const playbackStore = Ne();
    const tracksStore = Ht();
    const playbackSpeed = ref(1);
    const canvasContainer = ref(null);
    let avCanvas = null;
    const hasSprites = ref(false);
    const isPlaying = ref(false);
    const currentTime = ref(0);
    const duration = ref(playbackStore.duration * 1e6);
    let isUpdatingFromCanvas = false;
    let isUpdatingFromStore = false;
    let isSyncing = false;
    let pendingSync = false;
    const CANVAS_WIDTH = computed(() => props.canvasWidth);
    const CANVAS_HEIGHT = computed(() => props.canvasHeight);
    const clipSpriteMap = /* @__PURE__ */ new Map();
    const spriteListenerMap = /* @__PURE__ */ new Map();
    const clipSnapshotMap = /* @__PURE__ */ new Map();
    const clipTrackMap = /* @__PURE__ */ new Map();
    const transitionInfoMap = /* @__PURE__ */ new Map();
    const clipTransitionsMap = /* @__PURE__ */ new Map();
    const transitionFrameCache = /* @__PURE__ */ new Map();
    const avCanvasDebugData = reactive({
      initialized: false,
      canvasWidth: CANVAS_WIDTH.value,
      canvasHeight: CANVAS_HEIGHT.value,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      playbackSpeed: 1,
      spriteCount: 0,
      sprites: []
    });
    provide("avCanvasDebugData", avCanvasDebugData);
    function updateDebugSprites() {
      const sprites = [];
      for (const [clipId, sprite] of clipSpriteMap) {
        const clip = findClipById(clipId);
        sprites.push({
          clipId,
          type: clip?.type || "unknown",
          offset: sprite.time.offset,
          duration: sprite.time.duration,
          visible: sprite.visible,
          opacity: sprite.opacity,
          rect: {
            x: sprite.rect.x,
            y: sprite.rect.y,
            w: sprite.rect.w,
            h: sprite.rect.h,
            angle: sprite.rect.angle
          },
          zIndex: sprite.zIndex
        });
      }
      avCanvasDebugData.sprites = sprites;
      avCanvasDebugData.spriteCount = sprites.length;
    }
    function getMaxSpriteDuration() {
      let maxEndTime = 0;
      for (const sprite of clipSpriteMap.values()) {
        const endTime = sprite.time.offset + sprite.time.duration;
        if (endTime > maxEndTime) {
          maxEndTime = endTime;
        }
      }
      return maxEndTime;
    }
    function getEffectiveDuration() {
      const spriteDuration = getMaxSpriteDuration();
      const storeDuration = playbackStore.duration * 1e6;
      return Math.max(spriteDuration, storeDuration, 0);
    }
    const currentTimeInSeconds = computed(() => currentTime.value / 1e6);
    const durationInSeconds = computed(() => duration.value / 1e6);
    function findClipById(clipId) {
      for (const track of tracksStore.tracks) {
        for (const clip of track.clips) {
          if (clip.id === clipId) {
            return clip;
          }
        }
      }
      return null;
    }
    function calculateZIndexFromTrackOrder(trackOrder, isSubtitleTrack = false) {
      const maxTracks = 100;
      const baseZIndex = (maxTracks - trackOrder) * 10;
      if (isSubtitleTrack) {
        return baseZIndex + 1e3;
      }
      return baseZIndex;
    }
    function getActiveFiltersAtTime$1(timeInSeconds) {
      return getActiveFiltersAtTime(tracksStore.tracks, timeInSeconds);
    }
    function getActiveEffectsAtTime$1(timeInSeconds) {
      return getActiveEffectsAtTime(tracksStore.tracks, timeInSeconds);
    }
    function detectTransitions() {
      transitionInfoMap.clear();
      clipTransitionsMap.clear();
      for (const track of tracksStore.tracks) {
        if (track.visible === false) continue;
        const transitionClips = track.clips.filter((c) => c.type === "transition");
        const videoClips = track.clips.filter((c) => c.type === "video");
        for (const transitionClip of transitionClips) {
          const transStart = transitionClip.startTime;
          const transEnd = transitionClip.endTime;
          const transMidPoint = (transStart + transEnd) / 2;
          let beforeClip = null;
          let beforeClipScore = -Infinity;
          for (const vc of videoClips) {
            const tolerance = 1;
            if (vc.endTime >= transStart - tolerance && vc.endTime <= transEnd + tolerance) {
              const score = -Math.abs(vc.endTime - transMidPoint);
              if (score > beforeClipScore) {
                beforeClip = vc;
                beforeClipScore = score;
              }
            }
          }
          let afterClip = null;
          let afterClipScore = -Infinity;
          for (const vc of videoClips) {
            const tolerance = 1;
            if (vc.startTime >= transStart - tolerance && vc.startTime <= transEnd + tolerance) {
              const score = -Math.abs(vc.startTime - transMidPoint);
              if (score > afterClipScore) {
                afterClip = vc;
                afterClipScore = score;
              }
            }
          }
          if (beforeClip && afterClip && beforeClip.id !== afterClip.id) {
            const transitionInfo = {
              transitionClip,
              beforeClipId: beforeClip.id,
              afterClipId: afterClip.id,
              transitionType: transitionClip.transitionType || "fade",
              startTime: transStart,
              endTime: transEnd,
              duration: transEnd - transStart
            };
            transitionInfoMap.set(transitionClip.id, transitionInfo);
            const beforeTransitions = clipTransitionsMap.get(beforeClip.id) || [];
            beforeTransitions.push(transitionInfo);
            clipTransitionsMap.set(beforeClip.id, beforeTransitions);
            const afterTransitions = clipTransitionsMap.get(afterClip.id) || [];
            afterTransitions.push(transitionInfo);
            clipTransitionsMap.set(afterClip.id, afterTransitions);
          }
        }
      }
    }
    function getActiveTransitionAtTime(timeInSeconds, clipId) {
      const transitions = clipTransitionsMap.get(clipId);
      if (!transitions || transitions.length === 0) return null;
      for (const transition of transitions) {
        const isBeforeClip = transition.beforeClipId === clipId;
        const beforeClip = findClipById(transition.beforeClipId);
        const afterClip = findClipById(transition.afterClipId);
        if (!beforeClip || !afterClip) continue;
        if (isBeforeClip) {
          if (timeInSeconds >= transition.startTime && timeInSeconds <= beforeClip.endTime) {
            const effectiveDuration = beforeClip.endTime - transition.startTime;
            const progress = effectiveDuration > 0 ? (timeInSeconds - transition.startTime) / effectiveDuration : 0;
            return { transition, progress: Math.min(1, progress), isBeforeClip: true };
          }
        } else {
          if (timeInSeconds >= afterClip.startTime && timeInSeconds <= transition.endTime) {
            const effectiveDuration = transition.endTime - afterClip.startTime;
            const progress = effectiveDuration > 0 ? (timeInSeconds - afterClip.startTime) / effectiveDuration : 0;
            return { transition, progress: Math.min(1, progress), isBeforeClip: false };
          }
        }
      }
      return null;
    }
    const clipFrameCache = /* @__PURE__ */ new Map();
    function createFilteredTickInterceptor(originalClip) {
      if (originalClip.type !== "video" && originalClip.type !== "image" && originalClip.type !== "sticker") {
        return void 0;
      }
      const mediaClip = originalClip;
      const playbackRate = mediaClip.playbackRate || 1;
      let cachedCanvas = null;
      let cachedCtx = null;
      let cachedWidth = 0;
      let cachedHeight = 0;
      let transitionCanvas = null;
      let transitionCtx = null;
      return async (time, tickRet) => {
        if (!tickRet.video) return tickRet;
        const elapsedTimeOnTimeline = time / 1e6 / playbackRate;
        const globalTimeInSeconds = originalClip.startTime + elapsedTimeOnTimeline;
        const frame = tickRet.video;
        const width = "displayWidth" in frame ? frame.displayWidth : frame.width;
        const height = "displayHeight" in frame ? frame.displayHeight : frame.height;
        const transitionState = getActiveTransitionAtTime(globalTimeInSeconds, originalClip.id);
        const filters = getActiveFiltersAtTime$1(globalTimeInSeconds);
        const effects = getActiveEffectsAtTime$1(globalTimeInSeconds);
        const updateFrameCache = async (frameToCache) => {
          try {
            const frameCopy = await createImageBitmap(frameToCache);
            const oldCache = clipFrameCache.get(originalClip.id);
            if (oldCache) {
              oldCache.close();
            }
            clipFrameCache.set(originalClip.id, frameCopy);
          } catch (e) {
          }
        };
        if (transitionState && !transitionState.isBeforeClip) {
          const { transition, progress } = transitionState;
          const beforeClipFrame = clipFrameCache.get(transition.beforeClipId);
          if (beforeClipFrame) {
            try {
              if (!transitionCanvas || transitionCanvas.width !== width || transitionCanvas.height !== height) {
                transitionCanvas = new OffscreenCanvas(width, height);
                transitionCtx = transitionCanvas.getContext("2d");
              }
              if (transitionCtx) {
                const renderer = getTransitionRenderer(transition.transitionType);
                renderer.render(
                  transitionCtx,
                  beforeClipFrame,
                  // 前一个 clip 的帧
                  frame,
                  // 当前 clip 的帧（后一个）
                  progress,
                  width,
                  height
                );
                if ("close" in frame && typeof frame.close === "function") {
                  frame.close();
                }
                const transitionedFrame = await createImageBitmap(transitionCanvas);
                return {
                  ...tickRet,
                  video: transitionedFrame
                };
              }
            } catch (error) {
            }
          }
        }
        if (transitionState && transitionState.isBeforeClip) {
          const { progress } = transitionState;
          if (!cachedCanvas || cachedWidth !== width || cachedHeight !== height) {
            cachedCanvas = new OffscreenCanvas(width, height);
            cachedCtx = cachedCanvas.getContext("2d");
            cachedWidth = width;
            cachedHeight = height;
          }
          if (cachedCtx) {
            cachedCtx.clearRect(0, 0, width, height);
            cachedCtx.setTransform(1, 0, 0, 1, 0, 0);
            cachedCtx.filter = "none";
            cachedCtx.globalAlpha = 1;
            if (filters.length > 0) {
              cachedCtx.filter = buildCSSFilter(filters);
            }
            let effectOpacity = 1;
            if (effects.length > 0) {
              const effectResult = applyEffectsToFrame(effects);
              effectOpacity = effectResult.opacity;
            }
            cachedCtx.globalAlpha = effectOpacity;
            cachedCtx.drawImage(frame, 0, 0);
            const frameForCache = await createImageBitmap(cachedCanvas);
            await updateFrameCache(frameForCache);
            if (progress > 0) {
              cachedCtx.clearRect(0, 0, width, height);
              cachedCtx.filter = filters.length > 0 ? buildCSSFilter(filters) : "none";
              cachedCtx.globalAlpha = effectOpacity * (1 - progress);
              cachedCtx.drawImage(frame, 0, 0);
            }
            cachedCtx.globalAlpha = 1;
            cachedCtx.filter = "none";
            if ("close" in frame && typeof frame.close === "function") {
              frame.close();
            }
            const fadedFrame = await createImageBitmap(cachedCanvas);
            return {
              ...tickRet,
              video: fadedFrame
            };
          }
        }
        if (filters.length === 0 && effects.length === 0) {
          await updateFrameCache(frame);
          return tickRet;
        }
        try {
          const frame2 = tickRet.video;
          const width2 = "displayWidth" in frame2 ? frame2.displayWidth : frame2.width;
          const height2 = "displayHeight" in frame2 ? frame2.displayHeight : frame2.height;
          if (!cachedCanvas || cachedWidth !== width2 || cachedHeight !== height2) {
            cachedCanvas = new OffscreenCanvas(width2, height2);
            cachedCtx = cachedCanvas.getContext("2d");
            cachedWidth = width2;
            cachedHeight = height2;
          }
          const ctx = cachedCtx;
          if (!ctx) return tickRet;
          ctx.clearRect(0, 0, width2, height2);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.filter = "none";
          ctx.globalAlpha = 1;
          if (filters.length > 0) {
            ctx.filter = buildCSSFilter(filters);
          }
          const effectResult = applyEffectsToFrame(effects, frame2, time);
          ctx.globalAlpha = effectResult.opacity;
          ctx.drawImage(frame2, 0, 0);
          if ("close" in frame2 && typeof frame2.close === "function") {
            frame2.close();
          }
          const newFrame = await createImageBitmap(cachedCanvas);
          await updateFrameCache(newFrame);
          return {
            ...tickRet,
            video: newFrame
          };
        } catch (error) {
          return tickRet;
        }
      };
    }
    function calculateSpriteRect(mediaWidth, mediaHeight) {
      const mediaAspect = mediaWidth / mediaHeight;
      const canvasAspect = CANVAS_WIDTH.value / CANVAS_HEIGHT.value;
      let w, h, x, y;
      if (mediaAspect > canvasAspect) {
        w = CANVAS_WIDTH.value;
        h = CANVAS_WIDTH.value / mediaAspect;
        x = 0;
        y = (CANVAS_HEIGHT.value - h) / 2;
      } else {
        h = CANVAS_HEIGHT.value;
        w = CANVAS_HEIGHT.value * mediaAspect;
        x = (CANVAS_WIDTH.value - w) / 2;
        y = 0;
      }
      return { x, y, w, h };
    }
    function getClipSnapshot(clip) {
      const mediaClip = clip;
      const textClip = clip;
      return {
        trimStart: mediaClip.trimStart || 0,
        trimEnd: mediaClip.trimEnd || 0,
        playbackRate: mediaClip.playbackRate || 1,
        sourceUrl: mediaClip.sourceUrl || "",
        text: textClip.text || "",
        volume: mediaClip.volume ?? 1
        // 音量变化需要重建 sprite
      };
    }
    function needsRebuildSprite(clip) {
      const oldSnapshot = clipSnapshotMap.get(clip.id);
      if (!oldSnapshot) return true;
      const newSnapshot = getClipSnapshot(clip);
      return oldSnapshot.trimStart !== newSnapshot.trimStart || oldSnapshot.trimEnd !== newSnapshot.trimEnd || oldSnapshot.playbackRate !== newSnapshot.playbackRate || oldSnapshot.sourceUrl !== newSnapshot.sourceUrl || oldSnapshot.text !== newSnapshot.text || oldSnapshot.volume !== newSnapshot.volume;
    }
    function syncSpriteToClip(clipId, sprite) {
      const clip = findClipById(clipId);
      if (!clip) return;
      isUpdatingFromCanvas = true;
      tracksStore.updateClip(clipId, {
        rect: {
          x: sprite.rect.x,
          y: sprite.rect.y,
          w: sprite.rect.w,
          h: sprite.rect.h,
          angle: sprite.rect.angle,
          fixedAspectRatio: sprite.rect.fixedAspectRatio,
          fixedScaleCenter: sprite.rect.fixedScaleCenter
        },
        opacity: sprite.opacity,
        visible: sprite.visible,
        flip: sprite.flip,
        zIndex: sprite.zIndex
      });
      setTimeout(() => {
        isUpdatingFromCanvas = false;
      }, 0);
    }
    function setupSpriteListeners(clipId, sprite) {
      const oldUnsubscribe = spriteListenerMap.get(clipId);
      if (oldUnsubscribe) {
        oldUnsubscribe();
      }
      const unsubscribeRect = sprite.rect.on("propsChange", (changedProps) => {
        if (isUpdatingFromStore) return;
        syncSpriteToClip(clipId, sprite);
      });
      const unsubscribeSprite = sprite.on("propsChange", (changedProps) => {
        if (isUpdatingFromStore) return;
        syncSpriteToClip(clipId, sprite);
      });
      spriteListenerMap.set(clipId, () => {
        unsubscribeRect();
        unsubscribeSprite();
      });
    }
    async function createSpriteFromClip(clip, track) {
      try {
        const mediaClip = clip;
        const extClip = clip;
        let sprite = null;
        let originalWidth = 0;
        let originalHeight = 0;
        const SPLIT_SAFETY_MARGIN = 0.1;
        if (clip.type === "video" && mediaClip.sourceUrl) {
          const response = await fetch(mediaClip.sourceUrl);
          if (!response.ok) {
            return null;
          }
          const volume = mediaClip.volume ?? 1;
          let mp4Clip = new I(response.body, { audio: { volume } });
          await mp4Clip.ready;
          originalWidth = mp4Clip.meta.width;
          originalHeight = mp4Clip.meta.height;
          const trimStart = mediaClip.trimStart || 0;
          const trimEnd = mediaClip.trimEnd || mp4Clip.meta.duration / 1e6;
          const playbackRate = mediaClip.playbackRate || 1;
          const originalDuration = mp4Clip.meta.duration / 1e6;
          if (trimStart > SPLIT_SAFETY_MARGIN && trimStart < originalDuration - SPLIT_SAFETY_MARGIN) {
            try {
              const [beforePart, afterPart] = await mp4Clip.split(trimStart * 1e6);
              beforePart.destroy();
              mp4Clip = afterPart;
              await mp4Clip.ready;
            } catch (splitError) {
            }
          }
          const keepDuration = trimEnd - trimStart;
          const currentDuration = mp4Clip.meta.duration / 1e6;
          if (keepDuration > SPLIT_SAFETY_MARGIN && keepDuration < currentDuration - SPLIT_SAFETY_MARGIN) {
            try {
              const [keepPart, discardPart] = await mp4Clip.split(keepDuration * 1e6);
              discardPart.destroy();
              mp4Clip = keepPart;
              await mp4Clip.ready;
            } catch (splitError) {
            }
          }
          const interceptor = createFilteredTickInterceptor(clip);
          if (interceptor) {
            mp4Clip.tickInterceptor = interceptor;
          }
          sprite = new dt(mp4Clip);
          sprite.time.offset = clip.startTime * 1e6;
          sprite.time.duration = (clip.endTime - clip.startTime) * 1e6;
          sprite.time.playbackRate = playbackRate;
        } else if (clip.type === "audio" && mediaClip.sourceUrl) {
          const response = await fetch(mediaClip.sourceUrl);
          if (!response.ok) {
            return null;
          }
          const volume = mediaClip.volume ?? 1;
          let audioClip = new A(response.body, { volume });
          await audioClip.ready;
          const trimStart = mediaClip.trimStart || 0;
          const trimEnd = mediaClip.trimEnd || audioClip.meta.duration / 1e6;
          const playbackRate = mediaClip.playbackRate || 1;
          const originalDuration = audioClip.meta.duration / 1e6;
          if (trimStart > SPLIT_SAFETY_MARGIN && trimStart < originalDuration - SPLIT_SAFETY_MARGIN) {
            try {
              const [beforePart, afterPart] = await audioClip.split(trimStart * 1e6);
              beforePart.destroy();
              audioClip = afterPart;
              await audioClip.ready;
            } catch (splitError) {
            }
          }
          const keepDuration = trimEnd - trimStart;
          const currentDuration = audioClip.meta.duration / 1e6;
          if (keepDuration > SPLIT_SAFETY_MARGIN && keepDuration < currentDuration - SPLIT_SAFETY_MARGIN) {
            try {
              const [keepPart, discardPart] = await audioClip.split(keepDuration * 1e6);
              discardPart.destroy();
              audioClip = keepPart;
              await audioClip.ready;
            } catch (splitError) {
            }
          }
          sprite = new dt(audioClip);
          sprite.time.offset = clip.startTime * 1e6;
          sprite.time.duration = (clip.endTime - clip.startTime) * 1e6;
          sprite.time.playbackRate = playbackRate;
        } else if (clip.type === "sticker" && mediaClip.sourceUrl) {
          const response = await fetch(mediaClip.sourceUrl);
          if (!response.ok) {
            return null;
          }
          const blob = await response.blob();
          const imageBitmap = await createImageBitmap(blob);
          const imgClip = new R(imageBitmap);
          await imgClip.ready;
          const interceptor = createFilteredTickInterceptor(clip);
          if (interceptor) {
            imgClip.tickInterceptor = interceptor;
          }
          sprite = new dt(imgClip);
          originalWidth = imageBitmap.width;
          originalHeight = imageBitmap.height;
          sprite.time.offset = clip.startTime * 1e6;
          sprite.time.duration = (clip.endTime - clip.startTime) * 1e6;
        } else if (clip.type === "image" && mediaClip.sourceUrl) {
          const response = await fetch(mediaClip.sourceUrl);
          if (!response.ok) {
            return null;
          }
          const blob = await response.blob();
          const imageBitmap = await createImageBitmap(blob);
          const imgClip = new R(imageBitmap);
          await imgClip.ready;
          const interceptor = createFilteredTickInterceptor(clip);
          if (interceptor) {
            imgClip.tickInterceptor = interceptor;
          }
          sprite = new dt(imgClip);
          originalWidth = imageBitmap.width;
          originalHeight = imageBitmap.height;
          sprite.time.offset = clip.startTime * 1e6;
          sprite.time.duration = (clip.endTime - clip.startTime) * 1e6;
        } else if (clip.type === "subtitle" || clip.type === "text") {
          const textClip = clip;
          const text = textClip.text || "";
          if (!text) return null;
          const fontSize = ("fontSize" in textClip ? textClip.fontSize : 48) || 48;
          const fontFamily = ("fontFamily" in textClip ? textClip.fontFamily : "Arial") || "Arial";
          const color = ("color" in textClip ? textClip.color : "white") || "white";
          const backgroundColor = ("backgroundColor" in textClip ? textClip.backgroundColor : "") || "";
          const textAlign = ("textAlign" in textClip ? textClip.textAlign : "center") || "center";
          let cssText = `
        font-size: ${fontSize}px;
        font-family: ${fontFamily};
        color: ${color};
        text-align: ${textAlign};
        white-space: pre-wrap;
        padding: 8px 16px;
      `;
          if (backgroundColor) {
            cssText += `background-color: ${backgroundColor};`;
          }
          try {
            const imgBitmap = await ye(text, cssText);
            const imgClip = new R(imgBitmap);
            await imgClip.ready;
            sprite = new dt(imgClip);
            originalWidth = imgBitmap.width;
            originalHeight = imgBitmap.height;
            if (!extClip.rect || extClip.rect.w <= 0 || extClip.rect.h <= 0) {
              const x = (CANVAS_WIDTH.value - originalWidth) / 2;
              const y = CANVAS_HEIGHT.value - originalHeight - 80;
              sprite.rect.x = x;
              sprite.rect.y = y;
              sprite.rect.w = originalWidth;
              sprite.rect.h = originalHeight;
            }
            sprite.time.offset = clip.startTime * 1e6;
            sprite.time.duration = (clip.endTime - clip.startTime) * 1e6;
          } catch (error) {
            return null;
          }
        }
        if (!sprite) return null;
        if (extClip.rect && extClip.rect.w > 0 && extClip.rect.h > 0) {
          sprite.rect.x = extClip.rect.x;
          sprite.rect.y = extClip.rect.y;
          sprite.rect.w = extClip.rect.w;
          sprite.rect.h = extClip.rect.h;
          sprite.rect.angle = extClip.rect.angle || 0;
          if (extClip.rect.fixedAspectRatio !== void 0) {
            sprite.rect.fixedAspectRatio = extClip.rect.fixedAspectRatio;
          }
          if (extClip.rect.fixedScaleCenter !== void 0) {
            sprite.rect.fixedScaleCenter = extClip.rect.fixedScaleCenter;
          }
        } else if (originalWidth > 0 && originalHeight > 0 && clip.type !== "subtitle" && clip.type !== "text") {
          const rect = calculateSpriteRect(originalWidth, originalHeight);
          sprite.rect.x = rect.x;
          sprite.rect.y = rect.y;
          sprite.rect.w = rect.w;
          sprite.rect.h = rect.h;
        }
        if (extClip.opacity !== void 0) {
          sprite.opacity = extClip.opacity;
        }
        if (extClip.visible !== void 0) {
          sprite.visible = extClip.visible;
        }
        if (extClip.flip) {
          sprite.flip = extClip.flip;
        }
        const isSubtitleTrack = track.type === "subtitle" || track.type === "text";
        if (extClip.zIndex !== void 0) {
          sprite.zIndex = isSubtitleTrack ? extClip.zIndex + 1e3 : extClip.zIndex;
        } else {
          sprite.zIndex = calculateZIndexFromTrackOrder(track.order, isSubtitleTrack);
        }
        clipTrackMap.set(clip.id, { trackId: track.id, trackOrder: track.order });
        return sprite;
      } catch (error) {
        return null;
      }
    }
    async function syncClipsToCanvas() {
      if (!avCanvas) return;
      if (isSyncing) {
        pendingSync = true;
        return;
      }
      isSyncing = true;
      detectTransitions();
      const allClipsWithTrack = [];
      for (const track of tracksStore.tracks) {
        if (track.visible === false) {
          continue;
        }
        for (const clip of track.clips) {
          if (["video", "audio", "image", "sticker", "subtitle", "text"].includes(clip.type)) {
            allClipsWithTrack.push({ clip, track });
          }
        }
      }
      const currentClipIds = new Set(allClipsWithTrack.map((item) => item.clip.id));
      for (const [clipId, sprite] of clipSpriteMap) {
        if (!currentClipIds.has(clipId)) {
          const unsubscribe = spriteListenerMap.get(clipId);
          if (unsubscribe) {
            unsubscribe();
            spriteListenerMap.delete(clipId);
          }
          avCanvas.removeSprite(sprite);
          clipSpriteMap.delete(clipId);
          clipSnapshotMap.delete(clipId);
          clipTrackMap.delete(clipId);
        }
      }
      for (const { clip, track } of allClipsWithTrack) {
        const extClip = clip;
        const existingSprite = clipSpriteMap.get(clip.id);
        const shouldRebuild = existingSprite && needsRebuildSprite(clip);
        if (shouldRebuild && existingSprite) {
          const unsubscribe = spriteListenerMap.get(clip.id);
          if (unsubscribe) {
            unsubscribe();
            spriteListenerMap.delete(clip.id);
          }
          avCanvas.removeSprite(existingSprite);
          clipSpriteMap.delete(clip.id);
          clipSnapshotMap.delete(clip.id);
          clipTrackMap.delete(clip.id);
        }
        const currentSprite = clipSpriteMap.get(clip.id);
        if (currentSprite) {
          if (!isUpdatingFromCanvas) {
            isUpdatingFromStore = true;
            currentSprite.time.offset = clip.startTime * 1e6;
            currentSprite.time.duration = (clip.endTime - clip.startTime) * 1e6;
            if (extClip.rect && extClip.rect.w > 0 && extClip.rect.h > 0) {
              currentSprite.rect.x = extClip.rect.x;
              currentSprite.rect.y = extClip.rect.y;
              currentSprite.rect.w = extClip.rect.w;
              currentSprite.rect.h = extClip.rect.h;
              currentSprite.rect.angle = extClip.rect.angle || 0;
            }
            if (extClip.opacity !== void 0) {
              currentSprite.opacity = extClip.opacity;
            }
            if (extClip.visible !== void 0) {
              currentSprite.visible = extClip.visible;
            }
            if (extClip.flip !== void 0) {
              currentSprite.flip = extClip.flip;
            }
            const oldTrackInfo = clipTrackMap.get(clip.id);
            if (oldTrackInfo && oldTrackInfo.trackOrder !== track.order) {
              const newZIndex = extClip.zIndex !== void 0 ? extClip.zIndex : calculateZIndexFromTrackOrder(track.order);
              currentSprite.zIndex = newZIndex;
              clipTrackMap.set(clip.id, { trackId: track.id, trackOrder: track.order });
            } else if (extClip.zIndex !== void 0) {
              currentSprite.zIndex = extClip.zIndex;
            }
            setTimeout(() => {
              isUpdatingFromStore = false;
            }, 0);
          }
        } else {
          const sprite = await createSpriteFromClip(clip, track);
          if (sprite) {
            await avCanvas.addSprite(sprite);
            clipSpriteMap.set(clip.id, sprite);
            clipSnapshotMap.set(clip.id, getClipSnapshot(clip));
            setupSpriteListeners(clip.id, sprite);
          }
        }
      }
      hasSprites.value = clipSpriteMap.size > 0;
      updateDebugSprites();
      const effectiveDuration = getEffectiveDuration();
      if (effectiveDuration > 0) {
        duration.value = effectiveDuration;
        avCanvasDebugData.duration = effectiveDuration;
      }
      isSyncing = false;
      if (pendingSync) {
        pendingSync = false;
        await syncClipsToCanvas();
      }
    }
    onMounted(async () => {
      if (canvasContainer.value) {
        try {
          avCanvas = new St(canvasContainer.value, {
            bgColor: "#000000",
            width: CANVAS_WIDTH.value,
            height: CANVAS_HEIGHT.value
          });
          avCanvas.on("timeupdate", (time) => {
            currentTime.value = time;
            avCanvasDebugData.currentTime = time;
            isUpdatingFromCanvas = true;
            playbackStore.seekTo(time / 1e6);
            setTimeout(() => {
              isUpdatingFromCanvas = false;
            }, 0);
          });
          avCanvas.on("playing", () => {
            isPlaying.value = true;
            avCanvasDebugData.isPlaying = true;
            isUpdatingFromCanvas = true;
            playbackStore.play();
            emit("play");
            setTimeout(() => {
              isUpdatingFromCanvas = false;
            }, 0);
          });
          avCanvas.on("paused", () => {
            isPlaying.value = false;
            avCanvasDebugData.isPlaying = false;
            isUpdatingFromCanvas = true;
            playbackStore.pause();
            emit("pause");
            setTimeout(() => {
              isUpdatingFromCanvas = false;
            }, 0);
          });
          avCanvas.on("activeSpriteChange", (sprite) => {
            if (sprite) {
              for (const [clipId, s] of clipSpriteMap) {
                if (s === sprite) {
                  syncSpriteToClip(clipId, sprite);
                  tracksStore.selectClip(clipId);
                  break;
                }
              }
            } else {
              tracksStore.clearSelection();
            }
          });
          avCanvasDebugData.initialized = true;
          await syncClipsToCanvas();
          if (clipSpriteMap.size > 0) {
            avCanvas.previewFrame(0);
          }
        } catch (error) {
        }
      }
    });
    watch(
      () => tracksStore.tracks,
      async () => {
        for (const frame of clipFrameCache.values()) {
          frame.close();
        }
        clipFrameCache.clear();
        await syncClipsToCanvas();
        if (avCanvas && clipSpriteMap.size > 0 && !isPlaying.value) {
          avCanvas.previewFrame(currentTime.value);
        }
      },
      { deep: true }
    );
    watch(
      () => playbackStore.currentTime,
      (newTime) => {
        if (isUpdatingFromCanvas) return;
        const timeInMicroseconds = newTime * 1e6;
        currentTime.value = timeInMicroseconds;
        if (avCanvas && !isPlaying.value) {
          isUpdatingFromStore = true;
          avCanvas.previewFrame(timeInMicroseconds);
          setTimeout(() => {
            isUpdatingFromStore = false;
          }, 0);
        }
      }
    );
    watch(
      () => playbackStore.isPlaying,
      (newIsPlaying) => {
        if (isUpdatingFromCanvas) return;
        if (!avCanvas) return;
        if (newIsPlaying && !isPlaying.value) {
          const effectiveDuration = getEffectiveDuration();
          if (effectiveDuration <= 0) {
            return;
          }
          if (currentTime.value >= effectiveDuration - 1e3) {
            currentTime.value = 0;
          }
          isUpdatingFromStore = true;
          avCanvas.play({
            start: currentTime.value,
            end: effectiveDuration,
            playbackRate: playbackSpeed.value
          });
          isPlaying.value = true;
          setTimeout(() => {
            isUpdatingFromStore = false;
          }, 0);
        } else if (!newIsPlaying && isPlaying.value) {
          isUpdatingFromStore = true;
          avCanvas.pause();
          isPlaying.value = false;
          setTimeout(() => {
            isUpdatingFromStore = false;
          }, 0);
        }
      }
    );
    watch(
      () => playbackStore.duration,
      (newDuration) => {
        duration.value = newDuration * 1e6;
        avCanvasDebugData.duration = newDuration * 1e6;
      }
    );
    onUnmounted(() => {
      for (const unsubscribe of spriteListenerMap.values()) {
        unsubscribe();
      }
      spriteListenerMap.clear();
      clipSpriteMap.clear();
      clipSnapshotMap.clear();
      clipTrackMap.clear();
      transitionInfoMap.clear();
      clipTransitionsMap.clear();
      for (const frame of clipFrameCache.values()) {
        frame.close();
      }
      clipFrameCache.clear();
      transitionFrameCache.clear();
      if (avCanvas) {
        avCanvas.destroy();
        avCanvas = null;
      }
    });
    function handleSeek(event) {
      const target = event.target;
      const timeInSeconds = parseFloat(target.value);
      const timeInMicroseconds = timeInSeconds * 1e6;
      currentTime.value = timeInMicroseconds;
      isUpdatingFromCanvas = true;
      playbackStore.seekTo(timeInSeconds);
      setTimeout(() => {
        isUpdatingFromCanvas = false;
      }, 0);
      if (avCanvas) {
        avCanvas.previewFrame(timeInMicroseconds);
      }
    }
    async function exportVideo() {
      if (!avCanvas) {
        throw new Error($t("workbench.production.editVideo.avCanvasNotInit"));
      }
      if (clipSpriteMap.size === 0) {
        throw new Error($t("workbench.production.editVideo.noExportContent"));
      }
      if (isPlaying.value) {
        avCanvas.pause();
        isPlaying.value = false;
        playbackStore.pause();
      }
      const combinator = await avCanvas.createCombinator();
      const chunks = [];
      const reader = combinator.output().getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const blob = new Blob(chunks, { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WebAV-export-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    }
    __expose({
      avCanvas: computed(() => avCanvas),
      exportVideo,
      addSprite: async (sprite) => {
        if (avCanvas) {
          await avCanvas.addSprite(sprite);
          hasSprites.value = true;
        }
      },
      removeSprite: (sprite) => {
        if (avCanvas) {
          avCanvas.removeSprite(sprite);
        }
      }
    });
    return (_ctx, _cache) => {
      const _component_i_film = resolveComponent("i-film");
      const _component_i_play = resolveComponent("i-play");
      return openBlock(), createElementBlock("div", _hoisted_1$2, [
        createBaseVNode("div", {
          ref_key: "canvasContainer",
          ref: canvasContainer,
          class: "previewScreen"
        }, [
          !unref(hasSprites) ? (openBlock(), createElementBlock("div", _hoisted_2$1, [
            createBaseVNode("div", _hoisted_3$1, [
              createVNode(_component_i_film, {
                theme: "outline",
                size: "48",
                fill: "var(--td-text-color-placeholder)"
              })
            ]),
            createBaseVNode("div", _hoisted_4$1, toDisplayString(_ctx.$t("workbench.production.editVideo.videoPreviewArea")), 1),
            createBaseVNode("div", _hoisted_5$1, toDisplayString(unref(formatTime)(unref(currentTimeInSeconds))), 1)
          ])) : createCommentVNode("", true),
          unref(isPlaying) && !unref(hasSprites) ? (openBlock(), createElementBlock("div", _hoisted_6$1, [
            createBaseVNode("div", _hoisted_7$1, [
              createVNode(_component_i_play, {
                theme: "outline",
                size: "36",
                fill: "#000000"
              })
            ])
          ])) : createCommentVNode("", true)
        ], 512),
        createBaseVNode("div", _hoisted_8$1, [
          createBaseVNode("input", {
            type: "range",
            min: "0",
            max: unref(durationInSeconds),
            value: unref(currentTimeInSeconds),
            step: "0.01",
            class: "progressSlider",
            onInput: handleSeek
          }, null, 40, _hoisted_9$1)
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const videoPreview = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-43ca8eae"]]);

const _hoisted_1$1 = { class: "propertyPanel" };
const _hoisted_2 = { class: "panelHeader" };
const _hoisted_3 = { class: "panelTitle" };
const _hoisted_4 = { class: "panelContent" };
const _hoisted_5 = {
  key: 0,
  class: "emptyState"
};
const _hoisted_6 = { class: "emptyIconWrapper" };
const _hoisted_7 = { class: "emptyText" };
const _hoisted_8 = {
  key: 1,
  class: "properties"
};
const _hoisted_9 = { class: "sectionCard" };
const _hoisted_10 = { class: "sectionHeader" };
const _hoisted_11 = { class: "sectionIconBadge" };
const _hoisted_12 = { class: "sectionLabel" };
const _hoisted_13 = { class: "sectionBody" };
const _hoisted_14 = { class: "propRow" };
const _hoisted_15 = { class: "propLabel" };
const _hoisted_16 = { class: "propRowInline" };
const _hoisted_17 = { class: "propField" };
const _hoisted_18 = { class: "propLabel" };
const _hoisted_19 = { class: "propField" };
const _hoisted_20 = { class: "propLabel" };
const _hoisted_21 = { class: "propRowInline durationRow" };
const _hoisted_22 = { class: "durationLabel" };
const _hoisted_23 = {
  key: 0,
  class: "sectionCard"
};
const _hoisted_24 = { class: "sectionHeader" };
const _hoisted_25 = { class: "sectionIconBadge" };
const _hoisted_26 = { class: "sectionLabel" };
const _hoisted_27 = { class: "sectionBody" };
const _hoisted_28 = { class: "propRow" };
const _hoisted_29 = { class: "propRowHead" };
const _hoisted_30 = { class: "propLabel" };
const _hoisted_31 = { class: "propValueText" };
const _hoisted_32 = { class: "propRow" };
const _hoisted_33 = { class: "propRowHead" };
const _hoisted_34 = { class: "propLabel" };
const _hoisted_35 = { class: "propValueText" };
const _hoisted_36 = { class: "propRow" };
const _hoisted_37 = { class: "propLabel" };
const _hoisted_38 = {
  key: 1,
  class: "sectionCard"
};
const _hoisted_39 = { class: "sectionHeader" };
const _hoisted_40 = { class: "sectionIconBadge" };
const _hoisted_41 = { class: "sectionLabel" };
const _hoisted_42 = { class: "sectionBody" };
const _hoisted_43 = { class: "propRow" };
const _hoisted_44 = { class: "propRowHead" };
const _hoisted_45 = { class: "propLabel" };
const _hoisted_46 = { class: "propValueText" };
const _hoisted_47 = { class: "propRowInline" };
const _hoisted_48 = { class: "propField" };
const _hoisted_49 = { class: "propLabel" };
const _hoisted_50 = { class: "propField" };
const _hoisted_51 = { class: "propLabel" };
const _hoisted_52 = {
  key: 2,
  class: "sectionCard"
};
const _hoisted_53 = { class: "sectionHeader" };
const _hoisted_54 = { class: "sectionIconBadge" };
const _hoisted_55 = { class: "sectionLabel" };
const _hoisted_56 = { class: "sectionBody" };
const _hoisted_57 = { class: "propRow" };
const _hoisted_58 = { class: "propLabel" };
const _hoisted_59 = { class: "propRow" };
const _hoisted_60 = { class: "propLabel" };
const _hoisted_61 = {
  key: 3,
  class: "sectionCard"
};
const _hoisted_62 = { class: "sectionHeader" };
const _hoisted_63 = { class: "sectionIconBadge" };
const _hoisted_64 = { class: "sectionLabel" };
const _hoisted_65 = { class: "sectionBody" };
const _hoisted_66 = { class: "propRow" };
const _hoisted_67 = { class: "propLabel" };
const _hoisted_68 = { class: "propRow" };
const _hoisted_69 = { class: "propLabel" };
const _hoisted_70 = { class: "actions" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "propertyPanel",
  setup(__props) {
    const tracksStore = Ht();
    const historyStore = ti();
    const selectedClip = computed(() => {
      const selected = tracksStore.selectedClips;
      return selected.length === 1 ? selected[0] : null;
    });
    const clipName = ref("");
    const videoOpacity = ref(100);
    const videoVolume = ref(100);
    const videoSpeed = ref(1);
    const audioVolume = ref(100);
    const audioFadeIn = ref(0);
    const audioFadeOut = ref(0);
    const transitionType = ref("fade");
    const transitionDuration = ref(1);
    const subtitleText = ref("");
    const subtitleFontSize = ref(24);
    watch(
      selectedClip,
      (clip) => {
        if (!clip) return;
        clipName.value = clip.name || "";
        if (clip.type === "video") {
          videoOpacity.value = Math.round((clip.opacity ?? 1) * 100);
          videoVolume.value = Math.round((clip.volume ?? 1) * 100);
          videoSpeed.value = clip.playbackRate ?? 1;
        }
        if (clip.type === "audio") {
          audioVolume.value = Math.round((clip.volume ?? 1) * 100);
          audioFadeIn.value = clip.fadeIn ?? 0;
          audioFadeOut.value = clip.fadeOut ?? 0;
        }
        if (clip.type === "transition") {
          transitionType.value = clip.transitionType ?? "fade";
          transitionDuration.value = clip.transitionDuration ?? 1;
        }
        if (clip.type === "subtitle") {
          subtitleText.value = clip.text ?? "";
          subtitleFontSize.value = clip.fontSize ?? 24;
        }
      },
      { immediate: true }
    );
    function handleUpdateClip(key, value) {
      if (!selectedClip.value) return;
      tracksStore.updateClip(selectedClip.value.id, { [key]: value });
      historyStore.pushSnapshot($t("workbench.production.editVideo.updateClip", { key }));
    }
    function handleUpdatePlaybackRate(newRate) {
      if (!selectedClip.value) return;
      if (newRate < 0.1 || newRate > 10) {
        console.warn($t("workbench.production.editVideo.playbackRateRange"));
        return;
      }
      const result = tracksStore.setClipPlaybackRate(selectedClip.value.id, newRate, {
        allowShrink: true,
        allowExpand: true,
        handleCollision: true,
        keepStartTime: true
      });
      if (result.success) {
        historyStore.pushSnapshot($t("workbench.production.editVideo.updatePlaybackRate", { rate: newRate }));
      } else {
        console.warn($t("workbench.production.editVideo.updatePlaybackRateFailed"), result.message);
      }
    }
    function handleUpdateTransitionDuration() {
      if (!selectedClip.value || selectedClip.value.type !== "transition") return;
      const clip = selectedClip.value;
      clip.transitionDuration || 1;
      const newDuration = transitionDuration.value;
      const center = (clip.startTime + clip.endTime) / 2;
      tracksStore.updateClip(clip.id, {
        startTime: center - newDuration / 2,
        endTime: center + newDuration / 2,
        transitionDuration: newDuration
      });
      historyStore.pushSnapshot($t("workbench.production.editVideo.updateTransitionDuration"));
    }
    function handleDeleteClip() {
      if (!selectedClip.value) return;
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.production.editVideo.deleteConfirm"),
        body: $t("workbench.production.editVideo.deleteClipConfirm"),
        onConfirm: () => {
          tracksStore.removeClips([selectedClip.value.id]);
          historyStore.pushSnapshot($t("workbench.production.editVideo.deleteClip"));
          dialog.destroy();
        },
        onClose: () => dialog.destroy()
      });
    }
    function handleDuplicateClip() {
      if (!selectedClip.value) return;
      const clip = selectedClip.value;
      const track = tracksStore.tracks.find((t) => t.id === clip.trackId);
      if (!track) return;
      const newClip = {
        ...clip,
        id: `clip-${Date.now()}`,
        startTime: clip.endTime,
        endTime: clip.endTime + (clip.endTime - clip.startTime),
        selected: false
      };
      tracksStore.addClip(track.id, newClip);
      historyStore.pushSnapshot($t("workbench.production.editVideo.duplicateClip"));
    }
    return (_ctx, _cache) => {
      const _component_i_inbox = resolveComponent("i-inbox");
      const _component_t_tag = Tag;
      const _component_t_input = Input;
      const _component_t_input_number = InputNumber;
      const _component_i_video = resolveComponent("i-video");
      const _component_t_slider = Slider;
      const _component_i_music = resolveComponent("i-music");
      const _component_i_exchange = resolveComponent("i-exchange");
      const _component_t_option = Option;
      const _component_t_select = Select;
      const _component_i_editor = resolveComponent("i-editor");
      const _component_t_textarea = Textarea;
      const _component_i_copy = resolveComponent("i-copy");
      const _component_t_button = Button;
      const _component_i_delete = resolveComponent("i-delete");
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("h3", _hoisted_3, toDisplayString(_ctx.$t("workbench.production.editVideo.propertyPanel")), 1)
        ]),
        createBaseVNode("div", _hoisted_4, [
          !selectedClip.value ? (openBlock(), createElementBlock("div", _hoisted_5, [
            createBaseVNode("div", _hoisted_6, [
              createVNode(_component_i_inbox, {
                theme: "outline",
                size: "32",
                fill: "var(--td-text-color-placeholder)"
              })
            ]),
            createBaseVNode("div", _hoisted_7, toDisplayString(_ctx.$t("workbench.production.editVideo.selectClip")), 1)
          ])) : (openBlock(), createElementBlock("div", _hoisted_8, [
            createBaseVNode("div", _hoisted_9, [
              createBaseVNode("div", _hoisted_10, [
                createBaseVNode("div", _hoisted_11, [
                  (openBlock(), createBlock(resolveDynamicComponent(unref(getClipIcon)(selectedClip.value)), {
                    theme: "outline",
                    size: "16"
                  }))
                ]),
                createBaseVNode("span", _hoisted_12, toDisplayString(_ctx.$t("workbench.production.editVideo.basicInfo")), 1),
                createVNode(_component_t_tag, {
                  size: "small",
                  theme: "primary",
                  variant: "light"
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(getClipTypeName)(selectedClip.value.type)), 1)
                  ]),
                  _: 1
                })
              ]),
              createBaseVNode("div", _hoisted_13, [
                createBaseVNode("div", _hoisted_14, [
                  createBaseVNode("label", _hoisted_15, toDisplayString(_ctx.$t("workbench.production.editVideo.name")), 1),
                  createVNode(_component_t_input, {
                    modelValue: clipName.value,
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => clipName.value = $event),
                    size: "small",
                    placeholder: _ctx.$t("workbench.production.editVideo.clipNamePlaceholder"),
                    onChange: _cache[1] || (_cache[1] = ($event) => handleUpdateClip("name", clipName.value))
                  }, null, 8, ["modelValue", "placeholder"])
                ]),
                createBaseVNode("div", _hoisted_16, [
                  createBaseVNode("div", _hoisted_17, [
                    createBaseVNode("label", _hoisted_18, toDisplayString(_ctx.$t("workbench.production.editVideo.startTime")), 1),
                    createVNode(_component_t_input_number, {
                      value: Number(selectedClip.value.startTime.toFixed(2)),
                      size: "small",
                      "decimal-places": 2,
                      step: 0.01,
                      theme: "normal",
                      suffix: "s",
                      onChange: _cache[2] || (_cache[2] = (val) => handleUpdateClip("startTime", Number(val)))
                    }, null, 8, ["value"])
                  ]),
                  createBaseVNode("div", _hoisted_19, [
                    createBaseVNode("label", _hoisted_20, toDisplayString(_ctx.$t("workbench.production.editVideo.endTime")), 1),
                    createVNode(_component_t_input_number, {
                      value: Number(selectedClip.value.endTime.toFixed(2)),
                      size: "small",
                      "decimal-places": 2,
                      step: 0.01,
                      theme: "normal",
                      suffix: "s",
                      onChange: _cache[3] || (_cache[3] = (val) => handleUpdateClip("endTime", Number(val)))
                    }, null, 8, ["value"])
                  ])
                ]),
                createBaseVNode("div", _hoisted_21, [
                  createBaseVNode("span", _hoisted_22, toDisplayString(_ctx.$t("workbench.production.editVideo.totalDuration")), 1),
                  createVNode(_component_t_tag, {
                    size: "small",
                    theme: "default",
                    variant: "outline"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString((selectedClip.value.endTime - selectedClip.value.startTime).toFixed(2)) + "s", 1)
                    ]),
                    _: 1
                  })
                ])
              ])
            ]),
            selectedClip.value.type === "video" ? (openBlock(), createElementBlock("div", _hoisted_23, [
              createBaseVNode("div", _hoisted_24, [
                createBaseVNode("div", _hoisted_25, [
                  createVNode(_component_i_video, {
                    theme: "outline",
                    size: "16"
                  })
                ]),
                createBaseVNode("span", _hoisted_26, toDisplayString(_ctx.$t("workbench.production.editVideo.videoProperties")), 1)
              ]),
              createBaseVNode("div", _hoisted_27, [
                createBaseVNode("div", _hoisted_28, [
                  createBaseVNode("div", _hoisted_29, [
                    createBaseVNode("label", _hoisted_30, toDisplayString(_ctx.$t("workbench.production.editVideo.opacity")), 1),
                    createBaseVNode("span", _hoisted_31, toDisplayString(Math.round(videoOpacity.value)) + "%", 1)
                  ]),
                  createVNode(_component_t_slider, {
                    modelValue: videoOpacity.value,
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => videoOpacity.value = $event),
                    min: 0,
                    max: 100,
                    step: 1,
                    onChange: _cache[5] || (_cache[5] = ($event) => handleUpdateClip("opacity", Math.round(videoOpacity.value) / 100))
                  }, null, 8, ["modelValue"])
                ]),
                createBaseVNode("div", _hoisted_32, [
                  createBaseVNode("div", _hoisted_33, [
                    createBaseVNode("label", _hoisted_34, toDisplayString(_ctx.$t("workbench.production.editVideo.volume")), 1),
                    createBaseVNode("span", _hoisted_35, toDisplayString(Math.round(videoVolume.value)) + "%", 1)
                  ]),
                  createVNode(_component_t_slider, {
                    modelValue: videoVolume.value,
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => videoVolume.value = $event),
                    min: 0,
                    max: 200,
                    step: 1,
                    onChange: _cache[7] || (_cache[7] = ($event) => handleUpdateClip("volume", Math.round(videoVolume.value) / 100))
                  }, null, 8, ["modelValue"])
                ]),
                createBaseVNode("div", _hoisted_36, [
                  createBaseVNode("label", _hoisted_37, toDisplayString(_ctx.$t("workbench.production.editVideo.playbackSpeed")), 1),
                  createVNode(_component_t_input_number, {
                    modelValue: videoSpeed.value,
                    "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => videoSpeed.value = $event),
                    size: "small",
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    "decimal-places": 1,
                    suffix: "x",
                    onChange: _cache[9] || (_cache[9] = (val) => handleUpdatePlaybackRate(Number(val)))
                  }, null, 8, ["modelValue"])
                ])
              ])
            ])) : createCommentVNode("", true),
            selectedClip.value.type === "audio" ? (openBlock(), createElementBlock("div", _hoisted_38, [
              createBaseVNode("div", _hoisted_39, [
                createBaseVNode("div", _hoisted_40, [
                  createVNode(_component_i_music, {
                    theme: "outline",
                    size: "16"
                  })
                ]),
                createBaseVNode("span", _hoisted_41, toDisplayString(_ctx.$t("workbench.production.editVideo.audioProperties")), 1)
              ]),
              createBaseVNode("div", _hoisted_42, [
                createBaseVNode("div", _hoisted_43, [
                  createBaseVNode("div", _hoisted_44, [
                    createBaseVNode("label", _hoisted_45, toDisplayString(_ctx.$t("workbench.production.editVideo.volume")), 1),
                    createBaseVNode("span", _hoisted_46, toDisplayString(Math.round(audioVolume.value)) + "%", 1)
                  ]),
                  createVNode(_component_t_slider, {
                    modelValue: audioVolume.value,
                    "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => audioVolume.value = $event),
                    min: 0,
                    max: 200,
                    step: 1,
                    onChange: _cache[11] || (_cache[11] = ($event) => handleUpdateClip("volume", Math.round(audioVolume.value) / 100))
                  }, null, 8, ["modelValue"])
                ]),
                createBaseVNode("div", _hoisted_47, [
                  createBaseVNode("div", _hoisted_48, [
                    createBaseVNode("label", _hoisted_49, toDisplayString(_ctx.$t("workbench.production.editVideo.fadeIn")), 1),
                    createVNode(_component_t_input_number, {
                      modelValue: audioFadeIn.value,
                      "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => audioFadeIn.value = $event),
                      size: "small",
                      min: 0,
                      step: 0.1,
                      "decimal-places": 1,
                      theme: "normal",
                      suffix: "s",
                      onChange: _cache[13] || (_cache[13] = ($event) => handleUpdateClip("fadeIn", audioFadeIn.value))
                    }, null, 8, ["modelValue"])
                  ]),
                  createBaseVNode("div", _hoisted_50, [
                    createBaseVNode("label", _hoisted_51, toDisplayString(_ctx.$t("workbench.production.editVideo.fadeOut")), 1),
                    createVNode(_component_t_input_number, {
                      modelValue: audioFadeOut.value,
                      "onUpdate:modelValue": _cache[14] || (_cache[14] = ($event) => audioFadeOut.value = $event),
                      size: "small",
                      min: 0,
                      step: 0.1,
                      "decimal-places": 1,
                      theme: "normal",
                      suffix: "s",
                      onChange: _cache[15] || (_cache[15] = ($event) => handleUpdateClip("fadeOut", audioFadeOut.value))
                    }, null, 8, ["modelValue"])
                  ])
                ])
              ])
            ])) : createCommentVNode("", true),
            selectedClip.value.type === "transition" ? (openBlock(), createElementBlock("div", _hoisted_52, [
              createBaseVNode("div", _hoisted_53, [
                createBaseVNode("div", _hoisted_54, [
                  createVNode(_component_i_exchange, {
                    theme: "outline",
                    size: "16"
                  })
                ]),
                createBaseVNode("span", _hoisted_55, toDisplayString(_ctx.$t("workbench.production.editVideo.transitionProperties")), 1)
              ]),
              createBaseVNode("div", _hoisted_56, [
                createBaseVNode("div", _hoisted_57, [
                  createBaseVNode("label", _hoisted_58, toDisplayString(_ctx.$t("workbench.production.editVideo.transitionType")), 1),
                  createVNode(_component_t_select, {
                    modelValue: transitionType.value,
                    "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => transitionType.value = $event),
                    size: "small",
                    onChange: _cache[17] || (_cache[17] = ($event) => handleUpdateClip("transitionType", transitionType.value))
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_option, {
                        value: "fade",
                        label: _ctx.$t("workbench.production.editVideo.transFade")
                      }, null, 8, ["label"]),
                      createVNode(_component_t_option, {
                        value: "slide",
                        label: _ctx.$t("workbench.production.editVideo.transSlide")
                      }, null, 8, ["label"]),
                      createVNode(_component_t_option, {
                        value: "wipe",
                        label: _ctx.$t("workbench.production.editVideo.transWipe")
                      }, null, 8, ["label"]),
                      createVNode(_component_t_option, {
                        value: "dissolve",
                        label: _ctx.$t("workbench.production.editVideo.transDissolve")
                      }, null, 8, ["label"]),
                      createVNode(_component_t_option, {
                        value: "zoom",
                        label: _ctx.$t("workbench.production.editVideo.transZoom")
                      }, null, 8, ["label"]),
                      createVNode(_component_t_option, {
                        value: "rotate",
                        label: _ctx.$t("workbench.production.editVideo.transRotate")
                      }, null, 8, ["label"])
                    ]),
                    _: 1
                  }, 8, ["modelValue"])
                ]),
                createBaseVNode("div", _hoisted_59, [
                  createBaseVNode("label", _hoisted_60, toDisplayString(_ctx.$t("workbench.production.editVideo.transitionDuration")), 1),
                  createVNode(_component_t_input_number, {
                    modelValue: transitionDuration.value,
                    "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event) => transitionDuration.value = $event),
                    size: "small",
                    min: 0.1,
                    max: 5,
                    step: 0.1,
                    "decimal-places": 1,
                    theme: "normal",
                    suffix: "s",
                    onChange: handleUpdateTransitionDuration
                  }, null, 8, ["modelValue"])
                ])
              ])
            ])) : createCommentVNode("", true),
            selectedClip.value.type === "subtitle" ? (openBlock(), createElementBlock("div", _hoisted_61, [
              createBaseVNode("div", _hoisted_62, [
                createBaseVNode("div", _hoisted_63, [
                  createVNode(_component_i_editor, {
                    theme: "outline",
                    size: "16"
                  })
                ]),
                createBaseVNode("span", _hoisted_64, toDisplayString(_ctx.$t("workbench.production.editVideo.subtitleProperties")), 1)
              ]),
              createBaseVNode("div", _hoisted_65, [
                createBaseVNode("div", _hoisted_66, [
                  createBaseVNode("label", _hoisted_67, toDisplayString(_ctx.$t("workbench.production.editVideo.textContent")), 1),
                  createVNode(_component_t_textarea, {
                    modelValue: subtitleText.value,
                    "onUpdate:modelValue": _cache[19] || (_cache[19] = ($event) => subtitleText.value = $event),
                    autosize: { minRows: 3, maxRows: 6 },
                    onChange: _cache[20] || (_cache[20] = ($event) => handleUpdateClip("text", subtitleText.value))
                  }, null, 8, ["modelValue"])
                ]),
                createBaseVNode("div", _hoisted_68, [
                  createBaseVNode("label", _hoisted_69, toDisplayString(_ctx.$t("workbench.production.editVideo.fontSize")), 1),
                  createVNode(_component_t_input_number, {
                    modelValue: subtitleFontSize.value,
                    "onUpdate:modelValue": _cache[21] || (_cache[21] = ($event) => subtitleFontSize.value = $event),
                    size: "small",
                    min: 12,
                    max: 72,
                    theme: "normal",
                    suffix: "px",
                    onChange: _cache[22] || (_cache[22] = ($event) => handleUpdateClip("fontSize", subtitleFontSize.value))
                  }, null, 8, ["modelValue"])
                ])
              ])
            ])) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_70, [
              createVNode(_component_t_button, {
                theme: "default",
                variant: "outline",
                block: "",
                onClick: handleDuplicateClip
              }, {
                icon: withCtx(() => [
                  createVNode(_component_i_copy, {
                    theme: "outline",
                    size: "16"
                  })
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.editVideo.copy")), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_button, {
                theme: "danger",
                variant: "text",
                block: "",
                onClick: handleDeleteClip
              }, {
                icon: withCtx(() => [
                  createVNode(_component_i_delete, {
                    theme: "outline",
                    size: "16"
                  })
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.editVideo.delete")), 1)
                ]),
                _: 1
              })
            ])
          ]))
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const propertyPanel = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-dcf6358a"]]);

const TRACK_NAME_KEYS = {
  video: "workbench.production.track.video",
  image: "workbench.production.track.image",
  audio: "workbench.production.track.audio",
  subtitle: "workbench.production.track.subtitle",
  text: "workbench.production.track.text",
  sticker: "workbench.production.track.sticker",
  filter: "workbench.production.track.filter",
  effect: "workbench.production.track.effect"
};
const DEFAULT_DURATIONS = {
  video: 5,
  image: 5,
  audio: 30,
  subtitle: 3,
  text: 3,
  sticker: 3,
  filter: 3,
  effect: 3,
  transition: 3
};
function getDefaultDuration(mediaType, mediaData) {
  if (mediaData.duration && mediaData.duration > 0) {
    return mediaData.duration;
  }
  return DEFAULT_DURATIONS[mediaType] || 3;
}
function hasSpaceInTrack(track, startTime, duration) {
  const endTime = startTime + duration;
  for (const clip of track.clips) {
    if (clip.type === "transition") continue;
    if (startTime < clip.endTime && endTime > clip.startTime) {
      return false;
    }
  }
  return true;
}
function findOrCreateTrackWithSpace(tracksStore, mediaType, startTime, duration, preferredTrackId) {
  if (preferredTrackId) {
    const preferredTrack = tracksStore.tracks.find((t) => t.id === preferredTrackId);
    if (preferredTrack && preferredTrack.type === mediaType) {
      if (hasSpaceInTrack(preferredTrack, startTime, duration)) {
        return { track: preferredTrack, isNew: false };
      }
    }
  }
  const sameTypeTracks = tracksStore.sortedTracks.filter((t) => t.type === mediaType && !t.isMain);
  for (const track of sameTypeTracks) {
    if (hasSpaceInTrack(track, startTime, duration)) {
      return { track, isNew: false };
    }
  }
  const trackCount = tracksStore.getTrackCountByType(mediaType);
  const newTrack = {
    id: _r("track-"),
    type: mediaType,
    name: `${TRACK_NAME_KEYS[mediaType] ? $t(TRACK_NAME_KEYS[mediaType]) : mediaType}${trackCount + 1}`,
    visible: true,
    locked: false,
    clips: [],
    order: tracksStore.tracks.length
  };
  tracksStore.addTrack(newTrack);
  return { track: newTrack, isNew: true };
}

async function loadVideoClipThumbnails(tracksStore, clipId, sourceUrl) {
  try {
    const result = await ca(sourceUrl, { count: 20, width: 120 });
    const clip = tracksStore.getClip(clipId);
    if (clip && clip.type === "video") {
      clip.thumbnails = result.thumbnails;
      if (result.duration > 0 && clip.endTime - clip.startTime <= 0) {
        clip.endTime = clip.startTime + result.duration;
        clip.originalDuration = result.duration;
        clip.trimEnd = result.duration;
      }
    }
  } catch (error) {
    console.error("Failed to load video thumbnails:", error);
  }
}
async function loadAudioClipWaveform(tracksStore, clipId, sourceUrl) {
  try {
    const isVideo = sourceUrl.match(/\.(mp4|webm|mov|avi)$/i);
    const result = isVideo ? await ua(sourceUrl, { samples: 500 }) : await da(sourceUrl, { samples: 500 });
    const clip = tracksStore.getClip(clipId);
    if (clip && clip.type === "audio") {
      clip.waveformData = result.waveformData;
      if (result.duration > 0) {
        clip.originalDuration = result.duration;
        const clipDuration = clip.endTime - clip.startTime;
        if (clipDuration <= 0) {
          clip.endTime = clip.startTime + result.duration;
          clip.trimEnd = result.duration;
        }
        if (clip.trimEnd > result.duration) {
          clip.trimEnd = result.duration;
        }
      }
    }
  } catch (error) {
    console.error("Failed to load audio waveform:", error);
  }
}
async function loadInitialAudioWaveforms(tracksStore) {
  for (const track of tracksStore.tracks) {
    for (const clip of track.clips) {
      if (clip.type === "audio") {
        const mediaClip = clip;
        if (!mediaClip.waveformData || mediaClip.waveformData.length === 0) {
          await loadAudioClipWaveform(tracksStore, mediaClip.id, mediaClip.sourceUrl);
        }
      }
    }
  }
}

const TRANSITION_NAME_KEYS = {
  fade: "workbench.production.transition.fade",
  slide: "workbench.production.transition.slide",
  wipe: "workbench.production.transition.wipe",
  dissolve: "workbench.production.transition.dissolve",
  zoom: "workbench.production.transition.zoom",
  rotate: "workbench.production.transition.rotate"
};
function findAdjacentClipsAtTime(clips, dropTime) {
  const targetClip = clips.find((c) => dropTime >= c.startTime && dropTime <= c.endTime);
  if (targetClip) {
    const clipMidPoint = (targetClip.startTime + targetClip.endTime) / 2;
    const targetIndex = clips.indexOf(targetClip);
    if (dropTime < clipMidPoint) {
      if (targetIndex > 0) {
        const prevClip = clips[targetIndex - 1];
        if (Math.abs(prevClip.endTime - targetClip.startTime) < 0.1) {
          return { beforeClip: prevClip, afterClip: targetClip };
        }
      }
    } else {
      if (targetIndex < clips.length - 1) {
        const nextClip = clips[targetIndex + 1];
        if (Math.abs(targetClip.endTime - nextClip.startTime) < 0.1) {
          return { beforeClip: targetClip, afterClip: nextClip };
        }
      }
    }
  } else {
    for (let i = 0; i < clips.length - 1; i++) {
      if (clips[i].endTime <= dropTime && clips[i + 1].startTime >= dropTime) {
        if (Math.abs(clips[i].endTime - clips[i + 1].startTime) < 0.1) {
          return { beforeClip: clips[i], afterClip: clips[i + 1] };
        }
      }
    }
  }
  return null;
}
function addTransitionBetweenClips(tracksStore, historyStore, beforeClipId, afterClipId, transitionType = "fade") {
  const beforeClip = tracksStore.getClip(beforeClipId);
  const afterClip = tracksStore.getClip(afterClipId);
  if (!beforeClip || !afterClip) {
    console.error("未找到clip");
    return null;
  }
  const track = tracksStore.tracks.find((t) => t.id === beforeClip.trackId);
  if (!track) return null;
  const hasExistingTransition = track.clips.some(
    (c) => c.type === "transition" && c.startTime < beforeClip.endTime && c.endTime > beforeClip.endTime
  );
  if (hasExistingTransition) {
    window.$message.warning($t("workbench.production.editVideo.transitionExists"));
    return null;
  }
  const transitionDuration = 1;
  const transitionClip = {
    id: _r("clip-"),
    trackId: beforeClip.trackId,
    type: "transition",
    startTime: ct(beforeClip.endTime - transitionDuration / 2),
    endTime: ct(afterClip.startTime + transitionDuration / 2),
    selected: false,
    transitionType,
    transitionDuration: ct(transitionDuration),
    name: TRANSITION_NAME_KEYS[transitionType] ? $t(TRANSITION_NAME_KEYS[transitionType]) : transitionType
  };
  tracksStore.addClip(beforeClip.trackId, transitionClip);
  historyStore.pushSnapshot($t("workbench.production.editVideo.addTransition"));
  tracksStore.clearSelection();
  return { transitionClip, beforeClip, afterClip };
}

const _hoisted_1 = { class: "editVideo" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    initialTracks: { default: () => [] },
    initialVideoItems: {},
    initialMediaItems: { default: () => [] },
    initialAudioItems: { default: () => [] },
    initialImageItems: { default: () => [] },
    canvasWidth: { default: 1920 },
    canvasHeight: { default: 1080 }
  },
  setup(__props) {
    setupWebavLog();
    const props = __props;
    const aspectRatio = computed(() => props.canvasWidth / props.canvasHeight);
    const previewWrapperRef = ref();
    const wrapperSize = reactive({ width: 0, height: 0 });
    let resizeObserver = null;
    const previewStyle = computed(() => {
      const { width: cw, height: ch } = wrapperSize;
      if (cw <= 0 || ch <= 0) return {};
      const ratio = aspectRatio.value;
      if (cw / ch > ratio) {
        return { height: ch + "px", width: Math.floor(ch * ratio) + "px" };
      }
      return { width: cw + "px", height: Math.floor(cw / ratio) + "px" };
    });
    const tracksStore = Ht();
    const playbackStore = Ne();
    const historyStore = ti();
    const operationButtons = ref([
      { type: "custom", key: "reset" },
      { type: "custom", key: "undo" },
      { type: "custom", key: "redo" },
      { type: "custom", key: "split" },
      { type: "custom", key: "delete" },
      { type: "custom", key: "import" }
    ]);
    const scaleConfigButtons = ref(["snap"]);
    const trackTypes = ref({
      video: { max: 5 },
      image: { max: 3 },
      audio: { max: 3 },
      subtitle: { max: 2 },
      text: { max: 2 },
      sticker: { max: 2 },
      filter: { max: 1 },
      effect: { max: 2 }
    });
    const clipConfigs = ref({
      video: {
        backgroundColor: "linear-gradient(45deg, #667eea 0%, #764ba2 100%)",
        borderColor: "#000000",
        height: 60,
        selected: {
          borderColor: "#ff6b6b",
          boxShadow: "0 0 0 3px rgba(255, 107, 107, 0.3)"
        }
      },
      audio: {
        backgroundColor: "linear-gradient(45deg, #f093fb 0%, #f5576c 100%)",
        height: 36,
        selected: {
          borderColor: "#4ecdc4"
        }
      },
      image: {
        backgroundColor: "linear-gradient(45deg, #43e97b 0%, #38f9d7 100%)",
        borderColor: "#43e97b",
        height: 60,
        selected: {
          borderColor: "#ff6b6b",
          boxShadow: "0 0 0 3px rgba(255, 107, 107, 0.3)"
        }
      }
    });
    const videoTrackRef = ref();
    const videoPreviewRef = ref();
    const isExporting = ref(false);
    async function handleExport() {
      if (!videoPreviewRef.value) return;
      if (isExporting.value) return;
      isExporting.value = true;
      try {
        await videoPreviewRef.value.exportVideo();
        window.$message.success($t("workbench.production.editVideo.exportSuccess"));
      } catch (error) {
        if (error.name === "AbortError") return;
        window.$message.error(error.message || $t("workbench.production.editVideo.exportFailed"));
      } finally {
        isExporting.value = false;
      }
    }
    function handleSplit() {
      const selectedIds = Array.from(tracksStore.selectedClipIds);
      if (selectedIds.length === 0) return;
      const currentTime = playbackStore.currentTime;
      selectedIds.forEach((id) => {
        const clip = tracksStore.getClip(id);
        if (!clip || currentTime <= clip.startTime || currentTime >= clip.endTime) return;
        tracksStore.splitClip(id, currentTime);
      });
      historyStore.pushSnapshot($t("workbench.production.editVideo.splitClip"));
    }
    function handleDeleteClips() {
      const selectedIds = Array.from(tracksStore.selectedClipIds);
      if (selectedIds.length === 0) return;
      tracksStore.removeClips(selectedIds);
      historyStore.pushSnapshot($t("workbench.production.editVideo.deleteClip"));
    }
    async function handleDropMedia(mediaData, trackId, startTime) {
      try {
        if (mediaData.type === "transition") {
          handleDropTransition(mediaData, trackId, startTime);
          return;
        }
        const duration = getDefaultDuration(mediaData.type, mediaData);
        const { track } = findOrCreateTrackWithSpace(tracksStore, mediaData.type, startTime, duration, trackId);
        if (!track) return;
        let clip = {
          id: _r("clip-"),
          trackId: track.id,
          startTime: ct(startTime),
          selected: false
        };
        if (mediaData.type === "video") {
          const sourceUrl = mediaData.sourceUrl || mediaData.url || mediaData.id;
          clip = {
            ...clip,
            type: "video",
            name: mediaData.name,
            endTime: ct(startTime + duration),
            sourceUrl,
            originalDuration: duration,
            trimStart: 0,
            trimEnd: duration,
            playbackRate: 1,
            thumbnails: mediaData.thumbnails || []
          };
          tracksStore.addClip(track.id, clip);
          historyStore.pushSnapshot($t("workbench.production.editVideo.addClip", { name: mediaData.name }));
          if (!mediaData.thumbnails || mediaData.thumbnails.length === 0) {
            loadVideoClipThumbnails(tracksStore, clip.id, sourceUrl);
          }
          return;
        } else if (mediaData.type === "image") {
          const sourceUrl = mediaData.sourceUrl || mediaData.url || mediaData.id;
          clip = {
            ...clip,
            type: "image",
            name: mediaData.name,
            endTime: ct(startTime + duration),
            sourceUrl,
            originalDuration: duration,
            trimStart: 0,
            trimEnd: duration,
            playbackRate: 1,
            thumbnails: mediaData.thumbnail ? [mediaData.thumbnail] : []
          };
          tracksStore.addClip(track.id, clip);
          historyStore.pushSnapshot($t("workbench.production.editVideo.addClip", { name: mediaData.name }));
          return;
        } else if (mediaData.type === "audio") {
          const sourceUrl = mediaData.sourceUrl || mediaData.url || mediaData.id;
          clip = {
            ...clip,
            type: "audio",
            name: mediaData.name,
            endTime: ct(startTime + duration),
            sourceUrl,
            originalDuration: duration,
            trimStart: 0,
            trimEnd: duration,
            playbackRate: 1,
            volume: 1,
            waveformData: mediaData.waveformData || []
          };
          tracksStore.addClip(track.id, clip);
          historyStore.pushSnapshot($t("workbench.production.editVideo.addClip", { name: mediaData.name }));
          if (!mediaData.waveformData || mediaData.waveformData.length === 0) {
            loadAudioClipWaveform(tracksStore, clip.id, sourceUrl);
          }
          return;
        } else if (mediaData.type === "subtitle") {
          clip = {
            ...clip,
            type: "subtitle",
            name: mediaData.name,
            endTime: ct(startTime + duration),
            text: $t("workbench.production.editVideo.sampleSubtitle")
          };
        } else if (mediaData.type === "text") {
          clip = {
            ...clip,
            type: "text",
            name: mediaData.name,
            endTime: ct(startTime + duration),
            text: $t("workbench.production.editVideo.customText")
          };
        } else if (mediaData.type === "sticker") {
          clip = { ...clip, type: "sticker", name: mediaData.name, endTime: ct(startTime + duration), sourceUrl: mediaData.id };
        } else if (mediaData.type === "filter") {
          clip = {
            ...clip,
            type: "filter",
            name: mediaData.name,
            endTime: ct(startTime + duration),
            filterType: mediaData.filterType || mediaData.id,
            filterValue: mediaData.filterValue ?? 1
          };
        } else if (mediaData.type === "effect") {
          clip = {
            ...clip,
            type: "effect",
            name: mediaData.name,
            endTime: ct(startTime + duration),
            effectType: mediaData.effectType || mediaData.id,
            effectDuration: duration
          };
        }
        tracksStore.addClip(track.id, clip);
        historyStore.pushSnapshot($t("workbench.production.editVideo.addClip", { name: mediaData.name }));
      } catch (error) {
        alert(error.message);
      }
    }
    function handleDropTransition(transitionData, trackId, dropTime) {
      const track = tracksStore.tracks.find((t) => t.id === trackId);
      if (!track) return;
      const clips = track.clips.filter((c) => c.type !== "transition").sort((a, b) => a.startTime - b.startTime);
      if (clips.length === 0) {
        window.$message.warning($t("workbench.production.editVideo.transitionBetweenClips"));
        return;
      }
      const result = findAdjacentClipsAtTime(clips, dropTime);
      if (!result) {
        window.$message.warning($t("workbench.production.editVideo.transitionBetweenClips"));
        return;
      }
      applyTransition(result.beforeClip.id, result.afterClip.id, transitionData.subType);
    }
    function handleAddTransitionFromClick(beforeClipId, afterClipId) {
      applyTransition(beforeClipId, afterClipId, "fade");
    }
    function applyTransition(beforeClipId, afterClipId, transitionType = "fade") {
      const result = addTransitionBetweenClips(tracksStore, historyStore, beforeClipId, afterClipId, transitionType);
      if (result) {
        if (videoTrackRef.value) {
          videoTrackRef.value.emitTransitionAdded(result.transitionClip, result.beforeClip.id, result.afterClip.id);
        }
      }
    }
    function onTransitionAdded(transitionClip, beforeClipId, afterClipId) {
      window.$message.success($t("workbench.production.editVideo.transitionAdded", { name: transitionClip.name }));
      playbackStore.seekTo(transitionClip.startTime);
    }
    function initializeTracks() {
      tracksStore.reset();
      if (props.initialTracks.length > 0) {
        props.initialTracks.forEach((track) => {
          tracksStore.addTrack(track);
        });
      }
      playbackStore.setDuration(60 * 5);
      playbackStore.seekTo(0);
      historyStore.initialize();
      loadInitialAudioWaveforms(tracksStore);
    }
    onMounted(() => {
      initializeTracks();
      if (previewWrapperRef.value) {
        resizeObserver = new ResizeObserver((entries) => {
          const entry = entries[0];
          if (entry) {
            wrapperSize.width = entry.contentRect.width;
            wrapperSize.height = entry.contentRect.height;
          }
        });
        resizeObserver.observe(previewWrapperRef.value);
      }
    });
    onUnmounted(() => {
      playbackStore.pause();
      resizeObserver?.disconnect();
    });
    return (_ctx, _cache) => {
      const _component_i_refresh = resolveComponent("i-refresh");
      const _component_t_button = Button;
      const _component_i_undo = resolveComponent("i-undo");
      const _component_i_redo = resolveComponent("i-redo");
      const _component_i_cutting_one = resolveComponent("i-cutting-one");
      const _component_i_delete = resolveComponent("i-delete");
      const _component_i_export = resolveComponent("i-export");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(unref(Pe), {
          class: "default-theme content",
          horizontal: "",
          "push-other-panes": false
        }, {
          default: withCtx(() => [
            createVNode(unref(ge), { size: "60" }, {
              default: withCtx(() => [
                createVNode(unref(Pe), { "push-other-panes": false }, {
                  default: withCtx(() => [
                    createVNode(unref(ge), {
                      size: "20",
                      "min-size": "10"
                    }, {
                      default: withCtx(() => [
                        createVNode(mediaLibrary, {
                          "initial-video-items": __props.initialVideoItems,
                          "initial-media-items": __props.initialMediaItems,
                          "initial-audio-items": __props.initialAudioItems,
                          "initial-image-items": __props.initialImageItems
                        }, null, 8, ["initial-video-items", "initial-media-items", "initial-audio-items", "initial-image-items"])
                      ]),
                      _: 1
                    }),
                    createVNode(unref(ge), {
                      size: "60",
                      "min-size": "20"
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", {
                          ref_key: "previewWrapperRef",
                          ref: previewWrapperRef,
                          class: "previewWrapper"
                        }, [
                          createVNode(videoPreview, {
                            ref_key: "videoPreviewRef",
                            ref: videoPreviewRef,
                            "canvas-width": __props.canvasWidth,
                            "canvas-height": __props.canvasHeight,
                            style: normalizeStyle(unref(previewStyle))
                          }, null, 8, ["canvas-width", "canvas-height", "style"])
                        ], 512)
                      ]),
                      _: 1
                    }),
                    createVNode(unref(ge), {
                      size: "20",
                      "min-size": "10"
                    }, {
                      default: withCtx(() => [
                        createVNode(propertyPanel)
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }),
            createVNode(unref(ge), {
              size: "40",
              class: "pr"
            }, {
              default: withCtx(() => [
                createVNode(unref(Fo), {
                  class: "videoTrack",
                  ref_key: "videoTrackRef",
                  ref: videoTrackRef,
                  "operation-buttons": unref(operationButtons),
                  "scale-config-buttons": unref(scaleConfigButtons),
                  "track-types": unref(trackTypes),
                  "clip-configs": unref(clipConfigs),
                  "enable-main-track-mode": true,
                  "enable-cross-track-drag": true,
                  "enable-snap": true,
                  "default-scale": 1,
                  onAddTransition: handleAddTransitionFromClick,
                  onDropMedia: handleDropMedia,
                  onTransitionAdded
                }, {
                  "custom-operation-reset": withCtx(() => [
                    createVNode(_component_t_button, {
                      variant: "text",
                      size: "small",
                      onClick: _cache[0] || (_cache[0] = ($event) => unref(videoTrackRef)?.reset()),
                      title: _ctx.$t("workbench.production.editVideo.reset")
                    }, {
                      icon: withCtx(() => [
                        createVNode(_component_i_refresh, { size: "16" })
                      ]),
                      default: withCtx(() => [
                        createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.editVideo.reset")), 1)
                      ]),
                      _: 1
                    }, 8, ["title"])
                  ]),
                  "custom-operation-undo": withCtx(() => [
                    createVNode(_component_t_button, {
                      variant: "text",
                      size: "small",
                      disabled: !unref(historyStore).canUndo,
                      onClick: _cache[1] || (_cache[1] = ($event) => unref(historyStore).undo()),
                      title: _ctx.$t("workbench.production.editVideo.undo")
                    }, {
                      icon: withCtx(() => [
                        createVNode(_component_i_undo, { size: "16" })
                      ]),
                      default: withCtx(() => [
                        createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.editVideo.undo")), 1)
                      ]),
                      _: 1
                    }, 8, ["disabled", "title"])
                  ]),
                  "custom-operation-redo": withCtx(() => [
                    createVNode(_component_t_button, {
                      variant: "text",
                      size: "small",
                      disabled: !unref(historyStore).canRedo,
                      onClick: _cache[2] || (_cache[2] = ($event) => unref(historyStore).redo()),
                      title: _ctx.$t("workbench.production.editVideo.redo")
                    }, {
                      icon: withCtx(() => [
                        createVNode(_component_i_redo, { size: "16" })
                      ]),
                      default: withCtx(() => [
                        createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.editVideo.redo")), 1)
                      ]),
                      _: 1
                    }, 8, ["disabled", "title"])
                  ]),
                  "custom-operation-split": withCtx(() => [
                    createVNode(_component_t_button, {
                      variant: "text",
                      size: "small",
                      disabled: unref(tracksStore).selectedClipIds.size === 0,
                      onClick: handleSplit,
                      title: _ctx.$t("workbench.production.editVideo.split")
                    }, {
                      icon: withCtx(() => [
                        createVNode(_component_i_cutting_one, { size: "16" })
                      ]),
                      default: withCtx(() => [
                        createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.editVideo.split")), 1)
                      ]),
                      _: 1
                    }, 8, ["disabled", "title"])
                  ]),
                  "custom-operation-delete": withCtx(() => [
                    createVNode(_component_t_button, {
                      variant: "text",
                      size: "small",
                      onClick: handleDeleteClips,
                      title: _ctx.$t("workbench.production.editVideo.delete")
                    }, {
                      icon: withCtx(() => [
                        createVNode(_component_i_delete, { size: "16" })
                      ]),
                      default: withCtx(() => [
                        createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.editVideo.delete")), 1)
                      ]),
                      _: 1
                    }, 8, ["title"])
                  ]),
                  "scale-append": withCtx(() => [
                    createVNode(_component_t_button, {
                      theme: "danger",
                      onClick: handleExport,
                      loading: unref(isExporting),
                      title: _ctx.$t("workbench.production.editVideo.exportProject")
                    }, {
                      icon: withCtx(() => [
                        createVNode(_component_i_export, {
                          size: "16",
                          style: { "margin-right": "4px" }
                        })
                      ]),
                      default: withCtx(() => [
                        createTextVNode(" " + toDisplayString(unref(isExporting) ? _ctx.$t("workbench.production.editVideo.rendering") : _ctx.$t("workbench.production.editVideo.exportVideo")), 1)
                      ]),
                      _: 1
                    }, 8, ["loading", "title"])
                  ]),
                  _: 1
                }, 8, ["operation-buttons", "scale-config-buttons", "track-types", "clip-configs"])
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-5a596c4a"]]);

export { index as default };

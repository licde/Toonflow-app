import { u as useVueFlow, c as _sfc_main$f, P as Position, d as _sfc_main$d, e as _sfc_main$3$1, g as getBezierPath, a as _sfc_main$5, b as _sfc_main$6, f as _sfc_main$7, _ as _sfc_main$1$1 } from './vueflow-BeRgUeVC.js';
import { I as ImageTools } from './imageTools-CXYQW4aj.js';
import { o as openAssetsSelector } from './assetsCheck-f3IiWWtt.js';
import { a8 as Image, w as Dropdown, B as Button, a5 as Popup, n as Tooltip, K as Select, O as Option, E as Dialog, R as Input, I as Icon, Z as Table, G as ImageViewer, W as DialogPlugin } from './tdesign-C157N6jJ.js';
import { l as defineComponent, a as inject, r as ref, w as watch, e as onBeforeUnmount, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, j as createVNode, a1 as unref, aO as createBaseVNode, aM as withCtx, b0 as toDisplayString, a$ as createTextVNode, aS as createBlock, aT as createCommentVNode, bM as storeToRefs, bY as useFileDialog, o as onMounted, aU as normalizeClass, E as withDirectives, G as vShow, F as Fragment, aP as renderList, bH as withModifiers, c as computed, bU as useModel, av as isRef, bV as mergeModels, aQ as normalizeStyle, n as nextTick, bF as normalizeProps, bG as guardReactiveProps, p as provide } from './vue-vendor-Cj7sXJnb.js';
import { _ as _export_sfc } from './index-DsDM6Bax.js';
import { _ as __unplugin_components_0 } from './modelSelect-Bj3Bcvu6.js';
import { p as promptEditor } from './promptEditor-DxIMRlZa.js';
import { i as instance } from './axios-B2i2rFrf.js';
import { p as projectStore } from './project-C_OB2JAu.js';
import { d as dayjs } from './dayjs-CuToSpIM.js';
import { u as useLayout } from './index-CLky1BFL.js';

const _hoisted_1$4 = { class: "uploadNode" };
const _hoisted_2$3 = { class: "data" };
const _hoisted_3$2 = { class: "title ac" };
const _hoisted_4$2 = { class: "imageBox" };
const _hoisted_5$2 = { class: "imageToolsWrap" };
const _hoisted_6$2 = { class: "upload ac" };
const _hoisted_7$2 = { style: { "margin-left": "5px", "color": "#fff" } };
const _hoisted_8$2 = {
  class: "fc ac",
  style: { "gap": "6px" }
};
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "uploadNode",
  props: {
    id: {},
    data: {}
  },
  emits: ["upload", "keep"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const openStoryboardCheck = inject("openStoryboardCheck");
    const { updateNodeData, removeNodes } = useVueFlow("editImage");
    const currentImageUrl = ref(props.data?.image || "");
    const currentObjectUrl = ref(null);
    const options = [
      { content: $t("workbench.production.editImage.uploadImage"), value: 1 },
      { content: $t("workbench.production.editImage.uploadStoryboardImage"), value: 2 }
    ];
    watch(
      () => props.data?.image,
      (newUrl) => {
        currentImageUrl.value = newUrl || "";
      }
    );
    onBeforeUnmount(() => {
      if (currentObjectUrl.value) {
        URL.revokeObjectURL(currentObjectUrl.value);
      }
    });
    function removeFn() {
      removeNodes(props.id);
    }
    const emit = __emit;
    function clickHandler(data) {
      if (data.value == 1) {
        uploadFn();
      } else if (data.value == 2) {
        getStoryboardImage();
      }
    }
    function handleKeep() {
      if (!currentImageUrl.value) return window.$message.error($t("workbench.production.editImage.noImage"));
      emit("keep", currentImageUrl.value);
    }
    async function uploadFn() {
      const selectedAssets = await openAssetsSelector({
        multiple: false,
        title: $t("workbench.production.editImage.selectImage")
      });
      if (selectedAssets.length > 0) {
        const filePath = selectedAssets[0].src;
        currentImageUrl.value = filePath;
        updateNodeData(props.id, { image: filePath });
        emit("upload");
      }
    }
    async function getStoryboardImage() {
      const rows = await openStoryboardCheck();
      if (rows.length > 0) {
        const filePath = rows[0].src;
        currentImageUrl.value = filePath;
        updateNodeData(props.id, { image: filePath });
        emit("upload");
      }
    }
    return (_ctx, _cache) => {
      const _component_i_pic = resolveComponent("i-pic");
      const _component_ImageTools = ImageTools;
      const _component_t_image = Image;
      const _component_i_upload = resolveComponent("i-upload");
      const _component_t_button = Button;
      const _component_t_dropdown = Dropdown;
      const _component_i_save = resolveComponent("i-save");
      const _component_t_popup = Popup;
      const _component_i_delete = resolveComponent("i-delete");
      const _component_t_tooltip = Tooltip;
      return openBlock(), createElementBlock("div", _hoisted_1$4, [
        createVNode(unref(_sfc_main$f), {
          type: "source",
          position: unref(Position).Right,
          style: { "z-index": "999999" }
        }, null, 8, ["position"]),
        createBaseVNode("div", _hoisted_2$3, [
          createBaseVNode("div", _hoisted_3$2, [
            createVNode(_component_i_pic, {
              theme: "outline",
              size: "16",
              fill: "#000000"
            }),
            _cache[0] || (_cache[0] = createBaseVNode("span", { style: { "margin-left": "5px", "color": "#4b4b4b" } }, "Image", -1))
          ]),
          createBaseVNode("div", _hoisted_4$2, [
            createVNode(_component_t_image, {
              class: "image",
              src: currentImageUrl.value,
              fit: "contain",
              style: {
                width: "100%",
                height: "100%",
                borderRadius: "10px"
              }
            }, {
              overlayContent: withCtx(() => [
                createBaseVNode("div", _hoisted_5$2, [
                  createVNode(_component_ImageTools, {
                    src: currentImageUrl.value,
                    position: "br"
                  }, null, 8, ["src"])
                ])
              ]),
              _: 1
            }, 8, ["src"]),
            createVNode(_component_t_dropdown, {
              options,
              onClick: clickHandler
            }, {
              content: withCtx(() => [
                createBaseVNode("div", _hoisted_8$2, [
                  createVNode(_component_t_button, {
                    variant: "outline",
                    onClick: uploadFn
                  }, {
                    default: withCtx(() => [..._cache[1] || (_cache[1] = [
                      createTextVNode("资产图片", -1)
                    ])]),
                    _: 1
                  }),
                  createVNode(_component_t_button, {
                    variant: "outline",
                    onClick: getStoryboardImage
                  }, {
                    default: withCtx(() => [..._cache[2] || (_cache[2] = [
                      createTextVNode("分镜图片", -1)
                    ])]),
                    _: 1
                  })
                ])
              ]),
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_6$2, [
                  createVNode(_component_i_upload, {
                    theme: "outline",
                    size: "18",
                    fill: "#fff"
                  }),
                  createBaseVNode("span", _hoisted_7$2, toDisplayString(_ctx.$t("workbench.production.editImage.upload")), 1)
                ])
              ]),
              _: 1
            }),
            createVNode(_component_t_popup, {
              content: _ctx.$t("workbench.production.save")
            }, {
              default: withCtx(() => [
                currentImageUrl.value ? (openBlock(), createBlock(_component_t_button, {
                  key: 0,
                  theme: "primary",
                  size: "small",
                  class: "keepBottomLeftBtn",
                  onClick: handleKeep
                }, {
                  icon: withCtx(() => [
                    createVNode(_component_i_save)
                  ]),
                  _: 1
                })) : createCommentVNode("", true)
              ]),
              _: 1
            }, 8, ["content"]),
            createVNode(_component_t_tooltip, {
              theme: "primary",
              content: _ctx.$t("workbench.production.editImage.deleteNode")
            }, {
              default: withCtx(() => [
                createBaseVNode("div", {
                  class: "remove ac",
                  onClick: removeFn
                }, [
                  createVNode(_component_i_delete, {
                    theme: "outline",
                    size: "18",
                    fill: "#fff"
                  })
                ])
              ]),
              _: 1
            }, 8, ["content"])
          ])
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const uploadNode = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-ed6fb585"]]);

const DEFAULT_EDGE_OPTIONS = {
  type: "removeLine",
  animated: true,
  style: { stroke: "#00000" }
};
function createGeneratedData(image = "", prompt = "") {
  return {
    generatedImage: image,
    references: [],
    prompt,
    model: "",
    ratio: "",
    quality: "",
    steps: 49
  };
}
function cleanNodes(nodes) {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.type === "upload" ? { image: n.data.image } : {
      generatedImage: n.data.generatedImage,
      references: n.data.references?.map((r) => ({ image: r.image })) ?? [],
      prompt: n.data.prompt,
      model: n.data.model,
      ratio: n.data.ratio,
      quality: n.data.quality
    }
  }));
}
function cleanEdges(edges) {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target
  }));
}

const _hoisted_1$3 = { class: "generatedNode" };
const _hoisted_2$2 = { class: "title ac" };
const _hoisted_3$1 = { class: "titleText" };
const _hoisted_4$1 = { class: "image" };
const _hoisted_5$1 = {
  key: 0,
  class: "imageLoading"
};
const _hoisted_6$1 = { class: "loadingText" };
const _hoisted_7$1 = {
  key: 1,
  class: "imageWrapper"
};
const _hoisted_8$1 = { class: "imageToolsWrap" };
const _hoisted_9$1 = { class: "upload ac" };
const _hoisted_10$1 = { style: { "margin-left": "5px", "color": "#fff" } };
const _hoisted_11$1 = { class: "imageRefs f w" };
const _hoisted_12 = { class: "text w" };
const _hoisted_13 = { class: "operate ac jb" };
const _hoisted_14 = { class: "ac" };
const _hoisted_15 = {
  class: "f",
  style: { "gap": "5px", "margin-left": "5px" }
};
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "generatedNode",
  props: {
    id: {},
    data: {},
    projectId: {}
  },
  emits: ["keep"],
  setup(__props, { emit: __emit }) {
    const { project } = storeToRefs(projectStore());
    const openStoryboardCheck = inject("openStoryboardCheck");
    const { open, onChange, onCancel } = useFileDialog({ multiple: false, reset: true, accept: ".png,.jpg,.jpeg" });
    const selected = ref(true);
    const generating = ref(false);
    const episodesId = inject("episodesId");
    const emit = __emit;
    const { removeNodes } = useVueFlow("editImage");
    const options = [
      { content: $t("workbench.production.editImage.uploadImage"), value: 1 },
      { content: $t("workbench.production.editImage.uploadStoryboardImage"), value: 2 },
      { content: $t("workbench.production.generatedNode.localUpload"), value: 3 }
    ];
    const references = computed(() => {
      return props.data.references.map((i) => ({ type: "image", src: i.image })).filter(Boolean);
    });
    const props = __props;
    function selectedFn() {
      selected.value = !selected.value;
    }
    function clickHandler(data) {
      if (data.value == 1) {
        uploadFn();
      } else if (data.value == 2) {
        getStoryboardImage();
      } else if (data.value == 3) {
        lensImage();
      }
    }
    async function lensImage() {
      const files = await new Promise((resolve) => {
        open();
        onChange((f) => resolve(f));
        onCancel(() => resolve(null));
      });
      if (!files?.length) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        try {
          const { data } = await instance.post("/production/editImage/uploadImage", {
            base64Data: base64,
            projectId: props.projectId,
            scriptId: episodesId.value
          });
          props.data.generatedImage = data;
        } catch (e) {
          return window.$message.error(e?.message || $t("workbench.production.editImage.uploadFailed"));
        }
      };
      reader.readAsDataURL(file);
    }
    async function uploadFn() {
      const selectedAssets = await openAssetsSelector({
        multiple: false,
        title: $t("workbench.production.editImage.selectImage")
      });
      if (selectedAssets.length > 0) {
        const filePath = selectedAssets[0].src;
        props.data.generatedImage = filePath;
      }
    }
    async function getStoryboardImage() {
      const rows = await openStoryboardCheck();
      if (rows.length > 0) {
        const filePath = rows[0].src;
        props.data.generatedImage = filePath;
      }
    }
    async function handleGenerate() {
      if (!props.data.model) return window.$message.error($t("workbench.production.editImage.selectModel"));
      if (!props.data.quality) return window.$message.error($t("workbench.production.editImage.selectQuality"));
      if (!props.data.ratio) return window.$message.error($t("workbench.production.editImage.selectRatio"));
      generating.value = true;
      try {
        const { data } = await instance.post("/production/editImage/generateFlowImage", {
          references: props.data.references.map((i) => i.image).filter(Boolean),
          model: props.data.model,
          quality: props.data.quality,
          ratio: props.data.ratio,
          prompt: props.data.prompt,
          projectId: props.projectId
        });
        props.data.generatedImage = data.url;
      } catch (e) {
        return window.$message.error(e?.message || $t("workbench.production.editImage.generateFailed"));
      } finally {
        generating.value = false;
      }
    }
    function handleKeep() {
      if (!props.data.generatedImage) return window.$message.error($t("workbench.production.editImage.generateFirst"));
      emit("keep", props.data.generatedImage);
    }
    onMounted(() => {
      props.data.model = project.value?.imageModel ?? "";
      props.data.quality = project.value?.imageQuality ?? "";
      props.data.ratio = project.value?.videoRatio ?? "16:9";
    });
    return (_ctx, _cache) => {
      const _component_i_pic = resolveComponent("i-pic");
      const _component_ImageTools = ImageTools;
      const _component_t_image = Image;
      const _component_i_upload = resolveComponent("i-upload");
      const _component_t_dropdown = Dropdown;
      const _component_i_delete = resolveComponent("i-delete");
      const _component_t_tooltip = Tooltip;
      const _component_t_option = Option;
      const _component_t_select = Select;
      const _component_i_arrow_up = resolveComponent("i-arrow-up");
      const _component_t_button = Button;
      const _component_t_popup = Popup;
      const _component_i_save = resolveComponent("i-save");
      return openBlock(), createElementBlock("div", _hoisted_1$3, [
        createVNode(unref(_sfc_main$f), {
          type: "target",
          position: unref(Position).Left
        }, null, 8, ["position"]),
        createBaseVNode("div", {
          class: "data",
          onClick: selectedFn
        }, [
          createBaseVNode("div", _hoisted_2$2, [
            createVNode(_component_i_pic, {
              theme: "outline",
              size: "16",
              fill: "#000000"
            }),
            createBaseVNode("span", _hoisted_3$1, toDisplayString(_ctx.$t("workbench.production.editImage.imageGeneration")), 1)
          ]),
          createBaseVNode("div", _hoisted_4$1, [
            unref(generating) ? (openBlock(), createElementBlock("div", _hoisted_5$1, [
              _cache[7] || (_cache[7] = createBaseVNode("div", { class: "loadingSpinner" }, null, -1)),
              createBaseVNode("span", _hoisted_6$1, toDisplayString(_ctx.$t("workbench.production.editImage.generating")), 1)
            ])) : (openBlock(), createElementBlock("div", _hoisted_7$1, [
              createVNode(_component_t_image, {
                class: normalizeClass(["image", ["nodeImage", { selected: unref(selected) }]]),
                src: __props.data.generatedImage,
                fit: "contain"
              }, {
                overlayContent: withCtx(() => [
                  createBaseVNode("div", _hoisted_8$1, [
                    createVNode(_component_ImageTools, {
                      src: __props.data.generatedImage ?? "",
                      position: "br"
                    }, null, 8, ["src"])
                  ])
                ]),
                _: 1
              }, 8, ["src", "class"])
            ])),
            createVNode(_component_t_dropdown, {
              options,
              onClick: clickHandler
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_9$1, [
                  createVNode(_component_i_upload, {
                    theme: "outline",
                    size: "18",
                    fill: "#fff"
                  }),
                  createBaseVNode("span", _hoisted_10$1, toDisplayString(_ctx.$t("workbench.production.editImage.upload")), 1)
                ])
              ]),
              _: 1
            }),
            createVNode(_component_t_tooltip, {
              theme: "primary",
              content: _ctx.$t("workbench.production.editImage.deleteNode")
            }, {
              default: withCtx(() => [
                createBaseVNode("div", {
                  class: "remove ac",
                  onClick: _cache[0] || (_cache[0] = ($event) => unref(removeNodes)(props.id))
                }, [
                  createVNode(_component_i_delete, {
                    theme: "outline",
                    size: "18",
                    fill: "#fff"
                  })
                ])
              ]),
              _: 1
            }, 8, ["content"])
          ])
        ]),
        withDirectives(createBaseVNode("div", {
          class: "parameter",
          onWheel: _cache[5] || (_cache[5] = withModifiers(() => {
          }, ["stop"])),
          onMousedown: _cache[6] || (_cache[6] = withModifiers(() => {
          }, ["stop"]))
        }, [
          createBaseVNode("div", _hoisted_11$1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(__props.data.references, (item, index) => {
              return openBlock(), createElementBlock("div", {
                key: index,
                class: "refThumb"
              }, [
                createVNode(_component_t_image, {
                  src: item.image,
                  fit: "cover",
                  class: "refImg"
                }, null, 8, ["src"])
              ]);
            }), 128))
          ]),
          createBaseVNode("div", _hoisted_12, [
            createVNode(promptEditor, {
              modelValue: __props.data.prompt,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => __props.data.prompt = $event),
              references: unref(references),
              placeholder: _ctx.$t("workbench.production.editImage.promptPlaceholder")
            }, null, 8, ["modelValue", "references", "placeholder"])
          ]),
          createBaseVNode("div", _hoisted_13, [
            createBaseVNode("div", _hoisted_14, [
              createVNode(__unplugin_components_0, {
                modelValue: __props.data.model,
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => __props.data.model = $event),
                type: "image",
                size: "small"
              }, null, 8, ["modelValue"]),
              createVNode(_component_t_select, {
                modelValue: __props.data.ratio,
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => __props.data.ratio = $event),
                class: "paramSelect ml-5",
                size: "small",
                placeholder: _ctx.$t("workbench.production.editImage.ratio")
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_option, {
                    value: "16:9",
                    label: "16:9"
                  }),
                  createVNode(_component_t_option, {
                    value: "9:16",
                    label: "9:16"
                  }),
                  createVNode(_component_t_option, {
                    value: "1:1",
                    label: "1:1"
                  })
                ]),
                _: 1
              }, 8, ["modelValue", "placeholder"]),
              createVNode(_component_t_select, {
                modelValue: __props.data.quality,
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => __props.data.quality = $event),
                class: "paramSelect ml-5",
                size: "small",
                placeholder: _ctx.$t("workbench.production.editImage.quality")
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_option, {
                    value: "1K",
                    label: "1K"
                  }),
                  createVNode(_component_t_option, {
                    value: "2K",
                    label: "2K"
                  }),
                  createVNode(_component_t_option, {
                    value: "4K",
                    label: "4K"
                  })
                ]),
                _: 1
              }, 8, ["modelValue", "placeholder"])
            ]),
            createBaseVNode("div", _hoisted_15, [
              createVNode(_component_t_popup, {
                content: _ctx.$t("workbench.production.editImage.generateBtn")
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_button, {
                    theme: "primary",
                    size: "small",
                    class: "generateBtn",
                    disabled: unref(generating),
                    loading: unref(generating),
                    onClick: handleGenerate
                  }, {
                    icon: withCtx(() => [
                      createVNode(_component_i_arrow_up)
                    ]),
                    _: 1
                  }, 8, ["disabled", "loading"])
                ]),
                _: 1
              }, 8, ["content"]),
              createVNode(_component_t_popup, {
                content: _ctx.$t("workbench.production.save")
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_button, {
                    theme: "primary",
                    size: "small",
                    class: "keepBtn",
                    disabled: unref(generating),
                    loading: unref(generating),
                    onClick: handleKeep
                  }, {
                    icon: withCtx(() => [
                      createVNode(_component_i_save)
                    ]),
                    _: 1
                  }, 8, ["disabled", "loading"])
                ]),
                _: 1
              }, 8, ["content"])
            ])
          ])
        ], 544), [
          [vShow, unref(selected)]
        ]),
        createVNode(unref(_sfc_main$f), {
          type: "source",
          position: unref(Position).Right,
          style: { "z-index": "999999" }
        }, null, 8, ["position"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const generatedNode = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-39536ff9"]]);

const _hoisted_1$2 = { class: "assets" };
const _hoisted_2$1 = { class: "data" };
const _hoisted_3 = { class: "panelContent" };
const _hoisted_4 = { class: "toolbar" };
const _hoisted_5 = { class: "f ac" };
const _hoisted_6 = { class: "assetsList f w" };
const _hoisted_7 = { class: "previewCell" };
const _hoisted_8 = ["onClick"];
const _hoisted_9 = ["src", "alt"];
const _hoisted_10 = { class: "mediaHoverOverlay" };
const _hoisted_11 = { class: "hoverText" };
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "storyboardImageCheck",
  props: /* @__PURE__ */ mergeModels({
    allowedTypes: {},
    multiple: { type: Boolean, default: false },
    scriptId: {}
  }, {
    "modelValue": {
      default: false
    },
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["confirm", "cancel"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const dialogVisible = useModel(__props, "modelValue");
    watch(
      () => dialogVisible.value,
      (val) => {
        if (val) {
          pagination.value.page = 1;
          searchText.value = "";
          selectedRowKeys.value = [];
          getFilteredData();
        }
      }
    );
    onMounted(() => {
      getFilteredData();
    });
    const searchText = ref("");
    const selectedRowKeys = ref([]);
    const expandedRowKeys = ref([]);
    const loading = ref(false);
    const generatingIds = ref(/* @__PURE__ */ new Set());
    const generatingImageIds = ref(/* @__PURE__ */ new Set());
    const isGenerating = (id) => generatingIds.value.has(id) || generatingImageIds.value.has(id);
    const tableData = ref([]);
    const pagination = ref({
      page: 1,
      pageSize: 10,
      total: 0,
      showJumper: true
    });
    const selectType = props.multiple ? "multiple" : "single";
    const clipColumns = [
      {
        colKey: "row-select",
        type: selectType,
        width: 50,
        align: "center",
        fixed: "left",
        disabled: (row) => isGenerating(row.row?.id ?? row.id)
      },
      {
        colKey: "src",
        title: $t("components.storyboardImageCheck.src"),
        width: 100,
        align: "center",
        cell: "preview"
      },
      {
        colKey: "prompt",
        title: $t("workbench.project.dialog.prompt.title"),
        width: 100,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "duration",
        title: $t("components.storyboardImageCheck.duration"),
        minWidth: 80,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "createTime",
        title: $t("components.storyboardImageCheck.createTime"),
        width: 200,
        align: "center",
        cell: "createTime"
      }
    ];
    function handleSearch() {
      pagination.value.page = 1;
      getFilteredData();
    }
    async function getFilteredData() {
      try {
        loading.value = true;
        const { data } = await instance.post("/production/storyboard/getStoryboardData", {
          scriptId: props.scriptId,
          name: searchText.value || void 0,
          page: pagination.value.page,
          limit: pagination.value.pageSize
        });
        tableData.value = data.data || [];
        pagination.value.total = data.total || 0;
        return tableData.value;
      } catch (error) {
        console.error("加载资产数据失败:", error);
        tableData.value = [];
        pagination.value.total = 0;
      } finally {
        loading.value = false;
      }
    }
    function handleSelectChange(value) {
      const filtered = value.filter((key) => !isGenerating(key));
      if (!props.multiple) {
        selectedRowKeys.value = filtered.length > 0 ? [filtered[filtered.length - 1]] : [];
      } else {
        selectedRowKeys.value = filtered;
      }
    }
    function handleExpandChange(value) {
      if (value.length > 3) {
        value = value.slice(-3);
      }
      expandedRowKeys.value = value;
    }
    function handlePageChange(pageInfo) {
      pagination.value.page = pageInfo.current;
      pagination.value.pageSize = pageInfo.pageSize;
      getFilteredData();
    }
    function handleConfirm() {
      const rows = tableData.value.filter((row) => selectedRowKeys.value.includes(row.id));
      emit("confirm", rows);
      dialogVisible.value = false;
    }
    function handleClose() {
      emit("cancel");
    }
    return (_ctx, _cache) => {
      const _component_t_input = Input;
      const _component_t_icon = Icon;
      const _component_t_button = Button;
      const _component_t_image_viewer = ImageViewer;
      const _component_t_table = Table;
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        visible: dialogVisible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => dialogVisible.value = $event),
        header: _ctx.$t("components.storyboardImageCheck.dialogTitle"),
        width: "80vw",
        footer: true,
        placement: "center",
        zIndex: 999999999999,
        onClose: handleClose,
        onConfirm: handleConfirm,
        onCancel: handleClose
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$2, [
            createBaseVNode("div", _hoisted_2$1, [
              createBaseVNode("div", _hoisted_3, [
                createBaseVNode("div", _hoisted_4, [
                  createBaseVNode("div", _hoisted_5, [
                    createVNode(_component_t_input, {
                      modelValue: unref(searchText),
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(searchText) ? searchText.value = $event : null),
                      placeholder: _ctx.$t("workbench.assets.searchPlaceholder"),
                      clearable: "",
                      style: { "width": "260px" }
                    }, null, 8, ["modelValue", "placeholder"]),
                    createVNode(_component_t_button, {
                      style: { "margin-left": "5px" },
                      onClick: handleSearch
                    }, {
                      icon: withCtx(() => [
                        createVNode(_component_t_icon, { name: "search" })
                      ]),
                      default: withCtx(() => [
                        createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.search")), 1)
                      ]),
                      _: 1
                    })
                  ])
                ]),
                createBaseVNode("div", _hoisted_6, [
                  createVNode(_component_t_table, {
                    columns: clipColumns,
                    data: unref(tableData),
                    "selected-row-keys": unref(selectedRowKeys),
                    "expanded-row-keys": unref(expandedRowKeys),
                    "row-key": "id",
                    hover: "",
                    stripe: "",
                    size: "small",
                    pagination: unref(pagination),
                    loading: unref(loading),
                    "lazy-load": "",
                    "table-layout": "fixed",
                    onSelectChange: handleSelectChange,
                    onExpandChange: handleExpandChange,
                    onPageChange: handlePageChange
                  }, {
                    preview: withCtx(({ row }) => [
                      createBaseVNode("div", _hoisted_7, [
                        createVNode(_component_t_image_viewer, {
                          images: [row.src],
                          closeOnEscKeydown: true,
                          closeOnOverlay: true
                        }, {
                          trigger: withCtx(({ open }) => [
                            createBaseVNode("div", {
                              class: "mediaTrigger",
                              onClick: ($event) => row.src && open()
                            }, [
                              createBaseVNode("img", {
                                src: row.src,
                                alt: row.name
                              }, null, 8, _hoisted_9),
                              createBaseVNode("div", _hoisted_10, [
                                createVNode(_component_t_icon, {
                                  name: "browse",
                                  size: "20px"
                                }),
                                createBaseVNode("span", _hoisted_11, toDisplayString(_ctx.$t("components.storyboardImageCheck.preview")), 1)
                              ])
                            ], 8, _hoisted_8)
                          ]),
                          _: 2
                        }, 1032, ["images"])
                      ])
                    ]),
                    startTime: withCtx(({ row }) => [
                      createBaseVNode("span", null, toDisplayString(unref(dayjs)(row.startTime).format("YYYY-MM-DD HH:mm:ss")), 1)
                    ]),
                    _: 1
                  }, 8, ["data", "selected-row-keys", "expanded-row-keys", "pagination", "loading"])
                ])
              ])
            ])
          ])
        ]),
        _: 1
      }, 8, ["visible", "header"]);
    };
  }
});

/* unplugin-vue-components disabled */

/* unplugin-vue-components disabled */

const storyboardImageCheck = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-28cc765c"]]);

/* unplugin-vue-components disabled */

const _hoisted_1$1 = { class: "remove c" };
const _sfc_main$1 = {
  __name: 'removeLine',
  props: [
  "id",
  "sourceX",
  "sourceY",
  "targetX",
  "targetY",
  "sourcePosition",
  "targetPosition",
  "sourceNode",
  "targetNode",
  "source",
  "target",
  "type",
  "updatable",
  "data",
  "markerEnd",
  "markerStart",
  "style",
  "selected",
  "animated",
  "label",
  "labelStyle",
  "labelShowBg",
  "labelBgStyle",
  "labelBgPadding",
  "labelBgBorderRadius",
  "events",
  "sourceHandleId",
  "targetHandleId",
  "interactionWidth",
],
  setup(__props) {

const { removeEdges } = useVueFlow({ id: "editImage" });

const props = __props;
const path = computed(() => getBezierPath(props));

function remove(id) {
  removeEdges(id);
}

return (_ctx, _cache) => {
  const _component_i_close = resolveComponent("i-close");

  return (openBlock(), createElementBlock(Fragment, null, [
    createVNode(unref(_sfc_main$d), {
      id: __props.id,
      path: unref(path)[0],
      "label-x": unref(path)[1],
      "label-y": unref(path)[2],
      "label-bg-style": "fill: whitesmoke"
    }, null, 8, ["id", "path", "label-x", "label-y"]),
    createVNode(unref(_sfc_main$3$1), null, {
      default: withCtx(() => [
        createBaseVNode("div", {
          style: normalizeStyle({
        pointerEvents: 'all',
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${unref(path)[1]}px,${unref(path)[2]}px)`,
      })
        }, [
          createBaseVNode("div", _hoisted_1$1, [
            createVNode(_component_i_close, {
              theme: "outline",
              size: "32",
              onClick: _cache[0] || (_cache[0] = $event => (remove(__props.id)))
            })
          ])
        ], 4)
      ]),
      _: 1
    })
  ], 64))
}
}

};
const removeLine = /*#__PURE__*/_export_sfc(_sfc_main$1, [['__scopeId',"data-v-c6e7a576"]]);

const byteToHex = [];
for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 0x100).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
    return (byteToHex[arr[offset + 0]] +
        byteToHex[arr[offset + 1]] +
        byteToHex[arr[offset + 2]] +
        byteToHex[arr[offset + 3]] +
        '-' +
        byteToHex[arr[offset + 4]] +
        byteToHex[arr[offset + 5]] +
        '-' +
        byteToHex[arr[offset + 6]] +
        byteToHex[arr[offset + 7]] +
        '-' +
        byteToHex[arr[offset + 8]] +
        byteToHex[arr[offset + 9]] +
        '-' +
        byteToHex[arr[offset + 10]] +
        byteToHex[arr[offset + 11]] +
        byteToHex[arr[offset + 12]] +
        byteToHex[arr[offset + 13]] +
        byteToHex[arr[offset + 14]] +
        byteToHex[arr[offset + 15]]).toLowerCase();
}

let getRandomValues;
const rnds8 = new Uint8Array(16);
function rng() {
    if (!getRandomValues) {
        if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
            throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
        }
        getRandomValues = crypto.getRandomValues.bind(crypto);
    }
    return getRandomValues(rnds8);
}

const randomUUID = typeof crypto !== 'undefined' && crypto.randomUUID && crypto.randomUUID.bind(crypto);
const native = { randomUUID };

function _v4(options, buf, offset) {
    options = options || {};
    const rnds = options.random ?? options.rng?.() ?? rng();
    if (rnds.length < 16) {
        throw new Error('Random bytes length must be >= 16');
    }
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;
    return unsafeStringify(rnds);
}
function v4(options, buf, offset) {
    if (native.randomUUID && true && !options) {
        return native.randomUUID();
    }
    return _v4(options);
}

const _hoisted_1 = { class: "closure" };
const _hoisted_2 = {
  class: "ac",
  style: { "gap": "8px" }
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: /* @__PURE__ */ mergeModels({
    flowData: { default: () => ({
      resultImages: [],
      referanceImages: []
    }) },
    type: {}
  }, {
    "modelValue": {
      type: Boolean,
      default: false
    },
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["save"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const episodesId = inject("episodesId");
    const { project } = storeToRefs(projectStore());
    const storyboardVisible = ref(false);
    let storyboardResolve = null;
    provide("openStoryboardCheck", openStoryboardCheck);
    const { toObject, fromObject, fitView } = useVueFlow({ id: "editImage" });
    const { layout } = useLayout("editImage");
    const props = __props;
    const emit = __emit;
    const visible = useModel(__props, "modelValue");
    const { addEdges, getNodes, getEdges, updateNodeData } = useVueFlow("editImage");
    const nodes = ref([]);
    const edges = ref([]);
    let syncTimer = null;
    function openStoryboardCheck() {
      storyboardVisible.value = true;
      return new Promise((resolve) => {
        storyboardResolve = resolve;
      });
    }
    function onStoryboardConfirm(rows) {
      storyboardVisible.value = false;
      storyboardResolve?.(rows);
      storyboardResolve = null;
    }
    function onStoryboardCancel() {
      storyboardVisible.value = false;
      storyboardResolve?.([]);
      storyboardResolve = null;
    }
    function syncReferences() {
      if (syncTimer) clearTimeout(syncTimer);
      syncTimer = setTimeout(_doSyncReferences, 60);
    }
    function _doSyncReferences() {
      const allNodes = getNodes.value;
      const allEdges = getEdges.value;
      const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
      const edgesByTarget = /* @__PURE__ */ new Map();
      for (const e of allEdges) {
        const list = edgesByTarget.get(e.target);
        if (list) list.push(e.source);
        else edgesByTarget.set(e.target, [e.source]);
      }
      for (const genNode of allNodes) {
        if (genNode.type !== "generated") continue;
        const sourceIds = edgesByTarget.get(genNode.id) ?? [];
        const connectedImages = sourceIds.map((id) => nodeMap.get(id)).filter((n) => !!n).map((n) => {
          if (n.type === "upload") {
            return { image: n.data.image || "" };
          } else if (n.type === "generated") {
            return { image: n.data.generatedImage || "" };
          }
          return { image: "" };
        }).filter((i) => i.image);
        const currentRefs = genNode.data.references ?? [];
        const isSame = currentRefs.length === connectedImages.length && connectedImages.every((img, idx) => currentRefs[idx]?.image === img.image);
        if (!isSame) {
          updateNodeData(genNode.id, { references: connectedImages });
        }
      }
    }
    const onConnect = (params) => {
      if (params.source === params.target) return;
      const isDuplicate = getEdges.value.some(
        (e) => e.source === params.source && e.target === params.target || e.source === params.target && e.target === params.source
      );
      if (isDuplicate) return;
      addEdges([
        {
          id: v4(),
          source: params.source,
          target: params.target,
          ...DEFAULT_EDGE_OPTIONS
        }
      ]);
      nextTick(syncReferences);
    };
    function clickHandler(value) {
      const type = value.value === 1 ? "upload" : "generated";
      addUploadNode(type);
    }
    const addUploadNode = (type, image = "", prompt = "") => {
      const newNodeId = v4();
      const lastNode = nodes.value.filter((n) => n.type === type).pop();
      const newY = lastNode ? lastNode.position.y + 350 : 100;
      const newX = type === "generated" ? 600 : 100;
      nodes.value.push({
        id: newNodeId,
        type,
        position: { x: newX, y: newY },
        data: type === "generated" ? createGeneratedData(image, prompt) : { image }
      });
      return newNodeId;
    };
    async function sureNode(imageUrl) {
      try {
        const payload = {
          nodes: cleanNodes(getNodes.value),
          edges: cleanEdges(getEdges.value)
        };
        if (props.flowData.flowId) {
          await instance.post("/production/editImage/updateImageFlow", { ...payload, flowId: props.flowData.flowId });
          emit("save", { imageUrl, flowId: props.flowData.flowId });
        } else {
          const { data } = await instance.post("/production/editImage/saveImageFlow", { ...payload });
          emit("save", { imageUrl, flowId: data?.id });
        }
        visible.value = false;
      } catch (e) {
        window.$message.error(e.message || $t("workbench.production.editImage.saveFailed"));
      }
    }
    onMounted(async () => {
      try {
        if (!props.flowData.flowId) return buildFlow();
        const { data } = await instance.post("/production/editImage/getImageFlow", {
          id: props.flowData.flowId
        });
        if (!data) return buildFlow();
        edges.value = data.edges.map((e) => ({ ...e, ...DEFAULT_EDGE_OPTIONS }));
        nodes.value = data.nodes;
        await nextTick();
        setTimeout(() => fitView({ duration: 300 }), 100);
      } catch (e) {
        window.$message.error(e.message || $t("workbench.production.editImage.fetchFailed"));
      }
    });
    function buildFlow() {
      const uploadIds = [];
      const generatedIds = [];
      props.flowData.referanceImages.forEach((i) => {
        uploadIds.push(addUploadNode("upload", i));
      });
      props.flowData.resultImages.forEach((i) => {
        generatedIds.push(addUploadNode("generated", i.src, i.prompt));
      });
      for (const sourceId of uploadIds) {
        for (const targetId of generatedIds) {
          edges.value.push({
            id: v4(),
            source: sourceId,
            target: targetId,
            ...DEFAULT_EDGE_OPTIONS
          });
        }
      }
      nextTick(() => {
        syncReferences();
        setTimeout(() => fitView({ duration: 300 }), 100);
      });
    }
    function closeFn() {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.production.editImage.closeConfirmTitle"),
        body: $t("workbench.production.editImage.closeConfirmBody"),
        confirmBtn: $t("common.confirm"),
        cancelBtn: $t("common.cancel"),
        onConfirm: () => {
          if (props.flowData.flowId) {
            const payload = {
              flowId: props.flowData.flowId,
              nodes: cleanNodes(getNodes.value),
              edges: cleanEdges(getEdges.value)
            };
            instance.post("/production/editImage/updateImageFlow", { ...payload });
          }
          visible.value = false;
          dialog.destroy();
        }
      });
    }
    async function layoutGraph(direction) {
      const oldData = toObject();
      oldData.nodes = layout(oldData.nodes, oldData.edges, direction);
      await fromObject(oldData);
      await nextTick();
      fitView({ duration: 300 });
    }
    return (_ctx, _cache) => {
      const _component_i_close_small = resolveComponent("i-close-small");
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_button = Button;
      const _component_t_dropdown = Dropdown;
      const _component_i_tree_diagram = resolveComponent("i-tree-diagram");
      const _component_t_tooltip = Tooltip;
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        footer: false,
        header: false,
        closeBtn: false,
        visible: visible.value,
        "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => visible.value = $event),
        attach: "body",
        placement: "center",
        mode: "full-screen",
        class: "fullscreenDialog"
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_i_close_small, {
              theme: "outline",
              size: "24",
              fill: "#4a4a4a",
              onClick: closeFn
            })
          ]),
          createVNode(unref(_sfc_main$1$1), {
            id: "editImage",
            class: "editImageCls",
            nodes: unref(nodes),
            "onUpdate:nodes": _cache[1] || (_cache[1] = ($event) => isRef(nodes) ? nodes.value = $event : null),
            edges: unref(edges),
            "onUpdate:edges": _cache[2] || (_cache[2] = ($event) => isRef(edges) ? edges.value = $event : null),
            "min-zoom": 0.01,
            "fit-view-on-init": "",
            onConnect,
            onEdgesChange: syncReferences
          }, {
            "node-upload": withCtx(({ id, data }) => [
              createVNode(uploadNode, {
                id,
                data,
                onUpload: syncReferences,
                onKeep: sureNode
              }, null, 8, ["id", "data"])
            ]),
            "node-generated": withCtx(({ id, data }) => [
              createVNode(generatedNode, {
                id,
                data,
                projectId: +unref(project).id,
                onKeep: sureNode
              }, null, 8, ["id", "data", "projectId"])
            ]),
            "edge-removeLine": withCtx((edgeProps) => [
              createVNode(removeLine, normalizeProps(guardReactiveProps(edgeProps)), null, 16)
            ]),
            default: withCtx(() => [
              createVNode(unref(_sfc_main$5)),
              createVNode(unref(_sfc_main$6)),
              createVNode(unref(_sfc_main$7), { position: "top-left" }, {
                default: withCtx(() => [
                  createBaseVNode("div", _hoisted_2, [
                    createVNode(_component_t_dropdown, {
                      options: [
                        { content: _ctx.$t("workbench.production.editImage.upload"), value: 1 },
                        { content: _ctx.$t("workbench.production.editImage.generate"), value: 2 }
                      ],
                      onClick: clickHandler
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_t_button, {
                          theme: "primary",
                          shape: "circle"
                        }, {
                          icon: withCtx(() => [
                            createVNode(_component_i_plus)
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["options"]),
                    createVNode(_component_t_tooltip, {
                      theme: "primary",
                      content: _ctx.$t("workbench.production.autoLayoutLR")
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_t_button, {
                          class: "guide-layout-btn",
                          onClick: _cache[0] || (_cache[0] = ($event) => layoutGraph("LR")),
                          variant: "outline",
                          shape: "circle"
                        }, {
                          icon: withCtx(() => [
                            createVNode(_component_i_tree_diagram)
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["content"])
                  ])
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["nodes", "edges"]),
          createVNode(storyboardImageCheck, {
            telepor: "",
            modelValue: unref(storyboardVisible),
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(storyboardVisible) ? storyboardVisible.value = $event : null),
            scriptId: unref(episodesId),
            onConfirm: onStoryboardConfirm,
            onCancel: onStoryboardCancel
          }, null, 8, ["modelValue", "scriptId"])
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});

/* unplugin-vue-components disabled */

const editImage = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-188595f3"]]);

export { editImage as e };

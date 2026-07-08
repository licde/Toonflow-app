import { I as ImageTools } from './imageTools-BU0BDM0I.js';
import { l as defineComponent, bM as storeToRefs, bU as useModel, bL as useLocalStorage, b2 as resolveComponent, aK as openBlock, aS as createBlock, aM as withCtx, aO as createBaseVNode, b0 as toDisplayString, j as createVNode, a1 as unref, aT as createCommentVNode, av as isRef, aL as createElementBlock, F as Fragment, aP as renderList, aU as normalizeClass, bH as withModifiers, aQ as normalizeStyle, a$ as createTextVNode, bV as mergeModels, r as ref, c as computed, k as reactive, h } from './vue-vendor-Cj7sXJnb.js';
import { e as editImage } from './index-CtF4A0wP.js';
import { c as _sfc_main$f, P as Position } from './vueflow-BeRgUeVC.js';
import { i as instance } from './axios-BzO0kuq-.js';
import { p as projectStore } from './project-C_OB2JAu.js';
import { a as useProductionAgentStore } from './productionAgent-I8pXhmTU.js';
import { a4 as Empty, a7 as CheckboxGroup, B as Button, a3 as Checkbox, X as Tag, a8 as Image, L as Loading, n as Tooltip, ac as InputNumber, G as ImageViewer, W as DialogPlugin, s as LoadingPlugin, Y as Card, T as Textarea } from './tdesign-C157N6jJ.js';
import { _ as _export_sfc } from './index-BvNjvLGR.js';
import './dayjs-CuToSpIM.js';
import './assetsCheck-C3hsdxZF.js';
import './index-7l_O1IwH.js';
import './modelSelect-CP2wRMzT.js';
import './providersLogo-BCbaFq8_.js';
import './promptEditor-lOvpQMdU.js';
import './icons-DiutqkIw.js';
import './index-CJbGyI4R.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';

const _hoisted_1 = { class: "titleBar dragHandle pr" };
const _hoisted_2 = { class: "title" };
const _hoisted_3 = { class: "content" };
const _hoisted_4 = { class: "frameGrid" };
const _hoisted_5 = ["onMouseenter"];
const _hoisted_6 = { class: "frameCard" };
const _hoisted_7 = { class: "imageToolsWrap show" };
const _hoisted_8 = ["onClick"];
const _hoisted_9 = ["onClick"];
const _hoisted_10 = ["onClick"];
const _hoisted_11 = { class: "scaleControl" };
const _hoisted_12 = {
  class: "ac",
  style: { "gap": "6px", "margin-bottom": "6px", "flex-wrap": "wrap" }
};
const _hoisted_13 = {
  class: "ac",
  style: { "gap": "10px" }
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "storyboard",
  props: /* @__PURE__ */ mergeModels({
    id: {},
    handleIds: {},
    assetsData: {}
  }, {
    "modelValue": { required: true },
    "modelModifiers": {}
  }),
  emits: ["update:modelValue"],
  setup(__props) {
    const { project } = storeToRefs(projectStore());
    const { episodesId } = storeToRefs(useProductionAgentStore());
    const props = __props;
    const storyboard = useModel(__props, "modelValue");
    const visible = ref(false);
    const previewVisible = ref(false);
    const previewImages = ref([]);
    const gridScale = useLocalStorage("storyboardGridScale", 1);
    const hoveredIndex = ref(null);
    const selectedIds = ref([]);
    function setHoveredFrame(index) {
      hoveredIndex.value = index;
    }
    function selectAll() {
      selectedIds.value = storyboard.value.map((s) => s.id).filter(Boolean);
    }
    function handleDeleteSelected() {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.assets.confirmDeleteHeader"),
        body: $t("workbench.production.node.storyboard.confirmBatchDeleteBody", { index: selectedIds.value.length }),
        confirmBtn: $t("workbench.assets.deleteBtn"),
        cancelBtn: $t("workbench.assets.cancelBtn"),
        theme: "warning",
        onConfirm: async () => {
          try {
            if (!selectedIds.value.length) {
              dialog.destroy();
              return window.$message.error($t("workbench.production.node.storyboard.pleaseSelectImage"));
            }
            instance.post("/production/storyboard/batchDelete", {
              ids: selectedIds.value,
              projectId: project.value?.id
            });
            storyboard.value = storyboard.value.filter((i) => !selectedIds.value.includes(i.id));
            selectedIds.value = [];
            window.$message.success($t("workbench.production.node.storyboard.deleteSuccess"));
          } catch (e) {
            window.$message.error(e?.message || $t("workbench.production.node.storyboard.removeFailed"));
          } finally {
            dialog.destroy();
          }
        }
      });
    }
    const currentRow = ref({
      flowId: null,
      resultImages: [],
      referanceImages: []
    });
    const tagColors = ["#5bccb3", "#9c7cfc", "#fbbf24", "#5b9afc", "#e86b6b", "#7cb8fc", "#e8a855", "#34d399"];
    function closePreview() {
      previewImages.value = [];
    }
    async function downLoadImage() {
      LoadingPlugin(true);
      const allIds = (storyboard.value ?? []).filter((s) => s.src).map((s) => s.id);
      if (!allIds.length) {
        window.$message.warning($t("workbench.production.node.storyboard.noPreviewImages"));
        LoadingPlugin(false);
        return;
      }
      try {
        const res = await instance.post(
          "/production/storyboard/downPreviewImage",
          {
            storyboardIds: allIds
          },
          { responseType: "blob" }
        );
        const url = URL.createObjectURL(res);
        const a = document.createElement("a");
        a.href = url;
        a.download = `storyboardImagePreview-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        window.$message.error($t("workbench.production.node.storyboard.imageLoadFailed"));
      } finally {
        LoadingPlugin(false);
      }
    }
    async function previewAll() {
      LoadingPlugin(true);
      const allIds = (storyboard.value ?? []).filter((s) => s.src).map((s) => s.id);
      if (!allIds.length) {
        window.$message.warning($t("workbench.production.node.storyboard.noPreviewImages"));
        LoadingPlugin(false);
        return;
      }
      try {
        const { data } = await instance.post("/production/storyboard/previewImage", {
          storyboardIds: allIds,
          projectId: project.value?.id
        });
        previewImages.value = [data];
        previewVisible.value = true;
      } catch {
        window.$message.error($t("workbench.production.node.storyboard.imageLoadFailed"));
      } finally {
        LoadingPlugin(false);
      }
    }
    const currentRowStoryboardInfo = ref({
      id: null,
      insertAfterIndex: null
    });
    const styleMaxSize = computed(() => {
      if (gridScale.value <= 1) return gridScale.value;
    });
    const generateLoading = ref(false);
    async function batchGenerateImage() {
      if (!selectedIds.value.length) return window.$message.warning("请先选择分镜面板");
      generateLoading.value = true;
      try {
        await useProductionAgentStore().batchGenerateStoryboard(selectedIds.value, true);
        window.$message.success($t("workbench.production.node.storyboard.batchGenerateSuccess"));
        selectedIds.value = [];
      } catch (e) {
        window.$message.error($t("workbench.production.node.storyboard.batchGenerateFailed"));
      } finally {
        generateLoading.value = false;
      }
    }
    function editStoryboaryImage(item, images, insertAfterIndex = null) {
      currentRowStoryboardInfo.value = {
        id: insertAfterIndex == null ? item?.id : null,
        insertAfterIndex
      };
      currentRow.value = {
        flowId: item?.flowId ?? null,
        resultImages: [],
        referanceImages: []
      };
      if (currentRowStoryboardInfo.value.id) {
        let imagesPush = [];
        if (item.associateAssetsIds && item.associateAssetsIds.length > 0) {
          const assetsImages = [];
          for (const id of item.associateAssetsIds) {
            const asset = props.assetsData.find((a) => a.id === id);
            if (asset) {
              if (asset.src) assetsImages.push(asset.src);
              continue;
            }
            for (const a of props.assetsData) {
              const derive = a.derive?.find((d) => d.id === id);
              if (derive) {
                if (derive.src) assetsImages.push(derive.src);
                break;
              }
            }
          }
          imagesPush = imagesPush.concat(assetsImages);
        }
        currentRow.value.referanceImages = imagesPush;
        currentRow.value.resultImages = [{ src: images.length ? images[0] : "", prompt: item.prompt ?? "" }];
      } else {
        currentRow.value.referanceImages = images.filter(Boolean);
      }
      visible.value = true;
    }
    async function save({ imageUrl, flowId }) {
      if (!imageUrl) return;
      const { id, insertAfterIndex } = currentRowStoryboardInfo.value;
      if (id === null && insertAfterIndex !== null) {
        const newFrame = {
          duration: 0,
          prompt: "",
          src: imageUrl,
          videoDesc: "",
          shouldGenerateImage: 1,
          state: "已完成"
        };
        const { data } = await instance.post("/production/storyboard/addStoryboard", {
          ...newFrame,
          projectId: project.value?.id,
          scriptId: episodesId.value,
          flowId
        });
        storyboard.value.splice(insertAfterIndex + 1, 0, { ...newFrame, id: data.id, flowId });
        useProductionAgentStore().setFlowData();
        return;
      }
      const target = storyboard.value.find((s) => s.id === id);
      if (target) {
        target.src = imageUrl;
        target.state = "已完成";
        target.flowId = flowId;
      }
      await instance.post("/production/storyboard/updateStoryboardUrl", {
        id,
        url: imageUrl,
        flowId
      });
    }
    async function removeFn(id) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.assets.confirmDeleteHeader"),
        body: $t("workbench.production.node.storyboard.confirmDeleteBody"),
        confirmBtn: $t("workbench.assets.deleteBtn"),
        cancelBtn: $t("workbench.assets.cancelBtn"),
        theme: "warning",
        onConfirm: async () => {
          if (!id) {
            const index = storyboard.value.findIndex((s) => s.id === id);
            if (index !== -1) {
              storyboard.value.splice(index, 1);
            }
            dialog.destroy();
            return;
          }
          try {
            await instance.post("/production/storyboard/removeFrame", {
              id,
              projectId: project.value?.id
            });
            const index = storyboard.value.findIndex((s) => s.id === id);
            if (index !== -1) {
              storyboard.value.splice(index, 1);
            }
          } catch (e) {
            window.$message.error(e?.message || $t("workbench.production.node.storyboard.removeFailed"));
          } finally {
            dialog.destroy();
          }
        }
      });
    }
    function editInfo(item) {
      const formData = reactive({
        prompt: item.prompt ?? "",
        videoDesc: item?.videoDesc ?? ""
      });
      const bodyVNode = () => h("div", { class: "editInfoForm" }, [
        h("div", { class: "editInfoField" }, [
          h("label", { class: "editInfoLabel" }, $t("workbench.production.node.storyboard.prompt")),
          h(Textarea, {
            value: formData.prompt,
            placeholder: $t("workbench.production.node.storyboard.promptPlaceholder"),
            autosize: { minRows: 3, maxRows: 6 },
            "onUpdate:value": (v) => formData.prompt = v
          })
        ]),
        h("div", { class: "editInfoField" }, [
          h("label", { class: "editInfoLabel" }, $t("workbench.production.node.storyboard.videoDesc")),
          h(Textarea, {
            value: formData.videoDesc,
            placeholder: $t("workbench.production.node.storyboard.videoDescPlaceholder"),
            autosize: { minRows: 3, maxRows: 6 },
            "onUpdate:value": (v) => formData.videoDesc = v
          })
        ])
      ]);
      const confirmDialog = DialogPlugin.confirm({
        header: $t("workbench.production.node.storyboard.editInfo"),
        body: bodyVNode,
        width: 480,
        confirmBtn: {
          content: $t("common.submit"),
          theme: "primary",
          loading: false
        },
        onConfirm: async () => {
          confirmDialog.update({ confirmBtn: { content: $t("common.submitting"), loading: true } });
          try {
            await instance.post("/production/storyboard/editStoryboardInfo", {
              id: item.id,
              prompt: formData.prompt,
              videoDesc: formData.videoDesc
            });
            item.prompt = formData.prompt;
            item.videoDesc = formData.videoDesc;
            window.$message.success($t("common.editSuccess"));
          } catch (e) {
            window.$message.error(e?.message || $t("common.editFailed"));
          } finally {
            confirmDialog.update({ confirmBtn: { content: $t("common.submit"), loading: false } });
            confirmDialog.destroy();
          }
        }
      });
    }
    return (_ctx, _cache) => {
      const _component_t_empty = Empty;
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_button = Button;
      const _component_t_checkbox = Checkbox;
      const _component_t_tag = Tag;
      const _component_ImageTools = ImageTools;
      const _component_t_image = Image;
      const _component_t_loading = Loading;
      const _component_t_tooltip = Tooltip;
      const _component_i_delete = resolveComponent("i-delete");
      const _component_i_edit = resolveComponent("i-edit");
      const _component_t_checkbox_group = CheckboxGroup;
      const _component_t_input_number = InputNumber;
      const _component_t_image_viewer = ImageViewer;
      const _component_t_card = Card;
      return openBlock(), createBlock(_component_t_card, { class: "storyboard" }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, toDisplayString(_ctx.$t("workbench.production.node.storyboard.title")), 1),
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
            !storyboard.value.length ? (openBlock(), createBlock(_component_t_empty, {
              key: 0,
              style: { "margin-top": "16px" }
            })) : createCommentVNode("", true),
            createVNode(_component_t_checkbox_group, {
              modelValue: unref(selectedIds),
              "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(selectedIds) ? selectedIds.value = $event : null)
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_4, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(storyboard.value, (item, index) => {
                    return openBlock(), createElementBlock("div", {
                      key: item.id,
                      class: "frameItem",
                      onMouseenter: ($event) => setHoveredFrame(index),
                      onMouseleave: _cache[1] || (_cache[1] = ($event) => setHoveredFrame(null))
                    }, [
                      createBaseVNode("div", {
                        class: normalizeClass(["addBetween addBetween--left", { expanded: unref(hoveredIndex) === index }])
                      }, [
                        createVNode(_component_t_button, {
                          theme: "primary",
                          variant: "outline",
                          shape: "circle",
                          onClick: withModifiers(($event) => editStoryboaryImage(item, [index > 0 ? storyboard.value[index - 1]?.src || "" : "", item.src || ""], index - 1), ["stop"])
                        }, {
                          icon: withCtx(() => [
                            createVNode(_component_i_plus)
                          ]),
                          _: 1
                        }, 8, ["onClick"])
                      ], 2),
                      createBaseVNode("div", _hoisted_6, [
                        createBaseVNode("div", {
                          class: "frameImage",
                          style: normalizeStyle({
                            width: `${200 * unref(gridScale)}px`,
                            height: `${200 * unref(gridScale)}px`
                          })
                        }, [
                          createBaseVNode("div", {
                            class: "ac frameCheckbox",
                            style: normalizeStyle({ transform: `scale(${unref(styleMaxSize)})` })
                          }, [
                            (openBlock(), createBlock(_component_t_checkbox, {
                              checked: unref(selectedIds).includes(item.id),
                              onClick: _cache[0] || (_cache[0] = withModifiers(() => {
                              }, ["stop"])),
                              key: item?.id || index,
                              value: item.id
                            }, null, 8, ["checked", "value"])),
                            createVNode(_component_t_tag, {
                              class: "frameTypeTag",
                              style: normalizeStyle({ backgroundColor: tagColors[index % tagColors.length] })
                            }, {
                              default: withCtx(() => [
                                createTextVNode(" S" + toDisplayString(String(index + 1).padStart(2, "0")), 1)
                              ]),
                              _: 2
                            }, 1032, ["style"])
                          ], 4),
                          item.src && item.state == "已完成" ? (openBlock(), createBlock(_component_t_image, {
                            key: 0,
                            src: item.src,
                            fit: "contain",
                            class: "frameImg",
                            onClick: ($event) => editStoryboaryImage(item, [item.src])
                          }, {
                            overlayContent: withCtx(() => [
                              createBaseVNode("div", _hoisted_7, [
                                createVNode(_component_ImageTools, {
                                  style: normalizeStyle({ transform: `scale(${unref(styleMaxSize)})` }),
                                  src: item.src,
                                  position: "br"
                                }, null, 8, ["style", "src"])
                              ])
                            ]),
                            _: 2
                          }, 1032, ["src", "onClick"])) : (openBlock(), createElementBlock("div", {
                            key: 1,
                            class: "generatingPlaceholder",
                            onClick: ($event) => editStoryboaryImage(item, [])
                          }, [
                            item.state === "生成中" ? (openBlock(), createBlock(_component_t_loading, {
                              key: 0,
                              size: "small"
                            })) : item.state == "生成失败" ? (openBlock(), createBlock(_component_t_tooltip, {
                              key: 1,
                              content: item?.reason
                            }, {
                              default: withCtx(() => [..._cache[7] || (_cache[7] = [
                                createBaseVNode("span", { style: { "color": "#ff4d4f" } }, "生成失败", -1)
                              ])]),
                              _: 1
                            }, 8, ["content"])) : (openBlock(), createBlock(_component_t_empty, {
                              key: 2,
                              size: "small",
                              title: _ctx.$t("workbench.production.node.storyboard.notGenerated")
                            }, null, 8, ["title"]))
                          ], 8, _hoisted_8)),
                          createVNode(_component_t_tooltip, {
                            theme: "primary",
                            content: _ctx.$t("workbench.production.node.storyboard.deleteNode")
                          }, {
                            default: withCtx(() => [
                              createBaseVNode("div", {
                                class: "remove ac",
                                style: normalizeStyle({ transform: `scale(${unref(styleMaxSize)})` }),
                                onClick: withModifiers(($event) => removeFn(item.id), ["stop"])
                              }, [
                                createVNode(_component_i_delete, {
                                  theme: "outline",
                                  size: "18",
                                  fill: "#fff"
                                })
                              ], 12, _hoisted_9)
                            ]),
                            _: 2
                          }, 1032, ["content"]),
                          createVNode(_component_t_tooltip, {
                            theme: "primary",
                            content: _ctx.$t("workbench.production.node.storyboard.editNode")
                          }, {
                            default: withCtx(() => [
                              createBaseVNode("div", {
                                class: "editNode ac",
                                style: normalizeStyle({ transform: `scale(${unref(styleMaxSize)})` }),
                                onClick: withModifiers(($event) => editInfo(item), ["stop"])
                              }, [
                                createVNode(_component_i_edit, {
                                  theme: "outline",
                                  size: "18",
                                  fill: "#fff"
                                })
                              ], 12, _hoisted_10)
                            ]),
                            _: 2
                          }, 1032, ["content"])
                        ], 4)
                      ]),
                      createBaseVNode("div", {
                        class: normalizeClass(["addBetween addBetween--right", { expanded: unref(hoveredIndex) === index }])
                      }, [
                        createVNode(_component_t_button, {
                          theme: "primary",
                          variant: "outline",
                          shape: "circle",
                          onClick: withModifiers(($event) => editStoryboaryImage(item, [item.src || "", index < (storyboard.value?.length ?? 0) - 1 ? storyboard.value[index + 1]?.src || "" : ""], index), ["stop"])
                        }, {
                          icon: withCtx(() => [
                            createVNode(_component_i_plus)
                          ]),
                          _: 1
                        }, 8, ["onClick"])
                      ], 2)
                    ], 40, _hoisted_5);
                  }), 128))
                ])
              ]),
              _: 1
            }, 8, ["modelValue"]),
            createBaseVNode("div", _hoisted_11, [
              createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.production.node.storyboard.scaleRatio")), 1),
              createVNode(_component_t_input_number, {
                modelValue: unref(gridScale),
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(gridScale) ? gridScale.value = $event : null),
                min: 0.1,
                max: 3,
                step: 0.1,
                "decimal-places": 1,
                size: "small",
                style: { "width": "120px" }
              }, null, 8, ["modelValue"])
            ]),
            createBaseVNode("div", _hoisted_12, [
              createVNode(_component_t_tag, {
                theme: "primary",
                variant: "light"
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.node.storyboard.selectedCount", { count: unref(selectedIds).length })), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_button, {
                size: "small",
                disabled: !storyboard.value.length,
                theme: "default",
                variant: "outline",
                onClick: _cache[4] || (_cache[4] = ($event) => selectedIds.value = [])
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.node.storyboard.clearSelection")), 1)
                ]),
                _: 1
              }, 8, ["disabled"]),
              createVNode(_component_t_button, {
                size: "small",
                disabled: !storyboard.value.length,
                theme: "default",
                variant: "outline",
                onClick: selectAll
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.node.storyboard.selectAll")), 1)
                ]),
                _: 1
              }, 8, ["disabled"]),
              createVNode(_component_t_button, {
                theme: "danger",
                size: "small",
                disabled: !storyboard.value.length || !unref(selectedIds).length,
                onClick: handleDeleteSelected
              }, {
                default: withCtx(() => [..._cache[8] || (_cache[8] = [
                  createTextVNode("批量删除", -1)
                ])]),
                _: 1
              }, 8, ["disabled"])
            ]),
            createBaseVNode("div", _hoisted_13, [
              createVNode(_component_t_button, {
                block: "",
                onClick: previewAll,
                disabled: !storyboard.value.length
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.node.storyboard.gridPreview")), 1)
                ]),
                _: 1
              }, 8, ["disabled"]),
              createVNode(_component_t_button, {
                block: "",
                onClick: batchGenerateImage,
                disabled: !storyboard.value.length || !unref(selectedIds).length,
                loading: unref(generateLoading)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.node.storyboard.generateImage")), 1)
                ]),
                _: 1
              }, 8, ["disabled", "loading"])
            ])
          ]),
          unref(visible) ? (openBlock(), createBlock(editImage, {
            key: 0,
            modelValue: unref(visible),
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef(visible) ? visible.value = $event : null),
            flowData: unref(currentRow),
            type: "storyboard",
            onSave: save
          }, null, 8, ["modelValue", "flowData"])) : createCommentVNode("", true),
          unref(previewVisible) ? (openBlock(), createBlock(_component_t_image_viewer, {
            key: 1,
            visible: unref(previewVisible),
            "onUpdate:visible": _cache[6] || (_cache[6] = ($event) => isRef(previewVisible) ? previewVisible.value = $event : null),
            images: unref(previewImages),
            onClose: closePreview,
            onDownload: downLoadImage,
            imageScale: { max: 10, min: 0.1 }
          }, null, 8, ["visible", "images"])) : createCommentVNode("", true)
        ]),
        _: 1
      });
    };
  }
});

/* unplugin-vue-components disabled */

const storyboard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f7e15cea"]]);

export { storyboard as default };

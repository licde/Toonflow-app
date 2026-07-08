import { d as dayjs } from './dayjs-CuToSpIM.js';
import { _ as __unplugin_components_0 } from './modelSelect-CP2wRMzT.js';
import { l as defineComponent, bM as storeToRefs, bU as useModel, r as ref, aL as createElementBlock, j as createVNode, aM as withCtx, bV as mergeModels, aK as openBlock, aO as createBaseVNode, a1 as unref, aS as createBlock, aT as createCommentVNode, w as watch, aP as renderList, bH as withModifiers, F as Fragment, b0 as toDisplayString, a$ as createTextVNode, b2 as resolveComponent, av as isRef, aU as normalizeClass, E as withDirectives, G as vShow, o as onMounted, b as onUnmounted, bY as useFileDialog, bE as createSlots, a_ as resolveDynamicComponent, n as nextTick, c as computed } from './vue-vendor-Cj7sXJnb.js';
import { i as instance } from './axios-BzO0kuq-.js';
import { p as projectStore } from './project-C_OB2JAu.js';
import { E as Dialog, H as Form, J as FormItem, R as Input, T as Textarea, X as Tag, B as Button, Y as Card, a0 as Upload, L as Loading, K as Select, O as Option, D as Divider, G as ImageViewer, a8 as Image, W as DialogPlugin, U as Tabs, o as Space, I as Icon, a5 as Popup, Z as Table, V as TabPanel } from './tdesign-C157N6jJ.js';
import { _ as _export_sfc, s as settingStore } from './index-BvNjvLGR.js';
import './providersLogo-BCbaFq8_.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';

const _hoisted_1$3 = { class: "addAssets" };
const _hoisted_2$3 = { class: "data" };
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "addAssets",
  props: /* @__PURE__ */ mergeModels({
    type: {},
    title: {},
    formData: {}
  }, {
    "modelValue": { type: Boolean, ...{
      default: false
    } },
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["getFilteredData"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const { project } = storeToRefs(projectStore());
    const props = __props;
    const addAssetsShow = useModel(__props, "modelValue");
    const rules = ref({
      name: [{ required: true, message: $t("workbench.assets.add.nameRequired"), trigger: "blur" }],
      describe: [{ required: true, message: $t("workbench.assets.add.describeRequired"), trigger: "blur" }]
    });
    function handleCancel() {
      addAssetsShow.value = false;
    }
    const formRef = ref();
    const emit = __emit;
    function onConfirm() {
      formRef.value?.validate().then(async (result) => {
        if (result == true) {
          if (props.formData.id !== 0) {
            await instance.post(`/assets/updateAssets`, {
              id: props.formData.id,
              name: props.formData.name,
              describe: props.formData.describe,
              remark: props.formData.remark,
              prompt: props.formData.prompt
            }).then(() => {
              window.$message.success($t("workbench.assets.add.updateSuccess"));
              emit("getFilteredData");
              addAssetsShow.value = false;
            });
          } else {
            await instance.post(`/assets/addAssets`, {
              name: props.formData.name,
              describe: props.formData.describe,
              remark: props.formData.remark,
              type: props.type,
              projectId: project.value?.id,
              prompt: props.formData.prompt
            }).then(() => {
              window.$message.success($t("workbench.assets.add.addSuccess"));
              emit("getFilteredData");
              addAssetsShow.value = false;
            });
          }
        }
      });
    }
    return (_ctx, _cache) => {
      const _component_t_input = Input;
      const _component_t_form_item = FormItem;
      const _component_t_textarea = Textarea;
      const _component_t_form = Form;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1$3, [
        createVNode(_component_t_dialog, {
          visible: addAssetsShow.value,
          "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => addAssetsShow.value = $event),
          closable: false,
          width: "40vw",
          header: props.title,
          maskClosable: false,
          onCloseBtnClick: handleCancel,
          onConfirm,
          onCancel: handleCancel
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2$3, [
              createVNode(_component_t_form, {
                data: props.formData,
                rules: unref(rules),
                ref_key: "formRef",
                ref: formRef
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.assets.add.name"),
                    name: "name"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_input, {
                        modelValue: props.formData.name,
                        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => props.formData.name = $event),
                        placeholder: _ctx.$t("workbench.assets.add.namePh")
                      }, null, 8, ["modelValue", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.assets.add.describe"),
                    name: "describe"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_textarea, {
                        modelValue: props.formData.describe,
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => props.formData.describe = $event),
                        placeholder: _ctx.$t("workbench.assets.add.describePh")
                      }, null, 8, ["modelValue", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.assets.add.remark"),
                    name: "remark"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_input, {
                        modelValue: props.formData.remark,
                        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => props.formData.remark = $event),
                        placeholder: _ctx.$t("workbench.assets.add.remarkPh")
                      }, null, 8, ["modelValue", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  props.type !== "clip" ? (openBlock(), createBlock(_component_t_form_item, {
                    key: 0,
                    label: _ctx.$t("workbench.assets.add.prompt"),
                    name: "prompt"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_textarea, {
                        modelValue: props.formData.prompt,
                        "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => props.formData.prompt = $event),
                        autosize: { minRows: 3, maxRows: 5 },
                        placeholder: _ctx.$t("workbench.assets.add.promptPh")
                      }, null, 8, ["modelValue", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"])) : createCommentVNode("", true)
                ]),
                _: 1
              }, 8, ["data", "rules"])
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const addAssets = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-5b2206fc"]]);

const _hoisted_1$2 = { class: "data" };
const _hoisted_2$2 = { class: "audio-list" };
const _hoisted_3$2 = { class: "audio-upload-row" };
const _hoisted_4$2 = ["onClick", "onDrop"];
const _hoisted_5$2 = { class: "audio-filename" };
const _hoisted_6$2 = { class: "audio-filename audio-filename--existing" };
const _hoisted_7$2 = ["onChange"];
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "addAudioAssets",
  props: /* @__PURE__ */ mergeModels({
    formData: {}
  }, {
    "modelValue": { type: Boolean, ...{
      default: false
    } },
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["getFilteredData"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const { project } = storeToRefs(projectStore());
    const props = __props;
    const addAssetsShow = useModel(__props, "modelValue");
    const rules = ref({
      name: [{ required: true, message: $t("workbench.assets.add.nameRequired"), trigger: "blur" }],
      describe: [{ required: true, message: $t("workbench.assets.add.describeRequired"), trigger: "blur" }]
    });
    function handleCancel() {
      addAssetsShow.value = false;
      audioItems.value = [{ file: null, text: "", name: "", describe: "" }];
    }
    const formRef = ref();
    const emit = __emit;
    const audioItems = ref([{ file: null, text: "", name: "", describe: "" }]);
    const fileInputRefs = ref([]);
    watch(
      () => props.formData.sonAssets,
      (newSonAssets) => {
        if (newSonAssets && newSonAssets.length > 0) {
          audioItems.value = newSonAssets.map((asset) => ({
            id: asset.id,
            src: asset.src,
            file: null,
            text: asset.prompt,
            name: asset.name || "",
            describe: asset.describe || ""
          }));
        } else {
          audioItems.value = [{ file: null, text: "", name: "", describe: "" }];
        }
      },
      { immediate: true }
    );
    function addAudioItem() {
      audioItems.value.push({ file: null, text: "", name: "", describe: "" });
    }
    function removeAudioItem(index) {
      audioItems.value.splice(index, 1);
      if (audioItems.value.length === 0) {
        audioItems.value.push({ file: null, text: "", name: "", describe: "" });
      }
    }
    function triggerFileInput(index) {
      fileInputRefs.value[index]?.click();
    }
    function handleFileChange(e, index) {
      const input = e.target;
      const file = input.files?.[0];
      if (file) {
        audioItems.value[index].file = file;
        audioItems.value[index].src = void 0;
        if (!audioItems.value[index].name) {
          audioItems.value[index].name = file.name;
        }
      }
      input.value = "";
    }
    function handleDrop(e, index) {
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("audio/")) {
        audioItems.value[index].file = file;
        if (!audioItems.value[index].name) {
          audioItems.value[index].name = file.name;
        }
      } else if (file) {
        window.$message.warning($t("workbench.assets.add.pleaseUploadAudio"));
      }
    }
    async function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    function onConfirm() {
      formRef.value?.validate().then(async (result) => {
        if (result == true) {
          const assetsItem = (await Promise.all(
            audioItems.value.map(async (item) => {
              if (item.id != null && item.src) {
                return {
                  id: item.id,
                  src: item.src,
                  prompt: item.text || "",
                  name: item.name || item.src.split("/").pop() || "",
                  describe: item.describe || ""
                };
              }
              if (item.file) {
                return {
                  base64: await fileToBase64(item.file),
                  prompt: item.text || "",
                  name: item.name || item.file.name,
                  describe: item.describe || ""
                };
              }
              return null;
            })
          )).filter(
            (item) => !!item
          );
          const payload = {
            name: props.formData.name,
            describe: props.formData.sex + "|" + props.formData.describe,
            projectId: project.value?.id ?? 0,
            assetsItem
          };
          console.log(props.formData.id);
          if (props.formData.id) {
            await instance.post(`/assets/updateAudioAssets`, {
              id: props.formData.id,
              ...payload
            }).then(() => {
              window.$message.success($t("workbench.assets.add.updateSuccess"));
              emit("getFilteredData");
              addAssetsShow.value = false;
            });
          } else {
            await instance.post(`/assets/addAudioAssets`, payload).then(() => {
              window.$message.success($t("workbench.assets.add.addSuccess"));
              emit("getFilteredData");
              addAssetsShow.value = false;
            });
          }
        }
      });
    }
    return (_ctx, _cache) => {
      const _component_t_input = Input;
      const _component_t_form_item = FormItem;
      const _component_t_textarea = Textarea;
      const _component_i_volume_notice = resolveComponent("i-volume-notice");
      const _component_t_tag = Tag;
      const _component_i_upload_one = resolveComponent("i-upload-one");
      const _component_i_close = resolveComponent("i-close");
      const _component_t_button = Button;
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_form = Form;
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        visible: addAssetsShow.value,
        "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => addAssetsShow.value = $event),
        closable: false,
        width: "40vw",
        header: props.formData.id ? "编辑" : "新增",
        maskClosable: false,
        onCloseBtnClick: handleCancel,
        onConfirm,
        onCancel: handleCancel
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$2, [
            createVNode(_component_t_form, {
              data: props.formData,
              rules: unref(rules),
              ref_key: "formRef",
              ref: formRef
            }, {
              default: withCtx(() => [
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("workbench.assets.add.audioName"),
                  name: "name"
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_input, {
                      modelValue: props.formData.name,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => props.formData.name = $event),
                      placeholder: _ctx.$t("workbench.assets.add.audioNamePh")
                    }, null, 8, ["modelValue", "placeholder"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("workbench.assets.add.describe"),
                  name: "describe"
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_textarea, {
                      modelValue: props.formData.describe,
                      "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => props.formData.describe = $event),
                      placeholder: _ctx.$t("workbench.assets.add.describePh")
                    }, null, 8, ["modelValue", "placeholder"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("workbench.assets.add.sex"),
                  name: "remark"
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_input, {
                      modelValue: props.formData.sex,
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => props.formData.sex = $event),
                      placeholder: _ctx.$t("workbench.assets.add.sexPh")
                    }, null, 8, ["modelValue", "placeholder"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("workbench.assets.add.audioFile"),
                  name: "audioFile"
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_2$2, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(unref(audioItems), (item, index) => {
                        return openBlock(), createElementBlock("div", {
                          key: index,
                          class: "audio-item"
                        }, [
                          createBaseVNode("div", _hoisted_3$2, [
                            createBaseVNode("div", {
                              class: "audio-file-area",
                              onClick: ($event) => triggerFileInput(index),
                              onDragover: _cache[3] || (_cache[3] = withModifiers(() => {
                              }, ["prevent"])),
                              onDrop: withModifiers((e) => handleDrop(e, index), ["prevent"])
                            }, [
                              item.file ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                                createVNode(_component_i_volume_notice, { size: "16" }),
                                createBaseVNode("span", _hoisted_5$2, toDisplayString(item.file.name), 1)
                              ], 64)) : item.src ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                                createVNode(_component_i_volume_notice, {
                                  size: "16",
                                  fill: "var(--td-success-color)"
                                }),
                                createBaseVNode("span", _hoisted_6$2, toDisplayString(item.name), 1),
                                createVNode(_component_t_tag, {
                                  size: "small",
                                  theme: "success",
                                  variant: "light",
                                  style: { "margin-left": "auto", "flex-shrink": "0" }
                                }, {
                                  default: withCtx(() => [..._cache[5] || (_cache[5] = [
                                    createTextVNode("已上传", -1)
                                  ])]),
                                  _: 1
                                })
                              ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                                createVNode(_component_i_upload_one, {
                                  size: "16",
                                  fill: "var(--td-brand-color)"
                                }),
                                _cache[6] || (_cache[6] = createBaseVNode("span", { class: "audio-upload-hint" }, "点击或拖拽上传音频", -1))
                              ], 64)),
                              createBaseVNode("input", {
                                ref_for: true,
                                ref: (el) => unref(fileInputRefs)[index] = el,
                                type: "file",
                                accept: "audio/*",
                                style: { "display": "none" },
                                onChange: (e) => handleFileChange(e, index)
                              }, null, 40, _hoisted_7$2)
                            ], 40, _hoisted_4$2),
                            createVNode(_component_t_button, {
                              theme: "danger",
                              variant: "outline",
                              shape: "circle",
                              size: "small",
                              onClick: ($event) => removeAudioItem(index)
                            }, {
                              icon: withCtx(() => [
                                createVNode(_component_i_close, { size: "12" })
                              ]),
                              _: 1
                            }, 8, ["onClick"])
                          ]),
                          createVNode(_component_t_input, {
                            modelValue: item.text,
                            "onUpdate:modelValue": ($event) => item.text = $event,
                            placeholder: "请输入该音频对应的文本内容",
                            class: "audio-text-input"
                          }, null, 8, ["modelValue", "onUpdate:modelValue"]),
                          createVNode(_component_t_input, {
                            modelValue: item.describe,
                            "onUpdate:modelValue": ($event) => item.describe = $event,
                            placeholder: "请输入该音频的描述",
                            class: "audio-text-input"
                          }, null, 8, ["modelValue", "onUpdate:modelValue"])
                        ]);
                      }), 128)),
                      createVNode(_component_t_button, {
                        theme: "primary",
                        variant: "outline",
                        size: "small",
                        onClick: addAudioItem
                      }, {
                        icon: withCtx(() => [
                          createVNode(_component_i_plus)
                        ]),
                        default: withCtx(() => [
                          _cache[7] || (_cache[7] = createTextVNode(" 添加音频 ", -1))
                        ]),
                        _: 1
                      })
                    ])
                  ]),
                  _: 1
                }, 8, ["label"])
              ]),
              _: 1
            }, 8, ["data", "rules"])
          ])
        ]),
        _: 1
      }, 8, ["visible", "header"]);
    };
  }
});

/* unplugin-vue-components disabled */

const addAudioAssets = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-4658a6e9"]]);

const _hoisted_1$1 = { class: "generateImage" };
const _hoisted_2$1 = { class: "data f" };
const _hoisted_3$1 = { class: "uploadReferenceImage" };
const _hoisted_4$1 = { class: "jb" };
const _hoisted_5$1 = { style: { "font-size": "16px", "font-weight": "900" } };
const _hoisted_6$1 = { class: "upload" };
const _hoisted_7$1 = { class: "rawPicturePrompt" };
const _hoisted_8$1 = { class: "jb" };
const _hoisted_9$1 = { style: { "font-size": "16px", "font-weight": "900" } };
const _hoisted_10$1 = { style: { "margin-left": "5px", "font-size": "13px" } };
const _hoisted_11$1 = { class: "input" };
const _hoisted_12$1 = { class: "selectModel f" };
const _hoisted_13$1 = { style: { "width": "60%" } };
const _hoisted_14$1 = { style: { "font-size": "16px", "font-weight": "900" } };
const _hoisted_15$1 = { style: { "width": "40%", "margin-left": "15px" } };
const _hoisted_16$1 = { style: { "font-size": "16px", "font-weight": "900" } };
const _hoisted_17$1 = {
  class: "generateButton",
  style: { "margin-top": "20px" }
};
const _hoisted_18$1 = {
  class: "resultImages",
  style: { "gap": "20px", "flex-wrap": "wrap" }
};
const _hoisted_19$1 = { class: "image f w" };
const _hoisted_20$1 = ["onClick", "onMouseenter"];
const _hoisted_21$1 = {
  key: 0,
  class: "generating-overlay f ac jc"
};
const _hoisted_22$1 = {
  key: 1,
  class: "failed-overlay f ac jc"
};
const _hoisted_23$1 = { style: { "text-align": "center" } };
const _hoisted_24$1 = { style: { "margin-top": "10px", "color": "#d0021b", "font-weight": "bold" } };
const _hoisted_25$1 = { class: "preview" };
const _hoisted_26$1 = { class: "selected" };
const _hoisted_27$1 = { class: "delImage" };
const _hoisted_28$1 = { class: "customUpload" };
const _hoisted_29$1 = {
  class: "uploadPlaceholder f ac jc",
  style: { "width": "180px", "height": "180px", "border": "2px dashed #d9d9d9", "border-radius": "20px", "cursor": "pointer" }
};
const _hoisted_30$1 = { class: "keep" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "generateImage",
  props: /* @__PURE__ */ mergeModels({
    formData: {}
  }, {
    "modelValue": {
      type: Boolean,
      default: false
    },
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["update"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const { project } = storeToRefs(projectStore());
    const props = __props;
    const generateImageShow = useModel(__props, "modelValue");
    function handleCancel() {
      generateImageShow.value = false;
      generateLoading.value = false;
      stopPolling();
      emit("update");
    }
    const referenceFileList = ref([]);
    const autoUpload = ref(false);
    const showImageFileName = ref(false);
    const generateLoading = ref(false);
    const selectValue = ref("");
    const value2 = ref("");
    const promptLoading = ref(false);
    async function generatePrompt() {
      promptLoading.value = true;
      try {
        const { data } = await instance.post("/assetsGenerate/polishAssetsPrompt", {
          projectId: project.value?.id,
          assetsId: props.formData.id,
          type: props.formData.type ?? "props",
          name: props.formData.name,
          describe: props.formData.describe ? props.formData.describe : $t("workbench.assets.noDescription")
        });
        window.$message.success($t("workbench.assets.gen.promptSuccess"));
        if (data.assetsId === props.formData.id) {
          props.formData.prompt = data.prompt;
        }
      } catch (e) {
        window.$message.error(e.message ?? $t("workbench.assets.gen.promptFail"));
      } finally {
        promptLoading.value = false;
      }
    }
    const emit = __emit;
    const resolution = ref("1K");
    async function handleGenerate() {
      if (!props.formData.prompt) {
        window.$message.error($t("workbench.assets.gen.fillPrompt"));
        return;
      }
      if (!resolution.value) {
        window.$message.error($t("workbench.assets.gen.pickResolution"));
        return;
      }
      if (!selectValue.value) {
        window.$message.error($t("workbench.assets.gen.pickModel"));
        return;
      }
      generateLoading.value = true;
      try {
        let referenceImageBase64 = "";
        if (referenceFileList.value.length > 0) {
          const file = referenceFileList.value[0].raw;
          if (file instanceof File) {
            referenceImageBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result;
                resolve(base64);
              };
              reader.readAsDataURL(file);
            });
          }
        }
        await instance.post("/assetsGenerate/generateAssets", {
          type: props.formData.type ?? "props",
          projectId: project.value?.id,
          name: props.formData.name ?? $t("workbench.assets.gen.unnamed"),
          base64: referenceImageBase64,
          prompt: props.formData.prompt,
          model: selectValue.value,
          id: props.formData.id,
          resolution: resolution.value
        });
        window.$message.success($t("workbench.assets.gen.assetGenSuccess"));
        await fetchGeneratedImages();
      } catch (e) {
        window.$message.error(e.message ?? $t("workbench.assets.gen.assetGenFail"));
        fetchGeneratedImages();
      } finally {
        generateLoading.value = false;
      }
    }
    const customFileList = ref([]);
    function handleCustomUpload(files) {
      if (files.length > 0) {
        const file = files[0]?.raw || files[0];
        if (file instanceof File) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result;
            resultImages.value.push({
              id: "",
              src: base64,
              state: "已完成"
            });
            window.$message.success($t("workbench.assets.gen.uploadOk"));
            customFileList.value = [];
          };
          reader.readAsDataURL(file);
        }
      }
    }
    const resultImages = ref([]);
    const visible = ref(false);
    const trigger = ref();
    function handlePreview(src) {
      visible.value = true;
      trigger.value = src;
    }
    const selectedImageIndex = ref(null);
    const hoveredImageIndex = ref(null);
    watch(
      () => generateImageShow.value,
      (newVal) => {
        if (newVal) {
          referenceFileList.value = [];
          value2.value = "";
          selectedImageIndex.value = null;
          hoveredImageIndex.value = null;
          generateLoading.value = false;
          fetchGeneratedImages();
        }
      }
    );
    let pollingTimer = null;
    function stopPolling() {
      if (pollingTimer) {
        clearTimeout(pollingTimer);
        pollingTimer = null;
      }
    }
    async function fetchGeneratedImages() {
      const { data } = await instance.post("/assets/getImage", { assetsId: props.formData.id });
      const images = data.tempAssets.map((item) => ({
        id: item.id,
        src: item.filePath,
        state: item.state,
        selected: item.selected ?? false
      }));
      resultImages.value = images;
      const selectedIdx = images.findIndex((img) => img.selected);
      if (selectedIdx !== -1) {
        selectedImageIndex.value = selectedIdx;
      }
      const hasGenerating = images.some((img) => img.state === "生成中");
      stopPolling();
      if (hasGenerating && generateImageShow.value) {
        pollingTimer = setTimeout(() => fetchGeneratedImages(), 3e3);
      }
    }
    function selectImage(index) {
      const img = resultImages.value[index];
      if (img.state === "已完成") {
        selectedImageIndex.value = index;
        window.$message.success($t("workbench.assets.gen.imageSelected"));
      }
    }
    function deleteImage(id, index) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.assets.confirmDeleteHeader"),
        body: $t("workbench.assets.confirmDeleteBody"),
        confirmBtn: $t("workbench.assets.deleteBtn"),
        cancelBtn: $t("workbench.assets.cancelBtn"),
        theme: "warning",
        onConfirm: async () => {
          try {
            instance.post("/assets/delImage", { id });
            window.$message.success($t("workbench.assets.deleteSuccess"));
            resultImages.value.splice(index, 1);
            if (selectedImageIndex.value === index) {
              selectedImageIndex.value = null;
            } else if (selectedImageIndex.value !== null && selectedImageIndex.value > index) {
              selectedImageIndex.value--;
            }
            dialog.destroy();
          } catch (error) {
            window.$message.error($t("workbench.assets.deleteFail"));
            dialog.destroy();
          }
        }
      });
    }
    async function onClick() {
      if (selectedImageIndex.value !== null) {
        const selectedImage = resultImages.value[selectedImageIndex.value];
        const isLocalUpload = !selectedImage.id;
        await instance.post("/assets/saveAssets", {
          id: props.formData.id,
          base64: isLocalUpload ? selectedImage.src : "",
          type: props.formData.type,
          prompt: props.formData.prompt,
          projectId: project.value?.id,
          imageId: isLocalUpload ? void 0 : Number(selectedImage.id)
        });
        window.$message.success($t("workbench.assets.gen.imageSaved"));
        generateImageShow.value = false;
        emit("update");
      }
    }
    return (_ctx, _cache) => {
      const _component_t_tag = Tag;
      const _component_t_upload = Upload;
      const _component_i_magic = resolveComponent("i-magic");
      const _component_t_textarea = Textarea;
      const _component_t_loading = Loading;
      const _component_t_option = Option;
      const _component_t_select = Select;
      const _component_t_button = Button;
      const _component_t_card = Card;
      const _component_t_divider = Divider;
      const _component_i_close_one = resolveComponent("i-close-one");
      const _component_t_image = Image;
      const _component_i_preview_open = resolveComponent("i-preview-open");
      const _component_i_check_one = resolveComponent("i-check-one");
      const _component_i_delete = resolveComponent("i-delete");
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_image_viewer = ImageViewer;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createVNode(_component_t_dialog, {
          visible: generateImageShow.value,
          "onUpdate:visible": _cache[7] || (_cache[7] = ($event) => generateImageShow.value = $event),
          top: "4vh",
          width: "80vw",
          header: _ctx.$t("workbench.assets.gen.header"),
          maskClosable: false,
          footer: false,
          onCloseBtnClick: handleCancel
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2$1, [
              createVNode(_component_t_card, {
                bordered: false,
                style: { width: "40%" }
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", _hoisted_3$1, [
                    createBaseVNode("div", _hoisted_4$1, [
                      createBaseVNode("span", _hoisted_5$1, toDisplayString(_ctx.$t("workbench.assets.gen.uploadRef")), 1),
                      createVNode(_component_t_tag, null, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(_ctx.$t("workbench.assets.gen.optional")), 1)
                        ]),
                        _: 1
                      })
                    ]),
                    createBaseVNode("div", _hoisted_6$1, [
                      createVNode(_component_t_upload, {
                        modelValue: unref(referenceFileList),
                        "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(referenceFileList) ? referenceFileList.value = $event : null),
                        autoUpload: unref(autoUpload),
                        disabled: unref(generateLoading),
                        theme: "image",
                        abridgeName: [10, 8],
                        draggable: "",
                        action: "",
                        accept: "image/*",
                        showImageFileName: unref(showImageFileName)
                      }, null, 8, ["modelValue", "autoUpload", "disabled", "showImageFileName"])
                    ])
                  ]),
                  createBaseVNode("div", _hoisted_7$1, [
                    createBaseVNode("div", _hoisted_8$1, [
                      createBaseVNode("span", _hoisted_9$1, toDisplayString(_ctx.$t("workbench.assets.gen.promptLabel")), 1),
                      createBaseVNode("div", {
                        class: "ac",
                        style: { "cursor": "pointer" },
                        onClick: withModifiers(generatePrompt, ["stop"])
                      }, [
                        createVNode(_component_i_magic, {
                          theme: "outline",
                          size: "18"
                        }),
                        createBaseVNode("span", _hoisted_10$1, toDisplayString(_ctx.$t("workbench.assets.gen.smartGenerate")), 1)
                      ])
                    ]),
                    createBaseVNode("div", _hoisted_11$1, [
                      createVNode(_component_t_loading, {
                        loading: unref(promptLoading),
                        text: _ctx.$t("workbench.assets.gen.generatingPrompt")
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_t_textarea, {
                            modelValue: props.formData.prompt,
                            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => props.formData.prompt = $event),
                            placeholder: _ctx.$t("workbench.assets.gen.promptPlaceholder"),
                            autosize: { minRows: 15, maxRows: 15 },
                            disabled: unref(generateLoading)
                          }, null, 8, ["modelValue", "placeholder", "disabled"])
                        ]),
                        _: 1
                      }, 8, ["loading", "text"])
                    ])
                  ]),
                  createBaseVNode("div", _hoisted_12$1, [
                    createBaseVNode("div", _hoisted_13$1, [
                      createBaseVNode("span", _hoisted_14$1, toDisplayString(_ctx.$t("workbench.assets.gen.selectModel")), 1),
                      createVNode(__unplugin_components_0, {
                        modelValue: unref(selectValue),
                        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(selectValue) ? selectValue.value = $event : null),
                        type: `image`
                      }, null, 8, ["modelValue"])
                    ]),
                    createBaseVNode("div", _hoisted_15$1, [
                      createBaseVNode("span", _hoisted_16$1, toDisplayString(_ctx.$t("workbench.assets.gen.selectResolution")), 1),
                      createVNode(_component_t_select, {
                        modelValue: unref(resolution),
                        "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(resolution) ? resolution.value = $event : null)
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_t_option, {
                            key: "1K",
                            label: "1K",
                            value: "1K"
                          }),
                          createVNode(_component_t_option, {
                            key: "2K",
                            label: "2K",
                            value: "2K"
                          }),
                          createVNode(_component_t_option, {
                            key: "4K",
                            label: "4K",
                            value: "4K"
                          })
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ])
                  ]),
                  createBaseVNode("div", _hoisted_17$1, [
                    createVNode(_component_t_button, {
                      theme: "primary",
                      size: "large",
                      block: "",
                      loading: unref(generateLoading),
                      onClick: handleGenerate
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("workbench.assets.gen.generateBtn")), 1)
                      ]),
                      _: 1
                    }, 8, ["loading"])
                  ])
                ]),
                _: 1
              }),
              createVNode(_component_t_divider, {
                layout: "vertical",
                style: { "height": "700px" }
              }),
              createVNode(_component_t_card, {
                title: _ctx.$t("workbench.assets.gen.resultTitle"),
                bordered: false,
                style: { width: "60%" }
              }, {
                actions: withCtx(() => [
                  unref(resultImages).length ? (openBlock(), createBlock(_component_t_tag, { key: 0 }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("workbench.assets.gen.generatedCount", { count: unref(resultImages).length })), 1)
                    ]),
                    _: 1
                  })) : createCommentVNode("", true)
                ]),
                default: withCtx(() => [
                  createBaseVNode("div", _hoisted_18$1, [
                    createBaseVNode("div", _hoisted_19$1, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(unref(resultImages), (img, index) => {
                        return openBlock(), createElementBlock("div", {
                          key: index,
                          class: normalizeClass(["resultImage", { "is-selected": unref(selectedImageIndex) === index, "is-disabled": img.state !== "已完成" }]),
                          onClick: ($event) => img.state === "已完成" ? selectImage(index) : null,
                          onMouseenter: ($event) => hoveredImageIndex.value = index,
                          onMouseleave: _cache[4] || (_cache[4] = ($event) => hoveredImageIndex.value = null)
                        }, [
                          img.state === "生成中" ? (openBlock(), createElementBlock("div", _hoisted_21$1, [
                            createVNode(_component_t_loading, {
                              text: _ctx.$t("workbench.assets.gen.generatingLabel")
                            }, null, 8, ["text"])
                          ])) : img.state === "生成失败" && !img.src ? (openBlock(), createElementBlock("div", _hoisted_22$1, [
                            createBaseVNode("div", _hoisted_23$1, [
                              createVNode(_component_i_close_one, {
                                theme: "filled",
                                size: "40",
                                fill: "#d0021b"
                              }),
                              createBaseVNode("div", _hoisted_24$1, toDisplayString(_ctx.$t("workbench.assets.gen.genFailed")), 1)
                            ])
                          ])) : (openBlock(), createBlock(_component_t_image, {
                            key: 2,
                            src: img.src,
                            fit: "cover",
                            style: { width: "100%", height: "100%", borderRadius: "20px" }
                          }, {
                            loading: withCtx(() => [
                              createVNode(_component_t_loading)
                            ]),
                            _: 1
                          }, 8, ["src"])),
                          withDirectives(createBaseVNode("div", _hoisted_25$1, [
                            createVNode(_component_i_preview_open, {
                              theme: "outline",
                              size: "25",
                              fill: "#ffffff",
                              onClick: withModifiers(($event) => handlePreview(img.src), ["stop"])
                            }, null, 8, ["onClick"])
                          ], 512), [
                            [vShow, unref(hoveredImageIndex) === index && img.state === "已完成"]
                          ]),
                          withDirectives(createBaseVNode("div", _hoisted_26$1, [
                            createVNode(_component_i_check_one, {
                              theme: "filled",
                              size: "25",
                              fill: "#000"
                            })
                          ], 512), [
                            [vShow, unref(selectedImageIndex) === index && img.state === "已完成"]
                          ]),
                          withDirectives(createBaseVNode("div", _hoisted_27$1, [
                            createVNode(_component_i_delete, {
                              theme: "outline",
                              size: "20",
                              fill: "#d0021b",
                              onClick: withModifiers(($event) => deleteImage(img.id, index), ["stop"])
                            }, null, 8, ["onClick"])
                          ], 512), [
                            [vShow, unref(hoveredImageIndex) === index]
                          ])
                        ], 42, _hoisted_20$1);
                      }), 128)),
                      createBaseVNode("div", _hoisted_28$1, [
                        createVNode(_component_t_upload, {
                          ref: "customUploadRef",
                          action: "",
                          modelValue: unref(customFileList),
                          "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef(customFileList) ? customFileList.value = $event : null),
                          disabled: unref(generateLoading),
                          autoUpload: false,
                          theme: "custom",
                          accept: "image/*",
                          max: 1,
                          onChange: handleCustomUpload,
                          showImageFileName: false
                        }, {
                          default: withCtx(() => [
                            createBaseVNode("div", _hoisted_29$1, [
                              createVNode(_component_i_plus, {
                                theme: "outline",
                                size: "24",
                                fill: "#4a4a4a"
                              })
                            ])
                          ]),
                          _: 1
                        }, 8, ["modelValue", "disabled"])
                      ])
                    ])
                  ]),
                  createBaseVNode("div", _hoisted_30$1, [
                    createVNode(_component_t_button, {
                      theme: "primary",
                      size: "large",
                      block: "",
                      disabled: unref(selectedImageIndex) === null,
                      onClick
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("workbench.assets.gen.confirmSelect")), 1)
                      ]),
                      _: 1
                    }, 8, ["disabled"])
                  ])
                ]),
                _: 1
              }, 8, ["title"])
            ]),
            createVNode(_component_t_image_viewer, {
              modelValue: unref(visible),
              "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => isRef(visible) ? visible.value = $event : null),
              images: [unref(trigger)]
            }, null, 8, ["modelValue", "images"])
          ]),
          _: 1
        }, 8, ["visible", "header"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const generateImage = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-999c0778"]]);

const _hoisted_1 = { class: "assets" };
const _hoisted_2 = { class: "data" };
const _hoisted_3 = { class: "tabLabel" };
const _hoisted_4 = { class: "panelContent" };
const _hoisted_5 = { class: "toolbar" };
const _hoisted_6 = { class: "data" };
const _hoisted_7 = { class: "generatePrompt" };
const _hoisted_8 = { class: "generateImage" };
const _hoisted_9 = { class: "f ac" };
const _hoisted_10 = { class: "assetsList f w" };
const _hoisted_11 = { class: "expandedContent" };
const _hoisted_12 = { class: "previewCell" };
const _hoisted_13 = {
  key: 0,
  class: "imageTrigger generatingImage"
};
const _hoisted_14 = { class: "generatingLabel" };
const _hoisted_15 = ["onClick"];
const _hoisted_16 = ["src", "alt"];
const _hoisted_17 = {
  key: 1,
  class: "noImage"
};
const _hoisted_18 = {
  key: 2,
  class: "imageHoverOverlay"
};
const _hoisted_19 = { class: "hoverText" };
const _hoisted_20 = { class: "promptCell" };
const _hoisted_21 = { class: "previewCell" };
const _hoisted_22 = ["onClick"];
const _hoisted_23 = ["src", "alt"];
const _hoisted_24 = {
  key: 1,
  class: "noImage"
};
const _hoisted_25 = {
  key: 2,
  class: "imageHoverOverlay"
};
const _hoisted_26 = { class: "hoverText" };
const _hoisted_27 = { class: "promptCell" };
const _hoisted_28 = { class: "previewCell" };
const _hoisted_29 = {
  key: 0,
  class: "imageTrigger generatingImage"
};
const _hoisted_30 = { class: "generatingLabel" };
const _hoisted_31 = ["onClick"];
const _hoisted_32 = ["src", "alt"];
const _hoisted_33 = {
  key: 1,
  class: "noImage"
};
const _hoisted_34 = {
  key: 2,
  class: "imageHoverOverlay"
};
const _hoisted_35 = { class: "hoverText" };
const _hoisted_36 = { class: "previewCell" };
const _hoisted_37 = ["onClick"];
const _hoisted_38 = ["src", "alt"];
const _hoisted_39 = { class: "mediaHoverOverlay" };
const _hoisted_40 = { class: "hoverText" };
const _hoisted_41 = ["onClick"];
const _hoisted_42 = ["src"];
const _hoisted_43 = { class: "mediaHoverOverlay" };
const _hoisted_44 = { class: "hoverText" };
const _hoisted_45 = ["onClick"];
const _hoisted_46 = { class: "mediaHoverOverlay" };
const _hoisted_47 = { class: "hoverText" };
const _hoisted_48 = {
  key: 3,
  class: "mediaTrigger noMedia"
};
const _hoisted_49 = { class: "expandedContent" };
const _hoisted_50 = { class: "previewCell" };
const _hoisted_51 = ["onClick"];
const _hoisted_52 = { class: "mediaHoverOverlay" };
const _hoisted_53 = { class: "hoverText" };
const _hoisted_54 = { class: "promptCell" };
const _hoisted_55 = { class: "previewCell" };
const _hoisted_56 = ["onClick"];
const _hoisted_57 = { class: "mediaHoverOverlay" };
const _hoisted_58 = { class: "hoverText" };
const _hoisted_59 = { class: "mediaPreviewDialog" };
const _hoisted_60 = ["src"];
const _hoisted_61 = {
  key: 1,
  class: "audioWrapper"
};
const _hoisted_62 = { class: "audioIcon" };
const _hoisted_63 = { class: "audioName" };
const _hoisted_64 = ["src"];
const _hoisted_65 = { class: "batch" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    selectorMode: { type: Boolean, default: false },
    allowedTypes: {},
    clipMediaTypes: {},
    multiple: { type: Boolean, default: true }
  },
  setup(__props, { expose: __expose }) {
    const { otherSetting } = storeToRefs(settingStore());
    const props = __props;
    const addAudioShow = ref(false);
    const audioFormData = ref({
      name: "",
      describe: "",
      sex: ""
    });
    onMounted(() => {
      loadCurrentTabData();
    });
    onUnmounted(() => {
      stopPolling();
      stopImagePolling();
    });
    const { project } = storeToRefs(projectStore());
    const allThemeData = [
      {
        name: $t("workbench.assets.role"),
        value: "role",
        icon: "i-permissions"
      },
      {
        name: $t("workbench.assets.prop"),
        value: "tool",
        icon: "i-tool"
      },
      {
        name: $t("workbench.assets.scene"),
        value: "scene",
        icon: "i-landscape"
      },
      {
        name: $t("workbench.assets.clip"),
        value: "clip",
        icon: "i-editing"
      },
      {
        name: $t("workbench.assets.audio"),
        value: "audio",
        icon: "i-audio-file"
      }
    ];
    const themeData = ref(props.allowedTypes?.length ? allThemeData.filter((item) => props.allowedTypes.includes(item.value)) : allThemeData);
    const initialTab = themeData.value[0]?.value || "role";
    const assetOptions = ref(initialTab);
    const searchText = ref("");
    const tabNameMap = {
      role: $t("workbench.assets.role"),
      tool: $t("workbench.assets.prop"),
      scene: $t("workbench.assets.scene"),
      clip: $t("workbench.assets.clip"),
      audio: $t("workbench.assets.audio")
    };
    const selectedRowKeys = ref([]);
    const selectedSubRowKeys = ref([]);
    const expandedRowKeys = ref([]);
    const loading = ref(false);
    const isGenerating = (id) => {
      const item = findAssetById(id);
      return item?.promptState === "生成中" || item?.state === "生成中";
    };
    const tableData = ref([]);
    const pagination = ref({
      page: 1,
      pageSize: 10,
      total: 0,
      showJumper: true
    });
    function handleSearch() {
      pagination.value.page = 1;
      getFilteredData(assetOptions.value);
    }
    async function getFilteredData(type) {
      try {
        loading.value = true;
        const { data } = await instance.post("/assets/getAssetsApi", {
          projectId: project.value?.id,
          type,
          name: searchText.value || void 0,
          page: pagination.value.page,
          limit: pagination.value.pageSize
        });
        tableData.value = data.data || [];
        if (type === "clip" && props.clipMediaTypes?.length) {
          tableData.value = tableData.value.filter((item) => {
            const mt = getMediaType(item.src);
            return props.clipMediaTypes.includes(mt);
          });
        }
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
    async function loadCurrentTabData() {
      if (assetOptions.value === "role") ; else if (assetOptions.value === "tool") ; else if (assetOptions.value === "scene") ; else if (assetOptions.value === "clip") ; else if (assetOptions.value === "audio") ;
      await getFilteredData(assetOptions.value);
    }
    function selectAssetOptions(value) {
      searchText.value = "";
      selectedRowKeys.value = [];
      selectedSubRowKeys.value = [];
      expandedRowKeys.value = [];
      pagination.value.page = 1;
      loadCurrentTabData();
    }
    const formData = ref({
      id: 0,
      name: "",
      describe: "",
      remark: "",
      src: "",
      prompt: ""
    });
    const addAssetsShow = ref(false);
    const { open, onChange, onCancel } = useFileDialog({ multiple: false, reset: true, accept: ".png,.jpg,.jpeg,.mp3,.mp4" });
    async function handleAdd(type) {
      if (type === "clip") {
        const files = await new Promise((resolve) => {
          open();
          onChange((f) => resolve(f));
          onCancel(() => resolve(null));
        });
        if (!files?.length) return;
        const file = files[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = reader.result;
          await instance.post("/assets/uploadClip", {
            projectId: project.value?.id,
            base64Data: base64,
            name: file.name
          });
          window.$message.success($t("workbench.assets.uploadSuccess"));
          getFilteredData(assetOptions.value);
        };
        reader.readAsDataURL(file);
      } else if (type == "audio") {
        addAudioShow.value = true;
        audioFormData.value = {
          name: "",
          describe: "",
          sex: ""
        };
      } else {
        addAssetsShow.value = true;
        formData.value = {
          id: 0,
          name: "",
          describe: "",
          remark: "",
          prompt: ""
        };
      }
    }
    const batchGenerationShow = ref(false);
    const selectValue = ref("");
    const resolution = ref("1K");
    const batchType = ref("");
    function batchGeneration(type) {
      batchType.value = type === 1 ? $t("workbench.assets.batchGenPrompt") : $t("workbench.assets.batchGenImage");
      batchGenerationShow.value = true;
    }
    function keep() {
      if (batchType.value === $t("workbench.assets.batchGenPrompt")) {
        handleBatchGeneratePrompt();
      } else if (batchType.value === $t("workbench.assets.batchGenImage")) {
        handleBatchGenerateImage();
      }
    }
    function getSelectedSubAssets() {
      const subAssets = [];
      tableData.value.forEach((row) => {
        if (row.sonAssets?.length) {
          row.sonAssets.forEach((sub) => {
            if (selectedSubRowKeys.value.includes(sub.id)) {
              subAssets.push(sub);
            }
          });
        }
      });
      return subAssets;
    }
    async function handleBatchGeneratePrompt() {
      const selectedParentAssets = tableData.value.filter((item) => selectedRowKeys.value.includes(item.id));
      const selectedSubAssets = getSelectedSubAssets();
      const selectedAssets = [...selectedParentAssets, ...selectedSubAssets];
      if (selectedAssets.length === 0) {
        window.$message.warning($t("workbench.assets.selectAtLeastOne"));
        return;
      }
      selectedParentAssets.forEach((asset) => {
        const target = tableData.value.find((row) => row.id === asset.id);
        if (target) target.promptState = "生成中";
      });
      selectedSubAssets.forEach((asset) => {
        tableData.value.forEach((row) => {
          const target = row.sonAssets?.find((sub) => sub.id === asset.id);
          if (target) target.promptState = "生成中";
        });
      });
      selectedRowKeys.value = selectedRowKeys.value.filter((key) => !selectedParentAssets.some((a) => a.id === key));
      selectedSubRowKeys.value = selectedSubRowKeys.value.filter((key) => !selectedSubAssets.some((a) => a.id === key));
      batchGenerationShow.value = false;
      try {
        await instance.post("/assetsGenerate/batchPolishAssetsPrompt", {
          projectId: project.value?.id,
          concurrentCount: otherSetting.value.assetsBatchGenereateSize,
          items: selectedAssets.map((item) => ({
            assetsId: item.id,
            type: item.type ?? "props",
            name: item.name,
            describe: item.describe ? item.describe : $t("workbench.assets.noDescription")
          }))
        });
      } catch (e) {
        window.$message.error(e?.message ?? $t("workbench.assets.promptGenFail"));
      }
    }
    async function handleBatchGenerateImage() {
      const selectedParentAssets = tableData.value.filter((item) => selectedRowKeys.value.includes(item.id));
      const selectedSubAssets = getSelectedSubAssets();
      const selectedAssets = [...selectedParentAssets, ...selectedSubAssets];
      if (selectedAssets.length === 0) {
        window.$message.warning($t("workbench.assets.selectAtLeastOne"));
        return;
      }
      if (!selectValue.value) {
        window.$message.error($t("workbench.assets.selectModel"));
        return;
      }
      if (!resolution.value) {
        window.$message.error($t("workbench.assets.selectResolution"));
        return;
      }
      const validAssets = selectedAssets.filter((asset) => {
        if (!asset.prompt) {
          window.$message.warning($t("workbench.assets.noPromptForImage", { name: asset.name }));
          return false;
        }
        return true;
      });
      if (validAssets.length === 0) return;
      const validParentAssets = validAssets.filter((a) => selectedRowKeys.value.includes(a.id));
      const validSubAssets = validAssets.filter((a) => selectedSubRowKeys.value.includes(a.id));
      validParentAssets.forEach((asset) => {
        const target = tableData.value.find((row) => row.id === asset.id);
        if (target) target.state = "生成中";
      });
      validSubAssets.forEach((asset) => {
        tableData.value.forEach((row) => {
          const target = row.sonAssets?.find((sub) => sub.id === asset.id);
          if (target) target.state = "生成中";
        });
      });
      selectedRowKeys.value = selectedRowKeys.value.filter((key) => !validAssets.some((a) => a.id === key));
      selectedSubRowKeys.value = selectedSubRowKeys.value.filter((key) => !validAssets.some((a) => a.id === key));
      batchGenerationShow.value = false;
      try {
        await instance.post("/assetsGenerate/batchGenerateImageAssets", {
          projectId: project.value?.id,
          model: selectValue.value,
          resolution: resolution.value,
          concurrentCount: otherSetting.value.assetsBatchGenereateSize,
          items: validAssets.map((item) => ({
            id: item.id,
            type: item.type ?? "props",
            name: item.name ?? $t("workbench.cornerScape.unnamed"),
            prompt: item.prompt || item.describe
          }))
        });
      } catch (e) {
        window.$message.error($t("workbench.assets.imageGenFail", { name: "", error: e.message ?? "" }));
        validAssets.forEach((asset) => {
          const parentTarget = tableData.value.find((row) => row.id === asset.id);
          if (parentTarget) {
            parentTarget.state = "生成失败";
          } else {
            tableData.value.forEach((row) => {
              const subTarget = row.sonAssets?.find((sub) => sub.id === asset.id);
              if (subTarget) subTarget.state = "生成失败";
            });
          }
        });
      }
    }
    function handleBatchDelete() {
      const selectedParentAssets = tableData.value.filter((item) => selectedRowKeys.value.includes(item.id));
      const selectedSubAssets = getSelectedSubAssets();
      const selectedAssets = [...selectedParentAssets, ...selectedSubAssets];
      if (selectedAssets.length === 0) {
        window.$message.warning($t("workbench.assets.selectAtLeastOne"));
        return;
      }
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.assets.confirmDeleteHeader"),
        body: $t("workbench.assets.confirmBatchDeleteBody"),
        confirmBtn: $t("workbench.assets.deleteBtn"),
        cancelBtn: $t("workbench.assets.cancelBtn"),
        theme: "warning",
        onConfirm: async () => {
          await instance.post("/assets/batchDelete", { id: selectedAssets.map((asset) => asset.id) });
          window.$message.success($t("workbench.assets.deleteSuccess"));
          getFilteredData(assetOptions.value);
          dialog.destroy();
        }
      });
    }
    const selectType = props.multiple ? "multiple" : "single";
    const columns = [
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
        title: $t("workbench.assets.colPreview"),
        width: 100,
        align: "center",
        cell: "previewWithLoading"
      },
      {
        colKey: "name",
        title: $t("workbench.assets.colName"),
        width: 100,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "prompt",
        title: $t("workbench.assets.colPrompt"),
        width: 200,
        align: "left",
        ellipsis: true,
        cell: "prompt"
      },
      {
        colKey: "describe",
        title: $t("workbench.assets.colDescribe"),
        width: 200,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "remark",
        title: $t("workbench.assets.colRemark"),
        minWidth: 200,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "startTime",
        title: $t("workbench.assets.colCreateTime"),
        width: 200,
        align: "center",
        cell: "startTime"
      },
      {
        colKey: "operation",
        title: $t("workbench.assets.colOperation"),
        width: 280,
        align: "center",
        fixed: "right",
        cell: "operation"
      }
    ];
    const subColumns = [
      {
        colKey: "row-select",
        type: selectType,
        width: 50,
        align: "center",
        fixed: "left"
      },
      {
        colKey: "src",
        title: $t("workbench.assets.colPreview"),
        width: 100,
        align: "center",
        cell: "previewWithLoading"
      },
      {
        colKey: "name",
        title: $t("workbench.assets.colName"),
        width: 100,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "prompt",
        title: $t("workbench.assets.colPrompt"),
        width: 200,
        align: "left",
        ellipsis: true,
        cell: "prompt"
      },
      {
        colKey: "describe",
        title: $t("workbench.assets.colDescribe"),
        width: 100,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "remark",
        title: $t("workbench.assets.colRemark"),
        minWidth: 150,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "operation",
        title: $t("workbench.assets.colOperation"),
        width: 280,
        align: "center",
        fixed: "right",
        cell: "operation"
      }
    ];
    const clipColumns = [
      { colKey: "row-select", type: "multiple", width: 50, align: "center", fixed: "left" },
      {
        colKey: "name",
        title: $t("workbench.assets.colName"),
        width: 200,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "describe",
        title: $t("workbench.assets.colDescribe"),
        width: 200,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "remark",
        title: $t("workbench.assets.colRemark"),
        minWidth: 200,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "startTime",
        title: $t("workbench.assets.colCreateTime"),
        width: 200,
        align: "center",
        cell: "startTime"
      },
      {
        colKey: "operation",
        title: $t("workbench.assets.colOperation"),
        width: 180,
        align: "center",
        fixed: "right",
        cell: "operation"
      }
    ];
    const audioColumns = [
      { colKey: "row-select", type: selectType, width: 50, align: "center", fixed: "left" },
      {
        colKey: "name",
        title: $t("workbench.assets.audioName"),
        width: 200,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "sex",
        title: $t("workbench.assets.sex"),
        width: 200,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "describe",
        title: $t("workbench.assets.colDescribe"),
        width: 200,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "startTime",
        title: $t("workbench.assets.colCreateTime"),
        width: 200,
        align: "center",
        cell: "startTime"
      },
      {
        colKey: "operation",
        title: $t("workbench.assets.colOperation"),
        width: 180,
        align: "center",
        fixed: "right",
        cell: "operation"
      }
    ];
    const subAudioColumns = [
      {
        colKey: "row-select",
        type: selectType,
        width: 50,
        align: "center",
        fixed: "left"
      },
      {
        colKey: "src",
        title: $t("workbench.assets.colPreview"),
        width: 100,
        align: "center",
        cell: "previewWithLoading"
      },
      {
        colKey: "prompt",
        title: $t("workbench.assets.audioText"),
        width: 100,
        align: "left",
        ellipsis: true
      },
      {
        colKey: "operation",
        title: $t("workbench.assets.colOperation"),
        width: 280,
        align: "center",
        fixed: "right",
        cell: "operation"
      }
    ];
    function handleSelectChange(value) {
      const filtered = value.filter((key) => !isGenerating(key));
      if (!props.multiple) {
        selectedRowKeys.value = filtered.length > 0 ? [filtered[filtered.length - 1]] : [];
      } else {
        selectedRowKeys.value = filtered;
      }
    }
    function handleSubSelectChange(value) {
      if (!props.multiple) {
        selectedSubRowKeys.value = value.length > 0 ? [value[value.length - 1]] : [];
      } else {
        selectedSubRowKeys.value = value;
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
      loadCurrentTabData();
    }
    const generateImageShow = ref(false);
    const currentAssetData = ref({
      id: void 0,
      name: "",
      describe: "",
      type: "",
      prompt: "",
      src: ""
    });
    function generate(row) {
      currentAssetData.value = {
        id: row.id,
        name: row.name,
        describe: row.describe,
        type: row.type,
        prompt: row.prompt,
        src: row.src
      };
      generateImageShow.value = true;
    }
    function handleEdit(row) {
      console.log(row);
      if (row.type == "audio") {
        audioFormData.value = {
          ...row
        };
        addAudioShow.value = true;
      } else {
        formData.value = {
          ...row
        };
        addAssetsShow.value = true;
      }
    }
    function handleDelete(row) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.assets.confirmDeleteHeader"),
        body: $t("workbench.assets.confirmDeleteBody"),
        confirmBtn: $t("workbench.assets.deleteBtn"),
        cancelBtn: $t("workbench.assets.cancelBtn"),
        theme: "warning",
        onConfirm: async () => {
          try {
            await instance.post("/assets/delAssets", { id: row.id });
            window.$message.success($t("workbench.assets.deleteSuccess"));
            getFilteredData(assetOptions.value);
            dialog.destroy();
          } catch (error) {
            console.error("删除资产失败:", error);
            window.$message.error($t("workbench.assets.deleteFail"));
            dialog.destroy();
          }
        }
      });
    }
    __expose({
      selectedRowKeys,
      selectedSubRowKeys,
      tableData
    });
    function getMediaType(src) {
      if (!src) return "unknown";
      const ext = src.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
      if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
      if (["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext)) return "video";
      if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
      return "unknown";
    }
    const mediaPreviewShow = ref(false);
    const mediaPreviewSrc = ref("");
    const mediaPreviewType = ref("unknown");
    const mediaPreviewName = ref("");
    function openMediaPreview(src, name) {
      if (!src) return;
      mediaPreviewSrc.value = src;
      mediaPreviewType.value = getMediaType(src);
      mediaPreviewName.value = name;
      mediaPreviewShow.value = true;
    }
    function closeMediaPreview() {
      mediaPreviewShow.value = false;
      mediaPreviewSrc.value = "";
    }
    function getAllAssetsFlat() {
      const all = [];
      tableData.value.forEach((row) => {
        all.push(row);
        if (row.sonAssets?.length) {
          all.push(...row.sonAssets);
        }
      });
      return all;
    }
    function findAssetById(id) {
      for (const row of tableData.value) {
        if (row.id === id) return row;
        const sub = row.sonAssets?.find((s) => s.id === id);
        if (sub) return sub;
      }
      return void 0;
    }
    const notCompultedData = computed(() => {
      return getAllAssetsFlat().filter((item) => item.promptState == "生成中");
    });
    const generatingData = computed(() => {
      return getAllAssetsFlat().filter((item) => item.state === "生成中");
    });
    let pollingTimer = null;
    let imagePollingTimer = null;
    async function pollingPromptAssets() {
      if (notCompultedData.value.length === 0) return;
      const ids = notCompultedData.value.map((item) => item.id);
      try {
        const { data } = await instance.post("/assets/pollingPromptAssets", { ids });
        if (Array.isArray(data) && data.length) {
          data.forEach((item) => {
            const target = findAssetById(item.id);
            if (target) {
              target.promptState = item.promptState;
              if (item.prompt !== void 0) target.prompt = item.prompt;
            }
          });
          getFilteredData(assetOptions.value);
        }
      } catch (e) {
        console.error("轮询提示词状态失败:", e);
      }
    }
    async function pollingImageAssets() {
      if (generatingData.value.length === 0) return;
      const ids = generatingData.value.map((item) => item.id);
      try {
        const { data } = await instance.post("/assets/pollingImageAssets", { ids });
        if (Array.isArray(data) && data.length) {
          data.forEach((item) => {
            const target = findAssetById(item.id);
            if (target) {
              target.state = item.state;
              if (item.filePath !== void 0) target.filePath = item.filePath;
              if (item.src !== void 0) target.src = item.src;
              if (!item.src && item.filePath && item.state !== "生成中") {
                target.src = item.filePath;
              }
            }
          });
          getFilteredData(assetOptions.value);
        }
      } catch (e) {
        console.error("轮询图片生成状态失败:", e);
      }
    }
    function startPolling() {
      if (pollingTimer) return;
      pollingTimer = setInterval(async () => {
        if (notCompultedData.value.length === 0) {
          stopPolling();
          return;
        }
        await pollingPromptAssets();
      }, 3e3);
    }
    function stopPolling() {
      if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
      }
    }
    function startImagePolling() {
      if (imagePollingTimer) return;
      imagePollingTimer = setInterval(async () => {
        if (generatingData.value.length === 0) {
          stopImagePolling();
          return;
        }
        await pollingImageAssets();
      }, 3e3);
    }
    function stopImagePolling() {
      if (imagePollingTimer) {
        clearInterval(imagePollingTimer);
        imagePollingTimer = null;
      }
    }
    watch(notCompultedData, (val) => {
      if (val.length > 0) {
        startPolling();
      } else {
        stopPolling();
      }
    });
    watch(generatingData, (val) => {
      if (val.length > 0) {
        startImagePolling();
      } else {
        stopImagePolling();
      }
    });
    async function getBigImageUrl(row, fn) {
      row.src = `${row.src.split("?") ? row.src.split("?")[0] : row.src}`;
      nextTick(() => {
        fn();
      });
    }
    return (_ctx, _cache) => {
      const _component_t_icon = Icon;
      const _component_t_button = Button;
      const _component_t_popup = Popup;
      const _component_t_space = Space;
      const _component_t_input = Input;
      const _component_t_loading = Loading;
      const _component_t_image_viewer = ImageViewer;
      const _component_i_magic = resolveComponent("i-magic");
      const _component_t_table = Table;
      const _component_t_tab_panel = TabPanel;
      const _component_t_tabs = Tabs;
      const _component_t_dialog = Dialog;
      const _component_t_form_item = FormItem;
      const _component_t_option = Option;
      const _component_t_select = Select;
      const _component_t_form = Form;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createVNode(_component_t_tabs, {
            modelValue: unref(assetOptions),
            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(assetOptions) ? assetOptions.value = $event : null),
            onChange: selectAssetOptions
          }, {
            default: withCtx(() => [
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(themeData), (item, index) => {
                return openBlock(), createBlock(_component_t_tab_panel, {
                  key: index,
                  value: item.value
                }, {
                  label: withCtx(() => [
                    createBaseVNode("div", _hoisted_3, [
                      (openBlock(), createBlock(resolveDynamicComponent(item.icon), {
                        theme: "outline",
                        size: "20"
                      })),
                      createBaseVNode("span", null, toDisplayString(item.name), 1)
                    ])
                  ]),
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_4, [
                      createBaseVNode("div", _hoisted_5, [
                        createVNode(_component_t_space, null, {
                          default: withCtx(() => [
                            createVNode(_component_t_button, {
                              theme: "primary",
                              onClick: ($event) => handleAdd(item.value)
                            }, {
                              icon: withCtx(() => [
                                createVNode(_component_t_icon, { name: "add" })
                              ]),
                              default: withCtx(() => [
                                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.addPrefix")) + toDisplayString(item.name), 1)
                              ]),
                              _: 2
                            }, 1032, ["onClick"]),
                            createVNode(_component_t_popup, { placement: "bottom" }, {
                              content: withCtx(() => [
                                createBaseVNode("div", _hoisted_6, [
                                  createBaseVNode("div", _hoisted_7, [
                                    createBaseVNode("span", {
                                      onClick: _cache[0] || (_cache[0] = ($event) => batchGeneration(1))
                                    }, toDisplayString(_ctx.$t("workbench.assets.generatePrompt")), 1)
                                  ]),
                                  createBaseVNode("div", _hoisted_8, [
                                    createBaseVNode("span", {
                                      onClick: _cache[1] || (_cache[1] = ($event) => batchGeneration(2))
                                    }, toDisplayString(_ctx.$t("workbench.assets.generateImage")), 1)
                                  ])
                                ])
                              ]),
                              default: withCtx(() => [
                                unref(assetOptions) != "clip" && unref(assetOptions) != "audio" ? (openBlock(), createBlock(_component_t_button, {
                                  key: 0,
                                  theme: "primary"
                                }, {
                                  icon: withCtx(() => [
                                    createVNode(_component_t_icon, { name: "indent-left" })
                                  ]),
                                  default: withCtx(() => [
                                    createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.batchGenerate")), 1)
                                  ]),
                                  _: 1
                                })) : createCommentVNode("", true)
                              ]),
                              _: 1
                            }),
                            createVNode(_component_t_button, {
                              theme: "default",
                              variant: "outline",
                              onClick: handleBatchDelete
                            }, {
                              icon: withCtx(() => [
                                createVNode(_component_t_icon, { name: "delete" })
                              ]),
                              default: withCtx(() => [
                                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.batchDelete")), 1)
                              ]),
                              _: 1
                            })
                          ]),
                          _: 2
                        }, 1024),
                        createBaseVNode("div", _hoisted_9, [
                          createVNode(_component_t_input, {
                            modelValue: unref(searchText),
                            "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(searchText) ? searchText.value = $event : null),
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
                      createBaseVNode("div", _hoisted_10, [
                        ["role", "tool", "scene"].includes(unref(assetOptions)) ? (openBlock(), createBlock(_component_t_table, {
                          key: 0,
                          columns,
                          data: unref(tableData),
                          "selected-row-keys": unref(selectedRowKeys),
                          "expanded-row-keys": unref(expandedRowKeys),
                          "row-key": "id",
                          hover: "",
                          height: "calc(100vh - 300px)",
                          stripe: "",
                          size: "small",
                          pagination: unref(pagination),
                          loading: unref(loading),
                          "lazy-load": "",
                          "table-layout": "fixed",
                          "select-on-row-click": false,
                          onSelectChange: handleSelectChange,
                          onExpandChange: handleExpandChange,
                          onPageChange: handlePageChange
                        }, {
                          expandedRow: withCtx(({ row }) => [
                            createBaseVNode("div", _hoisted_11, [
                              createVNode(_component_t_table, {
                                columns: subColumns,
                                data: row.sonAssets || [],
                                "selected-row-keys": unref(selectedSubRowKeys),
                                "row-key": "id",
                                hover: "",
                                size: "small",
                                "table-layout": "fixed",
                                "select-on-row-click": false,
                                onSelectChange: handleSubSelectChange
                              }, {
                                previewWithLoading: withCtx(({ row: subRow }) => [
                                  createBaseVNode("div", _hoisted_12, [
                                    subRow.state === "生成中" ? (openBlock(), createElementBlock("div", _hoisted_13, [
                                      createVNode(_component_t_loading, { size: "small" }),
                                      createBaseVNode("span", _hoisted_14, toDisplayString(_ctx.$t("workbench.assets.generating")), 1)
                                    ])) : (openBlock(), createBlock(_component_t_image_viewer, {
                                      key: 1,
                                      images: [subRow.src],
                                      closeOnEscKeydown: true,
                                      closeOnOverlay: true
                                    }, {
                                      trigger: withCtx(({ open: open2 }) => [
                                        createBaseVNode("div", {
                                          class: "imageTrigger",
                                          onClick: ($event) => subRow.src && getBigImageUrl(subRow, open2())
                                        }, [
                                          subRow.src ? (openBlock(), createElementBlock("img", {
                                            key: 0,
                                            src: subRow.src,
                                            alt: subRow.name,
                                            class: "previewImage"
                                          }, null, 8, _hoisted_16)) : (openBlock(), createElementBlock("div", _hoisted_17, [
                                            createVNode(_component_t_icon, {
                                              name: "image",
                                              size: "24px"
                                            })
                                          ])),
                                          subRow.src ? (openBlock(), createElementBlock("div", _hoisted_18, [
                                            createVNode(_component_t_icon, {
                                              name: "browse",
                                              size: "20px"
                                            }),
                                            createBaseVNode("span", _hoisted_19, toDisplayString(_ctx.$t("workbench.assets.preview")), 1)
                                          ])) : createCommentVNode("", true)
                                        ], 8, _hoisted_15)
                                      ]),
                                      _: 2
                                    }, 1032, ["images"]))
                                  ])
                                ]),
                                prompt: withCtx(({ row: subRow }) => [
                                  createBaseVNode("div", _hoisted_20, [
                                    subRow.promptState === "生成中" ? (openBlock(), createBlock(_component_t_loading, {
                                      key: 0,
                                      size: "small",
                                      style: { "margin-right": "4px" }
                                    })) : createCommentVNode("", true),
                                    createBaseVNode("span", {
                                      class: normalizeClass({ "generating-text": subRow.promptState === "生成中" })
                                    }, toDisplayString(subRow.prompt), 3)
                                  ])
                                ]),
                                operation: withCtx(({ row: subRow }) => [
                                  createVNode(_component_t_space, { size: 0 }, {
                                    default: withCtx(() => [
                                      createVNode(_component_t_button, {
                                        theme: "primary",
                                        variant: "text",
                                        disabled: isGenerating(subRow.id),
                                        onClick: ($event) => generate(subRow)
                                      }, {
                                        icon: withCtx(() => [
                                          createVNode(_component_i_magic, { size: 18 })
                                        ]),
                                        default: withCtx(() => [
                                          createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.generate")), 1)
                                        ]),
                                        _: 1
                                      }, 8, ["disabled", "onClick"]),
                                      createVNode(_component_t_button, {
                                        theme: "primary",
                                        variant: "text",
                                        onClick: ($event) => handleEdit(subRow)
                                      }, {
                                        icon: withCtx(() => [
                                          createVNode(_component_t_icon, { name: "edit" })
                                        ]),
                                        default: withCtx(() => [
                                          createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.edit")), 1)
                                        ]),
                                        _: 1
                                      }, 8, ["onClick"]),
                                      createVNode(_component_t_button, {
                                        theme: "danger",
                                        variant: "text",
                                        disabled: isGenerating(subRow.id),
                                        onClick: ($event) => handleDelete(subRow)
                                      }, {
                                        icon: withCtx(() => [
                                          createVNode(_component_t_icon, { name: "delete" })
                                        ]),
                                        default: withCtx(() => [
                                          createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.delete")), 1)
                                        ]),
                                        _: 1
                                      }, 8, ["disabled", "onClick"])
                                    ]),
                                    _: 2
                                  }, 1024)
                                ]),
                                _: 1
                              }, 8, ["data", "selected-row-keys"])
                            ])
                          ]),
                          preview: withCtx(({ row }) => [
                            createBaseVNode("div", _hoisted_21, [
                              createVNode(_component_t_image_viewer, {
                                images: [row.src],
                                closeOnEscKeydown: true,
                                closeOnOverlay: true
                              }, {
                                trigger: withCtx(({ open: open2 }) => [
                                  createBaseVNode("div", {
                                    class: "imageTrigger",
                                    onClick: ($event) => row.src && getBigImageUrl(row, open2())
                                  }, [
                                    row.src ? (openBlock(), createElementBlock("img", {
                                      key: 0,
                                      src: row.src,
                                      alt: row.name,
                                      class: "previewImage"
                                    }, null, 8, _hoisted_23)) : (openBlock(), createElementBlock("div", _hoisted_24, [
                                      createVNode(_component_t_icon, {
                                        name: "image",
                                        size: "24px"
                                      })
                                    ])),
                                    row.src ? (openBlock(), createElementBlock("div", _hoisted_25, [
                                      createVNode(_component_t_icon, {
                                        name: "browse",
                                        size: "20px"
                                      }),
                                      createBaseVNode("span", _hoisted_26, toDisplayString(_ctx.$t("workbench.assets.preview")), 1)
                                    ])) : createCommentVNode("", true)
                                  ], 8, _hoisted_22)
                                ]),
                                _: 2
                              }, 1032, ["images"])
                            ])
                          ]),
                          prompt: withCtx(({ row }) => [
                            createBaseVNode("div", _hoisted_27, [
                              row.promptState === "生成中" ? (openBlock(), createBlock(_component_t_loading, {
                                key: 0,
                                size: "small",
                                style: { "margin-right": "4px" }
                              })) : createCommentVNode("", true),
                              createBaseVNode("span", {
                                class: normalizeClass({ "generating-text": row.promptState === "生成中" })
                              }, toDisplayString(row.prompt), 3)
                            ])
                          ]),
                          previewWithLoading: withCtx(({ row }) => [
                            createBaseVNode("div", _hoisted_28, [
                              row.state === "生成中" ? (openBlock(), createElementBlock("div", _hoisted_29, [
                                createVNode(_component_t_loading, { size: "small" }),
                                createBaseVNode("span", _hoisted_30, toDisplayString(_ctx.$t("workbench.assets.generating")), 1)
                              ])) : (openBlock(), createBlock(_component_t_image_viewer, {
                                key: 1,
                                images: [row.src],
                                closeOnEscKeydown: true,
                                closeOnOverlay: true
                              }, {
                                trigger: withCtx(({ open: open2 }) => [
                                  createBaseVNode("div", {
                                    class: "imageTrigger",
                                    onClick: ($event) => row.src && getBigImageUrl(row, open2())
                                  }, [
                                    row.src ? (openBlock(), createElementBlock("img", {
                                      key: 0,
                                      src: row.src,
                                      alt: row.name,
                                      class: "previewImage"
                                    }, null, 8, _hoisted_32)) : (openBlock(), createElementBlock("div", _hoisted_33, [
                                      createVNode(_component_t_icon, {
                                        name: "image",
                                        size: "24px"
                                      })
                                    ])),
                                    row.src ? (openBlock(), createElementBlock("div", _hoisted_34, [
                                      createVNode(_component_t_icon, {
                                        name: "browse",
                                        size: "20px"
                                      }),
                                      createBaseVNode("span", _hoisted_35, toDisplayString(_ctx.$t("workbench.assets.preview")), 1)
                                    ])) : createCommentVNode("", true)
                                  ], 8, _hoisted_31)
                                ]),
                                _: 2
                              }, 1032, ["images"]))
                            ])
                          ]),
                          startTime: withCtx(({ row }) => [
                            createBaseVNode("span", null, toDisplayString(unref(dayjs)(row.startTime).format("YYYY-MM-DD HH:mm:ss")), 1)
                          ]),
                          operation: withCtx(({ row }) => [
                            createVNode(_component_t_space, { size: 0 }, {
                              default: withCtx(() => [
                                createVNode(_component_t_button, {
                                  theme: "primary",
                                  variant: "text",
                                  disabled: isGenerating(row.id),
                                  onClick: ($event) => generate(row)
                                }, {
                                  icon: withCtx(() => [
                                    createVNode(_component_i_magic, { size: 18 })
                                  ]),
                                  default: withCtx(() => [
                                    createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.generate")), 1)
                                  ]),
                                  _: 1
                                }, 8, ["disabled", "onClick"]),
                                createVNode(_component_t_button, {
                                  theme: "primary",
                                  variant: "text",
                                  onClick: ($event) => handleEdit(row)
                                }, {
                                  icon: withCtx(() => [
                                    createVNode(_component_t_icon, { name: "edit" })
                                  ]),
                                  default: withCtx(() => [
                                    createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.edit")), 1)
                                  ]),
                                  _: 1
                                }, 8, ["onClick"]),
                                createVNode(_component_t_button, {
                                  theme: "danger",
                                  variant: "text",
                                  disabled: isGenerating(row.id),
                                  onClick: ($event) => handleDelete(row)
                                }, {
                                  icon: withCtx(() => [
                                    createVNode(_component_t_icon, { name: "delete" })
                                  ]),
                                  default: withCtx(() => [
                                    createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.delete")), 1)
                                  ]),
                                  _: 1
                                }, 8, ["disabled", "onClick"])
                              ]),
                              _: 2
                            }, 1024)
                          ]),
                          _: 1
                        }, 8, ["data", "selected-row-keys", "expanded-row-keys", "pagination", "loading"])) : createCommentVNode("", true),
                        unref(assetOptions) == "clip" ? (openBlock(), createBlock(_component_t_table, {
                          key: 1,
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
                            createBaseVNode("div", _hoisted_36, [
                              getMediaType(row.src) === "image" ? (openBlock(), createBlock(_component_t_image_viewer, {
                                key: 0,
                                images: [row.src],
                                closeOnEscKeydown: true,
                                closeOnOverlay: true
                              }, {
                                trigger: withCtx(({ open: open2 }) => [
                                  createBaseVNode("div", {
                                    class: "mediaTrigger",
                                    onClick: ($event) => row.src && open2()
                                  }, [
                                    createBaseVNode("img", {
                                      src: row.src,
                                      alt: row.name
                                    }, null, 8, _hoisted_38),
                                    createBaseVNode("div", _hoisted_39, [
                                      createVNode(_component_t_icon, {
                                        name: "browse",
                                        size: "20px"
                                      }),
                                      createBaseVNode("span", _hoisted_40, toDisplayString(_ctx.$t("workbench.assets.preview")), 1)
                                    ])
                                  ], 8, _hoisted_37)
                                ]),
                                _: 2
                              }, 1032, ["images"])) : getMediaType(row.src) === "video" ? (openBlock(), createElementBlock("div", {
                                key: 1,
                                class: "mediaTrigger videoThumb",
                                onClick: ($event) => openMediaPreview(row.src, row.name)
                              }, [
                                createBaseVNode("video", {
                                  src: row.src,
                                  class: "thumbVideo"
                                }, null, 8, _hoisted_42),
                                createBaseVNode("div", _hoisted_43, [
                                  createVNode(_component_t_icon, {
                                    name: "play-circle",
                                    size: "24px"
                                  }),
                                  createBaseVNode("span", _hoisted_44, toDisplayString(_ctx.$t("workbench.assets.play")), 1)
                                ])
                              ], 8, _hoisted_41)) : getMediaType(row.src) === "audio" ? (openBlock(), createElementBlock("div", {
                                key: 2,
                                class: "mediaTrigger audioThumb",
                                onClick: ($event) => openMediaPreview(row.src, row.name)
                              }, [
                                createVNode(_component_t_icon, {
                                  name: "music",
                                  size: "28px"
                                }),
                                createBaseVNode("div", _hoisted_46, [
                                  createVNode(_component_t_icon, {
                                    name: "play-circle",
                                    size: "24px"
                                  }),
                                  createBaseVNode("span", _hoisted_47, toDisplayString(_ctx.$t("workbench.assets.play")), 1)
                                ])
                              ], 8, _hoisted_45)) : (openBlock(), createElementBlock("div", _hoisted_48, [
                                createVNode(_component_t_icon, {
                                  name: "image",
                                  size: "24px"
                                })
                              ]))
                            ])
                          ]),
                          startTime: withCtx(({ row }) => [
                            createBaseVNode("span", null, toDisplayString(unref(dayjs)(row.startTime).format("YYYY-MM-DD HH:mm:ss")), 1)
                          ]),
                          operation: withCtx(({ row }) => [
                            createVNode(_component_t_space, { size: 0 }, {
                              default: withCtx(() => [
                                createVNode(_component_t_button, {
                                  theme: "primary",
                                  variant: "text",
                                  onClick: ($event) => handleEdit(row)
                                }, {
                                  icon: withCtx(() => [
                                    createVNode(_component_t_icon, { name: "edit" })
                                  ]),
                                  default: withCtx(() => [
                                    createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.edit")), 1)
                                  ]),
                                  _: 1
                                }, 8, ["onClick"]),
                                createVNode(_component_t_button, {
                                  theme: "danger",
                                  variant: "text",
                                  onClick: ($event) => handleDelete(row)
                                }, {
                                  icon: withCtx(() => [
                                    createVNode(_component_t_icon, { name: "delete" })
                                  ]),
                                  default: withCtx(() => [
                                    createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.delete")), 1)
                                  ]),
                                  _: 1
                                }, 8, ["onClick"])
                              ]),
                              _: 2
                            }, 1024)
                          ]),
                          _: 1
                        }, 8, ["data", "selected-row-keys", "expanded-row-keys", "pagination", "loading"])) : createCommentVNode("", true),
                        unref(assetOptions) == "audio" ? (openBlock(), createBlock(_component_t_table, {
                          key: 2,
                          columns: audioColumns,
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
                        }, createSlots({
                          preview: withCtx(({ row }) => [
                            createBaseVNode("div", _hoisted_55, [
                              createBaseVNode("div", {
                                class: "mediaTrigger audioThumb",
                                onClick: ($event) => openMediaPreview(row.src, row.name)
                              }, [
                                createVNode(_component_t_icon, {
                                  name: "music",
                                  size: "28px"
                                }),
                                createBaseVNode("div", _hoisted_57, [
                                  createVNode(_component_t_icon, {
                                    name: "play-circle",
                                    size: "24px"
                                  }),
                                  createBaseVNode("span", _hoisted_58, toDisplayString(_ctx.$t("workbench.assets.play")), 1)
                                ])
                              ], 8, _hoisted_56)
                            ])
                          ]),
                          startTime: withCtx(({ row }) => [
                            createBaseVNode("span", null, toDisplayString(unref(dayjs)(row.startTime).format("YYYY-MM-DD HH:mm:ss")), 1)
                          ]),
                          operation: withCtx(({ row }) => [
                            createVNode(_component_t_space, { size: 0 }, {
                              default: withCtx(() => [
                                createVNode(_component_t_button, {
                                  theme: "primary",
                                  variant: "text",
                                  onClick: ($event) => handleEdit(row)
                                }, {
                                  icon: withCtx(() => [
                                    createVNode(_component_t_icon, { name: "edit" })
                                  ]),
                                  default: withCtx(() => [
                                    createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.edit")), 1)
                                  ]),
                                  _: 1
                                }, 8, ["onClick"]),
                                createVNode(_component_t_button, {
                                  theme: "danger",
                                  variant: "text",
                                  onClick: ($event) => handleDelete(row)
                                }, {
                                  icon: withCtx(() => [
                                    createVNode(_component_t_icon, { name: "delete" })
                                  ]),
                                  default: withCtx(() => [
                                    createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.delete")), 1)
                                  ]),
                                  _: 1
                                }, 8, ["onClick"])
                              ]),
                              _: 2
                            }, 1024)
                          ]),
                          _: 2
                        }, [
                          !__props.selectorMode ? {
                            name: "expandedRow",
                            fn: withCtx(({ row }) => [
                              createBaseVNode("div", _hoisted_49, [
                                createVNode(_component_t_table, {
                                  columns: subAudioColumns,
                                  data: row.sonAssets || [],
                                  "selected-row-keys": unref(selectedSubRowKeys),
                                  "row-key": "id",
                                  hover: "",
                                  size: "small",
                                  "table-layout": "fixed",
                                  stripe: "",
                                  "select-on-row-click": false,
                                  onSelectChange: handleSubSelectChange
                                }, {
                                  previewWithLoading: withCtx(({ row: subRow }) => [
                                    createBaseVNode("div", _hoisted_50, [
                                      createBaseVNode("div", {
                                        class: "mediaTrigger audioThumb",
                                        onClick: ($event) => openMediaPreview(subRow.src, subRow.name)
                                      }, [
                                        createVNode(_component_t_icon, {
                                          name: "music",
                                          size: "28px"
                                        }),
                                        createBaseVNode("div", _hoisted_52, [
                                          createVNode(_component_t_icon, {
                                            name: "play-circle",
                                            size: "24px"
                                          }),
                                          createBaseVNode("span", _hoisted_53, toDisplayString(_ctx.$t("workbench.assets.play")), 1)
                                        ])
                                      ], 8, _hoisted_51)
                                    ])
                                  ]),
                                  prompt: withCtx(({ row: subRow }) => [
                                    createBaseVNode("div", _hoisted_54, [
                                      createBaseVNode("span", null, toDisplayString(subRow.prompt), 1)
                                    ])
                                  ]),
                                  operation: withCtx(({ row: subRow }) => [
                                    createVNode(_component_t_space, { size: 0 }, {
                                      default: withCtx(() => [
                                        createVNode(_component_t_button, {
                                          theme: "danger",
                                          variant: "text",
                                          disabled: isGenerating(subRow.id),
                                          onClick: ($event) => handleDelete(subRow)
                                        }, {
                                          icon: withCtx(() => [
                                            createVNode(_component_t_icon, { name: "delete" })
                                          ]),
                                          default: withCtx(() => [
                                            createTextVNode(" " + toDisplayString(_ctx.$t("workbench.assets.delete")), 1)
                                          ]),
                                          _: 1
                                        }, 8, ["disabled", "onClick"])
                                      ]),
                                      _: 2
                                    }, 1024)
                                  ]),
                                  _: 1
                                }, 8, ["data", "selected-row-keys"])
                              ])
                            ]),
                            key: "0"
                          } : void 0
                        ]), 1032, ["data", "selected-row-keys", "expanded-row-keys", "pagination", "loading"])) : createCommentVNode("", true)
                      ])
                    ])
                  ]),
                  _: 2
                }, 1032, ["value"]);
              }), 128))
            ]),
            _: 1
          }, 8, ["modelValue"])
        ]),
        createVNode(addAssets, {
          modelValue: unref(addAssetsShow),
          "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => isRef(addAssetsShow) ? addAssetsShow.value = $event : null),
          type: unref(assetOptions),
          title: tabNameMap[unref(assetOptions)],
          formData: unref(formData),
          onGetFilteredData: _cache[5] || (_cache[5] = ($event) => getFilteredData(unref(assetOptions)))
        }, null, 8, ["modelValue", "type", "title", "formData"]),
        createVNode(generateImage, {
          modelValue: unref(generateImageShow),
          "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => isRef(generateImageShow) ? generateImageShow.value = $event : null),
          onUpdate: loadCurrentTabData,
          formData: unref(currentAssetData)
        }, null, 8, ["modelValue", "formData"]),
        unref(addAudioShow) ? (openBlock(), createBlock(addAudioAssets, {
          key: 0,
          modelValue: unref(addAudioShow),
          "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => isRef(addAudioShow) ? addAudioShow.value = $event : null),
          formData: unref(audioFormData),
          onGetFilteredData: _cache[8] || (_cache[8] = ($event) => getFilteredData(unref(assetOptions)))
        }, null, 8, ["modelValue", "formData"])) : createCommentVNode("", true),
        createVNode(_component_t_dialog, {
          visible: unref(mediaPreviewShow),
          "onUpdate:visible": _cache[9] || (_cache[9] = ($event) => isRef(mediaPreviewShow) ? mediaPreviewShow.value = $event : null),
          header: unref(mediaPreviewName) || _ctx.$t("workbench.assets.mediaPreview"),
          footer: false,
          width: "600px",
          placement: "center",
          destroyOnClose: "",
          onClose: closeMediaPreview
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_59, [
              unref(mediaPreviewType) === "video" ? (openBlock(), createElementBlock("video", {
                key: 0,
                src: unref(mediaPreviewSrc),
                controls: "",
                autoplay: "",
                class: "mediaPlayer videoPlayer"
              }, null, 8, _hoisted_60)) : unref(mediaPreviewType) === "audio" ? (openBlock(), createElementBlock("div", _hoisted_61, [
                createBaseVNode("div", _hoisted_62, [
                  createVNode(_component_t_icon, {
                    name: "music",
                    size: "64px"
                  })
                ]),
                createBaseVNode("p", _hoisted_63, toDisplayString(unref(mediaPreviewName)), 1),
                createBaseVNode("audio", {
                  src: unref(mediaPreviewSrc),
                  controls: "",
                  autoplay: "",
                  class: "mediaPlayer audioPlayer"
                }, null, 8, _hoisted_64)
              ])) : createCommentVNode("", true)
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"]),
        createVNode(_component_t_dialog, {
          visible: unref(batchGenerationShow),
          "onUpdate:visible": _cache[12] || (_cache[12] = ($event) => isRef(batchGenerationShow) ? batchGenerationShow.value = $event : null),
          header: unref(batchType),
          width: "600px",
          top: "10vh",
          placement: "center",
          destroyOnClose: "",
          onConfirm: keep,
          onClose: _cache[13] || (_cache[13] = ($event) => batchGenerationShow.value = false)
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_65, [
              createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.assets.confirmBatch", { type: unref(batchType) })), 1),
              createVNode(_component_t_form, { labelAlign: "top" }, {
                default: withCtx(() => [
                  unref(batchType) === _ctx.$t("workbench.assets.batchGenImage") ? (openBlock(), createBlock(_component_t_form_item, {
                    key: 0,
                    label: _ctx.$t("workbench.assets.model"),
                    name: "selectValue"
                  }, {
                    default: withCtx(() => [
                      createVNode(__unplugin_components_0, {
                        modelValue: unref(selectValue),
                        "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => isRef(selectValue) ? selectValue.value = $event : null),
                        type: `image`
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"])) : createCommentVNode("", true),
                  unref(batchType) === _ctx.$t("workbench.assets.batchGenImage") ? (openBlock(), createBlock(_component_t_form_item, {
                    key: 1,
                    label: _ctx.$t("workbench.assets.resolution"),
                    name: "resolution"
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_select, {
                        modelValue: unref(resolution),
                        "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => isRef(resolution) ? resolution.value = $event : null),
                        placeholder: _ctx.$t("workbench.assets.resolutionPh")
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_t_option, {
                            key: "1K",
                            label: "1K",
                            value: "1K"
                          }),
                          createVNode(_component_t_option, {
                            key: "2K",
                            label: "2K",
                            value: "2K"
                          }),
                          createVNode(_component_t_option, {
                            key: "4K",
                            label: "4K",
                            value: "4K"
                          })
                        ]),
                        _: 1
                      }, 8, ["modelValue", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"])) : createCommentVNode("", true)
                ]),
                _: 1
              })
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

/* unplugin-vue-components disabled */

const AssetsView = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-92854736"]]);

export { AssetsView as default };

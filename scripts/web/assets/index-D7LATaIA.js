import { l as defineComponent, bM as storeToRefs, bU as useModel, w as watch, aL as createElementBlock, j as createVNode, aM as withCtx, bV as mergeModels, r as ref, c as computed, aK as openBlock, aO as createBaseVNode, F as Fragment, aP as renderList, aS as createBlock, b0 as toDisplayString, a$ as createTextVNode, aU as normalizeClass, bH as withModifiers, a1 as unref, b2 as resolveComponent, o as onMounted, av as isRef, bR as useRouter, aT as createCommentVNode } from './vue-vendor-Byo5TD6r.js';
import { i as instance } from './axios-PPMfXuH1.js';
import { A as AsyncMdEditor } from './AsyncMdEditor-Cs1zMNgZ.js';
import { s as settingStore, _ as _export_sfc } from './index-BPofKOpG.js';
import { _ as __unplugin_components_0 } from './modelSelect-CB7Kqm3T.js';
import { E as Dialog, G as ImageViewer, H as Form, J as FormItem, K as Select, O as Option, R as Input, T as Textarea, B as Button, L as Loading, U as Tabs, V as TabPanel, W as DialogPlugin, X as Tag, Y as Card } from './tdesign-CfL1pweZ.js';
import { d as dayjs } from './dayjs-CuToSpIM.js';
import { p as projectStore } from './project-Cze3Ugcr.js';
import { i as imageListCacheStore } from './imageListCache-DK3t0fNV.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './providersLogo-BCbaFq8_.js';

const _hoisted_1$1 = { class: "addProject" };
const _hoisted_2$1 = { class: "formColumns" };
const _hoisted_3$1 = { class: "formLeft" };
const _hoisted_4$1 = {
  class: "ac",
  style: { "gap": "5px", "width": "100%" }
};
const _hoisted_5$1 = {
  class: "ac",
  style: { "gap": "5px", "width": "100%" }
};
const _hoisted_6$1 = { class: "formRight" };
const _hoisted_7$1 = { class: "artStylePicker" };
const _hoisted_8$1 = { class: "artStyleHeader" };
const _hoisted_9$1 = { class: "artStyleContent" };
const _hoisted_10$1 = { class: "gridContainer" };
const _hoisted_11$1 = ["onClick"];
const _hoisted_12$1 = { class: "imageWrapper" };
const _hoisted_13$1 = ["src", "alt"];
const _hoisted_14$1 = { class: "text" };
const _hoisted_15 = { class: "directorManual" };
const _hoisted_16 = { class: "directorManualHeader" };
const _hoisted_17 = { class: "artStyleContent" };
const _hoisted_18 = { class: "gridContainer" };
const _hoisted_19 = ["onClick"];
const _hoisted_20 = { class: "imageWrapper" };
const _hoisted_21 = ["src", "alt"];
const _hoisted_22 = { class: "text" };
const _hoisted_23 = { class: "nameAndCoverRow" };
const _hoisted_24 = { class: "nameField" };
const _hoisted_25 = { class: "fieldLabel" };
const _hoisted_26 = { class: "mdFileLocation" };
const _hoisted_27 = { class: "fieldLabel" };
const _hoisted_28 = { class: "coverField" };
const _hoisted_29 = { class: "fieldLabel" };
const _hoisted_30 = { class: "coverUploadArea multiCoverUploadArea" };
const _hoisted_31 = ["src", "onClick"];
const _hoisted_32 = ["onClick"];
const _hoisted_33 = { class: "promptEditorWrapper" };
const _hoisted_34 = { class: "promptEditorHeader" };
const _hoisted_35 = { class: "aiExtractInline" };
const _hoisted_36 = { class: "nameAndCoverRow" };
const _hoisted_37 = { class: "nameField" };
const _hoisted_38 = { class: "fieldLabel" };
const _hoisted_39 = { class: "mdFileLocation" };
const _hoisted_40 = { class: "fieldLabel" };
const _hoisted_41 = { class: "coverField" };
const _hoisted_42 = { class: "fieldLabel" };
const _hoisted_43 = { class: "coverUploadArea multiCoverUploadArea" };
const _hoisted_44 = ["src"];
const _hoisted_45 = ["onClick"];
const _hoisted_46 = { class: "promptEditorWrapper" };
const _hoisted_47 = { class: "promptEditorHeader" };
const _hoisted_48 = { class: "aiExtractInline" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "projectDialog",
  props: /* @__PURE__ */ mergeModels({
    projectData: {}
  }, {
    "modelValue": { type: Boolean },
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["add", "edit"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const { themeSetting } = storeToRefs(settingStore());
    const addProjectShow = useModel(__props, "modelValue");
    const props = __props;
    const emit = __emit;
    const trigger = ref();
    const visible = ref(false);
    function handlePreview(src) {
      visible.value = true;
      trigger.value = src;
    }
    const DEFAULT_TAB_DATA = () => [
      { label: "README", value: "README", data: "" },
      { label: "前缀", value: "prefix", data: "" },
      { label: "角色", value: "art_character", data: "" },
      { label: "角色衍生", value: "art_character_derivative", data: "" },
      { label: "道具", value: "art_prop", data: "" },
      { label: "道具衍生", value: "art_prop_derivative", data: "" },
      { label: "场景", value: "art_scene", data: "" },
      { label: "场景衍生", value: "art_scene_derivative", data: "" },
      { label: "分镜", value: "director_storyboard", data: "" },
      { label: "分镜视频", value: "art_storyboard_video", data: "" },
      { label: "技法-导演规划", value: "director_planning_style", data: "" },
      { label: "技法-分镜表设计", value: "director_storyboard_table_style", data: "" }
    ];
    const isEdit = computed(() => !!props.projectData);
    const RATIO_OPTIONS = [
      { value: "16:9", label: "16:9" },
      { value: "9:16", label: "9:16" }
    ];
    const DEFAULT_FORM = () => ({
      id: 0,
      projectType: "novel",
      name: "",
      intro: "",
      type: "",
      artStyle: "",
      era: "",
      videoRatio: "16:9",
      createTime: 0,
      userId: 0,
      imageModel: "",
      videoModel: "",
      imageQuality: "",
      mode: "",
      directorManual: ""
    });
    const formState = ref(DEFAULT_FORM());
    function resetForm() {
      formState.value = DEFAULT_FORM();
    }
    function handleCancel() {
      addProjectShow.value = false;
      resetForm();
    }
    function handleOk() {
      if (!formState.value.name) return window.$message.warning($t("workbench.project.msg.enterProjectName"));
      if (!formState.value.type) return window.$message.warning($t("workbench.project.msg.enterProjectType"));
      if (!formState.value.imageModel) return window.$message.warning($t("workbench.project.msg.enterImageModel"));
      if (!formState.value.videoModel) return window.$message.warning($t("workbench.project.msg.enterVideoModel"));
      if (!formState.value.artStyle) return window.$message.warning($t("workbench.project.msg.enterArtStyle"));
      if (!formState.value.directorManual) return window.$message.warning($t("workbench.project.msg.directorManual"));
      if (!formState.value.videoRatio) return window.$message.warning($t("workbench.project.msg.enterVideoRatio"));
      if (!formState.value.intro) return window.$message.warning($t("workbench.project.msg.enterProjectIntro"));
      if (!formState.value.imageQuality) return window.$message.warning($t("workbench.project.msg.enterProjectQuality"));
      if (!formState.value.mode) return window.$message.warning($t("workbench.project.msg.selectMode"));
      if (isEdit.value) {
        emit("edit", {
          id: formState.value.id,
          name: formState.value.name,
          intro: formState.value.intro,
          type: formState.value.type,
          artStyle: formState.value.artStyle,
          videoRatio: formState.value.videoRatio,
          imageModel: formState.value.imageModel,
          videoModel: formState.value.videoModel,
          projectType: formState.value.projectType || "novel",
          directorManual: formState.value.directorManual,
          imageQuality: formState.value.imageQuality,
          mode: formState.value.mode
        });
      } else {
        emit("add", {
          projectType: formState.value.projectType || "novel",
          name: formState.value.name,
          intro: formState.value.intro,
          type: formState.value.type,
          artStyle: formState.value.artStyle,
          videoRatio: formState.value.videoRatio || "16:9",
          imageModel: formState.value.imageModel,
          videoModel: formState.value.videoModel,
          imageQuality: formState.value.imageQuality,
          directorManual: formState.value.directorManual,
          mode: formState.value.mode
        });
      }
      resetForm();
      addProjectShow.value = false;
    }
    const promptToolbars = [
      "bold",
      "italic",
      "strikeThrough",
      "-",
      "unorderedList",
      "orderedList",
      "-",
      "revoke",
      "next",
      "=",
      "preview"
    ];
    watch(addProjectShow, async (visible2) => {
      if (visible2) {
        if (props.projectData) {
          formState.value = {
            ...DEFAULT_FORM(),
            id: props.projectData.id,
            name: props.projectData.name || "",
            intro: props.projectData.intro || "",
            type: props.projectData.type || "",
            artStyle: props.projectData.artStyle || "",
            videoRatio: props.projectData.videoRatio || "16:9",
            imageModel: props.projectData.imageModel || "",
            videoModel: props.projectData.videoModel || "",
            imageQuality: props.projectData.imageQuality || "",
            projectType: props.projectData.projectType || "novel",
            mode: props.projectData.mode || "text",
            directorManual: props.projectData.directorManual || ""
          };
          if (props.projectData.videoModel) {
            try {
              const { data } = await instance.post("/modelSelect/getModelDetail", {
                modelId: props.projectData.videoModel
              });
              if (data?.mode) {
                mode.value = data.mode.map((item) => ({
                  label: getModeLabel(item),
                  value: modeToKey(item)
                }));
              }
            } catch (e) {
            }
          }
        } else {
          resetForm();
        }
        fetchVisualManuals();
        queryDirectorManual();
      }
    });
    const visualManualOptions = ref([]);
    const visualManualLoading = ref(false);
    const visualManualDialogVisible = ref(false);
    const editingVisualManual = ref(null);
    const visualManualForm = ref({ name: "", images: [], stylePath: "" });
    const visualManualCoverInputRef = ref();
    const visualManualTabValue = ref("README");
    const visualManualTabData = ref(DEFAULT_TAB_DATA());
    function fetchVisualManuals() {
      visualManualLoading.value = true;
      instance.post("/project/getVisualManual").then(({ data }) => {
        visualManualOptions.value = data.map(
          (item) => ({
            id: item.id,
            name: item.name,
            stylePath: item.stylePath,
            images: item.images ?? (Array.isArray(item.image) ? item.image : item.image ? [item.image] : []),
            data: item.data
          })
        );
      }).finally(() => {
        visualManualLoading.value = false;
      });
    }
    function openVisualManualDialog(item) {
      editingVisualManual.value = item ?? null;
      if (item) {
        visualManualForm.value.name = item.name;
        visualManualForm.value.stylePath = item.stylePath;
        visualManualForm.value.images = item.images ? [...item.images] : [];
        const existingData = Array.isArray(item.data) ? item.data : [];
        visualManualTabData.value = DEFAULT_TAB_DATA().map((tab) => {
          const found = existingData.find((d) => d.value === tab.value);
          return found ? { ...tab, data: found.data } : { ...tab };
        });
      } else {
        visualManualForm.value = { name: "", images: [], stylePath: "" };
        visualManualTabData.value = DEFAULT_TAB_DATA();
      }
      visualManualTabValue.value = "README";
      visualManualDialogVisible.value = true;
    }
    function resetVisualManualDialog() {
      visualManualDialogVisible.value = false;
      editingVisualManual.value = null;
      visualManualForm.value = { name: "", images: [], stylePath: "" };
      visualManualTabData.value = DEFAULT_TAB_DATA();
      visualManualTabValue.value = "README";
    }
    function triggerVisualManualCoverUpload() {
      visualManualCoverInputRef.value?.click();
    }
    function handleVisualManualCoverFileChange(e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          visualManualForm.value.images.push(reader.result);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    }
    function removeVisualManualCover(idx) {
      visualManualForm.value.images.splice(idx, 1);
    }
    const loading = ref(false);
    async function handleVisualManualSubmit() {
      if (!visualManualForm.value.name.trim()) {
        window.$message.warning($t("workbench.project.msg.enterVisualManualName"));
        return;
      }
      if (!visualManualForm.value.images.length) {
        window.$message.warning($t("workbench.project.msg.enterVisualManualImage"));
        return;
      }
      const emptyTab = visualManualTabData.value.find((tab) => !tab.data.trim());
      if (emptyTab) return window.$message.warning(`「${emptyTab.label}」${$t("workbench.project.msg.enterVisualManualTabData")}`);
      try {
        loading.value = true;
        if (editingVisualManual.value) {
          await instance.post("/project/editVisualManual", {
            name: visualManualForm.value.name,
            images: visualManualForm.value.images,
            data: visualManualTabData.value,
            stylePath: visualManualForm.value.stylePath
          });
        } else {
          await instance.post("/project/addVisualManual", {
            name: visualManualForm.value.name,
            images: visualManualForm.value.images,
            data: visualManualTabData.value,
            stylePath: visualManualForm.value.stylePath
          });
        }
        loading.value = false;
        if (editingVisualManual.value) {
          window.$message.success($t("workbench.project.msg.visualManualUpdated"));
        } else {
          window.$message.success($t("workbench.project.msg.visualManualAdded"));
        }
        resetVisualManualDialog();
        fetchVisualManuals();
      } catch (e) {
        loading.value = false;
        window.$message.error(e.message ?? $t("workbench.project.msg.operationFailed"));
      }
    }
    function deleteVisualManual(item) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.project.msg.deleteVisualManualHeader"),
        body: $t("workbench.project.msg.deleteVisualManualBody", { name: item.stylePath }),
        confirmBtn: $t("workbench.project.msg.deleteVisualManualConfirm"),
        cancelBtn: $t("workbench.project.msg.deleteVisualManualCancel"),
        onConfirm: () => {
          instance.post("/project/deleteVisualManual", { name: item.stylePath }).then(() => {
            fetchVisualManuals();
            resetVisualManualDialog();
            window.$message.success($t("workbench.project.msg.visualManualDeleted"));
          }).catch((e) => {
            window.$message.error(e.message ?? $t("workbench.project.msg.operationFailed"));
          }).finally(() => {
            fetchVisualManuals();
            dialog.destroy();
          });
        }
      });
    }
    const mode = ref([]);
    const MODE_LABEL = {
      singleImage: $t("workbench.production.generate.modeSingleImage"),
      startEndRequired: $t("workbench.production.generate.modeStartEnd"),
      endFrameOptional: $t("workbench.production.generate.modeStartEnd"),
      startFrameOptional: $t("workbench.production.generate.modeStartEnd"),
      text: $t("workbench.production.generate.modeText"),
      videoReference: $t("workbench.production.generate.modeVideoRef"),
      imageReference: $t("workbench.production.generate.modeImageRef"),
      audioReference: $t("workbench.production.generate.modeAudioRef")
    };
    function getModeLabel(mode2) {
      if (!mode2) return "";
      if (Array.isArray(mode2)) return mode2.map((r) => MODE_LABEL[r.replace(/:.*$/, "")] ?? r).join("、");
      return MODE_LABEL[mode2] ?? mode2;
    }
    function modeToKey(m) {
      return Array.isArray(m) ? JSON.stringify(m) : m;
    }
    function changeFn(val, data) {
      mode.value = data.mode.map((item) => ({
        label: getModeLabel(item),
        value: modeToKey(item)
      }));
    }
    const DIRECTOR_DEFAULT_TAB_DATA = () => [
      { label: "README", value: "README", data: "" },
      { label: "导演规划", value: "director_planning_narrative", data: "" },
      { label: "分镜表", value: "director_storyboard_table_narrative", data: "" }
    ];
    const directorManualForm = ref({ name: "", images: [], directorManual: "" });
    const directorManualLoading = ref(false);
    const editingDirectorManual = ref(null);
    const directorDialogVisible = ref(false);
    const directorManualOptions = ref([]);
    const directorManualTabValue = ref("README");
    const directorManualTabData = ref(DIRECTOR_DEFAULT_TAB_DATA());
    function queryDirectorManual() {
      directorManualLoading.value = true;
      instance.post("/project/queryDirectorManual").then(({ data }) => {
        directorManualOptions.value = data.map(
          (item) => ({
            id: item.id,
            name: item.name,
            directorManual: item.directorManual,
            images: item.images ?? (Array.isArray(item.image) ? item.image : item.image ? [item.image] : []),
            data: item.data
          })
        );
      }).finally(() => {
        directorManualLoading.value = false;
      });
    }
    function openDirectorManualDialog(item) {
      editingDirectorManual.value = item ?? null;
      if (item) {
        directorManualForm.value.name = item.name;
        directorManualForm.value.directorManual = item.directorManual;
        directorManualForm.value.images = item.images ? [...item.images] : [];
        const existingData = Array.isArray(item.data) ? item.data : [];
        directorManualTabData.value = DIRECTOR_DEFAULT_TAB_DATA().map((tab) => {
          const found = existingData.find((d) => d.value === tab.value);
          return found ? { ...tab, data: found.data } : { ...tab };
        });
      } else {
        directorManualForm.value = { name: "", images: [], directorManual: "" };
        directorManualTabData.value = DIRECTOR_DEFAULT_TAB_DATA();
      }
      directorManualTabValue.value = "README";
      directorDialogVisible.value = true;
    }
    function resetDirectorManualDialog() {
      directorDialogVisible.value = false;
      editingDirectorManual.value = null;
      directorManualForm.value = { name: "", images: [], directorManual: "" };
      directorManualTabData.value = DIRECTOR_DEFAULT_TAB_DATA();
      directorManualTabValue.value = "README";
    }
    function deleteDirectorManual(item) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.project.msg.deleteDirectorManualHeader"),
        body: $t("workbench.project.msg.deleteDirectorManualBody", { name: item.directorManual }),
        confirmBtn: $t("workbench.project.msg.deleteVisualManualConfirm"),
        cancelBtn: $t("workbench.project.msg.deleteVisualManualCancel"),
        onConfirm: () => {
          instance.post("/project/deleteDirectorManual", { name: item.directorManual }).then(() => {
            queryDirectorManual();
            resetDirectorManualDialog();
            window.$message.success($t("workbench.project.msg.visualManualDeleted"));
          }).catch((e) => {
            window.$message.error(e.message ?? $t("workbench.project.msg.operationFailed"));
          }).finally(() => {
            queryDirectorManual();
            dialog.destroy();
          });
        }
      });
    }
    async function handleDirectorManualSubmit() {
      if (!directorManualForm.value.name.trim()) {
        window.$message.warning($t("workbench.project.msg.enterVisualManualName"));
        return;
      }
      if (!directorManualForm.value.images.length) {
        window.$message.warning($t("workbench.project.msg.enterVisualManualImage"));
        return;
      }
      const emptyTab = directorManualTabData.value.find((tab) => !tab.data.trim());
      if (emptyTab) return window.$message.warning(`「${emptyTab.label}」${$t("workbench.project.msg.enterVisualManualTabData")}`);
      try {
        loading.value = true;
        if (editingDirectorManual.value) {
          await instance.post("/project/editDirectorlManual", {
            name: directorManualForm.value.name,
            images: directorManualForm.value.images,
            data: directorManualTabData.value,
            directorManual: directorManualForm.value.directorManual
          });
        } else {
          await instance.post("/project/addDirectorManual", {
            name: directorManualForm.value.name,
            images: directorManualForm.value.images,
            data: directorManualTabData.value,
            directorManual: directorManualForm.value.directorManual
          });
        }
        loading.value = false;
        if (editingDirectorManual.value) {
          window.$message.success($t("workbench.project.msg.directorManualUpdated"));
        } else {
          window.$message.success($t("workbench.project.msg.directorManualAdded"));
        }
        resetDirectorManualDialog();
        queryDirectorManual();
      } catch (e) {
        loading.value = false;
        window.$message.error(e.message ?? $t("workbench.project.msg.operationFailed"));
      }
    }
    function triggerDirectorManualCoverUpload() {
      visualManualCoverInputRef.value?.click();
    }
    function handleDirectorManualCoverFileChange(e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          directorManualForm.value.images.push(reader.result);
        };
        reader.readAsDataURL(file);
      });
      e.target.value = "";
    }
    return (_ctx, _cache) => {
      const _component_t_option = Option;
      const _component_t_select = Select;
      const _component_t_form_item = FormItem;
      const _component_t_input = Input;
      const _component_t_textarea = Textarea;
      const _component_t_form = Form;
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_button = Button;
      const _component_i_edit = resolveComponent("i-edit");
      const _component_i_delete = resolveComponent("i-delete");
      const _component_i_preview_open = resolveComponent("i-preview-open");
      const _component_t_loading = Loading;
      const _component_t_dialog = Dialog;
      const _component_i_close = resolveComponent("i-close");
      const _component_t_tab_panel = TabPanel;
      const _component_t_tabs = Tabs;
      const _component_t_image_viewer = ImageViewer;
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createVNode(_component_t_dialog, {
          placement: "center",
          visible: addProjectShow.value,
          "onUpdate:visible": _cache[11] || (_cache[11] = ($event) => addProjectShow.value = $event),
          header: isEdit.value ? _ctx.$t("workbench.project.dialog.editTitle") : _ctx.$t("workbench.project.dialog.addTitle"),
          width: "60%",
          onConfirm: handleOk,
          onCloseBtnClick: handleCancel,
          onCancel: handleCancel,
          "confirm-btn": isEdit.value ? _ctx.$t("workbench.project.dialog.save") : _ctx.$t("workbench.project.dialog.ok"),
          "cancel-btn": _ctx.$t("workbench.project.dialog.cancel")
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2$1, [
              createBaseVNode("div", _hoisted_3$1, [
                createVNode(_component_t_form, {
                  data: formState.value,
                  "label-align": "top"
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_form_item, {
                      label: _ctx.$t("workbench.project.dialog.projectType")
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_t_select, {
                          modelValue: formState.value.projectType,
                          "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => formState.value.projectType = $event),
                          placeholder: _ctx.$t("workbench.project.dialog.selectType")
                        }, {
                          default: withCtx(() => [
                            createVNode(_component_t_option, {
                              key: "基于小说原文",
                              label: _ctx.$t("workbench.project.dialog.basedOnNovel"),
                              value: "novel"
                            }, null, 8, ["label"]),
                            createVNode(_component_t_option, {
                              key: "基于剧本",
                              label: _ctx.$t("workbench.project.dialog.basedOnScript"),
                              value: "script"
                            }, null, 8, ["label"])
                          ]),
                          _: 1
                        }, 8, ["modelValue", "placeholder"])
                      ]),
                      _: 1
                    }, 8, ["label"]),
                    createVNode(_component_t_form_item, {
                      label: _ctx.$t("workbench.project.dialog.projectName")
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_t_input, {
                          modelValue: formState.value.name,
                          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => formState.value.name = $event),
                          placeholder: _ctx.$t("workbench.project.dialog.projectNamePh")
                        }, null, 8, ["modelValue", "placeholder"])
                      ]),
                      _: 1
                    }, 8, ["label"]),
                    createVNode(_component_t_form_item, {
                      label: _ctx.$t("workbench.project.dialog.novelType")
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_t_input, {
                          modelValue: formState.value.type,
                          "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => formState.value.type = $event),
                          placeholder: _ctx.$t("workbench.project.dialog.novelTypePh")
                        }, null, 8, ["modelValue", "placeholder"])
                      ]),
                      _: 1
                    }, 8, ["label"]),
                    createVNode(_component_t_form_item, {
                      label: _ctx.$t("workbench.project.dialog.modelData")
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_4$1, [
                          createVNode(__unplugin_components_0, {
                            modelValue: formState.value.imageModel,
                            "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => formState.value.imageModel = $event),
                            type: "image"
                          }, null, 8, ["modelValue"]),
                          createVNode(_component_t_select, {
                            modelValue: formState.value.imageQuality,
                            "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => formState.value.imageQuality = $event),
                            class: "paramSelect ml-5",
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
                        ])
                      ]),
                      _: 1
                    }, 8, ["label"]),
                    createVNode(_component_t_form_item, {
                      label: _ctx.$t("workbench.project.dialog.videoModelData")
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_5$1, [
                          createVNode(__unplugin_components_0, {
                            modelValue: formState.value.videoModel,
                            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => formState.value.videoModel = $event),
                            type: "video",
                            onChange: changeFn,
                            changeConfig: true
                          }, null, 8, ["modelValue"]),
                          createVNode(_component_t_select, {
                            modelValue: formState.value.mode,
                            "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => formState.value.mode = $event),
                            class: "paramSelect ml-5",
                            placeholder: _ctx.$t("workbench.production.editImage.mode")
                          }, {
                            default: withCtx(() => [
                              (openBlock(true), createElementBlock(Fragment, null, renderList(mode.value, (value) => {
                                return openBlock(), createBlock(_component_t_option, {
                                  key: value.value,
                                  value: value.value,
                                  label: value.label
                                }, null, 8, ["value", "label"]);
                              }), 128))
                            ]),
                            _: 1
                          }, 8, ["modelValue", "placeholder"])
                        ])
                      ]),
                      _: 1
                    }, 8, ["label"]),
                    createVNode(_component_t_form_item, {
                      label: _ctx.$t("workbench.project.dialog.videoRatio")
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_t_select, {
                          modelValue: formState.value.videoRatio,
                          "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => formState.value.videoRatio = $event),
                          options: RATIO_OPTIONS
                        }, null, 8, ["modelValue"])
                      ]),
                      _: 1
                    }, 8, ["label"]),
                    createVNode(_component_t_form_item, {
                      label: _ctx.$t("workbench.project.dialog.novelIntro")
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_t_textarea, {
                          modelValue: formState.value.intro,
                          "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => formState.value.intro = $event),
                          autosize: { minRows: 3, maxRows: 6 },
                          placeholder: _ctx.$t("workbench.project.dialog.novelIntroPh")
                        }, null, 8, ["modelValue", "placeholder"])
                      ]),
                      _: 1
                    }, 8, ["label"])
                  ]),
                  _: 1
                }, 8, ["data"])
              ]),
              createBaseVNode("div", _hoisted_6$1, [
                createVNode(_component_t_form, { "label-align": "top" }, {
                  default: withCtx(() => [
                    createVNode(_component_t_form_item, null, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_7$1, [
                          createBaseVNode("div", _hoisted_8$1, [
                            createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.project.dialog.visualManual")), 1),
                            createVNode(_component_t_button, {
                              size: "small",
                              variant: "outline",
                              onClick: _cache[9] || (_cache[9] = ($event) => openVisualManualDialog())
                            }, {
                              icon: withCtx(() => [
                                createVNode(_component_i_plus, { size: "14" })
                              ]),
                              default: withCtx(() => [
                                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.project.dialog.newVisualManual")), 1)
                              ]),
                              _: 1
                            })
                          ]),
                          createBaseVNode("div", _hoisted_9$1, [
                            createVNode(_component_t_loading, {
                              loading: visualManualLoading.value,
                              text: _ctx.$t("workbench.project.dialog.loading")
                            }, {
                              default: withCtx(() => [
                                createBaseVNode("div", _hoisted_10$1, [
                                  (openBlock(true), createElementBlock(Fragment, null, renderList(visualManualOptions.value, (item, index) => {
                                    return openBlock(), createElementBlock("div", {
                                      key: index,
                                      class: normalizeClass(["gridItem", { active: formState.value.artStyle === item.stylePath }]),
                                      onClick: ($event) => formState.value.artStyle = item.stylePath
                                    }, [
                                      createBaseVNode("div", _hoisted_12$1, [
                                        createBaseVNode("img", {
                                          src: item.images && item.images[0],
                                          alt: item.name,
                                          class: "artImage",
                                          loading: "lazy"
                                        }, null, 8, _hoisted_13$1),
                                        createBaseVNode("div", _hoisted_14$1, toDisplayString(item.name), 1)
                                      ]),
                                      createVNode(_component_t_button, {
                                        class: "editBtn",
                                        shape: "square",
                                        onClick: withModifiers(($event) => openVisualManualDialog(item), ["stop"])
                                      }, {
                                        default: withCtx(() => [
                                          createVNode(_component_i_edit, {
                                            theme: "outline",
                                            size: "14"
                                          })
                                        ]),
                                        _: 1
                                      }, 8, ["onClick"]),
                                      createVNode(_component_t_button, {
                                        class: "delBtn",
                                        shape: "square",
                                        onClick: withModifiers(($event) => deleteVisualManual(item), ["stop"])
                                      }, {
                                        default: withCtx(() => [
                                          createVNode(_component_i_delete, {
                                            theme: "outline",
                                            size: "14"
                                          })
                                        ]),
                                        _: 1
                                      }, 8, ["onClick"]),
                                      createVNode(_component_t_button, {
                                        class: "preview",
                                        shape: "square",
                                        onClick: withModifiers(($event) => handlePreview(item.images && item.images[0]), ["stop"])
                                      }, {
                                        default: withCtx(() => [
                                          createVNode(_component_i_preview_open, {
                                            theme: "outline",
                                            size: "14"
                                          })
                                        ]),
                                        _: 1
                                      }, 8, ["onClick"])
                                    ], 10, _hoisted_11$1);
                                  }), 128))
                                ])
                              ]),
                              _: 1
                            }, 8, ["loading", "text"])
                          ])
                        ])
                      ]),
                      _: 1
                    }),
                    createVNode(_component_t_form_item, null, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_15, [
                          createBaseVNode("div", _hoisted_16, [
                            createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.project.dialog.directorManual")), 1),
                            createVNode(_component_t_button, {
                              size: "small",
                              variant: "outline",
                              onClick: _cache[10] || (_cache[10] = ($event) => openDirectorManualDialog())
                            }, {
                              icon: withCtx(() => [
                                createVNode(_component_i_plus, { size: "14" })
                              ]),
                              default: withCtx(() => [
                                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.project.dialog.addDirectorManual")), 1)
                              ]),
                              _: 1
                            })
                          ]),
                          createBaseVNode("div", _hoisted_17, [
                            createVNode(_component_t_loading, {
                              loading: directorManualLoading.value,
                              text: _ctx.$t("workbench.project.dialog.loading")
                            }, {
                              default: withCtx(() => [
                                createBaseVNode("div", _hoisted_18, [
                                  (openBlock(true), createElementBlock(Fragment, null, renderList(directorManualOptions.value, (item, index) => {
                                    return openBlock(), createElementBlock("div", {
                                      key: index,
                                      class: normalizeClass(["gridItem", { active: formState.value.directorManual === item.directorManual }]),
                                      onClick: ($event) => formState.value.directorManual = item.directorManual
                                    }, [
                                      createBaseVNode("div", _hoisted_20, [
                                        createBaseVNode("img", {
                                          src: item.images && item.images[0],
                                          alt: item.name,
                                          class: "artImage",
                                          loading: "lazy"
                                        }, null, 8, _hoisted_21),
                                        createBaseVNode("div", _hoisted_22, toDisplayString(item.name), 1)
                                      ]),
                                      createVNode(_component_t_button, {
                                        class: "editBtn",
                                        shape: "square",
                                        onClick: withModifiers(($event) => openDirectorManualDialog(item), ["stop"])
                                      }, {
                                        default: withCtx(() => [
                                          createVNode(_component_i_edit, {
                                            theme: "outline",
                                            size: "14"
                                          })
                                        ]),
                                        _: 1
                                      }, 8, ["onClick"]),
                                      createVNode(_component_t_button, {
                                        class: "delBtn",
                                        shape: "square",
                                        onClick: withModifiers(($event) => deleteDirectorManual(item), ["stop"])
                                      }, {
                                        default: withCtx(() => [
                                          createVNode(_component_i_delete, {
                                            theme: "outline",
                                            size: "14"
                                          })
                                        ]),
                                        _: 1
                                      }, 8, ["onClick"]),
                                      createVNode(_component_t_button, {
                                        class: "preview",
                                        shape: "square",
                                        onClick: withModifiers(($event) => handlePreview(item.images && item.images[0]), ["stop"])
                                      }, {
                                        default: withCtx(() => [
                                          createVNode(_component_i_preview_open, {
                                            theme: "outline",
                                            size: "14"
                                          })
                                        ]),
                                        _: 1
                                      }, 8, ["onClick"])
                                    ], 10, _hoisted_19);
                                  }), 128))
                                ])
                              ]),
                              _: 1
                            }, 8, ["loading", "text"])
                          ])
                        ])
                      ]),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ])
            ])
          ]),
          _: 1
        }, 8, ["visible", "header", "confirm-btn", "cancel-btn"]),
        createVNode(_component_t_dialog, {
          class: "artStyleDialog",
          visible: visualManualDialogVisible.value,
          "onUpdate:visible": _cache[15] || (_cache[15] = ($event) => visualManualDialogVisible.value = $event),
          header: editingVisualManual.value ? _ctx.$t("workbench.project.dialog.editVisualManualTitle") : _ctx.$t("workbench.project.dialog.newVisualManualTitle"),
          width: "90vw",
          placement: "center",
          onConfirm: handleVisualManualSubmit,
          onCloseBtnClick: resetDirectorManualDialog,
          onCancel: resetDirectorManualDialog,
          "confirm-btn": _ctx.$t("workbench.project.dialog.ok"),
          "cancel-btn": _ctx.$t("workbench.project.dialog.cancel")
        }, {
          default: withCtx(() => [
            createVNode(_component_t_loading, { loading: loading.value }, {
              default: withCtx(() => [
                createVNode(_component_t_form, { "label-align": "top" }, {
                  default: withCtx(() => [
                    createVNode(_component_t_form_item, null, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_23, [
                          createBaseVNode("div", _hoisted_24, [
                            createBaseVNode("label", _hoisted_25, toDisplayString(_ctx.$t("workbench.project.dialog.visualManualName")), 1),
                            createVNode(_component_t_input, {
                              modelValue: visualManualForm.value.name,
                              "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => visualManualForm.value.name = $event),
                              placeholder: _ctx.$t("workbench.project.dialog.visualManualNamePh")
                            }, null, 8, ["modelValue", "placeholder"])
                          ]),
                          createBaseVNode("div", _hoisted_26, [
                            createBaseVNode("label", _hoisted_27, toDisplayString(_ctx.$t("workbench.project.dialog.mdFile")), 1),
                            createVNode(_component_t_input, {
                              modelValue: visualManualForm.value.stylePath,
                              "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => visualManualForm.value.stylePath = $event),
                              disabled: !!editingVisualManual.value
                            }, null, 8, ["modelValue", "disabled"])
                          ]),
                          createBaseVNode("div", _hoisted_28, [
                            createBaseVNode("label", _hoisted_29, toDisplayString(_ctx.$t("workbench.project.dialog.visualManualCover")), 1),
                            createBaseVNode("div", _hoisted_30, [
                              (openBlock(true), createElementBlock(Fragment, null, renderList(visualManualForm.value.images, (img, idx) => {
                                return openBlock(), createElementBlock("div", {
                                  key: idx,
                                  class: "coverPreview"
                                }, [
                                  createBaseVNode("img", {
                                    src: img,
                                    class: "coverImg",
                                    onClick: withModifiers(($event) => handlePreview(img && img), ["stop"]),
                                    style: { "cursor": "pointer" }
                                  }, null, 8, _hoisted_31),
                                  createBaseVNode("div", {
                                    class: "coverImgRemove",
                                    onClick: ($event) => removeVisualManualCover(idx)
                                  }, [
                                    createVNode(_component_i_close, { size: "10" })
                                  ], 8, _hoisted_32)
                                ]);
                              }), 128)),
                              createBaseVNode("div", {
                                class: "coverUploadTrigger",
                                onClick: triggerVisualManualCoverUpload
                              }, [
                                createBaseVNode("input", {
                                  ref_key: "visualManualCoverInputRef",
                                  ref: visualManualCoverInputRef,
                                  type: "file",
                                  accept: "image/*",
                                  multiple: "",
                                  style: { "display": "none" },
                                  onChange: handleVisualManualCoverFileChange
                                }, null, 544),
                                createVNode(_component_i_plus, { size: "24" }),
                                createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.project.dialog.uploadCover")), 1)
                              ])
                            ])
                          ])
                        ])
                      ]),
                      _: 1
                    }),
                    createVNode(_component_t_form_item, {
                      label: _ctx.$t("workbench.project.dialog.visualManualPrompt")
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_33, [
                          createBaseVNode("div", _hoisted_34, [
                            createBaseVNode("div", _hoisted_35, [
                              createVNode(_component_t_tabs, {
                                value: visualManualTabValue.value,
                                size: "medium",
                                onChange: _cache[14] || (_cache[14] = (v) => visualManualTabValue.value = v)
                              }, {
                                default: withCtx(() => [
                                  (openBlock(true), createElementBlock(Fragment, null, renderList(visualManualTabData.value, (tab) => {
                                    return openBlock(), createBlock(_component_t_tab_panel, {
                                      key: tab.value,
                                      value: tab.value,
                                      label: tab.label
                                    }, {
                                      default: withCtx(() => [
                                        createVNode(AsyncMdEditor, {
                                          modelValue: tab.data,
                                          "onUpdate:modelValue": ($event) => tab.data = $event,
                                          theme: unref(themeSetting).mode,
                                          toolbars: promptToolbars,
                                          footers: [],
                                          placeholder: _ctx.$t("workbench.project.dialog.promptPlaceholder"),
                                          style: { "height": "30vh", "margin-top": "5px" },
                                          onOnUploadImg: () => {
                                          }
                                        }, null, 8, ["modelValue", "onUpdate:modelValue", "theme", "placeholder"])
                                      ]),
                                      _: 2
                                    }, 1032, ["value", "label"]);
                                  }), 128))
                                ]),
                                _: 1
                              }, 8, ["value"])
                            ])
                          ])
                        ])
                      ]),
                      _: 1
                    }, 8, ["label"])
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }, 8, ["loading"])
          ]),
          _: 1
        }, 8, ["visible", "header", "confirm-btn", "cancel-btn"]),
        createVNode(_component_t_dialog, {
          class: "artStyleDialog",
          visible: directorDialogVisible.value,
          "onUpdate:visible": _cache[19] || (_cache[19] = ($event) => directorDialogVisible.value = $event),
          header: editingDirectorManual.value ? _ctx.$t("workbench.project.dialog.editingDirectorManual") : _ctx.$t("workbench.project.dialog.newDirecorManualTitle"),
          width: "90vw",
          placement: "center",
          onConfirm: handleDirectorManualSubmit,
          onCloseBtnClick: resetVisualManualDialog,
          onCancel: resetVisualManualDialog,
          "confirm-btn": _ctx.$t("workbench.project.dialog.ok"),
          "cancel-btn": _ctx.$t("workbench.project.dialog.cancel")
        }, {
          default: withCtx(() => [
            createVNode(_component_t_loading, { loading: loading.value }, {
              default: withCtx(() => [
                createVNode(_component_t_form, { "label-align": "top" }, {
                  default: withCtx(() => [
                    createVNode(_component_t_form_item, null, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_36, [
                          createBaseVNode("div", _hoisted_37, [
                            createBaseVNode("label", _hoisted_38, toDisplayString(_ctx.$t("workbench.project.dialog.directorManualName")), 1),
                            createVNode(_component_t_input, {
                              modelValue: directorManualForm.value.name,
                              "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => directorManualForm.value.name = $event),
                              placeholder: _ctx.$t("workbench.project.dialog.directorManualNamePh")
                            }, null, 8, ["modelValue", "placeholder"])
                          ]),
                          createBaseVNode("div", _hoisted_39, [
                            createBaseVNode("label", _hoisted_40, toDisplayString(_ctx.$t("workbench.project.dialog.directorFile")), 1),
                            createVNode(_component_t_input, {
                              modelValue: directorManualForm.value.directorManual,
                              "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event) => directorManualForm.value.directorManual = $event),
                              disabled: !!editingDirectorManual.value
                            }, null, 8, ["modelValue", "disabled"])
                          ]),
                          createBaseVNode("div", _hoisted_41, [
                            createBaseVNode("label", _hoisted_42, toDisplayString(_ctx.$t("workbench.project.dialog.directorManualCover")), 1),
                            createBaseVNode("div", _hoisted_43, [
                              (openBlock(true), createElementBlock(Fragment, null, renderList(directorManualForm.value.images, (img, idx) => {
                                return openBlock(), createElementBlock("div", {
                                  key: idx,
                                  class: "coverPreview"
                                }, [
                                  createBaseVNode("img", {
                                    src: img,
                                    class: "coverImg"
                                  }, null, 8, _hoisted_44),
                                  createBaseVNode("div", {
                                    class: "coverImgRemove",
                                    onClick: ($event) => removeVisualManualCover(idx)
                                  }, [
                                    createVNode(_component_i_close, { size: "10" })
                                  ], 8, _hoisted_45)
                                ]);
                              }), 128)),
                              createBaseVNode("div", {
                                class: "coverUploadTrigger",
                                onClick: triggerDirectorManualCoverUpload
                              }, [
                                createBaseVNode("input", {
                                  ref_key: "visualManualCoverInputRef",
                                  ref: visualManualCoverInputRef,
                                  type: "file",
                                  accept: "image/*",
                                  multiple: "",
                                  style: { "display": "none" },
                                  onChange: handleDirectorManualCoverFileChange
                                }, null, 544),
                                createVNode(_component_i_plus, { size: "24" }),
                                createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.project.dialog.uploadCover")), 1)
                              ])
                            ])
                          ])
                        ])
                      ]),
                      _: 1
                    }),
                    createVNode(_component_t_form_item, {
                      label: _ctx.$t("workbench.project.dialog.directorManualPrompt")
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_46, [
                          createBaseVNode("div", _hoisted_47, [
                            createBaseVNode("div", _hoisted_48, [
                              createVNode(_component_t_tabs, {
                                value: directorManualTabValue.value,
                                size: "medium",
                                onChange: _cache[18] || (_cache[18] = (v) => directorManualTabValue.value = v)
                              }, {
                                default: withCtx(() => [
                                  (openBlock(true), createElementBlock(Fragment, null, renderList(directorManualTabData.value, (tab) => {
                                    return openBlock(), createBlock(_component_t_tab_panel, {
                                      key: tab.value,
                                      value: tab.value,
                                      label: tab.label
                                    }, {
                                      default: withCtx(() => [
                                        createVNode(AsyncMdEditor, {
                                          modelValue: tab.data,
                                          "onUpdate:modelValue": ($event) => tab.data = $event,
                                          theme: unref(themeSetting).mode,
                                          toolbars: promptToolbars,
                                          footers: [],
                                          placeholder: _ctx.$t("workbench.project.dialog.promptPlaceholder"),
                                          style: { "height": "30vh", "margin-top": "5px" },
                                          onOnUploadImg: () => {
                                          }
                                        }, null, 8, ["modelValue", "onUpdate:modelValue", "theme", "placeholder"])
                                      ]),
                                      _: 2
                                    }, 1032, ["value", "label"]);
                                  }), 128))
                                ]),
                                _: 1
                              }, 8, ["value"])
                            ])
                          ])
                        ])
                      ]),
                      _: 1
                    }, 8, ["label"])
                  ]),
                  _: 1
                })
              ]),
              _: 1
            }, 8, ["loading"])
          ]),
          _: 1
        }, 8, ["visible", "header", "confirm-btn", "cancel-btn"]),
        createVNode(_component_t_image_viewer, {
          modelValue: visible.value,
          "onUpdate:modelValue": _cache[20] || (_cache[20] = ($event) => visible.value = $event),
          images: [trigger.value],
          closeOnOverlay: true
        }, null, 8, ["modelValue", "images"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const projectDialog = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-7f55eb12"]]);

const _hoisted_1 = { class: "project" };
const _hoisted_2 = { class: "header" };
const _hoisted_3 = { class: "fc" };
const _hoisted_4 = { class: "title" };
const _hoisted_5 = { class: "sub" };
const _hoisted_6 = { class: "list" };
const _hoisted_7 = { class: "jb ac" };
const _hoisted_8 = { class: "title" };
const _hoisted_9 = { class: "intro" };
const _hoisted_10 = { class: "bottomMenu f ac jb" };
const _hoisted_11 = { class: "time" };
const _hoisted_12 = { class: "actionBtns f ac" };
const _hoisted_13 = ["onClick"];
const _hoisted_14 = ["onClick"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const { clearProjectCache } = imageListCacheStore();
    const { allProject, project } = storeToRefs(projectStore());
    const dialogShow = ref(false);
    const editProjectData = ref(null);
    async function getAllProject() {
      instance.post("/project/getProject").then(({ data }) => {
        allProject.value = data;
      });
    }
    onMounted(() => {
      project.value = null;
      getAllProject();
    });
    const router = useRouter();
    async function openProject(projectId) {
      const item = allProject.value.find((p) => p.id === projectId);
      if (!item) return window.$message.error($t("workbench.project.msg.notFound"));
      if (!item.imageModel || !item.videoModel) {
        window.$message.warning($t("workbench.project.msg.modelProviderDisabled"));
        return openEdit(item);
      }
      try {
        if (item.imageModel) {
          await instance.post("/modelSelect/getModelDetail", {
            modelId: item.imageModel
          });
        }
        if (item.videoModel) {
          await instance.post("/modelSelect/getModelDetail", {
            modelId: item.videoModel
          });
        }
      } catch {
        window.$message.warning($t("workbench.project.msg.modelProviderDisabled"));
        return openEdit(item);
      }
      project.value = item;
      if (item.projectType === "novel") router.push(`/novel`);
      else if (item.projectType === "script") router.push(`/script`);
    }
    function openEdit(item) {
      editProjectData.value = {
        ...item
      };
      dialogShow.value = true;
    }
    function editProjectFn(data) {
      instance.post("/project/editProject", data).then(() => {
        window.$message.success($t("workbench.project.msg.editSuccess"));
        getAllProject();
      }).catch((e) => {
        window.$message.error(e.message ?? $t("workbench.project.msg.editFailed"));
      });
    }
    function addProjectFn(data) {
      instance.post("/project/addProject", data).then(() => {
        window.$message.success($t("workbench.project.msg.addSuccess"));
        getAllProject();
      }).catch((e) => {
        window.$message.error(e.message ?? $t("workbench.project.msg.addFailed"));
      });
    }
    function delProjcer(projectId) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.project.msg.deleteHeader"),
        body: $t("workbench.project.msg.deleteBody"),
        confirmBtn: $t("workbench.project.msg.deleteConfirm"),
        cancelBtn: $t("workbench.project.msg.deleteCancel"),
        onConfirm: () => {
          instance.post("/project/delProject", { id: projectId }).then(() => {
            clearProjectCache(projectId);
            window.$message.success($t("workbench.project.msg.deleteSuccess"));
            getAllProject();
          }).catch((e) => {
            window.$message.error(e.message ?? $t("workbench.project.msg.deleteFailed"));
          }).finally(() => {
            dialog.destroy();
          });
        }
      });
    }
    return (_ctx, _cache) => {
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_button = Button;
      const _component_t_tag = Tag;
      const _component_i_edit = resolveComponent("i-edit");
      const _component_i_delete = resolveComponent("i-delete");
      const _component_t_card = Card;
      return openBlock(), createElementBlock(Fragment, null, [
        createBaseVNode("div", _hoisted_1, [
          createBaseVNode("div", _hoisted_2, [
            createBaseVNode("div", _hoisted_3, [
              createBaseVNode("span", _hoisted_4, toDisplayString(_ctx.$t("workbench.project.title")), 1),
              createBaseVNode("span", _hoisted_5, toDisplayString(_ctx.$t("workbench.project.subtitle")), 1)
            ]),
            createVNode(_component_t_button, {
              class: "addBtn",
              onClick: _cache[0] || (_cache[0] = ($event) => {
                editProjectData.value = null;
                dialogShow.value = true;
              })
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_plus, {
                  class: "addIcon",
                  size: 20
                })
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.project.newProject")), 1)
              ]),
              _: 1
            })
          ]),
          createBaseVNode("div", _hoisted_6, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(allProject), (project2) => {
              return openBlock(), createBlock(_component_t_card, {
                hoverShadow: "",
                class: "card",
                key: project2.id,
                onClick: ($event) => openProject(project2.id)
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", _hoisted_7, [
                    createBaseVNode("div", _hoisted_8, toDisplayString(project2.name), 1),
                    createBaseVNode("div", null, [
                      createVNode(_component_t_tag, { shape: "round" }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(project2.projectType == "novel" ? _ctx.$t(`workbench.project.type.novel`) : _ctx.$t(`workbench.project.type.script`)), 1)
                        ]),
                        _: 2
                      }, 1024)
                    ])
                  ]),
                  project2.artStyle ? (openBlock(), createBlock(_component_t_tag, {
                    key: 0,
                    shape: "round",
                    style: { "align-self": "flex-start" }
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(project2.artStyle), 1)
                    ]),
                    _: 2
                  }, 1024)) : createCommentVNode("", true),
                  createBaseVNode("div", _hoisted_9, toDisplayString(project2.intro), 1),
                  createBaseVNode("div", _hoisted_10, [
                    createBaseVNode("div", _hoisted_11, [
                      createBaseVNode("span", null, toDisplayString(unref(dayjs)(project2?.createTime).format("YYYY-MM-DD HH:mm:ss")), 1)
                    ]),
                    createBaseVNode("div", _hoisted_12, [
                      createBaseVNode("div", {
                        class: "editBtn",
                        onClick: withModifiers(($event) => openEdit(project2), ["stop"])
                      }, [
                        createVNode(_component_i_edit, { size: 18 })
                      ], 8, _hoisted_13),
                      createBaseVNode("div", {
                        class: "removeBtn",
                        onClick: withModifiers(($event) => delProjcer(project2.id), ["stop"])
                      }, [
                        createVNode(_component_i_delete, { size: 18 })
                      ], 8, _hoisted_14)
                    ])
                  ])
                ]),
                _: 2
              }, 1032, ["onClick"]);
            }), 128))
          ])
        ]),
        createVNode(projectDialog, {
          modelValue: unref(dialogShow),
          "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(dialogShow) ? dialogShow.value = $event : null),
          projectData: unref(editProjectData),
          onAdd: addProjectFn,
          onEdit: editProjectFn
        }, null, 8, ["modelValue", "projectData"])
      ], 64);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-01b7e152"]]);

export { index as default };

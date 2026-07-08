import { I as ImageTools } from './imageTools-CXYQW4aj.js';
import { l as defineComponent, bM as storeToRefs, r as ref, o as onMounted, b as onUnmounted, w as watch, aL as createElementBlock, aO as createBaseVNode, j as createVNode, aM as withCtx, F as Fragment, aP as renderList, a1 as unref, aS as createBlock, aT as createCommentVNode, av as isRef, aK as openBlock, a$ as createTextVNode, b0 as toDisplayString, E as withDirectives, G as vShow, bH as withModifiers, aU as normalizeClass, c as computed, k as reactive, b2 as resolveComponent } from './vue-vendor-Cj7sXJnb.js';
import { i as instance } from './axios-B2i2rFrf.js';
import { p as projectStore } from './project-C_OB2JAu.js';
import { _ as __unplugin_components_0 } from './modelSelect-Bj3Bcvu6.js';
import { s as settingStore, _ as _export_sfc } from './index-DsDM6Bax.js';
import { o as openAssetsSelector } from './assetsCheck-f3IiWWtt.js';
import { Y as Card, a4 as Empty, a6 as Drawer, H as Form, J as FormItem, B as Button, G as ImageViewer, a7 as CheckboxGroup, K as Select, T as Textarea, X as Tag, a5 as Popup, a8 as Image, L as Loading, I as Icon, a3 as Checkbox, W as DialogPlugin } from './tdesign-C157N6jJ.js';
import './dayjs-CuToSpIM.js';
import './providersLogo-BCbaFq8_.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';
import './index-DTygkZmB.js';

const _hoisted_1 = { class: "cornerScape f" };
const _hoisted_2 = { class: "left" };
const _hoisted_3 = { class: "quickActions" };
const _hoisted_4 = { class: "btnGap ac" };
const _hoisted_5 = {
  key: 0,
  class: "selectedInfo"
};
const _hoisted_6 = {
  class: "ac jb",
  style: { "width": "100%" }
};
const _hoisted_7 = { class: "content" };
const _hoisted_8 = { class: "imageBox" };
const _hoisted_9 = ["onClick"];
const _hoisted_10 = {
  key: 2,
  class: "generatingBox"
};
const _hoisted_11 = { class: "generatingText" };
const _hoisted_12 = { class: "imageToolsWrap" };
const _hoisted_13 = { class: "infoBox" };
const _hoisted_14 = { class: "title ac jb" };
const _hoisted_15 = { class: "meta" };
const _hoisted_16 = {
  key: 0,
  class: "prompt"
};
const _hoisted_17 = {
  key: 1,
  style: { "margin-top": "6px" }
};
const _hoisted_18 = { class: "drawerHeader" };
const _hoisted_19 = {
  key: 0,
  class: "drawerImageBox"
};
const _hoisted_20 = {
  key: 1,
  class: "generatingBox"
};
const _hoisted_21 = { class: "generatingText" };
const _hoisted_22 = { class: "imageToolsWrap show" };
const _hoisted_23 = { class: "historyImageList f" };
const _hoisted_24 = ["onClick"];
const _hoisted_25 = {
  key: 0,
  class: "audioList ac w"
};
const _hoisted_26 = {
  key: 1,
  class: "assets-empty"
};
const _hoisted_27 = { class: "drawerActions" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const { otherSetting } = storeToRefs(settingStore());
    const checkboxValue = ref([]);
    const { project } = storeToRefs(projectStore());
    const selectValue = ref(project.value?.imageModel ?? "");
    const resolution = ref("1K");
    const otherTextPrompt = ref("");
    const resolutionOptions = [
      { label: "1K", value: "1K" },
      { label: "2K", value: "2K" },
      { label: "4K", value: "4K" }
    ];
    const options = ref([
      { labelKey: "workbench.cornerScape.filterRole", value: "role" },
      { labelKey: "workbench.cornerScape.filterScene", value: "scene" },
      { labelKey: "workbench.cornerScape.filterTool", value: "tool" }
    ]);
    const translatedOptions = computed(
      () => options.value.map((opt) => ({
        ...opt,
        label: $t(opt.labelKey)
      }))
    );
    const dataList = ref([]);
    const loading = ref(false);
    let abortController = null;
    function createAbortController() {
      abortController?.abort();
      abortController = new AbortController();
      return abortController;
    }
    onMounted(() => {
      getFilteredData();
    });
    onUnmounted(() => {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      stopPolling();
      stopImagePolling();
      stopAudioPolling();
      dataList.value.forEach((item) => {
        if (item.state === "生成中") item.state = "";
      });
    });
    function onChangeFn() {
      getFilteredData();
    }
    async function getFilteredData() {
      try {
        loading.value = true;
        const { data } = await instance.post("/cornerScape/getAllAssets", {
          projectId: project.value?.id,
          type: checkboxValue.value
        });
        dataList.value = data;
        syncSelectedIdsWithData();
      } catch (error) {
        console.error("加载资产数据失败:", error);
        dataList.value = [];
        selectedIds.value = [];
      } finally {
        loading.value = false;
      }
    }
    const selectedIds = ref([]);
    function syncSelectedIdsWithData() {
      const visibleIds = new Set(dataList.value.map((item) => item.id));
      selectedIds.value = Array.from(new Set(selectedIds.value)).filter((id) => visibleIds.has(id));
    }
    const previewImages = computed(() => {
      const selectedImageList = dataList.value.filter((item) => selectedIds.value.includes(item.id) && item.filePath).map((item) => item.filePath);
      if (selectedImageList.length > 0) {
        return selectedImageList;
      }
      return dataList.value.filter((item) => item.filePath).map((item) => item.filePath);
    });
    const hasPreviewImages = computed(() => previewImages.value.length > 0);
    const toggleSelect = (id) => {
      const idx = selectedIds.value.indexOf(id);
      if (idx === -1) selectedIds.value.push(id);
      else selectedIds.value.splice(idx, 1);
    };
    const selectByState = (state) => {
      selectedIds.value = dataList.value.filter((item) => state === "" ? !item.state : item.state === state).map((item) => item.id);
    };
    function selectPromptEmpty() {
      const lite = dataList.value.filter((item) => !item.prompt || item.prompt.trim() === "").map((item) => item.id);
      if (lite.length === 0) {
        window.$message.warning($t("workbench.cornerScape.noEmptyPrompt"));
        return;
      }
      selectedIds.value = lite;
      window.$message.success($t("workbench.cornerScape.selectedCount", { count: selectedIds.value.length }));
    }
    function selectAll() {
      selectedIds.value = dataList.value.map((item) => item.id);
    }
    function toggleSelectAll() {
      if (selectedIds.value.length === dataList.value.length) {
        selectedIds.value = [];
      } else {
        selectedIds.value = dataList.value.map((item) => item.id);
      }
    }
    function clearSelection() {
      selectedIds.value = [];
    }
    async function cancelGenerationFn(item) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.assets.confirmCancellation"),
        body: $t("workbench.assets.confirmAgain"),
        confirmBtn: $t("workbench.assets.sure"),
        cancelBtn: $t("workbench.assets.cancelBtn"),
        theme: "warning",
        onConfirm: async () => {
          try {
            const { data } = await instance.post("/cornerScape/getAllAssets", {
              projectId: project.value?.id,
              type: checkboxValue.value
            });
            const freshItem = data.find((d) => d.id === item.id);
            if (!freshItem || !freshItem.imageId) {
              window.$message.warning($t("workbench.cornerScape.noGenerating"));
              return;
            }
            await instance.post("/assetsGenerate/cancelGenerate", {
              id: freshItem.imageId
            });
            window.$message.success($t("workbench.cornerScape.cancelGeneration") + " " + item.name);
          } catch (e) {
            window.$message.error(e.message ?? $t("workbench.cornerScape.cancelGeneration") + "失败");
          } finally {
            getFilteredData();
            dialog.destroy();
          }
        }
      });
    }
    const drawerVisible = ref(false);
    const currentItem = ref(null);
    const selectedHistoryId = ref(null);
    async function toggleHistorySelect(id) {
      selectedHistoryId.value = selectedHistoryId.value === id ? null : id;
      if (!currentItem.value) return;
      const selectedImage = currentItem.value.historyImages.find((img) => img.id === selectedHistoryId.value);
      try {
        await instance.post("/assets/saveAssets", {
          id: currentItem.value.id,
          type: currentItem.value.type,
          projectId: project.value?.id,
          prompt: currentItem.value.prompt,
          imageId: selectedImage?.id
        });
        if (selectedImage) {
          currentItem.value.filePath = selectedImage.filePath;
          currentItem.value.state = "已完成";
        }
        getFilteredData();
        window.$message.success($t("workbench.cornerScape.msg.replaceSuccess"));
      } catch (e) {
        window.$message.error($t("workbench.cornerScape.msg.replaceFailed"));
        return;
      }
    }
    const editForm = reactive({
      assetsId: 0,
      model: "",
      type: "",
      resolution: "",
      prompt: "",
      name: "",
      describe: "",
      promptState: "",
      relepedAudio: []
    });
    async function openDrawer(item) {
      if (item.state == "生成中") return;
      selectedHistoryId.value = null;
      editForm.assetsId = item.id;
      editForm.name = item.name || "";
      editForm.type = item.type || "";
      editForm.model = item.model || "";
      currentItem.value = item;
      editForm.resolution = item.resolution || "";
      editForm.prompt = item.prompt || "";
      editForm.describe = item.describe || "";
      editForm.promptState = item.promptState;
      editForm.relepedAudio = item?.relepedAudio ?? [];
      drawerVisible.value = true;
      try {
        const { data } = await instance.post("/cornerScape/getAllAssets", {
          projectId: project.value?.id,
          type: checkboxValue.value
        });
        const freshItem = data.find((d) => d.id === item.id);
        if (freshItem) {
          const idx = dataList.value.findIndex((d) => d.id === item.id);
          if (idx !== -1) dataList.value[idx] = freshItem;
          currentItem.value = freshItem;
          editForm.prompt = freshItem.prompt || editForm.prompt;
          editForm.resolution = freshItem.resolution || editForm.resolution;
        }
      } catch (e) {
        console.error("刷新资产详情失败:", e);
      }
    }
    function setItemState(id, state) {
      const item = dataList.value.find((i) => i.id === id);
      if (item) item.state = state;
      if (currentItem.value?.id === id) currentItem.value.state = state;
    }
    function regenerateItem() {
      if (!currentItem.value) return;
      if (!selectValue.value) {
        window.$message.warning($t("workbench.cornerScape.msg.selectModel"));
        return;
      }
      if (!editForm.resolution) {
        window.$message.warning($t("workbench.cornerScape.msg.selectResolution"));
        return;
      }
      if (!editForm.prompt.trim()) {
        window.$message.warning($t("workbench.cornerScape.msg.enterPrompt"));
        return;
      }
      const item = currentItem.value;
      setItemState(item.id, "生成中");
      drawerVisible.value = false;
      const controller = createAbortController();
      instance.post(
        "/assetsGenerate/generateAssets",
        {
          type: item.type ?? "props",
          projectId: project.value?.id,
          name: item.name ?? $t("workbench.cornerScape.unnamed"),
          base64: "",
          prompt: editForm.prompt,
          model: selectValue.value,
          id: item.id,
          resolution: editForm.resolution,
          concurrentCount: 1
        },
        { signal: controller.signal }
      ).then(async () => {
        window.$message.success($t("workbench.cornerScape.msg.genSuccess", { name: item.name }));
        await getFilteredData();
      }).catch((e) => {
        if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
        window.$message.error(e.message ?? $t("workbench.cornerScape.msg.genFailed", { name: item.name }));
        setItemState(item.id, "生成失败");
      });
    }
    async function savePromptOnBlur() {
      if (!currentItem.value) return;
      if (editForm.prompt === currentItem.value.prompt) return;
      try {
        await instance.post("/assets/saveAssets", {
          id: currentItem.value.id,
          type: currentItem.value.type,
          projectId: project.value?.id,
          prompt: editForm.prompt
        });
        currentItem.value.prompt = editForm.prompt;
        const target = dataList.value.find((d) => d.id === currentItem.value.id);
        if (target) target.prompt = editForm.prompt;
        window.$message.success($t("workbench.cornerScape.msg.saveSuccess"));
      } catch (e) {
        window.$message.error($t("workbench.cornerScape.msg.saveFailed"));
      }
    }
    const polishing = ref(false);
    async function polishPrompts() {
      if (!editForm.prompt.trim()) {
        window.$message.warning($t("workbench.cornerScape.msg.enterPromptFirst"));
        return;
      }
      polishing.value = true;
      try {
        const { data } = await instance.post("/assetsGenerate/polishAssetsPrompt", {
          projectId: project.value?.id,
          assetsId: editForm.assetsId,
          type: editForm.type ?? "props",
          name: editForm.name,
          describe: editForm.describe
        });
        window.$message.success($t("workbench.cornerScape.msg.promptGenSuccess"));
        if (data.assetsId === editForm.assetsId) {
          editForm.prompt = data.prompt;
        }
        getFilteredData();
      } catch (e) {
        window.$message.error(e?.message ?? $t("workbench.cornerScape.msg.polishFailed"));
      } finally {
        polishing.value = false;
      }
    }
    async function batchGenerationPrompt() {
      if (selectedIds.value.length === 0) {
        window.$message.warning($t("workbench.cornerScape.msg.selectAtLeastOne"));
        return;
      }
      const items = dataList.value.filter((item) => selectedIds.value.includes(item.id));
      items.forEach((item) => {
        item.promptState = "生成中";
      });
      selectedIds.value = [];
      try {
        await instance.post("/assetsGenerate/batchPolishAssetsPrompt", {
          projectId: project.value?.id,
          items: items.map((item) => ({
            assetsId: item.id,
            type: item.type ?? "props",
            name: item.name,
            describe: item.describe
          })),
          concurrentCount: otherSetting.value.assetsBatchGenereateSize,
          otherTextPrompt: otherTextPrompt.value
        });
      } catch (e) {
        window.$message.error(e?.message ?? $t("workbench.cornerScape.msg.promptGenFail"));
        items.forEach((item) => {
          const target = dataList.value.find((row) => row.id === item.id);
          if (target) target.promptState = "";
        });
      }
    }
    async function batchSelectBindAudio() {
      if (selectedIds.value.length === 0) {
        window.$message.warning($t("workbench.cornerScape.msg.selectAtLeastBindOne"));
        return;
      }
      const items = dataList.value.filter((item) => selectedIds.value.includes(item.id));
      items.forEach((item) => {
        item.audioBindState = "生成中";
      });
      selectedIds.value = [];
      try {
        await instance.post("/cornerScape/batchBindAudio", {
          projectId: project.value?.id,
          assetsIds: items.map((item) => item.id),
          concurrentCount: otherSetting.value.assetsBatchGenereateSize
        });
      } catch (e) {
        window.$message.error(e.message ?? $t("workbench.cornerScape.msg.promptGenFail"));
        items.forEach((item) => {
          const target = dataList.value.find((row) => row.id === item.id);
          if (target) target.audioBindState = "";
        });
      }
    }
    async function batchGenerationImage() {
      if (selectedIds.value.length === 0) {
        window.$message.warning($t("workbench.cornerScape.msg.selectAtLeastOne"));
        return;
      }
      if (!selectValue.value) {
        window.$message.warning($t("workbench.cornerScape.msg.selectModel"));
        return;
      }
      if (!resolution.value) {
        window.$message.warning($t("workbench.cornerScape.msg.selectResolution"));
        return;
      }
      const items = dataList.value.filter((item) => selectedIds.value.includes(item.id));
      const emptyPrompts = items.filter((item) => !item.prompt);
      if (emptyPrompts.length > 0) {
        const emptyPromptNames = emptyPrompts.map((item) => item.name).join(", ");
        window.$message.warning(
          $t("workbench.cornerScape.msg.emptyPrompt", {
            emptyPromptNames
          })
        );
        return;
      }
      items.forEach((item) => setItemState(item.id, "生成中"));
      window.$message.success(
        $t("workbench.cornerScape.msg.batchStarted", { count: items.length, concurrent: otherSetting.value.assetsBatchGenereateSize })
      );
      try {
        await instance.post("/assetsGenerate/batchGenerateImageAssets", {
          projectId: project.value?.id,
          model: selectValue.value,
          resolution: resolution.value,
          concurrentCount: otherSetting.value.assetsBatchGenereateSize,
          items: items.map((item) => ({
            id: item.id,
            type: item.type ?? "props",
            name: item.name ?? $t("workbench.cornerScape.unnamed"),
            prompt: item.prompt
          }))
        });
        selectedIds.value = [];
      } catch (e) {
        if (e.name === "CanceledError" || e.code === "ERR_CANCELED") return;
        window.$message.error(e.message ?? $t("workbench.cornerScape.msg.batchFailed"));
      }
    }
    const notCompultedData = computed(() => {
      return dataList.value.filter((item) => item.promptState == "生成中");
    });
    const generatingData = computed(() => {
      return dataList.value.filter((item) => item.state === "生成中");
    });
    const audioBindData = computed(() => {
      return dataList.value.filter((item) => item.audioBindState === "生成中");
    });
    let pollingTimer = null;
    let imagePollingTimer = null;
    let audioBindPollingTimer = null;
    async function pollingPromptAssets() {
      if (notCompultedData.value.length === 0) return;
      const ids = notCompultedData.value.map((item) => item.id);
      try {
        const { data } = await instance.post("/assets/pollingPromptAssets", { ids });
        let hasCompleted = false;
        if (Array.isArray(data) && data.length) {
          data.forEach((item) => {
            const target = dataList.value.find((row) => row.id === item.id);
            if (target) {
              if (target.promptState === "生成中" && item.promptState !== "生成中") hasCompleted = true;
              target.promptState = item.promptState;
              if (item.prompt !== void 0) target.prompt = item.prompt;
            }
          });
        }
        if (hasCompleted) {
          try {
            const { data: freshData } = await instance.post("/cornerScape/getAllAssets", {
              projectId: project.value?.id,
              type: checkboxValue.value
            });
            freshData.forEach((fresh) => {
              const target = dataList.value.find((row) => row.id === fresh.id);
              if (target) target.historyImages = fresh.historyImages;
            });
            if (currentItem.value) {
              const freshCurrent = freshData.find((d) => d.id === currentItem.value.id);
              if (freshCurrent) currentItem.value.historyImages = freshCurrent.historyImages;
            }
          } catch (e) {
            console.error("刷新历史图片失败:", e);
          }
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
        let hasCompleted = false;
        if (Array.isArray(data) && data.length) {
          data.forEach((item) => {
            const target = dataList.value.find((row) => row.id === item.id);
            if (target) {
              if (target.state === "生成中" && item.state !== "生成中") hasCompleted = true;
              target.state = item.state;
              if (item.filePath !== void 0) target.filePath = item.filePath;
            }
          });
        }
        if (hasCompleted) {
          try {
            const { data: freshData } = await instance.post("/cornerScape/getAllAssets", {
              projectId: project.value?.id,
              type: checkboxValue.value
            });
            freshData.forEach((fresh) => {
              const target = dataList.value.find((row) => row.id === fresh.id);
              if (target) target.historyImages = fresh.historyImages;
            });
            if (currentItem.value) {
              const freshCurrent = freshData.find((d) => d.id === currentItem.value.id);
              if (freshCurrent) currentItem.value.historyImages = freshCurrent.historyImages;
            }
          } catch (e) {
            console.error("刷新历史图片失败:", e);
          }
        }
      } catch (e) {
        console.error("轮询图片生成状态失败:", e);
      }
    }
    async function pollingAudioBind() {
      if (audioBindData.value.length === 0) return;
      const ids = audioBindData.value.map((item) => item.id);
      try {
        const { data } = await instance.post("/cornerScape/pollingAudio", { ids });
        let hasCompleted = false;
        if (Array.isArray(data) && data.length) {
          data.forEach((item) => {
            const target = dataList.value.find((row) => row.id === item.id);
            if (target) {
              if (target.audioBindState === "生成中" && item.audioBindState !== "生成中") hasCompleted = true;
              target.audioBindState = item.audioBindState;
              if (item.filePath !== void 0) target.filePath = item.filePath;
            }
          });
        }
        if (hasCompleted) {
          try {
            const { data: freshData } = await instance.post("/cornerScape/getAllAssets", {
              projectId: project.value?.id,
              type: checkboxValue.value
            });
            freshData.forEach((fresh) => {
              const target = dataList.value.find((row) => row.id === fresh.id);
              if (target) target.relepedAudio = fresh.relepedAudio;
            });
            if (currentItem.value) {
              const freshCurrent = freshData.find((d) => d.id === currentItem.value.id);
              if (freshCurrent) currentItem.value.relepedAudio = freshCurrent.relepedAudio;
            }
          } catch (e) {
            console.error("刷新历史图片失败:", e);
          }
        }
      } catch (e) {
        console.error("轮询音频绑定状态失败:", e);
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
    function stopAudioPolling() {
      if (audioBindPollingTimer) {
        clearInterval(audioBindPollingTimer);
        audioBindPollingTimer = null;
      }
    }
    function startAudioPolling() {
      if (audioBindPollingTimer) return;
      audioBindPollingTimer = setInterval(async () => {
        if (audioBindData.value.length === 0) {
          stopAudioPolling();
          return;
        }
        await pollingAudioBind();
      }, 3e3);
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
    watch(audioBindData, (val) => {
      if (val.length > 0) {
        startAudioPolling();
      } else {
        stopAudioPolling();
      }
    });
    async function removeAudio(id) {
      editForm.relepedAudio = editForm.relepedAudio.filter((a) => a.id !== id);
      await instance.post("/cornerScape/updateAssetsAudio", {
        assetsId: editForm.assetsId
      });
    }
    async function selectAudio() {
      const assets = await openAssetsSelector({
        title: $t("workbench.script.add.msg.selectAssetsTitle"),
        types: ["audio"],
        selectorMode: true,
        multiple: false
      });
      if (assets.length) {
        editForm.relepedAudio = [{ id: assets[0].id, name: assets[0].name }];
        await instance.post("/cornerScape/updateAssetsAudio", {
          assetsId: editForm.assetsId,
          audioIds: editForm.relepedAudio.map((i) => i.id)
        });
      }
    }
    return (_ctx, _cache) => {
      const _component_t_tag = Tag;
      const _component_t_button = Button;
      const _component_t_image_viewer = ImageViewer;
      const _component_t_form_item = FormItem;
      const _component_t_checkbox_group = CheckboxGroup;
      const _component_t_select = Select;
      const _component_t_textarea = Textarea;
      const _component_t_form = Form;
      const _component_t_card = Card;
      const _component_t_checkbox = Checkbox;
      const _component_t_empty = Empty;
      const _component_t_loading = Loading;
      const _component_t_popup = Popup;
      const _component_ImageTools = ImageTools;
      const _component_t_image = Image;
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_icon = Icon;
      const _component_t_drawer = Drawer;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createVNode(_component_t_card, {
            shadow: "",
            class: "card"
          }, {
            title: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.batchSettings")) + " ", 1),
              createVNode(_component_t_tag, {
                size: "small",
                theme: "primary",
                variant: "light",
                style: { "margin-left": "8px" }
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(unref(dataList).length), 1)
                ]),
                _: 1
              })
            ]),
            default: withCtx(() => [
              createVNode(_component_t_form, { labelAlign: "top" }, {
                default: withCtx(() => [
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.cornerScape.quickActions")
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_3, [
                        createVNode(_component_t_button, {
                          theme: "primary",
                          variant: "outline",
                          onClick: selectAll
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.selectAll")), 1)
                          ]),
                          _: 1
                        }),
                        createVNode(_component_t_button, {
                          theme: "primary",
                          variant: "outline",
                          onClick: _cache[0] || (_cache[0] = ($event) => selectPromptEmpty())
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.selectPromptEmpty")), 1)
                          ]),
                          _: 1
                        }),
                        createVNode(_component_t_button, {
                          theme: "primary",
                          variant: "outline",
                          onClick: _cache[1] || (_cache[1] = ($event) => selectByState(""))
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.selectUngenerated")), 1)
                          ]),
                          _: 1
                        }),
                        createVNode(_component_t_button, {
                          theme: "primary",
                          variant: "outline",
                          onClick: _cache[2] || (_cache[2] = ($event) => selectByState("已完成"))
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.selectGenerated")), 1)
                          ]),
                          _: 1
                        }),
                        createVNode(_component_t_button, {
                          theme: "primary",
                          variant: "outline",
                          onClick: _cache[3] || (_cache[3] = ($event) => selectByState("生成失败"))
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.selectFailed")), 1)
                          ]),
                          _: 1
                        }),
                        createVNode(_component_t_button, {
                          theme: "primary",
                          variant: "outline",
                          onClick: toggleSelectAll
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.invertSelection")), 1)
                          ]),
                          _: 1
                        }),
                        createVNode(_component_t_button, {
                          theme: "primary",
                          variant: "outline",
                          onClick: clearSelection
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.clearSelection")), 1)
                          ]),
                          _: 1
                        }),
                        createVNode(_component_t_image_viewer, {
                          images: unref(previewImages),
                          closeOnEscKeydown: true,
                          closeOnOverlay: true
                        }, {
                          trigger: withCtx(({ open }) => [
                            createVNode(_component_t_button, {
                              theme: "primary",
                              variant: "outline",
                              disabled: !unref(hasPreviewImages),
                              onClick: ($event) => unref(hasPreviewImages) && open()
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.batchPreview")), 1)
                              ]),
                              _: 1
                            }, 8, ["disabled", "onClick"])
                          ]),
                          _: 1
                        }, 8, ["images"])
                      ])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.cornerScape.assetTypeFilter")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_checkbox_group, {
                        onChange: onChangeFn,
                        modelValue: unref(checkboxValue),
                        "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => isRef(checkboxValue) ? checkboxValue.value = $event : null),
                        options: unref(translatedOptions),
                        class: "filterGroup"
                      }, null, 8, ["modelValue", "options"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.cornerScape.genModel")
                  }, {
                    default: withCtx(() => [
                      createVNode(__unplugin_components_0, {
                        modelValue: unref(selectValue),
                        "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef(selectValue) ? selectValue.value = $event : null),
                        type: `image`
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.cornerScape.resolution")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_select, {
                        modelValue: unref(resolution),
                        "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => isRef(resolution) ? resolution.value = $event : null),
                        placeholder: _ctx.$t("workbench.cornerScape.resolutionPh"),
                        options: [
                          { label: "1K", value: "1K" },
                          { label: "2K", value: "2K" },
                          { label: "4K", value: "4K" }
                        ]
                      }, null, 8, ["modelValue", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.cornerScape.textPromptInput")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_textarea, {
                        modelValue: unref(otherTextPrompt),
                        "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => isRef(otherTextPrompt) ? otherTextPrompt.value = $event : null),
                        placeholder: _ctx.$t("workbench.cornerScape.textPromptPh")
                      }, null, 8, ["modelValue", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, null, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_4, [
                        unref(selectedIds).length > 0 ? (openBlock(), createElementBlock("div", _hoisted_5, [
                          createVNode(_component_t_tag, {
                            size: "medium",
                            theme: "primary",
                            variant: "light"
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.selectedCount", { count: unref(selectedIds).length })), 1)
                            ]),
                            _: 1
                          })
                        ])) : createCommentVNode("", true),
                        createBaseVNode("div", _hoisted_6, [
                          createVNode(_component_t_button, {
                            theme: "primary",
                            block: "",
                            onClick: batchGenerationPrompt
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.batchGenerationPrompt")), 1)
                            ]),
                            _: 1
                          }),
                          createVNode(_component_t_button, {
                            theme: "primary",
                            style: { "margin-left": "10px" },
                            block: "",
                            onClick: batchSelectBindAudio
                          }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.batchBingAudio")), 1)
                            ]),
                            _: 1
                          })
                        ]),
                        createVNode(_component_t_button, {
                          theme: "primary",
                          block: "",
                          onClick: batchGenerationImage
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.startBatch")), 1)
                          ]),
                          _: 1
                        })
                      ])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        createBaseVNode("div", _hoisted_7, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(dataList), (item) => {
            return withDirectives((openBlock(), createBlock(_component_t_card, {
              shadow: "",
              class: "card",
              key: item.id,
              onClick: ($event) => openDrawer(item)
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_8, [
                  createVNode(_component_t_checkbox, {
                    class: "selectBox",
                    checked: unref(selectedIds).includes(item.id),
                    onClick: _cache[8] || (_cache[8] = withModifiers(() => {
                    }, ["stop"])),
                    onChange: ($event) => toggleSelect(item.id)
                  }, null, 8, ["checked", "onChange"]),
                  item.state === "生成中" ? (openBlock(), createElementBlock("div", {
                    key: 0,
                    class: "cancelGeneration",
                    onClick: withModifiers(($event) => cancelGenerationFn(item), ["stop"])
                  }, [
                    createVNode(_component_t_tag, {
                      theme: "danger",
                      size: "small"
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("workbench.cornerScape.cancelGeneration")), 1)
                      ]),
                      _: 1
                    })
                  ], 8, _hoisted_9)) : createCommentVNode("", true),
                  !item.state && item.promptState !== "生成中" ? (openBlock(), createBlock(_component_t_empty, {
                    key: 1,
                    type: "maintenance",
                    title: _ctx.$t("workbench.cornerScape.waitingGen")
                  }, null, 8, ["title"])) : item.state === "生成中" || item.promptState === "生成中" || item.audioBindState == "生成中" ? (openBlock(), createElementBlock("div", _hoisted_10, [
                    createVNode(_component_t_loading),
                    createBaseVNode("span", _hoisted_11, toDisplayString(item.audioBindState === "生成中" ? _ctx.$t("workbench.cornerScape.audioState") : _ctx.$t("workbench.cornerScape.generating")), 1)
                  ])) : item.state === "生成失败" ? (openBlock(), createBlock(_component_t_popup, {
                    key: 3,
                    content: item.errorReason
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_empty, {
                        type: "fail",
                        title: _ctx.$t("workbench.cornerScape.genFailed")
                      }, null, 8, ["title"])
                    ]),
                    _: 1
                  }, 8, ["content"])) : (openBlock(), createBlock(_component_t_image, {
                    key: 4,
                    class: "image",
                    src: item.filePath ?? void 0,
                    fit: "contain",
                    preview: true,
                    lazy: true
                  }, {
                    error: withCtx(() => [
                      createVNode(_component_t_empty, {
                        type: "fail",
                        title: _ctx.$t("workbench.cornerScape.imageError")
                      }, null, 8, ["title"])
                    ]),
                    overlayContent: withCtx(() => [
                      createBaseVNode("div", _hoisted_12, [
                        createVNode(_component_ImageTools, {
                          src: item.filePath,
                          position: "br"
                        }, null, 8, ["src"])
                      ])
                    ]),
                    _: 2
                  }, 1032, ["src"]))
                ]),
                createBaseVNode("div", _hoisted_13, [
                  createBaseVNode("div", _hoisted_14, [
                    createTextVNode(toDisplayString(item.name) + " ", 1),
                    item.prompt ? (openBlock(), createBlock(_component_t_tag, {
                      key: 0,
                      size: "small",
                      variant: "outline",
                      theme: "success"
                    }, {
                      default: withCtx(() => [..._cache[13] || (_cache[13] = [
                        createTextVNode("已生成提示词", -1)
                      ])]),
                      _: 1
                    })) : (openBlock(), createBlock(_component_t_tag, {
                      key: 1,
                      size: "small",
                      variant: "outline",
                      theme: "danger"
                    }, {
                      default: withCtx(() => [..._cache[14] || (_cache[14] = [
                        createTextVNode("未生成提示词", -1)
                      ])]),
                      _: 1
                    }))
                  ]),
                  createBaseVNode("div", _hoisted_15, [
                    createVNode(_component_t_tag, {
                      size: "small",
                      variant: "light-outline",
                      theme: "warning",
                      class: "typeTag"
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(item.type === "role" ? _ctx.$t("workbench.cornerScape.typeRole") : item.type === "scene" ? _ctx.$t("workbench.cornerScape.typeScene") : item.type === "tool" ? _ctx.$t("workbench.cornerScape.typeTool") : _ctx.$t("workbench.cornerScape.typeUnknown")), 1)
                      ]),
                      _: 2
                    }, 1024),
                    item.model ? (openBlock(), createBlock(_component_t_tag, {
                      key: 0,
                      size: "small",
                      variant: "outline",
                      class: "stateTag"
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(item.model), 1)
                      ]),
                      _: 2
                    }, 1024)) : createCommentVNode("", true),
                    item.resolution ? (openBlock(), createBlock(_component_t_tag, {
                      key: 1,
                      size: "small",
                      variant: "outline"
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(item.resolution), 1)
                      ]),
                      _: 2
                    }, 1024)) : createCommentVNode("", true)
                  ]),
                  item.describe ? (openBlock(), createElementBlock("div", _hoisted_16, toDisplayString(item.type === "role" ? _ctx.$t("workbench.cornerScape.typeRole") : item.type === "scene" ? _ctx.$t("workbench.cornerScape.typeScene") : item.type === "tool" ? _ctx.$t("workbench.cornerScape.typeTool") : _ctx.$t("workbench.cornerScape.typeUnknown")) + toDisplayString(_ctx.$t("workbench.cornerScape.descriptionSuffix")) + toDisplayString(item.describe), 1)) : createCommentVNode("", true),
                  item.relepedAudio.length ? (openBlock(), createElementBlock("div", _hoisted_17, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(item.relepedAudio, (audio) => {
                      return openBlock(), createBlock(_component_t_tag, {
                        key: audio.id,
                        size: "small",
                        variant: "outline",
                        theme: "primary"
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(audio.name), 1)
                        ]),
                        _: 2
                      }, 1024);
                    }), 128))
                  ])) : createCommentVNode("", true)
                ])
              ]),
              _: 2
            }, 1032, ["onClick"])), [
              [vShow, unref(dataList).length > 0]
            ]);
          }), 128)),
          unref(dataList).length === 0 ? (openBlock(), createBlock(_component_t_empty, {
            key: 0,
            type: "empty",
            title: _ctx.$t("workbench.cornerScape.operateScriptFirst")
          }, null, 8, ["title"])) : createCommentVNode("", true),
          createVNode(_component_t_drawer, {
            closeBtn: true,
            closeOnEscKeydown: "",
            showOverlay: false,
            footer: false,
            visible: unref(drawerVisible),
            "onUpdate:visible": _cache[12] || (_cache[12] = ($event) => isRef(drawerVisible) ? drawerVisible.value = $event : null),
            size: "480px"
          }, {
            header: withCtx(() => [
              createBaseVNode("div", _hoisted_18, [
                createBaseVNode("span", null, toDisplayString(unref(currentItem)?.name) + " - " + toDisplayString(_ctx.$t("workbench.cornerScape.individualConfig")), 1),
                createVNode(_component_t_tag, {
                  size: "medium",
                  variant: "light-outline",
                  theme: "warning"
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(unref(currentItem)?.type === "role" ? _ctx.$t("workbench.cornerScape.typeRole") : unref(currentItem)?.type === "scene" ? _ctx.$t("workbench.cornerScape.typeScene") : unref(currentItem)?.type === "tool" ? _ctx.$t("workbench.cornerScape.typeTool") : _ctx.$t("workbench.cornerScape.typeUnknown")), 1)
                  ]),
                  _: 1
                })
              ])
            ]),
            default: withCtx(() => [
              unref(currentItem) ? (openBlock(), createElementBlock("div", _hoisted_19, [
                !unref(currentItem).state ? (openBlock(), createBlock(_component_t_empty, {
                  key: 0,
                  type: "maintenance",
                  title: _ctx.$t("workbench.cornerScape.waitingGen")
                }, null, 8, ["title"])) : unref(currentItem).state === "生成中" ? (openBlock(), createElementBlock("div", _hoisted_20, [
                  createVNode(_component_t_loading),
                  createBaseVNode("span", _hoisted_21, toDisplayString(_ctx.$t("workbench.cornerScape.generating")), 1)
                ])) : unref(currentItem).state === "生成失败" ? (openBlock(), createBlock(_component_t_empty, {
                  key: 2,
                  type: "fail",
                  title: _ctx.$t("workbench.cornerScape.genFailed")
                }, null, 8, ["title"])) : unref(currentItem).filePath ? (openBlock(), createBlock(_component_t_image, {
                  key: 3,
                  class: "image",
                  src: unref(currentItem).filePath,
                  fit: "contain"
                }, {
                  error: withCtx(() => [
                    createVNode(_component_t_empty, {
                      type: "fail",
                      title: _ctx.$t("workbench.cornerScape.imageError")
                    }, null, 8, ["title"])
                  ]),
                  overlayContent: withCtx(() => [
                    createBaseVNode("div", _hoisted_22, [
                      createVNode(_component_ImageTools, {
                        src: unref(currentItem).filePath,
                        position: "br"
                      }, null, 8, ["src"])
                    ])
                  ]),
                  _: 1
                }, 8, ["src"])) : (openBlock(), createBlock(_component_t_empty, {
                  key: 4,
                  type: "maintenance",
                  title: _ctx.$t("workbench.cornerScape.noImage")
                }, null, 8, ["title"]))
              ])) : createCommentVNode("", true),
              unref(currentItem) ? (openBlock(), createBlock(_component_t_form, {
                key: 1,
                labelAlign: "top"
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.cornerScape.history")
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_23, [
                        (openBlock(true), createElementBlock(Fragment, null, renderList(unref(currentItem).historyImages, (item) => {
                          return openBlock(), createElementBlock("div", {
                            key: item.id,
                            class: normalizeClass(["historyImageItem", { selected: unref(selectedHistoryId) === item.id }]),
                            onClick: withModifiers(($event) => toggleHistorySelect(item.id), ["stop"])
                          }, [
                            createVNode(_component_t_image, {
                              src: item.filePath,
                              style: { width: "100px", minWidth: "100px", height: "100px" },
                              lazy: true,
                              fit: "contain"
                            }, null, 8, ["src"])
                          ], 10, _hoisted_24);
                        }), 128))
                      ])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.cornerScape.genModel")
                  }, {
                    default: withCtx(() => [
                      createVNode(__unplugin_components_0, {
                        modelValue: unref(selectValue),
                        "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => isRef(selectValue) ? selectValue.value = $event : null),
                        type: `image`
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.cornerScape.resolution")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_select, {
                        modelValue: unref(editForm).resolution,
                        "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => unref(editForm).resolution = $event),
                        placeholder: _ctx.$t("workbench.cornerScape.resolutionPh"),
                        options: resolutionOptions
                      }, null, 8, ["modelValue", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.cornerScape.promptLabel")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_loading, {
                        style: { "width": "100%" },
                        loading: unref(currentItem).promptState == "生成中"
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_t_textarea, {
                            modelValue: unref(editForm).prompt,
                            "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => unref(editForm).prompt = $event),
                            placeholder: _ctx.$t("workbench.cornerScape.promptPh"),
                            autosize: { minRows: 4, maxRows: 10 },
                            disabled: unref(polishing),
                            onBlur: savePromptOnBlur
                          }, null, 8, ["modelValue", "placeholder", "disabled"])
                        ]),
                        _: 1
                      }, 8, ["loading"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("workbench.cornerScape.assetsAudioLabel")
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", null, [
                        createBaseVNode("div", null, [
                          createVNode(_component_t_button, {
                            size: "small",
                            theme: "primary",
                            variant: "outline",
                            onClick: selectAudio
                          }, {
                            icon: withCtx(() => [
                              createVNode(_component_i_plus)
                            ]),
                            default: withCtx(() => [
                              createTextVNode(" " + toDisplayString(_ctx.$t("workbench.cornerScape.selectAudio")), 1)
                            ]),
                            _: 1
                          })
                        ]),
                        unref(editForm).relepedAudio.length ? (openBlock(), createElementBlock("div", _hoisted_25, [
                          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(editForm).relepedAudio, (audio) => {
                            return openBlock(), createBlock(_component_t_tag, {
                              key: audio.id,
                              closable: "",
                              variant: "light-outline",
                              onClose: ($event) => removeAudio(audio.id)
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(audio.name), 1)
                              ]),
                              _: 2
                            }, 1032, ["onClose"]);
                          }), 128))
                        ])) : (openBlock(), createElementBlock("div", _hoisted_26, toDisplayString(_ctx.$t("workbench.cornerScape.noAudio")), 1))
                      ])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, null, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_27, [
                        createVNode(_component_t_button, {
                          theme: "default",
                          variant: "outline",
                          loading: unref(polishing),
                          onClick: polishPrompts,
                          disabled: unref(currentItem).promptState == "生成中" ? true : false
                        }, {
                          icon: withCtx(() => [
                            createVNode(_component_t_icon, { name: "edit" })
                          ]),
                          default: withCtx(() => [
                            createTextVNode(" " + toDisplayString(_ctx.$t("workbench.cornerScape.aiPolish")), 1)
                          ]),
                          _: 1
                        }, 8, ["loading", "disabled"]),
                        createVNode(_component_t_button, {
                          theme: "primary",
                          onClick: regenerateItem,
                          disabled: unref(currentItem).state == "生成中" ? true : false
                        }, {
                          icon: withCtx(() => [
                            createVNode(_component_t_icon, { name: "refresh" })
                          ]),
                          default: withCtx(() => [
                            createTextVNode(" " + toDisplayString(_ctx.$t("workbench.cornerScape.regenerate")), 1)
                          ]),
                          _: 1
                        }, 8, ["disabled"])
                      ])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              })) : createCommentVNode("", true)
            ]),
            _: 1
          }, 8, ["visible"])
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-5a92a282"]]);

export { index as default };

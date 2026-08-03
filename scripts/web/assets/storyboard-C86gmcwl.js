import { _ as __unplugin_components_0 } from './imageTools-fFKvCNZM.js';
import { l as defineComponent, bM as storeToRefs, bU as useModel, bL as useLocalStorage, b2 as resolveComponent, aK as openBlock, aS as createBlock, aM as withCtx, aO as createBaseVNode, b0 as toDisplayString, j as createVNode, a1 as unref, a$ as createTextVNode, aT as createCommentVNode, av as isRef, aL as createElementBlock, F as Fragment, aP as renderList, aU as normalizeClass, bH as withModifiers, aQ as normalizeStyle, bV as mergeModels, r as ref, c as computed, k as reactive, h } from './vue-vendor-Byo5TD6r.js';
import { e as editImage } from './index-BxiEv7d3.js';
import { c as _sfc_main$f, P as Position } from './vueflow-RSWomYB5.js';
import { i as instance } from './axios-DoLZCC01.js';
import { p as projectStore, _ as _export_sfc } from './index-Dj17DntQ.js';
import { b as useProductionAgentStore } from './useAdaptationNav-BJTPyVmA.js';
import { s as stillQualityBadgeLabel } from './stillQuality-WkBJH2Rs.js';
import { A as Alert, B as Button, a4 as Empty, a7 as CheckboxGroup, a3 as Checkbox, X as Tag, a8 as Image, L as Loading, n as Tooltip, ac as InputNumber, G as ImageViewer, W as DialogPlugin, s as LoadingPlugin, Y as Card, T as Textarea } from './tdesign-CfL1pweZ.js';
import './dayjs-CuToSpIM.js';
import './assetsCheck-x0_DEdwf.js';
import './index-DwxuFSda.js';
import './modelSelect-CcPQrTrD.js';
import './providersLogo-BCbaFq8_.js';
import './v5OpsHelpers-D73C6JE9.js';
import './index-CHzgAOy7.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './icons-B-vHNScY.js';

const DIGIT_RE = /^(CHAR|SCENE|PROP|INF|P)[\s\-_]*0*(\d+)$/i;
const SLUG_RE = /^(CHAR|SCENE|PROP)[-_]([A-Za-z][A-Za-z0-9]*)$/i;
const KIND_PAD = { CHAR: 3, SCENE: 3, PROP: 3, INF: 2, P: 3 };
function normalizeAssetCode(raw) {
  const token = raw.trim();
  const dig = token.match(DIGIT_RE);
  if (dig) {
    const kind = dig[1].toUpperCase();
    const n = Number(dig[2]);
    if (!Number.isFinite(n) || n < 0) return null;
    return `${kind}-${String(n).padStart(KIND_PAD[kind] ?? 3, "0")}`;
  }
  const slug = token.match(SLUG_RE);
  if (slug) return `${slug[1].toUpperCase()}-${slug[2].toUpperCase()}`;
  return null;
}
function normalizeAssetCodeLoose(raw) {
  return normalizeAssetCode(raw) ?? raw.replace(/[,，].*$/, "").trim();
}
const CREF_BLOCK_RE = /--cref\s+((?:(?!--sref|--ar)\S+\s*)+)/gi;
const SREF_BLOCK_RE = /--sref\s+((?:(?!--cref|--ar)\S+\s*)+)/gi;
const CREF_RE = /--cref\s+([^\n]+?)(?=\s+--(?:sref|ar)\b|$)/gi;
const SREF_RE = /--sref\s+([^\n]+?)(?=\s+--(?:cref|ar)\b|$)/gi;
const AR_RE = /--ar\s+(\d+\s*:\s*\d+)/i;
function extractCodesFromBlock(block) {
  const found = [];
  const embedded = /(CHAR|SCENE|PROP|INF|P)[\s\-_]*0*\d+|(CHAR|SCENE|PROP)[-_][A-Za-z][A-Za-z0-9]*/gi;
  for (const m of block.matchAll(embedded)) found.push(m[0]);
  for (const tok of block.trim().split(/[\s,，、;/|]+/)) {
    if (tok && !tok.startsWith("--")) found.push(tok);
  }
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const p of found) {
    const n = normalizeAssetCode(p) ?? normalizeAssetCodeLoose(p);
    if (!n || seen.has(n) || n === "CHAR" || n === "SCENE" || n === "PROP") continue;
    if (!n.includes("-")) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}
function parsePromptRefs(prompt) {
  const crefs = [];
  const srefs = [];
  for (const m of prompt.matchAll(CREF_BLOCK_RE)) crefs.push(...extractCodesFromBlock(m[1]));
  if (!crefs.length) {
    for (const m of prompt.matchAll(CREF_RE)) crefs.push(...extractCodesFromBlock(m[1]));
  }
  for (const m of prompt.matchAll(SREF_BLOCK_RE)) srefs.push(...extractCodesFromBlock(m[1]));
  if (!srefs.length) {
    for (const m of prompt.matchAll(SREF_RE)) srefs.push(...extractCodesFromBlock(m[1]));
  }
  const arMatch = prompt.match(AR_RE);
  const aspectRatio = arMatch ? arMatch[1].replace(/\s/g, "") : void 0;
  return { crefs: [...new Set(crefs)], srefs: [...new Set(srefs)], aspectRatio };
}

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
    function isWeakKeepStill(item) {
      return item.stateHint === "weak_keep" || item.stillQuality === "weak" || item.visualPass === false;
    }
    function stillFrameBadge(item) {
      return stillQualityBadgeLabel({
        stillQuality: item.stillQuality,
        visualPass: item.visualPass
      });
    }
    const { project } = storeToRefs(projectStore());
    const prodStore = useProductionAgentStore();
    const { episodesId, flowData } = storeToRefs(prodStore);
    const props = __props;
    const storyboard = useModel(__props, "modelValue");
    const visible = ref(false);
    const previewVisible = ref(false);
    const previewImages = ref([]);
    const gridScale = useLocalStorage("storyboardGridScale", 1);
    const hoveredIndex = ref(null);
    const selectedIds = ref([]);
    const resyncLoading = ref(false);
    const visSyncDebt = computed(() => {
      const fd = flowData.value;
      if (fd?.visSyncDebt) return fd.visSyncDebt;
      if (fd?.visSyncDrift?.drifted) return fd.visSyncDrift;
      return null;
    });
    async function resyncFromTable() {
      if (!project.value?.id || !episodesId.value) return;
      resyncLoading.value = true;
      try {
        const { data } = await instance.post("/production/storyboard/resyncFromTable", {
          projectId: project.value.id,
          scriptId: episodesId.value
        });
        const body = data?.data ?? data;
        window.$message.success(body?.message || "已按分镜表重同步");
        await prodStore.getFlowData();
        if (flowData.value?.storyboard) storyboard.value = flowData.value.storyboard;
      } catch (e) {
        window.$message.error(e?.response?.data?.message || e?.message || "按表重同步失败");
      } finally {
        resyncLoading.value = false;
      }
    }
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
    const composeLoading = ref(false);
    async function batchComposePrompts(opts) {
      if (!selectedIds.value.length) return window.$message.warning("请先选择分镜面板");
      composeLoading.value = true;
      try {
        const { data } = await instance.post("/production/storyboard/batchComposeStillPrompt", {
          projectId: project.value?.id,
          scriptId: episodesId.value,
          storyboardIds: selectedIds.value,
          mode: "full"
        });
        const body = data?.data ?? data;
        const results = body?.results ?? [];
        for (const r of results) {
          if (!r?.ok || !r.prompt) continue;
          const row = storyboard.value.find((s) => s.id === r.storyboardId);
          if (row) row.prompt = r.prompt;
        }
        if (!opts?.silent) {
          window.$message.success(body?.userMessage || `已补全 ${results.filter((r) => r.ok).length} 条提示词`);
        }
      } catch (e) {
        window.$message.error(e?.response?.data?.data?.userMessage || e?.message || "批量补全失败");
        throw e;
      } finally {
        composeLoading.value = false;
      }
    }
    async function batchGenerateImage() {
      if (!selectedIds.value.length) return window.$message.warning("请先选择分镜面板");
      generateLoading.value = true;
      try {
        await useProductionAgentStore().batchGenerateStoryboard(selectedIds.value, true);
        window.$message.success($t("workbench.production.node.storyboard.batchGenerateSuccess"));
        selectedIds.value = [];
      } catch (e) {
        window.$message.error(e?.response?.data?.data?.userMessage || $t("workbench.production.node.storyboard.batchGenerateFailed"));
      } finally {
        generateLoading.value = false;
      }
    }
    function resolveAssetSrc(id) {
      const asset = props.assetsData.find((a) => a.id === id);
      if (asset?.src) return asset.src;
      for (const a of props.assetsData) {
        const derive = a.derive?.find((d) => d.id === id);
        if (derive?.src) return derive.src;
      }
      return void 0;
    }
    function assetMatchesCode(asset, code) {
      const codeTag = `charCode:${code}`;
      const suffix = code.replace(/^CHAR-/, "");
      return asset.remark === codeTag || Boolean(asset.remark?.includes(codeTag)) || asset.name === code || Boolean(asset.name?.includes(suffix)) || Boolean(asset.prompt?.includes(code)) || Boolean(asset.desc?.includes(code));
    }
    function findAssetById(id) {
      const asset = props.assetsData.find((a) => a.id === id);
      if (asset) return asset;
      for (const a of props.assetsData) {
        const derive = a.derive?.find((d) => d.id === id);
        if (derive) return derive;
      }
      return void 0;
    }
    function isCodeLinkedToPanel(code, linkedIds) {
      for (const id of linkedIds) {
        const hit = findAssetById(id);
        if (hit && "derive" in hit && assetMatchesCode(hit, code)) return true;
        if (hit && !("derive" in hit)) {
          const parent = props.assetsData.find((a) => a.derive?.some((d) => d.id === id));
          if (parent && assetMatchesCode(parent, code)) return true;
        }
      }
      return false;
    }
    function resolveAssetByCode(code) {
      const codeTag = `charCode:${code}`;
      const suffix = code.replace(/^CHAR-/, "");
      return props.assetsData.find(
        (a) => a.remark === codeTag || a.remark?.includes(codeTag) || a.name === code || a.name?.includes(suffix) || a.prompt?.includes(code) || a.desc?.includes(code)
      );
    }
    function editStoryboaryImage(item, images, insertAfterIndex = null) {
      currentRowStoryboardInfo.value = {
        id: insertAfterIndex == null ? item?.id : null,
        insertAfterIndex
      };
      currentRow.value = {
        flowId: item?.flowId ?? null,
        resultImages: [],
        referanceImages: [],
        storyboardId: item?.id
      };
      if (currentRowStoryboardInfo.value.id) {
        let imagesPush = [];
        const warnMsgs = [];
        if (item.associateAssetsIds && item.associateAssetsIds.length > 0) {
          for (const id of item.associateAssetsIds) {
            const src = resolveAssetSrc(id) || item.associateAssetSrcs?.[id];
            if (src) imagesPush.push(src);
            else {
              const hit = findAssetById(id);
              warnMsgs.push(`请先生成角色参考图：${hit?.name ?? id}`);
            }
          }
        }
        const refs = parsePromptRefs(item.prompt ?? "");
        const linkedIds = item.associateAssetsIds ?? [];
        for (const code of [...refs.crefs, ...refs.srefs]) {
          if (isCodeLinkedToPanel(code, linkedIds)) continue;
          const asset = resolveAssetByCode(code);
          if (!asset) {
            warnMsgs.push(`未找到 cref ${code}`);
            continue;
          }
          if (asset.src && !imagesPush.includes(asset.src)) imagesPush.push(asset.src);
          else if (!asset.src) warnMsgs.push(`请先生成角色参考图：${asset.name ?? code}`);
        }
        for (const w of item.referenceWarnings ?? []) warnMsgs.push(w.message);
        if (warnMsgs.length) window.$message.warning(warnMsgs.slice(0, 3).join("；"));
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
          state: "已完成",
          // Insert keep has no L1 visualPass — do not present as burnable HQ
          stillQuality: "weak",
          visualPass: false,
          stateHint: "weak_keep",
          ctaLabel: "重新高质量生成"
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
      const res = await instance.post("/production/storyboard/updateStoryboardUrl", {
        id,
        url: imageUrl,
        flowId,
        qualityMode: "hq_update"
      });
      const body = res?.data ?? res;
      if (target && body && typeof body === "object") {
        if (body.stillQuality != null) target.stillQuality = body.stillQuality;
        if (body.visualPass != null) target.visualPass = Boolean(body.visualPass);
        if (body.stateHint != null) target.stateHint = String(body.stateHint);
        if (body.ctaLabel != null) target.ctaLabel = String(body.ctaLabel);
        if (body.userMessage != null) target.userMessage = String(body.userMessage);
        if (body.primaryNextStep != null) target.primaryNextStep = String(body.primaryNextStep);
        if (body.stateHint === "weak_keep" || body.stillQuality === "weak") {
          window.$message?.warning?.(
            String(body.userMessage || body.ctaLabel || "外源/保留图未经验收，未标高质量")
          );
        }
      }
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
        videoDesc: item?.videoDesc ?? "",
        audioPrompt: item?.audioPrompt ?? "",
        fxPrompt: item?.fxPrompt ?? ""
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
        ]),
        h("div", { class: "editInfoField" }, [
          h("label", { class: "editInfoLabel" }, "audioPrompt"),
          h(Textarea, {
            value: formData.audioPrompt,
            placeholder: "AUD",
            autosize: { minRows: 2, maxRows: 4 },
            "onUpdate:value": (v) => formData.audioPrompt = v
          })
        ]),
        h("div", { class: "editInfoField" }, [
          h("label", { class: "editInfoLabel" }, "fxPrompt"),
          h(Textarea, {
            value: formData.fxPrompt,
            placeholder: "FX",
            autosize: { minRows: 2, maxRows: 4 },
            "onUpdate:value": (v) => formData.fxPrompt = v
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
            item.audioPrompt = formData.audioPrompt;
            item.fxPrompt = formData.fxPrompt;
            await useProductionAgentStore().setFlowData();
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
      const _component_t_button = Button;
      const _component_t_alert = Alert;
      const _component_t_empty = Empty;
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_checkbox = Checkbox;
      const _component_t_tag = Tag;
      const _component_ImageTools = __unplugin_components_0;
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
          unref(visSyncDebt) ? (openBlock(), createBlock(_component_t_alert, {
            key: 0,
            theme: "warning",
            style: { "margin": "8px 12px 0" },
            message: unref(visSyncDebt).message || "分镜表与面板数量不一致"
          }, {
            operation: withCtx(() => [
              createVNode(_component_t_button, {
                size: "small",
                theme: "primary",
                loading: unref(resyncLoading),
                onClick: resyncFromTable
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(unref(visSyncDebt).ctaLabel || "按分镜表重同步面板"), 1)
                ]),
                _: 1
              }, 8, ["loading"])
            ]),
            _: 1
          }, 8, ["message"])) : createCommentVNode("", true),
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
                                createTextVNode(" S" + toDisplayString(String(item.displayNo ?? (item.index != null ? item.index + 1 : index + 1)).padStart(2, "0")), 1)
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
                              ]),
                              isWeakKeepStill(item) ? (openBlock(), createBlock(_component_t_tag, {
                                key: 0,
                                size: "small",
                                theme: "warning",
                                variant: "light",
                                class: "frameWeakTag",
                                style: normalizeStyle({ transform: `scale(${unref(styleMaxSize)})` })
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(toDisplayString(stillFrameBadge(item)), 1)
                                ]),
                                _: 2
                              }, 1032, ["style"])) : createCommentVNode("", true)
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
                theme: "default",
                variant: "outline",
                onClick: batchComposePrompts,
                disabled: !storyboard.value.length || !unref(selectedIds).length,
                loading: unref(composeLoading)
              }, {
                default: withCtx(() => [..._cache[9] || (_cache[9] = [
                  createTextVNode(" 批量补全提示词（测试） ", -1)
                ])]),
                _: 1
              }, 8, ["disabled", "loading"]),
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
            key: 1,
            modelValue: unref(visible),
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef(visible) ? visible.value = $event : null),
            flowData: unref(currentRow),
            type: "storyboard",
            onSave: save
          }, null, 8, ["modelValue", "flowData"])) : createCommentVNode("", true),
          unref(previewVisible) ? (openBlock(), createBlock(_component_t_image_viewer, {
            key: 2,
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

const storyboard = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7dbf8462"]]);

export { storyboard as default };

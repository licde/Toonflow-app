import { u as useVueFlow, c as _sfc_main$f, P as Position, d as _sfc_main$d, e as _sfc_main$3$1, g as getBezierPath, a as _sfc_main$6, b as _sfc_main$7, f as _sfc_main$8, _ as _sfc_main$1$1 } from './vueflow-RSWomYB5.js';
import { _ as __unplugin_components_0 } from './imageTools-fFKvCNZM.js';
import { o as openAssetsSelector } from './assetsCheck-x0_DEdwf.js';
import { a8 as Image, w as Dropdown, B as Button, a5 as Popup, n as Tooltip, X as Tag, A as Alert, K as Select, O as Option, E as Dialog, R as Input, I as Icon, Z as Table, G as ImageViewer, W as DialogPlugin } from './tdesign-CfL1pweZ.js';
import { l as defineComponent, a as inject, r as ref, w as watch, e as onBeforeUnmount, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, j as createVNode, a1 as unref, aO as createBaseVNode, aM as withCtx, b0 as toDisplayString, a$ as createTextVNode, aS as createBlock, aT as createCommentVNode, F as Fragment, aP as renderList, c as computed, bM as storeToRefs, bY as useFileDialog, o as onMounted, aU as normalizeClass, E as withDirectives, G as vShow, bH as withModifiers, bU as useModel, av as isRef, bV as mergeModels, aQ as normalizeStyle, n as nextTick, bF as normalizeProps, bG as guardReactiveProps, p as provide } from './vue-vendor-Byo5TD6r.js';
import { _ as _export_sfc, p as projectStore } from './index-Dj17DntQ.js';
import { _ as __unplugin_components_0$1 } from './modelSelect-CcPQrTrD.js';
import { a as shouldOfferHumanRejudge, h as humanRejudgePrimaryCta, r as resolveStillDebtSemantics, b as resolveStillPrimaryCtaLabel, p as promptEditor, s as stillQualityBadgeLabel } from './stillQuality-WkBJH2Rs.js';
import { i as instance } from './axios-DoLZCC01.js';
import { t as toastAfterApplyExitGate } from './v5OpsHelpers-D73C6JE9.js';
import { d as dayjs } from './dayjs-CuToSpIM.js';
import { u as useLayout } from './index-CHzgAOy7.js';

const _hoisted_1$5 = { class: "uploadNode" };
const _hoisted_2$4 = { class: "data" };
const _hoisted_3$3 = { class: "title ac" };
const _hoisted_4$3 = { class: "imageBox" };
const _hoisted_5$3 = { class: "imageToolsWrap" };
const _hoisted_6$3 = { class: "upload ac" };
const _hoisted_7$2 = { style: { "margin-left": "5px", "color": "#fff" } };
const _hoisted_8$2 = {
  class: "fc ac",
  style: { "gap": "6px" }
};
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
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
      const _component_ImageTools = __unplugin_components_0;
      const _component_t_image = Image;
      const _component_i_upload = resolveComponent("i-upload");
      const _component_t_button = Button;
      const _component_t_dropdown = Dropdown;
      const _component_i_save = resolveComponent("i-save");
      const _component_t_popup = Popup;
      const _component_i_delete = resolveComponent("i-delete");
      const _component_t_tooltip = Tooltip;
      return openBlock(), createElementBlock("div", _hoisted_1$5, [
        createVNode(unref(_sfc_main$f), {
          type: "source",
          position: unref(Position).Right,
          style: { "z-index": "999999" }
        }, null, 8, ["position"]),
        createBaseVNode("div", _hoisted_2$4, [
          createBaseVNode("div", _hoisted_3$3, [
            createVNode(_component_i_pic, {
              theme: "outline",
              size: "16",
              fill: "#000000"
            }),
            _cache[0] || (_cache[0] = createBaseVNode("span", { style: { "margin-left": "5px", "color": "#4b4b4b" } }, "Image", -1))
          ]),
          createBaseVNode("div", _hoisted_4$3, [
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
                createBaseVNode("div", _hoisted_5$3, [
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
                createBaseVNode("div", _hoisted_6$3, [
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

const uploadNode = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["__scopeId", "data-v-ed6fb585"]]);

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

function resolveGeneratePrompt(overridePrompt, dataPrompt) {
  if (typeof overridePrompt === "string") return overridePrompt;
  if (typeof dataPrompt === "string") return dataPrompt;
  return "";
}

function flattenMissingSlots(findings) {
  const out = /* @__PURE__ */ new Set();
  for (const f of findings ?? []) {
    if (f.severity !== "BLOCK") continue;
    for (const s of f.missingSlots ?? []) {
      if (s) out.add(String(s));
    }
  }
  return [...out];
}
function isEnhanceAction(action) {
  return action === "confirm_enhance" || action === "apply_auto_enhance";
}
function isSplitAction(action) {
  return action === "confirm_split" || action === "apply_auto";
}
function irdCtaLabel(input) {
  const slots = (input.missingSlots ?? []).filter(Boolean);
  if (slots.includes("propInFrame") || slots.includes("contactGeom")) {
    if (input.primaryAction === "confirm_enhance" || input.primaryAction === "apply_auto_enhance") {
      return `批准增强补${slots.slice(0, 3).join("/")}`;
    }
    if (input.primaryAction === "batch_still_hq" || /重出|静照/.test(String(input.ctaLabel ?? ""))) {
      return "重出带道具静照";
    }
    return `手改VD补${slots.slice(0, 3).join("/")}`;
  }
  if (input.primaryAction === "confirm_enhance") {
    return slots.length ? `批准增强补${slots.slice(0, 3).join("/")}` : "批准增强";
  }
  if (input.primaryAction === "apply_auto_enhance") {
    return slots.length ? `自动增强补${slots.slice(0, 3).join("/")}` : "自动增强";
  }
  if (input.primaryAction === "hand_edit_vd" || slots.length) {
    return slots.length ? `手改VD补${slots.slice(0, 3).join("/")}` : "手改VD";
  }
  if (input.primaryAction === "confirm_split" || input.primaryAction === "apply_auto") {
    return "确认拆镜";
  }
  if (input.primaryAction === "batch_still_hq") {
    const be = String(input.ctaLabel ?? "").trim();
    const blob = `${be} ${input.userMessage ?? ""}`;
    if (input.sheetLeak === true || /sheetLeak|拼版|四视|四宫格|禁拼版/i.test(blob)) {
      return /禁拼版/.test(be) ? be : "禁拼版重抽";
    }
    return "重出HQ静照";
  }
  return "查看诊断";
}
function isLitDebtStillMeta(meta) {
  if (!meta) return false;
  if ((meta.missingSlots?.length ?? 0) > 0) return true;
  if (meta.irdPrimaryAction === "hand_edit_vd" || meta.irdPrimaryAction === "presentation_fork" || isEnhanceAction(meta.irdPrimaryAction) || isSplitAction(meta.irdPrimaryAction)) {
    return true;
  }
  if (meta.primaryNextStep === "chat_repair" && /手改|VD|描写|缺槽|增强|互斥/i.test(String(meta.ctaLabel ?? ""))) {
    return true;
  }
  return false;
}

const _hoisted_1$4 = {
  key: 0,
  class: "lit-debt",
  role: "region",
  "aria-labelledby": "lit-debt-title"
};
const _hoisted_2$3 = {
  id: "lit-debt-title",
  class: "lit-debt__title"
};
const _hoisted_3$2 = { class: "lit-debt__explain" };
const _hoisted_4$2 = {
  key: 0,
  class: "lit-debt__slots",
  "aria-label": "缺结构槽"
};
const _hoisted_5$2 = {
  key: 1,
  class: "lit-debt__codes"
};
const _hoisted_6$2 = {
  class: "lit-debt__actions",
  role: "group",
  "aria-label": "文学细节修复"
};
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "LitDetailDebtBar",
  props: {
    explain: {},
    title: { default: "文学细节未过 · 须补描写" },
    primaryAction: {},
    primaryNextStep: {},
    missingSlots: {},
    findings: {},
    suggestFillEnabled: { type: Boolean, default: true },
    hideEnhance: { type: Boolean, default: false },
    allowWeakRegen: { type: Boolean, default: true },
    stillMeta: {},
    stillQuality: {},
    designDebtBlock: { type: Boolean, default: false },
    ctaLabel: {},
    presentationFork: {}
  },
  emits: ["hand-edit-vd", "suggest-fill", "confirm-enhance", "confirm-split", "batch-still", "human-rejudge", "presentation-fork"],
  setup(__props) {
    const props = __props;
    const sampleMustMiss = computed(() => {
      const m = props.stillMeta;
      if (!m) return false;
      if (m.sampleFulfillment?.mustFulfilled === false || m.sampleMustFulfilled === false) return true;
      if ((m.sampleFulfillment?.mustMissIds?.length ?? 0) > 0) return true;
      if (m.literaryEffectsQualified === false) return true;
      return false;
    });
    const sampleMustOk = computed(() => {
      const m = props.stillMeta;
      if (!m) return false;
      return m.sampleFulfillment?.mustFulfilled === true || m.sampleMustFulfilled === true || m.literaryEffectsQualified === true;
    });
    const realizationDegraded = computed(() => {
      const m = props.stillMeta;
      return m?.realizationDegraded === true || m?.realization?.realizationDegraded === true;
    });
    const shouldMissSurface = computed(() => {
      const m = props.stillMeta;
      const ids = m?.sampleFulfillment?.shouldMissIds ?? m?.shouldMissIds ?? [];
      return ids.filter((id) => /action\.|occupancy\.|glyph/i.test(String(id))).slice(0, 2);
    });
    const resolvedTitle = computed(() => {
      if (sampleMustMiss.value) {
        const ids = props.stillMeta?.sampleFulfillment?.mustMissIds ?? [];
        return ids.length ? `样本未兑现：${ids.slice(0, 3).join("、")}` : "设计意图样本未兑现";
      }
      const shouldTail = shouldMissSurface.value.length ? `；细节待增强：${shouldMissSurface.value.join("、")}` : "";
      if (realizationDegraded.value && sampleMustOk.value) {
        const note = props.stillMeta?.realization?.realizationNote || props.stillMeta?.ctaLabel || "姿态债：弯腰像素未尽·可烧视频（设计意图优先）";
        return `${note}${shouldTail}；主干可烧；像素未测`;
      }
      if (sampleMustOk.value && (props.stillMeta?.keyOptional || props.stillMeta?.pixelDimStatus === "unmeasured")) {
        return `必须元素已兑现${shouldTail}；像素未测；弱图债·可烧视频（设计意图优先）`;
      }
      if (sampleMustOk.value) {
        return props.title && !/须补描写|文学细节未过/.test(props.title) ? props.title : `主效果已齐，细节可增强${shouldTail}`;
      }
      return props.title;
    });
    const slots = computed(() => {
      const fromProp = (props.missingSlots ?? []).filter(Boolean);
      if (fromProp.length) return fromProp;
      return flattenMissingSlots(props.findings);
    });
    const findingIds = computed(
      () => [...new Set((props.findings ?? []).filter((f) => f.severity === "BLOCK").map((f) => f.id))]
    );
    const showHumanRejudge = computed(
      () => !props.designDebtBlock && !sampleMustMiss.value && shouldOfferHumanRejudge(props.stillMeta ?? null)
    );
    const humanRejudgeLabel = computed(() => humanRejudgePrimaryCta(props.stillMeta ?? null));
    const showFork = computed(
      () => !sampleMustMiss.value && (props.primaryAction === "presentation_fork" || (props.presentationFork?.length ?? 0) > 0)
    );
    const forkChoices = computed(() => {
      if (props.presentationFork?.length) return props.presentationFork;
      return [
        { fork: "fork-A", label: "改 W3 △ 叙事描述" },
        { fork: "fork-B", label: "改 SB spatialRelation 镜级" }
      ];
    });
    const show = computed(
      () => sampleMustMiss.value || isLitDebtStillMeta({
        primaryNextStep: props.primaryNextStep,
        irdPrimaryAction: props.primaryAction,
        missingSlots: slots.value,
        ctaLabel: props.ctaLabel
      }) || props.stillQuality === "weak" && slots.value.length > 0 || showHumanRejudge.value || showFork.value
    );
    const showEnhance = computed(
      () => !sampleMustMiss.value && !props.hideEnhance && (isEnhanceAction(props.primaryAction) || slots.value.some((s) => /contact|grip|xor|wound|propReadable|propInFrame|contactGeom/i.test(s)))
    );
    const showSplit = computed(
      () => !sampleMustMiss.value && (isSplitAction(props.primaryAction) || findingIds.value.includes("DEX-LIT-CONTACT-XOR") || slots.value.includes("contactRoleXor"))
    );
    const debtSemantics = computed(() => resolveStillDebtSemantics(props.stillMeta ?? null));
    const showRegenPropStill = computed(
      () => sampleMustMiss.value || slots.value.includes("propInFrame") || slots.value.includes("contactGeom") || slots.value.includes("prop_form") || findingIds.value.includes("DEX-PROP-IN-FRAME") || findingIds.value.includes("STILL-CONTACT-HANDOFF") || findingIds.value.includes("PROP-FORM") || debtSemantics.value.kind === "prop_form" || debtSemantics.value.kind === "prop_plate" || debtSemantics.value.kind === "lit_slot"
    );
    const regenPropLabel = computed(() => {
      if (sampleMustMiss.value) {
        return debtSemantics.value.ctaLabel || props.stillMeta?.literaryCtaLabel || "继续生成智能修";
      }
      if (debtSemantics.value.kind === "prop_form") return "重出形态静照";
      if (debtSemantics.value.kind === "prop_plate") return "挂道具板后再生成";
      return "重出带道具静照";
    });
    const shootableCta = computed(
      () => resolveStillPrimaryCtaLabel({
        ...props.stillMeta ?? {},
        primaryNextStep: props.primaryNextStep ?? props.stillMeta?.primaryNextStep,
        irdPrimaryAction: props.primaryAction ?? props.stillMeta?.irdPrimaryAction,
        stillQuality: props.stillQuality ?? props.stillMeta?.stillQuality,
        ctaLabel: props.ctaLabel ?? props.stillMeta?.ctaLabel
      })
    );
    const splitLabel = computed(
      () => shootableCta.value.kind === "split_and_generate" ? shootableCta.value.label : "智拆并生成"
    );
    const showGenerateContinue = computed(
      () => !showRegenPropStill.value && !sampleMustMiss.value && (shootableCta.value.kind === "continue_repair" || shootableCta.value.kind === "generate" || shootableCta.value.kind === "enhance_and_generate" || shootableCta.value.kind === "enqueue_identity_and_generate" || Boolean(props.stillMeta?.requireFixBeforeBurn))
    );
    const generateContinueLabel = computed(() => {
      if (shootableCta.value.kind === "enqueue_identity_and_generate") return shootableCta.value.label;
      if (shootableCta.value.kind === "enhance_and_generate") return shootableCta.value.label;
      if (shootableCta.value.kind === "continue_repair") return shootableCta.value.label;
      return "继续生成修复";
    });
    const enhanceLabel = computed(() => {
      if (shootableCta.value.kind === "enhance_and_generate") return shootableCta.value.label;
      return irdCtaLabel({
        primaryAction: props.primaryAction === "apply_auto_enhance" ? "apply_auto_enhance" : "confirm_enhance",
        missingSlots: slots.value
      });
    });
    const handEditLabel = computed(
      () => props.ctaLabel && !isEnhanceAction(props.primaryAction) ? props.ctaLabel : irdCtaLabel({ primaryAction: "hand_edit_vd", missingSlots: slots.value })
    );
    const explainText = computed(() => {
      if (props.stillMeta?.closedCompose === false) {
        const reasons = (props.stillMeta.closedAssertReasons ?? []).slice(0, 3).join("、");
        return reasons ? `单镜封闭未达成（${reasons}）；禁止假绿燃片/视频继承。请清异镜参考并按本镜描写重出。` : "单镜封闭未达成；禁止假绿燃片/视频继承。请清异镜参考并按本镜描写重出。";
      }
      if (sampleMustMiss.value) {
        return debtSemantics.value.explain || "设计意图 Must 未逐项兑现；请换板重出，勿以补描写冒充主修。";
      }
      if (props.explain) return props.explain;
      if (sampleMustOk.value && slots.value.length) {
        return "主效果已齐，细节可增强；非主失败。";
      }
      if (showFork.value) {
        return "中置信智能修复：请先选择 fork-A（改叙事）或 fork-B（改镜级构图），禁止空跳手改。";
      }
      if (props.designDebtBlock) {
        return "设计债建议先补齐（propInFrame/contactGeom 等）；仍可试拍生成，烧片前须对齐。人审不能假绿 hq。";
      }
      if (debtSemantics.value.kind === "lit_slot") {
        return debtSemantics.value.explain;
      }
      if (debtSemantics.value.kind === "prop_form" || debtSemantics.value.kind === "prop_plate") {
        return debtSemantics.value.explain;
      }
      if (debtSemantics.value.kind === "key_unmeasured" && showHumanRejudge.value) {
        return debtSemantics.value.explain;
      }
      if (showHumanRejudge.value) {
        return "诊断 Key 可选（不挡质量流）。结构债未清禁升 hq；像素未测≠结构已过。Key 仅作可选像素增强。";
      }
      if (showRegenPropStill.value) {
        return "接触事件须道具入画（propInFrame+contactGeom）；浅痕≠道具。请批准增强补道具句，或重出带道具静照；禁止只改视频词。";
      }
      if (/lit_contact_mouth_ban|mouthBan/i.test(String(props.reverseTrigger ?? props.code ?? "")) || slots.value.some((s) => /mouthBan|禁口含/i.test(s))) {
        return "接触主题胶水：compose 须含「禁口含/禁纸入口/仅落点触」HARD；缺则增强或手改 VD，禁止只 regen。";
      }
      if (slots.value.includes("contactRoleXor") || showSplit.value) {
        return "颊触与口创同镜建议智拆并生成；已可试拍（系统会尽量瘦身颊触）。烧片前须拆齐或增强对齐。";
      }
      if (slots.value.length) {
        return `缺结构槽 ${slots.value.join("/")}。可「应用补全」按反推契约补描写，或手改 visualDescription；补全后可继续生成。`;
      }
      return "文学细节/道具契约未过。请增强或手改 VD；补全后可继续生成（Key 可选不挡生成）。";
    });
    return (_ctx, _cache) => {
      const _component_t_tag = Tag;
      const _component_t_button = Button;
      return show.value ? (openBlock(), createElementBlock("section", _hoisted_1$4, [
        createBaseVNode("h4", _hoisted_2$3, toDisplayString(resolvedTitle.value), 1),
        createBaseVNode("p", _hoisted_3$2, toDisplayString(explainText.value), 1),
        slots.value.length ? (openBlock(), createElementBlock("div", _hoisted_4$2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(slots.value, (s) => {
            return openBlock(), createBlock(_component_t_tag, {
              key: s,
              size: "small",
              theme: "warning",
              variant: "light"
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(s), 1)
              ]),
              _: 2
            }, 1024);
          }), 128))
        ])) : createCommentVNode("", true),
        findingIds.value.length ? (openBlock(), createElementBlock("p", _hoisted_5$2, "codes: " + toDisplayString(findingIds.value.join(" · ")), 1)) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_6$2, [
          showEnhance.value && !__props.hideEnhance && !sampleMustMiss.value ? (openBlock(), createBlock(_component_t_button, {
            key: 0,
            size: "small",
            theme: "primary",
            onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("confirm-enhance"))
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(enhanceLabel.value), 1)
            ]),
            _: 1
          })) : createCommentVNode("", true),
          showSplit.value ? (openBlock(), createBlock(_component_t_button, {
            key: 1,
            size: "small",
            theme: "primary",
            onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("confirm-split"))
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(splitLabel.value), 1)
            ]),
            _: 1
          })) : createCommentVNode("", true),
          showGenerateContinue.value ? (openBlock(), createBlock(_component_t_button, {
            key: 2,
            size: "small",
            theme: "primary",
            variant: "outline",
            onClick: _cache[2] || (_cache[2] = ($event) => _ctx.$emit("batch-still"))
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(generateContinueLabel.value), 1)
            ]),
            _: 1
          })) : createCommentVNode("", true),
          showRegenPropStill.value ? (openBlock(), createBlock(_component_t_button, {
            key: 3,
            size: "small",
            theme: "warning",
            onClick: _cache[3] || (_cache[3] = ($event) => _ctx.$emit("batch-still"))
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(regenPropLabel.value), 1)
            ]),
            _: 1
          })) : createCommentVNode("", true),
          showHumanRejudge.value ? (openBlock(), createBlock(_component_t_button, {
            key: 4,
            size: "small",
            theme: "success",
            variant: "outline",
            onClick: _cache[4] || (_cache[4] = ($event) => _ctx.$emit("human-rejudge"))
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(humanRejudgeLabel.value), 1)
            ]),
            _: 1
          })) : createCommentVNode("", true),
          showFork.value ? (openBlock(true), createElementBlock(Fragment, { key: 5 }, renderList(forkChoices.value, (f) => {
            return openBlock(), createBlock(_component_t_button, {
              key: f.fork,
              size: "small",
              theme: "primary",
              variant: "outline",
              onClick: ($event) => _ctx.$emit("presentation-fork", f.fork)
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(f.label), 1)
              ]),
              _: 2
            }, 1032, ["onClick"]);
          }), 128)) : createCommentVNode("", true),
          !showFork.value && !sampleMustMiss.value ? (openBlock(), createBlock(_component_t_button, {
            key: 6,
            size: "small",
            theme: "primary",
            variant: "outline",
            onClick: _cache[5] || (_cache[5] = ($event) => _ctx.$emit("hand-edit-vd"))
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(handEditLabel.value), 1)
            ]),
            _: 1
          })) : createCommentVNode("", true),
          __props.suggestFillEnabled && !sampleMustMiss.value ? (openBlock(), createBlock(_component_t_button, {
            key: 7,
            size: "small",
            theme: "default",
            variant: "outline",
            onClick: _cache[6] || (_cache[6] = ($event) => _ctx.$emit("suggest-fill"))
          }, {
            default: withCtx(() => [..._cache[8] || (_cache[8] = [
              createTextVNode(" 建议补写（须 Confirm） ", -1)
            ])]),
            _: 1
          })) : createCommentVNode("", true),
          __props.allowWeakRegen && !slots.value.length && !showRegenPropStill.value ? (openBlock(), createBlock(_component_t_button, {
            key: 8,
            size: "small",
            theme: "default",
            variant: "text",
            onClick: _cache[7] || (_cache[7] = ($event) => _ctx.$emit("batch-still"))
          }, {
            default: withCtx(() => [..._cache[9] || (_cache[9] = [
              createTextVNode(" 仅重出静照（不推荐） ", -1)
            ])]),
            _: 1
          })) : createCommentVNode("", true)
        ])
      ])) : createCommentVNode("", true);
    };
  }
});

/* unplugin-vue-components disabled */

const LitDetailDebtBar = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-f8ab2e39"]]);

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
const _hoisted_12$1 = { class: "text w" };
const _hoisted_13 = {
  key: 0,
  class: "feedbackBox w"
};
const _hoisted_14 = {
  key: 0,
  class: "promptSummary"
};
const _hoisted_15 = {
  key: 1,
  class: "feedbackBox w"
};
const _hoisted_16 = { class: "operate ac jb" };
const _hoisted_17 = { class: "ac" };
const _hoisted_18 = {
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
    const previewing = ref(false);
    const stillQuality = ref(null);
    const sheetLeak = ref(false);
    const gateMessage = ref("");
    const litDebtSlots = ref([]);
    const irdPrimaryAction = ref(null);
    const primaryNextStep = ref(null);
    const debtCtaLabel = ref(null);
    const presentationFork = ref(null);
    const stillMetaSnapshot = ref(null);
    const composePreview = ref(null);
    const promptUsedSummary = ref("");
    const lastComposeMode = ref("full");
    const episodesId = inject("episodesId");
    const lastFeedback = ref(null);
    const storyboardId = inject("editStoryboardId", void 0);
    function isTokenOnlyPrompt(p) {
      const t = String(p ?? "").trim();
      if (!t) return true;
      const body = t.replace(/(?:^|\s)--(?:cref|sref)\s+\S+(?:\s+[A-Za-z]+-[A-Za-z0-9]+)*/gi, " ").replace(/(?:^|\s)--ar\s+\S+/gi, " ").replace(/\s+/g, "").trim();
      return body.length < 8;
    }
    function looksDirtyPrompt(p) {
      const t = String(p ?? "");
      if (isTokenOnlyPrompt(t)) return true;
      if (/vertical\s*9:16\s*safe\s*area/i.test(t) && !/[\u4e00-\u9fff]{4,}/.test(t)) return true;
      if ((t.match(/--cref/gi) ?? []).length >= 2) return true;
      if (/\bMS\b/.test(t)) return true;
      return false;
    }
    const emit = __emit;
    const { removeNodes, addNodes, addEdges, getNodes } = useVueFlow("editImage");
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
    function resolveStoryboardId() {
      const sid = typeof storyboardId === "object" && storyboardId && "value" in storyboardId ? storyboardId.value : storyboardId;
      return sid;
    }
    function ingestStillGateBody(body) {
      if (!body) return;
      stillQuality.value = body.stillQuality ?? null;
      sheetLeak.value = Boolean(body.sheetLeak);
      gateMessage.value = String(body.userMessage || (body.stillQuality === "hq_ok" ? "已标记高质量首帧" : ""));
      litDebtSlots.value = Array.isArray(body.missingSlots) ? body.missingSlots.map(String) : [];
      irdPrimaryAction.value = body.irdPrimaryAction ?? null;
      primaryNextStep.value = body.primaryNextStep ?? null;
      debtCtaLabel.value = body.ctaLabel ?? null;
      presentationFork.value = Array.isArray(body.presentationFork) ? body.presentationFork : null;
      const step = String(body.primaryNextStep ?? "");
      const ird = String(body.irdPrimaryAction ?? "");
      stillMetaSnapshot.value = {
        stillQuality: body.stillQuality,
        visualPass: body.visualPass,
        sheetLeak: body.sheetLeak,
        pendingHumanRejudge: body.pendingHumanRejudge,
        primaryNextStep: body.primaryNextStep,
        irdPrimaryAction: body.irdPrimaryAction,
        missingSlots: litDebtSlots.value,
        blockSilentRegen: Boolean(body.blockSilentRegen) && String(body.debtKind ?? "") === "missing_identity",
        refreshStoryboardBeforeRegen: Boolean(body.refreshStoryboardBeforeRegen) || step === "split_shot" || ird === "confirm_split",
        autoRepairStage: body.autoRepairStage,
        autoRepairRound: body.autoRepairRound,
        keepSoftEnvRef: body.keepSoftEnvRef,
        bgMode: body.bgMode,
        vlmError: body.vlmError,
        keyOptional: body.keyOptional,
        pixelDimStatus: body.pixelDimStatus,
        ctaLabel: body.ctaLabel,
        userMessage: body.userMessage,
        i2vReady: body.i2vReady,
        debtKind: body.debtKind,
        deliveryTier: body.deliveryTier,
        requireFixBeforeBurn: body.requireFixBeforeBurn,
        ctaKind: body.ctaKind,
        propPlateGrade: body.propPlateGrade
      };
    }
    async function loadComposePreview(opts) {
      previewing.value = true;
      gateMessage.value = "";
      const mode = opts?.mode ?? (looksDirtyPrompt(props.data.prompt ?? "") ? "full" : "refine");
      lastComposeMode.value = mode;
      try {
        const refs = props.data.references.map((i) => i.image).filter(Boolean);
        const { data } = await instance.post("/production/editImage/composeStillPromptPreview", {
          projectId: props.projectId,
          storyboardId: resolveStoryboardId(),
          prompt: props.data.prompt ?? "",
          qualityMode: "hq_update",
          composeMode: mode,
          persist: Boolean(opts?.persist && resolveStoryboardId()),
          ratio: project.value?.videoRatio ?? props.data.ratio,
          references: refs,
          referenceUrlCount: refs.length
        });
        const body = data?.data ?? data;
        composePreview.value = body;
        if (!body?.ok) {
          gateMessage.value = body?.userMessage || body?.blockReason || "缺少可拍画面锚点";
        } else if (body.didSynthesize || body.scrubbed) {
          const modeLabel = mode === "fidelity" ? "更贴描述" : mode === "refine" ? "保留改写加强" : "按设计全量合成";
          gateMessage.value = `${modeLabel}完成，可生成高质量首帧`;
          if (opts?.autoApply && body.prompt) {
            props.data.prompt = body.prompt;
            promptUsedSummary.value = String(body.prompt).slice(0, 160) + (String(body.prompt).length > 160 ? "…" : "");
          }
        } else {
          gateMessage.value = "提示词可生成高质量首帧";
          if (opts?.autoApply && body.prompt) {
            props.data.prompt = body.prompt;
          }
        }
      } catch (e) {
        gateMessage.value = e?.response?.data?.data?.userMessage || e?.message || "预览失败";
      } finally {
        previewing.value = false;
      }
    }
    function applyComposePreview() {
      if (composePreview.value?.prompt) {
        props.data.prompt = composePreview.value.prompt;
        gateMessage.value = "已填入设计合成稿，点击生成";
      }
    }
    async function handleGenerate(overridePrompt) {
      if (!props.data.model) return window.$message.error($t("workbench.production.editImage.selectModel"));
      if (!props.data.quality) return window.$message.error($t("workbench.production.editImage.selectQuality"));
      props.data.ratio = project.value?.videoRatio ?? props.data.ratio ?? "16:9";
      if (!props.data.ratio) return window.$message.error($t("workbench.production.editImage.selectRatio"));
      let promptText = resolveGeneratePrompt(overridePrompt, props.data.prompt);
      const sid = resolveStoryboardId();
      if (!promptText.trim() && !sid) {
        return window.$message.error($t("workbench.production.editImage.promptPlaceholder"));
      }
      if (sid && (isTokenOnlyPrompt(promptText) || looksDirtyPrompt(promptText))) {
        await loadComposePreview({ autoApply: true, mode: "full", persist: true });
        if (composePreview.value?.ok && composePreview.value.prompt) {
          promptText = composePreview.value.prompt;
        }
      }
      if (String(stillMetaSnapshot.value?.debtKind ?? "") === "missing_identity") {
        window.$message.info(
          gateMessage.value || debtCtaLabel.value || "缺定妆 — 将入队补资产并继续生成（不挡试拍）"
        );
      }
      generating.value = true;
      lastFeedback.value = null;
      gateMessage.value = "";
      promptUsedSummary.value = "";
      try {
        const rawRefs = props.data.references.map((i) => i.image).filter(Boolean);
        const nodesNow = getNodes.value || [];
        const roleByImg = /* @__PURE__ */ new Map();
        for (const n of nodesNow) {
          if (n.type !== "upload") continue;
          const d = n.data;
          if (d?.image) roleByImg.set(d.image, d.role || "");
        }
        const score = (url) => {
          const role = roleByImg.get(url) || "";
          if (role === "propSoft") return 1;
          if (/休书|prop|软板|paper/i.test(url)) return 1;
          return 0;
        };
        const refs = [...rawRefs].sort((a, b) => score(a) - score(b));
        if (refs.length >= 2 && score(refs[0]) === 1 && score(refs[1]) === 0) {
          const [p, ...rest] = refs;
          refs.splice(0, refs.length, rest[0], p, ...rest.slice(1));
        }
        const imageMode = refs.length <= 0 ? "text" : refs.length === 1 ? "singleImage" : "multiReference";
        const { data } = await instance.post("/production/editImage/generateFlowImage", {
          references: refs,
          model: props.data.model,
          quality: props.data.quality,
          ratio: project.value?.videoRatio ?? props.data.ratio,
          prompt: promptText,
          projectId: props.projectId,
          storyboardId: sid,
          mode: imageMode,
          requireParentRef: imageMode === "singleImage" && !sid,
          qualityMode: "hq_update",
          persistToStoryboard: Boolean(sid),
          composeMode: lastComposeMode.value
        });
        const body = data?.data ?? data;
        props.data.generatedImage = body.url ?? body;
        if (body.prompt) {
          props.data.prompt = body.prompt;
        }
        const egressEcho = body.promptUsed ?? body.egressPrompt;
        if (egressEcho) {
          promptUsedSummary.value = (body.didSynthesize ? "【已智能合成】" : "") + String(egressEcho).slice(0, 180) + (String(egressEcho).length > 180 ? "…" : "");
        }
        ingestStillGateBody(body);
        if (body.feedback) lastFeedback.value = body.feedback;
        const propUrl = body.propSoftPreviewUrl;
        const oralOrOpen = body.closedCompose === false || body.framingMode === "lips_ecu" || /咬唇|渗血|唇部特写|lip_bite/.test(String(body.prompt ?? props.data.prompt ?? ""));
        if (propUrl && !oralOrOpen) {
          const refsNow = props.data.references ?? [];
          if (!refsNow.some((r) => r.image === propUrl)) {
            props.data.references = [...refsNow, { image: propUrl }];
          }
          try {
            const existing = getNodes.value || [];
            const already = existing.some((n) => n.type === "upload" && n.data?.image === propUrl);
            if (!already) {
              const newId = crypto.randomUUID?.() ?? `prop-${Date.now()}`;
              const uploads = existing.filter((n) => n.type === "upload");
              const lastY = uploads.length ? Math.max(...uploads.map((n) => n.position?.y ?? 100)) + 350 : 100;
              addNodes([
                {
                  id: newId,
                  type: "upload",
                  position: { x: 100, y: lastY },
                  data: { image: propUrl, role: "propSoft" }
                }
              ]);
              if (props.id) {
                addEdges([{ id: `${newId}->${props.id}`, source: newId, target: props.id }]);
              }
              window.$message?.info?.("已挂道具软板到画布；请再点生成，才会写入成图像素");
            }
          } catch {
          }
        }
      } catch (e) {
        const payload = e?.response?.data?.data ?? e?.data ?? {};
        const fb = payload.feedback;
        if (fb?.suggestedPrompt) lastFeedback.value = fb;
        const code = payload.code ? `[${payload.code}] ` : "";
        const cta = payload.ctaLabel ? ` → ${payload.ctaLabel}` : "";
        gateMessage.value = code + (payload.userMessage || e?.message || $t("workbench.production.editImage.generateFailed")) + cta;
        ingestStillGateBody(payload);
        return window.$message.error(gateMessage.value);
      } finally {
        generating.value = false;
      }
    }
    function focusPromptForHandEdit() {
      window.$message.info(debtCtaLabel.value || "请在上方描写区手改画面落点后重生成");
      selected.value = true;
    }
    async function applyLitEnhance() {
      const pid = project.value?.id;
      if (pid == null) {
        window.$message?.warning?.("缺少项目 ID，请先手改描写");
        return focusPromptForHandEdit();
      }
      try {
        const data = await instance.post("/scriptAgent/stillIntentOps", {
          projectId: pid,
          action: "applyEnhance",
          forceApply: true,
          intentVisualEnhance: true,
          literaryDetailLlmFill: true,
          scriptId: episodesId.value,
          shotIndex: typeof props.data?.shotIndex === "number" ? props.data.shotIndex : void 0
        });
        const body = data?.data ?? data;
        if (body?.ok) {
          toastAfterApplyExitGate(body, body.a11yAnnounce || "已应用文学增强；请重出静照");
          selected.value = true;
        } else {
          window.$message?.warning?.(
            (body?.refused || []).join("; ") || body?.a11yAnnounce || "增强未全部通过，请手改 VD"
          );
          focusPromptForHandEdit();
        }
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.message || e?.message || "applyEnhance 失败");
        focusPromptForHandEdit();
      }
    }
    async function applyLitSplit() {
      const pid = project.value?.id;
      if (pid == null) {
        window.$message?.warning?.("缺少项目 ID");
        return;
      }
      try {
        const data = await instance.post("/scriptAgent/stillIntentOps", {
          projectId: pid,
          action: "apply",
          forceApply: true,
          scriptId: episodesId.value
        });
        const body = data?.data ?? data;
        toastAfterApplyExitGate(body, body?.a11yAnnounce || "拆镜补丁已应用");
        if (body?.designExitPass === false || body?.exitGate?.ok === false) {
          primaryNextStep.value = "split_shot";
        }
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.message || e?.message || "stillIntentOps apply 失败");
      }
    }
    async function onPresentationFork(fork) {
      if (fork === "fork-A") {
        focusPromptForHandEdit();
        return;
      }
      await applyLitSplit();
    }
    async function applyHumanRejudge() {
      const sid = resolveStoryboardId();
      if (!sid) {
        window.$message?.warning?.("须绑定分镜后再人审");
        return;
      }
      try {
        const data = await instance.post("/production/storyboard/humanRejudgeFidelity", {
          storyboardId: sid,
          modality: "still",
          description: props.data.prompt,
          items: [{ id: "human_delivery", pass: true, evidence: "operator_rejudge" }]
        });
        const body = data?.data ?? data;
        if (body?.burnReady === false || body?.designDebtBlock) {
          window.$message?.warning?.(
            body?.userMessage || "设计债未清，人审不可标可燃片；请先 IRD/手改"
          );
          ingestStillGateBody(body);
          return;
        }
        window.$message?.success?.(body?.userMessage || "人审通过（未测·非失败）");
        ingestStillGateBody({ ...body, stillQuality: body?.stillQuality ?? "hq_ok", pendingHumanRejudge: false });
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.message || e?.message || "人审失败");
      }
    }
    async function retryWithSuggestion() {
      if (!lastFeedback.value?.suggestedPrompt) return;
      props.data.prompt = lastFeedback.value.suggestedPrompt;
      await handleGenerate(lastFeedback.value.suggestedPrompt);
    }
    function handleKeep() {
      if (!props.data.generatedImage) return window.$message.error($t("workbench.production.editImage.generateFirst"));
      emit("keep", props.data.generatedImage);
    }
    onMounted(() => {
      props.data.model = project.value?.imageModel ?? "";
      props.data.quality = project.value?.imageQuality ?? "";
      props.data.ratio = project.value?.videoRatio ?? "16:9";
      const sid = resolveStoryboardId();
      if (sid) {
        const mode = looksDirtyPrompt(props.data.prompt ?? "") ? "full" : "refine";
        void loadComposePreview({ autoApply: true, mode, persist: true });
      }
    });
    return (_ctx, _cache) => {
      const _component_i_pic = resolveComponent("i-pic");
      const _component_ImageTools = __unplugin_components_0;
      const _component_t_image = Image;
      const _component_i_upload = resolveComponent("i-upload");
      const _component_t_dropdown = Dropdown;
      const _component_i_delete = resolveComponent("i-delete");
      const _component_t_tooltip = Tooltip;
      const _component_t_alert = Alert;
      const _component_t_button = Button;
      const _component_t_option = Option;
      const _component_t_select = Select;
      const _component_t_tag = Tag;
      const _component_t_popup = Popup;
      const _component_i_arrow_up = resolveComponent("i-arrow-up");
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
              _cache[11] || (_cache[11] = createBaseVNode("div", { class: "loadingSpinner" }, null, -1)),
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
          onWheel: _cache[9] || (_cache[9] = withModifiers(() => {
          }, ["stop"])),
          onMousedown: _cache[10] || (_cache[10] = withModifiers(() => {
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
          createBaseVNode("div", _hoisted_12$1, [
            createVNode(promptEditor, {
              modelValue: __props.data.prompt,
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => __props.data.prompt = $event),
              references: unref(references),
              placeholder: _ctx.$t("workbench.production.editImage.promptPlaceholder")
            }, null, 8, ["modelValue", "references", "placeholder"])
          ]),
          unref(gateMessage) || unref(promptUsedSummary) || unref(litDebtSlots).length ? (openBlock(), createElementBlock("div", _hoisted_13, [
            createVNode(_component_t_alert, {
              theme: unref(stillQuality) === "hq_ok" ? "success" : "warning",
              message: unref(gateMessage) || "合成提示词已更新"
            }, null, 8, ["theme", "message"]),
            unref(promptUsedSummary) ? (openBlock(), createElementBlock("p", _hoisted_14, toDisplayString(unref(promptUsedSummary)), 1)) : createCommentVNode("", true),
            unref(stillQuality) === "weak" || unref(sheetLeak) || unref(litDebtSlots).length ? (openBlock(), createBlock(LitDetailDebtBar, {
              key: 1,
              "still-quality": unref(stillQuality),
              "still-meta": unref(stillMetaSnapshot),
              "missing-slots": unref(litDebtSlots),
              "primary-action": unref(irdPrimaryAction) || void 0,
              "primary-next-step": unref(primaryNextStep) || void 0,
              "cta-label": unref(debtCtaLabel) || void 0,
              explain: unref(gateMessage) || void 0,
              "presentation-fork": unref(presentationFork),
              "design-debt-block": unref(litDebtSlots).length > 0 && unref(stillMetaSnapshot)?.pendingHumanRejudge !== true,
              "suggest-fill-enabled": true,
              onHandEditVd: focusPromptForHandEdit,
              onConfirmEnhance: applyLitEnhance,
              onSuggestFill: applyLitEnhance,
              onConfirmSplit: applyLitSplit,
              onPresentationFork,
              onHumanRejudge: applyHumanRejudge,
              onBatchStill: handleGenerate
            }, null, 8, ["still-quality", "still-meta", "missing-slots", "primary-action", "primary-next-step", "cta-label", "explain", "presentation-fork", "design-debt-block"])) : createCommentVNode("", true),
            unref(composePreview)?.ok && unref(composePreview).prompt && unref(composePreview).prompt !== __props.data.prompt ? (openBlock(), createBlock(_component_t_button, {
              key: 2,
              size: "small",
              theme: "primary",
              variant: "outline",
              loading: unref(previewing),
              onClick: applyComposePreview
            }, {
              default: withCtx(() => [..._cache[12] || (_cache[12] = [
                createTextVNode(" 应用补全 ", -1)
              ])]),
              _: 1
            }, 8, ["loading"])) : createCommentVNode("", true),
            createVNode(_component_t_button, {
              size: "small",
              theme: "default",
              variant: "outline",
              loading: unref(previewing),
              onClick: _cache[2] || (_cache[2] = () => loadComposePreview({ mode: "fidelity", autoApply: true }))
            }, {
              default: withCtx(() => [..._cache[13] || (_cache[13] = [
                createTextVNode(" 更贴描述（测试） ", -1)
              ])]),
              _: 1
            }, 8, ["loading"]),
            unref(lastFeedback)?.suggestedPrompt ? (openBlock(), createBlock(_component_t_button, {
              key: 3,
              size: "small",
              theme: "primary",
              variant: "outline",
              loading: unref(generating),
              onClick: retryWithSuggestion
            }, {
              default: withCtx(() => [..._cache[14] || (_cache[14] = [
                createTextVNode(" 重试建议提示词 ", -1)
              ])]),
              _: 1
            }, 8, ["loading"])) : createCommentVNode("", true)
          ])) : unref(lastFeedback)?.suggestedPrompt ? (openBlock(), createElementBlock("div", _hoisted_15, [
            createVNode(_component_t_alert, {
              theme: "warning",
              message: unref(lastFeedback).suggestedPrompt
            }, null, 8, ["message"]),
            createVNode(_component_t_button, {
              size: "small",
              theme: "primary",
              variant: "outline",
              loading: unref(generating),
              onClick: retryWithSuggestion
            }, {
              default: withCtx(() => [..._cache[15] || (_cache[15] = [
                createTextVNode("重试建议提示词", -1)
              ])]),
              _: 1
            }, 8, ["loading"])
          ])) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_16, [
            createBaseVNode("div", _hoisted_17, [
              createVNode(__unplugin_components_0$1, {
                modelValue: __props.data.model,
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => __props.data.model = $event),
                type: "image",
                size: "small"
              }, null, 8, ["modelValue"]),
              createVNode(_component_t_select, {
                modelValue: __props.data.ratio,
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => __props.data.ratio = $event),
                class: "paramSelect ml-5",
                size: "small",
                disabled: "",
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
                "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => __props.data.quality = $event),
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
              }, 8, ["modelValue", "placeholder"]),
              unref(stillQuality) ? (openBlock(), createBlock(_component_t_tag, {
                key: 0,
                size: "small",
                class: "ml-5",
                theme: unref(stillQuality) === "hq_ok" ? "success" : "warning",
                variant: "light"
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(unref(stillQuality)), 1)
                ]),
                _: 1
              }, 8, ["theme"])) : createCommentVNode("", true)
            ]),
            createBaseVNode("div", _hoisted_18, [
              createVNode(_component_t_popup, { content: "测试：再点补全=refine" }, {
                default: withCtx(() => [
                  createVNode(_component_t_button, {
                    theme: "default",
                    size: "small",
                    variant: "outline",
                    loading: unref(previewing),
                    onClick: _cache[6] || (_cache[6] = () => loadComposePreview({ mode: "refine", autoApply: true, persist: true }))
                  }, {
                    default: withCtx(() => [..._cache[16] || (_cache[16] = [
                      createTextVNode("补全(测)", -1)
                    ])]),
                    _: 1
                  }, 8, ["loading"])
                ]),
                _: 1
              }),
              createVNode(_component_t_popup, { content: "测试：更贴描述=fidelity" }, {
                default: withCtx(() => [
                  createVNode(_component_t_button, {
                    theme: "default",
                    size: "small",
                    variant: "outline",
                    loading: unref(previewing),
                    onClick: _cache[7] || (_cache[7] = () => loadComposePreview({ mode: "fidelity", autoApply: true, persist: true }))
                  }, {
                    default: withCtx(() => [..._cache[17] || (_cache[17] = [
                      createTextVNode("贴描述(测)", -1)
                    ])]),
                    _: 1
                  }, 8, ["loading"])
                ]),
                _: 1
              }),
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
                    onClick: _cache[8] || (_cache[8] = () => handleGenerate())
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

const generatedNode = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-1b8f56ba"]]);

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
const _hoisted_12 = { key: 1 };
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
    function isWeakStillRow(row) {
      return row.stateHint === "weak_keep" || row.stillQuality === "weak" || row.visualPass === false;
    }
    function stillRowBadge(row) {
      return stillQualityBadgeLabel({
        stillQuality: row.stillQuality,
        visualPass: row.visualPass,
        sheetLeak: row.sheetLeak
      });
    }
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
        colKey: "quality",
        title: "质量",
        width: 120,
        align: "center",
        cell: "quality"
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
      const weak = rows.filter((r) => isWeakStillRow(r));
      if (weak.length) {
        window.$message?.warning?.(
          `已选 ${weak.length} 张弱图/未验收静照（不可作视频首帧 HQ），请知悉`
        );
      }
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
      const _component_t_tag = Tag;
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
                              isWeakStillRow(row) ? (openBlock(), createBlock(_component_t_tag, {
                                key: 0,
                                size: "small",
                                theme: "warning",
                                variant: "light",
                                class: "weakStillTag"
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(toDisplayString(stillRowBadge(row)), 1)
                                ]),
                                _: 2
                              }, 1024)) : createCommentVNode("", true),
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
                    quality: withCtx(({ row }) => [
                      row.stillQuality || row.stateHint ? (openBlock(), createBlock(_component_t_tag, {
                        key: 0,
                        size: "small",
                        theme: isWeakStillRow(row) ? "warning" : "success",
                        variant: "light"
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(stillRowBadge(row)), 1)
                        ]),
                        _: 2
                      }, 1032, ["theme"])) : (openBlock(), createElementBlock("span", _hoisted_12, "—"))
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

const storyboardImageCheck = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-2ca6f7d3"]]);

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
    const editStoryboardId = computed(() => props.flowData.storyboardId);
    provide("editStoryboardId", editStoryboardId);
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
        const litPrompt = props.flowData.resultImages?.[0]?.prompt;
        if (litPrompt) {
          for (const n of nodes.value) {
            if (n.type === "generated" && n.data) {
              n.data.prompt = litPrompt;
            }
          }
        }
        const needed = (props.flowData.referanceImages ?? []).filter(Boolean);
        const allowedRef = new Set(needed);
        nodes.value = nodes.value.filter((n) => {
          if (n.type !== "upload") return true;
          const d = n.data;
          if (d?.role === "propSoft") {
            return Boolean(d.image && allowedRef.has(d.image));
          }
          return true;
        });
        const keptIds = new Set(nodes.value.map((n) => n.id));
        edges.value = edges.value.filter((e) => keptIds.has(e.source) && keptIds.has(e.target));
        const existingImgs = new Set(
          nodes.value.filter((n) => n.type === "upload").map((n) => n.data?.image).filter(Boolean)
        );
        const genIds = nodes.value.filter((n) => n.type === "generated").map((n) => n.id);
        for (const img of needed) {
          if (existingImgs.has(img)) continue;
          const sid = addUploadNode("upload", img);
          for (const gid of genIds) {
            edges.value.push({
              id: v4(),
              source: sid,
              target: gid,
              ...DEFAULT_EDGE_OPTIONS
            });
          }
        }
        await nextTick();
        syncReferences();
        setTimeout(() => fitView({ duration: 300 }), 100);
      } catch (e) {
        window.$message.error(e.message || $t("workbench.production.editImage.fetchFailed"));
      }
    });
    function buildFlow() {
      const uploadIds = [];
      const generatedIds = [];
      const refs = props.flowData.referanceImages?.length ? props.flowData.referanceImages : [""];
      refs.forEach((i) => {
        uploadIds.push(addUploadNode("upload", i || ""));
      });
      props.flowData.resultImages.forEach((i) => {
        generatedIds.push(addUploadNode("generated", i.src, i.prompt));
      });
      if (!generatedIds.length) {
        generatedIds.push(addUploadNode("generated", "", props.flowData.resultImages[0]?.prompt ?? ""));
      }
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
              createVNode(unref(_sfc_main$6)),
              createVNode(unref(_sfc_main$7)),
              createVNode(unref(_sfc_main$8), { position: "top-left" }, {
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

const editImage = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2386a623"]]);

export { editImage as e };

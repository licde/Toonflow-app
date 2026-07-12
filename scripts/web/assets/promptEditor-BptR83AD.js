import { l as defineComponent, bU as useModel, o as onMounted, w as watch, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, bH as withModifiers, a1 as unref, aS as createBlock, T as Teleport, aQ as normalizeStyle, F as Fragment, aP as renderList, aU as normalizeClass, b0 as toDisplayString, aT as createCommentVNode, bV as mergeModels, r as ref, n as nextTick, h, q as render } from './vue-vendor-Byo5TD6r.js';
import { a8 as Image, a5 as Popup } from './tdesign-CfL1pweZ.js';
import { ax as Video, ay as VolumeMute } from './icons-B-vHNScY.js';
import { _ as _export_sfc } from './index-DkAIKrBP.js';

const _hoisted_1 = { class: "textareaWrapper" };
const _hoisted_2 = ["data-placeholder"];
const _hoisted_3 = { class: "referencesList" };
const _hoisted_4 = ["onMousedown"];
const _hoisted_5 = {
  key: 3,
  class: "ref-popup-text"
};
const _hoisted_6 = { class: "reference-label" };
const _hoisted_7 = { class: "ref-index-badge" };
const _hoisted_8 = {
  key: 0,
  class: "no-references"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "promptEditor",
  props: /* @__PURE__ */ mergeModels({
    references: {},
    placeholder: {}
  }, {
    "modelValue": { default: "" },
    "modelModifiers": {}
  }),
  emits: ["update:modelValue"],
  setup(__props) {
    const props = __props;
    const prompt = useModel(__props, "modelValue");
    const editorRef = ref(null);
    const showReferences = ref(false);
    const activeIndex = ref(0);
    const popupPosition = ref({ left: 0, top: 0 });
    const editorContent = ref("");
    let savedRange = null;
    let internalUpdate = false;
    const TYPE_PREFIX = {
      image: "图片",
      video: "视频",
      audio: "音频",
      text: "文本"
    };
    function getTypeIndex(targetIndex) {
      const refs = props.references ?? [];
      const targetType = refs[targetIndex]?.type;
      let count = 0;
      for (let i = 0; i <= targetIndex; i++) {
        if (refs[i]?.type === targetType) count++;
      }
      return count;
    }
    function getRefLabel(index) {
      const ref2 = props.references?.[index];
      if (!ref2) return "";
      const typeIndex = getTypeIndex(index);
      switch (ref2.type) {
        case "image":
          return $t("workbench.production.editImage.imageRef", { index: typeIndex });
        case "video":
          return $t("workbench.production.editImage.videoRef", { index: typeIndex });
        case "audio":
          return $t("workbench.production.editImage.audioRef", { index: typeIndex });
        default:
          return $t("workbench.production.editImage.textRef", { index: typeIndex });
      }
    }
    function findRefIndexByTypeAndOrder(typePrefix, order) {
      const refs = props.references ?? [];
      const normalizedPrefix = typePrefix === "图" ? "图片" : typePrefix;
      let count = 0;
      for (let i = 0; i < refs.length; i++) {
        if (TYPE_PREFIX[refs[i].type] === normalizedPrefix) {
          count++;
          if (count === order) return i;
        }
      }
      return -1;
    }
    function createRefTag(index) {
      const ref2 = props.references?.[index];
      const refType = ref2?.type ?? "image";
      const refSrc = ref2?.src ?? "";
      getTypeIndex(index);
      const container = document.createElement("span");
      container.contentEditable = "false";
      container.dataset.refIndex = String(index);
      container.dataset.imgSrc = refSrc;
      const popupContent = () => {
        if (refType === "image") {
          return h("img", {
            src: refSrc,
            style: { width: "200px", borderRadius: "8px", display: "block" },
            alt: ""
          });
        }
        if (refType === "text") {
          return h("span", { style: { padding: "8px", display: "block", fontSize: "14px" } }, "文本参考");
        }
        return h("span", { style: { padding: "8px", display: "block" } }, refSrc);
      };
      const tagContent = () => {
        if (refType === "image") return h("img", { src: refSrc, alt: "" });
        if (refType === "video") return h(Video);
        if (refType === "audio") return h(VolumeMute);
        return h("span", { class: "tag-text-icon" }, "文");
      };
      const labelText = getRefLabel(index);
      const vnode = h(
        Popup,
        { content: popupContent, placement: "top" },
        {
          default: () => [h("div", { class: "tag" }, [tagContent(), h("span", null, labelText)])]
        }
      );
      render(vnode, container);
      return container;
    }
    function renderPromptToEditor(text) {
      if (!editorRef.value) return;
      editorRef.value.innerHTML = "";
      const regex = /@(图|图片|视频|音频|文本)(\d+)|\n/g;
      let lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          editorRef.value.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        }
        if (match[0] === "\n") {
          editorRef.value.appendChild(document.createElement("br"));
        } else {
          const typePrefix = match[1];
          const order = Number(match[2]);
          const globalIndex = findRefIndexByTypeAndOrder(typePrefix, order);
          if (globalIndex !== -1) {
            editorRef.value.appendChild(createRefTag(globalIndex));
            editorRef.value.appendChild(document.createTextNode("​"));
            editorRef.value.appendChild(document.createTextNode(" "));
          } else {
            editorRef.value.appendChild(document.createTextNode(match[0]));
          }
        }
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < text.length) {
        editorRef.value.appendChild(document.createTextNode(text.substring(lastIndex)));
      }
      editorContent.value = editorRef.value.textContent || "";
    }
    onMounted(() => {
      if (editorRef.value && prompt.value) {
        renderPromptToEditor(prompt.value);
      }
    });
    let pendingRender = false;
    function scheduleRender() {
      if (pendingRender) return;
      pendingRender = true;
      nextTick(() => {
        pendingRender = false;
        if (!editorRef.value || prompt.value === void 0) return;
        renderPromptToEditor(prompt.value);
      });
    }
    watch(
      () => props.references,
      () => {
        if (editorRef.value && prompt.value) {
          scheduleRender();
        }
      }
    );
    watch(prompt, (newVal) => {
      if (internalUpdate) {
        internalUpdate = false;
        return;
      }
      if (!editorRef.value) return;
      const currentText = editorRef.value.textContent?.replace(/\u200B/g, "") || "";
      if (newVal !== void 0 && newVal !== currentText) {
        scheduleRender();
      }
    });
    function getTextBeforeCursor() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return "";
      const range = sel.getRangeAt(0);
      const node = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent?.substring(0, range.startOffset) ?? "";
      }
      return "";
    }
    function getCursorPopupPosition() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return { left: 0, top: 24 };
      const range = sel.getRangeAt(0).cloneRange();
      range.collapse(true);
      const rect = range.getBoundingClientRect();
      return { left: Math.max(0, rect.left), top: rect.bottom + 4 };
    }
    function handleInput() {
      editorContent.value = editorRef.value?.textContent || "";
      syncPrompt();
      const text = getTextBeforeCursor();
      const lastAt = text.lastIndexOf("@");
      if (lastAt !== -1 && !text.substring(lastAt + 1).includes(" ")) {
        showReferences.value = true;
        activeIndex.value = 0;
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          savedRange = sel.getRangeAt(0).cloneRange();
        }
        nextTick(() => {
          popupPosition.value = getCursorPopupPosition();
        });
        return;
      }
      showReferences.value = false;
      savedRange = null;
    }
    function handleKeydown(e) {
      if (showReferences.value && props.references?.length) {
        const maxIndex = props.references.length - 1;
        switch (e.key) {
          case "ArrowDown":
            e.preventDefault();
            activeIndex.value = Math.min(activeIndex.value + 1, maxIndex);
            return;
          case "ArrowUp":
            e.preventDefault();
            activeIndex.value = Math.max(activeIndex.value - 1, 0);
            return;
          case "Enter":
          case "Tab":
            e.preventDefault();
            selectReference(activeIndex.value);
            return;
          case "Escape":
            showReferences.value = false;
            return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const br = document.createElement("br");
        range.insertNode(br);
        if (!br.nextSibling || br.nextSibling.nodeType === Node.TEXT_NODE && br.nextSibling.textContent === "") {
          br.after(document.createElement("br"));
        }
        const newRange = document.createRange();
        newRange.setStartAfter(br);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        editorContent.value = editorRef.value?.textContent || "";
        syncPrompt();
      }
    }
    function selectReference(index) {
      if (!editorRef.value || !savedRange) return;
      const sel = window.getSelection();
      if (!sel) return;
      const range = savedRange.cloneRange();
      const textNode = range.startContainer;
      const cursorOffset = range.startOffset;
      const fullText = textNode.textContent || "";
      const lastAt = fullText.lastIndexOf("@", cursorOffset - 1);
      if (lastAt === -1) return;
      const container = createRefTag(index);
      const afterNode = textNode.splitText(lastAt);
      afterNode.deleteData(0, cursorOffset - lastAt);
      textNode.parentNode.insertBefore(container, afterNode);
      const space = document.createTextNode("​");
      container.after(space);
      const normalSpace = document.createTextNode(" ");
      space.after(normalSpace);
      const newRange = document.createRange();
      newRange.setStartAfter(normalSpace);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      showReferences.value = false;
      savedRange = null;
      editorContent.value = editorRef.value?.textContent || "";
      syncPrompt();
    }
    function extractContent(parent) {
      let result = "";
      parent.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          result += (node.textContent || "").replace(/\u200B/g, "");
        } else if (node.nodeName === "BR") {
          result += "\n";
        } else if (node.dataset?.refIndex !== void 0) {
          const globalIndex = Number(node.dataset.refIndex);
          const typePrefix = TYPE_PREFIX[props.references?.[globalIndex]?.type ?? "image"];
          const typeIndex = getTypeIndex(globalIndex);
          result += ` @${typePrefix}${typeIndex} `;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const inner = extractContent(node);
          if (result.length > 0 && !result.endsWith("\n")) result += "\n";
          result += inner;
        }
      });
      return result;
    }
    function syncPrompt() {
      if (!editorRef.value) return;
      let result = extractContent(editorRef.value);
      result = result.replace(/\n$/, "");
      internalUpdate = true;
      prompt.value = result;
    }
    function handleBlur() {
      setTimeout(() => {
        showReferences.value = false;
      }, 150);
    }
    function handlePaste(e) {
      e.preventDefault();
      const text = e.clipboardData?.getData("text/plain") ?? "";
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      editorContent.value = editorRef.value?.textContent || "";
      syncPrompt();
    }
    return (_ctx, _cache) => {
      const _component_t_image = Image;
      const _component_i_video = resolveComponent("i-video");
      const _component_i_volume_mute = resolveComponent("i-volume-mute");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", {
          ref_key: "editorRef",
          ref: editorRef,
          class: "promptEditor",
          contenteditable: "true",
          "data-placeholder": unref(editorContent).length === 0 ? props.placeholder : "",
          onInput: handleInput,
          onKeydown: handleKeydown,
          onPaste: handlePaste,
          onBlur: handleBlur,
          onMousedown: _cache[0] || (_cache[0] = withModifiers(() => {
          }, ["stop"]))
        }, null, 40, _hoisted_2),
        (openBlock(), createBlock(Teleport, { to: "body" }, [
          unref(showReferences) ? (openBlock(), createElementBlock("div", {
            key: 0,
            class: "referencesPopup",
            style: normalizeStyle({ left: unref(popupPosition).left + "px", top: unref(popupPosition).top + "px", position: "fixed" })
          }, [
            createBaseVNode("div", _hoisted_3, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(__props.references, (item, index) => {
                return openBlock(), createElementBlock("div", {
                  key: index,
                  class: normalizeClass(["reference-item", { active: unref(activeIndex) === index }]),
                  onMousedown: withModifiers(($event) => selectReference(index), ["prevent"])
                }, [
                  item.type === "image" ? (openBlock(), createBlock(_component_t_image, {
                    key: 0,
                    src: item.src,
                    fit: "cover",
                    class: "ref-popup-img"
                  }, null, 8, ["src"])) : item.type === "video" ? (openBlock(), createBlock(_component_i_video, {
                    key: 1,
                    class: "ref-popup-icon"
                  })) : item.type === "audio" ? (openBlock(), createBlock(_component_i_volume_mute, {
                    key: 2,
                    class: "ref-popup-icon"
                  })) : (openBlock(), createElementBlock("span", _hoisted_5, "文")),
                  createBaseVNode("span", _hoisted_6, toDisplayString(getRefLabel(index)), 1),
                  createBaseVNode("span", _hoisted_7, "#" + toDisplayString(getTypeIndex(index)), 1)
                ], 42, _hoisted_4);
              }), 128)),
              !__props.references?.length ? (openBlock(), createElementBlock("div", _hoisted_8, toDisplayString(_ctx.$t("workbench.production.editImage.noReferences")), 1)) : createCommentVNode("", true)
            ])
          ], 4)) : createCommentVNode("", true)
        ]))
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const promptEditor = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1d38f22c"]]);

export { promptEditor as p };

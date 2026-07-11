import { l as defineComponent, bM as storeToRefs, a as inject, bU as useModel, w as watch, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, j as createVNode, aM as withCtx, aO as createBaseVNode, av as isRef, a1 as unref, a$ as createTextVNode, b0 as toDisplayString, aT as createCommentVNode, F as Fragment, aP as renderList, aU as normalizeClass, bH as withModifiers, aS as createBlock, bV as mergeModels, r as ref, c as computed, o as onMounted, b as onUnmounted } from './vue-vendor-Byo5TD6r.js';
import { i as instance } from './axios-PPMfXuH1.js';
import { p as projectStore } from './project-Cze3Ugcr.js';
import { i as imageListCacheStore } from './imageListCache-DK3t0fNV.js';
import { J as JSZip } from './mammoth-qyhJBxxk.js';
import { s as settingStore, _ as _export_sfc } from './index-BPofKOpG.js';
import { Y as Card, a3 as Checkbox, B as Button, X as Tag, a8 as Image, W as DialogPlugin, E as Dialog, n as Tooltip, K as Select, O as Option, a5 as Popup, L as Loading, A as Alert } from './tdesign-CfL1pweZ.js';
import { _ as __unplugin_components_0 } from './imageTools-Dd_65tJR.js';
import { o as openAssetsSelector } from './assetsCheck-CZspxCvw.js';
import { _ as __unplugin_components_0$1 } from './modelSelect-CB7Kqm3T.js';
import { p as promptEditor } from './promptEditor-DBUtByIs.js';
import { a as useProductionAgentStore } from './productionAgent-SRl0F_yl.js';
import { p as preflightTouch } from './ruleEngine-Bdk-sjmG.js';
import './dayjs-CuToSpIM.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './index-Cyl7bZ6U.js';
import './providersLogo-BCbaFq8_.js';
import './icons-COBOzgyl.js';

const _hoisted_1$4 = { class: "videoTrack" };
const _hoisted_2$4 = { class: "trackMenu f ac jb" };
const _hoisted_3$4 = { class: "left f ac" };
const _hoisted_4$4 = {
  key: 0,
  class: "selectedCount"
};
const _hoisted_5$4 = { class: "right f ac" };
const _hoisted_6$4 = { class: "itemBox" };
const _hoisted_7$4 = ["onClick"];
const _hoisted_8$4 = {
  key: 1,
  class: "thumbGroup"
};
const _hoisted_9$4 = ["src"];
const _hoisted_10$3 = {
  key: 1,
  class: "thumb placeholder c"
};
const _hoisted_11$3 = {
  key: 2,
  class: "thumbGroup"
};
const _hoisted_12$3 = {
  key: 1,
  class: "thumb placeholder c"
};
const _hoisted_13$3 = {
  key: 3,
  class: "emptyTrack"
};
const _hoisted_14$2 = ["onClick"];
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "track",
  props: /* @__PURE__ */ mergeModels({
    modelParmas: {},
    imageList: {},
    clampDuration: { type: Function }
  }, {
    "activeTrackIndex": {
      default: 0
    },
    "activeTrackIndexModifiers": {},
    "modelValue": {
      default: () => []
    },
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["getData", "change", "saveImageList"], ["update:activeTrackIndex", "update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const { otherSetting } = storeToRefs(settingStore());
    const { project } = storeToRefs(projectStore());
    const { removeCache } = imageListCacheStore();
    const episodesId = inject("episodesId");
    const props = __props;
    const activeTrackIndex = useModel(__props, "activeTrackIndex");
    const checkedTrackIds = ref([]);
    const trackList = useModel(__props, "modelValue");
    const emit = __emit;
    const checkAll = ref(false);
    const videoCoverMap = ref({});
    function getSelectedVideoSrc(track) {
      if (!track.selectVideoId) return null;
      const video = track.videoList?.find((v) => v.id === track.selectVideoId);
      return video?.src || null;
    }
    function captureVideoCover(src) {
      if (!src || videoCoverMap.value[src]) return;
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.muted = true;
      video.src = src;
      video.addEventListener(
        "seeked",
        () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 160;
            canvas.height = video.videoHeight || 90;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              videoCoverMap.value[src] = canvas.toDataURL("image/jpeg", 0.7);
            }
          } catch {
          }
          video.src = "";
        },
        { once: true }
      );
      video.addEventListener(
        "loadeddata",
        () => {
          video.currentTime = 0;
        },
        { once: true }
      );
      video.addEventListener(
        "error",
        () => {
          video.src = "";
        },
        { once: true }
      );
      video.load();
    }
    function changeIndex(index) {
      if (activeTrackIndex.value == index) return;
      const prevIndex = activeTrackIndex.value;
      activeTrackIndex.value = index;
      emit("change", prevIndex);
    }
    async function deleteTrack(index) {
      const track = trackList.value[index];
      if (!track) return;
      await instance.post("/production/workbench/deleteTrack", { id: track.id });
      checkedTrackIds.value = checkedTrackIds.value.filter((id) => id !== track.id);
      const pid = project.value?.id;
      const sid = episodesId.value;
      if (pid != null && sid != null && track.id != null) {
        removeCache(pid, sid, track.id);
      }
      if (activeTrackIndex.value >= trackList.value.length) {
        activeTrackIndex.value = trackList.value.length - 1;
      }
    }
    function confirmDeleteTrack(index) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.generate.del"),
        body: $t("workbench.generate.delConfirm"),
        confirmBtn: $t("settings.generate.delConfirmBtn"),
        cancelBtn: $t("settings.memory.msg.cancel"),
        onConfirm: async () => {
          try {
            await deleteTrack(index);
            window.$message.success($t("workbench.generate.delSuccess"));
            emit("getData");
          } catch (e) {
            window.$message.error(e.message ?? $t("workbench.cornerScape.cancelGeneration") + "失败");
          } finally {
            dialog.destroy();
          }
        }
      });
    }
    async function addTrack() {
      const { data: modelData } = await instance.post("/modelSelect/getModelDetail", { modelId: props.modelParmas.model });
      const drMap = modelData.durationResolutionMap;
      if (!Array.isArray(drMap) || drMap.length === 0 || !drMap[0].duration?.length) return;
      const duration = drMap[0].duration[0];
      const { data } = await instance.post("/production/workbench/addTrack", {
        projectId: project.value?.id,
        scriptId: episodesId.value ?? 0,
        duration
      });
      emit("getData");
      activeTrackIndex.value = trackList.value.length - 1;
    }
    function getFileExtension(url) {
      const ext = url.split(".").pop()?.split(/[#?]/)[0];
      return ext || "mp4";
    }
    async function batchDownloadVideo() {
      const zip = new JSZip();
      const selectedTracks = trackList.value.filter((track) => checkedTrackIds.value.includes(track.id));
      const tasks = selectedTracks.map((track) => {
        const video = track.videoList.find((v) => v.id === track.selectVideoId);
        if (!video?.src) return null;
        const filename = `分镜${track.id}.${getFileExtension(video.src)}`;
        return fetch(video.src).then((res) => res.blob()).then((blob) => zip.file(filename, blob)).catch((err) => console.error(`视频下载失败: ${video.src}`, err));
      }).filter(Boolean);
      await Promise.all(tasks);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `视频批量下载_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      checkedTrackIds.value = [];
      checkAll.value = false;
    }
    const generateTextLoad = ref(false);
    function batchGenText() {
      generateTextLoad.value = true;
      const trackData = [];
      trackList.value.forEach((track, index) => {
        if (!checkedTrackIds.value.includes(track.id)) return;
        const trackId = track.id;
        let info = [];
        if (props.modelParmas.mode == "text") {
          info = track?.medias.map(({ id, sources }) => ({ id, sources }));
        } else {
          info = getTrackUploadInfo(track);
        }
        trackData.push({
          trackId,
          info: info.filter((i) => typeof i.id === "number" && !isNaN(i.id))
        });
        track.state = "生成中";
      });
      instance.post("/production/workbench/batchGeneratePrompt", {
        projectId: project.value?.id,
        trackData,
        model: props.modelParmas.model,
        mode: props.modelParmas.mode,
        concurrentCount: otherSetting.value.assetsBatchGenereateSize
      }).then(({ data }) => {
        window.$message.success("开始生成提示词");
        generateTextLoad.value = false;
        checkedTrackIds.value = [];
        checkAll.value = false;
      }).catch((e) => {
        window.$message.error(e?.message ?? "生成提示词失败");
        trackList.value.forEach((i) => {
          i.state = "生成失败";
        });
      }).finally(() => {
      });
    }
    function getTrackUploadInfo(track, filterEmpty = false) {
      const activeTrackId = trackList.value[activeTrackIndex.value]?.id;
      if (track.id === activeTrackId) {
        const items = props.imageList;
        return (filterEmpty ? items.filter((item) => Boolean(item.src)) : items).map(({ id, sources }) => ({
          id,
          sources: sources ?? "storyboard"
        }));
      }
      return track.medias.filter((m) => !filterEmpty || Boolean(m.src)).map(({ id, sources }) => ({ id, sources: sources ?? "storyboard" }));
    }
    const generateVideoLoad = ref(false);
    function batchGenVideo() {
      const dlg = DialogPlugin.confirm({
        header: $t("workbench.generate.generateConfirm"),
        body: $t("workbench.generate.generateVideosInBatches"),
        onConfirm: async () => {
          dlg.destroy();
          const checkedTrackData = trackList.value.filter((track) => checkedTrackIds.value.includes(track.id));
          const notHasPrompt = checkedTrackData.filter((i) => !i.prompt);
          if (notHasPrompt.length) return window.$message.warning($t("workbench.generate.skipDataWithEmptyVideoPromptWords"));
          const trackData = checkedTrackData.map((track) => {
            const trackId = track.id;
            const uploadData = props.modelParmas.mode === "text" ? [] : getTrackUploadInfo(track, true);
            return {
              duration: props.clampDuration(track.duration || props.modelParmas.duration),
              prompt: track.prompt,
              uploadData,
              trackId
            };
          });
          const requestData = {
            projectId: project.value?.id,
            scriptId: episodesId.value,
            model: props.modelParmas.model,
            mode: props.modelParmas.mode,
            resolution: props.modelParmas.resolution,
            audio: Boolean(props.modelParmas.audio),
            trackData
          };
          try {
            const { data } = await instance.post("/production/workbench/batchGenerateVideo", requestData);
            const videoRecordId = {};
            data.forEach((item) => {
              videoRecordId[item.trackId] = item.videoId;
            });
            checkedTrackData.forEach((i) => {
              if (videoRecordId[i.id])
                i.videoList.push({
                  id: videoRecordId[i.id],
                  state: "生成中",
                  src: ""
                });
            });
            checkedTrackIds.value = [];
            window.$message.success($t("workbench.generate.generateStarted"));
          } catch (e) {
            window.$message.error(e?.message ?? $t("workbench.generate.generateError"));
          } finally {
            generateVideoLoad.value = false;
          }
        },
        onCancel: () => dlg.destroy()
      });
    }
    function handleCheckAll(val) {
      const allIds = trackList.value.map((t) => t.id).filter((id) => id != null);
      checkedTrackIds.value = val ? allIds : [];
    }
    function toggleCheck(trackId, val) {
      if (trackId == null) return;
      if (val) {
        if (!checkedTrackIds.value.includes(trackId)) checkedTrackIds.value.push(trackId);
      } else {
        checkedTrackIds.value = checkedTrackIds.value.filter((id) => id !== trackId);
      }
      const allIds = trackList.value.map((t) => t.id).filter((id) => id != null);
      checkAll.value = allIds.length > 0 && allIds.every((id) => checkedTrackIds.value.includes(id));
    }
    watch(
      () => trackList.value.map((t) => ({ selectVideoId: t.selectVideoId, videoList: t.videoList })),
      () => {
        trackList.value.forEach((track) => {
          const src = getSelectedVideoSrc(track);
          if (src) captureVideoCover(src);
        });
      },
      { deep: true, immediate: true }
    );
    return (_ctx, _cache) => {
      const _component_t_checkbox = Checkbox;
      const _component_t_button = Button;
      const _component_t_tag = Tag;
      const _component_i_video = resolveComponent("i-video");
      const _component_t_image = Image;
      const _component_i_volume_notice = resolveComponent("i-volume-notice");
      const _component_i_close = resolveComponent("i-close");
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_card = Card;
      return openBlock(), createElementBlock("div", _hoisted_1$4, [
        createVNode(_component_t_card, {
          bordered: "",
          style: { height: "100%" }
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2$4, [
              createBaseVNode("div", _hoisted_3$4, [
                createVNode(_component_t_checkbox, {
                  modelValue: unref(checkAll),
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(checkAll) ? checkAll.value = $event : null),
                  onChange: handleCheckAll
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.generate.selectAll")), 1)
                  ]),
                  _: 1
                }, 8, ["modelValue"]),
                unref(checkedTrackIds).length ? (openBlock(), createElementBlock("span", _hoisted_4$4, toDisplayString(_ctx.$t("workbench.generate.selected")) + " " + toDisplayString(unref(checkedTrackIds).length) + " 段", 1)) : createCommentVNode("", true)
              ]),
              createBaseVNode("div", _hoisted_5$4, [
                createVNode(_component_t_button, {
                  size: "small",
                  variant: "outline",
                  onClick: batchDownloadVideo
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.generate.batchDownloadVideo")), 1)
                  ]),
                  _: 1
                }),
                createVNode(_component_t_button, {
                  size: "small",
                  variant: "outline",
                  onClick: batchGenText,
                  loading: unref(generateTextLoad)
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.generate.batchGenerateText")), 1)
                  ]),
                  _: 1
                }, 8, ["loading"]),
                createVNode(_component_t_button, {
                  size: "small",
                  variant: "outline",
                  onClick: batchGenVideo,
                  loading: unref(generateVideoLoad)
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.generate.batchGenerateVideo")), 1)
                  ]),
                  _: 1
                }, 8, ["loading"])
              ])
            ]),
            createBaseVNode("div", _hoisted_6$4, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(trackList.value, (track, index) => {
                return openBlock(), createElementBlock("div", {
                  class: normalizeClass(["item", { active: index === activeTrackIndex.value }]),
                  key: track.id,
                  onClick: ($event) => changeIndex(index)
                }, [
                  createVNode(_component_t_checkbox, {
                    class: "trackCheck",
                    checked: track.id != null && unref(checkedTrackIds).includes(track.id),
                    onClick: _cache[1] || (_cache[1] = withModifiers(() => {
                    }, ["stop"])),
                    onChange: (val) => toggleCheck(track.id, val)
                  }, null, 8, ["checked", "onChange"]),
                  createVNode(_component_t_tag, {
                    class: "indexTag",
                    size: "small"
                  }, {
                    default: withCtx(() => [
                      createTextVNode("#" + toDisplayString(index + 1), 1)
                    ]),
                    _: 2
                  }, 1024),
                  track.selectVideoId ? (openBlock(), createBlock(_component_t_tag, {
                    key: 0,
                    class: "selectTag",
                    theme: "success",
                    size: "small"
                  }, {
                    default: withCtx(() => [..._cache[2] || (_cache[2] = [
                      createTextVNode("已选择", -1)
                    ])]),
                    _: 1
                  })) : createCommentVNode("", true),
                  track.selectVideoId && getSelectedVideoSrc(track) ? (openBlock(), createElementBlock("div", _hoisted_8$4, [
                    unref(videoCoverMap)[getSelectedVideoSrc(track)] ? (openBlock(), createElementBlock("img", {
                      key: 0,
                      class: "thumb selectedVideoThumb",
                      src: unref(videoCoverMap)[getSelectedVideoSrc(track)],
                      draggable: "false"
                    }, null, 8, _hoisted_9$4)) : (openBlock(), createElementBlock("div", _hoisted_10$3, [
                      createVNode(_component_i_video, { size: "24" })
                    ]))
                  ])) : track.medias.some((m) => m.src) ? (openBlock(), createElementBlock("div", _hoisted_11$3, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(track.medias, (m, i) => {
                      return openBlock(), createElementBlock(Fragment, { key: i }, [
                        m.src ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                          m.fileType === "image" ? (openBlock(), createBlock(_component_t_image, {
                            key: 0,
                            fit: "cover",
                            src: m.src,
                            class: "thumb"
                          }, null, 8, ["src"])) : (openBlock(), createElementBlock("div", _hoisted_12$3, [
                            m.fileType === "audio" ? (openBlock(), createBlock(_component_i_volume_notice, {
                              key: 0,
                              size: "20"
                            })) : (openBlock(), createBlock(_component_i_video, {
                              key: 1,
                              size: "24"
                            }))
                          ]))
                        ], 64)) : createCommentVNode("", true)
                      ], 64);
                    }), 128))
                  ])) : (openBlock(), createElementBlock("span", _hoisted_13$3, toDisplayString(_ctx.$t("workbench.generate.emptyTrack", { index: index + 1 })), 1)),
                  createBaseVNode("div", {
                    class: "deleteBtn",
                    onClick: withModifiers(($event) => confirmDeleteTrack(index), ["stop"])
                  }, [
                    createVNode(_component_i_close, { size: "14" })
                  ], 8, _hoisted_14$2)
                ], 10, _hoisted_7$4);
              }), 128)),
              createBaseVNode("div", {
                class: "item addItem c",
                onClick: addTrack
              }, [
                createVNode(_component_i_plus, { size: "36" })
              ])
            ])
          ]),
          _: 1
        })
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const newTrack = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-aa31b655"]]);

const _hoisted_1$3 = { class: "imageUploadBox ac" };
const _hoisted_2$3 = { class: "imageToolsWrap" };
const _hoisted_3$3 = { class: "mediaPreview audioPreview" };
const _hoisted_4$3 = {
  key: 2,
  class: "mediaPreview videoPreview"
};
const _hoisted_5$3 = ["src"];
const _hoisted_6$3 = {
  key: 2,
  class: "imageTitleWrap"
};
const _hoisted_7$3 = ["onClick"];
const _hoisted_8$3 = { class: "source" };
const _hoisted_9$3 = ["onClick"];
const _hoisted_10$2 = {
  key: 0,
  style: { "flex": "1", "width": "100%" },
  class: "ac"
};
const _hoisted_11$2 = { class: "imageToolsWrap" };
const _hoisted_12$2 = {
  key: 1,
  class: "mediaPreview audioPreview"
};
const _hoisted_13$2 = {
  key: 2,
  class: "mediaPreview videoPreview"
};
const _hoisted_14$1 = ["src"];
const _hoisted_15$1 = {
  key: 2,
  class: "imageTitleWrap"
};
const _hoisted_16 = ["onClick"];
const _hoisted_17 = { class: "source" };
const _hoisted_18 = { class: "storyboardGrid" };
const _hoisted_19 = ["onClick"];
const _hoisted_20 = {
  key: 0,
  class: "imageTitleWrap"
};
const _hoisted_21 = ["src"];
const _hoisted_22 = {
  key: 2,
  class: "textBox ac jc"
};
const _hoisted_23 = { style: { "font-size": "20px" } };
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "imageSelect",
  props: /* @__PURE__ */ mergeModels({
    mode: {},
    storyboardList: {}
  }, {
    "modelValue": {
      default: () => []
    },
    "modelModifiers": {}
  }),
  emits: ["update:modelValue"],
  setup(__props) {
    const props = __props;
    const imageList = useModel(__props, "modelValue");
    const storyboardDialogVisible = ref(false);
    const EMPTY_SLOT = { fileType: "image", id: null, src: "" };
    function isEmptySlot(item) {
      return !item || !item.id;
    }
    const buildLabel = computed(() => {
      const startOptional = props.mode === "startFrameOptional";
      const endOptional = props.mode === "endFrameOptional";
      return [
        { label: startOptional ? "首帧(可选)" : "首帧", value: "start" },
        { label: endOptional ? "尾帧(可选)" : "尾帧", value: "end" }
      ];
    });
    function ensureFrameSlots() {
      const list = [...imageList.value];
      while (list.length < 2) list.push({ ...EMPTY_SLOT });
      return list;
    }
    function setFrameSlot(slot, item) {
      const list = ensureFrameSlots();
      list[slot === "start" ? 0 : 1] = item;
      imageList.value = list;
    }
    function parseMode(value) {
      if (!value) return null;
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value;
      }
      return value;
    }
    const isShowAddImage = computed(() => {
      const mode = props.mode;
      if (mode == "singleImage" && imageList.value.length >= 1) {
        return false;
      }
      if (mode == "endFrameOptional" || mode == "startEndRequired" || mode == "startFrameOptional") {
        return false;
      }
      if (mode == "text") return false;
      return true;
    });
    function getFileTypeByExt(src) {
      const ext = src?.split(".").pop()?.toLowerCase() ?? "";
      if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
      if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
      return "image";
    }
    const mixedClipMediaTypes = computed(() => {
      const mode = props.mode;
      if (!Array.isArray(mode)) return [];
      const map = { audioReference: "audio", imageReference: "image", videoReference: "video" };
      return mode.filter((m) => m in map).map((m) => map[m]);
    });
    let currentSlot = "";
    function handleMixedAdd(slot = "") {
      if (!props.mode) return window.$message.error($t("workbench.generate.notSelectMode"));
      currentSlot = slot;
      const multiple = Array.isArray(parseMode(props.mode));
      const dlg = DialogPlugin.confirm({
        header: $t("workbench.generate.selectSource"),
        confirmBtn: $t("workbench.generate.confirm"),
        cancelBtn: $t("workbench.generate.cancel"),
        onConfirm: async () => {
          dlg.destroy();
          const assets = await openAssetsSelector({ types: ["role", "tool", "scene", "clip", "audio"], clipMediaTypes: mixedClipMediaTypes.value, multiple });
          if (!assets.length) return;
          const newItems = assets.flatMap((asset) => {
            if (asset.type === "audio" && asset?.sonAssets?.length) {
              return asset.sonAssets.map((sub) => {
                const fileType2 = getFileTypeByExt(sub.src);
                return {
                  fileType: fileType2,
                  sources: "assets",
                  src: sub.src,
                  id: sub.id,
                  prompt: sub.prompt
                };
              });
            }
            const fileType = getFileTypeByExt(asset.src);
            return [
              {
                fileType,
                sources: "assets",
                src: asset.src,
                id: asset.id,
                prompt: asset.prompt
              }
            ];
          });
          if (slot === "start" || slot === "end") {
            setFrameSlot(slot, newItems[0]);
          } else if (props.mode === "singleImage") {
            imageList.value = [newItems[0]];
          } else {
            const assetsNotAudioIds = newItems.filter((i) => i.fileType !== "audio");
            const { data } = await instance.post("/production/workbench/getAudioBindAssetsList", {
              assetsIds: assetsNotAudioIds.map((i) => i.id)
            });
            imageList.value = [...imageList.value, ...newItems, ...data ?? []];
          }
        },
        onCancel: () => {
          dlg.destroy();
          storyboardDialogVisible.value = true;
        }
      });
    }
    function clearImage(index) {
      const list = ensureFrameSlots();
      list[index] = { ...EMPTY_SLOT };
      imageList.value = list;
    }
    function pickStoryboard(sb) {
      storyboardDialogVisible.value = false;
      const fileType = "image";
      const newItem = {
        fileType,
        sources: "storyboard",
        src: sb.src,
        id: sb.id,
        prompt: sb.videoDesc ?? void 0,
        index: sb.index
      };
      if (currentSlot === "start" || currentSlot === "end") {
        setFrameSlot(currentSlot, newItem);
      } else {
        imageList.value = [...imageList.value, newItem];
      }
    }
    function splitImage(index) {
      const list = [...imageList.value];
      list.splice(index, 1);
      imageList.value = list;
    }
    return (_ctx, _cache) => {
      const _component_ImageTools = __unplugin_components_0;
      const _component_t_image = Image;
      const _component_i_acoustic = resolveComponent("i-acoustic");
      const _component_t_tooltip = Tooltip;
      const _component_i_close = resolveComponent("i-close");
      const _component_t_tag = Tag;
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1$3, [
        __props.mode == "singleImage" || Array.isArray(parseMode(__props.mode)) ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(__props.mode == "singleImage" ? imageList.value.slice(0, 1) : imageList.value, (item, index) => {
          return openBlock(), createElementBlock("div", {
            class: "uploadBtn c fc",
            key: index
          }, [
            item.src ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              item.fileType == "image" ? (openBlock(), createBlock(_component_t_image, {
                key: 0,
                src: item.src,
                fit: "contain",
                class: "uploadPreview"
              }, {
                overlayContent: withCtx(() => [
                  createBaseVNode("div", _hoisted_2$3, [
                    createVNode(_component_ImageTools, {
                      src: item.src,
                      position: "br"
                    }, null, 8, ["src"])
                  ])
                ]),
                _: 2
              }, 1032, ["src"])) : item.fileType == "audio" ? (openBlock(), createBlock(_component_t_tooltip, {
                key: 1,
                theme: "primary",
                content: item?.prompt || ""
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", _hoisted_3$3, [
                    createVNode(_component_i_acoustic, { size: "20" }),
                    _cache[2] || (_cache[2] = createBaseVNode("span", { class: "mediaLabel" }, "音频", -1))
                  ])
                ]),
                _: 1
              }, 8, ["content"])) : item.fileType == "video" ? (openBlock(), createElementBlock("div", _hoisted_4$3, [
                createBaseVNode("video", {
                  class: "uploadPreview",
                  src: item.src,
                  preload: "metadata",
                  muted: ""
                }, null, 8, _hoisted_5$3)
              ])) : createCommentVNode("", true)
            ], 64)) : (openBlock(), createBlock(_component_t_tooltip, {
              key: 1,
              theme: "primary",
              content: item?.prompt ? "音频内容：" + item.prompt : ""
            }, {
              default: withCtx(() => [..._cache[3] || (_cache[3] = [
                createBaseVNode("span", { style: { "font-size": "20px" } }, "文", -1)
              ])]),
              _: 1
            }, 8, ["content"])),
            item.sources == "storyboard" && item.index != null ? (openBlock(), createElementBlock("div", _hoisted_6$3, toDisplayString(`P${item.index + 1}`), 1)) : createCommentVNode("", true),
            createBaseVNode("div", {
              class: "clearBtn",
              onClick: ($event) => splitImage(index)
            }, [
              createVNode(_component_i_close, { size: "12" })
            ], 8, _hoisted_7$3),
            createBaseVNode("div", _hoisted_8$3, [
              createVNode(_component_t_tag, { size: "small" }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(item.sources == "storyboard" ? _ctx.$t("workbench.generate.storyboard") : _ctx.$t("workbench.generate.assets")), 1)
                ]),
                _: 2
              }, 1024)
            ])
          ]);
        }), 128)) : __props.mode == "endFrameOptional" || __props.mode == "startFrameOptional" || __props.mode == "startEndRequired" ? (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(unref(buildLabel), (item, index) => {
          return openBlock(), createElementBlock("div", {
            class: "uploadBtn c fc",
            key: item.value,
            onClick: ($event) => handleMixedAdd(item.value)
          }, [
            !isEmptySlot(imageList.value?.[index]) ? (openBlock(), createElementBlock("div", _hoisted_10$2, [
              imageList.value?.[index]?.src ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                imageList.value?.[index]?.fileType == "image" ? (openBlock(), createBlock(_component_t_image, {
                  key: 0,
                  src: imageList.value?.[index].src,
                  fit: "contain",
                  class: "uploadPreview"
                }, {
                  overlayContent: withCtx(() => [
                    createBaseVNode("div", _hoisted_11$2, [
                      createVNode(_component_ImageTools, {
                        src: imageList.value?.[index].src,
                        position: "br"
                      }, null, 8, ["src"])
                    ])
                  ]),
                  _: 2
                }, 1032, ["src"])) : imageList.value?.[index]?.fileType == "audio" ? (openBlock(), createElementBlock("div", _hoisted_12$2, [
                  createVNode(_component_i_acoustic, { size: "20" }),
                  _cache[4] || (_cache[4] = createBaseVNode("span", { class: "mediaLabel" }, "音频", -1))
                ])) : imageList.value?.[index]?.fileType == "video" ? (openBlock(), createElementBlock("div", _hoisted_13$2, [
                  createBaseVNode("video", {
                    class: "uploadPreview",
                    src: imageList.value?.[index].src,
                    preload: "metadata",
                    muted: ""
                  }, null, 8, _hoisted_14$1)
                ])) : createCommentVNode("", true)
              ], 64)) : (openBlock(), createBlock(_component_t_tooltip, {
                key: 1,
                theme: "primary",
                content: imageList.value?.[index]?.prompt || ""
              }, {
                default: withCtx(() => [..._cache[5] || (_cache[5] = [
                  createBaseVNode("span", { style: { "font-size": "20px" } }, "文", -1)
                ])]),
                _: 1
              }, 8, ["content"])),
              imageList.value?.[index]?.sources == "storyboard" && imageList.value?.[index]?.index != null ? (openBlock(), createElementBlock("div", _hoisted_15$1, toDisplayString(`P${imageList.value[index]?.index + 1}`), 1)) : createCommentVNode("", true),
              createBaseVNode("div", {
                class: "clearBtn",
                onClick: withModifiers(($event) => clearImage(index), ["stop"])
              }, [
                createVNode(_component_i_close, { size: "12" })
              ], 8, _hoisted_16),
              createBaseVNode("div", _hoisted_17, [
                createVNode(_component_t_tag, { size: "small" }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(imageList.value?.[index]?.sources == "storyboard" ? _ctx.$t("workbench.generate.storyboard") : _ctx.$t("workbench.generate.assets")), 1)
                  ]),
                  _: 2
                }, 1024)
              ])
            ])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
              createVNode(_component_i_plus, { size: "24" }),
              createTextVNode(" " + toDisplayString(item.label), 1)
            ], 64))
          ], 8, _hoisted_9$3);
        }), 128)) : createCommentVNode("", true),
        unref(isShowAddImage) ? (openBlock(), createElementBlock("div", {
          key: 2,
          class: "uploadBtn c fc",
          onClick: _cache[0] || (_cache[0] = ($event) => handleMixedAdd())
        }, [
          createVNode(_component_i_plus, { size: "24" }),
          createTextVNode(" " + toDisplayString(_ctx.$t("workbench.generate.addReference")), 1)
        ])) : createCommentVNode("", true),
        createVNode(_component_t_dialog, {
          visible: storyboardDialogVisible.value,
          "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => storyboardDialogVisible.value = $event),
          header: _ctx.$t("workbench.generate.selectStoryboard"),
          footer: false,
          width: "800px",
          placement: "center"
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_18, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(__props.storyboardList, (sb) => {
                return openBlock(), createElementBlock("div", {
                  class: "storyboardItem",
                  key: sb.id,
                  onClick: ($event) => pickStoryboard(sb)
                }, [
                  sb?.index != null ? (openBlock(), createElementBlock("div", _hoisted_20, toDisplayString(`P${sb?.index + 1}`), 1)) : createCommentVNode("", true),
                  sb.src ? (openBlock(), createElementBlock("img", {
                    key: 1,
                    src: sb.src
                  }, null, 8, _hoisted_21)) : (openBlock(), createElementBlock("div", _hoisted_22, [
                    createVNode(_component_t_tooltip, {
                      theme: "primary",
                      content: sb?.videoDesc || ""
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("span", _hoisted_23, toDisplayString(`分镜 ${sb?.index + 1 || ""}`), 1)
                      ]),
                      _: 2
                    }, 1032, ["content"])
                  ]))
                ], 8, _hoisted_19);
              }), 128))
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const imageSelect = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-6979617a"]]);

const _hoisted_1$2 = { class: "modeMenu" };
const _hoisted_2$2 = { class: "left f ac" };
const _hoisted_3$2 = { class: "model" };
const _hoisted_4$2 = { class: "status" };
const _hoisted_5$2 = { class: "resolutionDurationPicker" };
const _hoisted_6$2 = {
  key: 0,
  class: "pickerSection"
};
const _hoisted_7$2 = { class: "pickerLabel" };
const _hoisted_8$2 = { class: "pickerOptions" };
const _hoisted_9$2 = ["onClick"];
const _hoisted_10$1 = {
  key: 1,
  class: "pickerSection"
};
const _hoisted_11$1 = { class: "pickerLabel" };
const _hoisted_12$1 = { class: "pickerOptions" };
const _hoisted_13$1 = ["onClick"];
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "modeMenu",
  props: /* @__PURE__ */ mergeModels({
    modeOptions: {},
    modeList: {},
    trackId: {}
  }, {
    "modelValue": {
      default: {
        mode: "",
        model: "",
        resolution: "480p",
        duration: 8,
        audio: false
      }
    },
    "modelModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["modeChange"], ["update:modelValue"]),
  setup(__props, { emit: __emit }) {
    const props = __props;
    const modelParmas = useModel(__props, "modelValue");
    const emit = __emit;
    function handleBeforeChange(newVal) {
      emit("modeChange", newVal);
    }
    function updateDuration(newDuration) {
      modelParmas.value.duration = newDuration;
      if (props.trackId) instance.post("/production/workbench/updateVideoDuration", { id: props.trackId, duration: newDuration });
    }
    return (_ctx, _cache) => {
      const _component_modelSelect = __unplugin_components_0$1;
      const _component_t_option = Option;
      const _component_t_select = Select;
      const _component_i_volume_notice = resolveComponent("i-volume-notice");
      const _component_i_volume_mute = resolveComponent("i-volume-mute");
      const _component_t_button = Button;
      const _component_t_tag = Tag;
      const _component_t_popup = Popup;
      return openBlock(), createElementBlock("div", _hoisted_1$2, [
        createBaseVNode("div", _hoisted_2$2, [
          createBaseVNode("div", _hoisted_3$2, [
            createVNode(_component_modelSelect, {
              modelValue: modelParmas.value.model,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => modelParmas.value.model = $event),
              type: "video",
              size: "small"
            }, null, 8, ["modelValue"])
          ]),
          createVNode(_component_t_select, {
            size: "small",
            class: "mode",
            value: modelParmas.value.mode,
            onChange: handleBeforeChange
          }, {
            default: withCtx(() => [
              (openBlock(true), createElementBlock(Fragment, null, renderList(__props.modeList, (item, index) => {
                return openBlock(), createBlock(_component_t_option, {
                  key: index,
                  value: item.value,
                  label: item.label
                }, null, 8, ["value", "label"]);
              }), 128))
            ]),
            _: 1
          }, 8, ["value"]),
          createVNode(_component_t_button, {
            size: "small",
            variant: "outline",
            theme: modelParmas.value.audio ? "success" : "danger",
            class: "audio",
            onClick: _cache[1] || (_cache[1] = ($event) => modelParmas.value.audio = !modelParmas.value.audio)
          }, {
            icon: withCtx(() => [
              modelParmas.value.audio ? (openBlock(), createBlock(_component_i_volume_notice, {
                key: 0,
                size: "16"
              })) : (openBlock(), createBlock(_component_i_volume_mute, {
                key: 1,
                size: "16"
              }))
            ]),
            _: 1
          }, 8, ["theme"]),
          createBaseVNode("div", _hoisted_4$2, [
            createVNode(_component_t_popup, {
              trigger: "click",
              placement: "top",
              "overlay-class-name": "resDurPickerPopup",
              "overlay-inner-style": { padding: "16px", borderRadius: "8px" }
            }, {
              content: withCtx(() => [
                createBaseVNode("div", _hoisted_5$2, [
                  Array.isArray(__props.modeOptions.durationResolutionMap) && __props.modeOptions.durationResolutionMap.length > 0 && __props.modeOptions.durationResolutionMap[0].resolution && __props.modeOptions.durationResolutionMap[0].resolution.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_6$2, [
                    createBaseVNode("div", _hoisted_7$2, toDisplayString(_ctx.$t("workbench.generate.resolution")), 1),
                    createBaseVNode("div", _hoisted_8$2, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(__props.modeOptions.durationResolutionMap[0].resolution, (res) => {
                        return openBlock(), createElementBlock("div", {
                          key: res,
                          class: normalizeClass(["pickerOption", { active: modelParmas.value.resolution == res }]),
                          onClick: ($event) => modelParmas.value.resolution = res
                        }, toDisplayString(res), 11, _hoisted_9$2);
                      }), 128))
                    ])
                  ])) : createCommentVNode("", true),
                  Array.isArray(__props.modeOptions.durationResolutionMap) && __props.modeOptions.durationResolutionMap.length > 0 && __props.modeOptions.durationResolutionMap[0].duration && __props.modeOptions.durationResolutionMap[0].duration.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_10$1, [
                    createBaseVNode("div", _hoisted_11$1, toDisplayString(_ctx.$t("workbench.generate.duration")), 1),
                    createBaseVNode("div", _hoisted_12$1, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(__props.modeOptions.durationResolutionMap[0].duration, (dur) => {
                        return openBlock(), createElementBlock("div", {
                          key: dur,
                          class: normalizeClass(["pickerOption", { active: modelParmas.value.duration == dur }]),
                          onClick: ($event) => updateDuration(dur)
                        }, toDisplayString(dur) + "s ", 11, _hoisted_13$1);
                      }), 128))
                    ])
                  ])) : createCommentVNode("", true)
                ])
              ]),
              default: withCtx(() => [
                createVNode(_component_t_tag, {
                  class: "btn",
                  variant: "outline"
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(modelParmas.value.resolution) + "·" + toDisplayString(modelParmas.value.duration) + "s", 1)
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })
          ])
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

/* unplugin-vue-components disabled */

const modeMenu = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-3ff4eca5"]]);

const _hoisted_1$1 = { class: "history" };
const _hoisted_2$1 = { class: "titleBox f ac" };
const _hoisted_3$1 = { class: "title" };
const _hoisted_4$1 = { class: "historyItemBox" };
const _hoisted_5$1 = ["onClick"];
const _hoisted_6$1 = ["src"];
const _hoisted_7$1 = ["src", "onSeeked"];
const _hoisted_8$1 = {
  key: 2,
  class: "loadingOverlay c fc"
};
const _hoisted_9$1 = { class: "loadingText" };
const _hoisted_10 = ["onClick"];
const _hoisted_11 = ["onClick"];
const _hoisted_12 = ["onClick"];
const _hoisted_13 = ["onClick"];
const _hoisted_14 = { class: "videoPlayerBox" };
const _hoisted_15 = ["src"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "video",
  props: /* @__PURE__ */ mergeModels({
    activeTrackIndex: {},
    generating: { type: Boolean }
  }, {
    "currentTrack": {
      default: () => {
      }
    },
    "currentTrackModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["generate", "refresh"], ["update:currentTrack"]),
  setup(__props, { emit: __emit }) {
    const currentTrack = useModel(__props, "currentTrack");
    const emit = __emit;
    const { project } = storeToRefs(projectStore());
    const episodesId = inject("episodesId");
    const selectVideoId = ref();
    const videoCoverMap = ref({});
    const videoPlayerVisible = ref(false);
    const playingVideoSrc = ref();
    async function selectVideo(v) {
      if (v.state === "生成中" || v.state === "生成失败") return;
      try {
        await instance.post("/production/workbench/selectVideo", {
          projectId: project.value?.id,
          scriptId: episodesId.value ?? 0,
          videoId: v.id,
          trackId: currentTrack?.value.id
        });
        window.$message.success($t("workbench.generate.selectVideoSuccess"));
        emit("refresh");
      } catch {
        window.$message.error($t("workbench.generate.selectVideoFailed"));
      }
    }
    function handleDeleteVideo(value) {
      const dlg = DialogPlugin.confirm({
        header: $t("workbench.generate.del"),
        body: $t("workbench.generate.delVideo"),
        onConfirm: () => {
          instance.post("/production/workbench/delVideo", { id: value.id }).then(() => {
            window.$message.success($t("workbench.generate.delSuccess"));
            emit("refresh");
            dlg.destroy();
            currentTrack.value.videoList.filter((item) => item.id == value.id);
          });
        },
        onCancel: () => dlg.destroy()
      });
    }
    const downloadingSet = /* @__PURE__ */ new Set();
    async function downloadVideo(value) {
      if (!value?.src) return;
      if (downloadingSet.has(value.src)) {
        window.$message.info("下载进行中，请稍候");
        return;
      }
      downloadingSet.add(value.src);
      try {
        const response = await fetch(value.src);
        if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = `视频_${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => {
          try {
            URL.revokeObjectURL(objectUrl);
          } catch {
          }
        }, 6e4);
      } catch (err) {
        console.error(err);
        window.$message.error("下载失败");
      } finally {
        downloadingSet.delete(value.src);
      }
    }
    function captureVideoCover(src) {
      if (!src || videoCoverMap.value[src]) return;
      const video = document.createElement("video");
      video.crossOrigin = "anonymous";
      video.preload = "auto";
      video.muted = true;
      video.src = src;
      video.addEventListener(
        "seeked",
        () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 160;
            canvas.height = video.videoHeight || 90;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              videoCoverMap.value[src] = canvas.toDataURL("image/jpeg", 0.7);
            }
          } catch {
          }
          video.src = "";
        },
        { once: true }
      );
      video.addEventListener(
        "loadeddata",
        () => {
          video.currentTime = 0.5;
        },
        { once: true }
      );
      video.addEventListener(
        "error",
        () => {
          video.src = "";
        },
        { once: true }
      );
      video.load();
    }
    function openVideoPlayer(v) {
      if (!v.src) return;
      playingVideoSrc.value = v.src;
      videoPlayerVisible.value = true;
    }
    function handlePlayerClose() {
      playingVideoSrc.value = void 0;
    }
    function previewVideo(v) {
      if (v.state === "生成中" || v.state === "生成失败") return;
    }
    return (_ctx, _cache) => {
      const _component_t_button = Button;
      const _component_i_time = resolveComponent("i-time");
      const _component_t_loading = Loading;
      const _component_t_tag = Tag;
      const _component_t_tooltip = Tooltip;
      const _component_i_check = resolveComponent("i-check");
      const _component_i_delete = resolveComponent("i-delete");
      const _component_i_to_bottom = resolveComponent("i-to-bottom");
      const _component_i_play = resolveComponent("i-play");
      const _component_t_card = Card;
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock(Fragment, null, [
        createVNode(_component_t_card, {
          title: "#" + (__props.activeTrackIndex + 1) + _ctx.$t("workbench.generate.videoMenu"),
          "header-bordered": "",
          style: { "height": "100%" }
        }, {
          actions: withCtx(() => [
            createVNode(_component_t_button, {
              size: "small",
              loading: __props.generating,
              onClick: _cache[0] || (_cache[0] = ($event) => emit("generate"))
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(_ctx.$t("workbench.generate.generate")), 1)
              ]),
              _: 1
            }, 8, ["loading"])
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_1$1, [
              createBaseVNode("div", _hoisted_2$1, [
                createVNode(_component_i_time),
                createBaseVNode("span", _hoisted_3$1, toDisplayString(_ctx.$t("workbench.generate.history")) + "（" + toDisplayString(currentTrack.value?.videoList.length) + "）", 1)
              ]),
              createBaseVNode("div", _hoisted_4$1, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(currentTrack.value?.videoList, (v) => {
                  return openBlock(), createElementBlock("div", {
                    class: normalizeClass(["historyItem", { active: v.id === unref(selectVideoId), generating: v.state === "生成中", failed: v.state === "生成失败" }]),
                    key: v.id,
                    onClick: ($event) => previewVideo(v)
                  }, [
                    unref(videoCoverMap)[v.src] ? (openBlock(), createElementBlock("img", {
                      key: 0,
                      src: unref(videoCoverMap)[v.src],
                      class: "videoCover"
                    }, null, 8, _hoisted_6$1)) : v.state !== "生成中" ? (openBlock(), createElementBlock("video", {
                      key: v.src,
                      src: v.src,
                      preload: "metadata",
                      muted: "",
                      onLoadedmetadata: _cache[1] || (_cache[1] = (e) => {
                        e.target.currentTime = 0.5;
                      }),
                      onSeeked: (e) => {
                        const el = e.target;
                        captureVideoCover(v.src);
                        el.style.display = "none";
                      }
                    }, null, 40, _hoisted_7$1)) : createCommentVNode("", true),
                    v.state === "生成中" ? (openBlock(), createElementBlock("div", _hoisted_8$1, [
                      createVNode(_component_t_loading, { size: "24px" }),
                      createBaseVNode("span", _hoisted_9$1, toDisplayString(_ctx.$t("workbench.generate.generating")), 1)
                    ])) : createCommentVNode("", true),
                    v.state == "生成失败" ? (openBlock(), createBlock(_component_t_tooltip, {
                      key: 3,
                      placement: "top",
                      content: v?.errorReason ?? "",
                      theme: "light"
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_t_tag, {
                          class: "stateTag",
                          theme: "danger",
                          size: "small"
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("workbench.generate.generateFailed")), 1)
                          ]),
                          _: 1
                        })
                      ]),
                      _: 1
                    }, 8, ["content"])) : createCommentVNode("", true),
                    v.state !== "生成中" ? (openBlock(), createElementBlock("div", {
                      key: 4,
                      class: "selectBtn",
                      onClick: withModifiers(($event) => selectVideo(v), ["stop"])
                    }, [
                      createVNode(_component_i_check, { size: "16" })
                    ], 8, _hoisted_10)) : createCommentVNode("", true),
                    createBaseVNode("div", {
                      class: "delBtn",
                      onClick: withModifiers(($event) => handleDeleteVideo(v), ["stop"])
                    }, [
                      createVNode(_component_i_delete, { size: "16" })
                    ], 8, _hoisted_11),
                    v.state !== "生成中" && v.state !== "生成失败" ? (openBlock(), createElementBlock("div", {
                      key: 5,
                      class: "download",
                      onClick: withModifiers(($event) => downloadVideo(v), ["stop"])
                    }, [
                      createVNode(_component_i_to_bottom, { size: "16" })
                    ], 8, _hoisted_12)) : createCommentVNode("", true),
                    v.state !== "生成中" && v.state !== "生成失败" ? (openBlock(), createElementBlock("div", {
                      key: 6,
                      class: "playBtn",
                      onClick: withModifiers(($event) => openVideoPlayer(v), ["stop"])
                    }, [
                      createVNode(_component_i_play, { size: "16" })
                    ], 8, _hoisted_13)) : createCommentVNode("", true)
                  ], 10, _hoisted_5$1);
                }), 128))
              ])
            ])
          ]),
          _: 1
        }, 8, ["title"]),
        createVNode(_component_t_dialog, {
          visible: unref(videoPlayerVisible),
          "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => isRef(videoPlayerVisible) ? videoPlayerVisible.value = $event : null),
          header: _ctx.$t("workbench.generate.previewVideo"),
          footer: false,
          width: "800px",
          "destroy-on-close": "",
          onClose: handlePlayerClose
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_14, [
              unref(playingVideoSrc) ? (openBlock(), createElementBlock("video", {
                key: 0,
                src: unref(playingVideoSrc),
                controls: "",
                autoplay: "",
                class: "videoPlayer"
              }, null, 8, _hoisted_15)) : createCommentVNode("", true)
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"])
      ], 64);
    };
  }
});

/* unplugin-vue-components disabled */

const videoCard = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-8d5b71db"]]);

const _hoisted_1 = { class: "index fc" };
const _hoisted_2 = { class: "referenceImage" };
const _hoisted_3 = { class: "uploadBtn" };
const _hoisted_4 = { class: "modelSelect" };
const _hoisted_5 = { class: "generate ac" };
const _hoisted_6 = {
  key: 0,
  class: "prompt"
};
const _hoisted_7 = { class: "promptData fc" };
const _hoisted_8 = { class: "video" };
const _hoisted_9 = { class: "track" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const { project } = storeToRefs(projectStore());
    const { flowData } = storeToRefs(useProductionAgentStore());
    const episodesId = inject("episodesId");
    const activeTrackIndex = ref(0);
    const cacheStore = imageListCacheStore();
    const { getCache, setCache, removeCache, initCacheFromTrackList, warmUpUrls } = cacheStore;
    const { urlMap } = storeToRefs(cacheStore);
    const modeOptions = ref({
      name: "",
      modelName: "",
      durationResolutionMap: [],
      audio: false,
      type: "video",
      mode: []
    });
    const trackList = ref([]);
    const modelParmas = ref({
      mode: "",
      model: "",
      resolution: "480p",
      duration: 8,
      audio: false
    });
    const storyboardList = ref([]);
    const agnesWarning = computed(() => {
      if (modelParmas.value.mode !== "singleImage") return "";
      const hasFrame = imageList.value.some((i) => i.src && i.sources === "storyboard");
      if (!hasFrame) return $t("workbench.production.rulePanel.preflightBlock") + " (Agnes: 需要首位帧)";
      return "";
    });
    async function runPreflight() {
      const pid = project.value?.id;
      const sid = episodesId.value;
      if (pid == null || sid == null) return true;
      try {
        const result = await preflightTouch({
          projectId: pid,
          scriptId: sid,
          script: flowData.value.script,
          scriptPlan: flowData.value.scriptPlan,
          storyboardTable: flowData.value.storyboardTable,
          storyboard: flowData.value.storyboard
        });
        if (!result.allowed) {
          window.$message.error($t("workbench.production.rulePanel.preflightBlock"));
          return false;
        }
        return true;
      } catch {
        return true;
      }
    }
    function getImageItemPriority(item) {
      if (item.src) return item.sources === "assets" ? 0 : 1;
      return 2;
    }
    const imageList = computed({
      get() {
        urlMap.value;
        const trackId = currentTrack.value?.id;
        const pid = project.value?.id;
        const sid = episodesId.value;
        if (pid != null && sid != null && trackId != null) {
          const cached = getCache(pid, sid, trackId);
          if (cached?.length) {
            return [...cached].sort((a, b) => getImageItemPriority(a) - getImageItemPriority(b));
          }
        }
        const medias = currentTrack.value?.medias;
        if (!medias?.length) return [];
        return [...medias].sort((a, b) => getImageItemPriority(a) - getImageItemPriority(b));
      },
      set(val) {
        if (currentTrack.value) {
          currentTrack.value.medias = val;
          const pid = project.value?.id;
          const sid = episodesId.value;
          const trackId = currentTrack.value.id;
          if (pid != null && sid != null && trackId != null) {
            setCache(pid, sid, trackId, val);
          }
        }
      }
    });
    function modeChange(newVal) {
      if (newVal == modelParmas.value.mode) return;
      if ((imageList.value.length || currentTrack.value?.prompt) && modelParmas.value.mode) {
        const dialog = DialogPlugin.confirm({
          header: $t("workbench.generate.modeChange"),
          body: $t("workbench.generate.modeChangeConfirm"),
          confirmBtn: $t("settings.generate.modelChnageSure"),
          cancelBtn: $t("settings.memory.msg.cancel"),
          onConfirm: async () => {
            imageList.value = [];
            currentTrack.value.prompt = "";
            dialog.destroy();
            modelParmas.value.mode = newVal;
          }
        });
      } else if (newVal) {
        modelParmas.value.mode = newVal;
      }
    }
    const modeList = computed(() => {
      const modeLabelMap = {
        singleImage: "单图",
        startEndRequired: "首尾帧",
        endFrameOptional: "尾帧可选",
        startFrameOptional: "首帧可选",
        text: "文本生视频",
        videoReference: "视频",
        imageReference: "图片",
        audioReference: "音频",
        textReference: "文本"
      };
      function parseRefLabel(m) {
        const match = m.match(/^(videoReference|imageReference|audioReference|textReference):(\d+)$/);
        if (match) {
          const base = modeLabelMap[match[1]] || match[1];
          return `${base} ×${match[2]}`;
        }
        return modeLabelMap[m] || m;
      }
      return modeOptions.value.mode ? modeOptions.value.mode.map(
        (mode) => Array.isArray(mode) ? { value: JSON.stringify(mode), label: mode.map((m) => parseRefLabel(m)).join(" + ") + "参考" } : { value: mode, label: modeLabelMap[mode] || mode }
      ) : [];
    });
    const currentTrack = computed({
      get() {
        return trackList.value[activeTrackIndex.value];
      },
      set(val) {
        trackList.value[activeTrackIndex.value] = val;
      }
    });
    function clampDuration(trackDuration) {
      const drMap = modeOptions.value?.durationResolutionMap;
      if (Array.isArray(drMap) && drMap.length > 0 && drMap[0].duration?.length) {
        const durations = drMap[0].duration;
        return Math.max(Math.min(...durations), Math.min(trackDuration, Math.max(...durations)));
      }
      return trackDuration;
    }
    watch(
      () => modelParmas.value.model,
      (val) => {
        if (!val) {
          modeOptions.value = {
            name: "",
            modelName: "",
            durationResolutionMap: [],
            audio: false,
            type: "video",
            mode: []
          };
          modelParmas.value.mode = "";
          return;
        }
        instance.post("/modelSelect/getModelDetail", { modelId: val }).then(({ data }) => {
          modeOptions.value = data;
          modelParmas.value.audio = data.audio === true || data.audio === "true" || data.audio == "optional";
          const drMap = data.durationResolutionMap;
          if (Array.isArray(drMap) && drMap.length > 0) {
            if (drMap[0].resolution?.length) modelParmas.value.resolution = drMap[0].resolution[0];
            if (drMap[0].duration?.length) modelParmas.value.duration = clampDuration(modelParmas.value.duration);
          }
          const currentParsed = parseMode(modelParmas.value.mode);
          const modeMatched = currentParsed !== null && data.mode.some((m) => {
            if (Array.isArray(m) && Array.isArray(currentParsed)) {
              return JSON.stringify(m) === JSON.stringify(currentParsed);
            }
            return m == currentParsed;
          });
          if (!modeMatched) {
            const newMode = Array.isArray(data.mode[0]) ? JSON.stringify(data.mode[0]) : data.mode[0];
            modeChange(newMode);
          }
        });
      }
    );
    function parseMode(value) {
      if (!value) return null;
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value;
      }
      return value;
    }
    const references = computed(() => {
      function getFileTypeByExt(src) {
        if (!src) return "image";
        const cleanSrc = src.split("?")[0].split("#")[0];
        const ext = cleanSrc.split(".").pop()?.toLowerCase() ?? "";
        if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
        if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
        return "image";
      }
      return imageList.value.filter((item) => item.src).map((item) => ({
        type: getFileTypeByExt(item.src),
        src: item.src ?? ""
      }));
    });
    async function getGenerateData() {
      const { data } = await instance.post("/production/workbench/getGenerateData", {
        projectId: project.value?.id,
        scriptId: episodesId.value ?? 0
      });
      storyboardList.value = data.storyboardList;
      const pid = project.value?.id;
      const sid = episodesId.value;
      if (pid != null && sid != null) {
        initCacheFromTrackList(pid, sid, data.trackList);
        await warmUpUrls(pid, sid);
        data.trackList.forEach((track) => {
          if (track.id == null) return;
          const cached = getCache(pid, sid, track.id);
          if (cached?.length) {
            track.medias = cached;
          }
        });
        trackList.value = [...data.trackList];
      }
      modelParmas.value.duration = clampDuration(data.trackList?.[activeTrackIndex.value]?.duration);
    }
    function handlePromptBlur() {
      const trackId = trackList.value[activeTrackIndex.value]?.id;
      if (trackId == null) return;
      instance.post("/production/workbench/updateVideoPrompt", { id: trackId, prompt: currentTrack.value?.prompt });
    }
    async function genText() {
      const track = currentTrack.value;
      if (track.id == null || track.state === "生成中") return;
      let info = [];
      const currentTrackId = track.id;
      const rawMedias = track.medias ?? [];
      if (modelParmas.value.mode == "text") {
        info = rawMedias.map(({ id, sources }) => ({ id, sources }));
      } else {
        const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"];
        const preSliced = frameMode.includes(modelParmas.value.mode) ? rawMedias.slice(0, 2) : modelParmas.value.mode === "singleImage" ? rawMedias.slice(0, 1) : rawMedias;
        const filtered = preSliced.filter((item) => typeof item.id === "number" && !isNaN(item.id)).map(({ id, sources }) => ({ id, sources }));
        if (frameMode.includes(modelParmas.value.mode)) info = filtered.slice(0, 2);
        else if (modelParmas.value.mode === "singleImage") info = filtered.slice(0, 1);
        else info = filtered;
      }
      track.state = "生成中";
      try {
        const { data } = await instance.post("/production/workbench/generateVideoPrompt", {
          projectId: project.value?.id,
          trackId: currentTrackId,
          info,
          model: modelParmas.value.model,
          mode: modelParmas.value.mode
        });
        track.prompt = data;
        track.state = "已完成";
      } catch (e) {
        track.state = "生成失败";
        window.$message.error(e?.message ?? "提示词生成失败");
      }
    }
    function trackChange(prevIndex) {
      if (prevIndex != null) {
        const prevTrack = trackList.value[prevIndex];
        const pid2 = project.value?.id;
        const sid2 = episodesId.value;
        if (pid2 != null && sid2 != null && prevTrack?.id != null) {
          setCache(pid2, sid2, prevTrack.id, prevTrack.medias);
        }
      }
      const pid = project.value?.id;
      const sid = episodesId.value;
      const curTrack = trackList.value[activeTrackIndex.value];
      if (pid != null && sid != null && curTrack?.id != null) {
        const cached = getCache(pid, sid, curTrack.id);
        if (cached) {
          curTrack.medias = cached;
        }
      }
      if (modelParmas.value.mode == "singleImage" && imageList.value.length > 1) {
        imageList.value = imageList.value.slice(0, 1);
      }
      modelParmas.value.duration = clampDuration(trackList.value?.[activeTrackIndex.value]?.duration);
    }
    watch(
      () => currentTrack.value?.medias,
      (medias) => {
        if (!medias) return;
        const pid = project.value?.id;
        const sid = episodesId.value;
        const trackId = currentTrack.value?.id;
        if (pid != null && sid != null && trackId != null) {
          setCache(pid, sid, trackId, medias);
        }
      },
      { deep: true }
    );
    onMounted(() => {
      modelParmas.value.model = project.value?.videoModel || "";
      modelParmas.value.mode = project.value?.mode || "";
      getGenerateData();
      if (hasGenerateVideoIds.value && hasGenerateVideoIds.value.length) {
        startPoll();
      }
    });
    async function generateVideo() {
      if (!await runPreflight()) return;
      const dlg = DialogPlugin.confirm({
        header: $t("workbench.generate.generateConfirm"),
        body: $t("workbench.generate.generateConfirmBody"),
        onConfirm: async () => {
          dlg.destroy();
          try {
            const { data } = await instance.post("/production/workbench/generateVideo", {
              projectId: project.value?.id,
              scriptId: episodesId.value,
              uploadData: modelParmas.value.mode === "text" ? [] : (() => {
                const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"];
                const preSliced = frameMode.includes(modelParmas.value.mode) ? imageList.value.slice(0, 2) : modelParmas.value.mode === "singleImage" ? imageList.value.slice(0, 1) : imageList.value;
                const filtered = preSliced.filter((item) => Boolean(item.src) && typeof item.id === "number" && !isNaN(item.id)).map(({ id, sources }) => ({ id, sources }));
                if (frameMode.includes(modelParmas.value.mode)) return filtered.slice(0, 2);
                if (modelParmas.value.mode === "singleImage") return filtered.slice(0, 1);
                return filtered;
              })(),
              prompt: currentTrack.value.prompt,
              model: modelParmas.value.model,
              mode: modelParmas.value.mode,
              resolution: modelParmas.value.resolution,
              duration: modelParmas.value.duration,
              audio: modelParmas.value.audio,
              trackId: currentTrack.value.id
            });
            window.$message.success($t("workbench.generate.generateStarted"));
            currentTrack.value.videoList.push({
              id: data,
              state: "生成中",
              src: ""
            });
          } catch (e) {
            window.$message.error(e?.message ?? "视频发起生成请求失败");
          } finally {
          }
        },
        onCancel: () => dlg.destroy()
      });
    }
    let pollTimer = null;
    let promptPollTimer = null;
    function startPoll() {
      if (pollTimer !== null) return;
      pollTimer = setInterval(() => getVideoList(), 3e3);
    }
    function stopPoll() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }
    const hasGenerateVideoIds = computed(() => {
      return trackList.value.map((track) => {
        return track.videoList.filter((i) => i.state == "生成中").map((i) => i.id);
      }).flatMap((i) => i);
    });
    const hasGeneratePromptIds = computed(() => {
      const trackIds = trackList.value.filter((t) => t.state == "生成中").map((t) => t.id);
      return trackIds;
    });
    async function getVideoList() {
      const { data } = await instance.post("/production/workbench/checkVideoStateList", {
        projectId: project.value?.id,
        scriptId: episodesId.value ?? 0,
        videoIds: hasGenerateVideoIds.value
      });
      if (data && data.length) {
        data.forEach((item) => {
          for (const track of trackList.value) {
            const findData = track.videoList.find((i) => i.id == item.id);
            if (findData) {
              findData.state = item.state;
              findData.src = item?.src ?? "";
              findData.errorReason = item?.errorReason ?? "";
              break;
            }
          }
        });
      }
    }
    function startPromptPoll() {
      if (promptPollTimer !== null) return;
      promptPollTimer = setInterval(() => getTrackPromptList(), 3e3);
    }
    function stopPromptPoll() {
      if (promptPollTimer) {
        clearInterval(promptPollTimer);
        promptPollTimer = null;
      }
    }
    async function getTrackPromptList() {
      const { data } = await instance.post("/production/workbench/checkVideoPrompt", {
        projectId: project.value?.id,
        scriptId: episodesId.value ?? 0,
        trackIds: hasGeneratePromptIds.value
      });
      if (data && data.length) {
        data.forEach((item) => {
          const findData = trackList.value.find((t) => t.id == item.id);
          if (findData) {
            findData.state = item.state;
            findData.prompt = item?.prompt ?? "";
            findData.reason = item?.reason ?? "";
            if (item.state === "生成失败") {
              window.$message.error(`提示词生成失败，${item.reason ?? "未知原因"}`);
            }
          }
        });
      }
    }
    watch(
      () => hasGenerateVideoIds.value,
      (newVal) => {
        if (newVal && newVal.length > 0) {
          startPoll();
        } else {
          stopPoll();
        }
      }
    );
    watch(
      () => hasGeneratePromptIds.value,
      (newVal) => {
        if (newVal && newVal.length > 0) {
          startPromptPoll();
        } else {
          stopPromptPoll();
        }
      }
    );
    onUnmounted(() => {
      stopPoll();
      stopPromptPoll();
    });
    return (_ctx, _cache) => {
      const _component_t_alert = Alert;
      const _component_t_button = Button;
      const _component_t_card = Card;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createVNode(imageSelect, {
              mode: unref(modelParmas).mode,
              modelValue: unref(imageList),
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(imageList) ? imageList.value = $event : null),
              "storyboard-list": unref(storyboardList)
            }, null, 8, ["mode", "modelValue", "storyboard-list"])
          ])
        ]),
        createBaseVNode("div", _hoisted_4, [
          unref(agnesWarning) ? (openBlock(), createBlock(_component_t_alert, {
            key: 0,
            theme: "warning",
            message: unref(agnesWarning),
            close: ""
          }, null, 8, ["message"])) : createCommentVNode("", true),
          createVNode(modeMenu, {
            modelValue: unref(modelParmas),
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(modelParmas) ? modelParmas.value = $event : null),
            modeOptions: unref(modeOptions),
            trackId: unref(currentTrack)?.id,
            modeList: unref(modeList),
            onModeChange: modeChange
          }, null, 8, ["modelValue", "modeOptions", "trackId", "modeList"])
        ]),
        createBaseVNode("div", _hoisted_5, [
          unref(currentTrack) ? (openBlock(), createElementBlock("div", _hoisted_6, [
            createVNode(_component_t_card, {
              title: "#" + (unref(activeTrackIndex) + 1) + _ctx.$t("workbench.generate.generateText"),
              "header-bordered": "",
              class: "videoPrompt"
            }, {
              actions: withCtx(() => [
                createVNode(_component_t_button, {
                  size: "small",
                  class: "genTextbtn",
                  loading: unref(currentTrack).state == "生成中",
                  onClick: genText
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.generate.generateText")), 1)
                  ]),
                  _: 1
                }, 8, ["loading"])
              ]),
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_7, [
                  createBaseVNode("div", {
                    class: "promptInput",
                    onFocusout: handlePromptBlur
                  }, [
                    createVNode(promptEditor, {
                      modelValue: unref(currentTrack).prompt,
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(currentTrack).prompt = $event),
                      references: unref(references),
                      placeholder: _ctx.$t("workbench.generate.promptPlaceholder")
                    }, null, 8, ["modelValue", "references", "placeholder"])
                  ], 32)
                ])
              ]),
              _: 1
            }, 8, ["title"])
          ])) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_8, [
            unref(currentTrack) ? (openBlock(), createBlock(videoCard, {
              key: 0,
              "active-track-index": unref(activeTrackIndex),
              "current-track": unref(currentTrack),
              "onUpdate:currentTrack": _cache[3] || (_cache[3] = ($event) => isRef(currentTrack) ? currentTrack.value = $event : null),
              onRefresh: getGenerateData,
              onGenerate: generateVideo
            }, null, 8, ["active-track-index", "current-track"])) : createCommentVNode("", true)
          ])
        ]),
        createBaseVNode("div", _hoisted_9, [
          createVNode(newTrack, {
            activeTrackIndex: unref(activeTrackIndex),
            "onUpdate:activeTrackIndex": _cache[4] || (_cache[4] = ($event) => isRef(activeTrackIndex) ? activeTrackIndex.value = $event : null),
            modelValue: unref(trackList),
            "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => isRef(trackList) ? trackList.value = $event : null),
            "image-list": unref(imageList),
            onChange: trackChange,
            modelParmas: unref(modelParmas),
            clampDuration,
            onGetData: getGenerateData
          }, null, 8, ["activeTrackIndex", "modelValue", "image-list", "modelParmas"])
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-113bc06c"]]);

export { index as default };

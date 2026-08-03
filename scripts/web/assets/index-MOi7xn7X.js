const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./ruleEngine-l0rUVBgW.js","./axios-DoLZCC01.js","./index-Dj17DntQ.js","./markdown-CDQfeHxT.js","./vue-vendor-Byo5TD6r.js","./dayjs-CuToSpIM.js","./tdesign-CfL1pweZ.js","./i18n-C05S5xzz.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-CDQfeHxT.js';
import { l as defineComponent, bM as storeToRefs, a as inject, bU as useModel, w as watch, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, j as createVNode, aM as withCtx, aO as createBaseVNode, av as isRef, a1 as unref, a$ as createTextVNode, b0 as toDisplayString, aT as createCommentVNode, F as Fragment, aP as renderList, aU as normalizeClass, bH as withModifiers, aS as createBlock, bV as mergeModels, r as ref, c as computed, o as onMounted, b as onUnmounted } from './vue-vendor-Byo5TD6r.js';
import { i as instance } from './axios-DoLZCC01.js';
import { a as toastBatchSoftDefer, t as toastAfterApplyExitGate, d as designExitStillOpen } from './v5OpsHelpers-D73C6JE9.js';
import { s as settingStore, p as projectStore, _ as _export_sfc } from './index-Dj17DntQ.js';
import { i as imageListCacheStore } from './imageListCache-Cp2rGzc_.js';
import { J as JSZip } from './mammoth-qyhJBxxk.js';
import { Y as Card, a3 as Checkbox, B as Button, X as Tag, a8 as Image, W as DialogPlugin, E as Dialog, n as Tooltip, K as Select, O as Option, a5 as Popup, L as Loading, a6 as Drawer, A as Alert } from './tdesign-CfL1pweZ.js';
import { _ as __unplugin_components_0 } from './imageTools-fFKvCNZM.js';
import { o as openAssetsSelector } from './assetsCheck-x0_DEdwf.js';
import { s as stillQualityBadgeLabel, c as resolveStillRepairCtaLabel, p as promptEditor } from './stillQuality-WkBJH2Rs.js';
import { _ as __unplugin_components_0$1 } from './modelSelect-CcPQrTrD.js';
import { u as useAdaptationNav, b as useProductionAgentStore } from './useAdaptationNav-BJTPyVmA.js';
import { selfHeal, preflightTouch, preflightProduction } from './ruleEngine-l0rUVBgW.js';
import './dayjs-CuToSpIM.js';
import './i18n-C05S5xzz.js';
import './index-DwxuFSda.js';
import './providersLogo-BCbaFq8_.js';
import './icons-B-vHNScY.js';

const _hoisted_1$7 = { class: "videoTrack" };
const _hoisted_2$6 = { class: "trackMenu f ac jb" };
const _hoisted_3$6 = { class: "left f ac" };
const _hoisted_4$6 = {
  key: 0,
  class: "selectedCount"
};
const _hoisted_5$6 = { class: "right f ac" };
const _hoisted_6$6 = { class: "itemBox" };
const _hoisted_7$6 = ["onClick"];
const _hoisted_8$5 = {
  key: 2,
  class: "thumbGroup"
};
const _hoisted_9$5 = ["src"];
const _hoisted_10$5 = {
  key: 1,
  class: "thumb placeholder c"
};
const _hoisted_11$4 = {
  key: 3,
  class: "thumbGroup"
};
const _hoisted_12$4 = {
  key: 1,
  class: "thumb placeholder c"
};
const _hoisted_13$4 = {
  key: 4,
  class: "emptyTrack"
};
const _hoisted_14$3 = ["onClick"];
const _sfc_main$7 = /* @__PURE__ */ defineComponent({
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
      const queuedIds = [];
      const prevState = /* @__PURE__ */ new Map();
      trackList.value.forEach((track) => {
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
        prevState.set(trackId, track.state);
        queuedIds.push(trackId);
        track.state = "生成中";
      });
      instance.post("/production/workbench/batchGeneratePrompt", {
        projectId: project.value?.id,
        scriptId: episodesId.value,
        trackData,
        model: props.modelParmas.model,
        mode: props.modelParmas.mode,
        concurrentCount: otherSetting.value.assetsBatchGenereateSize
      }).then(() => {
        window.$message.success("开始生成提示词");
        checkedTrackIds.value = [];
        checkAll.value = false;
      }).catch((e) => {
        window.$message.error(e?.message ?? "生成提示词失败");
        trackList.value.forEach((i) => {
          if (!queuedIds.includes(i.id)) return;
          i.state = prevState.get(i.id) ?? "未生成";
        });
      }).finally(() => {
        generateTextLoad.value = false;
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
          const notBurnReady = checkedTrackData.filter((i) => i.state === "需完善" || i.burnAllowed === false);
          if (notBurnReady.length) {
            return window.$message.warning(
              `有 ${notBurnReady.length} 条轨道将智能修复后继续生成（不硬阻断）`
            );
          }
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
            const envelope = await instance.post("/production/workbench/batchGenerateVideo", requestData);
            const payload = envelope?.data ?? envelope;
            const summary = payload && typeof payload === "object" && "summary" in payload ? payload.summary : void 0;
            const tasks = Array.isArray(payload) ? payload : payload?.tasks ?? [];
            const videoRecordId = {};
            for (const item of tasks) {
              if (item.skipped || item.videoId == null || item.trackId == null) continue;
              videoRecordId[item.trackId] = item.videoId;
            }
            checkedTrackData.forEach((i) => {
              if (videoRecordId[i.id])
                i.videoList.push({
                  id: videoRecordId[i.id],
                  state: "生成中",
                  src: ""
                });
            });
            checkedTrackIds.value = [];
            toastBatchSoftDefer(summary, $t("workbench.generate.generateStarted"));
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
      return openBlock(), createElementBlock("div", _hoisted_1$7, [
        createVNode(_component_t_card, {
          bordered: "",
          style: { height: "100%" }
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_2$6, [
              createBaseVNode("div", _hoisted_3$6, [
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
                unref(checkedTrackIds).length ? (openBlock(), createElementBlock("span", _hoisted_4$6, toDisplayString(_ctx.$t("workbench.generate.selected")) + " " + toDisplayString(unref(checkedTrackIds).length) + " 段", 1)) : createCommentVNode("", true)
              ]),
              createBaseVNode("div", _hoisted_5$6, [
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
            createBaseVNode("div", _hoisted_6$6, [
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
                      createTextVNode("#" + toDisplayString(track.displayNo ?? index + 1), 1)
                    ]),
                    _: 2
                  }, 1024),
                  track.state === "需完善" || track.burnAllowed === false ? (openBlock(), createBlock(_component_t_tag, {
                    key: 0,
                    class: "needsFixTag",
                    theme: "warning",
                    size: "small"
                  }, {
                    default: withCtx(() => [..._cache[2] || (_cache[2] = [
                      createTextVNode("待智能修复", -1)
                    ])]),
                    _: 1
                  })) : createCommentVNode("", true),
                  track.selectVideoId ? (openBlock(), createBlock(_component_t_tag, {
                    key: 1,
                    class: "selectTag",
                    theme: "success",
                    size: "small"
                  }, {
                    default: withCtx(() => [..._cache[3] || (_cache[3] = [
                      createTextVNode("已选择", -1)
                    ])]),
                    _: 1
                  })) : createCommentVNode("", true),
                  track.selectVideoId && getSelectedVideoSrc(track) ? (openBlock(), createElementBlock("div", _hoisted_8$5, [
                    unref(videoCoverMap)[getSelectedVideoSrc(track)] ? (openBlock(), createElementBlock("img", {
                      key: 0,
                      class: "thumb selectedVideoThumb",
                      src: unref(videoCoverMap)[getSelectedVideoSrc(track)],
                      draggable: "false"
                    }, null, 8, _hoisted_9$5)) : (openBlock(), createElementBlock("div", _hoisted_10$5, [
                      createVNode(_component_i_video, { size: "24" })
                    ]))
                  ])) : track.medias.some((m) => m.src) ? (openBlock(), createElementBlock("div", _hoisted_11$4, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(track.medias, (m, i) => {
                      return openBlock(), createElementBlock(Fragment, { key: i }, [
                        m.src ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                          m.fileType === "image" ? (openBlock(), createBlock(_component_t_image, {
                            key: 0,
                            fit: "cover",
                            src: m.src,
                            class: "thumb"
                          }, null, 8, ["src"])) : (openBlock(), createElementBlock("div", _hoisted_12$4, [
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
                  ])) : (openBlock(), createElementBlock("span", _hoisted_13$4, toDisplayString(_ctx.$t("workbench.generate.emptyTrack", { index: track.displayNo ?? index + 1 })), 1)),
                  createBaseVNode("div", {
                    class: "deleteBtn",
                    onClick: withModifiers(($event) => confirmDeleteTrack(index), ["stop"])
                  }, [
                    createVNode(_component_i_close, { size: "14" })
                  ], 8, _hoisted_14$3)
                ], 10, _hoisted_7$6);
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

const newTrack = /* @__PURE__ */ _export_sfc(_sfc_main$7, [["__scopeId", "data-v-aa0a1b0c"]]);

const _hoisted_1$6 = { class: "imageUploadBox ac" };
const _hoisted_2$5 = { class: "imageToolsWrap" };
const _hoisted_3$5 = { class: "mediaPreview audioPreview" };
const _hoisted_4$5 = {
  key: 2,
  class: "mediaPreview videoPreview"
};
const _hoisted_5$5 = ["src"];
const _hoisted_6$5 = {
  key: 2,
  class: "imageTitleWrap"
};
const _hoisted_7$5 = ["onClick"];
const _hoisted_8$4 = { class: "source" };
const _hoisted_9$4 = ["onClick"];
const _hoisted_10$4 = {
  key: 0,
  style: { "flex": "1", "width": "100%" },
  class: "ac"
};
const _hoisted_11$3 = { class: "imageToolsWrap" };
const _hoisted_12$3 = {
  key: 1,
  class: "mediaPreview audioPreview"
};
const _hoisted_13$3 = {
  key: 2,
  class: "mediaPreview videoPreview"
};
const _hoisted_14$2 = ["src"];
const _hoisted_15$2 = {
  key: 2,
  class: "imageTitleWrap"
};
const _hoisted_16$1 = ["onClick"];
const _hoisted_17$1 = { class: "source" };
const _hoisted_18$1 = { class: "storyboardGrid" };
const _hoisted_19$1 = ["onClick"];
const _hoisted_20$1 = {
  key: 0,
  class: "imageTitleWrap"
};
const _hoisted_21$1 = ["src"];
const _hoisted_22$1 = {
  key: 2,
  class: "textBox ac jc"
};
const _hoisted_23$1 = { style: { "font-size": "20px" } };
const _sfc_main$6 = /* @__PURE__ */ defineComponent({
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
    function isWeakStill(sb) {
      return sb.stateHint === "weak_keep" || sb.stillQuality === "weak" || sb.visualPass === false || sb.sheetLeak === true;
    }
    function stillBadge(sb) {
      return stillQualityBadgeLabel({
        stillQuality: sb.stillQuality,
        visualPass: sb.visualPass,
        sheetLeak: sb.sheetLeak
      });
    }
    const props = __props;
    const imageList = useModel(__props, "modelValue");
    const cacheStore = imageListCacheStore();
    const { urlMap } = storeToRefs(cacheStore);
    const { resolveUrls: resolveUrlsFn, resolveUrlSync: resolveUrlSyncFn } = cacheStore;
    const displayStoryboardList = computed(() => {
      urlMap.value;
      return props.storyboardList.map((sb) => ({
        ...sb,
        src: resolveUrlSyncFn(sb.id, "storyboard", sb.src) || sb.src
      }));
    });
    const storyboardDialogVisible = ref(false);
    async function openStoryboardDialog() {
      const items = props.storyboardList.filter((s) => s.id != null).map((s) => ({ id: s.id, sources: "storyboard" }));
      if (items.length) await resolveUrlsFn(items);
      storyboardDialogVisible.value = true;
    }
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
      const parsed = parseMode(props.mode);
      const modeArr = Array.isArray(parsed) ? parsed : Array.isArray(props.mode) ? props.mode : [];
      if (!modeArr.length) return [];
      const map = { audioReference: "audio", imageReference: "image", videoReference: "video" };
      return modeArr.map((m) => String(m).split(":")[0]).filter((m) => m in map).map((m) => map[m]);
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
          void openStoryboardDialog();
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
      const resolved = resolveUrlSyncFn(sb.id, "storyboard", sb.src);
      const newItem = {
        fileType,
        sources: "storyboard",
        src: resolved || sb.src,
        id: sb.id,
        prompt: sb.videoDesc ?? void 0,
        index: sb.index,
        stillQuality: sb.stillQuality,
        visualPass: sb.visualPass,
        stateHint: sb.stateHint,
        sheetLeak: sb.sheetLeak,
        userMessage: sb.userMessage,
        ctaLabel: sb.ctaLabel
      };
      if (isWeakStill(sb)) {
        window.$message?.warning?.(
          String(sb.userMessage || sb.ctaLabel || "弱图不可作视频首帧 — 请点「智能修复」重出 HQ 静照")
        );
      }
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
      const _component_t_tag = Tag;
      const _component_i_close = resolveComponent("i-close");
      const _component_i_plus = resolveComponent("i-plus");
      const _component_t_dialog = Dialog;
      return openBlock(), createElementBlock("div", _hoisted_1$6, [
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
                  createBaseVNode("div", _hoisted_2$5, [
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
                  createBaseVNode("div", _hoisted_3$5, [
                    createVNode(_component_i_acoustic, { size: "20" }),
                    _cache[2] || (_cache[2] = createBaseVNode("span", { class: "mediaLabel" }, "音频", -1))
                  ])
                ]),
                _: 1
              }, 8, ["content"])) : item.fileType == "video" ? (openBlock(), createElementBlock("div", _hoisted_4$5, [
                createBaseVNode("video", {
                  class: "uploadPreview",
                  src: item.src,
                  preload: "metadata",
                  muted: ""
                }, null, 8, _hoisted_5$5)
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
            item.sources == "storyboard" && item.index != null ? (openBlock(), createElementBlock("div", _hoisted_6$5, toDisplayString(`P${item.index + 1}`), 1)) : createCommentVNode("", true),
            isWeakStill(item) ? (openBlock(), createBlock(_component_t_tag, {
              key: 3,
              size: "small",
              theme: "warning",
              variant: "light",
              class: "slotWeakTag"
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(stillBadge(item)), 1)
              ]),
              _: 2
            }, 1024)) : createCommentVNode("", true),
            createBaseVNode("div", {
              class: "clearBtn",
              onClick: ($event) => splitImage(index)
            }, [
              createVNode(_component_i_close, { size: "12" })
            ], 8, _hoisted_7$5),
            createBaseVNode("div", _hoisted_8$4, [
              createVNode(_component_t_tag, { size: "small" }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(item.sources == "storyboard" ? _ctx.$t("workbench.generate.storyboard") : _ctx.$t("workbench.generate.assets")), 1)
                ]),
                _: 2
              }, 1024)
            ])
          ]);
        }), 128)) : __props.mode == "endFrameOptional" || __props.mode == "startFrameOptional" || __props.mode == "startEndRequired" ? (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(buildLabel.value, (item, index) => {
          return openBlock(), createElementBlock("div", {
            class: "uploadBtn c fc",
            key: item.value,
            onClick: ($event) => handleMixedAdd(item.value)
          }, [
            !isEmptySlot(imageList.value?.[index]) ? (openBlock(), createElementBlock("div", _hoisted_10$4, [
              imageList.value?.[index]?.src ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                imageList.value?.[index]?.fileType == "image" ? (openBlock(), createBlock(_component_t_image, {
                  key: 0,
                  src: imageList.value?.[index].src,
                  fit: "contain",
                  class: "uploadPreview"
                }, {
                  overlayContent: withCtx(() => [
                    createBaseVNode("div", _hoisted_11$3, [
                      createVNode(_component_ImageTools, {
                        src: imageList.value?.[index].src,
                        position: "br"
                      }, null, 8, ["src"])
                    ])
                  ]),
                  _: 2
                }, 1032, ["src"])) : imageList.value?.[index]?.fileType == "audio" ? (openBlock(), createElementBlock("div", _hoisted_12$3, [
                  createVNode(_component_i_acoustic, { size: "20" }),
                  _cache[4] || (_cache[4] = createBaseVNode("span", { class: "mediaLabel" }, "音频", -1))
                ])) : imageList.value?.[index]?.fileType == "video" ? (openBlock(), createElementBlock("div", _hoisted_13$3, [
                  createBaseVNode("video", {
                    class: "uploadPreview",
                    src: imageList.value?.[index].src,
                    preload: "metadata",
                    muted: ""
                  }, null, 8, _hoisted_14$2)
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
              imageList.value?.[index]?.sources == "storyboard" && imageList.value?.[index]?.index != null ? (openBlock(), createElementBlock("div", _hoisted_15$2, toDisplayString(`P${imageList.value[index]?.index + 1}`), 1)) : createCommentVNode("", true),
              imageList.value?.[index] && isWeakStill(imageList.value[index]) ? (openBlock(), createBlock(_component_t_tag, {
                key: 3,
                size: "small",
                theme: "warning",
                variant: "light",
                class: "slotWeakTag"
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(stillBadge(imageList.value[index])), 1)
                ]),
                _: 2
              }, 1024)) : createCommentVNode("", true),
              createBaseVNode("div", {
                class: "clearBtn",
                onClick: withModifiers(($event) => clearImage(index), ["stop"])
              }, [
                createVNode(_component_i_close, { size: "12" })
              ], 8, _hoisted_16$1),
              createBaseVNode("div", _hoisted_17$1, [
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
          ], 8, _hoisted_9$4);
        }), 128)) : createCommentVNode("", true),
        isShowAddImage.value ? (openBlock(), createElementBlock("div", {
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
            createBaseVNode("div", _hoisted_18$1, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(displayStoryboardList.value, (sb) => {
                return openBlock(), createElementBlock("div", {
                  class: "storyboardItem",
                  key: sb.id,
                  onClick: ($event) => pickStoryboard(sb)
                }, [
                  sb?.index != null ? (openBlock(), createElementBlock("div", _hoisted_20$1, toDisplayString(`P${sb?.index + 1}`), 1)) : createCommentVNode("", true),
                  sb.src ? (openBlock(), createElementBlock("img", {
                    key: 1,
                    src: sb.src
                  }, null, 8, _hoisted_21$1)) : (openBlock(), createElementBlock("div", _hoisted_22$1, [
                    createVNode(_component_t_tooltip, {
                      theme: "primary",
                      content: sb?.videoDesc || ""
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("span", _hoisted_23$1, toDisplayString(`分镜 ${sb?.index + 1 || ""}`), 1)
                      ]),
                      _: 2
                    }, 1032, ["content"])
                  ])),
                  isWeakStill(sb) ? (openBlock(), createBlock(_component_t_tag, {
                    key: 3,
                    size: "small",
                    theme: "warning",
                    variant: "light",
                    class: "weakStillTag"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(stillBadge(sb)), 1)
                    ]),
                    _: 2
                  }, 1024)) : createCommentVNode("", true)
                ], 8, _hoisted_19$1);
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

const imageSelect = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["__scopeId", "data-v-1354c91f"]]);

const _hoisted_1$5 = { class: "modeMenu" };
const _hoisted_2$4 = { class: "left f ac" };
const _hoisted_3$4 = { class: "model" };
const _hoisted_4$4 = { class: "status" };
const _hoisted_5$4 = { class: "resolutionDurationPicker" };
const _hoisted_6$4 = {
  key: 0,
  class: "pickerSection"
};
const _hoisted_7$4 = { class: "pickerLabel" };
const _hoisted_8$3 = { class: "pickerOptions" };
const _hoisted_9$3 = ["onClick"];
const _hoisted_10$3 = {
  key: 1,
  class: "pickerSection"
};
const _hoisted_11$2 = { class: "pickerLabel" };
const _hoisted_12$2 = { class: "pickerOptions" };
const _hoisted_13$2 = ["onClick"];
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
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
      return openBlock(), createElementBlock("div", _hoisted_1$5, [
        createBaseVNode("div", _hoisted_2$4, [
          createBaseVNode("div", _hoisted_3$4, [
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
          createBaseVNode("div", _hoisted_4$4, [
            createVNode(_component_t_popup, {
              trigger: "click",
              placement: "top",
              "overlay-class-name": "resDurPickerPopup",
              "overlay-inner-style": { padding: "16px", borderRadius: "8px" }
            }, {
              content: withCtx(() => [
                createBaseVNode("div", _hoisted_5$4, [
                  Array.isArray(__props.modeOptions.durationResolutionMap) && __props.modeOptions.durationResolutionMap.length > 0 && __props.modeOptions.durationResolutionMap[0].resolution && __props.modeOptions.durationResolutionMap[0].resolution.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_6$4, [
                    createBaseVNode("div", _hoisted_7$4, toDisplayString(_ctx.$t("workbench.generate.resolution")), 1),
                    createBaseVNode("div", _hoisted_8$3, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(__props.modeOptions.durationResolutionMap[0].resolution, (res) => {
                        return openBlock(), createElementBlock("div", {
                          key: res,
                          class: normalizeClass(["pickerOption", { active: modelParmas.value.resolution == res }]),
                          onClick: ($event) => modelParmas.value.resolution = res
                        }, toDisplayString(res), 11, _hoisted_9$3);
                      }), 128))
                    ])
                  ])) : createCommentVNode("", true),
                  Array.isArray(__props.modeOptions.durationResolutionMap) && __props.modeOptions.durationResolutionMap.length > 0 && __props.modeOptions.durationResolutionMap[0].duration && __props.modeOptions.durationResolutionMap[0].duration.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_10$3, [
                    createBaseVNode("div", _hoisted_11$2, toDisplayString(_ctx.$t("workbench.generate.duration")), 1),
                    createBaseVNode("div", _hoisted_12$2, [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(__props.modeOptions.durationResolutionMap[0].duration, (dur) => {
                        return openBlock(), createElementBlock("div", {
                          key: dur,
                          class: normalizeClass(["pickerOption", { active: modelParmas.value.duration == dur }]),
                          onClick: ($event) => updateDuration(dur)
                        }, toDisplayString(dur) + "s ", 11, _hoisted_13$2);
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

const modeMenu = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["__scopeId", "data-v-3ff4eca5"]]);

const _hoisted_1$4 = { class: "history" };
const _hoisted_2$3 = { class: "titleBox f ac" };
const _hoisted_3$3 = { class: "title" };
const _hoisted_4$3 = { class: "historyItemBox" };
const _hoisted_5$3 = ["onClick"];
const _hoisted_6$3 = ["src"];
const _hoisted_7$3 = ["src", "onSeeked"];
const _hoisted_8$2 = {
  key: 2,
  class: "loadingOverlay c fc"
};
const _hoisted_9$2 = { class: "loadingText" };
const _hoisted_10$2 = ["onClick"];
const _hoisted_11$1 = ["onClick"];
const _hoisted_12$1 = ["onClick"];
const _hoisted_13$1 = ["onClick"];
const _hoisted_14$1 = { class: "videoPlayerBox" };
const _hoisted_15$1 = ["src"];
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
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
  emits: /* @__PURE__ */ mergeModels(["generate", "smart-repair", "refresh"], ["update:currentTrack"]),
  setup(__props, { emit: __emit }) {
    const currentTrack = useModel(__props, "currentTrack");
    const emit = __emit;
    const { project } = storeToRefs(projectStore());
    const episodesId = inject("episodesId");
    const selectVideoId = ref();
    const videoCoverMap = ref({});
    const videoPlayerVisible = ref(false);
    const playingVideoSrc = ref();
    function formatVideoFailTip(v) {
      const raw = String(v?.errorReason ?? "").trim();
      if (!raw) return $t("workbench.generate.generateFailed");
      if (!raw.startsWith("{")) {
        if (/VIDEO-PROMPT-STALE|video_prompt_stale|须重编译/i.test(raw)) {
          return `${raw.slice(0, 160)} · 重编译视频提示词`.slice(0, 220);
        }
        return raw.slice(0, 200);
      }
      try {
        const j = JSON.parse(raw);
        const pb = j.postBurn ?? void 0;
        const um = String(j.userMessage || pb?.userMessage || j.message || "");
        let cta = String(j.ctaLabel || "");
        const code = String(j.code || pb?.code || "");
        const trigger = String(j.reverseTrigger || "");
        const step = String(j.primaryNextStep || pb?.primaryNextStep || "");
        if (!cta && /VIDEO-PROMPT-STALE|video_prompt_stale/i.test(`${code} ${trigger} ${um}`)) {
          cta = "重编译视频提示词";
        }
        const bits = [um, cta, step ? `(${step})` : ""].filter(Boolean);
        return bits.join(" · ").slice(0, 220) || raw.slice(0, 120);
      } catch {
        return raw.slice(0, 200);
      }
    }
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
              title: currentTrack.value?.state === "需完善" || currentTrack.value?.burnAllowed === false ? "将智能修复后继续生成（实现已降级反馈，不硬阻断）" : void 0,
              onClick: _cache[0] || (_cache[0] = ($event) => emit("generate"))
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(_ctx.$t("workbench.generate.generate")), 1)
              ]),
              _: 1
            }, 8, ["loading", "title"])
          ]),
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_1$4, [
              createBaseVNode("div", _hoisted_2$3, [
                createVNode(_component_i_time),
                createBaseVNode("span", _hoisted_3$3, toDisplayString(_ctx.$t("workbench.generate.history")) + "（" + toDisplayString(currentTrack.value?.videoList.length) + "）", 1)
              ]),
              createBaseVNode("div", _hoisted_4$3, [
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
                    }, null, 8, _hoisted_6$3)) : v.state !== "生成中" ? (openBlock(), createElementBlock("video", {
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
                    }, null, 40, _hoisted_7$3)) : createCommentVNode("", true),
                    v.state === "生成中" ? (openBlock(), createElementBlock("div", _hoisted_8$2, [
                      createVNode(_component_t_loading, { size: "24px" }),
                      createBaseVNode("span", _hoisted_9$2, toDisplayString(_ctx.$t("workbench.generate.generating")), 1)
                    ])) : createCommentVNode("", true),
                    v.state == "生成失败" ? (openBlock(), createBlock(_component_t_tooltip, {
                      key: 3,
                      placement: "top",
                      content: formatVideoFailTip(v),
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
                    ], 8, _hoisted_10$2)) : createCommentVNode("", true),
                    createBaseVNode("div", {
                      class: "delBtn",
                      onClick: withModifiers(($event) => handleDeleteVideo(v), ["stop"])
                    }, [
                      createVNode(_component_i_delete, { size: "16" })
                    ], 8, _hoisted_11$1),
                    v.state !== "生成中" && v.state !== "生成失败" ? (openBlock(), createElementBlock("div", {
                      key: 5,
                      class: "download",
                      onClick: withModifiers(($event) => downloadVideo(v), ["stop"])
                    }, [
                      createVNode(_component_i_to_bottom, { size: "16" })
                    ], 8, _hoisted_12$1)) : createCommentVNode("", true),
                    v.state !== "生成中" && v.state !== "生成失败" ? (openBlock(), createElementBlock("div", {
                      key: 6,
                      class: "playBtn",
                      onClick: withModifiers(($event) => openVideoPlayer(v), ["stop"])
                    }, [
                      createVNode(_component_i_play, { size: "16" })
                    ], 8, _hoisted_13$1)) : createCommentVNode("", true)
                  ], 10, _hoisted_5$3);
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
            createBaseVNode("div", _hoisted_14$1, [
              unref(playingVideoSrc) ? (openBlock(), createElementBlock("video", {
                key: 0,
                src: unref(playingVideoSrc),
                controls: "",
                autoplay: "",
                class: "videoPlayer"
              }, null, 8, _hoisted_15$1)) : createCommentVNode("", true)
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"])
      ], 64);
    };
  }
});

/* unplugin-vue-components disabled */

const videoCard = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-2febb11d"]]);

const _hoisted_1$3 = {
  key: 0,
  class: "identitySlotChips f ac"
};
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "IdentitySlotChips",
  props: {
    slots: {}
  },
  setup(__props) {
    function themeOf(kind) {
      if (kind === "CHAR") return "primary";
      if (kind === "SCENE") return "success";
      if (kind === "PROP") return "warning";
      return "default";
    }
    return (_ctx, _cache) => {
      const _component_t_tag = Tag;
      return __props.slots.length ? (openBlock(), createElementBlock("div", _hoisted_1$3, [
        (openBlock(true), createElementBlock(Fragment, null, renderList(__props.slots, (s) => {
          return openBlock(), createBlock(_component_t_tag, {
            key: s.code,
            size: "small",
            theme: themeOf(s.kind),
            variant: "light"
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(s.kind) + " " + toDisplayString(s.code), 1)
            ]),
            _: 2
          }, 1032, ["theme"]);
        }), 128))
      ])) : createCommentVNode("", true);
    };
  }
});

/* unplugin-vue-components disabled */

const IdentitySlotChips = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-c170ade6"]]);

function videoIrdCtaLabel(input) {
  if (input.pixelDimStatus === "unmeasured" || input.qcWeak && input.primaryNextStep === "human_review") {
    if (input.reverseTrigger === "still_prop_missing" || /CONTACT|PROP/i.test(String(input.code ?? ""))) {
      return "接触未测 · 重出带道具静照";
    }
    return "未测·人审（非失败）";
  }
  const slots = (input.missingSlots ?? []).filter(Boolean);
  if (input.reverseTrigger === "still_prop_missing" || input.reverseTrigger === "still_video_contact_handoff" || input.code === "STILL-CONTACT-HANDOFF" || slots.includes("propInFrame")) {
    return "重出带道具静照";
  }
  if (input.reverseTrigger === "vid_contact_beats" || slots.includes("contactBeats") || slots.includes("executableBeats")) {
    return "重编译接触分相 Motion";
  }
  if (input.primaryNextStep === "human_review") {
    if (slots.includes("propInFrame") || slots.includes("contactBeats")) {
      return "接触未测 · 重出带道具静照";
    }
    return "SVQ 未测维 · 人审";
  }
  if (isVideoPromptStaleSignal(input)) return "智能修复";
  if (input.primaryNextStep === "soft_patch" || input.primaryNextStep === "regen_storyboard_hq") {
    return "智能修复";
  }
  if (input.primaryAction === "confirm_enhance") {
    return slots.length ? `智能修复·补${slots.slice(0, 3).join("/")}` : "智能修复";
  }
  if (input.primaryAction === "hand_edit_vd") {
    return slots.length ? `手改VD补${slots.slice(0, 3).join("/")}` : "手改VD";
  }
  if (input.primaryAction === "confirm_voice_mode") return "确认 voiceIntent / 口型模式";
  if (input.primaryAction === "confirm_beat_duration") return "确认 beatDuration 节拍秒";
  if (input.primaryAction === "confirm_cam_mediate") return "确认运镜调解";
  return "查看视频设计诊断";
}
function isVideoPromptStaleSignal(input) {
  const blob = [
    input.reverseTrigger,
    input.code,
    input.userMessage,
    input.ctaLabel
  ].map((s) => String(s ?? "")).join(" ");
  return /VIDEO-PROMPT-STALE|video_prompt_stale|提示词.*过期|须重编译/i.test(blob);
}
function isDesignIntentFidelityDebt(fidelity) {
  if (!fidelity) return false;
  if (fidelity.pass === false) return true;
  return (fidelity.virdFindings ?? []).some((f) => f.severity === "BLOCK");
}
function isVideoIrdDebtMeta(meta) {
  if (isDesignIntentFidelityDebt(meta.designIntentFidelity)) return true;
  if (meta.ok === false) return true;
  if ((meta.missingSlots ?? []).length > 0) return true;
  if (isVideoPromptStaleSignal(meta)) return true;
  const action = String(meta.primaryAction ?? "");
  if (action === "confirm_enhance" || action === "hand_edit_vd" || action === "confirm_voice_mode" || action === "confirm_beat_duration" || action === "confirm_cam_mediate") {
    return true;
  }
  return meta.primaryNextStep === "chat_repair" && /视频|voice|beat|运镜|伪台词|DEX-VID|重编译/i.test(String(meta.ctaLabel ?? ""));
}
function isQcSoftDeliverOnly(meta) {
  if (meta.videoPass === true || meta.motionPassAt) return false;
  if (meta.playable === true) return true;
  if (meta.qcWeak === true) return true;
  if (meta.pixelDimStatus === "unmeasured" || meta.pixelDimStatus === "measured_fail") return true;
  return false;
}
function shouldOfferVideoHumanRejudge(meta) {
  return isQcSoftDeliverOnly(meta);
}

const _hoisted_1$2 = {
  key: 0,
  class: "vid-debt",
  role: "region",
  "aria-labelledby": "vid-debt-title"
};
const _hoisted_2$2 = {
  id: "vid-debt-title",
  class: "vid-debt__title"
};
const _hoisted_3$2 = { class: "vid-debt__explain" };
const _hoisted_4$2 = {
  key: 0,
  class: "vid-debt__slots",
  "aria-label": "视频缺槽"
};
const _hoisted_5$2 = {
  key: 1,
  class: "vid-debt__findings"
};
const _hoisted_6$2 = { class: "vid-debt__actions" };
const _hoisted_7$2 = {
  key: 2,
  class: "vid-debt__soft",
  role: "status"
};
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "VideoIntentDebtBar",
  props: {
    title: { default: "视频设计债 · 须 Confirm" },
    explain: {},
    ok: { type: [Boolean, null] },
    primaryAction: {},
    primaryNextStep: {},
    reverseTrigger: {},
    code: {},
    missingSlots: {},
    ctaLabel: {},
    findings: { default: () => [] },
    designIntentFidelity: {},
    diagnosing: { type: Boolean, default: false },
    applying: { type: Boolean, default: false },
    recompiling: { type: Boolean, default: false },
    pixelDimStatus: {},
    qcWeak: { type: [Boolean, null] },
    playable: { type: [Boolean, null] },
    videoPass: { type: [Boolean, null] },
    motionPassAt: {}
  },
  emits: ["diagnose", "confirm-apply", "hand-edit-vd", "regen-prop-still", "recompile-prompt", "human-rejudge-video"],
  setup(__props) {
    const props = __props;
    const slots = computed(() => (props.missingSlots ?? []).filter(Boolean));
    const staleSignal = computed(
      () => isVideoPromptStaleSignal({
        code: props.code ?? props.findings?.[0]?.id,
        ctaLabel: props.ctaLabel,
        userMessage: props.explain || props.findings?.[0]?.message,
        reverseTrigger: props.reverseTrigger
      })
    );
    const fidelityFindings = computed(() => {
      if (!isDesignIntentFidelityDebt(props.designIntentFidelity)) return [];
      const fromVird = props.designIntentFidelity?.virdFindings ?? [];
      if (fromVird.length) return fromVird;
      return (props.designIntentFidelity?.items ?? []).filter((i) => !i.pass).map((i) => ({
        id: i.id,
        severity: "BLOCK",
        message: `${i.label}未命中`
      }));
    });
    const mergedFindings = computed(() => {
      const base = props.findings ?? [];
      const seen = new Set(base.map((f) => f.id));
      return [...base, ...fidelityFindings.value.filter((f) => !seen.has(f.id))];
    });
    const show = computed(
      () => props.qcWeak === true || props.pixelDimStatus === "unmeasured" || props.pixelDimStatus === "measured_fail" || isVideoIrdDebtMeta({
        ok: props.ok,
        primaryAction: props.primaryAction,
        primaryNextStep: props.primaryNextStep,
        missingSlots: slots.value,
        ctaLabel: props.ctaLabel,
        reverseTrigger: props.reverseTrigger,
        code: props.code ?? props.findings?.[0]?.id,
        userMessage: props.explain || props.findings?.[0]?.message,
        designIntentFidelity: props.designIntentFidelity
      })
    );
    const showRegenPropStill = computed(
      () => props.reverseTrigger === "still_prop_missing" || props.reverseTrigger === "still_video_contact_handoff" || props.code === "STILL-CONTACT-HANDOFF" || slots.value.includes("propInFrame") || slots.value.includes("contactGeom") || mergedFindings.value.some((f) => /PROP-IN-FRAME|CONTACT-HANDOFF|propInFrame/i.test(f.id))
    );
    const showRecompileBeats = computed(
      () => staleSignal.value || props.reverseTrigger === "vid_contact_beats" || slots.value.includes("contactBeats") || slots.value.includes("executableBeats") || mergedFindings.value.some((f) => /contact_phases|CONTACT-BEATS|vid_contact/i.test(f.id))
    );
    const explainText = computed(
      () => props.explain || props.ctaLabel || videoIrdCtaLabel({
        primaryAction: props.primaryAction,
        missingSlots: slots.value,
        primaryNextStep: props.primaryNextStep,
        reverseTrigger: props.reverseTrigger,
        code: props.code ?? props.findings?.[0]?.id,
        pixelDimStatus: props.pixelDimStatus,
        qcWeak: props.qcWeak
      })
    );
    const applyLabel = computed(
      () => videoIrdCtaLabel({
        primaryAction: props.primaryAction,
        missingSlots: slots.value,
        primaryNextStep: props.primaryNextStep,
        reverseTrigger: props.reverseTrigger,
        code: props.code ?? props.findings?.[0]?.id,
        pixelDimStatus: props.pixelDimStatus,
        qcWeak: props.qcWeak
      })
    );
    const handEditLabel = computed(
      () => slots.value.length ? `手改VD补${slots.slice(0, 2).join("/")}` : "手改VD"
    );
    const canForceApply = computed(() => {
      if (staleSignal.value) return false;
      const a = String(props.primaryAction ?? "");
      if (a === "none" || a === "hand_edit_vd") return false;
      if (/VIDEO-PROMPT-STALE/i.test(String(props.findings?.[0]?.id ?? props.code ?? ""))) return false;
      return a === "confirm_enhance" || a === "confirm_voice_mode" || a === "confirm_beat_duration" || a === "confirm_cam_mediate" || props.ok === false && a !== "hand_edit_vd";
    });
    const softDeliverHint = computed(() => {
      if (isQcSoftDeliverOnly({
        playable: props.playable,
        videoPass: props.videoPass,
        motionPassAt: props.motionPassAt,
        qcWeak: props.qcWeak,
        pixelDimStatus: props.pixelDimStatus
      })) {
        if (props.playable === true && props.videoPass !== true && !props.motionPassAt) {
          return "可播 ≠ 质量通过：文件可预览，但未 videoPass / 人审；禁当交付绿标。";
        }
        return "未测/弱成片：可人审收口交付；Key 可选增强。";
      }
      return "";
    });
    const showVideoHumanRejudge = computed(
      () => shouldOfferVideoHumanRejudge({
        playable: props.playable,
        videoPass: props.videoPass,
        motionPassAt: props.motionPassAt,
        qcWeak: props.qcWeak,
        pixelDimStatus: props.pixelDimStatus
      })
    );
    return (_ctx, _cache) => {
      const _component_t_tag = Tag;
      const _component_t_button = Button;
      return show.value ? (openBlock(), createElementBlock("section", _hoisted_1$2, [
        createBaseVNode("h4", _hoisted_2$2, toDisplayString(__props.title), 1),
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
        mergedFindings.value.length ? (openBlock(), createElementBlock("ul", _hoisted_5$2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(mergedFindings.value.slice(0, 4), (f, i) => {
            return openBlock(), createElementBlock("li", { key: i }, toDisplayString(f.id) + "：" + toDisplayString(f.message), 1);
          }), 128))
        ])) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_6$2, [
          showRegenPropStill.value ? (openBlock(), createBlock(_component_t_button, {
            key: 0,
            size: "small",
            theme: "warning",
            onClick: _cache[0] || (_cache[0] = ($event) => _ctx.$emit("regen-prop-still"))
          }, {
            default: withCtx(() => [..._cache[6] || (_cache[6] = [
              createTextVNode(" 重出带道具静照 ", -1)
            ])]),
            _: 1
          })) : createCommentVNode("", true),
          showRecompileBeats.value ? (openBlock(), createBlock(_component_t_button, {
            key: 1,
            size: "small",
            theme: "primary",
            variant: "outline",
            loading: __props.recompiling,
            onClick: _cache[1] || (_cache[1] = ($event) => _ctx.$emit("recompile-prompt"))
          }, {
            default: withCtx(() => [..._cache[7] || (_cache[7] = [
              createTextVNode(" 重编译接触分相 Motion ", -1)
            ])]),
            _: 1
          }, 8, ["loading"])) : createCommentVNode("", true),
          canForceApply.value && !showRegenPropStill.value ? (openBlock(), createBlock(_component_t_button, {
            key: 2,
            size: "small",
            theme: "primary",
            loading: __props.applying,
            onClick: _cache[2] || (_cache[2] = ($event) => _ctx.$emit("confirm-apply"))
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(applyLabel.value), 1)
            ]),
            _: 1
          }, 8, ["loading"])) : createCommentVNode("", true),
          createVNode(_component_t_button, {
            size: "small",
            theme: "default",
            variant: "outline",
            loading: __props.diagnosing,
            onClick: _cache[3] || (_cache[3] = ($event) => _ctx.$emit("diagnose"))
          }, {
            default: withCtx(() => [..._cache[8] || (_cache[8] = [
              createTextVNode(" 诊断视频 IRD ", -1)
            ])]),
            _: 1
          }, 8, ["loading"]),
          createVNode(_component_t_button, {
            size: "small",
            theme: "primary",
            variant: "outline",
            onClick: _cache[4] || (_cache[4] = ($event) => _ctx.$emit("hand-edit-vd"))
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(handEditLabel.value), 1)
            ]),
            _: 1
          }),
          showVideoHumanRejudge.value ? (openBlock(), createBlock(_component_t_button, {
            key: 3,
            size: "small",
            theme: "success",
            variant: "outline",
            onClick: _cache[5] || (_cache[5] = ($event) => _ctx.$emit("human-rejudge-video"))
          }, {
            default: withCtx(() => [..._cache[9] || (_cache[9] = [
              createTextVNode(" 成片人审通过（未测·可交付） ", -1)
            ])]),
            _: 1
          })) : createCommentVNode("", true)
        ]),
        softDeliverHint.value ? (openBlock(), createElementBlock("p", _hoisted_7$2, toDisplayString(softDeliverHint.value), 1)) : createCommentVNode("", true)
      ])) : createCommentVNode("", true);
    };
  }
});

/* unplugin-vue-components disabled */

const VideoIntentDebtBar = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-f6102569"]]);

const _hoisted_1$1 = { class: "shotSpecDrawer" };
const _hoisted_2$1 = { class: "bar ac" };
const _hoisted_3$1 = {
  key: 0,
  class: "lights"
};
const _hoisted_4$1 = {
  key: 1,
  class: "ok"
};
const _hoisted_5$1 = {
  key: 2,
  class: "healMsg"
};
const _hoisted_6$1 = {
  key: 0,
  class: "body fc"
};
const _hoisted_7$1 = { class: "muted" };
const _hoisted_8$1 = { class: "prompt" };
const _hoisted_9$1 = { class: "muted" };
const _hoisted_10$1 = {
  key: 0,
  class: "warn"
};
const _hoisted_11 = { key: 0 };
const _hoisted_12 = { key: 1 };
const _hoisted_13 = {
  key: 0,
  class: "warn"
};
const _hoisted_14 = {
  key: 2,
  class: "warn"
};
const _hoisted_15 = {
  key: 0,
  class: "slotChips"
};
const _hoisted_16 = { class: "muted" };
const _hoisted_17 = {
  class: "slotChips",
  style: { "margin-top": "6px" }
};
const _hoisted_18 = {
  key: 3,
  class: "warn"
};
const _hoisted_19 = {
  key: 5,
  class: "warn"
};
const _hoisted_20 = {
  key: 7,
  class: "warn"
};
const _hoisted_21 = {
  key: 8,
  class: "muted"
};
const _hoisted_22 = {
  key: 9,
  class: "warn"
};
const _hoisted_23 = { key: 2 };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "ShotSpecDrawer",
  props: {
    projectId: {},
    scriptId: {},
    storyboardId: {},
    prompt: {},
    mode: {},
    duration: {},
    audio: { type: Boolean },
    resolution: {}
  },
  emits: ["identity", "recompile-prompt"],
  setup(__props, { expose: __expose, emit: __emit }) {
    const { project } = storeToRefs(projectStore());
    const props = __props;
    const emit = __emit;
    const visible = ref(false);
    const loading = ref(false);
    const healing = ref(false);
    const hqLoading = ref(false);
    const enhanceLoading = ref(false);
    const videoIrdLoading = ref(false);
    const videoIrdApplying = ref(false);
    const videoIrd = ref(null);
    const loaded = ref(false);
    const payload = ref(null);
    const healResult = ref(null);
    const healMsg = ref("");
    const redBlocks = computed(() => (payload.value?.redLights ?? []).filter((r) => r.level === "BLOCK"));
    const canHeal = computed(
      () => props.projectId != null && props.scriptId != null && !healing.value && (loaded.value || redBlocks.value.length > 0 || (payload.value?.missingAssetImageQueue?.length ?? 0) > 0 || (healResult.value?.nextQueue?.length ?? 0) > 0 || healResult.value?.nextStep === "batch_still" || healResult.value?.nextStep === "soft_patch" || healResult.value?.primaryNextStep === "soft_patch" || healResult.value?.primaryNextStep === "split_shot" || Boolean(videoIrd.value && videoIrd.value.ok === false))
    );
    const specJson = computed(() => JSON.stringify(payload.value?.spec ?? {}, null, 2));
    const paramsJson = computed(() => JSON.stringify(payload.value?.params ?? {}, null, 2));
    const healResultJson = computed(() => JSON.stringify(healResult.value ?? {}, null, 2));
    const hqRegenCtaLabel = computed(
      () => resolveStillRepairCtaLabel({
        sheetLeak: Boolean(healResult.value?.sheetLeak),
        ctaLabel: healResult.value?.ctaLabel,
        userMessage: healResult.value?.userMessage,
        primaryNextStep: healResult.value?.primaryNextStep || healResult.value?.nextStep,
        fidelityStopReason: healResult.value?.fidelityStopReason
      })
    );
    const healStaleFindings = computed(() => {
      const code = String(healResult.value?.code ?? healResult.value?.blockCode ?? "");
      const trigger = String(healResult.value?.reverseTrigger ?? "");
      const msg = String(healResult.value?.userMessage ?? healResult.value?.message ?? "");
      if (!/VIDEO-PROMPT-STALE|video_prompt_stale/i.test(`${code} ${trigger} ${msg}`)) return void 0;
      return [
        {
          id: code || "VIDEO-PROMPT-STALE",
          severity: "BLOCK",
          message: msg || "设计/对白已变，须重编译视频提示词"
        }
      ];
    });
    const showEnhanceCta = computed(() => {
      const act = healResult.value?.primaryAction || healResult.value?.irdPrimaryAction;
      const slots = healResult.value?.missingSlots ?? [];
      return act === "confirm_enhance" || act === "apply_auto_enhance" || slots.some((s) => /contact|grip|xor|wound|propReadable/i.test(String(s)));
    });
    const enhanceCtaLabel = computed(() => {
      const act = healResult.value?.primaryAction || healResult.value?.irdPrimaryAction;
      const slots = (healResult.value?.missingSlots ?? []).slice(0, 3);
      if (act === "apply_auto_enhance") return slots.length ? `自动增强补${slots.join("/")}` : "自动增强";
      return slots.length ? `批准增强补${slots.join("/")}` : "批准增强";
    });
    function trunc(s) {
      return (s || "").length > 420 ? `${s.slice(0, 420)}…` : s || "";
    }
    async function refresh(openDrawer = true) {
      if (props.projectId == null || props.scriptId == null) return;
      loading.value = true;
      try {
        const { data } = await instance.post("/production/workbench/getShotSpecDiff", {
          projectId: props.projectId,
          scriptId: props.scriptId,
          storyboardId: props.storyboardId ?? void 0,
          prompt: props.prompt ?? "",
          mode: props.mode ?? "text",
          duration: props.duration,
          audio: props.audio,
          resolution: props.resolution,
          includeModeMatrix: true
        });
        payload.value = data?.data ?? data;
        loaded.value = true;
        const spec = payload.value?.spec;
        const fromPrompt = payload.value?.prompt?.identity;
        if (Array.isArray(fromPrompt) && fromPrompt.length) {
          emit("identity", fromPrompt);
        } else if (spec) {
          const slots = [];
          for (const c of spec.charCodes ?? []) slots.push({ kind: "CHAR", code: c });
          if (spec.sceneCode) slots.push({ kind: "SCENE", code: spec.sceneCode });
          for (const c of spec.propCodes ?? []) slots.push({ kind: "PROP", code: c });
          if (slots.length) emit("identity", slots);
        }
        if (openDrawer) visible.value = true;
      } catch (e) {
        window.$message?.error?.(e?.message ?? "getShotSpecDiff failed");
      } finally {
        loading.value = false;
      }
    }
    async function regenStoryboardHq() {
      if (props.projectId == null || props.storyboardId == null) {
        window.$message?.warning?.("缺少分镜 ID");
        return;
      }
      const model = project.value?.imageModel;
      const quality = project.value?.imageQuality || "2K";
      const ratio = project.value?.videoRatio || "9:16";
      if (!model) {
        window.$message?.error?.("请先配置图片模型");
        return;
      }
      const regenMeta = {
        primaryNextStep: healResult.value?.primaryNextStep ?? healResult.value?.nextStep,
        irdPrimaryAction: healResult.value?.primaryAction,
        missingSlots: healResult.value?.missingSlots,
        // Shootable-first: only missing_identity bricks Generate (resolver ignores literary latch)
        blockSilentRegen: healResult.value?.blockSilentRegen,
        debtKind: healResult.value?.debtKind,
        propPlateGrade: healResult.value?.propPlateGrade,
        keyOptional: healResult.value?.keyOptional,
        pixelDimStatus: healResult.value?.pixelDimStatus,
        requireFixBeforeBurn: healResult.value?.requireFixBeforeBurn
      };
      if (String(regenMeta.debtKind ?? "") === "missing_identity") {
        window.$message.info(
          healResult.value?.userMessage || healResult.value?.ctaLabel || "缺定妆 — 将入队补资产并继续生成（不挡试拍）"
        );
      }
      hqLoading.value = true;
      try {
        const strengthen = healResult.value?.strengthen || healResult.value?.actions?.[0]?.strengthen || void 0;
        const { data } = await instance.post("/production/editImage/generateFlowImage", {
          model,
          quality,
          ratio,
          prompt: props.prompt || "",
          projectId: props.projectId,
          storyboardId: props.storyboardId,
          qualityMode: "hq_update",
          persistToStoryboard: true,
          mode: "multiReference",
          ...strengthen ? { strengthen } : {}
        });
        const body = data?.data ?? data;
        window.$message?.success?.(body?.userMessage || "已更新高质量分镜图");
        healMsg.value = body?.userMessage || "hq_ok";
      } catch (e) {
        const payload2 = e?.response?.data?.data ?? {};
        window.$message?.error?.(payload2.userMessage || e?.message || "高质量分镜更新失败");
      } finally {
        hqLoading.value = false;
      }
    }
    async function runHeal() {
      if (props.projectId == null || props.scriptId == null) return;
      if (!payload.value) await refresh(false);
      healing.value = true;
      healMsg.value = "";
      try {
        const gaps = (payload.value?.identityGate?.gaps ?? payload.value?.missingAssetImageQueue ?? []).map((g) => ({
          code: g.code,
          reason: g.reason ?? (g.action === "generate_still" ? "no_image" : "no_asset"),
          kind: g.kind
        }));
        if (!gaps.length && payload.value?.spec && !payload.value.spec.sceneCode) {
          gaps.push({ code: "SCENE-?", reason: "missing_scene", kind: "SCENE" });
        }
        const result = await selfHeal({
          projectId: props.projectId,
          scriptId: props.scriptId,
          shotId: props.storyboardId ?? void 0,
          dryRun: false,
          apply: true,
          identityGaps: gaps,
          jobKind: "video"
        });
        if (!result || typeof result.healRound !== "number") {
          throw new Error("selfHeal 响应无效（检查 FE 解包）");
        }
        healResult.value = result;
        const skipHint = Array.isArray(result.skipped) && result.skipped.length ? `；跳过: ${result.skipped.map((s) => `${s.kind}=${s.reason}`).join(", ")}` : "";
        healMsg.value = `heal#${result.healRound} ${result.mode}: ${result.message}${skipHint}`;
        if (result.nextStep === "batch_still" || result.stillRunner?.queued) {
          window.$message?.success?.(
            `已建/关联 ${result.stillRunner?.queued ?? 0} 个资产。下一步请到「资产」批量生成静照，再点生成提示词`
          );
        } else if (result.autoApplicable) {
          window.$message?.success?.(result.message);
        } else {
          window.$message?.warning?.(result.message);
        }
        await refresh(false);
      } catch (e) {
        window.$message?.error?.(e?.message ?? "selfHeal failed");
      } finally {
        healing.value = false;
      }
    }
    watch(
      () => [props.projectId, props.scriptId, props.storyboardId],
      () => {
        if (props.projectId != null && props.scriptId != null) refresh(false);
      },
      { immediate: true }
    );
    watch(
      () => [props.mode],
      () => {
        if (loaded.value) refresh(false);
      }
    );
    async function openStillIntentOps() {
      if (props.projectId == null) {
        window.$message?.warning?.("缺少项目 ID");
        return;
      }
      try {
        const { data } = await instance.post("/scriptAgent/stillIntentOps", {
          projectId: props.projectId,
          action: "diagnose"
        });
        const body = data?.data ?? data;
        const slots = body?.missingSlots ?? [];
        const msg = body?.ctaLabel || body?.a11yAnnounce || (slots.length ? `须手改描写，缺槽：${slots.join("、")}` : "已诊断；请 Confirm 拆镜或手改 VD");
        window.$message?.info?.(msg);
        healResult.value = {
          ...healResult.value ?? {},
          ...body,
          nextStep: body?.primaryAction === "confirm_split" ? "split_shot" : healResult.value?.nextStep,
          primaryNextStep: body?.primaryAction === "hand_edit_vd" || body?.primaryAction === "confirm_enhance" || body?.primaryAction === "apply_auto_enhance" ? "chat_repair" : body?.primaryAction === "confirm_split" ? "split_shot" : healResult.value?.primaryNextStep,
          missingSlots: slots,
          ctaLabel: body?.ctaLabel,
          userMessage: body?.a11yAnnounce || healResult.value?.userMessage
        };
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.message || e?.message || "stillIntentOps 失败");
      }
    }
    async function applyLitEnhance() {
      if (props.projectId == null) {
        window.$message?.warning?.("缺少项目 ID");
        return;
      }
      enhanceLoading.value = true;
      try {
        const { data } = await instance.post("/scriptAgent/stillIntentOps", {
          projectId: props.projectId,
          action: "applyEnhance",
          forceApply: true,
          intentVisualEnhance: true,
          literaryDetailLlmFill: true
        });
        const body = data?.data ?? data;
        if (body?.ok) {
          toastAfterApplyExitGate(body, body.a11yAnnounce || "已应用文学增强");
          healResult.value = {
            ...healResult.value ?? {},
            ...body,
            missingSlots: [],
            userMessage: body.a11yAnnounce
          };
        } else {
          window.$message?.warning?.(
            (body?.refused || []).join("; ") || body?.a11yAnnounce || "增强未全部通过，请手改 VD"
          );
          await openStillIntentOps();
        }
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.message || e?.message || "applyEnhance 失败");
      } finally {
        enhanceLoading.value = false;
      }
    }
    async function openVideoIntentOps() {
      if (props.projectId == null) {
        window.$message?.warning?.("缺少项目 ID");
        return;
      }
      videoIrdLoading.value = true;
      try {
        const { data } = await instance.post("/scriptAgent/videoIntentOps", {
          projectId: props.projectId,
          action: "diagnose"
        });
        const body = data?.data ?? data;
        videoIrd.value = body;
        const msg = body?.ctaLabel || videoIrdCtaLabel({
          primaryAction: body?.primaryAction,
          missingSlots: body?.missingSlots,
          primaryNextStep: body?.primaryNextStep
        }) || "视频设计已诊断";
        if (body?.ok) window.$message?.success?.(body.userMessage || "视频设计契约已过");
        else window.$message?.info?.(msg);
        healResult.value = {
          ...healResult.value ?? {},
          primaryNextStep: body?.ok ? healResult.value?.primaryNextStep : "chat_repair",
          nextStep: body?.ok ? healResult.value?.nextStep : "chat_repair",
          missingSlots: body?.missingSlots ?? healResult.value?.missingSlots,
          ctaLabel: body?.ctaLabel || healResult.value?.ctaLabel,
          userMessage: body?.userMessage || healResult.value?.userMessage
        };
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.message || e?.message || "videoIntentOps 失败");
      } finally {
        videoIrdLoading.value = false;
      }
    }
    async function applyVideoIntentOps() {
      if (props.projectId == null) {
        window.$message?.warning?.("缺少项目 ID");
        return;
      }
      videoIrdApplying.value = true;
      try {
        const { data } = await instance.post("/scriptAgent/videoIntentOps", {
          projectId: props.projectId,
          action: "apply",
          forceApply: true
        });
        const body = data?.data ?? data;
        const again = body?.after ?? body;
        videoIrd.value = again;
        toastAfterApplyExitGate(body, again?.userMessage || "视频设计债已清");
        if (!designExitStillOpen(body) && again?.ok) {
          videoIrd.value = null;
        } else {
          await openVideoIntentOps();
        }
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.message || e?.message || "videoIntentOps apply 失败");
      } finally {
        videoIrdApplying.value = false;
      }
    }
    async function applyVideoHumanRejudge() {
      if (!props.storyboardId) {
        window.$message?.warning?.("须绑定分镜");
        return;
      }
      try {
        const data = await instance.post("/production/storyboard/humanRejudgeFidelity", {
          storyboardId: props.storyboardId,
          modality: "video",
          items: [{ id: "svq_unmeasured", pass: true, evidence: "operator_video_rejudge" }]
        });
        const body = data?.data ?? data;
        if (body?.videoPass === false) {
          window.$message?.warning?.(body?.userMessage || "成片人审未全过");
          return;
        }
        window.$message?.success?.(body?.userMessage || "成片人审通过（未测·可交付）");
        videoIrd.value = null;
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.message || e?.message || "成片人审失败");
      }
    }
    async function regenPropStillFromDrawer() {
      if (!props.storyboardId || props.projectId == null) {
        window.$message?.warning?.("须绑定分镜");
        return;
      }
      try {
        await instance.post("/production/storyboard/batchGenerateImage", {
          projectId: props.projectId,
          scriptId: props.scriptId,
          storyboardIds: [props.storyboardId],
          compulsory: true,
          qualityMode: "hq_update"
        });
        window.$message.info("已排队重出带道具静照");
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.data?.userMessage || e?.message || "重出静照失败");
      }
    }
    __expose({
      refresh,
      open: () => refresh(true),
      runHeal,
      openVideoIntentOps,
      clearVideoIrd: () => {
        videoIrd.value = null;
      }
    });
    return (_ctx, _cache) => {
      const _component_t_button = Button;
      const _component_t_tag = Tag;
      const _component_t_drawer = Drawer;
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createBaseVNode("div", _hoisted_2$1, [
          createVNode(_component_t_button, {
            size: "small",
            variant: "outline",
            loading: loading.value,
            onClick: _cache[0] || (_cache[0] = ($event) => refresh(true))
          }, {
            default: withCtx(() => [..._cache[3] || (_cache[3] = [
              createTextVNode("设定对照", -1)
            ])]),
            _: 1
          }, 8, ["loading"]),
          createVNode(_component_t_button, {
            size: "small",
            theme: "warning",
            variant: "outline",
            loading: healing.value,
            disabled: !canHeal.value,
            onClick: runHeal
          }, {
            default: withCtx(() => [..._cache[4] || (_cache[4] = [
              createTextVNode(" 智能修复 ", -1)
            ])]),
            _: 1
          }, 8, ["loading", "disabled"]),
          redBlocks.value.length ? (openBlock(), createElementBlock("div", _hoisted_3$1, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(redBlocks.value, (r, i) => {
              return openBlock(), createBlock(_component_t_tag, {
                key: i,
                theme: "danger",
                variant: "light",
                size: "small"
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(r.message), 1)
                ]),
                _: 2
              }, 1024);
            }), 128))
          ])) : loaded.value ? (openBlock(), createElementBlock("div", _hoisted_4$1, "SPEC OK")) : createCommentVNode("", true),
          healMsg.value ? (openBlock(), createElementBlock("div", _hoisted_5$1, toDisplayString(healMsg.value), 1)) : createCommentVNode("", true)
        ]),
        createVNode(_component_t_drawer, {
          visible: visible.value,
          "onUpdate:visible": _cache[2] || (_cache[2] = ($event) => visible.value = $event),
          size: "520px",
          footer: false,
          header: "Shot Spec · Prompt · Params"
        }, {
          default: withCtx(() => [
            payload.value ? (openBlock(), createElementBlock("div", _hoisted_6$1, [
              createBaseVNode("section", null, [
                _cache[5] || (_cache[5] = createBaseVNode("h4", null, "Spec（Package）", -1)),
                createBaseVNode("pre", null, toDisplayString(specJson.value), 1)
              ]),
              createBaseVNode("section", null, [
                _cache[6] || (_cache[6] = createBaseVNode("h4", null, "Prompt", -1)),
                createBaseVNode("p", _hoisted_7$1, "injected: " + toDisplayString((payload.value.prompt?.injectedFields || []).join(", ") || "—"), 1),
                createBaseVNode("pre", _hoisted_8$1, toDisplayString(payload.value.prompt?.vendorPreview || "—"), 1)
              ]),
              createBaseVNode("section", null, [
                _cache[7] || (_cache[7] = createBaseVNode("h4", null, "Params（Vendor API）", -1)),
                createBaseVNode("pre", null, toDisplayString(paramsJson.value), 1),
                createBaseVNode("p", _hoisted_9$1, "text_only: " + toDisplayString((payload.value.bridging?.textOnly || []).join(", ")), 1),
                payload.value.textHardening?.length ? (openBlock(), createElementBlock("p", _hoisted_10$1, "hardening: " + toDisplayString(payload.value.textHardening.join(" · ")), 1)) : createCommentVNode("", true)
              ]),
              payload.value.modeMatrix ? (openBlock(), createElementBlock("section", _hoisted_11, [
                _cache[8] || (_cache[8] = createBaseVNode("h4", null, "四模式并排", -1)),
                (openBlock(true), createElementBlock(Fragment, null, renderList(payload.value.modeMatrix, (p, mode) => {
                  return openBlock(), createElementBlock("div", {
                    key: mode,
                    class: "modeBlock"
                  }, [
                    createBaseVNode("strong", null, toDisplayString(mode), 1),
                    createBaseVNode("pre", null, toDisplayString(trunc(p)), 1)
                  ]);
                }), 128))
              ])) : createCommentVNode("", true),
              payload.value.missingAssetImageQueue?.length || healResult.value?.nextQueue?.length ? (openBlock(), createElementBlock("section", _hoisted_12, [
                _cache[12] || (_cache[12] = createBaseVNode("h4", null, "缺图队列（禁假绿）", -1)),
                createBaseVNode("ul", null, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(healResult.value?.nextQueue?.length ? healResult.value.nextQueue : payload.value.missingAssetImageQueue, (q, i) => {
                    return openBlock(), createElementBlock("li", { key: i }, toDisplayString(q.kind) + " " + toDisplayString(q.code) + " → " + toDisplayString(q.action), 1);
                  }), 128))
                ]),
                healResult.value?.nextStep === "regen_storyboard_hq" || healResult.value?.primaryNextStep === "regen_storyboard_hq" ? (openBlock(), createElementBlock("p", _hoisted_13, toDisplayString(healResult.value?.userMessage || "分镜图构图不够好，视频会糊"), 1)) : createCommentVNode("", true),
                healResult.value?.nextStep === "regen_storyboard_hq" || healResult.value?.primaryNextStep === "regen_storyboard_hq" ? (openBlock(), createBlock(_component_t_button, {
                  key: 1,
                  size: "small",
                  theme: "primary",
                  loading: hqLoading.value,
                  onClick: regenStoryboardHq
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(hqRegenCtaLabel.value), 1)
                  ]),
                  _: 1
                }, 8, ["loading"])) : createCommentVNode("", true),
                healResult.value?.nextStep === "chat_repair" || healResult.value?.primaryNextStep === "chat_repair" || healResult.value?.missingSlots?.length ? (openBlock(), createElementBlock("div", _hoisted_14, [
                  createBaseVNode("p", null, toDisplayString(healResult.value?.userMessage || "须手改描写，禁止只 regen"), 1),
                  healResult.value?.missingSlots?.length ? (openBlock(), createElementBlock("div", _hoisted_15, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(healResult.value.missingSlots, (s) => {
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
                  createBaseVNode("p", _hoisted_16, toDisplayString(healResult.value?.ctaLabel || "手改VD") + " → 回分镜改 visualDescription 后重出", 1),
                  createBaseVNode("div", _hoisted_17, [
                    showEnhanceCta.value ? (openBlock(), createBlock(_component_t_button, {
                      key: 0,
                      size: "small",
                      theme: "primary",
                      loading: enhanceLoading.value,
                      onClick: applyLitEnhance
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(enhanceCtaLabel.value), 1)
                      ]),
                      _: 1
                    }, 8, ["loading"])) : createCommentVNode("", true),
                    createVNode(_component_t_button, {
                      size: "small",
                      theme: "default",
                      variant: "outline",
                      onClick: openStillIntentOps
                    }, {
                      default: withCtx(() => [..._cache[9] || (_cache[9] = [
                        createTextVNode("诊断 IRD", -1)
                      ])]),
                      _: 1
                    })
                  ])
                ])) : createCommentVNode("", true),
                healResult.value?.nextStep === "split_shot" || healResult.value?.primaryNextStep === "split_shot" ? (openBlock(), createElementBlock("p", _hoisted_18, toDisplayString(healResult.value?.userMessage || "须智能拆镜；请 Confirm / stillIntentOps"), 1)) : createCommentVNode("", true),
                healResult.value?.nextStep === "split_shot" || healResult.value?.primaryNextStep === "split_shot" ? (openBlock(), createBlock(_component_t_button, {
                  key: 4,
                  size: "small",
                  theme: "warning",
                  onClick: openStillIntentOps
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(healResult.value?.ctaLabel || "确认智能拆镜"), 1)
                  ]),
                  _: 1
                })) : createCommentVNode("", true),
                healResult.value?.nextStep === "raise_duration" || healResult.value?.primaryNextStep === "raise_duration" ? (openBlock(), createElementBlock("p", _hoisted_19, toDisplayString(healResult.value?.userMessage || (healResult.value?.suggestedValue != null ? `台词/情绪需要更长镜头，建议时长 ${healResult.value.suggestedValue}s` : "台词/情绪需要更长镜头")), 1)) : createCommentVNode("", true),
                (healResult.value?.nextStep === "raise_duration" || healResult.value?.primaryNextStep === "raise_duration") && healResult.value?.suggestedValue != null ? (openBlock(), createBlock(_component_t_button, {
                  key: 6,
                  size: "small",
                  theme: "primary",
                  loading: healing.value,
                  onClick: runHeal
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(healResult.value?.ctaLabel || "一键加长") + "（" + toDisplayString(healResult.value.suggestedValue) + "s） ", 1)
                  ]),
                  _: 1
                }, 8, ["loading"])) : createCommentVNode("", true),
                healResult.value?.nextStep === "human_review" || healResult.value?.primaryNextStep === "human_review" ? (openBlock(), createElementBlock("p", _hoisted_20, toDisplayString(healResult.value?.userMessage || "SVQ 未测维须人审（skip≠pass），禁止当 videoPass"), 1)) : createCommentVNode("", true),
                healResult.value?.nextStep === "human_review" || healResult.value?.primaryNextStep === "human_review" ? (openBlock(), createElementBlock("p", _hoisted_21, toDisplayString(healResult.value?.ctaLabel || "SVQ 未测维 · 人审"), 1)) : createCommentVNode("", true),
                healResult.value?.nextStep === "batch_still" ? (openBlock(), createElementBlock("p", _hoisted_22, " 资产行已就绪；一键自愈不代打厂商生图。请到资产页批量生静照后，再点「生成提示词」。 ")) : createCommentVNode("", true),
                createVNode(_component_t_button, {
                  size: "small",
                  theme: "primary",
                  loading: healing.value,
                  onClick: runHeal
                }, {
                  default: withCtx(() => [..._cache[10] || (_cache[10] = [
                    createTextVNode("补种 / 自愈关联", -1)
                  ])]),
                  _: 1
                }, 8, ["loading"]),
                createVNode(VideoIntentDebtBar, {
                  ok: videoIrd.value?.ok,
                  "primary-action": videoIrd.value?.primaryAction,
                  "primary-next-step": videoIrd.value?.primaryNextStep || healResult.value?.primaryNextStep,
                  "missing-slots": videoIrd.value?.missingSlots,
                  "cta-label": videoIrd.value?.ctaLabel || healResult.value?.ctaLabel,
                  findings: videoIrd.value?.findings || healStaleFindings.value,
                  explain: videoIrd.value?.userMessage || healResult.value?.userMessage,
                  diagnosing: videoIrdLoading.value,
                  applying: videoIrdApplying.value,
                  onDiagnose: openVideoIntentOps,
                  onConfirmApply: applyVideoIntentOps,
                  onHandEditVd: openVideoIntentOps,
                  onRecompilePrompt: _cache[1] || (_cache[1] = ($event) => emit("recompile-prompt")),
                  onHumanRejudgeVideo: applyVideoHumanRejudge,
                  onRegenPropStill: regenPropStillFromDrawer
                }, null, 8, ["ok", "primary-action", "primary-next-step", "missing-slots", "cta-label", "findings", "explain", "diagnosing", "applying"]),
                createVNode(_component_t_button, {
                  size: "small",
                  theme: "default",
                  variant: "outline",
                  loading: videoIrdLoading.value,
                  onClick: openVideoIntentOps
                }, {
                  default: withCtx(() => [..._cache[11] || (_cache[11] = [
                    createTextVNode(" 诊断视频 IRD ", -1)
                  ])]),
                  _: 1
                }, 8, ["loading"])
              ])) : createCommentVNode("", true),
              _cache[14] || (_cache[14] = createBaseVNode("section", { class: "healScope" }, [
                createBaseVNode("h4", null, "自愈范围"),
                createBaseVNode("p", { class: "muted" }, "可点修：场景码、主 CHAR/SCENE 种子与脚本关联、digit↔slug、静照队列准备"),
                createBaseVNode("p", { class: "muted" }, "仅告知 / 需人工：批量生静照（计费）、无 L6 衍生、导入 audioGap、双 cref不全")
              ], -1)),
              healResult.value ? (openBlock(), createElementBlock("section", _hoisted_23, [
                _cache[13] || (_cache[13] = createBaseVNode("h4", null, "自愈结果", -1)),
                createBaseVNode("pre", null, toDisplayString(healResultJson.value), 1)
              ])) : createCommentVNode("", true)
            ])) : createCommentVNode("", true)
          ]),
          _: 1
        }, 8, ["visible"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const ShotSpecDrawer = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-46ec2d2a"]]);

const _hoisted_1 = { class: "index fc" };
const _hoisted_2 = { class: "referenceImage" };
const _hoisted_3 = { class: "uploadBtn" };
const _hoisted_4 = { class: "modelSelect" };
const _hoisted_5 = { class: "generate ac" };
const _hoisted_6 = {
  key: 0,
  class: "prompt"
};
const _hoisted_7 = {
  key: 1,
  class: "repushBar"
};
const _hoisted_8 = { class: "promptData fc" };
const _hoisted_9 = { class: "video" };
const _hoisted_10 = { class: "track" };
const POLL_FAIL_MAX = 5;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const { goDesignStage } = useAdaptationNav();
    const { project } = storeToRefs(projectStore());
    const { flowData } = storeToRefs(useProductionAgentStore());
    const episodesId = inject("episodesId");
    const activeTrackIndex = ref(0);
    const shotSpecDrawerRef = ref(null);
    const burnVideoDebt = ref(null);
    const burnVideoIrdLoading = ref(false);
    const burnVideoIrdApplying = ref(false);
    const burnVideoDebtTitle = computed(
      () => burnVideoDebt.value?.code === "HEAL_THEN_BURN_LEDGER" ? "生成缺债台账" : "视频设计债 · 须 Confirm"
    );
    function mapHealNotesToLedger(notes, debtLedger) {
      if (Array.isArray(debtLedger) && debtLedger.length) return debtLedger;
      const seen = /* @__PURE__ */ new Set();
      const out = [];
      const push = (id, label) => {
        if (seen.has(id)) return;
        seen.add(id);
        out.push({ id, label });
      };
      for (const n of notes) {
        if (/stale/i.test(n)) push("prompt_stale", "契约 stale 已清");
        else if (/仓债|lipConfirm|importOk/i.test(n)) push("warehouse", "仓债已吸收");
        else if (/需完善|轨道契约/i.test(n)) push("track_contract", "轨契约债已吸收");
        else if (/静帧债|STILL-WEAK|污染|beatIsolation|contam/i.test(n))
          push("still_contam", "静帧弱/跨镜污染已吸收");
        else if (/I2V|visualPass|delivery/i.test(n)) push("i2v_ready", "I2V就绪债已吸收");
        else if (/接触交接|CONTACT/i.test(n)) push("contact_handoff", "接触交接债已吸收");
        else if (/首帧债|FIRSTFRAME/i.test(n)) push("firstframe", "首帧债已吸收");
        else if (/姿态|POSE/i.test(n)) push("pose_handoff", "姿态交接债已吸收");
        else if (/设计意图|fidelity/i.test(n)) push("fidelity", "设计意图未尽命中已降级");
        else push(`note_${out.length}`, n.length > 36 ? `${n.slice(0, 36)}…` : n);
      }
      return out;
    }
    const cacheStore = imageListCacheStore();
    const { getCache, setCache, removeCache, initCacheFromTrackList, warmUpUrls, resolveUrls, resolveUrlSync } = cacheStore;
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
    const promptByMode = ref({});
    const identitySlots = ref([]);
    const lastRePushPlan = ref([]);
    function captureBurnVideoDebt(details) {
      if (!details) return;
      const code = String(details.code ?? details.blockCode ?? "");
      const trigger = String(details.reverseTrigger ?? "");
      const step = String(details.primaryNextStep ?? details.nextStep ?? "");
      const msg = String(details.userMessage ?? details.message ?? "");
      const cta = String(details.ctaLabel ?? "");
      const stale = /VIDEO-PROMPT-STALE|video_prompt_stale/i.test(`${code} ${trigger} ${msg} ${cta}`);
      const notBurnReady = /TRACK_PROMPT_NOT_BURN_READY|需完善|智能修复|soft_patch/i.test(
        `${code} ${step} ${cta} ${msg}`
      );
      const looksVid = stale || notBurnReady || /DEX-VID|DUR-PAD|VP-THIN|vid_|PROMPT-FIDELITY/i.test(code) || /vid_|video_prompt|cam_mediate|prompt_fidelity/i.test(trigger) || step === "chat_repair" && /视频|运镜|伪台词|口型|beatDuration|DEX-VID|重编译|过期|智能修复/i.test(`${msg}${cta}`) || step === "human_review" || step === "soft_patch";
      if (!looksVid) return;
      burnVideoDebt.value = {
        ok: false,
        findings: Array.isArray(details.findings) ? details.findings : [
          {
            id: code || (stale ? "VIDEO-PROMPT-STALE" : notBurnReady ? "TRACK_PROMPT_NOT_BURN_READY" : "DEX-VID"),
            severity: "BLOCK",
            message: msg || cta || (stale ? "设计/对白已变，须重编译视频提示词" : "视频设计债")
          }
        ],
        primaryAction: details.primaryAction || (stale ? "none" : /cam|mediate/i.test(trigger + code) ? "confirm_cam_mediate" : "confirm_enhance"),
        confirmRequired: !stale,
        missingSlots: Array.isArray(details.missingSlots) ? details.missingSlots : [],
        ctaLabel: cta || (notBurnReady ? "智能修复" : "") || videoIrdCtaLabel({
          primaryNextStep: step,
          primaryAction: stale ? "none" : "confirm_enhance",
          reverseTrigger: trigger,
          code
        }),
        primaryNextStep: step || (notBurnReady ? "soft_patch" : "chat_repair"),
        userMessage: msg || void 0
      };
    }
    async function diagnoseBurnVideoIrd() {
      const pid = project.value?.id;
      if (pid == null) {
        window.$message?.warning?.("缺少项目 ID");
        return;
      }
      burnVideoIrdLoading.value = true;
      try {
        const { data } = await instance.post("/scriptAgent/videoIntentOps", {
          projectId: pid,
          action: "diagnose"
        });
        const body = data?.data ?? data;
        burnVideoDebt.value = isVideoIrdDebtMeta(body) || body.ok === false ? body : null;
        if (body?.ok) window.$message?.success?.(body.userMessage || "视频设计契约已过");
        else window.$message?.info?.(body?.ctaLabel || "视频设计债须 Confirm");
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.message || e?.message || "videoIntentOps 失败");
      } finally {
        burnVideoIrdLoading.value = false;
      }
    }
    async function applyBurnVideoIrd() {
      const pid = project.value?.id;
      if (pid == null) {
        window.$message?.warning?.("缺少项目 ID");
        return;
      }
      burnVideoIrdApplying.value = true;
      try {
        const data = await instance.post("/scriptAgent/videoIntentOps", {
          projectId: pid,
          action: "apply",
          forceApply: true
        });
        const body = data?.data ?? data;
        const again = body.after ?? body;
        burnVideoDebt.value = isVideoIrdDebtMeta(again ?? {}) || again?.ok === false ? again : null;
        toastAfterApplyExitGate(body, again?.userMessage || "视频设计债已清");
        if (designExitStillOpen(body)) {
          await diagnoseBurnVideoIrd();
        } else if (again?.ok) {
          burnVideoDebt.value = null;
        }
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.message || e?.message || "videoIntentOps apply 失败");
      } finally {
        burnVideoIrdApplying.value = false;
      }
    }
    async function applyVideoHumanRejudge() {
      const sid = primaryStoryboardId.value;
      const track = currentTrack.value;
      if (!sid || !track?.id) {
        window.$message?.warning?.("须绑定分镜轨道后再人审");
        return;
      }
      const latestVideo = track.videoList?.[track.videoList.length - 1];
      try {
        const data = await instance.post("/production/storyboard/humanRejudgeFidelity", {
          storyboardId: sid,
          modality: "video",
          trackId: track.id,
          videoId: latestVideo?.id,
          items: [{ id: "svq_unmeasured", pass: true, evidence: "operator_video_rejudge" }]
        });
        const body = data?.data ?? data;
        if (body?.videoPass === false) {
          window.$message?.warning?.(body?.userMessage || "成片人审未全过");
          return;
        }
        window.$message?.success?.(body?.userMessage || "成片人审通过（未测·可交付）");
        burnVideoDebt.value = null;
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.message || e?.message || "成片人审失败");
      }
    }
    async function regenPropStillFromBurn() {
      const sid = primaryStoryboardId.value;
      if (!sid) {
        window.$message?.warning?.("须绑定分镜");
        return;
      }
      try {
        await useProductionAgentStore().batchGenerateStoryboard([sid], true);
        window.$message.info("已排队重出带道具静照");
      } catch (e) {
        window.$message?.error?.(e?.response?.data?.data?.userMessage || e?.message || "重出静照失败");
      }
    }
    const primaryStoryboardId = computed(() => {
      const sb = imageList.value.find((i) => i.sources === "storyboard" && typeof i.id === "number");
      return sb?.id ?? null;
    });
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
        const selectedSbId = primaryStoryboardId.value ?? currentTrack.value?.medias?.find((m) => m.sources === "storyboard" && typeof m.id === "number")?.id ?? null;
        const isSingle = modelParmas.value.mode === "singleImage";
        const storyboardIds = isSingle ? selectedSbId != null ? [selectedSbId] : [] : void 0;
        const [touch, prod] = await Promise.all([
          preflightTouch({
            projectId: pid,
            scriptId: sid,
            script: flowData.value.script,
            scriptPlan: flowData.value.scriptPlan,
            storyboardTable: flowData.value.storyboardTable,
            storyboard: flowData.value.storyboard,
            mode: modelParmas.value.mode,
            storyboardIds
          }),
          preflightProduction({
            projectId: pid,
            scriptId: sid,
            tier: "T3",
            modality: "VID",
            storyboardIds: isSingle ? storyboardIds : void 0
          })
        ]);
        if (prod?.rePushPlan?.length) {
          lastRePushPlan.value = prod.rePushPlan;
        }
        if (!touch.allowed || prod?.blocked || prod?.blockGenerate) {
          const detectionRows = [
            ...prod?.detectionResults ?? [],
            ...prod?.failedChecks ?? [],
            ...prod?.closureReport?.detectionResults ?? []
          ];
          const firstBlock = detectionRows.find((c) => c && c.passed === false && (c.severity === "BLOCK" || !c.severity))?.message || touch.report?.issues?.find((i) => i.severity === "BLOCK")?.message || "";
          const blockId = detectionRows.find((c) => c && c.passed === false && (c.severity === "BLOCK" || !c.severity))?.id || "";
          const missingFrame = Boolean(agnesWarning.value);
          if (missingFrame) {
            window.$message.error(agnesWarning.value);
            return false;
          }
          window.$message.warning("预检有债，继续生成（详见下方台账）");
          if (firstBlock || blockId) {
            burnVideoDebt.value = {
              ok: true,
              code: "HEAL_THEN_BURN_LEDGER",
              findings: [
                {
                  id: blockId || "PREFLIGHT",
                  severity: "WARN",
                  message: firstBlock || "预检有债"
                }
              ],
              primaryAction: "none",
              missingSlots: [firstBlock || blockId || "预检债"].filter(Boolean).slice(0, 3),
              ctaLabel: "缺债台账",
              primaryNextStep: "soft_patch",
              userMessage: "预检有债已记入；不阻断生成"
            };
          }
        }
        return true;
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "preflight error";
        window.$message.error($t("workbench.production.rulePanel.preflightBlock") + `: ${msg}`);
        return false;
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
    function slotFingerprint(medias) {
      const list = medias ?? imageList.value;
      if (!list?.length) return "empty";
      return list.map((i) => `${i.sources ?? ""}:${i.id ?? ""}:${i.role ?? ""}`).join("|");
    }
    function promptMatrixKey(trackId, medias) {
      return `${trackId}::${slotFingerprint(medias)}`;
    }
    async function modeChange(newVal) {
      if (newVal == modelParmas.value.mode) return;
      const track = currentTrack.value;
      if (track?.id != null) {
        const key = promptMatrixKey(track.id, track.medias);
        if (!promptByMode.value[key]) promptByMode.value[key] = {};
        if (modelParmas.value.mode && track.prompt) {
          promptByMode.value[key][modelParmas.value.mode] = track.prompt;
        }
        const cached = promptByMode.value[key][newVal];
        if (cached) track.prompt = cached;
      }
      modelParmas.value.mode = newVal;
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
          const dialogueShot = imageList.value.some((i) => i.sources === "storyboard" && i.audioPrompt);
          const sbHasAudio = storyboardList.value.some((s) => {
            const mid = imageList.value.find((i) => i.sources === "storyboard" && i.id === s.id);
            return mid && (s.audioPrompt || s.hasDialogue);
          });
          const forceAudio = Boolean(dialogueShot || sbHasAudio || flowData.value.storyboard?.some((s) => s.audioPrompt));
          modelParmas.value.audio = forceAudio || data.audio === true || data.audio === "true" || data.audio == "optional";
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
        const sbItems = (data.storyboardList ?? []).map((s) => ({
          id: s.id,
          sources: "storyboard"
        }));
        await resolveUrls(sbItems);
        storyboardList.value = (data.storyboardList ?? []).map((s) => ({
          ...s,
          src: resolveUrlSync(s.id, "storyboard", s.src)
        }));
        data.trackList.forEach((track) => {
          if (track.id == null) return;
          const cached = getCache(pid, sid, track.id);
          const backend = track.medias ?? [];
          if (!cached?.length) {
            setCache(pid, sid, track.id, backend);
            return;
          }
          const backendSb = backend.filter((m) => (m.sources ?? "storyboard") === "storyboard");
          const backendAssets = backend.filter((m) => m.sources === "assets");
          const cachedAssets = cached.filter((m) => m.sources === "assets");
          const sbMerged = backendSb.map((b) => {
            const hit = cached.find((c) => c.id === b.id && (c.sources ?? "storyboard") === "storyboard");
            const src = b.src || resolveUrlSync(b.id, "storyboard", hit?.src) || hit?.src || "";
            return { ...hit, ...b, src, sources: "storyboard" };
          });
          const assetMerged = cachedAssets.length ? cachedAssets.map((c) => ({
            ...c,
            src: resolveUrlSync(c.id, "assets", c.src) || c.src
          })) : backendAssets;
          track.medias = [...sbMerged, ...assetMerged];
          setCache(pid, sid, track.id, track.medias);
        });
        trackList.value = [...data.trackList];
      }
      modelParmas.value.duration = clampDuration(data.trackList?.[activeTrackIndex.value]?.duration);
    }
    async function handlePromptBlur() {
      const trackId = trackList.value[activeTrackIndex.value]?.id;
      if (trackId == null) return;
      try {
        const res = await instance.post("/production/workbench/updateVideoPrompt", {
          id: trackId,
          prompt: currentTrack.value?.prompt
        });
        const body = res?.data ?? res;
        const track = currentTrack.value;
        if (track && body && typeof body === "object") {
          if (typeof body.state === "string" && body.state) {
            track.state = body.state;
          }
          if (typeof body.burnAllowed === "boolean") {
            track.burnAllowed = body.burnAllowed;
          }
          if (body.state === "需完善" || body.burnAllowed === false) {
            window.$message?.warning?.(
              String(body.userMessage || "手改提示词未达烧片标准，请点「智能修复」")
            );
          }
        }
      } catch (e) {
        window.$message?.error?.(e?.message || "保存提示词失败");
      }
    }
    async function genText() {
      const track = currentTrack.value;
      if (track.id == null || track.state === "生成中") return;
      let info = [];
      const currentTrackId = track.id;
      const rawMedias = track.medias ?? [];
      const frameMode = ["startEndRequired", "endFrameOptional", "startFrameOptional"];
      if (modelParmas.value.mode == "text") {
        info = rawMedias.map(({ id, sources }) => ({ id, sources }));
      } else {
        const preSliced = frameMode.includes(modelParmas.value.mode) ? rawMedias.slice(0, 2) : modelParmas.value.mode === "singleImage" ? rawMedias.slice(0, 1) : rawMedias;
        const filtered = preSliced.filter((item) => typeof item.id === "number" && !isNaN(item.id)).map(({ id, sources }, idx) => ({
          id,
          sources,
          role: frameMode.includes(modelParmas.value.mode) ? idx === 0 ? "start" : "end" : void 0
        }));
        if (frameMode.includes(modelParmas.value.mode)) info = filtered.slice(0, 2);
        else if (modelParmas.value.mode === "singleImage") info = filtered.slice(0, 1);
        else info = filtered;
      }
      track.state = "生成中";
      try {
        const modes = (modeOptions.value.mode ?? []).map((m) => Array.isArray(m) ? JSON.stringify(m) : String(m));
        const fillModes = modes.length ? modes : [modelParmas.value.mode].filter(Boolean);
        const { data: matrixData } = await instance.post("/production/workbench/fillModeMatrix", {
          projectId: project.value?.id,
          scriptId: episodesId.value,
          storyboardId: primaryStoryboardId.value ?? void 0,
          modes: fillModes,
          seedPrompt: track.prompt ?? "",
          model: modelParmas.value.model,
          info
        });
        const matrixPayload = matrixData?.data ?? matrixData;
        const byMode = matrixPayload?.promptByMode ?? {};
        const trackKey = promptMatrixKey(currentTrackId, rawMedias);
        promptByMode.value[trackKey] = {};
        for (const [mode, entry] of Object.entries(byMode)) {
          const p = typeof entry === "string" ? entry : entry?.prompt ?? "";
          if (p) promptByMode.value[trackKey][mode] = p;
        }
        const { data } = await instance.post("/production/workbench/generateVideoPrompt", {
          projectId: project.value?.id,
          trackId: currentTrackId,
          info,
          model: modelParmas.value.model,
          mode: modelParmas.value.mode
        });
        const payload = data?.data ?? data;
        const promptText = typeof payload === "string" ? payload : typeof payload?.prompt === "string" ? payload.prompt : typeof data === "string" ? data : "";
        track.prompt = promptText;
        if (promptText && burnVideoDebt.value?.findings?.some((f) => /VIDEO-PROMPT-STALE/i.test(String(f.id ?? "")))) {
          burnVideoDebt.value = null;
        }
        shotSpecDrawerRef.value?.clearVideoIrd?.();
        if (Array.isArray(payload?.identity)) {
          identitySlots.value = payload.identity;
        } else {
          identitySlots.value = parseIdentitySlots(track.prompt);
        }
        if (Array.isArray(payload?.autoHealed) && payload.autoHealed.length && payload?.burnAllowed !== false) {
          window.$message.success(
            `已自动修复：${payload.autoHealed.join("、")}${payload.duration != null ? `（时长 ${payload.duration}s）` : ""}`
          );
        }
        if (payload?.redLights?.length) {
          const blocks = payload.redLights.filter((r) => r.level === "BLOCK");
          if (blocks.length || payload?.burnAllowed === false) {
            const crt = typeof payload.chatRepairText === "string" ? payload.chatRepairText : "";
            const um = payload?.qualityDecision?.userMessage || payload?.userMessage || blocks.map((b) => b.message).join("；") || payload.qualityDecision?.reasons?.join("; ") || "挡烧";
            const suggested = payload?.qualityDecision?.suggestedValue ?? payload?.suggestedValue;
            const cta = payload?.qualityDecision?.ctaLabel || payload?.ctaLabel;
            if (crt.trim()) {
              try {
                await navigator.clipboard?.writeText(crt);
              } catch {
              }
              window.$message.error(
                `提示词未达烧片标准 — ${um}${suggested != null ? `（建议 ${suggested}）` : ""}${cta ? ` · ${cta}` : ""} — 已复制修复清单`
              );
            } else {
              window.$message.error(um);
            }
          }
        }
        if (modelParmas.value.mode) {
          promptByMode.value[trackKey][modelParmas.value.mode] = promptText;
        }
        const matrixCur = promptByMode.value[trackKey][modelParmas.value.mode];
        if (matrixCur && (!promptText || matrixCur.length > promptText.length)) {
          track.prompt = matrixCur;
        }
        if (!payload?.identity) identitySlots.value = parseIdentitySlots(track.prompt);
        if (payload?.burnAllowed === false) {
          track.state = "需完善";
        } else if (typeof payload?.state === "string" && payload.state) {
          track.state = payload.state;
        } else {
          track.state = "已完成";
        }
      } catch (e) {
        track.state = "生成失败";
        const details = e?.response?.data?.data ?? e?.data ?? e;
        captureBurnVideoDebt({
          ...typeof details === "object" && details ? details : {},
          code: details?.code,
          reverseTrigger: details?.reverseTrigger,
          primaryNextStep: details?.primaryNextStep ?? details?.nextStep,
          ctaLabel: details?.ctaLabel,
          userMessage: details?.userMessage || details?.message,
          findings: details?.findings,
          missingSlots: details?.missingSlots,
          primaryAction: details?.primaryAction
        });
        const plan = details?.rePushPlan ?? e?.response?.data?.data?.rePushPlan ?? e?.data?.rePushPlan ?? e?.rePushPlan;
        if (Array.isArray(plan) && plan.length) {
          lastRePushPlan.value = plan;
          window.$message.error(`提示词失败 · ${plan[0].trigger}→${plan[0].reverseTarget}`);
        } else {
          window.$message.error(e?.message ?? "提示词生成失败");
        }
      }
    }
    function parseIdentitySlots(prompt) {
      if (!prompt) return [];
      const out = [];
      const block = prompt.match(/identity\[([^\]]+)\]/i);
      if (block) {
        for (const part of block[1].split("|")) {
          const m = part.trim().match(/^(CHAR|SCENE|PROP)\s*:\s*([A-Z0-9-]+)/i);
          if (m) out.push({ kind: m[1].toUpperCase(), code: m[2].toUpperCase() });
        }
      }
      for (const m of prompt.matchAll(/--cref\s+([A-Z0-9,\s-]+)/gi)) {
        for (const c of m[1].split(/[,\s]+/)) {
          if (/^CHAR-/i.test(c)) out.push({ kind: "CHAR", code: c.toUpperCase() });
        }
      }
      for (const m of prompt.matchAll(/--sref\s+([A-Z0-9,\s-]+)/gi)) {
        for (const c of m[1].split(/[,\s]+/)) {
          if (/^(SCENE|PROP)-/i.test(c)) out.push({ kind: c.toUpperCase().startsWith("PROP") ? "PROP" : "SCENE", code: c.toUpperCase() });
        }
      }
      const seen = /* @__PURE__ */ new Set();
      return out.filter((s) => {
        if (seen.has(s.code)) return false;
        seen.add(s.code);
        return true;
      });
    }
    function onRePushJump(item) {
      goDesignStage(item.reverseTarget, item.trigger);
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
    async function runSmartRepairFromBurnCta() {
      const pid = project.value?.id;
      const sid = episodesId.value;
      if (pid == null || sid == null) {
        window.$message?.warning?.("缺少项目/剧集 ID");
        return;
      }
      try {
        const { selfHeal, preflightProduction: preflightProduction2 } = await __vitePreload(async () => { const { selfHeal, preflightProduction: preflightProduction2 } = await import('./ruleEngine-l0rUVBgW.js');return { selfHeal, preflightProduction: preflightProduction2 }},true?__vite__mapDeps([0,1,2,3,4,5,6,7]):void 0,import.meta.url);
        const heal = await selfHeal({
          projectId: pid,
          scriptId: sid,
          shotId: primaryStoryboardId.value ?? void 0,
          dryRun: false,
          apply: true,
          jobKind: "video"
        });
        const cdN = Array.isArray(heal?.cdHydrated) ? heal.cdHydrated.length : 0;
        if (cdN) window.$message?.success?.(`已同源写回 ${cdN} 个角色 L0.identity`);
        let virdToasted = false;
        try {
          await diagnoseBurnVideoIrd();
          if (burnVideoDebt.value && burnVideoDebt.value.ok === false) {
            await applyBurnVideoIrd();
            virdToasted = true;
          }
        } catch {
        }
        await preflightProduction2({ projectId: pid, scriptId: sid, tier: "T3" }).catch(() => null);
        await getGenerateData();
        if (!virdToasted) {
          window.$message?.info?.("智能修复已执行（未尽项将实现已降级，不阻断生成）");
        }
      } catch (e) {
        window.$message?.warning?.(e?.message || "智能修复部分完成，仍可继续生成");
      }
    }
    async function generateVideo() {
      if (!await runPreflight()) return;
      if (currentTrack.value?.state === "需完善" || currentTrack.value?.burnAllowed === false) {
        await runSmartRepairFromBurnCta();
      }
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
            const body = data?.data ?? data;
            const videoId = typeof body === "object" && body != null && "videoId" in body ? body.videoId : body;
            if (body && typeof body === "object" && (body.implementationDegraded || body.healThenBurn)) {
              window.$message.success($t("workbench.generate.generateStarted"));
              const notes = Array.isArray(body.notes) ? body.notes : [];
              const ledger = mapHealNotesToLedger(
                notes,
                body.debtLedger
              );
              if (ledger.length) {
                window.$message.info("缺债已记入下方");
                burnVideoDebt.value = {
                  ok: true,
                  code: "HEAL_THEN_BURN_LEDGER",
                  findings: ledger.map((l) => ({
                    id: l.id,
                    severity: "WARN",
                    message: l.label
                  })),
                  primaryAction: "none",
                  missingSlots: ledger.map((l) => l.label),
                  ctaLabel: "缺债台账",
                  primaryNextStep: "soft_patch",
                  userMessage: "已继续生成；下列缺债已吸收/记录（不阻断）"
                };
              } else {
                burnVideoDebt.value = null;
              }
            } else {
              window.$message.success($t("workbench.generate.generateStarted"));
              burnVideoDebt.value = null;
            }
            currentTrack.value.videoList.push({
              id: videoId,
              state: "生成中",
              src: ""
            });
          } catch (e) {
            const details = e?.response?.data?.data ?? e?.data ?? e;
            const plan = details?.rePushPlan;
            const qd = details?.qualityDecision;
            const hard = Array.isArray(details?.hardMisses) ? details.hardMisses.filter(Boolean).slice(0, 4) : [];
            const umRaw = details?.userMessage || qd?.userMessage || details?.message;
            const um = hard.length && !/硬债/.test(String(umRaw ?? "")) ? `${umRaw || "首帧硬债"}（${hard.join(",")}）` : umRaw;
            const suggested = details?.suggestedValue ?? qd?.suggestedValue;
            const cta = details?.ctaLabel || qd?.ctaLabel;
            const crt = typeof details?.chatRepairText === "string" ? details.chatRepairText : typeof details?.exportGate?.chatRepairText === "string" ? details.exportGate.chatRepairText : "";
            captureBurnVideoDebt({
              ...typeof details === "object" && details ? details : {},
              code: details?.code ?? qd?.code,
              reverseTrigger: details?.reverseTrigger ?? qd?.reverseTrigger,
              primaryNextStep: details?.primaryNextStep ?? details?.nextStep ?? qd?.nextStep,
              ctaLabel: cta,
              userMessage: um,
              findings: details?.findings,
              missingSlots: details?.missingSlots,
              primaryAction: details?.primaryAction
            });
            if (um && (suggested != null || cta)) {
              if (crt.trim()) {
                try {
                  await navigator.clipboard?.writeText(crt);
                } catch {
                }
              }
              window.$message.error(
                `${um}${suggested != null ? `（建议 ${suggested}）` : ""}${cta ? ` · ${cta}` : ""}${crt.trim() ? " — 已复制修复清单" : ""}`
              );
            } else if (crt.trim()) {
              try {
                await navigator.clipboard?.writeText(crt);
                window.$message.error("质量决策挡烧 — 已复制闭环修复清单，请回推 Chat");
              } catch {
                window.$message.error(details?.message || e?.message || "质量决策挡烧");
              }
            } else if (Array.isArray(plan) && plan.length) {
              lastRePushPlan.value = plan;
              window.$message.error(`生成失败 · ${plan[0].trigger}→${plan[0].reverseTarget}`);
            } else {
              window.$message.error(details?.message || e?.message || "视频发起生成请求失败");
            }
          } finally {
          }
        },
        onCancel: () => dlg.destroy()
      });
    }
    let pollTimer = null;
    let promptPollTimer = null;
    let videoPollFails = 0;
    let promptPollFails = 0;
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
      try {
        const { data } = await instance.post("/production/workbench/checkVideoStateList", {
          projectId: project.value?.id,
          scriptId: episodesId.value ?? 0,
          videoIds: hasGenerateVideoIds.value
        });
        videoPollFails = 0;
        if (data && data.length) {
          data.forEach(
            (item) => {
              for (const track of trackList.value) {
                const findData = track.videoList.find((i) => i.id == item.id);
                if (findData) {
                  const prev = findData.state;
                  findData.state = item.state;
                  findData.src = item?.src ?? "";
                  findData.errorReason = item?.errorReason ?? "";
                  if (item.state === "生成失败" && prev !== "生成失败") {
                    if (item.primaryNextStep || item.userMessage || item.code || item.ctaLabel) {
                      captureBurnVideoDebt({
                        code: item.code,
                        primaryNextStep: item.primaryNextStep,
                        userMessage: item.userMessage || item.message,
                        ctaLabel: item.ctaLabel,
                        findings: item.findings,
                        missingSlots: item.missingSlots,
                        primaryAction: item.primaryAction,
                        unknownDims: item.unknownDims
                      });
                    } else {
                      ingestVideoErrorReason(item.errorReason);
                    }
                  }
                  if (item.state === "已完成") burnVideoDebt.value = null;
                  break;
                }
              }
            }
          );
        }
      } catch {
        videoPollFails++;
        if (videoPollFails >= POLL_FAIL_MAX) {
          stopPoll();
          window.$message?.warning?.($t("workbench.generate.pollingFailed"));
        }
      }
    }
    function ingestVideoErrorReason(raw) {
      if (!raw) return;
      let parsed = null;
      try {
        parsed = typeof raw === "string" && raw.trim().startsWith("{") ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }
      if (parsed) {
        const pb = parsed.postBurn ?? void 0;
        const flat = {
          ...parsed,
          ...pb ?? {},
          code: parsed.code ?? pb?.code,
          reverseTrigger: parsed.reverseTrigger,
          primaryNextStep: parsed.primaryNextStep ?? pb?.primaryNextStep ?? parsed.nextStep,
          ctaLabel: parsed.ctaLabel,
          userMessage: parsed.userMessage || pb?.userMessage || parsed.message,
          findings: parsed.findings || pb?.findings,
          missingSlots: parsed.missingSlots,
          primaryAction: parsed.primaryAction,
          unknownDims: parsed.unknownDims || pb?.unknownDims
        };
        captureBurnVideoDebt(flat);
        const um = String(flat.userMessage || "");
        const cta = String(flat.ctaLabel || "");
        if (um || cta) {
          window.$message?.error?.(`${um}${cta ? ` · ${cta}` : ""}`);
        }
      } else if (/DEX-VID|视频设计|伪台词|运镜|human_review|SVQ|VIDEO-PROMPT-STALE|重编译|提示词.*过期/i.test(raw)) {
        const stale = /VIDEO-PROMPT-STALE|video_prompt_stale|重编译|提示词.*过期/i.test(raw);
        captureBurnVideoDebt({
          code: stale ? "VIDEO-PROMPT-STALE" : "DEX-VID",
          reverseTrigger: stale ? "video_prompt_stale" : void 0,
          primaryNextStep: /human_review|SVQ/i.test(raw) ? "human_review" : "chat_repair",
          userMessage: raw,
          ctaLabel: /human_review|SVQ/i.test(raw) ? "SVQ 未测维 · 人审" : stale ? "重编译视频提示词" : "诊断视频 IRD"
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
      try {
        const { data } = await instance.post("/production/workbench/checkVideoPrompt", {
          projectId: project.value?.id,
          scriptId: episodesId.value ?? 0,
          trackIds: hasGeneratePromptIds.value
        });
        promptPollFails = 0;
        if (data && data.length) {
          data.forEach((item) => {
            const findData = trackList.value.find((t) => t.id == item.id);
            if (findData) {
              findData.state = item.state;
              findData.prompt = item?.prompt ?? "";
              findData.reason = item?.reason ?? "";
              if (item.state === "生成失败") {
                ingestVideoErrorReason(item.reason);
                window.$message.error(`提示词生成失败，${item.reason ?? "未知原因"}`);
              } else if (item.state === "需完善" || item.burnAllowed === false) {
                window.$message.warning("提示词已落库但不可烧片，请点「智能修复」");
              }
            }
          });
        }
      } catch {
        promptPollFails++;
        if (promptPollFails >= POLL_FAIL_MAX) {
          stopPromptPoll();
          window.$message?.warning?.($t("workbench.generate.pollingFailed"));
        }
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
      const _component_t_tag = Tag;
      const _component_t_card = Card;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createVNode(imageSelect, {
              mode: unref(modelParmas).mode,
              modelValue: imageList.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => imageList.value = $event),
              "storyboard-list": unref(storyboardList)
            }, null, 8, ["mode", "modelValue", "storyboard-list"])
          ])
        ]),
        createBaseVNode("div", _hoisted_4, [
          agnesWarning.value ? (openBlock(), createBlock(_component_t_alert, {
            key: 0,
            theme: "warning",
            message: agnesWarning.value,
            close: ""
          }, null, 8, ["message"])) : createCommentVNode("", true),
          createVNode(modeMenu, {
            modelValue: unref(modelParmas),
            "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(modelParmas) ? modelParmas.value = $event : null),
            modeOptions: unref(modeOptions),
            trackId: currentTrack.value?.id,
            modeList: modeList.value,
            onModeChange: modeChange
          }, null, 8, ["modelValue", "modeOptions", "trackId", "modeList"])
        ]),
        createBaseVNode("div", _hoisted_5, [
          currentTrack.value ? (openBlock(), createElementBlock("div", _hoisted_6, [
            createVNode(_component_t_card, {
              title: "#" + (unref(activeTrackIndex) + 1) + _ctx.$t("workbench.generate.generateText"),
              "header-bordered": "",
              class: "videoPrompt"
            }, {
              actions: withCtx(() => [
                createVNode(_component_t_button, {
                  size: "small",
                  class: "genTextbtn",
                  loading: currentTrack.value.state == "生成中",
                  onClick: genText
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("workbench.generate.generateText")), 1)
                  ]),
                  _: 1
                }, 8, ["loading"]),
                currentTrack.value.state === "需完善" ? (openBlock(), createBlock(_component_t_tag, {
                  key: 0,
                  size: "small",
                  theme: "warning",
                  variant: "light",
                  class: "ml-5"
                }, {
                  default: withCtx(() => [..._cache[7] || (_cache[7] = [
                    createTextVNode("智能修复后可生成", -1)
                  ])]),
                  _: 1
                })) : createCommentVNode("", true)
              ]),
              default: withCtx(() => [
                createVNode(IdentitySlotChips, { slots: unref(identitySlots) }, null, 8, ["slots"]),
                createVNode(ShotSpecDrawer, {
                  ref_key: "shotSpecDrawerRef",
                  ref: shotSpecDrawerRef,
                  "project-id": unref(project)?.id,
                  "script-id": unref(episodesId),
                  "storyboard-id": primaryStoryboardId.value,
                  prompt: currentTrack.value?.prompt,
                  mode: unref(modelParmas).mode,
                  duration: unref(modelParmas).duration,
                  audio: unref(modelParmas).audio,
                  resolution: unref(modelParmas).resolution,
                  onIdentity: _cache[2] || (_cache[2] = (slots) => identitySlots.value = slots),
                  onRecompilePrompt: genText
                }, null, 8, ["project-id", "script-id", "storyboard-id", "prompt", "mode", "duration", "audio", "resolution"]),
                unref(burnVideoDebt) ? (openBlock(), createBlock(VideoIntentDebtBar, {
                  key: 0,
                  title: burnVideoDebtTitle.value,
                  ok: unref(burnVideoDebt).ok,
                  "primary-action": unref(burnVideoDebt).primaryAction,
                  "primary-next-step": unref(burnVideoDebt).primaryNextStep,
                  "missing-slots": unref(burnVideoDebt).missingSlots,
                  "cta-label": unref(burnVideoDebt).ctaLabel,
                  findings: unref(burnVideoDebt).findings,
                  explain: unref(burnVideoDebt).userMessage,
                  code: unref(burnVideoDebt).code,
                  diagnosing: unref(burnVideoIrdLoading),
                  applying: unref(burnVideoIrdApplying),
                  recompiling: currentTrack.value?.state == "生成中",
                  onDiagnose: diagnoseBurnVideoIrd,
                  onConfirmApply: applyBurnVideoIrd,
                  onHandEditVd: diagnoseBurnVideoIrd,
                  onRecompilePrompt: genText,
                  onHumanRejudgeVideo: applyVideoHumanRejudge,
                  onRegenPropStill: regenPropStillFromBurn
                }, null, 8, ["title", "ok", "primary-action", "primary-next-step", "missing-slots", "cta-label", "findings", "explain", "code", "diagnosing", "applying", "recompiling"])) : createCommentVNode("", true),
                unref(lastRePushPlan).length ? (openBlock(), createElementBlock("div", _hoisted_7, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(lastRePushPlan), (p, i) => {
                    return openBlock(), createElementBlock("div", {
                      key: i,
                      class: "repushItem"
                    }, [
                      createBaseVNode("span", null, toDisplayString(p.trigger) + " → " + toDisplayString(p.reverseTarget), 1),
                      createVNode(_component_t_button, {
                        size: "small",
                        variant: "outline",
                        onClick: ($event) => onRePushJump(p)
                      }, {
                        default: withCtx(() => [..._cache[8] || (_cache[8] = [
                          createTextVNode("回推设计", -1)
                        ])]),
                        _: 1
                      }, 8, ["onClick"])
                    ]);
                  }), 128))
                ])) : createCommentVNode("", true),
                createBaseVNode("div", _hoisted_8, [
                  createBaseVNode("div", {
                    class: "promptInput",
                    onFocusout: handlePromptBlur
                  }, [
                    createVNode(promptEditor, {
                      modelValue: currentTrack.value.prompt,
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => currentTrack.value.prompt = $event),
                      references: references.value,
                      placeholder: _ctx.$t("workbench.generate.promptPlaceholder")
                    }, null, 8, ["modelValue", "references", "placeholder"])
                  ], 32)
                ])
              ]),
              _: 1
            }, 8, ["title"])
          ])) : createCommentVNode("", true),
          createBaseVNode("div", _hoisted_9, [
            currentTrack.value ? (openBlock(), createBlock(videoCard, {
              key: 0,
              "active-track-index": unref(activeTrackIndex),
              "current-track": currentTrack.value,
              "onUpdate:currentTrack": _cache[4] || (_cache[4] = ($event) => currentTrack.value = $event),
              onRefresh: getGenerateData,
              onGenerate: generateVideo,
              onSmartRepair: runSmartRepairFromBurnCta
            }, null, 8, ["active-track-index", "current-track"])) : createCommentVNode("", true)
          ])
        ]),
        createBaseVNode("div", _hoisted_10, [
          createVNode(newTrack, {
            activeTrackIndex: unref(activeTrackIndex),
            "onUpdate:activeTrackIndex": _cache[5] || (_cache[5] = ($event) => isRef(activeTrackIndex) ? activeTrackIndex.value = $event : null),
            modelValue: unref(trackList),
            "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => isRef(trackList) ? trackList.value = $event : null),
            "image-list": imageList.value,
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

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1f743016"]]);

export { index as default };

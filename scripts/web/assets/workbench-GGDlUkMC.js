const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./index-Blo-Vgxe.js","./vue-vendor-Byo5TD6r.js","./dayjs-CuToSpIM.js","./axios-mQi6SvTz.js","./index-Iu-bOXAU.js","./markdown-CDQfeHxT.js","./tdesign-CfL1pweZ.js","./i18n-C05S5xzz.js","./project-Cze3Ugcr.js","./imageListCache-Dk0HrcCP.js","./mammoth-qyhJBxxk.js","./imageTools-CN96Q-l2.js","./assetsCheck-DSqF5qTG.js","./index-C1Dv_0vc.js","./modelSelect-tooHnLA2.js","./providersLogo-BCbaFq8_.js","./promptEditor-CPGnB_Cj.js","./icons-B-vHNScY.js","./useAdaptationNav-CN9vydeI.js","./ruleEngine-Dvli1DFa.js","./index-BX9ljLKI.js","./clip-track-CyE6Hnlt.js","./webav-B6CGWgg2.js","./splitpanes-BtsLJCt3.js"])))=>i.map(i=>d[i]);
import { _ as __vitePreload } from './markdown-CDQfeHxT.js';
import { i as instance } from './axios-mQi6SvTz.js';
import { l as defineComponent, bM as storeToRefs, a as inject, o as onMounted, b as onUnmounted, bW as useEventListener, w as watch, b2 as resolveComponent, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, j as createVNode, b0 as toDisplayString, aM as withCtx, aS as createBlock, a_ as resolveDynamicComponent, F as Fragment, aP as renderList, bH as withModifiers, aQ as normalizeStyle, aU as normalizeClass, a$ as createTextVNode, aT as createCommentVNode, a3 as TransitionGroup, a1 as unref, bZ as lo, r as ref, c as computed, n as nextTick, bU as useModel, av as isRef, bS as defineAsyncComponent, bV as mergeModels } from './vue-vendor-Byo5TD6r.js';
import { J as JSZip } from './mammoth-qyhJBxxk.js';
import { p as projectStore } from './project-Cze3Ugcr.js';
import { B as Button, a8 as Image, X as Tag, a3 as Checkbox, W as DialogPlugin, E as Dialog, n as Tooltip, L as Loading, Y as Card } from './tdesign-CfL1pweZ.js';
import { _ as _export_sfc } from './index-Iu-bOXAU.js';
import { _ as _r } from './clip-track-CyE6Hnlt.js';
import { c as _sfc_main$f, P as Position } from './vueflow-RSWomYB5.js';
import './dayjs-CuToSpIM.js';
import './i18n-C05S5xzz.js';

const _hoisted_1$2 = { class: "previewContainer" };
const _hoisted_2$2 = { class: "mainContent" };
const _hoisted_3$2 = { class: "previewArea" };
const _hoisted_4$2 = { class: "videoWrapper" };
const _hoisted_5$1 = ["src", "alt"];
const _hoisted_6 = {
  key: 1,
  class: "placeholderImage"
};
const _hoisted_7 = { class: "playerControls" };
const _hoisted_8 = { class: "controlButtons" };
const _hoisted_9 = { class: "progressArea" };
const _hoisted_10 = { class: "timeLabel" };
const _hoisted_11 = { class: "progressTrack" };
const _hoisted_12 = ["onClick"];
const _hoisted_13 = { class: "timeLabel" };
const _hoisted_14 = { class: "infoPanel" };
const _hoisted_15 = { class: "infoSection" };
const _hoisted_16 = { class: "sectionTitle" };
const _hoisted_17 = { class: "sectionContent" };
const _hoisted_18 = { class: "infoSection" };
const _hoisted_19 = { class: "sectionTitle" };
const _hoisted_20 = { class: "sectionContent" };
const _hoisted_21 = { class: "infoSection" };
const _hoisted_22 = { class: "sectionTitle" };
const _hoisted_23 = { class: "characterList" };
const _hoisted_24 = {
  key: 0,
  class: "noCharacter"
};
const _hoisted_25 = { class: "infoSection" };
const _hoisted_26 = { class: "sectionTitle" };
const _hoisted_27 = { class: "shootingTips" };
const _hoisted_28 = {
  key: 0,
  class: "tipItem"
};
const _hoisted_29 = { class: "tipLabel" };
const _hoisted_30 = { class: "tipValue" };
const _hoisted_31 = { class: "shotListArea" };
const _hoisted_32 = { class: "shotListHeader" };
const _hoisted_33 = { class: "headerLeft" };
const _hoisted_34 = ["onClick"];
const _hoisted_35 = { class: "shotImageWrapper" };
const _hoisted_36 = ["src", "alt"];
const _hoisted_37 = {
  key: 1,
  class: "shotPlaceholder"
};
const TICK_INTERVAL = 50;
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "preview",
  setup(__props) {
    const { project } = storeToRefs(projectStore());
    const episodesId = inject("episodesId");
    const shotList = ref([]);
    onMounted(() => {
      getShotList();
    });
    async function getShotList() {
      const { data } = await instance.post("/production/getStoryboardData", {
        projectId: project.value?.id,
        scriptId: episodesId.value
      });
      shotList.value = data;
    }
    const currentShot = computed(() => shotList.value[currentShotIndex.value] || null);
    const currentCharacters = computed(() => currentShot.value?.characters || []);
    const currentShotIndex = ref(0);
    const selectAll = ref(false);
    const shotListWrapperRef = ref();
    const progressBarRef = ref();
    const isDragging = ref(false);
    const isPlaying = ref(false);
    const currentElapsed = ref(0);
    let playTimer = null;
    const initialOrder = shotList.value.map((shot) => shot.id);
    const currentShotDuration = computed(() => currentShot.value?.duration ?? 3);
    const isFirstShot = computed(() => currentShotIndex.value === 0);
    const isLastShot = computed(() => currentShotIndex.value === shotList.value.length - 1);
    const totalDuration = computed(() => shotList.value.reduce((sum, s) => sum + (s.duration ?? 3), 0));
    const totalProgress = computed(() => {
      const elapsed = getCumulativeDuration(currentShotIndex.value) + currentElapsed.value;
      return Math.min(elapsed / totalDuration.value * 100, 100);
    });
    const promptTips = computed(() => [
      { label: $t("workbench.production.preview.sceneDescription"), value: currentShot.value?.description },
      // { label: "运镜方式", value: currentShot.value?.camera != null ? String(currentShot.value.camera) : undefined },
      { label: $t("workbench.production.preview.promptLabel"), value: currentShot.value?.prompt }
    ]);
    const getDuration = (index) => shotList.value[index]?.duration ?? 3;
    const getCumulativeDuration = (index) => {
      let sum = 0;
      for (let i = 0; i < index; i++) sum += getDuration(i);
      return sum;
    };
    const getSegmentWidth = (index) => getDuration(index) / totalDuration.value * 100;
    const getSegmentLeft = (index) => getCumulativeDuration(index) / totalDuration.value * 100;
    const formatTime = (seconds) => {
      const s = Math.floor(seconds);
      return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    };
    const stopPlay = () => {
      if (playTimer) {
        clearInterval(playTimer);
        playTimer = null;
      }
      isPlaying.value = false;
    };
    const startPlay = () => {
      if (playTimer) return;
      isPlaying.value = true;
      playTimer = setInterval(() => {
        currentElapsed.value += TICK_INTERVAL / 1e3;
        if (currentElapsed.value >= currentShotDuration.value) {
          if (!isLastShot.value) {
            currentElapsed.value = 0;
            currentShotIndex.value++;
            scrollToCurrentShot();
          } else {
            currentElapsed.value = currentShotDuration.value;
            stopPlay();
          }
        }
      }, TICK_INTERVAL);
    };
    const togglePlay = () => {
      if (isPlaying.value) return stopPlay();
      if (isLastShot.value && currentElapsed.value >= currentShotDuration.value) {
        currentShotIndex.value = 0;
        currentElapsed.value = 0;
      }
      startPlay();
    };
    onUnmounted(stopPlay);
    const goToShot = (index, shouldStopPlay = true) => {
      if (shouldStopPlay) stopPlay();
      currentShotIndex.value = index;
      currentElapsed.value = 0;
      scrollToCurrentShot();
    };
    const prevShot = () => {
      if (!isFirstShot.value) goToShot(currentShotIndex.value - 1);
    };
    const nextShot = () => {
      if (!isLastShot.value) goToShot(currentShotIndex.value + 1);
    };
    const jumpToShot = (index) => goToShot(index);
    const selectShot = (index) => goToShot(index);
    const onProgressMouseDown = (e) => {
      const bar = progressBarRef.value;
      if (!bar) return;
      stopPlay();
      const seekTo = (event) => {
        const rect = bar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const targetTime = ratio * totalDuration.value;
        let cumulative = 0;
        for (let i = 0; i < shotList.value.length; i++) {
          const dur = getDuration(i);
          if (cumulative + dur > targetTime) {
            currentShotIndex.value = i;
            currentElapsed.value = targetTime - cumulative;
            scrollToCurrentShot();
            return;
          }
          cumulative += dur;
        }
        currentShotIndex.value = shotList.value.length - 1;
        currentElapsed.value = getDuration(shotList.value.length - 1);
      };
      seekTo(e);
      const onMouseUp = () => {
        document.removeEventListener("mousemove", seekTo);
        document.removeEventListener("mouseup", onMouseUp);
      };
      document.addEventListener("mousemove", seekTo);
      document.addEventListener("mouseup", onMouseUp);
    };
    const scrollToCurrentShot = () => {
      nextTick(() => {
        const items = shotListWrapperRef.value?.querySelectorAll(".shotItem");
        items?.[currentShotIndex.value]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      });
    };
    const handleSelectAll = (checked) => {
      const isChecked = Array.isArray(checked) ? checked.length > 0 : checked;
      shotList.value.forEach((shot) => shot.selected = isChecked);
    };
    useEventListener(document, "keydown", (e) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        const data = shotList.value[currentShotIndex.value];
        if (data) {
          data.selected = !data.selected;
        }
      }
    });
    const confirmRestoreSort = () => {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.production.preview.restoreSort"),
        body: $t("workbench.production.preview.restoreSortConfirm"),
        onConfirm: () => {
          shotList.value.sort((a, b) => initialOrder.indexOf(a.id) - initialOrder.indexOf(b.id));
          dialog.destroy();
        },
        onClose: () => dialog.destroy()
      });
    };
    watch(
      () => shotList.value.map((s) => s.selected),
      (selections) => {
        selectAll.value = selections.length > 0 && selections.every(Boolean);
      },
      { deep: true }
    );
    const onDragEnd = () => nextTick(() => isDragging.value = false);
    async function exportImage() {
      const selectedShots = shotList.value.filter((shot) => shot.selected).map((shot) => ({
        id: shot.id,
        filePath: shot.filePath?.split("?")[0] || shot.filePath
      }));
      if (selectedShots.length === 0) {
        DialogPlugin.alert({
          header: $t("workbench.production.preview.tip"),
          body: $t("workbench.production.preview.selectAtLeastOne")
        });
        return;
      }
      const zip = new JSZip();
      const downloadPromises = selectedShots.map(async (shot) => {
        try {
          if (!shot.filePath) return;
          const response = await fetch(shot.filePath);
          const blob = await response.blob();
          zip.file(`分镜${shot.id}.${getFileExtension(shot.filePath)}`, blob);
        } catch (error) {
          console.error(`图片下载失败: ${shot.filePath}`, error);
        }
      });
      await Promise.all(downloadPromises);
      zip.generateAsync({ type: "blob" }).then((content) => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = "分镜压缩包.zip";
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 5e3);
      });
    }
    function getFileExtension(path) {
      const match = path.match(/\.(\w+)(?:\?|$)/);
      return match ? match[1] : "jpg";
    }
    return (_ctx, _cache) => {
      const _component_i_pic = resolveComponent("i-pic");
      const _component_i_go_start = resolveComponent("i-go-start");
      const _component_t_button = Button;
      const _component_i_go_end = resolveComponent("i-go-end");
      const _component_t_image = Image;
      const _component_t_tag = Tag;
      const _component_t_checkbox = Checkbox;
      const _component_i_undo = resolveComponent("i-undo");
      const _component_i_download = resolveComponent("i-download");
      return openBlock(), createElementBlock("div", _hoisted_1$2, [
        createBaseVNode("div", _hoisted_2$2, [
          createBaseVNode("div", _hoisted_3$2, [
            createBaseVNode("div", _hoisted_4$2, [
              currentShot.value?.filePath ? (openBlock(), createElementBlock("img", {
                key: 0,
                src: currentShot.value.filePath,
                alt: currentShot.value.description,
                class: "previewImage"
              }, null, 8, _hoisted_5$1)) : (openBlock(), createElementBlock("div", _hoisted_6, [
                createVNode(_component_i_pic, {
                  theme: "outline",
                  size: "48",
                  fill: "#999"
                }),
                createBaseVNode("span", null, toDisplayString(_ctx.$t("workbench.production.preview.noImage")), 1)
              ]))
            ]),
            createBaseVNode("div", _hoisted_7, [
              createBaseVNode("div", _hoisted_8, [
                createVNode(_component_t_button, {
                  theme: "default",
                  variant: "text",
                  size: "small",
                  shape: "circle",
                  onClick: prevShot,
                  disabled: isFirstShot.value
                }, {
                  icon: withCtx(() => [
                    createVNode(_component_i_go_start, {
                      theme: "outline",
                      size: "18"
                    })
                  ]),
                  _: 1
                }, 8, ["disabled"]),
                createVNode(_component_t_button, {
                  theme: "primary",
                  variant: "text",
                  size: "medium",
                  shape: "circle",
                  onClick: togglePlay
                }, {
                  icon: withCtx(() => [
                    (openBlock(), createBlock(resolveDynamicComponent(isPlaying.value ? "i-pause" : "i-play"), {
                      theme: "outline",
                      size: "22"
                    }))
                  ]),
                  _: 1
                }),
                createVNode(_component_t_button, {
                  theme: "default",
                  variant: "text",
                  size: "small",
                  shape: "circle",
                  onClick: nextShot,
                  disabled: isLastShot.value
                }, {
                  icon: withCtx(() => [
                    createVNode(_component_i_go_end, {
                      theme: "outline",
                      size: "18"
                    })
                  ]),
                  _: 1
                }, 8, ["disabled"])
              ]),
              createBaseVNode("div", _hoisted_9, [
                createBaseVNode("span", _hoisted_10, toDisplayString(formatTime(currentElapsed.value)), 1),
                createBaseVNode("div", {
                  class: "progressBarWrapper",
                  ref_key: "progressBarRef",
                  ref: progressBarRef,
                  onMousedown: onProgressMouseDown
                }, [
                  createBaseVNode("div", _hoisted_11, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(shotList.value, (shot, index) => {
                      return openBlock(), createElementBlock("div", {
                        key: "seg-" + shot.id,
                        class: normalizeClass(["progressSegment", { active: index === currentShotIndex.value, completed: index < currentShotIndex.value }]),
                        style: normalizeStyle({ width: getSegmentWidth(index) + "%", left: getSegmentLeft(index) + "%" }),
                        onClick: withModifiers(($event) => jumpToShot(index), ["stop"])
                      }, null, 14, _hoisted_12);
                    }), 128)),
                    (openBlock(true), createElementBlock(Fragment, null, renderList(shotList.value.slice(0, -1), (_, index) => {
                      return openBlock(), createElementBlock("div", {
                        key: "div-" + index,
                        class: "segmentDivider",
                        style: normalizeStyle({ left: getSegmentLeft(index + 1) + "%" })
                      }, null, 4);
                    }), 128)),
                    createBaseVNode("div", {
                      class: "progressFill",
                      style: normalizeStyle({ width: totalProgress.value + "%" })
                    }, null, 4),
                    createBaseVNode("div", {
                      class: "progressHandle",
                      style: normalizeStyle({ left: totalProgress.value + "%" })
                    }, null, 4)
                  ])
                ], 544),
                createBaseVNode("span", _hoisted_13, toDisplayString(formatTime(totalDuration.value)), 1)
              ])
            ])
          ]),
          createBaseVNode("div", _hoisted_14, [
            createBaseVNode("div", _hoisted_15, [
              createBaseVNode("div", _hoisted_16, [
                _cache[5] || (_cache[5] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.preview.storyboardDesc")), 1)
              ]),
              createBaseVNode("div", _hoisted_17, " 【" + toDisplayString(_ctx.$t("workbench.production.preview.serialNumber")) + " " + toDisplayString(currentShotIndex.value + 1) + "】" + toDisplayString(currentShot.value?.description || _ctx.$t("workbench.production.preview.noDescription")), 1)
            ]),
            createBaseVNode("div", _hoisted_18, [
              createBaseVNode("div", _hoisted_19, [
                _cache[6] || (_cache[6] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.preview.duration")), 1)
              ]),
              createBaseVNode("div", _hoisted_20, toDisplayString(currentShot.value?.duration != null ? currentShot.value.duration + " " + _ctx.$t("workbench.production.preview.seconds") : "3 " + _ctx.$t("workbench.production.preview.seconds")), 1)
            ]),
            createBaseVNode("div", _hoisted_21, [
              createBaseVNode("div", _hoisted_22, [
                _cache[7] || (_cache[7] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.preview.relatedAssets")), 1)
              ]),
              createBaseVNode("div", _hoisted_23, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(currentCharacters.value, (char, index) => {
                  return openBlock(), createElementBlock("div", {
                    key: index,
                    class: "characterItem"
                  }, [
                    createVNode(_component_t_image, {
                      src: char.avatar,
                      fit: "cover",
                      class: "characterAvatar",
                      style: { width: "80px", height: "80px", borderRadius: "8px" }
                    }, null, 8, ["src"]),
                    createVNode(_component_t_tag, null, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(char.name) + "（" + toDisplayString(char.type == "role" ? _ctx.$t("workbench.production.preview.role") : char.type == "tool" ? _ctx.$t("workbench.production.preview.prop") : _ctx.$t("workbench.production.preview.scene")) + "） ", 1)
                      ]),
                      _: 2
                    }, 1024)
                  ]);
                }), 128)),
                !currentCharacters.value.length ? (openBlock(), createElementBlock("div", _hoisted_24, [
                  createVNode(_component_t_tag, {
                    theme: "default",
                    variant: "light"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("workbench.production.preview.noCharacters")), 1)
                    ]),
                    _: 1
                  })
                ])) : createCommentVNode("", true)
              ])
            ]),
            createBaseVNode("div", _hoisted_25, [
              createBaseVNode("div", _hoisted_26, [
                _cache[8] || (_cache[8] = createBaseVNode("span", { class: "titleIndicator" }, null, -1)),
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.preview.imagePrompt")), 1)
              ]),
              createBaseVNode("div", _hoisted_27, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(promptTips.value, (item) => {
                  return openBlock(), createElementBlock(Fragment, {
                    key: item.label
                  }, [
                    item.value ? (openBlock(), createElementBlock("div", _hoisted_28, [
                      createBaseVNode("span", _hoisted_29, toDisplayString(item.label) + "：", 1),
                      createBaseVNode("span", _hoisted_30, toDisplayString(item.value), 1)
                    ])) : createCommentVNode("", true)
                  ], 64);
                }), 128))
              ])
            ])
          ])
        ]),
        createBaseVNode("div", _hoisted_31, [
          createBaseVNode("div", _hoisted_32, [
            createBaseVNode("div", _hoisted_33, [
              createVNode(_component_t_checkbox, {
                modelValue: selectAll.value,
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => selectAll.value = $event),
                onChange: handleSelectAll
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.preview.selectAll")), 1)
                ]),
                _: 1
              }, 8, ["modelValue"]),
              createVNode(_component_t_button, {
                theme: "default",
                variant: "text",
                size: "small",
                onClick: confirmRestoreSort
              }, {
                icon: withCtx(() => [
                  createVNode(_component_i_undo, {
                    theme: "outline",
                    size: "16"
                  })
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.preview.restoreSort")), 1)
                ]),
                _: 1
              })
            ]),
            createVNode(_component_t_button, {
              theme: "default",
              variant: "text",
              size: "small",
              class: "exportBtn",
              onClick: exportImage
            }, {
              icon: withCtx(() => [
                createVNode(_component_i_download, {
                  theme: "outline",
                  size: "16"
                })
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("workbench.production.preview.exportImage")), 1)
              ]),
              _: 1
            })
          ]),
          createBaseVNode("div", {
            class: "shotListWrapper",
            ref_key: "shotListWrapperRef",
            ref: shotListWrapperRef
          }, [
            createVNode(unref(lo), {
              modelValue: shotList.value,
              "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => shotList.value = $event),
              animation: 150,
              ghostClass: "shotGhost",
              dragClass: "shotDrag",
              scroll: shotListWrapperRef.value,
              scrollSensitivity: 80,
              scrollSpeed: 10,
              forceFallback: true,
              target: ".shotList",
              onStart: _cache[4] || (_cache[4] = ($event) => isDragging.value = true),
              onEnd: onDragEnd
            }, {
              default: withCtx(() => [
                createVNode(TransitionGroup, {
                  type: "transition",
                  tag: "div",
                  name: !isDragging.value ? "shot-flip" : void 0,
                  class: "shotList"
                }, {
                  default: withCtx(() => [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(shotList.value, (shot, index) => {
                      return openBlock(), createElementBlock("div", {
                        key: shot.id,
                        class: normalizeClass(["shotItem", { active: currentShotIndex.value === index }]),
                        onClick: ($event) => selectShot(index)
                      }, [
                        createVNode(_component_t_checkbox, {
                          modelValue: shot.selected,
                          "onUpdate:modelValue": ($event) => shot.selected = $event,
                          class: "shotCheckbox",
                          onClick: _cache[1] || (_cache[1] = withModifiers(() => {
                          }, ["stop"])),
                          onMousedown: _cache[2] || (_cache[2] = withModifiers(() => {
                          }, ["stop"]))
                        }, null, 8, ["modelValue", "onUpdate:modelValue"]),
                        createBaseVNode("div", _hoisted_35, [
                          shot.filePath ? (openBlock(), createElementBlock("img", {
                            key: 0,
                            src: shot.filePath,
                            alt: shot.description,
                            class: "shotImage"
                          }, null, 8, _hoisted_36)) : (openBlock(), createElementBlock("div", _hoisted_37, [
                            createVNode(_component_i_pic, {
                              theme: "outline",
                              size: "24",
                              fill: "#999"
                            })
                          ])),
                          createVNode(_component_t_tag, {
                            class: "shotNumber",
                            size: "small",
                            variant: "dark"
                          }, {
                            default: withCtx(() => [
                              createTextVNode("#" + toDisplayString(shot.id), 1)
                            ]),
                            _: 2
                          }, 1024)
                        ])
                      ], 10, _hoisted_34);
                    }), 128))
                  ]),
                  _: 1
                }, 8, ["name"])
              ]),
              _: 1
            }, 8, ["modelValue", "scroll"])
          ], 512)
        ])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

/* unplugin-vue-components disabled */

const preview = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-e7ab2bf8"]]);

const _hoisted_1$1 = { class: "closure" };
const _hoisted_2$1 = { class: "topMenu f ac" };
const _hoisted_3$1 = { class: "content" };
const _hoisted_4$1 = {
  key: 0,
  class: "importLoadingMask"
};
const _hoisted_5 = { class: "importLoadingContent" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    "visible": {
      type: Boolean,
      default: false
    },
    "visibleModifiers": {}
  },
  emits: ["update:visible"],
  setup(__props) {
    const generate = defineAsyncComponent(() => __vitePreload(() => import('./index-Blo-Vgxe.js'),true?__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]):void 0,import.meta.url));
    const editVideo = defineAsyncComponent(() => __vitePreload(() => import('./index-BX9ljLKI.js'),true?__vite__mapDeps([20,5,1,2,21,6,4,7,22,23]):void 0,import.meta.url));
    const { project } = storeToRefs(projectStore());
    const visible = useModel(__props, "visible");
    const activeMenu = ref("preview");
    const canvasWidth = ref(1920);
    const canvasHeight = ref(1080);
    onMounted(() => {
      const size = project.value?.videoRatio;
      if (size == "16:9") {
        canvasWidth.value = 1920;
        canvasHeight.value = 1080;
      } else if (size == "1:1") {
        canvasWidth.value = 1080;
        canvasHeight.value = 1080;
      } else if (size == "9:16") {
        canvasWidth.value = 1080;
        canvasHeight.value = 1920;
      }
    });
    const initialVideoItems = ref([]);
    const mockMediaItems = ref([]);
    const mockAudioItems = ref([]);
    const mockImageItems = ref([]);
    const extractLines = ref(false);
    const importLoading = ref(false);
    onMounted(() => {
      editFootage();
    });
    function getMediaType(src) {
      if (!src) return "unknown";
      const ext = src.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
      if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
      if (["mp4", "webm", "ogg", "mov", "avi", "mkv"].includes(ext)) return "video";
      if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
      return "unknown";
    }
    function changeMenu(type) {
      activeMenu.value = type;
      if (type == "editVideo") editFootage();
    }
    const episodesId = inject("episodesId");
    function editFootage() {
      instance.post("/assets/getMaterialData", {
        projectId: project.value?.id,
        scriptId: episodesId.value ?? 0
      }).then(({ data }) => {
        const videoList = data.data.filter((item) => getMediaType(item.filePath) === "video");
        const audioList = data.data.filter((item) => getMediaType(item.filePath) === "audio");
        const imageList = data.data.filter((item) => getMediaType(item.filePath) === "image");
        initialVideoItems.value = data.video.flatMap((item, index) => {
          if (Array.isArray(item.video)) {
            return item.video.map((subItem, subIndex) => ({
              id: `video-${subItem.id}`,
              type: "video",
              name: "#" + $t("workbench.production.wb.storyboardVideoName", { storyboard: index + 1, id: subIndex + 1 }),
              duration: subItem.duration || 0,
              icon: "🎬",
              color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              url: subItem.filePath,
              selected: item.videoId == subItem.id ? true : false
            }));
          }
        });
        mockMediaItems.value = videoList.map((item) => ({
          id: `video-${item.id}`,
          type: "video",
          name: item.name,
          duration: item.duration || 0,
          icon: "🎥",
          color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          url: item.filePath,
          loading: true
        }));
        mockAudioItems.value = audioList.map((item) => ({
          id: `audio-${item.id}`,
          type: "audio",
          name: item.name,
          duration: item.duration || 0,
          url: item.filePath,
          loading: true
        }));
        mockImageItems.value = imageList.map((item) => ({
          id: `image-${item.id}`,
          type: "image",
          name: item.name,
          duration: item.duration || 5,
          icon: "🖼️",
          color: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
          url: item.filePath,
          loading: true
        }));
      });
    }
    function createDemoTracks() {
      const createTrack = (type, name, order, isMain = false) => ({
        id: _r("track-"),
        type,
        name,
        visible: true,
        locked: false,
        clips: [],
        order,
        ...isMain && { isMain }
      });
      return [
        createTrack("video", "主轨道", 0, true),
        createTrack("audio", "音频", 2),
        createTrack("subtitle", "字幕", 3),
        createTrack("filter", "滤镜", 4)
      ];
    }
    const mockTracks = createDemoTracks();
    function handleBatchDownload(value) {
    }
    return (_ctx, _cache) => {
      const _component_i_close_small = resolveComponent("i-close-small");
      const _component_i_blackboard = resolveComponent("i-blackboard");
      const _component_t_tooltip = Tooltip;
      const _component_i_playback_progress = resolveComponent("i-playback-progress");
      const _component_i_editing = resolveComponent("i-editing");
      const _component_t_loading = Loading;
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        body: "String",
        header: false,
        footer: false,
        closeBtn: false,
        visible: visible.value,
        "onUpdate:visible": _cache[5] || (_cache[5] = ($event) => visible.value = $event),
        attach: "body",
        placement: "center",
        mode: "full-screen",
        dialogClassName: "noFooter",
        class: "fullscreenDialog"
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$1, [
            createVNode(_component_i_close_small, {
              theme: "outline",
              size: "24",
              fill: "#4a4a4a",
              onClick: _cache[0] || (_cache[0] = ($event) => visible.value = false)
            })
          ]),
          createBaseVNode("div", _hoisted_2$1, [
            createVNode(_component_t_tooltip, {
              content: _ctx.$t("workbench.production.wb.quickPreview"),
              placement: "bottom",
              theme: "light",
              destroyOnClose: "",
              showArrow: false
            }, {
              default: withCtx(() => [
                createBaseVNode("div", {
                  class: normalizeClass(["item fc c", { active: unref(activeMenu) === "preview" }]),
                  onClick: _cache[1] || (_cache[1] = ($event) => changeMenu("preview"))
                }, [
                  createVNode(_component_i_blackboard, { class: "icon" })
                ], 2)
              ]),
              _: 1
            }, 8, ["content"]),
            createVNode(_component_t_tooltip, {
              content: _ctx.$t("workbench.production.wb.videoGeneration"),
              placement: "bottom",
              theme: "light",
              destroyOnClose: "",
              showArrow: false
            }, {
              default: withCtx(() => [
                createBaseVNode("div", {
                  class: normalizeClass(["item fc c", { active: unref(activeMenu) === "generate" }]),
                  onClick: _cache[2] || (_cache[2] = ($event) => changeMenu("generate"))
                }, [
                  createVNode(_component_i_playback_progress, { class: "icon" })
                ], 2)
              ]),
              _: 1
            }, 8, ["content"]),
            createVNode(_component_t_tooltip, {
              content: _ctx.$t("workbench.production.wb.videoEditing"),
              placement: "bottom",
              theme: "light",
              destroyOnClose: "",
              showArrow: false
            }, {
              default: withCtx(() => [
                createBaseVNode("div", {
                  class: normalizeClass(["item fc c", { active: unref(activeMenu) === "editVideo" }]),
                  onClick: _cache[3] || (_cache[3] = ($event) => changeMenu("editVideo"))
                }, [
                  createVNode(_component_i_editing, { class: "icon" })
                ], 2)
              ]),
              _: 1
            }, 8, ["content"])
          ]),
          createBaseVNode("div", _hoisted_3$1, [
            unref(activeMenu) === "preview" ? (openBlock(), createBlock(preview, { key: 0 })) : createCommentVNode("", true),
            unref(activeMenu) === "generate" ? (openBlock(), createBlock(unref(generate), {
              key: 1,
              onImportVideo: handleBatchDownload,
              modelValue: unref(extractLines),
              "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => isRef(extractLines) ? extractLines.value = $event : null)
            }, null, 8, ["modelValue"])) : createCommentVNode("", true),
            unref(activeMenu) === "editVideo" ? (openBlock(), createBlock(unref(editVideo), {
              key: 2,
              "initial-tracks": unref(mockTracks),
              "initial-video-items": unref(initialVideoItems),
              "initial-media-items": unref(mockMediaItems),
              "initial-audio-items": unref(mockAudioItems),
              "initial-image-items": unref(mockImageItems),
              "canvas-width": unref(canvasWidth),
              "canvas-height": unref(canvasHeight),
              ref: "editVideoRef"
            }, null, 8, ["initial-tracks", "initial-video-items", "initial-media-items", "initial-audio-items", "initial-image-items", "canvas-width", "canvas-height"])) : createCommentVNode("", true)
          ]),
          unref(importLoading) ? (openBlock(), createElementBlock("div", _hoisted_4$1, [
            createBaseVNode("div", _hoisted_5, [
              createVNode(_component_t_loading, {
                size: "large",
                text: _ctx.$t("workbench.production.wb.importingLoading")
              }, null, 8, ["text"])
            ])
          ])) : createCommentVNode("", true)
        ]),
        _: 1
      }, 8, ["visible"]);
    };
  }
});

/* unplugin-vue-components disabled */

const workbench$1 = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-81c4600b"]]);

const _hoisted_1 = { class: "titleBar dragHandle pr" };
const _hoisted_2 = { class: "title" };
const _hoisted_3 = { class: "videoPreview" };
const _hoisted_4 = { class: "playButton" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "workbench",
  props: /* @__PURE__ */ mergeModels({
    id: {},
    handleIds: {}
  }, {
    "modelValue": { required: true },
    "modelModifiers": {}
  }),
  emits: ["update:modelValue"],
  setup(__props) {
    const visible = ref(false);
    const props = __props;
    const workbenchData = useModel(__props, "modelValue");
    return (_ctx, _cache) => {
      const _component_t_image = Image;
      const _component_i_video = resolveComponent("i-video");
      const _component_t_card = Card;
      return openBlock(), createBlock(_component_t_card, {
        class: "workbench",
        onClick: _cache[1] || (_cache[1] = ($event) => visible.value = !unref(visible))
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, toDisplayString(_ctx.$t("workbench.production.node.workbench.title")), 1),
            createVNode(unref(_sfc_main$f), {
              id: props.handleIds.target,
              type: "target",
              position: unref(Position).Left,
              style: { "left": "calc(-1 * var(--td-comp-paddingLR-xl))" }
            }, null, 8, ["id", "position"])
          ]),
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("div", {
              class: "videoPlaceholder",
              style: normalizeStyle({ background: workbenchData.value?.gradient })
            }, [
              workbenchData.value?.cover ? (openBlock(), createBlock(_component_t_image, {
                key: 0,
                src: workbenchData.value.cover,
                fit: "cover",
                class: "videoCover"
              }, null, 8, ["src"])) : createCommentVNode("", true),
              createBaseVNode("div", _hoisted_4, [
                createVNode(_component_i_video, {
                  theme: "outline",
                  size: "48"
                })
              ])
            ], 4)
          ]),
          unref(visible) ? (openBlock(), createBlock(workbench$1, {
            key: 0,
            visible: unref(visible),
            "onUpdate:visible": _cache[0] || (_cache[0] = ($event) => isRef(visible) ? visible.value = $event : null)
          }, null, 8, ["visible"])) : createCommentVNode("", true)
        ]),
        _: 1
      });
    };
  }
});

/* unplugin-vue-components disabled */

const workbench = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-fa984f98"]]);

export { workbench as default };

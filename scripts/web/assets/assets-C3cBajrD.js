import { _ as __unplugin_components_0 } from './imageTools-CrjCtmKk.js';
import { l as defineComponent, bM as storeToRefs, bU as useModel, b2 as resolveComponent, aK as openBlock, aS as createBlock, aM as withCtx, j as createVNode, a1 as unref, aO as createBaseVNode, b0 as toDisplayString, aL as createElementBlock, F as Fragment, aP as renderList, a$ as createTextVNode, bH as withModifiers, aT as createCommentVNode, av as isRef, bV as mergeModels, r as ref } from './vue-vendor-Byo5TD6r.js';
import { c as _sfc_main$f, P as Position } from './vueflow-RSWomYB5.js';
import { e as editImage } from './index-CYLHa5R2.js';
import { i as instance } from './axios-BX4BN6mO.js';
import { p as projectStore } from './project-Cze3Ugcr.js';
import { Y as Card, a8 as Image, L as Loading, a4 as Empty, X as Tag, n as Tooltip, W as DialogPlugin } from './tdesign-CfL1pweZ.js';
import { _ as _export_sfc } from './index-DkAIKrBP.js';
import './dayjs-CuToSpIM.js';
import './assetsCheck-BiH4Bybq.js';
import './index-d9ZSLBH_.js';
import './modelSelect-CIGhMzmI.js';
import './providersLogo-BCbaFq8_.js';
import './promptEditor-BptR83AD.js';
import './icons-B-vHNScY.js';
import './index-DeMbQGTL.js';
import './markdown-CDQfeHxT.js';
import './useAdaptationNav-Bi4oVHb2.js';
import './i18n-C05S5xzz.js';

const _hoisted_1 = { class: "titleBar dragHandle" };
const _hoisted_2 = { class: "title" };
const _hoisted_3 = { class: "content" };
const _hoisted_4 = { class: "cardGrid" };
const _hoisted_5 = {
  key: 0,
  class: "assetImageWrap"
};
const _hoisted_6 = { class: "imageToolsWrap show" };
const _hoisted_7 = {
  key: 1,
  class: "assetImageWrap assetImagePlaceholder"
};
const _hoisted_8 = {
  key: 1,
  style: { "color": "red" }
};
const _hoisted_9 = { class: "cardInfo" };
const _hoisted_10 = { class: "cardName" };
const _hoisted_11 = { class: "nameText" };
const _hoisted_12 = { class: "cardDesc" };
const _hoisted_13 = { class: "divider" };
const _hoisted_14 = { class: "deriveAssets" };
const _hoisted_15 = {
  key: 0,
  class: "assetImageWrap"
};
const _hoisted_16 = { class: "imageToolsWrap show" };
const _hoisted_17 = {
  key: 1,
  class: "assetImageWrap assetImagePlaceholder"
};
const _hoisted_18 = { style: { "color": "red", "cursor": "pointer" } };
const _hoisted_19 = ["onClick"];
const _hoisted_20 = { class: "cardInfo" };
const _hoisted_21 = { class: "cardName" };
const _hoisted_22 = { class: "nameText" };
const _hoisted_23 = { class: "cardDesc" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "assets",
  props: /* @__PURE__ */ mergeModels({
    id: {},
    handleIds: {}
  }, {
    "modelValue": { required: true },
    "modelModifiers": {}
  }),
  emits: ["update:modelValue"],
  setup(__props) {
    const { project } = storeToRefs(projectStore());
    const props = __props;
    const assets = useModel(__props, "modelValue");
    const currentRow = ref({
      resultImages: [],
      referanceImages: []
    });
    const visible = ref(false);
    const currentAssetsId = ref();
    function generateAssetsImage(row, referanceImageUrl) {
      currentRow.value = {
        flowId: row?.flowId,
        resultImages: [{ src: row.src, prompt: row.prompt }],
        referanceImages: [referanceImageUrl]
      };
      currentAssetsId.value = row.id;
      visible.value = true;
    }
    async function save({ imageUrl, flowId }) {
      if (!imageUrl) return;
      for (const i of assets.value) {
        const target = i.derive.find((s) => s.id === currentAssetsId.value);
        if (target) {
          target.state = "已完成";
          target.src = imageUrl;
          target.flowId = flowId;
          break;
        }
      }
      await instance.post("/production/assets/updateAssetsUrl", {
        id: currentAssetsId.value,
        url: imageUrl,
        flowId
      });
    }
    async function removeFn(id) {
      const dialog = DialogPlugin.confirm({
        header: $t("workbench.assets.confirmDeleteHeader"),
        body: $t("workbench.production.node.assets.confirmDeleteBody"),
        confirmBtn: $t("workbench.assets.deleteBtn"),
        cancelBtn: $t("workbench.assets.cancelBtn"),
        theme: "warning",
        onConfirm: async () => {
          try {
            await instance.post("/production/assets/deleteAssetsDireve", {
              id,
              projectId: project.value?.id
            });
            assets.value.forEach((item) => {
              const targetIndex = item.derive.findIndex((s) => s.id === id);
              if (targetIndex !== -1) {
                item.derive.splice(targetIndex, 1);
              }
            });
          } catch (e) {
            window.$message.error(e?.message || $t("workbench.production.node.assets.removeFailed"));
          } finally {
            dialog.destroy();
          }
        }
      });
    }
    return (_ctx, _cache) => {
      const _component_ImageTools = __unplugin_components_0;
      const _component_t_image = Image;
      const _component_t_loading = Loading;
      const _component_t_empty = Empty;
      const _component_t_tag = Tag;
      const _component_t_card = Card;
      const _component_i_right = resolveComponent("i-right");
      const _component_t_tooltip = Tooltip;
      const _component_i_delete = resolveComponent("i-delete");
      return openBlock(), createBlock(_component_t_card, { class: "assets" }, {
        default: withCtx(() => [
          createVNode(unref(_sfc_main$f), {
            id: props.handleIds.target,
            type: "target",
            position: unref(Position).Top
          }, null, 8, ["id", "position"]),
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, toDisplayString(_ctx.$t("workbench.production.node.assets.title")), 1)
          ]),
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("div", _hoisted_4, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(assets.value, (asset) => {
                return openBlock(), createElementBlock("div", {
                  key: asset.id,
                  class: "assetItemBox"
                }, [
                  createVNode(_component_t_card, { class: "assetCard" }, {
                    default: withCtx(() => [
                      asset.src ? (openBlock(), createElementBlock("div", _hoisted_5, [
                        createVNode(_component_t_image, {
                          src: asset.src,
                          fit: "contain",
                          class: "assetImage",
                          preview: true
                        }, {
                          overlayContent: withCtx(() => [
                            createBaseVNode("div", _hoisted_6, [
                              createVNode(_component_ImageTools, {
                                src: asset.src,
                                position: "br"
                              }, null, 8, ["src"])
                            ])
                          ]),
                          _: 2
                        }, 1032, ["src"])
                      ])) : (openBlock(), createElementBlock("div", _hoisted_7, [
                        asset.state == "生成中" ? (openBlock(), createBlock(_component_t_loading, {
                          key: 0,
                          size: "small"
                        })) : asset.state == "生成失败" ? (openBlock(), createElementBlock("span", _hoisted_8, toDisplayString(_ctx.$t("workbench.production.node.assets.generateFailed")), 1)) : (openBlock(), createBlock(_component_t_empty, {
                          key: 2,
                          size: "small",
                          title: _ctx.$t("workbench.production.node.assets.notGenerated")
                        }, null, 8, ["title"]))
                      ])),
                      createBaseVNode("div", _hoisted_9, [
                        createBaseVNode("div", _hoisted_10, [
                          createBaseVNode("span", _hoisted_11, toDisplayString(asset.name), 1),
                          createVNode(_component_t_tag, { theme: "success" }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("workbench.production.node.assets.originalAsset")), 1)
                            ]),
                            _: 1
                          })
                        ]),
                        createBaseVNode("div", _hoisted_12, toDisplayString(asset.desc), 1)
                      ])
                    ]),
                    _: 2
                  }, 1024),
                  createBaseVNode("div", _hoisted_13, [
                    createVNode(_component_i_right, { size: "32" })
                  ]),
                  createBaseVNode("div", _hoisted_14, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(asset.derive, (item, index) => {
                      return openBlock(), createBlock(_component_t_card, {
                        key: index,
                        class: "assetCard",
                        onClick: ($event) => generateAssetsImage(item, asset.src)
                      }, {
                        default: withCtx(() => [
                          item.src && item.state == "已完成" ? (openBlock(), createElementBlock("div", _hoisted_15, [
                            createVNode(_component_t_image, {
                              src: item.src,
                              fit: "contain",
                              class: "assetImage",
                              preview: true
                            }, {
                              overlayContent: withCtx(() => [
                                createBaseVNode("div", _hoisted_16, [
                                  createVNode(_component_ImageTools, {
                                    src: item.src,
                                    position: "br"
                                  }, null, 8, ["src"])
                                ])
                              ]),
                              _: 2
                            }, 1032, ["src"])
                          ])) : (openBlock(), createElementBlock("div", _hoisted_17, [
                            item.state == "生成中" ? (openBlock(), createBlock(_component_t_loading, {
                              key: 0,
                              size: "small"
                            })) : item.state == "生成失败" ? (openBlock(), createBlock(_component_t_tooltip, {
                              key: 1,
                              content: item?.errorReason
                            }, {
                              default: withCtx(() => [
                                createBaseVNode("div", _hoisted_18, toDisplayString(_ctx.$t("workbench.novel.genFailed")), 1)
                              ]),
                              _: 1
                            }, 8, ["content"])) : (openBlock(), createBlock(_component_t_empty, {
                              key: 2,
                              size: "small",
                              title: _ctx.$t("workbench.production.node.assets.notGenerated")
                            }, null, 8, ["title"]))
                          ])),
                          createVNode(_component_t_tooltip, {
                            theme: "primary",
                            content: _ctx.$t("workbench.production.node.storyboard.deleteNode")
                          }, {
                            default: withCtx(() => [
                              createBaseVNode("div", {
                                class: "remove ac",
                                onClick: withModifiers(($event) => removeFn(item.id), ["stop"])
                              }, [
                                createVNode(_component_i_delete, {
                                  theme: "outline",
                                  size: "18",
                                  fill: "#fff"
                                })
                              ], 8, _hoisted_19)
                            ]),
                            _: 2
                          }, 1032, ["content"]),
                          createBaseVNode("div", _hoisted_20, [
                            createBaseVNode("div", _hoisted_21, [
                              createBaseVNode("span", _hoisted_22, toDisplayString(item.name), 1),
                              createVNode(_component_t_tag, { theme: "warning" }, {
                                default: withCtx(() => [
                                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.node.assets.derived")), 1)
                                ]),
                                _: 1
                              })
                            ]),
                            createBaseVNode("div", _hoisted_23, toDisplayString(item.desc), 1)
                          ])
                        ]),
                        _: 2
                      }, 1032, ["onClick"]);
                    }), 128)),
                    asset.derive.length <= 0 ? (openBlock(), createBlock(_component_t_card, {
                      key: 0,
                      class: "assetCard emptyCard"
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_t_empty, {
                          title: _ctx.$t("workbench.production.node.assets.noDerivedAssets")
                        }, null, 8, ["title"])
                      ]),
                      _: 1
                    })) : createCommentVNode("", true)
                  ])
                ]);
              }), 128))
            ])
          ]),
          unref(visible) ? (openBlock(), createBlock(editImage, {
            key: 0,
            modelValue: unref(visible),
            "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(visible) ? visible.value = $event : null),
            flowData: unref(currentRow),
            onSave: save
          }, null, 8, ["modelValue", "flowData"])) : createCommentVNode("", true)
        ]),
        _: 1
      });
    };
  }
});

/* unplugin-vue-components disabled */

const assets = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-75bcba19"]]);

export { assets as default };

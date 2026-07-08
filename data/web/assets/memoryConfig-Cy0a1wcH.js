import { i as instance } from './axios-B2i2rFrf.js';
import { A as Alert, Y as Card, J as FormItem, ak as TagInput, K as Select, O as Option, ac as InputNumber, B as Button, H as Form, W as DialogPlugin } from './tdesign-C157N6jJ.js';
import { l as defineComponent, o as onMounted, aK as openBlock, aL as createElementBlock, j as createVNode, aM as withCtx, a$ as createTextVNode, b0 as toDisplayString, F as Fragment, aP as renderList, aO as createBaseVNode, r as ref } from './vue-vendor-Cj7sXJnb.js';
import { _ as _export_sfc } from './index-DsDM6Bax.js';
import './dayjs-CuToSpIM.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';

const _hoisted_1 = { class: "memoryConfig" };
const _hoisted_2 = { class: "actionRow f frr" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "memoryConfig",
  setup(__props) {
    const formData = ref({
      messagesPerSummary: 3,
      shortTermLimit: 5,
      summaryMaxLength: 500,
      summaryLimit: 10,
      ragLimit: 3,
      deepRetrieveSummaryLimit: 5,
      modelOnnxFile: ["all-MiniLM-L6-v2", "onnx", "model_fp16.onnx"],
      // 模型文件路径
      modelDtype: "fp16"
    });
    const dtypeOptions = ["fp16", "auto", "fp32", "q8", "int8", "uint8", "q4", "bnb4", "q4f16"];
    const loading = ref(false);
    const saving = ref(false);
    const clearing = ref(false);
    async function getMemoryConfig() {
      loading.value = true;
      try {
        const { data } = await instance.get("/setting/memoryConfig/getMemory");
        formData.value = {
          messagesPerSummary: data.messagesPerSummary ?? 3,
          shortTermLimit: data.shortTermLimit ?? 5,
          summaryMaxLength: data.summaryMaxLength ?? 500,
          summaryLimit: data.summaryLimit ?? 10,
          ragLimit: data.ragLimit ?? 3,
          deepRetrieveSummaryLimit: data.deepRetrieveSummaryLimit ?? 5,
          modelOnnxFile: data.modelOnnxFile ?? ["all-MiniLM-L6-v2", "onnx", "model_fp16.onnx"],
          // 模型文件路径
          modelDtype: data.modelDtype ?? "fp16"
        };
      } catch (error) {
        window.$message.warning(error?.message);
      } finally {
        loading.value = false;
      }
    }
    async function handleSave() {
      saving.value = true;
      try {
        await instance.post("/setting/memoryConfig/sureMemory", {
          ...formData.value
        });
        window.$message.success($t("settings.memory.msg.saved"));
      } catch (error) {
        window.$message.warning(error?.message);
      } finally {
        saving.value = false;
      }
    }
    async function handleClearMemory() {
      const dialog = DialogPlugin.confirm({
        header: $t("settings.memory.msg.clearConfirmTitle"),
        body: $t("settings.memory.msg.clearConfirmBody"),
        confirmBtn: $t("settings.memory.msg.confirmClear"),
        cancelBtn: $t("settings.memory.msg.cancel"),
        onConfirm: async () => {
          clearing.value = true;
          try {
            await instance.post("/setting/memoryConfig/delAllMemory");
            window.$message.success($t("settings.memory.msg.cleared"));
            dialog.hide();
          } catch (error) {
            window.$message.error(error?.msg || $t("settings.memory.msg.clearFailed"));
          } finally {
            clearing.value = false;
          }
        }
      });
    }
    function handleRestory() {
      formData.value = {
        messagesPerSummary: 3,
        shortTermLimit: 5,
        summaryMaxLength: 500,
        summaryLimit: 10,
        ragLimit: 3,
        deepRetrieveSummaryLimit: 5,
        modelOnnxFile: ["all-MiniLM-L6-v2", "onnx", "model_fp16.onnx"],
        // 模型文件路径
        modelDtype: "fp16"
      };
      handleSave();
    }
    onMounted(() => {
      getMemoryConfig();
    });
    return (_ctx, _cache) => {
      const _component_t_alert = Alert;
      const _component_t_tag_input = TagInput;
      const _component_t_form_item = FormItem;
      const _component_t_option = Option;
      const _component_t_select = Select;
      const _component_t_card = Card;
      const _component_t_input_number = InputNumber;
      const _component_t_button = Button;
      const _component_t_form = Form;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_t_alert, {
          theme: "warning",
          class: "topAlert",
          message: _ctx.$t("settings.memory.warning")
        }, null, 8, ["message"]),
        createVNode(_component_t_form, {
          data: formData.value,
          labelAlign: "top",
          labelWidth: "180px",
          class: "memoryForm",
          onSubmit: handleSave
        }, {
          default: withCtx(() => [
            createVNode(_component_t_card, {
              title: _ctx.$t("settings.memory.vectorModelConfig"),
              bordered: true,
              style: { "margin-top": "16px" }
            }, {
              default: withCtx(() => [
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.memory.modelFilePath"),
                  name: "modelOnnxFile"
                }, {
                  help: withCtx(() => [
                    createTextVNode("向量模型文件路径：/data/models/" + toDisplayString(formData.value.modelOnnxFile ? formData.value.modelOnnxFile.join("/") : ""), 1)
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_t_tag_input, {
                      modelValue: formData.value.modelOnnxFile,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => formData.value.modelOnnxFile = $event),
                      clearable: ""
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.memory.quantizationType"),
                  name: "modelDtype"
                }, {
                  help: withCtx(() => [..._cache[8] || (_cache[8] = [])]),
                  default: withCtx(() => [
                    createVNode(_component_t_select, {
                      modelValue: formData.value.modelDtype,
                      "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => formData.value.modelDtype = $event),
                      placeholder: _ctx.$t("settings.memory.quantizationPlaceholder")
                    }, {
                      default: withCtx(() => [
                        (openBlock(), createElementBlock(Fragment, null, renderList(dtypeOptions, (item) => {
                          return createVNode(_component_t_option, {
                            key: item,
                            value: item,
                            label: item
                          }, null, 8, ["value", "label"]);
                        }), 64))
                      ]),
                      _: 1
                    }, 8, ["modelValue", "placeholder"])
                  ]),
                  _: 1
                }, 8, ["label"])
              ]),
              _: 1
            }, 8, ["title"]),
            createVNode(_component_t_card, {
              title: _ctx.$t("settings.memory.memoryParams"),
              bordered: true,
              style: { "margin-top": "16px" }
            }, {
              default: withCtx(() => [
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.memory.messagesPerSummary"),
                  name: "messagesPerSummary"
                }, {
                  help: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("settings.memory.messagesPerSummaryHelp")), 1)
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_t_input_number, {
                      modelValue: formData.value.messagesPerSummary,
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => formData.value.messagesPerSummary = $event),
                      min: 1,
                      max: 200,
                      allowInputOverLimit: false
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.memory.shortTermLimit"),
                  name: "shortTermLimit"
                }, {
                  help: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("settings.memory.shortTermLimitHelp")), 1)
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_t_input_number, {
                      modelValue: formData.value.shortTermLimit,
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => formData.value.shortTermLimit = $event),
                      min: 1,
                      max: 100,
                      allowInputOverLimit: false
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.memory.summaryMaxLength"),
                  name: "summaryMaxLength"
                }, {
                  help: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("settings.memory.summaryMaxLengthHelp")), 1)
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_t_input_number, {
                      modelValue: formData.value.summaryMaxLength,
                      "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => formData.value.summaryMaxLength = $event),
                      min: 0,
                      max: 1e3,
                      step: 1,
                      allowInputOverLimit: false
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.memory.summaryLimit"),
                  name: "summaryLimit"
                }, {
                  help: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("settings.memory.summaryLimitHelp")), 1)
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_t_input_number, {
                      modelValue: formData.value.summaryLimit,
                      "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => formData.value.summaryLimit = $event),
                      min: 0,
                      max: 100,
                      step: 1,
                      allowInputOverLimit: false
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.memory.ragLimit"),
                  name: "ragLimit"
                }, {
                  help: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("settings.memory.ragLimitHelp")), 1)
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_t_input_number, {
                      modelValue: formData.value.ragLimit,
                      "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => formData.value.ragLimit = $event),
                      min: 0,
                      max: 50,
                      step: 1,
                      allowInputOverLimit: false
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.memory.deepRetrieveSummaryLimit"),
                  name: "deepRetrieveSummaryLimit"
                }, {
                  help: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.$t("settings.memory.deepRetrieveSummaryLimitHelp")), 1)
                  ]),
                  default: withCtx(() => [
                    createVNode(_component_t_input_number, {
                      modelValue: formData.value.deepRetrieveSummaryLimit,
                      "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => formData.value.deepRetrieveSummaryLimit = $event),
                      min: 0,
                      max: 100,
                      step: 1,
                      allowInputOverLimit: false
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }, 8, ["label"])
              ]),
              _: 1
            }, 8, ["title"]),
            createBaseVNode("div", _hoisted_2, [
              createVNode(_component_t_button, {
                theme: "primary",
                type: "submit",
                loading: saving.value
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("settings.memory.saveConfig")), 1)
                ]),
                _: 1
              }, 8, ["loading"]),
              createVNode(_component_t_button, {
                theme: "danger",
                variant: "outline",
                loading: clearing.value,
                onClick: handleClearMemory
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("settings.memory.clearMemory")), 1)
                ]),
                _: 1
              }, 8, ["loading"]),
              createVNode(_component_t_button, {
                theme: "warning",
                variant: "outline",
                loading: saving.value,
                onClick: handleRestory
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("settings.memory.restoreDefault")), 1)
                ]),
                _: 1
              }, 8, ["loading"])
            ])
          ]),
          _: 1
        }, 8, ["data"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const memoryConfig = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-c59a3784"]]);

export { memoryConfig as default };

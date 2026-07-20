import { s as settingStore } from './index-CYEzD5Ot.js';
import { l as defineComponent, bM as storeToRefs, o as onMounted, aK as openBlock, aL as createElementBlock, j as createVNode, aM as withCtx, a$ as createTextVNode, b0 as toDisplayString, a1 as unref, aS as createBlock, aT as createCommentVNode, r as ref } from './vue-vendor-Byo5TD6r.js';
import { A as Alert, J as FormItem, R as Input, I as Icon, o as Space, B as Button, H as Form } from './tdesign-CfL1pweZ.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './dayjs-CuToSpIM.js';

const _hoisted_1 = { class: "requestConfig" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "requestConfig",
  setup(__props) {
    const { baseUrl, isElectron } = storeToRefs(settingStore());
    const formData = ref({
      baseUrl: ""
    });
    const formRules = {
      baseUrl: [
        { required: true, message: $t("settings.request.msg.enterApi"), trigger: "blur" },
        {
          pattern: /^https?:\/\/.+/,
          message: $t("settings.request.msg.validUrl"),
          trigger: "blur"
        }
      ]
    };
    function loadSettings() {
      formData.value.baseUrl = baseUrl.value;
    }
    function handleSubmit() {
      baseUrl.value = formData.value.baseUrl;
      window.$message.success($t("settings.request.msg.saved"));
    }
    function handleReset() {
      formData.value.baseUrl = "http://localhost:10588";
      baseUrl.value = formData.value.baseUrl;
      window.$message.success($t("settings.request.msg.reset"));
    }
    async function refreshAPI() {
      try {
        const res = await fetch("toonflow://getAppUrl");
        const data = await res.json();
        if (data?.port) {
          baseUrl.value = data.url;
          isElectron.value = true;
          window.$message.success($t("settings.request.msg.refreshSuccess"));
        }
      } catch (error) {
        window.$message.error($t("settings.request.msg.refreshFailed"));
      }
    }
    onMounted(() => {
      loadSettings();
    });
    return (_ctx, _cache) => {
      const _component_t_alert = Alert;
      const _component_t_icon = Icon;
      const _component_t_input = Input;
      const _component_t_form_item = FormItem;
      const _component_t_button = Button;
      const _component_t_space = Space;
      const _component_t_form = Form;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_t_alert, {
          style: { "margin-bottom": "16px" },
          theme: "warning",
          message: _ctx.$t("settings.request.warning")
        }, null, 8, ["message"]),
        createVNode(_component_t_form, {
          data: formData.value,
          labelAlign: "top",
          rules: formRules
        }, {
          default: withCtx(() => [
            createVNode(_component_t_form_item, {
              label: _ctx.$t("settings.request.apiAddress"),
              name: "baseUrl"
            }, {
              default: withCtx(() => [
                createVNode(_component_t_input, {
                  modelValue: formData.value.baseUrl,
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => formData.value.baseUrl = $event),
                  placeholder: _ctx.$t("settings.request.apiPlaceholder"),
                  clearable: ""
                }, {
                  "prefix-icon": withCtx(() => [
                    createVNode(_component_t_icon, { name: "link" })
                  ]),
                  _: 1
                }, 8, ["modelValue", "placeholder"])
              ]),
              _: 1
            }, 8, ["label"]),
            createVNode(_component_t_form_item, null, {
              default: withCtx(() => [
                createVNode(_component_t_space, { size: "small" }, {
                  default: withCtx(() => [
                    createVNode(_component_t_button, {
                      theme: "primary",
                      type: "submit",
                      onClick: handleSubmit
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("settings.request.save")), 1)
                      ]),
                      _: 1
                    }),
                    createVNode(_component_t_button, {
                      theme: "default",
                      onClick: handleReset
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("settings.request.reset")), 1)
                      ]),
                      _: 1
                    }),
                    unref(isElectron) ? (openBlock(), createBlock(_component_t_button, {
                      key: 0,
                      theme: "warning",
                      onClick: refreshAPI
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(_ctx.$t("settings.request.refresh")), 1)
                      ]),
                      _: 1
                    })) : createCommentVNode("", true)
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["data"])
      ]);
    };
  }
});

export { _sfc_main as default };

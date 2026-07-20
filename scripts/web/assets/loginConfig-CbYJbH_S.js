import { i as instance } from './axios-mQi6SvTz.js';
import { H as Form, J as FormItem, R as Input, o as Space, B as Button, L as Loading } from './tdesign-CfL1pweZ.js';
import { l as defineComponent, o as onMounted, aK as openBlock, aS as createBlock, aM as withCtx, j as createVNode, a1 as unref, a$ as createTextVNode, b0 as toDisplayString, r as ref } from './vue-vendor-Byo5TD6r.js';
import './index-Iu-bOXAU.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';
import './dayjs-CuToSpIM.js';

const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "loginConfig",
  setup(__props) {
    const formRef = ref(null);
    const loading = ref(false);
    const formData = ref({
      id: null,
      name: "",
      password: ""
    });
    const formRules = {
      name: [
        { required: true, message: $t("settings.login.msg.enterUsername"), trigger: "blur" },
        { min: 2, max: 20, message: $t("settings.login.msg.usernameLength"), trigger: "blur" }
      ],
      password: [
        { required: true, message: $t("settings.login.msg.enterPassword"), trigger: "blur" },
        { min: 6, max: 20, message: $t("settings.login.msg.passwordLength"), trigger: "blur" }
      ]
    };
    async function fetchUserInfo() {
      try {
        const res = await instance.get("/setting/loginConfig/getUser");
        formData.value = {
          id: res.data.id ?? null,
          name: res.data.name ?? "",
          password: res.data.password ?? ""
        };
      } catch (error) {
        window.$message.error($t("settings.login.msg.fetchFailed"));
      }
    }
    async function saveUserInfo() {
      loading.value = true;
      try {
        await instance.post("/setting/loginConfig/updateUserPwd", formData.value);
        window.$message.success($t("settings.login.msg.saveSuccess"));
        await fetchUserInfo();
      } catch (error) {
        window.$message.error($t("settings.login.msg.saveFailed"));
      } finally {
        loading.value = false;
      }
    }
    function handleSubmit(context) {
      if (context.validateResult === true) {
        saveUserInfo();
      }
    }
    function handleReset() {
      formRef.value?.reset();
    }
    onMounted(() => {
      fetchUserInfo();
    });
    return (_ctx, _cache) => {
      const _component_t_input = Input;
      const _component_t_form_item = FormItem;
      const _component_t_button = Button;
      const _component_t_space = Space;
      const _component_t_form = Form;
      const _component_t_loading = Loading;
      return openBlock(), createBlock(_component_t_loading, { loading: unref(loading) }, {
        default: withCtx(() => [
          createVNode(_component_t_form, {
            ref_key: "formRef",
            ref: formRef,
            labelAlign: "top",
            data: unref(formData),
            rules: formRules,
            colon: true,
            onSubmit: handleSubmit,
            onReset: handleReset
          }, {
            default: withCtx(() => [
              createVNode(_component_t_form_item, {
                label: _ctx.$t("settings.login.username"),
                name: "name"
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_input, {
                    modelValue: unref(formData).name,
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => unref(formData).name = $event),
                    placeholder: _ctx.$t("settings.login.usernamePlaceholder"),
                    clearable: "",
                    width: "100%"
                  }, null, 8, ["modelValue", "placeholder"])
                ]),
                _: 1
              }, 8, ["label"]),
              createVNode(_component_t_form_item, {
                label: _ctx.$t("settings.login.password"),
                name: "password"
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_input, {
                    modelValue: unref(formData).password,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => unref(formData).password = $event),
                    type: "password",
                    placeholder: _ctx.$t("settings.login.passwordPlaceholder")
                  }, null, 8, ["modelValue", "placeholder"])
                ]),
                _: 1
              }, 8, ["label"]),
              createVNode(_component_t_form_item, { "status-icon": false }, {
                default: withCtx(() => [
                  createVNode(_component_t_space, { size: "small" }, {
                    default: withCtx(() => [
                      createVNode(_component_t_button, {
                        theme: "primary",
                        type: "submit",
                        loading: unref(loading)
                      }, {
                        default: withCtx(() => [
                          createTextVNode(toDisplayString(_ctx.$t("settings.login.modify")), 1)
                        ]),
                        _: 1
                      }, 8, ["loading"])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["data"])
        ]),
        _: 1
      }, 8, ["loading"]);
    };
  }
});

export { _sfc_main as default };

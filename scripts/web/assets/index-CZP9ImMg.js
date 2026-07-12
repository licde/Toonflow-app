import { u as useI18n } from './i18n-C05S5xzz.js';
import { _ as _export_sfc, l as languageList, s as settingStore, r as router, c as cachedLocale } from './index-DkAIKrBP.js';
import { i as instance } from './axios-BX4BN6mO.js';
import { bM as storeToRefs, r as ref, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, j as createVNode, aM as withCtx, av as isRef, a1 as unref, b0 as toDisplayString, a$ as createTextVNode, aQ as normalizeStyle, F as Fragment, b2 as resolveComponent } from './vue-vendor-Byo5TD6r.js';
import { H as Form, J as FormItem, R as Input, B as Button, E as Dialog, w as Dropdown } from './tdesign-CfL1pweZ.js';
import './markdown-CDQfeHxT.js';
import './dayjs-CuToSpIM.js';

/* unplugin-vue-components disabled */

const _hoisted_1 = { class: "formBox" };
const _hoisted_2 = { class: "logoBox fc" };
const _hoisted_3 = { class: "fc c" };
const _hoisted_4 = { class: "slogan" };
const _hoisted_5 = { class: "login-form" };
const _hoisted_6 = { class: "tips c" };
const _hoisted_7 = { class: "settingBtn" };
const _sfc_main = {
  __name: 'index',
  setup(__props) {

const { locale } = useI18n();
const langOptions = languageList.map((item) => ({
  content: item.label,
  value: item.value,
}));
const handleChangeLang = (data) => {
  locale.value = data.value;
  cachedLocale.value = data.value;
};

const store = settingStore();
const { baseUrl, isElectron } = storeToRefs(store);

const showSettingModal = ref(false);
const tempBaseUrl = ref(baseUrl.value);

// 保存设置
const handleSaveSetting = () => {
  baseUrl.value = tempBaseUrl.value;
  showSettingModal.value = false;
  window.$message.success($t("login.settingsSaved"));
};
const state = ref({
  show: true,
  loginLoading: false,
  user: {
    username: "",
    password: "",
  },
  rules: {
    username: [{ required: true, message: $t("login.usernameRequired") }],
    password: [{ required: true, message: $t("login.passwordRequired") }],
  },
});

const handleLogin = () => {
  if (!state.value.user.username || !state.value.user.password) {
    window.$message.warning($t("login.enterUsernameAndPassword"));
    return;
  }
  state.value.loginLoading = true;
  const obj = { ...state.value.user };
  instance
    .post("/login/login", obj)
    .then(({ data }) => {
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.id);
      router.push("/project");
      window.$message.success($t("login.loginSuccess"));
      state.value.loginLoading = false;
    })
    .catch((e) => {
      state.value.loginLoading = false;
      window.$message.error(e.message);
    });
};

return (_ctx, _cache) => {
  const _component_t_input = Input;
  const _component_t_form_item = FormItem;
  const _component_t_form = Form;
  const _component_t_dialog = Dialog;
  const _component_t_button = Button;
  const _component_i_translate = resolveComponent("i-translate");
  const _component_t_dropdown = Dropdown;
  const _component_i_setting_two = resolveComponent("i-setting-two");

  return (openBlock(), createElementBlock(Fragment, null, [
    createBaseVNode("div", {
      class: "loginPage",
      style: normalizeStyle({ height: unref(isElectron) ? 'calc(100vh - 32px)' : '100vh' })
    }, [
      createBaseVNode("div", _hoisted_1, [
        createVNode(_component_t_dialog, {
          visible: unref(showSettingModal),
          "onUpdate:visible": _cache[1] || (_cache[1] = $event => (isRef(showSettingModal) ? (showSettingModal).value = $event : null)),
          header: _ctx.$t('login.settings'),
          onConfirm: handleSaveSetting,
          width: 400
        }, {
          default: withCtx(() => [
            createVNode(_component_t_form, {
              "label-width": "80px",
              labelAlign: "top"
            }, {
              default: withCtx(() => [
                createVNode(_component_t_form_item, {
                  label: _ctx.$t('login.requestAddress')
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_input, {
                      modelValue: unref(tempBaseUrl),
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = $event => (isRef(tempBaseUrl) ? (tempBaseUrl).value = $event : null)),
                      placeholder: "http://localhost:10588"
                    }, null, 8, ["modelValue"])
                  ]),
                  _: 1
                }, 8, ["label"])
              ]),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["visible", "header"]),
        createBaseVNode("div", _hoisted_2, [
          _cache[6] || (_cache[6] = createBaseVNode("div", { class: "logoImg" }, null, -1)),
          createBaseVNode("div", _hoisted_3, [
            _cache[5] || (_cache[5] = createBaseVNode("span", { class: "logoText" }, "ToonFlow", -1)),
            createBaseVNode("span", _hoisted_4, toDisplayString(_ctx.$t("login.slogan")), 1)
          ])
        ]),
        createBaseVNode("div", _hoisted_5, [
          createVNode(_component_t_input, {
            modelValue: unref(state).user.username,
            "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((unref(state).user.username) = $event)),
            placeholder: _ctx.$t('login.username'),
            autocomplete: "username",
            size: "large"
          }, null, 8, ["modelValue", "placeholder"]),
          createVNode(_component_t_input, {
            modelValue: unref(state).user.password,
            "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((unref(state).user.password) = $event)),
            type: "password",
            placeholder: _ctx.$t('login.password'),
            size: "large"
          }, null, 8, ["modelValue", "placeholder"]),
          createVNode(_component_t_button, {
            class: "loginBtn",
            theme: "primary",
            size: "large",
            loading: unref(state).loginLoading,
            onClick: handleLogin,
            block: ""
          }, {
            default: withCtx(() => [
              createTextVNode(toDisplayString(_ctx.$t("login.login")), 1)
            ]),
            _: 1
          }, 8, ["loading"])
        ]),
        createBaseVNode("div", _hoisted_6, toDisplayString(_ctx.$t("login.tips")), 1)
      ])
    ], 4),
    createBaseVNode("div", _hoisted_7, [
      createVNode(_component_t_dropdown, {
        options: unref(langOptions),
        trigger: "click",
        onClick: handleChangeLang,
        maxColumnWidth: 150
      }, {
        default: withCtx(() => [
          createVNode(_component_t_button, {
            shape: "circle",
            theme: "default",
            size: "large"
          }, {
            icon: withCtx(() => [
              createVNode(_component_i_translate, {
                theme: "outline",
                size: "20"
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["options"]),
      createVNode(_component_t_button, {
        shape: "circle",
        theme: "primary",
        size: "large",
        onClick: _cache[4] || (_cache[4] = $event => (showSettingModal.value = true))
      }, {
        icon: withCtx(() => [
          createVNode(_component_i_setting_two, {
            theme: "outline",
            size: "20"
          })
        ]),
        _: 1
      })
    ])
  ], 64))
}
}

};
const index = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-1065d78e"]]);

export { index as default };

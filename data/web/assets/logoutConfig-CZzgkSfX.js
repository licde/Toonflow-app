import { l as defineComponent, bR as useRouter, aK as openBlock, aL as createElementBlock, j as createVNode, aM as withCtx, a$ as createTextVNode, b0 as toDisplayString, r as ref } from './vue-vendor-Cj7sXJnb.js';
import { A as Alert, B as Button, I as Icon, o as Space, W as DialogPlugin } from './tdesign-C157N6jJ.js';
import { _ as _export_sfc } from './index-BvNjvLGR.js';
import './dayjs-CuToSpIM.js';
import './markdown-S9HtUHKW.js';
import './i18n-DbW3ZkIb.js';

const _hoisted_1 = { class: "logout-config" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "logoutConfig",
  setup(__props) {
    const router = useRouter();
    const loading = ref(false);
    function openLogoutDialog() {
      const dialog = DialogPlugin.confirm({
        header: $t("settings.logout.logout"),
        body: $t("settings.logout.confirmLogout"),
        confirmBtn: {
          content: $t("settings.logout.logout"),
          theme: "danger"
        },
        cancelBtn: $t("common.cancel"),
        onConfirm: async () => {
          dialog.destroy();
          await handleLogout();
        },
        onClose: () => dialog.destroy()
      });
    }
    async function handleLogout() {
      loading.value = true;
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.$message.success($t("settings.logout.msg.logoutSuccess"));
        router.push("/login");
      } catch (error) {
        window.$message.error($t("settings.logout.msg.logoutFailed"));
      } finally {
        loading.value = false;
      }
    }
    return (_ctx, _cache) => {
      const _component_t_alert = Alert;
      const _component_t_icon = Icon;
      const _component_t_button = Button;
      const _component_t_space = Space;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(_component_t_space, {
          direction: "vertical",
          size: "medium"
        }, {
          default: withCtx(() => [
            createVNode(_component_t_alert, {
              theme: "warning",
              message: _ctx.$t("settings.logout.warning")
            }, null, 8, ["message"]),
            createVNode(_component_t_button, {
              theme: "danger",
              loading: loading.value,
              onClick: openLogoutDialog
            }, {
              icon: withCtx(() => [
                createVNode(_component_t_icon, { name: "logout" })
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("settings.logout.logout")), 1)
              ]),
              _: 1
            }, 8, ["loading"])
          ]),
          _: 1
        })
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const logoutConfig = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-e0f76e54"]]);

export { logoutConfig as default };

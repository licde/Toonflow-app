import { n as nextTick, r as ref, h, q as render } from './vue-vendor-Byo5TD6r.js';
import AssetsView from './index-DwxuFSda.js';
import { E as Dialog } from './tdesign-CfL1pweZ.js';

function openAssetsSelector(options = {}) {
  const { types, clipMediaTypes, multiple = true, title = window.$t("common.selectAssets"), selectorMode = false } = options;
  return new Promise((resolve) => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const visible = ref(false);
    const assetsRef = ref();
    let done = false;
    const cleanup = () => {
      render(null, container);
      container.remove();
    };
    const finish = (assets) => {
      if (done) return;
      done = true;
      visible.value = false;
      renderDialog();
      resolve(assets);
    };
    const renderDialog = () => {
      const vnode = h(
        Dialog,
        {
          visible: visible.value,
          header: title,
          width: "80%",
          top: "5vh",
          destroyOnClose: true,
          confirmBtn: window.$t("common.confirm"),
          cancelBtn: window.$t("common.cancel"),
          onConfirm: () => {
            const selectedKeys = assetsRef.value?.selectedRowKeys || [];
            const selectedSubKeys = assetsRef.value?.selectedSubRowKeys || [];
            const data = assetsRef.value?.tableData || [];
            const selectedParents = data.filter((item) => selectedKeys.includes(item.id));
            const selectedSubs = [];
            data.forEach((item) => {
              item.sonAssets?.forEach((sub) => {
                if (selectedSubKeys.includes(sub.id)) selectedSubs.push(sub);
              });
            });
            finish([...selectedParents, ...selectedSubs]);
          },
          onClose: () => finish([]),
          onCancel: () => finish([]),
          onClosed: () => cleanup()
        },
        {
          default: () => h("div", { style: "height: 72vh; overflow: auto;" }, [
            h(AssetsView, {
              ref: assetsRef,
              selectorMode,
              allowedTypes: types,
              clipMediaTypes,
              multiple
            })
          ])
        }
      );
      const appContext = document.querySelector("#app")?.__vue_app__?._context;
      if (appContext) {
        vnode.appContext = appContext;
      }
      render(vnode, container);
    };
    renderDialog();
    nextTick(() => {
      visible.value = true;
      renderDialog();
    });
  });
}

export { openAssetsSelector as o };

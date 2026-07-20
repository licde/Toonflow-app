import { l as defineComponent, bU as useModel, b2 as resolveComponent, aK as openBlock, aS as createBlock, aM as withCtx, aO as createBaseVNode, a1 as unref, aL as createElementBlock, b0 as toDisplayString, aT as createCommentVNode, F as Fragment, aP as renderList, aU as normalizeClass, j as createVNode, a$ as createTextVNode, bK as withKeys, bH as withModifiers, av as isRef, bV as mergeModels, r as ref, n as nextTick, w as watch, c as computed, bM as storeToRefs, o as onMounted, a7 as resolveDirective, E as withDirectives, bE as createSlots } from './vue-vendor-Byo5TD6r.js';
import { A as AsyncMdPreview } from './AsyncMdPreview-DiyLF9bR.js';
import { A as AsyncMonacoEditor } from './AsyncMonacoEditor-DjKHAp69.js';
import { i as instance } from './axios-mQi6SvTz.js';
import { m as modelProviderRules, p as providersLogo } from './providersLogo-BCbaFq8_.js';
import { _ as _export_sfc, s as settingStore } from './index-Iu-bOXAU.js';
import { E as Dialog, T as Textarea, B as Button, af as RadioGroup, ag as RadioButton, J as FormItem, L as Loading, I as Icon, ab as MenuItem, aj as Switch, ae as Avatar, A as Alert, R as Input, C as Collapse, l as CollapsePanel, Y as Card, X as Tag, H as Form, K as Select, O as Option, ai as Radio, a7 as CheckboxGroup, a3 as Checkbox, ac as InputNumber, ak as TagInput, a0 as Upload, W as DialogPlugin, s as LoadingPlugin, aa as Menu, a4 as Empty } from './tdesign-CfL1pweZ.js';
import './dayjs-CuToSpIM.js';
import './markdown-CDQfeHxT.js';
import './i18n-C05S5xzz.js';

const VENDOR_CODE_TEMPLATE = '/**\r\n * Toonflow AI供应商模板\r\n * @version 2.0\r\n */\r\n\r\n// ============================================================\r\n// 类型定义\r\n// ============================================================\r\n\r\ntype VideoMode =\r\n  | "singleImage" //单图参考\r\n  | "startEndRequired" //首尾帧（两张都得有）\r\n  | "endFrameOptional" //首尾帧（尾帧可选）\r\n  | "startFrameOptional" //首尾帧（首帧可选）\r\n  | "text" //文本\r\n  | (`videoReference:${number}` | `imageReference:${number}` | `audioReference:${number}`)[]; //多参考（数字代表限制数量）\r\n\r\ninterface TextModel {\r\n  name: string;\r\n  modelName: string;\r\n  type: "text";\r\n  think: boolean;\r\n}\r\n\r\ninterface ImageModel {\r\n  name: string;\r\n  modelName: string;\r\n  type: "image";\r\n  mode: ("text" | "singleImage" | "multiReference")[];\r\n  associationSkills?: string;\r\n}\r\n\r\ninterface VideoModel {\r\n  name: string;\r\n  modelName: string;\r\n  type: "video";\r\n  mode: VideoMode[];\r\n  associationSkills?: string;\r\n  audio: "optional" | false | true;\r\n  durationResolutionMap: { duration: number[]; resolution: string[] }[];\r\n}\r\n\r\ninterface TTSModel {\r\n  name: string;\r\n  modelName: string;\r\n  type: "tts";\r\n  voices: { title: string; voice: string }[];\r\n}\r\n\r\ninterface VendorConfig {\r\n  id: string; //唯一ID，作为文件名存储用户磁盘上，禁止符号\r\n  version: string; //版本号，格式为x.y，需遵守语义化版本控制\r\n  name: string; //供应商名称\r\n  author: string; //作者\r\n  description?: string; //描述，支持Markdown格式\r\n  icon?: string; //图标，仅支持Base64格式，建议尺寸为128x128像素\r\n  inputs: { key: string; label: string; type: "text" | "password" | "url"; required: boolean; placeholder?: string }[];\r\n  inputValues: Record<string, string>;\r\n  models: (TextModel | ImageModel | VideoModel | TTSModel)[];\r\n}\r\n\r\ntype ReferenceList =\r\n  | { type: "image"; sourceType: "base64"; base64: string }\r\n  | { type: "audio"; sourceType: "base64"; base64: string }\r\n  | { type: "video"; sourceType: "base64"; base64: string };\r\n\r\ninterface ImageConfig {\r\n  prompt: string;\r\n  referenceList?: Extract<ReferenceList, { type: "image" }>[];\r\n  size: "1K" | "2K" | "4K";\r\n  aspectRatio: `${number}:${number}`;\r\n}\r\n\r\ninterface VideoConfig {\r\n  duration: number;\r\n  resolution: string;\r\n  aspectRatio: "16:9" | "9:16";\r\n  prompt: string;\r\n  referenceList?: ReferenceList[];\r\n  audio?: boolean;\r\n  mode: VideoMode[];\r\n}\r\n\r\ninterface TTSConfig {\r\n  text: string;\r\n  voice: string;\r\n  speechRate: number;\r\n  pitchRate: number;\r\n  volume: number;\r\n  referenceList?: Extract<ReferenceList, { type: "audio" }>[];\r\n}\r\n\r\ninterface PollResult {\r\n  completed: boolean;\r\n  data?: string;\r\n  error?: string;\r\n}\r\n\r\n// ============================================================\r\n// 全局声明\r\n// ============================================================\r\n\r\ndeclare const axios: any; // HTTP请求库\r\ndeclare const logger: (msg: string) => void; // 日志函数\r\ndeclare const jsonwebtoken: any; // JWT处理库\r\ndeclare const zipImage: (base64: string, size: number) => Promise<string>; // 图片压缩函数，返回有头base64字符串\r\ndeclare const zipImageResolution: (base64: string, w: number, h: number) => Promise<string>; // 图片分辨率调整函数，返回有头base64字符串\r\ndeclare const mergeImages: (base64Arr: string[], maxSize?: string) => Promise<string>; // 图片合成函数，返回有头base64字符串\r\ndeclare const urlToBase64: (url: string) => Promise<string>; // URL转Base64函数，返回有头base64字符串\r\ndeclare const pollTask: (fn: () => Promise<PollResult>, interval?: number, timeout?: number) => Promise<PollResult>; // 轮询函数，fn为异步函数，interval为轮询间隔，timeout为超时时间，返回fn的结果\r\ndeclare const createOpenAI: any;\r\ndeclare const createDeepSeek: any;\r\ndeclare const createZhipu: any;\r\ndeclare const createQwen: any;\r\ndeclare const createAnthropic: any;\r\ndeclare const createOpenAICompatible: any;\r\ndeclare const createXai: any;\r\ndeclare const createMinimax: any;\r\ndeclare const createGoogleGenerativeAI: any;\r\ndeclare const exports: {\r\n  vendor: VendorConfig;\r\n  textRequest: (m: TextModel) => any; //文本模型\r\n  imageRequest: (c: ImageConfig, m: ImageModel) => Promise<string>; //图片模型，返回有头base64字符串\r\n  videoRequest: (c: VideoConfig, m: VideoModel) => Promise<string>; //视频模型，返回有头base64字符串\r\n  ttsRequest: (c: TTSConfig, m: TTSModel) => Promise<string>; //（暂未开放）语音模型，返回有头base64字符串\r\n  checkForUpdates?: () => Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }>; //检查更新函数，返回是否有更新和最新版本号和更公告（支持Markdown格式）\r\n  updateVendor?: () => Promise<string>; //更新函数，返回最新的代码文本\r\n};\r\n\r\n// ============================================================\r\n// 供应商配置\r\n// ============================================================\r\n\r\nconst vendor: VendorConfig = {\r\n  id: "bull",\r\n  version: "2.0",\r\n  author: "Toonflow",\r\n  name: "空模板",\r\n  description: "## OpenAI标准格式接口，可修改请求地址并手动添加模型。",\r\n  inputs: [\r\n    { key: "apiKey", label: "API密钥", type: "password", required: true },\r\n    { key: "baseUrl", label: "请求地址", type: "url", required: true, placeholder: "示例：https://api.openai.com/v1" },\r\n  ],\r\n  inputValues: { apiKey: "", baseUrl: "https://api.openai.com/v1" },\r\n  models: [{ name: "GPT-4o", modelName: "gpt-4o", type: "text", think: false }],\r\n};\r\n\r\n// ============================================================\r\n// 适配器函数\r\n// ============================================================\r\n\r\nconst textRequest = (model: TextModel) => {\r\n  if (!vendor.inputValues.apiKey) throw new Error("缺少API Key");\r\n  const apiKey = vendor.inputValues.apiKey.replace(/^Bearer\\s+/i, "");\r\n  return createOpenAI({ baseURL: vendor.inputValues.baseUrl, apiKey }).chat(model.modelName);\r\n};\r\n\r\nconst imageRequest = async (config: ImageConfig, model: ImageModel): Promise<string> => {\r\n  return "";\r\n};\r\n\r\nconst videoRequest = async (config: VideoConfig, model: VideoModel): Promise<string> => {\r\n  return "";\r\n};\r\n\r\nconst ttsRequest = async (config: TTSConfig, model: TTSModel): Promise<string> => {\r\n  return "";\r\n};\r\n\r\nconst checkForUpdates = async (): Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }> => {\r\n  return { hasUpdate: false, latestVersion: "2.0", notice: "## 新版本更新公告" };\r\n};\r\n\r\nconst updateVendor = async (): Promise<string> => {\r\n  return "";\r\n};\r\n\r\n// ============================================================\r\n// 导出\r\n// ============================================================\r\n\r\nexports.vendor = vendor;\r\nexports.textRequest = textRequest;\r\nexports.imageRequest = imageRequest;\r\nexports.videoRequest = videoRequest;\r\nexports.ttsRequest = ttsRequest;\r\nexports.checkForUpdates = checkForUpdates;\r\nexports.updateVendor = updateVendor;\r\n\r\n// 这行代码用于确保当前文件被识别为模块，避免全局变量冲突\r\nexport {};\r\n\r\n/**\r\n * ============================================================\r\n * AI 代码生成指南\r\n * ============================================================\r\n *\r\n * 【概述】\r\n * 本文件是 Toonflow AI 供应商适配模板。AI 在生成新供应商适配代码时，\r\n * 必须严格遵守以下规则，并要求用户提供目标平台的 curl 调用示例或 API 文档信息作为输入依据。\r\n *\r\n * 【前置要求】\r\n * 在生成代码前，请向用户索要以下信息（至少其一）：\r\n *   1. 目标 API 的 curl 请求示例（包含请求地址、Headers、Body 结构、响应结构）\r\n *   2. 目标 API 的官方文档链接或文档截图/文本内容\r\n *   3. 需要适配的模型类型（text / image / video / tts）及其能力说明\r\n * 没有足够信息时，应主动追问，不要凭空编造 API 结构。\r\n *\r\n * 【代码规则】\r\n *\r\n * 1. 禁止引入任何外部包\r\n *    不可使用 import / require，仅能使用本文件「全局声明」区域中已声明的方法和对象，\r\n *    包括：axios、logger、jsonwebtoken、zipImage、zipImageResolution、mergeImages、\r\n *    urlToBase64、pollTask，以及 createOpenAI、createDeepSeek、createZhipu、createQwen、\r\n *    createAnthropic、createOpenAICompatible、createXai、createMinimax、\r\n *    createGoogleGenerativeAI 等 AI SDK 工厂函数。\r\n *\r\n * 2. 禁止在 exports.* 函数外部声明离散的全大写常量\r\n *    错误示例：const API_URL = "https://..."; const MAX_RETRY = 3;\r\n *    如果确实需要可配置的常量值，必须将其声明在 vendor.inputValues 中，\r\n *    通过 vendor.inputValues.xxx 访问，让用户可在界面上配置。\r\n *    如果是纯逻辑内部使用的临时变量，应内联在对应的 exports.* 函数体内部，使用小驼峰命名。\r\n *\r\n * 3. 逻辑尽量聚合在 exports.* 对应的函数内部\r\n *    每个适配函数（textRequest / imageRequest / videoRequest / ttsRequest）\r\n *    应自包含，将请求构造、发送、轮询、结果解析等逻辑写在函数体内，避免拆分出大量外部辅助函数。\r\n *    如果多个函数确实存在公共逻辑（如签名计算、Token 生成、请求头构造），\r\n *    可提取为文件内的小驼峰命名函数，放在「适配器函数」区块之前的「辅助工具」区块中，\r\n *    且不可使用全大写命名。\r\n *\r\n * 4. 命名规范\r\n *    所有变量、函数一律使用小驼峰命名（camelCase），禁止使用 UPPER_SNAKE_CASE。\r\n *\r\n * 5. 不需要重新声明类型\r\n *    本文件顶部已完整定义了所有接口和类型（VendorConfig、ImageConfig、VideoConfig、\r\n *    TTSConfig、TextModel、ImageModel、VideoModel、TTSModel、ReferenceList、PollResult 等），\r\n *    AI 生成代码时直接使用即可，不要重复声明。\r\n *\r\n * 6. 返回值规范\r\n *    - textRequest(model)：返回 AI SDK 的 chat model 实例（通过 createOpenAI 等工厂函数创建）。\r\n *    - imageRequest(config, model)：返回有头 base64 字符串（如 "data:image/png;base64,..."）。\r\n *      config.referenceList 为 Extract<ReferenceList, { type: "image" }>[] 类型，\r\n *      每个引用条目均为 base64 形式（sourceType 固定为 "base64"）。\r\n *    - videoRequest(config, model)：返回有头 base64 字符串（如 "data:video/mp4;base64,..."）。\r\n *      config.referenceList 为 ReferenceList[] 类型，可包含 image / video / audio 三种引用，\r\n *      每个引用条目均为 base64 形式（sourceType 固定为 "base64"）。\r\n *      config.mode 为当前激活的视频模式数组，需根据 mode 决定如何使用 referenceList。\r\n *    - ttsRequest(config, model)：返回有头 base64 字符串（如 "data:audio/mp3;base64,..."）。\r\n *      config.referenceList 为 Extract<ReferenceList, { type: "audio" }>[] 类型（音频参考）。\r\n *    当 API 返回的是 URL 而非二进制数据时，使用 urlToBase64(url) 转换。\r\n *\r\n * 7. ReferenceList 与 VideoMode 说明\r\n *    ReferenceList 是统一的多媒体引用类型，每个条目包含：\r\n *      - type: "image" | "audio" | "video"（媒体类型）\r\n *      - sourceType: "base64"（当前模板固定为 base64）\r\n *      - base64（对应的数据）\r\n *\r\n *    VideoMode 定义了视频模型支持的输入模式：\r\n *      - "text"：纯文本生成视频\r\n *      - "singleImage"：单张首帧图片\r\n *      - "startEndRequired"：首尾帧（两张都必须提供）\r\n *      - "endFrameOptional"：首尾帧（尾帧可选）\r\n *      - "startFrameOptional"：首尾帧（首帧可选）\r\n *      - 数组形式如 ["imageReference:9", "videoReference:3", "audioReference:3"]：\r\n *        多模态参考模式，数字表示该类型的最大数量限制。\r\n *\r\n *    在 videoRequest 中，config.mode 表示当前选择的模式，需根据其值决定：\r\n *      - 如何从 config.referenceList 中提取对应类型的引用\r\n *      - 如何构造 API 请求体中的图片/视频/音频参数\r\n *\r\n * 8. 异步任务处理\r\n *    对于视频生成等需要轮询的异步任务，使用全局的 pollTask 函数：\r\n *    const result = await pollTask(async () => {\r\n *      const resp = await axios.get(...);\r\n *      if (resp.data.status === "SUCCESS") return { completed: true, data: resp.data.url };\r\n *      if (resp.data.status === "FAILED") return { completed: true, error: resp.data.message };\r\n *      return { completed: false };\r\n *    }, 5000, 600000); // 每5秒轮询，10分钟超时\r\n *    if (result.error) throw new Error(result.error);\r\n *    return await urlToBase64(result.data!);\r\n *\r\n * 9. 错误处理\r\n *    在每个函数开头校验必需参数（如 API Key），缺失时使用 throw new Error("...") 抛出。\r\n *    API 请求失败时，从响应中提取有意义的错误信息抛出，不要吞掉异常。\r\n *\r\n * 10. 日志输出\r\n *     在关键步骤使用 logger("...") 输出日志（如"开始提交任务"、"任务ID: xxx"、"轮询中..."），\r\n *     便于调试。\r\n *\r\n * 11. vendor 配置填写\r\n *     - id：纯英文小写，作为文件名使用，禁止特殊符号和空格。\r\n *     - version：语义化版本格式 "x.y"。\r\n *     - inputs：根据目标 API 所需的认证信息配置（API Key、Secret、请求地址等）。\r\n *     - models：根据目标平台支持的模型列表填写，注意正确设置 type 和各模型特有字段。\r\n *       - VideoModel 的 mode 对应 API 支持的输入模式（参见规则 7 的 VideoMode 说明）。\r\n *       - VideoModel 的 audio 字段：true（始终生成音频）、false（不生成）、"optional"（用户可选）。\r\n *       - VideoModel 的 durationResolutionMap 对应各时长下可选的分辨率。\r\n *       - VideoModel 的 associationSkills 可选，用于描述模型的特殊能力。\r\n *       - ImageModel 的 mode 对应 API 支持的生图模式（"text" 纯文本、"singleImage" 单图参考、"multiReference" 多图参考）。\r\n *       - TTSModel 的 voices 对应可选的音色列表。\r\n *\r\n * 12. 图片处理\r\n *     - 需要压缩图片体积时使用 zipImage(base64, maxSizeKB)。\r\n *     - 需要调整图片分辨率时使用 zipImageResolution(base64, width, height)。\r\n *     - 需要将多张图片拼合为一张时使用 mergeImages(base64Arr, maxSize)。\r\n *     - 以上函数均接收和返回有头 base64 字符串。\r\n *\r\n * 13. 文件结构\r\n *     生成的代码必须保持本模板的整体结构：\r\n *     类型定义区 → 全局声明区 → 供应商配置区 → [辅助工具区（可选）] → 适配器函数区 → 导出区\r\n *     不要打乱顺序，不要删除已有的结构注释分隔线。\r\n *     辅助工具区用于放置多个适配器函数共享的小驼峰命名辅助函数（如 getHeaders、getBaseUrl）。\r\n *\r\n * 14. 导出规范\r\n *     必须导出以下字段（通过 exports.xxx = xxx 赋值）：\r\n *       - exports.vendor（必须）\r\n *       - exports.textRequest（必须）\r\n *       - exports.imageRequest（必须）\r\n *       - exports.videoRequest（必须）\r\n *       - exports.ttsRequest（必须）\r\n *       - exports.checkForUpdates（可选）\r\n *       - exports.updateVendor（可选）\r\n *     未实现的适配器函数保留空实现（return ""），不可省略导出。\r\n *     文件末尾必须包含 export {}; 以确保文件被识别为模块。\r\n *\r\n * 【生成流程】\r\n * 当用户请求生成新的供应商适配时：\r\n *   1. 确认用户已提供 curl 示例或 API 文档。\r\n *   2. 分析 API 的认证方式、端点地址、请求/响应结构。\r\n *   3. 基于本模板结构，填充 vendor 配置和对应的适配器函数。\r\n *   4. 根据当前模板的 ReferenceList 定义，按 base64 形式构造和消费 referenceList。\r\n *   5. 仅实现用户需要的模型类型，未用到的函数保留空实现（return ""）。\r\n *   6. 生成完整可用的代码，确保无语法错误、无遗漏导出。\r\n */\r\n';

const _hoisted_1$6 = { class: "textTestDialog" };
const _hoisted_2$6 = {
  key: 0,
  class: "emptyHint"
};
const _hoisted_3$4 = { class: "bubble" };
const _hoisted_4$3 = { class: "role" };
const _hoisted_5$3 = {
  key: 0,
  class: "content"
};
const _hoisted_6$3 = {
  key: 0,
  class: "thinkContent"
};
const _hoisted_7$3 = {
  key: 1,
  class: "cursor"
};
const _hoisted_8$3 = {
  key: 1,
  class: "content"
};
const _hoisted_9$3 = { class: "inputArea" };
const _hoisted_10$3 = { class: "inputActions" };
const _hoisted_11$3 = { class: "hint" };
const _hoisted_12$3 = { class: "btns" };
const _sfc_main$6 = /* @__PURE__ */ defineComponent({
  __name: "TextModelTest",
  props: /* @__PURE__ */ mergeModels({
    vendorId: {},
    modelName: {}
  }, {
    "modelVisible": { type: Boolean },
    "modelVisibleModifiers": {}
  }),
  emits: ["update:modelVisible"],
  setup(__props) {
    const props = __props;
    const visible = useModel(__props, "modelVisible");
    const messages = ref([]);
    const inputText = ref("");
    const loading = ref(false);
    const messageListRef = ref(null);
    function scrollToBottom() {
      nextTick(() => {
        if (messageListRef.value) {
          messageListRef.value.scrollTop = messageListRef.value.scrollHeight;
        }
      });
    }
    async function handleSend() {
      const text = inputText.value.trim();
      if (!text || loading.value) return;
      messages.value.push({ role: "user", content: text });
      inputText.value = "";
      loading.value = true;
      const assistantMsg = { role: "assistant", content: "", loading: true };
      messages.value.push(assistantMsg);
      scrollToBottom();
      try {
        const history = messages.value.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
        const { data } = await instance.post("/setting/vendorConfig/modelTest/textTest", {
          modelName: props.modelName,
          id: props.vendorId,
          messages: history
        });
        assistantMsg.content = typeof data === "string" ? data : data?.content ?? JSON.stringify(data);
        assistantMsg.thinking = data?.thinking ?? void 0;
        assistantMsg.loading = false;
      } catch (e) {
        const errMsg = e?.response?.data?.message || e?.response?.data || e?.message || String(e);
        assistantMsg.content = `❌ ${typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg)}`;
        assistantMsg.loading = false;
      } finally {
        loading.value = false;
        scrollToBottom();
      }
    }
    function handleClear() {
      messages.value = [];
    }
    function handleClose() {
      messages.value = [];
      inputText.value = "";
      loading.value = false;
    }
    return (_ctx, _cache) => {
      const _component_i_thinking_problem = resolveComponent("i-thinking-problem");
      const _component_t_textarea = Textarea;
      const _component_t_button = Button;
      const _component_i_send = resolveComponent("i-send");
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        placement: "center",
        width: "60vw",
        visible: visible.value,
        "onUpdate:visible": _cache[1] || (_cache[1] = ($event) => visible.value = $event),
        header: _ctx.$t("settings.vendor.test.textTitle") + " - " + __props.modelName,
        footer: false,
        onClosed: handleClose
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$6, [
            createBaseVNode("div", {
              class: "messageList",
              ref_key: "messageListRef",
              ref: messageListRef
            }, [
              unref(messages).length === 0 ? (openBlock(), createElementBlock("div", _hoisted_2$6, toDisplayString(_ctx.$t("settings.vendor.test.textEmptyHint")), 1)) : createCommentVNode("", true),
              (openBlock(true), createElementBlock(Fragment, null, renderList(unref(messages), (msg, idx) => {
                return openBlock(), createElementBlock("div", {
                  key: idx,
                  class: normalizeClass(["messageItem", msg.role])
                }, [
                  createBaseVNode("div", _hoisted_3$4, [
                    createBaseVNode("div", _hoisted_4$3, toDisplayString(msg.role === "user" ? _ctx.$t("settings.vendor.test.you") : _ctx.$t("settings.vendor.test.assistant")), 1),
                    msg.role === "assistant" ? (openBlock(), createElementBlock("div", _hoisted_5$3, [
                      msg.thinking ? (openBlock(), createElementBlock("span", _hoisted_6$3, [
                        createVNode(_component_i_thinking_problem, {
                          theme: "outline",
                          size: "14"
                        }),
                        createTextVNode(" " + toDisplayString(msg.thinking), 1)
                      ])) : createCommentVNode("", true),
                      createBaseVNode("span", null, toDisplayString(msg.content), 1),
                      msg.loading ? (openBlock(), createElementBlock("span", _hoisted_7$3, "▌")) : createCommentVNode("", true)
                    ])) : (openBlock(), createElementBlock("div", _hoisted_8$3, toDisplayString(msg.content), 1))
                  ])
                ], 2);
              }), 128))
            ], 512),
            createBaseVNode("div", _hoisted_9$3, [
              createVNode(_component_t_textarea, {
                modelValue: unref(inputText),
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(inputText) ? inputText.value = $event : null),
                placeholder: _ctx.$t("settings.vendor.test.textInputPlaceholder"),
                autosize: { minRows: 2, maxRows: 5 },
                disabled: unref(loading),
                onKeydown: withKeys(withModifiers(handleSend, ["ctrl", "exact"]), ["enter"])
              }, null, 8, ["modelValue", "placeholder", "disabled", "onKeydown"]),
              createBaseVNode("div", _hoisted_10$3, [
                createBaseVNode("span", _hoisted_11$3, "Ctrl + Enter " + toDisplayString(_ctx.$t("settings.vendor.test.send")), 1),
                createBaseVNode("div", _hoisted_12$3, [
                  createVNode(_component_t_button, {
                    variant: "outline",
                    size: "small",
                    disabled: unref(loading) || unref(messages).length === 0,
                    onClick: handleClear
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("settings.vendor.test.clearHistory")), 1)
                    ]),
                    _: 1
                  }, 8, ["disabled"]),
                  createVNode(_component_t_button, {
                    theme: "primary",
                    size: "small",
                    loading: unref(loading),
                    disabled: !unref(inputText).trim(),
                    onClick: handleSend
                  }, {
                    icon: withCtx(() => [
                      createVNode(_component_i_send, { theme: "outline" })
                    ]),
                    default: withCtx(() => [
                      createTextVNode(" " + toDisplayString(_ctx.$t("settings.vendor.test.send")), 1)
                    ]),
                    _: 1
                  }, 8, ["loading", "disabled"])
                ])
              ])
            ])
          ])
        ]),
        _: 1
      }, 8, ["visible", "header"]);
    };
  }
});

/* unplugin-vue-components disabled */

const TextModelTest = /* @__PURE__ */ _export_sfc(_sfc_main$6, [["__scopeId", "data-v-09ade7e9"]]);

const _hoisted_1$5 = { class: "imageTestDialog" };
const _hoisted_2$5 = { class: "modeBar" };
const _hoisted_3$3 = { class: "inputSection" };
const _hoisted_4$2 = {
  key: 0,
  class: "uploadRow"
};
const _hoisted_5$2 = ["src"];
const _hoisted_6$2 = { class: "uploadText" };
const _hoisted_7$2 = { class: "uploadHint" };
const _hoisted_8$2 = {
  key: 0,
  class: "resultSection"
};
const _hoisted_9$2 = { class: "resultLabel" };
const _hoisted_10$2 = { class: "resultImg" };
const _hoisted_11$2 = ["src"];
const _hoisted_12$2 = {
  key: 1,
  class: "loadingSection"
};
const _hoisted_13$2 = { class: "dialogFooter" };
const _sfc_main$5 = /* @__PURE__ */ defineComponent({
  __name: "ImageModelTest",
  props: /* @__PURE__ */ mergeModels({
    vendorId: {},
    modelName: {},
    supportedModes: {}
  }, {
    "modelVisible": { type: Boolean },
    "modelVisibleModifiers": {}
  }),
  emits: ["update:modelVisible"],
  setup(__props) {
    const visible = useModel(__props, "modelVisible");
    const props = __props;
    const MODE_OPTIONS = [
      { value: "text", label: $t("settings.vendor.test.textToImage") },
      { value: "singleImage", label: $t("settings.vendor.test.imageToImage") },
      { value: "multiReference", label: $t("settings.vendor.test.multiRef") }
    ];
    const availableModes = computed(() => MODE_OPTIONS.filter((m) => props.supportedModes.includes(m.value)));
    const testMode = ref("text");
    watch(
      () => props.supportedModes,
      (modes) => {
        if (modes.length > 0 && !modes.includes(testMode.value)) {
          testMode.value = modes[0];
        }
      },
      { immediate: true }
    );
    watch(testMode, () => {
      imageFile.value = null;
      imagePreview.value = "";
      resultUrl.value = "";
    });
    const prompt = ref("");
    const imageFile = ref(null);
    const imagePreview = ref("");
    const imageInputRef = ref(null);
    const loading = ref(false);
    const resultUrl = ref("");
    const canSubmit = computed(() => {
      if (loading.value) return false;
      if (testMode.value === "text") return !!prompt.value.trim();
      if (testMode.value === "singleImage" || testMode.value === "multiReference") return !!imageFile.value;
      return false;
    });
    function triggerImageUpload() {
      imageInputRef.value?.click();
    }
    function handleImageChange(e) {
      const file = e.target.files?.[0];
      if (!file) return;
      imageFile.value = file;
      imagePreview.value = URL.createObjectURL(file);
      e.target.value = "";
    }
    function handleDrop(e) {
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith("image/")) {
        imageFile.value = file;
        imagePreview.value = URL.createObjectURL(file);
      }
    }
    const fileToDataURL = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    async function handleTest() {
      loading.value = true;
      resultUrl.value = "";
      try {
        const payload = {
          modelName: props.modelName,
          id: props.vendorId
        };
        const p = prompt.value.trim();
        if (p) payload.prompt = p;
        if (imageFile.value) {
          payload.imageBase64 = await fileToDataURL(imageFile.value);
        }
        const { data } = await instance.post("/setting/vendorConfig/modelTest/imageTest", payload);
        resultUrl.value = data;
        window.$message.success($t("settings.vendor.msg.imageGenSuccess"));
      } catch (e) {
        window.$message.error(e.message ?? `${$t("settings.vendor.msg.requestFailed")}`);
      } finally {
        loading.value = false;
      }
    }
    function handleClose() {
      prompt.value = "";
      imageFile.value = null;
      imagePreview.value = "";
      resultUrl.value = "";
      loading.value = false;
    }
    return (_ctx, _cache) => {
      const _component_t_radio_button = RadioButton;
      const _component_t_radio_group = RadioGroup;
      const _component_i_picture = resolveComponent("i-picture");
      const _component_t_textarea = Textarea;
      const _component_t_form_item = FormItem;
      const _component_t_loading = Loading;
      const _component_t_button = Button;
      const _component_i_lightning = resolveComponent("i-lightning");
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        placement: "center",
        width: "56vw",
        visible: visible.value,
        "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => visible.value = $event),
        header: _ctx.$t("settings.vendor.test.imageTitle") + " - " + __props.modelName,
        footer: false,
        onClosed: handleClose
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$5, [
            createBaseVNode("div", _hoisted_2$5, [
              createVNode(_component_t_radio_group, {
                modelValue: unref(testMode),
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(testMode) ? testMode.value = $event : null),
                variant: "default-filled"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(availableModes), (m) => {
                    return openBlock(), createBlock(_component_t_radio_button, {
                      key: m.value,
                      value: m.value
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(m.label), 1)
                      ]),
                      _: 2
                    }, 1032, ["value"]);
                  }), 128))
                ]),
                _: 1
              }, 8, ["modelValue"])
            ]),
            createBaseVNode("div", _hoisted_3$3, [
              unref(testMode) === "singleImage" ? (openBlock(), createElementBlock("div", _hoisted_4$2, [
                createBaseVNode("div", {
                  class: "uploadBox",
                  onClick: triggerImageUpload,
                  onDragover: _cache[1] || (_cache[1] = withModifiers(() => {
                  }, ["prevent"])),
                  onDrop: withModifiers(handleDrop, ["prevent"])
                }, [
                  unref(imagePreview) ? (openBlock(), createElementBlock("img", {
                    key: 0,
                    src: unref(imagePreview),
                    class: "previewImg",
                    alt: "preview"
                  }, null, 8, _hoisted_5$2)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                    createVNode(_component_i_picture, {
                      theme: "outline",
                      size: "32",
                      fill: "var(--td-brand-color)"
                    }),
                    createBaseVNode("p", _hoisted_6$2, toDisplayString(_ctx.$t("settings.vendor.test.uploadImage")), 1),
                    createBaseVNode("p", _hoisted_7$2, toDisplayString(_ctx.$t("settings.vendor.test.supportFormat")), 1)
                  ], 64))
                ], 32),
                createBaseVNode("input", {
                  ref_key: "imageInputRef",
                  ref: imageInputRef,
                  type: "file",
                  accept: "image/*",
                  style: { "display": "none" },
                  onChange: handleImageChange
                }, null, 544)
              ])) : createCommentVNode("", true),
              createVNode(_component_t_form_item, {
                label: _ctx.$t("settings.vendor.test.prompt")
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_textarea, {
                    modelValue: unref(prompt),
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => isRef(prompt) ? prompt.value = $event : null),
                    placeholder: _ctx.$t("settings.vendor.test.promptPlaceholder"),
                    autosize: { minRows: 2, maxRows: 4 },
                    disabled: unref(loading)
                  }, null, 8, ["modelValue", "placeholder", "disabled"])
                ]),
                _: 1
              }, 8, ["label"])
            ]),
            unref(resultUrl) ? (openBlock(), createElementBlock("div", _hoisted_8$2, [
              createBaseVNode("div", _hoisted_9$2, toDisplayString(_ctx.$t("settings.vendor.test.result")), 1),
              createBaseVNode("div", _hoisted_10$2, [
                createBaseVNode("img", {
                  src: unref(resultUrl),
                  alt: "generated"
                }, null, 8, _hoisted_11$2)
              ])
            ])) : unref(loading) ? (openBlock(), createElementBlock("div", _hoisted_12$2, [
              createVNode(_component_t_loading, {
                size: "large",
                text: _ctx.$t("settings.vendor.generating")
              }, null, 8, ["text"])
            ])) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_13$2, [
              createVNode(_component_t_button, {
                variant: "outline",
                onClick: _cache[3] || (_cache[3] = ($event) => visible.value = false)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("settings.vendor.test.cancel")), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_button, {
                theme: "primary",
                loading: unref(loading),
                disabled: !unref(canSubmit),
                onClick: handleTest
              }, {
                icon: withCtx(() => [
                  createVNode(_component_i_lightning, { theme: "outline" })
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(_ctx.$t("settings.vendor.test.startTest")), 1)
                ]),
                _: 1
              }, 8, ["loading", "disabled"])
            ])
          ])
        ]),
        _: 1
      }, 8, ["visible", "header"]);
    };
  }
});

/* unplugin-vue-components disabled */

const ImageModelTest = /* @__PURE__ */ _export_sfc(_sfc_main$5, [["__scopeId", "data-v-3dd5416b"]]);

const _hoisted_1$4 = ["src"];
const _hoisted_2$4 = { class: "boxText" };
const _hoisted_3$2 = {
  key: 0,
  class: "optionalTag"
};
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "ImageUploadBox",
  props: {
    modelValue: {},
    optional: { type: Boolean },
    label: {}
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const inputRef = ref(null);
    const previewUrl = ref("");
    watch(
      () => props.modelValue,
      (file) => {
        if (file) previewUrl.value = URL.createObjectURL(file);
        else previewUrl.value = "";
      }
    );
    function trigger() {
      inputRef.value?.click();
    }
    function handleChange(e) {
      const file = e.target.files?.[0] ?? null;
      emit("update:modelValue", file);
      e.target.value = "";
    }
    function handleDrop(e) {
      const file = e.dataTransfer?.files?.[0] ?? null;
      if (file?.type.startsWith("image/")) emit("update:modelValue", file);
    }
    function clear() {
      emit("update:modelValue", null);
    }
    return (_ctx, _cache) => {
      const _component_i_picture = resolveComponent("i-picture");
      const _component_i_close = resolveComponent("i-close");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["imageUploadBox", { optional: __props.optional, hasFile: !!__props.modelValue }]),
        onClick: trigger,
        onDragover: _cache[0] || (_cache[0] = withModifiers(() => {
        }, ["prevent"])),
        onDrop: withModifiers(handleDrop, ["prevent"])
      }, [
        __props.modelValue ? (openBlock(), createElementBlock("img", {
          key: 0,
          src: unref(previewUrl),
          class: "preview",
          alt: "preview"
        }, null, 8, _hoisted_1$4)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createVNode(_component_i_picture, {
            theme: "outline",
            size: "26",
            fill: "var(--td-brand-color)"
          }),
          createBaseVNode("p", _hoisted_2$4, toDisplayString(__props.label || _ctx.$t("settings.vendor.test.uploadImage")), 1),
          __props.optional ? (openBlock(), createElementBlock("p", _hoisted_3$2, toDisplayString(_ctx.$t("settings.vendor.test.optional")), 1)) : createCommentVNode("", true)
        ], 64)),
        __props.modelValue ? (openBlock(), createElementBlock("button", {
          key: 2,
          class: "clearBtn",
          onClick: withModifiers(clear, ["stop"])
        }, [
          createVNode(_component_i_close, {
            theme: "outline",
            size: "12"
          })
        ])) : createCommentVNode("", true),
        createBaseVNode("input", {
          ref_key: "inputRef",
          ref: inputRef,
          type: "file",
          accept: "image/*",
          style: { "display": "none" },
          onChange: handleChange
        }, null, 544)
      ], 34);
    };
  }
});

/* unplugin-vue-components disabled */

const ImageUploadBox = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-f4d54188"]]);

const _hoisted_1$3 = ["src"];
const _hoisted_2$3 = { class: "boxText" };
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "VideoUploadBox",
  props: {
    modelValue: {},
    label: {}
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const inputRef = ref(null);
    const previewUrl = ref("");
    watch(
      () => props.modelValue,
      (file) => {
        if (file) previewUrl.value = URL.createObjectURL(file);
        else previewUrl.value = "";
      }
    );
    function trigger() {
      inputRef.value?.click();
    }
    function handleChange(e) {
      const file = e.target.files?.[0] ?? null;
      emit("update:modelValue", file);
      e.target.value = "";
    }
    function handleDrop(e) {
      const file = e.dataTransfer?.files?.[0] ?? null;
      if (file?.type.startsWith("video/")) emit("update:modelValue", file);
    }
    function clear() {
      emit("update:modelValue", null);
    }
    return (_ctx, _cache) => {
      const _component_i_video_one = resolveComponent("i-video-one");
      const _component_i_close = resolveComponent("i-close");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["videoUploadBox", { hasFile: !!__props.modelValue }]),
        onClick: trigger,
        onDragover: _cache[0] || (_cache[0] = withModifiers(() => {
        }, ["prevent"])),
        onDrop: withModifiers(handleDrop, ["prevent"])
      }, [
        __props.modelValue && unref(previewUrl) ? (openBlock(), createElementBlock("video", {
          key: 0,
          src: unref(previewUrl),
          class: "preview",
          muted: ""
        }, null, 8, _hoisted_1$3)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createVNode(_component_i_video_one, {
            theme: "outline",
            size: "26",
            fill: "var(--td-brand-color)"
          }),
          createBaseVNode("p", _hoisted_2$3, toDisplayString(__props.label || _ctx.$t("settings.vendor.test.uploadVideo")), 1)
        ], 64)),
        __props.modelValue ? (openBlock(), createElementBlock("button", {
          key: 2,
          class: "clearBtn",
          onClick: withModifiers(clear, ["stop"])
        }, [
          createVNode(_component_i_close, {
            theme: "outline",
            size: "12"
          })
        ])) : createCommentVNode("", true),
        createBaseVNode("input", {
          ref_key: "inputRef",
          ref: inputRef,
          type: "file",
          accept: "video/*",
          style: { "display": "none" },
          onChange: handleChange
        }, null, 544)
      ], 34);
    };
  }
});

/* unplugin-vue-components disabled */

const VideoUploadBox = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-180dc2bb"]]);

const _hoisted_1$2 = { class: "boxText fileName" };
const _hoisted_2$2 = { class: "boxText" };
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "AudioUploadBox",
  props: {
    modelValue: {},
    label: {}
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const inputRef = ref(null);
    function trigger() {
      inputRef.value?.click();
    }
    function handleChange(e) {
      const file = e.target.files?.[0] ?? null;
      emit("update:modelValue", file);
      e.target.value = "";
    }
    function handleDrop(e) {
      const file = e.dataTransfer?.files?.[0] ?? null;
      if (file?.type.startsWith("audio/")) emit("update:modelValue", file);
    }
    function clear() {
      emit("update:modelValue", null);
    }
    return (_ctx, _cache) => {
      const _component_i_music_one = resolveComponent("i-music-one");
      const _component_i_close = resolveComponent("i-close");
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["audioUploadBox", { hasFile: !!__props.modelValue }]),
        onClick: trigger,
        onDragover: _cache[0] || (_cache[0] = withModifiers(() => {
        }, ["prevent"])),
        onDrop: withModifiers(handleDrop, ["prevent"])
      }, [
        __props.modelValue ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          createVNode(_component_i_music_one, {
            theme: "filled",
            size: "26",
            fill: "var(--td-success-color)"
          }),
          createBaseVNode("p", _hoisted_1$2, toDisplayString(__props.modelValue.name), 1)
        ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
          createVNode(_component_i_music_one, {
            theme: "outline",
            size: "26",
            fill: "var(--td-brand-color)"
          }),
          createBaseVNode("p", _hoisted_2$2, toDisplayString(__props.label || _ctx.$t("settings.vendor.test.uploadAudio")), 1)
        ], 64)),
        __props.modelValue ? (openBlock(), createElementBlock("button", {
          key: 2,
          class: "clearBtn",
          onClick: withModifiers(clear, ["stop"])
        }, [
          createVNode(_component_i_close, {
            theme: "outline",
            size: "12"
          })
        ])) : createCommentVNode("", true),
        createBaseVNode("input", {
          ref_key: "inputRef",
          ref: inputRef,
          type: "file",
          accept: "audio/*",
          style: { "display": "none" },
          onChange: handleChange
        }, null, 544)
      ], 34);
    };
  }
});

/* unplugin-vue-components disabled */

const AudioUploadBox = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-20e255aa"]]);

const _hoisted_1$1 = { class: "videoTestDialog" };
const _hoisted_2$1 = { class: "modeBar" };
const _hoisted_3$1 = { class: "modeLabel" };
const _hoisted_4$1 = {
  key: 0,
  class: "modeDesc"
};
const _hoisted_5$1 = {
  key: 1,
  class: "inputSection"
};
const _hoisted_6$1 = { class: "uploadRow" };
const _hoisted_7$1 = { class: "frameRow" };
const _hoisted_8$1 = { class: "frameRow" };
const _hoisted_9$1 = { class: "frameRow" };
const _hoisted_10$1 = { class: "multiRefSection" };
const _hoisted_11$1 = { class: "multiRefRow" };
const _hoisted_12$1 = {
  key: 2,
  class: "resultSection"
};
const _hoisted_13$1 = { class: "resultLabel" };
const _hoisted_14$1 = ["src"];
const _hoisted_15$1 = {
  key: 3,
  class: "loadingSection"
};
const _hoisted_16$1 = { class: "dialogFooter" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "VideoModelTest",
  props: /* @__PURE__ */ mergeModels({
    vendorId: {},
    modelName: {},
    rawModes: {}
  }, {
    "modelVisible": { type: Boolean },
    "modelVisibleModifiers": {}
  }),
  emits: ["update:modelVisible"],
  setup(__props) {
    const props = __props;
    const visible = useModel(__props, "modelVisible");
    const SIMPLE_MODE_MAP = {
      text: {
        label: $t("settings.vendor.test.textToVideo"),
        desc: $t("settings.vendor.test.textToVideoDesc")
      },
      singleImage: {
        label: $t("settings.vendor.test.singleImageMode"),
        desc: $t("settings.vendor.test.singleImageDesc")
      },
      startEndRequired: {
        label: $t("settings.vendor.startEndRequired"),
        desc: $t("settings.vendor.test.startEndRequiredDesc")
      },
      endFrameOptional: {
        label: $t("settings.vendor.endFrameOptional"),
        desc: $t("settings.vendor.test.endFrameOptionalDesc")
      },
      startFrameOptional: {
        label: $t("settings.vendor.startFrameOptional"),
        desc: $t("settings.vendor.test.startFrameOptionalDesc")
      }
    };
    const parsedModes = computed(() => {
      const result = [];
      for (const m of props.rawModes) {
        if (Array.isArray(m)) {
          const refs = [];
          for (const ref2 of m) {
            const match = String(ref2).match(/^(videoReference|imageReference|audioReference):(\d+)$/);
            if (match) {
              refs.push({
                type: match[1],
                count: Number(match[2])
              });
            }
          }
          if (refs.length > 0) {
            const labelParts = refs.map((r) => {
              const typeLabel = r.type === "imageReference" ? $t("settings.vendor.imageRef") : r.type === "videoReference" ? $t("settings.vendor.videoRef") : $t("settings.vendor.audioRef");
              return `${typeLabel}×${r.count}`;
            }).join(" + ");
            result.push({
              key: JSON.stringify(m),
              label: labelParts,
              desc: `${$t("settings.vendor.test.multiRefDesc")}: ${labelParts}`,
              refs
            });
          }
        } else {
          const info = SIMPLE_MODE_MAP[String(m)];
          if (info) {
            result.push({ key: String(m), label: info.label, desc: info.desc });
          }
        }
      }
      return result;
    });
    const selectedMode = ref("");
    watch(
      parsedModes,
      (modes) => {
        if (modes.length > 0 && !modes.find((m) => m.key === selectedMode.value)) {
          selectedMode.value = modes[0]?.key ?? "";
        }
      },
      { immediate: true }
    );
    watch(selectedMode, () => {
      resetUploads();
      resultUrl.value = "";
    });
    const currentModeInfo = computed(() => parsedModes.value.find((m) => m.key === selectedMode.value) ?? null);
    const currentMultiRefs = computed(() => currentModeInfo.value?.refs ?? []);
    const prompt = ref("");
    const uploadedImages = ref(Array(30).fill(null));
    const uploadedVideos = ref(Array(30).fill(null));
    const uploadedAudios = ref(Array(30).fill(null));
    const loading = ref(false);
    const resultUrl = ref("");
    function resetUploads() {
      uploadedImages.value = Array(30).fill(null);
      uploadedVideos.value = Array(30).fill(null);
      uploadedAudios.value = Array(30).fill(null);
    }
    function getRefLabel(ref2) {
      if (ref2.type === "imageReference") return `${$t("settings.vendor.imageRef")} (×${ref2.count})`;
      if (ref2.type === "videoReference") return `${$t("settings.vendor.videoRef")} (×${ref2.count})`;
      return `${$t("settings.vendor.audioRef")} (×${ref2.count})`;
    }
    function fileToDataURL(file) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
    }
    function mapTopType(mime = "") {
      if (mime.startsWith("image/")) return "image";
      if (mime.startsWith("video/")) return "video";
      if (mime.startsWith("audio/")) return "audio";
      return "";
    }
    async function encodeFiles(files) {
      const valid = (files || []).filter(Boolean);
      return Promise.all(
        valid.map(async (f) => ({
          type: mapTopType(f.type),
          base64: await fileToDataURL(f)
          // 带前缀 data:...;base64,...
        }))
      );
    }
    async function handleTest() {
      loading.value = true;
      resultUrl.value = "";
      try {
        const payload = {
          modelName: props.modelName,
          id: props.vendorId,
          mode: selectedMode.value,
          ...prompt.value.trim() ? { prompt: prompt.value.trim() } : {},
          images: await encodeFiles(uploadedImages.value.filter(Boolean)),
          videos: await encodeFiles(uploadedVideos.value.filter(Boolean)),
          audios: await encodeFiles(uploadedAudios.value.filter(Boolean))
        };
        const { data } = await instance.post("/setting/vendorConfig/modelTest/videoTest", payload, {
          timeout: 30 * 60 * 1e3
        });
        resultUrl.value = data;
        window.$message.success($t("settings.vendor.msg.videoGenSuccess"));
      } catch (e) {
        window.$message.error(e?.message ?? `${$t("settings.vendor.msg.requestFailed")}`);
      } finally {
        loading.value = false;
      }
    }
    function handleClose() {
      prompt.value = "";
      resetUploads();
      resultUrl.value = "";
      loading.value = false;
    }
    return (_ctx, _cache) => {
      const _component_t_radio_button = RadioButton;
      const _component_t_radio_group = RadioGroup;
      const _component_t_icon = Icon;
      const _component_t_textarea = Textarea;
      const _component_t_form_item = FormItem;
      const _component_t_loading = Loading;
      const _component_t_button = Button;
      const _component_i_lightning = resolveComponent("i-lightning");
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        placement: "center",
        width: "58vw",
        visible: visible.value,
        "onUpdate:visible": _cache[15] || (_cache[15] = ($event) => visible.value = $event),
        header: _ctx.$t("settings.vendor.test.videoTitle") + " - " + __props.modelName,
        footer: false,
        onClosed: handleClose
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$1, [
            createBaseVNode("div", _hoisted_2$1, [
              createBaseVNode("div", _hoisted_3$1, toDisplayString(_ctx.$t("settings.vendor.test.selectMode")), 1),
              createVNode(_component_t_radio_group, {
                modelValue: unref(selectedMode),
                "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(selectedMode) ? selectedMode.value = $event : null),
                variant: "default-filled"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(parsedModes), (m) => {
                    return openBlock(), createBlock(_component_t_radio_button, {
                      key: m.key,
                      value: m.key
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(m.label), 1)
                      ]),
                      _: 2
                    }, 1032, ["value"]);
                  }), 128))
                ]),
                _: 1
              }, 8, ["modelValue"])
            ]),
            unref(currentModeInfo) ? (openBlock(), createElementBlock("div", _hoisted_4$1, [
              createVNode(_component_t_icon, {
                name: "info-circle-filled",
                size: "14px"
              }),
              createTextVNode(" " + toDisplayString(unref(currentModeInfo).desc), 1)
            ])) : createCommentVNode("", true),
            unref(selectedMode) ? (openBlock(), createElementBlock("div", _hoisted_5$1, [
              unref(selectedMode) === "text" ? (openBlock(), createBlock(_component_t_form_item, {
                key: 0,
                label: _ctx.$t("settings.vendor.test.prompt")
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_textarea, {
                    modelValue: unref(prompt),
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(prompt) ? prompt.value = $event : null),
                    placeholder: _ctx.$t("settings.vendor.test.videoPromptPlaceholder"),
                    autosize: { minRows: 2, maxRows: 4 },
                    disabled: unref(loading)
                  }, null, 8, ["modelValue", "placeholder", "disabled"])
                ]),
                _: 1
              }, 8, ["label"])) : unref(selectedMode) === "singleImage" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.vendor.test.referenceImage")
                }, {
                  default: withCtx(() => [
                    createBaseVNode("div", _hoisted_6$1, [
                      createVNode(ImageUploadBox, {
                        modelValue: unref(uploadedImages)[0],
                        "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(uploadedImages)[0] = $event)
                      }, null, 8, ["modelValue"])
                    ])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.vendor.test.prompt")
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_textarea, {
                      modelValue: unref(prompt),
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => isRef(prompt) ? prompt.value = $event : null),
                      placeholder: _ctx.$t("settings.vendor.test.videoPromptPlaceholder"),
                      autosize: { minRows: 2, maxRows: 3 },
                      disabled: unref(loading)
                    }, null, 8, ["modelValue", "placeholder", "disabled"])
                  ]),
                  _: 1
                }, 8, ["label"])
              ], 64)) : unref(selectedMode) === "startEndRequired" ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                createBaseVNode("div", _hoisted_7$1, [
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.vendor.test.startFrame")
                  }, {
                    default: withCtx(() => [
                      createVNode(ImageUploadBox, {
                        modelValue: unref(uploadedImages)[0],
                        "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => unref(uploadedImages)[0] = $event)
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.vendor.test.endFrame")
                  }, {
                    default: withCtx(() => [
                      createVNode(ImageUploadBox, {
                        modelValue: unref(uploadedImages)[1],
                        "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => unref(uploadedImages)[1] = $event)
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"])
                ]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.vendor.test.prompt")
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_textarea, {
                      modelValue: unref(prompt),
                      "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => isRef(prompt) ? prompt.value = $event : null),
                      placeholder: _ctx.$t("settings.vendor.test.videoPromptPlaceholder"),
                      autosize: { minRows: 2, maxRows: 3 },
                      disabled: unref(loading)
                    }, null, 8, ["modelValue", "placeholder", "disabled"])
                  ]),
                  _: 1
                }, 8, ["label"])
              ], 64)) : unref(selectedMode) === "endFrameOptional" ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
                createBaseVNode("div", _hoisted_8$1, [
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.vendor.test.startFrame")
                  }, {
                    default: withCtx(() => [
                      createVNode(ImageUploadBox, {
                        modelValue: unref(uploadedImages)[0],
                        "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => unref(uploadedImages)[0] = $event)
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.vendor.test.endFrameOptional")
                  }, {
                    default: withCtx(() => [
                      createVNode(ImageUploadBox, {
                        modelValue: unref(uploadedImages)[1],
                        "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => unref(uploadedImages)[1] = $event),
                        optional: true
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"])
                ]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.vendor.test.prompt")
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_textarea, {
                      modelValue: unref(prompt),
                      "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => isRef(prompt) ? prompt.value = $event : null),
                      placeholder: _ctx.$t("settings.vendor.test.videoPromptPlaceholder"),
                      autosize: { minRows: 2, maxRows: 3 },
                      disabled: unref(loading)
                    }, null, 8, ["modelValue", "placeholder", "disabled"])
                  ]),
                  _: 1
                }, 8, ["label"])
              ], 64)) : unref(selectedMode) === "startFrameOptional" ? (openBlock(), createElementBlock(Fragment, { key: 4 }, [
                createBaseVNode("div", _hoisted_9$1, [
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.vendor.test.startFrameOptional")
                  }, {
                    default: withCtx(() => [
                      createVNode(ImageUploadBox, {
                        modelValue: unref(uploadedImages)[0],
                        "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => unref(uploadedImages)[0] = $event),
                        optional: true
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    label: _ctx.$t("settings.vendor.test.endFrame")
                  }, {
                    default: withCtx(() => [
                      createVNode(ImageUploadBox, {
                        modelValue: unref(uploadedImages)[1],
                        "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => unref(uploadedImages)[1] = $event)
                      }, null, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"])
                ]),
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.vendor.test.prompt")
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_textarea, {
                      modelValue: unref(prompt),
                      "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => isRef(prompt) ? prompt.value = $event : null),
                      placeholder: _ctx.$t("settings.vendor.test.videoPromptPlaceholder"),
                      autosize: { minRows: 2, maxRows: 3 },
                      disabled: unref(loading)
                    }, null, 8, ["modelValue", "placeholder", "disabled"])
                  ]),
                  _: 1
                }, 8, ["label"])
              ], 64)) : unref(selectedMode).startsWith("[") ? (openBlock(), createElementBlock(Fragment, { key: 5 }, [
                createVNode(_component_t_form_item, {
                  label: _ctx.$t("settings.vendor.test.prompt")
                }, {
                  default: withCtx(() => [
                    createVNode(_component_t_textarea, {
                      modelValue: unref(prompt),
                      "onUpdate:modelValue": _cache[13] || (_cache[13] = ($event) => isRef(prompt) ? prompt.value = $event : null),
                      placeholder: _ctx.$t("settings.vendor.test.videoPromptPlaceholder"),
                      disabled: unref(loading)
                    }, null, 8, ["modelValue", "placeholder", "disabled"])
                  ]),
                  _: 1
                }, 8, ["label"]),
                createBaseVNode("div", _hoisted_10$1, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(currentMultiRefs), (ref2, rIdx) => {
                    return openBlock(), createBlock(_component_t_form_item, {
                      key: rIdx,
                      label: getRefLabel(ref2)
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_11$1, [
                          ref2.type === "imageReference" ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(ref2.count, (i) => {
                            return openBlock(), createBlock(ImageUploadBox, {
                              key: i,
                              modelValue: unref(uploadedImages)[rIdx * 10 + i - 1],
                              "onUpdate:modelValue": ($event) => unref(uploadedImages)[rIdx * 10 + i - 1] = $event,
                              label: `${_ctx.$t("settings.vendor.test.image")} ${i}`
                            }, null, 8, ["modelValue", "onUpdate:modelValue", "label"]);
                          }), 128)) : ref2.type === "videoReference" ? (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(ref2.count, (i) => {
                            return openBlock(), createBlock(VideoUploadBox, {
                              key: i,
                              modelValue: unref(uploadedVideos)[rIdx * 10 + i - 1],
                              "onUpdate:modelValue": ($event) => unref(uploadedVideos)[rIdx * 10 + i - 1] = $event,
                              label: `${_ctx.$t("settings.vendor.test.video")} ${i}`
                            }, null, 8, ["modelValue", "onUpdate:modelValue", "label"]);
                          }), 128)) : ref2.type === "audioReference" ? (openBlock(true), createElementBlock(Fragment, { key: 2 }, renderList(ref2.count, (i) => {
                            return openBlock(), createBlock(AudioUploadBox, {
                              key: i,
                              modelValue: unref(uploadedAudios)[rIdx * 10 + i - 1],
                              "onUpdate:modelValue": ($event) => unref(uploadedAudios)[rIdx * 10 + i - 1] = $event,
                              label: `${_ctx.$t("settings.vendor.test.audio")} ${i}`
                            }, null, 8, ["modelValue", "onUpdate:modelValue", "label"]);
                          }), 128)) : createCommentVNode("", true)
                        ])
                      ]),
                      _: 2
                    }, 1032, ["label"]);
                  }), 128))
                ])
              ], 64)) : createCommentVNode("", true)
            ])) : createCommentVNode("", true),
            unref(resultUrl) ? (openBlock(), createElementBlock("div", _hoisted_12$1, [
              createBaseVNode("div", _hoisted_13$1, toDisplayString(_ctx.$t("settings.vendor.test.result")), 1),
              createBaseVNode("video", {
                src: unref(resultUrl),
                controls: "",
                autoplay: "",
                loop: "",
                class: "resultVideo"
              }, null, 8, _hoisted_14$1)
            ])) : unref(loading) ? (openBlock(), createElementBlock("div", _hoisted_15$1, [
              createVNode(_component_t_loading, {
                size: "large",
                text: _ctx.$t("settings.vendor.videoGenerating")
              }, null, 8, ["text"])
            ])) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_16$1, [
              createVNode(_component_t_button, {
                variant: "outline",
                onClick: _cache[14] || (_cache[14] = ($event) => visible.value = false)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("settings.vendor.test.cancel")), 1)
                ]),
                _: 1
              }),
              createVNode(_component_t_button, {
                theme: "primary",
                loading: unref(loading),
                onClick: handleTest
              }, {
                icon: withCtx(() => [
                  createVNode(_component_i_lightning, { theme: "outline" })
                ]),
                default: withCtx(() => [
                  createTextVNode(" " + toDisplayString(_ctx.$t("settings.vendor.test.startTest")), 1)
                ]),
                _: 1
              }, 8, ["loading"])
            ])
          ])
        ]),
        _: 1
      }, 8, ["visible", "header"]);
    };
  }
});

/* unplugin-vue-components disabled */

const VideoModelTest = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-93f22f64"]]);

const _hoisted_1 = { class: "modelServe" };
const _hoisted_2 = { class: "modelList" };
const _hoisted_3 = { class: "listFooter" };
const _hoisted_4 = { class: "listContent" };
const _hoisted_5 = {
  key: 0,
  class: "modelParameter"
};
const _hoisted_6 = { class: "configuration" };
const _hoisted_7 = { class: "infoBox ac jb" };
const _hoisted_8 = { class: "idBox" };
const _hoisted_9 = { class: "author" };
const _hoisted_10 = { class: "requiredLabel" };
const _hoisted_11 = { class: "requiredText" };
const _hoisted_12 = { class: "inputHelp" };
const _hoisted_13 = {
  key: 1,
  class: "optionalSection"
};
const _hoisted_14 = { class: "inputHelp" };
const _hoisted_15 = { class: "jb ac" };
const _hoisted_16 = { class: "sectionTitle" };
const _hoisted_17 = { class: "topInfo jb ac" };
const _hoisted_18 = { class: "modelCardNameWrap" };
const _hoisted_19 = { class: "modelCardName" };
const _hoisted_20 = { class: "actionBtns" };
const _hoisted_21 = { class: "tags" };
const _hoisted_22 = { class: "updateAction" };
const _hoisted_23 = { class: "addBox" };
const _hoisted_24 = { style: { "display": "flex", "flex-direction": "column", "align-items": "flex-start", "gap": "0" } };
const _hoisted_25 = {
  key: 0,
  style: { "border": "1px solid #ddd", "border-radius": "6px", "padding": "6px 12px", "margin-top": "6px" }
};
const _hoisted_26 = { class: "drmEditor" };
const _hoisted_27 = { class: "drmHeader" };
const _hoisted_28 = { class: "drmHeaderLabel" };
const _hoisted_29 = { class: "drmHeaderLabel" };
const _hoisted_30 = { class: "drmRowIndex" };
const _hoisted_31 = { class: "data" };
const _hoisted_32 = {
  key: 0,
  class: "linkAdd"
};
const _hoisted_33 = { style: { "margin-top": "10px", "text-align": "right", "width": "100%" } };
const _hoisted_34 = {
  key: 1,
  class: "importAdd"
};
const _hoisted_35 = { class: "dragIcon" };
const _hoisted_36 = { class: "uploadText" };
const _hoisted_37 = { class: "uploadHint" };
const _hoisted_38 = {
  key: 2,
  class: "codeAdd"
};
const _hoisted_39 = { class: "editorToolbar" };
const _hoisted_40 = { class: "editorInfo" };
const _hoisted_41 = { class: "editorActions" };
const _hoisted_42 = { class: "editorWrapper" };
const AUTO_SAVE_DELAY = 700;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "vendorConfig",
  setup(__props) {
    const { themeSetting } = storeToRefs(settingStore());
    const TYPE_LABEL_MAP = {
      text: "settings.vendor.textModel",
      image: "settings.vendor.imageModel",
      video: "settings.vendor.videoModel"
    };
    const MODE_LABEL_MAP = {
      singleImage: "settings.vendor.singleImage",
      multiReference: "settings.vendor.multiReference",
      startEndRequired: "settings.vendor.startEndRequired",
      endFrameOptional: "settings.vendor.endFrameOptional",
      startFrameOptional: "settings.vendor.startFrameOptional",
      audioReference: "settings.vendor.audioRef",
      videoReference: "settings.vendor.videoRef",
      imageReference: "settings.vendor.imageRef"
    };
    function getTypeLabel(type) {
      return TYPE_LABEL_MAP[type] || type;
    }
    function getModeLabel(mode, type) {
      if (mode === "text") return $t(type === "image" ? "settings.vendor.textToImage" : "settings.vendor.textToVideo");
      const refMatch = String(mode).match(/^(videoReference|imageReference|audioReference):(\d+)$/);
      if (refMatch) {
        const label = MODE_LABEL_MAP[refMatch[1]];
        return label ? `${$t(label)} ×${refMatch[2]}` : mode;
      }
      return MODE_LABEL_MAP[mode] ? $t(MODE_LABEL_MAP[mode]) : mode;
    }
    const editorOptions = {
      fontSize: 14,
      automaticLayout: true,
      tabSize: 2,
      scrollBeyondLastLine: false,
      formatOnPaste: true,
      formatOnType: true
    };
    const modelTypeOptions = [
      { value: "text", label: "settings.vendor.textModel" },
      { value: "image", label: "settings.vendor.imageModel" },
      { value: "video", label: "settings.vendor.videoModel" }
    ];
    const imageModeOptions = [
      { label: "settings.vendor.textToImage", value: "text" },
      { label: "settings.vendor.singleImage", value: "singleImage" },
      { label: "settings.vendor.multiReference", value: "multiReference" }
    ];
    const videoModeOptions = [
      { label: "settings.vendor.singleImage", value: "singleImage" },
      { label: "settings.vendor.startEndRequired", value: "startEndRequired" },
      { label: "settings.vendor.endFrameOptional", value: "endFrameOptional" },
      { label: "settings.vendor.startFrameOptional", value: "startFrameOptional" },
      { label: "settings.vendor.textToVideo", value: "text" },
      { label: "settings.vendor.multiReferenceMode", value: "multiReference" }
    ];
    const referenceOptions = [
      { label: "settings.vendor.videoRef", value: "videoReference" },
      { label: "settings.vendor.imageRef", value: "imageReference" },
      { label: "settings.vendor.audioRef", value: "audioReference" }
    ];
    const audioOptions = [
      { label: "settings.vendor.audioOptional", value: "optional" },
      { label: "settings.vendor.audioOnly", value: true },
      { label: "settings.vendor.noAudio", value: false }
    ];
    const vendorList = ref([]);
    const loading = ref(false);
    async function getVendorList() {
      loading.value = true;
      try {
        const res = await instance.post("/setting/vendorConfig/getVendorList");
        vendorList.value = res.data.map((item) => {
          return {
            ...item,
            enable: item.enable
          };
        });
        if (vendorList.value.length && !vendorList.value.some((v) => v.id === activeVendorId.value)) {
          activeVendorId.value = vendorList.value[0].id;
        }
      } catch (err) {
        window.$message.error(`${$t("settings.vendor.msg.getVendorListFailed")}${err.message}`);
      } finally {
        loading.value = false;
        nextTick(() => {
          lastSavedSnapshot.value = currentVendorSnapshot.value;
          autoSaveReady.value = true;
        });
      }
    }
    onMounted(() => {
      getVendorList();
    });
    const activeVendorId = ref();
    const currentVendor = computed(() => vendorList.value.find((v) => v.id === activeVendorId.value));
    const vendorModels = computed(() => currentVendor.value?.models || currentVendor.value?.model || []);
    const requiredInputs = computed(() => currentVendor.value?.inputs?.filter((input) => input.required) || []);
    const optionalInputs = computed(() => currentVendor.value?.inputs?.filter((input) => !input.required) || []);
    const vendorDialogVisible = ref(false);
    const codeDialogVisible = ref(false);
    const vendorCode = ref(VENDOR_CODE_TEMPLATE);
    const fileInputRef = ref(null);
    const updating = ref(false);
    const autoUpdating = ref(false);
    const autoSaveReady = ref(false);
    const lastSavedSnapshot = ref("");
    let autoSaveTimer = null;
    let pendingAutoSave = false;
    const testingModel = ref(null);
    const textTestVisible = ref(false);
    const imageTestVisible = ref(false);
    const videoTestVisible = ref(false);
    function getInputIcon(type) {
      if (type === "password") return "secured";
      if (type === "url") return "link";
      return "edit-1";
    }
    function getInputPlaceholder(input) {
      return input.placeholder?.trim() || "";
    }
    function isValidBase64(str) {
      if (!str) return false;
      const base64Regex = /^(?:data:[^;]+;base64,)?[A-Za-z0-9+/]*={0,2}$/;
      return base64Regex.test(str) && str.length > 0;
    }
    function needsUpdate(vendor) {
      if (!vendor.version) return true;
      const ver = parseFloat(vendor.version);
      return isNaN(ver) || ver < 2;
    }
    function getModelLogo(modelName) {
      if (!modelName) return null;
      const rule = modelProviderRules.find((r) => r.pattern.test(modelName));
      return rule ? providersLogo[rule.provider] : null;
    }
    function buildVendorUpdatePayload(vendor) {
      return {
        id: vendor.id,
        inputValues: vendor.inputValues
      };
    }
    const currentVendorSnapshot = computed(() => {
      if (!currentVendor.value) return "";
      return JSON.stringify(buildVendorUpdatePayload(currentVendor.value));
    });
    function scheduleAutoSave() {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      autoSaveTimer = setTimeout(() => {
        void handleAutoUpdateVendor();
      }, AUTO_SAVE_DELAY);
    }
    async function handleAutoUpdateVendor() {
      if (!currentVendor.value || !autoSaveReady.value || loading.value) return;
      const snapshot = currentVendorSnapshot.value;
      if (!snapshot || snapshot === lastSavedSnapshot.value) return;
      if (autoUpdating.value) {
        pendingAutoSave = true;
        return;
      }
      autoUpdating.value = true;
      try {
        await instance.post("/setting/vendorConfig/updateVendorInputs", buildVendorUpdatePayload(currentVendor.value));
        lastSavedSnapshot.value = snapshot;
      } catch (err) {
        window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${err.message}`);
      } finally {
        autoUpdating.value = false;
        if (pendingAutoSave) {
          pendingAutoSave = false;
          scheduleAutoSave();
        }
      }
    }
    watch(
      currentVendorSnapshot,
      (snapshot) => {
        if (!snapshot || !autoSaveReady.value || loading.value) return;
        if (snapshot === lastSavedSnapshot.value) return;
        scheduleAutoSave();
      },
      { flush: "post" }
    );
    watch(
      activeVendorId,
      () => {
        if (autoSaveTimer) {
          clearTimeout(autoSaveTimer);
          autoSaveTimer = null;
        }
        pendingAutoSave = false;
        nextTick(() => {
          lastSavedSnapshot.value = currentVendorSnapshot.value;
        });
      },
      { flush: "post" }
    );
    const id = ref();
    function handleAddVendor() {
      addMode.value = "importAdd";
      id.value = void 0;
      vendorCode.value = VENDOR_CODE_TEMPLATE;
      vendorDialogVisible.value = true;
      codeDialogVisible.value = false;
    }
    function handleConfirmVendor() {
      if (!id.value) {
        const firstConfirm = DialogPlugin.confirm({
          theme: "danger",
          header: $t("settings.vendor.msg.highRiskConfirm"),
          body: $t("settings.vendor.msg.addVendorRiskBody"),
          confirmBtn: { content: $t("settings.vendor.msg.iKnowRisk"), theme: "danger" },
          cancelBtn: $t("settings.vendor.msg.cancel"),
          onConfirm: () => {
            firstConfirm.destroy();
            const secondConfirm = DialogPlugin.confirm({
              theme: "danger",
              header: $t("settings.vendor.msg.confirmAgain"),
              body: $t("settings.vendor.msg.addVendorConfirmBody"),
              confirmBtn: { content: $t("settings.vendor.msg.confirmAndAdd"), theme: "danger" },
              cancelBtn: $t("settings.vendor.msg.goBackCheck"),
              onConfirm: async () => {
                instance.post("/setting/vendorConfig/addVendor", { tsCode: vendorCode.value }).then((res) => {
                  window.$message.success($t("settings.vendor.msg.vendorAdded"));
                  vendorDialogVisible.value = false;
                  codeDialogVisible.value = false;
                  getVendorList();
                }).catch((err) => {
                  window.$message.error(err.message ?? `${$t("settings.vendor.msg.addFailed")}`);
                }).finally(() => {
                  secondConfirm.destroy();
                });
              },
              onClose: () => secondConfirm.hide()
            });
          },
          onClose: () => firstConfirm.hide()
        });
      } else {
        const firstConfirm = DialogPlugin.confirm({
          theme: "danger",
          header: $t("settings.vendor.msg.highRiskConfirm"),
          body: $t("settings.vendor.msg.updateVendorRiskBody"),
          confirmBtn: { content: $t("settings.vendor.msg.iKnowRisk"), theme: "danger" },
          cancelBtn: $t("settings.vendor.msg.cancel"),
          onConfirm: () => {
            firstConfirm.destroy();
            const secondConfirm = DialogPlugin.confirm({
              theme: "danger",
              header: $t("settings.vendor.msg.confirmAgain"),
              body: $t("settings.vendor.msg.updateVendorConfirmBody"),
              confirmBtn: { content: $t("settings.vendor.msg.confirmAndUpdate"), theme: "danger" },
              cancelBtn: $t("settings.vendor.msg.goBackCheck"),
              onConfirm: async () => {
                instance.post("/setting/vendorConfig/updateCode", {
                  id: id.value,
                  tsCode: vendorCode.value
                }).then((res) => {
                  window.$message.success($t("settings.vendor.msg.updateSuccess"));
                  vendorDialogVisible.value = false;
                  codeDialogVisible.value = false;
                  getVendorList();
                }).catch((err) => {
                  window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${err.message}`);
                }).finally(() => {
                  secondConfirm.destroy();
                });
              },
              onClose: () => secondConfirm.hide()
            });
          },
          onClose: () => firstConfirm.hide()
        });
      }
    }
    const modelDialogVisible = ref(false);
    const editingModelIndex = ref(null);
    const editingModelName = ref(null);
    const modelFormData = ref({
      name: "",
      modelName: "",
      type: "text",
      think: false,
      mode: [],
      mixedMode: [],
      // referenceOptions 选中项，单独存放，构建时作为数组元素加入 mode
      mixedModeCount: {},
      // 每个 reference 的数量限制
      audio: "optional",
      durationResolutionMap: [{ duration: [], resolution: [] }]
    });
    function resetModelForm(type = "text") {
      modelFormData.value = {
        name: "",
        modelName: "",
        type,
        think: false,
        mode: [],
        mixedMode: [],
        mixedModeCount: {},
        audio: "optional",
        durationResolutionMap: [{ duration: [], resolution: [] }]
      };
    }
    function ensureVendorModels() {
      if (!currentVendor.value) return [];
      if (!Array.isArray(currentVendor.value.models)) {
        currentVendor.value.models = Array.isArray(currentVendor.value.model) ? [...currentVendor.value.model] : [];
      }
      currentVendor.value.model = currentVendor.value.models;
      return currentVendor.value.models;
    }
    function buildModelFromForm() {
      const name = modelFormData.value.name.trim();
      const modelName = modelFormData.value.modelName.trim();
      if (!name) {
        window.$message.error($t("settings.vendor.msg.fillDisplayName"));
        return null;
      }
      if (!modelName) {
        window.$message.error($t("settings.vendor.msg.fillModelId"));
        return null;
      }
      if (modelFormData.value.type === "text") {
        return {
          name,
          modelName,
          type: "text",
          think: modelFormData.value.think
        };
      }
      if (modelFormData.value.type === "image") {
        const mode2 = modelFormData.value.mode;
        if (!mode2.length) {
          window.$message.error($t("settings.vendor.msg.selectImageMode"));
          return null;
        }
        return {
          name,
          modelName,
          type: "image",
          mode: mode2
        };
      }
      const mode = [...modelFormData.value.mode].filter((m) => m !== "multiReference");
      if (modelFormData.value.mixedMode.length > 0) {
        const refs = modelFormData.value.mixedMode.map((ref2) => {
          const count = modelFormData.value.mixedModeCount[ref2] ?? 1;
          return `${ref2}:${count}`;
        });
        mode.push(refs);
      }
      if (!mode.length) {
        window.$message.error($t("settings.vendor.msg.selectVideoMode"));
        return null;
      }
      const durationResolutionMap = [];
      for (let i = 0; i < modelFormData.value.durationResolutionMap.length; i++) {
        const row = modelFormData.value.durationResolutionMap[i];
        const duration = row.duration.map(Number).filter((n) => Number.isFinite(n) && n > 0);
        const resolution = row.resolution.filter(Boolean);
        if (!duration.length) {
          window.$message.error(`${$t("settings.vendor.msg.groupPrefix", { n: i + 1 })}${$t("settings.vendor.msg.addDuration")}`);
          return null;
        }
        if (!resolution.length) {
          window.$message.error(`${$t("settings.vendor.msg.groupPrefix", { n: i + 1 })}${$t("settings.vendor.msg.addResolution")}`);
          return null;
        }
        durationResolutionMap.push({ duration, resolution });
      }
      return {
        name,
        modelName,
        type: "video",
        mode,
        audio: modelFormData.value.audio,
        durationResolutionMap
      };
    }
    function handleAddModel() {
      if (!currentVendor.value) {
        window.$message.error($t("settings.vendor.msg.selectVendorFirst"));
        return;
      }
      editingModelIndex.value = null;
      resetModelForm("text");
      modelDialogVisible.value = true;
    }
    async function handleConfirmModel() {
      const list = ensureVendorModels();
      if (!list.length && !currentVendor.value) return;
      const model = buildModelFromForm();
      if (!model) return;
      const duplicateIndex = list.findIndex((item, index) => {
        if (editingModelIndex.value !== null && index === editingModelIndex.value) {
          return false;
        }
        return item.modelName === model.modelName;
      });
      if (duplicateIndex !== -1) {
        window.$message.error($t("settings.vendor.msg.modelIdExists"));
        return;
      }
      if (editingModelIndex.value === null) {
        try {
          await instance.post("/setting/vendorConfig/addVendorModel", {
            id: currentVendor.value.id,
            model
          });
          window.$message.success($t("settings.vendor.msg.modelAdded"));
          modelDialogVisible.value = false;
          getVendorList();
        } catch (err) {
          window.$message.error(err.message ?? $t("settings.vendor.msg.operationFailed"));
        }
        return;
      }
      if (editingModelIndex.value !== null) {
        try {
          await instance.post("/setting/vendorConfig/upVendorModel", {
            id: currentVendor.value.id,
            modelName: editingModelName.value,
            model
          });
          window.$message.success($t("settings.vendor.msg.modelUpdated"));
          modelDialogVisible.value = false;
          getVendorList();
        } catch (err) {
          window.$message.error(err.message ?? $t("settings.vendor.msg.operationFailed"));
        }
      }
    }
    function handleEditModel(model) {
      const list = ensureVendorModels();
      editingModelIndex.value = list.findIndex((item) => item.modelName === model.modelName);
      editingModelName.value = model.modelName;
      if (model.type === "text") {
        modelFormData.value = {
          name: model.name,
          modelName: model.modelName,
          type: "text",
          think: model.think,
          mode: [],
          mixedMode: [],
          mixedModeCount: {},
          audio: "optional",
          durationResolutionMap: [{ duration: [], resolution: [] }]
        };
      }
      if (model.type === "image") {
        modelFormData.value = {
          name: model.name,
          modelName: model.modelName,
          type: "image",
          think: false,
          mode: [...model.mode],
          mixedMode: [],
          mixedModeCount: {},
          audio: "optional",
          durationResolutionMap: [{ duration: [], resolution: [] }]
        };
      }
      if (model.type === "video") {
        const rows = model.durationResolutionMap?.length > 0 ? model.durationResolutionMap.map((map) => ({
          duration: map.duration.map(String),
          resolution: [...map.resolution]
        })) : [{ duration: [], resolution: [] }];
        const flatMode = [];
        let mixedMode = [];
        const mixedModeCount = {};
        for (const m of model.mode) {
          if (Array.isArray(m)) {
            for (const ref2 of m) {
              const match = String(ref2).match(/^(videoReference|imageReference|audioReference):(\d+)$/);
              if (match) {
                mixedMode.push(match[1]);
                mixedModeCount[match[1]] = Number(match[2]);
              }
            }
          } else {
            flatMode.push(m);
          }
        }
        modelFormData.value = {
          name: model.name,
          modelName: model.modelName,
          type: "video",
          think: false,
          mode: mixedMode.length > 0 ? [...flatMode, "multiReference"] : flatMode,
          mixedMode,
          mixedModeCount,
          audio: model.audio,
          durationResolutionMap: rows
        };
      }
      modelDialogVisible.value = true;
    }
    function handleTestModel(item) {
      testingModel.value = item;
      if (item.type === "text") {
        textTestVisible.value = true;
      } else if (item.type === "image") {
        imageTestVisible.value = true;
      } else if (item.type === "video") {
        videoTestVisible.value = true;
      }
    }
    function handleDeleteModel(modelName) {
      if (!currentVendor.value) return;
      const confirmDialog = DialogPlugin.confirm({
        theme: "danger",
        header: $t("settings.vendor.msg.deleteModelConfirm"),
        body: `${$t("settings.vendor.msg.deleteModelBody", { name: modelName })}`,
        confirmBtn: { content: $t("settings.vendor.msg.confirmDelete"), theme: "danger" },
        cancelBtn: $t("settings.vendor.msg.cancel"),
        onConfirm: async () => {
          try {
            await instance.post("/setting/vendorConfig/delVendorModel", {
              id: currentVendor.value.id,
              modelName
            });
            window.$message.success($t("settings.vendor.msg.modelDeleted"));
            getVendorList();
          } catch (err) {
            window.$message.error(err.message ?? $t("settings.vendor.msg.operationFailed"));
          } finally {
            confirmDialog.destroy();
          }
        }
      });
    }
    function handleEditVendorCode() {
      if (!currentVendor.value) return;
      id.value = currentVendor.value.id;
      vendorCode.value = currentVendor.value.code;
      codeDialogVisible.value = true;
    }
    function handleDeleteVendor() {
      if (!currentVendor.value) return;
      const confirmDialog = DialogPlugin.confirm({
        theme: "danger",
        header: $t("settings.vendor.msg.deleteVendorConfirm"),
        body: `${$t("settings.vendor.msg.deleteVendorBody", { name: currentVendor.value.name })}`,
        confirmBtn: { content: $t("settings.vendor.msg.confirmDelete"), theme: "danger" },
        cancelBtn: $t("settings.vendor.msg.cancel"),
        onConfirm: () => {
          instance.post("/setting/vendorConfig/deleteVendor", { id: currentVendor.value?.id }).then(() => {
            window.$message.success($t("settings.vendor.msg.vendorDeleted"));
            if (activeVendorId.value === currentVendor.value?.id) {
              activeVendorId.value = void 0;
            }
            getVendorList();
            confirmDialog.destroy();
          }).catch((err) => {
            window.$message.error(`${$t("settings.vendor.msg.deleteFailed")}${err.message}`);
          });
        }
      });
    }
    function onBlurFn() {
      instance.post("/setting/vendorConfig/updateVendorInputs", {
        id: currentVendor.value?.id,
        inputValues: currentVendor.value?.inputValues
      }).then(() => {
        window.$message.success($t("settings.vendor.msg.vendorConfigUpdated"));
        getVendorList();
      }).catch((err) => {
        window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${err.message}`);
      });
    }
    function onChange(item, val) {
      const prevEnable = val === 1 ? 0 : 1;
      instance.post("/setting/vendorConfig/enableVendor", {
        id: item.id,
        enable: val
      }).then(() => {
      }).catch((err) => {
        item.enable = prevEnable;
      });
    }
    const addMode = ref("importAdd");
    const link = ref("");
    const linkReading = ref(false);
    watch(addMode, (val) => {
      if (val == "codeAdd") codeDialogVisible.value = true;
      else codeDialogVisible.value = false;
    });
    function linkRead() {
      if (linkReading.value) return;
      const firstConfirm = DialogPlugin.confirm({
        theme: "danger",
        header: $t("settings.vendor.msg.highRiskConfirm"),
        body: $t("settings.vendor.msg.linkAddVendorRiskBody"),
        confirmBtn: { content: $t("settings.vendor.msg.iKnowRisk"), theme: "danger" },
        cancelBtn: $t("settings.vendor.msg.cancel"),
        onConfirm: () => {
          firstConfirm.destroy();
          const secondConfirm = DialogPlugin.confirm({
            theme: "danger",
            header: $t("settings.vendor.msg.confirmAgain"),
            body: $t("settings.vendor.msg.addVendorConfirmBody"),
            confirmBtn: { content: $t("settings.vendor.msg.confirmAndAdd"), theme: "danger" },
            cancelBtn: $t("settings.vendor.msg.goBackCheck"),
            onConfirm: async () => {
              const instance$1 = LoadingPlugin({
                fullscreen: true,
                attach: "body",
                preventScrollThrough: false
              });
              const timer = setTimeout(() => {
                instance$1.hide();
                clearTimeout(timer);
              }, 1e3);
              linkReading.value = true;
              try {
                const { data } = await instance.post("/setting/vendorConfig/getCodeByLink", { link: link.value });
                if (!data.includes("vendor")) {
                  let alertBox = null;
                  if (data.includes("<html>")) {
                    alertBox = DialogPlugin.alert({
                      theme: "danger",
                      header: "链接返回了一个网页，添加供应商需要返回TS代码，请确认链接是否正确",
                      body: "请勿输入中转站地址，如需使用中转站请修改OpenAI标准接口的baseUrl使用中转站地址",
                      onConfirm: ({ e }) => {
                        alertBox.hide();
                      }
                    });
                  } else {
                    DialogPlugin.alert({
                      theme: "danger",
                      header: "链接返回的内容不正确，添加供应商需要返回TS代码，请确认链接是否正确",
                      onConfirm: ({ e }) => {
                        alertBox.hide();
                      }
                    });
                  }
                  return;
                }
                if (data) {
                  instance.post("/setting/vendorConfig/addVendor", { tsCode: data });
                  window.$message.success($t("settings.vendor.msg.vendorAdded"));
                  vendorDialogVisible.value = false;
                  codeDialogVisible.value = false;
                  getVendorList();
                } else {
                  window.$message.error($t("settings.vendor.msg.linkAddFailed"));
                  codeDialogVisible.value = false;
                }
              } catch (err) {
                window.$message.error(`${$t("settings.vendor.msg.addFailed")}${err.message}`);
              } finally {
                clearTimeout(timer);
                instance$1.hide();
                linkReading.value = false;
                secondConfirm.destroy();
              }
            },
            onClose: () => secondConfirm.hide()
          });
        },
        onClose: () => firstConfirm.hide()
      });
    }
    const uploadRef = ref();
    async function handleBeforeUpload(file) {
      const rawFile = file.raw;
      if (!rawFile) {
        window.$message.error($t("workbench.novel.import.msg.selectFile"));
        return false;
      }
      LoadingPlugin(true);
      try {
        const firstConfirm = DialogPlugin.confirm({
          theme: "danger",
          header: $t("settings.vendor.msg.highRiskConfirm"),
          body: $t("settings.vendor.msg.importAdd"),
          confirmBtn: { content: $t("settings.vendor.msg.iKnowRisk"), theme: "danger" },
          cancelBtn: $t("settings.vendor.msg.cancel"),
          onConfirm: () => {
            firstConfirm.destroy();
            const secondConfirm = DialogPlugin.confirm({
              theme: "danger",
              header: $t("settings.vendor.msg.confirmAgain"),
              body: $t("settings.vendor.msg.addVendorConfirmBody"),
              confirmBtn: { content: $t("settings.vendor.msg.confirmAndAdd"), theme: "danger" },
              cancelBtn: $t("settings.vendor.msg.goBackCheck"),
              onConfirm: async () => {
                const fileReader = new FileReader();
                fileReader.readAsText(rawFile);
                fileReader.onload = () => {
                  const content = fileReader.result;
                  instance.post("/setting/vendorConfig/addVendor", { tsCode: content }).then((res) => {
                    window.$message.success($t("settings.vendor.msg.vendorAdded"));
                    vendorDialogVisible.value = false;
                    codeDialogVisible.value = false;
                    getVendorList();
                  }).catch((err) => {
                    window.$message.error(err.message ?? `${$t("settings.vendor.msg.addFailed")}`);
                  }).finally(() => {
                    secondConfirm.destroy();
                  });
                };
              },
              onClose: () => secondConfirm.hide()
            });
          },
          onClose: () => firstConfirm.hide()
        });
      } catch {
        window.$message.error($t("workbench.novel.import.msg.parseFailed"));
      } finally {
        LoadingPlugin(false);
      }
      return false;
    }
    const fileList = ref([]);
    function triggerUpload() {
      uploadRef.value?.triggerUpload();
    }
    function requestMethod() {
      return Promise.resolve({
        response: {},
        status: "success"
      });
    }
    async function handleDrop(e) {
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        await handleBeforeUpload({ raw: files[0] });
      }
    }
    function handleFileChange(e) {
      const input = e.target;
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        vendorCode.value = ev.target?.result || "";
      };
      reader.readAsText(file);
      input.value = "";
    }
    return (_ctx, _cache) => {
      const _component_t_icon = Icon;
      const _component_t_button = Button;
      const _component_t_avatar = Avatar;
      const _component_t_switch = Switch;
      const _component_t_menu_item = MenuItem;
      const _component_t_menu = Menu;
      const _component_t_empty = Empty;
      const _component_t_alert = Alert;
      const _component_t_form_item = FormItem;
      const _component_t_input = Input;
      const _component_t_collapse_panel = CollapsePanel;
      const _component_t_collapse = Collapse;
      const _component_i_plus = resolveComponent("i-plus");
      const _component_i_lightning = resolveComponent("i-lightning");
      const _component_i_pencil = resolveComponent("i-pencil");
      const _component_i_delete = resolveComponent("i-delete");
      const _component_t_tag = Tag;
      const _component_t_card = Card;
      const _component_t_form = Form;
      const _component_t_option = Option;
      const _component_t_select = Select;
      const _component_t_radio = Radio;
      const _component_t_radio_group = RadioGroup;
      const _component_t_checkbox = Checkbox;
      const _component_t_checkbox_group = CheckboxGroup;
      const _component_t_input_number = InputNumber;
      const _component_t_tag_input = TagInput;
      const _component_t_dialog = Dialog;
      const _component_t_radio_button = RadioButton;
      const _component_t_upload = Upload;
      const _component_i_upload_one = resolveComponent("i-upload-one");
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", _hoisted_3, [
            createVNode(_component_t_button, {
              block: "",
              theme: "primary",
              onClick: handleAddVendor
            }, {
              icon: withCtx(() => [
                createVNode(_component_t_icon, { name: "add" })
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(_ctx.$t("settings.vendor.addVendor")), 1)
              ]),
              _: 1
            })
          ]),
          withDirectives((openBlock(), createElementBlock("div", _hoisted_4, [
            unref(vendorList).length > 0 ? (openBlock(), createBlock(_component_t_menu, {
              key: 0,
              modelValue: unref(activeVendorId),
              "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(activeVendorId) ? activeVendorId.value = $event : null),
              theme: "light"
            }, {
              default: withCtx(() => [
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(vendorList), (item, index) => {
                  return openBlock(), createBlock(_component_t_menu_item, {
                    key: index,
                    value: item.id,
                    onClick: ($event) => activeVendorId.value = item.id,
                    style: { "position": "relative" }
                  }, createSlots({
                    default: withCtx(() => [
                      createBaseVNode("span", null, toDisplayString(item.name), 1),
                      createVNode(_component_t_switch, {
                        modelValue: item.enable,
                        "onUpdate:modelValue": ($event) => item.enable = $event,
                        customValue: [1, 0],
                        onClick: _cache[0] || (_cache[0] = withModifiers(() => {
                        }, ["stop"])),
                        onChange: (val) => onChange(item, val),
                        style: { "position": "absolute", "right": "10px", "top": "50%", "transform": "translateY(-50%)", "z-index": "10" }
                      }, null, 8, ["modelValue", "onUpdate:modelValue", "onChange"])
                    ]),
                    _: 2
                  }, [
                    isValidBase64(item.icon) ? {
                      name: "icon",
                      fn: withCtx(() => [
                        createVNode(_component_t_avatar, {
                          size: "24px",
                          shape: "round",
                          image: item.icon
                        }, null, 8, ["image"])
                      ]),
                      key: "0"
                    } : void 0
                  ]), 1032, ["value", "onClick"]);
                }), 128))
              ]),
              _: 1
            }, 8, ["modelValue"])) : (openBlock(), createBlock(_component_t_empty, {
              key: 1,
              title: _ctx.$t("settings.vendor.noVendor"),
              style: { "margin-top": "16px" }
            }, null, 8, ["title"]))
          ])), [
            [_directive_loading, unref(loading)]
          ])
        ]),
        unref(currentVendor) ? (openBlock(), createElementBlock("div", _hoisted_5, [
          createBaseVNode("div", _hoisted_6, [
            createVNode(_component_t_form, {
              data: unref(currentVendor),
              labelAlign: "top"
            }, {
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_7, [
                  createBaseVNode("span", _hoisted_8, "#" + toDisplayString(unref(currentVendor).id), 1),
                  createBaseVNode("span", _hoisted_9, "@" + toDisplayString(unref(currentVendor).author), 1)
                ]),
                needsUpdate(unref(currentVendor)) ? (openBlock(), createBlock(_component_t_alert, {
                  key: 0,
                  theme: "warning",
                  message: _ctx.$t("settings.vendor.msg.vendorNeedsUpdate"),
                  style: { "margin-bottom": "12px" }
                }, null, 8, ["message"])) : createCommentVNode("", true),
                createVNode(_component_t_form_item, null, {
                  default: withCtx(() => [
                    createVNode(AsyncMdPreview, {
                      modelValue: unref(currentVendor).description,
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => unref(currentVendor).description = $event),
                      theme: unref(themeSetting).mode
                    }, null, 8, ["modelValue", "theme"])
                  ]),
                  _: 1
                }),
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(requiredInputs), (input) => {
                  return openBlock(), createBlock(_component_t_form_item, {
                    key: input.key,
                    name: input.key
                  }, createSlots({
                    label: withCtx(() => [
                      createBaseVNode("span", _hoisted_10, [
                        createTextVNode(toDisplayString(input.label) + " ", 1),
                        _cache[25] || (_cache[25] = createBaseVNode("span", { class: "requiredMark" }, "*", -1)),
                        createBaseVNode("span", _hoisted_11, toDisplayString(_ctx.$t("settings.vendor.required")), 1)
                      ])
                    ]),
                    default: withCtx(() => [
                      createVNode(_component_t_input, {
                        modelValue: unref(currentVendor).inputValues[input.key],
                        "onUpdate:modelValue": ($event) => unref(currentVendor).inputValues[input.key] = $event,
                        type: input.type,
                        clearable: "",
                        onBlur: onBlurFn
                      }, {
                        "prefix-icon": withCtx(() => [
                          createVNode(_component_t_icon, {
                            name: getInputIcon(input.type)
                          }, null, 8, ["name"])
                        ]),
                        _: 2
                      }, 1032, ["modelValue", "onUpdate:modelValue", "type"])
                    ]),
                    _: 2
                  }, [
                    getInputPlaceholder(input) ? {
                      name: "help",
                      fn: withCtx(() => [
                        createBaseVNode("span", _hoisted_12, toDisplayString(getInputPlaceholder(input)), 1)
                      ]),
                      key: "0"
                    } : void 0
                  ]), 1032, ["name"]);
                }), 128)),
                unref(optionalInputs).length > 0 ? (openBlock(), createElementBlock("div", _hoisted_13, [
                  createVNode(_component_t_collapse, null, {
                    default: withCtx(() => [
                      createVNode(_component_t_collapse_panel, {
                        value: "optional-inputs",
                        header: _ctx.$t("settings.vendor.optionalSection")
                      }, {
                        default: withCtx(() => [
                          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(optionalInputs), (input) => {
                            return openBlock(), createBlock(_component_t_form_item, {
                              key: input.key,
                              name: input.key,
                              label: input.label
                            }, createSlots({
                              default: withCtx(() => [
                                createVNode(_component_t_input, {
                                  modelValue: unref(currentVendor).inputValues[input.key],
                                  "onUpdate:modelValue": ($event) => unref(currentVendor).inputValues[input.key] = $event,
                                  type: input.type,
                                  clearable: "",
                                  onBlur: onBlurFn
                                }, {
                                  "prefix-icon": withCtx(() => [
                                    createVNode(_component_t_icon, {
                                      name: getInputIcon(input.type)
                                    }, null, 8, ["name"])
                                  ]),
                                  _: 2
                                }, 1032, ["modelValue", "onUpdate:modelValue", "type"])
                              ]),
                              _: 2
                            }, [
                              getInputPlaceholder(input) ? {
                                name: "help",
                                fn: withCtx(() => [
                                  createBaseVNode("span", _hoisted_14, toDisplayString(getInputPlaceholder(input)), 1)
                                ]),
                                key: "0"
                              } : void 0
                            ]), 1032, ["name", "label"]);
                          }), 128))
                        ]),
                        _: 1
                      }, 8, ["header"])
                    ]),
                    _: 1
                  })
                ])) : createCommentVNode("", true),
                createBaseVNode("div", _hoisted_15, [
                  createBaseVNode("h4", _hoisted_16, toDisplayString(_ctx.$t("settings.vendor.modelSettings")), 1),
                  createVNode(_component_t_button, {
                    variant: "outline",
                    size: "small",
                    onClick: handleAddModel
                  }, {
                    icon: withCtx(() => [
                      createVNode(_component_i_plus, { theme: "outline" })
                    ]),
                    default: withCtx(() => [
                      createTextVNode(" " + toDisplayString(_ctx.$t("settings.vendor.addManually")), 1)
                    ]),
                    _: 1
                  })
                ]),
                (openBlock(true), createElementBlock(Fragment, null, renderList(unref(vendorModels), (item, index) => {
                  return openBlock(), createBlock(_component_t_card, {
                    key: index,
                    class: "modelCard"
                  }, {
                    default: withCtx(() => [
                      createBaseVNode("div", _hoisted_17, [
                        createBaseVNode("div", _hoisted_18, [
                          getModelLogo(item.modelName) ? (openBlock(), createBlock(_component_t_avatar, {
                            key: 0,
                            size: "24px",
                            shape: "round",
                            image: getModelLogo(item.modelName)
                          }, null, 8, ["image"])) : createCommentVNode("", true),
                          createBaseVNode("span", _hoisted_19, toDisplayString(item.name), 1)
                        ]),
                        createBaseVNode("div", _hoisted_20, [
                          createVNode(_component_t_button, {
                            size: "small",
                            variant: "text",
                            onClick: ($event) => handleTestModel(item)
                          }, {
                            icon: withCtx(() => [
                              createVNode(_component_i_lightning, { theme: "outline" })
                            ]),
                            default: withCtx(() => [
                              createTextVNode(" " + toDisplayString(_ctx.$t("settings.vendor.testModel")), 1)
                            ]),
                            _: 1
                          }, 8, ["onClick"]),
                          createVNode(_component_t_button, {
                            variant: "text",
                            size: "small",
                            onClick: ($event) => handleEditModel(item)
                          }, {
                            icon: withCtx(() => [
                              createVNode(_component_i_pencil, { theme: "outline" })
                            ]),
                            default: withCtx(() => [
                              createTextVNode(" " + toDisplayString(_ctx.$t("settings.vendor.edit")), 1)
                            ]),
                            _: 1
                          }, 8, ["onClick"]),
                          createVNode(_component_t_button, {
                            variant: "text",
                            size: "small",
                            theme: "danger",
                            onClick: ($event) => handleDeleteModel(item.modelName)
                          }, {
                            icon: withCtx(() => [
                              createVNode(_component_i_delete, { theme: "outline" })
                            ]),
                            default: withCtx(() => [
                              createTextVNode(" " + toDisplayString(_ctx.$t("settings.vendor.delete")), 1)
                            ]),
                            _: 1
                          }, 8, ["onClick"])
                        ])
                      ]),
                      createBaseVNode("div", _hoisted_21, [
                        createVNode(_component_t_tag, { theme: "primary" }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t(getTypeLabel(item.type))), 1)
                          ]),
                          _: 2
                        }, 1024),
                        item.type === "text" && item.think ? (openBlock(), createBlock(_component_t_tag, {
                          key: 0,
                          variant: "light"
                        }, {
                          default: withCtx(() => [
                            createTextVNode(toDisplayString(_ctx.$t("settings.vendor.think")), 1)
                          ]),
                          _: 1
                        })) : createCommentVNode("", true),
                        (openBlock(true), createElementBlock(Fragment, null, renderList(item.mode, (mode, mIdx) => {
                          return openBlock(), createElementBlock(Fragment, { key: mIdx }, [
                            !Array.isArray(mode) ? (openBlock(), createBlock(_component_t_tag, {
                              key: 0,
                              variant: "light"
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(getModeLabel(mode, item.type)), 1)
                              ]),
                              _: 2
                            }, 1024)) : (openBlock(true), createElementBlock(Fragment, { key: 1 }, renderList(mode, (m, mmIdx) => {
                              return openBlock(), createBlock(_component_t_tag, {
                                variant: "light",
                                key: mmIdx
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(toDisplayString(getModeLabel(m, item.type)), 1)
                                ]),
                                _: 2
                              }, 1024);
                            }), 128))
                          ], 64);
                        }), 128))
                      ])
                    ]),
                    _: 2
                  }, 1024);
                }), 128))
              ]),
              _: 1
            }, 8, ["data"]),
            createBaseVNode("div", _hoisted_22, [
              createVNode(_component_t_button, {
                theme: "danger",
                loading: unref(updating),
                onClick: handleDeleteVendor
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("settings.vendor.deleteVendor")), 1)
                ]),
                _: 1
              }, 8, ["loading"]),
              createVNode(_component_t_button, {
                theme: "default",
                loading: unref(updating),
                onClick: handleEditVendorCode
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("settings.vendor.editCode")), 1)
                ]),
                _: 1
              }, 8, ["loading"])
            ])
          ])
        ])) : createCommentVNode("", true),
        createVNode(_component_t_dialog, {
          placement: "center",
          width: "40vw",
          visible: unref(modelDialogVisible),
          "onUpdate:visible": _cache[12] || (_cache[12] = ($event) => isRef(modelDialogVisible) ? modelDialogVisible.value = $event : null),
          header: unref(editingModelIndex) === null ? _ctx.$t("settings.vendor.addModel") : _ctx.$t("settings.vendor.editModel"),
          maskClosable: false,
          onConfirm: handleConfirmModel
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_23, [
              createVNode(_component_t_form, {
                data: unref(modelFormData),
                labelAlign: "top"
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_form_item, {
                    name: "name",
                    label: _ctx.$t("settings.vendor.displayName")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_input, {
                        modelValue: unref(modelFormData).name,
                        "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => unref(modelFormData).name = $event),
                        placeholder: _ctx.$t("settings.vendor.displayNamePlaceholder"),
                        clearable: ""
                      }, null, 8, ["modelValue", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    name: "modelName",
                    label: _ctx.$t("settings.vendor.modelId")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_input, {
                        modelValue: unref(modelFormData).modelName,
                        "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => unref(modelFormData).modelName = $event),
                        placeholder: _ctx.$t("settings.vendor.modelIdPlaceholder"),
                        clearable: ""
                      }, null, 8, ["modelValue", "placeholder"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  createVNode(_component_t_form_item, {
                    name: "type",
                    label: _ctx.$t("settings.vendor.modelType")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_select, {
                        modelValue: unref(modelFormData).type,
                        "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => unref(modelFormData).type = $event)
                      }, {
                        default: withCtx(() => [
                          (openBlock(), createElementBlock(Fragment, null, renderList(modelTypeOptions, (item) => {
                            return createVNode(_component_t_option, {
                              key: item.value,
                              value: item.value
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(_ctx.$t(item.label)), 1)
                              ]),
                              _: 2
                            }, 1032, ["value"]);
                          }), 64))
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"]),
                  unref(modelFormData).type === "text" ? (openBlock(), createBlock(_component_t_form_item, {
                    key: 0,
                    name: "think",
                    label: _ctx.$t("settings.vendor.think")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_radio_group, {
                        modelValue: unref(modelFormData).think,
                        "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => unref(modelFormData).think = $event)
                      }, {
                        default: withCtx(() => [
                          createVNode(_component_t_radio, { value: true }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("settings.vendor.supported")), 1)
                            ]),
                            _: 1
                          }),
                          createVNode(_component_t_radio, { value: false }, {
                            default: withCtx(() => [
                              createTextVNode(toDisplayString(_ctx.$t("settings.vendor.notSupported")), 1)
                            ]),
                            _: 1
                          })
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"])) : createCommentVNode("", true),
                  unref(modelFormData).type === "image" ? (openBlock(), createBlock(_component_t_form_item, {
                    key: 1,
                    name: "mode",
                    label: _ctx.$t("settings.vendor.imageMode")
                  }, {
                    default: withCtx(() => [
                      createVNode(_component_t_checkbox_group, {
                        modelValue: unref(modelFormData).mode,
                        "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => unref(modelFormData).mode = $event)
                      }, {
                        default: withCtx(() => [
                          (openBlock(), createElementBlock(Fragment, null, renderList(imageModeOptions, (opt) => {
                            return createVNode(_component_t_checkbox, {
                              key: opt.value,
                              value: opt.value
                            }, {
                              default: withCtx(() => [
                                createTextVNode(toDisplayString(_ctx.$t(opt.label)), 1)
                              ]),
                              _: 2
                            }, 1032, ["value"]);
                          }), 64))
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ]),
                    _: 1
                  }, 8, ["label"])) : createCommentVNode("", true),
                  unref(modelFormData).type === "video" ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                    createVNode(_component_t_form_item, {
                      name: "mode",
                      label: _ctx.$t("settings.vendor.videoMode")
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_24, [
                          createVNode(_component_t_checkbox_group, {
                            modelValue: unref(modelFormData).mode,
                            "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => unref(modelFormData).mode = $event)
                          }, {
                            default: withCtx(() => [
                              (openBlock(), createElementBlock(Fragment, null, renderList(videoModeOptions, (opt) => {
                                return createVNode(_component_t_checkbox, {
                                  key: opt.value,
                                  value: opt.value
                                }, {
                                  default: withCtx(() => [
                                    createTextVNode(toDisplayString(_ctx.$t(opt.label)), 1)
                                  ]),
                                  _: 2
                                }, 1032, ["value"]);
                              }), 64))
                            ]),
                            _: 1
                          }, 8, ["modelValue"]),
                          unref(modelFormData).mode.includes("multiReference") ? (openBlock(), createElementBlock("div", _hoisted_25, [
                            createVNode(_component_t_checkbox_group, {
                              modelValue: unref(modelFormData).mixedMode,
                              "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => unref(modelFormData).mixedMode = $event),
                              style: { "display": "flex", "flex-direction": "row", "gap": "8px", "flex-wrap": "wrap", "align-items": "center" }
                            }, {
                              default: withCtx(() => [
                                (openBlock(), createElementBlock(Fragment, null, renderList(referenceOptions, (opt) => {
                                  return openBlock(), createElementBlock(Fragment, {
                                    key: opt.value
                                  }, [
                                    createVNode(_component_t_checkbox, {
                                      value: opt.value
                                    }, {
                                      default: withCtx(() => [
                                        createTextVNode(toDisplayString(_ctx.$t(opt.label)), 1)
                                      ]),
                                      _: 2
                                    }, 1032, ["value"]),
                                    unref(modelFormData).mixedMode.includes(opt.value) ? (openBlock(), createBlock(_component_t_input_number, {
                                      key: 0,
                                      modelValue: unref(modelFormData).mixedModeCount[opt.value],
                                      "onUpdate:modelValue": ($event) => unref(modelFormData).mixedModeCount[opt.value] = $event,
                                      min: 1,
                                      max: 99,
                                      size: "small",
                                      style: { "width": "80px" },
                                      placeholder: _ctx.$t("settings.vendor.count")
                                    }, null, 8, ["modelValue", "onUpdate:modelValue", "placeholder"])) : createCommentVNode("", true)
                                  ], 64);
                                }), 64))
                              ]),
                              _: 1
                            }, 8, ["modelValue"])
                          ])) : createCommentVNode("", true)
                        ])
                      ]),
                      _: 1
                    }, 8, ["label"]),
                    createVNode(_component_t_form_item, {
                      name: "audio",
                      label: _ctx.$t("settings.vendor.audioOutput")
                    }, {
                      default: withCtx(() => [
                        createVNode(_component_t_radio_group, {
                          modelValue: unref(modelFormData).audio,
                          "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => unref(modelFormData).audio = $event)
                        }, {
                          default: withCtx(() => [
                            (openBlock(), createElementBlock(Fragment, null, renderList(audioOptions, (item) => {
                              return createVNode(_component_t_radio, {
                                key: String(item.value),
                                value: item.value
                              }, {
                                default: withCtx(() => [
                                  createTextVNode(toDisplayString(_ctx.$t(item.label)), 1)
                                ]),
                                _: 2
                              }, 1032, ["value"]);
                            }), 64))
                          ]),
                          _: 1
                        }, 8, ["modelValue"])
                      ]),
                      _: 1
                    }, 8, ["label"]),
                    createVNode(_component_t_form_item, {
                      name: "durationResolutionMap",
                      label: _ctx.$t("settings.vendor.durationResolution")
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("div", _hoisted_26, [
                          createBaseVNode("div", _hoisted_27, [
                            _cache[26] || (_cache[26] = createBaseVNode("div", { class: "drmHeaderIndex" }, null, -1)),
                            createBaseVNode("div", _hoisted_28, toDisplayString(_ctx.$t("settings.vendor.durationSec")), 1),
                            _cache[27] || (_cache[27] = createBaseVNode("div", { class: "drmHeaderArrow" }, null, -1)),
                            createBaseVNode("div", _hoisted_29, toDisplayString(_ctx.$t("settings.vendor.resolution")), 1),
                            _cache[28] || (_cache[28] = createBaseVNode("div", { class: "drmHeaderAction" }, null, -1))
                          ]),
                          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(modelFormData).durationResolutionMap, (row, rowIndex) => {
                            return openBlock(), createElementBlock("div", {
                              key: rowIndex,
                              class: "drmRow"
                            }, [
                              createBaseVNode("div", _hoisted_30, toDisplayString(rowIndex + 1), 1),
                              createVNode(_component_t_tag_input, {
                                modelValue: row.duration,
                                "onUpdate:modelValue": ($event) => row.duration = $event,
                                placeholder: _ctx.$t("settings.vendor.enterAndPress"),
                                class: "drmInput"
                              }, null, 8, ["modelValue", "onUpdate:modelValue", "placeholder"]),
                              _cache[29] || (_cache[29] = createBaseVNode("div", { class: "drmArrow" }, "→", -1)),
                              createVNode(_component_t_tag_input, {
                                modelValue: row.resolution,
                                "onUpdate:modelValue": ($event) => row.resolution = $event,
                                placeholder: _ctx.$t("settings.vendor.enterAndPress"),
                                class: "drmInput"
                              }, null, 8, ["modelValue", "onUpdate:modelValue", "placeholder"]),
                              createVNode(_component_t_button, {
                                variant: "text",
                                theme: "danger",
                                size: "small",
                                disabled: unref(modelFormData).durationResolutionMap.length === 1,
                                onClick: ($event) => unref(modelFormData).durationResolutionMap.splice(rowIndex, 1)
                              }, {
                                icon: withCtx(() => [
                                  createVNode(_component_i_delete, { theme: "outline" })
                                ]),
                                _: 1
                              }, 8, ["disabled", "onClick"])
                            ]);
                          }), 128)),
                          createVNode(_component_t_button, {
                            style: { "margin-top": "16px" },
                            variant: "dashed",
                            block: "",
                            onClick: _cache[11] || (_cache[11] = ($event) => unref(modelFormData).durationResolutionMap.push({ duration: [], resolution: [] }))
                          }, {
                            icon: withCtx(() => [
                              createVNode(_component_i_plus, { theme: "outline" })
                            ]),
                            default: withCtx(() => [
                              createTextVNode(" " + toDisplayString(_ctx.$t("settings.vendor.addDurationResolution")), 1)
                            ]),
                            _: 1
                          })
                        ])
                      ]),
                      _: 1
                    }, 8, ["label"])
                  ], 64)) : createCommentVNode("", true)
                ]),
                _: 1
              }, 8, ["data"])
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"]),
        unref(testingModel)?.type === "text" && unref(textTestVisible) ? (openBlock(), createBlock(TextModelTest, {
          key: 1,
          modelVisible: unref(textTestVisible),
          "onUpdate:modelVisible": _cache[13] || (_cache[13] = ($event) => isRef(textTestVisible) ? textTestVisible.value = $event : null),
          vendorId: unref(currentVendor).id,
          modelName: unref(testingModel).modelName
        }, null, 8, ["modelVisible", "vendorId", "modelName"])) : createCommentVNode("", true),
        unref(testingModel)?.type === "image" && unref(imageTestVisible) ? (openBlock(), createBlock(ImageModelTest, {
          key: 2,
          modelVisible: unref(imageTestVisible),
          "onUpdate:modelVisible": _cache[14] || (_cache[14] = ($event) => isRef(imageTestVisible) ? imageTestVisible.value = $event : null),
          vendorId: unref(currentVendor).id,
          modelName: unref(testingModel).modelName,
          supportedModes: unref(testingModel).mode || []
        }, null, 8, ["modelVisible", "vendorId", "modelName", "supportedModes"])) : createCommentVNode("", true),
        unref(testingModel)?.type === "video" && unref(videoTestVisible) ? (openBlock(), createBlock(VideoModelTest, {
          key: 3,
          modelVisible: unref(videoTestVisible),
          "onUpdate:modelVisible": _cache[15] || (_cache[15] = ($event) => isRef(videoTestVisible) ? videoTestVisible.value = $event : null),
          vendorId: unref(currentVendor).id,
          modelName: unref(testingModel).modelName,
          rawModes: unref(testingModel).mode || []
        }, null, 8, ["modelVisible", "vendorId", "modelName", "rawModes"])) : createCommentVNode("", true),
        createVNode(_component_t_dialog, {
          width: "30vw",
          placement: "center",
          top: "10vh",
          footer: false,
          visible: unref(vendorDialogVisible),
          "onUpdate:visible": _cache[20] || (_cache[20] = ($event) => isRef(vendorDialogVisible) ? vendorDialogVisible.value = $event : null),
          header: _ctx.$t("settings.vendor.addVendorDialog"),
          maskClosable: false
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_31, [
              createVNode(_component_t_radio_group, {
                variant: "default-filled",
                modelValue: unref(addMode),
                "onUpdate:modelValue": _cache[16] || (_cache[16] = ($event) => isRef(addMode) ? addMode.value = $event : null)
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_radio_button, { value: "importAdd" }, {
                    default: withCtx(() => [..._cache[30] || (_cache[30] = [
                      createTextVNode("通过文件导入", -1)
                    ])]),
                    _: 1
                  }),
                  createVNode(_component_t_radio_button, { value: "linkAdd" }, {
                    default: withCtx(() => [..._cache[31] || (_cache[31] = [
                      createTextVNode("通过链接添加", -1)
                    ])]),
                    _: 1
                  }),
                  createVNode(_component_t_radio_button, { value: "codeAdd" }, {
                    default: withCtx(() => [..._cache[32] || (_cache[32] = [
                      createTextVNode("通过代码添加", -1)
                    ])]),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["modelValue"]),
              unref(addMode) == "linkAdd" ? (openBlock(), createElementBlock("div", _hoisted_32, [
                createVNode(_component_t_alert, {
                  theme: "warning",
                  style: { "margin-bottom": "20px" }
                }, {
                  default: withCtx(() => [..._cache[33] || (_cache[33] = [
                    createTextVNode(" 请填写 TypeScript 代码文件的链接（.ts 文件），不要填 API 地址或其他无关链接。 确认后 Toonflow 会自动加载该代码，请确保链接来源可信。 ", -1)
                  ])]),
                  _: 1
                }),
                createVNode(_component_t_input, {
                  modelValue: unref(link),
                  "onUpdate:modelValue": _cache[17] || (_cache[17] = ($event) => isRef(link) ? link.value = $event : null),
                  placeholder: _ctx.$t("settings.vendor.linkAddPlaceholder")
                }, null, 8, ["modelValue", "placeholder"]),
                createBaseVNode("div", _hoisted_33, [
                  createVNode(_component_t_button, {
                    loading: unref(linkReading),
                    disabled: !unref(link).trim(),
                    onClick: linkRead
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("settings.vendor.linkAdd")), 1)
                    ]),
                    _: 1
                  }, 8, ["loading", "disabled"])
                ])
              ])) : createCommentVNode("", true),
              unref(addMode) == "importAdd" ? (openBlock(), createElementBlock("div", _hoisted_34, [
                createBaseVNode("div", {
                  class: "uploadArea",
                  onClick: triggerUpload,
                  onDragover: _cache[19] || (_cache[19] = withModifiers(() => {
                  }, ["prevent"])),
                  onDrop: withModifiers(handleDrop, ["prevent"])
                }, [
                  createVNode(_component_t_upload, {
                    ref_key: "uploadRef",
                    ref: uploadRef,
                    modelValue: unref(fileList),
                    "onUpdate:modelValue": _cache[18] || (_cache[18] = ($event) => isRef(fileList) ? fileList.value = $event : null),
                    theme: "file",
                    multiple: false,
                    max: 1,
                    accept: ".ts",
                    "before-upload": handleBeforeUpload,
                    "request-method": requestMethod,
                    style: { "display": "none" }
                  }, null, 8, ["modelValue"]),
                  createBaseVNode("div", _hoisted_35, [
                    createVNode(_component_i_upload_one, {
                      theme: "outline",
                      size: "32",
                      fill: "var(--td-brand-color)"
                    })
                  ]),
                  createBaseVNode("p", _hoisted_36, toDisplayString(_ctx.$t("workbench.novel.import.importAdd")), 1),
                  createBaseVNode("p", _hoisted_37, toDisplayString(_ctx.$t("workbench.novel.import.limit")), 1)
                ], 32)
              ])) : createCommentVNode("", true),
              unref(addMode) == "codeAdd" ? (openBlock(), createElementBlock("div", _hoisted_38)) : createCommentVNode("", true)
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"]),
        createVNode(_component_t_dialog, {
          width: "70vw",
          placement: "center",
          top: "10vh",
          visible: unref(codeDialogVisible),
          "onUpdate:visible": _cache[24] || (_cache[24] = ($event) => isRef(codeDialogVisible) ? codeDialogVisible.value = $event : null),
          header: _ctx.$t("settings.vendor.code"),
          maskClosable: false,
          onConfirm: handleConfirmVendor
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_39, [
              createBaseVNode("div", _hoisted_40, [
                createVNode(_component_t_icon, {
                  name: "info-circle",
                  size: "16px"
                }),
                createBaseVNode("span", null, toDisplayString(_ctx.$t("settings.vendor.codeEditorInfo")), 1)
              ]),
              createBaseVNode("div", _hoisted_41, [
                createVNode(_component_t_button, {
                  variant: "text",
                  size: "small",
                  onClick: _cache[21] || (_cache[21] = ($event) => vendorCode.value = unref(VENDOR_CODE_TEMPLATE))
                }, {
                  icon: withCtx(() => [
                    createVNode(_component_t_icon, { name: "rollback" })
                  ]),
                  default: withCtx(() => [
                    createTextVNode(" " + toDisplayString(_ctx.$t("settings.vendor.reset")), 1)
                  ]),
                  _: 1
                }),
                createVNode(_component_t_button, {
                  variant: "outline",
                  size: "small",
                  onClick: _cache[22] || (_cache[22] = ($event) => unref(fileInputRef)?.click())
                }, {
                  icon: withCtx(() => [
                    createVNode(_component_t_icon, { name: "upload" })
                  ]),
                  default: withCtx(() => [
                    createTextVNode(" " + toDisplayString(_ctx.$t("settings.vendor.importFile")), 1)
                  ]),
                  _: 1
                }),
                createBaseVNode("input", {
                  ref_key: "fileInputRef",
                  ref: fileInputRef,
                  type: "file",
                  accept: ".ts,.js,.txt,.json",
                  style: { "display": "none" },
                  onChange: handleFileChange
                }, null, 544)
              ])
            ]),
            createBaseVNode("div", _hoisted_42, [
              createVNode(AsyncMonacoEditor, {
                value: unref(vendorCode),
                "onUpdate:value": _cache[23] || (_cache[23] = ($event) => isRef(vendorCode) ? vendorCode.value = $event : null),
                language: "typescript",
                theme: "vs-dark",
                height: 600,
                options: editorOptions
              }, null, 8, ["value"])
            ])
          ]),
          _: 1
        }, 8, ["visible", "header"])
      ]);
    };
  }
});

/* unplugin-vue-components disabled */

const vendorConfig = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-23d1d2cf"]]);

export { vendorConfig as default };

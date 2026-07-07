import{l as $e,bO as Ee,bB as te,bo as a,br as B,bm as s,bp as i,a1 as t,bh as m,bu as c,bq as A,F as T,bs as W,bj as Te,j as o,bz as w,c7 as Wt,bP as oe,bv as z,bQ as Ke,r as h,n as ze,w as ge,c as me,bF as Gt,o as Jt,a7 as Xt,E as Yt,c6 as De}from"./vue-vendor-7URUX6CT.js";import{a as Qt}from"./markdown-D0TR88w0.js";import{_ as Zt}from"./monaco-ZSDiKcFQ.js";import{i as ee}from"./axios-DD9fRQiy.js";import{m as en,p as tn}from"./modelSelect-DBBEp0VG.js";import{_ as _e,s as nn}from"./index-D3aWpnQy.js";import{D as Ae,n as He,B as xe,R as je,c as We,b as Ge,L as ut,I as mt,u as on,a6 as ln,j as sn,t as an,E as rn,A as dn,f as un,s as mn,r as cn,k as gn,T as vn,F as pn,i as fn,O as bn,g as yn,a0 as hn,X as $n,h as _n,q as Vn,U as kn,m as ae,a as Oe}from"./tdesign-BMnQu0So.js";import"./webav-RHjmMPDn.js";import"./icons-CTkAtesi.js";const qe=`/**\r
 * Toonflow AI供应商模板\r
 * @version 2.0\r
 */\r
\r
// ============================================================\r
// 类型定义\r
// ============================================================\r
\r
type VideoMode =\r
  | "singleImage" //单图参考\r
  | "startEndRequired" //首尾帧（两张都得有）\r
  | "endFrameOptional" //首尾帧（尾帧可选）\r
  | "startFrameOptional" //首尾帧（首帧可选）\r
  | "text" //文本\r
  | (\`videoReference:\${number}\` | \`imageReference:\${number}\` | \`audioReference:\${number}\`)[]; //多参考（数字代表限制数量）\r
\r
interface TextModel {\r
  name: string;\r
  modelName: string;\r
  type: "text";\r
  think: boolean;\r
}\r
\r
interface ImageModel {\r
  name: string;\r
  modelName: string;\r
  type: "image";\r
  mode: ("text" | "singleImage" | "multiReference")[];\r
  associationSkills?: string;\r
}\r
\r
interface VideoModel {\r
  name: string;\r
  modelName: string;\r
  type: "video";\r
  mode: VideoMode[];\r
  associationSkills?: string;\r
  audio: "optional" | false | true;\r
  durationResolutionMap: { duration: number[]; resolution: string[] }[];\r
}\r
\r
interface TTSModel {\r
  name: string;\r
  modelName: string;\r
  type: "tts";\r
  voices: { title: string; voice: string }[];\r
}\r
\r
interface VendorConfig {\r
  id: string; //唯一ID，作为文件名存储用户磁盘上，禁止符号\r
  version: string; //版本号，格式为x.y，需遵守语义化版本控制\r
  name: string; //供应商名称\r
  author: string; //作者\r
  description?: string; //描述，支持Markdown格式\r
  icon?: string; //图标，仅支持Base64格式，建议尺寸为128x128像素\r
  inputs: { key: string; label: string; type: "text" | "password" | "url"; required: boolean; placeholder?: string }[];\r
  inputValues: Record<string, string>;\r
  models: (TextModel | ImageModel | VideoModel | TTSModel)[];\r
}\r
\r
type ReferenceList =\r
  | { type: "image"; sourceType: "base64"; base64: string }\r
  | { type: "audio"; sourceType: "base64"; base64: string }\r
  | { type: "video"; sourceType: "base64"; base64: string };\r
\r
interface ImageConfig {\r
  prompt: string;\r
  referenceList?: Extract<ReferenceList, { type: "image" }>[];\r
  size: "1K" | "2K" | "4K";\r
  aspectRatio: \`\${number}:\${number}\`;\r
}\r
\r
interface VideoConfig {\r
  duration: number;\r
  resolution: string;\r
  aspectRatio: "16:9" | "9:16";\r
  prompt: string;\r
  referenceList?: ReferenceList[];\r
  audio?: boolean;\r
  mode: VideoMode[];\r
}\r
\r
interface TTSConfig {\r
  text: string;\r
  voice: string;\r
  speechRate: number;\r
  pitchRate: number;\r
  volume: number;\r
  referenceList?: Extract<ReferenceList, { type: "audio" }>[];\r
}\r
\r
interface PollResult {\r
  completed: boolean;\r
  data?: string;\r
  error?: string;\r
}\r
\r
// ============================================================\r
// 全局声明\r
// ============================================================\r
\r
declare const axios: any; // HTTP请求库\r
declare const logger: (msg: string) => void; // 日志函数\r
declare const jsonwebtoken: any; // JWT处理库\r
declare const zipImage: (base64: string, size: number) => Promise<string>; // 图片压缩函数，返回有头base64字符串\r
declare const zipImageResolution: (base64: string, w: number, h: number) => Promise<string>; // 图片分辨率调整函数，返回有头base64字符串\r
declare const mergeImages: (base64Arr: string[], maxSize?: string) => Promise<string>; // 图片合成函数，返回有头base64字符串\r
declare const urlToBase64: (url: string) => Promise<string>; // URL转Base64函数，返回有头base64字符串\r
declare const pollTask: (fn: () => Promise<PollResult>, interval?: number, timeout?: number) => Promise<PollResult>; // 轮询函数，fn为异步函数，interval为轮询间隔，timeout为超时时间，返回fn的结果\r
declare const createOpenAI: any;\r
declare const createDeepSeek: any;\r
declare const createZhipu: any;\r
declare const createQwen: any;\r
declare const createAnthropic: any;\r
declare const createOpenAICompatible: any;\r
declare const createXai: any;\r
declare const createMinimax: any;\r
declare const createGoogleGenerativeAI: any;\r
declare const exports: {\r
  vendor: VendorConfig;\r
  textRequest: (m: TextModel) => any; //文本模型\r
  imageRequest: (c: ImageConfig, m: ImageModel) => Promise<string>; //图片模型，返回有头base64字符串\r
  videoRequest: (c: VideoConfig, m: VideoModel) => Promise<string>; //视频模型，返回有头base64字符串\r
  ttsRequest: (c: TTSConfig, m: TTSModel) => Promise<string>; //（暂未开放）语音模型，返回有头base64字符串\r
  checkForUpdates?: () => Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }>; //检查更新函数，返回是否有更新和最新版本号和更公告（支持Markdown格式）\r
  updateVendor?: () => Promise<string>; //更新函数，返回最新的代码文本\r
};\r
\r
// ============================================================\r
// 供应商配置\r
// ============================================================\r
\r
const vendor: VendorConfig = {\r
  id: "bull",\r
  version: "2.0",\r
  author: "Toonflow",\r
  name: "空模板",\r
  description: "## OpenAI标准格式接口，可修改请求地址并手动添加模型。",\r
  inputs: [\r
    { key: "apiKey", label: "API密钥", type: "password", required: true },\r
    { key: "baseUrl", label: "请求地址", type: "url", required: true, placeholder: "示例：https://api.openai.com/v1" },\r
  ],\r
  inputValues: { apiKey: "", baseUrl: "https://api.openai.com/v1" },\r
  models: [{ name: "GPT-4o", modelName: "gpt-4o", type: "text", think: false }],\r
};\r
\r
// ============================================================\r
// 适配器函数\r
// ============================================================\r
\r
const textRequest = (model: TextModel) => {\r
  if (!vendor.inputValues.apiKey) throw new Error("缺少API Key");\r
  const apiKey = vendor.inputValues.apiKey.replace(/^Bearer\\s+/i, "");\r
  return createOpenAI({ baseURL: vendor.inputValues.baseUrl, apiKey }).chat(model.modelName);\r
};\r
\r
const imageRequest = async (config: ImageConfig, model: ImageModel): Promise<string> => {\r
  return "";\r
};\r
\r
const videoRequest = async (config: VideoConfig, model: VideoModel): Promise<string> => {\r
  return "";\r
};\r
\r
const ttsRequest = async (config: TTSConfig, model: TTSModel): Promise<string> => {\r
  return "";\r
};\r
\r
const checkForUpdates = async (): Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }> => {\r
  return { hasUpdate: false, latestVersion: "2.0", notice: "## 新版本更新公告" };\r
};\r
\r
const updateVendor = async (): Promise<string> => {\r
  return "";\r
};\r
\r
// ============================================================\r
// 导出\r
// ============================================================\r
\r
exports.vendor = vendor;\r
exports.textRequest = textRequest;\r
exports.imageRequest = imageRequest;\r
exports.videoRequest = videoRequest;\r
exports.ttsRequest = ttsRequest;\r
exports.checkForUpdates = checkForUpdates;\r
exports.updateVendor = updateVendor;\r
\r
// 这行代码用于确保当前文件被识别为模块，避免全局变量冲突\r
export {};\r
\r
/**\r
 * ============================================================\r
 * AI 代码生成指南\r
 * ============================================================\r
 *\r
 * 【概述】\r
 * 本文件是 Toonflow AI 供应商适配模板。AI 在生成新供应商适配代码时，\r
 * 必须严格遵守以下规则，并要求用户提供目标平台的 curl 调用示例或 API 文档信息作为输入依据。\r
 *\r
 * 【前置要求】\r
 * 在生成代码前，请向用户索要以下信息（至少其一）：\r
 *   1. 目标 API 的 curl 请求示例（包含请求地址、Headers、Body 结构、响应结构）\r
 *   2. 目标 API 的官方文档链接或文档截图/文本内容\r
 *   3. 需要适配的模型类型（text / image / video / tts）及其能力说明\r
 * 没有足够信息时，应主动追问，不要凭空编造 API 结构。\r
 *\r
 * 【代码规则】\r
 *\r
 * 1. 禁止引入任何外部包\r
 *    不可使用 import / require，仅能使用本文件「全局声明」区域中已声明的方法和对象，\r
 *    包括：axios、logger、jsonwebtoken、zipImage、zipImageResolution、mergeImages、\r
 *    urlToBase64、pollTask，以及 createOpenAI、createDeepSeek、createZhipu、createQwen、\r
 *    createAnthropic、createOpenAICompatible、createXai、createMinimax、\r
 *    createGoogleGenerativeAI 等 AI SDK 工厂函数。\r
 *\r
 * 2. 禁止在 exports.* 函数外部声明离散的全大写常量\r
 *    错误示例：const API_URL = "https://..."; const MAX_RETRY = 3;\r
 *    如果确实需要可配置的常量值，必须将其声明在 vendor.inputValues 中，\r
 *    通过 vendor.inputValues.xxx 访问，让用户可在界面上配置。\r
 *    如果是纯逻辑内部使用的临时变量，应内联在对应的 exports.* 函数体内部，使用小驼峰命名。\r
 *\r
 * 3. 逻辑尽量聚合在 exports.* 对应的函数内部\r
 *    每个适配函数（textRequest / imageRequest / videoRequest / ttsRequest）\r
 *    应自包含，将请求构造、发送、轮询、结果解析等逻辑写在函数体内，避免拆分出大量外部辅助函数。\r
 *    如果多个函数确实存在公共逻辑（如签名计算、Token 生成、请求头构造），\r
 *    可提取为文件内的小驼峰命名函数，放在「适配器函数」区块之前的「辅助工具」区块中，\r
 *    且不可使用全大写命名。\r
 *\r
 * 4. 命名规范\r
 *    所有变量、函数一律使用小驼峰命名（camelCase），禁止使用 UPPER_SNAKE_CASE。\r
 *\r
 * 5. 不需要重新声明类型\r
 *    本文件顶部已完整定义了所有接口和类型（VendorConfig、ImageConfig、VideoConfig、\r
 *    TTSConfig、TextModel、ImageModel、VideoModel、TTSModel、ReferenceList、PollResult 等），\r
 *    AI 生成代码时直接使用即可，不要重复声明。\r
 *\r
 * 6. 返回值规范\r
 *    - textRequest(model)：返回 AI SDK 的 chat model 实例（通过 createOpenAI 等工厂函数创建）。\r
 *    - imageRequest(config, model)：返回有头 base64 字符串（如 "data:image/png;base64,..."）。\r
 *      config.referenceList 为 Extract<ReferenceList, { type: "image" }>[] 类型，\r
 *      每个引用条目均为 base64 形式（sourceType 固定为 "base64"）。\r
 *    - videoRequest(config, model)：返回有头 base64 字符串（如 "data:video/mp4;base64,..."）。\r
 *      config.referenceList 为 ReferenceList[] 类型，可包含 image / video / audio 三种引用，\r
 *      每个引用条目均为 base64 形式（sourceType 固定为 "base64"）。\r
 *      config.mode 为当前激活的视频模式数组，需根据 mode 决定如何使用 referenceList。\r
 *    - ttsRequest(config, model)：返回有头 base64 字符串（如 "data:audio/mp3;base64,..."）。\r
 *      config.referenceList 为 Extract<ReferenceList, { type: "audio" }>[] 类型（音频参考）。\r
 *    当 API 返回的是 URL 而非二进制数据时，使用 urlToBase64(url) 转换。\r
 *\r
 * 7. ReferenceList 与 VideoMode 说明\r
 *    ReferenceList 是统一的多媒体引用类型，每个条目包含：\r
 *      - type: "image" | "audio" | "video"（媒体类型）\r
 *      - sourceType: "base64"（当前模板固定为 base64）\r
 *      - base64（对应的数据）\r
 *\r
 *    VideoMode 定义了视频模型支持的输入模式：\r
 *      - "text"：纯文本生成视频\r
 *      - "singleImage"：单张首帧图片\r
 *      - "startEndRequired"：首尾帧（两张都必须提供）\r
 *      - "endFrameOptional"：首尾帧（尾帧可选）\r
 *      - "startFrameOptional"：首尾帧（首帧可选）\r
 *      - 数组形式如 ["imageReference:9", "videoReference:3", "audioReference:3"]：\r
 *        多模态参考模式，数字表示该类型的最大数量限制。\r
 *\r
 *    在 videoRequest 中，config.mode 表示当前选择的模式，需根据其值决定：\r
 *      - 如何从 config.referenceList 中提取对应类型的引用\r
 *      - 如何构造 API 请求体中的图片/视频/音频参数\r
 *\r
 * 8. 异步任务处理\r
 *    对于视频生成等需要轮询的异步任务，使用全局的 pollTask 函数：\r
 *    const result = await pollTask(async () => {\r
 *      const resp = await axios.get(...);\r
 *      if (resp.data.status === "SUCCESS") return { completed: true, data: resp.data.url };\r
 *      if (resp.data.status === "FAILED") return { completed: true, error: resp.data.message };\r
 *      return { completed: false };\r
 *    }, 5000, 600000); // 每5秒轮询，10分钟超时\r
 *    if (result.error) throw new Error(result.error);\r
 *    return await urlToBase64(result.data!);\r
 *\r
 * 9. 错误处理\r
 *    在每个函数开头校验必需参数（如 API Key），缺失时使用 throw new Error("...") 抛出。\r
 *    API 请求失败时，从响应中提取有意义的错误信息抛出，不要吞掉异常。\r
 *\r
 * 10. 日志输出\r
 *     在关键步骤使用 logger("...") 输出日志（如"开始提交任务"、"任务ID: xxx"、"轮询中..."），\r
 *     便于调试。\r
 *\r
 * 11. vendor 配置填写\r
 *     - id：纯英文小写，作为文件名使用，禁止特殊符号和空格。\r
 *     - version：语义化版本格式 "x.y"。\r
 *     - inputs：根据目标 API 所需的认证信息配置（API Key、Secret、请求地址等）。\r
 *     - models：根据目标平台支持的模型列表填写，注意正确设置 type 和各模型特有字段。\r
 *       - VideoModel 的 mode 对应 API 支持的输入模式（参见规则 7 的 VideoMode 说明）。\r
 *       - VideoModel 的 audio 字段：true（始终生成音频）、false（不生成）、"optional"（用户可选）。\r
 *       - VideoModel 的 durationResolutionMap 对应各时长下可选的分辨率。\r
 *       - VideoModel 的 associationSkills 可选，用于描述模型的特殊能力。\r
 *       - ImageModel 的 mode 对应 API 支持的生图模式（"text" 纯文本、"singleImage" 单图参考、"multiReference" 多图参考）。\r
 *       - TTSModel 的 voices 对应可选的音色列表。\r
 *\r
 * 12. 图片处理\r
 *     - 需要压缩图片体积时使用 zipImage(base64, maxSizeKB)。\r
 *     - 需要调整图片分辨率时使用 zipImageResolution(base64, width, height)。\r
 *     - 需要将多张图片拼合为一张时使用 mergeImages(base64Arr, maxSize)。\r
 *     - 以上函数均接收和返回有头 base64 字符串。\r
 *\r
 * 13. 文件结构\r
 *     生成的代码必须保持本模板的整体结构：\r
 *     类型定义区 → 全局声明区 → 供应商配置区 → [辅助工具区（可选）] → 适配器函数区 → 导出区\r
 *     不要打乱顺序，不要删除已有的结构注释分隔线。\r
 *     辅助工具区用于放置多个适配器函数共享的小驼峰命名辅助函数（如 getHeaders、getBaseUrl）。\r
 *\r
 * 14. 导出规范\r
 *     必须导出以下字段（通过 exports.xxx = xxx 赋值）：\r
 *       - exports.vendor（必须）\r
 *       - exports.textRequest（必须）\r
 *       - exports.imageRequest（必须）\r
 *       - exports.videoRequest（必须）\r
 *       - exports.ttsRequest（必须）\r
 *       - exports.checkForUpdates（可选）\r
 *       - exports.updateVendor（可选）\r
 *     未实现的适配器函数保留空实现（return ""），不可省略导出。\r
 *     文件末尾必须包含 export {}; 以确保文件被识别为模块。\r
 *\r
 * 【生成流程】\r
 * 当用户请求生成新的供应商适配时：\r
 *   1. 确认用户已提供 curl 示例或 API 文档。\r
 *   2. 分析 API 的认证方式、端点地址、请求/响应结构。\r
 *   3. 基于本模板结构，填充 vendor 配置和对应的适配器函数。\r
 *   4. 根据当前模板的 ReferenceList 定义，按 base64 形式构造和消费 referenceList。\r
 *   5. 仅实现用户需要的模型类型，未用到的函数保留空实现（return ""）。\r
 *   6. 生成完整可用的代码，确保无语法错误、无遗漏导出。\r
 */\r
`,Rn={class:"textTestDialog"},wn={key:0,class:"emptyHint"},Cn={class:"bubble"},Mn={class:"role"},In={key:0,class:"content"},Tn={key:0,class:"thinkContent"},An={key:1,class:"cursor"},xn={key:1,class:"content"},Un={class:"inputArea"},Bn={class:"inputActions"},Pn={class:"hint"},Fn={class:"btns"},Sn=$e({__name:"TextModelTest",props:Ke({vendorId:{},modelName:{}},{modelVisible:{type:Boolean},modelVisibleModifiers:{}}),emits:["update:modelVisible"],setup(I){const G=I,O=Ee(I,"modelVisible"),U=h([]),P=h(""),b=h(!1),F=h(null);function E(){ze(()=>{F.value&&(F.value.scrollTop=F.value.scrollHeight)})}async function $(){var x,K,H;const p=P.value.trim();if(!p||b.value)return;U.value.push({role:"user",content:p}),P.value="",b.value=!0;const f={role:"assistant",content:"",loading:!0};U.value.push(f),E();try{const u=U.value.slice(0,-1).map(S=>({role:S.role,content:S.content})),{data:q}=await ee.post("/setting/vendorConfig/modelTest/textTest",{modelName:G.modelName,id:G.vendorId,messages:u});f.content=typeof q=="string"?q:(q==null?void 0:q.content)??JSON.stringify(q),f.thinking=(q==null?void 0:q.thinking)??void 0,f.loading=!1}catch(u){const q=((K=(x=u==null?void 0:u.response)==null?void 0:x.data)==null?void 0:K.message)||((H=u==null?void 0:u.response)==null?void 0:H.data)||(u==null?void 0:u.message)||String(u);f.content=`❌ ${typeof q=="string"?q:JSON.stringify(q)}`,f.loading=!1}finally{b.value=!1,E()}}function V(){U.value=[]}function v(){U.value=[],P.value="",b.value=!1}return(p,f)=>{const x=te("i-thinking-problem"),K=He,H=xe,u=te("i-send"),q=Ae;return a(),B(q,{placement:"center",width:"60vw",visible:O.value,"onUpdate:visible":f[1]||(f[1]=S=>O.value=S),header:p.$t("settings.vendor.test.textTitle")+" - "+I.modelName,footer:!1,onClosed:v},{default:s(()=>[i("div",Rn,[i("div",{class:"messageList",ref_key:"messageListRef",ref:F},[t(U).length===0?(a(),m("div",wn,c(p.$t("settings.vendor.test.textEmptyHint")),1)):A("",!0),(a(!0),m(T,null,W(t(U),(S,k)=>(a(),m("div",{key:k,class:Te(["messageItem",S.role])},[i("div",Cn,[i("div",Mn,c(S.role==="user"?p.$t("settings.vendor.test.you"):p.$t("settings.vendor.test.assistant")),1),S.role==="assistant"?(a(),m("div",In,[S.thinking?(a(),m("span",Tn,[o(x,{theme:"outline",size:"14"}),w(" "+c(S.thinking),1)])):A("",!0),i("span",null,c(S.content),1),S.loading?(a(),m("span",An,"▌")):A("",!0)])):(a(),m("div",xn,c(S.content),1))])],2))),128))],512),i("div",Un,[o(K,{modelValue:t(P),"onUpdate:modelValue":f[0]||(f[0]=S=>z(P)?P.value=S:null),placeholder:p.$t("settings.vendor.test.textInputPlaceholder"),autosize:{minRows:2,maxRows:5},disabled:t(b),onKeydown:Wt(oe($,["ctrl","exact"]),["enter"])},null,8,["modelValue","placeholder","disabled","onKeydown"]),i("div",Bn,[i("span",Pn,"Ctrl + Enter "+c(p.$t("settings.vendor.test.send")),1),i("div",Fn,[o(H,{variant:"outline",size:"small",disabled:t(b)||t(U).length===0,onClick:V},{default:s(()=>[w(c(p.$t("settings.vendor.test.clearHistory")),1)]),_:1},8,["disabled"]),o(H,{theme:"primary",size:"small",loading:t(b),disabled:!t(P).trim(),onClick:$},{icon:s(()=>[o(u,{theme:"outline"})]),default:s(()=>[w(" "+c(p.$t("settings.vendor.test.send")),1)]),_:1},8,["loading","disabled"])])])])])]),_:1},8,["visible","header"])}}}),Ln=_e(Sn,[["__scopeId","data-v-09ade7e9"]]),Nn={class:"imageTestDialog"},Dn={class:"modeBar"},On={class:"inputSection"},qn={key:0,class:"uploadRow"},zn=["src"],En={class:"uploadText"},Kn={class:"uploadHint"},Hn={key:0,class:"resultSection"},jn={class:"resultLabel"},Wn={class:"resultImg"},Gn=["src"],Jn={key:1,class:"loadingSection"},Xn={class:"dialogFooter"},Yn=$e({__name:"ImageModelTest",props:Ke({vendorId:{},modelName:{},supportedModes:{}},{modelVisible:{type:Boolean},modelVisibleModifiers:{}}),emits:["update:modelVisible"],setup(I){const G=Ee(I,"modelVisible"),O=I,U=[{value:"text",label:$t("settings.vendor.test.textToImage")},{value:"singleImage",label:$t("settings.vendor.test.imageToImage")},{value:"multiReference",label:$t("settings.vendor.test.multiRef")}],P=me(()=>U.filter(k=>O.supportedModes.includes(k.value))),b=h("text");ge(()=>O.supportedModes,k=>{k.length>0&&!k.includes(b.value)&&(b.value=k[0])},{immediate:!0}),ge(b,()=>{E.value=null,$.value="",p.value=""});const F=h(""),E=h(null),$=h(""),V=h(null),v=h(!1),p=h(""),f=me(()=>v.value?!1:b.value==="text"?!!F.value.trim():b.value==="singleImage"||b.value==="multiReference"?!!E.value:!1);function x(){var k;(k=V.value)==null||k.click()}function K(k){var r;const C=(r=k.target.files)==null?void 0:r[0];C&&(E.value=C,$.value=URL.createObjectURL(C),k.target.value="")}function H(k){var r,d;const C=(d=(r=k.dataTransfer)==null?void 0:r.files)==null?void 0:d[0];C&&C.type.startsWith("image/")&&(E.value=C,$.value=URL.createObjectURL(C))}const u=k=>new Promise((C,r)=>{const d=new FileReader;d.onload=()=>C(d.result),d.onerror=r,d.readAsDataURL(k)});async function q(){v.value=!0,p.value="";try{const k={modelName:O.modelName,id:O.vendorId},C=F.value.trim();C&&(k.prompt=C),E.value&&(k.imageBase64=await u(E.value));const{data:r}=await ee.post("/setting/vendorConfig/modelTest/imageTest",k);p.value=r,window.$message.success($t("settings.vendor.msg.imageGenSuccess"))}catch(k){window.$message.error(k.message??`${$t("settings.vendor.msg.requestFailed")}`)}finally{v.value=!1}}function S(){F.value="",E.value=null,$.value="",p.value="",v.value=!1}return(k,C)=>{const r=We,d=je,N=te("i-picture"),Y=He,ne=Ge,le=ut,L=xe,de=te("i-lightning"),ce=Ae;return a(),B(ce,{placement:"center",width:"56vw",visible:G.value,"onUpdate:visible":C[4]||(C[4]=D=>G.value=D),header:k.$t("settings.vendor.test.imageTitle")+" - "+I.modelName,footer:!1,onClosed:S},{default:s(()=>[i("div",Nn,[i("div",Dn,[o(d,{modelValue:t(b),"onUpdate:modelValue":C[0]||(C[0]=D=>z(b)?b.value=D:null),variant:"default-filled"},{default:s(()=>[(a(!0),m(T,null,W(t(P),D=>(a(),B(r,{key:D.value,value:D.value},{default:s(()=>[w(c(D.label),1)]),_:2},1032,["value"]))),128))]),_:1},8,["modelValue"])]),i("div",On,[t(b)==="singleImage"?(a(),m("div",qn,[i("div",{class:"uploadBox",onClick:x,onDragover:C[1]||(C[1]=oe(()=>{},["prevent"])),onDrop:oe(H,["prevent"])},[t($)?(a(),m("img",{key:0,src:t($),class:"previewImg",alt:"preview"},null,8,zn)):(a(),m(T,{key:1},[o(N,{theme:"outline",size:"32",fill:"var(--td-brand-color)"}),i("p",En,c(k.$t("settings.vendor.test.uploadImage")),1),i("p",Kn,c(k.$t("settings.vendor.test.supportFormat")),1)],64))],32),i("input",{ref_key:"imageInputRef",ref:V,type:"file",accept:"image/*",style:{display:"none"},onChange:K},null,544)])):A("",!0),o(ne,{label:k.$t("settings.vendor.test.prompt")},{default:s(()=>[o(Y,{modelValue:t(F),"onUpdate:modelValue":C[2]||(C[2]=D=>z(F)?F.value=D:null),placeholder:k.$t("settings.vendor.test.promptPlaceholder"),autosize:{minRows:2,maxRows:4},disabled:t(v)},null,8,["modelValue","placeholder","disabled"])]),_:1},8,["label"])]),t(p)?(a(),m("div",Hn,[i("div",jn,c(k.$t("settings.vendor.test.result")),1),i("div",Wn,[i("img",{src:t(p),alt:"generated"},null,8,Gn)])])):t(v)?(a(),m("div",Jn,[o(le,{size:"large",text:k.$t("settings.vendor.generating")},null,8,["text"])])):A("",!0),i("div",Xn,[o(L,{variant:"outline",onClick:C[3]||(C[3]=D=>G.value=!1)},{default:s(()=>[w(c(k.$t("settings.vendor.test.cancel")),1)]),_:1}),o(L,{theme:"primary",loading:t(v),disabled:!t(f),onClick:q},{icon:s(()=>[o(de,{theme:"outline"})]),default:s(()=>[w(" "+c(k.$t("settings.vendor.test.startTest")),1)]),_:1},8,["loading","disabled"])])])]),_:1},8,["visible","header"])}}}),Qn=_e(Yn,[["__scopeId","data-v-3dd5416b"]]),Zn=["src"],eo={class:"boxText"},to={key:0,class:"optionalTag"},no=$e({__name:"ImageUploadBox",props:{modelValue:{},optional:{type:Boolean},label:{}},emits:["update:modelValue"],setup(I,{emit:G}){const O=I,U=G,P=h(null),b=h("");ge(()=>O.modelValue,v=>{v?b.value=URL.createObjectURL(v):b.value=""});function F(){var v;(v=P.value)==null||v.click()}function E(v){var f;const p=((f=v.target.files)==null?void 0:f[0])??null;U("update:modelValue",p),v.target.value=""}function $(v){var f,x;const p=((x=(f=v.dataTransfer)==null?void 0:f.files)==null?void 0:x[0])??null;p!=null&&p.type.startsWith("image/")&&U("update:modelValue",p)}function V(){U("update:modelValue",null)}return(v,p)=>{const f=te("i-picture"),x=te("i-close");return a(),m("div",{class:Te(["imageUploadBox",{optional:I.optional,hasFile:!!I.modelValue}]),onClick:F,onDragover:p[0]||(p[0]=oe(()=>{},["prevent"])),onDrop:oe($,["prevent"])},[I.modelValue?(a(),m("img",{key:0,src:t(b),class:"preview",alt:"preview"},null,8,Zn)):(a(),m(T,{key:1},[o(f,{theme:"outline",size:"26",fill:"var(--td-brand-color)"}),i("p",eo,c(I.label||v.$t("settings.vendor.test.uploadImage")),1),I.optional?(a(),m("p",to,c(v.$t("settings.vendor.test.optional")),1)):A("",!0)],64)),I.modelValue?(a(),m("button",{key:2,class:"clearBtn",onClick:oe(V,["stop"])},[o(x,{theme:"outline",size:"12"})])):A("",!0),i("input",{ref_key:"inputRef",ref:P,type:"file",accept:"image/*",style:{display:"none"},onChange:E},null,544)],34)}}}),pe=_e(no,[["__scopeId","data-v-f4d54188"]]),oo=["src"],lo={class:"boxText"},so=$e({__name:"VideoUploadBox",props:{modelValue:{},label:{}},emits:["update:modelValue"],setup(I,{emit:G}){const O=I,U=G,P=h(null),b=h("");ge(()=>O.modelValue,v=>{v?b.value=URL.createObjectURL(v):b.value=""});function F(){var v;(v=P.value)==null||v.click()}function E(v){var f;const p=((f=v.target.files)==null?void 0:f[0])??null;U("update:modelValue",p),v.target.value=""}function $(v){var f,x;const p=((x=(f=v.dataTransfer)==null?void 0:f.files)==null?void 0:x[0])??null;p!=null&&p.type.startsWith("video/")&&U("update:modelValue",p)}function V(){U("update:modelValue",null)}return(v,p)=>{const f=te("i-video-one"),x=te("i-close");return a(),m("div",{class:Te(["videoUploadBox",{hasFile:!!I.modelValue}]),onClick:F,onDragover:p[0]||(p[0]=oe(()=>{},["prevent"])),onDrop:oe($,["prevent"])},[I.modelValue&&t(b)?(a(),m("video",{key:0,src:t(b),class:"preview",muted:""},null,8,oo)):(a(),m(T,{key:1},[o(f,{theme:"outline",size:"26",fill:"var(--td-brand-color)"}),i("p",lo,c(I.label||v.$t("settings.vendor.test.uploadVideo")),1)],64)),I.modelValue?(a(),m("button",{key:2,class:"clearBtn",onClick:oe(V,["stop"])},[o(x,{theme:"outline",size:"12"})])):A("",!0),i("input",{ref_key:"inputRef",ref:P,type:"file",accept:"video/*",style:{display:"none"},onChange:E},null,544)],34)}}}),ao=_e(so,[["__scopeId","data-v-180dc2bb"]]),ro={class:"boxText fileName"},io={class:"boxText"},uo=$e({__name:"AudioUploadBox",props:{modelValue:{},label:{}},emits:["update:modelValue"],setup(I,{emit:G}){const O=G,U=h(null);function P(){var $;($=U.value)==null||$.click()}function b($){var v;const V=((v=$.target.files)==null?void 0:v[0])??null;O("update:modelValue",V),$.target.value=""}function F($){var v,p;const V=((p=(v=$.dataTransfer)==null?void 0:v.files)==null?void 0:p[0])??null;V!=null&&V.type.startsWith("audio/")&&O("update:modelValue",V)}function E(){O("update:modelValue",null)}return($,V)=>{const v=te("i-music-one"),p=te("i-close");return a(),m("div",{class:Te(["audioUploadBox",{hasFile:!!I.modelValue}]),onClick:P,onDragover:V[0]||(V[0]=oe(()=>{},["prevent"])),onDrop:oe(F,["prevent"])},[I.modelValue?(a(),m(T,{key:0},[o(v,{theme:"filled",size:"26",fill:"var(--td-success-color)"}),i("p",ro,c(I.modelValue.name),1)],64)):(a(),m(T,{key:1},[o(v,{theme:"outline",size:"26",fill:"var(--td-brand-color)"}),i("p",io,c(I.label||$.$t("settings.vendor.test.uploadAudio")),1)],64)),I.modelValue?(a(),m("button",{key:2,class:"clearBtn",onClick:oe(E,["stop"])},[o(p,{theme:"outline",size:"12"})])):A("",!0),i("input",{ref_key:"inputRef",ref:U,type:"file",accept:"audio/*",style:{display:"none"},onChange:b},null,544)],34)}}}),mo=_e(uo,[["__scopeId","data-v-20e255aa"]]),co={class:"videoTestDialog"},go={class:"modeBar"},vo={class:"modeLabel"},po={key:0,class:"modeDesc"},fo={key:1,class:"inputSection"},bo={class:"uploadRow"},yo={class:"frameRow"},ho={class:"frameRow"},$o={class:"frameRow"},_o={class:"multiRefSection"},Vo={class:"multiRefRow"},ko={key:2,class:"resultSection"},Ro={class:"resultLabel"},wo=["src"],Co={key:3,class:"loadingSection"},Mo={class:"dialogFooter"},Io=$e({__name:"VideoModelTest",props:Ke({vendorId:{},modelName:{},rawModes:{}},{modelVisible:{type:Boolean},modelVisibleModifiers:{}}),emits:["update:modelVisible"],setup(I){const G=I,O=Ee(I,"modelVisible"),U={text:{label:$t("settings.vendor.test.textToVideo"),desc:$t("settings.vendor.test.textToVideoDesc")},singleImage:{label:$t("settings.vendor.test.singleImageMode"),desc:$t("settings.vendor.test.singleImageDesc")},startEndRequired:{label:$t("settings.vendor.startEndRequired"),desc:$t("settings.vendor.test.startEndRequiredDesc")},endFrameOptional:{label:$t("settings.vendor.endFrameOptional"),desc:$t("settings.vendor.test.endFrameOptionalDesc")},startFrameOptional:{label:$t("settings.vendor.startFrameOptional"),desc:$t("settings.vendor.test.startFrameOptionalDesc")}},P=me(()=>{const r=[];for(const d of G.rawModes)if(Array.isArray(d)){const N=[];for(const Y of d){const ne=String(Y).match(/^(videoReference|imageReference|audioReference):(\d+)$/);ne&&N.push({type:ne[1],count:Number(ne[2])})}if(N.length>0){const Y=N.map(ne=>`${ne.type==="imageReference"?$t("settings.vendor.imageRef"):ne.type==="videoReference"?$t("settings.vendor.videoRef"):$t("settings.vendor.audioRef")}×${ne.count}`).join(" + ");r.push({key:JSON.stringify(d),label:Y,desc:`${$t("settings.vendor.test.multiRefDesc")}: ${Y}`,refs:N})}}else{const N=U[String(d)];N&&r.push({key:String(d),label:N.label,desc:N.desc})}return r}),b=h("");ge(P,r=>{var d;r.length>0&&!r.find(N=>N.key===b.value)&&(b.value=((d=r[0])==null?void 0:d.key)??"")},{immediate:!0}),ge(b,()=>{K(),x.value=""});const F=me(()=>P.value.find(r=>r.key===b.value)??null),E=me(()=>{var r;return((r=F.value)==null?void 0:r.refs)??[]}),$=h(""),V=h(Array(30).fill(null)),v=h(Array(30).fill(null)),p=h(Array(30).fill(null)),f=h(!1),x=h("");function K(){V.value=Array(30).fill(null),v.value=Array(30).fill(null),p.value=Array(30).fill(null)}function H(r){return r.type==="imageReference"?`${$t("settings.vendor.imageRef")} (×${r.count})`:r.type==="videoReference"?`${$t("settings.vendor.videoRef")} (×${r.count})`:`${$t("settings.vendor.audioRef")} (×${r.count})`}function u(r){return new Promise((d,N)=>{const Y=new FileReader;Y.onload=()=>d(Y.result),Y.onerror=N,Y.readAsDataURL(r)})}function q(r=""){return r.startsWith("image/")?"image":r.startsWith("video/")?"video":r.startsWith("audio/")?"audio":""}async function S(r){const d=(r||[]).filter(Boolean);return Promise.all(d.map(async N=>({type:q(N.type),base64:await u(N)})))}async function k(){f.value=!0,x.value="";try{const r={modelName:G.modelName,id:G.vendorId,mode:b.value,...$.value.trim()?{prompt:$.value.trim()}:{},images:await S(V.value.filter(Boolean)),videos:await S(v.value.filter(Boolean)),audios:await S(p.value.filter(Boolean))},{data:d}=await ee.post("/setting/vendorConfig/modelTest/videoTest",r,{timeout:30*60*1e3});x.value=d,window.$message.success($t("settings.vendor.msg.videoGenSuccess"))}catch(r){window.$message.error((r==null?void 0:r.message)??`${$t("settings.vendor.msg.requestFailed")}`)}finally{f.value=!1}}function C(){$.value="",K(),x.value="",f.value=!1}return(r,d)=>{const N=We,Y=je,ne=mt,le=He,L=Ge,de=ut,ce=xe,D=te("i-lightning"),fe=Ae;return a(),B(fe,{placement:"center",width:"58vw",visible:O.value,"onUpdate:visible":d[15]||(d[15]=y=>O.value=y),header:r.$t("settings.vendor.test.videoTitle")+" - "+I.modelName,footer:!1,onClosed:C},{default:s(()=>[i("div",co,[i("div",go,[i("div",vo,c(r.$t("settings.vendor.test.selectMode")),1),o(Y,{modelValue:t(b),"onUpdate:modelValue":d[0]||(d[0]=y=>z(b)?b.value=y:null),variant:"default-filled"},{default:s(()=>[(a(!0),m(T,null,W(t(P),y=>(a(),B(N,{key:y.key,value:y.key},{default:s(()=>[w(c(y.label),1)]),_:2},1032,["value"]))),128))]),_:1},8,["modelValue"])]),t(F)?(a(),m("div",po,[o(ne,{name:"info-circle-filled",size:"14px"}),w(" "+c(t(F).desc),1)])):A("",!0),t(b)?(a(),m("div",fo,[t(b)==="text"?(a(),B(L,{key:0,label:r.$t("settings.vendor.test.prompt")},{default:s(()=>[o(le,{modelValue:t($),"onUpdate:modelValue":d[1]||(d[1]=y=>z($)?$.value=y:null),placeholder:r.$t("settings.vendor.test.videoPromptPlaceholder"),autosize:{minRows:2,maxRows:4},disabled:t(f)},null,8,["modelValue","placeholder","disabled"])]),_:1},8,["label"])):t(b)==="singleImage"?(a(),m(T,{key:1},[o(L,{label:r.$t("settings.vendor.test.referenceImage")},{default:s(()=>[i("div",bo,[o(pe,{modelValue:t(V)[0],"onUpdate:modelValue":d[2]||(d[2]=y=>t(V)[0]=y)},null,8,["modelValue"])])]),_:1},8,["label"]),o(L,{label:r.$t("settings.vendor.test.prompt")},{default:s(()=>[o(le,{modelValue:t($),"onUpdate:modelValue":d[3]||(d[3]=y=>z($)?$.value=y:null),placeholder:r.$t("settings.vendor.test.videoPromptPlaceholder"),autosize:{minRows:2,maxRows:3},disabled:t(f)},null,8,["modelValue","placeholder","disabled"])]),_:1},8,["label"])],64)):t(b)==="startEndRequired"?(a(),m(T,{key:2},[i("div",yo,[o(L,{label:r.$t("settings.vendor.test.startFrame")},{default:s(()=>[o(pe,{modelValue:t(V)[0],"onUpdate:modelValue":d[4]||(d[4]=y=>t(V)[0]=y)},null,8,["modelValue"])]),_:1},8,["label"]),o(L,{label:r.$t("settings.vendor.test.endFrame")},{default:s(()=>[o(pe,{modelValue:t(V)[1],"onUpdate:modelValue":d[5]||(d[5]=y=>t(V)[1]=y)},null,8,["modelValue"])]),_:1},8,["label"])]),o(L,{label:r.$t("settings.vendor.test.prompt")},{default:s(()=>[o(le,{modelValue:t($),"onUpdate:modelValue":d[6]||(d[6]=y=>z($)?$.value=y:null),placeholder:r.$t("settings.vendor.test.videoPromptPlaceholder"),autosize:{minRows:2,maxRows:3},disabled:t(f)},null,8,["modelValue","placeholder","disabled"])]),_:1},8,["label"])],64)):t(b)==="endFrameOptional"?(a(),m(T,{key:3},[i("div",ho,[o(L,{label:r.$t("settings.vendor.test.startFrame")},{default:s(()=>[o(pe,{modelValue:t(V)[0],"onUpdate:modelValue":d[7]||(d[7]=y=>t(V)[0]=y)},null,8,["modelValue"])]),_:1},8,["label"]),o(L,{label:r.$t("settings.vendor.test.endFrameOptional")},{default:s(()=>[o(pe,{modelValue:t(V)[1],"onUpdate:modelValue":d[8]||(d[8]=y=>t(V)[1]=y),optional:!0},null,8,["modelValue"])]),_:1},8,["label"])]),o(L,{label:r.$t("settings.vendor.test.prompt")},{default:s(()=>[o(le,{modelValue:t($),"onUpdate:modelValue":d[9]||(d[9]=y=>z($)?$.value=y:null),placeholder:r.$t("settings.vendor.test.videoPromptPlaceholder"),autosize:{minRows:2,maxRows:3},disabled:t(f)},null,8,["modelValue","placeholder","disabled"])]),_:1},8,["label"])],64)):t(b)==="startFrameOptional"?(a(),m(T,{key:4},[i("div",$o,[o(L,{label:r.$t("settings.vendor.test.startFrameOptional")},{default:s(()=>[o(pe,{modelValue:t(V)[0],"onUpdate:modelValue":d[10]||(d[10]=y=>t(V)[0]=y),optional:!0},null,8,["modelValue"])]),_:1},8,["label"]),o(L,{label:r.$t("settings.vendor.test.endFrame")},{default:s(()=>[o(pe,{modelValue:t(V)[1],"onUpdate:modelValue":d[11]||(d[11]=y=>t(V)[1]=y)},null,8,["modelValue"])]),_:1},8,["label"])]),o(L,{label:r.$t("settings.vendor.test.prompt")},{default:s(()=>[o(le,{modelValue:t($),"onUpdate:modelValue":d[12]||(d[12]=y=>z($)?$.value=y:null),placeholder:r.$t("settings.vendor.test.videoPromptPlaceholder"),autosize:{minRows:2,maxRows:3},disabled:t(f)},null,8,["modelValue","placeholder","disabled"])]),_:1},8,["label"])],64)):t(b).startsWith("[")?(a(),m(T,{key:5},[o(L,{label:r.$t("settings.vendor.test.prompt")},{default:s(()=>[o(le,{modelValue:t($),"onUpdate:modelValue":d[13]||(d[13]=y=>z($)?$.value=y:null),placeholder:r.$t("settings.vendor.test.videoPromptPlaceholder"),disabled:t(f)},null,8,["modelValue","placeholder","disabled"])]),_:1},8,["label"]),i("div",_o,[(a(!0),m(T,null,W(t(E),(y,se)=>(a(),B(L,{key:se,label:H(y)},{default:s(()=>[i("div",Vo,[y.type==="imageReference"?(a(!0),m(T,{key:0},W(y.count,J=>(a(),B(pe,{key:J,modelValue:t(V)[se*10+J-1],"onUpdate:modelValue":ue=>t(V)[se*10+J-1]=ue,label:`${r.$t("settings.vendor.test.image")} ${J}`},null,8,["modelValue","onUpdate:modelValue","label"]))),128)):y.type==="videoReference"?(a(!0),m(T,{key:1},W(y.count,J=>(a(),B(ao,{key:J,modelValue:t(v)[se*10+J-1],"onUpdate:modelValue":ue=>t(v)[se*10+J-1]=ue,label:`${r.$t("settings.vendor.test.video")} ${J}`},null,8,["modelValue","onUpdate:modelValue","label"]))),128)):y.type==="audioReference"?(a(!0),m(T,{key:2},W(y.count,J=>(a(),B(mo,{key:J,modelValue:t(p)[se*10+J-1],"onUpdate:modelValue":ue=>t(p)[se*10+J-1]=ue,label:`${r.$t("settings.vendor.test.audio")} ${J}`},null,8,["modelValue","onUpdate:modelValue","label"]))),128)):A("",!0)])]),_:2},1032,["label"]))),128))])],64)):A("",!0)])):A("",!0),t(x)?(a(),m("div",ko,[i("div",Ro,c(r.$t("settings.vendor.test.result")),1),i("video",{src:t(x),controls:"",autoplay:"",loop:"",class:"resultVideo"},null,8,wo)])):t(f)?(a(),m("div",Co,[o(de,{size:"large",text:r.$t("settings.vendor.videoGenerating")},null,8,["text"])])):A("",!0),i("div",Mo,[o(ce,{variant:"outline",onClick:d[14]||(d[14]=y=>O.value=!1)},{default:s(()=>[w(c(r.$t("settings.vendor.test.cancel")),1)]),_:1}),o(ce,{theme:"primary",loading:t(f),onClick:k},{icon:s(()=>[o(D,{theme:"outline"})]),default:s(()=>[w(" "+c(r.$t("settings.vendor.test.startTest")),1)]),_:1},8,["loading"])])])]),_:1},8,["visible","header"])}}}),To=_e(Io,[["__scopeId","data-v-93f22f64"]]),Ao={class:"modelServe"},xo={class:"modelList"},Uo={class:"listFooter"},Bo={class:"listContent"},Po={key:0,class:"modelParameter"},Fo={class:"configuration"},So={class:"infoBox ac jb"},Lo={class:"idBox"},No={class:"author"},Do={class:"requiredLabel"},Oo={class:"requiredText"},qo={class:"inputHelp"},zo={key:1,class:"optionalSection"},Eo={class:"inputHelp"},Ko={class:"jb ac"},Ho={class:"sectionTitle"},jo={class:"topInfo jb ac"},Wo={class:"modelCardNameWrap"},Go={class:"modelCardName"},Jo={class:"actionBtns"},Xo={class:"tags"},Yo={class:"updateAction"},Qo={class:"addBox"},Zo={style:{display:"flex","flex-direction":"column","align-items":"flex-start",gap:"0"}},el={key:0,style:{border:"1px solid #ddd","border-radius":"6px",padding:"6px 12px","margin-top":"6px"}},tl={class:"drmEditor"},nl={class:"drmHeader"},ol={class:"drmHeaderLabel"},ll={class:"drmHeaderLabel"},sl={class:"drmRowIndex"},al={class:"data"},rl={key:0,class:"linkAdd"},il={style:{"margin-top":"10px","text-align":"right",width:"100%"}},dl={key:1,class:"importAdd"},ul={class:"dragIcon"},ml={class:"uploadText"},cl={class:"uploadHint"},gl={key:2,class:"codeAdd"},vl={class:"editorToolbar"},pl={class:"editorInfo"},fl={class:"editorActions"},bl={class:"editorWrapper"},yl=700,hl=$e({__name:"vendorConfig",setup(I){const{mdEditorTheme:G}=Gt(nn()),O={text:"settings.vendor.textModel",image:"settings.vendor.imageModel",video:"settings.vendor.videoModel"},U={singleImage:"settings.vendor.singleImage",multiReference:"settings.vendor.multiReference",startEndRequired:"settings.vendor.startEndRequired",endFrameOptional:"settings.vendor.endFrameOptional",startFrameOptional:"settings.vendor.startFrameOptional",audioReference:"settings.vendor.audioRef",videoReference:"settings.vendor.videoRef",imageReference:"settings.vendor.imageRef"};function P(e){return O[e]||e}function b(e,n){if(e==="text")return $t(n==="image"?"settings.vendor.textToImage":"settings.vendor.textToVideo");const g=String(e).match(/^(videoReference|imageReference|audioReference):(\d+)$/);if(g){const R=U[g[1]];return R?`${$t(R)} ×${g[2]}`:e}return U[e]?$t(U[e]):e}const F={fontSize:14,automaticLayout:!0,tabSize:2,scrollBeyondLastLine:!1,formatOnPaste:!0,formatOnType:!0},E=[{value:"text",label:"settings.vendor.textModel"},{value:"image",label:"settings.vendor.imageModel"},{value:"video",label:"settings.vendor.videoModel"}],$=[{label:"settings.vendor.textToImage",value:"text"},{label:"settings.vendor.singleImage",value:"singleImage"},{label:"settings.vendor.multiReference",value:"multiReference"}],V=[{label:"settings.vendor.singleImage",value:"singleImage"},{label:"settings.vendor.startEndRequired",value:"startEndRequired"},{label:"settings.vendor.endFrameOptional",value:"endFrameOptional"},{label:"settings.vendor.startFrameOptional",value:"startFrameOptional"},{label:"settings.vendor.textToVideo",value:"text"},{label:"settings.vendor.multiReferenceMode",value:"multiReference"}],v=[{label:"settings.vendor.videoRef",value:"videoReference"},{label:"settings.vendor.imageRef",value:"imageReference"},{label:"settings.vendor.audioRef",value:"audioReference"}],p=[{label:"settings.vendor.audioOptional",value:"optional"},{label:"settings.vendor.audioOnly",value:!0},{label:"settings.vendor.noAudio",value:!1}],f=h([]),x=h(!1);async function K(){x.value=!0;try{const e=await ee.post("/setting/vendorConfig/getVendorList");f.value=e.data.map(n=>({...n,enable:n.enable})),f.value.length&&!f.value.some(n=>n.id===H.value)&&(H.value=f.value[0].id)}catch(e){window.$message.error(`${$t("settings.vendor.msg.getVendorListFailed")}${e.message}`)}finally{x.value=!1,ze(()=>{L.value=we.value,le.value=!0})}}Jt(()=>{K()});const H=h(),u=me(()=>f.value.find(e=>e.id===H.value)),q=me(()=>{var e,n;return((e=u.value)==null?void 0:e.models)||((n=u.value)==null?void 0:n.model)||[]}),S=me(()=>{var e,n;return((n=(e=u.value)==null?void 0:e.inputs)==null?void 0:n.filter(g=>g.required))||[]}),k=me(()=>{var e,n;return((n=(e=u.value)==null?void 0:e.inputs)==null?void 0:n.filter(g=>!g.required))||[]}),C=h(!1),r=h(!1),d=h(qe),N=h(null),Y=h(!1),ne=h(!1),le=h(!1),L=h("");let de=null,ce=!1;const D=h(null),fe=h(!1),y=h(!1),se=h(!1);function J(e){return e==="password"?"secured":e==="url"?"link":"edit-1"}function ue(e){var n;return((n=e.placeholder)==null?void 0:n.trim())||""}function ct(e){return e?/^(?:data:[^;]+;base64,)?[A-Za-z0-9+/]*={0,2}$/.test(e)&&e.length>0:!1}function gt(e){if(!e.version)return!0;const n=parseFloat(e.version);return isNaN(n)||n<2}function Je(e){if(!e)return null;const n=en.find(g=>g.pattern.test(e));return n?tn[n.provider]:null}function Xe(e){return{id:e.id,inputValues:e.inputValues}}const we=me(()=>u.value?JSON.stringify(Xe(u.value)):"");function Ye(){de&&clearTimeout(de),de=setTimeout(()=>{vt()},yl)}async function vt(){if(!u.value||!le.value||x.value)return;const e=we.value;if(!(!e||e===L.value)){if(ne.value){ce=!0;return}ne.value=!0;try{await ee.post("/setting/vendorConfig/updateVendorInputs",Xe(u.value)),L.value=e}catch(n){window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${n.message}`)}finally{ne.value=!1,ce&&(ce=!1,Ye())}}}ge(we,e=>{!e||!le.value||x.value||e!==L.value&&Ye()},{flush:"post"}),ge(H,()=>{de&&(clearTimeout(de),de=null),ce=!1,ze(()=>{L.value=we.value})},{flush:"post"});const Ce=h();function pt(){ve.value="importAdd",Ce.value=void 0,d.value=qe,C.value=!0,r.value=!1}function ft(){if(Ce.value){const e=ae.confirm({theme:"danger",header:$t("settings.vendor.msg.highRiskConfirm"),body:$t("settings.vendor.msg.updateVendorRiskBody"),confirmBtn:{content:$t("settings.vendor.msg.iKnowRisk"),theme:"danger"},cancelBtn:$t("settings.vendor.msg.cancel"),onConfirm:()=>{e.destroy();const n=ae.confirm({theme:"danger",header:$t("settings.vendor.msg.confirmAgain"),body:$t("settings.vendor.msg.updateVendorConfirmBody"),confirmBtn:{content:$t("settings.vendor.msg.confirmAndUpdate"),theme:"danger"},cancelBtn:$t("settings.vendor.msg.goBackCheck"),onConfirm:async()=>{ee.post("/setting/vendorConfig/updateCode",{id:Ce.value,tsCode:d.value}).then(g=>{window.$message.success($t("settings.vendor.msg.updateSuccess")),C.value=!1,r.value=!1,K()}).catch(g=>{window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${g.message}`)}).finally(()=>{n.destroy()})},onClose:()=>n.hide()})},onClose:()=>e.hide()})}else{const e=ae.confirm({theme:"danger",header:$t("settings.vendor.msg.highRiskConfirm"),body:$t("settings.vendor.msg.addVendorRiskBody"),confirmBtn:{content:$t("settings.vendor.msg.iKnowRisk"),theme:"danger"},cancelBtn:$t("settings.vendor.msg.cancel"),onConfirm:()=>{e.destroy();const n=ae.confirm({theme:"danger",header:$t("settings.vendor.msg.confirmAgain"),body:$t("settings.vendor.msg.addVendorConfirmBody"),confirmBtn:{content:$t("settings.vendor.msg.confirmAndAdd"),theme:"danger"},cancelBtn:$t("settings.vendor.msg.goBackCheck"),onConfirm:async()=>{ee.post("/setting/vendorConfig/addVendor",{tsCode:d.value}).then(g=>{window.$message.success($t("settings.vendor.msg.vendorAdded")),C.value=!1,r.value=!1,K()}).catch(g=>{window.$message.error(g.message??`${$t("settings.vendor.msg.addFailed")}`)}).finally(()=>{n.destroy()})},onClose:()=>n.hide()})},onClose:()=>e.hide()})}}const be=h(!1),ye=h(null),Qe=h(null),_=h({name:"",modelName:"",type:"text",think:!1,mode:[],mixedMode:[],mixedModeCount:{},audio:"optional",durationResolutionMap:[{duration:[],resolution:[]}]});function bt(e="text"){_.value={name:"",modelName:"",type:e,think:!1,mode:[],mixedMode:[],mixedModeCount:{},audio:"optional",durationResolutionMap:[{duration:[],resolution:[]}]}}function Ze(){return u.value?(Array.isArray(u.value.models)||(u.value.models=Array.isArray(u.value.model)?[...u.value.model]:[]),u.value.model=u.value.models,u.value.models):[]}function yt(){const e=_.value.name.trim(),n=_.value.modelName.trim();if(!e)return window.$message.error($t("settings.vendor.msg.fillDisplayName")),null;if(!n)return window.$message.error($t("settings.vendor.msg.fillModelId")),null;if(_.value.type==="text")return{name:e,modelName:n,type:"text",think:_.value.think};if(_.value.type==="image"){const M=_.value.mode;return M.length?{name:e,modelName:n,type:"image",mode:M}:(window.$message.error($t("settings.vendor.msg.selectImageMode")),null)}const g=[..._.value.mode].filter(M=>M!=="multiReference");if(_.value.mixedMode.length>0){const M=_.value.mixedMode.map(j=>{const X=_.value.mixedModeCount[j]??1;return`${j}:${X}`});g.push(M)}if(!g.length)return window.$message.error($t("settings.vendor.msg.selectVideoMode")),null;const R=[];for(let M=0;M<_.value.durationResolutionMap.length;M++){const j=_.value.durationResolutionMap[M],X=j.duration.map(Number).filter(Ve=>Number.isFinite(Ve)&&Ve>0),re=j.resolution.filter(Boolean);if(!X.length)return window.$message.error(`${$t("settings.vendor.msg.groupPrefix",{n:M+1})}${$t("settings.vendor.msg.addDuration")}`),null;if(!re.length)return window.$message.error(`${$t("settings.vendor.msg.groupPrefix",{n:M+1})}${$t("settings.vendor.msg.addResolution")}`),null;R.push({duration:X,resolution:re})}return{name:e,modelName:n,type:"video",mode:g,audio:_.value.audio,durationResolutionMap:R}}function ht(){if(!u.value){window.$message.error($t("settings.vendor.msg.selectVendorFirst"));return}ye.value=null,bt("text"),be.value=!0}async function _t(){const e=Ze();if(!e.length&&!u.value)return;const n=yt();if(!n)return;if(e.findIndex((R,M)=>ye.value!==null&&M===ye.value?!1:R.modelName===n.modelName)!==-1){window.$message.error($t("settings.vendor.msg.modelIdExists"));return}if(ye.value===null){try{await ee.post("/setting/vendorConfig/addVendorModel",{id:u.value.id,model:n}),window.$message.success($t("settings.vendor.msg.modelAdded")),be.value=!1,K()}catch(R){window.$message.error(R.message??$t("settings.vendor.msg.operationFailed"))}return}if(ye.value!==null)try{await ee.post("/setting/vendorConfig/upVendorModel",{id:u.value.id,modelName:Qe.value,model:n}),window.$message.success($t("settings.vendor.msg.modelUpdated")),be.value=!1,K()}catch(R){window.$message.error(R.message??$t("settings.vendor.msg.operationFailed"))}}function Vt(e){var g;const n=Ze();if(ye.value=n.findIndex(R=>R.modelName===e.modelName),Qe.value=e.modelName,e.type==="text"&&(_.value={name:e.name,modelName:e.modelName,type:"text",think:e.think,mode:[],mixedMode:[],mixedModeCount:{},audio:"optional",durationResolutionMap:[{duration:[],resolution:[]}]}),e.type==="image"&&(_.value={name:e.name,modelName:e.modelName,type:"image",think:!1,mode:[...e.mode],mixedMode:[],mixedModeCount:{},audio:"optional",durationResolutionMap:[{duration:[],resolution:[]}]}),e.type==="video"){const R=((g=e.durationResolutionMap)==null?void 0:g.length)>0?e.durationResolutionMap.map(re=>({duration:re.duration.map(String),resolution:[...re.resolution]})):[{duration:[],resolution:[]}],M=[];let j=[];const X={};for(const re of e.mode)if(Array.isArray(re))for(const Ve of re){const he=String(Ve).match(/^(videoReference|imageReference|audioReference):(\d+)$/);he&&(j.push(he[1]),X[he[1]]=Number(he[2]))}else M.push(re);_.value={name:e.name,modelName:e.modelName,type:"video",think:!1,mode:j.length>0?[...M,"multiReference"]:M,mixedMode:j,mixedModeCount:X,audio:e.audio,durationResolutionMap:R}}be.value=!0}function kt(e){D.value=e,e.type==="text"?fe.value=!0:e.type==="image"?y.value=!0:e.type==="video"&&(se.value=!0)}function Rt(e){if(!u.value)return;const n=ae.confirm({theme:"danger",header:$t("settings.vendor.msg.deleteModelConfirm"),body:`${$t("settings.vendor.msg.deleteModelBody",{name:e})}`,confirmBtn:{content:$t("settings.vendor.msg.confirmDelete"),theme:"danger"},cancelBtn:$t("settings.vendor.msg.cancel"),onConfirm:async()=>{try{await ee.post("/setting/vendorConfig/delVendorModel",{id:u.value.id,modelName:e}),window.$message.success($t("settings.vendor.msg.modelDeleted")),K()}catch(g){window.$message.error(g.message??$t("settings.vendor.msg.operationFailed"))}finally{n.destroy()}}})}function wt(){u.value&&(Ce.value=u.value.id,d.value=u.value.code,r.value=!0)}function Ct(){if(!u.value)return;const e=ae.confirm({theme:"danger",header:$t("settings.vendor.msg.deleteVendorConfirm"),body:`${$t("settings.vendor.msg.deleteVendorBody",{name:u.value.name})}`,confirmBtn:{content:$t("settings.vendor.msg.confirmDelete"),theme:"danger"},cancelBtn:$t("settings.vendor.msg.cancel"),onConfirm:()=>{var n;ee.post("/setting/vendorConfig/deleteVendor",{id:(n=u.value)==null?void 0:n.id}).then(()=>{var g;window.$message.success($t("settings.vendor.msg.vendorDeleted")),H.value===((g=u.value)==null?void 0:g.id)&&(H.value=void 0),K(),e.destroy()}).catch(g=>{window.$message.error(`${$t("settings.vendor.msg.deleteFailed")}${g.message}`)})}})}function et(){var e,n;ee.post("/setting/vendorConfig/updateVendorInputs",{id:(e=u.value)==null?void 0:e.id,inputValues:(n=u.value)==null?void 0:n.inputValues}).then(()=>{window.$message.success($t("settings.vendor.msg.vendorConfigUpdated")),K()}).catch(g=>{window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${g.message}`)})}function Mt(e,n){const g=n===1?0:1;ee.post("/setting/vendorConfig/enableVendor",{id:e.id,enable:n}).then(()=>{}).catch(R=>{e.enable=g})}const ve=h("importAdd"),ke=h(""),Me=h(!1);ge(ve,e=>{e=="codeAdd"?r.value=!0:r.value=!1});function It(){if(Me.value)return;const e=ae.confirm({theme:"danger",header:$t("settings.vendor.msg.highRiskConfirm"),body:$t("settings.vendor.msg.linkAddVendorRiskBody"),confirmBtn:{content:$t("settings.vendor.msg.iKnowRisk"),theme:"danger"},cancelBtn:$t("settings.vendor.msg.cancel"),onConfirm:()=>{e.destroy();const n=ae.confirm({theme:"danger",header:$t("settings.vendor.msg.confirmAgain"),body:$t("settings.vendor.msg.addVendorConfirmBody"),confirmBtn:{content:$t("settings.vendor.msg.confirmAndAdd"),theme:"danger"},cancelBtn:$t("settings.vendor.msg.goBackCheck"),onConfirm:async()=>{const g=Oe({fullscreen:!0,attach:"body",preventScrollThrough:!1}),R=setTimeout(()=>{g.hide(),clearTimeout(R)},1e3);Me.value=!0;try{const{data:M}=await ee.post("/setting/vendorConfig/getCodeByLink",{link:ke.value});if(!M.includes("vendor")){let j=null;M.includes("<html>")?j=ae.alert({theme:"danger",header:"链接返回了一个网页，添加供应商需要返回TS代码，请确认链接是否正确",body:"请勿输入中转站地址，如需使用中转站请修改OpenAI标准接口的baseUrl使用中转站地址",onConfirm:({e:X})=>{j.hide()}}):ae.alert({theme:"danger",header:"链接返回的内容不正确，添加供应商需要返回TS代码，请确认链接是否正确",onConfirm:({e:X})=>{j.hide()}});return}M?(ee.post("/setting/vendorConfig/addVendor",{tsCode:M}),window.$message.success($t("settings.vendor.msg.vendorAdded")),C.value=!1,r.value=!1,K()):(window.$message.error($t("settings.vendor.msg.linkAddFailed")),r.value=!1)}catch(M){window.$message.error(`${$t("settings.vendor.msg.addFailed")}${M.message}`)}finally{clearTimeout(R),g.hide(),Me.value=!1,n.destroy()}},onClose:()=>n.hide()})},onClose:()=>e.hide()})}const tt=h();async function nt(e){const n=e.raw;if(!n)return window.$message.error($t("workbench.novel.import.msg.selectFile")),!1;Oe(!0);try{const g=ae.confirm({theme:"danger",header:$t("settings.vendor.msg.highRiskConfirm"),body:$t("settings.vendor.msg.importAdd"),confirmBtn:{content:$t("settings.vendor.msg.iKnowRisk"),theme:"danger"},cancelBtn:$t("settings.vendor.msg.cancel"),onConfirm:()=>{g.destroy();const R=ae.confirm({theme:"danger",header:$t("settings.vendor.msg.confirmAgain"),body:$t("settings.vendor.msg.addVendorConfirmBody"),confirmBtn:{content:$t("settings.vendor.msg.confirmAndAdd"),theme:"danger"},cancelBtn:$t("settings.vendor.msg.goBackCheck"),onConfirm:async()=>{const M=new FileReader;M.readAsText(n),M.onload=()=>{const j=M.result;ee.post("/setting/vendorConfig/addVendor",{tsCode:j}).then(X=>{window.$message.success($t("settings.vendor.msg.vendorAdded")),C.value=!1,r.value=!1,K()}).catch(X=>{window.$message.error(X.message??`${$t("settings.vendor.msg.addFailed")}`)}).finally(()=>{R.destroy()})}},onClose:()=>R.hide()})},onClose:()=>g.hide()})}catch{window.$message.error($t("workbench.novel.import.msg.parseFailed"))}finally{Oe(!1)}return!1}const Ue=h([]);function Tt(){var e;(e=tt.value)==null||e.triggerUpload()}function At(){return Promise.resolve({response:{},status:"success"})}async function xt(e){var g;const n=(g=e.dataTransfer)==null?void 0:g.files;n&&n.length>0&&await nt({raw:n[0]})}function Ut(e){var M;const n=e.target,g=(M=n.files)==null?void 0:M[0];if(!g)return;const R=new FileReader;R.onload=j=>{var X;d.value=((X=j.target)==null?void 0:X.result)||""},R.readAsText(g),n.value=""}return(e,n)=>{var rt,it,dt;const g=mt,R=xe,M=sn,j=ln,X=on,re=an,Ve=rn,he=dn,ie=Ge,Re=un,Bt=cn,Pt=mn,ot=te("i-plus"),Ft=te("i-lightning"),St=te("i-pencil"),lt=te("i-delete"),Ie=vn,Lt=gn,st=pn,Nt=bn,Dt=fn,Be=yn,Pe=je,Fe=$n,Se=hn,Ot=_n,at=Vn,Le=Ae,Ne=We,qt=kn,zt=te("i-upload-one"),Et=Xt("loading");return a(),m("div",Ao,[i("div",xo,[i("div",Uo,[o(R,{block:"",theme:"primary",onClick:pt},{icon:s(()=>[o(g,{name:"add"})]),default:s(()=>[w(" "+c(e.$t("settings.vendor.addVendor")),1)]),_:1})]),Yt((a(),m("div",Bo,[t(f).length>0?(a(),B(re,{key:0,modelValue:t(H),"onUpdate:modelValue":n[1]||(n[1]=l=>z(H)?H.value=l:null),theme:"light"},{default:s(()=>[(a(!0),m(T,null,W(t(f),(l,Q)=>(a(),B(X,{key:Q,value:l.id,onClick:Z=>H.value=l.id,style:{position:"relative"}},De({default:s(()=>[i("span",null,c(l.name),1),o(j,{modelValue:l.enable,"onUpdate:modelValue":Z=>l.enable=Z,customValue:[1,0],onClick:n[0]||(n[0]=oe(()=>{},["stop"])),onChange:Z=>Mt(l,Z),style:{position:"absolute",right:"10px",top:"50%",transform:"translateY(-50%)","z-index":"10"}},null,8,["modelValue","onUpdate:modelValue","onChange"])]),_:2},[ct(l.icon)?{name:"icon",fn:s(()=>[o(M,{size:"24px",shape:"round",image:l.icon},null,8,["image"])]),key:"0"}:void 0]),1032,["value","onClick"]))),128))]),_:1},8,["modelValue"])):(a(),B(Ve,{key:1,title:e.$t("settings.vendor.noVendor"),style:{"margin-top":"16px"}},null,8,["title"]))])),[[Et,t(x)]])]),t(u)?(a(),m("div",Po,[i("div",Fo,[o(st,{data:t(u),labelAlign:"top"},{default:s(()=>[i("div",So,[i("span",Lo,"#"+c(t(u).id),1),i("span",No,"@"+c(t(u).author),1)]),gt(t(u))?(a(),B(he,{key:0,theme:"warning",message:e.$t("settings.vendor.msg.vendorNeedsUpdate"),style:{"margin-bottom":"12px"}},null,8,["message"])):A("",!0),o(ie,null,{default:s(()=>[o(t(Qt),{modelValue:t(u).description,"onUpdate:modelValue":n[2]||(n[2]=l=>t(u).description=l),theme:t(G)},null,8,["modelValue","theme"])]),_:1}),(a(!0),m(T,null,W(t(S),l=>(a(),B(ie,{key:l.key,name:l.key},De({label:s(()=>[i("span",Do,[w(c(l.label)+" ",1),n[25]||(n[25]=i("span",{class:"requiredMark"},"*",-1)),i("span",Oo,c(e.$t("settings.vendor.required")),1)])]),default:s(()=>[o(Re,{modelValue:t(u).inputValues[l.key],"onUpdate:modelValue":Q=>t(u).inputValues[l.key]=Q,type:l.type,clearable:"",onBlur:et},{"prefix-icon":s(()=>[o(g,{name:J(l.type)},null,8,["name"])]),_:2},1032,["modelValue","onUpdate:modelValue","type"])]),_:2},[ue(l)?{name:"help",fn:s(()=>[i("span",qo,c(ue(l)),1)]),key:"0"}:void 0]),1032,["name"]))),128)),t(k).length>0?(a(),m("div",zo,[o(Pt,null,{default:s(()=>[o(Bt,{value:"optional-inputs",header:e.$t("settings.vendor.optionalSection")},{default:s(()=>[(a(!0),m(T,null,W(t(k),l=>(a(),B(ie,{key:l.key,name:l.key,label:l.label},De({default:s(()=>[o(Re,{modelValue:t(u).inputValues[l.key],"onUpdate:modelValue":Q=>t(u).inputValues[l.key]=Q,type:l.type,clearable:"",onBlur:et},{"prefix-icon":s(()=>[o(g,{name:J(l.type)},null,8,["name"])]),_:2},1032,["modelValue","onUpdate:modelValue","type"])]),_:2},[ue(l)?{name:"help",fn:s(()=>[i("span",Eo,c(ue(l)),1)]),key:"0"}:void 0]),1032,["name","label"]))),128))]),_:1},8,["header"])]),_:1})])):A("",!0),i("div",Ko,[i("h4",Ho,c(e.$t("settings.vendor.modelSettings")),1),o(R,{variant:"outline",size:"small",onClick:ht},{icon:s(()=>[o(ot,{theme:"outline"})]),default:s(()=>[w(" "+c(e.$t("settings.vendor.addManually")),1)]),_:1})]),(a(!0),m(T,null,W(t(q),(l,Q)=>(a(),B(Lt,{key:Q,class:"modelCard"},{default:s(()=>[i("div",jo,[i("div",Wo,[Je(l.modelName)?(a(),B(M,{key:0,size:"24px",shape:"round",image:Je(l.modelName)},null,8,["image"])):A("",!0),i("span",Go,c(l.name),1)]),i("div",Jo,[o(R,{size:"small",variant:"text",onClick:Z=>kt(l)},{icon:s(()=>[o(Ft,{theme:"outline"})]),default:s(()=>[w(" "+c(e.$t("settings.vendor.testModel")),1)]),_:1},8,["onClick"]),o(R,{variant:"text",size:"small",onClick:Z=>Vt(l)},{icon:s(()=>[o(St,{theme:"outline"})]),default:s(()=>[w(" "+c(e.$t("settings.vendor.edit")),1)]),_:1},8,["onClick"]),o(R,{variant:"text",size:"small",theme:"danger",onClick:Z=>Rt(l.modelName)},{icon:s(()=>[o(lt,{theme:"outline"})]),default:s(()=>[w(" "+c(e.$t("settings.vendor.delete")),1)]),_:1},8,["onClick"])])]),i("div",Xo,[o(Ie,{theme:"primary"},{default:s(()=>[w(c(e.$t(P(l.type))),1)]),_:2},1024),l.type==="text"&&l.think?(a(),B(Ie,{key:0,variant:"light"},{default:s(()=>[w(c(e.$t("settings.vendor.think")),1)]),_:1})):A("",!0),(a(!0),m(T,null,W(l.mode,(Z,Kt)=>(a(),m(T,{key:Kt},[Array.isArray(Z)?(a(!0),m(T,{key:1},W(Z,(Ht,jt)=>(a(),B(Ie,{variant:"light",key:jt},{default:s(()=>[w(c(b(Ht,l.type)),1)]),_:2},1024))),128)):(a(),B(Ie,{key:0,variant:"light"},{default:s(()=>[w(c(b(Z,l.type)),1)]),_:2},1024))],64))),128))])]),_:2},1024))),128))]),_:1},8,["data"]),i("div",Yo,[o(R,{theme:"danger",loading:t(Y),onClick:Ct},{default:s(()=>[w(c(e.$t("settings.vendor.deleteVendor")),1)]),_:1},8,["loading"]),o(R,{theme:"default",loading:t(Y),onClick:wt},{default:s(()=>[w(c(e.$t("settings.vendor.editCode")),1)]),_:1},8,["loading"])])])])):A("",!0),o(Le,{placement:"center",width:"40vw",visible:t(be),"onUpdate:visible":n[12]||(n[12]=l=>z(be)?be.value=l:null),header:t(ye)===null?e.$t("settings.vendor.addModel"):e.$t("settings.vendor.editModel"),maskClosable:!1,onConfirm:_t},{default:s(()=>[i("div",Qo,[o(st,{data:t(_),labelAlign:"top"},{default:s(()=>[o(ie,{name:"name",label:e.$t("settings.vendor.displayName")},{default:s(()=>[o(Re,{modelValue:t(_).name,"onUpdate:modelValue":n[3]||(n[3]=l=>t(_).name=l),placeholder:e.$t("settings.vendor.displayNamePlaceholder"),clearable:""},null,8,["modelValue","placeholder"])]),_:1},8,["label"]),o(ie,{name:"modelName",label:e.$t("settings.vendor.modelId")},{default:s(()=>[o(Re,{modelValue:t(_).modelName,"onUpdate:modelValue":n[4]||(n[4]=l=>t(_).modelName=l),placeholder:e.$t("settings.vendor.modelIdPlaceholder"),clearable:""},null,8,["modelValue","placeholder"])]),_:1},8,["label"]),o(ie,{name:"type",label:e.$t("settings.vendor.modelType")},{default:s(()=>[o(Dt,{modelValue:t(_).type,"onUpdate:modelValue":n[5]||(n[5]=l=>t(_).type=l)},{default:s(()=>[(a(),m(T,null,W(E,l=>o(Nt,{key:l.value,value:l.value},{default:s(()=>[w(c(e.$t(l.label)),1)]),_:2},1032,["value"])),64))]),_:1},8,["modelValue"])]),_:1},8,["label"]),t(_).type==="text"?(a(),B(ie,{key:0,name:"think",label:e.$t("settings.vendor.think")},{default:s(()=>[o(Pe,{modelValue:t(_).think,"onUpdate:modelValue":n[6]||(n[6]=l=>t(_).think=l)},{default:s(()=>[o(Be,{value:!0},{default:s(()=>[w(c(e.$t("settings.vendor.supported")),1)]),_:1}),o(Be,{value:!1},{default:s(()=>[w(c(e.$t("settings.vendor.notSupported")),1)]),_:1})]),_:1},8,["modelValue"])]),_:1},8,["label"])):A("",!0),t(_).type==="image"?(a(),B(ie,{key:1,name:"mode",label:e.$t("settings.vendor.imageMode")},{default:s(()=>[o(Se,{modelValue:t(_).mode,"onUpdate:modelValue":n[7]||(n[7]=l=>t(_).mode=l)},{default:s(()=>[(a(),m(T,null,W($,l=>o(Fe,{key:l.value,value:l.value},{default:s(()=>[w(c(e.$t(l.label)),1)]),_:2},1032,["value"])),64))]),_:1},8,["modelValue"])]),_:1},8,["label"])):A("",!0),t(_).type==="video"?(a(),m(T,{key:2},[o(ie,{name:"mode",label:e.$t("settings.vendor.videoMode")},{default:s(()=>[i("div",Zo,[o(Se,{modelValue:t(_).mode,"onUpdate:modelValue":n[8]||(n[8]=l=>t(_).mode=l)},{default:s(()=>[(a(),m(T,null,W(V,l=>o(Fe,{key:l.value,value:l.value},{default:s(()=>[w(c(e.$t(l.label)),1)]),_:2},1032,["value"])),64))]),_:1},8,["modelValue"]),t(_).mode.includes("multiReference")?(a(),m("div",el,[o(Se,{modelValue:t(_).mixedMode,"onUpdate:modelValue":n[9]||(n[9]=l=>t(_).mixedMode=l),style:{display:"flex","flex-direction":"row",gap:"8px","flex-wrap":"wrap","align-items":"center"}},{default:s(()=>[(a(),m(T,null,W(v,l=>(a(),m(T,{key:l.value},[o(Fe,{value:l.value},{default:s(()=>[w(c(e.$t(l.label)),1)]),_:2},1032,["value"]),t(_).mixedMode.includes(l.value)?(a(),B(Ot,{key:0,modelValue:t(_).mixedModeCount[l.value],"onUpdate:modelValue":Q=>t(_).mixedModeCount[l.value]=Q,min:1,max:99,size:"small",style:{width:"80px"},placeholder:e.$t("settings.vendor.count")},null,8,["modelValue","onUpdate:modelValue","placeholder"])):A("",!0)],64))),64))]),_:1},8,["modelValue"])])):A("",!0)])]),_:1},8,["label"]),o(ie,{name:"audio",label:e.$t("settings.vendor.audioOutput")},{default:s(()=>[o(Pe,{modelValue:t(_).audio,"onUpdate:modelValue":n[10]||(n[10]=l=>t(_).audio=l)},{default:s(()=>[(a(),m(T,null,W(p,l=>o(Be,{key:String(l.value),value:l.value},{default:s(()=>[w(c(e.$t(l.label)),1)]),_:2},1032,["value"])),64))]),_:1},8,["modelValue"])]),_:1},8,["label"]),o(ie,{name:"durationResolutionMap",label:e.$t("settings.vendor.durationResolution")},{default:s(()=>[i("div",tl,[i("div",nl,[n[26]||(n[26]=i("div",{class:"drmHeaderIndex"},null,-1)),i("div",ol,c(e.$t("settings.vendor.durationSec")),1),n[27]||(n[27]=i("div",{class:"drmHeaderArrow"},null,-1)),i("div",ll,c(e.$t("settings.vendor.resolution")),1),n[28]||(n[28]=i("div",{class:"drmHeaderAction"},null,-1))]),(a(!0),m(T,null,W(t(_).durationResolutionMap,(l,Q)=>(a(),m("div",{key:Q,class:"drmRow"},[i("div",sl,c(Q+1),1),o(at,{modelValue:l.duration,"onUpdate:modelValue":Z=>l.duration=Z,placeholder:e.$t("settings.vendor.enterAndPress"),class:"drmInput"},null,8,["modelValue","onUpdate:modelValue","placeholder"]),n[29]||(n[29]=i("div",{class:"drmArrow"},"→",-1)),o(at,{modelValue:l.resolution,"onUpdate:modelValue":Z=>l.resolution=Z,placeholder:e.$t("settings.vendor.enterAndPress"),class:"drmInput"},null,8,["modelValue","onUpdate:modelValue","placeholder"]),o(R,{variant:"text",theme:"danger",size:"small",disabled:t(_).durationResolutionMap.length===1,onClick:Z=>t(_).durationResolutionMap.splice(Q,1)},{icon:s(()=>[o(lt,{theme:"outline"})]),_:1},8,["disabled","onClick"])]))),128)),o(R,{style:{"margin-top":"16px"},variant:"dashed",block:"",onClick:n[11]||(n[11]=l=>t(_).durationResolutionMap.push({duration:[],resolution:[]}))},{icon:s(()=>[o(ot,{theme:"outline"})]),default:s(()=>[w(" "+c(e.$t("settings.vendor.addDurationResolution")),1)]),_:1})])]),_:1},8,["label"])],64)):A("",!0)]),_:1},8,["data"])])]),_:1},8,["visible","header"]),((rt=t(D))==null?void 0:rt.type)==="text"&&t(fe)?(a(),B(Ln,{key:1,modelVisible:t(fe),"onUpdate:modelVisible":n[13]||(n[13]=l=>z(fe)?fe.value=l:null),vendorId:t(u).id,modelName:t(D).modelName},null,8,["modelVisible","vendorId","modelName"])):A("",!0),((it=t(D))==null?void 0:it.type)==="image"&&t(y)?(a(),B(Qn,{key:2,modelVisible:t(y),"onUpdate:modelVisible":n[14]||(n[14]=l=>z(y)?y.value=l:null),vendorId:t(u).id,modelName:t(D).modelName,supportedModes:t(D).mode||[]},null,8,["modelVisible","vendorId","modelName","supportedModes"])):A("",!0),((dt=t(D))==null?void 0:dt.type)==="video"&&t(se)?(a(),B(To,{key:3,modelVisible:t(se),"onUpdate:modelVisible":n[15]||(n[15]=l=>z(se)?se.value=l:null),vendorId:t(u).id,modelName:t(D).modelName,rawModes:t(D).mode||[]},null,8,["modelVisible","vendorId","modelName","rawModes"])):A("",!0),o(Le,{width:"30vw",placement:"center",top:"10vh",footer:!1,visible:t(C),"onUpdate:visible":n[20]||(n[20]=l=>z(C)?C.value=l:null),header:e.$t("settings.vendor.addVendorDialog"),maskClosable:!1},{default:s(()=>[i("div",al,[o(Pe,{variant:"default-filled",modelValue:t(ve),"onUpdate:modelValue":n[16]||(n[16]=l=>z(ve)?ve.value=l:null)},{default:s(()=>[o(Ne,{value:"importAdd"},{default:s(()=>[...n[30]||(n[30]=[w("通过文件导入",-1)])]),_:1}),o(Ne,{value:"linkAdd"},{default:s(()=>[...n[31]||(n[31]=[w("通过链接添加",-1)])]),_:1}),o(Ne,{value:"codeAdd"},{default:s(()=>[...n[32]||(n[32]=[w("通过代码添加",-1)])]),_:1})]),_:1},8,["modelValue"]),t(ve)=="linkAdd"?(a(),m("div",rl,[o(he,{theme:"warning",style:{"margin-bottom":"20px"}},{default:s(()=>[...n[33]||(n[33]=[w(" 请填写 TypeScript 代码文件的链接（.ts 文件），不要填 API 地址或其他无关链接。 确认后 Toonflow 会自动加载该代码，请确保链接来源可信。 ",-1)])]),_:1}),o(Re,{modelValue:t(ke),"onUpdate:modelValue":n[17]||(n[17]=l=>z(ke)?ke.value=l:null),placeholder:e.$t("settings.vendor.linkAddPlaceholder")},null,8,["modelValue","placeholder"]),i("div",il,[o(R,{loading:t(Me),disabled:!t(ke).trim(),onClick:It},{default:s(()=>[w(c(e.$t("settings.vendor.linkAdd")),1)]),_:1},8,["loading","disabled"])])])):A("",!0),t(ve)=="importAdd"?(a(),m("div",dl,[i("div",{class:"uploadArea",onClick:Tt,onDragover:n[19]||(n[19]=oe(()=>{},["prevent"])),onDrop:oe(xt,["prevent"])},[o(qt,{ref_key:"uploadRef",ref:tt,modelValue:t(Ue),"onUpdate:modelValue":n[18]||(n[18]=l=>z(Ue)?Ue.value=l:null),theme:"file",multiple:!1,max:1,accept:".ts","before-upload":nt,"request-method":At,style:{display:"none"}},null,8,["modelValue"]),i("div",ul,[o(zt,{theme:"outline",size:"32",fill:"var(--td-brand-color)"})]),i("p",ml,c(e.$t("workbench.novel.import.importAdd")),1),i("p",cl,c(e.$t("workbench.novel.import.limit")),1)],32)])):A("",!0),t(ve)=="codeAdd"?(a(),m("div",gl)):A("",!0)])]),_:1},8,["visible","header"]),o(Le,{width:"70vw",placement:"center",top:"10vh",visible:t(r),"onUpdate:visible":n[24]||(n[24]=l=>z(r)?r.value=l:null),header:e.$t("settings.vendor.code"),maskClosable:!1,onConfirm:ft},{default:s(()=>[i("div",vl,[i("div",pl,[o(g,{name:"info-circle",size:"16px"}),i("span",null,c(e.$t("settings.vendor.codeEditorInfo")),1)]),i("div",fl,[o(R,{variant:"text",size:"small",onClick:n[21]||(n[21]=l=>d.value=t(qe))},{icon:s(()=>[o(g,{name:"rollback"})]),default:s(()=>[w(" "+c(e.$t("settings.vendor.reset")),1)]),_:1}),o(R,{variant:"outline",size:"small",onClick:n[22]||(n[22]=l=>{var Q;return(Q=t(N))==null?void 0:Q.click()})},{icon:s(()=>[o(g,{name:"upload"})]),default:s(()=>[w(" "+c(e.$t("settings.vendor.importFile")),1)]),_:1}),i("input",{ref_key:"fileInputRef",ref:N,type:"file",accept:".ts,.js,.txt,.json",style:{display:"none"},onChange:Ut},null,544)])]),i("div",bl,[o(t(Zt),{value:t(d),"onUpdate:value":n[23]||(n[23]=l=>z(d)?d.value=l:null),language:"typescript",theme:"vs-dark",height:600,options:F},null,8,["value"])])]),_:1},8,["visible","header"])])}}}),Tl=_e(hl,[["__scopeId","data-v-4bc42e6f"]]);export{Tl as default};

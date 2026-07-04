/**

 * HuggingFace Inference Providers 供应商适配

 * @version 1.4

 */



// ============================================================

// 类型定义

// ============================================================



type VideoMode =

  | "singleImage"

  | "startEndRequired"

  | "endFrameOptional"

  | "startFrameOptional"

  | "text"

  | (`videoReference:${number}` | `imageReference:${number}` | `audioReference:${number}`)[];



type InferenceTask = "text-to-image" | "image-to-image" | "text-to-video";



interface ProviderRoute {

  providerId: string;

  task: InferenceTask;

}



interface TextModel {

  name: string;

  modelName: string;

  type: "text";

  think: boolean;

}



interface ImageModel {

  name: string;

  modelName: string;

  type: "image";

  mode: ("text" | "singleImage" | "multiReference")[];

  associationSkills?: string;

}



interface VideoModel {

  name: string;

  modelName: string;

  type: "video";

  mode: VideoMode[];

  associationSkills?: string;

  audio: "optional" | false | true;

  durationResolutionMap: { duration: number[]; resolution: string[] }[];

}



interface TTSModel {

  name: string;

  modelName: string;

  type: "tts";

  voices: { title: string; voice: string }[];

}



interface VendorConfig {

  id: string;

  version: string;

  name: string;

  author: string;

  description?: string;

  icon?: string;

  inputs: { key: string; label: string; type: "text" | "password" | "url"; required: boolean; placeholder?: string }[];

  inputValues: Record<string, string>;

  models: (TextModel | ImageModel | VideoModel | TTSModel)[];

}



type ReferenceList =

  | { type: "image"; sourceType: "base64"; base64: string }

  | { type: "audio"; sourceType: "base64"; base64: string }

  | { type: "video"; sourceType: "base64"; base64: string };



interface ImageConfig {

  prompt: string;

  referenceList?: Extract<ReferenceList, { type: "image" }>[];

  size: "1K" | "2K" | "4K";

  aspectRatio: `${number}:${number}`;

}



interface VideoConfig {

  duration: number;

  resolution: string;

  aspectRatio: "16:9" | "9:16";

  prompt: string;

  referenceList?: ReferenceList[];

  audio?: boolean;

  mode: VideoMode[];

}



interface TTSConfig {

  text: string;

  voice: string;

  speechRate: number;

  pitchRate: number;

  volume: number;

  referenceList?: Extract<ReferenceList, { type: "audio" }>[];

}



// ============================================================

// 全局声明

// ============================================================



declare const axios: any;

declare const logger: (msg: string) => void;

declare const Buffer: any;

declare const zipImage: (base64: string, size: number) => Promise<string>;

declare const urlToBase64: (url: string) => Promise<string>;

declare const pollTask: (

  fn: () => Promise<{ completed: boolean; data?: string; error?: string }>,

  interval?: number,

  timeout?: number,

) => Promise<{ completed: boolean; data?: string; error?: string }>;

declare const createOpenAI: any;

declare const exports: {

  vendor: VendorConfig;

  textRequest: (model: TextModel, think: boolean, thinkLevel: 0 | 1 | 2 | 3) => any;

  imageRequest: (config: ImageConfig, model: ImageModel) => Promise<string>;

  videoRequest: (config: VideoConfig, model: VideoModel) => Promise<string>;

  ttsRequest: (config: TTSConfig, model: TTSModel) => Promise<string>;

  checkForUpdates?: () => Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }>;

  updateVendor?: () => Promise<string>;

};



// ============================================================

// 供应商配置

// ============================================================



const vendor: VendorConfig = {

  id: "huggingface",

  version: "1.4",

  author: "Toonflow",

  name: "HuggingFace",

  description:

    "## HuggingFace Inference Providers\n- Router 使用 Hub 模型 ID 自动映射各 Provider 的 providerId（与模型页 InferenceClient 一致）。\n- 文生图推荐 FLUX.1-schnell；FLUX.2-dev 仅支持图生图（需参考图）。\n- 视频模型按 HF 官方映射走 fal-ai / wavespeed / replicate。",

  inputs: [

    { key: "apiKey", label: "HF Token", type: "password", required: true, placeholder: "hf_..." },

    {

      key: "defaultProvider",

      label: "默认推理提供商",

      type: "text",

      required: false,

      placeholder: "auto | fal-ai | wavespeed",

    },

    { key: "baseUrl", label: "Router 地址", type: "url", required: false, placeholder: "https://router.huggingface.co" },

    { key: "chatBaseUrl", label: "文本 API 地址", type: "url", required: false, placeholder: "https://router.huggingface.co/v1" },

    { key: "numInferenceSteps", label: "默认推理步数", type: "text", required: false, placeholder: "28" },

    { key: "guidanceScale", label: "默认引导系数", type: "text", required: false, placeholder: "3.5" },

    { key: "pollIntervalMs", label: "轮询间隔(ms)", type: "text", required: false, placeholder: "5000" },

    { key: "pollTimeoutMs", label: "轮询超时(ms)", type: "text", required: false, placeholder: "600000" },

  ],

  inputValues: {

    apiKey: "",

    defaultProvider: "auto",

    baseUrl: "https://router.huggingface.co",

    chatBaseUrl: "https://router.huggingface.co/v1",

    numInferenceSteps: "28",

    guidanceScale: "3.5",

    pollIntervalMs: "5000",

    pollTimeoutMs: "600000",

  },

  models: [

    {

      name: "FLUX.1-schnell（自动路由）",

      modelName: "black-forest-labs/FLUX.1-schnell",

      type: "image",

      mode: ["text"],

      associationSkills: "快速文生图, 多 Provider 自动路由",

    },

    {

      name: "FLUX.1-schnell · Fal AI",

      modelName: "fal-ai/black-forest-labs/FLUX.1-schnell",

      type: "image",

      mode: ["text"],

      associationSkills: "Fal 稳定文生图",

    },

    {

      name: "FLUX.2-dev 图生图（自动路由）",

      modelName: "black-forest-labs/FLUX.2-dev",

      type: "image",

      mode: ["singleImage"],

      associationSkills: "高保真图生图, 需参考图（Hub 仅注册 image-to-image）",

    },

    {

      name: "FLUX.2-dev 图生图 · Replicate",

      modelName: "replicate/black-forest-labs/FLUX.2-dev",

      type: "image",

      mode: ["singleImage"],

      associationSkills: "Replicate 图生图线路",

    },

    {

      name: "DeepSeek-R1（最快）",

      modelName: "deepseek-ai/DeepSeek-R1:fastest",

      type: "text",

      think: true,

    },

    {

      name: "Qwen3-235B（最快）",

      modelName: "Qwen/Qwen3-235B-A22B-Instruct-2507:fastest",

      type: "text",

      think: false,

    },

    {

      name: "Wan2.2 TI2V（自动路由）",

      modelName: "Wan-AI/Wan2.2-TI2V-5B",

      type: "video",

      mode: ["text", "singleImage"],

      audio: false,

      durationResolutionMap: [{ duration: [5, 10], resolution: ["720p", "1080p"] }],

      associationSkills: "文生视频, 首帧参考",

    },

    {

      name: "Wan2.2 TI2V · WaveSpeed",

      modelName: "wavespeed/Wan-AI/Wan2.2-TI2V-5B",

      type: "video",

      mode: ["text", "singleImage"],

      audio: false,

      durationResolutionMap: [{ duration: [5, 10], resolution: ["720p", "1080p"] }],

      associationSkills: "WaveSpeed 视频线路",

    },

    {

      name: "HunyuanVideo · Fal AI",

      modelName: "fal-ai/tencent/HunyuanVideo",

      type: "video",

      mode: ["text"],

      audio: false,

      durationResolutionMap: [{ duration: [5, 10], resolution: ["720p", "1080p"] }],

      associationSkills: "混元文生视频（HF 当前仅 fal-ai 线路）",

    },

  ],

};



// ============================================================

// 辅助工具

// ============================================================



const knownProviders = ["fal-ai", "together", "replicate", "wavespeed", "novita", "hf-inference", "nscale", "auto"];



/**

 * Hub 模型 → Provider 侧 providerId（与 HF 模型页 inferenceProviderMapping 一致）

 * 模型页能测通是因为 InferenceClient 自动做此映射；直连 Router 必须带 providerId。

 */

const inferenceProviderMapping: Record<string, Record<string, ProviderRoute>> = {

  "black-forest-labs/FLUX.1-schnell": {

    "fal-ai": { providerId: "fal-ai/flux/schnell", task: "text-to-image" },

    "together": { providerId: "black-forest-labs/FLUX.1-schnell", task: "text-to-image" },

    "replicate": { providerId: "black-forest-labs/flux-schnell", task: "text-to-image" },

    "hf-inference": { providerId: "black-forest-labs/FLUX.1-schnell", task: "text-to-image" },

    "wavespeed": { providerId: "wavespeed-ai/flux-schnell", task: "text-to-image" },

    "nscale": { providerId: "black-forest-labs/FLUX.1-schnell", task: "text-to-image" },

  },

  "black-forest-labs/FLUX.2-dev": {

    "fal-ai": { providerId: "fal-ai/flux-2/edit", task: "image-to-image" },

    "together": { providerId: "black-forest-labs/FLUX.2-dev", task: "image-to-image" },

    "replicate": { providerId: "black-forest-labs/flux-2-dev", task: "image-to-image" },

    "wavespeed": { providerId: "wavespeed-ai/flux-2-dev/edit", task: "image-to-image" },

  },

  "Wan-AI/Wan2.2-TI2V-5B": {

    "fal-ai": { providerId: "fal-ai/wan/v2.2-5b/text-to-video", task: "text-to-video" },

    "replicate": { providerId: "wan-video/wan-2.2-5b-fast", task: "text-to-video" },

    "wavespeed": { providerId: "wavespeed-ai/wan-2.2/t2v-5b-720p", task: "text-to-video" },

  },

  "tencent/HunyuanVideo": {

    "fal-ai": { providerId: "fal-ai/hunyuan-video", task: "text-to-video" },

  },

};



const mappingHydrated = new Set<string>();

const hydrateProviderMapping = async (hubModelId: string) => {
  if (mappingHydrated.has(hubModelId)) return;
  mappingHydrated.add(hubModelId);
  try {
    const token = getApiKey();
    const resp = await axios.get(`https://huggingface.co/api/models/${hubModelId}?expand=inferenceProviderMapping`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 20000,
      validateStatus: () => true,
    });
    if (resp.status >= 400 || !resp.data?.inferenceProviderMapping) return;
    if (!inferenceProviderMapping[hubModelId]) inferenceProviderMapping[hubModelId] = {};
    for (const [provider, info] of Object.entries(resp.data.inferenceProviderMapping)) {
      const row = info as any;
      if (row?.providerId && row?.task) {
        inferenceProviderMapping[hubModelId][provider] = {
          providerId: row.providerId,
          task: row.task as InferenceTask,
        };
      }
    }
    logger(`已同步 HF Provider 映射: ${hubModelId}`);
  } catch {
    logger(`HF 映射同步跳过: ${hubModelId}`);
  }
};



const modelProviderHints: Record<string, string[]> = {

  "black-forest-labs/FLUX.1-schnell": ["fal-ai", "wavespeed", "hf-inference", "replicate", "together"],

  "black-forest-labs/FLUX.2-dev": ["fal-ai", "replicate", "together"],

  "Wan-AI/Wan2.2-TI2V-5B": ["wavespeed", "fal-ai", "replicate"],

  "tencent/HunyuanVideo": ["fal-ai"],

};



const isProviderUnsupported = (msg: string) => /not supported by provider/i.test(msg) || /model not supported/i.test(msg);



const isRetryableProviderError = (msg: string, status?: number) =>

  isProviderUnsupported(msg) || status === 404 || status === 503 || /not found/i.test(msg);



const getDefaultProvider = () => (vendor.inputValues.defaultProvider || "auto").trim() || "auto";



const getProviderCandidates = (hubModelId: string, task: InferenceTask, explicitProvider: string) => {

  const mapping = inferenceProviderMapping[hubModelId] || {};

  const ordered: string[] = [];

  const add = (p: string) => {

    if (!p || p === "auto") return;

    const route = mapping[p];

    if (route?.task === task && !ordered.includes(p)) ordered.push(p);

  };

  if (explicitProvider && explicitProvider !== "auto") add(explicitProvider);

  const defaultP = getDefaultProvider();

  if (defaultP && defaultP !== explicitProvider) add(defaultP);

  (modelProviderHints[hubModelId] || []).forEach(add);

  Object.keys(mapping).forEach((p) => add(p));

  return ordered;

};



const resolveProviderRoute = (hubModelId: string, provider: string, task: InferenceTask): ProviderRoute | null => {

  const route = inferenceProviderMapping[hubModelId]?.[provider];

  return route?.task === task ? route : null;

};



const postInferenceWithFallback = async (

  hubModelId: string,

  task: InferenceTask,

  modelName: string,

  body: any,

  responseType = "arraybuffer",

) => {

  const { provider: explicit } = parseModelRoute(modelName);

  await hydrateProviderMapping(hubModelId);

  const candidates = getProviderCandidates(hubModelId, task, explicit);

  if (candidates.length === 0) {

    throw new Error(

      `模型 ${hubModelId} 不支持任务「${task}」。例如 FLUX.2-dev 在 HF 仅注册图生图，文生图请用 FLUX.1-schnell。`,

    );

  }

  let lastError = "所有 Provider 均不可用";



  for (const provider of candidates) {

    const route = resolveProviderRoute(hubModelId, provider, task);

    if (!route) continue;

    logger(`尝试 provider=${provider} providerId=${route.providerId} task=${task}`);

    const resp = await postInference(provider, route.providerId, body, responseType, task);

    if (resp.status < 400) {

      const ct = String(resp.headers?.["content-type"] || "");

      if (ct.includes("json")) {

        const json = parseMaybeJsonResponse(resp.data);

        const errText = json?.error?.message || json?.error || json?.message;

        if (errText && isRetryableProviderError(String(errText), resp.status)) {

          lastError = String(errText);

          logger(`provider ${provider} 不可用: ${lastError}`);

          continue;

        }

      }

      return { resp, provider, providerId: route.providerId };

    }

    const msg = extractApiError({ response: resp });

    if (isRetryableProviderError(msg, resp.status)) {

      lastError = msg;

      logger(`provider ${provider} 不可用(${resp.status}): ${msg}`);

      continue;

    }

    throw new Error(msg);

  }

  throw new Error(`${lastError}（已尝试: ${candidates.join(" → ")}）`);

};



const getApiKey = () => {

  if (!vendor.inputValues.apiKey) throw new Error("请先在供应商设置中配置 HF Token");

  return vendor.inputValues.apiKey.replace(/^Bearer\s+/i, "");

};



const getInferenceAccept = (task: InferenceTask) => {
  if (task === "text-to-video") return "video/mp4";
  if (task === "image-to-image") return "image/png";
  return "image/png";
};



const getHeaders = (task?: InferenceTask) => {

  const headers: Record<string, string> = {

    Authorization: `Bearer ${getApiKey()}`,

    "Content-Type": "application/json",

  };

  if (task) headers["Accept"] = getInferenceAccept(task);

  return headers;

};



const getBaseUrl = () => (vendor.inputValues.baseUrl || "https://router.huggingface.co").replace(/\/+$/, "");



const getPollInterval = () => {

  const n = parseInt(vendor.inputValues.pollIntervalMs || "5000", 10);

  return Number.isFinite(n) && n > 0 ? n : 5000;

};



const getPollTimeout = (kind: "image" | "video") => {

  const configured = parseInt(vendor.inputValues.pollTimeoutMs || "600000", 10);

  const fallback = kind === "video" ? 1800000 : 300000;

  return Number.isFinite(configured) && configured > 0 ? configured : fallback;

};



const parseModelRoute = (modelName: string) => {

  const slash = modelName.indexOf("/");

  if (slash > 0) {

    const prefix = modelName.slice(0, slash);

    if (knownProviders.includes(prefix)) {

      return { provider: prefix, modelId: modelName.slice(slash + 1) };

    }

  }

  return { provider: getDefaultProvider(), modelId: modelName };

};



const stripDataUrl = (base64: string) => {

  if (!base64) return "";

  if (base64.startsWith("data:")) return base64.split(",")[1] || base64;

  return base64;

};



const resolveImageSize = (size = "1K", aspectRatio = "16:9") => {

  const shortEdge = size === "4K" ? 2048 : size === "2K" ? 1536 : 1024;

  const ratio = String(aspectRatio || "16:9");

  if (ratio === "9:16") return { width: shortEdge, height: Math.round((shortEdge * 16) / 9) };

  if (ratio === "1:1") return { width: shortEdge, height: shortEdge };

  if (ratio === "4:3") return { width: Math.round((shortEdge * 4) / 3), height: shortEdge };

  if (ratio === "3:4") return { width: shortEdge, height: Math.round((shortEdge * 4) / 3) };

  return { width: Math.round((shortEdge * 16) / 9), height: shortEdge };

};



const resolveVideoSize = (resolution = "720p", aspectRatio = "16:9") => {

  const is1080 = String(resolution).includes("1080");

  const shortEdge = is1080 ? 1080 : 720;

  const ratio = String(aspectRatio || "16:9");

  if (ratio === "9:16") return { width: shortEdge, height: Math.round((shortEdge * 16) / 9) };

  return { width: Math.round((shortEdge * 16) / 9), height: shortEdge };

};



const extractApiError = (error: any) => {

  const data = error?.response?.data;

  if (Buffer.isBuffer(data)) {

    const text = data.toString("utf8");

    try {

      const json = JSON.parse(text);

      return json?.error || json?.message || text.slice(0, 500);

    } catch {

      return text.slice(0, 500) || error?.message || "请求失败";

    }

  }

  if (typeof data === "string" && data.trim()) return data.slice(0, 500);

  if (data?.error?.message) return data.error.message;

  if (data?.message) return data.message;

  if (data?.error && typeof data.error === "string") return data.error;

  return error?.message || "请求失败";

};



const arrayBufferToDataUrl = (data: ArrayBuffer, contentType?: string) => {

  const mime = (contentType || "image/png").split(";")[0];

  const b64 = Buffer.from(data).toString("base64");

  return `data:${mime};base64,${b64}`;

};



const pickMediaUrl = (payload: any): string => {

  if (!payload || typeof payload !== "object") return "";

  return (

    payload.url ||

    payload.video_url ||

    payload.image_url ||

    payload.output?.url ||

    payload.video?.url ||

    payload.images?.[0]?.url ||

    payload.data?.[0]?.url ||

    ""

  );

};



const withNetworkRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {

  let lastError: any;

  for (let i = 1; i <= retries; i++) {

    try {

      return await fn();

    } catch (e: any) {

      lastError = e;

      const code = e?.code || "";

      const retryable = ["ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "ECONNABORTED"].includes(code);

      if (!retryable || i === retries) break;

      logger(`网络异常重试 ${i}/${retries}: ${extractApiError(e)}`);

      await new Promise((r) => setTimeout(r, delay * i));

    }

  }

  throw lastError;

};



const postInference = async (

  provider: string,

  providerModelId: string,

  body: any,

  responseType = "arraybuffer",

  task: InferenceTask = "text-to-image",

) => {

  const url = `${getBaseUrl()}/${provider}/models/${providerModelId}`;

  logger(`POST ${url}`);

  return withNetworkRetry(() =>

    axios.post(url, body, {

      headers: getHeaders(task),

      responseType,

      timeout: 120000,

      validateStatus: () => true,

    }),

  );

};



const parseMaybeJsonResponse = (data: ArrayBuffer) => {

  try {

    return JSON.parse(Buffer.from(data).toString("utf8"));

  } catch {

    return null;

  }

};



const resolveImageFromResponse = async (resp: any, usedProvider: string): Promise<string> => {

  if (resp.status >= 400) throw new Error(extractApiError({ response: resp }));



  const contentType = String(resp.headers?.["content-type"] || "");

  if (contentType.includes("image") || contentType.includes("octet-stream")) {

    return arrayBufferToDataUrl(resp.data, contentType);

  }



  const json = parseMaybeJsonResponse(resp.data);

  if (!json) throw new Error("图像生成响应异常，无法解析结果");



  const directUrl = pickMediaUrl(json);

  if (directUrl) {

    logger("图像生成完成，正在下载结果...");

    return await urlToBase64(directUrl);

  }



  const statusUrl = json.status_url || json.polling_url || json.urls?.get;

  const requestId = json.request_id || json.id;

  if (!statusUrl && !requestId) throw new Error("图像生成响应异常，未找到图像 URL 或任务 ID");



  const pollUrl = statusUrl || `${getBaseUrl()}/${usedProvider}/requests/${requestId}/status`;

  logger(`图像任务已提交，开始轮询: ${pollUrl}`);



  const pollResult = await pollTask(async () => {

    try {

      const statusResp = await axios.get(pollUrl, {

        headers: getHeaders("text-to-image"),

        timeout: 60000,

        validateStatus: () => true,

      });

      if (statusResp.status >= 400) return { completed: true, error: extractApiError({ response: statusResp }) };



      const payload = statusResp.data;

      const status = String(payload?.status || payload?.state || "").toLowerCase();

      if (["succeeded", "success", "completed", "ready"].includes(status)) {

        const mediaUrl = pickMediaUrl(payload) || pickMediaUrl(payload?.response);

        if (mediaUrl) return { completed: true, data: mediaUrl };

        return { completed: true, error: "任务完成但未返回媒体 URL" };

      }

      if (["failed", "error", "canceled", "cancelled"].includes(status)) {

        return { completed: true, error: payload?.error || payload?.message || "图像生成失败" };

      }

      return { completed: false };

    } catch (e: any) {

      logger(`图像轮询重试: ${extractApiError(e)}`);

      return { completed: false };

    }

  }, getPollInterval(), getPollTimeout("image"));



  if (pollResult.error) throw new Error(pollResult.error);

  if (!pollResult.data) throw new Error("图像生成超时");

  return await urlToBase64(pollResult.data);

};



// ============================================================

// 适配器函数

// ============================================================



const textRequest = (model: TextModel, think: boolean, thinkLevel: 0 | 1 | 2 | 3) => {

  const apiKey = getApiKey();

  const baseURL = vendor.inputValues.chatBaseUrl || "https://router.huggingface.co/v1";

  return createOpenAI({ baseURL, apiKey }).chat(model.modelName);

};



const imageRequest = async (config: ImageConfig, model: ImageModel): Promise<string> => {

  const { modelId: hubModelId } = parseModelRoute(model.modelName);

  const hasRef = config.referenceList && config.referenceList.length > 0;

  const task: InferenceTask = hasRef ? "image-to-image" : "text-to-image";



  if (hubModelId === "black-forest-labs/FLUX.2-dev" && !hasRef) {

    throw new Error("FLUX.2-dev 在 HuggingFace Inference Providers 仅支持图生图，请提供参考图或改用 FLUX.1-schnell 文生图");

  }

  if (hasRef && hubModelId === "black-forest-labs/FLUX.1-schnell") {

    throw new Error("FLUX.1-schnell 不支持图生图，请改用 FLUX.2-dev 图生图或仅做文生图测试");

  }



  const { width, height } = resolveImageSize(config.size, config.aspectRatio);
  const parameters: any = {
    width,
    height,
    num_inference_steps: parseInt(vendor.inputValues.numInferenceSteps || "28", 10) || 28,
    guidance_scale: parseFloat(vendor.inputValues.guidanceScale || "3.5") || 3.5,
  };

  let body: any;
  if (task === "image-to-image") {
    let refBase64 = config.referenceList![0].base64;
    refBase64 = await zipImage(refBase64.startsWith("data:") ? refBase64 : `data:image/jpeg;base64,${refBase64}`, 3 * 1024 * 1024);
    const imgParams: any = {
      prompt: config.prompt,
      target_size: { width, height },
      num_inference_steps: parseInt(vendor.inputValues.numInferenceSteps || "28", 10) || 28,
      guidance_scale: parseFloat(vendor.inputValues.guidanceScale || "3.5") || 3.5,
    };
    body = { inputs: stripDataUrl(refBase64), parameters: imgParams };
    logger(`图生图 | hub=${hubModelId}`);
  } else {
    body = { inputs: config.prompt, parameters };
    logger(`文生图 | hub=${hubModelId}`);
  }



  const result = await postInferenceWithFallback(hubModelId, task, model.modelName, body);

  logger(`图像生成使用 provider=${result.provider} providerId=${result.providerId}`);

  return await resolveImageFromResponse(result.resp, result.provider);

};



const videoRequest = async (config: VideoConfig, model: VideoModel): Promise<string> => {

  const { modelId: hubModelId } = parseModelRoute(model.modelName);

  const task: InferenceTask = "text-to-video";

  const { width, height } = resolveVideoSize(config.resolution || "720p", config.aspectRatio || "16:9");

  const duration = config.duration || 5;

  const parameters: any = {
    num_frames: Math.max(16, Math.round(duration * 24)),
    guidance_scale: parseFloat(vendor.inputValues.guidanceScale || "3.5") || 3.5,
    num_inference_steps: parseInt(vendor.inputValues.numInferenceSteps || "28", 10) || 28,
  };



  const imageRefs = (config.referenceList || []).filter((r) => r.type === "image" && r.base64);

  let body: any = { inputs: config.prompt, parameters };



  if (imageRefs.length > 0) {

    let ref = imageRefs[0].base64;

    ref = await zipImage(ref.startsWith("data:") ? ref : `data:image/jpeg;base64,${ref}`, 3 * 1024 * 1024);

    parameters.image = stripDataUrl(ref);

    body = { inputs: config.prompt, parameters };

    logger(`视频首帧参考 | hub=${hubModelId}`);

  } else {

    logger(`视频文生 | hub=${hubModelId}`);

  }



  const { resp, provider: usedProvider } = await postInferenceWithFallback(hubModelId, task, model.modelName, body);

  logger(`视频生成使用 provider=${usedProvider}`);

  const contentType = String(resp.headers?.["content-type"] || "");



  if (resp.status < 400 && (contentType.includes("video") || contentType.includes("octet-stream"))) {

    logger("视频生成成功（同步响应）");

    return arrayBufferToDataUrl(resp.data, contentType.includes("video") ? contentType : "video/mp4");

  }



  const json = parseMaybeJsonResponse(resp.data);

  if (!json) {

    if (resp.status >= 400) throw new Error(extractApiError({ response: resp }));

    throw new Error("视频生成响应异常");

  }



  const directUrl = pickMediaUrl(json);

  if (directUrl) {

    logger("视频任务完成，正在下载...");

    return await urlToBase64(directUrl);

  }



  const statusUrl = json.status_url || json.polling_url || json.urls?.get;

  const requestId = json.request_id || json.id;

  if (!statusUrl && !requestId) throw new Error(extractApiError({ response: { data: json, status: resp.status } }));



  const pollUrl = statusUrl || `${getBaseUrl()}/${usedProvider}/requests/${requestId}/status`;

  logger(`视频任务已提交，开始轮询: ${pollUrl}`);



  const pollResult = await pollTask(async () => {

    try {

      const statusResp = await axios.get(pollUrl, {

        headers: getHeaders("text-to-video"),

        timeout: 90000,

        validateStatus: () => true,

      });

      if (statusResp.status >= 400) return { completed: true, error: extractApiError({ response: statusResp }) };



      const payload = statusResp.data;

      const status = String(payload?.status || payload?.state || "").toLowerCase();

      if (["succeeded", "success", "completed", "ready"].includes(status)) {

        const mediaUrl = pickMediaUrl(payload) || pickMediaUrl(payload?.response);

        if (mediaUrl) return { completed: true, data: mediaUrl };

        return { completed: true, error: "视频任务完成但未返回 URL" };

      }

      if (["failed", "error", "canceled", "cancelled"].includes(status)) {

        const errMsg = payload?.error?.message || payload?.error || payload?.message || "视频生成失败";

        return { completed: true, error: typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg) };

      }

      return { completed: false };

    } catch (e: any) {

      logger(`视频轮询重试: ${extractApiError(e)}`);

      return { completed: false };

    }

  }, getPollInterval(), getPollTimeout("video"));



  if (pollResult.error) throw new Error(pollResult.error);

  if (!pollResult.data) throw new Error("视频生成超时");

  logger("视频生成成功，正在下载...");

  return await urlToBase64(pollResult.data);

};



const ttsRequest = async (_config: TTSConfig, _model: TTSModel): Promise<string> => {

  return "";

};



const checkForUpdates = async (): Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }> => {

  return {

    hasUpdate: false,

    latestVersion: "1.4",

    notice:

      "## v1.4\n- 运行时同步 HF inferenceProviderMapping\n- providerId 路由与模型页一致",

  };

};



const updateVendor = async (): Promise<string> => {

  return "";

};



// ============================================================

// 导出

// ============================================================



exports.vendor = vendor;

exports.textRequest = textRequest;

exports.imageRequest = imageRequest;

exports.videoRequest = videoRequest;

exports.ttsRequest = ttsRequest;

exports.checkForUpdates = checkForUpdates;

exports.updateVendor = updateVendor;



export {};



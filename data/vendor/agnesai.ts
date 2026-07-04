/**
 * Agnes AI 供应商适配代码
 * @version 2.6
 */

// ============================================================
// 类型定义 （已由系统在顶部声明，此处直接使用）
// ============================================================

// ============================================================
// 全局声明 （已由系统声明，直接调用）
// ============================================================

declare const uploadReferenceAsset: (base64: string, kind: "image" | "video") => Promise<string>;
declare const preflightPublicUrl: (url: string, kind: "image" | "video") => Promise<void>;

// ============================================================
// 供应商配置
// ============================================================

const vendor: VendorConfig = {
  id: "agnesai",
  version: "2.6",
  author: "Toonflow",
  name: "Agnes AI",
  description: "## Agnes AI 全模态适配供应商\n- 支持文本、图片生成、以及高品质视频生成模型。\n- 已预设默认时长分辨率等参数，无需手动繁琐配置。",
  inputs: [
    { key: "apiKey", label: "API密钥", type: "password", required: true },
    { key: "baseUrl", label: "请求地址", type: "url", required: true, placeholder: "https://apihub.agnes-ai.com/v1" },
  ],
  inputValues: { apiKey: "", baseUrl: "https://apihub.agnes-ai.com/v1" },
  models: [
    {
      name: "Agnes Video V2.0 (推荐)",
      modelName: "agnes-video-v2.0",
      type: "video",
      // 修复报错：1. 将基础模式放在前面，并修复多参模式写法（期望数组，实际接收数组）
      mode: [
        "text", 
        "singleImage", 
        "startEndRequired", 
        ["videoReference:1", "imageReference:2"] // 正确嵌套数组，满足 (`videoReference:${number}` | ... )[] 类型
      ],
      audio: "optional",
      // 优化：提供最佳默认的时长与分辨率预设，让用户添加模型时自动选中，解决空白问题
      durationResolutionMap: [
        { duration: [5, 10], resolution: ["720p", "1080p"] }
      ],
      associationSkills: "图像参考, 动作控制, 双帧过渡"
    },
    {
      name: "agnes-image-2.1-flash",
      modelName: "agnes-image-2.1-flash",
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
      associationSkills: "高保真图像, 细节生成"
    },
    {
      name: "agnes-2.0-flash 文本对话",
      modelName: "agnes-2.0-flash",
      type: "text",
      think: true
    }
  ],
};

// ============================================================
// 辅助工具
// ============================================================

/**
 * 获取公共请求头
 */
const getHeaders = () => {
  if (!vendor.inputValues.apiKey) throw new Error("请先在供应商设置中配置 API 密钥");
  const apiKey = vendor.inputValues.apiKey.replace(/^Bearer\s+/i, "");
  return {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
};

/** 统一走 apihub 网关（图像/文本/视频） */
const getApiBase = () => {
  const raw = (vendor.inputValues.baseUrl || "https://apihub.agnes-ai.com/v1").replace(/\/+$/, "");
  if (/apihub\.agnes-ai\.com/i.test(raw)) return raw;
  return raw.replace(/api\.agnes-ai\.com/i, "apihub.agnes-ai.com");
};

/** 图像接口走 api.agnes-ai.com；视频接口走 apihub.agnes-ai.com */
const getVideoApiBase = () => getApiBase();

const toImageRef = (base64: string) => {
  if (!base64) return "";
  if (/^https?:\/\//i.test(base64)) return base64;
  if (base64.startsWith("data:")) return base64;
  return `data:image/jpeg;base64,${base64}`;
};

/** 上传参考素材为公网 URL（ngrok / 阿里云 OSS） */
const toRemoteMediaRef = async (base64: string, kind: "image" | "video") => {
  if (/^https?:\/\//i.test(base64)) {
    await preflightPublicUrl(base64, kind);
    return base64;
  }
  try {
    const url = await uploadReferenceAsset(base64, kind);
    logger(`参考${kind === "video" ? "视频" : "图"}公网 URL: ${url.slice(0, 120)}`);
    return url;
  } catch (e: any) {
    const msg = e?.message || String(e);
    logger(`参考素材公网化失败: ${msg}`);
    throw new Error(msg);
  }
};

const normalizeNumFrames = (duration = 5) => {
  const target = Math.max(9, Math.min(441, Math.round(duration * 24)));
  const normalized = Math.floor((target - 1) / 8) * 8 + 1;
  return Math.max(9, Math.min(441, normalized));
};

const resolveVideoSize = (resolution = "720p", aspectRatio = "16:9") => {
  const is1080 = String(resolution).includes("1080");
  const shortEdge = is1080 ? 1080 : 720;
  const ratio = String(aspectRatio || "16:9");
  if (ratio === "9:16") return { width: shortEdge, height: Math.round(shortEdge * 16 / 9) };
  if (ratio === "1:1") return { width: shortEdge, height: shortEdge };
  if (ratio === "4:3") return { width: Math.round(shortEdge * 4 / 3), height: shortEdge };
  if (ratio === "3:4") return { width: shortEdge, height: Math.round(shortEdge * 4 / 3) };
  return { width: Math.round(shortEdge * 16 / 9), height: shortEdge };
};

const extractApiError = (error: any) => {
  const data = error?.response?.data;
  if (typeof data === "object" && data !== null) {
    if (data.error?.message) return String(data.error.message);
    if (typeof data.error === "string") return data.error;
    if (data.message) return String(data.message);
    try {
      return JSON.stringify(data).slice(0, 500);
    } catch {
      return "请求失败";
    }
  }
  if (typeof data === "string" && data.trim()) return data.slice(0, 500);
  return error?.message || "视频生成请求失败";
};

const postWithRetry = async (url: string, payload: any, retries = 3) => {
  let lastError: any;
  for (let i = 1; i <= retries; i++) {
    try {
      return await axios.post(url, payload, { headers: getHeaders(), timeout: 120000 });
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status;
      const msg = extractApiError(error);
      const retryable = status === 503 || status === 502 || status === 429 || /no available server/i.test(msg);
      if (!retryable || i === retries) break;
      logger(`视频提交重试 ${i}/${retries}: ${msg}`);
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  throw lastError;
};

// ============================================================
// 适配器函数
// ============================================================

const textRequest = (model: TextModel) => {
  if (!vendor.inputValues.apiKey) throw new Error("缺少API Key");
  const apiKey = vendor.inputValues.apiKey.replace(/^Bearer\s+/i, "");
  return createOpenAI({ baseURL: getApiBase(), apiKey }).chat(model.modelName);
};

const resolveAgnesImageSize = (size = "1K", aspectRatio = "16:9") => {
  const short = size === "4K" ? 2048 : size === "2K" ? 1536 : 1024;
  const ratio = String(aspectRatio || "16:9");
  if (ratio === "9:16") return `${Math.round((short * 9) / 16)}x${short}`;
  if (ratio === "1:1") return `${short}x${short}`;
  if (ratio === "4:3") return `${Math.round((short * 4) / 3)}x${short}`;
  if (ratio === "3:4") return `${short}x${Math.round((short * 4) / 3)}`;
  return `${short}x${Math.round((short * 9) / 16)}`;
};

const imageRequest = async (config: ImageConfig, model: ImageModel): Promise<string> => {
  const apiBase = getApiBase();
  const payload: any = {
    model: model.modelName,
    prompt: config.prompt,
    size: resolveAgnesImageSize(config.size, config.aspectRatio),
    extra_body: { response_format: "url" },
  };

  if (config.referenceList && config.referenceList.length > 0) {
    const images: string[] = [];
    for (const ref of config.referenceList) {
      let img = toImageRef(ref.base64);
      img = await zipImage(img, 3 * 1024 * 1024);
      images.push(await toRemoteMediaRef(img, "image"));
    }
    payload.extra_body.image = images;
  }

  logger(`POST ${apiBase}/images/generations`);
  let response: any;
  try {
    response = await axios.post(`${apiBase}/images/generations`, payload, { headers: getHeaders(), timeout: 120000 });
  } catch (error: any) {
    const message = extractApiError(error);
    logger(`图像生成失败: ${message}`);
    throw new Error(message);
  }

  const url =
    response.data?.url ||
    response.data?.data?.[0]?.url ||
    response.data?.data?.url;
  if (url) return await urlToBase64(url);

  const b64 = response.data?.b64_json || response.data?.data?.[0]?.b64_json;
  if (b64) return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;

  throw new Error(response.data?.message || "图像生成响应异常，未找到有效的图像 URL");
};

const videoRequest = async (config: VideoConfig, model: VideoModel): Promise<string> => {
  const activeMode = Array.isArray(config.mode) ? config.mode[0] : config.mode;
  const modeLabel = Array.isArray(activeMode) ? "multiReference" : String(activeMode || "text");
  logger(`开始构建视频生成任务 | 模式: ${modeLabel}`);

  const duration = config.duration || 5;
  const frameRate = 24;
  const { width, height } = resolveVideoSize(config.resolution || "720p", config.aspectRatio || "16:9");
  const payload: any = {
    model: model.modelName || "agnes-video-v2.0",
    prompt: config.prompt,
    width,
    height,
    num_frames: normalizeNumFrames(duration),
    frame_rate: frameRate,
  };

  const imageRefs = (config.referenceList || [])
    .filter((ref) => ref.type === "image" && ref.base64)
    .map((ref) => ref.base64);

  const videoRefs = (config.referenceList || [])
    .filter((ref) => ref.type === "video" && ref.base64)
    .map((ref) => ref.base64);

  const zipLimit = modeLabel === "startEndRequired" ? 1.5 * 1024 * 1024 : 3 * 1024 * 1024;
  const zippedImages: string[] = [];
  for (const raw of imageRefs) {
    let ref = toImageRef(raw);
    ref = await zipImage(ref, zipLimit);
    zippedImages.push(await toRemoteMediaRef(ref, "image"));
  }
  const remoteVideos: string[] = [];
  for (const raw of videoRefs) {
    remoteVideos.push(await toRemoteMediaRef(raw, "video"));
  }

  if (modeLabel === "singleImage" && zippedImages[0]) {
    payload.image = zippedImages[0];
  } else if (modeLabel === "startEndRequired" && zippedImages.length >= 2) {
    payload.extra_body = { image: zippedImages.slice(0, 2), mode: "keyframes" };
  } else if (String(modeLabel).startsWith("videoReference") && remoteVideos[0]) {
    payload.extra_body = { video: [remoteVideos[0]], image: zippedImages };
    logger(`视频参考模式 | 视频 ${remoteVideos.length} 张, 图片 ${zippedImages.length} 张`);
  } else if (zippedImages.length > 0) {
    payload.extra_body = {
      image: zippedImages,
      ...(modeLabel === "startEndRequired" ? { mode: "keyframes" } : {}),
    };
  }

  const videoApiBase = getVideoApiBase();
  const createUrl = `${videoApiBase}/videos`;
  logger(`提交视频生成任务中... POST ${createUrl}`);

  let startResponse: any;
  try {
    startResponse = await postWithRetry(createUrl, payload);
  } catch (error: any) {
    const message = extractApiError(error);
    logger(`视频任务提交失败: ${message}`);
    throw new Error(message);
  }

  const videoId = startResponse.data?.video_id;
  const taskId = startResponse.data?.task_id || startResponse.data?.id;
  const pollId = videoId || taskId;
  if (!pollId) throw new Error("未能获取到 video_id 或 task_id");
  logger(`任务提交成功，video_id: ${videoId || "-"}，task_id: ${taskId || "-"}，准备进入状态轮询...`);

  const pollBase = videoApiBase.replace(/\/v1$/i, "");
  const pollUrl = videoId
    ? `${pollBase}/agnesapi?video_id=${encodeURIComponent(videoId)}&model_name=${encodeURIComponent(payload.model)}`
    : `${videoApiBase}/videos/${encodeURIComponent(String(taskId))}`;

  const result = await pollTask(async () => {
    try {
      const resp = await axios.get(pollUrl, { headers: getHeaders(), timeout: 60000 });
      const status = String(resp.data?.status || "").toLowerCase();

      if (status === "completed" || status === "success" || status === "succeeded") {
        const videoUrl =
          resp.data?.remixed_from_video_id ||
          resp.data?.url ||
          resp.data?.video_url ||
          resp.data?.data?.url;
        return { completed: true, data: videoUrl };
      }
      if (status === "failed" || status === "error") {
        const errMsg =
          resp.data?.error?.message ||
          resp.data?.error ||
          resp.data?.message ||
          "视频生成失败";
        const errText = typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg);
        logger(`视频生成失败: ${errText} | 完整响应: ${JSON.stringify(resp.data).slice(0, 800)}`);
        return { completed: true, error: errText };
      }
      return { completed: false };
    } catch (e: any) {
      logger(`轮询出错重试中: ${extractApiError(e)}`);
      return { completed: false };
    }
  }, 5000, 1800000); // 5秒一轮询，30分钟超时（视频生成可能排队较久）

  if (result.error) {
    logger(`视频生成任务结束(失败): ${result.error}`);
    throw new Error(result.error);
  }
  if (!result.data) throw new Error("任务完成，但未能获取视频 URL");

  logger("视频生成成功，正在转换为 Base64 数据返回...");
  return await urlToBase64(result.data);
};

const ttsRequest = async (config: TTSConfig, model: TTSModel): Promise<string> => {
  return ""; // 暂未开放
};

const checkForUpdates = async (): Promise<{ hasUpdate: boolean; latestVersion: string; notice: string }> => {
  return {
    hasUpdate: false,
    latestVersion: "2.6",
    notice: "## v2.6\n- 参考图/视频必须公网 URL（ngrok 或阿里云 OSS）\n- 提交前 URL 预检\n- 503 重试",
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
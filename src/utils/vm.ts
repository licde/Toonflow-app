import { VM } from "vm2";
import sharp from "sharp";
import axios from "axios";
import { createOpenAI } from "@ai-sdk/openai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createZhipu } from "zhipu-ai-provider";
import { createQwen } from "qwen-ai-provider-v5";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createXai } from "@ai-sdk/xai";
import { createMinimax } from "vercel-minimax-ai-provider";
import FormData from "form-data";
import jsonwebtoken from "jsonwebtoken";
import u from "@/utils";
import crypto from "node:crypto";
import oss from "@/utils/oss";
import { getObs } from "@/observability/bootstrap";

export function logger(logstring: any) {
  const msg = typeof logstring === "string" ? logstring : JSON.stringify(logstring);
  void getObs().log({
    level: "info",
    category: "vendor",
    module: "vm",
    message: msg.slice(0, 500),
    payload: typeof logstring === "object" ? logstring : undefined,
  });
}

/** 供应商参考图/视频公网化：写入本地 OSS，返回可访问 URL（需配置 ossURL 供外部 API 拉取） */
export async function uploadReferenceAsset(base64: string, kind: "image" | "video"): Promise<string> {
  let mime = kind === "video" ? "video/mp4" : "image/jpeg";
  let rawB64 = base64;
  const dataMatch = base64.match(/^data:([^;]+);base64,(.+)$/i);
  if (dataMatch) {
    mime = dataMatch[1];
    rawB64 = dataMatch[2];
  } else if (base64.includes(",")) {
    rawB64 = base64.split(",").pop()!;
  }

  const ext =
    kind === "video" ? "mp4" : mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const hash = crypto.createHash("sha256").update(rawB64.slice(0, 8000)).digest("hex").slice(0, 20);
  const relPath = `ref-cache/${hash}.${ext}`;

  if (!(await oss.fileExists(relPath))) {
    const payload = dataMatch ? base64 : `data:${mime};base64,${rawB64}`;
    await oss.writeFile(relPath, payload);
  }

  const url = await oss.getFileUrl(relPath);
  if (/localhost|127\.0\.0\.1/.test(url) && !process.env.ossURL) {
    logger(`参考${kind} URL 为本地地址，外部模型可能无法访问。请设置环境变量 ossURL=https://你的ngrok域名`);
  }
  return url;
}

/** 提交前检查参考 URL 是否可访问 */
export async function preflightPublicUrl(url: string, kind: "image" | "video"): Promise<void> {
  if (!/^https?:\/\//i.test(url)) throw new Error(`参考${kind} URL 无效`);
  if (/localhost|127\.0\.0\.1/.test(url) && !process.env.ossURL) {
    throw new Error(
      `参考${kind}为本地 URL，Agnes 等外部 API 无法拉取。请设置 ossURL 环境变量为 ngrok 公网地址（如 https://xxx.ngrok-free.dev）`,
    );
  }
  try {
    await axios.head(url, { timeout: 15000, validateStatus: (s) => s < 500 });
  } catch {
    await axios.get(url, { timeout: 15000, responseType: "arraybuffer", maxContentLength: 4096 });
  }
}

export default function runCode(code: string, vendor?: Record<string, any>) {
  code = code.replace(/export\s*\{\s*\};?/g, ""); // 去掉 export {} 以免沙盒环境报错
  // 创建一个沙盒
  const exports = {};
  const sandbox: Record<string, any> = {
    createOpenAI,
    createDeepSeek,
    createZhipu,
    createQwen,
    createAnthropic,
    createOpenAICompatible,
    createXai,
    createMinimax,
    createGoogleGenerativeAI,
    zipImage,
    zipImageResolution,
    urlToBase64,
    mergeImages,
    pollTask,
    fetch: fetch,
    exports,
    axios,
    FormData,
    logger,
    jsonwebtoken,
    crypto,
    uploadReferenceAsset,
    preflightPublicUrl,
  };
  if (vendor !== undefined) {
    sandbox.vendor = vendor;
  }
  const vm = new VM({
    timeout: 0,
    sandbox,
    compiler: "javascript",
    eval: false,
    wasm: false,
  });

  vm.run(code);

  return exports as Record<string, any>;
}
/**
 * 压缩图片，目标字节数不高于 size
 */
export async function zipImage(completeBase64: string, size: number): Promise<string> {
  let quality = 80;
  let buffer = Buffer.from(completeBase64.split(",")[1], "base64");
  let output = await sharp(buffer).jpeg({ quality }).toBuffer();
  while (output.length > size && quality > 10) {
    quality -= 10;
    output = await sharp(buffer).jpeg({ quality }).toBuffer();
  }
  return "data:image/jpeg;base64," + output.toString("base64");
}

export async function zipImageResolution(completeBase64: string, width: number, height: number): Promise<string> {
  const buffer = Buffer.from(completeBase64.split(",")[1], "base64");
  const out = await sharp(buffer).resize(width, height).toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

//url转Base64
export async function urlToBase64(url: string): Promise<string> {
  const res = await axios.get(url, { responseType: "arraybuffer" });
  const mime = res.headers["content-type"] || "image/jpeg";
  const b64 = Buffer.from(res.data).toString("base64");
  return `data:${mime};base64,${b64}`;
}

export async function pollTask(
  fn: () => Promise<{ completed: boolean; data?: string; error?: string }>,
  interval = 3000,
  timeout = 3000000,
): Promise<{ completed: boolean; data?: string; error?: string }> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const result = await fn();
      if (result.completed) return result;
      if (result?.error) return result;
    } catch (e: any) {
      return { completed: false, error: u.error(e).message || "poll error" };
    }
    await new Promise((res) => setTimeout(res, interval));
  }
  return { completed: false, error: "timeout" };
}

/**
 * 将多张图片横向拼接为一张，并确保输出大小不超过指定限制
 * @param imageBase64List - base64编码的图片数组
 * @param maxSize - 最大输出大小，支持格式如 "10mb", "5MB", "1024kb" 等
 * @returns 拼接后的图片base64字符串
 */
export async function mergeImages(imageBase64List: string[], maxSize = "10mb"): Promise<string> {
  if (imageBase64List.length === 0) {
    throw new Error("图片列表不能为空");
  }

  const maxBytes = parseSize(maxSize);
  const imageBuffers = imageBase64List.map(base64ToBuffer);
  const imageMetadatas = await Promise.all(imageBuffers.map((buffer) => sharp(buffer).metadata()));
  const maxHeight = Math.max(...imageMetadatas.map((m) => m.height || 0));

  // 计算各图片调整后的宽度
  const imageWidths = imageMetadatas.map((metadata) => {
    const aspectRatio = (metadata.width || 1) / (metadata.height || 1);
    return Math.round(maxHeight * aspectRatio);
  });
  const totalWidth = imageWidths.reduce((sum, w) => sum + w, 0);

  // 拼接图片
  const resizedImages = await Promise.all(
    imageBuffers.map(async (buffer, index) => {
      return sharp(buffer).resize(imageWidths[index], maxHeight, { fit: "cover" }).toBuffer();
    }),
  );

  let currentX = 0;
  const compositeInputs = resizedImages.map((buffer, index) => {
    const input = { input: buffer, left: currentX, top: 0 };
    currentX += imageWidths[index];
    return input;
  });

  const mergedBuffer = await sharp({
    create: {
      width: totalWidth,
      height: maxHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(compositeInputs)
    .jpeg({ quality: 90 })
    .toBuffer();

  // 复用压缩逻辑
  const resultBuffer = await compressToSize(mergedBuffer, maxBytes, totalWidth, maxHeight);
  return resultBuffer.toString("base64");
}

/**
 * 解析大小字符串为字节数
 */
function parseSize(size: string): number {
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb|b)?$/);
  if (!match) {
    throw new Error(`无效的大小格式: ${size}`);
  }
  const value = parseFloat(match[1]);
  const unit = match[2] || "b";
  const multipliers: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  return Math.floor(value * multipliers[unit]);
}

/**
 * 将base64字符串转换为Buffer
 */
function base64ToBuffer(base64: string): Buffer {
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

/**
 * 压缩Buffer到指定大小以内
 */
async function compressToSize(imageBuffer: Buffer, maxBytes: number, originalWidth: number, originalHeight: number): Promise<Buffer> {
  let quality = 90;
  let scale = 1;

  while (true) {
    const targetWidth = Math.round(originalWidth * scale);
    const targetHeight = Math.round(originalHeight * scale);

    const resultBuffer = await sharp(imageBuffer).resize(targetWidth, targetHeight, { fit: "fill" }).jpeg({ quality }).toBuffer();

    if (resultBuffer.length <= maxBytes) {
      return resultBuffer;
    }

    if (quality > 10) {
      quality -= 10;
    } else {
      quality = 90;
      scale *= 0.8;
    }
  }
}

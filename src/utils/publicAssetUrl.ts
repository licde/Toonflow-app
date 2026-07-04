import crypto from "node:crypto";
import axios from "axios";
import u from "@/utils";
import { imageUrlLog } from "@/utils/imageUrlLog";

export type OssStorageMode = "local" | "aliyun";

export interface OssConfig {
  ossStorageMode: OssStorageMode;
  ossPublicBaseUrl: string;
  aliyunOssEndpoint: string;
  aliyunOssBucket: string;
  aliyunOssAccessKeyId: string;
  aliyunOssAccessKeySecret: string;
}

const OSS_SETTING_KEYS = [
  "ossStorageMode",
  "ossPublicBaseUrl",
  "aliyunOssEndpoint",
  "aliyunOssBucket",
  "aliyunOssAccessKeyId",
  "aliyunOssAccessKeySecret",
] as const;

let configCache: { at: number; config: OssConfig } | null = null;
const CACHE_MS = 5000;

async function readSetting(key: string): Promise<string> {
  const row = await u.db("o_setting").where("key", key).first();
  return row?.value?.trim() || "";
}

export async function getOssConfig(): Promise<OssConfig> {
  if (configCache && Date.now() - configCache.at < CACHE_MS) return configCache.config;
  const rows = await u.db("o_setting").whereIn("key", [...OSS_SETTING_KEYS]);
  const map: Record<string, string> = {};
  rows.forEach((r) => {
    if (r.key) map[r.key] = (r.value ?? "").trim();
  });
  const mode = map.ossStorageMode === "aliyun" ? "aliyun" : "local";
  const config: OssConfig = {
    ossStorageMode: mode,
    ossPublicBaseUrl: map.ossPublicBaseUrl || process.env.ossURL?.trim() || "",
    aliyunOssEndpoint: map.aliyunOssEndpoint || "oss-cn-beijing.aliyuncs.com",
    aliyunOssBucket: map.aliyunOssBucket || "",
    aliyunOssAccessKeyId: map.aliyunOssAccessKeyId || "",
    aliyunOssAccessKeySecret: map.aliyunOssAccessKeySecret || "",
  };
  configCache = { at: Date.now(), config };
  return config;
}

export function invalidateOssConfigCache() {
  configCache = null;
}

/** 是否配置了公网可访问基址（ngrok / 阿里云 CDN 域名等） */
export async function hasPublicOssConfigured(): Promise<boolean> {
  const cfg = await getOssConfig();
  if (cfg.ossStorageMode === "aliyun" && cfg.aliyunOssBucket && cfg.aliyunOssAccessKeyId) return true;
  const base = cfg.ossPublicBaseUrl.replace(/\/+$/, "");
  return !!base && !/localhost|127\.0\.0\.1/i.test(base);
}

export async function getPublicOssBaseUrl(): Promise<string> {
  const cfg = await getOssConfig();
  return cfg.ossPublicBaseUrl.replace(/\/+$/, "");
}

export async function resolvePublicFileUrl(userRelPath: string, prefix = "oss"): Promise<string> {
  const safePath = userRelPath.replace(/^[/\\]+/, "").split("\\").join("/");
  const cfg = await getOssConfig();

  if (cfg.ossStorageMode === "aliyun" && cfg.aliyunOssBucket) {
    const endpoint = cfg.aliyunOssEndpoint.replace(/^https?:\/\//, "");
    const base = cfg.ossPublicBaseUrl.replace(/\/+$/, "") || `https://${cfg.aliyunOssBucket}.${endpoint}`;
    return `${base}/${safePath}`;
  }

  const base = cfg.ossPublicBaseUrl.replace(/\/+$/, "");
  if (base) return `${base}/${prefix}/${safePath}`;

  return u.oss.getFileUrl(userRelPath, prefix);
}

function parseBase64Payload(base64: string) {
  const match = base64.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mime: match[1], data: match[2], ext: mimeToExt(match[1]) };
  return { mime: "image/jpeg", data: base64.replace(/^data:[^;]+;base64,/, ""), ext: "jpg" };
}

function mimeToExt(mime: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };
  return map[mime] || "bin";
}

async function uploadToAliyunOss(buffer: Buffer, objectKey: string, contentType: string, cfg: OssConfig): Promise<string> {
  const endpoint = cfg.aliyunOssEndpoint.replace(/^https?:\/\//, "");
  const bucket = cfg.aliyunOssBucket;
  const date = new Date().toUTCString();
  const resource = `/${bucket}/${objectKey}`;
  const stringToSign = `PUT\n\n${contentType}\n${date}\n${resource}`;
  const signature = crypto.createHmac("sha1", cfg.aliyunOssAccessKeySecret).update(stringToSign).digest("base64");
  const url = `https://${bucket}.${endpoint}/${objectKey}`;
  await axios.put(url, buffer, {
    headers: {
      "Content-Type": contentType,
      Date: date,
      Authorization: `OSS ${cfg.aliyunOssAccessKeyId}:${signature}`,
    },
    maxBodyLength: Infinity,
    timeout: 120000,
  });
  const publicBase = cfg.ossPublicBaseUrl.replace(/\/+$/, "") || `https://${bucket}.${endpoint}`;
  return `${publicBase}/${objectKey}`;
}

/** 预检公网 URL 可被上游拉取（非 ngrok 警告页） */
export async function preflightPublicUrl(url: string, kind: "image" | "video"): Promise<void> {
  if (!/^https?:\/\//i.test(url)) throw new Error("参考素材 URL 无效");
  if (/localhost|127\.0\.0\.1/i.test(url)) {
    throw new Error("参考素材仍为 localhost，请配置 ossPublicBaseUrl（ngrok）或阿里云 OSS，并重启应用");
  }
  try {
    const resp = await axios.head(url, {
      timeout: 15000,
      maxRedirects: 3,
      validateStatus: (s) => s < 500,
      headers: { "ngrok-skip-browser-warning": "1", "User-Agent": "Toonflow/1.0" },
    });
    const ct = String(resp.headers["content-type"] || "").toLowerCase();
    if (ct.includes("text/html")) {
      throw new Error("公网 URL 返回 HTML（可能是 ngrok 警告页），请检查隧道域名或使用阿里云 OSS");
    }
    const expect = kind === "video" ? "video" : "image";
    if (ct && !ct.includes(expect) && !ct.includes("octet-stream")) {
      imageUrlLog("URL预检警告", { url: url.slice(0, 120), contentType: ct, kind });
    }
  } catch (e: any) {
    const msg = e?.response?.status ? `HTTP ${e.response.status}` : e?.message || "不可达";
    throw new Error(`参考素材公网 URL 预检失败: ${msg}`);
  }
}

/** 上传参考素材并返回公网 URL（供 Agnes / HF 等上游拉取） */
export async function uploadReferenceAsset(base64: string, kind: "image" | "video"): Promise<string> {
  if (/^https?:\/\//i.test(base64)) {
    await preflightPublicUrl(base64, kind);
    return base64;
  }

  const cfg = await getOssConfig();
  const { mime, data, ext } = parseBase64Payload(base64);
  const fileExt = kind === "video" ? (ext === "bin" ? "mp4" : ext) : ext;
  const hash = crypto.createHash("sha256").update(data.slice(0, 512) + String(data.length)).digest("hex").slice(0, 20);
  const objectKey = `vendor-temp/${kind}/${hash}.${fileExt}`;
  const buffer = Buffer.from(data, "base64");

  let url: string;
  if (cfg.ossStorageMode === "aliyun" && cfg.aliyunOssBucket && cfg.aliyunOssAccessKeyId && cfg.aliyunOssAccessKeySecret) {
    url = await uploadToAliyunOss(buffer, objectKey, mime, cfg);
    imageUrlLog("阿里云上传", { objectKey, url: url.slice(0, 120), kind });
  } else {
    await u.oss.writeFile(objectKey, buffer);
    url = await resolvePublicFileUrl(objectKey);
    imageUrlLog("本地OSS上传", { objectKey, url: url.slice(0, 120), kind });
    if (/localhost|127\.0\.0\.1/i.test(url)) {
      throw new Error("未配置公网 ossPublicBaseUrl，上游无法访问 localhost。请在设置中填写 ngrok 地址或切换阿里云 OSS");
    }
  }

  await preflightPublicUrl(url, kind);
  return url;
}

export async function upsertOssSettings(body: Partial<OssConfig>) {
  const upsert = async (key: string, value: string) => {
    const exists = await u.db("o_setting").where("key", key).first();
    if (exists) await u.db("o_setting").where("key", key).update({ value });
    else await u.db("o_setting").insert({ key, value });
  };
  if (body.ossStorageMode !== undefined) await upsert("ossStorageMode", body.ossStorageMode);
  if (body.ossPublicBaseUrl !== undefined) await upsert("ossPublicBaseUrl", body.ossPublicBaseUrl.replace(/\/+$/, ""));
  if (body.aliyunOssEndpoint !== undefined) await upsert("aliyunOssEndpoint", body.aliyunOssEndpoint);
  if (body.aliyunOssBucket !== undefined) await upsert("aliyunOssBucket", body.aliyunOssBucket);
  if (body.aliyunOssAccessKeyId !== undefined) await upsert("aliyunOssAccessKeyId", body.aliyunOssAccessKeyId);
  if (body.aliyunOssAccessKeySecret !== undefined && body.aliyunOssAccessKeySecret !== "")
    await upsert("aliyunOssAccessKeySecret", body.aliyunOssAccessKeySecret);
  invalidateOssConfigCache();
}

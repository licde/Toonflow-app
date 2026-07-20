import axios from "axios";
import crypto from "node:crypto";
import u from "@/utils";
import type { AssetPort } from "./index";

function normalizeDataUrl(base64: string): { dataUrl: string; ext: string } {
  if (/^https?:\/\//i.test(base64)) {
    throw new Error("uploadReferenceAsset 期望 base64/dataURL，若已是公网 URL 请直接使用 preflightPublicUrl");
  }
  if (base64.startsWith("data:")) {
    const m = base64.match(/^data:([^;]+);base64,/i);
    const mime = m?.[1] ?? "image/jpeg";
    const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("mp4") ? "mp4" : "jpg";
    return { dataUrl: base64, ext };
  }
  return { dataUrl: `data:image/jpeg;base64,${base64}`, ext: "jpg" };
}

function requirePublicOssUrl(): string {
  const base = (process.env.ossURL ?? "").trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error(
      "参考图需要公网 URL：请设置环境变量 ossURL（如 https://xxxx.ngrok-free.dev），并确保 ngrok 转发到本机服务端口",
    );
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(base)) {
    throw new Error(`ossURL 指向本机 ${base}，Agnes 无法访问；请改为公网域名（ngrok/CDN）`);
  }
  return base;
}

export function createAssetPort(): AssetPort {
  return {
    async uploadReferenceAsset(localPathOrBase64: string): Promise<string> {
      // Agnes vendor passes base64/dataURL; keep name for Port interface compatibility
      requirePublicOssUrl();
      const { dataUrl, ext } = normalizeDataUrl(localPathOrBase64);
      const rel = `_refs/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
      await u.oss.writeFile(rel, dataUrl);
      return u.oss.getFileUrl(rel);
    },

    async preflightPublicUrl(url: string): Promise<boolean> {
      if (!/^https?:\/\//i.test(url)) {
        throw new Error(`preflightPublicUrl 需要 http(s) URL，收到: ${url.slice(0, 80)}`);
      }
      if (/localhost|127\.0\.0\.1/i.test(url)) {
        throw new Error(`参考素材 URL 为本机地址，Agnes 无法拉取: ${url}`);
      }
      try {
        const res = await axios.head(url, {
          timeout: 15000,
          maxRedirects: 5,
          validateStatus: (s) => s >= 200 && s < 500,
          headers: {
            // ngrok free intermittent browser interstitial
            "ngrok-skip-browser-warning": "true",
            "User-Agent": "Toonflow-AssetPort/1.0",
          },
        });
        if (res.status >= 400) {
          // some OSS only allow GET
          const get = await axios.get(url, {
            timeout: 20000,
            responseType: "arraybuffer",
            maxRedirects: 5,
            headers: {
              "ngrok-skip-browser-warning": "true",
              "User-Agent": "Toonflow-AssetPort/1.0",
              Range: "bytes=0-0",
            },
            validateStatus: (s) => s >= 200 && s < 400,
          });
          return get.status < 400;
        }
        return true;
      } catch (e: any) {
        throw new Error(`参考素材公网预检失败 (${url.slice(0, 120)}): ${e?.message ?? e}`);
      }
    },
  };
}

/** Shared singleton used by VM sandbox injection. */
export const assetPort: AssetPort = createAssetPort();

/** Agnes vendor signature: (base64, kind) => url */
export async function uploadReferenceAsset(base64: string, _kind: "image" | "video" = "image"): Promise<string> {
  return assetPort.uploadReferenceAsset(base64);
}

export async function preflightPublicUrl(url: string, _kind?: "image" | "video"): Promise<void> {
  await assetPort.preflightPublicUrl(url);
}

export function hasOssUrlConfigured(): boolean {
  return Boolean((process.env.ossURL ?? "").trim());
}

export function buildPublicOssFileUrl(relPath: string): string {
  const base = requirePublicOssUrl();
  const prefix = "oss";
  const rel = relPath.replace(/^[/\\]+/, "").split("\\").join("/");
  return `${base}/${prefix}/${rel}`;
}

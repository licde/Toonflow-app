import fs from "node:fs";
import path from "node:path";
import getPath from "@/utils/getPath";

const LOG_FILE = () => path.join(getPath("logs"), "image-url.log");

function ensureLogDir() {
  const dir = path.dirname(LOG_FILE());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function imageUrlLog(phase: string, data: Record<string, unknown>) {
  try {
    ensureLogDir();
    const line = `${new Date().toISOString()} [图片外链][${phase}] ${JSON.stringify(data)}\n`;
    fs.appendFileSync(LOG_FILE(), line, "utf8");
  } catch {
    // 日志失败不阻断主流程
  }
}

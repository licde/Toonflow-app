import fs from "fs";
import path from "path";
import { transform } from "sucrase";
import u from "@/utils";

const vmCache = new Map<string, { mtimeMs: number; exports: Record<string, any> }>();

function compileVendor(code: string, vendor?: Record<string, any>) {
  const jsCode = transform(code, { transforms: ["typescript"] }).code;
  return u.vm(jsCode, vendor);
}

function getCodeMtime(id: string): number {
  const targetFile = path.join(u.getPath("vendor"), `${id}.ts`);
  if (!fs.existsSync(targetFile)) return 0;
  return fs.statSync(targetFile).mtimeMs;
}

function getCachedExports(id: string, code: string, vendor?: Record<string, any>) {
  const mtimeMs = getCodeMtime(id);
  const cached = vmCache.get(id);
  if (cached && cached.mtimeMs === mtimeMs && !vendor) return cached.exports;
  const exports = compileVendor(code, vendor);
  if (!vendor) vmCache.set(id, { mtimeMs, exports });
  return exports;
}

export function writeCode(id: string | number, tsCode: string) {
  const rootDir = u.getPath("vendor");
  fs.mkdirSync(rootDir, { recursive: true });
  fs.writeFileSync(path.join(rootDir, `${id}.ts`), tsCode);
  vmCache.delete(String(id));
}

export function getCode(id: string): string {
  const rootDir = u.getPath("vendor");
  const targetFile = path.join(rootDir, `${id}.ts`);
  if (!fs.existsSync(targetFile)) return "";
  return fs.readFileSync(targetFile, "utf-8");
}

export async function getModelList(id: string): Promise<Array<any>> {
  const models = await u.db("o_vendorConfig").where("id", id).select("models").first();
  if (!models || !models.models) return [];
  const code = getCode(id);
  const vendorData = getCachedExports(id, code);
  if (!vendorData || !vendorData.vendor || !vendorData.vendor.models) return [];
  const combined = [...JSON.parse(JSON.stringify(vendorData.vendor.models)), ...JSON.parse(models?.models ?? "[]")];
  const map = new Map<string, any>();
  for (const m of combined) {
    map.set(m.modelName, m);
  }
  return [...map.values()];
}

export function getVendor(id: string) {
  const code = getCode(id);
  const vendorData = getCachedExports(id, code);
  return vendorData.vendor;
}

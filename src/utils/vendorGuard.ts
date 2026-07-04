import { z } from "zod";
import u from "@/utils";

export async function assertVendorReady(vendorId: string, minVersion = 0) {
  if (vendorId === "null") {
    throw new Error("当前为占位供应商 null，请在设置中启用 HuggingFace / Agnes 等真实供应商");
  }
  try {
    const v = u.vendor.getVendor(vendorId);
    const ver = Number(v?.version) || 0;
    if (minVersion > 0 && ver < minVersion) {
      throw new Error(`供应商 ${vendorId} 版本过旧(v${v?.version})，请重启应用自动升级或手动刷新供应商`);
    }
  } catch (e: any) {
    if (e?.message?.includes("版本过旧") || e?.message?.includes("占位")) throw e;
    throw new Error(`供应商 ${vendorId} 未安装，请先在供应商设置中启用`);
  }
}

export const vendorGuard = {
  huggingface: () => assertVendorReady("huggingface", 1.4),
  agnesai: () => assertVendorReady("agnesai", 2.6),
};

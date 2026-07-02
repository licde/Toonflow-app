import { v4 as uuidv4 } from "uuid";
import type { NormalizedError } from "@/utils/error";

export interface GenLogContext {
  traceId?: string;
  vendorId?: string;
  model?: string;
  taskClass?: string;
  assetId?: string | number;
  phase: string;
  message: string;
  httpStatus?: number;
}

export function genLog(ctx: GenLogContext): string {
  const traceId = ctx.traceId || uuidv4();
  const line = {
    traceId,
    vendorId: ctx.vendorId,
    model: ctx.model,
    taskClass: ctx.taskClass,
    assetId: ctx.assetId,
    phase: ctx.phase,
    message: ctx.message,
    httpStatus: ctx.httpStatus,
    at: new Date().toISOString(),
  };
  console.error("[GenLog]", JSON.stringify(line));
  return traceId;
}

export function sanitizeErrorDetail(normalized: NormalizedError) {
  let responseData: unknown = normalized.responseData;
  if (typeof responseData === "string" && responseData.length > 2000) {
    responseData = responseData.slice(0, 2000) + "...[truncated]";
  } else if (responseData && typeof responseData === "object") {
    try {
      const str = JSON.stringify(responseData);
      if (str.length > 2000) responseData = str.slice(0, 2000) + "...[truncated]";
    } catch {
      responseData = "[unserializable]";
    }
  }
  return {
    message: normalized.message,
    status: normalized.status,
    code: normalized.code,
    meta: normalized.meta,
    responseData,
  };
}

import { findAllOrphanRefs, loadTrackRefSlots } from "./refSlotBuilder";
import { resolveVideoPromptRoute } from "./videoPromptUtils";

type UploadInfo = { id: number; sources: string };

export type ContractValidationInput = {
  model: string;
  mode: string;
  duration: number;
  resolution: string;
  audio?: boolean;
};

export type ContractValidationResult =
  | { ok: true }
  | { ok: false; code: string; message: string; details?: Record<string, unknown> };

export type PromptRefValidationResult =
  | { ok: true; refSlotsCount: number }
  | { ok: false; code: string; message: string; details?: Record<string, unknown> };

export async function validatePromptRefsAgainstTrack(opts: {
  trackId: number;
  prompt: string;
}): Promise<PromptRefValidationResult> {
  const refSlots = await loadTrackRefSlots(opts.trackId);
  const orphanRefs = findAllOrphanRefs(opts.prompt, refSlots.length, refSlots);
  if (orphanRefs.length) {
    return {
      ok: false,
      code: "PROMPT_REF_MISMATCH",
      message: "提示词引用与参考条带不一致",
      details: { orphanRefs, refSlotsCount: refSlots.length },
    };
  }
  return { ok: true, refSlotsCount: refSlots.length };
}

export function validateVideoContract(input: ContractValidationInput): ContractValidationResult {
  const [vendorId, modelName = ""] = String(input.model || "").split(/:(.+)/);
  const route = resolveVideoPromptRoute(modelName, input.mode);
  const allowedResolution = ["720p", "1080p"];
  if (!allowedResolution.includes(String(input.resolution))) {
    return {
      ok: false,
      code: "VIDEO_RESOLUTION_UNSUPPORTED",
      message: "分辨率不在支持范围内",
      details: { resolution: input.resolution, allowedResolution },
    };
  }

  if (!Number.isFinite(input.duration) || input.duration < 1 || input.duration > 30) {
    return {
      ok: false,
      code: "VIDEO_DURATION_OUT_OF_RANGE",
      message: "时长不在支持范围内（1-30秒）",
      details: { duration: input.duration, min: 1, max: 30 },
    };
  }

  if (vendorId === "agnesai" && route.isMultiParam && input.mode === "text" && input.duration > 15) {
    return {
      ok: false,
      code: "VIDEO_MODE_DURATION_CONFLICT",
      message: "当前文本模式下建议时长不超过15秒，请改为单图/首尾帧模式或缩短时长",
      details: { mode: input.mode, route: route.modeLabel, duration: input.duration },
    };
  }

  return { ok: true };
}

export function buildPromptSourceTag(model: string, mode: string, prompt: string, refSlotsCount: number): string {
  const [, modelName = ""] = String(model || "").split(/:(.+)/);
  const route = resolveVideoPromptRoute(modelName, mode);
  const promptLen = prompt?.length ?? 0;
  return `ai|route=${route.modeLabel}|mode=${mode}|refs=${refSlotsCount}|plen=${promptLen}`;
}

export function parsePromptSourceTag(promptSource?: string): Record<string, string> {
  const source = String(promptSource || "");
  if (!source.startsWith("ai|")) return {};
  const payload = source.slice(3);
  const entries = payload.split("|").map((kv) => kv.split("=")).filter((parts) => parts.length === 2);
  const out: Record<string, string> = {};
  for (const [k, v] of entries) out[k] = v;
  return out;
}


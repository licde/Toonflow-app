import type { ModelCapabilities } from "./types";

const AGNES_CAPS: ModelCapabilities = {
  vendorId: "agnesai",
  imageModel: "agnes-image-2.1-flash",
  videoModel: "agnes-video-v2.0",
  minDuration: 1,
  maxDuration: 30,
  supportsAudio: true,
  supportsStartEnd: true,
};

const DEFAULT_CAPS: ModelCapabilities = {
  vendorId: "default",
  imageModel: "agnes-image-2.1-flash",
  videoModel: "agnes-video-v2.0",
  minDuration: 3,
  maxDuration: 30,
  supportsAudio: false,
  supportsStartEnd: false,
};

export function getModelCapabilities(imageModel?: string, videoModel?: string): ModelCapabilities {
  const vendor = imageModel?.split(":")[0] ?? videoModel?.split(":")[0] ?? "agnesai";
  const caps = vendor === "agnesai" ? { ...AGNES_CAPS } : { ...DEFAULT_CAPS, vendorId: vendor };
  if (imageModel) caps.imageModel = imageModel.split(/:(.+)/)[1] ?? caps.imageModel;
  if (videoModel) caps.videoModel = videoModel.split(/:(.+)/)[1] ?? caps.videoModel;
  return caps;
}

export function supportsCapability(caps: ModelCapabilities, key: "audio" | "startEnd" | "duration30"): boolean {
  if (key === "audio") return caps.supportsAudio;
  if (key === "startEnd") return caps.supportsStartEnd;
  return caps.maxDuration >= 30;
}

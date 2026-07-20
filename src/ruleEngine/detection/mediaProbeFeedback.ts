import { mediaProbePort } from "../ports/mediaProbe";

export interface MediaProbeFeedback {
  durationSec?: number;
  hasAudio?: boolean;
  gc06Pass?: boolean;
  gc07Pass?: boolean;
  message?: string;
}

export async function probeMediaFile(localPath: string): Promise<MediaProbeFeedback> {
  const durationSec = await mediaProbePort.probeDuration(localPath);
  const hasAudio = await mediaProbePort.probeHasAudio(localPath);
  const gc06Pass = durationSec > 0;
  const gc07Pass = hasAudio;
  return {
    durationSec,
    hasAudio,
    gc06Pass,
    gc07Pass,
    message: !gc06Pass ? "GC-06: 无法探测时长" : !gc07Pass ? "GC-07: 无音轨" : undefined,
  };
}

export async function probeOssVideoPath(ossPath: string): Promise<MediaProbeFeedback | undefined> {
  if (!ossPath) return undefined;
  try {
    const getPath = (await import("@/utils/getPath")).default;
    const path = await import("node:path");
    const root = getPath("oss");
    const rel = String(ossPath).replace(/^[/\\]+/, "").replace(/^oss[/\\]/i, "");
    const local = path.join(root, rel);
    return await probeMediaFile(local);
  } catch {
    return undefined;
  }
}

/**
 * Mirror / reflection anti-warp helpers for video prompts + geometry intent flags.
 */
const MIRROR_MARK = /镜中|镜面|铜镜|倒影|mirror|reflection|looking\s*into\s*(a\s*)?mirror/i;

export function hasMirrorIntent(text?: string | null): boolean {
  return MIRROR_MARK.test(String(text ?? ""));
}

export const MIRROR_ANTI_WARP =
  "mirror reflection geometry stable, no warped face, reflection matches subject identity, no funhouse distortion";

export function injectMirrorAntiWarp(prompt: string, visualDescription?: string | null): {
  prompt: string;
  applied: boolean;
  geometry?: "mirror";
} {
  const src = `${prompt}\n${visualDescription ?? ""}`;
  if (!hasMirrorIntent(src)) return { prompt, applied: false };
  if (/no warped face|funhouse|mirror reflection geometry/i.test(prompt)) {
    return { prompt, applied: true, geometry: "mirror" };
  }
  let next = prompt;
  if (/\[Motion\]/i.test(next)) {
    next = next.replace(/(\[Motion\][^\[]*)/i, (m) => `${m.trim()}\n${MIRROR_ANTI_WARP}`);
  } else {
    next = `${next.trim()}\n${MIRROR_ANTI_WARP}`;
  }
  return { prompt: next, applied: true, geometry: "mirror" };
}

export function mirrorWarpFinding(input: {
  videoPrompt?: string;
  visualDescription?: string;
  frameFlags?: { mirrorDistort?: boolean };
}): { id: "MIRROR-WARP"; severity: "WARN" | "BLOCK"; message: string } | null {
  if (input.frameFlags?.mirrorDistort) {
    return {
      id: "MIRROR-WARP",
      severity: "BLOCK",
      message: "抽帧检测镜面变形，请加强 anti-warp 或回 SB 改描写",
    };
  }
  const src = `${input.videoPrompt ?? ""}\n${input.visualDescription ?? ""}`;
  if (hasMirrorIntent(src) && !/no warped face|mirror reflection geometry/i.test(input.videoPrompt ?? "")) {
    return {
      id: "MIRROR-WARP",
      severity: "WARN",
      message: "镜/倒影镜缺 anti-warp 约束",
    };
  }
  return null;
}

import type { StructuredShot } from "./types";

const TRACKED_PATHS = [
  "dialogue.text",
  "dialogue.type",
  "visualEffect.content",
  "visualEffect.type",
  "imagePrompt",
  "videoPrompt",
  "assetCodes",
  "time",
  "shotType",
  "cameraAngle",
  "colorTone",
  "performance",
  "effectStack",
  "transitionType",
  "sceneName",
  "visualId",
] as const;

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function stable(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function diffShotFields(before: StructuredShot, after: StructuredShot): string[] {
  const changed: string[] = [];
  const beforeObj = before as unknown as Record<string, unknown>;
  const afterObj = after as unknown as Record<string, unknown>;
  for (const path of TRACKED_PATHS) {
    if (stable(getByPath(beforeObj, path)) !== stable(getByPath(afterObj, path))) {
      changed.push(path);
    }
  }
  return changed;
}

export function inferImpact(changedFields: string[], imageChanged: boolean, videoChanged: boolean): "image" | "video" | "both" {
  const imageFields = new Set(["imagePrompt", "assetCodes", "colorTone", "shotType", "cameraAngle", "visualEffect.content", "visualEffect.type", "dialogue.text", "performance", "sceneName", "visualId"]);
  const videoFields = new Set(["videoPrompt", "dialogue.text", "dialogue.type", "time", "transitionType", "effectStack", "performance"]);
  const hitsImage = changedFields.some((f) => imageFields.has(f));
  const hitsVideo = changedFields.some((f) => videoFields.has(f));
  if (imageChanged || videoChanged) {
    if (imageChanged && videoChanged) return "both";
    if (imageChanged) return "image";
    if (videoChanged) return "video";
  }
  if (hitsImage && hitsVideo) return "both";
  if (hitsImage) return "image";
  if (hitsVideo) return "video";
  return "both";
}

export function buildRecommendationReason(changedFields: string[], handlers?: Record<string, unknown>): string {
  const parts: string[] = [];
  if (changedFields.includes("dialogue.text") || changedFields.includes("visualEffect.content")) {
    parts.push("文本载体字段变更");
  }
  if (changedFields.includes("imagePrompt") || changedFields.includes("assetCodes")) {
    parts.push("画面/资产引用变更");
  }
  if (changedFields.includes("videoPrompt") || changedFields.includes("time")) {
    parts.push("视频节奏或动作描述变更");
  }
  if (handlers && Object.keys(handlers).length) {
    parts.push(`规则命中: ${Object.keys(handlers).join(", ")}`);
  }
  return parts.length ? parts.join("；") : "编译哈希变化";
}

export function shotReferenceSummary(shot: StructuredShot) {
  const vfx = shot.visualEffect as Record<string, unknown> | undefined;
  return {
    sceneName: shot.sceneName,
    shotType: shot.shotType,
    type: shot.type,
    dialogue: shot.dialogue,
    visualEffect: vfx ? { type: vfx.type, content: vfx.content, style: vfx.style } : null,
    videoDescParts: {
      visualFocus: shot.visualFocus,
      performance: shot.performance,
    },
  };
}

import type { StructuredScriptJson, StructuredShot } from "./types";
import { compileImage, compileVideo } from "../generationContext/PromptCompiler";
import { runQualityGate } from "../generationContext/QualityGate";
import { routeModels } from "../generationContext/ModelRouter";
import { getAssetIdsByStoryboard, resolveReferenceImages } from "./assetResolver";

export interface ValidationIssue {
  field: string;
  code: string;
  severity: "error" | "warning";
  message: string;
}

export async function validateStructuredShot(opts: {
  shot: StructuredShot;
  json?: StructuredScriptJson | null;
  episodeIndex?: number;
  target?: "image" | "video" | "both";
  projectId?: number;
  storyboardId?: number;
}) {
  const { shot, json, episodeIndex = 0, target = "both", projectId, storyboardId } = opts;
  const issues: ValidationIssue[] = [];
  const ep = json?.episodes?.[episodeIndex];

  if (!shot.imagePrompt && !shot.videoPrompt && !shot.dialogue?.text && !shot.visualEffect) {
    issues.push({
      field: "imagePrompt",
      code: "PROMPT_MISSING",
      severity: "error",
      message: "缺少可编译的画面描述（imagePrompt / dialogue / visualEffect）",
    });
  }

  const vfx = shot.visualEffect as Record<string, unknown> | undefined;
  if (shot.type === "PURE-PROP" && !shot.dialogue?.text && !vfx?.content) {
    issues.push({
      field: "visualEffect.content",
      code: "TEXT_MISSING",
      severity: "warning",
      message: "道具镜建议提供 dialogue.text 或 visualEffect.content",
    });
  }

  const compileCtx = json ? { json, episode: ep } : { json: { episodes: [{ storyboard: [shot] }] } as StructuredScriptJson, episode: { storyboard: [shot] } as any };
  const img = compileImage(shot, compileCtx);
  const vid = compileVideo(shot, compileCtx);
  const route = json ? routeModels(shot, { imageModel: "agnesai:agnes-image-2.1-flash", videoModel: "agnesai:agnes-video-v2.0" }, { productLayer: ep?.productLayer as Record<string, unknown> }) : null;

  let hasReferenceImages = false;
  if (projectId && storyboardId) {
    const assetIds = await getAssetIdsByStoryboard(storyboardId);
    const refs = await resolveReferenceImages(assetIds);
    hasReferenceImages = refs.length > 0;
  } else {
    hasReferenceImages = (shot.assetCodes?.length ?? 0) > 0;
  }

  const gate = runQualityGate({ shot, prompt: img.prompt, hasReferenceImages });
  if (!gate.passed) {
    for (const msg of gate.issues) {
      issues.push({ field: "prompt", code: "QUALITY_GATE", severity: "warning", message: msg });
    }
  }

  const compilePreview: Record<string, unknown> = {};
  if (target === "image" || target === "both") {
    compilePreview.image = {
      prompt: img.prompt,
      duration: img.duration,
      aspectRatio: img.aspectRatio,
      referenceAssetCodes: img.referenceAssetCodes,
      compileLog: img.compileLog,
      postTasksCount: img.postTasks.length,
    };
  }
  if (target === "video" || target === "both") {
    compilePreview.video = {
      prompt: vid.prompt,
      duration: vid.duration,
      mode: vid.mode,
      audio: vid.audio,
      compileLog: vid.compileLog,
      postTasksCount: vid.postTasks.length,
    };
  }

  return {
    passed: !issues.some((i) => i.severity === "error"),
    issues,
    compilePreview,
    explain: {
      route,
      qualityGate: gate,
      effectStack: { image: img.effectStack, video: vid.effectStack },
      handlers: {
        image: img.compileLog.handlers,
        video: vid.compileLog.handlers,
      },
    },
  };
}

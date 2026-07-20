import type { PreDesignShot } from "./types";

/** Optional enrich: compile shotDesign fields into prompt fragments (audit roundtrip helper). */
export function compileFromShotDesign(shot: PreDesignShot): { imagePrompt?: string; videoPrompt?: string } {
  const sd = shot.shotDesign;
  if (!sd) return {};

  const comp = sd.composition as { foreground?: string; background?: string; anchor?: string; depthOfField?: string } | undefined;
  const perf = sd.performance as { microExpression?: { eyes?: string; mouthDetail?: string }; emotionAction?: string } | undefined;
  const cam = sd.cameraAnchor as { shotSize?: string; angle?: string; bgBlur?: boolean } | undefined;
  const blocking = Array.isArray(sd.blocking) ? sd.blocking[0] as { bodyAction?: string } | undefined : undefined;

  const imgParts = [
    blocking?.bodyAction ?? comp?.foreground ?? shot.visualDescription,
    comp?.background ?? shot.sceneName,
    cam?.shotSize,
    cam?.angle,
    comp?.depthOfField === "shallow" || cam?.bgBlur ? "bokeh background" : undefined,
    perf?.microExpression?.eyes ? `eyes ${perf.microExpression.eyes}` : undefined,
    perf?.microExpression?.mouthDetail ? `mouth ${perf.microExpression.mouthDetail}` : undefined,
  ].filter(Boolean);

  const lip = (sd as { lipSyncPolicy?: string }).lipSyncPolicy;
  const vidParts = [
    cam?.shotSize ? `${cam.shotSize} static` : "medium shot static",
    "slow push 2s",
    shot.duration ? `duration ${shot.duration}s` : undefined,
    lip === "subtle_natural" ? "subtle lip sync, natural mouth movement, no exaggerated mouth" : "lipSync off",
    "motion-from-frame",
  ].filter(Boolean);

  return {
    imagePrompt: imgParts.join(", "),
    videoPrompt: vidParts.join(", "),
  };
}

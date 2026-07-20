import type { ScriptBundle, PreDesignShot } from "./types";
import type { BundleGap } from "./auditTypes";

function shotWords(shot: PreDesignShot): string {
  const sd = shot.shotDesign as {
    composition?: { foreground?: string; background?: string };
    performance?: { microExpression?: { eyes?: string; mouthDetail?: string } };
    cameraAnchor?: { bgBlur?: boolean };
  } | undefined;
  const parts = [
    shot.visualDescription,
    sd?.composition?.foreground,
    sd?.composition?.background,
    sd?.performance?.microExpression?.eyes,
    sd?.performance?.microExpression?.mouthDetail,
  ].filter(Boolean);
  return parts.join(" ").toLowerCase();
}

export function auditGenerationApplyGaps(bundle: ScriptBundle, tier: "T1" | "T2" | "T3" = "T3"): BundleGap[] {
  if (tier === "T1") return [];
  const gaps: BundleGap[] = [];
  const shots = bundle.preDesignPack?.shots ?? [];

  shots.forEach((shot, i) => {
    const idx = shot.shotIndex ?? i + 1;
    const emotion = shot.narrative?.emotionIntensity ?? shot.emotion ?? 0;
    const sd = shot.shotDesign;
    const gen = shot.generation;
    const hasDialogue = (shot.narrative?.dialogue?.lines?.length ?? 0) > 0;

    if (emotion >= 4 && !sd?.performance) {
      gaps.push({
        id: "GEN-01",
        severity: "WARN",
        message: "高情绪镜缺 shotDesign.performance",
        chainId: "generation_apply",
        trigger: "generation_design_drift",
        field: "shotDesign.performance",
        shotIndex: idx,
      });
    }

    const img = gen?.imagePrompt?.toLowerCase() ?? "";
    const vd = shot.visualDescription?.toLowerCase() ?? "";
    if (vd && img && !img.includes(vd.slice(0, Math.min(4, vd.length)))) {
      const fg = (sd?.composition as { foreground?: string })?.foreground?.toLowerCase();
      if (!fg || !img.includes(fg.slice(0, Math.min(4, fg.length)))) {
        gaps.push({
          id: "GEN-05",
          severity: "WARN",
          message: "visualDescription 与 imagePrompt 明显不一致",
          chainId: "generation_apply",
          trigger: "generation_design_drift",
          field: "generation.imagePrompt",
          shotIndex: idx,
        });
      }
    }

    const micro = (sd?.performance as { microExpression?: { eyes?: string; mouthDetail?: string } })?.microExpression;
    if (micro?.eyes && img && !img.includes("眼") && !img.includes(micro.eyes.split("_")[0])) {
      gaps.push({
        id: "GEN-06",
        severity: "WARN",
        message: "microExpression 未进 imagePrompt",
        chainId: "generation_apply",
        trigger: "generation_design_drift",
        field: "generation.imagePrompt",
        shotIndex: idx,
      });
    }

    const bgBlur = (sd?.cameraAnchor as { bgBlur?: boolean })?.bgBlur;
    if (bgBlur && img && !/blur|bokeh|景深/.test(img)) {
      gaps.push({
        id: "GEN-03",
        severity: "WARN",
        message: "bgBlur=true 但 imagePrompt 无 blur/bokeh",
        chainId: "generation_apply",
        trigger: "generation_design_drift",
        field: "generation.imagePrompt",
        shotIndex: idx,
      });
    }

    const lipPolicy = (sd as { lipSyncPolicy?: string })?.lipSyncPolicy;
    const vid = gen?.videoPrompt?.toLowerCase() ?? "";
    if (hasDialogue && lipPolicy === "subtle_natural" && vid && !/subtle|natural mouth/.test(vid)) {
      gaps.push({
        id: "GEN-04",
        severity: "WARN",
        message: "lipSyncPolicy=subtle_natural 但 videoPrompt 缺 subtle mouth",
        chainId: "generation_apply",
        trigger: "generation_design_drift",
        field: "generation.videoPrompt",
        shotIndex: idx,
      });
    }

    if ((tier === "T2" || tier === "T3") && !gen?.imagePrompt?.trim()) {
      gaps.push({
        id: "GEN-07",
        severity: "WARN",
        message: "缺 generation.imagePrompt",
        chainId: "generation_apply",
        trigger: "generation_design_drift",
        field: "generation.imagePrompt",
        shotIndex: idx,
      });
    }
    if (tier === "T3" && !gen?.videoPrompt?.trim()) {
      gaps.push({
        id: "GEN-07",
        severity: "WARN",
        message: "缺 generation.videoPrompt",
        chainId: "generation_apply",
        trigger: "generation_design_drift",
        field: "generation.videoPrompt",
        shotIndex: idx,
      });
    }

    const words = shotWords(shot);
    if (sd?.blocking && Array.isArray(sd.blocking) && sd.blocking.length && img) {
      const pos = (sd.blocking[0] as { position?: string }).position;
      if (pos && !img.includes(pos.split("_")[0])) {
        gaps.push({
          id: "GEN-02",
          severity: "WARN",
          message: "blocking 站位未进 imagePrompt",
          chainId: "generation_apply",
          trigger: "generation_design_drift",
          field: "generation.imagePrompt",
          shotIndex: idx,
        });
      }
    }
    void words;
  });

  return gaps;
}

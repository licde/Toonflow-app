import type { ScriptBundle } from "../types";
import { prepareBundleWithLog } from "../bundleShapePipeline";
import { parsePromptRefs, touchPromptForVendor } from "../../compilers/vendorPromptAdapter";
import { normalizeStateVariants } from "../normalizeCharacterDesign";
import { generationFeedbackPort } from "../../ports/generationFeedback";
import { RuntimeGapCollector } from "../runtimeGapRegistry";
import type { MatrixExpect } from "./runSemanticMatrix";

/** Dimension E (bundle-level): prompts + derive shape before/without DB. */
export async function runPromptDeriveMatrixOnBundle(
  raw: Record<string, unknown>,
  expect: MatrixExpect,
  gaps: RuntimeGapCollector,
): Promise<ScriptBundle> {
  const prepared = prepareBundleWithLog(raw);
  const bundle = prepared.bundle as unknown as ScriptBundle;
  const shots = bundle.preDesignPack?.shots ?? [];

  if (shots.length < expect.shots) {
    gaps.push("E", "PROMPT-IMG-EMPTY", `shots ${shots.length} < expect ${expect.shots}`);
  }

  for (const shot of shots) {
    const idx = shot.shotIndex ?? "?";
    const gen = shot.generation ?? {};
    const imagePrompt = (gen.imagePrompt ?? "").trim();
    const videoPrompt = (gen.videoPrompt ?? (shot as { videoDesc?: string }).videoDesc ?? "").trim();

    if (expect.promptCompile.image === "required" && !imagePrompt) {
      gaps.push("E", "PROMPT-IMG-EMPTY", `镜${idx} imagePrompt 空`);
    }
    if (expect.promptCompile.video === "required" && !videoPrompt) {
      gaps.push("E", "PROMPT-VID-EMPTY", `镜${idx} videoPrompt/videoDesc 空`);
    }

    // PROMPT-AUD / PROMPT-FX — registry slots now exercised (dialogue ⇒ need audio; F1+ ⇒ need fx prose)
    const dialLines =
      (shot.narrative as { dialogue?: { lines?: unknown[] } } | undefined)?.dialogue?.lines ?? [];
    const hasDial = Array.isArray(dialLines) && dialLines.length > 0;
    const audioPrompt = String((gen as { audioPrompt?: string }).audioPrompt ?? "").trim();
    const audioSection = /\[Audio\]/i.test(videoPrompt);
    if (hasDial && !audioPrompt && !audioSection) {
      const lip = String(
        (shot as { lipSyncPolicy?: string }).lipSyncPolicy ??
          (shot.shotDesign as { lipSyncPolicy?: string } | undefined)?.lipSyncPolicy ??
          "",
      );
      if (!/^none|os|off$/i.test(lip)) {
        gaps.push("E", "PROMPT-AUD", `镜${idx} 有对白但缺 audio 槽`);
      }
    }
    const fxPrompt = String((gen as { fxPrompt?: string }).fxPrompt ?? "").trim();
    const ve = String((shot as { visualEffect?: string }).visualEffect ?? "");
    if (/^F[1-3]$/i.test(fxPrompt) || /^F[1-3]\b/i.test(ve)) {
      const prose = fxPrompt.length > 3 && !/^F[0-3]$/i.test(fxPrompt);
      if (!prose) {
        gaps.push("E", "PROMPT-FX", `镜${idx} F1+ 缺可执行 fx 散文`);
      }
    }

    const type = shot.type ?? "CHAR-SCENE";
    if (type === "CHAR-SCENE" && imagePrompt) {
      const refs = parsePromptRefs(imagePrompt);
      const codes = [...new Set([...(shot.charCodes ?? []), ...refs.crefs])];
      if (!codes.length) {
        gaps.push("E", "PROMPT-CREF", `镜${idx} CHAR-SCENE 无 cref/charCodes`);
      }
    }

    if (imagePrompt) {
      const touched = touchPromptForVendor(imagePrompt, "9:16");
      if (/--cref|--sref|--ar/i.test(touched.vendorPrompt)) {
        gaps.push("E", "PROMPT-VENDOR-STRIP", `镜${idx} vendor 仍含 token: ${touched.vendorPrompt.slice(0, 80)}`);
      }
    }
  }

  const multi = parsePromptRefs("scene --cref CHAR-QINGCI CHAR-LIUSHI --ar 9:16");
  if (multi.crefs.length < 2) {
    gaps.push("E", "PROMPT-MULTI-CREF", `多 cref 解析失败 got=${multi.crefs.join(",")}`);
  }

  const fb = await generationFeedbackPort.classifyFailure({
    modality: "video",
    shotId: "1",
    error: "首位帧缺失 please generate first frame / singleImage",
    prompt: "test",
  });
  const mdHit = fb.upstreamPatches?.some((p) => p.rollbackLayer === "MD") || fb.category === "missing_reference";
  if (!mdHit) {
    gaps.push("E", "PROMPT-VID-FIRSTFRAME", `首帧错误未路由 MD category=${fb.category}`);
  }

  const cd = bundle.characterDesign as {
    assets?: { code?: string; L6?: { stateVariants?: unknown } }[];
  } | undefined;
  let deriveCount = 0;
  for (const asset of cd?.assets ?? []) {
    const sv = asset.L6?.stateVariants;
    if (sv != null && !Array.isArray(sv) && typeof sv === "object") {
      // after prepareBundleWithLog, SH-L6-VARIANTS should array-ify
      gaps.push("E", "DRV-SHAPE", `${asset.code} stateVariants 规范化后仍非 array`);
    }
    deriveCount += normalizeStateVariants(sv as never).length;
  }
  if (deriveCount < expect.minDerivatives) {
    gaps.push("E", "DRV-SHAPE", `衍生态数 ${deriveCount} < expect ${expect.minDerivatives}`);
  }

  // Confirm salvage normalized variants on prepared clone
  for (const asset of cd?.assets ?? []) {
    const sv = asset.L6?.stateVariants;
    if (sv != null && !Array.isArray(sv)) {
      // already pushed
    } else if (Array.isArray(sv)) {
      for (const v of sv) {
        if (!v || typeof v !== "object") continue;
        const item = v as { name?: string; visual?: string };
        if (!item.visual?.trim()) {
          gaps.push("E", "DRV-PROMPT", `${asset.code} 衍生 visual 空`);
        }
      }
    }
  }

  return bundle;
}

import { touchPromptForVendor, resolveAspectRatio } from "./vendorPromptAdapter";
import { finalizeFiveSectionPrompt } from "./finalizeFiveSectionPrompt";
import { isVideoPromptStub as isStubShared } from "./sanitizeVideoPrompt";
import { resolveLipDurationSingleSource } from "../quality/resolveLipDuration";
import { hasOnCameraDialogue, hasAnyDialogueLine } from "../design/onCameraDialogue";
import { compileVideoPromptSpine } from "./compileVideoPromptSpine";
import { assertVideoPromptReady } from "./assertVideoPromptReady";

export interface VideoNativeCompileInput {
  prompt?: string;
  videoDesc?: string;
  videoPrompt?: string;
  audioPrompt?: string;
  fxPrompt?: string;
  dialogueLines?: { speaker?: string; text?: string }[];
  lipSyncPolicy?: string;
  shotSize?: string;
  colorTone?: string;
  sceneName?: string;
  duration?: number;
  visualDescription?: string;
  foreground?: string;
  background?: string;
  bgBlur?: boolean;
  exprCue?: string;
  continuityFrom?: string;
  emotion?: number | string;
  camera?: string;
  shotIndex?: number;
  stillIntentClass?: string;
  vendorId?: string;
}

export interface VideoNativeCompileResult {
  vendorPrompt: string;
  generateAudio: boolean;
  aspectRatio?: string;
  promptHash?: string;
  intentClass?: string;
  ready?: boolean;
  readyCode?: string;
}

/** Thin stub like "特写 static, duration 2s" / "中景 static, duration 2s" */
export function isVideoPromptStub(text: string): boolean {
  return isStubShared(text);
}

/**
 * Adapter only — five-section body from compileVideoPromptSpine when design fields present.
 * Never invents comma-soup as sole author.
 */
export function compileVideoNativePrompt(
  input: VideoNativeCompileInput,
  projectRatio?: string,
): VideoNativeCompileResult {
  let base = (input.videoDesc ?? input.videoPrompt ?? input.prompt ?? "").trim();
  const lines = input.dialogueLines ?? [];
  const lineTexts = lines.map((l) => l.text ?? "").filter(Boolean);
  const onCam = hasOnCameraDialogue(lines);
  const anyDial = hasAnyDialogueLine(lines) || lineTexts.length > 0;
  const dur = input.duration;
  const vd = String(input.visualDescription ?? "").trim();

  // Spine when we have design material or base is stub/thin/non-five-section
  const needsSpine =
    Boolean(vd || lineTexts.length) &&
    (!base ||
      isStubShared(base) ||
      !/\[Visual\]/i.test(base) ||
      assertVideoPromptReady(base, {
        dialogueLines: lineTexts,
        durationSec: dur ?? 0,
        gaps: {
          missingVisualDescription: !vd,
          missingShotSize: !input.shotSize,
          missingDuration: dur == null,
          missingDialogueWhenExpected: false,
        },
      } as never).ok === false);

  if (needsSpine) {
    const spine = compileVideoPromptSpine({
      designShot: {
        shotIndex: input.shotIndex,
        visualDescription: vd || undefined,
        shotSize: input.shotSize,
        duration: dur,
        sceneName: input.sceneName,
        narrative: {
          dialogue: { lines },
        },
        generation: {
          videoPrompt: base || undefined,
          stillIntentClass: input.stillIntentClass,
        },
      },
      seedPrompt: base || undefined,
      forceRebuild: true,
      includeSidecar: false,
      vendorId: input.vendorId,
    });
    base = spine.prompt;
    const lip = resolveLipDurationSingleSource({
      prompt: base,
      lipSyncPolicy: input.lipSyncPolicy,
      hasDialogue: onCam,
      durationSec: spine.durationSec || dur,
    });
    const touched = touchPromptForVendor(lip.prompt, projectRatio);
    return {
      vendorPrompt: touched.vendorPrompt,
      generateAudio: anyDial || Boolean(input.audioPrompt?.trim()),
      aspectRatio: resolveAspectRatio(projectRatio, touched.aspectRatio),
      promptHash: spine.promptHash,
      intentClass: spine.intentClass,
      ready: spine.ready,
      readyCode: spine.readyCode,
    };
  }

  // Five-section: finalize in place — do not append comma soup
  if (/\[Visual\]|\[Audio\]|\[Camera\]/i.test(base)) {
    const fin = finalizeFiveSectionPrompt({
      prompt: base,
      dialogueLines: lineTexts,
      durationSec: dur,
      preferStaticOnDialogue: anyDial,
      narrativePeak: input.visualDescription?.slice(0, 80),
    });
    const lip = resolveLipDurationSingleSource({
      prompt: fin.prompt,
      lipSyncPolicy: input.lipSyncPolicy,
      hasDialogue: onCam,
      durationSec: dur,
    });
    const touched = touchPromptForVendor(lip.prompt, projectRatio);
    return {
      vendorPrompt: touched.vendorPrompt,
      generateAudio: anyDial || Boolean(input.audioPrompt?.trim()),
      aspectRatio: resolveAspectRatio(projectRatio, touched.aspectRatio),
    };
  }

  // Last resort: visual description only — never medium-shot static soup
  const parts: string[] = [];
  if (vd) parts.push(vd.slice(0, 280));
  else if (base && !isStubShared(base)) parts.push(base);
  if (input.shotSize) parts.push(input.shotSize);
  if (input.duration) parts.push(`duration ${input.duration}s`);
  if (lineTexts.length) {
    parts.push(...lineTexts.map((t) => `"${t}"`));
    parts.push("口型同步开启");
  }

  const soup = parts.filter(Boolean).join(", ");
  // If we still have material, try spine one more time with soup as seed
  if (vd || lineTexts.length) {
    const spine = compileVideoPromptSpine({
      designShot: {
        visualDescription: vd,
        shotSize: input.shotSize,
        duration: dur,
        sceneName: input.sceneName,
        narrative: { dialogue: { lines } },
      },
      forceRebuild: true,
      includeSidecar: false,
    });
    const touched = touchPromptForVendor(spine.prompt, projectRatio);
    return {
      vendorPrompt: touched.vendorPrompt,
      generateAudio: anyDial || Boolean(input.audioPrompt?.trim()),
      aspectRatio: resolveAspectRatio(projectRatio, touched.aspectRatio),
      promptHash: spine.promptHash,
      intentClass: spine.intentClass,
      ready: spine.ready,
    };
  }

  const touched = touchPromptForVendor(soup, projectRatio);
  return {
    vendorPrompt: touched.vendorPrompt,
    generateAudio: anyDial || Boolean(input.audioPrompt?.trim()),
    aspectRatio: resolveAspectRatio(projectRatio, touched.aspectRatio),
  };
}

import { touchPromptForVendor, resolveAspectRatio } from "./vendorPromptAdapter";
import { finalizeFiveSectionPrompt } from "./finalizeFiveSectionPrompt";
import { isVideoPromptStub as isStubShared } from "./sanitizeVideoPrompt";

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
}

export interface VideoNativeCompileResult {
  vendorPrompt: string;
  generateAudio: boolean;
  aspectRatio?: string;
}

function dialogueBlock(lines: { speaker?: string; text?: string }[]): string {
  return lines
    .filter((l) => l.text?.trim())
    .map((l) => (l.speaker ? `${l.speaker}: ${l.text}` : l.text))
    .join("; ");
}

/** Thin stub like "特写 static, duration 2s" / "中景 static, duration 2s" */
export function isVideoPromptStub(text: string): boolean {
  return isStubShared(text);
}

export function compileVideoNativePrompt(
  input: VideoNativeCompileInput,
  projectRatio?: string,
): VideoNativeCompileResult {
  let base = (input.videoDesc ?? input.videoPrompt ?? input.prompt ?? "").trim();
  const lines = input.dialogueLines ?? [];
  const lineTexts = lines.map((l) => l.text ?? "").filter(Boolean);
  const dur = input.duration;

  // Five-section: finalize in place — do not append comma soup
  if (/\[Visual\]|\[Audio\]|\[Camera\]/i.test(base)) {
    const fin = finalizeFiveSectionPrompt({
      prompt: base,
      dialogueLines: lineTexts,
      durationSec: dur,
      preferStaticOnDialogue: lineTexts.length > 0,
      narrativePeak: input.visualDescription?.slice(0, 80),
    });
    const touched = touchPromptForVendor(fin.prompt, projectRatio);
    return {
      vendorPrompt: touched.vendorPrompt,
      generateAudio: lineTexts.length > 0 || Boolean(input.audioPrompt?.trim()),
      aspectRatio: resolveAspectRatio(projectRatio, touched.aspectRatio),
    };
  }

  const parts: string[] = [];

  if (base && isVideoPromptStub(base) && input.visualDescription?.trim()) {
    parts.push(input.visualDescription.trim().slice(0, 280));
    parts.push(base);
  } else if (base) {
    parts.push(base);
  } else if (input.visualDescription?.trim()) {
    parts.push(input.visualDescription.trim().slice(0, 280));
  }

  if (input.shotSize) parts.push(input.shotSize);
  if (input.colorTone) parts.push(input.colorTone);
  if (input.sceneName) parts.push(input.sceneName);
  if (input.duration) parts.push(`duration ${input.duration}s`);
  if (input.camera) parts.push(input.camera);
  if (input.emotion != null && input.emotion !== "") parts.push(`emotion:${input.emotion}`);

  if (input.foreground?.trim()) parts.push(`fg:${input.foreground.trim()}`);
  if (input.background?.trim()) parts.push(`bg:${input.background.trim()}`);
  if (input.bgBlur) parts.push("shallow depth of field, soft background");
  if (input.exprCue?.trim()) parts.push(`micro-expression:${input.exprCue.trim()}`);
  if (input.continuityFrom?.trim()) {
    parts.push(`continuity: continues from ${input.continuityFrom.trim().slice(0, 80)}`);
  }

  const dialogueText = dialogueBlock(lines);
  if (dialogueText) {
    parts.push(`dialogue: ${dialogueText}`);
    if (input.lipSyncPolicy?.includes("natural") || input.lipSyncPolicy?.includes("subtle")) {
      parts.push("subtle lip sync, natural mouth movement");
    }
  }
  if (input.audioPrompt?.trim()) parts.push(`audio: ${input.audioPrompt.trim()}`);
  if (input.fxPrompt?.trim()) parts.push(`fx: ${input.fxPrompt.trim()}`);

  const raw = parts.join(", ");
  const touched = touchPromptForVendor(raw, projectRatio);
  const generateAudio = lines.length > 0 || Boolean(input.audioPrompt?.trim());

  return {
    vendorPrompt: touched.vendorPrompt,
    generateAudio,
    aspectRatio: resolveAspectRatio(projectRatio, touched.aspectRatio),
  };
}

/**
 * After design / still repair writeback: recompile video + audio/sfx/fx prompts.
 * Flags alone (videoStale) are insufficient — RepairAsDesign must refresh modality text.
 */
import { compileVideoPromptSpine } from "../compilers/compileVideoPromptSpine";

export type ModalityRegenResult = {
  shots: Record<string, unknown>[];
  regenerated: number;
  audioTouched: number;
  fxTouched: number;
};

function asRec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/**
 * Force modality prompt regeneration on shots marked videoStale or explicitly listed.
 */
export function regenerateModalityPromptsAfterDesign(input: {
  shots: Record<string, unknown>[];
  clientIds?: string[] | null;
  forceAll?: boolean;
  vendorId?: string | null;
}): ModalityRegenResult {
  const idSet = input.clientIds?.length ? new Set(input.clientIds.map(String)) : null;
  let regenerated = 0;
  let audioTouched = 0;
  let fxTouched = 0;

  for (const s of input.shots) {
    const cid = String(s.clientId ?? s.shotIndex ?? "");
    if (idSet && cid && !idSet.has(cid)) continue;
    const force =
      input.forceAll ||
      s.videoStale === true ||
      s.promptState === "stale" ||
      Boolean(asRec(s.reason).videoStale);

    if (!force) continue;

    const gen = asRec(s.generation);
    try {
      const spine = compileVideoPromptSpine({
        designShot: s as never,
        shotMeta: s,
        seedPrompt: String(s.videoDesc ?? gen.video ?? ""),
        vendorId: input.vendorId,
        forceRebuild: true,
      });
      if (spine.source !== "blocked" && spine.prompt) {
        s.videoDesc = spine.prompt;
        s.videoPrompt = spine.prompt;
        gen.video = spine.prompt;
        gen.compiled = { ...asRec(gen.compiled), video: spine.prompt };
        if (spine.generationWriteback) {
          Object.assign(gen, {
            videoPrompt: spine.generationWriteback.videoPrompt,
            compiledVideo: spine.generationWriteback.compiledVideo,
            promptHash: spine.generationWriteback.promptHash,
            durationSec: spine.generationWriteback.durationSec,
          });
        }
        regenerated += 1;
      }
    } catch {
      /* best effort */
    }

    const audioCue = String(s.audioCue ?? "").trim();
    const sfx = String(asRec(s.sound).sfx ?? "").trim();
    if (audioCue || sfx) {
      const audioLine = [audioCue, sfx].filter(Boolean).join("；");
      gen.audioPrompt = audioLine;
      const compiled = asRec(gen.compiled);
      compiled.audio = audioLine;
      gen.compiled = compiled;
      audioTouched += 1;
    }
    const fx = String(s.fxPrompt ?? "").trim();
    if (fx) {
      gen.fxPrompt = fx;
      const compiled = asRec(gen.compiled);
      compiled.fx = fx;
      gen.compiled = compiled;
      fxTouched += 1;
    }

    s.generation = gen;
    s.videoStale = true;
    s.modalityRegenAt = new Date().toISOString();
    const reason = asRec(s.reason);
    reason.videoStale = true;
    reason.modalityRegenAt = s.modalityRegenAt;
    s.reason = reason;
  }

  return { shots: input.shots, regenerated, audioTouched, fxTouched };
}

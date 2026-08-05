/**
 * Burn-time design adaptation — package SSOT over stale track.prompt (no re-import required).
 */
import { hydrateShotCompileContextSync } from "./hydrateShotCompileContext";
import { compileVideoPromptSpine } from "./compileVideoPromptSpine";
import { scrubVideoPromptForBurn } from "./videoDesignContract";
import { seedContradictsDesign } from "./staleSeedDetector";
import { softHealVideoHomologyOnShots } from "../heal/videoHomologyHeal";
import { finalizeFiveSectionPrompt } from "./finalizeFiveSectionPrompt";
import {
  ensureBurnDesignIntentFidelity,
  fidelityHitsToVirdFindings,
} from "./videoDesignIntentFidelity";

export type AdaptBurnFromDesignInput = {
  shotMeta: Record<string, unknown>;
  trackPrompt?: string | null;
  vendorId?: string | null;
  trackId?: number | null;
  storyboardId?: number | null;
  modeId?: string | null;
  /** Physical [References] from videoRefSlotContract — bind at burn compile, not deferred */
  referencesSection?: string | null;
};

export type AdaptBurnFromDesignResult = {
  prompt: string;
  durationSec: number;
  intentClass: string;
  source: "package_compiled" | "spine" | "track_seed";
  staleSeedDiscarded: boolean;
  heals: string[];
  fidelity?: {
    pass: boolean;
    items: { id: string; label: string; pass: boolean; expected?: string; actual?: string }[];
    repairs: string[];
    virdFindings?: Array<{ id: string; severity: "BLOCK" | "WARN"; message: string }>;
  };
};

export function adaptBurnFromDesign(input: AdaptBurnFromDesignInput): AdaptBurnFromDesignResult {
  const trackPrompt = String(input.trackPrompt ?? "").trim();
  const hom = softHealVideoHomologyOnShots({
    shots: [{ ...input.shotMeta }],
    vendorId: input.vendorId ?? undefined,
  });
  const shot = (hom.shots[0] ?? input.shotMeta) as Record<string, unknown>;
  const gen = shot.generation as { compiled?: { video?: string }; intentClass?: string } | undefined;
  const compiledVideo = String(gen?.compiled?.video ?? "").trim();
  const persistedIntent = String(gen?.intentClass ?? "").trim() || null;
  const authorDuration = Math.max(
    Number(shot.duration) || 0,
    Number((shot.narrative as { duration?: number } | undefined)?.duration) || 0,
    Number((shot.narrative as { beatDuration?: number } | undefined)?.beatDuration) || 0,
  );

  const seedForCtx = compiledVideo || trackPrompt;
  const ctx = hydrateShotCompileContextSync({
    designShot: shot as never,
    shotMeta: shot,
    seedPrompt: seedForCtx,
    vendorId: input.vendorId ?? null,
    trackId: input.trackId ?? null,
    storyboardId: input.storyboardId ?? null,
    preferStillIntentClass: persistedIntent,
  });

  const trackStale = Boolean(trackPrompt) && seedContradictsDesign(trackPrompt, ctx);
  const compiledOk = Boolean(compiledVideo) && !seedContradictsDesign(compiledVideo, ctx);
  const targetDur = authorDuration > 0 ? authorDuration : ctx.durationSec;

  let prompt = "";
  let source: AdaptBurnFromDesignResult["source"] = "track_seed";
  let durationSec = targetDur;

  // Burn SSOT: whenever design can author, always rebuild spine from latest design.
  // package.compiled.video can carry legacy sections and must not override fresh design compile.
  if (ctx.canAuthorFromDesign) {
    const spine = compileVideoPromptSpine({
      ctx: {
        ...ctx,
        seedPrompt: trackStale ? "" : seedForCtx,
        durationSec: targetDur,
      },
      forceRebuild: true,
      includeSidecar: false,
      vendorId: input.vendorId ?? null,
      modeId: input.modeId ?? null,
    });
    prompt = spine.prompt;
    durationSec = authorDuration > 0 ? authorDuration : spine.durationSec;
    source = "spine";
  } else if (compiledOk) {
    prompt = compiledVideo;
    source = "package_compiled";
    const durM = /时长\s*(\d+(?:\.\d+)?)\s*s/i.exec(compiledVideo);
    if (durM) durationSec = Number(durM[1]) || durationSec;
  } else if (trackPrompt) {
    prompt = trackPrompt;
    source = "track_seed";
  }

  // 图N-first: inject real References from slot contract (never leave "bound at burn")
  const refsSec = String(input.referencesSection ?? "").trim();
  if (refsSec) {
    try {
      const { injectVideoReferencesSection } =
        require("./videoRefSlotContract") as typeof import("./videoRefSlotContract");
      prompt = injectVideoReferencesSection(prompt, refsSec);
    } catch {
      /* optional */
    }
  }

  const fin = finalizeFiveSectionPrompt({
    prompt,
    dialogueLines: ctx.dialogueLines,
    durationSec: targetDur,
    preferStaticOnDialogue: ctx.dialogueLines.length > 0,
  });
  prompt = fin.prompt;
  durationSec = targetDur;

  const scrub = scrubVideoPromptForBurn({
    prompt,
    vendorId: input.vendorId ?? undefined,
    dialogueLines: ctx.dialogueLines,
  });
  if (!scrub.block) {
    prompt = scrub.prompt;
  }

  const ensured = ensureBurnDesignIntentFidelity(ctx, scrub.block ? prompt : scrub.prompt);
  prompt = ensured.prompt;
  const fidelity = ensured.fidelity;

  return {
    prompt,
    durationSec: targetDur,
    intentClass: ctx.videoIntent.intentClass,
    source,
    staleSeedDiscarded: trackStale,
    heals: [...hom.heals, ...ensured.repairs],
    fidelity: {
      pass: fidelity.pass,
      items: fidelity.items,
      repairs: ensured.repairs,
      virdFindings: fidelityHitsToVirdFindings(fidelity.blockers),
    },
  };
}

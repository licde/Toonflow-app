import type { Knex } from "knex";
import { compileVideoNativePrompt } from "../compilers/videoNativeCompiler";
import { loadEpisodePackage } from "../storage/episodePackageStore";
import type { EpisodeShot } from "../types";
import { asDialogueLineObjects } from "../design/dialogueCoverage";

export interface StoryboardVideoEnrichment {
  videoDesc?: string;
  audioPrompt?: string;
  fxPrompt?: string;
  dialogueLines?: { speaker?: string; text?: string }[];
  lipSyncPolicy?: string;
  shotSize?: string;
  duration?: number;
  visualDescription?: string;
  foreground?: string;
  background?: string;
  bgBlur?: boolean;
  exprCue?: string;
  continuityFrom?: string;
  emotion?: number | string;
  camera?: string;
  colorTone?: string;
  sceneName?: string;
}

function dialogueFromShot(shot: EpisodeShot): { speaker?: string; text?: string }[] | undefined {
  const fromDialogue = asDialogueLineObjects(shot.narrative.dialogue?.lines);
  if (fromDialogue.length) return fromDialogue;
  const fromLines = asDialogueLineObjects(shot.narrative.lines);
  if (fromLines.length) return fromLines;
  return undefined;
}

function cameraFromVideoPrompt(vp?: string): string | undefined {
  if (!vp) return undefined;
  if (/static/i.test(vp)) return "static";
  if (/slow\s*zoom|push|推进/i.test(vp)) return "dolly in / push in";
  if (/track|跟踪/i.test(vp)) return "tracking shot";
  if (/pan|摇/i.test(vp)) return "pan";
  return undefined;
}

export async function loadStoryboardVideoEnrichment(
  db: Knex,
  scriptId: number,
  storyboardId: number,
  projectId?: number,
): Promise<StoryboardVideoEnrichment> {
  const row = await db("o_storyboard").where({ id: storyboardId, scriptId }).select("videoDesc", "prompt", "duration", "projectId", "audioPrompt", "fxPrompt").first();
  const pid = projectId ?? row?.projectId;

  // Package SSOT first
  if (pid != null) {
    const pkg = await loadEpisodePackage(db, pid, scriptId);
    const shot = pkg?.shots?.find((s) => s.storyboardId === storyboardId);
    if (shot) {
      const vp = shot.generation.videoDesc ?? shot.generation.videoPrompt;
      return {
        videoDesc: vp ?? row?.videoDesc ?? row?.prompt,
        audioPrompt: shot.generation.audioPrompt ?? row?.audioPrompt,
        fxPrompt: shot.generation.fxPrompt ?? row?.fxPrompt,
        dialogueLines: dialogueFromShot(shot),
        lipSyncPolicy: (() => {
          try {
            const { resolveLipSyncPolicyFromShot } =
              require("../quality/resolveLipSyncPolicy") as typeof import("../quality/resolveLipSyncPolicy");
            return resolveLipSyncPolicyFromShot(shot as unknown as Record<string, unknown>) || undefined;
          } catch {
            return shot.narrative.lipSyncPolicy ?? (shot as { shotDesign?: { lipSyncPolicy?: string } }).shotDesign?.lipSyncPolicy;
          }
        })(),
        shotSize: shot.narrative.shotSize ?? shot.shotSize,
        duration: shot.narrative.duration ?? (row?.duration ? Number(row.duration) : undefined),
        visualDescription: shot.visualDescription,
        foreground: shot.narrative.composition?.foreground,
        background: shot.narrative.composition?.background,
        bgBlur: shot.narrative.cameraAnchor?.bgBlur,
        exprCue: shot.narrative.exprCue,
        continuityFrom: shot.narrative.continuityFrom,
        emotion: shot.narrative.emotionIntensity,
        camera: cameraFromVideoPrompt(vp),
        colorTone: shot.narrative.colorTone,
        sceneName: shot.narrative.sceneName,
      };
    }
  }

  const work = await db("o_agentWorkData").where("episodesId", String(scriptId)).select("data").first();
  let audioPrompt: string | undefined = row?.audioPrompt;
  let fxPrompt: string | undefined = row?.fxPrompt;
  let dialogueLines: { speaker?: string; text?: string }[] | undefined;
  let lipSyncPolicy: string | undefined;
  let shotSize: string | undefined;

  if (work?.data) {
    try {
      const flow = JSON.parse(work.data as string) as {
        storyboard?: {
          id?: number;
          audioPrompt?: string;
          fxPrompt?: string;
          dialogue?: { lines?: { speaker?: string; text?: string }[] };
          lipSyncPolicy?: string;
          shotSize?: string;
        }[];
      };
      const panel = flow.storyboard?.find((s) => s.id === storyboardId);
      audioPrompt = panel?.audioPrompt ?? audioPrompt;
      fxPrompt = panel?.fxPrompt ?? fxPrompt;
      dialogueLines = panel?.dialogue?.lines;
      lipSyncPolicy = panel?.lipSyncPolicy;
      shotSize = panel?.shotSize;
    } catch {
      /* ignore */
    }
  }

  return {
    videoDesc: row?.videoDesc ?? row?.prompt,
    audioPrompt,
    fxPrompt,
    dialogueLines,
    lipSyncPolicy,
    shotSize,
    duration: row?.duration ? Number(row.duration) : undefined,
  };
}

export async function compileTrackVideoPrompt(
  db: Knex,
  scriptId: number,
  storyboardId: number | undefined,
  prompt: string,
  projectRatio?: string,
  projectId?: number,
): Promise<{ vendorPrompt: string; generateAudio: boolean; aspectRatio: string; promptHash?: string; ready?: boolean; readyCode?: string }> {
  const enrich = storyboardId ? await loadStoryboardVideoEnrichment(db, scriptId, storyboardId, projectId) : {};
  const compiled = compileVideoNativePrompt(
    { prompt, ...enrich },
    projectRatio,
  );
  return {
    vendorPrompt: compiled.vendorPrompt,
    generateAudio: compiled.generateAudio,
    aspectRatio: (compiled.aspectRatio ?? projectRatio ?? "16:9") as string,
    promptHash: compiled.promptHash,
    ready: compiled.ready,
    readyCode: compiled.readyCode,
  };
}

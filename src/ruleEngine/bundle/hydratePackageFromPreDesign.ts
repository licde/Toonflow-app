/**
 * Overlay preDesign fidelity onto EpisodePackage.shots after syncFromFlowData.
 * Package SSOT recovers fields lost in markdown/DB flattening.
 */
import type { EpisodePackage, EpisodeShot } from "../types";
import type { PreDesignShot } from "./types";
import { normalizeAssetCode } from "../codes/assetCodeContract";

type RichShot = PreDesignShot & {
  sceneCode?: string;
  colorTemp?: string;
  camera?: string;
  voice?: string;
  fxIntent?: { level?: string };
  visualDescription?: string;
};

type DialogueLine = {
  speaker?: string;
  text?: string;
  lineId?: string;
  functions?: string[];
  causedByActionId?: string;
  splitHint?: string;
  reactionAction?: string;
};

function structuredDialogueLines(shot: RichShot): DialogueLine[] | undefined {
  const lines = shot.narrative?.dialogue?.lines;
  if (!lines?.length) return undefined;
  return lines.map((l) => {
    const row: DialogueLine = {
      speaker: l.speaker,
      text: l.text,
      lineId: l.lineId,
      functions: l.functions,
      causedByActionId: l.causedByActionId,
    };
    const hint = (l as { splitHint?: string }).splitHint;
    const reaction = (l as { reactionAction?: string }).reactionAction;
    if (hint) row.splitHint = hint;
    if (reaction) row.reactionAction = reaction;
    return row;
  });
}

function dialogueLinesText(shot: RichShot): string | undefined {
  const lines = structuredDialogueLines(shot);
  if (!lines?.length) return undefined;
  return lines.map((l) => `${l.speaker ?? ""}：${l.text ?? ""}`).filter((s) => s !== "：").join("\n");
}

function sfxFromAudio(audio?: string): string | undefined {
  if (!audio?.trim()) return undefined;
  if (/音效|sfx|碎裂|风声|剑鸣|更鼓|噼啪/i.test(audio)) return audio.trim();
  return undefined;
}

function microExprCue(performance?: Record<string, unknown>): string | undefined {
  const micro = (performance as { microExpression?: { eyes?: string; mouthDetail?: string } } | undefined)?.microExpression;
  if (!micro) return undefined;
  const parts = [micro.eyes, micro.mouthDetail].filter(Boolean);
  return parts.length ? parts.join("/") : undefined;
}

function colorFromLock(
  sceneName: string | undefined,
  sceneColorLock?: Record<string, { colorTemp?: string; kelvin?: string | number }>,
): string | undefined {
  if (!sceneName || !sceneColorLock) return undefined;
  const hit = Object.values(sceneColorLock).find(
    (v) =>
      (v as { name?: string }).name === sceneName ||
      String((v as { name?: string }).name ?? "").includes(sceneName) ||
      sceneName.includes(String((v as { name?: string }).name ?? "\0")),
  );
  if (!hit) {
    // keyed by scene name
    const byKey = sceneColorLock[sceneName];
    if (byKey?.colorTemp) return String(byKey.colorTemp);
    if (byKey?.kelvin != null) return `${byKey.kelvin}K`;
    return undefined;
  }
  if ((hit as { colorTemp?: string }).colorTemp) return String((hit as { colorTemp?: string }).colorTemp);
  if ((hit as { kelvin?: string | number }).kelvin != null) return `${(hit as { kelvin?: string | number }).kelvin}K`;
  return undefined;
}

export function hydratePackageFromPreDesign(
  pkg: EpisodePackage,
  preShots: PreDesignShot[],
  opts?: {
    sceneColorLock?: Record<string, { colorTemp?: string; kelvin?: string | number; name?: string }>;
    fxByShotIndex?: Record<number, string>;
    debutBeat?: string;
    endHook?: string;
  },
): EpisodePackage {
  if (!preShots?.length) return pkg;
  const shots: EpisodeShot[] = pkg.shots.map((es, i) => {
    const esAny = es as { clientId?: string; storyboardId?: number; shotIndex?: number };
    const raw = (preShots.find(
      (p) =>
        (esAny.clientId && String((p as { clientId?: string }).clientId ?? "") === String(esAny.clientId)) ||
        (esAny.storyboardId != null &&
          Number((p as { storyboardId?: number }).storyboardId) === Number(esAny.storyboardId)),
    ) ??
      preShots.find((p) => (p.shotIndex ?? 0) === (esAny.shotIndex ?? i + 1)) ??
      preShots[i]) as RichShot | undefined;
    if (!raw) return es;
    const sceneCode = raw.sceneCode ?? es.narrative.sceneCode;
    const charCodes = (raw.charCodes ?? [])
      .map((c) => normalizeAssetCode(c) ?? c)
      .filter(Boolean);
    const assetCodes = [...new Set([...(es.narrative.assetCodes ?? []), ...charCodes, ...(sceneCode ? [sceneCode] : [])])];
    const structured = structuredDialogueLines(raw);
    const linesText = dialogueLinesText(raw) ?? es.narrative.lines;
    const shotIndex = raw.shotIndex ?? i + 1;
    const fxFromAudit = opts?.fxByShotIndex?.[shotIndex];
    const fxPrompt =
      raw.generation?.fxPrompt ??
      (raw.fxIntent?.level ? String(raw.fxIntent.level).toUpperCase() : undefined) ??
      fxFromAudit ??
      es.generation.fxPrompt;
    const sceneName = raw.sceneName ?? es.narrative.sceneName;
    const colorTone =
      raw.colorTemp ??
      (raw.narrative as { colorTone?: string } | undefined)?.colorTone ??
      colorFromLock(sceneName, opts?.sceneColorLock) ??
      es.narrative.colorTone;
    const shotDesign = raw.shotDesign as
      | {
          composition?: { foreground?: string; background?: string };
          cameraAnchor?: { shotSize?: string; bgBlur?: boolean };
          performance?: Record<string, unknown>;
          lipSyncPolicy?: string;
        }
      | undefined;
    const shotSize =
      raw.shotSize ??
      shotDesign?.cameraAnchor?.shotSize ??
      es.narrative.shotSize;
    const emotion =
      (raw.narrative as { emotionIntensity?: number } | undefined)?.emotionIntensity ??
      raw.emotion ??
      es.narrative.emotionIntensity;
    const sfx = sfxFromAudio(raw.generation?.audioPrompt) ?? es.narrative.sound?.sfx;
    const performance = (shotDesign?.performance ?? es.narrative.performance) as Record<string, unknown> | undefined;
    const exprCue = microExprCue(performance) ?? es.narrative.exprCue;
    const spatialFromComp =
      shotDesign?.composition?.foreground && shotDesign?.composition?.background
        ? `fg:${shotDesign.composition.foreground}; bg:${shotDesign.composition.background}`
        : undefined;
    const spatialRelation =
      (raw.narrative as { spatialRelation?: string } | undefined)?.spatialRelation ??
      es.narrative.spatialRelation ??
      spatialFromComp;

    // Adjacent continuity hint from previous preDesign shot
    const prevRaw = preShots[i - 1] as RichShot | undefined;
    const continuityFrom =
      es.narrative.continuityFrom ??
      (prevRaw?.visualDescription ? String(prevRaw.visualDescription).slice(0, 80) : undefined);

    const debutBeat =
      es.narrative.debutBeat ??
      (i === 0 && opts?.debutBeat ? opts.debutBeat : undefined);
    const endHook =
      es.narrative.endHook ??
      (i === pkg.shots.length - 1 && opts?.endHook ? opts.endHook : undefined);

    const rawAny = raw as RichShot & {
      promptState?: string;
      videoStale?: boolean;
      videoPass?: boolean;
      burnParentForbidden?: boolean;
      _stillBeatSplitId?: string;
      _visualSplitId?: string;
      _litXorSplitId?: string;
      _cuCastSplitId?: string;
      packageVersion?: number;
    };

    return {
      ...es,
      storyboardId:
        (raw as { storyboardId?: number }).storyboardId ?? es.storyboardId,
      visualDescription: raw.visualDescription ?? es.visualDescription,
      promptState: rawAny.promptState ?? es.promptState,
      videoStale: rawAny.videoStale ?? es.videoStale,
      videoPass: rawAny.videoPass ?? es.videoPass,
      burnParentForbidden: rawAny.burnParentForbidden ?? es.burnParentForbidden,
      _stillBeatSplitId: rawAny._stillBeatSplitId ?? es._stillBeatSplitId,
      _visualSplitId: rawAny._visualSplitId ?? es._visualSplitId,
      _litXorSplitId: rawAny._litXorSplitId ?? es._litXorSplitId,
      _cuCastSplitId: rawAny._cuCastSplitId ?? es._cuCastSplitId,
      packageVersion: rawAny.packageVersion ?? es.packageVersion,
      narrative: {
        ...es.narrative,
        sceneName,
        sceneCode: sceneCode ?? es.narrative.sceneCode,
        assetCodes: assetCodes.length ? assetCodes : es.narrative.assetCodes,
        type: (raw.type as EpisodeShot["narrative"]["type"]) ?? es.narrative.type,
        duration: raw.duration ?? es.narrative.duration,
        shotSize: (shotSize as string | undefined) ?? es.narrative.shotSize,
        emotionIntensity: emotion,
        colorTone,
        lines: linesText,
        dialogue:
          structured?.length
            ? { type: es.narrative.dialogue?.type ?? "dialogue", lines: structured }
            : linesText
              ? { type: es.narrative.dialogue?.type ?? "dialogue", lines: linesText }
              : es.narrative.dialogue,
        sound: {
          ...es.narrative.sound,
          sfx,
          dialogue: Boolean(linesText || structured?.length) || es.narrative.sound?.dialogue,
        },
        performance,
        spatialRelation,
        composition: shotDesign?.composition ?? es.narrative.composition,
        cameraAnchor: shotDesign?.cameraAnchor ?? es.narrative.cameraAnchor,
        lipSyncPolicy: shotDesign?.lipSyncPolicy ?? es.narrative.lipSyncPolicy,
        exprCue,
        continuityFrom,
        debutBeat,
        endHook,
      },
      generation: {
        ...es.generation,
        imagePrompt: raw.generation?.imagePrompt ?? es.generation.imagePrompt,
        videoPrompt: raw.generation?.videoPrompt ?? es.generation.videoPrompt,
        videoDesc: raw.generation?.videoPrompt ?? es.generation.videoDesc,
        audioPrompt: raw.generation?.audioPrompt ?? es.generation.audioPrompt,
        fxPrompt,
      },
    };
  });

  return { ...pkg, shots };
}

/** Build extract-friendly shot object from EpisodeShot (+ optional pre overlays). */
export function episodeShotToExtractShot(es: EpisodeShot, extras?: { voice?: string; camera?: string }) {
  const micro = (es.narrative.performance as { microExpression?: { eyes?: string; mouthDetail?: string } } | undefined)
    ?.microExpression;
  const exprCue =
    es.narrative.exprCue ??
    (micro ? [micro.eyes, micro.mouthDetail].filter(Boolean).join("/") : undefined);
  const dialogueLines = es.narrative.dialogue?.lines;
  return {
    duration: es.narrative.duration,
    shotSize: es.narrative.shotSize,
    emotion: es.narrative.emotionIntensity,
    colorTemp: es.narrative.colorTone,
    sceneCode: es.narrative.sceneCode,
    charCodes: (es.narrative.assetCodes ?? []).filter((c) => /^CHAR-/i.test(c)),
    camera: extras?.camera,
    voice: extras?.voice,
    visualDescription: es.visualDescription,
    narrative: {
      emotionIntensity: es.narrative.emotionIntensity,
      spatialRelation: es.narrative.spatialRelation,
      duration: es.narrative.duration,
      shotSize: es.narrative.shotSize,
      colorTone: es.narrative.colorTone,
      dialogue: dialogueLines
        ? {
            lines: dialogueLines,
            type: es.narrative.dialogue?.type,
          }
        : es.narrative.lines
          ? { lines: es.narrative.lines }
          : undefined,
      sound: es.narrative.sound,
      debutBeat: es.narrative.debutBeat,
      endHook: es.narrative.endHook,
      composition: es.narrative.composition,
      cameraAnchor: es.narrative.cameraAnchor,
      lipSyncPolicy: es.narrative.lipSyncPolicy,
      exprCue,
      continuityFrom: es.narrative.continuityFrom,
    },
    generation: {
      fxPrompt: es.generation.fxPrompt,
      audioPrompt: es.generation.audioPrompt,
      videoPrompt: es.generation.videoPrompt ?? es.generation.videoDesc,
    },
    shotDesign: {
      cameraAnchor: es.narrative.cameraAnchor ?? { shotSize: es.narrative.shotSize },
      performance: es.narrative.performance,
      composition: es.narrative.composition,
      lipSyncPolicy: es.narrative.lipSyncPolicy,
    },
  };
}

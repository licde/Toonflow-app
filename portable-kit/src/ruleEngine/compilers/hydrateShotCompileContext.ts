/**
 * ShotCompileContext — one bag per shot for video spine (mirror hydrateComposeStillContext).
 * Missing fields become explicit gaps — never silent 中景/5s defaults at hydrate time.
 */
import type { Knex } from "knex";
import type { PreDesignShot } from "../bundle/types";
import { splitDialogueUtterances } from "../dialogueMetrics";
import { resolveRequiredDuration } from "./resolveRequiredDuration";
import { classifyVideoIntent, type VideoIntentClassification } from "./videoIntentPolicy";
import { isNonLiteraryDialogueKey } from "../design/dialogueCoverage";
import { preferLiteraryVisualDesc } from "./resolveTrackStoryboard";

export type ShotCompileGaps = {
  missingVisualDescription: boolean;
  missingShotSize: boolean;
  missingDuration: boolean;
  missingDialogueWhenExpected: boolean;
};

export type ShotCompileContext = {
  projectId?: number | string;
  shotIndex: number | null;
  sceneRef: number | string | null;
  trackId?: number | null;
  storyboardId?: number | null;
  visualDescription: string;
  shotSize: string | null;
  authorDurationSec: number | null;
  durationSec: number;
  dialogueLines: string[];
  dialogueObjects: { speaker?: string; text?: string }[];
  stillPath?: string | null;
  seedPrompt: string;
  debutBeat?: string | null;
  stillIntentClass?: string | null;
  fxLevel?: string | null;
  sceneName?: string | null;
  /** Native audio / SFX / FX prose from design or storyboard */
  audioPrompt?: string | null;
  fxPrompt?: string | null;
  audioCue?: string | null;
  sfx?: string | null;
  /** Design-declared camera / 运镜 (declare-only; never invent) */
  cameraMotion?: string | null;
  /** Neighbor continuity soft atom — does not legislate this beat */
  continuityHint?: string | null;
  /** Design performance microExpression (declare-only → Motion) */
  microExpression?: string | { eyes?: string; mouthDetail?: string } | null;
  /** Author beat window (1–2s event); distinct from vendor snap durationSec */
  beatDurationSec?: number | null;
  /** Design sfx / av / anchors — must reach spine when present */
  sfxIntent?: string | null;
  avCausality?: { audioBeat?: string; visualPeak?: string } | null;
  promptAnchors?: string[] | null;
  designShot?: PreDesignShot | null;
  videoIntent: VideoIntentClassification;
  gaps: ShotCompileGaps;
  /** True when enough material exists to author five-section without LLM */
  canAuthorFromDesign: boolean;
  vendorId?: string | null;
  warnings: string[];
};

function asNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function extractDialogue(shot?: PreDesignShot | null, shotMeta?: Record<string, unknown> | null): {
  texts: string[];
  objects: { speaker?: string; text?: string }[];
} {
  const fromShot = shot?.narrative?.dialogue?.lines;
  const fromMeta =
    (shotMeta?.narrative as { dialogue?: { lines?: { speaker?: string; text?: string }[] } } | undefined)?.dialogue
      ?.lines ??
    (shotMeta?.dialogue as { lines?: { speaker?: string; text?: string }[] } | undefined)?.lines;
  const lines = (Array.isArray(fromShot) && fromShot.length ? fromShot : fromMeta) ?? [];
  const objects = (Array.isArray(lines) ? lines : [])
    .map((l) => ({
      speaker: typeof l === "object" && l ? String((l as { speaker?: string }).speaker ?? "") : "",
      text: typeof l === "string" ? l : String((l as { text?: string })?.text ?? ""),
    }))
    .filter((l) => l.text.trim() && !isNonLiteraryDialogueKey(l.text.trim()));
  const texts = splitDialogueUtterances(objects.length ? objects : lines);
  return { texts, objects };
}

function normalizeShotSizeLabel(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  if (/大特|ecu|extreme\s*close/i.test(t)) return "大特写";
  if (/^cu$/i.test(t) || /特写|close-?up/i.test(t)) return "特写";
  if (/^mcu$/i.test(t) || /近景|close.?medium|bust/i.test(t)) return "近景";
  if (/^ms$/i.test(t) || /中景|medium/i.test(t)) return "中景";
  if (/^ws$/i.test(t) || /全景|wide/i.test(t)) return "全景";
  if (/远景|long/i.test(t)) return "远景";
  return t;
}

function extractShotSize(shot?: PreDesignShot | null, shotMeta?: Record<string, unknown> | null): string | null {
  const narr = shot?.narrative as { shotSize?: string; cameraAnchor?: { shotSize?: string } } | undefined;
  const metaNarr = shotMeta?.narrative as { shotSize?: string; cameraAnchor?: { shotSize?: string } } | undefined;
  const cam =
    (shot?.shotDesign as { cameraAnchor?: { shotSize?: string } } | undefined)?.cameraAnchor ??
    narr?.cameraAnchor ??
    metaNarr?.cameraAnchor ??
    (shotMeta?.cameraAnchor as { shotSize?: string } | undefined);
  const raw =
    shot?.shotSize ??
    narr?.shotSize ??
    metaNarr?.shotSize ??
    cam?.shotSize ??
    shotMeta?.shotSize ??
    null;
  return normalizeShotSizeLabel(raw);
}

export { normalizeShotSizeLabel };

function extractAuthorDuration(shot?: PreDesignShot | null, shotMeta?: Record<string, unknown> | null): number | null {
  const candidates = [
    shot?.duration,
    (shot?.narrative as { duration?: number } | undefined)?.duration,
    shotMeta?.duration,
    (shotMeta?.narrative as { duration?: number } | undefined)?.duration,
  ];
  for (const c of candidates) {
    const n = asNum(c);
    if (n != null && n > 0) return Math.round(n);
  }
  return null;
}

function extractStillIntent(shot?: PreDesignShot | null, shotMeta?: Record<string, unknown> | null): string | null {
  const gen = shot?.generation as { stillIntentClass?: string; intentClass?: string } | undefined;
  const meta = shotMeta as { stillIntentClass?: string; intentClass?: string } | undefined;
  return (
    gen?.stillIntentClass ??
    gen?.intentClass ??
    meta?.stillIntentClass ??
    meta?.intentClass ??
    null
  );
}

function extractDebutBeat(shot?: PreDesignShot | null, shotMeta?: Record<string, unknown> | null): string | null {
  const n = shot?.narrative as { debutBeat?: string } | undefined;
  const m = shotMeta?.narrative as { debutBeat?: string } | undefined;
  const t = String(n?.debutBeat ?? m?.debutBeat ?? "").trim();
  return t || null;
}

/** Design-declared 运镜 only — clamp dangerous CAM-SPEAK; never invent. */
function extractCameraMotion(shot?: PreDesignShot | null, shotMeta?: Record<string, unknown> | null): string | null {
  const raw =
    (shot as { camera?: string } | null)?.camera ??
    (shot as { motion?: string } | null)?.motion ??
    (shot?.shotDesign as { camera?: string; motion?: string } | undefined)?.camera ??
    (shot?.shotDesign as { motion?: string } | undefined)?.motion ??
    shotMeta?.camera ??
    shotMeta?.motion ??
    (shotMeta?.shotDesign as { camera?: string; motion?: string } | undefined)?.camera ??
    (shotMeta?.shotDesign as { motion?: string } | undefined)?.motion ??
    "";
  let t = String(raw ?? "").trim();
  if (!t) {
    const vd = String((shot as { videoDesc?: string } | null)?.videoDesc ?? shotMeta?.videoDesc ?? "");
    const m = vd.match(/(缓慢横移|轻推|轻拉|缓摇|固定机位|静止持镜|slow\s*pan|gentle\s*push|static)/i);
    t = m?.[0]?.trim() ?? "";
  }
  if (!t) return null;
  if (/whip.?pan|crash.?zoom|dutch|handheld.?shake|速切|甩镜/i.test(t)) return "static";
  return t.slice(0, 48);
}

function extractContinuityHint(shot?: PreDesignShot | null, shotMeta?: Record<string, unknown> | null): string | null {
  const raw =
    (shot as { continuityFrom?: string } | null)?.continuityFrom ??
    shotMeta?.continuityFrom ??
    (shotMeta?.continuity as string | undefined) ??
    (shotMeta?.prevShotSummary as string | undefined) ??
    (shotMeta?.neighborContinuity as string | undefined) ??
    "";
  let t = String(raw ?? "")
    .replace(/^continuity:\s*/i, "")
    .trim();
  // True summary: strip hollow tokens; keep subject/pose atoms
  if (t && /^(同上|承接上镜|continue|prev)$/i.test(t)) t = "";
  if (!t || t.length < 2) return null;
  return t.slice(0, 64);
}

function extractMicroExpression(
  shot?: PreDesignShot | null,
  shotMeta?: Record<string, unknown> | null,
): string | { eyes?: string; mouthDetail?: string } | null {
  const sd =
    (shot as { shotDesign?: { performance?: { microExpression?: unknown } } } | null)?.shotDesign ??
    (shotMeta?.shotDesign as { performance?: { microExpression?: unknown } } | undefined);
  const narrPerf =
    (shot?.narrative as { performance?: { microExpression?: unknown } } | undefined)?.performance ??
    (shotMeta?.narrative as { performance?: { microExpression?: unknown } } | undefined)?.performance;
  const micro =
    sd?.performance?.microExpression ??
    narrPerf?.microExpression ??
    shotMeta?.microExpression;
  if (!micro) return null;
  if (typeof micro === "string") return micro.trim() || null;
  if (typeof micro === "object") {
    const eyes = String((micro as { eyes?: string }).eyes ?? "").trim();
    const mouthDetail = String((micro as { mouthDetail?: string }).mouthDetail ?? "").trim();
    if (!eyes && !mouthDetail) return null;
    return { eyes: eyes || undefined, mouthDetail: mouthDetail || undefined };
  }
  return null;
}

function extractBeatDuration(
  shot?: PreDesignShot | null,
  shotMeta?: Record<string, unknown> | null,
): number | null {
  const n = (shot as { narrative?: { beatDuration?: number } } | null)?.narrative;
  const v =
    Number(n?.beatDuration) ||
    Number((shot as { beatDuration?: number } | null)?.beatDuration) ||
    Number((shotMeta?.narrative as { beatDuration?: number } | undefined)?.beatDuration) ||
    Number(shotMeta?.beatDuration) ||
    0;
  return v > 0 ? v : null;
}

function extractImplBind(
  shot?: PreDesignShot | null,
  shotMeta?: Record<string, unknown> | null,
): {
  sfxIntent: string | null;
  avCausality: { audioBeat?: string; visualPeak?: string } | null;
  promptAnchors: string[] | null;
} {
  const impl =
    (shot as { implementationPlan?: Record<string, unknown> } | null)?.implementationPlan ??
    (shotMeta?.implementationPlan as Record<string, unknown> | undefined) ??
    (shotMeta?.implPlan as Record<string, unknown> | undefined);
  const narrative = (shot as { narrative?: Record<string, unknown> } | null)?.narrative ??
    (shotMeta?.narrative as Record<string, unknown> | undefined);
  const sfxIntent = String(
    impl?.sfxIntent ?? narrative?.sfxIntent ?? shotMeta?.sfxIntent ?? "",
  ).trim() || null;
  const avRaw = (impl?.avCausality ?? narrative?.avCausality ?? shotMeta?.avCausality) as
    | { audioBeat?: string; visualPeak?: string }
    | undefined;
  const avCausality =
    avRaw && (avRaw.audioBeat || avRaw.visualPeak)
      ? { audioBeat: avRaw.audioBeat, visualPeak: avRaw.visualPeak }
      : null;
  const anchorsRaw = (impl?.promptAnchors ?? narrative?.promptAnchors ?? shotMeta?.promptAnchors) as
    | string[]
    | string
    | undefined;
  const promptAnchors = Array.isArray(anchorsRaw)
    ? anchorsRaw.map((a) => String(a).trim()).filter(Boolean).slice(0, 6)
    : typeof anchorsRaw === "string" && anchorsRaw.trim()
      ? [anchorsRaw.trim()]
      : null;
  return { sfxIntent, avCausality, promptAnchors };
}

/**
 * True design gap: no VD and no dialogue anywhere — only then hard BLOCK persist/burn.
 * Thin seed with material available must soft-heal via spine, not block.
 */
export function isTrueDesignGap(
  ctx: Pick<ShotCompileContext, "visualDescription" | "dialogueLines" | "gaps" | "canAuthorFromDesign">,
): boolean {
  return !ctx.canAuthorFromDesign && !String(ctx.visualDescription ?? "").trim() && !(ctx.dialogueLines?.length > 0);
}

/**
 * Merge package shot + storyboard row + track meta so hydrate sees VD/dialogue
 * even when package visualDescription is empty.
 */
export function mergeWorkbenchCompileSources(input: {
  designShot?: PreDesignShot | null;
  shotMeta?: Record<string, unknown> | null;
  storyboard?: {
    videoDesc?: string | null;
    prompt?: string | null;
    duration?: string | number | null;
    shotSize?: string | null;
    visualDescription?: string | null;
    narrative?: Record<string, unknown> | null;
    dialogue?: { lines?: { speaker?: string; text?: string }[] } | null;
    audioPrompt?: string | null;
    fxPrompt?: string | null;
  } | null;
  trackPrompt?: string | null;
  trackDuration?: number | null;
  stillIntentClass?: string | null;
}): { designShot: PreDesignShot | null; shotMeta: Record<string, unknown> } {
  const sb = input.storyboard ?? null;
  const pkg = (input.designShot ?? input.shotMeta ?? {}) as Record<string, unknown>;
  // Prefer package/design literary VD; never let motion-template storyboard.videoDesc win
  const vd = preferLiteraryVisualDesc(
    String(
      (input.designShot as { visualDescription?: string } | null)?.visualDescription ??
        pkg.visualDescription ??
        sb?.visualDescription ??
        "",
    ).trim(),
    String(sb?.videoDesc ?? "").trim(),
  );
  const dialFromSb =
    sb?.narrative?.dialogue ??
    (sb?.dialogue as { lines?: unknown } | null | undefined) ??
    undefined;
  const normalizeDialogue = (
    d: unknown,
  ): { type?: string; lines: { speaker?: string; text?: string }[] } | undefined => {
    if (!d) return undefined;
    if (Array.isArray(d)) {
      const lines = d
        .map((l) =>
          typeof l === "string"
            ? { text: l }
            : {
                speaker: String((l as { speaker?: string })?.speaker ?? ""),
                text: String((l as { text?: string })?.text ?? ""),
              },
        )
        .filter((l) => l.text.trim());
      return lines.length ? { lines } : undefined;
    }
    if (typeof d === "object" && d) {
      const obj = d as { type?: string; lines?: unknown };
      const nested = normalizeDialogue(obj.lines ?? []);
      if (!nested?.lines.length) return undefined;
      return { type: obj.type, lines: nested.lines };
    }
    return undefined;
  };
  // NEVER assign bare lines[] to dialogue — extractDialogue expects { lines: [...] }
  const dialogue =
    normalizeDialogue(input.designShot?.narrative?.dialogue) ??
    normalizeDialogue((pkg.narrative as { dialogue?: unknown } | undefined)?.dialogue) ??
    normalizeDialogue(dialFromSb) ??
    normalizeDialogue((input.shotMeta as { dialogue?: unknown } | undefined)?.dialogue);
  const narrative = {
    ...((pkg.narrative as Record<string, unknown>) ?? {}),
    ...((sb?.narrative as Record<string, unknown>) ?? {}),
    ...(dialogue ? { dialogue } : {}),
  };
  const shotMeta: Record<string, unknown> = {
    ...pkg,
    ...(input.shotMeta ?? {}),
    visualDescription: vd || undefined,
    videoDesc: vd || sb?.videoDesc || undefined,
    prompt: input.trackPrompt ?? pkg.prompt ?? sb?.prompt,
    duration:
      (input.designShot as { duration?: number } | null)?.duration ??
      pkg.duration ??
      (sb?.duration != null ? Number(sb.duration) : undefined) ??
      input.trackDuration ??
      undefined,
    shotSize:
      normalizeShotSizeLabel(
        (input.designShot as { shotSize?: string } | null)?.shotSize ??
          (pkg.shotSize as string | undefined) ??
          (pkg.narrative as { shotSize?: string } | undefined)?.shotSize ??
          (pkg.narrative as { cameraAnchor?: { shotSize?: string } } | undefined)?.cameraAnchor?.shotSize ??
          (pkg.cameraAnchor as { shotSize?: string } | undefined)?.shotSize ??
          (sb?.narrative as { cameraAnchor?: { shotSize?: string } } | null | undefined)?.cameraAnchor?.shotSize ??
          sb?.shotSize,
      ) ?? undefined,
    narrative,
    stillIntentClass:
      input.stillIntentClass ??
      (pkg.stillIntentClass as string | undefined) ??
      ((pkg.generation as { stillIntentClass?: string })?.stillIntentClass),
    audioPrompt: sb?.audioPrompt ?? pkg.audioPrompt ?? (pkg.generation as { audioPrompt?: string })?.audioPrompt,
    fxPrompt: sb?.fxPrompt ?? pkg.fxPrompt ?? (pkg.generation as { fxPrompt?: string })?.fxPrompt,
  };
  const designShot: PreDesignShot | null = input.designShot
    ? {
        ...input.designShot,
        visualDescription: vd || input.designShot.visualDescription,
        shotSize: (shotMeta.shotSize as string) ?? input.designShot.shotSize,
        duration: (shotMeta.duration as number) ?? input.designShot.duration,
        narrative: {
          ...input.designShot.narrative,
          dialogue:
            (narrative.dialogue as { lines?: { speaker?: string; text?: string }[] } | undefined) ??
            input.designShot.narrative?.dialogue,
        },
      }
    : vd || (narrative.dialogue as { lines?: unknown } | undefined)?.lines
      ? ({
          visualDescription: vd || undefined,
          shotSize: shotMeta.shotSize as string | undefined,
          duration: shotMeta.duration as number | undefined,
          narrative: {
            dialogue: narrative.dialogue as { lines?: { speaker?: string; text?: string }[] },
          },
        } as PreDesignShot)
      : null;
  return { designShot, shotMeta };
}

/**
 * Sync hydrate from in-memory shot / meta (routes + tests).
 */
export function hydrateShotCompileContextSync(input: {
  designShot?: PreDesignShot | null;
  shotMeta?: Record<string, unknown> | null;
  seedPrompt?: string | null;
  stillPath?: string | null;
  shotIndex?: number | null;
  sceneRef?: number | string | null;
  trackId?: number | null;
  storyboardId?: number | null;
  projectId?: number | string;
  vendorId?: string | null;
  preferStillIntentClass?: string | null;
}): ShotCompileContext {
  const shot = input.designShot ?? null;
  const meta = input.shotMeta ?? null;
  const warnings: string[] = [];

  const visualDescription = String(
    shot?.visualDescription ?? meta?.visualDescription ?? meta?.videoDesc ?? "",
  ).trim();
  const shotSize = extractShotSize(shot, meta);
  const authorDurationSec = extractAuthorDuration(shot, meta);
  const { texts: dialogueLines, objects: dialogueObjects } = extractDialogue(shot, meta);
  const stillIntentClass = input.preferStillIntentClass ?? extractStillIntent(shot, meta);
  const fxLevel = String(shot?.fxLevel ?? meta?.fxLevel ?? "").trim() || null;
  const debutBeat = extractDebutBeat(shot, meta);
  const seedPrompt = String(
    input.seedPrompt ??
      shot?.generation?.videoPrompt ??
      (shot?.generation as { compiled?: { video?: string } } | undefined)?.compiled?.video ??
      meta?.prompt ??
      "",
  ).trim();

  const audioPrompt = String(
    shot?.generation?.audioPrompt ?? meta?.audioPrompt ?? (meta?.generation as { audioPrompt?: string })?.audioPrompt ?? "",
  ).trim() || null;
  const fxPrompt = String(
    shot?.generation?.fxPrompt ?? meta?.fxPrompt ?? (meta?.generation as { fxPrompt?: string })?.fxPrompt ?? "",
  ).trim() || null;
  const audioCue = String(shot?.audioCue ?? meta?.audioCue ?? "").trim() || null;
  const sfx = String(
    (shot?.narrative as { sound?: { sfx?: string } } | undefined)?.sound?.sfx ??
      (meta?.narrative as { sound?: { sfx?: string } } | undefined)?.sound?.sfx ??
      meta?.sfx ??
      "",
  ).trim() || null;
  const cameraMotion = extractCameraMotion(shot, meta);
  const continuityHint = extractContinuityHint(shot, meta);
  const microExpression = extractMicroExpression(shot, meta);
  const beatDurationSec = extractBeatDuration(shot, meta);
  const { sfxIntent, avCausality, promptAnchors } = extractImplBind(shot, meta);

  const shotIndex =
    input.shotIndex != null
      ? asNum(input.shotIndex)
      : asNum(shot?.shotIndex ?? meta?.shotIndex ?? meta?.index);
  const sceneRef = input.sceneRef ?? (shot as { sceneRef?: number })?.sceneRef ?? meta?.sceneRef ?? shotIndex;

  const videoIntent = classifyVideoIntent({
    visualDescription,
    shotSize,
    dialogueLines,
    stillIntentClass,
    fxLevel: fxLevel ?? fxPrompt,
    promptBlob: seedPrompt,
  });

  const durShot = shot
    ? {
        ...shot,
        duration: authorDurationSec ?? shot.duration,
        narrative: {
          ...shot.narrative,
          dialogue: { lines: dialogueObjects.length ? dialogueObjects : shot.narrative?.dialogue?.lines },
        },
      }
    : ({
        visualDescription,
        duration: authorDurationSec ?? undefined,
        shotSize: shotSize ?? undefined,
        narrative: { dialogue: { lines: dialogueObjects } },
      } as PreDesignShot);

  const req = resolveRequiredDuration(durShot, { vendorId: input.vendorId, pillarsDurationV2: true });
  // Content-aware: max(author, lip+emotion); FX/SFX bump when present and no lip.
  // Beat window (1–2s) stays first-class: bump must not silently invent 4/6 without FX/lip.
  let contentBump = 0;
  const authorBeat = beatDurationSec ?? authorDurationSec;
  if (!req.lipMin && (fxPrompt || sfx || audioCue || sfxIntent)) contentBump = 1;
  if (fxPrompt && /摔|爆|灭|闪|崩/.test(fxPrompt + visualDescription)) contentBump = Math.max(contentBump, 2);
  if (authorBeat != null && authorBeat > 0 && authorBeat <= 2 && !req.lipMin && contentBump === 0) {
    // Event beat: keep author seconds; no silent pad to vendor default
    contentBump = 0;
  }
  const durationSec = Math.max(
    1,
    Math.min(
      30,
      Math.ceil(Math.max(req.required || 0, authorDurationSec || 0, beatDurationSec || 0, req.lipMin || 0) + contentBump),
    ),
  );
  if (!authorDurationSec && !beatDurationSec && !req.lipMin) {
    warnings.push("GAP-DURATION:无设计时长且无口型下限");
  } else if (authorDurationSec && req.overVendorMax) {
    warnings.push(`DUR-VENDOR-SNAP:设计${authorDurationSec}s超过vendorMax${req.vendorMax}，将snap并WARN`);
  }
  if (req.lipMin > 0) warnings.push(`DUR-LIP:${req.lipMin}s texts=${req.texts.length}`);
  if (beatDurationSec != null && durationSec > beatDurationSec + 1 && !req.lipMin) {
    warnings.push(`DUR-BEAT-VENDOR:${beatDurationSec}->${durationSec}`);
  }

  const expectsDial =
    videoIntent.intentClass === "speak_lip" ||
    videoIntent.policy.audioMode === "dialogue_lip" ||
    videoIntent.policy.audioMode === "dialogue_or_ambient";
  const gaps: ShotCompileGaps = {
    missingVisualDescription: !visualDescription,
    missingShotSize: !shotSize,
    missingDuration: authorDurationSec == null && !(req.lipMin > 0),
    missingDialogueWhenExpected: expectsDial && videoIntent.intentClass === "speak_lip" && dialogueLines.length === 0,
  };

  const canAuthorFromDesign = Boolean(visualDescription || dialogueLines.length > 0);

  return {
    projectId: input.projectId,
    shotIndex,
    sceneRef: sceneRef ?? null,
    trackId: input.trackId ?? null,
    storyboardId: input.storyboardId ?? null,
    visualDescription,
    shotSize,
    authorDurationSec,
    durationSec: durationSec > 0 ? durationSec : authorDurationSec || req.lipMin || 0,
    dialogueLines,
    dialogueObjects,
    stillPath: input.stillPath ?? null,
    seedPrompt,
    debutBeat,
    stillIntentClass: stillIntentClass ?? null,
    fxLevel,
    sceneName: String(shot?.sceneName ?? meta?.sceneName ?? "").trim() || null,
    audioPrompt,
    fxPrompt,
    audioCue,
    sfx: sfx || sfxIntent,
    cameraMotion,
    continuityHint,
    microExpression,
    beatDurationSec,
    sfxIntent,
    avCausality,
    promptAnchors,
    designShot: shot,
    videoIntent,
    gaps,
    canAuthorFromDesign,
    vendorId: input.vendorId ?? null,
    warnings,
  };
}

/**
 * Async hydrate: optionally load shotMeta from o_videoTrack / storyboard when only ids given.
 */
export async function hydrateShotCompileContext(
  db: Knex | null | undefined,
  input: Parameters<typeof hydrateShotCompileContextSync>[0] & {
    trackId?: number | null;
    storyboardId?: number | null;
    scriptId?: number | null;
  },
): Promise<ShotCompileContext> {
  let shotMeta = input.shotMeta ?? null;
  let designShot = input.designShot ?? null;
  let storyboardRow: {
    videoDesc?: string | null;
    prompt?: string | null;
    duration?: string | number | null;
    shotSize?: string | null;
  } | null = null;

  if (db && input.trackId) {
    try {
      const row = await db("o_videoTrack").where({ id: input.trackId }).first();
      if (row) {
        const trackExtra =
          typeof row.shotMeta === "string"
            ? (JSON.parse(row.shotMeta) as Record<string, unknown>)
            : (row.shotMeta as Record<string, unknown>) ?? {};
        shotMeta = {
          ...(shotMeta ?? {}),
          prompt: row.prompt ?? shotMeta?.prompt,
          duration: row.duration ?? shotMeta?.duration,
          shotIndex: row.shotIndex ?? row.index ?? shotMeta?.shotIndex,
          ...trackExtra,
        };
      }
    } catch {
      /* ignore */
    }
  }

  if (db && input.storyboardId) {
    try {
      const sb = await db("o_storyboard")
        .where({ id: input.storyboardId })
        .select("videoDesc", "prompt", "duration", "reason")
        .first();
      if (sb) {
        storyboardRow = {
          videoDesc: sb.videoDesc,
          prompt: sb.prompt,
          duration: sb.duration,
        };
        let stillIntent: string | null = null;
        try {
          const reason = typeof sb.reason === "string" ? JSON.parse(sb.reason) : sb.reason;
          stillIntent = (reason as { stillIntentClass?: string })?.stillIntentClass ?? null;
        } catch {
          /* ignore */
        }
        const merged = mergeWorkbenchCompileSources({
          designShot,
          shotMeta,
          storyboard: storyboardRow,
          trackPrompt: shotMeta?.prompt as string | undefined,
          stillIntentClass: stillIntent,
        });
        designShot = merged.designShot;
        shotMeta = merged.shotMeta;
      }
    } catch {
      /* ignore */
    }
  } else if (storyboardRow || shotMeta) {
    const merged = mergeWorkbenchCompileSources({
      designShot,
      shotMeta,
      storyboard: storyboardRow,
    });
    designShot = merged.designShot;
    shotMeta = merged.shotMeta;
  }

  return hydrateShotCompileContextSync({ ...input, designShot, shotMeta });
}

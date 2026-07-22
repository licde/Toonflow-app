import type { PreDesignShot, DesignBrief } from "../bundle/types";
import { compileFromShotDesign } from "../bundle/compileFromShotDesign";
import { readFixtureJson } from "../utils/fixturesPath";
import { buildIdentitySlots, injectIdentityTokens, formatIdentityBlock } from "../kernels/promptKernel";
import { applyDesignFieldRegistry, extractDesignFields } from "../design/designFieldRegistry";
import { isVideoPromptStub } from "./sanitizeVideoPrompt";
import { measureDialogue, splitDialogueUtterances } from "../dialogueMetrics";
import { resolveRequiredDuration } from "./resolveRequiredDuration";

export interface PromptIR {
  imagePrompt?: string;
  videoPrompt?: string;
  audioPrompt?: string;
  fxPrompt?: string;
  identitySlots?: { kind: string; code: string }[];
  /** modality_prompt_slots enforce warnings — surface to rePush, never discard */
  slotWarnings?: string[];
  /** Raised duration when lip budget requires it */
  durationSec?: number;
  /** Intent/injection notes for diagnostics */
  notes?: string[];
}

export interface ImplPlanItem {
  sceneRef?: number;
  fxIntent?: { level?: string };
  voiceIntent?: { speaker?: string; timbre?: string; speakingStyle?: string };
  avCausality?: { audioBeat?: string; visualPeak?: string };
  promptAnchors?: { img?: string[]; vid?: string[]; aud?: string[]; fx?: string[] };
}

export interface BuildPromptIROptions {
  designBrief?: DesignBrief;
  implementationPlanItem?: ImplPlanItem | Record<string, unknown>;
  voiceProfile?: { speakingStyle?: string; gender?: string };
  visualLockTable?: Record<string, unknown>;
  /** Force rebuild five-section even when existing prompt looks rich */
  forceRebuild?: boolean;
}

function slotFragments(): Record<string, string[]> {
  return readFixtureJson<{ slots?: Record<string, string[]> }>("modality_prompt_slots.json", {}).slots ?? {};
}

function sceneCodeFromShot(shot: PreDesignShot): string | undefined {
  const n = shot.narrative as { sceneCode?: string } | undefined;
  return (shot as { sceneCode?: string }).sceneCode ?? n?.sceneCode;
}

function propCodesFromShot(shot: PreDesignShot): string[] {
  const top = (shot as { propCodes?: string[] }).propCodes;
  if (Array.isArray(top)) return top;
  return [];
}

function fxLevelOf(shot: PreDesignShot, plan?: ImplPlanItem): string {
  const fromPlan = String(plan?.fxIntent?.level ?? "").toUpperCase().replace(/^FX:/, "");
  const fromShot = String(shot.fxLevel ?? (shot as { fxFeasibility?: string }).fxFeasibility ?? "")
    .toUpperCase()
    .replace(/^FX:/, "");
  return fromPlan || fromShot || "F0";
}

/** Reject letter-grade stubs like "F2" as real fx prose. */
export function isFxPromptGradeStub(fx?: string | null): boolean {
  const t = String(fx ?? "").trim();
  return !t || /^F[0-5]$/i.test(t) || /^FX:\s*F[0-5]$/i.test(t);
}

function compileFxProse(shot: PreDesignShot, plan?: ImplPlanItem): string | undefined {
  const existing = shot.generation?.fxPrompt ?? "";
  if (!isFxPromptGradeStub(existing)) return existing.trim();
  const visual = String(shot.visualEffect ?? "").trim();
  if (visual) return visual.slice(0, 180);
  const anchors = plan?.promptAnchors?.fx ?? [];
  if (anchors.length) return anchors.join(", ").slice(0, 180);
  const level = fxLevelOf(shot, plan);
  if (level && level !== "F0" && level !== "NONE") {
    // No material — leave empty so gates BLOCK rather than invent FX
    return undefined;
  }
  return undefined;
}

function dialogueTexts(shot: PreDesignShot): string[] {
  return splitDialogueUtterances(shot.narrative?.dialogue?.lines);
}

function buildAudioPrompt(shot: PreDesignShot, plan?: ImplPlanItem, voice?: BuildPromptIROptions["voiceProfile"]): string {
  const lines = dialogueTexts(shot);
  const beat = String(plan?.avCausality?.audioBeat ?? shot.audioCue ?? "").trim();
  const style =
    voice?.speakingStyle ??
    plan?.voiceIntent?.speakingStyle ??
    plan?.voiceIntent?.timbre ??
    "自然";
  const lineSpeaker =
    shot.narrative?.dialogue?.lines?.[0]?.speaker ?? plan?.voiceIntent?.speaker ?? "";
  const parts: string[] = [];
  if (lineSpeaker || style) parts.push([lineSpeaker, style].filter(Boolean).join(", "));
  for (const t of lines) parts.push(t);
  if (beat) parts.push(`SFX: ${beat}`);
  const anchors = plan?.promptAnchors?.aud ?? [];
  for (const a of anchors) {
    if (!parts.some((p) => p.includes(a))) parts.push(a);
  }
  return parts.filter(Boolean).join("\n").trim();
}

function shotSizeLabel(shot: PreDesignShot): string {
  const cam = shot.shotDesign?.cameraAnchor as { shotSize?: string } | undefined;
  return String(shot.shotSize ?? cam?.shotSize ?? "medium shot").trim() || "medium shot";
}

/** Thin / empty storyboard image prompts that must be rebuilt. */
export function isImagePromptStub(prompt?: string | null): boolean {
  const t = String(prompt ?? "").trim();
  if (!t) return true;
  if (t.length < 40 && /(static|medium shot|中景|特写)/i.test(t)) return true;
  if (t.length < 24) return true;
  return false;
}

function buildImagePromptFromDesign(shot: PreDesignShot, plan?: ImplPlanItem): string {
  const peak = String(plan?.avCausality?.visualPeak ?? "").trim();
  const desc = String(shot.visualDescription ?? "").trim();
  const comp = shot.shotDesign?.composition as { foreground?: string; background?: string; anchor?: string } | undefined;
  const size = shotSizeLabel(shot);
  const bits = uniq([
    peak,
    comp?.foreground,
    comp?.anchor,
    desc,
    comp?.background,
    shot.sceneName,
    size,
    "cinematic still, keep face identity",
  ]);
  const anchors = plan?.promptAnchors?.img ?? [];
  for (const a of anchors) {
    if (!bits.includes(a)) bits.push(a);
  }
  return bits.join(", ");
}

function buildFiveSectionVideo(shot: PreDesignShot, plan?: ImplPlanItem, durationSec?: number): string {
  const peak = String(plan?.avCausality?.visualPeak ?? "").trim();
  const desc = String(shot.visualDescription ?? "").trim();
  const comp = shot.shotDesign?.composition as { foreground?: string; background?: string; anchor?: string } | undefined;
  const visualBits = uniq([
    peak,
    comp?.foreground,
    comp?.anchor,
    desc,
    comp?.background,
    shot.sceneName,
  ]).join(". ");

  const vidAnchors = plan?.promptAnchors?.vid ?? [];
  const hasDial = dialogueTexts(shot).length > 0;
  const motionPrimary = vidAnchors[0] ?? (hasDial ? "static hold" : "subtle camera follow");
  const dur = durationSec ?? (typeof shot.duration === "number" ? shot.duration : 4);
  const size = shotSizeLabel(shot);
  const camMotion = hasDial ? "static" : "subtle camera";

  const lines = dialogueTexts(shot);
  const beat = String(plan?.avCausality?.audioBeat ?? "").trim();
  const audioBody = lines.length
    ? [...lines.map((t) => `"${t}"`), "lip-sync active.", beat ? `SFX: ${beat}` : ""].filter(Boolean).join("\n")
    : beat
      ? `No spoken dialogue. SFX: ${beat}`
      : "No spoken dialogue. ambient only.";

  const narrative = uniq([
    peak ? `Peak: ${peak.slice(0, 80)}` : "",
    "keep face identity, no exaggerated expression rewrite.",
    vidAnchors.slice(1, 3).join("; "),
  ])
    .filter(Boolean)
    .join(" ");

  return [
    "[Visual]",
    visualBits || "subject in scene, keep face identity.",
    "",
    "[Motion]",
    `0s-${dur}s: ${motionPrimary}.`,
    "",
    "[Camera]",
    `${size}, ${camMotion}, duration ${Math.round(dur)}s, single continuous take.`,
    "",
    "[Audio]",
    audioBody,
    "",
    "[Narrative]",
    narrative || "continuity from design intent.",
  ].join("\n");
}

function uniq(arr: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const t = String(x ?? "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** Enforce modality_prompt_slots: IMG needs cref+identity; VID needs identity. */
export function enforceModalitySlots(ir: PromptIR): string[] {
  const slots = slotFragments();
  const warnings: string[] = [];
  const imgReq = slots.IMG ?? [];
  if (imgReq.includes("cref") && ir.imagePrompt && !/--cref\s+/i.test(ir.imagePrompt)) {
    warnings.push("IMG.cref_missing");
  }
  if (imgReq.includes("identity") && ir.imagePrompt && !ir.identitySlots?.length && !/--cref\s+/i.test(ir.imagePrompt)) {
    warnings.push("IMG.identity_missing");
  }
  const vidReq = slots.VID ?? [];
  if (vidReq.includes("identity") && ir.videoPrompt && !ir.identitySlots?.length && !/identity\[|--cref\s+/i.test(ir.videoPrompt)) {
    warnings.push("VID.identity_missing");
  }
  return warnings;
}

/**
 * Resolve lip-aware duration via resolveRequiredDuration SSOT (D18).
 */
export function resolveLipDuration(shot: PreDesignShot): {
  durationSec: number;
  lipMin: number;
  needsSplit: boolean;
  overVendorMax?: boolean;
  splitHint?: string;
  required?: number;
} {
  const req = resolveRequiredDuration(shot);
  const base = typeof shot.duration === "number" && shot.duration > 0 ? Math.round(shot.duration) : 0;
  const durationSec = Math.max(1, Math.min(30, Math.max(base || 0, req.required || req.lipMin || 0) || 4));
  return {
    durationSec,
    lipMin: req.lipMin,
    // Keep multi-line vs over-vendor distinct — burn reasons must not mislabel overVendor as multi_line.
    needsSplit: req.needsSplit,
    overVendorMax: req.overVendorMax,
    splitHint: req.splitHint,
    required: req.required,
  };
}

export function buildPromptIR(shot: PreDesignShot, opts: BuildPromptIROptions = {}): PromptIR {
  const plan = opts.implementationPlanItem as ImplPlanItem | undefined;
  const notes: string[] = [];
  const fromDesign = compileFromShotDesign(shot);
  const lip = resolveLipDuration(shot);

  const existingVp = shot.generation?.videoPrompt ?? fromDesign.videoPrompt;
  const stub = opts.forceRebuild || isVideoPromptStub(existingVp);

  const existingImg = shot.generation?.imagePrompt ?? fromDesign.imagePrompt;
  const imgStub = isImagePromptStub(existingImg);

  const ir: PromptIR = {
    imagePrompt: imgStub ? undefined : existingImg,
    videoPrompt: stub ? undefined : existingVp,
    audioPrompt: shot.generation?.audioPrompt,
    fxPrompt: shot.generation?.fxPrompt ?? shot.visualEffect,
    durationSec: lip.durationSec,
    notes,
  };

  if (imgStub) {
    ir.imagePrompt = buildImagePromptFromDesign(shot, plan);
    notes.push("image_rebuilt_from_design");
  }

  if (stub) {
    ir.videoPrompt = buildFiveSectionVideo(shot, plan, lip.durationSec);
    notes.push("rebuilt_from_design_intent");
  } else if (plan?.avCausality?.visualPeak && ir.videoPrompt && !ir.videoPrompt.includes(plan.avCausality.visualPeak)) {
    // Inject peak into Visual section or prepend
    if (/\[Visual\]/i.test(ir.videoPrompt)) {
      ir.videoPrompt = ir.videoPrompt.replace(
        /\[Visual\]\s*/i,
        `[Visual]\n${plan.avCausality.visualPeak}. `,
      );
    } else {
      ir.videoPrompt = `${plan.avCausality.visualPeak}. ${ir.videoPrompt}`;
    }
    notes.push("injected_visual_peak");
  }

  const anchors = plan?.promptAnchors;
  if (anchors?.img?.length && ir.imagePrompt) {
    for (const a of anchors.img) {
      if (!ir.imagePrompt.includes(a)) ir.imagePrompt = `${ir.imagePrompt}, ${a}`;
    }
  }
  if (anchors?.vid?.length && ir.videoPrompt) {
    for (const a of anchors.vid) {
      if (!ir.videoPrompt.includes(a)) {
        if (/\[Motion\]/i.test(ir.videoPrompt)) {
          ir.videoPrompt = ir.videoPrompt.replace(/\[Motion\]\s*/i, `[Motion]\n${a}. `);
        } else {
          ir.videoPrompt = `${ir.videoPrompt}, ${a}`;
        }
      }
    }
  }

  // Audio slot: always prefer source lines + beat over timbre-only stubs
  const builtAud = buildAudioPrompt(shot, plan, opts.voiceProfile);
  const linesForAud = dialogueTexts(shot);
  const audHasLine = linesForAud.some((t) => (ir.audioPrompt ?? "").includes(t.slice(0, Math.min(6, t.length))));
  const audStub =
    !ir.audioPrompt?.trim() ||
    (linesForAud.length > 0 && !audHasLine);
  if (builtAud && audStub) {
    ir.audioPrompt = builtAud;
    notes.push("audio_from_lines_and_beat");
  }

  // Sync Chinese lines into [Audio] when video has No dialogue
  const lines = dialogueTexts(shot);
  if (lines.length && ir.videoPrompt && /no\s*(spoken\s*)?dialogue/i.test(ir.videoPrompt)) {
    const block = lines.map((t) => `"${t}"`).join("\n") + "\nlip-sync active.";
    if (/\[Audio\]/i.test(ir.videoPrompt)) {
      ir.videoPrompt = ir.videoPrompt.replace(/\[Audio\][\s\S]*?(?=\[Narrative\]|$)/i, `[Audio]\n${block}\n\n`);
    }
    notes.push("audio_section_restored");
  }

  // FX honesty
  const level = fxLevelOf(shot, plan);
  const fxProse = compileFxProse(shot, plan);
  if (level !== "F0" && level !== "NONE") {
    if (fxProse) {
      ir.fxPrompt = fxProse;
      notes.push("fx_from_visualEffect_or_anchors");
    } else if (isFxPromptGradeStub(ir.fxPrompt)) {
      ir.fxPrompt = undefined;
      notes.push("fx_grade_stub_cleared");
      ir.slotWarnings = [...(ir.slotWarnings ?? []), "FX.prose_missing"];
    }
  } else if (isFxPromptGradeStub(ir.fxPrompt)) {
    ir.fxPrompt = undefined;
  }

  if (lip.needsSplit) {
    notes.push(`lip_split_recommended:${lip.splitHint ?? "multi_line"}`);
  }

  const identitySlots = buildIdentitySlots({
    charCodes: shot.charCodes ?? [],
    sceneCode: sceneCodeFromShot(shot),
    propCodes: propCodesFromShot(shot),
  });
  ir.identitySlots = identitySlots;

  if (ir.imagePrompt != null || identitySlots.length) {
    ir.imagePrompt = injectIdentityTokens(ir.imagePrompt ?? "", identitySlots);
  }
  // Video: short identity[] only — Midjourney --cref/--sref stripped at finalize; media slots carry refs
  if (ir.videoPrompt != null || identitySlots.length) {
    let vp = ir.videoPrompt ?? "";
    const block = formatIdentityBlock(identitySlots);
    if (block && !vp.includes("identity[")) vp = vp.trim() ? `${vp}\n${block}` : block;
    ir.videoPrompt = vp;
  }

  const emotion = shot.emotion ?? shot.narrative?.emotionIntensity;
  const spatial = shot.narrative?.spatialRelation;
  const colorTemp =
    (shot as { colorTemp?: string }).colorTemp ??
    (opts.visualLockTable as { sceneColorLock?: Record<string, { colorTemp?: string }> } | undefined)?.sceneColorLock?.[
      sceneCodeFromShot(shot) ?? ""
    ]?.colorTemp;
  const fields = extractDesignFields({
    modality: "video",
    shot: shot as never,
  });
  if (colorTemp) fields.colorTemp = colorTemp;
  if (emotion != null) fields.emotion = emotion;
  if (spatial) fields.spatialRelation = spatial;
  if (ir.durationSec) fields.duration = ir.durationSec;
  if (ir.imagePrompt) {
    ir.imagePrompt = applyDesignFieldRegistry(ir.imagePrompt, fields, { modality: "image" }).prompt;
  }
  if (ir.videoPrompt) {
    ir.videoPrompt = applyDesignFieldRegistry(ir.videoPrompt, fields, { modality: "video" }).prompt;
  }

  void opts.designBrief;
  ir.slotWarnings = [...(ir.slotWarnings ?? []), ...enforceModalitySlots(ir)];
  ir.notes = notes;
  return ir;
}

export function applyPromptIRToShot(shot: PreDesignShot, ir: PromptIR): PreDesignShot {
  const next: PreDesignShot = {
    ...shot,
    duration: ir.durationSec ?? shot.duration,
    generation: {
      ...shot.generation,
      imagePrompt: ir.imagePrompt ?? shot.generation?.imagePrompt,
      videoPrompt: ir.videoPrompt ?? shot.generation?.videoPrompt,
      audioPrompt: ir.audioPrompt ?? shot.generation?.audioPrompt,
      fxPrompt: ir.fxPrompt ?? shot.generation?.fxPrompt,
    },
  };
  return next;
}

/** Find implementationPlan item for a shot (by sceneRef / sceneName order). */
export function findImplPlanItem(
  plan: ImplPlanItem[] | undefined,
  shot: PreDesignShot,
  allShots?: PreDesignShot[],
): ImplPlanItem | undefined {
  if (!plan?.length) return undefined;
  const explicit = (shot as { sceneRef?: number }).sceneRef;
  if (explicit != null) {
    const hit = plan.find((p) => p.sceneRef === explicit);
    if (hit) return hit;
  }
  if (allShots?.length) {
    const order: string[] = [];
    for (const s of allShots) {
      const n = String(s.sceneName ?? "").trim();
      if (n && !order.includes(n)) order.push(n);
    }
    const name = String(shot.sceneName ?? "").trim();
    const ord = name ? order.indexOf(name) + 1 : 0;
    if (ord > 0) {
      const hit = plan.find((p) => p.sceneRef === ord);
      if (hit) return hit;
    }
  }
  const ref = shot.shotIndex;
  if (ref != null) {
    const hit = plan.find((p) => p.sceneRef === ref);
    if (hit) return hit;
  }
  return plan[0];
}

/**
 * compileVideoPromptSpine — sole five-section video prompt author.
 * Order: hydrate → classify → IR → sidecar(in-spine) → soft QF → assert → dual-write fields.
 */
import { createHash } from "crypto";
import type { PreDesignShot } from "../bundle/types";
import { appendViralSidecarToPrompt } from "../design/bindViralSidecarForCompile";
import { softPatchQfExpr } from "./qfExprGate";
import { sanitizeVideoPrompt } from "./sanitizeVideoPrompt";
import { finalizeFiveSectionPrompt } from "./finalizeFiveSectionPrompt";
import { resolveRequiredDuration, vendorMaxForId } from "./resolveRequiredDuration";
import { snapDurationToVendorMap, VENDOR_DURATION_BUCKETS } from "../vendor-packs/videoVendorPack";
import {
  hydrateShotCompileContextSync,
  type ShotCompileContext,
} from "./hydrateShotCompileContext";
import { assertVideoPromptReady, isVideoPromptThinShell } from "./assertVideoPromptReady";
import { SILENT_AUDIO_RE } from "./sanitizeVideoPrompt";
import type { VideoIntentClassification } from "./videoIntentPolicy";
import { peelLiteraryBody, literaryCjkScore } from "./resolveTrackStoryboard";
import { seedContradictsDesign } from "./staleSeedDetector";
import { isFxPromptGradeStub } from "./promptIR";

/** FX grade tokens (F0–F5) are feasibility labels — never literal event-peak copy. */
function eventPeakFromDesign(ctx: ShotCompileContext): string | null {
  const raw = String(ctx.avCausality?.visualPeak || ctx.fxPrompt || "").trim();
  if (raw && !isFxPromptGradeStub(raw)) return raw.slice(0, 36);
  const beat = String(ctx.debutBeat ?? "").trim();
  if (beat) return beat.slice(0, 36);
  if (ctx.videoIntent.intentClass === "fx_peak" && raw) return raw.slice(0, 36);
  return null;
}

function sceneAudioBeatFromCtx(ctx: ShotCompileContext): string | null {
  const shot = ctx.designShot as Record<string, unknown> | null | undefined;
  const meta =
    (shot?.sceneMeta as { audioBeat?: string } | undefined) ??
    ((shot?.narrative as { sceneMeta?: { audioBeat?: string } } | undefined)?.sceneMeta);
  const beat = String(meta?.audioBeat ?? "").trim();
  return beat || null;
}

function isAudioAmbientOnly(audioBody: string): boolean {
  const t = String(audioBody ?? "").trim();
  if (!t) return true;
  if (/音效：|音效拍点：|"[^"]{2,}"/.test(t)) return false;
  return SILENT_AUDIO_RE.test(t) || /^无对白[。；;\s]*仅环境音效/.test(t.replace(/\s+/g, ""));
}

export type SpineCompileInput = {
  ctx?: ShotCompileContext;
  designShot?: PreDesignShot | null;
  shotMeta?: Record<string, unknown> | null;
  seedPrompt?: string | null;
  agentPlan?: Record<string, unknown> | null;
  vendorId?: string | null;
  modeId?: string | null;
  /** Force rebuild even if seed looks rich */
  forceRebuild?: boolean;
  includeSidecar?: boolean;
};

export type SpineCompileResult = {
  prompt: string;
  durationSec: number;
  intentClass: string;
  source: "prompt_ir" | "seed_heal" | "blocked";
  ready: boolean;
  readyCode?: string;
  readyReasons: string[];
  reverseTrigger?: "video_prompt_stub";
  promptHash: string;
  warnings: string[];
  videoIntent: VideoIntentClassification;
  ctx: ShotCompileContext;
  generationWriteback: {
    videoPrompt: string;
    compiledVideo: string;
    promptHash: string;
    durationSec: number;
    stillIntentClass?: string | null;
    intentClass: string;
  };
};

function promptHashOf(prompt: string): string {
  return createHash("sha256").update(String(prompt ?? "")).digest("hex").slice(0, 16);
}

function mapShotSizeLabel(raw: string | null | undefined, force?: string | null): string {
  if (force) return force;
  const t = String(raw ?? "").trim();
  if (!t) return ""; // explicit gap — caller must not invent 中景
  if (/特写|大特|cu\b|ecu|close/i.test(t)) return /大特|ecu|extreme/i.test(t) ? "大特写" : "特写";
  if (/近景|close.?medium|bust/i.test(t)) return "近景";
  if (/全景|wide|ws|远景/i.test(t)) return "全景";
  if (/中景|medium|ms/i.test(t)) return "中景";
  return t;
}

function buildFiveSectionFromContext(ctx: ShotCompileContext): string {
  const policy = ctx.videoIntent.policy;
  const hasDialEarly = ctx.dialogueLines.length > 0;
  const authorShotLabel = mapShotSizeLabel(ctx.shotSize);
  // Prefer design size when present; prop_cu force 特写; speak_lip promotes to 近景 with author note
  let shotSize =
    policy.forceShotSize && (!ctx.shotSize || /cu|特写|close/i.test(ctx.shotSize))
      ? policy.forceShotSize
      : authorShotLabel || (policy.forceShotSize ?? "近景");
  let shotSizeAuthorNote = "";
  let adaptDiffShotSize = "";
  const speakLike =
    hasDialEarly &&
    (policy.audioMode === "dialogue_lip" || ctx.videoIntent.intentClass === "speak_lip");
  if (speakLike) {
    try {
      const { shotSizeWiderThanNear, grammarDefaultForIntent } =
        require("./cinematicShotGrammar") as typeof import("./cinematicShotGrammar");
      const industry = grammarDefaultForIntent("speak_lip");
      // Realization-only near framing: never write back design shotSize SSOT
      if (shotSizeWiderThanNear(shotSize) && industry?.shotSize) {
        shotSizeAuthorNote = authorShotLabel || String(ctx.shotSize ?? "中景");
        adaptDiffShotSize = `设计${shotSizeAuthorNote}↔实现${industry.shotSize}`;
        shotSize = industry.shotSize;
      }
    } catch {
      if (/中景|全景|远景|ms|ws/i.test(shotSize)) {
        shotSizeAuthorNote = shotSize;
        adaptDiffShotSize = `设计${shotSize}↔实现近景`;
        shotSize = "近景";
      }
    }
  }

  const dur = Math.max(1, Math.round(ctx.durationSec || 0));
  // Never invent 4-char「画面主体」thin shell — require VD or scene+size literary enough
  // Full peeled VD wins — first-clause-only drops mutex atoms (纸未入口/仅颊触).
  const rawVd = String(ctx.visualDescription ?? "").trim();
  const peeledVd = peelLiteraryBody(rawVd);
  const visual =
    (literaryCjkScore(peeledVd) >= 8 ? peeledVd : "") ||
    (ctx.sceneName && shotSize ? `${ctx.sceneName}，${shotSize}` : "") ||
    (ctx.dialogueLines.length ? `对白表演镜：${ctx.dialogueLines[0].slice(0, 40)}` : "");
  if (!visual) {
    // Caller must not persist this path; return minimal scaffold only for scrub pipeline
    return [
      "[Visual]",
      "",
      "",
      "[Motion]",
      `0s-${dur}s: ${policy.motionDefault}。`,
      "",
      "[Camera]",
      `${shotSize || "近景"}，${policy.cameraMotion}，时长 ${dur}s，单次连续镜头。`,
      "",
      "[Audio]",
      "无对白。仅环境音效。",
      "",
      "[Narrative]",
      "设计缺口：缺画面描写与对白。",
    ].join("\n");
  }

  const hasDial = ctx.dialogueLines.length > 0;
  let motion = policy.motionDefault;
  let motionFromContact = false;
  let motionMultiPhase = false;
  const adaptPack = ctx.realizationAdaptPack ?? null;
  const adaptMotion =
    adaptPack?.motionBody && (adaptPack.adapted || adaptPack.realizationDegraded)
      ? adaptPack.motionBody
      : null;

  if (adaptMotion) {
    motion = adaptMotion;
    motionMultiPhase = adaptMotion.includes("\n");
  }
  if (hasDial && (policy.audioMode === "dialogue_lip" || ctx.videoIntent.intentClass === "speak_lip")) {
    if (!adaptMotion) motion = "静止持镜";
  }
  // Contact-event: executable multi-phase beats (never collapse to 微表情呼吸 alone)
  if (!adaptMotion) {
  try {
    const { buildContactEventMotionBeats, isContactEventVd } =
      require("./contactEventPolicy") as typeof import("./contactEventPolicy");
    if (isContactEventVd(ctx.visualDescription)) {
      const stillMeta = (ctx.shotMeta ?? ctx.designShot ?? {}) as Record<string, unknown>;
      const beats = buildContactEventMotionBeats({
        visualDescription: ctx.visualDescription,
        durationSec: dur,
        woundVisible: /浅痕|渗血|血珠/.test(ctx.visualDescription),
        stillPrompt: String(stillMeta.promptUsed ?? stillMeta.stillPrompt ?? ""),
        stillPoseAnchor: stillMeta.stillPoseAnchor as { state?: string } | undefined,
        contactStartState: stillMeta.contactStartState as import("./contactEventPolicy").ContactStartState | undefined,
      });
      if (beats?.body) {
        motion = beats.body;
        motionFromContact = true;
      }
    }
  } catch {
    /* optional */
  }
  }
  // Enrich motion from VD action verbs (design-perf → Motion) — skip if contact beats or adapt already set
  if (!motionFromContact && !adaptMotion) {
    const m = ctx.visualDescription.match(
      /[^。；;\n]{0,16}(?:弯腰|俯身|捡起|捡|拾起|捏紧|捏|划过|拂过|贴合|颊触|划|擦|甩|咬|颤|推|拉|跪|坐|渗|攥|握|摩挲|扳指)[^。；;\n]{0,16}/,
    );
    if (m?.[0]?.trim()) motion = m[0].trim().slice(0, 48);
  }
  // Non-contact CHAR-SCENE: timed phases from VD action chain (弯腰→触及→捏紧)
  if (!motionFromContact && !adaptMotion && !/^\d/.test(motion) && /弯腰|俯身|捡|捏|触及|捡起/.test(ctx.visualDescription)) {
    const d = Math.max(2, dur);
    const a = Math.max(0.5, Math.round((d / 3) * 10) / 10);
    const b = Math.max(a + 0.5, Math.round(((2 * d) / 3) * 10) / 10);
    const phases: string[] = [];
    if (/弯腰|俯身/.test(ctx.visualDescription)) phases.push(`0s-${a}s: 弯腰俯身`);
    if (/捡|拾|触及/.test(ctx.visualDescription)) {
      phases.push(`${phases.length ? a : 0}s-${b}s: 指尖触及物件`);
    }
    if (/捏|攥|握/.test(ctx.visualDescription)) {
      phases.push(`${phases.length ? b : a}s-${d}s: 捏紧纸缘`);
    }
    if (phases.length >= 2) {
      motion = phases.join("\n");
      motionMultiPhase = true;
    }
  }
  // Enrich motion from VD micro-verbs when prop_cu
  if (!motionFromContact && ctx.videoIntent.intentClass === "prop_cu" && /摩挲|扳|捻|握/.test(ctx.visualDescription)) {
    const m = ctx.visualDescription.match(/[^。；;\n]{0,12}(?:摩挲|扳指|捻|握)[^。；;\n]{0,12}/);
    if (m?.[0]) motion = m[0].trim().slice(0, 40);
  }
  // fx_peak: event beat into Motion (declare-only from fxPrompt / avCausality / debutBeat)
  const peakLabel = eventPeakFromDesign(ctx);
  const fxPeak =
    Boolean(peakLabel) &&
    (ctx.videoIntent.intentClass === "fx_peak" ||
      /摔|爆|灭|闪|崩|特效/.test(
        String(ctx.fxPrompt ?? "") + String(ctx.avCausality?.visualPeak ?? "") + ctx.visualDescription,
      ));
  if (fxPeak && peakLabel && !motionFromContact) {
    motion = `${motion}；事件拍点：${peakLabel}`;
  }
  // microExpression → Motion: eyes always when authored; mouth only when no dialogue (lip owns mouth)
  if (ctx.microExpression) {
    const eyes =
      typeof ctx.microExpression === "string"
        ? ""
        : String(ctx.microExpression.eyes ?? "").trim();
    const mouth =
      typeof ctx.microExpression === "string"
        ? ctx.microExpression
        : String(ctx.microExpression.mouthDetail ?? "").trim();
    if (hasDial && eyes) {
      motion = `${motion}；微表情：眼神${eyes.slice(0, 16)}`;
    } else if (!hasDial && !motionFromContact) {
      const micro = typeof ctx.microExpression === "string"
        ? ctx.microExpression
        : [eyes, mouth].filter(Boolean).join("，");
      if (micro) motion = `${motion}；微表情：${String(micro).slice(0, 24)}`;
    }
  }
  if (adaptPack?.performanceBoost && !motion.includes(adaptPack.performanceBoost.slice(0, 4))) {
    motion = `${motion}；${adaptPack.performanceBoost}`.trim();
  }
  // Industry AV beats from fixture softHints (realization Motion — design SSOT already has avBeats)
  if (hasDial && !motionFromContact) {
    try {
      const { softGrammarHints } =
        require("./cinematicShotGrammar") as typeof import("./cinematicShotGrammar");
      const breath = softGrammarHints(["dialogueBreath"])[0] ?? "台词前微停";
      if (!/微停|留白|呼吸/.test(motion)) {
        motion = `${breath}；${motion}`.trim();
      }
    } catch {
      if (!/微停|留白|呼吸/.test(motion)) {
        motion = `台词前微停；${motion}`.trim();
      }
    }

    // Wave-3 J/L-cut + axis180: design avBeats → realization Motion note (no shotSize rewrite)
    {
      try {
        const { softGrammarHints } =
          require("./cinematicShotGrammar") as typeof import("./cinematicShotGrammar");
        const designBeats = Array.isArray(
          (ctx.designShot as { narrative?: { avBeats?: string[] } } | null)?.narrative?.avBeats,
        )
          ? ((ctx.designShot as { narrative: { avBeats: string[] } }).narrative.avBeats)
          : [];
        const jCut = softGrammarHints(["jCut"])[0] ?? "下句声先入再切画";
        const lCut = softGrammarHints(["lCut"])[0] ?? "本镜声延至下画";
        const axis180 = softGrammarHints(["axis180"])[0] ?? "保持180度轴线，过肩对切不越轴";
        const wantsJ = designBeats.some((b) => /J.?cut|下句声先入|声先入/i.test(b));
        const wantsL = designBeats.some((b) => /L.?cut|声延至下|本镜声延/i.test(b));
        const wantsAxis = designBeats.some((b) => /180|轴线|过肩对切|不越轴/.test(b));
        if (wantsJ && !motion.includes(jCut.slice(0, 4))) motion = `${jCut}；${motion}`.trim();
        if (wantsL && !motion.includes(lCut.slice(0, 4))) motion = `${lCut}；${motion}`.trim();
        if (wantsAxis && !motion.includes("轴线") && !motion.includes("180")) {
          motion = `${axis180}；${motion}`.trim();
        }
      } catch {
        /* optional */
      }
    }
    if (
      (/弯腰|跪持|俯身|低头/.test(ctx.visualDescription) ||
        adaptPack?.realizationOccupancy === "kneel_hold" ||
        adaptPack?.realizationDegraded) &&
      !/抬视线|面容可读|抬脸/.test(motion)
    ) {
      motion = `${motion}；末相抬视线面容可读口型`.trim();
      motionMultiPhase = true;
    }
  }
  // Plate-first motionStartHint + i2vCriticalFacts into Motion lead (dedupe)
  {
    const meta = (ctx.shotMeta ?? {}) as Record<string, unknown>;
    const hint = String(
      adaptPack?.motionStartHint ?? meta.videoMotionStartHint ?? "",
    ).trim();
    const facts = [
      ...(adaptPack?.i2vCriticalFacts ?? []),
      ...((meta.i2vCriticalFacts as string[] | undefined) ?? []),
    ].filter(Boolean);
    const leadBits = [...(hint ? [hint.slice(0, 40)] : []), ...facts.slice(0, 3).map((f) => String(f).slice(0, 16))];
    const uniqLead = [...new Set(leadBits)].filter((b) => b && !motion.includes(b.slice(0, 6)));
    if (uniqLead.length) {
      motion = `${uniqLead.join("；")}；${motion}`.trim();
    }
  }

  // Contact SFX hint into audio path later — stash on ctx via narrative bit
  let contactSfx: string | null = null;
  try {
    const { matchContactEventVd, contactSfxHint } =
      require("./contactEventPolicy") as typeof import("./contactEventPolicy");
    const cm = matchContactEventVd(ctx.visualDescription);
    if (cm.isContactEvent) contactSfx = contactSfxHint(cm);
  } catch {
    /* optional */
  }

  // Design camera declare-only; dialogue forces static; CAM-SPEAK already clamped in hydrate
  let camMotion =
    adaptPack?.cameraPolicy ??
    (hasDial ? "静止" : String(ctx.cameraMotion ?? "").trim() || policy.cameraMotion);
  if (speakLike) camMotion = "静止";
  // Viral mediate aggressive cams to vendor-legal (spine-time) — never strip contact Motion verbs
  try {
    const { mediateViralMotion } =
      require("./viralMotionMediate") as typeof import("./viralMotionMediate");
    const med = mediateViralMotion({ text: camMotion, vendorId: ctx.vendorId });
    if (!med.confirmRequired && med.changed) camMotion = med.mediated;
  } catch {
    /* optional */
  }
  if (/whip.?pan|crash.?zoom|dutch|handheld.?shake|速切|甩镜/i.test(camMotion)) {
    camMotion = "轻微运镜";
  }

  let visualBody = visual;
  if (fxPeak && peakLabel) {
    visualBody = `${visual}。特效可见：${peakLabel}`;
  }
  if (ctx.compositionForeground) {
    visualBody = `${visualBody}。前景：${ctx.compositionForeground.slice(0, 24)}`;
  }
  if (ctx.compositionBackground) {
    visualBody = `${visualBody}。背景：${ctx.compositionBackground.slice(0, 24)}`;
  }
  if (ctx.spatialRelation) {
    visualBody = `${visualBody}。站位：${ctx.spatialRelation.slice(0, 40)}`;
  }
  if (ctx.bgBlur === false) {
    visualBody = `${visualBody}。背景清晰不虚化`;
  }
  if (ctx.promptAnchors?.length) {
    visualBody = `${visualBody}。锚点：${ctx.promptAnchors.slice(0, 3).join("/")}`;
  }
  if (ctx.continuityHint) {
    visualBody = `${visualBody}（承接：${ctx.continuityHint}）`;
  }
  if (adaptPack?.atmosphereBoost && !visualBody.includes(adaptPack.atmosphereBoost.slice(0, 4))) {
    visualBody = `${visualBody}。${adaptPack.atmosphereBoost.slice(0, 24)}`;
  }

  let audioBody: string;
  try {
    const { audioBodyForMode } =
      require("./videoDesignContract") as typeof import("./videoDesignContract");
    audioBody = audioBodyForMode({
      audioMode: policy.audioMode,
      dialogueLines: ctx.dialogueLines,
      sfx:
        ctx.sfx ||
        ctx.sfxIntent ||
        adaptPack?.sfxBeat ||
        ctx.audioCue ||
        ctx.avCausality?.audioBeat ||
        contactSfx ||
        undefined,
      ambient: undefined,
      voiceCharacter: ctx.audioPrompt?.slice(0, 80) || undefined,
    });
  } catch {
    const audioBits: string[] = [];
    if (hasDial) {
      audioBits.push(...ctx.dialogueLines.map((t) => `"${t}"`));
      audioBits.push("口型同步开启。");
    } else {
      audioBits.push("无对白。");
    }
    const sfxLine =
      ctx.sfx || ctx.sfxIntent || adaptPack?.sfxBeat || ctx.audioCue || ctx.avCausality?.audioBeat || contactSfx;
    if (sfxLine) audioBits.push(`音效：${sfxLine}`);
    if (ctx.audioPrompt) audioBits.push(`声线：${ctx.audioPrompt.slice(0, 80)}`);
    if (!hasDial && !sfxLine) audioBits.push("仅环境音效。");
    audioBody = audioBits.join("\n");
  }
  // FX prose echo in Audio — grade tokens (F0=no VFX) are never echoed
  const fxProse = String(ctx.fxPrompt ?? "").trim();
  if (fxProse && !isFxPromptGradeStub(fxProse) && !fxPeak && !audioBody.includes(fxProse.slice(0, 20))) {
    audioBody = `${audioBody}\n视觉特效呼应：${fxProse.slice(0, 80)}`.trim();
  }
  if (ctx.avCausality?.audioBeat && !audioBody.includes(ctx.avCausality.audioBeat.slice(0, 12))) {
    audioBody = `${audioBody}\n音效拍点：${ctx.avCausality.audioBeat.slice(0, 40)}`.trim();
  }
  // G6: ambient-only Audio → inject design audioBeat when present
  if (isAudioAmbientOnly(audioBody)) {
    const designBeat = ctx.avCausality?.audioBeat ?? sceneAudioBeatFromCtx(ctx);
    if (designBeat && !audioBody.includes(designBeat.slice(0, 8))) {
      audioBody = `无对白。\n音效拍点：${designBeat.slice(0, 40)}`.trim();
      if (contactSfx && !audioBody.includes(contactSfx.slice(0, 4))) {
        audioBody = `${audioBody}\n音效：${contactSfx}`.trim();
      }
    }
  }
  if (contactSfx && !audioBody.includes(contactSfx.slice(0, 4))) {
    audioBody = `${audioBody}\n音效：${contactSfx}`.trim();
  }

  // Wave-3 Audio J/L-cut notes from design avBeats (realization only)
  {
    const designBeats = Array.isArray(
      (ctx.designShot as { narrative?: { avBeats?: string[] } } | null)?.narrative?.avBeats,
    )
      ? ((ctx.designShot as { narrative: { avBeats: string[] } }).narrative.avBeats)
      : [];
    try {
      const { softGrammarHints } =
        require("./cinematicShotGrammar") as typeof import("./cinematicShotGrammar");
      const jCut = softGrammarHints(["jCut"])[0] ?? "下句声先入再切画";
      const lCut = softGrammarHints(["lCut"])[0] ?? "本镜声延至下画";
      if (designBeats.some((b) => /J.?cut|下句声先入|声先入/i.test(b)) && !audioBody.includes("声先入")) {
        audioBody = `${audioBody}\n转场声画：${jCut}`.trim();
      }
      if (designBeats.some((b) => /L.?cut|声延至下|本镜声延/i.test(b)) && !audioBody.includes("声延")) {
        audioBody = `${audioBody}\n转场声画：${lCut}`.trim();
      }
    } catch {
      /* optional */
    }
  }

  const narrativeBits = [
    ctx.debutBeat ? `本镜节拍：${ctx.debutBeat.slice(0, 80)}` : "",
    ctx.beatDurationSec != null ? `beatDuration:${ctx.beatDurationSec}s` : "",
    ctx.emotionIntensity != null ? `情绪强度:${ctx.emotionIntensity}` : "",
    ctx.emotionIntensity != null && ctx.emotionIntensity >= 6
      ? adaptPack?.performanceBoost || "表演：隐忍决绝"
      : "",
    shotSizeAuthorNote ? `作者景别注记:${shotSizeAuthorNote}→制作近景` : "",
    adaptDiffShotSize ? `adaptDiff:${adaptDiffShotSize}` : "",
    (() => {
      const beats = Array.isArray(
        (ctx.designShot as { narrative?: { avBeats?: string[] } } | null)?.narrative?.avBeats,
      )
        ? ((ctx.designShot as { narrative: { avBeats: string[] } }).narrative.avBeats)
        : [];
      if (!beats.length) return "";
      const jl = beats.filter((b) => /J.?cut|L.?cut|声先入|声延|180|轴线/i.test(b));
      if (!jl.length) return `avBeats:${beats.slice(0, 3).join("|")}`;
      return `avBeats:${jl.slice(0, 4).join("|")} adaptDiff:designAvBeats→realize`;
    })(),
    (() => {
      const narr = (ctx.designShot as { narrative?: { transitionType?: string; rhythmZone?: string } } | null)
        ?.narrative;
      const tr = String(narr?.transitionType ?? "").trim();
      const rz = String(narr?.rhythmZone ?? "").trim();
      return [tr ? `转场:${tr}` : "", rz ? `节奏区:${rz}` : ""].filter(Boolean).join(" ");
    })(),
    adaptPack?.narrativeFootnote ? `实现注记：${adaptPack.narrativeFootnote}` : "",
    adaptPack?.adapted ? "motionFrom:realizationAdapt" : "",
    "锁定脸型身份，禁止夸张改面容身份。",
    `intent:${ctx.videoIntent.intentClass}`,
    motionFromContact ? "motionFrom:contactEvent" : "",
    ctx.fxPrompt && !isFxPromptGradeStub(ctx.fxPrompt) ? `fx:${ctx.fxPrompt.slice(0, 40)}` : "",
    ctx.continuityHint ? `continuity:${ctx.continuityHint}` : "",
  ].filter(Boolean);

  const motionBlock = (motionFromContact || motionMultiPhase) && motion.includes("\n")
    ? motion
    : `0s-${dur}s: ${motion}。`;

  return [
    "[Visual]",
    visualBody,
    "",
    "[Motion]",
    motionBlock,
    "",
    "[Camera]",
    `${shotSize}，${camMotion}，时长 ${dur}s，单次连续镜头。`,
    "",
    "[Audio]",
    audioBody,
    "",
    "[Narrative]",
    narrativeBits.join(" "),
  ].join("\n");
}

function resolveDurationForSpine(ctx: ShotCompileContext): { durationSec: number; warnings: string[] } {
  const warnings: string[] = [];
  // Prefer hydrate's content-aware durationSec (already lip+FX aware)
  if (ctx.durationSec > 0 && (ctx.dialogueLines.length > 0 || ctx.authorDurationSec || ctx.fxPrompt || ctx.sfx)) {
    const shot =
      ctx.designShot ??
      ({
        duration: ctx.authorDurationSec ?? undefined,
        visualDescription: ctx.visualDescription,
        narrative: { dialogue: { lines: ctx.dialogueObjects } },
      } as PreDesignShot);
    const req = resolveRequiredDuration(shot, { vendorId: ctx.vendorId, pillarsDurationV2: true });
    let durationSec = Math.max(ctx.durationSec, req.required || 0, ctx.authorDurationSec || 0);
    const vendorKey = String(ctx.vendorId ?? "agnesai").toLowerCase();
    const buckets =
      VENDOR_DURATION_BUCKETS[
        vendorKey.includes("kling")
          ? "klingai"
          : vendorKey.includes("wan")
            ? "wan"
            : vendorKey.includes("agnes")
              ? "agnesai"
              : "default"
      ] ?? VENDOR_DURATION_BUCKETS.default;
    const snap = snapDurationToVendorMap(durationSec, buckets, { lipMin: req.lipMin });
    if (snap.duration !== durationSec) {
      warnings.push(`DUR-VENDOR-SNAP:${durationSec}->${snap.duration} (max ${vendorMaxForId(ctx.vendorId)})`);
    }
    return { durationSec: snap.duration, warnings };
  }
  const shot =
    ctx.designShot ??
    ({
      duration: ctx.authorDurationSec ?? undefined,
      visualDescription: ctx.visualDescription,
      narrative: { dialogue: { lines: ctx.dialogueObjects } },
    } as PreDesignShot);
  const req = resolveRequiredDuration(shot, { vendorId: ctx.vendorId, pillarsDurationV2: true });
  let durationSec = Math.max(1, Math.round(req.required || ctx.authorDurationSec || ctx.durationSec || 0));
  if (!durationSec) {
    warnings.push("GAP-DURATION:无可用时长");
    durationSec = Math.max(1, req.lipMin || 4);
  }
  const vendorKey = String(ctx.vendorId ?? "agnesai").toLowerCase();
  const buckets =
    VENDOR_DURATION_BUCKETS[
      vendorKey.includes("kling")
        ? "klingai"
        : vendorKey.includes("wan")
          ? "wan"
          : vendorKey.includes("agnes")
            ? "agnesai"
            : "default"
    ] ?? VENDOR_DURATION_BUCKETS.default;
  const snap = snapDurationToVendorMap(durationSec, buckets, { lipMin: req.lipMin });
  if (snap.duration !== durationSec) {
    warnings.push(`DUR-VENDOR-SNAP:${durationSec}->${snap.duration} (max ${vendorMaxForId(ctx.vendorId)})`);
  }
  return { durationSec: snap.duration, warnings };
}

/**
 * Sole video prompt author. Callers must not rebuild five-section elsewhere.
 */
export function compileVideoPromptSpine(input: SpineCompileInput): SpineCompileResult {
  const warnings: string[] = [];
  let ctx =
    input.ctx ??
    hydrateShotCompileContextSync({
      designShot: input.designShot,
      shotMeta: input.shotMeta,
      seedPrompt: input.seedPrompt,
      vendorId: input.vendorId,
    });

  const dur = resolveDurationForSpine(ctx);
  warnings.push(...dur.warnings);
  ctx = { ...ctx, durationSec: dur.durationSec, warnings: [...ctx.warnings, ...dur.warnings] };

  const seed = ctx.seedPrompt;
  const seedThin = !seed || isVideoPromptThinShell(seed, ctx);
  const staleSeed = Boolean(seed && seedContradictsDesign(seed, ctx));
  // Rebuild only when we can author from design, or seed is thin/stale AND we have material.
  // Never forceRebuild from empty bag inventing「画面主体」.
  const mustRebuild = Boolean(
    (input.forceRebuild && ctx.canAuthorFromDesign) ||
      (seedThin && ctx.canAuthorFromDesign) ||
      (!seed && ctx.canAuthorFromDesign) ||
      (staleSeed && ctx.canAuthorFromDesign),
  );

  let prompt = "";
  let source: SpineCompileResult["source"] = "prompt_ir";

  if (mustRebuild && ctx.canAuthorFromDesign) {
    if (staleSeed) {
      ctx = { ...ctx, seedPrompt: "" };
      warnings.push("SPINE-STALE-SEED:丢弃轨道 seed，按设计包重编");
    }
    // Ensure designShot carries duration/size/dialogue for any downstream
    const shotForIr: PreDesignShot = {
      ...(ctx.designShot ?? ({ id: `spine-${ctx.shotIndex ?? 0}` } as PreDesignShot)),
      visualDescription: ctx.visualDescription || ctx.designShot?.visualDescription,
      shotSize: ctx.shotSize ?? ctx.designShot?.shotSize,
      duration: ctx.durationSec,
      sceneName: ctx.sceneName ?? ctx.designShot?.sceneName,
      narrative: {
        ...(ctx.designShot?.narrative ?? {}),
        dialogue: {
          ...(ctx.designShot?.narrative?.dialogue ?? {}),
          lines: ctx.dialogueObjects.length
            ? ctx.dialogueObjects
            : ctx.designShot?.narrative?.dialogue?.lines,
        },
        debutBeat: ctx.debutBeat ?? (ctx.designShot?.narrative as { debutBeat?: string } | undefined)?.debutBeat,
      },
      generation: {
        ...(ctx.designShot?.generation ?? {}),
        videoPrompt: undefined, // force IR body from design
        stillIntentClass: ctx.stillIntentClass,
      } as PreDesignShot["generation"],
    };

    prompt = buildFiveSectionFromContext({ ...ctx, designShot: shotForIr });
    source = "prompt_ir";
  } else if (seed) {
    // Keep seed (scrub later) — do not invent body when no design material
    prompt = seed;
    source = "seed_heal";
    if (input.forceRebuild && !ctx.canAuthorFromDesign) {
      warnings.push("SPINE-SKIP-REBUILD:无设计料，保留 seed 仅消毒");
    }
  } else {
    prompt = "";
    source = "blocked";
    warnings.push("SPINE-EMPTY:无 seed 且无设计料");
  }

  // Finalize with dialogue + duration (heal silent shells when lines present)
  const fin = finalizeFiveSectionPrompt({
    prompt,
    dialogueLines: ctx.dialogueLines,
    durationSec: ctx.durationSec,
    preferStaticOnDialogue: ctx.dialogueLines.length > 0,
  });
  prompt = fin.prompt;
  warnings.push(...fin.conflicts);

  // Sidecar INSIDE spine before assert
  if (input.includeSidecar !== false && input.agentPlan && ctx.shotIndex != null) {
    prompt = appendViralSidecarToPrompt(prompt, input.agentPlan, {
      shotIndex: ctx.shotIndex,
      sceneRef: ctx.sceneRef,
      maxIntentLines: 1,
      includeEpisodeHooks: false,
      durationCapSec: ctx.durationSec,
    });
  }

  // Soft QF then sanitize
  const qf = softPatchQfExpr(prompt);
  prompt = qf.prompt;
  const scrub = sanitizeVideoPrompt({
    prompt,
    dialogueLines: ctx.dialogueLines,
    durationSec: ctx.durationSec,
    modeId: input.modeId ?? undefined,
  });
  prompt = scrub.prompt;
  warnings.push(...(scrub.conflicts ?? []));

  // singleImage: attach motion-from-frame as prefix to existing motion beat — never sole Motion body
  if (input.modeId === "singleImage" || input.modeId === "wan_i2v") {
    const motionSec = prompt.match(/\[Motion\]([\s\S]*?)(?=\[Camera\]|$)/i)?.[1] ?? "";
    const body = motionSec.replace(/motion-from-frame[^\n;；]*/gi, " ").trim();
    if (body.length >= 4 && !/motion-from-frame/i.test(motionSec)) {
      prompt = prompt.replace(/\[Motion\]\s*\n?/i, "[Motion]\nmotion-from-frame；");
    } else if (/\[Motion\]/i.test(prompt) && body.length < 4) {
      // Don't inject bare mff into empty motion — leave for assert/heal
      warnings.push("MFF-SKIP:Motion 无动作句，不注入裸 motion-from-frame");
    }
  }

  const ready = assertVideoPromptReady(prompt, ctx);
  const hash = promptHashOf(prompt);

  if (!ready.ok && ctx.canAuthorFromDesign) {
    // One retry force IR
    const retryCtx = { ...ctx };
    const retryPrompt = buildFiveSectionFromContext(retryCtx);
    const fin2 = finalizeFiveSectionPrompt({
      prompt: retryPrompt,
      dialogueLines: ctx.dialogueLines,
      durationSec: ctx.durationSec,
      preferStaticOnDialogue: ctx.dialogueLines.length > 0,
    });
    let p2 = fin2.prompt;
    if (input.includeSidecar !== false && input.agentPlan && ctx.shotIndex != null) {
      p2 = appendViralSidecarToPrompt(p2, input.agentPlan, {
        shotIndex: ctx.shotIndex,
        sceneRef: ctx.sceneRef,
        maxIntentLines: 1,
        includeEpisodeHooks: false,
        durationCapSec: ctx.durationSec,
      });
    }
    p2 = softPatchQfExpr(p2).prompt;
    p2 = sanitizeVideoPrompt({
      prompt: p2,
      dialogueLines: ctx.dialogueLines,
      durationSec: ctx.durationSec,
    }).prompt;
    const ready2 = assertVideoPromptReady(p2, ctx);
    if (ready2.ok) {
      const h2 = promptHashOf(p2);
      return {
        prompt: p2,
        durationSec: ctx.durationSec,
        intentClass: ctx.videoIntent.intentClass,
        source: "prompt_ir",
        ready: true,
        readyReasons: [],
        promptHash: h2,
        warnings,
        videoIntent: ctx.videoIntent,
        ctx,
        generationWriteback: {
          videoPrompt: p2,
          compiledVideo: p2,
          promptHash: h2,
          durationSec: ctx.durationSec,
          stillIntentClass: ctx.stillIntentClass,
          intentClass: ctx.videoIntent.intentClass,
        },
      };
    }
  }

  return {
    prompt,
    durationSec: ctx.durationSec,
    intentClass: ctx.videoIntent.intentClass,
    source: ready.ok ? source : "blocked",
    ready: ready.ok,
    readyCode: ready.code,
    readyReasons: ready.reasons,
    reverseTrigger: ready.reverseTrigger,
    promptHash: hash,
    warnings: [...warnings, ...ctx.warnings],
    videoIntent: ctx.videoIntent,
    ctx,
    generationWriteback: {
      videoPrompt: prompt,
      compiledVideo: prompt,
      promptHash: hash,
      durationSec: ctx.durationSec,
      stillIntentClass: ctx.stillIntentClass,
      intentClass: ctx.videoIntent.intentClass,
    },
  };
}

/** Apply dual-write onto a PreDesignShot generation bag. */
export function applySpineWritebackToShot(
  shot: PreDesignShot,
  spine: SpineCompileResult,
): PreDesignShot {
  return {
    ...shot,
    duration: spine.durationSec,
    generation: {
      ...shot.generation,
      videoPrompt: spine.generationWriteback.videoPrompt,
      stillIntentClass: spine.generationWriteback.stillIntentClass ?? shot.generation?.stillIntentClass,
      intentClass: spine.generationWriteback.intentClass,
      compiled: {
        ...(shot.generation?.compiled as Record<string, unknown> | undefined),
        video: spine.generationWriteback.compiledVideo,
        hash: spine.promptHash,
      },
    } as PreDesignShot["generation"],
  };
}

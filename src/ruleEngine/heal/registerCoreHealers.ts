/**
 * Core silent healers — raise_duration / cam_whitelist_clamp / clamp_static / finalize_five_section.
 */
import { resolveRequiredDuration } from "../compilers/resolveRequiredDuration";
import { finalizeFiveSectionPrompt, hasFiveSectionPlaceholders, hasAudioDialogueContradiction } from "../compilers/finalizeFiveSectionPrompt";
import {
  loadCameraMotionWhitelist,
  isAllowedMotion,
  isAllowedTransition,
  extractMotionFromPrompt,
} from "../qualityGate/cameraWhitelist";
import { checkCamSpeak } from "../validators/langAudFxCam";
import { sanitizeVideoPrompt } from "../compilers/sanitizeVideoPrompt";
import { persistShotDuration, mutateShotDuration } from "./persistShotDuration";
import {
  registerHealer,
  ensureCoreHealersRegistered,
  hasAnyToken,
  matchTokensFromDecision,
  type SilentHealContext,
  type SilentHealApplyResult,
} from "./healRegistry";
import type { PreDesignShot } from "../bundle/types";

function dialLines(shot: PreDesignShot | Record<string, unknown> | null | undefined): string[] {
  const lines = ((shot as PreDesignShot)?.narrative?.dialogue?.lines ?? []) as { text?: string }[];
  return lines.map((l) => String(l.text ?? "").trim()).filter(Boolean);
}

async function applyRaiseDuration(ctx: SilentHealContext): Promise<SilentHealApplyResult> {
  const shot = ctx.shot;
  if (!shot) {
    return { applied: false, skipped: true, skipReason: "no_shot", patches: [], detail: "no shot" };
  }
  const req = resolveRequiredDuration(shot, {
    vendorId: ctx.vendorId,
    episodeCapRemaining: ctx.episodeCapRemaining,
  });
  if (!req.canSilentRaise) {
    return {
      applied: false,
      skipped: true,
      skipReason: req.overVendorMax ? "over_vendor_max" : req.needsSplit ? "needs_split" : "already_ok",
      patches: [],
      detail: `cannot silent raise (author=${req.authorDuration} required=${req.required})`,
      duration: req.authorDuration,
      shot,
    };
  }
  if (req.authorDuration >= req.required) {
    return {
      applied: false,
      skipped: true,
      skipReason: "already_ok",
      patches: [],
      detail: "duration already >= required",
      duration: req.authorDuration,
      shot,
    };
  }

  mutateShotDuration(shot, req.required);
  if (ctx.db && ctx.projectId != null && ctx.scriptId != null) {
    await persistShotDuration({
      db: ctx.db,
      projectId: ctx.projectId,
      scriptId: ctx.scriptId,
      storyboardId: ctx.storyboardId,
      duration: req.required,
      shot,
    });
  }

  // Sync Camera duration in prompt if present
  let prompt = ctx.prompt ?? undefined;
  if (prompt) {
    const fin = finalizeFiveSectionPrompt({
      prompt,
      dialogueLines: dialLines(shot),
      durationSec: req.required,
      preferStaticOnDialogue: dialLines(shot).length > 0,
    });
    prompt = fin.prompt;
  }

  return {
    applied: true,
    patches: [
      {
        healerId: "raise_duration",
        reason: "raise_duration",
        detail: `${req.authorDuration} → ${req.required}`,
      },
    ],
    prompt,
    duration: req.required,
    shot,
    detail: `raise_duration ${req.authorDuration} → ${req.required}`,
  };
}

function applyCamWhitelistClamp(ctx: SilentHealContext): SilentHealApplyResult {
  const wl = loadCameraMotionWhitelist();
  const shot = ctx.shot as PreDesignShot | null | undefined;
  let prompt = String(ctx.prompt ?? (shot as { videoPrompt?: string })?.videoPrompt ?? "");
  const patches: SilentHealApplyResult["patches"] = [];
  let changed = false;

  if (shot?.narrative) {
    const tt = String((shot.narrative as { transitionType?: string }).transitionType ?? "").trim();
    if (tt && !isAllowedTransition(tt, wl)) {
      (shot.narrative as { transitionType?: string }).transitionType = wl.defaultTransition;
      patches.push({
        healerId: "cam_whitelist_clamp",
        reason: "whitelist_clamp",
        detail: `transition ${tt} → ${wl.defaultTransition}`,
      });
      changed = true;
    }
  }

  const motion = extractMotionFromPrompt(prompt) ?? String((shot as { camera?: string; motion?: string })?.camera ?? (shot as { motion?: string })?.motion ?? "");
  if (motion && !isAllowedMotion(motion, wl)) {
    const next = prompt
      ? prompt.replace(new RegExp(motion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), wl.defaultMotion)
      : `Camera: ${wl.defaultMotion}`;
    prompt = next || `[Camera]\n${wl.defaultMotion}`;
    patches.push({
      healerId: "cam_whitelist_clamp",
      reason: "whitelist_clamp",
      detail: `motion ${motion} → ${wl.defaultMotion}`,
    });
    changed = true;
  }

  if (!changed) {
    return { applied: false, skipped: true, skipReason: "already_ok", patches: [], detail: "cam already ok", prompt };
  }
  return { applied: true, patches, prompt, shot: shot ?? ctx.shot, detail: patches.map((p) => p.detail).join("; ") };
}

function applyClampStatic(ctx: SilentHealContext): SilentHealApplyResult {
  const shot = ctx.shot;
  const lines = dialLines(shot);
  if (!lines.length) {
    return { applied: false, skipped: true, skipReason: "no_dialogue", patches: [], detail: "no dialogue" };
  }
  let prompt = String(ctx.prompt ?? "");
  if (!prompt) {
    return { applied: false, skipped: true, skipReason: "no_prompt", patches: [], detail: "no prompt" };
  }
  if (!checkCamSpeak({ hasDialogue: true, videoPrompt: prompt })) {
    return { applied: false, skipped: true, skipReason: "already_ok", patches: [], detail: "cam-speak ok", prompt };
  }
  const san = sanitizeVideoPrompt({
    prompt,
    dialogueLines: lines,
    preferStaticOnDialogue: true,
  });
  let next = san.prompt;
  if (/\[Camera\]/i.test(next)) {
    next = next.replace(/\[Camera\]([\s\S]*?)(?=\[Audio\]|\[Narrative\]|$)/i, (_m, body: string) => {
      const clamped = String(body)
        .replace(/whip.?pan|crash.?zoom|dutch.?extreme|handheld.?shake|速切|甩镜/gi, "static")
        .trim();
      return `[Camera]\n${clamped || "static hold, single continuous take."}\n\n`;
    });
  } else {
    next = `${next}\n[Camera]\nstatic hold, single continuous take.`;
  }
  if (next === prompt) {
    return { applied: false, skipped: true, skipReason: "already_ok", patches: [], detail: "unchanged", prompt };
  }
  return {
    applied: true,
    patches: [{ healerId: "clamp_static", reason: "clamp_static", detail: "Camera → static for dialogue" }],
    prompt: next,
    shot,
    detail: "clamp_static",
  };
}

function applyFinalizeFiveSection(ctx: SilentHealContext): SilentHealApplyResult {
  const prompt = String(ctx.prompt ?? "");
  if (!prompt) {
    return { applied: false, skipped: true, skipReason: "no_prompt", patches: [], detail: "no prompt" };
  }
  const needs =
    hasFiveSectionPlaceholders(prompt) ||
    hasAudioDialogueContradiction(prompt) ||
    hasAnyToken(matchTokensFromDecision(ctx.decision, ctx.gateBlockIds), "five_section_placeholder", "audio_dialogue_contradiction", "VP-CONFLICT", "VP-PLACEHOLDER", "VP-AUDIO-CONFLICT", "finalize_five_section");
  if (!needs && !hasFiveSectionPlaceholders(prompt)) {
    // Still try finalize if decision soft_patch with vp reasons
    const tokens = matchTokensFromDecision(ctx.decision, ctx.gateBlockIds);
    if (!hasAnyToken(tokens, "five_section_placeholder", "audio_dialogue_contradiction", "gate_or_placeholder", "finalize_five_section", "VP-CONFLICT", "VP-PLACEHOLDER", "VP-AUDIO-CONFLICT")) {
      return { applied: false, skipped: true, skipReason: "already_ok", patches: [], detail: "no vp conflict", prompt };
    }
  }
  const shot = ctx.shot;
  const dur = Number((shot as PreDesignShot)?.duration ?? 0) || undefined;
  const fin = finalizeFiveSectionPrompt({
    prompt,
    dialogueLines: dialLines(shot),
    durationSec: dur,
    preferStaticOnDialogue: dialLines(shot).length > 0,
  });
  if (fin.prompt === prompt && !fin.conflicts.length && !fin.changes.length) {
    return { applied: false, skipped: true, skipReason: "already_ok", patches: [], detail: "finalize noop", prompt };
  }
  return {
    applied: true,
    patches: [
      {
        healerId: "finalize_five_section",
        reason: "finalize_five_section",
        detail: fin.changes.join(",") || fin.conflicts.join(",") || "finalize",
      },
    ],
    prompt: fin.prompt,
    shot,
    detail: `finalize: ${fin.changes.join(",") || "cleanup"}`,
  };
}

export function registerCoreHealers(): void {
  ensureCoreHealersRegistered(() => {
    registerHealer({
      id: "raise_duration",
      confidence: 0.9,
      match: (ctx) => {
        const tokens = matchTokensFromDecision(ctx.decision, ctx.gateBlockIds);
        if (hasAnyToken(tokens, "raise_duration", "LIP-01")) return true;
        if (ctx.decision.nextStep === "raise_duration") return true;
        if (!ctx.shot) return false;
        return resolveRequiredDuration(ctx.shot, { vendorId: ctx.vendorId, episodeCapRemaining: ctx.episodeCapRemaining }).canSilentRaise;
      },
      apply: applyRaiseDuration,
    });

    registerHealer({
      id: "cam_whitelist_clamp",
      confidence: 0.9,
      match: (ctx) => {
        const tokens = matchTokensFromDecision(ctx.decision, ctx.gateBlockIds);
        return hasAnyToken(tokens, "whitelist_clamp", "PR-CAM-01", "DC-09", "cam_whitelist");
      },
      apply: applyCamWhitelistClamp,
    });

    registerHealer({
      id: "clamp_static",
      confidence: 0.88,
      match: (ctx) => {
        const tokens = matchTokensFromDecision(ctx.decision, ctx.gateBlockIds);
        return hasAnyToken(tokens, "clamp_static", "camera_static_clamp", "CAM-SPEAK", "cam_speak");
      },
      apply: applyClampStatic,
    });

    registerHealer({
      id: "finalize_five_section",
      confidence: 0.9,
      match: (ctx) => {
        const tokens = matchTokensFromDecision(ctx.decision, ctx.gateBlockIds);
        if (
          hasAnyToken(
            tokens,
            "finalize_five_section",
            "five_section_placeholder",
            "audio_dialogue_contradiction",
            "gate_or_placeholder",
            "VP-CONFLICT",
            "VP-PLACEHOLDER",
            "VP-AUDIO-CONFLICT",
            "vp_conflict",
          )
        ) {
          return true;
        }
        const p = String(ctx.prompt ?? "");
        return hasFiveSectionPlaceholders(p) || hasAudioDialogueContradiction(p);
      },
      apply: applyFinalizeFiveSection,
    });
  });
}

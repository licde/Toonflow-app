/**
 * SSOT: required shot duration = max(author, lipMin?, emotionFloor?).
 * Dual-write target for heal; burn/bridge must read the same numbers.
 */
import { measureDialogue, splitDialogueUtterances } from "../dialogueMetrics";
import { VENDOR_DURATION_BUCKETS } from "../vendor-packs/videoVendorPack";
import type { PreDesignShot } from "../bundle/types";
import { asDialogueLineObjects } from "../design/dialogueCoverage";
import { resolveSpeechRateCps } from "./durationNorms";

export type EmotionBand = "low" | "mid" | "high" | "peak";

/** Extra seconds atop lipMin by emotion band (plan §11). Overridden by norms.emotionHold when V2. */
export const EMOTION_FLOOR_SEC: Record<EmotionBand, number> = {
  low: 0,
  mid: 0.5,
  high: 1.0,
  peak: 1.5,
};

export interface RequiredDurationResult {
  authorDuration: number;
  lipMin: number;
  emotionFloor: number;
  required: number;
  lipRequired: boolean;
  needsSplit: boolean;
  overVendorMax: boolean;
  vendorMax: number;
  /** Declare-safe silent raise when required ≤ vendorMax && !needsSplit */
  canSilentRaise: boolean;
  splitHint?: string;
  texts: string[];
}

function dialogueTexts(shot: PreDesignShot | Record<string, unknown>): string[] {
  const narrative = (shot as PreDesignShot).narrative ?? (shot as { narrative?: { dialogue?: { lines?: unknown } } }).narrative;
  const lines = narrative?.dialogue?.lines;
  return splitDialogueUtterances(lines);
}

function isVoOrOffscreen(texts: string[]): boolean {
  const joined = texts.join("");
  return /独白|画外|旁白|VO\b|voice.?over/i.test(joined);
}

function emotionBandOf(shot: PreDesignShot | Record<string, unknown>): EmotionBand {
  const n = (shot as PreDesignShot).narrative as { emotion?: string; emotionBand?: string; intensity?: string } | undefined;
  const raw = String(n?.emotionBand ?? n?.emotion ?? n?.intensity ?? "").toLowerCase();
  if (/peak|高潮|爆发/.test(raw)) return "peak";
  if (/high|高|激烈|愤怒|哭/.test(raw)) return "high";
  if (/mid|中|紧张/.test(raw)) return "mid";
  return "low";
}

export function vendorMaxForId(vendorId?: string | null): number {
  const key = String(vendorId ?? "agnesai").toLowerCase();
  const buckets =
    VENDOR_DURATION_BUCKETS[
      key.includes("kling")
        ? "klingai"
        : key.includes("minimax")
          ? "minimax"
          : key.includes("wan")
            ? "wan"
            : key.includes("seedance") || key.includes("volc")
              ? "seedance"
              : key.includes("agnes")
                ? "agnesai"
                : "default"
    ] ?? VENDOR_DURATION_BUCKETS.default;
  return Math.max(...buckets);
}

export function resolveRequiredDuration(
  shot: PreDesignShot | Record<string, unknown>,
  opts?: {
    vendorId?: string | null;
    episodeCapRemaining?: number;
    /** Enable duration_norms cps (meta.pillarsDurationV2) */
    pillarsDurationV2?: boolean | null;
  },
): RequiredDurationResult {
  const texts = dialogueTexts(shot);
  const joined = texts.join("");
  const rate = resolveSpeechRateCps({ pillarsDurationV2: opts?.pillarsDurationV2 });
  const metrics = measureDialogue({ text: joined, speechSpeed: rate.cps });
  const vo = texts.length > 0 && isVoOrOffscreen(texts);
  const lipRequired = metrics.lipRequired && !vo;
  const lipMin = lipRequired ? Math.ceil(metrics.minDurationSec) : 0;
  const band = emotionBandOf(shot);
  const bandFloor = lipRequired || texts.length > 0 ? EMOTION_FLOOR_SEC[band] : 0;
  // V2: use norms emotionHold as floor floor when higher than band mid for lip shots
  const emotionFloor =
    rate.fromNorms && lipRequired
      ? Math.max(bandFloor, rate.emotionHoldSec)
      : bandFloor;

  const s = shot as PreDesignShot;
  const authorDuration = Math.max(
    0,
    Number(s.duration ?? (s.narrative as { duration?: number } | undefined)?.duration ?? 0) || 0,
  );

  const requiredRaw = Math.max(authorDuration, lipMin + emotionFloor, lipMin || 0);
  const required = Math.max(0, Math.ceil(requiredRaw * 10) / 10);
  const requiredInt = Math.max(1, Math.min(30, Math.ceil(required || authorDuration || 4)));

  const vendorMax = vendorMaxForId(opts?.vendorId);
  const needsSplit = texts.length >= 2 && (lipMin > 8 || (authorDuration > 0 && authorDuration < lipMin));
  const overVendorMax = requiredInt > vendorMax;
  const canSilentRaise =
    !needsSplit && !overVendorMax && authorDuration > 0 && authorDuration < requiredInt;

  // Canonical splitHint only — never fall back to reactionAction prose (false-green / UX leak).
  const lines = asDialogueLineObjects(s.narrative?.dialogue?.lines);
  const CANON = new Set(["reaction_shot", "speak_react", "reveal_then_reaction", "clause_split"]);
  let splitHint: string | undefined;
  for (const l of lines) {
    const h = String(l.splitHint ?? "").trim();
    if (!h) continue;
    if (CANON.has(h) || /^[a-z][a-z0-9_]*$/i.test(h)) {
      splitHint = h;
      break;
    }
  }

  let finalRequired = requiredInt;
  if (opts?.episodeCapRemaining != null && opts.episodeCapRemaining >= 0) {
    finalRequired = Math.min(finalRequired, Math.max(authorDuration, Math.floor(opts.episodeCapRemaining)));
  }

  return {
    authorDuration,
    lipMin,
    emotionFloor,
    required: finalRequired,
    lipRequired,
    needsSplit,
    overVendorMax: finalRequired > vendorMax || overVendorMax,
    vendorMax,
    canSilentRaise: canSilentRaise && finalRequired <= vendorMax && finalRequired > authorDuration,
    splitHint,
    texts,
  };
}

/** Sum shot durations for episode budget guard (D1). */
export function sumShotDurations(shots: Array<PreDesignShot | Record<string, unknown>>): number {
  let n = 0;
  for (const s of shots) {
    const d = Number((s as PreDesignShot).duration ?? (s as { narrative?: { duration?: number } }).narrative?.duration ?? 0);
    if (d > 0) n += d;
  }
  return n;
}

export const DEFAULT_EPISODE_DURATION_CAP = 180;

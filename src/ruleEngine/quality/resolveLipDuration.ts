/**
 * Single-source lip + duration resolution for video compile (EN / generateVideoPrompt).
 * On-camera dialogue: empty policy upgrades to subtle (not BLOCK); OS not on-camera.
 */
import { DEFAULT_ONCAM_LIP_POLICY } from "./resolveLipSyncPolicy";

export type LipDurationResolveInput = {
  prompt?: string;
  lipSyncPolicy?: string | null;
  /** On-camera dialogue only (exclude OS/VO) */
  hasDialogue?: boolean;
  durationSec?: number | null;
  /**
   * When true and on-camera + explicit none/silent: still auto-upgrade by default.
   * Set refuseExplicitSilent to actually BLOCK.
   */
  hardBlockNoLipOnDialogue?: boolean;
  refuseExplicitSilent?: boolean;
};

export type LipDurationResolveResult = {
  prompt: string;
  durationSec?: number;
  lipLine?: string;
  changes: string[];
  blocked?: boolean;
  blockCode?: "NO-LIP-DIALOGUE";
  blockMessage?: string;
  resolvedPolicy?: string;
};

function lipLineFromPolicy(policy: string, hasDialogue: boolean): string | undefined {
  if (!hasDialogue) return undefined;
  const p = policy.toLowerCase().replace(/-/g, "_");
  if (!p || p === "none" || p === "silent") return "无口型同步";
  if (p === "dialogue_native" || p === "natural" || p === "natural_emphasized" || p.includes("natural")) {
    return "口型同步开启，对白嘴型自然";
  }
  if (p === "subtle_natural" || p === "subtle" || p.includes("subtle")) {
    return "口型轻微同步，嘴型自然";
  }
  return "口型轻微同步，嘴型自然";
}

/** Collapse bare `2s` / `3s` tokens (not part of duration N s, not Motion beat `0s-Ns:`). G3: preserve beat clocks. */
export function dedupeBareSeconds(prompt: string, preferSec?: number): { prompt: string; changes: string[] } {
  const changes: string[] = [];
  let p = String(prompt ?? "");
  const bare: number[] = [];
  const re = /(?:^|[^A-Za-z0-9.\-])(\d{1,2})s\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(p))) {
    const start = m.index + (m[0].length - String(m[1]).length - 1);
    const before = p.slice(Math.max(0, start - 12), start);
    if (/duration\s*$/i.test(before)) continue;
    // Motion beat range: 0s-0.5s or 0.5s-1.4s — never strip
    if (/\d(?:\.\d+)?s\s*-\s*$/i.test(before) || /^-\d/.test(p.slice(start + String(m[1]).length + 1))) continue;
    if (/\d(?:\.\d+)?s-$/i.test(before)) continue;
    bare.push(Number(m[1]));
  }
  if (bare.length <= 1 && preferSec == null) return { prompt: p, changes };
  if (bare.length >= 2 || (bare.length >= 1 && preferSec != null)) {
    const secs = bare.filter((n) => Number.isFinite(n) && n > 0 && n <= 30);
    const pick = preferSec != null ? preferSec : secs.length ? Math.max(...secs) : undefined;
    p = p.replace(/(?:^|[^A-Za-z0-9.\-])(\d{1,2})s\b/gi, (full, n, offset) => {
      const before = p.slice(Math.max(0, offset - 12), offset);
      if (/duration\s*$/i.test(before)) return full;
      if (/\d(?:\.\d+)?s\s*-\s*$/i.test(before) || /\d(?:\.\d+)?s-$/i.test(before)) return full;
      const after = p.slice(offset + full.length, offset + full.length + 8);
      if (/^-\d/.test(after) || /^-\d/.test(full.slice(full.indexOf(n) + String(n).length + 1))) return full;
      // Keep tokens that are left side of beat: "0s-0.5s"
      const absStart = offset + (full.length - String(n).length - 1);
      if (p.slice(absStart + String(n).length + 1, absStart + String(n).length + 2) === "-") return full;
      return full.slice(0, full.length - String(n).length - 1);
    });
    changes.push("dedupe_bare_sec");
    if (pick != null && !/duration\s*\d+/i.test(p)) {
      if (/\[Camera\]/i.test(p)) {
        p = p.replace(/(\[Camera\][^\[]*)/i, (cam) => `${cam.trim()} duration ${pick}s`);
      } else {
        p = `${p}${p ? ", " : ""}duration ${pick}s`;
      }
      changes.push("inject_duration_after_bare_dedupe");
    }
  }
  return { prompt: p.replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim(), changes };
}

export function resolveLipDurationSingleSource(input: LipDurationResolveInput): LipDurationResolveResult {
  const changes: string[] = [];
  let prompt = String(input.prompt ?? "");
  const hasDialogue = Boolean(input.hasDialogue);
  let policy = String(input.lipSyncPolicy ?? "").trim();

  // On-camera: empty policy → upgrade (never treat missing as silent BLOCK)
  if (hasDialogue && !policy) {
    policy = DEFAULT_ONCAM_LIP_POLICY;
    changes.push("default_empty_policy_to_subtle");
  }

  let lipLine = lipLineFromPolicy(policy, hasDialogue);

  if (hasDialogue) {
    const explicitSilent = /^(none|silent)$/i.test(policy);
    if (explicitSilent) {
      if (input.hardBlockNoLipOnDialogue && input.refuseExplicitSilent) {
        return {
          prompt,
          durationSec: input.durationSec != null ? Number(input.durationSec) : undefined,
          lipLine: "无口型同步",
          changes,
          blocked: true,
          blockCode: "NO-LIP-DIALOGUE",
          blockMessage: "有出镜对白禁止 lipSyncPolicy=none/silent（无口型同步）",
          resolvedPolicy: policy,
        };
      }
      // Default: silent soft upgrade
      policy = DEFAULT_ONCAM_LIP_POLICY;
      lipLine = lipLineFromPolicy(policy, true);
      changes.push("upgrade_explicit_silent_on_camera");
    }
    if (/no\s*lip[- ]*sync|无口型同步/i.test(prompt) || lipLine === "无口型同步" || lipLine === "no lip sync") {
      prompt = prompt.replace(/no\s*lip[- ]*sync[,]*/gi, "").replace(/无口型同步[,]*/g, "");
      changes.push("strip_no_lip_on_dialogue");
      if (lipLine === "无口型同步" || lipLine === "no lip sync") {
        lipLine = lipLineFromPolicy(DEFAULT_ONCAM_LIP_POLICY, true);
        policy = DEFAULT_ONCAM_LIP_POLICY;
        changes.push("upgrade_silent_policy_on_dialogue");
      }
    }
  }

  if (lipLine && /口型|lip-sync|lip sync/i.test(lipLine) && !/无口型|no lip sync/i.test(lipLine)) {
    if (/no\s*lip[- ]*sync|无口型同步/i.test(prompt)) {
      prompt = prompt.replace(/no\s*lip[- ]*sync[,]*/gi, "").replace(/无口型同步[,]*/g, "");
      changes.push("strip_no_lip_conflict");
    }
  }
  if (
    !hasDialogue &&
    (lipLine === "无口型同步" || lipLine === "no lip sync" || /lip-sync\s*active|口型同步开启/i.test(prompt))
  ) {
    prompt = prompt
      .replace(/lip-sync\s*active[,]*/gi, "")
      .replace(/natural mouth movement for dialogue[,]*/gi, "")
      .replace(/口型同步开启。?/g, "")
      .replace(/对白嘴型自然[,]*/g, "")
      .replace(/口型轻微同步，嘴型自然[,]*/g, "");
    changes.push("strip_lip_when_silent");
  }

  const dur =
    input.durationSec != null && Number.isFinite(Number(input.durationSec))
      ? Math.max(1, Math.min(30, Math.round(Number(input.durationSec))))
      : undefined;

  const bare = dedupeBareSeconds(prompt, dur);
  prompt = bare.prompt;
  changes.push(...bare.changes);

  if (dur != null) {
    const before = prompt;
    prompt = prompt.replace(/duration\s*\d+(?:\.\d+)?s?/gi, "");
    if (before !== prompt) changes.push("dedupe_duration");
    if (/\[Camera\]/i.test(prompt)) {
      prompt = prompt.replace(/(\[Camera\][^\[]*)/i, (m) => {
        const cleaned = m.replace(/duration\s*\d+(?:\.\d+)?s?/gi, "").replace(/,\s*,/g, ",").trim();
        return `${cleaned}${cleaned.endsWith(",") || cleaned.endsWith("]") ? " " : ", "}duration ${dur}s`;
      });
      changes.push("camera_single_duration");
    } else if (!/duration\s*\d+/i.test(prompt)) {
      prompt = `${prompt}${prompt ? ", " : ""}duration ${dur}s`;
      changes.push("append_duration");
    }
  }

  const lipAlready =
    /口型同步开启|口型轻微同步|对白嘴型自然/i.test(prompt) ||
    (lipLine ? new RegExp(lipLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(prompt) : false);
  if (
    lipLine &&
    hasDialogue &&
    lipLine !== "无口型同步" &&
    lipLine !== "no lip sync" &&
    !lipAlready
  ) {
    if (/\[Audio\]/i.test(prompt)) {
      prompt = prompt.replace(/(\[Audio\][^\[]*)/i, (m) => `${m.trim()}\n${lipLine}`);
    } else {
      prompt = `${prompt}${prompt ? ", " : ""}${lipLine}`;
    }
    changes.push("inject_lip_line");
  }

  prompt = prompt.replace(/,\s*,/g, ",").replace(/\s{2,}/g, " ").trim();
  return { prompt, durationSec: dur, lipLine, changes, resolvedPolicy: policy || undefined };
}

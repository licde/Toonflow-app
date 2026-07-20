/**
 * Compile design / AV fields into vendor prompt fragments (DesignFieldRegistry SSOT).
 */
export function compileEmotionCue(emotion?: number | string | null): string {
  let n = typeof emotion === "string" ? Number(emotion) : emotion;
  if (n == null || !Number.isFinite(n)) {
    if (typeof emotion === "string" && emotion.trim()) return `emotion:${emotion.trim()}`;
    return "";
  }
  // Accept 0–1 intensity as well as 0–10
  if (n > 0 && n <= 1) n = n * 10;
  if (n >= 8) return "high-intensity emotion, strong micro-expression";
  if (n >= 5) return "clear emotional beat";
  if (n >= 3) return "subtle emotion";
  if (n > 0) return "subtle emotion";
  return "";
}

export function compileColorTemp(temp?: string | null): string {
  if (!temp?.trim()) return "";
  const t = temp.trim();
  if (/暖|warm/i.test(t)) return "warm color temperature";
  if (/冷|cool|cold/i.test(t)) return "cool color temperature";
  if (/中性|neutral/i.test(t)) return "neutral white balance";
  return `colorTemp:${t}`;
}

export function compileSpatial(spatial?: string | null): string {
  if (!spatial?.trim()) return "";
  return `spatialRelation(${spatial.trim()}), clear character blocking`;
}

export function compileDuration(duration?: number | string | null): string {
  if (duration == null || duration === "") return "";
  const n = typeof duration === "string" ? Number(String(duration).replace(/s$/i, "")) : duration;
  if (!Number.isFinite(n) || n <= 0) return typeof duration === "string" && /duration/i.test(duration) ? duration.trim() : "";
  return `duration ${n}s`;
}

export function compileShotSize(shotSize?: string | null): string {
  if (!shotSize?.trim()) return "";
  const s = shotSize.trim();
  const map: Record<string, string> = {
    远景: "extreme wide shot",
    全景: "wide establishing shot",
    中景: "medium shot",
    近景: "close-up",
    特写: "close-up",
    大特写: "extreme close-up",
    MS: "medium shot",
    CU: "close-up",
    WS: "wide shot",
    ECU: "extreme close-up",
  };
  return map[s] ?? (/shot|close|wide|medium/i.test(s) ? s : `shotSize:${s}`);
}

export function compileCamera(camera?: string | null): string {
  if (!camera?.trim()) return "";
  const c = camera.trim();
  const map: Record<string, string> = {
    静止: "static camera",
    推进: "dolly in / push in",
    拉远: "dolly out / pull back",
    跟踪: "tracking shot",
    摇镜: "pan",
    甩镜: "whip pan",
    升降: "crane",
    环绕: "surround shooting",
  };
  return map[c] ?? (/static|dolly|pan|track|camera|push/i.test(c) ? c : `camera:${c}`);
}

export function compileFx(fx?: string | null): string {
  if (!fx?.trim()) return "";
  const t = fx.trim();
  if (/^F[0-5]$/i.test(t)) return `FX:${t.toUpperCase()}`;
  if (/^FX:/i.test(t)) return t;
  return `FX:${t}`;
}

export function compileDialogue(text?: string | null, speaker?: string | null): string {
  if (!text?.trim()) return "";
  const line = text.trim();
  if (/^["「]|dialogue/i.test(line)) return speaker ? `${speaker}: ${line}` : line;
  const quoted = line.includes('"') || line.includes("「") ? line : `"${line}"`;
  return speaker ? `${speaker} says ${quoted} (dialogue)` : `${quoted} (dialogue)`;
}

export function compileLipSync(
  kind?: "active" | "silent" | "vo" | "os" | null,
  hasDialogue?: boolean,
): string {
  if (!hasDialogue && !kind) return "";
  if (kind === "vo") return "voiceover (VO), silent lips";
  if (kind === "os") return "inner monologue (OS), silent lips";
  if (kind === "silent") return "silent lips";
  if (hasDialogue || kind === "active") return "lip-sync active";
  return "";
}

export function compileVoice(voice?: string | null, hasDialogue?: boolean): string {
  if (!hasDialogue && !voice?.trim()) return "";
  const v = voice?.trim();
  if (!v) return hasDialogue ? "voice:default character timbre" : "";
  return /^voice:/i.test(v) ? v : `voice:${v}`;
}

export function compileSfx(sfx?: string | null): string {
  if (!sfx?.trim()) return "";
  const t = sfx.trim().replace(/^音效[：:]/, "");
  if (/^sfx:/i.test(t) || /^<.*>$/.test(t)) return t;
  return `sfx:<${t}>`;
}

export function compileExprGuard(enabled?: boolean | null): string {
  if (!enabled) return "";
  return "keep face identity, no exaggerated expression rewrite (QF-EXPR-06)";
}

export function compileDebut(beat?: string | null): string {
  if (!beat?.trim()) return "";
  return `debutBeat:${beat.trim()}`;
}

export function compileEndHook(hook?: string | null): string {
  if (!hook?.trim()) return "";
  return `endHook:${hook.trim()}`;
}

export function compileNegativeAV(enabled?: boolean | null): string {
  if (!enabled) return "";
  return "no subtitle, no watermark, no Logo";
}

export function compileComposition(opts?: {
  foreground?: string | null;
  background?: string | null;
  bgBlur?: boolean | null;
}): string {
  if (!opts) return "";
  const bits: string[] = [];
  if (opts.foreground?.trim()) bits.push(`fg:${opts.foreground.trim()}`);
  if (opts.background?.trim()) bits.push(`bg:${opts.background.trim()}`);
  if (opts.bgBlur) bits.push("shallow depth of field, soft background");
  return bits.join(", ");
}

export function compileExprCue(cue?: string | null): string {
  if (!cue?.trim()) return "";
  return `micro-expression:${cue.trim()}`;
}

export function compileContinuity(from?: string | null): string {
  if (!from?.trim()) return "";
  const short = from.trim().slice(0, 80);
  return `continuity: continues from ${short}`;
}

export function compileAnchorHint(hint?: string | null): string {
  if (!hint?.trim()) return "";
  return `anchor:${hint.trim()}`;
}

export function mapLipSyncPolicy(policy?: string | null): "active" | "silent" | "vo" | "os" | null {
  if (!policy?.trim()) return null;
  const p = policy.toLowerCase();
  if (/vo|voiceover|画外/.test(p)) return "vo";
  if (/os|inner|内心/.test(p)) return "os";
  if (/silent|mute|闭口/.test(p)) return "silent";
  if (/subtle|natural|active|lip/.test(p)) return "active";
  return "active";
}

/** @deprecated Prefer applyDesignFieldRegistry — retained for batch callers during migration. */
export function injectContentFields(
  prompt: string,
  fields: {
    emotion?: number | string | null;
    colorTemp?: string | null;
    spatialRelation?: string | null;
  },
): string {
  const bits = [
    compileEmotionCue(fields.emotion),
    compileColorTemp(fields.colorTemp),
    compileSpatial(fields.spatialRelation),
  ].filter(Boolean);
  if (!bits.length) return prompt;
  const inject = bits.join(", ");
  if (prompt.includes(inject)) return prompt;
  return prompt.trim() ? `${prompt.trim()}, ${inject}` : inject;
}

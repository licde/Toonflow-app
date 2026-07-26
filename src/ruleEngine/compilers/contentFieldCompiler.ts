/**
 * Compile design / AV fields into vendor prompt fragments (DesignFieldRegistry SSOT).
 */
export function compileEmotionCue(emotion?: number | string | null): string {
  let n = typeof emotion === "string" ? Number(emotion) : emotion;
  if (n == null || !Number.isFinite(n)) {
    if (typeof emotion === "string" && emotion.trim()) return `情绪:${emotion.trim()}`;
    return "";
  }
  // Accept 0–1 intensity as well as 0–10
  if (n > 0 && n <= 1) n = n * 10;
  if (n >= 8) return "高强度情绪，微表情清晰";
  if (n >= 5) return "情绪拍点清晰";
  if (n >= 3) return "轻微情绪";
  if (n > 0) return "轻微情绪";
  return "";
}

export function compileColorTemp(temp?: string | null): string {
  if (!temp?.trim()) return "";
  const t = temp.trim();
  if (/暖|warm/i.test(t)) return "暖色温";
  if (/冷|cool|cold/i.test(t)) return "冷色温";
  if (/中性|neutral/i.test(t)) return "中性白平衡";
  return `色温:${t}`;
}

export function compileSpatial(spatial?: string | null): string {
  if (!spatial?.trim()) return "";
  return `空间关系（${spatial.trim()}），站位清晰`;
}

export function compileDuration(duration?: number | string | null): string {
  if (duration == null || duration === "") return "";
  const n = typeof duration === "string" ? Number(String(duration).replace(/s$/i, "")) : duration;
  if (!Number.isFinite(n) || n <= 0) return typeof duration === "string" && /duration|时长/i.test(duration) ? duration.trim() : "";
  return `时长 ${n}s`;
}

export function compileShotSize(shotSize?: string | null): string {
  if (!shotSize?.trim()) return "";
  const s = shotSize.trim();
  // Keep Chinese sizes as-is; map EN aliases to zh
  const map: Record<string, string> = {
    远景: "远景",
    全景: "全景",
    中景: "中景",
    近景: "近景",
    特写: "特写",
    大特写: "大特写",
    MS: "中景",
    CU: "特写",
    ECU: "大特写",
    WS: "全景",
    "extreme wide shot": "远景",
    "wide establishing shot": "全景",
    "wide shot": "全景",
    "medium shot": "中景",
    "close-up": "特写",
    "extreme close-up": "大特写",
  };
  return map[s] ?? (/shot|close|wide|medium/i.test(s) ? s : s);
}

export function compileCamera(camera?: string | null): string {
  if (!camera?.trim()) return "";
  const c = camera.trim();
  const map: Record<string, string> = {
    静止: "静止",
    推进: "推进",
    拉远: "拉远",
    跟踪: "跟踪",
    摇镜: "摇镜",
    甩镜: "甩镜",
    升降: "升降",
    环绕: "环绕",
    "static camera": "静止",
    "dolly in / push in": "推进",
    "dolly out / pull back": "拉远",
    "tracking shot": "跟踪",
    pan: "摇镜",
    "whip pan": "甩镜",
    crane: "升降",
    "surround shooting": "环绕",
  };
  return map[c] ?? (/static|dolly|pan|track|camera|push/i.test(c) ? c : c);
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
  if (kind === "vo") return "画外音（VO），无口型";
  if (kind === "os") return "内心独白（OS），无口型";
  if (kind === "silent") return "无口型";
  if (hasDialogue || kind === "active") return "口型同步开启";
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
  return "锁定脸型身份，禁止夸张改脸";
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

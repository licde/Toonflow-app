/**
 * Continuity / color / gaze prompt injection (M3).
 */
export function injectContinuityHints(input: {
  videoPrompt: string;
  continuityFrom?: string | null;
  colorTempHint?: string | null;
  gazeHint?: string | null;
  sfxHint?: string | null;
}): { prompt: string; injected: string[] } {
  const injected: string[] = [];
  let prompt = String(input.videoPrompt ?? "");
  const bits: string[] = [];
  if (input.continuityFrom?.trim()) {
    bits.push(`continuity: continues from ${input.continuityFrom.trim().slice(0, 80)}`);
    injected.push("continuityFrom");
  }
  if (input.colorTempHint?.trim()) {
    bits.push(`match color temperature: ${input.colorTempHint.trim().slice(0, 40)}`);
    injected.push("colorTemp");
  }
  if (input.gazeHint?.trim()) {
    bits.push(`eyeline/gaze: ${input.gazeHint.trim().slice(0, 40)}`);
    injected.push("gaze");
  }
  if (input.sfxHint?.trim()) {
    bits.push(`SFX: ${input.sfxHint.trim().slice(0, 40)}`);
    injected.push("sfx");
  }
  if (!bits.length) return { prompt, injected };
  if (/\[Narrative\]/i.test(prompt)) {
    prompt = prompt.replace(/\[Narrative\]/i, `[Narrative]\n${bits.join("; ")}. `);
  } else {
    prompt = `${prompt.trim()}\n[Narrative]\n${bits.join("; ")}.`;
  }
  return { prompt, injected };
}

export function voiceBindGapMessage(bound: boolean, hasDialogue: boolean): string | null {
  if (hasDialogue && !bound) return "有声对白未绑定 voice / 音色资产";
  return null;
}

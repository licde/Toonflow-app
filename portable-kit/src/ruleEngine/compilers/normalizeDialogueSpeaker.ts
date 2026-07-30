/**
 * SSOT: strip OS/VO/旁白 wrappers from dialogue speaker names before identity gates / CD stubs.
 * OS delivery belongs on line type / audio profile — never as a second face name.
 */

export interface NormalizeDialogueSpeakerResult {
  /** Bare character name for identity / CD matching */
  name: string;
  /** True when original marked off-screen / voice-over / narrator */
  isOs: boolean;
  /** Non-human / UI speakers must not enter CAST */
  isNonHuman?: boolean;
}

const OS_WRAPPER_RE =
  /[（(【\[]?\s*(?:OS|VO|V\.O\.|旁白|画外|画外音|内心独白|内心|独白)\s*[）)】\]]?/gi;

const NON_HUMAN_SPEAKER = /^(APP|UI|系统|旁白系统|SFX|BGM|字幕)$/i;

/** Detect OS/VO markers without stripping (for type tagging). */
export function speakerLooksLikeOs(raw?: string | null): boolean {
  const s = String(raw ?? "").trim();
  if (!s) return false;
  return /(?:^|[\s（(【\[])(?:OS|VO|V\.O\.|旁白|画外|画外音|内心独白)(?:$|[\s）)】\]])/i.test(s) ||
    /（\s*(?:OS|VO|旁白|画外)\s*）|\(\s*(?:OS|VO)\s*\)/i.test(s);
}

export function speakerIsNonHuman(raw?: string | null): boolean {
  return NON_HUMAN_SPEAKER.test(String(raw ?? "").trim());
}

/**
 * Strip delivery wrappers → bare name.
 * "沈清漪（OS）" → { name: "沈清漪", isOs: true }
 * "旁白" alone → { name: "", isOs: true } (narrator, not a face)
 * "APP" → { name: "", isNonHuman: true }
 */
export function normalizeDialogueSpeaker(raw?: string | null): NormalizeDialogueSpeakerResult {
  const original = String(raw ?? "").trim();
  if (!original) return { name: "", isOs: false };
  if (speakerIsNonHuman(original)) {
    return { name: "", isOs: false, isNonHuman: true };
  }
  const isOs = speakerLooksLikeOs(original);
  let name = original.replace(OS_WRAPPER_RE, " ").replace(/\s+/g, " ").trim();
  // Pure narrator labels
  if (/^(?:OS|VO|V\.O\.|旁白|画外|画外音|内心独白|独白)$/i.test(name)) {
    return { name: "", isOs: true };
  }
  // Trailing empty parens / punctuation left by strip
  name = name.replace(/[（(]\s*[）)]/g, "").replace(/[\s\-–—_:：]+$/g, "").trim();
  return { name, isOs: isOs || speakerLooksLikeOs(original) };
}

/** Map speakers → unique bare names (drops empty narrator-only). */
export function normalizeDialogueSpeakers(raw?: string[] | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of raw ?? []) {
    const { name } = normalizeDialogueSpeaker(s);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * Audio literary fidelity checklist SSOT — L0 prompt gates for dialogue/XOR/LANG/dual SSOT.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { splitDialogueUtterances } from "../dialogueMetrics";

export type AudioFidelityKind =
  | "dialogue_in_audio"
  | "audio_xor"
  | "lang_aud"
  | "dual_ssot_sync"
  | "av_beat"
  | "emotion_slot";

export interface AudioFidelityItem {
  id: string;
  kind: AudioFidelityKind;
  mustTokens: string[];
  healInject: string;
  strengthenKey: string;
  strengthenValue: string;
  vlmQuestion?: string;
}

export interface AudioLiteraryFidelityConfig {
  version?: string;
  enabled?: boolean;
  asrEnabled?: boolean;
  voiceBindHardOnHq?: boolean;
  voiceBindHardOnDraft?: boolean;
  requireAudioPassForDialogueBurn?: boolean;
  silenceEnergyThreshold?: number;
  items?: Partial<Record<AudioFidelityKind, boolean>>;
}

const FALLBACK: AudioLiteraryFidelityConfig = {
  version: "1.0.0",
  enabled: true,
  asrEnabled: false,
  voiceBindHardOnHq: true,
  voiceBindHardOnDraft: false,
  requireAudioPassForDialogueBurn: true,
  silenceEnergyThreshold: 0.02,
  items: {
    dialogue_in_audio: true,
    audio_xor: true,
    lang_aud: true,
    dual_ssot_sync: true,
    av_beat: true,
    emotion_slot: true,
  },
};

const SILENT_AUDIO_RE =
  /no\s*(spoken\s*)?dialogue|ambient\s*only|silent(?:\s*shot)?|无对白|静音|纯环境音/i;

export function loadAudioLiteraryFidelityConfig(): AudioLiteraryFidelityConfig {
  return {
    ...FALLBACK,
    ...readFixtureJson<AudioLiteraryFidelityConfig>("audio_literary_fidelity_checklist.json", FALLBACK),
  };
}

function dialogueLines(input: {
  dialogueLines?: Array<{ text?: string; speaker?: string } | string> | null;
}): string[] {
  const raw = input.dialogueLines;
  if (!raw?.length) return [];
  if (typeof raw[0] === "string") return (raw as string[]).map((t) => String(t).trim()).filter(Boolean);
  return splitDialogueUtterances(raw as Array<{ text?: string }>).filter(Boolean);
}

export function buildAudioLiteraryFidelityChecklist(input: {
  dialogueLines?: Array<{ text?: string; speaker?: string } | string> | null;
  audioPrompt?: string | null;
  videoPrompt?: string | null;
  audioCue?: string | null;
  emotionTarget?: string | null;
}): AudioFidelityItem[] {
  const cfg = loadAudioLiteraryFidelityConfig();
  if (cfg.enabled === false) return [];
  const enabled = cfg.items ?? FALLBACK.items!;
  const lines = dialogueLines(input);
  const items: AudioFidelityItem[] = [];

  if (enabled.dialogue_in_audio && lines.length) {
    for (let i = 0; i < lines.length; i++) {
      const slice = lines[i]!.slice(0, Math.min(6, lines[i]!.length));
      if (!slice) continue;
      items.push({
        id: `dialogue:${i}:${slice}`,
        kind: "dialogue_in_audio",
        mustTokens: [slice],
        healInject: `音轨须含台词：「${lines[i]!.slice(0, 24)}」`,
        strengthenKey: "audioXor",
        strengthenValue: "fix",
      });
    }
  }

  if (enabled.audio_xor && lines.length) {
    items.push({
      id: "audio_xor:no_silence",
      kind: "audio_xor",
      mustTokens: [],
      healInject: "有对白时禁止静音/无对白模板句",
      strengthenKey: "audioXor",
      strengthenValue: "fix",
    });
  }

  if (enabled.dual_ssot_sync && lines.length) {
    items.push({
      id: "dual_ssot:audio_vs_section",
      kind: "dual_ssot_sync",
      mustTokens: lines.map((l) => l.slice(0, 4)).filter(Boolean),
      healInject: "同步 audioPrompt 与五段[Audio]对白覆盖",
      strengthenKey: "audioXor",
      strengthenValue: "sync_dual_ssot",
    });
  }

  const beat = String(input.audioCue ?? "").trim();
  if (enabled.av_beat && beat) {
    items.push({
      id: `av_beat:${beat.slice(0, 12)}`,
      kind: "av_beat",
      mustTokens: [beat.slice(0, 4)],
      healInject: `音轨须含节拍/音效：${beat.slice(0, 40)}`,
      strengthenKey: "audioCue",
      strengthenValue: beat.slice(0, 80),
    });
  }

  const emo = String(input.emotionTarget ?? "").trim();
  if (enabled.emotion_slot && emo) {
    items.push({
      id: `emotion:${emo.slice(0, 12)}`,
      kind: "emotion_slot",
      mustTokens: [emo.slice(0, 2)],
      healInject: `对白情绪须体现：${emo.slice(0, 40)}`,
      strengthenKey: "emotion",
      strengthenValue: emo.slice(0, 40),
    });
  }

  if (enabled.lang_aud && lines.some((l) => /[\u4e00-\u9fff]/.test(l))) {
    items.push({
      id: "lang_aud:cjk",
      kind: "lang_aud",
      mustTokens: [],
      healInject: "中文台词不得英化为 Audio 主体",
      strengthenKey: "langAud",
      strengthenValue: "keep_source_lang",
    });
  }

  return items;
}

export interface AudioLiteraryAssertResult {
  ok: boolean;
  missing: AudioFidelityItem[];
  passed: AudioFidelityItem[];
  hasDialogue: boolean;
}

function extractAudioSection(videoPrompt: string): string {
  const m = String(videoPrompt ?? "").match(/\[Audio\]([\s\S]*?)(?=\[|$)/i);
  return m ? m[1]! : "";
}

export function assertAudioLiteraryFidelity(input: {
  items: AudioFidelityItem[];
  audioPrompt?: string | null;
  videoPrompt?: string | null;
}): AudioLiteraryAssertResult {
  const audio = String(input.audioPrompt ?? "");
  const section = extractAudioSection(String(input.videoPrompt ?? ""));
  const combined = `${audio}\n${section}`;
  const missing: AudioFidelityItem[] = [];
  const passed: AudioFidelityItem[] = [];
  let hasDialogue = false;

  for (const item of input.items) {
    if (item.kind === "dialogue_in_audio") {
      hasDialogue = true;
      const ok = item.mustTokens.every((t) => combined.includes(t));
      (ok ? passed : missing).push(item);
      continue;
    }
    if (item.kind === "audio_xor") {
      hasDialogue = true;
      const bad = SILENT_AUDIO_RE.test(combined) && !/dialogue|台词|对白/i.test(combined);
      (bad ? missing : passed).push(item);
      continue;
    }
    if (item.kind === "dual_ssot_sync") {
      const inAudio = item.mustTokens.every((t) => audio.includes(t) || !audio.trim());
      const inSection = !section.trim() || item.mustTokens.every((t) => section.includes(t));
      // If both present, require overlap; if only one, pass soft
      const ok =
        !audio.trim() || !section.trim()
          ? item.mustTokens.every((t) => combined.includes(t))
          : inAudio && inSection;
      (ok ? passed : missing).push(item);
      continue;
    }
    if (item.kind === "lang_aud") {
      const enHeavy =
        /\b(says?|speaks?|whispers?)\b/i.test(combined) &&
        !/[\u4e00-\u9fff]{4,}/.test(combined) &&
        item.mustTokens.length === 0;
      // Fail only when CJK expected but audio is English-dominant without CJK
      const expectCjk = true;
      const hasCjk = /[\u4e00-\u9fff]/.test(combined);
      (expectCjk && !hasCjk && enHeavy ? missing : passed).push(item);
      continue;
    }
    const ok = item.mustTokens.every((t) => !t || combined.includes(t));
    (ok ? passed : missing).push(item);
  }

  return { ok: missing.length === 0, missing, passed, hasDialogue };
}

export function strengthenFromAudioMissing(missing: AudioFidelityItem[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of missing) {
    if (!out[m.strengthenKey]) out[m.strengthenKey] = m.strengthenValue;
    else if (!out[m.strengthenKey].includes(m.strengthenValue)) {
      out[m.strengthenKey] = `${out[m.strengthenKey]};${m.strengthenValue}`;
    }
  }
  return out;
}

/** Apply orphan strengthen keys into audio/video prompt text. */
export function applyAudioStrengthenToPrompt(
  prompt: string,
  strengthen: Record<string, string> | null | undefined,
): string {
  let text = String(prompt ?? "");
  const s = strengthen ?? {};
  if (s.audioXor === "fix" || s.audioXor?.includes("fix")) {
    text = text
      .replace(SILENT_AUDIO_RE, "")
      .replace(/No spoken dialogue[^.]*\.?/gi, "")
      .trim();
    if (!/\[Audio\]/i.test(text) && /dialogue|台词|对白/i.test(text) === false) {
      text = `${text}\n[Audio] spoken dialogue required; no silence template.`.trim();
    }
  }
  if (s.lipSyncPolicy) {
    if (!/lip[- ]?sync|口型|对口型/i.test(text)) {
      text = `${text} lip-sync ${s.lipSyncPolicy}`.trim();
    }
  }
  if (s.emotion?.trim() && !text.includes(s.emotion.trim().slice(0, 2))) {
    text = `${text} emotion:${s.emotion.trim()}`.trim();
  }
  if (s.audioCue?.trim() && !text.includes(s.audioCue.trim().slice(0, 2))) {
    text = `${text} SFX:${s.audioCue.trim()}`.trim();
  }
  if (s.langAud === "keep_source_lang") {
    // strip leading English dialogue wrappers when CJK present elsewhere — soft note only
    text = text.replace(/\b(Character says in English):/gi, "");
  }
  return text.replace(/\s{2,}/g, " ").trim();
}

export function syncDualAudioSsot(input: {
  audioPrompt?: string | null;
  videoPrompt?: string | null;
  dialogueLines?: string[];
}): { audioPrompt: string; videoPrompt: string; synced: boolean } {
  const lines = (input.dialogueLines ?? []).filter(Boolean);
  let audio = String(input.audioPrompt ?? "").trim();
  let video = String(input.videoPrompt ?? "").trim();
  let synced = false;
  if (!lines.length) return { audioPrompt: audio, videoPrompt: video, synced };

  for (const line of lines) {
    const slice = line.slice(0, Math.min(6, line.length));
    if (slice && !audio.includes(slice)) {
      audio = audio ? `${audio} ${line}` : line;
      synced = true;
    }
  }

  if (/\[Audio\]/i.test(video)) {
    const section = extractAudioSection(video);
    let nextSection = section;
    for (const line of lines) {
      const slice = line.slice(0, Math.min(6, line.length));
      if (slice && !nextSection.includes(slice)) {
        nextSection = `${nextSection.trim()} ${line}`.trim();
        synced = true;
      }
    }
    if (SILENT_AUDIO_RE.test(nextSection) && lines.length) {
      nextSection = nextSection.replace(SILENT_AUDIO_RE, "").trim() || lines.join(" ");
      synced = true;
    }
    video = video.replace(/\[Audio\][\s\S]*?(?=\[|$)/i, `[Audio]\n${nextSection}\n`);
  } else if (lines.length) {
    video = `${video}\n[Audio]\n${lines.join(" ")}\n`.trim();
    synced = true;
  }

  return { audioPrompt: audio, videoPrompt: video, synced };
}

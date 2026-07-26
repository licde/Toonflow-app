/**
 * Mode-agnostic five-section video prompt sanitizer.
 * Resolves No-dialogue∩lines, multi duration/shotSize/motion, Narrative bloat.
 * Also strips XML-ask stubs, EN QF shells, cross-shot viral sidecar PEAKs.
 */
import { softPatchQfExpr, stripEnQfShells } from "./qfExprGate";
import { applyAudioStrengthenToPrompt } from "./audioLiteraryFidelityChecklist";
import { stripCrossShotViralSidecar } from "../design/bindViralSidecarForCompile";

export interface SanitizeVideoPromptInput {
  prompt: string;
  /** Source-language dialogue lines (joined or array). */
  dialogueLines?: string | string[];
  /** Authoritative duration in seconds (integer preferred). */
  durationSec?: number;
  /** Prefer static camera when dialogue present. */
  preferStaticOnDialogue?: boolean;
  /** QC strengthen (audioXor / lipSyncPolicy / emotion) — consumed here */
  strengthen?: Record<string, string> | null;
}

export interface SanitizeVideoPromptResult {
  prompt: string;
  changes: string[];
  conflicts: string[];
}

const SECTION_RE = /\[(Visual|Motion|Camera|Audio|Narrative|References|Instruction)\]/gi;

/** Silence scaffold — must match "No spoken dialogue" and ambient/SFX only. */
export const SILENT_AUDIO_RE = /no\s*(spoken\s*)?dialogue|ambient\/?SFX\s*only|无对白|无台词/i;

function flatDialogue(lines?: string | string[]): string {
  if (!lines) return "";
  if (Array.isArray(lines)) return lines.map((l) => String(l ?? "").trim()).filter(Boolean).join("\n");
  return String(lines).trim();
}

function hasCjkDialogue(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text) && text.replace(/\s/g, "").length >= 2;
}

function splitSections(prompt: string): { name: string; body: string }[] {
  const text = prompt ?? "";
  const matches = [...text.matchAll(SECTION_RE)];
  if (!matches.length) return [{ name: "_raw", body: text.trim() }];
  const out: { name: string; body: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1];
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    out.push({ name, body: text.slice(start, end).trim() });
  }
  return out;
}

function joinSections(sections: { name: string; body: string }[], prefix = ""): string {
  const parts = sections
    .filter((s) => s.name !== "_raw")
    .map((s) => `[${s.name}]\n${s.body}`.trim());
  const raw = sections.find((s) => s.name === "_raw")?.body?.trim();
  return [prefix.trim(), raw && !parts.length ? raw : "", ...parts].filter(Boolean).join("\n\n").trim();
}

function uniqKeepOrder(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of items) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

/** Keep first motion-from-frame token only (do not greedily swallow the rest of the line). */
function dedupeMotionFromFrame(text: string): string {
  let n = 0;
  return text.replace(/motion-from-frame/gi, () => {
    n += 1;
    return n === 1 ? "motion-from-frame" : "";
  });
}

/** Extract START_FRAME / END_FRAME lines to preserve across sanitize. */
function extractFrameTags(prompt: string): { prefix: string; rest: string } {
  const lines = (prompt ?? "").split(/\n/);
  const tags: string[] = [];
  const rest: string[] = [];
  for (const line of lines) {
    if (/^\s*(START_FRAME|END_FRAME)\s*:/i.test(line)) tags.push(line.trim());
    else rest.push(line);
  }
  return { prefix: tags.join("\n"), rest: rest.join("\n") };
}

function sanitizeFiveBody(
  body: string,
  input: SanitizeVideoPromptInput,
  changes: string[],
  conflicts: string[],
): string {
  const dialogue = flatDialogue(input.dialogueLines);
  const hasDial = hasCjkDialogue(dialogue) || (dialogue.length > 0 && !/^no\s*dialogue/i.test(dialogue));
  let sections = splitSections(body);

  if (sections.length === 1 && sections[0].name === "_raw") {
    // Leave raw for dialect to wrap; still strip duplicate motion-from-frame
    let raw = sections[0].body;
    if (/motion-from-frame/gi.test(raw)) {
      const before = (raw.match(/motion-from-frame/gi) ?? []).length;
      raw = dedupeMotionFromFrame(raw);
      if (before > 1) changes.push("dedupe_motion_from_frame");
    }
    if (hasDial && SILENT_AUDIO_RE.test(raw)) {
      raw = raw.replace(SILENT_AUDIO_RE, "").replace(/^\s*,\s*/g, "").replace(/,\s*,/g, ",");
      changes.push("strip_no_dialogue_raw");
    }
    return raw.replace(/\n{3,}/g, "\n\n").trim();
  }

  const byName = (n: string) => sections.find((s) => s.name.toLowerCase() === n.toLowerCase());

  // --- Audio ---
  const audio = byName("Audio");
  if (audio) {
    const silent = SILENT_AUDIO_RE.test(audio.body);
    const bodyHasDial =
      /lip-sync\s*active/i.test(audio.body) ||
      /\(dialogue\)/i.test(audio.body) ||
      /\bsays\b/i.test(audio.body) ||
      /["“][^"”]{2,}["”]/.test(audio.body);
    if ((hasDial || bodyHasDial) && silent) {
      conflicts.push("VP-CONFLICT_AUDIO_NO_DIALOGUE");
      if (hasDial) {
        const linesBlock = Array.isArray(input.dialogueLines)
          ? (input.dialogueLines as string[]).map((t) => `"${String(t).replace(/^["“]|["”]$/g, "")}"`).join("\n")
          : dialogue
              .split(/\n+/)
              .map((t) => (t.startsWith('"') || t.startsWith("“") ? t : `"${t}"`))
              .join("\n");
        audio.body = `${linesBlock}\n口型同步开启。`.trim();
        changes.push("audio_restore_source_lines");
      } else {
        // Strip silence scaffold; keep existing dialogue / lip-sync clauses
        audio.body = audio.body
          .replace(/no\s*(spoken\s*)?dialogue\.?/gi, "")
          .replace(/ambient\/?SFX\s*only\.?/gi, "")
          .replace(/无对白\.?|无台词\.?/gi, "")
          .replace(/^\s*,\s*|\s*,\s*$/g, "")
          .replace(/,\s*,/g, ",")
          .replace(/\s+/g, " ")
          .trim();
        if (!/lip-sync\s*active|口型同步开启/i.test(audio.body)) audio.body = `${audio.body}\n口型同步开启。`.trim();
        changes.push("audio_strip_silence_keep_dialogue");
      }
    } else if (hasDial && !/[\u4e00-\u9fff]/.test(audio.body) && /dialogue|voiceover|monologue/i.test(audio.body)) {
      conflicts.push("VP-CONFLICT_AUDIO_EN");
      audio.body = `${dialogue}\n口型同步开启。`;
      changes.push("audio_replace_en_with_source");
    } else if (!hasDial && bodyHasDial) {
      // M3: no design dialogue but prompt still has speech / lip → strip (AUD-ORPHAN)
      conflicts.push("AUD-ORPHAN-SPEECH");
      audio.body = "无对白。仅环境音效。";
      changes.push("audio_strip_orphan_speech");
    }
  }

  // --- Camera: single shot size, single duration, prefer static on dialogue ---
  const camera = byName("Camera");
  if (camera) {
    let cam = camera.body;
    const durationsEn = [...cam.matchAll(/duration\s*(\d+(?:\.\d+)?)s?/gi)].map((m) => m[1]);
    const durationsZh = [...cam.matchAll(/时长\s*(\d+(?:\.\d+)?)\s*s?/gi)].map((m) => m[1]);
    const durations = [...durationsEn, ...durationsZh];
    if (durations.length > 1 || (input.durationSec != null && durations.length)) {
      conflicts.push("VP-CONFLICT_DURATION");
      const d =
        input.durationSec != null && Number.isFinite(input.durationSec)
          ? Math.max(1, Math.min(30, Math.round(input.durationSec)))
          : Math.round(Number(durations[0]));
      cam = cam
        .replace(/duration\s*\d+(?:\.\d+)?s?/gi, "")
        .replace(/时长\s*\d+(?:\.\d+)?\s*s?/gi, "")
        .replace(/,?\s*,/g, ",")
        .trim();
      cam = `${cam.replace(/[，,]\s*$/, "")}${cam ? "，" : ""}时长 ${d}s`.replace(/\s+/g, " ").trim();
      changes.push(`camera_duration_${d}`);
    } else if (input.durationSec != null && Number.isFinite(input.durationSec) && !/(?:时长|duration)\s*\d/i.test(cam)) {
      const d = Math.max(1, Math.min(30, Math.round(input.durationSec)));
      cam = `${cam}${cam ? "，" : ""}时长 ${d}s`;
      changes.push(`camera_duration_inject_${d}`);
    }

    const sizes = [
      ...cam.matchAll(/\b(extreme close-?up|close-?up|medium close-?up|medium shot|wide shot|full shot|CU|MCU|MS|WS|特写|近景|中景|全景|远景)\b/gi),
    ].map((m) => m[1]);
    if (sizes.length > 1) {
      conflicts.push("VP-CONFLICT_SHOT_SIZE");
      const keep = sizes[0];
      for (let i = 1; i < sizes.length; i++) {
        cam = cam.replace(new RegExp(sizes[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "");
      }
      if (!new RegExp(keep, "i").test(cam)) cam = `${keep}, ${cam}`;
      changes.push("camera_single_shot_size");
    }

    // CAM-SPEAK: clamp dangerous motions always (homology with hydrate/import)
    if (/whip.?pan|crash.?zoom|dutch|handheld.?shake|速切|甩镜/i.test(cam)) {
      conflicts.push("VP-CONFLICT_CAM_SPEAK");
      cam = cam
        .replace(/whip.?pan|crash.?zoom|dutch.?extreme|handheld.?shake|速切|甩镜/gi, "static")
        .replace(/\s+/g, " ")
        .trim();
      changes.push("camera_clamp_dangerous");
    }
    if (hasDial && (input.preferStaticOnDialogue !== false)) {
      if (/gentle\s*push|slow\s*pan|轻推|横移/i.test(cam) && !/static|静止/.test(cam)) {
        /* dialogue prefers static — keep existing dialogue static path for extreme already done */
      }
    }

    // Dedupe slow pan
    const panHits = cam.match(/slow\s*pan/gi) ?? [];
    if (panHits.length > 1) {
      let first = true;
      cam = cam.replace(/slow\s*pan/gi, () => {
        if (first) {
          first = false;
          return "slow pan";
        }
        return "";
      });
      changes.push("dedupe_slow_pan");
    }

    camera.body = cam.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim();
  }

  // --- Motion: single motion-from-frame; dedupe slow pan ---
  const motion = byName("Motion");
  if (motion) {
    let m = motion.body;
    const before = (m.match(/motion-from-frame/gi) ?? []).length;
    if (before > 1) {
      m = dedupeMotionFromFrame(m);
      changes.push("dedupe_motion_from_frame");
    }
    const pans = m.match(/slow\s*pan/gi) ?? [];
    if (pans.length > 1) {
      let first = true;
      m = m.replace(/slow\s*pan/gi, () => {
        if (first) {
          first = false;
          return "slow pan";
        }
        return "";
      });
      changes.push("dedupe_motion_slow_pan");
    }
    motion.body = m.replace(/\n{3,}/g, "\n\n").trim();
  }

  // Also dedupe motion-from-frame in Visual / whole prompt sections
  for (const s of sections) {
    if (s.name === "Motion") continue;
    const mff = s.body.match(/motion-from-frame/gi) ?? [];
    if (mff.length > 1 || (mff.length >= 1 && motion && /motion-from-frame/i.test(motion.body) && /motion-from-frame/i.test(s.body))) {
      if (/motion-from-frame/i.test(s.body) && motion && /motion-from-frame/i.test(motion.body) && s.name !== "Motion") {
        s.body = s.body.replace(/motion-from-frame[^\n]*/gi, "").trim();
        changes.push(`strip_mff_from_${s.name}`);
      }
    }
  }

  // --- Narrative: trim if > 400 chars ---
  const narrative = byName("Narrative");
  if (narrative && narrative.body.length > 400) {
    narrative.body = `${narrative.body.slice(0, 360).trim()}…`;
    changes.push("narrative_trim");
    conflicts.push("VP-CONFLICT_NARRATIVE_BLOAT");
  }

  // Strip image-style trailing Midjourney-like flags from Narrative/Visual
  for (const s of sections) {
    if (/--(ar|stylize|v|q)\s/i.test(s.body)) {
      s.body = s.body.replace(/\s*--(ar|stylize|v|q)\s+[^\s,]+/gi, "").trim();
      changes.push(`strip_image_flags_${s.name}`);
    }
  }

  sections = sections.map((s) => ({ ...s, body: s.body.replace(/\n{3,}/g, "\n\n").trim() }));
  return joinSections(sections);
}

/**
 * Sanitize a video prompt. For multi-parameter shells, sanitize Instruction inner
 * and leave References untouched; also sanitize five-section bodies when present.
 */
/**
 * LLM / scaffold asks for storyboard XML — never burn as vendor body.
 * Covers real samples:「请提供具体的分镜信息（XML格式…）」/「请提供具体的分镜 XML 数据（含 videoDesc…）」
 */
const XML_ASK_RE =
  /请提供[^。；;\n]{0,80}分镜[^。；;\n]{0,120}(?:XML|xml|文本描述|videoDesc|associateAssetsIds)[^。；;\n]{0,80}(?:以便[^。；;\n]{0,40})?[。.]?/gi;
const XML_ASK_RE_EN =
  /please\s+provide\s+(?:a\s+|the\s+|full\s+)?storyboard[^.。；;\n]{0,80}/gi;
const XML_ASK_RE_SHORT =
  /请提供(?:完整的?)?分镜\s*XML|请发送(?:完整)?分镜/gi;

export function stripXmlAskStub(prompt: string): { prompt: string; stripped: boolean } {
  let t = String(prompt ?? "");
  const before = t;
  t = t.replace(XML_ASK_RE, " ");
  t = t.replace(XML_ASK_RE_EN, " ");
  t = t.replace(XML_ASK_RE_SHORT, " ");
  t = t.replace(/^\s*```xml[\s\S]*?```/gim, " ");
  // Broken micro-expression residue from softPatch
  t = t.replace(/锁定脸型上的细微微表情（禁止\/）/g, "锁定脸型上的细微微表情（禁止改面容身份）");
  t = t.replace(/锁定脸型上的细微微表情（禁止改脸\/换脸）/g, "锁定脸型上的细微微表情（禁止改面容身份）");
  t = t.replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return { prompt: t, stripped: t !== before.trim() };
}

export function sanitizeVideoPrompt(input: SanitizeVideoPromptInput): SanitizeVideoPromptResult {
  const changes: string[] = [];
  const conflicts: string[] = [];
  let seed = String(input.prompt ?? "");
  const cross = stripCrossShotViralSidecar(seed);
  if (cross.stripped) {
    seed = cross.prompt;
    changes.push("strip_cross_shot_sidecar");
    conflicts.push("VP-CROSS-SHOT-SIDECAR");
  }
  const xml = stripXmlAskStub(seed);
  if (xml.stripped) {
    seed = xml.prompt;
    changes.push("strip_xml_ask_stub");
    conflicts.push("VP-XML-ASK-STUB");
  }
  // Scaffold Ns / empty motion dash
  const beforeNs = seed;
  seed = seed
    .replace(/时长\s*Ns/gi, "")
    .replace(/duration\s*Ns\b/gi, "")
    .replace(/\[Motion\]\s*\n?\s*-:\s*可读动作拍点。?/gi, "[Motion]\nmotion-from-frame");
  if (seed !== beforeNs) {
    changes.push("strip_duration_ns_scaffold");
    conflicts.push("VP-DURATION-NS");
  }
  const enShell = stripEnQfShells(seed);
  if (enShell.stripped) {
    seed = enShell.prompt;
    changes.push("strip_en_qf_shell");
  }
  const qf = softPatchQfExpr(seed);
  if (qf.patched) {
    seed = qf.prompt;
    changes.push("qf_expr_strip");
  }
  input = { ...input, prompt: seed };
  let prompt = (input.prompt ?? "").trim();
  if (!prompt) return { prompt: "", changes, conflicts };

  // Consume orphan strengthen keys (audioXor / lipSyncPolicy)
  if (input.strengthen && Object.keys(input.strengthen).length) {
    const next = applyAudioStrengthenToPrompt(prompt, input.strengthen);
    if (next !== prompt) {
      prompt = next;
      changes.push("strengthen_audio_consume");
    }
  }

  const { prefix: framePrefix, rest } = extractFrameTags(prompt);
  prompt = rest;

  // Multi shell: sanitize [Instruction] body only
  if (/\[References\]/i.test(prompt) && /\[Instruction\]/i.test(prompt)) {
    prompt = prompt.replace(/\[Instruction\]([\s\S]*?)(?=\[References\]|$)/i, (_m, body: string) => {
      const cleaned = sanitizeFiveBody(String(body).trim(), input, changes, conflicts);
      return `[Instruction]\n${cleaned}`;
    });
    // Also sanitize any five-section blocks outside Instruction if present in the whole prompt
    if (/\[Visual\]/i.test(prompt) && !/\[Instruction\][\s\S]*\[Visual\]/i.test(prompt)) {
      prompt = sanitizeFiveBody(prompt, input, changes, conflicts);
    }
  } else {
    prompt = sanitizeFiveBody(prompt, input, changes, conflicts);
  }

  // Global: at most one motion-from-frame in entire prompt
  const allMff = prompt.match(/motion-from-frame/gi) ?? [];
  if (allMff.length > 1) {
    prompt = dedupeMotionFromFrame(prompt);
    changes.push("global_dedupe_motion_from_frame");
    conflicts.push("VP-CONFLICT_MOTION_FROM_FRAME");
  }

  prompt = prompt.replace(/\n{3,}/g, "\n\n").trim();
  if (framePrefix) prompt = `${framePrefix}\n${prompt}`.trim();

  return { prompt, changes: uniqKeepOrder(changes), conflicts: uniqKeepOrder(conflicts) };
}

/** Detect Chat / autoDesign stub video prompts that must not win over IR. */
export function isVideoPromptStub(prompt?: string | null): boolean {
  const t = String(prompt ?? "").trim();
  if (!t) return true;
  // LLM asked for storyboard XML / 分镜数据 instead of writing the shot
  if (
    /请提供[^。；;\n]{0,80}分镜[^。；;\n]{0,40}(?:XML|xml|文本描述|videoDesc)/i.test(t) ||
    /please\s+provide\s+(?:a\s+|the\s+|full\s+)?storyboard/i.test(t)
  ) {
    return true;
  }
  // Scaffold placeholders even inside five-section = dirty stub
  if (
    /\(dialogue\s*\/\s*SFX\s*filled from design when present\)/i.test(t) ||
    /0s-Ns\s*:/i.test(t) ||
    /duration\s*Ns\b/i.test(t) ||
    /时长\s*Ns\b/i.test(t) ||
    /\[Motion\]\s*\n?-:\s*/i.test(t) ||
    /["']---["']\s*\(dialogue\)/i.test(t)
  ) {
    return true;
  }
  // Empty Visual + ask / only 禁止夸张 shell
  if (
    /\[Visual\]\s*\n?\s*,?\s*禁止夸张/i.test(t) &&
    (/请提供/.test(t) || /可读动作拍点/.test(t))
  ) {
    return true;
  }
  if (/\[Visual\]/i.test(t) && /\[Audio\]/i.test(t)) {
    // Five-section with only placeholder audio still stub
    const audio = t.match(/\[Audio\]([\s\S]*?)(?=\[Narrative\]|$)/i)?.[1] ?? "";
    if (/\(dialogue\s*\/\s*SFX\s*filled/i.test(audio) || !audio.trim()) return true;
    // Visual body is only ask/stub clauses
    const visual = t.match(/\[Visual\]([\s\S]*?)(?=\[Motion\]|$)/i)?.[1] ?? "";
    if (/请提供/.test(visual) && !/[\u4e00-\u9fff]{12,}/.test(visual.replace(/请提供[^。]{0,120}/g, ""))) {
      return true;
    }
    return false;
  }
  if (t.length > 120 && /[\u4e00-\u9fff]{8,}/.test(t) && !/请提供[^。]{0,40}分镜/.test(t)) return false;
  if (t.length < 100 && /duration\s*\d/i.test(t) && /(static|中景|近景|特写|medium|close)/i.test(t)) return true;
  if (/^(中景|近景|特写|全景|medium shot|close-?up).{0,50}(static|duration)/i.test(t)) return true;
  return false;
}

/** Inject fragment into a named five-section (or append if section missing). */
export function injectIntoSection(prompt: string, section: string, fragment: string): string {
  const bit = fragment.trim();
  if (!bit) return prompt;
  if (prompt.includes(bit)) return prompt;
  const re = new RegExp(
    `\\[${section}\\]([\\s\\S]*?)(?=\\[(?:Visual|Motion|Camera|Audio|Narrative|References|Instruction)\\]|$)`,
    "i",
  );
  if (re.test(prompt)) {
    return prompt.replace(re, (_m, body: string) => {
      const merged = `${String(body).trim()}${String(body).trim() ? ", " : ""}${bit}`.trim();
      return `[${section}]\n${merged}\n\n`;
    });
  }
  return `${prompt.trim()}\n\n[${section}]\n${bit}`;
}

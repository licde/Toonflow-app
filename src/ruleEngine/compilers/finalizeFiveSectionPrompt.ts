/**
 * Final egress shaping for five-section video prompts (Untitled-3 class dirt).
 * Call after dialect/registry — never leave Ns / filled placeholders / cref-in-Narrative.
 */
import { sanitizeVideoPrompt, SILENT_AUDIO_RE, type SanitizeVideoPromptInput, type SanitizeVideoPromptResult } from "./sanitizeVideoPrompt";

const PLACEHOLDER_AUDIO = /\(dialogue\s*\/\s*SFX\s*filled from design when present\)\.?/i;
const PLACEHOLDER_MOTION = /0s-Ns\s*:\s*readable action beats from seed\.?/i;
const SEED_MOTION = /readable action beats from seed/i;
const FAKE_DIALOGUE = /["']---["']\s*\(dialogue\)/i;

export interface FinalizeFiveSectionInput extends SanitizeVideoPromptInput {
  /** Short continuity / peak only for Narrative */
  narrativePeak?: string;
}

export interface FinalizeFiveSectionResult extends SanitizeVideoPromptResult {
  needsIrRebuild: boolean;
}

function injectSection(prompt: string, section: string, body: string): string {
  const re = new RegExp(`\\[${section}\\]([\\s\\S]*?)(?=\\[(?:Visual|Motion|Camera|Audio|Narrative|References|Instruction)\\]|$)`, "i");
  if (re.test(prompt)) {
    return prompt.replace(re, `[${section}]\n${body.trim()}\n\n`);
  }
  return `${prompt.trim()}\n\n[${section}]\n${body.trim()}`;
}

function sectionBody(prompt: string, section: string): string | null {
  const re = new RegExp(`\\[${section}\\]([\\s\\S]*?)(?=\\[(?:Visual|Motion|Camera|Audio|Narrative|References|Instruction)\\]|$)`, "i");
  const m = prompt.match(re);
  return m ? m[1].trim() : null;
}

/** True when five-section still has scaffold placeholders that must not ship. */
export function hasFiveSectionPlaceholders(prompt?: string | null): boolean {
  const t = String(prompt ?? "");
  return (
    PLACEHOLDER_AUDIO.test(t) ||
    PLACEHOLDER_MOTION.test(t) ||
    /duration\s*Ns\b/i.test(t) ||
    FAKE_DIALOGUE.test(t) ||
    (/singleImage reference/i.test(t) && /\[Visual\]/i.test(t)) ||
    /readable action beats from seed/i.test(t) ||
    /\bfg:\s*,/i.test(t) ||
    /\bbg:\s*,/i.test(t) ||
    /\bFX:\s*,/i.test(t) ||
    /micro-expression:\s*\/\s*neutral_closed/i.test(t) ||
    /micro-expression:\s*,/i.test(t) ||
    /debutBeat:\s*,/i.test(t) ||
    /anchor:\s*\/\s*,/i.test(t)
  );
}

/** Audio claims silence while also carrying quoted dialogue / lip-sync. */
export function hasAudioDialogueContradiction(prompt?: string | null): boolean {
  const t = String(prompt ?? "");
  const audio = sectionBody(t, "Audio") ?? "";
  if (!audio) return false;
  const silent = /no spoken dialogue|ambient\/SFX only|无对白|无台词/i.test(audio) || SILENT_AUDIO_RE.test(audio);
  const hasDial =
    /lip-sync\s*active/i.test(audio) ||
    /\(dialogue\)/i.test(audio) ||
    /["“][^"”]{2,}["”]\s*\(dialogue\)/i.test(audio) ||
    /\bsays\b/i.test(audio);
  return silent && hasDial;
}

/**
 * Full finalize: sanitize + replace placeholders + strip cref from Narrative + sync duration.
 */
export function finalizeFiveSectionPrompt(input: FinalizeFiveSectionInput): FinalizeFiveSectionResult {
  const changes: string[] = [];
  const conflicts: string[] = [];
  const dur =
    input.durationSec != null && Number.isFinite(input.durationSec)
      ? Math.max(1, Math.min(30, Math.round(Number(input.durationSec))))
      : undefined;

  const base = sanitizeVideoPrompt(input);
  changes.push(...base.changes);
  conflicts.push(...base.conflicts);
  let prompt = base.prompt;
  const needsIrRebuild = hasFiveSectionPlaceholders(prompt);

  // --- Motion: replace 0s-Ns / seed scaffold ---
  {
    const linesForMotion = Array.isArray(input.dialogueLines)
      ? input.dialogueLines.map((l) => String(l).trim()).filter(Boolean)
      : String(input.dialogueLines ?? "")
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean);
    const hasDialMotion = linesForMotion.some((l) => /[\u4e00-\u9fffA-Za-z]/.test(l) && l !== "---");
    if (PLACEHOLDER_MOTION.test(prompt) || /0s-Ns/i.test(prompt) || SEED_MOTION.test(prompt)) {
      const d = dur ?? 4;
      const nextMotion = hasDialMotion
        ? `0s-${d}s: 保持画幅，对白时轻微口型。`
        : `0s-${d}s: 可读动作拍点。`;
      prompt = injectSection(prompt, "Motion", nextMotion);
      changes.push("finalize_motion_ns");
      conflicts.push("VP-PLACEHOLDER_MOTION");
    }
  }

  // --- Camera: strip duration Ns, enforce single numeric duration ---
  {
    let cam = sectionBody(prompt, "Camera") ?? "";
    if (/duration\s*Ns\b/i.test(cam) || (dur != null && cam)) {
      cam = cam.replace(/duration\s*Ns\b/gi, "").replace(/duration\s*\d+(?:\.\d+)?s?/gi, "");
      if (dur != null) cam = `${cam.replace(/,\s*$/, "").trim()}${cam.trim() ? ", " : ""}duration ${dur}s`;
      cam = cam.replace(/,\s*,/g, ",").replace(/\s+/g, " ").trim() || `medium shot, duration ${dur ?? 4}s, single continuous take.`;
      prompt = injectSection(prompt, "Camera", cam);
      changes.push("finalize_camera_duration");
      if (/duration\s*Ns/.test(base.prompt)) conflicts.push("VP-PLACEHOLDER_DURATION_NS");
    }
  }

  // --- Audio: placeholders / fake --- / silence+dialogue XOR / ban "1." stub ---
  {
    let audio = sectionBody(prompt, "Audio") ?? "";
    const lines = Array.isArray(input.dialogueLines)
      ? input.dialogueLines.map((l) => String(l).trim()).filter(Boolean)
      : String(input.dialogueLines ?? "")
          .split(/\n+/)
          .map((l) => l.trim())
          .filter(Boolean);
    const hasLines = lines.some((l) => /[\u4e00-\u9fffA-Za-z]/.test(l) && l !== "---" && !/^["']?\d+\.?["']?$/.test(l));
    const silent = SILENT_AUDIO_RE.test(audio);
    const bodyHasDial =
      /lip-sync\s*active|口型同步开启/i.test(audio) || /\(dialogue\)/i.test(audio) || /\bsays\b/i.test(audio);
    const stubOne = /["']1\.["']\s*\(dialogue\)|^["']?1\.["']?\s*$/m.test(audio);
    const osOnly = /\(OS\)|画外|type\s*:\s*os|subtle lip sync（OS）/i.test(audio) && !hasLines;

    if (stubOne) {
      audio = hasLines
        ? [...lines.map((t) => (t.startsWith('"') || t.startsWith("“") ? t : `"${t}"`)), "口型同步开启。"].join("\n")
        : "无对白。仅环境音效。";
      prompt = injectSection(prompt, "Audio", audio);
      changes.push("finalize_audio_ban_stub_one");
      conflicts.push("VP-AUDIO_STUB");
    } else if (osOnly && bodyHasDial) {
      // OS must not force dialogue lip-sync
      audio = audio
        .replace(/lip-sync active\.?/gi, "")
        .replace(/口型同步开启。?/g, "")
        .replace(/natural mouth movement for dialogue\.?/gi, "")
        .trim();
      if (!/无对白|环境/.test(audio)) audio = `${audio}\n无对白口型；OS/画外音。`.trim();
      prompt = injectSection(prompt, "Audio", audio);
      changes.push("finalize_audio_os_no_lip");
    } else if (hasLines && (silent || PLACEHOLDER_AUDIO.test(audio) || FAKE_DIALOGUE.test(audio) || !audio.trim() || !bodyHasDial)) {
      audio = [...lines.map((t) => (t.startsWith('"') || t.startsWith("“") ? t : `"${t}"`)), "口型同步开启。"].join("\n");
      prompt = injectSection(prompt, "Audio", audio);
      changes.push(silent ? "finalize_audio_xor_dialogue" : "finalize_audio_from_lines");
      conflicts.push("VP-PLACEHOLDER_AUDIO");
    } else if (!hasLines && (PLACEHOLDER_AUDIO.test(audio) || FAKE_DIALOGUE.test(audio) || !audio.trim())) {
      audio = "无对白。仅环境音效。";
      prompt = injectSection(prompt, "Audio", audio);
      changes.push("finalize_audio_explicit_silent");
      conflicts.push("VP-PLACEHOLDER_AUDIO");
    } else if (hasLines && silent && bodyHasDial) {
      audio = [...lines.map((t) => (t.startsWith('"') || t.startsWith("“") ? t : `"${t}"`)), "口型同步开启。"].join("\n");
      prompt = injectSection(prompt, "Audio", audio);
      changes.push("finalize_audio_xor_dialogue");
      conflicts.push("VP-CONFLICT_AUDIO_NO_DIALOGUE");
    }
  }

  // --- Visual: strip mode dialect leaks ---
  {
    let visual = sectionBody(prompt, "Visual") ?? "";
    if (visual) {
      const before = visual;
      visual = visual
        .replace(/singleImage reference\.?/gi, "")
        .replace(/text-to-video\.?/gi, "")
        .replace(/motion-from-frame[^\n,]*/gi, "")
        .replace(/duration\s*\d+(?:\.\d+)?s?/gi, "")
        .replace(/,\s*,/g, ",")
        .replace(/\s+/g, " ")
        .trim();
      // Dedupe slow pan in visual
      let pan = 0;
      visual = visual.replace(/slow\s*pan/gi, () => {
        pan += 1;
        return pan === 1 ? "slow pan" : "";
      });
      if (visual !== before) {
        prompt = injectSection(prompt, "Visual", visual || "场景主体，锁定脸型身份。");
        changes.push("finalize_visual_declutter");
      }
    }
  }

  // --- Narrative: strip cref/sref/identity dump / FX:F / fake dialogue ---
  {
    let narr = sectionBody(prompt, "Narrative") ?? "";
    if (narr || /--cref|--sref|identity\[/i.test(prompt)) {
      const before = narr;
      narr = narr
        .replace(/--cref\s+[A-Za-z0-9-]+/gi, "")
        .replace(/--sref\s+[A-Za-z0-9-]+/gi, "")
        .replace(/identity\[[^\]]*\]/gi, "")
        .replace(/FX\s*:\s*F[0-5]/gi, "")
        .replace(FAKE_DIALOGUE, "")
        .replace(/lip-sync active,?/gi, "")
        .replace(/voice\s*:\s*[^,\n]+/gi, "")
        .replace(/singleImage reference\.?/gi, "")
        .replace(/subtle camera follow\.?/gi, "")
        .replace(/,\s*,/g, ",")
        .replace(/\s+/g, " ")
        .trim();
      if (input.narrativePeak && !narr.includes(input.narrativePeak.slice(0, 12))) {
        narr = `${input.narrativePeak.slice(0, 120)}. ${narr}`.trim();
      }
      if (narr.length > 280) narr = `${narr.slice(0, 260).trim()}…`;
      if (!narr) narr = "设计连贯；锁定脸型身份。";
      if (narr !== before || /--cref|--sref/i.test(before)) {
        prompt = injectSection(prompt, "Narrative", narr);
        changes.push("finalize_narrative_strip_cref");
        conflicts.push("VP-NARRATIVE_CREF");
      }
    }
  }

  // Global: strip Midjourney-style cref/sref from video body (refs live in media slots)
  if (/--cref\s+|--sref\s+/i.test(prompt)) {
    prompt = prompt.replace(/--cref\s+[A-Za-z0-9-]+/gi, "").replace(/--sref\s+[A-Za-z0-9-]+/gi, "");
    changes.push("finalize_strip_global_cref_sref");
    conflicts.push("VP-NARRATIVE_CREF");
  }

  // Global mff once more
  const mff = prompt.match(/motion-from-frame/gi) ?? [];
  if (mff.length > 1) {
    let n = 0;
    prompt = prompt.replace(/motion-from-frame/gi, () => {
      n += 1;
      return n === 1 ? "motion-from-frame" : "";
    });
    changes.push("finalize_dedupe_mff");
  }

  prompt = prompt.replace(/,\s*,/g, ",").replace(/\n{3,}/g, "\n\n").trim();

  // Must M5: minimal zh shell — strip EN boilerplate / rule IDs; map motion whitelist
  {
    const before = prompt;
    prompt = prompt
      .replace(/\(\s*QF-EXPR-0?6\s*\)/gi, "")
      .replace(/\bQF-EXPR-0?6\b/gi, "")
      .replace(/keep face identity[^.；;\n]*/gi, "锁定脸型身份")
      .replace(/no exaggerated expression rewrite[^.；;\n]*/gi, "禁止夸张改脸")
      .replace(/continuity:\s*continues from/gi, "承接：")
      .replace(/continues from/gi, "承接：")
      .replace(/No spoken dialogue[^.；;\n]*/gi, "无对白")
      .replace(/ambient\/?SFX\s*only\.?/gi, "仅环境音效")
      .replace(/subject in scene[^.；;\n]*/gi, "画面主体")
      .replace(/\bPeak:\s*/gi, "情绪峰值：")
      .replace(/continuity from design intent\.?/gi, "设计连贯")
      .replace(/subtle camera follow/gi, "轻微跟随")
      .replace(/static hold/gi, "静止持镜")
      .replace(/readable action beats(?:\s+from seed)?\.?/gi, "可读动作拍点")
      .replace(/clear emotional beat/gi, "情绪拍点清晰")
      .replace(/warm color temperature/gi, "暖色温")
      .replace(/shallow depth of field/gi, "浅景深")
      .replace(/soft background/gi, "背景虚化")
      .replace(/single continuous take\.?/gi, "单次连续镜头")
      .replace(/no subtitle,?\s*no watermark,?\s*no Logo/gi, "无字幕无水印无Logo")
      .replace(/lip-sync active/gi, "口型同步开启")
      .replace(/subtle lip sync/gi, "轻微口型")
      .replace(/natural mouth movement/gi, "自然嘴部动作")
      .replace(/\bslow pan\b/gi, "缓慢横移")
      .replace(/\bslow zoom\b/gi, "缓慢变焦")
      .replace(/\bgentle push\b/gi, "轻推")
      .replace(/\bsubtle drift\b/gi, "微漂移")
      .replace(/\bstatic\b/gi, "静止")
      .replace(/continuity from design;?\s*/gi, "设计连贯；")
      .replace(/duration\s+(\d+(?:\.\d+)?)s/gi, "时长 $1s")
      .replace(/medium shot/gi, "中景")
      .replace(/subtle camera/gi, "轻微运镜")
      .replace(/,\s*,/g, ",")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (prompt !== before) changes.push("finalize_zh_shell_min");
  }

  return {
    prompt,
    changes: [...new Set(changes)],
    conflicts: [...new Set(conflicts)],
    needsIrRebuild,
  };
}

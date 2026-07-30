/**
 * Per-item design intent fidelity — compare burned five-section prompt vs package SSOT.
 */
import type { ShotCompileContext } from "./hydrateShotCompileContext";
import { hydrateShotCompileContextSync } from "./hydrateShotCompileContext";
import { peelLiteraryBody, literaryCjkScore } from "./resolveTrackStoryboard";
import { isFxPromptGradeStub } from "./promptIR";
import { isNonLiteraryDialogueKey } from "../design/dialogueCoverage";

export type DesignIntentHit = {
  id: string;
  label: string;
  pass: boolean;
  expected?: string;
  actual?: string;
};

export type DesignIntentFidelityResult = {
  items: DesignIntentHit[];
  pass: boolean;
  blockers: DesignIntentHit[];
};

/** Ensure five-section headers each start on their own line. */
export function normalizeFiveSectionNewlines(prompt: string): string {
  let out = String(prompt ?? "");
  for (const sec of ["Motion", "Camera", "Audio", "Narrative", "References", "Instruction"]) {
    out = out.replace(new RegExp(`([^\\n])\\s*\\[${sec}\\]`, "gi"), `$1\n\n[${sec}]`);
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

/** Scene vs SFX field coherence — WARN when obvious mismatch. */
export function checkAvSceneSfxCoherence(input: {
  sceneName?: string | null;
  sfx?: string | null;
  avCausality?: string | null;
}): { ok: boolean; message?: string; sceneToken?: string; sfxToken?: string } {
  const scene = String(input.sceneName ?? input.avCausality ?? "").trim();
  const sfx = String(input.sfx ?? "").trim();
  if (!scene || !sfx) return { ok: true };
  const sceneTokens = ["寝殿", "祠堂", "庭院", "书房", "大殿", "街头", "室外"];
  const sceneHit = sceneTokens.find((t) => scene.includes(t));
  const sfxScene = sceneTokens.find((t) => t !== sceneHit && sfx.includes(t));
  if (sceneHit && sfxScene && sceneHit !== sfxScene) {
    return {
      ok: false,
      message: `场域不一致：sceneName=${sceneHit}，SFX 含 ${sfxScene}`,
      sceneToken: sceneHit,
      sfxToken: sfxScene,
    };
  }
  return { ok: true };
}

/** Align SFX scene token to sceneName when import/heal can fix obvious mismatch. */
export function healAvSceneSfxText(input: {
  sceneName?: string | null;
  sfx?: string | null;
  avCausality?: string | null;
}): { sfx: string; healed: boolean; message?: string } {
  const sfx = String(input.sfx ?? "").trim();
  const check = checkAvSceneSfxCoherence(input);
  if (check.ok || !check.sceneToken || !check.sfxToken) {
    return { sfx, healed: false };
  }
  const healedSfx = sfx.replace(new RegExp(check.sfxToken, "g"), check.sceneToken);
  return {
    sfx: healedSfx,
    healed: healedSfx !== sfx,
    message: check.message,
  };
}

function sectionBody(prompt: string, name: string): string {
  const m = new RegExp(`\\[${name}\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`, "i").exec(prompt);
  return (m?.[1] ?? "").trim();
}

function injectSection(prompt: string, name: string, body: string): string {
  const re = new RegExp(`(\\[${name}\\]\\s*)([\\s\\S]*?)(?=\\n\\[|$)`, "i");
  if (re.test(prompt)) return prompt.replace(re, `$1${body}\n`);
  return `${prompt.trim()}\n\n[${name}]\n${body}`;
}

function resolveSceneName(ctx: ShotCompileContext): string {
  if (ctx.sceneName) return String(ctx.sceneName).trim();
  const narr = ctx.designShot?.narrative as { sceneName?: string; avCausality?: string } | undefined;
  return String(narr?.sceneName ?? narr?.avCausality ?? "").trim();
}

function vdSurvivalTokens(vd: string): string[] {
  const tokens: string[] = [];
  for (const tok of ["纸未入口", "仅颊触", "非口含", "面颊浅痕", "浅痕可见", "颊触"]) {
    if (vd.includes(tok)) tokens.push(tok);
  }
  const verbM = vd.match(/[^。；;\n]{0,20}(?:划过|拂过|贴合|甩至|擦过)[^。；;\n]{0,20}/);
  if (verbM?.[0]?.trim()) tokens.push(verbM[0].trim().slice(0, 24));
  return [...new Set(tokens)];
}

/** Score prompt against design context — each item is an explicit contract row. */
export function scoreVideoDesignIntentFidelity(
  ctx: ShotCompileContext,
  prompt: string,
): DesignIntentFidelityResult {
  const items: DesignIntentHit[] = [];
  const vd = String(ctx.visualDescription ?? "").trim();
  const visual = sectionBody(prompt, "Visual");
  const motion = sectionBody(prompt, "Motion");
  const camera = sectionBody(prompt, "Camera");
  const audio = sectionBody(prompt, "Audio");
  const narrative = sectionBody(prompt, "Narrative");
  const intent = ctx.videoIntent.intentClass;
  const authorDur = ctx.authorDurationSec ?? ctx.beatDurationSec ?? null;
  const sfx = String(ctx.sfx ?? ctx.sfxIntent ?? "").trim();

  // VD literary body survives
  if (vd.length >= 8) {
    const peeled = peelLiteraryBody(vd);
    const vdScore = literaryCjkScore(peeled);
    const visualScore = literaryCjkScore(visual);
    items.push({
      id: "vd_body",
      label: "VD 文学主体进入 Visual",
      pass: visualScore >= Math.min(8, vdScore) && visual.includes(peeled.slice(0, 12)),
      expected: peeled.slice(0, 48),
      actual: visual.slice(0, 48),
    });
    for (const tok of vdSurvivalTokens(vd)) {
      items.push({
        id: `vd_atom_${tok.slice(0, 8)}`,
        label: `VD 原子「${tok}」`,
        pass: visual.includes(tok),
        expected: tok,
      });
    }
  }

  // Intent class
  items.push({
    id: "intent_class",
    label: "意图类",
    pass: new RegExp(`intent:${intent}\\b`, "i").test(narrative) || new RegExp(`intent:${intent}\\b`, "i").test(prompt),
    expected: `intent:${intent}`,
    actual: narrative.match(/intent:\w+/)?.[0],
  });

  // Duration
  if (authorDur != null && authorDur > 0) {
    const durM = /(?:时长|duration)\s*(\d+(?:\.\d+)?)\s*s/i.exec(camera);
    const shown = durM ? Number(durM[1]) : 0;
    items.push({
      id: "duration",
      label: "设计时长",
      pass: shown > 0 && Math.abs(shown - authorDur) <= 1,
      expected: `${authorDur}s`,
      actual: shown ? `${shown}s` : "—",
    });
  }

  // Shot size
  const sizeRaw = String(ctx.shotSize ?? "").trim();
  if (sizeRaw) {
    const wantCu = /特写|cu|ecu|close/i.test(sizeRaw);
    items.push({
      id: "shot_size",
      label: "景别",
      pass: wantCu ? /特写|大特写/i.test(camera) : camera.includes(sizeRaw) || camera.includes("近景"),
      expected: sizeRaw,
      actual: camera.slice(0, 32),
    });
  }

  // Silent intent: no lip-sync
  if (intent === "react_silent" || ctx.videoIntent.policy.audioMode === "ambient") {
    const hasLiteraryDial = ctx.dialogueLines.some((t) => !isNonLiteraryDialogueKey(t));
    items.push({
      id: "no_lip_sync",
      label: "无对白镜禁止口型",
      pass: !hasLiteraryDial && !/口型同步开启/.test(audio),
      expected: "无口型",
      actual: /口型同步开启/.test(audio) ? "口型同步" : "无口型",
    });
  }

  // F0 = no FX grade — never as prose echo
  const fxRaw = String(ctx.fxPrompt ?? ctx.fxLevel ?? "").trim();
  if (isFxPromptGradeStub(fxRaw) || /^F0$/i.test(fxRaw)) {
    items.push({
      id: "no_f0_fx_echo",
      label: "F0 无特效等级不得写入 prompt",
      pass:
        !/视觉特效呼应\s*[：:]\s*F0/i.test(prompt) &&
        !/\bfx:F0\b/i.test(narrative) &&
        !/特效可见\s*[：:]\s*F0/i.test(prompt) &&
        !/事件拍点\s*[：:]\s*F0/i.test(prompt),
      expected: "无 F0 特效文案",
    });
  } else if (fxRaw && !isFxPromptGradeStub(fxRaw)) {
    items.push({
      id: "fx_prose",
      label: "特效散文进入 Visual/Audio",
      pass: visual.includes(fxRaw.slice(0, 12)) || audio.includes(fxRaw.slice(0, 12)),
      expected: fxRaw.slice(0, 40),
    });
  }

  // SFX from design
  if (sfx) {
    const parts = sfx.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    const hit = parts.some((p) => p.length >= 2 && audio.includes(p.slice(0, Math.min(6, p.length))));
    items.push({
      id: "sfx",
      label: "设计音效",
      pass: hit,
      expected: sfx,
      actual: audio.slice(0, 64),
    });
  }

  // Motion verbs from VD (react_silent / contact shots)
  try {
    const { isContactEventVd, buildContactEventMotionBeats } =
      require("./contactEventPolicy") as typeof import("./contactEventPolicy");
    if (isContactEventVd(vd)) {
      const phaseCount = (motion.match(/\d+(?:\.\d+)?s-\d+(?:\.\d+)?s\s*:/g) || []).length;
      const hasVerb = /划过|拂过|贴合|颊触|甩|抵|压|摩挲|擦过|贴合/.test(motion);
      const notSoleMicro =
        !(motion.includes("微表情呼吸") && phaseCount < 2 && !hasVerb);
      items.push({
        id: "motion_contact_phases",
        label: "接触事件可执行分相",
        pass: phaseCount >= 2 && hasVerb && notSoleMicro,
        expected: "≥2 相含接触动词",
        actual: motion.slice(0, 64),
      });
      // One-shot repair hint for ensure/repair path
      if (phaseCount < 2 || !hasVerb) {
        const beats = buildContactEventMotionBeats({
          visualDescription: vd,
          durationSec: authorDur ?? ctx.durationSec ?? 2,
        });
        if (beats) {
          items.push({
            id: "motion_contact_repair_hint",
            label: "接触分相修复模板",
            pass: false,
            expected: beats.body.slice(0, 80),
          });
        }
      }
    } else if (/划过|拂过|贴合|颊触|咬唇/.test(vd)) {
      items.push({
        id: "motion_contact",
        label: "接触/微动作动词进入 Motion",
        pass: /划过|拂过|贴合|颊触|咬唇|甩/.test(motion),
        expected: "VD 动词",
        actual: motion.slice(0, 48),
      });
    }
  } catch {
    if (/划过|拂过|贴合|颊触|咬唇/.test(vd)) {
      items.push({
        id: "motion_contact",
        label: "接触/微动作动词进入 Motion",
        pass: /划过|拂过|贴合|颊触|咬唇|甩/.test(motion),
        expected: "VD 动词",
        actual: motion.slice(0, 48),
      });
    }
  }

  // debutBeat
  if (ctx.debutBeat) {
    items.push({
      id: "debut_beat",
      label: "叙事拍点",
      pass: narrative.includes(ctx.debutBeat.slice(0, 8)) || narrative.includes("本镜节拍"),
      expected: ctx.debutBeat.slice(0, 24),
      actual: narrative.slice(0, 48),
    });
  }

  // Motion template — must be 0s-Ns: not bare -:
  if (/\[Motion\]/i.test(prompt)) {
    items.push({
      id: "motion_template",
      label: "Motion 时长模板",
      pass: /0s-\d+s\s*:/i.test(motion) && !/^-:\s*/.test(motion.trim()) && !/\n-:\s/.test(motion),
      expected: "0s-Ns:",
      actual: motion.slice(0, 32),
    });
  }

  // Section integrity — headers on own lines
  const glued = /[^\n][ \t]*\[(?:Motion|Camera|Audio|Narrative)\]/i.test(prompt);
  items.push({
    id: "section_integrity",
    label: "五段换行完整",
    pass: !glued,
    expected: "各段独立换行",
    actual: glued ? "段头粘连" : "ok",
  });

  // AV scene vs SFX coherence
  const sceneName = resolveSceneName(ctx);
  const avCoherence = checkAvSceneSfxCoherence({ sceneName, sfx });
  if (sfx && sceneName) {
    items.push({
      id: "av_scene_sfx",
      label: "场域与 SFX 一致",
      pass: avCoherence.ok,
      expected: sceneName,
      actual: avCoherence.message ?? sfx.slice(0, 32),
    });
  }

  // Contact geometry XOR — VD must not carry dual mutex contacts into one burn
  if (vd.length >= 8) {
    try {
      const { needsLitContactXorSplit } =
        require("../design/expandLitContactXor") as typeof import("../design/expandLitContactXor");
      const sizeForXor = String(ctx.shotSize ?? "").trim();
      if (needsLitContactXorSplit({ visualDescription: vd, shotSize: sizeForXor })) {
        items.push({
          id: "lit_contact_xor",
          label: "文学双接触须拆镜",
          pass: false,
          expected: "颊触镜 + 口创镜分镜",
          actual: "同镜双接触",
        });
      }
    } catch {
      /* optional */
    }
  }

  const warnOnlyIds = new Set(["av_scene_sfx"]);
  const blockers = items.filter((i) => !i.pass && !warnOnlyIds.has(i.id));
  return { items, pass: blockers.length === 0, blockers };
}

/** Auto-repair prompt sections to close fidelity gaps before burn. */
export function repairVideoPromptForDesignIntent(
  ctx: ShotCompileContext,
  prompt: string,
): { prompt: string; repairs: string[] } {
  const repairs: string[] = [];
  let out = normalizeFiveSectionNewlines(prompt);
  const vd = String(ctx.visualDescription ?? "").trim();
  const authorDur = ctx.authorDurationSec ?? ctx.beatDurationSec ?? ctx.durationSec;

  // Strip F0 grade echoes
  if (isFxPromptGradeStub(ctx.fxPrompt) || /^F0$/i.test(String(ctx.fxLevel ?? ""))) {
    const before = out;
    out = out
      .replace(/\n视觉特效呼应\s*[：:]\s*F0[^\n]*/gi, "")
      .replace(/\n?特效可见\s*[：:]\s*F0[^\n]*/gi, "")
      .replace(/\n?事件拍点\s*[：:]\s*F0[^\n]*/gi, "")
      .replace(/\bfx:F0\b/gi, "");
    if (out !== before) repairs.push("strip_f0_fx_echo");
  }

  // Reinforce full VD into Visual
  if (vd.length >= 8) {
    const peeled = peelLiteraryBody(vd);
    if (literaryCjkScore(peeled) >= 8) {
      let visual = sectionBody(out, "Visual");
      const missingAtoms = vdSurvivalTokens(vd).filter((t) => !visual.includes(t));
      if (!visual.includes(peeled.slice(0, 12)) || missingAtoms.length) {
        const extra = missingAtoms.length ? `。${missingAtoms.join("，")}` : "";
        visual = visual.includes(peeled.slice(0, 8)) ? `${visual}${extra}` : `${peeled}${extra}`;
        out = injectSection(out, "Visual", visual.trim());
        repairs.push("reinject_vd_visual");
      }
    }
  }

  // Reinforce SFX
  const sfx = String(ctx.sfx ?? ctx.sfxIntent ?? "").trim();
  if (sfx) {
    let audio = sectionBody(out, "Audio");
    const sceneName = resolveSceneName(ctx);
    const aligned = healAvSceneSfxText({ sceneName, sfx });
    const sfxUse = aligned.healed ? aligned.sfx : sfx;
    if (aligned.healed) repairs.push("heal_av_scene_sfx");
    const parts = sfxUse.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    const missing = parts.filter((p) => p.length >= 2 && !audio.includes(p.slice(0, 4)));
    if (missing.length) {
      audio = `${audio}\n音效：${missing.join("，")}`.trim();
      out = injectSection(out, "Audio", audio);
      repairs.push("reinject_sfx");
    }
    const audioCoherence = checkAvSceneSfxCoherence({ sceneName, sfx: sectionBody(out, "Audio") });
    if (!audioCoherence.ok && audioCoherence.sceneToken && audioCoherence.sfxToken) {
      let audioFixed = sectionBody(out, "Audio");
      audioFixed = audioFixed.replace(new RegExp(audioCoherence.sfxToken, "g"), audioCoherence.sceneToken);
      out = injectSection(out, "Audio", audioFixed);
      repairs.push("heal_audio_scene_token");
    }
  }

  // Strip orphan lip-sync for silent intent
  if (ctx.videoIntent.intentClass === "react_silent") {
    const hasLiteraryDial = ctx.dialogueLines.some((t) => !isNonLiteraryDialogueKey(t));
    if (!hasLiteraryDial && /口型同步开启/.test(out)) {
      out = out.replace(/口型同步开启。?/g, "");
      repairs.push("strip_orphan_lip");
    }
  }

  // Fix duration in Camera
  if (authorDur != null && authorDur > 0) {
    let camera = sectionBody(out, "Camera");
    // Strip duplicate 时长 fragments before single authoritative stamp
    camera = camera
      .replace(/(?:时长|duration)\s*,?\s*/gi, "")
      .replace(/,\s*,+/g, "，")
      .replace(/\s+/g, " ")
      .trim();
    const shotLabel = String(ctx.shotSize ?? "近景").trim() || "近景";
    const camMotion = /轻微运镜|静止|缓推|轻推/.exec(camera)?.[0] ?? "轻微运镜";
    camera = `${shotLabel}，${camMotion}，时长 ${authorDur}s，单次连续镜头。`;
    out = injectSection(out, "Camera", camera);
    repairs.push("fix_duration");
  }

  // Fix Motion template — contactEvent uses multi-phase beats
  if (authorDur != null && authorDur > 0) {
    let motion = sectionBody(out, "Motion");
    try {
      const { isContactEventVd, buildContactEventMotionBeats } =
        require("./contactEventPolicy") as typeof import("./contactEventPolicy");
      if (isContactEventVd(vd)) {
        const phaseCount = (motion.match(/\d+(?:\.\d+)?s-\d+(?:\.\d+)?s\s*:/g) || []).length;
        const hasVerb = /划过|拂过|贴合|颊触|甩|抵|压|摩挲|擦过/.test(motion);
        if (phaseCount < 2 || !hasVerb || (motion.includes("微表情呼吸") && !hasVerb)) {
          const beats = buildContactEventMotionBeats({
            visualDescription: vd,
            durationSec: authorDur,
            woundVisible: /浅痕|渗血/.test(vd),
          });
          if (beats?.body) {
            out = injectSection(out, "Motion", beats.body);
            repairs.push("reinject_contact_beats");
            motion = beats.body;
          }
        }
      }
    } catch {
      /* optional */
    }
    if (!/0s-\d+s\s*:/i.test(motion) || /^-:\s*/.test(motion.trim())) {
      const body = motion.replace(/^-:\s*/i, "").replace(/^0s-\d+s:\s*/i, "").trim();
      const verb =
        body ||
        (vd.match(/[^。；;\n]{0,16}(?:划过|拂过|贴合|颊触|划|擦|甩|咬)[^。；;\n]{0,16}/)?.[0]?.trim() ??
          ctx.videoIntent.policy.motionDefault);
      motion = `0s-${authorDur}s: ${verb.slice(0, 48)}。`;
      out = injectSection(out, "Motion", motion);
      repairs.push("fix_motion_template");
    }
  }

  // Fix shot size in Camera when design declares CU/特写
  const sizeRaw = String(ctx.shotSize ?? "").trim();
  if (sizeRaw && /特写|cu/i.test(sizeRaw)) {
    let camera = sectionBody(out, "Camera");
    if (!/特写|大特写/i.test(camera)) {
      camera = camera.replace(/^近景|中景/, "特写");
      if (!/特写/.test(camera)) camera = `特写，${camera}`;
      out = injectSection(out, "Camera", camera);
      repairs.push("fix_shot_size");
    }
  }

  return { prompt: out, repairs };
}

/** Map fidelity misses to VIRD-style finding ids for videoIntentOps / repair hints. */
export function fidelityHitsToVirdFindings(
  hits: DesignIntentHit[],
): Array<{ id: string; severity: "BLOCK" | "WARN"; message: string }> {
  const map: Record<string, string> = {
    shot_size: "DEX-VID-SHOT-SIZE",
    motion_template: "DEX-VID-MOTION-TEMPLATE",
    motion_contact: "DEX-VID-MOTION-VERB",
    section_integrity: "DEX-VID-SECTION-GLUE",
    no_lip_sync: "DEX-VID-VOICE-MODE",
    no_f0_fx_echo: "DEX-VID-FX-F0-ECHO",
    av_scene_sfx: "SFX-SCENE-MISMATCH",
    vd_body: "DEX-VID-LIT-SURVIVE",
    duration: "DEX-VID-BEAT-DURATION",
    lit_contact_xor: "DEX-LIT-CONTACT-XOR",
  };
  return hits
    .filter((h) => !h.pass)
    .map((h) => ({
      id: map[h.id] ?? map[h.id.split("_")[0]] ?? "DEX-VID-FIDELITY",
      severity: /av_scene_sfx/.test(h.id) ? ("WARN" as const) : ("BLOCK" as const),
      message: `${h.label}未命中：期望 ${h.expected ?? "—"}，实际 ${h.actual ?? "—"}`,
    }));
}

/** Repair once then score — used as burn gate. */
export function ensureBurnDesignIntentFidelity(
  ctx: ShotCompileContext,
  prompt: string,
): { prompt: string; fidelity: DesignIntentFidelityResult; repairs: string[] } {
  const repaired = repairVideoPromptForDesignIntent(ctx, prompt);
  const fidelity = scoreVideoDesignIntentFidelity(ctx, repaired.prompt);
  return { prompt: repaired.prompt, fidelity, repairs: repaired.repairs };
}

/** Live score track.prompt vs package shot — never trust stale reason.designIntentFidelity alone. */
export function liveDesignIntentFidelityForTrack(input: {
  prompt: string;
  shotMeta?: Record<string, unknown> | null;
  vendorId?: string | null;
  trackId?: number | null;
  storyboardId?: number | null;
}): DesignIntentFidelityResult & {
  virdFindings: Array<{ id: string; severity: "BLOCK" | "WARN"; message: string }>;
} {
  const prompt = String(input.prompt ?? "").trim();
  if (!prompt || !input.shotMeta) {
    return { items: [], pass: true, blockers: [], virdFindings: [] };
  }
  const ctx = hydrateShotCompileContextSync({
    designShot: input.shotMeta as never,
    shotMeta: input.shotMeta,
    seedPrompt: prompt,
    vendorId: input.vendorId ?? null,
    trackId: input.trackId ?? null,
    storyboardId: input.storyboardId ?? null,
    preferStillIntentClass: String(
      (input.shotMeta.generation as { intentClass?: string } | undefined)?.intentClass ?? "",
    ).trim() || null,
  });
  const fidelity = scoreVideoDesignIntentFidelity(ctx, prompt);
  return {
    ...fidelity,
    virdFindings: fidelityHitsToVirdFindings(fidelity.blockers),
  };
}

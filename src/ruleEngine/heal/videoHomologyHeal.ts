/**
 * Video homology heal — import / touch / burn shared until-clear kernel.
 * Strip pseudo dialogue, fix orphan lip, mediate motion, align beat duration.
 */
import {
  stripDurationOnlyDialogueLines,
  isNonLiteraryDialogueKey,
  asDialogueLineObjects,
} from "../design/dialogueCoverage";
import { hasOnCameraDialogue } from "../design/onCameraDialogue";
import { applyViralMotionMediateToPrompt } from "../compilers/viralMotionMediate";
import { diagnoseVideoIntent, applyVideoIntentPatches } from "../design/videoIntentReverse";
import { classifyVideoIntent } from "../compilers/videoIntentPolicy";
import { healAvSceneSfxText, checkAvSceneSfxCoherence } from "../compilers/videoDesignIntentFidelity";

export type VideoHomologyHealResult = {
  changed: boolean;
  cleared: boolean;
  heals: string[];
  shots: Record<string, unknown>[];
  confirmRequired: boolean;
  findings: Array<{ id: string; message: string }>;
};

function stripPseudoFromShot(s: Record<string, unknown>): { shot: Record<string, unknown>; healed: string[] } {
  const healed: string[] = [];
  const narr = { ...((s.narrative as object) ?? {}) } as Record<string, unknown>;
  const dial = (narr.dialogue as { lines?: unknown } | undefined)?.lines ?? narr.lines;
  const cleaned = stripDurationOnlyDialogueLines(dial);
  const before = asDialogueLineObjects(dial);
  if (cleaned.length !== before.length || before.some((l) => isNonLiteraryDialogueKey(String(l.text ?? "")))) {
    narr.dialogue = { type: "dialogue", lines: cleaned };
    narr.lines = cleaned;
    s = { ...s, narrative: narr, lines: cleaned };
    healed.push("strip_pseudo_lines");
  }
  return { shot: s, healed };
}

function healOrphanLip(s: Record<string, unknown>): { shot: Record<string, unknown>; healed: string[] } {
  const healed: string[] = [];
  const narr = { ...((s.narrative as object) ?? {}) } as Record<string, unknown>;
  const lines = (narr.dialogue as { lines?: unknown } | undefined)?.lines ?? narr.lines;
  const literary = asDialogueLineObjects(lines).filter(
    (l) => !isNonLiteraryDialogueKey(String(l.text ?? "")) && String(l.text ?? "").trim(),
  );
  const onCam = hasOnCameraDialogue(literary) && literary.length > 0;
  const vt = String((narr.voiceIntent as { type?: string } | undefined)?.type ?? "").toLowerCase();
  const sd = { ...((s.shotDesign as object) ?? {}) } as Record<string, unknown>;
  const lip = String(sd.lipSyncPolicy ?? "").toLowerCase();
  if (!onCam && (/lip|required|subtle/.test(vt) || /required|subtle|lip/.test(lip))) {
    narr.voiceIntent = { type: "none" };
    sd.lipSyncPolicy = "none";
    s = { ...s, narrative: narr, shotDesign: sd };
    healed.push("orphan_lip_to_none");
  }
  return { shot: s, healed };
}

function healSoundDialogueContradiction(s: Record<string, unknown>): { shot: Record<string, unknown>; healed: string[] } {
  const healed: string[] = [];
  const narr = { ...((s.narrative as object) ?? {}) } as Record<string, unknown>;
  const sound = { ...((narr.sound as object) ?? {}) } as Record<string, unknown>;
  const lines = (narr.dialogue as { lines?: unknown } | undefined)?.lines ?? narr.lines;
  const literary = asDialogueLineObjects(lines).filter(
    (l) => !isNonLiteraryDialogueKey(String(l.text ?? "")) && String(l.text ?? "").trim(),
  );
  const intent = String((s.generation as { intentClass?: string })?.intentClass ?? "").trim();
  const vd = String(
    s.visualDescription ?? (narr as { visualDescription?: string }).visualDescription ?? "",
  ).trim();
  const cls = classifyVideoIntent({
    visualDescription: vd,
    stillIntentClass: intent,
    dialogueLines: literary.map((l) => String(l.text ?? "")),
    shotSize: String((narr as { shotSize?: string }).shotSize ?? s.shotSize ?? ""),
  });
  const silent = intent === "react_silent" || cls.intentClass === "react_silent" || literary.length === 0;
  if (silent && sound.dialogue === true) {
    sound.dialogue = false;
    narr.sound = sound;
    s = { ...s, narrative: narr };
    healed.push("sound_dialogue_false_on_silent");
  }
  return { shot: s, healed };
}

function healAvSceneSfxOnShot(s: Record<string, unknown>): { shot: Record<string, unknown>; healed: string[] } {
  const healed: string[] = [];
  const narr = { ...((s.narrative as object) ?? {}) } as Record<string, unknown>;
  const sound = { ...((narr.sound as object) ?? {}) } as Record<string, unknown>;
  const sceneName = String(
    (narr as { sceneName?: string; avCausality?: string }).sceneName ??
      (narr as { avCausality?: string }).avCausality ??
      (s as { sceneName?: string }).sceneName ??
      "",
  ).trim();
  const sfx = String(sound.sfx ?? "").trim();
  if (!sceneName || !sfx) return { shot: s, healed };
  const aligned = healAvSceneSfxText({ sceneName, sfx, avCausality: sceneName });
  if (aligned.healed) {
    sound.sfx = aligned.sfx;
    narr.sound = sound;
    s = { ...s, narrative: narr };
    healed.push("heal_av_scene_sfx");
  } else if (!checkAvSceneSfxCoherence({ sceneName, sfx }).ok) {
    healed.push("av_scene_sfx_warn");
  }
  return { shot: s, healed };
}

/** Soft-heal video design shots until diagnose passes or Confirm needed. */
export function softHealVideoHomologyOnShots(input: {
  shots: Record<string, unknown>[];
  vendorId?: string | null;
}): VideoHomologyHealResult {
  let shots = input.shots.map((s) => ({ ...s }));
  const heals: string[] = [];
  let changed = false;

  shots = shots.map((s) => {
    let cur = s;
    const a = stripPseudoFromShot(cur);
    cur = a.shot;
    heals.push(...a.healed);
    const b = healOrphanLip(cur);
    cur = b.shot;
    heals.push(...b.healed);
    const c = healSoundDialogueContradiction(cur);
    cur = c.shot;
    heals.push(...c.healed);
    const d = healAvSceneSfxOnShot(cur);
    cur = d.shot;
    heals.push(...d.healed);
    return cur;
  });
  if (heals.length) changed = true;

  const diagnosed = diagnoseVideoIntent({ shots });
  if (diagnosed.patches.length) {
    const applied = applyVideoIntentPatches({
      shots,
      patches: diagnosed.patches.filter(
        (p) =>
          ["strip_pseudo_lines", "set_voice_none", "set_beat_duration", "set_video_intent"].includes(p.op) ||
          (p.op === "append_motion_verb" && Number(p.confidence ?? 0) >= 0.75),
      ),
    });
    shots = applied.shots;
    if (applied.applied.length) {
      changed = true;
      heals.push(...applied.applied.map((id) => `ird:${id}`));
    }
  }

  // Mediate generation videoPrompt motion if present
  shots = shots.map((s) => {
    const gen = { ...((s.generation as object) ?? {}) } as Record<string, unknown>;
    const vp = String(gen.videoPrompt ?? "");
    if (!vp) return s;
    const med = applyViralMotionMediateToPrompt({ prompt: vp, vendorId: input.vendorId });
    if (med.confirmRequired) return s;
    if (med.changes.length) {
      gen.videoPrompt = med.prompt;
      heals.push(...med.changes.map((c) => `mediate:${c}`));
      changed = true;
      return { ...s, generation: gen };
    }
    return s;
  });

  const again = diagnoseVideoIntent({ shots });
  // Only Confirm when still open after high-conf auto append_motion_verb
  const confirmOnly = again.findings.filter((f) =>
    ["DEX-VID-MOTION-VERB", "DEX-VID-CAM-MEDIATE", "VID-CONTACT-BEATS"].includes(f.id),
  );

  return {
    changed,
    cleared: again.ok,
    heals: [...new Set(heals)],
    shots,
    confirmRequired: !again.ok && confirmOnly.length === again.findings.filter((f) => f.severity === "BLOCK").length
      ? confirmOnly.length > 0
      : !again.ok,
    findings: again.findings.map((f) => ({ id: f.id, message: f.message })),
  };
}

/** Strip colon-soup / duration tokens from five-section Audio body. */
export function stripPseudoDialogueFromVideoPrompt(prompt: string): { prompt: string; changed: boolean } {
  let changed = false;
  const next = String(prompt ?? "").replace(/\[Audio\]\s*([\s\S]*?)(?=\n\[|$)/i, (_m, body: string) => {
    let b = String(body);
    const before = b;
    // Quoted duration / colon soup lines
    b = b
      .split(/\n/)
      .filter((line) => {
        const t = line.replace(/^["「]|["」]$/g, "").trim();
        if (!t) return true;
        if (isNonLiteraryDialogueKey(t)) return false;
        if (/^[:：\s.\-_·•]*\d+(\.\d+)?\s*s$/i.test(t)) return false;
        return true;
      })
      .join("\n");
    // Drop lip sync when no literary dialogue remains
    const hasLit =
      /[\u4e00-\u9fffA-Za-z]{2,}/.test(b) &&
      !/无对白|无台词|ambient/i.test(b) &&
      !isNonLiteraryDialogueKey(b.replace(/\n/g, ""));
    if (!hasLit) {
      b = b.replace(/口型同步开启。?/g, "").trim();
      if (!/无对白/.test(b)) b = `无对白。仅环境音效。\n${b}`.trim();
    }
    if (b !== before) changed = true;
    return `[Audio]\n${b.trim()}`;
  });
  return { prompt: next, changed };
}

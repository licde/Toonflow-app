/**
 * Walk implementationPlan → SB generation slots (design_field_registry driven gaps).
 */
import { buildExtractContext, extractDesignFields, loadDesignFieldRegistry } from "../design/designFieldRegistry";
import type { ScriptBundle } from "./types";

export interface FieldWalkGap {
  id: string;
  severity: "BLOCK" | "WARN";
  message: string;
  field?: string;
  shotIndex?: number;
  sceneRef?: number;
  fieldId?: string;
  repairHintId?: string;
}

export interface MissingFieldRow {
  id: string;
  severity: "BLOCK" | "WARN";
  message: string;
  sceneRef?: number;
  shotIndex?: number;
  sourcePath: string;
  targetPath: string;
  fieldId?: string;
  repairHintId?: string;
}

type ImplItem = {
  sceneRef?: number;
  fxIntent?: { level?: string };
  voiceIntent?: { speaker?: string };
  avCausality?: { audioBeat?: string; visualPeak?: string };
  promptAnchors?: { img?: string[]; vid?: string[]; aud?: string[]; fx?: string[] };
};

type WalkShot = {
  shotIndex?: number;
  sceneRef?: number;
  sceneName?: string;
  duration?: number;
  visualEffect?: string;
  fxFeasibility?: string;
  charCodes?: string[];
  generation?: { imagePrompt?: string; videoPrompt?: string; audioPrompt?: string; fxPrompt?: string };
  narrative?: {
    dialogue?: { lines?: { speaker?: string; text?: string; splitHint?: string; reactionAction?: string; functions?: string[] }[] };
    emotionIntensity?: number;
    lipSyncPolicy?: string;
  };
  shotDesign?: { lipSyncPolicy?: string };
};

const SLOT_MAP = {
  img: { slot: "imagePrompt", id: "DFW-IMG", repair: "RH-MOD-07", label: "imagePrompt" },
  vid: { slot: "videoPrompt", id: "DFW-VID", repair: "RH-MOD-07", label: "videoPrompt" },
  aud: { slot: "audioPrompt", id: "MOD-03", repair: "RH-MOD-03", label: "audioPrompt" },
  fx: { slot: "fxPrompt", id: "MOD-02", repair: "RH-MOD-02", label: "fxPrompt" },
} as const;

const FIELD_REPAIR: Record<string, string> = {
  dialogue: "RH-MOD-03",
  lipSync: "RH-QP-15",
  fx: "RH-MOD-02",
  voice: "RH-MOD-04",
  duration: "RH-PR-09",
  emotion: "RH-QP-06",
};

function isFxProse(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return !/^F[0-5]$/i.test(t);
}

/** Map implementationPlan sceneRef (1-based scene order) → shots sharing that sceneName. */
function shotsForSceneRef(shots: WalkShot[], ref: number): WalkShot[] {
  const explicit = shots.filter((s) => s.sceneRef === ref);
  if (explicit.length) return explicit;

  const order: string[] = [];
  const byName = new Map<string, WalkShot[]>();
  for (const s of shots) {
    const name = String(s.sceneName ?? "").trim() || `__idx_${s.shotIndex ?? order.length + 1}`;
    if (!byName.has(name)) {
      byName.set(name, []);
      order.push(name);
    }
    byName.get(name)!.push(s);
  }
  const name = order[ref - 1];
  if (name) return byName.get(name) ?? [];

  // Legacy fallback: shotIndex === sceneRef (uneven multi-shot packs)
  return shots.filter((s) => s.shotIndex === ref);
}

function hasDialogue(shot: WalkShot): boolean {
  const lines = shot.narrative?.dialogue?.lines ?? [];
  return lines.some((l) => (l.text ?? "").trim().length > 0);
}

function genSlot(shot: WalkShot, slot: keyof typeof SLOT_MAP): string {
  const gen = shot.generation ?? {};
  return String(gen[SLOT_MAP[slot].slot as keyof typeof gen] ?? "").trim();
}

function pushGap(
  gaps: FieldWalkGap[],
  rows: MissingFieldRow[],
  gap: FieldWalkGap & { sourcePath: string; targetPath: string },
) {
  gaps.push({
    id: gap.id,
    severity: gap.severity,
    message: gap.message,
    field: gap.field,
    shotIndex: gap.shotIndex,
    sceneRef: gap.sceneRef,
    fieldId: gap.fieldId,
    repairHintId: gap.repairHintId,
  });
  rows.push({
    id: gap.id,
    severity: gap.severity,
    message: gap.message,
    sceneRef: gap.sceneRef,
    shotIndex: gap.shotIndex,
    sourcePath: gap.sourcePath,
    targetPath: gap.targetPath,
    fieldId: gap.fieldId,
    repairHintId: gap.repairHintId,
  });
}

function auditImplPlanSlots(
  bundle: ScriptBundle,
  shots: WalkShot[],
  gaps: FieldWalkGap[],
  rows: MissingFieldRow[],
) {
  const plan = (bundle.planData as { narrativeBrief?: { implementationPlan?: ImplItem[] } })?.narrativeBrief ?? {};
  const impl = (plan.implementationPlan ?? []) as ImplItem[];
  if (!impl.length) return;

  for (const item of impl) {
    const ref = item.sceneRef;
    if (ref == null) continue;
    const sceneShots = shotsForSceneRef(shots, ref);
    if (!sceneShots.length) {
      pushGap(gaps, rows, {
        id: "DFW-IMPL-SHOT",
        severity: "WARN",
        message: `implementationPlan sceneRef ${ref} 无对应分镜`,
        field: "implementationPlan",
        sceneRef: ref,
        sourcePath: `planData.narrativeBrief.implementationPlan[sceneRef=${ref}]`,
        targetPath: `preDesignPack.shots[]`,
      });
      continue;
    }

    const anchors = item.promptAnchors ?? {};
    for (const key of ["img", "vid"] as const) {
      if (!(anchors[key]?.length)) continue;
      const anyFilled = sceneShots.some((s) => genSlot(s, key).length > 0);
      if (!anyFilled) {
        pushGap(gaps, rows, {
          id: SLOT_MAP[key].id,
          severity: "BLOCK",
          message: `场${ref} promptAnchors.${key} 有锚点但分镜缺 ${SLOT_MAP[key].label}`,
          field: `shots[].generation.${SLOT_MAP[key].slot}`,
          sceneRef: ref,
          sourcePath: `implementationPlan[sceneRef=${ref}].promptAnchors.${key}`,
          targetPath: `shots[].generation.${SLOT_MAP[key].slot}`,
          fieldId: key === "img" ? "composition" : "camera",
          repairHintId: SLOT_MAP[key].repair,
        });
      }
    }

    const needsAud = Boolean(item.avCausality?.audioBeat || item.voiceIntent?.speaker);
    if (needsAud && (anchors.aud?.length || item.voiceIntent)) {
      for (const s of sceneShots.filter(hasDialogue)) {
        if (!genSlot(s, "aud")) {
          pushGap(gaps, rows, {
            id: "MOD-03",
            severity: "BLOCK",
            message: `镜${s.shotIndex ?? "?"} 有台词/声画意图但缺 audioPrompt`,
            field: `shots[].generation.audioPrompt`,
            shotIndex: s.shotIndex,
            sceneRef: ref,
            sourcePath: `implementationPlan[sceneRef=${ref}].avCausality.audioBeat`,
            targetPath: `shots[${s.shotIndex ?? "?"}].generation.audioPrompt`,
            fieldId: "dialogue",
            repairHintId: "RH-MOD-03",
          });
        }
      }
    }

    const fxLevel = item.fxIntent?.level ?? "F0";
    if (fxLevel !== "F0" && fxLevel !== "NONE") {
      if (sceneShots.length === 0) {
        pushGap(gaps, rows, {
          id: "MOD-02",
          severity: "BLOCK",
          message: `【孤儿场】sceneRef=${ref} fxIntent ${fxLevel} 无映射镜（唯一 sceneName 序无第 ${ref} 场）— 删除 plan 项或 fxIntent→F0，或接场独立 sceneName 并挂镜；禁止只给其他场补 fxPrompt`,
          field: "implementationPlan.fxIntent",
          sceneRef: ref,
          sourcePath: `implementationPlan[sceneRef=${ref}].fxIntent.level`,
          targetPath: `planData.narrativeBrief.implementationPlan[sceneRef=${ref}]`,
          fieldId: "fx",
          repairHintId: "RH-MOD-02-ORPHAN",
        });
      } else {
        // MOD-02: require executable generation.fxPrompt (letter-grade stub does not count).
        const anyFxProse = sceneShots.some((s) => isFxProse(genSlot(s, "fx")));
        if (!anyFxProse) {
          const idxs = sceneShots.map((s) => s.shotIndex).filter((n) => n != null).slice(0, 6);
          pushGap(gaps, rows, {
            id: "MOD-02",
            severity: "BLOCK",
            message: `场${ref} fxIntent ${fxLevel} 但映射镜 ${idxs.join(",") || "?"} 无 generation.fxPrompt 散文 — 写 shots[shotIndex].generation.fxPrompt 或 fxIntent→F0（禁字母 F1–F5）`,
            field: "generation.fxPrompt",
            sceneRef: ref,
            sourcePath: `implementationPlan[sceneRef=${ref}].fxIntent.level`,
            targetPath: `shots[].generation.fxPrompt`,
            fieldId: "fx",
            repairHintId: "RH-MOD-02",
          });
        }
      }
    }
  }
}

function auditRegistryPerShot(shots: WalkShot[], gaps: FieldWalkGap[], rows: MissingFieldRow[]) {
  const registry = loadDesignFieldRegistry();
  for (const shot of shots) {
    const idx = shot.shotIndex;
    const ctx = buildExtractContext({
      modality: "video",
      mode: "text",
      charCodes: shot.charCodes,
      episodeShot: {
        id: `shot-${idx ?? 0}`,
        storyboardId: idx ?? 0,
        index: (idx ?? 1) - 1,
        narrative: {
          type: "CHAR-SCENE",
          sceneName: shot.sceneName,
          duration: shot.duration,
          emotionIntensity: shot.narrative?.emotionIntensity,
          dialogue: shot.narrative?.dialogue,
          lipSyncPolicy: shot.narrative?.lipSyncPolicy ?? shot.shotDesign?.lipSyncPolicy,
        },
        generation: shot.generation ?? {},
      },
    });
    const fields = extractDesignFields(ctx);
    const dialogue = hasDialogue(shot);

    for (const reg of registry) {
      const rw = reg.requiredWhen ?? "hasValue";
      if (rw === "alwaysOptional") continue;

      let required = false;
      if (rw === "hasDialogue") required = dialogue;
      else if (rw === "charOrSingleImage") required = (shot.charCodes ?? []).some((c) => /^CHAR-/i.test(c));
      else if (rw === "hasValue") {
        const val = (fields as Record<string, unknown>)[reg.id];
        required = val != null && val !== "" && val !== false;
      }
      if (!required) continue;

      const gen = shot.generation ?? {};
      const slotChecks: { fieldId: string; genKey: keyof typeof gen; label: string }[] = [
        { fieldId: "dialogue", genKey: "audioPrompt", label: "audioPrompt" },
        { fieldId: "fx", genKey: "fxPrompt", label: "fxPrompt" },
      ];
      for (const sc of slotChecks) {
        if (reg.id !== sc.fieldId && !reg.sources?.some((s) => s.includes(sc.label))) continue;
        if (!String(gen[sc.genKey] ?? "").trim() && required) {
          const gapId = sc.fieldId === "fx" ? "MOD-02" : "MOD-03";
          if (gaps.some((g) => g.id === gapId && g.shotIndex === idx)) continue;
          pushGap(gaps, rows, {
            id: gapId,
            severity: "WARN",
            message: `镜${idx ?? "?"} registry.${reg.id} 要求 ${sc.label} 但 generation 槽空`,
            field: `shots[].generation.${sc.label}`,
            shotIndex: idx,
            sourcePath: `design_field_registry.${reg.id}`,
            targetPath: `shots[${idx ?? "?"}].generation.${sc.label}`,
            fieldId: reg.id,
            repairHintId: FIELD_REPAIR[reg.id] ?? FIELD_REPAIR[sc.fieldId],
          });
        }
      }
    }

    if (dialogue) {
      const minDur = Math.ceil(
        (shot.narrative?.dialogue?.lines ?? []).reduce((n, l) => n + (l.text?.length ?? 0), 0) / 4,
      );
      if ((shot.duration ?? 0) < minDur && minDur > 0) {
        pushGap(gaps, rows, {
          id: "DFW-DURATION",
          severity: "WARN",
          message: `镜${idx ?? "?"} duration ${shot.duration}s < 台词朗读约 ${minDur}s`,
          field: `shots[].duration`,
          shotIndex: idx,
          sourcePath: `shots[${idx ?? "?"}].narrative.dialogue`,
          targetPath: `shots[${idx ?? "?"}].duration`,
          fieldId: "duration",
          repairHintId: "RH-PR-09",
        });
      }
    }
  }
}

/** Registry-driven walk: implementationPlan → shots[].generation 四槽 + per-shot gaps. */
export function auditImplementationFieldWalk(bundle: ScriptBundle): FieldWalkGap[] {
  const { rows } = buildMissingFieldReport(bundle);
  return rows.map((r) => ({
    id: r.id,
    severity: r.severity,
    message: r.message,
    field: r.targetPath,
    shotIndex: r.shotIndex,
    sceneRef: r.sceneRef,
    fieldId: r.fieldId,
    repairHintId: r.repairHintId,
  }));
}

/** Structured missing-field table for export gate / Chat one-copy repair. */
export function buildMissingFieldReport(bundle: ScriptBundle): { rows: MissingFieldRow[]; summary: string } {
  const gaps: FieldWalkGap[] = [];
  const rows: MissingFieldRow[] = [];
  const shots = (bundle.preDesignPack?.shots ?? []) as WalkShot[];

  auditImplPlanSlots(bundle, shots, gaps, rows);
  auditRegistryPerShot(shots, gaps, rows);

  const dedup = new Map<string, MissingFieldRow>();
  for (const r of rows) {
    const k = `${r.id}:${r.shotIndex ?? ""}:${r.sceneRef ?? ""}:${r.targetPath}`;
    if (!dedup.has(k)) dedup.set(k, r);
  }
  const unique = [...dedup.values()];

  const lines = unique.slice(0, 20).map((r) => {
    const loc = r.shotIndex != null ? `镜${r.shotIndex}` : r.sceneRef != null ? `场${r.sceneRef}` : "bundle";
    return `- ${loc} → ${r.targetPath} (${r.id})：${r.message}`;
  });
  const summary =
    unique.length === 0
      ? "（无 implementationPlan→generation 缺口）"
      : `缺失字段 ${unique.length} 项：\n${lines.join("\n")}${unique.length > 20 ? `\n…另有 ${unique.length - 20} 项` : ""}`;

  return { rows: unique, summary };
}

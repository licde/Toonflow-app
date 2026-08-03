/**
 * Human rejudge feedback → adapt orchestrator seed for next compile round.
 */
export type AdaptFeedbackKind =
  | "motion_mismatch"
  | "emotion_cliff"
  | "sfx_overload"
  | "face_unreadability"
  | "shot_size_too_wide"
  | "realization_adapt_ok";

export type AdaptFeedbackEntry = {
  kind: AdaptFeedbackKind;
  shotIndex?: number | null;
  note?: string;
  at: string;
};

export function parseAdaptFeedbackFromMeta(meta?: Record<string, unknown> | null): AdaptFeedbackEntry[] {
  const raw = meta?.adaptFeedback;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) => {
      const o = e as { kind?: string; shotIndex?: number; note?: string; at?: string };
      if (!o.kind) return null;
      return {
        kind: o.kind as AdaptFeedbackKind,
        shotIndex: o.shotIndex ?? null,
        note: o.note,
        at: o.at ?? "",
      };
    })
    .filter(Boolean) as AdaptFeedbackEntry[];
}

export function mergeAdaptFeedback(
  existing: AdaptFeedbackEntry[] | undefined,
  entry: Omit<AdaptFeedbackEntry, "at"> & { at?: string },
): AdaptFeedbackEntry[] {
  const next: AdaptFeedbackEntry = {
    ...entry,
    at: entry.at ?? new Date().toISOString(),
  };
  const list = [...(existing ?? [])];
  const dup = list.findIndex((e) => e.kind === next.kind && e.shotIndex === next.shotIndex);
  if (dup >= 0) list[dup] = next;
  else list.push(next);
  return list.slice(-12);
}

/** Map human rejudge items to adapt feedback kinds. */
export function adaptFeedbackFromHumanRejudge(input: {
  items?: Array<{ id: string; pass: boolean; evidence?: string }>;
  shotIndex?: number | null;
}): AdaptFeedbackEntry[] {
  const out: AdaptFeedbackEntry[] = [];
  const at = new Date().toISOString();
  for (const it of input.items ?? []) {
    if (it.pass) continue;
    if (/face|面容|抬脸|低头|景别|近景|dialogue_near/.test(it.id + (it.evidence ?? ""))) {
      out.push({
        kind: /景别|wide|过宽|MS|中景/.test(it.id + (it.evidence ?? ""))
          ? "shot_size_too_wide"
          : "face_unreadability",
        shotIndex: input.shotIndex,
        note: it.evidence,
        at,
      });
    } else if (/motion|pose|realization|弯腰|跪/.test(it.id + (it.evidence ?? ""))) {
      out.push({ kind: "motion_mismatch", shotIndex: input.shotIndex, note: it.evidence, at });
    } else if (/emotion|情绪/.test(it.id + (it.evidence ?? ""))) {
      out.push({ kind: "emotion_cliff", shotIndex: input.shotIndex, note: it.evidence, at });
    } else if (/sfx|音效|摩擦/.test(it.id + (it.evidence ?? ""))) {
      out.push({ kind: "sfx_overload", shotIndex: input.shotIndex, note: it.evidence, at });
    }
  }
  return out;
}

export function adaptFeedbackPersistSlice(entries: AdaptFeedbackEntry[]): Record<string, unknown> {
  return { adaptFeedback: entries };
}

/** Map human rejudge → design vs realization owner (Wave-2). */
export function rejudgeOwnerForFeedback(kind: AdaptFeedbackKind): "design" | "realization" {
  if (kind === "face_unreadability" || kind === "shot_size_too_wide") return "design";
  return "realization";
}

/** Apply feedback seed to orchestrator polish hints (non-destructive). */
export function applyAdaptFeedbackToPack(
  pack: import("../compilers/realizationAdapt").RealizationAdaptPack,
  feedback: AdaptFeedbackEntry[],
): import("../compilers/realizationAdapt").RealizationAdaptPack {
  const relevant = feedback.filter((f) => f.kind !== "realization_adapt_ok");
  if (!relevant.length) return pack;
  const next = { ...pack, sources: [...pack.sources] };
  for (const f of relevant) {
    if (f.kind === "motion_mismatch") {
      next.motionStartHint = `${next.motionStartHint}；人审：强化首帧同源`.trim();
      next.sources.push("adaptFeedback.motion_mismatch");
    }
    if (f.kind === "emotion_cliff" && !next.performanceBoost) {
      next.performanceBoost = "情绪递进";
      next.sources.push("adaptFeedback.emotion_cliff");
    }
    if (f.kind === "sfx_overload") {
      next.sfxBeat = undefined;
      next.sources.push("adaptFeedback.sfx_overload");
    }
    if (f.kind === "face_unreadability") {
      next.motionStartHint = `${next.motionStartHint ?? ""}；人审：末相抬脸口型可读`.trim();
      next.sources.push("adaptFeedback.face_unreadability");
      next.sources.push("adaptFeedback.escalate_design_repair");
    }
    if (f.kind === "shot_size_too_wide") {
      // Realization hint only — design near-promote via smart repair (do not fake SSOT)
      next.cameraPolicy = next.cameraPolicy ?? "静止";
      next.sources.push("adaptFeedback.shot_size_too_wide");
      next.sources.push("adaptFeedback.escalate_design_near_promote");
    }
  }
  return next;
}

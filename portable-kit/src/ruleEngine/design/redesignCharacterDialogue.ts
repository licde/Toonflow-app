/**
 * Design-time dialogue redesign: fill / rewrite weak / delete dead lines (POV).
 * Respects literaryLocked, nameMap, voiceProfile.
 */
import { assertMayRewriteLiterary, hasAudienceMeta, stripTechParentheticals } from "./viralDoctrine";

export type DialogueLine = {
  lineId?: string;
  speaker?: string;
  text?: string;
  functions?: string[];
  causedByActionId?: string;
  splitHint?: string;
  reactionAction?: string;
  /** heal 占位 RA 来源；Chat 手写可省略或标 chat */
  raSource?: "heal_placeholder" | "chat" | string;
  kind?: "dialogue" | "os" | "monologue";
};

export type RedesignChange = {
  op: "fill" | "rewrite" | "delete" | "strip_meta" | "strip_paren";
  lineId?: string;
  before?: string;
  after?: string;
  reason: string;
};

export type RedesignResult = {
  ok: boolean;
  blocked?: string;
  lines: DialogueLine[];
  changes: RedesignChange[];
};

function getNameMap(plan: Record<string, unknown>): Record<string, string> {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  const maps =
    (pd.adaptationMatrixStructured as { deepAdaptation?: { nameMap?: { from?: string; to?: string }[] } })
      ?.deepAdaptation?.nameMap ?? [];
  const out: Record<string, string> = {};
  for (const m of maps) {
    if (m.from && m.to) out[m.from] = m.to;
  }
  return out;
}

function applyNameMap(text: string, map: Record<string, string>): string {
  let t = text;
  for (const [from, to] of Object.entries(map)) {
    if (from && to && from !== to) t = t.split(from).join(to);
  }
  return t;
}

function voiceProfiles(plan: Record<string, unknown>): Record<string, { tone?: string; catchphrase?: string }> {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  return (pd.voiceProfiles as Record<string, { tone?: string; catchphrase?: string }>) ?? {};
}

function readLines(plan: Record<string, unknown>): { lines: DialogueLine[]; path: "dialoguePlan" | "narrativeBrief" } {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  const dp = pd.dialoguePlan as { lines?: DialogueLine[] } | undefined;
  if (dp?.lines) return { lines: [...dp.lines], path: "dialoguePlan" };
  const nb = pd.narrativeBrief as { dialoguePlan?: { lines?: DialogueLine[] } } | undefined;
  if (nb?.dialoguePlan?.lines) return { lines: [...nb.dialoguePlan.lines], path: "narrativeBrief" };
  return { lines: [], path: "dialoguePlan" };
}

function writeLines(plan: Record<string, unknown>, lines: DialogueLine[], path: "dialoguePlan" | "narrativeBrief"): void {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  if (path === "narrativeBrief") {
    const nb = (pd.narrativeBrief as Record<string, unknown>) ?? {};
    nb.dialoguePlan = { ...(nb.dialoguePlan as object), lines };
    pd.narrativeBrief = nb;
  } else {
    pd.dialoguePlan = { ...((pd.dialoguePlan as object) ?? {}), lines };
  }
  plan.planData = pd;
}

/** Hoist shot dialogue into dialoguePlan when plan empty — import/design heal needs plan SSOT. */
export function hoistShotDialogueToPlan(plan: Record<string, unknown>): number {
  const { lines: existing } = readLines(plan);
  if (existing.length) return 0;
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  const shots =
    ((pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ??
      (plan as { preDesignPack?: { shots?: Record<string, unknown>[] } }).preDesignPack?.shots ??
      []) as Record<string, unknown>[];
  const collected: DialogueLine[] = [];
  const seen = new Set<string>();
  for (const s of shots) {
    const raw =
      ((s.narrative as { dialogue?: { lines?: DialogueLine[] } } | undefined)?.dialogue?.lines ?? []) as DialogueLine[];
    for (const l of raw) {
      const id = String(l.lineId ?? `${s.shotIndex}-${String(l.text ?? "").slice(0, 8)}`);
      if (seen.has(id)) continue;
      seen.add(id);
      collected.push({ ...l, lineId: l.lineId ?? id });
    }
  }
  if (!collected.length) return 0;
  writeLines(plan, collected, "dialoguePlan");
  return collected.length;
}

/** Patch emotion_hit lines on shots with placeholder RA (import heal when plan missing). */
export function healShotNar15Placeholders(plan: Record<string, unknown>): number {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? {};
  const root = (plan as { preDesignPack?: { shots?: Record<string, unknown>[] } }).preDesignPack;
  const shots = pack.shots ?? root?.shots ?? [];
  let n = 0;
  const next = shots.map((s) => {
    const narr = { ...((s.narrative as object) ?? {}) } as { dialogue?: { lines?: DialogueLine[] } };
    const lines = [...(narr.dialogue?.lines ?? [])];
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]!;
      if (!(l.functions ?? []).includes("emotion_hit")) continue;
      if (String(l.reactionAction ?? "").trim()) continue;
      lines[i] = { ...l, reactionAction: "听者微怔", raSource: l.raSource || "heal_placeholder" };
      changed = true;
      n++;
    }
    if (!changed) return s;
    return { ...s, narrative: { ...narr, dialogue: { lines } } };
  });
  if (n) {
    if (pack.shots) {
      pack.shots = next;
      pd.preDesignPack = pack;
      plan.planData = pd;
    }
    if (root?.shots) {
      root.shots = next;
      (plan as { preDesignPack: { shots: Record<string, unknown>[] } }).preDesignPack = root;
    }
  }
  return n;
}

function isWeak(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 2) return true;
  if (hasAudienceMeta(t)) return true;
  if (/^(嗯|啊|哦|……|\.\.\.|好的|是吗)$/.test(t)) return true;
  return false;
}

function needsEmotionHitReaction(line: DialogueLine): boolean {
  return (line.functions ?? []).includes("emotion_hit") && !line.reactionAction;
}

/**
 * Redesign dialogue for viral design stage.
 * opts.fill: missing peak speakers → add POV lines; rewrite weak; strip meta/parens.
 * opts.allowPlaceholderRaWhenLocked: under literaryLocked, only invent placeholder RA (no text rewrite).
 */
export function redesignCharacterDialogue(
  plan: Record<string, unknown>,
  opts?: {
    fillForPeaks?: { peakId: string; speaker: string; emotion?: string; eventBeat?: string }[];
    deleteDead?: boolean;
    allowPlaceholderRaWhenLocked?: boolean;
  },
): RedesignResult {
  const lock = assertMayRewriteLiterary(plan);
  const lockedMetaOnly = !lock.ok && opts?.allowPlaceholderRaWhenLocked === true;
  if (!lock.ok && !lockedMetaOnly) {
    return { ok: false, blocked: lock.reason, lines: [], changes: [] };
  }

  const hoisted = hoistShotDialogueToPlan(plan);
  const shotRa = healShotNar15Placeholders(plan);

  const { lines: raw, path } = readLines(plan);
  const map = getNameMap(plan);
  const voices = voiceProfiles(plan);
  const changes: RedesignChange[] = [];
  if (hoisted) {
    changes.push({ op: "fill", reason: `hoist_shot_dialogue_to_plan:${hoisted}` });
  }
  if (shotRa) {
    changes.push({ op: "rewrite", reason: `heal_shot_nar15_placeholder:${shotRa}` });
  }
  let lines = raw.map((l, i) => ({
    ...l,
    lineId: l.lineId || `L${i + 1}`,
    text: lockedMetaOnly ? String(l.text ?? "") : applyNameMap(String(l.text ?? ""), map),
  }));

  // Locked: metadata-only path — invent placeholder RA, leave literary text untouched
  if (lockedMetaOnly) {
    lines = lines.map((l) => {
      if (!needsEmotionHitReaction(l)) return l;
      const ra = "听者微怔";
      changes.push({
        op: "rewrite",
        lineId: l.lineId,
        before: String(l.text ?? ""),
        after: String(l.text ?? ""),
        reason: "literaryLocked：仅补占位 RA（raSource=heal_placeholder，不改正文）",
      });
      return { ...l, reactionAction: ra, raSource: l.raSource || "heal_placeholder" };
    });
    writeLines(plan, lines, path);
    return { ok: true, lines, changes };
  }

  // Strip tech parentheticals + audience meta
  lines = lines.map((l) => {
    let text = String(l.text ?? "");
    const before = text;
    if (hasAudienceMeta(text)) {
      text = text.replace(/观众感到[^，。；]*/g, "").replace(/观众觉得[^，。；]*/g, "").trim();
      if (!text) text = `${l.speaker || "角色"}：这件事我咽不下去。`;
      changes.push({ op: "strip_meta", lineId: l.lineId, before, after: text, reason: "禁观众元叙述→角色直说" });
    }
    const stripped = stripTechParentheticals(text);
    if (stripped.stripped.length) {
      changes.push({
        op: "strip_paren",
        lineId: l.lineId,
        before: text,
        after: stripped.text,
        reason: "正文技术括注剥离→sidecar",
      });
      text = stripped.text;
    }
    return { ...l, text };
  });

  // NAR-15: high-confidence placeholder RA (tagged)
  lines = lines.map((l) => {
    if (!needsEmotionHitReaction(l)) return l;
    const ra = "听者微怔";
    changes.push({
      op: "rewrite",
      lineId: l.lineId,
      before: String(l.text ?? ""),
      after: String(l.text ?? ""),
      reason: "emotion_hit 缺 reactionAction→占位 RA（raSource=heal_placeholder）",
    });
    return { ...l, reactionAction: ra, raSource: l.raSource || "heal_placeholder" };
  });

  // Rewrite weak lines (text only); may attach RA when emotion_hit
  lines = lines.map((l) => {
    const text = String(l.text ?? "");
    if (!isWeak(text)) return l;
    const vp = voices[l.speaker || ""] || {};
    const after =
      vp.catchphrase ||
      `${l.speaker || "角色"}，${(l.functions ?? []).includes("emotion_hit") ? "我受够了——你给我说清楚。" : "把话说清楚：到底怎么回事。"}`;
    changes.push({
      op: "rewrite",
      lineId: l.lineId,
      before: text,
      after,
      reason: "弱线重写为直白 POV",
    });
    const needRa = (l.functions ?? []).includes("emotion_hit") && !l.reactionAction;
    return {
      ...l,
      text: after,
      reactionAction: l.reactionAction || (needRa ? "握拳/逼视" : l.reactionAction),
      raSource: needRa ? l.raSource || "heal_placeholder" : l.raSource,
      functions: l.functions?.length ? l.functions : ["advance_plot"],
      causedByActionId: l.causedByActionId || "beat_prev",
    };
  });

  // Delete dead (optional empty after strip)
  if (opts?.deleteDead !== false) {
    const kept: DialogueLine[] = [];
    for (const l of lines) {
      if (!String(l.text ?? "").trim()) {
        changes.push({ op: "delete", lineId: l.lineId, before: l.text, reason: "废线删除" });
        continue;
      }
      kept.push(l);
    }
    lines = kept;
  }

  // Fill missing for peaks
  for (const f of opts?.fillForPeaks ?? []) {
    const exists = lines.some(
      (l) => l.speaker === f.speaker && String(l.text ?? "").includes(f.eventBeat?.slice(0, 4) || "@@"),
    );
    if (exists) continue;
    const lineId = `FILL_${f.peakId}`;
    const text = `${f.speaker}：${f.eventBeat || "事情到这一步，我必须说清楚。"}（${f.emotion || "压住怒火"}）`.replace(
      /（[^）]+）$/,
      "",
    );
    const clean = `${f.speaker}：${f.eventBeat || "事情到这一步，我必须说清楚。"}`;
    lines.push({
      lineId,
      speaker: f.speaker,
      text: applyNameMap(clean, map),
      kind: "dialogue",
      functions: ["emotion_hit", "advance_plot"],
      causedByActionId: f.peakId,
      reactionAction: "逼视",
      raSource: "heal_placeholder",
    });
    changes.push({ op: "fill", lineId, after: clean, reason: `peak ${f.peakId} 缺对白→补 POV` });
  }

  writeLines(plan, lines, path);
  return { ok: true, lines, changes };
}

export function countUsefulInfoHints(lines: DialogueLine[]): number {
  return lines.filter((l) => {
    const fn = l.functions ?? [];
    return fn.includes("reveal_info") || fn.includes("emotion_hit") || fn.includes("advance_plot");
  }).length;
}

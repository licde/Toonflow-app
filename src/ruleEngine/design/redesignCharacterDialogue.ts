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
 */
export function redesignCharacterDialogue(
  plan: Record<string, unknown>,
  opts?: {
    fillForPeaks?: { peakId: string; speaker: string; emotion?: string; eventBeat?: string }[];
    deleteDead?: boolean;
  },
): RedesignResult {
  const lock = assertMayRewriteLiterary(plan);
  if (!lock.ok) return { ok: false, blocked: lock.reason, lines: [], changes: [] };

  const { lines: raw, path } = readLines(plan);
  const map = getNameMap(plan);
  const voices = voiceProfiles(plan);
  const changes: RedesignChange[] = [];
  let lines = raw.map((l, i) => ({
    ...l,
    lineId: l.lineId || `L${i + 1}`,
    text: applyNameMap(String(l.text ?? ""), map),
  }));

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

  // Rewrite weak
  lines = lines.map((l) => {
    const text = String(l.text ?? "");
    if (!isWeak(text) && !needsEmotionHitReaction(l)) return l;
    const vp = voices[l.speaker || ""] || {};
    const after =
      vp.catchphrase ||
      `${l.speaker || "角色"}，${(l.functions ?? []).includes("emotion_hit") ? "我受够了——你给我说清楚。" : "把话说清楚：到底怎么回事。"}`;
    changes.push({
      op: "rewrite",
      lineId: l.lineId,
      before: text,
      after,
      reason: needsEmotionHitReaction(l) ? "emotion_hit 缺反应→补角色 POV" : "弱线重写为直白 POV",
    });
    return {
      ...l,
      text: after,
      reactionAction: l.reactionAction || ((l.functions ?? []).includes("emotion_hit") ? "握拳/逼视" : l.reactionAction),
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

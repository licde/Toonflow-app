/**
 * Extract audiovisual peaks + hook plan from source / preCheck text.
 * True peaks only — false peaks (villa establishing, meeting exposition) rejected.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { loadGenreTemplatePack } from "../genre/loadGenreTemplatePack";

export type PeakLedgerEntry = {
  peakId: string;
  sourceSpan?: string;
  avForm: string;
  emotionType: "爽" | "甜" | "虐" | "惊" | string;
  avPayload: { visual: string; audio: string };
  retainRole: "吸住" | "升级" | "付费卡前" | string;
  patternId?: string;
  rejectedAsFalsePeak?: boolean;
  falsePeakReason?: string;
};

export type HookPlanSlot = {
  hookId: string;
  slot: "opening" | "mid" | "end";
  hookType: string;
  visualBeat: string;
  audioBeat: string;
  targetEmotion: string;
  suggestedDurationSec: number;
  peakId?: string;
  shootableDelta?: string;
};

export type HookPlan = {
  opening?: HookPlanSlot;
  mid?: HookPlanSlot;
  end?: HookPlanSlot;
  empathyThreeBeat?: string[];
  retention31545?: { s3: string; s15: string; s45: string };
  /** 付费卡硬切意图：高潮切断前一拍 */
  paypointIntent?: {
    cutBeforeBeat: string;
    episodeHint?: string;
    visualFreeze?: string;
    audioTail?: string;
  };
};

export type PeakHookExtractResult = {
  peakLedger: PeakLedgerEntry[];
  hookPlan: HookPlan;
  rejectedFalsePeaks: { text: string; reason: string }[];
  packId: string;
};

type PatternsFixture = {
  falsePeakLabels?: string[];
  falsePeakKeywords?: string[];
  peakPatterns?: {
    id: string;
    keywords: string[];
    avForm: string;
    emotionType: string;
    visualPayload: string;
    audioPayload: string;
    retainRole: string;
    packBias?: string[];
  }[];
  hookTypes?: { opening?: string[]; mid?: string[]; end?: string[] };
  empathyThreeBeat?: string[];
  retention?: {
    beat31545?: { s3: string; s15: string; s45: string };
    openingHookMaxSec?: number;
  };
};

function loadPatterns(): PatternsFixture {
  return readFixtureJson<PatternsFixture>("av_peak_hook_patterns.json", {
    falsePeakKeywords: [],
    peakPatterns: [],
    empathyThreeBeat: ["困境", "无门", "微反击"],
  });
}

function snippetAround(text: string, idx: number, len = 24): string {
  const start = Math.max(0, idx - 8);
  return text.slice(start, Math.min(text.length, idx + len)).replace(/\s+/g, " ").trim();
}

function isFalsePeakContext(span: string, fx: PatternsFixture): string | null {
  const labels = fx.falsePeakLabels ?? [];
  const kws = fx.falsePeakKeywords ?? [];
  for (const lab of labels) {
    if (span.includes(lab)) return lab;
  }
  for (const kw of kws) {
    if (span.includes(kw)) return `假爆点关键词:${kw}`;
  }
  return null;
}

/** Prefer pack-biased patterns; still allow generic hits. */
function scorePattern(
  p: NonNullable<PatternsFixture["peakPatterns"]>[number],
  packId: string,
): number {
  const bias = p.packBias ?? [];
  if (bias.includes(packId)) return 3;
  if (bias.includes("generic")) return 1;
  return 0;
}

export function extractPeakLedgerFromText(
  sourceText: string,
  opts?: { packId?: string; maxPeaks?: number },
): PeakHookExtractResult {
  const packId = opts?.packId || "generic";
  const pack = loadGenreTemplatePack(packId);
  const fx = loadPatterns();
  const text = String(sourceText || "");
  const rejectedFalsePeaks: { text: string; reason: string }[] = [];
  const peaks: PeakLedgerEntry[] = [];
  const seen = new Set<string>();

  const patterns = [...(fx.peakPatterns ?? [])].sort(
    (a, b) => scorePattern(b, packId) - scorePattern(a, packId),
  );

  for (const p of patterns) {
    for (const kw of p.keywords) {
      let from = 0;
      while (from < text.length) {
        const idx = text.indexOf(kw, from);
        if (idx < 0) break;
        const span = snippetAround(text, idx);
        const falseReason = isFalsePeakContext(span, fx);
        if (falseReason) {
          rejectedFalsePeaks.push({ text: span, reason: falseReason });
          from = idx + kw.length;
          continue;
        }
        const key = `${p.id}@${idx}`;
        if (seen.has(p.id) && peaks.length >= 2) {
          from = idx + kw.length;
          continue;
        }
        if (seen.has(key)) {
          from = idx + kw.length;
          continue;
        }
        seen.add(key);
        seen.add(p.id);
        peaks.push({
          peakId: `peak-${p.id}-${peaks.length + 1}`,
          sourceSpan: span,
          avForm: p.avForm,
          emotionType: p.emotionType,
          avPayload: { visual: p.visualPayload, audio: p.audioPayload },
          retainRole: p.retainRole,
          patternId: p.id,
        });
        from = idx + kw.length;
        if (peaks.length >= (opts?.maxPeaks ?? 8)) break;
      }
      if (peaks.length >= (opts?.maxPeaks ?? 8)) break;
    }
    if (peaks.length >= (opts?.maxPeaks ?? 8)) break;
  }

  const openingTypes =
    (pack.storyFormula?.openingHookTypes as string[] | undefined) ??
    fx.hookTypes?.opening ??
    ["crisis", "emotion_hit"];
  const first = peaks[0];
  const second = peaks[1] ?? peaks[0];
  const last = peaks[peaks.length - 1] ?? peaks[0];

  const payHints = (pack.storyFormula?.paypointHints as string[] | undefined) ?? [];
  const recon = (pack.reconstructionExamples ?? [])[0] as
    | { paypointHint?: string; to?: string; emotionTask?: string }
    | undefined;

  const hookPlan: HookPlan = {
    opening: first
      ? {
          hookId: "hook-opening",
          slot: "opening",
          hookType: openingTypes[0] || "crisis",
          visualBeat: first.avPayload.visual,
          audioBeat: first.avPayload.audio,
          targetEmotion: first.emotionType,
          suggestedDurationSec: Math.min(3, fx.retention?.openingHookMaxSec ?? 6),
          peakId: first.peakId,
          shootableDelta: `△${first.avForm}：${first.avPayload.visual}`,
        }
      : undefined,
    mid: second
      ? {
          hookId: "hook-mid",
          slot: "mid",
          hookType: fx.hookTypes?.mid?.[0] || "first_power_shift",
          visualBeat: second.avPayload.visual,
          audioBeat: second.avPayload.audio,
          targetEmotion: second.emotionType,
          suggestedDurationSec: 2,
          peakId: second.peakId,
          shootableDelta: `△权力/剧情第一次变化：${second.avForm}`,
        }
      : undefined,
    end: last
      ? {
          hookId: "hook-end",
          slot: "end",
          hookType: fx.hookTypes?.end?.[0] || "unresolved_question",
          visualBeat: last.avPayload.visual,
          audioBeat: last.avPayload.audio,
          targetEmotion: last.emotionType,
          suggestedDurationSec: 2.5,
          peakId: last.peakId,
          shootableDelta: `△集末未解/反转预告：${last.avForm}`,
        }
      : undefined,
    empathyThreeBeat:
      (pack.storyFormula?.empathyBeats as string[] | undefined) ??
      fx.empathyThreeBeat ??
      ["困境", "无门", "微反击"],
    retention31545: fx.retention?.beat31545 ?? {
      s3: "情绪冲击",
      s15: "第一次变化",
      s45: "强期待",
    },
    paypointIntent: {
      cutBeforeBeat: recon?.paypointHint || payHints[0] || "高潮兑现前一拍硬切",
      episodeHint: payHints[0] ? `卡点参考：${payHints.join(" / ")}` : "约10-12集高潮切断",
      visualFreeze: last?.avPayload.visual || first?.avPayload.visual || "关键人物震惊/得意特写定格",
      audioTail: last?.avPayload.audio || "配乐骤停或低频嗡鸣收尾",
    },
  };

  return { peakLedger: peaks, hookPlan, rejectedFalsePeaks, packId };
}

export function validatePeakLedger(peaks: PeakLedgerEntry[] | undefined): {
  ok: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!Array.isArray(peaks) || peaks.length === 0) {
    reasons.push("peakLedger 为空");
    return { ok: false, reasons };
  }
  for (const p of peaks) {
    if (p.rejectedAsFalsePeak) reasons.push(`${p.peakId} 标为假爆点`);
    if (!p.avPayload?.visual || !p.avPayload?.audio) reasons.push(`${p.peakId} 缺 avPayload`);
    if (!p.avForm) reasons.push(`${p.peakId} 缺 avForm`);
  }
  return { ok: reasons.length === 0, reasons };
}

export function validateHookPlan(plan: HookPlan | undefined): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!plan?.opening) {
    reasons.push("缺开场钩");
    return { ok: false, reasons };
  }
  if (!plan.opening.visualBeat) reasons.push("开场钩缺 visualBeat");
  if (!plan.opening.shootableDelta && !plan.opening.visualBeat) reasons.push("开场钩无可拍 △");
  if (!(plan.opening.suggestedDurationSec > 0)) reasons.push("开场钩缺时长");
  if (!plan.paypointIntent?.cutBeforeBeat) reasons.push("缺付费卡切断意图 paypointIntent");
  return { ok: reasons.length === 0, reasons };
}

export function validatePaypointIntent(plan: HookPlan | undefined): boolean {
  return Boolean(plan?.paypointIntent?.cutBeforeBeat?.trim());
}

export function getPeakLedgerFromPlan(plan: Record<string, unknown>): PeakLedgerEntry[] {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  const raw = (pd.peakLedger ?? plan.peakLedger) as PeakLedgerEntry[] | undefined;
  return Array.isArray(raw) ? raw : [];
}

export function getHookPlanFromPlan(plan: Record<string, unknown>): HookPlan | undefined {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  return (pd.hookPlan ?? plan.hookPlan) as HookPlan | undefined;
}

export function setPeakHookOnPlan(
  plan: Record<string, unknown>,
  result: PeakHookExtractResult,
): void {
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  const pd = plan.planData as Record<string, unknown>;
  pd.peakLedger = result.peakLedger;
  pd.hookPlan = result.hookPlan;
  pd.peakHookMeta = {
    rejectedFalsePeaks: result.rejectedFalsePeaks,
    packId: result.packId,
    updatedAt: Date.now(),
  };
}

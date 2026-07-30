/**
 * Reverse: dialogue / AV / shot / emotion-peak signals → reconstruct storyCore.
 */
import { cascadeAfterStoryRecon, assertMayRewriteLiterary, getViralPrefs, setViralPrefs } from "./viralDoctrine";
import { getPeakLedgerFromPlan, getHookPlanFromPlan } from "./extractPeakLedger";
import { getShotDesignIntentsFromPlan } from "./shotDesignIntent";
import { getGenreTemplateFromPlan, loadGenreTemplatePack } from "../genre/loadGenreTemplatePack";

export type SignalFinding = {
  source: "dialogue" | "av" | "shot" | "emotion_peak";
  severity: "local" | "kernel";
  code: string;
  detail: string;
};

export type ReconstructDraft = {
  storyCore: string;
  eventSequence: string[];
  changeLog: string;
  reconstructionTrace: { from: string; to: string; why: string }[];
  emotionTask: string;
  findings: SignalFinding[];
};

export type ReconstructResult = {
  ok: boolean;
  needsUserConfirm: boolean;
  blocked?: string;
  draft?: ReconstructDraft;
  committed?: boolean;
  cascade?: ReturnType<typeof cascadeAfterStoryRecon>;
  changeDiff: { reason: string; storyBefore?: string; storyAfter?: string; findings: SignalFinding[] };
};

function asPd(plan: Record<string, unknown>): Record<string, unknown> {
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  return plan.planData as Record<string, unknown>;
}

function dialogueTextBlob(plan: Record<string, unknown>): string {
  const pd = asPd(plan);
  const lines =
    (pd.dialoguePlan as { lines?: { text?: string }[] })?.lines ??
    (pd.narrativeBrief as { dialoguePlan?: { lines?: { text?: string }[] } })?.dialoguePlan?.lines ??
    [];
  return lines.map((l) => String(l.text ?? "")).join("\n");
}

/** Collect reverse signals without mutating. */
export function collectReverseSignals(plan: Record<string, unknown>): SignalFinding[] {
  const findings: SignalFinding[] = [];
  const pd = asPd(plan);
  const blob = dialogueTextBlob(plan);
  const peaks = getPeakLedgerFromPlan(plan);
  const hook = getHookPlanFromPlan(plan);
  const intents = getShotDesignIntentsFromPlan(plan);
  const storyCore = String(pd.storyCore ?? pd.storySkeleton ?? "");

  if (!blob.trim() && peaks.length) {
    findings.push({
      source: "dialogue",
      severity: "kernel",
      code: "DIALOGUE_EMPTY_WITH_PEAKS",
      detail: "有 peak 无对白主通道 → 故事核未落到可说信息",
    });
  }
  if (/观众感到|观众觉得|弹幕/.test(blob)) {
    findings.push({
      source: "dialogue",
      severity: "local",
      code: "AUDIENCE_META",
      detail: "对白含观众元叙述",
    });
  }
  if (!storyCore.trim() || storyCore.length < 12) {
    findings.push({
      source: "dialogue",
      severity: "kernel",
      code: "STORY_CORE_EMPTY",
      detail: "storyCore 空/过短",
    });
  }

  const falsePeak = peaks.filter((p) => !p.avPayload?.visual || !p.avPayload?.audio);
  if (falsePeak.length) {
    findings.push({
      source: "av",
      severity: "local",
      code: "WEAK_AV_PAYLOAD",
      detail: `${falsePeak.length} 条 peak 缺视听 payload`,
    });
  }
  if (!peaks.length && !hook?.opening?.visualBeat) {
    findings.push({
      source: "av",
      severity: "kernel",
      code: "NO_TRUE_PEAK",
      detail: "无真视听峰/开场钩 → 故事峰位缺失",
    });
  }

  if (!intents.length && peaks.length) {
    findings.push({
      source: "shot",
      severity: "local",
      code: "INTENT_MISSING",
      detail: "有 peak 无 shotDesignIntent",
    });
  }
  const orphanIntents = intents.filter((i) => !i.peakId && !i.hookId);
  if (orphanIntents.length && !peaks.length) {
    findings.push({
      source: "shot",
      severity: "kernel",
      code: "SHOT_WITHOUT_STORY",
      detail: "镜头意图无故事峰可对齐",
    });
  }

  const highEmo = (pd.sceneMeta as { emotionIntensity?: number }[] | undefined)?.filter(
    (m) => (m.emotionIntensity ?? 0) >= 7,
  );
  if (highEmo?.length && !/情绪|怒|哭|跪|打|揭|反转/.test(blob + storyCore)) {
    findings.push({
      source: "emotion_peak",
      severity: "kernel",
      code: "EMO_WITHOUT_SAYABLE",
      detail: "高情绪强度但正文/故事核无可说事件",
    });
  }

  const changeLog = String(pd.changeLog ?? pd.reconstructionTrace ?? "");
  if (!changeLog.trim() && getGenreTemplateFromPlan(plan).adaptationDepth !== "weakPath") {
    findings.push({
      source: "dialogue",
      severity: "kernel",
      code: "RECON_NOT_APPLIED",
      detail: "缺少 changeLog/reconstructionTrace（原→改未应用）",
    });
  }

  return findings;
}

export function buildReconstructDraft(plan: Record<string, unknown>): ReconstructDraft {
  const findings = collectReverseSignals(plan);
  const gt = getGenreTemplateFromPlan(plan);
  const pack = loadGenreTemplatePack(gt.packId);
  const ex = pack.reconstructionExamples?.[0];
  const pd = asPd(plan);
  const before = String(pd.storyCore ?? "");
  const peaks = getPeakLedgerFromPlan(plan);
  const eventSequence =
    peaks.length > 0
      ? peaks.map((p, i) => `${i + 1}. [${p.peakId}] ${p.avForm}·${p.emotionType}：${p.avPayload.visual}`)
      : [
          "1. 冲突起因当面说清",
          "2. 对抗加码（角色 POV 对白）",
          "3. 结果/钩子落点（可拍可说）",
        ];

  const storyCore =
    ex?.to ||
    `【${pack.label}重构】主角以直白对白推动：${eventSequence[0]}；情绪任务=${ex?.emotionTask || "先痛后爽"}；禁假爆点与观众元叙述。`;

  return {
    storyCore,
    eventSequence,
    changeLog: `假/空 → 真：${ex?.from || before.slice(0, 40) || "原平铺"} → ${ex?.to || storyCore.slice(0, 80)}`,
    reconstructionTrace: [
      {
        from: ex?.from || before || "（空）",
        to: ex?.to || storyCore,
        why: ex?.why || findings.map((f) => f.code).join(",") || "信号反推",
      },
    ],
    emotionTask: ex?.emotionTask || "角色情绪说出口 + 事件完整",
    findings,
  };
}

/**
 * Prepare reverse reconstruct. By default needs user confirm (pendingStoryRecon).
 * Pass confirm=true to commit + cascade.
 */
export function reconstructStoryFromSignals(
  plan: Record<string, unknown>,
  opts?: { confirm?: boolean; forceKernel?: boolean },
): ReconstructResult {
  const lock = assertMayRewriteLiterary(plan);
  if (!lock.ok) {
    return {
      ok: false,
      needsUserConfirm: false,
      blocked: lock.reason,
      changeDiff: { reason: lock.reason || "locked", findings: [] },
    };
  }

  const findings = collectReverseSignals(plan);
  const kernel = findings.filter((f) => f.severity === "kernel");
  if (!opts?.forceKernel && kernel.length === 0) {
    return {
      ok: true,
      needsUserConfirm: false,
      changeDiff: { reason: "无内核级信号，无需反推故事", findings },
    };
  }

  const draft = buildReconstructDraft(plan);
  const pd = asPd(plan);
  const storyBefore = String(pd.storyCore ?? "");

  if (!opts?.confirm) {
    setViralPrefs(plan, { pendingStoryRecon: draft as unknown as Record<string, unknown> });
    return {
      ok: true,
      needsUserConfirm: true,
      draft,
      committed: false,
      changeDiff: {
        reason: "待用户确认后提交故事重构",
        storyBefore,
        storyAfter: draft.storyCore,
        findings: draft.findings,
      },
    };
  }

  pd.storyCore = draft.storyCore;
  pd.eventSequence = draft.eventSequence;
  pd.changeLog = draft.changeLog;
  pd.reconstructionTrace = draft.reconstructionTrace;
  pd.emotionTask = draft.emotionTask;
  plan.planData = pd;
  setViralPrefs(plan, { pendingStoryRecon: undefined });

  const cascade = cascadeAfterStoryRecon(plan, draft.findings.map((f) => f.code).join(",") || "manual_recon");

  return {
    ok: true,
    needsUserConfirm: false,
    draft,
    committed: true,
    cascade,
    changeDiff: {
      reason: "已确认反推重构 storyCore 并级联作废下游",
      storyBefore,
      storyAfter: draft.storyCore,
      findings: draft.findings,
    },
  };
}

export function confirmPendingStoryRecon(plan: Record<string, unknown>): ReconstructResult {
  const pending = getViralPrefs(plan).pendingStoryRecon as ReconstructDraft | undefined;
  if (!pending?.storyCore) {
    return {
      ok: false,
      needsUserConfirm: false,
      blocked: "无 pendingStoryRecon",
      changeDiff: { reason: "无待确认草稿", findings: [] },
    };
  }
  const lock = assertMayRewriteLiterary(plan);
  if (!lock.ok) {
    return {
      ok: false,
      needsUserConfirm: false,
      blocked: lock.reason,
      changeDiff: { reason: lock.reason || "locked", findings: [] },
    };
  }
  const pd = asPd(plan);
  const storyBefore = String(pd.storyCore ?? "");
  pd.storyCore = pending.storyCore;
  pd.eventSequence = pending.eventSequence;
  pd.changeLog = pending.changeLog;
  pd.reconstructionTrace = pending.reconstructionTrace;
  pd.emotionTask = pending.emotionTask;
  plan.planData = pd;
  setViralPrefs(plan, { pendingStoryRecon: undefined });
  const cascade = cascadeAfterStoryRecon(
    plan,
    pending.findings?.map((f) => f.code).join(",") || "confirm_pending_recon",
  );
  return {
    ok: true,
    needsUserConfirm: false,
    draft: pending,
    committed: true,
    cascade,
    changeDiff: {
      reason: "已确认反推重构 storyCore 并级联作废下游",
      storyBefore,
      storyAfter: pending.storyCore,
      findings: pending.findings ?? [],
    },
  };
}

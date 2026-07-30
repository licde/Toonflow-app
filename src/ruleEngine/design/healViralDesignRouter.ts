/**
 * healViralDesignRouter — five-domain design-time heal + reverse escalate.
 */
import {
  assertMayRewriteLiterary,
  getEpisodeIndex,
  isEp1HardNormScope,
  isLiteraryLocked,
  loadViralRhythmContract,
  literaryStaleBlocksExit,
} from "./viralDoctrine";
import { redesignCharacterDialogue, countUsefulInfoHints, type RedesignChange } from "./redesignCharacterDialogue";
import { collectReverseSignals, reconstructStoryFromSignals } from "./reconstructStoryFromSignals";
import {
  getHookPlanFromPlan,
  getPeakLedgerFromPlan,
  setPeakHookOnPlan,
  type HookPlan,
  type PeakLedgerEntry,
} from "./extractPeakLedger";
import { getShotDesignIntentsFromPlan, ensureShotDesignIntentsFromPeaks } from "./shotDesignIntent";
import { getGenreTemplateFromPlan, loadGenreTemplatePack } from "../genre/loadGenreTemplatePack";
import { scoreTemplateFill } from "../genre/compileWritingBrief";
import { runDesignExitGate, type DesignExitResult } from "./designExitGate";
import { runForwardReentryAfterRepair } from "./designSplitLifecycle";
import { runDesignAutoClose } from "./designAutoClose";

export type HealDomain = "A_architecture" | "B_av" | "C_transposition" | "D_character" | "E_propulsion" | "reverse" | "F_split_orch";

export type HealChangeDiff = {
  domains: HealDomain[];
  redesign?: RedesignChange[];
  reverseReason?: string;
  storyAfter?: string;
  notes: string[];
};

export type HealViralResult = {
  ok: boolean;
  rounds: number;
  changeDiff: HealChangeDiff;
  exitGate?: DesignExitResult;
  rollbackTo?: string;
  needsUserConfirm?: boolean;
  blocked?: string;
  plan: Record<string, unknown>;
};

function asPd(plan: Record<string, unknown>): Record<string, unknown> {
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  return plan.planData as Record<string, unknown>;
}

function ensureInformationLedger(plan: Record<string, unknown>, notes: string[]): void {
  const pd = asPd(plan);
  const ledger = (pd.informationLedger as unknown[]) ?? [];
  if (ledger.length) return;
  const peaks = getPeakLedgerFromPlan(plan);
  pd.informationLedger = (peaks.length ? peaks : [{ peakId: "info1" }]).slice(0, 3).map((p, i) => ({
    infoId: `info_${(p as PeakLedgerEntry).peakId || i + 1}`,
    audienceKnows: true,
    characterKnows: { hero: true },
    emotionTarget: (p as PeakLedgerEntry).emotionType || "冲击",
  }));
  plan.planData = pd;
  notes.push("E: 补 informationLedger");
}

function ensureCarryInfo(plan: Record<string, unknown>, notes: string[]): void {
  if (getEpisodeIndex(plan) <= 1) return;
  const pd = asPd(plan);
  const cont = (pd.seriesContinuity as { carryInfoIds?: string[]; empathyShift?: string; prevEpisodeSummary?: string } ) ?? {};
  // Prefer hydrate from continuity.seriesContinuitySeed when present (real writeback)
  try {
    const seed = (plan as { continuity?: { seriesContinuitySeed?: Record<string, unknown> } }).continuity
      ?.seriesContinuitySeed;
    if (seed) {
      const { hydrateSeriesContinuityFromSeed } =
        require("../bundle/continuityWriteback") as typeof import("../bundle/continuityWriteback");
      if (hydrateSeriesContinuityFromSeed(plan, seed as never)) {
        notes.push("E: epN+ hydrate seriesContinuity from writeback seed");
        return;
      }
    }
  } catch {
    /* fall through */
  }
  if (!cont.carryInfoIds?.length) {
    cont.carryInfoIds = ["carry_prev_hook"];
    cont.empathyShift = cont.empathyShift || "上集钩兑现→本集加压";
    pd.seriesContinuity = cont;
    plan.planData = pd;
    notes.push("E: epN+ 补 carryInfo/empathyShift");
  }
}

function healArchitecture(plan: Record<string, unknown>, stageId: string, notes: string[]): void {
  const fill = scoreTemplateFill(plan, stageId);
  const gt = getGenreTemplateFromPlan(plan);
  const pack = loadGenreTemplatePack(gt.packId);
  const pd = asPd(plan);
  if (fill.missing.includes("peakPlacement") || fill.missing.includes("peakLedger")) {
    notes.push("A: 模板缺 peak — 需 extract/补 ledger");
  }
  if (!pd.storySkeleton && pack.storyFormula) {
    pd.storySkeleton = `微循环：起→承→转→合/钩；共鸣=${(pack.storyFormula.empathyBeats as string[])?.join("→") || ""}`;
    plan.planData = pd;
    notes.push("A: 补 storySkeleton 微循环骨架");
  }
}

function healAv(plan: Record<string, unknown>, notes: string[]): void {
  const peaks = getPeakLedgerFromPlan(plan);
  const prevHook = getHookPlanFromPlan(plan);
  const hook: HookPlan = prevHook ? { ...prevHook } : {};
  const gt = getGenreTemplateFromPlan(plan);
  const pack = loadGenreTemplatePack(gt.packId);
  let changed = false;

  let fixedPeaks: PeakLedgerEntry[] = peaks.map((p) => {
    if (p.avPayload?.visual && p.avPayload?.audio) return p;
    changed = true;
    return {
      ...p,
      avPayload: {
        visual: p.avPayload?.visual || `${p.avForm || "冲突"}可拍画面`,
        audio: p.avPayload?.audio || "冲击音效/停顿",
      },
    };
  });
  if (!fixedPeaks.length) {
    fixedPeaks = [
      {
        peakId: "peak_auto_1",
        avForm: "冲突当面",
        emotionType: "爽",
        avPayload: { visual: "对峙定格", audio: "一声闷响" },
        retainRole: "吸住",
      },
    ];
    changed = true;
    notes.push("B: 补默认真 peak");
  }

  if (!hook.opening?.visualBeat) {
    hook.opening = {
      hookId: "hook-opening",
      slot: "opening",
      hookType: "conflict_open",
      visualBeat: fixedPeaks[0]?.avPayload.visual || "开场冲突定格",
      audioBeat: fixedPeaks[0]?.avPayload.audio || "一声闷响",
      targetEmotion: fixedPeaks[0]?.emotionType || "冲击",
      shootableDelta: "可拍△：表情/动作瞬间",
      suggestedDurationSec: 3,
      peakId: fixedPeaks[0]?.peakId,
    };
    changed = true;
    notes.push("B: 补 hookPlan.opening");
  }
  if (!hook.paypointIntent?.cutBeforeBeat) {
    const hint = pack.reconstructionExamples?.[0]?.paypointHint || "高潮兑现前一拍硬切";
    hook.paypointIntent = { cutBeforeBeat: hint, episodeHint: "ep1" };
    changed = true;
    notes.push("B: 补 paypointIntent");
  }
  if (!hook.empathyThreeBeat?.length) {
    hook.empathyThreeBeat = (pack.storyFormula?.empathyBeats as string[])?.slice(0, 3) || ["辱", "压", "反"];
    changed = true;
  }

  const intents = getShotDesignIntentsFromPlan(plan);
  if (!intents.length && fixedPeaks.length) {
    const ens = ensureShotDesignIntentsFromPeaks(plan);
    if (ens.applied) {
      notes.push(`B: 从 peak 生成 shotDesignIntent (${ens.reasons.join(",")})`);
      changed = true;
    }
  } else if (intents.length && !validateIntentOk(plan)) {
    const ens = ensureShotDesignIntentsFromPeaks(plan);
    if (ens.applied) {
      notes.push(`B: 补齐残缺 shotDesignIntent (${ens.reasons.join(",")})`);
      changed = true;
    }
  }

  if (changed) {
    setPeakHookOnPlan(plan, {
      peakLedger: fixedPeaks,
      hookPlan: hook,
      rejectedFalsePeaks: [],
      packId: gt.packId,
    });
  }
}

function validateIntentOk(plan: Record<string, unknown>): boolean {
  try {
    const { validateShotDesignIntents, getShotDesignIntentsFromPlan: get } =
      require("./shotDesignIntent") as typeof import("./shotDesignIntent");
    return validateShotDesignIntents(get(plan)).ok;
  } catch {
    return false;
  }
}

function healTransposition(plan: Record<string, unknown>, notes: string[]): boolean {
  const pd = asPd(plan);
  const gt = getGenreTemplateFromPlan(plan);
  const pack = loadGenreTemplatePack(gt.packId);
  const ex = pack.reconstructionExamples?.[0];
  const hasTrace = Boolean(pd.changeLog || pd.reconstructionTrace);
  if (hasTrace) return false;
  if (!ex) {
    notes.push("C: pack 无 reconstructionExamples");
    return true;
  }
  // Soft-fill application markers when story exists but trace missing
  if (pd.storyCore || pd.storySkeleton) {
    pd.changeLog = pd.changeLog || `原→改：${ex.from} → ${ex.to}`;
    pd.reconstructionTrace = pd.reconstructionTrace || [{ from: ex.from, to: ex.to, why: ex.why || "示范应用" }];
    plan.planData = pd;
    notes.push("C: 补 changeLog/reconstructionTrace（原→改已应用标记）");
    return false;
  }
  notes.push("C: 无 storyCore — 需反推/回 P06");
  return true;
}

function healCharacter(plan: Record<string, unknown>, notes: string[], changes: RedesignChange[]): void {
  const peaks = getPeakLedgerFromPlan(plan);
  const fills = peaks.slice(0, 2).map((p) => ({
    peakId: p.peakId,
    speaker: "男主",
    emotion: p.emotionType,
    eventBeat: p.avPayload?.visual || "把真相说出来",
  }));
  const r = redesignCharacterDialogue(plan, { fillForPeaks: fills });
  if (r.blocked) {
    notes.push(`D: blocked ${r.blocked}`);
    return;
  }
  changes.push(...r.changes);
  notes.push(`D: 台词重设计 ${r.changes.length} 处`);
}

function healPropulsion(plan: Record<string, unknown>, notes: string[], changes: RedesignChange[]): void {
  ensureInformationLedger(plan, notes);
  ensureCarryInfo(plan, notes);
  const r = redesignCharacterDialogue(plan, {});
  if (r.ok) {
    // Ensure causedBy + functions
    const pd = asPd(plan);
    const lines =
      (pd.dialoguePlan as { lines?: { functions?: string[]; causedByActionId?: string; text?: string }[] })?.lines ?? [];
    let n = 0;
    for (const l of lines) {
      if (!l.functions?.length) {
        l.functions = ["advance_plot"];
        n++;
      }
      if (!l.causedByActionId) {
        l.causedByActionId = "beat_auto";
        n++;
      }
    }
    if (n) notes.push(`E: 补 functions/causedBy ×${n}`);
    changes.push(...r.changes);
  }

  if (isEp1HardNormScope(plan)) {
    const pd = asPd(plan);
    const lines = (pd.dialoguePlan as { lines?: unknown[] })?.lines ?? [];
    const useful = countUsefulInfoHints(lines as Parameters<typeof countUsefulInfoHints>[0]);
    const max = loadViralRhythmContract().hardNorms?.usefulInfoInFirst30sMax ?? 1;
    if (useful > max + 2) {
      notes.push(`E: ep1 有用信息偏多(${useful})，保留前 ${max + 1} 条主功能`);
      // Soft: demote extras
      let kept = 0;
      for (const l of lines as { functions?: string[] }[]) {
        const fn = l.functions ?? [];
        if (fn.includes("reveal_info") || fn.includes("emotion_hit")) {
          kept++;
          if (kept > max + 1) {
            l.functions = fn.filter((f) => f !== "reveal_info");
          }
        }
      }
    }
  }
}

function routeFailedIds(failedIds: string[]): HealDomain[] {
  const domains = new Set<HealDomain>();
  for (const id of failedIds) {
    if (/TEMPLATE|PACK|STORY-HOOK|CONFLICT/i.test(id)) domains.add("A_architecture");
    if (/PEAK|HOOK|SHOT-INTENT|SFX|RET-OPEN|AV-TAGS|VOICE-AV|CAM/i.test(id)) domains.add("B_av");
    if (/RECON|EMPATHY|PAYPOINT/i.test(id)) domains.add("C_transposition");
    if (/LIP|DC-ALIGN|VOICE|FALSE_GREEN|NAR-1[45]|SPEAKER-BARE/i.test(id)) domains.add("D_character");
    if (/RHYTHM|USEFUL|KERNEL|NAR-0|RET-01|DEX-EMPATHY/i.test(id)) domains.add("E_propulsion");
    if (/DC-01|NAR-14|DEX-LIP|DEX-DC-ALIGN/i.test(id)) domains.add("F_split_orch");
  }
  if (!domains.size) {
    domains.add("E_propulsion");
    domains.add("D_character");
  }
  return [...domains];
}

/** Secondary repair: re-run SplitOrchestrator so plan patches mirror to shots (DC-01/NAR dual-face).
 * diagnose-only：禁 VisBeat/lip 语义扩（与 setStepStatus/exportGate 同核）。
 */
function healSplitOrchestrator(plan: Record<string, unknown>, notes: string[]): void {
  const pd = asPd(plan);
  const pack = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined) ?? { shots: [] };
  const shots = pack.shots ?? [];
  if (!shots.length && !(pd.dialoguePlan as { lines?: unknown[] } | undefined)?.lines?.length) return;
  const re = runForwardReentryAfterRepair({
    planData: pd,
    shots,
    meta: (pd.meta as Record<string, unknown>) ?? {},
    applyClauseSplit: true,
    applyVisBeatExpanders: false,
    applySemanticSplit: false,
  });
  Object.assign(pd, re.planData);
  pd.preDesignPack = { ...pack, shots: re.shots };
  plan.planData = pd;
  notes.push(
    `F: SplitOrchestrator reentry log=${re.log.map((l) => l.step).join(">")} stale=${re.reentry.staleClientIds.length}`,
  );
}

/**
 * One or more heal rounds against design exit failures.
 */
export function healViralDesign(
  plan: Record<string, unknown>,
  stageId: string,
  opts?: { maxRounds?: number; confirmStoryRecon?: boolean; autoConfirmReverse?: boolean },
): HealViralResult {
  if (isLiteraryLocked(plan)) {
    return {
      ok: false,
      rounds: 0,
      blocked: "literaryLocked",
      changeDiff: { domains: [], notes: ["锁稿后禁止设计期内容 heal"] },
      plan,
    };
  }
  const lock = assertMayRewriteLiterary(plan);
  if (!lock.ok) {
    return { ok: false, rounds: 0, blocked: lock.reason, changeDiff: { domains: [], notes: [] }, plan };
  }

  const maxRounds = opts?.maxRounds ?? loadViralRhythmContract().heal?.maxRounds ?? 3;
  const changeDiff: HealChangeDiff = { domains: [], redesign: [], notes: [] };
  let exitGate = runDesignExitGate(stageId, plan);
  let rounds = 0;

  // literaryStale: must not pretend success on W2+
  if (literaryStaleBlocksExit(plan, stageId) && stageId !== "P06") {
    const { LITERARY_STALE_USER_MESSAGE } = require("./viralDoctrine") as typeof import("./viralDoctrine");
    changeDiff.notes.push(LITERARY_STALE_USER_MESSAGE);
    return {
      ok: false,
      rounds: 0,
      exitGate: {
        ...exitGate,
        ok: false,
        failedIds: [...exitGate.failedIds, "DEX-LITERARY-STALE"],
        userMessage: LITERARY_STALE_USER_MESSAGE,
      },
      rollbackTo: "W1",
      changeDiff,
      plan,
    };
  }

  while (!exitGate.ok && rounds < maxRounds) {
    rounds++;
    // High-confidence auto-close first (placeholder RA / DC mirror / EXTRA noise)
    const auto = runDesignAutoClose(plan, {
      stageId,
      maxRounds: 1,
      failedIds: exitGate.failedIds,
    });
    if (auto.applied) {
      changeDiff.notes.push(
        ...auto.changes.map((c) => `autoClose:${c.ruleId}:${c.detail}`),
        ...(auto.clearedIds.length ? [`autoClose:cleared=${auto.clearedIds.join(",")}`] : []),
      );
      exitGate = auto.exitGate;
      if (exitGate.ok) break;
    }

    const domains = routeFailedIds(exitGate.failedIds);
    changeDiff.domains = [...new Set([...changeDiff.domains, ...domains])];

    if (domains.includes("A_architecture")) healArchitecture(plan, stageId, changeDiff.notes);
    if (domains.includes("B_av")) healAv(plan, changeDiff.notes);
    let needReverse = false;
    if (domains.includes("C_transposition")) needReverse = healTransposition(plan, changeDiff.notes) || needReverse;
    if (domains.includes("D_character")) healCharacter(plan, changeDiff.notes, changeDiff.redesign!);
    if (domains.includes("E_propulsion")) healPropulsion(plan, changeDiff.notes, changeDiff.redesign!);
    // Always re-sync after dialogue heals so二次修复不因「只改 plan」再炸 DC-01/镜级 NAR
    if (domains.includes("F_split_orch") || domains.includes("D_character")) {
      healSplitOrchestrator(plan, changeDiff.notes);
    }

    const signals = collectReverseSignals(plan);
    const kernel = signals.filter((s) => s.severity === "kernel");
    if (needReverse || (kernel.length && rounds >= maxRounds - 1)) {
      changeDiff.domains.push("reverse");
      const recon = reconstructStoryFromSignals(plan, {
        confirm: opts?.confirmStoryRecon || opts?.autoConfirmReverse,
        forceKernel: true,
      });
      changeDiff.reverseReason = recon.changeDiff.reason;
      changeDiff.storyAfter = recon.changeDiff.storyAfter;
      changeDiff.notes.push(...recon.changeDiff.findings.map((f) => `reverse:${f.code}`));
      if (recon.needsUserConfirm) {
        return {
          ok: false,
          rounds,
          needsUserConfirm: true,
          exitGate,
          rollbackTo: "P06",
          changeDiff,
          plan,
        };
      }
      if (recon.committed) {
        return {
          ok: false,
          rounds,
          exitGate: runDesignExitGate("P06", plan),
          rollbackTo: "P06",
          changeDiff,
          plan,
        };
      }
    }

    exitGate = runDesignExitGate(stageId, plan);
  }

  return {
    ok: exitGate.ok,
    rounds,
    exitGate,
    rollbackTo: exitGate.rollbackTo,
    changeDiff,
    plan,
  };
}

export function healViralDesignRouter(
  plan: Record<string, unknown>,
  stageId: string,
  opts?: { maxRounds?: number; confirmStoryRecon?: boolean; autoConfirmReverse?: boolean },
): HealViralResult {
  return healViralDesign(plan, stageId, opts);
}

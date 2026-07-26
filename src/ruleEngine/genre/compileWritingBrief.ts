/**
 * Compile stage writing brief + viralWritingContext for Chat injection.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import {
  compileAdaptationConstraintBlock,
  getGenreTemplateFromPlan,
  getViralDerivations,
  loadGenreTemplatePack,
  type GenreTemplatePack,
  type ReconstructionExample,
  type ViralDerivation,
} from "../genre/loadGenreTemplatePack";
import {
  getHookPlanFromPlan,
  getPeakLedgerFromPlan,
  type HookPlan,
  type PeakLedgerEntry,
} from "../design/extractPeakLedger";
import { exampleIntentsFromPeaks, getShotDesignIntentsFromPlan } from "../design/shotDesignIntent";
import { compileDoctrineBriefLines, getViralPrefs, loadViralRhythmContract } from "../design/viralDoctrine";

export type DesignThinkingDim = {
  principles?: string[];
  mustDo?: string[];
  forbidden?: string[];
  examples?: string[];
  mustEmit?: string[];
};

export type DesignThinking = {
  dimensions?: Record<string, DesignThinkingDim>;
  peakHookGuidance?: {
    truePeakForms?: string[];
    falsePeakLabels?: string[];
    hookTypes?: string[];
    empathyThreeBeat?: string[];
    infoGapRules?: string[];
  };
  durationNormLines?: string[];
};

export type StageOutputTemplate = {
  mustEmit?: string[];
  writingSteps?: string[];
  forbid?: string[];
};

export type ViralWritingContext = {
  packId: string;
  stageId: string;
  constraintBlock: string;
  stageBrief: string;
  peakLedger: PeakLedgerEntry[];
  hookPlan?: HookPlan;
  durationNormLines: string[];
  designThinkingSummary: string;
  shotIntentExamples: ReturnType<typeof exampleIntentsFromPeaks>;
  existingShotIntents: ReturnType<typeof getShotDesignIntentsFromPlan>;
  reconstructionExamples: ReconstructionExample[];
  agentInjectBlock: string;
  derivations: ViralDerivation[];
  literaryStale?: boolean;
  ctaHint: string;
};

type DurationNorms = {
  briefLines?: string[];
  dialogueShot?: { speechRateCps?: number; emotionHoldSec?: number };
};

function durationLines(): string[] {
  const d = readFixtureJson<DurationNorms>("duration_norms.json", { briefLines: [] });
  const lines = [...(d.briefLines ?? [])];
  const cps = d.dialogueShot?.speechRateCps;
  const hold = d.dialogueShot?.emotionHoldSec;
  if (cps) {
    lines.unshift(
      `口型预算 SSOT：speechRateCps=${cps}` +
        (hold != null ? `；emotionHoldSec=${hold}` : "") +
        "（与 resolveRequiredDuration / meta.pillarsDurationV2 对齐）",
    );
  }
  return lines;
}

function dimBlock(label: string, dim?: DesignThinkingDim): string {
  if (!dim) return "";
  const lines = [`【${label}】`];
  if (dim.principles?.length) lines.push(`原则：${dim.principles.join("；")}`);
  if (dim.mustDo?.length) lines.push(`必做：${dim.mustDo.join("；")}`);
  if (dim.forbidden?.length) lines.push(`禁做：${dim.forbidden.join("；")}`);
  if (dim.examples?.length) lines.push(`范例：${dim.examples.slice(0, 2).join("；")}`);
  if (dim.mustEmit?.length) lines.push(`mustEmit：${dim.mustEmit.join(", ")}`);
  return lines.join("\n");
}

export function getDesignThinking(pack: GenreTemplatePack): DesignThinking {
  return (pack.designThinking as DesignThinking) || {};
}

export function getStageTemplate(pack: GenreTemplatePack, stageId: string): StageOutputTemplate {
  const templates = (pack.stageOutputTemplates as Record<string, StageOutputTemplate>) || {};
  return templates[stageId] || templates.W3 || {};
}

/** Per-stage writing brief from pack designThinking + peaks/hooks + duration */
export function compileStageWritingBrief(
  packId: string,
  stageId: string,
  opts?: {
    peakLedger?: PeakLedgerEntry[];
    hookPlan?: HookPlan;
    derivations?: ViralDerivation[];
  },
): string {
  const pack = loadGenreTemplatePack(packId);
  const dt = getDesignThinking(pack);
  const stage = getStageTemplate(pack, stageId);
  const peaks = opts?.peakLedger ?? [];
  const hook = opts?.hookPlan;
  const lines: string[] = [
    `【爆款写作 brief · ${pack.label} · ${stageId}】`,
    pack.adaptationPrompts?.short || "",
  ];

  const doctrine = loadViralRhythmContract().briefLines ?? [];
  if (doctrine.length) {
    lines.push("【产品铁律】");
    for (const d of doctrine) lines.push(d);
  }

  if (stage.writingSteps?.length) {
    lines.push("【本阶段步骤】");
    stage.writingSteps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  if (stage.mustEmit?.length) {
    lines.push(`【mustEmit】${stage.mustEmit.join(", ")}`);
  }
  if (stage.forbid?.length) {
    lines.push(`【禁】${stage.forbid.join("；")}`);
  }

  const recon = (pack.reconstructionExamples ?? []) as ReconstructionExample[];
  if (recon.length) {
    lines.push("【改编重构示范 原→改】（先展示再按示例重构；景别/秒数只进 sidecar 禁正文括注）");
    for (const ex of recon.slice(0, 2)) {
      lines.push(`- [${ex.id}] ${ex.from}`);
      lines.push(`  → ${ex.to}`);
      if (ex.why) lines.push(`  为何：${ex.why}`);
      if (ex.emotionTask) lines.push(`  情绪任务：${ex.emotionTask}`);
      if (ex.weaponId) lines.push(`  视听配方 weaponId=${ex.weaponId}（W3 sidecar 挂载，不进正文）`);
      if (ex.paypointHint) lines.push(`  付费卡：${ex.paypointHint}`);
    }
  }

  const parabola = pack.emotionParabola;
  if (parabola && Object.keys(parabola).length) {
    lines.push("【情绪抛物线 起承转合】");
    lines.push(`- 0-3s 起：${parabola.s0_3 || ""}`);
    lines.push(`- 3-8s 承：${parabola.s3_8 || ""}`);
    lines.push(`- 8-12s 转：${parabola.s8_12 || ""}`);
    lines.push(`- 12-15s 合/钩：${parabola.s12_15 || ""}`);
    lines.push("- 对齐留存 3-15-45：3s情绪冲击 / 15s第一次变化 / 45s强期待");
  }

  const dims = dt.dimensions ?? {};
  for (const [k, v] of Object.entries(dims)) {
    const block = dimBlock(k, v);
    if (block) lines.push(block);
  }

  const ph = dt.peakHookGuidance;
  if (ph) {
    lines.push("【视听爆点/钩子】");
    if (ph.truePeakForms?.length) lines.push(`真爆点形态：${ph.truePeakForms.join(" / ")}`);
    if (ph.falsePeakLabels?.length) lines.push(`假爆点禁标：${ph.falsePeakLabels.join(" / ")}`);
    if (ph.empathyThreeBeat?.length) lines.push(`共鸣三拍：${ph.empathyThreeBeat.join("→")}`);
    if (ph.infoGapRules?.length) lines.push(`有效信息：${ph.infoGapRules.join("；")}`);
  }

  const dur = dt.durationNormLines?.length ? dt.durationNormLines : durationLines();
  if (dur.length) {
    lines.push("【时长规范】");
    for (const d of dur) lines.push(`- ${d}`);
  }

  if (peaks.length) {
    lines.push("【本剧 peakLedger（须兑现）】");
    for (const p of peaks.slice(0, 6)) {
      lines.push(
        `- ${p.peakId}: ${p.avForm} | ${p.emotionType} | 视=${p.avPayload.visual} 声=${p.avPayload.audio} | ${p.retainRole}`,
      );
    }
  }
  if (hook?.opening) {
    lines.push("【hookPlan】");
    lines.push(
      `- 开场(${hook.opening.suggestedDurationSec}s): ${hook.opening.hookType} | 视=${hook.opening.visualBeat} | 声=${hook.opening.audioBeat} | ${hook.opening.shootableDelta || ""}`,
    );
    if (hook.mid) {
      lines.push(
        `- 中段: ${hook.mid.hookType} | 视=${hook.mid.visualBeat} | ${hook.mid.shootableDelta || ""}`,
      );
    }
    if (hook.end) {
      lines.push(
        `- 集末: ${hook.end.hookType} | 视=${hook.end.visualBeat} | ${hook.end.shootableDelta || ""}`,
      );
    }
    if (hook.empathyThreeBeat?.length) {
      lines.push(`- 共鸣：${hook.empathyThreeBeat.join("→")}`);
    }
    if (hook.retention31545) {
      lines.push(
        `- 留存3-15-45：3s=${hook.retention31545.s3}；15s=${hook.retention31545.s15}；45s=${hook.retention31545.s45}`,
      );
    }
  }

  const pay = hook?.paypointIntent;
  const payHints = (pack.storyFormula?.paypointHints as string[] | undefined) ?? [];
  lines.push("【付费卡点意图】");
  if (pay?.cutBeforeBeat) {
    lines.push(`- 切断前一拍：${pay.cutBeforeBeat}`);
    if (pay.episodeHint) lines.push(`- ${pay.episodeHint}`);
    if (pay.visualFreeze) lines.push(`- 定格画面：${pay.visualFreeze}`);
    if (pay.audioTail) lines.push(`- 声音收尾：${pay.audioTail}`);
  } else if (payHints.length || recon[0]?.paypointHint) {
    lines.push(`- 切断前一拍：${recon[0]?.paypointHint || payHints[0]}`);
    if (payHints.length) lines.push(`- 卡点参考：${payHints.join(" / ")}`);
  } else {
    lines.push("- 高潮兑现前一拍硬切；集末钩定格3s");
  }

  const ders = (opts?.derivations ?? []).filter((d) => d.active !== false).slice(0, 5);
  if (ders.length) {
    lines.push("【本剧衍生爆点/钩子】");
    for (const d of ders) lines.push(`- ${d.text}`);
  }

  if (stageId === "W3" || stageId === "designBrief" || stageId === "SB" || stageId === "P06") {
    lines.push(
      "【分镜设计意图 sidecar】须填 shotDesignIntent[]：purpose/emotionGoal/picture/shotSizeIntent/cutIntent/audioIntent/durationSec/peakId|hookId|weaponId；禁写入正文括注。SB 只执行同一意图，禁止重发明爆点。",
    );
  }

  if (stageId === "P06" || stageId === "W1") {
    lines.push(
      "【Chat 强制】先向用户展示 1 条「原→改」示范，再按示范重构 storyCore/骨架；changeLog 必须写清假爆点→真视听钩。",
    );
  }

  return lines.filter(Boolean).join("\n");
}

/** Compact block for Agent system/assistant injection */
export function buildViralAgentInjectBlock(ctx: ViralWritingContext): string {
  return [
    "## 爆款正向指导（自动注入）",
    "指令：台词/独白主推故事；视听辅助不单调；直白给信息不猜；ep1 硬规范、后集抓因果；先展示 1 条【原→改】再重构；景别运镜秒数只进 sidecar。",
    ctx.stageBrief,
    ctx.ctaHint ? `CTA：${ctx.ctaHint}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function compileViralWritingContext(
  plan: Record<string, unknown>,
  stageId = "W3",
): ViralWritingContext {
  const gt = getGenreTemplateFromPlan(plan);
  const pack = loadGenreTemplatePack(gt.packId);
  const peaks = getPeakLedgerFromPlan(plan);
  const hook = getHookPlanFromPlan(plan);
  const ders = getViralDerivations(plan);
  const prefs = getViralPrefs(plan);
  let stageBrief = compileStageWritingBrief(gt.packId, stageId, {
    peakLedger: peaks,
    hookPlan: hook,
    derivations: ders,
  });
  const doctrineExtra = compileDoctrineBriefLines(plan);
  if (doctrineExtra.length) {
    stageBrief = `${stageBrief}\n\n【本剧偏好/分集】\n${doctrineExtra.join("\n")}`;
  }
  const constraintBlock = compileAdaptationConstraintBlock(gt.packId, { derivations: ders });
  const dt = getDesignThinking(pack);
  const designThinkingSummary = [
    pack.label,
    prefs.audienceTaste || "",
    prefs.storyStyle || "",
    dt.peakHookGuidance?.truePeakForms?.slice(0, 3).join("/") || "",
    (pack.storyFormula?.empathyBeats as string[] | undefined)?.join("→") || "",
  ]
    .filter(Boolean)
    .join(" · ");

  const ctx: ViralWritingContext = {
    packId: gt.packId,
    stageId,
    constraintBlock,
    stageBrief,
    peakLedger: peaks,
    hookPlan: hook,
    durationNormLines: dt.durationNormLines?.length ? dt.durationNormLines : durationLines(),
    designThinkingSummary,
    shotIntentExamples: exampleIntentsFromPeaks(
      peaks,
      pack.shotFormula?.shotSizeBias ?? ["近景"],
      {
        weaponId: pack.reconstructionExamples?.[0]?.weaponId || pack.weapons?.[0],
        sceneRecipeId: pack.reconstructionExamples?.[0]?.sceneRecipeId || pack.sceneRecipes?.[0]?.id,
      },
    ),
    existingShotIntents: getShotDesignIntentsFromPlan(plan),
    reconstructionExamples: pack.reconstructionExamples ?? [],
    agentInjectBlock: "",
    derivations: ders,
    literaryStale: gt.literaryStale,
    ctaHint: gt.literaryStale ? "请按新规范重设计" : "按设计思路补全",
  };
  ctx.agentInjectBlock = buildViralAgentInjectBlock(ctx);
  return ctx;
}

/** Template fill score for exit gate */
export function scoreTemplateFill(plan: Record<string, unknown>, stageId: string): {
  ok: boolean;
  missing: string[];
  ratio: number;
} {
  const gt = getGenreTemplateFromPlan(plan);
  const pack = loadGenreTemplatePack(gt.packId);
  const must = getStageTemplate(pack, stageId).mustEmit ?? [];
  if (!must.length) return { ok: true, missing: [], ratio: 1 };

  const pd = (plan.planData as Record<string, unknown>) ?? {};
  const peaks = getPeakLedgerFromPlan(plan);
  const hook = getHookPlanFromPlan(plan);
  const intents = getShotDesignIntentsFromPlan(plan);
  const missing: string[] = [];

  for (const key of must) {
    switch (key) {
      case "peakLedger":
        if (!peaks.length) missing.push(key);
        break;
      case "hookPlan":
      case "openingHook":
        if (!hook?.opening?.visualBeat) missing.push(key);
        break;
      case "shotDesignIntent":
        if (!intents.length) missing.push(key);
        break;
      case "sceneAvTags":
        if (!pd.sceneAvTags && !(pd.sceneMeta as unknown[])?.length) missing.push(key);
        break;
      case "genreTemplate":
        if (!gt.packId) missing.push(key);
        break;
      case "empathyBeats":
        if (!hook?.empathyThreeBeat?.length) missing.push(key);
        break;
      case "paypointIntent":
        if (!hook?.paypointIntent?.cutBeforeBeat) missing.push(key);
        break;
      case "changeLogFakeToTrue":
      case "reconstructionTrace":
        if (!(pd.changeLog || pd.reconstructionTrace)) missing.push(key);
        break;
      case "scriptItem":
        if (!pd.script && !plan.script) missing.push(key);
        break;
      case "peakPlacement":
        if (!peaks.length) missing.push(key);
        break;
      default:
        break;
    }
  }
  const ratio = must.length ? (must.length - missing.length) / must.length : 1;
  return { ok: missing.length === 0, missing, ratio };
}

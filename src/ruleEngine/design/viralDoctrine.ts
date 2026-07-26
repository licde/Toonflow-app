/**
 * Viral product doctrine + literary lock / cascade helpers.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { getGenreTemplateFromPlan, setGenreTemplateOnPlan } from "../genre/loadGenreTemplatePack";

export type ViralRhythmContract = {
  version?: string;
  doctrine?: {
    primaryDrive?: string[];
    avRole?: string;
    delivery?: string;
    forbidAudienceMeta?: string[];
    forbidTechParentheticalsInLiterary?: boolean;
    usefulInfo?: string;
  };
  hardNorms?: {
    episodeScope?: string;
    usefulInfoInFirst30sMax?: number;
  };
  causalNorms?: { everyEpisode?: boolean; forbidFullEp1ChecklistOnEpN?: boolean };
  avAssist?: { everyEpisode?: string; neverReplacePrimaryInfo?: boolean };
  audienceTaste?: string[];
  storyStyle?: string[];
  platformProfiles?: Record<string, { label?: string; paypointDensity?: string; endHookRequired?: boolean }>;
  wordBudget?: { charsPerSecondSpeak?: number; maxSpeakRatioOfEpisode?: number };
  heal?: { maxRounds?: number; preferLocalBeforeReverse?: boolean; requireUserConfirmOnStoryRecon?: boolean };
  briefLines?: string[];
};

export type ViralPrefs = {
  audienceTaste?: string;
  storyStyle?: string;
  platformProfileId?: string;
  episodeDurationSec?: number;
  literaryLocked?: boolean;
  literaryLockedAt?: number;
  pendingStoryRecon?: Record<string, unknown>;
};

let contractCache: ViralRhythmContract | null = null;

export function loadViralRhythmContract(): ViralRhythmContract {
  if (contractCache) return contractCache;
  contractCache = readFixtureJson<ViralRhythmContract>("viral_rhythm_contract.json", {
    briefLines: [],
    doctrine: {},
    hardNorms: { episodeScope: "ep1", usefulInfoInFirst30sMax: 1 },
    heal: { maxRounds: 3 },
  });
  return contractCache;
}

export function clearViralRhythmContractCache(): void {
  contractCache = null;
}

function asPd(plan: Record<string, unknown>): Record<string, unknown> {
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  return plan.planData as Record<string, unknown>;
}

export function getViralPrefs(plan: Record<string, unknown>): ViralPrefs {
  const pd = asPd(plan);
  return (pd.viralPrefs as ViralPrefs) ?? {};
}

export function setViralPrefs(plan: Record<string, unknown>, patch: Partial<ViralPrefs>): ViralPrefs {
  const pd = asPd(plan);
  const next = { ...getViralPrefs(plan), ...patch };
  pd.viralPrefs = next;
  plan.planData = pd;
  return next;
}

export function isLiteraryLocked(plan: Record<string, unknown>): boolean {
  return Boolean(getViralPrefs(plan).literaryLocked);
}

export function setLiteraryLocked(plan: Record<string, unknown>, locked: boolean): void {
  setViralPrefs(plan, {
    literaryLocked: locked,
    literaryLockedAt: locked ? Date.now() : undefined,
  });
}

export function assertMayRewriteLiterary(plan: Record<string, unknown>): { ok: boolean; reason?: string } {
  if (isLiteraryLocked(plan)) {
    return { ok: false, reason: "literaryLocked：锁稿后禁止机器改正文；请先人工解锁" };
  }
  return { ok: true };
}

/** Episode index from plan (1-based). Default ep1 for design-time single-ep. */
export function getEpisodeIndex(plan: Record<string, unknown>): number {
  const pd = asPd(plan);
  const n = Number(pd.episodeIndex ?? pd.currentEpisode ?? plan.episodeIndex ?? 1);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export function isEp1HardNormScope(plan: Record<string, unknown>): boolean {
  const c = loadViralRhythmContract();
  if ((c.hardNorms?.episodeScope || "ep1") === "ep1") return getEpisodeIndex(plan) === 1;
  return true;
}

export function compileDoctrineBriefLines(plan?: Record<string, unknown>): string[] {
  const c = loadViralRhythmContract();
  const lines = [...(c.briefLines ?? [])];
  if (plan) {
    const prefs = getViralPrefs(plan);
    if (prefs.audienceTaste) lines.push(`【观众口味】${prefs.audienceTaste}`);
    if (prefs.storyStyle) lines.push(`【故事风格】${prefs.storyStyle}`);
    if (prefs.platformProfileId) {
      const p = c.platformProfiles?.[prefs.platformProfileId];
      lines.push(`【平台】${p?.label || prefs.platformProfileId} · 付费密度=${p?.paypointDensity || "?"}`);
    }
    const ep = getEpisodeIndex(plan);
    if (ep === 1) lines.push("【本集】ep1 — 套用硬规范全清单");
    else lines.push(`【本集】ep${ep} — 只检因果连续+轻视听，不通篇套 30s 硬清单`);
    if (prefs.literaryLocked) lines.push("【锁稿】literaryLocked=true，禁止改台词原文");
  }
  return lines;
}

export function wordBudgetChars(plan: Record<string, unknown>): number {
  const c = loadViralRhythmContract();
  const prefs = getViralPrefs(plan);
  const dur = prefs.episodeDurationSec ?? 90;
  const cps = c.wordBudget?.charsPerSecondSpeak ?? 3.5;
  const ratio = c.wordBudget?.maxSpeakRatioOfEpisode ?? 0.55;
  return Math.floor(dur * cps * ratio);
}

const AUDIENCE_META_RE = /观众感到|观众觉得|弹幕会|让观众|用户感觉|观众会/;

export function hasAudienceMeta(text: string): boolean {
  return AUDIENCE_META_RE.test(text);
}

const TECH_PAREN_RE = /[（(][^）)]{0,40}(?:全景|近景|特写|中景|缓推|快推|固定|运镜|\d+\s*s|\d+秒)[^）)]*[）)]/g;

export function stripTechParentheticals(text: string): { text: string; stripped: string[] } {
  const stripped: string[] = [];
  const next = text.replace(TECH_PAREN_RE, (m) => {
    stripped.push(m);
    return "";
  });
  return { text: next.replace(/\s{2,}/g, " ").trim(), stripped };
}

export type CascadeResult = {
  literaryStale: boolean;
  invalidatedSteps: string[];
  message: string;
};

/** After P06 / reverse story recon: stale literary + invalidate downstream steps. */
export function cascadeAfterStoryRecon(plan: Record<string, unknown>, reason: string): CascadeResult {
  const gt = getGenreTemplateFromPlan(plan);
  setGenreTemplateOnPlan(plan, {
    packId: gt.packId,
    literaryStale: true,
    markStale: true,
  });
  const pd = asPd(plan);
  const g = (pd.genreTemplate as { literaryStale?: boolean; structureStale?: boolean }) ?? {};
  g.literaryStale = true;
  g.structureStale = true;
  pd.genreTemplate = g;

  const invalidate = ["W1", "W2", "W3", "W3_script", "W3_selfcheck", "designBrief", "GB", "SB"];
  let stepStatus: Record<string, { status: string; completedAt?: number; weakPath?: boolean; stale?: boolean }> = {};
  try {
    stepStatus = JSON.parse(String(plan._stepStatus ?? "{}"));
  } catch {
    stepStatus = {};
  }
  const invalidatedSteps: string[] = [];
  for (const id of invalidate) {
    if (stepStatus[id]) {
      stepStatus[id] = { ...stepStatus[id], status: "pending", stale: true };
      invalidatedSteps.push(id);
    }
  }
  plan._stepStatus = JSON.stringify(stepStatus);

  pd.literaryStaleReason = { reason, at: Date.now() };
  if (pd.episodeScripts && typeof pd.episodeScripts === "object") {
    const eps = pd.episodeScripts as Record<string, unknown>;
    for (const k of Object.keys(eps)) {
      if (k !== "1" && k !== "ep1") delete eps[k];
    }
  }
  plan.planData = pd;

  // Unlock so redesign can rewrite literary fields
  try {
    const { unlockLiteraryForRedesign } = require("./redesignContract") as typeof import("./redesignContract");
    unlockLiteraryForRedesign(plan);
  } catch {
    setLiteraryLocked(plan, false);
  }

  return {
    literaryStale: true,
    invalidatedSteps,
    message: "公式已更换，请按新规范重设计。",
  };
}

/** Clear literary/structure stale after redesignPass (W3) — never on W1 done alone. */
export function clearLiteraryStale(plan: Record<string, unknown>): void {
  const pd = asPd(plan);
  const gt = getGenreTemplateFromPlan(plan);
  const next = setGenreTemplateOnPlan(plan, {
    packId: gt.packId,
    adaptationDepth: gt.adaptationDepth,
    provisional: gt.provisional,
    markStale: false,
    literaryStale: false,
  });
  next.literaryStale = false;
  next.structureStale = false;
  pd.genreTemplate = next;
  const en = (pd.emotionNorm as { structureStale?: boolean } | undefined) ?? {};
  en.structureStale = false;
  pd.emotionNorm = en;
  plan._emotionNorm = en;
  delete pd.literaryStaleReason;
  plan.planData = pd;
}

/** Short user-facing copy (no internal W1/stale mechanics). */
export const LITERARY_STALE_USER_MESSAGE = "公式已更换，请按新规范重设计。";

export const LITERARY_STALE_OPTIONS = [
  { id: "redesign", label: "按新规范重设计", primary: true },
  { id: "keepLegacy", label: "保留旧稿继续补洞" },
] as const;

export function literaryStaleBlocksExit(plan: Record<string, unknown>, stageId: string): boolean {
  const gt = getGenreTemplateFromPlan(plan);
  if (!gt.literaryStale) return false;
  // W1 is redesign entry — allowed while stale; debt clears only after W3 redesignPass
  return ["W2", "W3", "designBrief", "GB", "SB"].includes(stageId);
}

/** Read literaryStale from ScriptBundle / planData. */
export function isBundleLiteraryStale(bundle: {
  planData?: unknown;
  genreTemplate?: { literaryStale?: boolean; structureStale?: boolean };
}): boolean {
  const pd = (bundle.planData ?? {}) as {
    genreTemplate?: { literaryStale?: boolean; structureStale?: boolean };
  };
  const gt = pd.genreTemplate ?? bundle.genreTemplate;
  return Boolean(gt?.literaryStale || gt?.structureStale);
}

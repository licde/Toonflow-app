/**
 * Shot design intent — sidecar only (never literary parentheticals).
 */
import { getPeakLedgerFromPlan, getHookPlanFromPlan } from "./extractPeakLedger";
import { getGenreTemplateFromPlan, loadGenreTemplatePack } from "../genre/loadGenreTemplatePack";

export type ShotDesignPurpose = "爆点兑现" | "钩子" | "共鸣" | "信息" | "反应" | string;

export type ShotDesignIntent = {
  intentId?: string;
  sceneRef?: number | string;
  purpose: ShotDesignPurpose;
  emotionGoal: string;
  picture: string;
  shotSizeIntent: string;
  cutIntent: string;
  audioIntent: string;
  durationSec: number;
  peakId?: string;
  hookId?: string;
  /** 手册武器/场景配方，仅 sidecar */
  weaponId?: string;
  sceneRecipeId?: string;
  sfxIntent?: string[];
  /** VisBeat L0 — controlled vocab tags */
  visualBeatTags?: string[];
};

export function validateShotDesignIntents(list: ShotDesignIntent[] | undefined): {
  ok: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (!Array.isArray(list) || list.length === 0) {
    reasons.push("shotDesignIntent 为空");
    return { ok: false, reasons };
  }
  for (const s of list) {
    if (!s.purpose) reasons.push("缺 purpose");
    if (!s.picture) reasons.push("缺 picture");
    if (!s.shotSizeIntent) reasons.push("缺 shotSizeIntent");
    if (!(s.durationSec > 0)) reasons.push("缺 durationSec");
    if (!s.peakId && !s.hookId && (s.purpose === "爆点兑现" || s.purpose === "钩子")) {
      reasons.push(`${s.intentId || s.picture} 爆点/钩子须回溯 peakId/hookId`);
    }
  }
  return { ok: reasons.length === 0, reasons };
}

export function getShotDesignIntentsFromPlan(plan: Record<string, unknown>): ShotDesignIntent[] {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  const nb = pd.narrativeBrief as { shotDesignIntent?: ShotDesignIntent[] } | undefined;
  const raw =
    (pd.shotDesignIntent as ShotDesignIntent[] | undefined) ??
    nb?.shotDesignIntent ??
    (plan.shotDesignIntent as ShotDesignIntent[] | undefined);
  return Array.isArray(raw) ? raw : [];
}

/** Example intents from pack + peak for brief templates */
export function exampleIntentsFromPeaks(
  peaks: { peakId: string; avForm: string; avPayload: { visual: string; audio: string }; emotionType: string }[],
  shotSizeBias: string[],
  opts?: { weaponId?: string; sceneRecipeId?: string; openingHookId?: string },
): ShotDesignIntent[] {
  return peaks.slice(0, 3).map((p, i) => ({
    intentId: `intent-${i + 1}`,
    purpose: i === 0 ? "钩子" : "爆点兑现",
    emotionGoal: p.emotionType,
    picture: p.avPayload.visual || p.avForm,
    shotSizeIntent: shotSizeBias[0] || "近景",
    cutIntent: i === 0 ? "开场强刺激切入" : opts?.weaponId === "five_cut_reveal" ? `五刀第${Math.min(i + 1, 5)}刀` : "动作势能接",
    audioIntent: p.avPayload.audio,
    durationSec: i === 0 ? 1.2 : 1.5,
    peakId: p.peakId,
    hookId: i === 0 ? opts?.openingHookId || "hook-opening" : undefined,
    weaponId: opts?.weaponId,
    sceneRecipeId: opts?.sceneRecipeId,
    sfxIntent: [p.avPayload.audio].filter(Boolean),
  }));
}

/**
 * High-confidence sidecar ensure: empty→from peaks; patch incomplete; hang opening hookId.
 * Writes authoritative planData.shotDesignIntent (sidecar — safe under literaryLocked).
 */
export function ensureShotDesignIntentsFromPeaks(plan: Record<string, unknown>): {
  applied: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  plan.planData = pd;
  const peaks = getPeakLedgerFromPlan(plan).filter((p) => !p.rejectedAsFalsePeak);
  const hook = getHookPlanFromPlan(plan);
  const openingHookId = hook?.opening?.hookId || (hook?.opening ? "hook-opening" : undefined);
  const gt = getGenreTemplateFromPlan(plan);
  const pack = loadGenreTemplatePack(gt.packId);
  const bias = pack.shotFormula?.shotSizeBias ?? ["近景"];
  const weaponId = pack.weapons?.[0];

  let intents = [...getShotDesignIntentsFromPlan(plan)];
  let applied = false;

  if (!intents.length) {
    if (!peaks.length) {
      reasons.push("no_peaks_to_derive");
      return { applied: false, reasons };
    }
    intents = exampleIntentsFromPeaks(peaks, bias, { weaponId, openingHookId });
    applied = true;
    reasons.push(`generated_from_peaks:${intents.length}`);
  } else {
    intents = intents.map((raw, i) => {
      const s = { ...raw };
      const peak = peaks.find((p) => p.peakId === s.peakId) ?? peaks[Math.min(i, peaks.length - 1)];
      if (!s.purpose) {
        s.purpose = i === 0 ? "钩子" : "爆点兑现";
        applied = true;
      }
      if (!s.picture && peak) {
        s.picture = peak.avPayload?.visual || peak.avForm || "可拍画面";
        applied = true;
      }
      if (!s.shotSizeIntent) {
        s.shotSizeIntent = bias[0] || "近景";
        applied = true;
      }
      if (!s.emotionGoal && peak) {
        s.emotionGoal = peak.emotionType || "冲击";
        applied = true;
      }
      if (!s.cutIntent) {
        s.cutIntent = i === 0 ? "开场强刺激切入" : "动作势能接";
        applied = true;
      }
      if (!s.audioIntent && peak) {
        s.audioIntent = peak.avPayload?.audio || "冲击音效";
        applied = true;
      }
      if (!(Number(s.durationSec) > 0)) {
        s.durationSec = i === 0 ? 1.2 : 1.5;
        applied = true;
      }
      if (
        (s.purpose === "爆点兑现" || s.purpose === "钩子") &&
        !s.peakId &&
        !s.hookId &&
        peak
      ) {
        s.peakId = peak.peakId;
        if (s.purpose === "钩子" && openingHookId) s.hookId = openingHookId;
        applied = true;
      }
      return s;
    });
    if (applied) reasons.push("patched_incomplete_fields");
  }

  if (openingHookId && !intents.some((s) => s.hookId === openingHookId)) {
    if (intents[0]) {
      intents[0] = { ...intents[0], hookId: openingHookId, purpose: intents[0].purpose || "钩子" };
      applied = true;
      reasons.push(`hung_opening_hook:${openingHookId}`);
    } else if (peaks.length) {
      intents = exampleIntentsFromPeaks(peaks, bias, { weaponId, openingHookId });
      applied = true;
      reasons.push(`regen_for_hook:${openingHookId}`);
    }
  }

  if (applied) {
    pd.shotDesignIntent = intents;
    plan.planData = pd;
  }
  return { applied, reasons };
}

/** Collect SFX intent list for designBrief/SB bridge */
export function collectSfxIntentList(intents: ShotDesignIntent[]): string[] {
  const out: string[] = [];
  for (const s of intents) {
    if (s.audioIntent) out.push(s.audioIntent);
    for (const x of s.sfxIntent ?? []) out.push(x);
  }
  return [...new Set(out.filter(Boolean))];
}

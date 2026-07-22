/**
 * Shot design intent — sidecar only (never literary parentheticals).
 */
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
  opts?: { weaponId?: string; sceneRecipeId?: string },
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
    hookId: i === 0 ? "hook-opening" : undefined,
    weaponId: opts?.weaponId,
    sceneRecipeId: opts?.sceneRecipeId,
    sfxIntent: [p.avPayload.audio].filter(Boolean),
  }));
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

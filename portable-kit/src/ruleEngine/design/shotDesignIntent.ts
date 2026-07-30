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

/** INTENT_PIC_SYNC — picture ↔ VD must share core nouns (not exact string). */
export function auditIntentPictureSync(input: {
  intents: ShotDesignIntent[];
  shots: { shotIndex?: number; visualDescription?: string | null }[];
}): { ok: boolean; findings: { id: string; severity: "BLOCK" | "WARN"; message: string; shotIndex?: number }[] } {
  const findings: { id: string; severity: "BLOCK" | "WARN"; message: string; shotIndex?: number }[] = [];
  for (const intent of input.intents) {
    const idx = Number((intent as { shotIndex?: number }).shotIndex ?? intent.sceneRef) || 0;
    const shot =
      input.shots.find((s) => Number(s.shotIndex) === idx) ||
      (idx > 0 ? input.shots[idx - 1] : undefined);
    const vd = String(shot?.visualDescription ?? "").trim();
    const pic = String(intent.picture ?? "").trim();
    if (!pic || !vd) continue;
    const picTokens = pic.match(/[\u4e00-\u9fff]{2,}/g)?.slice(0, 6) ?? [];
    const hit = picTokens.filter((t) => vd.includes(t)).length;
    if (picTokens.length >= 2 && hit < 1) {
      findings.push({
        id: "DEX-INTENT-PIC",
        severity: "BLOCK",
        message: `镜${idx || "?"} intent.picture 与 VD 不同核`,
        shotIndex: idx || undefined,
      });
    }
  }
  return { ok: findings.length === 0, findings };
}

/** INTENT_DECAY — VD hash changed after sidecar stamped → must re-sync. */
export function auditShotIntentDecay(input: {
  intents: ShotDesignIntent[];
  shots: { shotIndex?: number; visualDescription?: string | null; intentVdHash?: string | null }[];
}): { ok: boolean; findings: { id: string; severity: "BLOCK" | "WARN"; message: string; shotIndex?: number }[] } {
  const findings: { id: string; severity: "BLOCK" | "WARN"; message: string; shotIndex?: number }[] = [];
  const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return String(h);
  };
  for (const shot of input.shots) {
    const vd = String(shot.visualDescription ?? "").trim();
    if (!vd) continue;
    const stamped = String(shot.intentVdHash ?? "").trim();
    if (!stamped) continue;
    const now = hash(vd);
    if (stamped !== now) {
      findings.push({
        id: "DEX-SHOT-INTENT",
        severity: "BLOCK",
        message: `镜${shot.shotIndex ?? "?"} VD 变更后 sidecar 过期（shot_intent_decay）`,
        shotIndex: shot.shotIndex,
      });
    }
  }
  return { ok: findings.length === 0, findings };
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
 * High-confidence sidecar ensure: empty→from peaks; else from shots (VD+duration);
 * patch incomplete; hang opening hookId.
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

  const shots = (
    (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ??
    (plan.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ??
    []
  ) as Record<string, unknown>[];

  let intents = [...getShotDesignIntentsFromPlan(plan)];
  let applied = false;

  if (!intents.length) {
    if (peaks.length) {
      intents = exampleIntentsFromPeaks(peaks, bias, { weaponId, openingHookId });
      applied = true;
      reasons.push(`generated_from_peaks:${intents.length}`);
    } else if (shots.length) {
      // Import/homology: no peak ledger → derive sidecar from shot VD + duration (purpose=信息, no fake peak)
      intents = shots.map((s, i) => {
        const idx = Number(s.shotIndex) || i + 1;
        const vd = String(s.visualDescription ?? "").trim();
        const dur = Number(s.duration ?? (s.narrative as { duration?: number } | undefined)?.duration) || 3;
        const sz = String(
          s.shotSize ??
            (s.narrative as { shotSize?: string } | undefined)?.shotSize ??
            bias[0] ??
            "近景",
        );
        return {
          intentId: `intent-shot-${idx}`,
          shotIndex: idx,
          purpose: "信息" as ShotDesignPurpose,
          emotionGoal: String(s.emotion ?? "叙事"),
          picture: vd.slice(0, 120) || `镜${idx}可拍画面`,
          shotSizeIntent: sz,
          cutIntent: "叙事切",
          audioIntent: "环境/对白同步",
          durationSec: dur > 0 ? dur : 3,
        } as ShotDesignIntent;
      });
      applied = true;
      reasons.push(`generated_from_shots:${intents.length}`);
    } else {
      reasons.push("no_peaks_or_shots_to_derive");
      return { applied: false, reasons };
    }
  } else {
    intents = intents.map((raw, i) => {
      const s = { ...raw };
      const peak = peaks.find((p) => p.peakId === s.peakId) ?? peaks[Math.min(i, peaks.length - 1)];
      const shot =
        shots.find((x) => Number(x.shotIndex) === Number((s as { shotIndex?: number }).shotIndex)) ??
        shots[i];
      const vd = shot ? String(shot.visualDescription ?? "").trim() : "";
      if (!s.purpose) {
        s.purpose = peak ? (i === 0 ? "钩子" : "爆点兑现") : "信息";
        applied = true;
      }
      if (!s.picture) {
        if (peak) s.picture = peak.avPayload?.visual || peak.avForm || "可拍画面";
        else if (vd) s.picture = vd.slice(0, 120);
        else s.picture = `镜${i + 1}可拍画面`;
        applied = true;
      }
      if (!s.shotSizeIntent) {
        s.shotSizeIntent =
          (shot && String(shot.shotSize ?? (shot.narrative as { shotSize?: string } | undefined)?.shotSize)) ||
          bias[0] ||
          "近景";
        applied = true;
      }
      if (!s.emotionGoal) {
        s.emotionGoal = peak?.emotionType || String(shot?.emotion ?? "叙事") || "冲击";
        applied = true;
      }
      if (!s.cutIntent) {
        s.cutIntent = peak ? (i === 0 ? "开场强刺激切入" : "动作势能接") : "叙事切";
        applied = true;
      }
      if (!s.audioIntent) {
        s.audioIntent = peak?.avPayload?.audio || "环境/对白同步";
        applied = true;
      }
      if (!(Number(s.durationSec) > 0)) {
        const dur = shot
          ? Number(shot.duration ?? (shot.narrative as { duration?: number } | undefined)?.duration)
          : 0;
        s.durationSec = dur > 0 ? dur : i === 0 ? 1.2 : 1.5;
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
      // 信息类无 peak 不要求 peakId/hookId（validate 仅对爆点/钩子）
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

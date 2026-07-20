/**
 * Audio voice bind gate — dialogue shots may hard-require voiceProfile / bound timbre on HQ.
 */
import { loadAudioLiteraryFidelityConfig } from "../compilers/audioLiteraryFidelityChecklist";
import { collectAudioBindGaps } from "../compilers/audioBindDelivery";
import type { Knex } from "knex";

export interface AudioVoiceBindGateResult {
  ok: boolean;
  hard: boolean;
  reason?: string;
  gaps: Array<{ assetId: number; reason: string }>;
  primaryNextStep?: "chat_repair" | "batch_still";
  userMessage?: string;
  ctaLabel?: string;
}

export async function assertAudioVoiceBindGate(input: {
  db: Knex;
  roleAssetIds: number[];
  hasDialogue: boolean;
  qualityMode?: "hq_update" | "draft" | string | null;
  voiceProfilePresent?: boolean;
}): Promise<AudioVoiceBindGateResult> {
  const cfg = loadAudioLiteraryFidelityConfig();
  if (!input.hasDialogue || cfg.enabled === false) {
    return { ok: true, hard: false, gaps: [] };
  }
  const hq = input.qualityMode === "hq_update" || !input.qualityMode;
  const hard = hq ? cfg.voiceBindHardOnHq !== false : cfg.voiceBindHardOnDraft === true;

  if (!input.voiceProfilePresent && hard) {
    return {
      ok: false,
      hard: true,
      reason: "missing_voice_profile",
      gaps: [],
      primaryNextStep: "chat_repair",
      userMessage: "对白镜缺少 voiceProfile/音色配置，高质量燃片已拦截",
      ctaLabel: "补音色后重试",
    };
  }

  const { gaps } = await collectAudioBindGaps(input.db, input.roleAssetIds);
  if (gaps.length && hard) {
    return {
      ok: false,
      hard: true,
      reason: "audio_bind_gap",
      gaps,
      primaryNextStep: "chat_repair",
      userMessage: `对白角色音色资产缺失：${gaps.map((g) => g.assetId).join(",")}`,
      ctaLabel: "绑定音色资产",
    };
  }
  if (gaps.length) {
    return { ok: true, hard: false, reason: "audio_bind_gap_soft", gaps };
  }
  return { ok: true, hard: false, gaps: [] };
}

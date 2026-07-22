/**
 * Bind viral sidecars into compile/prompt context — SB/still/video must consume intents.
 */
import { getPeakLedgerFromPlan, getHookPlanFromPlan } from "./extractPeakLedger";
import { collectSfxIntentList, getShotDesignIntentsFromPlan, type ShotDesignIntent } from "./shotDesignIntent";

export type ViralSidecarCompileBind = {
  peakLedger: ReturnType<typeof getPeakLedgerFromPlan>;
  hookPlan: ReturnType<typeof getHookPlanFromPlan>;
  shotDesignIntent: ShotDesignIntent[];
  sfxIntentList: string[];
  /** Lines safe to inject into generation prompts (never literary body). */
  promptLines: string[];
  decayed: boolean;
  decayReasons: string[];
};

/**
 * Read plan sidecars for compilers. If intents empty but peaks exist → decayed (RH back to design).
 */
export function bindViralSidecarForCompile(plan: Record<string, unknown>): ViralSidecarCompileBind {
  const peakLedger = getPeakLedgerFromPlan(plan);
  const hookPlan = getHookPlanFromPlan(plan);
  const shotDesignIntent = getShotDesignIntentsFromPlan(plan);
  const sfxIntentList = collectSfxIntentList(shotDesignIntent);
  const decayReasons: string[] = [];
  if (peakLedger.length && !shotDesignIntent.length) {
    decayReasons.push("peak_without_shotDesignIntent");
  }
  if (hookPlan?.opening && !shotDesignIntent.some((i) => i.hookId || i.purpose === "钩子")) {
    decayReasons.push("opening_hook_not_in_intents");
  }

  const promptLines: string[] = [];
  for (const s of shotDesignIntent.slice(0, 8)) {
    promptLines.push(
      `[intent ${s.intentId || ""}] ${s.purpose} | 画面=${s.picture} | 景别=${s.shotSizeIntent} | 剪=${s.cutIntent} | 声=${s.audioIntent} | ${s.durationSec}s` +
        (s.peakId ? ` | peak=${s.peakId}` : "") +
        (s.sfxIntent?.length ? ` | sfx=${s.sfxIntent.join("/")}` : ""),
    );
  }
  if (sfxIntentList.length) {
    promptLines.push(`【音效清单续读】${sfxIntentList.join(" / ")}`);
  }
  if (hookPlan?.paypointIntent?.cutBeforeBeat) {
    promptLines.push(`【付费卡前拍】${hookPlan.paypointIntent.cutBeforeBeat}`);
  }

  return {
    peakLedger,
    hookPlan,
    shotDesignIntent,
    sfxIntentList,
    promptLines,
    decayed: decayReasons.length > 0,
    decayReasons,
  };
}

/** Merge sidecar prompt lines into an existing video/still prompt string. */
export function appendViralSidecarToPrompt(prompt: string, plan: Record<string, unknown>): string {
  const bind = bindViralSidecarForCompile(plan);
  if (!bind.promptLines.length) return prompt;
  return `${prompt}\n\n【设计意图 sidecar 续读·禁重发明爆点】\n${bind.promptLines.join("\n")}`;
}

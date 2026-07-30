/**
 * Viral sidecar bind — compile/prompt context.
 * Per-shot only: never dump episode-first PEAK into another mirror when shotIndex missing/unmatched.
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

export type ViralSidecarBindOpts = {
  /** Current shot index — filter intents to this mirror only */
  shotIndex?: number | null;
  sceneRef?: number | string | null;
  /** Cap intent durationSec to this (本镜 vendor duration) */
  durationCapSec?: number | null;
  /** Max intent lines (default 1 when shot-scoped) */
  maxIntentLines?: number;
  /** Include episode paypoint / allow non-scoped dump — default false; burn must stay false */
  includeEpisodeHooks?: boolean;
};

function intentMatchesShot(s: ShotDesignIntent, shotIndex?: number | null, sceneRef?: number | string | null): boolean {
  // Never match-all when scope missing — caller must not inject
  if (shotIndex == null && (sceneRef == null || sceneRef === "")) return false;
  const explicitShot = (s as { shotIndex?: number }).shotIndex;
  const scene = s.sceneRef;

  if (shotIndex != null) {
    const si = Number(shotIndex);
    // Prefer explicit shotIndex / sceneRef numeric equality — never treat intent-1 as shot 1 when
    // another intent owns sceneRef/shotIndex 1 (that caused 镜2→PEAK-sc1)
    if (explicitShot != null && Number(explicitShot) === si) return true;
    if (scene != null && scene !== "" && Number(scene) === si) return true;
    // Fallback: intent-N only when the intent has no sceneRef/shotIndex of its own
    if (explicitShot == null && (scene == null || scene === "") && s.intentId === `intent-${si}`) {
      return true;
    }
  }
  if (sceneRef != null && sceneRef !== "") {
    const sr = String(sceneRef);
    if (scene != null && String(scene) === sr) return true;
    if (explicitShot != null && String(explicitShot) === sr) return true;
  }
  return false;
}

function cleanField(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s || s === "undefined" || s === "null") return "";
  return s;
}

/** Format one intent line — omit empty/undefined fields; optional duration cap. */
export function formatIntentLine(
  s: ShotDesignIntent,
  opts?: { durationCapSec?: number | null },
): string {
  const bits: string[] = [];
  const id = cleanField(s.intentId);
  bits.push(`[intent ${id}]`.trim());
  const purpose = cleanField(s.purpose);
  if (purpose) bits.push(purpose);
  const fields: string[] = [];
  const picture = cleanField(s.picture);
  if (picture) fields.push(`画面=${picture}`);
  const shotSize = cleanField(s.shotSizeIntent);
  if (shotSize) fields.push(`景别=${shotSize}`);
  const cut = cleanField(s.cutIntent);
  if (cut) fields.push(`剪=${cut}`);
  const audio = cleanField(s.audioIntent);
  if (audio) fields.push(`声=${audio}`);
  let dur = Number(s.durationSec);
  if (Number.isFinite(dur) && dur > 0) {
    const cap = opts?.durationCapSec != null ? Number(opts.durationCapSec) : NaN;
    if (Number.isFinite(cap) && cap > 0) dur = Math.min(dur, cap);
    fields.push(`${Math.round(dur * 10) / 10}s`);
  }
  const peak = cleanField(s.peakId);
  if (peak) fields.push(`peak=${peak}`);
  if (s.sfxIntent?.length) {
    const sfx = s.sfxIntent.map(cleanField).filter(Boolean);
    if (sfx.length) fields.push(`sfx=${sfx.join("/")}`);
  }
  return `${bits.join(" ")}${fields.length ? ` | ${fields.join(" | ")}` : ""}`.replace(/\s+/g, " ").trim();
}

/**
 * Read plan sidecars for compilers.
 * Shot-scoped with no match → empty lines (never fall back to allIntents[0] / PEAK-sc1).
 */
export function bindViralSidecarForCompile(
  plan: Record<string, unknown>,
  opts?: ViralSidecarBindOpts,
): ViralSidecarCompileBind {
  const peakLedger = getPeakLedgerFromPlan(plan);
  const hookPlan = getHookPlanFromPlan(plan);
  const allIntents = getShotDesignIntentsFromPlan(plan);
  const shotScoped = opts?.shotIndex != null || (opts?.sceneRef != null && opts.sceneRef !== "");
  const maxLines = opts?.maxIntentLines ?? (shotScoped ? 1 : 2);

  let shotDesignIntent: ShotDesignIntent[] = [];
  if (shotScoped) {
    const matched = allIntents.filter((s) => intentMatchesShot(s, opts?.shotIndex, opts?.sceneRef));
    // No match → empty (forbid opening PEAK dump into wrong mirror)
    shotDesignIntent = matched.slice(0, maxLines);
  } else if (opts?.includeEpisodeHooks) {
    // Design tooling only — never for burn/prompt persist
    shotDesignIntent = allIntents.slice(0, maxLines);
  } else {
    shotDesignIntent = [];
  }

  const sfxIntentList = shotScoped
    ? collectSfxIntentList(shotDesignIntent)
    : opts?.includeEpisodeHooks
      ? collectSfxIntentList(allIntents)
      : collectSfxIntentList(shotDesignIntent);

  const decayReasons: string[] = [];
  if (peakLedger.length && !allIntents.length) {
    decayReasons.push("peak_without_shotDesignIntent");
  }
  if (hookPlan?.opening && !allIntents.some((i) => i.hookId || i.purpose === "钩子")) {
    decayReasons.push("opening_hook_not_in_intents");
  }
  if (shotScoped && allIntents.length && !shotDesignIntent.length) {
    decayReasons.push("shot_intent_unmatched_no_fallback");
  }

  const promptLines: string[] = [];
  for (const s of shotDesignIntent) {
    promptLines.push(formatIntentLine(s, { durationCapSec: opts?.durationCapSec }));
  }
  if (!shotScoped && opts?.includeEpisodeHooks && sfxIntentList.length && shotDesignIntent.length) {
    promptLines.push(`【音效清单续读】${sfxIntentList.join(" / ")}`);
  }
  if (opts?.includeEpisodeHooks && !shotScoped && hookPlan?.paypointIntent?.cutBeforeBeat) {
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

/** Merge sidecar — requires shotIndex/sceneRef; otherwise no inject (anti cross-shot). */
export function appendViralSidecarToPrompt(
  prompt: string,
  plan: Record<string, unknown>,
  opts?: ViralSidecarBindOpts,
): string {
  const scoped =
    opts?.shotIndex != null || (opts?.sceneRef != null && opts.sceneRef !== "");
  if (!scoped) {
    // Refuse episode-first PEAK into a single mirror when index unknown
    return prompt;
  }
  const bind = bindViralSidecarForCompile(plan, {
    maxIntentLines: 1,
    includeEpisodeHooks: false,
    ...opts,
  });
  if (!bind.promptLines.length) return prompt;
  return `${prompt}\n\n【设计意图 sidecar 续读·禁重发明爆点】\n${bind.promptLines.join("\n")}`;
}

/** Strip episode-wide PEAK / multi-intent sidecar pollution from an existing prompt. */
export function stripCrossShotViralSidecar(prompt: string): { prompt: string; stripped: boolean } {
  let t = String(prompt ?? "");
  const before = t;
  t = t.replace(
    /\n*【设计意图 sidecar 续读[^\n]*】\n[\s\S]*?(?=\n*\[(?:Visual|Motion|Camera|Audio|Narrative|References|Instruction)\]|$)/gi,
    "\n",
  );
  // Orphan intent / peak dump lines (with or without peak=)
  t = t.replace(/^\s*\[intent[^\]]*\][^\n]*/gim, "");
  t = t.replace(/\|\s*声=undefined/gi, "");
  t = t.replace(/声=undefined/gi, "");
  t = t.replace(/【音效清单续读】[^\n]*/g, "");
  t = t.replace(/【付费卡前拍】[^\n]*/g, "");
  t = t.replace(/\n{3,}/g, "\n\n").trim();
  return { prompt: t, stripped: t !== before.trim() };
}

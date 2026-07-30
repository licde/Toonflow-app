/**
 * Shared duration raise kernel (Chat design + export + import兜底):
 * LIP/DFW/PR-09 same target, vendor snap — no IRD invent, no literary rewrite.
 *
 * Design/export: raise whenever need ≤ vendorMax (even if needsSplit — 时长可抬先消 PR-09；
 * 结构多句仍由 DEX-LIP-SPLIT Confirm). Import may pass respectEpisodeCap.
 */
import type { ScriptBundle } from "../bundle/types";
import {
  DEFAULT_EPISODE_DURATION_CAP,
  resolveRequiredDuration,
  sumShotDurations,
  vendorMaxForId,
} from "../compilers/resolveRequiredDuration";
import { measureDialogue } from "../dialogueMetrics";
import { asDialogueLineObjects, flattenDialogueText } from "../design/dialogueCoverage";
import { snapDurationToVendorMap, VENDOR_DURATION_BUCKETS } from "../vendor-packs/videoVendorPack";

export type DurationHygieneOpts = {
  vendorId?: string | null;
  /** Hard episode sum cap. Only enforced when respectEpisodeCap=true (import兜底). */
  episodeCap?: number;
  /**
   * When true, refuse raises that would push pack sum over episodeCap.
   * Design/export default false — 设计主责先消 LIP/PR-09，不以整集预算卡死抬时。
   */
  respectEpisodeCap?: boolean;
  /** When false, skip snapDurationToVendorMap. Default true. */
  snap?: boolean;
  /** Sync shotDesignIntent.durationSec with raised duration. Default true. */
  syncIntentDurationSec?: boolean;
};

export type DurationHygieneResult = {
  raised: number;
  skippedNeedsSplit: number;
  skippedCap: number;
  skippedOverVendor: number;
  log: string[];
};

/** Same formula as DFW-DURATION field walk: ceil(totalChars / 4). */
export function dfwMinDuration(shot: Record<string, unknown>): number {
  const lines = asDialogueLineObjects(
    (shot.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue?.lines,
  );
  const chars = lines.reduce((n, l) => n + String(l.text ?? "").length, 0);
  if (chars <= 0) return 0;
  return Math.ceil(chars / 4);
}

/** PR-09 / measureDialogue min — must clear after raise. */
export function pr09MinDuration(shot: Record<string, unknown>): number {
  const text = flattenDialogueText(
    (shot.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue?.lines,
  );
  if (!text.trim()) return 0;
  const isMono =
    (shot.narrative as { dialogue?: { type?: string } } | undefined)?.dialogue?.type === "monologue" ||
    /独白|画外/.test(text);
  const metrics = measureDialogue({ text, isMonologue: isMono, speechSpeed: 4 });
  return metrics.minDurationSec > 0 ? Math.ceil(metrics.minDurationSec) : 0;
}

function bucketsForVendor(vendorId?: string | null): number[] {
  const key = String(vendorId ?? "agnesai").toLowerCase();
  if (key.includes("kling")) return VENDOR_DURATION_BUCKETS.klingai ?? VENDOR_DURATION_BUCKETS.default;
  if (key.includes("minimax")) return VENDOR_DURATION_BUCKETS.minimax ?? VENDOR_DURATION_BUCKETS.default;
  if (key.includes("wan")) return VENDOR_DURATION_BUCKETS.wan ?? VENDOR_DURATION_BUCKETS.default;
  if (key.includes("seedance") || key.includes("volc"))
    return VENDOR_DURATION_BUCKETS.seedance ?? VENDOR_DURATION_BUCKETS.default;
  if (key.includes("agnes")) return VENDOR_DURATION_BUCKETS.agnesai ?? VENDOR_DURATION_BUCKETS.default;
  return VENDOR_DURATION_BUCKETS.default;
}

function syncIntentSec(shot: Record<string, unknown>, duration: number): void {
  const intent = (shot.shotDesignIntent as Record<string, unknown> | undefined) ?? {};
  const cur = Number(intent.durationSec ?? 0);
  if (!(cur > 0) || cur < duration) {
    shot.shotDesignIntent = { ...intent, durationSec: duration };
  }
}

/**
 * Raise shot.duration to clear PR-09/LIP/DFW when need ≤ vendorMax.
 * Does NOT silent-split; over-vendor stays for Confirm.
 */
export function raiseDurationHygieneOnly(
  bundle: ScriptBundle,
  opts?: DurationHygieneOpts,
): DurationHygieneResult {
  const shots =
    ((bundle.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ?? []) as Record<
      string,
      unknown
    >[];
  const vendorId =
    opts?.vendorId ??
    (bundle as { meta?: { vendorId?: string } }).meta?.vendorId ??
    (bundle.planData as { vendorId?: string } | undefined)?.vendorId ??
    null;
  const episodeCap = opts?.episodeCap ?? DEFAULT_EPISODE_DURATION_CAP;
  const respectCap = opts?.respectEpisodeCap === true;
  const doSnap = opts?.snap !== false;
  const syncIntent = opts?.syncIntentDurationSec !== false;

  let raised = 0;
  let skippedNeedsSplit = 0;
  let skippedCap = 0;
  let skippedOverVendor = 0;
  const log: string[] = [];

  let used = sumShotDurations(shots);

  for (const shot of shots) {
    try {
      const cur = Number(shot.duration ?? 0);
      const req = resolveRequiredDuration(shot, { vendorId });
      const dfw = dfwMinDuration(shot);
      const pr09 = pr09MinDuration(shot);
      // Same target: clear PR-09 + DFW + lip required
      let need = Math.max(cur, Number(req.required ?? 0), dfw, pr09, Math.ceil(req.lipMin || 0));
      if (!(need > cur) || cur < 0) continue;

      const vmax = Number(req.vendorMax ?? vendorMaxForId(vendorId) ?? 0) || 30;
      // 超厂商：禁抬满（Confirm 语义拆）；可抬到 vendorMax 作部分缓解仍不够消 PR-09→仍 BLOCK
      if (need > vmax) {
        // Partial raise to vendor max only when still short of vmax (helps but shot 11 stays LIP)
        if (cur < vmax && cur > 0) {
          let partial = vmax;
          if (doSnap) {
            const snap = snapDurationToVendorMap(partial, bucketsForVendor(vendorId), {
              lipMin: Math.min(vmax, Math.max(req.lipMin, dfw, pr09)),
            });
            partial = Math.min(vmax, snap.duration);
          }
          if (partial > cur) {
            if (respectCap) {
              const delta = partial - cur;
              if (used + delta > episodeCap) {
                skippedCap++;
                log.push(`shot${shot.shotIndex ?? "?"}:cap_block partial=${partial}`);
                skippedOverVendor++;
                continue;
              }
            }
            shot.duration = partial;
            if (syncIntent) syncIntentSec(shot, partial);
            used = used - Math.max(0, cur) + partial;
            raised++;
            log.push(`shot${shot.shotIndex ?? "?"}:${cur}→${partial}:partial_over_vendor`);
          }
        }
        skippedOverVendor++;
        continue;
      }

      if (doSnap) {
        const snap = snapDurationToVendorMap(need, bucketsForVendor(vendorId), {
          lipMin: Math.max(req.lipMin, dfw, pr09),
        });
        if (!snap.ok && snap.duration < need) {
          skippedOverVendor++;
          continue;
        }
        need = snap.duration;
        if (need > vmax) {
          skippedOverVendor++;
          continue;
        }
      }

      if (respectCap) {
        const delta = Math.max(0, need - Math.max(cur, 0));
        if (delta > 0 && used + delta > episodeCap) {
          const room = Math.max(0, episodeCap - used);
          if (room <= 0) {
            skippedCap++;
            log.push(`shot${shot.shotIndex ?? "?"}:cap_block need=${need}`);
            continue;
          }
          need = Math.max(cur, cur + room);
          if (need <= cur) {
            skippedCap++;
            continue;
          }
        }
      }

      if (need > cur) {
        const prev = cur;
        shot.duration = need;
        if (syncIntent) syncIntentSec(shot, need);
        used = used - Math.max(0, prev) + need;
        raised++;
        log.push(
          `shot${shot.shotIndex ?? "?"}:${prev}→${need}${req.needsSplit ? ":dur_ok_split_confirm_remain" : ""}`,
        );
      }
    } catch {
      /* optional */
    }
  }

  return { raised, skippedNeedsSplit, skippedCap, skippedOverVendor, log };
}

/** Mutate planData/preDesignPack shots in a Chat plan object (designAutoClose path). */
export function raiseDurationHygieneOnPlan(
  plan: Record<string, unknown>,
  opts?: DurationHygieneOpts,
): DurationHygieneResult {
  const pd = (plan.planData as Record<string, unknown>) ?? {};
  const nested = (pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots;
  const top = (plan.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots;
  const shots = nested?.length ? nested : top ?? [];
  if (!shots.length) {
    return { raised: 0, skippedNeedsSplit: 0, skippedCap: 0, skippedOverVendor: 0, log: [] };
  }

  const fakeBundle = {
    preDesignPack: { shots },
    planData: pd,
    meta: (plan as { meta?: { vendorId?: string } }).meta,
  } as ScriptBundle;
  const result = raiseDurationHygieneOnly(fakeBundle, {
    ...opts,
    respectEpisodeCap: opts?.respectEpisodeCap === true,
  });

  if (nested?.length && top?.length && nested !== top) {
    const byIdx = new Map(shots.map((s) => [Number(s.shotIndex ?? 0), s]));
    for (const s of top) {
      const src = byIdx.get(Number(s.shotIndex ?? 0));
      if (src && typeof src.duration === "number") {
        s.duration = src.duration;
        if (src.shotDesignIntent) s.shotDesignIntent = src.shotDesignIntent;
      }
    }
  }
  return result;
}

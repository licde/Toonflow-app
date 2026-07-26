/**
 * Unified shot expander registry — weapon → still_onebeat → visual_multi → dialogue_cluster.
 */
import { expandWeaponToShots } from "../genre/expandWeaponToShots";
import { expandDialogueClusters, type ClusterShot } from "./expandDialogueClusters";
import { expandVisualBeats } from "./expandVisualBeats";
import { expandStillOneBeat } from "./expandStillOneBeat";
import { expandStillCuCast } from "./expandStillCuCast";
import { rebindLedgerAfterExpand } from "./visBeatLedgerRebind";

export type ExpanderLog = { expanderId: string; expanded: boolean; count: number; detail?: string };

export function runShotExpanders(
  shots: Record<string, unknown>[],
  opts?: {
    profileId?: string;
    meta?: Record<string, unknown> | null;
    applyClusters?: boolean;
    applyStillOneBeat?: boolean;
    applyCuCast?: boolean;
    chatStrict?: boolean;
    forceExpand?: boolean;
    maxVisualExpand?: number;
    literaryMode?: "structure_only" | "slice_description_confirm";
  },
): { shots: Record<string, unknown>[]; log: ExpanderLog[] } {
  const log: ExpanderLog[] = [];
  let next = [...shots];

  // 1) weapon
  const afterWeapon: Record<string, unknown>[] = [];
  let weaponCount = 0;
  for (const s of next) {
    const wid = String(s.weaponId ?? "");
    if (wid) {
      const r = expandWeaponToShots(wid, s);
      if (r.expanded) {
        weaponCount += r.shots.length;
        afterWeapon.push(...r.shots);
        continue;
      }
    }
    afterWeapon.push(s);
  }
  next = afterWeapon;
  log.push({ expanderId: "weapon", expanded: weaponCount > 0, count: weaponCount });

  // 1b) still one-beat (before VisBeat; skips already-split)
  if (opts?.applyStillOneBeat !== false) {
    const ob = expandStillOneBeat(next, { maxExpand: opts?.maxVisualExpand });
    next = ob.shots;
    log.push({
      expanderId: "still_onebeat",
      expanded: ob.expandedCount > 0,
      count: ob.expandedCount,
      detail: ob.log.join("|") + (ob.refused ? `;refused=${ob.refused}` : ""),
    });
  }

  // 1c) face CU × multi-cast → reaction CU + ensemble mid
  if (opts?.applyCuCast !== false) {
    const cu = expandStillCuCast(next, {
      maxExpand: opts?.maxVisualExpand,
      chatStrict: opts?.chatStrict,
      forceExpand: opts?.forceExpand,
    });
    next = cu.shots;
    log.push({
      expanderId: "still_cu_cast",
      expanded: cu.expandedCount > 0 || cu.slicedCount > 0,
      count: cu.expandedCount + cu.slicedCount,
      detail: cu.log.join("|") + (cu.confirmRequired ? ";confirmRequired" : "") + (cu.slicedCount ? `;sliced=${cu.slicedCount}` : ""),
    });
  }

  // 2) visual multi (skipped when weapon/still_onebeat already expanded that parent)
  const vis = expandVisualBeats(next, { meta: opts?.meta, maxExpand: opts?.maxVisualExpand });
  next = vis.shots;
  log.push({
    expanderId: "visual_multi",
    expanded: vis.expandedCount > 0,
    count: vis.expandedCount,
    detail: vis.log.join("|"),
  });

  // 3) dialogue clusters
  if (opts?.applyClusters !== false) {
    const c = expandDialogueClusters(next as ClusterShot[], { profileId: opts?.profileId });
    next = c.shots as Record<string, unknown>[];
    log.push({ expanderId: "dialogue_cluster", expanded: c.expandedCount > 0, count: c.expandedCount });
  }

  const rebound = rebindLedgerAfterExpand(next, { literaryMode: opts?.literaryMode ?? "structure_only" });
  next = rebound.shots;
  if (rebound.rebound) log.push({ expanderId: "ledger_rebind", expanded: true, count: rebound.rebound });

  // Homology with IRD/orchestrator: slice child fields + rebind audio after any expand
  try {
    const { sliceFieldsAfterIrdSplit } =
      require("./sliceFieldsAfterIrdSplit") as typeof import("./sliceFieldsAfterIrdSplit");
    const sliced = sliceFieldsAfterIrdSplit(next);
    next = sliced.shots;
    if (sliced.sliced > 0) log.push({ expanderId: "field_slice", expanded: true, count: sliced.sliced });
  } catch {
    /* optional */
  }
  try {
    const { rebindAudioVoiceAfterSplit } =
      require("./audioVoiceRebind") as typeof import("./audioVoiceRebind");
    const reb = rebindAudioVoiceAfterSplit(next);
    next = reb.shots;
    if (reb.rebound > 0) log.push({ expanderId: "audio_rebind", expanded: true, count: reb.rebound });
  } catch {
    /* optional */
  }

  return { shots: next, log };
}

/** Rhythm: warn if too many consecutive face_cu / 特写 */
export function auditRhythmBudget(shots: Record<string, unknown>[], maxConsecutiveCu = 3): string[] {
  const warns: string[] = [];
  let streak = 0;
  for (const s of shots) {
    const size = String(
      s.shotSize ?? (s.narrative as { shotSize?: string })?.shotSize ?? "",
    ).toLowerCase();
    if (/特写|ecu|\bcu\b|face_cu|大特/.test(size)) {
      streak++;
      if (streak > maxConsecutiveCu) warns.push("RHYTHM-CU-STREAK");
    } else streak = 0;
  }
  return [...new Set(warns)];
}

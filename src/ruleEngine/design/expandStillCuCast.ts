/**
 * CU × multi-cast intelligent adapt:
 * 1) literary single-hero CU → slice cast in place (降出场人数，不拆镜)
 * 2) multi-person CU intent → reaction CU + ensemble mid
 * Homology: slice always allowed (align packaging to VD); split only when healMode=split && autoEligible.
 */
import {
  detectCuCastConflict,
  pickPrimaryReactionName,
  sliceShotCastToPrimary,
} from "./detectCuCastConflict";
import { recomposeChildrenAfterSplit } from "./recomposeAfterSplit";

export type ExpandStillCuCastResult = {
  shots: Record<string, unknown>[];
  expandedCount: number;
  slicedCount: number;
  refused: number;
  log: string[];
  confirmRequired: boolean;
};

function cloneShot(s: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
}

/**
 * Split one shot into: (1) reaction face CU on primary (2) mid/ensemble with full cast.
 */
export function expandOneCuCastShot(shot: Record<string, unknown>): {
  children: Record<string, unknown>[];
  ok: boolean;
  confirmRequired: boolean;
  reason?: string;
} {
  if (shot._cuCastSplitId || shot._stillBeatSplitId || shot._visualSplitId || shot.visBeatOverride) {
    return { children: [shot], ok: false, confirmRequired: false, reason: "already_split" };
  }
  const codes = Array.isArray(shot.charCodes) ? (shot.charCodes as string[]) : [];
  const names = Array.isArray(shot.characterNames)
    ? (shot.characterNames as string[])
    : Array.isArray((shot as { castNames?: string[] }).castNames)
      ? ((shot as { castNames?: string[] }).castNames as string[])
      : [];
  const shotSize = String(
    shot.shotSize ?? (shot.narrative as { shotSize?: string } | undefined)?.shotSize ?? "",
  );
  const vd = String(shot.visualDescription ?? "");
  const det = detectCuCastConflict({
    shotSize,
    charCodes: codes,
    characterNames: names,
    visualDescription: vd,
  });
  if (!det.conflict) return { children: [shot], ok: false, confirmRequired: false, reason: "no_conflict" };
  if (det.healMode === "slice_cast" && det.primaryName) {
    sliceShotCastToPrimary(shot, det.primaryName);
    return { children: [shot], ok: true, confirmRequired: false, reason: "slice_cast" };
  }
  if (det.healMode === "confirm" || det.ambiguous || !det.confidence.autoEligible) {
    return { children: [shot], ok: false, confirmRequired: true, reason: "confirm_required" };
  }

  const primary = det.primaryName || pickPrimaryReactionName(det.castNames, vd);
  const parentId = String(shot.clientId ?? shot.shotIndex ?? `cu${Date.now()}`);
  const reaction = cloneShot(shot);
  const ensemble = cloneShot(shot);

  reaction.clientId = `${parentId}__cu_react`;
  reaction._cuCastSplitId = parentId;
  reaction._stillBeatSplitId = parentId;
  reaction.visualSplitRole = "reaction";
  reaction.beatRole = "reaction";
  reaction.shotSize = "特写";
  const rn = { ...((reaction.narrative as object) ?? {}), shotSize: "特写" };
  reaction.narrative = rn;
  reaction.visualDescription = primary
    ? `${primary}反应特写。${vd}`.slice(0, 200)
    : `反应特写。${vd}`.slice(0, 200);
  // Primary-only cast on reaction CU
  if (codes.length) {
    const primaryCode = codes.find((c) => {
      const bare = String(c).replace(/^CHAR-/i, "");
      return primary && (c.includes(primary) || primary.includes(bare));
    });
    reaction.charCodes = primaryCode ? [primaryCode] : codes.slice(0, 1);
  }
  if (names.length && primary) {
    reaction.characterNames = names.filter((n) => String(n).includes(primary) || primary.includes(String(n)));
    if (!(reaction.characterNames as string[]).length) reaction.characterNames = [primary];
  }
  reaction.burnParentForbidden = true;
  reaction.filePath = undefined;
  reaction.promptState = "stale";
  reaction.videoStale = true;
  {
    const gen = { ...((reaction.generation as Record<string, unknown>) ?? {}) };
    delete gen.imagePrompt;
    delete gen.videoPrompt;
    delete gen.videoDesc;
    delete gen.compiled;
    reaction.generation = gen;
  }

  ensemble.clientId = `${parentId}__cu_ens`;
  ensemble._cuCastSplitId = parentId;
  ensemble._stillBeatSplitId = parentId;
  ensemble.visualSplitRole = "action";
  ensemble.beatRole = "action";
  ensemble.shotSize = det.castCount >= 3 ? "中景" : "中近景";
  const en = {
    ...((ensemble.narrative as object) ?? {}),
    shotSize: ensemble.shotSize,
  };
  ensemble.narrative = en;
  ensemble.visualDescription = `场面。${vd}`.slice(0, 220);
  ensemble.burnParentForbidden = true;
  ensemble.filePath = undefined;
  ensemble.promptState = "stale";
  ensemble.videoStale = true;
  {
    const gen = { ...((ensemble.generation as Record<string, unknown>) ?? {}) };
    delete gen.imagePrompt;
    delete gen.videoPrompt;
    delete gen.videoDesc;
    delete gen.compiled;
    ensemble.generation = gen;
  }

  return { children: [reaction, ensemble], ok: true, confirmRequired: false };
}

export function expandStillCuCast(
  shots: Record<string, unknown>[],
  opts?: { chatStrict?: boolean; forceExpand?: boolean; maxExpand?: number },
): ExpandStillCuCastResult {
  const log: string[] = [];
  let expandedCount = 0;
  let slicedCount = 0;
  let refused = 0;
  let confirmRequired = false;
  const out: Record<string, unknown>[] = [];
  const max = opts?.maxExpand ?? 40;

  for (const s of shots) {
    if (expandedCount >= max) {
      out.push(s);
      continue;
    }
    const det = detectCuCastConflict({
      shotSize: String(s.shotSize ?? (s.narrative as { shotSize?: string })?.shotSize ?? ""),
      charCodes: Array.isArray(s.charCodes) ? (s.charCodes as string[]) : [],
      characterNames: Array.isArray(s.characterNames) ? (s.characterNames as string[]) : [],
      visualDescription: String(s.visualDescription ?? ""),
      alreadySplit: Boolean(s._cuCastSplitId || s._stillBeatSplitId || s._cuCastSliced),
    });
    if (!det.conflict) {
      out.push(s);
      continue;
    }

    // Literary single-hero: always slice cast (align packaging to VD; not silent invent)
    if (det.healMode === "slice_cast" && det.primaryName) {
      sliceShotCastToPrimary(s, det.primaryName);
      slicedCount++;
      log.push(`cu_cast_slice:${s.shotIndex ?? s.clientId}->${det.primaryName}`);
      out.push(s);
      continue;
    }

    // chatStrict: diagnose-only for split/confirm unless forceExpand
    if (opts?.chatStrict && !opts?.forceExpand) {
      s.irdConfirmRequired = true;
      s._cuCastConfirmRequired = true;
      confirmRequired = true;
      refused++;
      log.push(`cu_cast_chatStrict:${s.shotIndex ?? s.clientId}`);
      out.push(s);
      continue;
    }
    if ((det.healMode === "confirm" || det.ambiguous || !det.confidence.autoEligible) && !opts?.forceExpand) {
      s.irdConfirmRequired = true;
      s._cuCastConfirmRequired = true;
      confirmRequired = true;
      refused++;
      log.push(`cu_cast_confirm:${s.shotIndex ?? s.clientId}`);
      out.push(s);
      continue;
    }
    const one = expandOneCuCastShot(s);
    if (!one.ok) {
      if (one.confirmRequired) {
        s.irdConfirmRequired = true;
        confirmRequired = true;
        refused++;
      }
      out.push(s);
      continue;
    }
    if (one.reason === "slice_cast") {
      slicedCount++;
      log.push(`cu_cast_slice:${s.shotIndex ?? s.clientId}`);
      out.push(...one.children);
      continue;
    }
    out.push(...one.children);
    expandedCount += one.children.length;
    log.push(`cu_cast_expand:${s.shotIndex ?? s.clientId}->${one.children.length}`);
  }

  const recomposed = recomposeChildrenAfterSplit(out).shots;
  return { shots: recomposed, expandedCount, slicedCount, refused, log, confirmRequired };
}

/**
 * Expand visual multi-beat shots using L0 conflict_matrix templates.
 */
import {
  evaluateVisBeatConflict,
  loadVisualBeatVocab,
  type VisualBeatVocab,
} from "./visualBeatPolicy";

const MAX_EXPAND_PER_EPISODE = 40;

export function expandVisualBeats(
  shots: Record<string, unknown>[],
  opts?: { meta?: Record<string, unknown> | null; vocab?: VisualBeatVocab; maxExpand?: number },
): { shots: Record<string, unknown>[]; expandedCount: number; log: string[] } {
  const vocab = opts?.vocab ?? loadVisualBeatVocab();
  const maxExpand = opts?.maxExpand ?? MAX_EXPAND_PER_EPISODE;
  const log: string[] = [];
  const out: Record<string, unknown>[] = [];
  let expandedCount = 0;

  for (const shot of shots) {
    if (shot._visualSplitId || shot.visualSplitRole) {
      out.push(shot);
      continue;
    }
    if (shot.visBeatOverride) {
      out.push(shot);
      continue;
    }
    const n = shot.narrative as { shotSize?: string; dialogue?: { lines?: unknown } } | undefined;
    const ev = evaluateVisBeatConflict({
      visualBeatTags: shot.visualBeatTags,
      shotSize: (shot.shotSize as string) ?? n?.shotSize,
      picture: (shot.visualDescription as string) ?? null,
      weaponId: (shot.weaponId as string) ?? null,
      meta: opts?.meta,
      vocab,
    });

    if (ev.action !== "must_split" || !ev.template) {
      out.push(shot);
      continue;
    }
    if (expandedCount >= maxExpand) {
      log.push("expand_budget_cap");
      out.push({ ...shot, visBeatUnsplittable: true, visBeatExplain: ev.explain });
      continue;
    }

    const tpl = vocab.splitTemplates?.[ev.template];
    if (!tpl?.beats?.length) {
      out.push(shot);
      continue;
    }

    const parentKey = String(shot.clientId ?? shot.shotIndex ?? `s${out.length}`);
    const dlg = n?.dialogue;
    // Parent replaced by children — mark expanded-away policy on children; parent is not emitted.
    tpl.beats.forEach((beat, i) => {
      const child: Record<string, unknown> = {
        ...shot,
        clientId: `${parentKey}-vis-${beat.role}-${i}`,
        shotIndex: undefined,
        _visualSplitId: parentKey,
        visualSplitRole: beat.role,
        visualBeatTags: beat.tags ?? [],
        shotSize: beat.shotSize,
        beatRole: beat.role === "reaction" ? "reaction" : beat.hasDialogue ? "speak" : "action",
        visBeatExpandedAway: false,
        burnParentForbidden: true,
        narrative: {
          ...(n ?? {}),
          shotSize: beat.shotSize,
          dialogue: beat.hasDialogue ? dlg ?? { lines: [] } : { lines: [] },
        },
        videoDesc: `${beat.shotSize} static, ${shot.duration ?? 1.5}s`,
      };
      out.push(child);
    });
    expandedCount++;
    log.push(`visual_multi:${ev.matrixRowId}:${ev.template}`);
  }

  out.forEach((s, i) => {
    s.shotIndex = i + 1;
    s.index = i;
  });

  return { shots: out, expandedCount, log };
}

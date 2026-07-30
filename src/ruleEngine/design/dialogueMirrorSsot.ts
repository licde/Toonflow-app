/**
 * Mirror SSOT — single kernel for plan↔shot dialogue sync.
 * Missing lineIds → one speak shot per line (never dump onto first dialogue shot).
 */
import type { Nar14LineLike } from "../nar14ClauseSplit";
import type { ScriptBundle, PreDesignShot } from "../bundle/types";

/**
 * Mirror plan line fields onto shots by lineId; missing lines → one new speak shot each.
 */
export function mirrorAndSyncPlanToShots(
  planLines: Nar14LineLike[],
  shots: Record<string, unknown>[],
): { shots: Record<string, unknown>[]; mirrored: number; appended: number } {
  const byId = new Map<string, Nar14LineLike>();
  for (const pl of planLines) {
    if (pl.lineId) byId.set(String(pl.lineId), pl);
  }
  let mirrored = 0;
  let appended = 0;
  const present = new Set<string>();

  const nextShots = shots.map((s) => {
    const role = String(
      (s as { visualSplitRole?: string; beatRole?: string }).visualSplitRole ??
        (s as { beatRole?: string }).beatRole ??
        "",
    ).toLowerCase();
    const isSpeakChild =
      Boolean((s as { _stillBeatSplitId?: string })._stillBeatSplitId || (s as { _visualSplitId?: string })._visualSplitId) &&
      /speak|说/.test(role);
    const n = { ...((s.narrative as object) ?? {}) } as {
      dialogue?: { lines?: Nar14LineLike[] };
      shotSize?: string;
    };
    const lines = [...(n.dialogue?.lines ?? [])] as Nar14LineLike[];
    for (let i = 0; i < lines.length; i++) {
      const lid = lines[i]?.lineId ? String(lines[i]!.lineId) : "";
      if (lid) present.add(lid);
      const src = lid ? byId.get(lid) : undefined;
      if (!src) continue;
      const cur = { ...lines[i]! };
      if (src.splitHint && !cur.splitHint && !isSpeakChild) {
        cur.splitHint = src.splitHint;
        mirrored++;
      }
      if (src.reactionAction && !cur.reactionAction && !isSpeakChild) {
        cur.reactionAction = src.reactionAction;
        mirrored++;
      }
      if (src.functions?.length && !cur.functions?.length) {
        cur.functions = [...src.functions];
        mirrored++;
      }
      lines[i] = cur;
    }
    n.dialogue = { lines };
    return { ...s, narrative: n };
  });

  const missing = planLines.filter((p) => p.lineId && !present.has(String(p.lineId)));
  if (missing.length && nextShots.length) {
    const { ensureChildVisualDescription } =
      require("./splitChildVisual") as typeof import("./splitChildVisual");
    for (const m of missing) {
      const template =
        nextShots.find((s) => {
          const lines = (s.narrative as { dialogue?: { lines?: unknown[] } })?.dialogue?.lines ?? [];
          return lines.length > 0;
        }) ?? nextShots[0]!;
      const n = { ...((template.narrative as object) ?? {}) } as { dialogue?: { lines?: Nar14LineLike[] } };
      const parentVd = String(
        template._parentVisualDescription ?? template.visualDescription ?? "",
      ).trim();
      const shell =
        String(m.text ?? "").trim().length >= 2
          ? `对白表演：${String(m.text).slice(0, 36)}`
          : String(template.visualDescription ?? "").trim();
      const ensured = ensureChildVisualDescription({
        role: "speak",
        childVd: shell,
        parentVd,
      });
      nextShots.push({
        ...template,
        clientId: `${String(template.clientId ?? template.shotIndex ?? "s")}-sync-${m.lineId}`,
        shotIndex: undefined,
        beatRole: "speak",
        _mirrorAppend: true,
        promptState: "stale",
        narrative: { ...n, dialogue: { lines: [{ ...m }] } },
        visualDescription: ensured.visualDescription,
        ...(parentVd
          ? {
              _parentVisualDescription: parentVd,
              _stillBeatSplitId:
                template._stillBeatSplitId ?? template._visualSplitId ?? template.clientId ?? template.shotIndex,
            }
          : {}),
      });
      appended++;
    }
    nextShots.forEach((s, i) => {
      s.shotIndex = i + 1;
      s.index = i;
    });
  }

  return { shots: nextShots, mirrored, appended };
}

/** Bundle-facing wrapper — mutates preDesignPack.shots. */
export function mirrorDialoguePlanToShotsSsot(bundle: ScriptBundle): number {
  const planLines =
    (bundle.planData as { dialoguePlan?: { lines?: Nar14LineLike[] } } | undefined)?.dialoguePlan?.lines ?? [];
  if (!planLines.length || !bundle.preDesignPack?.shots?.length) return 0;
  const sync = mirrorAndSyncPlanToShots(planLines, bundle.preDesignPack.shots as Record<string, unknown>[]);
  bundle.preDesignPack.shots = sync.shots as PreDesignShot[];
  return sync.mirrored + sync.appended;
}

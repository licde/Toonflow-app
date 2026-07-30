/**
 * L-t12: After still-onebeat / VisBeat expand, slice peak/avCausality + microExpression onto children.
 */
export function slicePeakForChild(peak: string, childVisual: string, role?: string): string {
  const p = String(peak ?? "").trim();
  const vd = String(childVisual ?? "").trim();
  if (!p) return vd.slice(0, 80);
  // Prefer overlapping clause from peak that appears in child visual
  const parts = p.split(/[。；;\n]+/).map((s) => s.trim()).filter(Boolean);
  const hit = parts.find((c) => vd.includes(c.slice(0, Math.min(6, c.length))) || c.includes(vd.slice(0, 6)));
  if (hit) return hit.slice(0, 80);
  if (role === "insert" || role === "reveal") return parts[0]?.slice(0, 80) ?? p.slice(0, 80);
  if (role === "reaction") return parts[1]?.slice(0, 80) ?? parts[0]?.slice(0, 80) ?? p.slice(0, 80);
  return p.slice(0, 80);
}

function defaultMicroForRole(role?: string): { eyes?: string; mouthDetail?: string } {
  if (role === "reaction") return { eyes: "决绝", mouthDetail: "浅笑" };
  if (role === "insert") return { eyes: "注视", mouthDetail: "抿唇" };
  return { eyes: "平视", mouthDetail: "闭合" };
}

/**
 * Mutate children: copy/slice parent peak + microExpression aligned to visualSplitRole.
 */
export function recomposeChildrenAfterSplit(shots: Record<string, unknown>[]): {
  shots: Record<string, unknown>[];
  recomposed: number;
} {
  const byParent = new Map<string, Record<string, unknown>>();
  for (const s of shots) {
    const id = String(s.clientId ?? "");
    if (id && !String(id).includes("-ob-") && !s._stillBeatSplitId && !s._visualSplitId) {
      byParent.set(id, s);
    }
  }

  let recomposed = 0;
  for (const s of shots) {
    const parentKey = String(s._stillBeatSplitId ?? s._visualSplitId ?? "");
    if (!parentKey) continue;
    const parent = byParent.get(parentKey);
    const role = String(s.visualSplitRole ?? "");
    const vd = String(s.visualDescription ?? "");
    const parentVdStash = String(s._parentVisualDescription ?? "").trim();

    const parentSd = (parent?.shotDesign ?? s.shotDesign) as
      | { performance?: { microExpression?: { eyes?: string; mouthDetail?: string } }; picture?: string }
      | undefined;
    const parentPeak =
      String(
        (parent as { peakEmotion?: string } | undefined)?.peakEmotion ??
          (parent?.narrative as { peak?: string } | undefined)?.peak ??
          "",
      ).trim() ||
      String(parentSd?.picture ?? "").slice(0, 80) ||
      parentVdStash.slice(0, 80);

    const peak = slicePeakForChild(parentPeak || vd, vd, role);
    const micro =
      parentSd?.performance?.microExpression && role === "reaction"
        ? parentSd.performance.microExpression
        : defaultMicroForRole(role);

    const sd = {
      ...((s.shotDesign as Record<string, unknown>) ?? {}),
      performance: {
        ...(((s.shotDesign as { performance?: Record<string, unknown> } | undefined)?.performance as Record<
          string,
          unknown
        >) ?? {}),
        microExpression: micro,
      },
    };
    s.shotDesign = sd;
    s.peakEmotion = peak;
    // Slice avCausality onto child when parent carried scene-level peak
    const av = (s.avCausality ?? parent?.avCausality) as { visualPeak?: string; audioBeat?: string } | undefined;
    if (av || peak) {
      s.avCausality = {
        ...(av ?? {}),
        visualPeak: peak,
        audioBeat: role === "reaction" ? av?.audioBeat : undefined,
      };
    }
    s.promptState = "stale";
    recomposed += 1;
  }
  return { shots, recomposed };
}

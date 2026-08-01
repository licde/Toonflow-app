/**
 * After expand: clear inherited parent generation + rewrite imagePrompt from child VD.
 * Peak/micro slice retained; egress rewrite is required to clear GEN-05/06/03.
 */
import { composeStillPrompt } from "../compilers/composeStillPrompt";

export function slicePeakForChild(peak: string, childVisual: string, role?: string): string {
  const p = String(peak ?? "").trim();
  const vd = String(childVisual ?? "").trim();
  if (!p) return vd.slice(0, 80);
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

export function isSplitChildShot(s: Record<string, unknown>): boolean {
  return Boolean(
    s._stillBeatSplitId ||
      s._visualSplitId ||
      s._litXorSplitId ||
      s._cuCastSplitId ||
      s._vidSplitId ||
      s.burnParentForbidden ||
      /-(ob|xor|cu|vb)-/i.test(String(s.clientId ?? "")),
  );
}

/** Drop parent collage prompts so children cannot inherit GEN-05 collage. */
export function clearInheritedGeneration(s: Record<string, unknown>): void {
  const gen = { ...((s.generation as Record<string, unknown>) ?? {}) };
  delete gen.imagePrompt;
  delete gen.videoPrompt;
  delete gen.videoDesc;
  delete gen.compiled;
  s.generation = gen;
  s.promptState = "stale";
  s.composeHash = undefined;
  s.videoPass = false;
  s.videoStale = true;
}

function rewriteChildEgress(s: Record<string, unknown>): boolean {
  const vd = String(s.visualDescription ?? "").trim();
  if (!vd) return false;
  const sd = s.shotDesign as
    | {
        performance?: { microExpression?: { eyes?: string; mouthDetail?: string } };
        composition?: { foreground?: string; background?: string };
        cameraAnchor?: { shotSize?: string; bgBlur?: boolean };
      }
    | undefined;
  const micro = sd?.performance?.microExpression;
  const microStr = micro ? [micro.eyes, micro.mouthDetail].filter(Boolean).join("/") : undefined;
  try {
    const composed = composeStillPrompt(
      {
        visualDescription: vd,
        shotSize: String(s.shotSize ?? sd?.cameraAnchor?.shotSize ?? ""),
        foreground: sd?.composition?.foreground,
        background: sd?.composition?.background,
        microExpression: microStr,
        qualityMode: "draft",
        episodeShot: s,
      },
      { mode: "full" },
    );
    const prompt = String(composed.prompt ?? "").trim() || vd;
    const gen = { ...((s.generation as Record<string, unknown>) ?? {}) };
    gen.imagePrompt = prompt;
    if (sd?.cameraAnchor?.bgBlur && !/blur|bokeh|景深/i.test(prompt)) {
      gen.imagePrompt = `${prompt}，浅景深 bokeh blur`;
    }
    s.generation = gen;
    s.promptState = "composed";
    return true;
  } catch {
    const gen = { ...((s.generation as Record<string, unknown>) ?? {}) };
    gen.imagePrompt = vd;
    s.generation = gen;
    s.promptState = "stale";
    return true;
  }
}

/**
 * Mutate children: peak/micro/av + clear parent generation + rewrite imagePrompt from child VD.
 */
export function recomposeChildrenAfterSplit(shots: Record<string, unknown>[]): {
  shots: Record<string, unknown>[];
  recomposed: number;
  egressRewritten: number;
} {
  const byParent = new Map<string, Record<string, unknown>>();
  for (const s of shots) {
    const id = String(s.clientId ?? "");
    if (id && !isSplitChildShot(s)) {
      byParent.set(id, s);
    }
  }

  let recomposed = 0;
  let egressRewritten = 0;
  for (const s of shots) {
    if (!isSplitChildShot(s)) continue;
    const parentKey = String(
      s._stillBeatSplitId ?? s._visualSplitId ?? s._litXorSplitId ?? s._cuCastSplitId ?? "",
    );
    const parent = parentKey ? byParent.get(parentKey) : undefined;
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
    const av = (s.avCausality ?? parent?.avCausality) as { visualPeak?: string; audioBeat?: string } | undefined;
    if (av || peak) {
      s.avCausality = {
        ...(av ?? {}),
        visualPeak: peak,
        audioBeat: role === "reaction" ? av?.audioBeat : undefined,
      };
    }

    clearInheritedGeneration(s);
    if (rewriteChildEgress(s)) egressRewritten += 1;
    recomposed += 1;
  }
  return { shots, recomposed, egressRewritten };
}

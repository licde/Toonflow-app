/**
 * M10 — post-split slices: CHAIN-BEAT coverage, microExpression, durationTier by child role.
 */
import { auditLiteraryBeatCoverage } from "./literaryBeatCoverage";
import { asDialogueLineObjects } from "./dialogueCoverage";
import { isOffscreenLine } from "./onCameraDialogue";

function childRole(s: Record<string, unknown>): "speak" | "reaction" | "prop" | "other" {
  const beat = String(s.beatRole ?? s.visualSplitRole ?? "").toLowerCase();
  const vd = String(s.visualDescription ?? "");
  if (/prop|hand|扳指|道具/.test(beat + vd)) return "prop";
  if (/reaction|listen|听|insert/.test(beat)) return "reaction";
  const lines = asDialogueLineObjects(
    (s.narrative as { dialogue?: { lines?: unknown } } | undefined)?.dialogue?.lines,
  );
  const speak = lines.some((l) => {
    const t = String(l.text ?? "").trim();
    return t && !isOffscreenLine(l as never) && !/^[（(]/.test(t);
  });
  if (speak) return "speak";
  return "other";
}

const TIER: Record<string, number> = {
  speak: 1.0,
  reaction: 0.85,
  prop: 0.7,
  other: 0.8,
};

export function sliceChildrenAfterSplit(shots: Record<string, unknown>[]): {
  shots: Record<string, unknown>[];
  chainBeatBlocks: number;
  microSliced: number;
  durationSliced: number;
} {
  let microSliced = 0;
  let durationSliced = 0;
  const next = shots.map((s) => {
    const role = childRole(s);
    const isSplitChild = Boolean(s._stillBeatSplitId || s._visualSplitId || s._lipMultiSplit);
    if (!isSplitChild) return s;
    const out = { ...s } as Record<string, unknown>;
    const n = { ...((s.narrative as object) ?? {}) } as Record<string, unknown>;
    const sd = { ...((s.shotDesign as object) ?? {}) } as {
      performance?: { microExpression?: { eyes?: string; mouthDetail?: string } };
    };
    const perf = { ...(sd.performance ?? {}) };
    const micro = { ...(perf.microExpression ?? {}) };
    if (role === "speak") {
      if (!micro.mouthDetail) {
        micro.mouthDetail = "speaking";
        microSliced++;
      }
      if (!micro.eyes) micro.eyes = "engaged";
    } else if (role === "reaction") {
      if (!micro.mouthDetail || micro.mouthDetail === "speaking") {
        micro.mouthDetail = "closed";
        microSliced++;
      }
      if (!micro.eyes) micro.eyes = "listen";
    } else if (role === "prop") {
      if (micro.mouthDetail === "speaking") {
        micro.mouthDetail = "n/a";
        microSliced++;
      }
    }
    perf.microExpression = micro;
    sd.performance = perf;
    out.shotDesign = sd;

    const tier = TIER[role] ?? 0.8;
    out.durationTier = role;
    const dur = Number(s.duration ?? 0);
    if (dur > 0 && role !== "speak") {
      const target = Math.max(2, Math.round(dur * tier * 10) / 10);
      if (target < dur) {
        out.duration = target;
        durationSliced++;
      }
    }
    out.narrative = n;
    out.beatRole = out.beatRole ?? role;
    return out;
  });

  const findings = auditLiteraryBeatCoverage(next);
  // Heal CHAIN-BEAT untilClear — alias-aware graft (勿只诊不愈)
  if (findings.some((f) => f.id === "CHAIN-BEAT")) {
    try {
      const { healLiteraryBeatCoverage } =
        require("./literaryBeatCoverage") as typeof import("./literaryBeatCoverage");
      const healed = healLiteraryBeatCoverage(next);
      for (let i = 0; i < healed.shots.length; i++) next[i] = healed.shots[i]!;
    } catch {
      /* optional */
    }
    try {
      const { ensureChildVisualDescription } =
        require("./splitChildVisual") as typeof import("./splitChildVisual");
      for (let i = 0; i < next.length; i++) {
        const s = next[i]!;
        const parentVd = String(s._parentVisualDescription ?? "").trim();
        if (!parentVd || !(s._stillBeatSplitId || s._visualSplitId)) continue;
        const vd = String(s.visualDescription ?? "");
        // Always attempt ensure when still failing — do not skip on shared parent prefix
        const ensured = ensureChildVisualDescription({
          role: String(s.beatRole ?? s.visualSplitRole ?? "speak"),
          childVd: vd,
          parentVd,
        });
        if (ensured.visualDescription !== vd) {
          next[i] = { ...s, visualDescription: ensured.visualDescription };
        }
      }
    } catch {
      /* optional */
    }
  }
  const findings2 = auditLiteraryBeatCoverage(next);
  return {
    shots: next,
    chainBeatBlocks: findings2.filter((f) => f.id === "CHAIN-BEAT").length,
    microSliced,
    durationSliced,
  };
}

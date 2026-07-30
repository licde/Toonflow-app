/**
 * Post-IRD split field slicing — speak vs reaction attribution.
 */
import { hasOnCameraDialogue, onCameraDialogueTexts, isOffscreenLine } from "./onCameraDialogue";
import { asDialogueLineObjects } from "./dialogueCoverage";
import { resolveShotDurationSec } from "../quality/shotChainContract";
import { resolveRequiredDuration } from "../compilers/resolveRequiredDuration";

/**
 * After speak/react or onebeat split: route dialogue/audio/lip/charCodes/duration.
 * Also harden child VD ≥ minChars via parent anchor inheritance.
 */
export function sliceFieldsAfterIrdSplit(shots: Record<string, unknown>[]): {
  shots: Record<string, unknown>[];
  sliced: number;
} {
  let sliced = 0;
  const byParent = new Map<string, Record<string, unknown>>();
  for (const s of shots) {
    const id = String(s.clientId ?? "");
    if (id && !s._stillBeatSplitId && !s._visualSplitId) byParent.set(id, s);
  }

  const { ensureChildVisualDescription, isForbiddenSplitPlaceholder, stripReactionFieldsFromLines } =
    require("./splitChildVisual") as typeof import("./splitChildVisual");

  for (const s of shots) {
    const parentKey = String(s._stillBeatSplitId ?? s._visualSplitId ?? "").trim();
    if (!parentKey) continue;
    const role = String(s.visualSplitRole ?? s.beatRole ?? "").toLowerCase();
    const isReaction = /reaction|insert|listen|听/.test(role);
    const isSpeak = /speak|action|reveal|说/.test(role) || (!isReaction && role !== "insert");
    const parent = byParent.get(parentKey);
    const parentVd = String(
      s._parentVisualDescription ?? parent?.visualDescription ?? "",
    ).trim();
    if (parentVd && !s._parentVisualDescription) s._parentVisualDescription = parentVd;

    // Harden short / forbidden placeholder VD
    const ens = ensureChildVisualDescription({
      role: role || (isReaction ? "reaction" : "speak"),
      childVd: String(s.visualDescription ?? ""),
      parentVd,
      picture: (parent?.shotDesign as { picture?: string } | undefined)?.picture,
      composition: (parent?.shotDesign as { composition?: string } | undefined)?.composition,
    });
    if (ens.ok && (ens.healInduced || isForbiddenSplitPlaceholder(String(s.visualDescription ?? "")))) {
      s.visualDescription = ens.visualDescription;
      if (ens.healInduced) s._healInducedVd = true;
    } else if (!ens.ok) {
      s.irdConfirmRequired = true;
      s._healInducedVd = true;
    }

    const parentNarr = (parent?.narrative ?? s.narrative) as {
      dialogue?: { lines?: unknown };
    } | undefined;
    const parentLines = asDialogueLineObjects(parentNarr?.dialogue?.lines);
    const n = { ...((s.narrative as object) ?? {}) } as {
      dialogue?: { lines?: unknown[] };
      shotSize?: string;
    };

    if (isReaction || role === "insert") {
      const osOnly = parentLines.filter((l) => isOffscreenLine(l));
      n.dialogue = { lines: osOnly };
      const gen = { ...((s.generation as object) ?? {}) } as { audioPrompt?: string };
      gen.audioPrompt = "";
      s.generation = gen;
      const dur = resolveShotDurationSec(s);
      if (!dur.trusted || dur.durationSec < 2) s.duration = 2;
      // lip off
      const sd = { ...((s.shotDesign as object) ?? {}) } as { lipSyncPolicy?: string };
      sd.lipSyncPolicy = "none";
      s.shotDesign = sd;
      // Role-slice cast: reaction CU keeps at most one imaged code (avoid CU×N re-trigger)
      const parentCodes = Array.isArray(parent?.charCodes)
        ? (parent!.charCodes as string[])
        : Array.isArray(s.charCodes)
          ? (s.charCodes as string[])
          : [];
      if (parentCodes.length > 1) {
        const existing = Array.isArray(s.charCodes) ? (s.charCodes as string[]) : [];
        s.charCodes = existing.length === 1 ? existing : parentCodes.slice(0, 1);
      }
      sliced++;
    } else if (isSpeak) {
      const onCam = parentLines.filter((l) => String(l.text ?? "").trim() && !isOffscreenLine(l));
      const lines = stripReactionFieldsFromLines(onCam.length ? onCam : parentLines) as typeof parentLines;
      n.dialogue = { lines };
      const texts = onCameraDialogueTexts(lines);
      if (texts.length) {
        const gen = { ...((s.generation as object) ?? {}) } as { audioPrompt?: string };
        if (!String(gen.audioPrompt ?? "").trim()) {
          gen.audioPrompt = texts.join("\n");
          s.generation = gen;
        }
      }
      if (hasOnCameraDialogue(lines)) {
        try {
          const need = resolveRequiredDuration(s);
          const cur = resolveShotDurationSec(s).durationSec;
          const req = Number(need.required ?? 0);
          if (req > cur) s.duration = req;
        } catch {
          /* optional */
        }
      }
      if (parent?.peakId) s.peakId = parent.peakId;
      if (parent?.hookId) s.hookId = parent.hookId;
      if (parent?.literaryBeatRef) s.literaryBeatRef = parent.literaryBeatRef;
      sliced++;
    }

    // Inherit peak/hook on all children
    if (parent?.peakId && !s.peakId) s.peakId = parent.peakId;
    if (parent?.hookId && !s.hookId) s.hookId = parent.hookId;
    // Ensemble/speak children inherit full cast; reaction already sliced above
    if (
      parent?.charCodes &&
      Array.isArray(parent.charCodes) &&
      !s.charCodes &&
      !isReaction &&
      role !== "insert"
    ) {
      s.charCodes = [...(parent.charCodes as string[])];
    }

    s.narrative = n;
    s.burnParentForbidden = true;
    s.filePath = undefined;
  }

  return { shots, sliced };
}

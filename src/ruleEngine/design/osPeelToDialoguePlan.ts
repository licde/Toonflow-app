/**
 * Peel OS/VO from visual / audioCue into dialoguePlan lines (type:os) — no literary invent.
 */
import type { ScriptBundle } from "../bundle/types";
import { peelOsFromVisual } from "./expandStillOneBeat";

type OsPlanLine = {
  lineId: string;
  speaker?: string;
  text: string;
  type: "os";
  causedByActionId?: string;
  _provenance?: string;
};

function ensureDialoguePlan(bundle: ScriptBundle): { lines: OsPlanLine[] } {
  const pd = (bundle.planData ?? {}) as Record<string, unknown>;
  bundle.planData = pd as never;
  let dp = pd.dialoguePlan as { lines?: OsPlanLine[] } | undefined;
  if (!dp) {
    dp = { lines: [] };
    pd.dialoguePlan = dp;
  }
  if (!Array.isArray(dp.lines)) dp.lines = [];
  return dp as { lines: OsPlanLine[] };
}

function textExists(lines: OsPlanLine[], text: string): boolean {
  const t = text.trim();
  return lines.some((l) => String(l.text ?? "").trim() === t && String(l.type ?? "").toLowerCase() === "os");
}

/**
 * After still-onebeat / peel: push OS cues into dialoguePlan as type:os rows.
 * Also strips active lip when shot is OS-only.
 */
export function syncOsPeelToDialoguePlan(
  bundle: ScriptBundle,
  opts?: { stripOsLip?: boolean },
): { added: number; lipStripped: number } {
  const dp = ensureDialoguePlan(bundle);
  let added = 0;
  let lipStripped = 0;
  const shots = (bundle.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ?? [];

  for (const shot of shots) {
    const idx = Number(shot.shotIndex) || 0;
    const vd = String(shot.visualDescription ?? "");
    const peeled = peelOsFromVisual(vd);
    const narr = (shot.narrative as {
      audioCue?: string;
      dialogue?: { lines?: Array<{ text?: string; type?: string; speaker?: string }> };
      voiceIntent?: { type?: string };
    }) ?? {};
    const cueOs = String(narr.audioCue ?? "")
      .split(/[；;|]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2 && (/OS|画外|旁白|VO/i.test(s) || narr.voiceIntent?.type === "os"));
    const fromLines = (narr.dialogue?.lines ?? [])
      .filter((l) => /os|vo|画外|旁白/i.test(String(l.type ?? "")) || /（OS）|\(OS\)|画外/.test(String(l.speaker ?? "")))
      .map((l) => String(l.text ?? "").trim())
      .filter(Boolean);

    const osTexts = [...new Set([...peeled.osLines, ...cueOs, ...fromLines].map((t) => t.trim()).filter(Boolean))];

    for (let i = 0; i < osTexts.length; i++) {
      const text = osTexts[i]!;
      if (textExists(dp.lines, text)) continue;
      const line: OsPlanLine = {
        lineId: `OS-auto-${idx}-${i}-${text.slice(0, 8)}`,
        text,
        type: "os",
        speaker: "OS",
        causedByActionId: `A-os-stub-${idx}`,
        _provenance: "os_peel_to_dialoguePlan",
      };
      dp.lines.push(line);
      added++;
    }

    if (peeled.osLines.length && peeled.visual !== vd && peeled.visual.trim().length >= 8) {
      // Split children: rewrite VD to OS-peeled visual so parent OS dialogue does not stick on child
      const isChild = Boolean(
        shot._stillBeatSplitId ||
          shot._visualSplitId ||
          shot._litXorSplitId ||
          shot._cuCastSplitId ||
          shot.burnParentForbidden,
      );
      if (isChild) {
        shot.visualDescription = peeled.visual;
        const narrDlg = (shot.narrative as { dialogue?: { lines?: unknown[] } } | undefined)?.dialogue;
        if (narrDlg?.lines?.length) {
          const kept = (narrDlg.lines as Array<{ text?: string; type?: string; speaker?: string }>).filter(
            (l) =>
              !/os|vo|画外|旁白/i.test(String(l.type ?? "")) &&
              !/（OS）|\(OS\)|画外/.test(String(l.speaker ?? "")),
          );
          (shot.narrative as { dialogue?: { lines?: unknown[] } }).dialogue = { ...narrDlg, lines: kept };
        }
      }
    }

    if (opts?.stripOsLip !== false) {
      const onlyOs =
        osTexts.length > 0 &&
        !(narr.dialogue?.lines ?? []).some(
          (l) => String(l.text ?? "").trim() && !/os|vo|画外|旁白/i.test(String(l.type ?? l.speaker ?? "")),
        );
      if (onlyOs || narr.voiceIntent?.type === "os") {
        const sd = (shot.shotDesign as Record<string, unknown>) ?? {};
        const lip = String(sd.lipSyncPolicy ?? shot.lipSyncPolicy ?? "");
        if (lip && !/^silent|off|none|os$/i.test(lip)) {
          sd.lipSyncPolicy = "os";
          shot.shotDesign = sd;
          shot.lipSyncPolicy = "os";
          lipStripped++;
        } else if (!lip) {
          sd.lipSyncPolicy = "os";
          shot.shotDesign = sd;
          lipStripped++;
        }
      }
    }
  }

  return { added, lipStripped };
}

/** Stub missing causedByActionId on dialoguePlan lines with A-* provenance (no splitHint invent). */
export function stubCausedByActionIds(bundle: ScriptBundle): number {
  const pd = bundle.planData as { dialoguePlan?: { lines?: Array<Record<string, unknown>> } } | undefined;
  const lines = pd?.dialoguePlan?.lines;
  if (!lines?.length) return 0;
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (!String(l.text ?? "").trim()) continue;
    if (l.causedByActionId) continue;
    l.causedByActionId = `A-stub-${String(l.lineId ?? i)}`;
    l._causalityProvenance = "import_causal_stub";
    n++;
  }
  return n;
}

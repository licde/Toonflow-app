/**
 * M14 — after split: strip orphan lip from silent/prop shots; keep audioCue on speak children.
 * DB o_assetsRole2Audio stays role-level; shot-level cue/voiceIntent follow speak lines.
 */
import { asDialogueLineObjects } from "./dialogueCoverage";
import { isOffscreenLine } from "./onCameraDialogue";
import { resolveAudioShotLinkage } from "../quality/audioShotLinkage";

export function rebindAudioVoiceAfterSplit(shots: Record<string, unknown>[]): {
  shots: Record<string, unknown>[];
  rebound: number;
  clearedOrphanLip: number;
} {
  let rebound = 0;
  let clearedOrphanLip = 0;
  const next = shots.map((s) => {
    const link = resolveAudioShotLinkage(s);
    const n = { ...((s.narrative as object) ?? {}) } as {
      dialogue?: { lines?: unknown };
      audioCue?: string;
      voiceIntent?: { type?: string };
    };
    const lines = asDialogueLineObjects(n.dialogue?.lines);
    const speak = lines.filter((l) => {
      const t = String(l.text ?? "").trim();
      return t && !isOffscreenLine(l as never) && !/^[（(].*[）)]$/.test(t);
    });
    let changed = false;
    if (link.needLip === false && speak.length === 0) {
      if (n.voiceIntent?.type === "lip" || (s as { lipSyncPolicy?: string }).lipSyncPolicy === "required") {
        n.voiceIntent = { type: "os" };
        (s as { lipSyncPolicy?: string }).lipSyncPolicy = "off";
        clearedOrphanLip++;
        changed = true;
      }
    }
    if (speak.length >= 1 && link.needLip) {
      if (!n.voiceIntent || n.voiceIntent.type === "os") {
        n.voiceIntent = { type: "lip" };
        rebound++;
        changed = true;
      }
      const osCue = lines
        .filter((l) => isOffscreenLine(l as never))
        .map((l) => String(l.text ?? "").trim())
        .filter(Boolean);
      if (osCue.length) {
        const cue = [n.audioCue, ...osCue.map((t) => `OS：${t}`)].filter(Boolean).join("；");
        n.audioCue = cue.slice(0, 400);
        changed = true;
        rebound++;
      }
    }
    return changed ? { ...s, narrative: n } : s;
  });
  return { shots: next, rebound, clearedOrphanLip };
}

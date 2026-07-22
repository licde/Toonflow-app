/**
 * S1/S2: idempotent expand entry + React desc inherit from speak parent.
 */
import { expandDialogueClusters, type ClusterShot } from "./expandDialogueClusters";
import { flattenDialogueText } from "./dialogueCoverage";

export function splitMatrixExpand(
  shots: unknown[],
  opts?: { profileId?: string; intensity?: number },
): ReturnType<typeof expandDialogueClusters> {
  const first = expandDialogueClusters(shots, opts);
  // second pass must no-op (idempotent ownership)
  return expandDialogueClusters(first.shots, opts);
}

/** React / emphasize shots inherit literary prompt anchors from speak parent without copying dialogue. */
export function inheritReactDescFromSpeak(shots: ClusterShot[]): ClusterShot[] {
  const byLine = new Map<string, ClusterShot>();
  for (const s of shots) {
    if (s.beatRole === "speak") {
      byLine.set(String(s.clusterLineId ?? s.clientId ?? s.shotIndex), s);
    }
  }
  return shots.map((s) => {
    if (s.beatRole !== "reaction" && s.beatRole !== "emphasize") return s;
    const parent = byLine.get(String(s.clusterParentId ?? s.clusterLineId ?? ""));
    if (!parent) return s;
    const parentPrompt = String(parent.prompt ?? "").replace(flattenDialogueText(parent.narrative?.dialogue?.lines), "").trim();
    return {
      ...s,
      prompt: s.prompt || (parentPrompt ? `${parentPrompt}（反应）` : s.prompt),
      narrative: {
        ...(s.narrative ?? {}),
        // keep empty dialogue
        dialogue: { lines: [] },
        emotionIntensity: s.narrative?.emotionIntensity ?? parent.narrative?.emotionIntensity,
      },
    };
  });
}

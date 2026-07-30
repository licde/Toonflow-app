/**
 * After reverse repair: cascade stale on forwardStages and clear videoPass.
 * Also clears composeHash / videoDesc stale markers for split children.
 */
export function cascadeForwardStale(input: {
  shots: Record<string, unknown>[];
  forwardStages?: string[];
  staleClientIds?: string[];
}): {
  shots: Record<string, unknown>[];
  clearedVideoPass: number;
  markedStale: number;
} {
  const stages = new Set((input.forwardStages ?? ["SB", "MD-IMG", "EN"]).map((s) => s.toUpperCase()));
  const touchStill = stages.has("MD-IMG") || stages.has("AS") || stages.has("SB");
  const touchEn = stages.has("EN") || stages.has("MD-VID");
  const idSet = input.staleClientIds?.length
    ? new Set(input.staleClientIds.map(String))
    : null;

  let clearedVideoPass = 0;
  let markedStale = 0;
  for (const s of input.shots) {
    const id = String(s.clientId ?? s.shotIndex ?? "");
    if (idSet && id && !idSet.has(id)) continue;

    if (touchStill) {
      s.promptState = "stale";
      s.composeHash = undefined;
      s.stillQuality = s.stillQuality === "hq_ok" && s.filePath ? "stale_inherited" : s.stillQuality;
      markedStale += 1;
    }
    if (touchEn) {
      if (s.videoPass === true || s.videoPassAt) {
        s.videoPass = false;
        s.videoPassAt = undefined;
        s.videoStale = true;
        clearedVideoPass += 1;
      }
      // Force video prompt recompile
      if (s.videoDesc || s.videoPrompt) {
        s.videoStale = true;
      }
      let reason: Record<string, unknown> = {};
      try {
        reason =
          typeof s.reason === "string"
            ? JSON.parse(String(s.reason || "{}"))
            : { ...((s.reason as Record<string, unknown>) ?? {}) };
      } catch {
        reason = {};
      }
      reason.videoPass = false;
      reason.videoStale = true;
      reason.staleCascadeAt = new Date().toISOString();
      s.reason = reason;
    }
  }
  return { shots: input.shots, clearedVideoPass, markedStale };
}

/** Prefer mediaSlots keyed by clientId over bare storyboard index. */
export function rebindMediaSlotsByClientId(
  slots: Array<{ shotIndex?: number; clientId?: string; role?: string; [k: string]: unknown }> | undefined,
  shots: Record<string, unknown>[],
): typeof slots {
  if (!slots?.length) return slots;
  const byClient = new Map(shots.map((s) => [String(s.clientId ?? ""), s]));
  const byIndex = new Map(shots.map((s) => [Number(s.shotIndex), s]));
  return slots.map((slot) => {
    const cid = String(slot.clientId ?? "");
    if (cid && byClient.has(cid)) {
      const sh = byClient.get(cid)!;
      return { ...slot, shotIndex: Number(sh.shotIndex), clientId: cid };
    }
    const idx = Number(slot.shotIndex);
    if (Number.isFinite(idx) && byIndex.has(idx)) {
      const sh = byIndex.get(idx)!;
      return { ...slot, clientId: String(sh.clientId ?? slot.clientId ?? ""), shotIndex: idx };
    }
    return slot;
  });
}

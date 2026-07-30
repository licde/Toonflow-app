/**
 * M7: stamp designContentHash onto o_videoTrack.reason when video prompt is persisted.
 */
import type { Knex } from "knex";
import { buildShotChainContract } from "../quality/shotChainContract";

export function mergeTrackReasonMeta(
  existing: unknown,
  patch: Record<string, unknown>,
): string {
  let prev: Record<string, unknown> = {};
  try {
    if (typeof existing === "string") {
      const s = String(existing || "").trim();
      if (!s) prev = {};
      else if (s.startsWith("{")) prev = JSON.parse(s);
      else prev = { message: s }; // plain fail string — keep; never wipe sibling meta on next merge
    } else {
      prev = { ...((existing as Record<string, unknown>) ?? {}) };
    }
  } catch {
    prev =
      typeof existing === "string" && String(existing).trim()
        ? { message: String(existing) }
        : {};
  }
  return JSON.stringify({ ...prev, ...patch });
}

/** Patch track.reason without wiping designContentHash / dialogueFingerprint. */
export async function patchVideoTrackReason(
  db: Knex,
  trackId: number,
  patch: Record<string, unknown> & { state?: string; prompt?: string },
): Promise<void> {
  const row = await db("o_videoTrack").where({ id: trackId }).select("reason").first();
  const { state, prompt, ...meta } = patch;
  const reason = mergeTrackReasonMeta(row?.reason, meta);
  await db("o_videoTrack")
    .where({ id: trackId })
    .update({
      reason,
      ...(state != null ? { state } : {}),
      ...(prompt != null ? { prompt } : {}),
    });
}

/** Build stamp fields from a design/package shot row. */
export function designHashStampFromShot(shot: Record<string, unknown> | null | undefined): {
  designContentHash?: string;
  dialogueFingerprint?: string;
  videoPromptCompiledAt: string;
  videoStale: false;
} {
  const at = new Date().toISOString();
  if (!shot) {
    return { videoPromptCompiledAt: at, videoStale: false };
  }
  try {
    const c = buildShotChainContract(shot);
    return {
      designContentHash: c.designContentHash,
      dialogueFingerprint: c.dialogueFingerprint,
      videoPromptCompiledAt: at,
      videoStale: false,
    };
  } catch {
    return { videoPromptCompiledAt: at, videoStale: false };
  }
}

/** Persist prompt + design hash stamp on track (clears videoStale). */
export async function persistVideoTrackPromptWithDesignHash(
  db: Knex,
  input: {
    trackId: number;
    prompt: string;
    state?: string;
    shot?: Record<string, unknown> | null;
    extraReason?: Record<string, unknown>;
  },
): Promise<void> {
  const row = await db("o_videoTrack").where({ id: input.trackId }).select("reason").first();
  const stamp = designHashStampFromShot(input.shot ?? undefined);
  const reason = mergeTrackReasonMeta(row?.reason, {
    ...stamp,
    ...(input.extraReason ?? {}),
  });
  await db("o_videoTrack")
    .where({ id: input.trackId })
    .update({
      prompt: input.prompt,
      reason,
      ...(input.state != null ? { state: input.state } : {}),
    });
}

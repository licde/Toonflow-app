/**
 * Persist lifecycle invalidation onto o_storyboard.reason meta.
 */
import type { Knex } from "knex";
import {
  mergeReasonMeta,
  parseStillMetaFromReason,
  type StillQualityMeta,
} from "../compilers/stillQuality";
import { applyLifecycleInvalidation, type LifecycleEvent } from "./lifecycleInvalidate";
import { buildPrimaryBlock } from "../compilers/primaryBlock";

export async function applyStoryboardLifecycle(
  db: Knex,
  input: { storyboardId: number; event: LifecycleEvent },
): Promise<{ ok: boolean; stillMeta?: StillQualityMeta }> {
  const row = await db("o_storyboard").where({ id: input.storyboardId }).first();
  if (!row) return { ok: false };
  const current = parseStillMetaFromReason(row.reason);
  const result = applyLifecycleInvalidation(input.event, current);
  if (!result.stillMeta && result.dirty.length === 0) return { ok: true };
  const primary = buildPrimaryBlock(result.primaryNextStep, { stage: "burn" });
  const reason = mergeReasonMeta(row.reason, {
    ...(result.stillMeta ?? {}),
    dirty: result.dirty,
    primaryNextStep: result.primaryNextStep,
    nextStep: result.primaryNextStep,
    userMessage: primary.userMessage,
    ctaLabel: primary.ctaLabel,
    lifecycleEvent: input.event,
  });
  await db("o_storyboard").where({ id: input.storyboardId }).update({ reason });
  return { ok: true, stillMeta: result.stillMeta };
}

/** Invalidate all storyboards linked to an asset (look change). */
export async function invalidateStoryboardsForAsset(
  db: Knex,
  assetId: number,
): Promise<number> {
  const links = await db("o_assets2Storyboard").where({ assetId }).select("storyboardId");
  let n = 0;
  for (const link of links as { storyboardId: number }[]) {
    if (!link.storyboardId) continue;
    await applyStoryboardLifecycle(db, {
      storyboardId: link.storyboardId,
      event: "asset_look_changed",
    });
    n += 1;
  }
  return n;
}

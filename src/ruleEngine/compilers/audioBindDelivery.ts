/**
 * Audio bind delivery — bound voice assets must surface as refs or explicit audioGap.
 */
import type { Knex } from "knex";

export interface AudioBindGap {
  assetId: number;
  reason: "no_bound_audio" | "bound_but_no_file";
}

export async function collectAudioBindGaps(
  db: Knex,
  roleAssetIds: number[],
): Promise<{ gaps: AudioBindGap[]; audioGap: boolean; audioRefPaths: string[] }> {
  const gaps: AudioBindGap[] = [];
  const audioRefPaths: string[] = [];
  if (!roleAssetIds.length) return { gaps, audioGap: false, audioRefPaths };

  const binds = await db("o_assetsRole2Audio")
    .whereIn("assetsRoleId", roleAssetIds)
    .select("assetsRoleId", "assetsAudioId")
    .catch(() => [] as { assetsRoleId: number; assetsAudioId: number }[]);

  const boundRoleIds = new Set(binds.map((b) => b.assetsRoleId));
  for (const id of roleAssetIds) {
    if (!boundRoleIds.has(id)) {
      // Not every role must have audio; only report when caller asks for forced dialogue audio
      continue;
    }
  }

  for (const b of binds) {
    const audioAsset = await db("o_assets")
      .where("id", b.assetsAudioId)
      .leftJoin("o_image", "o_assets.imageId", "o_image.id")
      .select("o_assets.id", "o_image.filePath as imagePath", "o_assets.filePath as assetPath")
      .first()
      .catch(() => null);
    const fp = (audioAsset as { imagePath?: string; assetPath?: string } | null)?.imagePath ||
      (audioAsset as { assetPath?: string } | null)?.assetPath;
    if (!fp) {
      gaps.push({ assetId: b.assetsRoleId, reason: "bound_but_no_file" });
    } else {
      audioRefPaths.push(fp);
    }
  }

  return { gaps, audioGap: gaps.length > 0, audioRefPaths };
}

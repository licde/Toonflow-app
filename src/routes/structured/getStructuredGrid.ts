import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { getAllShotHistory } from "@/services/structuredScript/promptHistory";
import { shotReferenceSummary } from "@/services/structuredScript/diffExplainer";
import type { StructuredShot } from "@/services/structuredScript/types";

const router = express.Router();

function parseReason(reason?: string | null) {
  if (!reason) return null;
  try {
    return JSON.parse(reason);
  } catch {
    return { raw: reason };
  }
}

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
  }),
  async (req, res) => {
    const { projectId, scriptId } = req.body;
    const shots = await u
      .db("o_storyboard")
      .where({ projectId, scriptId })
      .whereNot("state", "archived")
      .orderBy("index", "asc");

    const historyMap = await getAllShotHistory(projectId, scriptId);

    const grid = await Promise.all(
      shots.map(async (sb) => {
        const assetIds = await u.db("o_assets2Storyboard").where("storyboardId", sb.id).orderBy("rowid").pluck("assetId");
        const videos = sb.trackId ? await u.db("o_video").where("videoTrackId", sb.trackId).orderBy("id", "desc") : [];
        let shotMeta: StructuredShot | null = null;
        let 镜号: number | undefined;
        if (sb.shotMeta) {
          try {
            shotMeta = JSON.parse(sb.shotMeta) as StructuredShot;
            镜号 = shotMeta.镜号;
          } catch {
            /* */
          }
        }
        const history = historyMap[String(sb.id)];
        const explain = parseReason(sb.reason);
        const lastSyncRevision = history?.syncRevisions?.[history.syncRevisions.length - 1];
        return {
          id: sb.id,
          镜号,
          track: sb.track,
          duration: sb.duration,
          state: sb.state,
          promptSource: sb.promptSource,
          promptSourceHash: sb.promptSourceHash,
          prompt: sb.prompt,
          videoPrompt: sb.videoPrompt,
          videoDesc: sb.videoDesc,
          imageSrc: sb.filePath ? await u.oss.getSmallImageUrl(sb.filePath) : "",
          associateAssetsIds: assetIds,
          videoVersions: await Promise.all(
            videos.map(async (v) => ({
              id: v.id,
              state: v.state,
              src: v.filePath ? await u.oss.getSmallImageUrl(v.filePath) : "",
              active: sb.trackId ? (await u.db("o_videoTrack").where("id", sb.trackId).first())?.videoId === v.id : false,
            })),
          ),
          reference: shotMeta ? shotReferenceSummary(shotMeta) : history?.shotMetaOriginal ? shotReferenceSummary(history.shotMetaOriginal) : null,
          original: history
            ? {
                prompt: history.promptOriginal,
                videoPrompt: history.videoPromptOriginal,
                videoDesc: history.videoDescOriginal,
                shotMeta: history.shotMetaOriginal,
              }
            : null,
          lastSyncRevision,
          explain,
        };
      }),
    );

    const manifest = await u.db("o_agentWorkData").where({ projectId, episodesId: scriptId, key: "assembleManifest" }).first();

    return res.status(200).send(
      success({
        shots: grid,
        assembleManifest: manifest?.data ? JSON.parse(manifest.data) : null,
      }),
    );
  },
);

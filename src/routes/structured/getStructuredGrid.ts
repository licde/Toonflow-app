import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";

const router = express.Router();

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

    const grid = await Promise.all(
      shots.map(async (sb) => {
        const assetIds = await u.db("o_assets2Storyboard").where("storyboardId", sb.id).orderBy("rowid").pluck("assetId");
        const videos = sb.trackId
          ? await u.db("o_video").where("videoTrackId", sb.trackId).orderBy("id", "desc")
          : [];
        let 镜号: number | undefined;
        if (sb.shotMeta) {
          try {
            镜号 = JSON.parse(sb.shotMeta).镜号;
          } catch {
            /* */
          }
        }
        return {
          id: sb.id,
          镜号,
          track: sb.track,
          duration: sb.duration,
          state: sb.state,
          promptSource: sb.promptSource,
          promptSourceHash: sb.promptSourceHash,
          imageSrc: sb.filePath ? await u.oss.getSmallImageUrl(sb.filePath) : "",
          videoPrompt: sb.videoPrompt,
          associateAssetsIds: assetIds,
          videoVersions: await Promise.all(
            videos.map(async (v) => ({
              id: v.id,
              state: v.state,
              src: v.filePath ? await u.oss.getSmallImageUrl(v.filePath) : "",
              active: sb.trackId
                ? (await u.db("o_videoTrack").where("id", sb.trackId).first())?.videoId === v.id
                : false,
            })),
          ),
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

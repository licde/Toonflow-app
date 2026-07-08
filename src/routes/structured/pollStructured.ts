import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    storyboardIds: z.array(z.number()),
  }),
  async (req, res) => {
    const { storyboardIds } = req.body;
    const rows = await u.db("o_storyboard").whereIn("id", storyboardIds);

    const result = await Promise.all(
      rows.map(async (sb) => {
        const images = sb.id
          ? await u.db("o_image").where("storyboardId", sb.id).orderBy("id", "desc")
          : [];
        const track = sb.trackId ? await u.db("o_videoTrack").where("id", sb.trackId).first() : null;
        const videos = sb.trackId
          ? await u.db("o_video").where("videoTrackId", sb.trackId).orderBy("id", "desc")
          : [];

        return {
          storyboardId: sb.id,
          state: sb.state,
          imageSrc: sb.filePath ? await u.oss.getSmallImageUrl(sb.filePath) : null,
          trackState: track?.state ?? null,
          activeVideoId: track?.videoId ?? null,
          images: await Promise.all(
            images.map(async (img) => ({
              id: img.id,
              state: img.state,
              src: img.filePath ? await u.oss.getSmallImageUrl(img.filePath) : null,
              active: sb.imageId === img.id,
            })),
          ),
          videos: await Promise.all(
            videos.map(async (v) => ({
              id: v.id,
              state: v.state,
              src: v.filePath ? await u.oss.getSmallImageUrl(v.filePath) : null,
              active: track?.videoId === v.id,
            })),
          ),
        };
      }),
    );

    return res.status(200).send(success(result));
  },
);

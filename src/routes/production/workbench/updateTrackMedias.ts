import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    trackId: z.number(),
    medias: z.array(
      z.object({
        id: z.number().optional(),
        sources: z.string(),
        src: z.string().optional(),
        fileType: z.string().optional(),
      }),
    ),
  }),
  async (req, res) => {
    const { trackId, medias } = req.body;
    await u.db("o_videoTrack").where("id", trackId).update({ medias: JSON.stringify(medias) });
    return res.status(200).send(success({ trackId }));
  },
);

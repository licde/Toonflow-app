import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    scriptId: z.number(),
    trackIds: z.array(z.number()),
  }),
  async (req, res) => {
    const { scriptId, trackIds } = req.body;
    for (let i = 0; i < trackIds.length; i++) {
      await u.db("o_videoTrack").where({ id: trackIds[i], scriptId }).update({ index: i });
    }
    return res.status(200).send(success({ updated: trackIds.length }));
  },
);

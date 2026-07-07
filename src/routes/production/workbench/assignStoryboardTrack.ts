import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    storyboardId: z.number(),
    trackId: z.number(),
  }),
  async (req, res) => {
    const { storyboardId, trackId } = req.body;
    await u.db("o_storyboard").where("id", storyboardId).update({ trackId });
    return res.status(200).send(success({ storyboardId, trackId }));
  },
);

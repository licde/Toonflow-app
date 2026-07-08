import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { selectActiveVideo } from "@/services/structuredScript/generation";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    trackId: z.number(),
    videoId: z.number(),
  }),
  async (req, res) => {
    const { trackId, videoId } = req.body;
    const result = await selectActiveVideo(trackId, videoId);
    return res.status(200).send(success({ message: "已切换视频版本", ...result }));
  },
);

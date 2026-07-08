import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { switchTrackRoute } from "@/lib/dramaPack/trackVideoService";
import u from "@/utils";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    trackId: z.number(),
    routeKey: z.string(),
  }),
  async (req, res) => {
    const { trackId, routeKey } = req.body;
    try {
      const result = await switchTrackRoute(trackId, routeKey);
      if (!result.ok) return res.status(400).send(error(result.message));
      res.status(200).send(success(result));
    } catch (e) {
      res.status(400).send(error(u.error(e).message));
    }
  },
);

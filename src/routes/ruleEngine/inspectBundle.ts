import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { inspectBundle } from "@/ruleEngine/portable/inspectBundle";
import type { UnifiedClosureResponse } from "@/ruleEngine/portable/types";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    bundle: z.any(),
    tier: z.enum(["T1", "T2", "T3"]).optional(),
    genError: z.string().optional(),
    sfRound: z.number().optional(),
  }),
  async (req, res) => {
    try {
      const { bundle, tier, genError, sfRound } = req.body;
      const result = inspectBundle(bundle, { tier, genError, sfRound });
      const payload: UnifiedClosureResponse = {
        ...result,
        endpoint: "ext",
      };
      return res.status(200).send(success(payload));
    } catch (e) {
      return res.status(400).send(error(e instanceof Error ? e.message : String(e)));
    }
  },
);

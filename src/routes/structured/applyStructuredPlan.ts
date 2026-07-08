import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { applyStructuredPlan } from "@/services/structuredScript/applyPlan";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    mode: z.enum(["syncApply", "manualApply"]).optional(),
    scope: z.union([z.enum(["dirty", "all"]), z.array(z.number())]).optional(),
    phases: z.array(z.enum(["variants", "images", "videos", "assemble"])).optional(),
    qualityProfileId: z.string().optional(),
    audioOverride: z.boolean().optional(),
    tierOverride: z.enum(["1K", "2K", "4K"]).optional(),
    resolutionOverride: z.string().optional(),
    concurrency: z.number().min(1).max(10).optional(),
  }),
  async (req, res) => {
    const body = req.body;
    try {
      const result = await applyStructuredPlan({
        projectId: body.projectId,
        scriptId: body.scriptId,
        mode: body.mode ?? "manualApply",
        scope: body.scope,
        phases: body.phases,
        qualityProfileId: body.qualityProfileId,
        audioOverride: body.audioOverride,
        tierOverride: body.tierOverride,
        resolutionOverride: body.resolutionOverride,
        concurrency: body.concurrency,
      });
      return res.status(200).send(success(result));
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);

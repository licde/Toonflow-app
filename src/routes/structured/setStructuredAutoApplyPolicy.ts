import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { setAutoApplyPolicy } from "@/services/structuredScript/autoApplyPolicy";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    policy: z.object({
      enabled: z.boolean().optional(),
      scope: z.enum(["dirtyOnly", "all"]).optional(),
      autoApplyOnSync: z.boolean().optional(),
      phases: z.array(z.enum(["variants", "images", "videos", "assemble"])).optional(),
      qualityProfileId: z.string().optional(),
      concurrency: z.number().min(1).max(10).optional(),
      retry: z.number().min(0).max(5).optional(),
      includeArchived: z.boolean().optional(),
      audioOverride: z.boolean().optional(),
    }),
  }),
  async (req, res) => {
    const { projectId, scriptId, policy } = req.body;
    const merged = await setAutoApplyPolicy(projectId, scriptId, policy);
    return res.status(200).send(success(merged));
  },
);

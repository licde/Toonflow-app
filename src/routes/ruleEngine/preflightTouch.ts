import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { preflightTouch, syncFromFlowData } from "@/ruleEngine/facade";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    script: z.string().optional(),
    scriptPlan: z.string().optional(),
    storyboardTable: z.string().optional(),
    storyboard: z.array(z.any()).optional(),
    /** When set, shot-level gates (V10, MODE-AGNES) only check these storyboards. */
    storyboardIds: z.array(z.number()).optional(),
    mode: z.string().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId, script, scriptPlan, storyboardTable, storyboard, storyboardIds } = req.body;
    try {
      let pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      if (!pkg) {
        pkg = await syncFromFlowData(u.db, { projectId, scriptId, script, scriptPlan, storyboardTable, storyboard });
      }
      const result = await preflightTouch(u.db, pkg, script ?? "", {
        storyboardIds: Array.isArray(storyboardIds) ? storyboardIds : undefined,
      });
      return res.status(200).send(success(result));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

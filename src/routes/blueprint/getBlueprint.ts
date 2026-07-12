import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadProjectBlueprint, saveProjectBlueprint } from "@/ruleEngine/storage/episodePackageStore";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
  }),
  async (req, res) => {
    try {
      const { projectId } = req.body;
      const blueprint = await loadProjectBlueprint(u.db, projectId);
      return res.status(200).send(success({ globalAnchors: blueprint?.globalAnchors ?? blueprint ?? null }));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

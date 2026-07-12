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
    globalAnchors: z.any(),
  }),
  async (req, res) => {
    try {
      const { projectId, globalAnchors } = req.body;
      const existing = (await loadProjectBlueprint(u.db, projectId)) ?? {};
      await saveProjectBlueprint(u.db, projectId, { ...existing, globalAnchors });
      return res.status(200).send(success());
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

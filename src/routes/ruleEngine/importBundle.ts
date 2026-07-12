import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { importEpisodeBundle } from "@/ruleEngine/bundle/importAdapter";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    bundle: z.any(),
    targetScriptId: z.number().optional(),
    importMode: z.enum(["create", "update", "upsert"]).optional(),
    mergeStrategy: z.enum(["replaceAll", "mergeLayers", "preserveMedia"]).optional(),
    validateOnly: z.boolean().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, bundle, targetScriptId, importMode, mergeStrategy, validateOnly } = req.body;
      const result = await importEpisodeBundle(u.db, bundle, {
        projectId,
        targetScriptId,
        importMode: importMode ?? "upsert",
        mergeStrategy: mergeStrategy ?? "replaceAll",
        validateOnly: validateOnly === true,
      });
      return res.status(200).send(success(result));
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);

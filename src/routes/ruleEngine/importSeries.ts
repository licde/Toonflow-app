import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { importSeriesBundle } from "@/ruleEngine/bundle/importAdapter";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    bundle: z.any(),
    importMode: z.enum(["create", "update", "upsert"]).optional(),
    mergeStrategy: z.enum(["replaceAll", "mergeLayers", "preserveMedia"]).optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, bundle, importMode, mergeStrategy } = req.body;
      const results = await importSeriesBundle(u.db, bundle, {
        projectId,
        importMode: importMode ?? "upsert",
        mergeStrategy: mergeStrategy ?? "replaceAll",
      });
      return res.status(200).send(success({ episodes: results }));
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);

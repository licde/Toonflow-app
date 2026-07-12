import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { exportFullBundle } from "@/ruleEngine/bundle/importAdapter";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId } = req.body;
      const bundle = await exportFullBundle(u.db, projectId, scriptId);
      return res.status(200).send(success(bundle));
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);

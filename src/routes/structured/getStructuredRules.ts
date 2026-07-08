import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { getStructuredRulesData } from "@/services/structuredScript/rulesService";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number().optional(),
    scriptId: z.number().optional(),
  }),
  async (req, res) => {
    const { projectId, scriptId } = req.body;
    const data = await getStructuredRulesData(
      projectId != null && scriptId != null ? { projectId, scriptId } : undefined,
    );
    return res.status(200).send(success(data));
  },
);

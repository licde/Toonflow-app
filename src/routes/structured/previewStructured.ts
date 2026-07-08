import express from "express";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { validateStructuredScript } from "@/services/structuredScript/schema";
import { validateStructuredScriptFull } from "@/services/structuredScript/validator";
import { buildPreview } from "@/services/generationContext/PromptCompiler";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    json: z.record(z.string(), z.unknown()),
    episodeIndex: z.number().optional(),
  }),
  async (req, res) => {
    const { json, episodeIndex = 0 } = req.body;
    const parsed = validateStructuredScript(json);
    if (!parsed.success) return res.status(400).send(error(parsed.error.message));
    const validation = validateStructuredScriptFull(parsed.data);
    return res.status(200).send(
      success({
        ...buildPreview({ json: parsed.data as any, episodeIndex }),
        validation,
      }),
    );
  },
);

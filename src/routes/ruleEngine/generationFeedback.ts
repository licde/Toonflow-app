import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generationFeedbackPort } from "@/ruleEngine/ports/generationFeedback";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    storyboardId: z.number(),
    error: z.string(),
    vendor: z.string().optional(),
    projectId: z.number().optional(),
    scriptId: z.number().optional(),
  }),
  async (req, res) => {
    try {
      const { storyboardId, error: errMsg, vendor, projectId, scriptId } = req.body;
      const result = await generationFeedbackPort.classifyFailure({
        modality: "image",
        shotId: String(storyboardId),
        error: errMsg,
        vendorCode: vendor,
      });
      return res.status(200).send(success(result));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

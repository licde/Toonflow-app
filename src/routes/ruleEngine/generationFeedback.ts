import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generationFeedbackPort } from "@/ruleEngine/ports/generationFeedback";
import { buildRePushPlan } from "@/ruleEngine/design/reverseRouteEngine";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    storyboardId: z.number().optional(),
    trackId: z.number().optional(),
    error: z.string(),
    vendor: z.string().optional(),
    projectId: z.number().optional(),
    scriptId: z.number().optional(),
    modality: z.enum(["image", "video", "audio"]).optional(),
    prompt: z.string().optional(),
  }),
  async (req, res) => {
    try {
      const { storyboardId, trackId, error: errMsg, vendor, modality = "image", prompt } = req.body;
      const shotId = String(storyboardId ?? trackId ?? "unknown");
      const result = await generationFeedbackPort.classifyFailure({
        modality,
        shotId,
        error: errMsg,
        vendorCode: vendor,
        prompt,
      });
      const triggerRaw = result.ruleId || result.category || "";
      const triggerAlias: Record<string, string> = {
        cref_missing: "img_cref_missing",
        missing_reference: "video_first_frame_missing",
      };
      const trigger = triggerAlias[triggerRaw] ?? triggerRaw;
      const rePushPlan =
        trigger === "vendor_passthrough" || result.category === "vendor_passthrough"
          ? []
          : trigger
            ? buildRePushPlan([trigger])
            : [];
      return res.status(200).send(success({ ...result, ruleId: trigger || result.ruleId, rePushPlan }));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

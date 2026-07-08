import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { getShotHistory } from "@/services/structuredScript/promptHistory";
import { shotReferenceSummary } from "@/services/structuredScript/diffExplainer";
import type { StructuredShot } from "@/services/structuredScript/types";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    storyboardId: z.number(),
  }),
  async (req, res) => {
    const { projectId, scriptId, storyboardId } = req.body;
    const history = await getShotHistory(projectId, scriptId, storyboardId);
    let reference = null;
    if (history?.shotMetaOriginal) {
      reference = shotReferenceSummary(history.shotMetaOriginal);
    }
    return res.status(200).send(
      success({
        history,
        reference,
      }),
    );
  },
);

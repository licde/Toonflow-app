import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { generateTrackPrompt, loadVideoWorkbench, saveVideoWorkbench, computeInputHash } from "@/lib/dramaPack/trackVideoService";
import { loadTrackRefSlots } from "@/lib/dramaPack/refSlotBuilder";
import { buildPromptSourceTag } from "@/lib/dramaPack/videoWorkbenchGuard";
import { resolveVideoPromptRoute } from "@/lib/dramaPack/videoPromptUtils";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    trackId: z.number(),
    projectId: z.number(),
    model: z.string(),
    mode: z.string(),
    info: z
      .array(
        z.object({
          id: z.number(),
          sources: z.string(),
        }),
      )
      .optional(),
    refSlots: z
      .array(
        z.object({
          slot: z.number(),
          source: z.string(),
          id: z.number(),
          label: z.string(),
          lockCode: z.string().optional(),
        }),
      )
      .optional(),
  }),
  async (req, res) => {
    const { trackId, projectId, model, mode } = req.body;
    await u.db("o_videoTrack").where({ id: trackId }).update({ state: "生成中" });

    try {
      const [, modelData = ""] = model.split(/:(.+)/);
      const routeKey = resolveVideoPromptRoute(modelData, mode).modeLabel;
      const result = await generateTrackPrompt(trackId, { projectId, model, mode, routeKey, respectImport: false });
      const refCount = (await loadTrackRefSlots(trackId)).length;
      const promptSource = buildPromptSourceTag(model, mode, result.prompt, refCount);

      await u.db("o_videoTrack").where({ id: trackId }).update({
        state: "已完成",
        prompt: result.prompt,
        promptSource,
      });

      const track = await u.db("o_videoTrack").where("id", trackId).select("scriptId").first();
      if (track?.scriptId) {
        const wb = await loadVideoWorkbench(track.scriptId, projectId);
        const plan = wb.trackPlans[String(trackId)] ?? { mediasHash: "", inputHash: "", prompts: {} };
        plan.prompts[routeKey] = {
          prompt: result.prompt,
          promptSource,
          generatedAt: Date.now(),
          inputHash: await computeInputHash(trackId, routeKey, mode),
        };
        plan.inputHash = plan.prompts[routeKey].inputHash;
        plan.activeRoute = routeKey;
        await saveVideoWorkbench(track.scriptId, projectId, { trackPlans: { [String(trackId)]: plan } });
      }

      res.status(200).send(success(result.prompt));
    } catch (e) {
      await u.db("o_videoTrack").where({ id: trackId }).update({
        state: "生成失败",
        reason: u.error(e).message,
      });
      res.status(400).send(error(u.error(e).message));
    }
  },
);

import express from "express";
import u from "@/utils";
import pLimit from "p-limit";
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
    projectId: z.number(),
    trackData: z
      .array(
        z.object({
          trackId: z.number(),
          info: z
            .array(
              z.object({
                id: z.number(),
                sources: z.string(),
              }),
            )
            .optional(),
          refSlots: z.array(z.object({ slot: z.number(), source: z.string(), id: z.number(), label: z.string() })).optional(),
        }),
      )
      .optional(),
    trackIds: z.array(z.number()).optional(),
    mode: z.string(),
    model: z.string(),
    concurrentCount: z.number().optional(),
    respectImport: z.boolean().optional(),
    recomposeBeforeGenerate: z.boolean().optional(),
  }),
  async (req, res) => {
    const { projectId, mode, model, concurrentCount = 5, respectImport = false } = req.body;
    const trackIds: number[] =
      req.body.trackIds ??
      (req.body.trackData as { trackId: number }[] | undefined)?.map((t) => t.trackId) ??
      [];

    if (!trackIds.length) {
      return res.status(400).send(error("未指定 trackIds"));
    }

    try {
      const [, modelData = ""] = model.split(/:(.+)/);
      const routeKey = resolveVideoPromptRoute(modelData, mode).modeLabel;

      await u.db("o_videoTrack").whereIn("id", trackIds).update({ state: "生成中" });

      const limit = pLimit(concurrentCount ?? 5);
      await Promise.all(
        trackIds.map((trackId: number) =>
          limit(async () => {
            try {
              const result = await generateTrackPrompt(trackId, { projectId, model, mode, routeKey, respectImport });
              const refCount = (await loadTrackRefSlots(trackId)).length;
              const promptSource = buildPromptSourceTag(model, mode, result.prompt, refCount);
              await u.db("o_videoTrack").where({ id: trackId }).update({
                prompt: result.prompt,
                state: "已完成",
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
                plan.activeRoute = routeKey;
                await saveVideoWorkbench(track.scriptId, projectId, { trackPlans: { [String(trackId)]: plan } });
              }
            } catch (e: unknown) {
              await u.db("o_videoTrack").where({ id: trackId }).update({ state: "生成失败", reason: u.error(e).message });
            }
          }),
        ),
      );

      res.status(200).send(success("开始生成提示词"));
    } catch (e) {
      res.status(400).send(error(u.error(e).message));
    }
  },
);

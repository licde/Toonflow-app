import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { adaptPromptForMode, trimRefsToContract } from "@/ruleEngine/compilers/adaptPromptForMode";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    modality: z.enum(["image", "video"]).default("video"),
    fromMode: z.string().optional().nullable(),
    toMode: z.string(),
    prompt: z.string().optional().default(""),
    modelName: z.string().optional().nullable(),
    storyboardContext: z.string().optional(),
    referenceCount: z.number().optional(),
    refKeepCount: z.number().optional(),
    projectId: z.number().optional(),
    storyboardId: z.number().optional(),
    info: z
      .array(z.object({ id: z.number(), sources: z.string(), role: z.enum(["start", "end", "ref", "asset", "storyboard"]).optional() }))
      .optional(),
  }),
  async (req, res) => {
    try {
      const body = req.body;
      const modelPromptRoot = u.getPath(["modelPrompt"]);
      let videoRatio: string | undefined;
      if (body.projectId) {
        const p = await u.db("o_project").where({ id: body.projectId }).select("videoRatio").first();
        videoRatio = p?.videoRatio ?? undefined;
      }

      const invokeLlm = async (args: { system: string; user: string; assistant?: string }) => {
        const { text } = await u.Ai.Text("universalAi").invoke({
          system: args.system,
          messages: [
            ...(args.assistant ? [{ role: "assistant" as const, content: args.assistant }] : []),
            { role: "user" as const, content: args.user },
          ],
        });
        return text;
      };

      const adapted = await adaptPromptForMode({
        modality: body.modality ?? "video",
        fromMode: body.fromMode,
        toMode: body.toMode,
        prompt: body.prompt ?? "",
        modelName: body.modelName,
        storyboardContext: body.storyboardContext,
        referenceCount: body.referenceCount,
        modelPromptRoot,
        projectVideoRatio: videoRatio,
        invokeLlm,
        storyboardId: body.storyboardId,
        slots: body.info?.map((i: { id: number; sources: string; role?: string }) => ({
          role: (i.role as "start" | "end" | "ref" | "asset" | "storyboard") || (i.sources === "storyboard" ? "storyboard" : "asset"),
          id: i.id,
          sources: i.sources as "storyboard" | "assets",
        })),
      });

      const maxRefs = adapted.mediaContract.maxRefs;
      const keep =
        body.refKeepCount != null
          ? Math.min(body.refKeepCount, maxRefs < 0 ? body.refKeepCount : maxRefs)
          : maxRefs < 0
            ? body.referenceCount ?? 0
            : Math.min(body.referenceCount ?? 0, maxRefs);

      return res.status(200).send(
        success({
          ...adapted,
          mediaContract: adapted.mediaContract,
          suggestedRefCount: keep,
          trimHint: maxRefs >= 0 ? `keep first ${maxRefs} refs` : "unlimited",
        }),
      );
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

export { trimRefsToContract };

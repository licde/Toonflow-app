import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { fillModeMatrix } from "@/ruleEngine/kernels/compileKernel";
import { hydrateCompileInputs } from "@/ruleEngine/compilers/compileOrGenerateVideoPrompt";
import { extractDesignFields, buildExtractContext, type DesignFields } from "@/ruleEngine/design/designFieldRegistry";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { resolveShotIdentity } from "@/ruleEngine/compilers/resolveShotIdentity";

const router = express.Router();

/** Fill promptByMode matrix once — each mode compiles via template structure (+ Registry). */
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number().optional(),
    storyboardId: z.number().optional(),
    modes: z.array(z.string()).min(1),
    seedPrompt: z.string().optional().default(""),
    model: z.string().optional(),
    charCodes: z.array(z.string()).optional(),
    sceneCode: z.string().optional().nullable(),
    propCodes: z.array(z.string()).optional(),
    info: z
      .array(
        z.object({
          id: z.number(),
          sources: z.string(),
          role: z.enum(["start", "end", "ref", "asset", "storyboard"]).optional(),
        }),
      )
      .optional(),
    designFields: z
      .object({
        emotion: z.union([z.number(), z.string()]).optional().nullable(),
        colorTemp: z.string().optional().nullable(),
        spatialRelation: z.string().optional().nullable(),
        duration: z.union([z.number(), z.string()]).optional().nullable(),
        shotSize: z.string().optional().nullable(),
        camera: z.string().optional().nullable(),
        fxPrompt: z.string().optional().nullable(),
        dialogue: z.string().optional().nullable(),
        lipSync: z.enum(["active", "silent", "vo", "os"]).optional().nullable(),
        voice: z.string().optional().nullable(),
        sfx: z.string().optional().nullable(),
        exprGuard: z.boolean().optional().nullable(),
        debutBeat: z.string().optional().nullable(),
        endHook: z.string().optional().nullable(),
      })
      .optional(),
  }),
  async (req, res) => {
    try {
      const body = req.body;
      const project = await u.db("o_project").where({ id: body.projectId }).select("videoRatio").first();
      let storyboard;
      let assets;
      if (body.info?.length) {
        const hydrated = await hydrateCompileInputs(u.db, body.projectId, body.info);
        storyboard = hydrated.storyboard;
        assets = hydrated.assets;
      }
      const modelData = body.model?.includes(":") ? body.model.split(/:(.+)/)[1] : body.model;

      let episodeShot;
      if (body.scriptId) {
        const pkg = await loadEpisodePackage(u.db, body.projectId, body.scriptId);
        const sbId =
          body.storyboardId ??
          body.info?.find((i: { sources: string }) => i.sources === "storyboard")?.id;
        episodeShot =
          (sbId != null ? pkg?.shots?.find((s) => s.storyboardId === sbId) : undefined) ?? pkg?.shots?.[0];
      }

      const sbId =
        body.storyboardId ??
        body.info?.find((i: { sources: string }) => i.sources === "storyboard")?.id ??
        episodeShot?.storyboardId;
      const resolved = await resolveShotIdentity({
        db: u.db,
        projectId: body.projectId,
        storyboardId: sbId,
        shot: episodeShot,
        extraPrompt: body.seedPrompt,
      });
      const charCodes = body.charCodes?.length ? body.charCodes : resolved.charCodes;
      const sceneCode = body.sceneCode !== undefined ? body.sceneCode : resolved.sceneCode;
      const propCodes = body.propCodes?.length ? body.propCodes : resolved.propCodes;

      const extracted = extractDesignFields(
        buildExtractContext({
          modality: "video",
          mode: body.modes[0],
          episodeShot,
          storyboard: storyboard?.[0],
          charCodes,
        }),
      );
      const designFields: DesignFields = { ...extracted, ...(body.designFields ?? {}) };

      const matrix = await fillModeMatrix({
        modes: body.modes,
        seedPrompt: body.seedPrompt ?? "",
        charCodes,
        sceneCode,
        propCodes,
        designFields,
        modelName: modelData,
        projectVideoRatio: project?.videoRatio,
        storyboard,
        assets,
        invokeLlm:
          body.seedPrompt?.trim()
            ? undefined
            : async ({ system, user, assistant }) => {
                const { text } = await u.Ai.Text("universalAi").invoke({
                  system,
                  messages: [
                    ...(assistant ? [{ role: "assistant" as const, content: assistant }] : []),
                    { role: "user" as const, content: user },
                  ],
                });
                return text;
              },
      });

      return res.status(200).send(success({ promptByMode: matrix, activeModes: body.modes, designFields, sceneCode }));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

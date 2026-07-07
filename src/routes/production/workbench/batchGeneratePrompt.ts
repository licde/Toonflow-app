import express from "express";
import u from "@/utils";
import pLimit from "p-limit";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { recomposeShotFromDB } from "@/lib/dramaPack/recomposeDramaPack";
import { loadProjectPackContext } from "@/lib/dramaPack/loadProjectPackContext";
import { formatAssetPayloadForAi, formatAssetsXmlForAi } from "@/lib/dramaPack/assetPayloadForAi";
import { buildStoryboardXml, buildDialogueXml, invokeVideoPromptGeneration } from "@/lib/dramaPack/videoPromptUtils";
import { buildRefSlotsXml } from "@/lib/dramaPack/refSlotBuilder";

const router = express.Router();

const refSlotSchema = z.object({
  slot: z.number(),
  source: z.string(),
  id: z.number(),
  label: z.string(),
  lockCode: z.string().optional(),
});

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    trackData: z.array(
      z.object({
        trackId: z.number(),
        info: z.array(
          z.object({
            id: z.number(),
            sources: z.string(),
          }),
        ),
        refSlots: z.array(refSlotSchema).optional(),
      }),
    ),
    mode: z.string(),
    model: z.string(),
    concurrentCount: z.number().optional(),
    respectImport: z.boolean().optional(),
    recomposeBeforeGenerate: z.boolean().optional(),
  }),
  async (req, res) => {
    const { trackData, projectId, mode, model, concurrentCount = 5, respectImport = true, recomposeBeforeGenerate = false } = req.body;
    try {
      const [vendorId, modelData] = model.split(/:(.+)/);
      const projectData = await u.db("o_project").select("*").where({ id: projectId }).first();
      const artStyle = projectData?.artStyle || "无";

      await u
        .db("o_videoTrack")
        .whereIn(
          "id",
          trackData.map((t: { trackId: number }) => t.trackId),
        )
        .update({ state: "生成中" });
      const packCtx = await loadProjectPackContext(projectId);

      const limit = pLimit(concurrentCount ?? 5);
      const tasks = trackData.map(
        (track: { trackId: number; info: { id: number; sources: string }[]; refSlots?: z.infer<typeof refSlotSchema>[] }) =>
          limit(async () => {
            const existingTrack = await u.db("o_videoTrack").where("id", track.trackId).select("prompt", "promptSource").first();
            if (respectImport && existingTrack?.promptSource === "import" && existingTrack?.prompt?.trim()) {
              await u.db("o_videoTrack").where({ id: track.trackId }).update({ state: "已完成" });
              return { trackId: track.trackId, text: existingTrack.prompt, skipped: true };
            }

            if (recomposeBeforeGenerate) {
              for (const item of track.info) {
                if (item.sources === "storyboard") {
                  await recomposeShotFromDB(item.id, "merge");
                }
              }
            }

            const images = await Promise.all(
              track.info.map(async (item: { id: number; sources: string }) => {
                if (item.sources === "storyboard") {
                  const storyboard = await u
                    .db("o_storyboard")
                    .where("o_storyboard.id", item.id)
                    .select("videoDesc", "prompt", "track", "duration", "shouldGenerateImage", "shotMeta", "index")
                    .first();
                  const assetRows = await u.db("o_assets2Storyboard").where("storyboardId", item.id).orderBy("rowid").select("assetId");
                  const associateAssetsIds = assetRows.map((row: { assetId: number }) => row.assetId);
                  return { ...storyboard, associateAssetsIds, _type: "storyboard" as const };
                }
                if (item.sources === "assets") {
                  const assetsData = await u
                    .db("o_assets")
                    .leftJoin("o_image", "o_image.id", "o_assets.imageId")
                    .where("o_assets.id", item.id)
                    .select(
                      "o_assets.id",
                      "o_assets.type",
                      "o_assets.name",
                      "o_assets.describe",
                      "o_assets.prompt",
                      "o_assets.remark",
                      "o_image.filePath",
                    )
                    .first();
                  return { ...assetsData, _type: "assets" as const };
                }
              }),
            );

            const assets: ReturnType<typeof formatAssetPayloadForAi>[] = [];
            const storyboard: Array<{
              index?: number;
              videoDesc?: string | null;
              prompt?: string | null;
              track?: string | null;
              duration?: string | null;
              associateAssetsIds?: number[];
              shouldGenerateImage?: boolean | number | null;
              shotMeta?: string | null;
            }> = [];

            for (const item of images) {
              if (!item) continue;
              if (item._type === "assets") {
                const payload = formatAssetPayloadForAi(
                  {
                    id: item.id,
                    type: item.type,
                    name: item.name,
                    describe: item.describe,
                    prompt: item.prompt,
                    remark: item.remark,
                  },
                  packCtx.extensions,
                );
                if (item.filePath) assets.push(payload);
              }
              if (item._type === "storyboard") {
                storyboard.push({
                  index: item.index,
                  videoDesc: item.videoDesc,
                  prompt: item.prompt,
                  track: item.track,
                  duration: item.duration,
                  associateAssetsIds: item.associateAssetsIds,
                  shouldGenerateImage: item.shouldGenerateImage,
                  shotMeta: item.shotMeta,
                });
              }
            }

            const dialogueBlock = buildDialogueXml(storyboard);
            const refSlotsBlock = track.refSlots?.length ? buildRefSlotsXml(track.refSlots) : "";

            try {
              const sanitized = await invokeVideoPromptGeneration({
                vendorId,
                modelData,
                mode,
                artStyle,
                assetsBlock: formatAssetsXmlForAi(assets),
                storyboardXml: buildStoryboardXml(storyboard),
                dialogueBlock,
                refSlotsBlock,
              });

              await u.db("o_videoTrack").where({ id: track.trackId }).update({
                prompt: sanitized,
                state: "已完成",
                promptSource: "ai",
              });

              return { trackId: track.trackId, text: sanitized };
            } catch (e: unknown) {
              await u
                .db("o_videoTrack")
                .where({ id: track.trackId })
                .update({ state: "生成失败", reason: u.error(e).message });
              return { trackId: track.trackId, error: u.error(e).message };
            }
          }),
      );

      await Promise.all(tasks);
      res.status(200).send(success("开始生成提示词"));
    } catch (e) {
      res.status(400).send(error(u.error(e).message));
    }
  },
);

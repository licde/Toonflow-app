import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadProjectPackContext } from "@/lib/dramaPack/loadProjectPackContext";
import { formatAssetPayloadForAi, formatAssetsXmlForAi } from "@/lib/dramaPack/assetPayloadForAi";
import { buildStoryboardXml, buildDialogueXml, invokeVideoPromptGeneration } from "@/lib/dramaPack/videoPromptUtils";
import { buildRefSlotsXml } from "@/lib/dramaPack/refSlotBuilder";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    trackId: z.number(),
    projectId: z.number(),
    info: z.array(
      z.object({
        id: z.number(),
        sources: z.string(),
      }),
    ),
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
    model: z.string(),
    mode: z.string(),
  }),
  async (req, res) => {
    const { trackId, projectId, info, model, mode, refSlots } = req.body;
    await u.db("o_videoTrack").where({ id: trackId }).update({ state: "生成中" });

    const images = await Promise.all(
      info.map(async (item: { id: number; sources: string }) => {
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

    const packCtx = await loadProjectPackContext(projectId);
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
      if (item._type === "assets" && item.filePath) {
        assets.push(
          formatAssetPayloadForAi(
            {
              id: item.id,
              type: item.type,
              name: item.name,
              describe: item.describe,
              prompt: item.prompt,
              remark: item.remark,
            },
            packCtx.extensions,
          ),
        );
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

    const [vendorId, modelData] = model.split(/:(.+)/);
    const projectData = await u.db("o_project").select("*").where({ id: projectId }).first();
    const artStyle = projectData?.artStyle || "无";

    const dialogueBlock = buildDialogueXml(storyboard);
    const refSlotsBlock = refSlots?.length ? buildRefSlotsXml(refSlots) : "";

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
      await u.db("o_videoTrack").where({ id: trackId }).update({
        state: "已完成",
        prompt: sanitized,
        promptSource: "ai",
      });
      res.status(200).send(success(sanitized));
    } catch (e) {
      await u.db("o_videoTrack").where({ id: trackId }).update({
        state: "生成失败",
        reason: u.error(e).message,
      });
      res.status(400).send(error(u.error(e).message));
    }
  },
);

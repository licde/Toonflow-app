import express from "express";
import u from "@/utils";
import { z } from "zod";
import pLimit from "p-limit";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { recomposeShotFromDB, loadProductionSpecForProject, getAiFailoverHintForProject } from "@/lib/dramaPack/recomposeDramaPack";
const router = express.Router();

const GENERATE_TIMEOUT_MS = 10 * 60 * 1000;

export default router.post(
  "/",
  validateFields({
    storyboardIds: z.array(z.number()),
    projectId: z.number(),
    scriptId: z.number(),
    concurrentCount: z.number().min(1).optional(),
    compulsory: z.boolean().optional(),
    recomposeBeforeGenerate: z.boolean().optional(),
  }),
  async (req, res) => {
    const {
      storyboardIds,
      projectId,
      scriptId,
      concurrentCount = 5,
      compulsory = false,
      recomposeBeforeGenerate = false,
    }: {
      storyboardIds: number[];
      projectId: number;
      scriptId: number;
      concurrentCount: number;
      compulsory: boolean;
      recomposeBeforeGenerate: boolean;
    } = req.body;
    if (!storyboardIds?.length) return res.status(400).send(error("storyboardIds不能为空"));

    const storyboardData = await u.db("o_storyboard").where({ scriptId, projectId }).whereIn("id", storyboardIds);
    if (!storyboardData.length) return res.status(500).send(error("未查到分镜数据"));

    const storyIds = storyboardData.map((i) => i.id);
    const now = Date.now();

    if (compulsory) {
      await u.db("o_storyboard").whereIn("id", storyIds).update({ state: "生成中", shouldGenerateImage: 1, generateStartTime: now });
    } else {
      await u.db("o_storyboard").whereIn("id", storyIds).where("shouldGenerateImage", 0).update({ state: "未生成" });
      await u.db("o_storyboard").whereIn("id", storyIds).where("shouldGenerateImage", 1).update({ state: "生成中", generateStartTime: now });
    }

    const projectSettingData = await u.db("o_project").where("id", projectId).select("imageModel", "imageQuality", "artStyle", "videoRatio").first();

    const assets2StoryboardRows = await u.db("o_assets2Storyboard").whereIn("storyboardId", storyIds).orderBy("rowid").select("storyboardId", "assetId");
    const allAssetIds = [...new Set(assets2StoryboardRows.map((r: any) => r.assetId))];
    const assetImageMap: Record<number, number> = {};
    if (allAssetIds.length) {
      const assetRows = await u.db("o_assets").whereIn("id", allAssetIds).select("id", "imageId");
      assetRows.forEach((row: any) => {
        assetImageMap[row.id] = row.imageId;
      });
    }

    const assetRecord: Record<number, number[]> = {};
    assets2StoryboardRows.forEach((item: any) => {
      if (!assetRecord[item.storyboardId]) assetRecord[item.storyboardId] = [];
      const imageId = assetImageMap[item.assetId];
      if (imageId != null) assetRecord[item.storyboardId].push(imageId);
    });

    const realStoryData = await u.db("o_storyboard").where({ scriptId, projectId }).whereIn("id", storyIds);
    res.status(200).send(
      success(
        realStoryData.map((i) => ({
          id: i.id,
          prompt: i.prompt,
          associateAssetsIds: assetRecord[i.id!],
          src: null,
          state: i.state,
          videoDesc: i.videoDesc,
          shouldGenerateImage: i.shouldGenerateImage,
        })),
      ),
    );

    let generateList = compulsory ? storyboardData : storyboardData.filter((item) => item.shouldGenerateImage !== 0);

    const productionSpec = recomposeBeforeGenerate ? await loadProductionSpecForProject(projectId) : undefined;
    const failoverHint = getAiFailoverHintForProject(productionSpec);

    const generateTask = async (item: (typeof storyboardData)[number]) => {
      if (recomposeBeforeGenerate && item.promptSource === "import" && productionSpec) {
        await recomposeShotFromDB(item.id!, "merge");
        const refreshed = await u.db("o_storyboard").where("id", item.id).first();
        if (refreshed) item = refreshed;
      }

      if (!item.prompt?.trim()) {
        await u.db("o_storyboard").where("id", item.id).update({
          state: "生成失败",
          reason: "分镜提示词为空，请先填写或重新导入 drama-pack",
          filePath: "",
        });
        return;
      }

      const [imageId] = await u.db("o_image").insert({
        storyboardId: item.id,
        type: "storyboard",
        state: "生成中",
        resolution: projectSettingData?.imageQuality,
        model: projectSettingData?.imageModel,
      });
      await u.db("o_storyboard").where("id", item.id).update({ imageId, state: "生成中" });

      const repeloadObj = {
        prompt: item.prompt!,
        size: projectSettingData?.imageQuality as "1K" | "2K" | "4K",
        aspectRatio: projectSettingData?.videoRatio as `${number}:${number}`,
      };

      const runWithTimeout = async () => {
        const imageCls = await u.Ai.Image(projectSettingData?.imageModel as `${string}:${string}`).run(
          {
            referenceList: await getAssetsImageBase64(assetRecord[item.id!] || []),
            ...repeloadObj,
          },
          {
            taskClass: "生成分镜图片",
            describe: "分镜图片生成",
            relatedObjects: JSON.stringify(repeloadObj),
            projectId,
          },
        );
        const savePath = `/${projectId}/assets/${scriptId}/${u.uuid()}.jpg`;
        await imageCls.save(savePath);
        await u.db("o_image").where("id", imageId).update({ filePath: savePath, state: "已完成" });
        await u.db("o_storyboard").where("id", item.id).update({ filePath: savePath, imageId, state: "已完成", reason: "" });
      };

      try {
        await Promise.race([
          runWithTimeout(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("分镜图生成超时（10分钟）")), GENERATE_TIMEOUT_MS)),
        ]);
      } catch (e) {
        const baseReason = u.error(e).message;
        const reason = failoverHint ? `${baseReason}；建议：${failoverHint}` : baseReason;
        await u.db("o_image").where("id", imageId).update({ state: "生成失败", errorReason: reason });
        await u.db("o_storyboard").where("id", item.id).update({
          filePath: "",
          reason,
          state: "生成失败",
        });
      }
    };

    const limit = pLimit(concurrentCount);
    const tasks = generateList.map((item) => limit(() => generateTask(item)));
    Promise.all(tasks).catch((e) => {
      console.error("[batchGenerateImage] 批量任务异常:", u.error(e).message);
    });
  },
);

async function getAssetsImageBase64(imageIds: number[]) {
  if (!imageIds.length) return [];
  const imagePaths = await u.db("o_image").whereIn("o_image.id", imageIds).select("o_image.id", "o_image.filePath");
  const id2Path = new Map<number, string>();
  for (const row of imagePaths) id2Path.set(row.id, row.filePath);
  const imageUrls = await Promise.all(
    imageIds.map(async (id) => {
      const filePath = id2Path.get(id);
      if (filePath) {
        try {
          return await u.oss.getImageBase64(filePath);
        } catch {
          return null;
        }
      }
      return null;
    }),
  );
  return (imageUrls.filter(Boolean) as string[]).map((url) => ({ type: "image" as const, base64: url }));
}

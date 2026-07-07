import express from "express";
import pLimit from "p-limit";
import u from "@/utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadProjectPackContext } from "@/lib/dramaPack/loadProjectPackContext";
import { buildFinalAssetImagePrompt, assetImageWrapper } from "@/lib/dramaPack/assetImagePromptBuilder";
import { detectAssetTier, assetAspectRatio, assetPromptTitle } from "@/lib/dramaPack/assetTierUtils";
import {
  resolveT0ReferenceBase64,
  resolveSecondaryFaceReferenceBase64,
  requireT1ReferenceOrThrow,
} from "@/lib/dramaPack/assetReferenceUtils";
import { parseLockCode } from "@/lib/dramaPack/schema";

const router = express.Router();

type AssetType = "role" | "scene" | "tool";

interface AssetTypeConfig {
  label: string;
  taskClass: string;
  dir: string;
  promptTitle: string;
  promptEnd: string;
}

const assetTypeConfig: Record<AssetType, AssetTypeConfig> = {
  role: {
    label: "角色",
    taskClass: "角色图生成",
    dir: "role",
    promptTitle: "角色标准四视图",
    promptEnd: "人物角色四视图",
  },
  scene: {
    label: "场景",
    taskClass: "场景图生成",
    dir: "scene",
    promptTitle: "标准场景图",
    promptEnd: "标准场景图",
  },
  tool: {
    label: "道具",
    taskClass: "道具图生成",
    dir: "props",
    promptTitle: "标准道具图",
    promptEnd: "标准道具图",
  },
};

function buildPrompt(
  cfg: AssetTypeConfig,
  artStyle: string,
  name: string,
  prompt: string,
  titleOverride?: { title: string; end: string },
): string {
  const title = titleOverride?.title ?? cfg.promptTitle;
  const end = titleOverride?.end ?? cfg.promptEnd;
  return `
    请根据以下参数生成${title}：

    **基础参数：**
    - 画风风格: ${artStyle || "未指定"}

    **${cfg.label}设定：**
    - 名称:${name},
    - 提示词:${prompt},

    请严格按照系统规范生成${end}。
  `;
}

const requestSchema = {
  projectId: z.number(),
  model: z.string(),
  resolution: z.string(),
  concurrentCount: z.number().int().min(1).optional(),
  items: z.array(
    z.object({
      id: z.number(),
      type: z.enum(["role", "scene", "tool", "storyboard"]),
      name: z.string(),
      prompt: z.string(),
      base64: z.string().optional().nullable(),
    }),
  ),
};

export default router.post("/", validateFields(requestSchema), async (req, res) => {
  const { projectId, model, resolution, concurrentCount, items } = req.body;

  // 1. 查询项目
  const project = await u.db("o_project").where("id", projectId).select("artStyle", "type", "intro").first();
  if (!project) return res.status(500).send(error("项目为空"));

  const packCtx = await loadProjectPackContext(projectId);

  // 2. 预加载 remark 用于 T0/T1 检测
  const assetIds = items.map((item: { id: number }) => item.id);
  const assetRows = await u.db("o_assets").whereIn("id", assetIds).select("id", "remark", "assetsId");
  const assetMetaMap = new Map(assetRows.map((a) => [a.id, a]));

  // 3. 逐条插入 o_image 占位记录，收集 imageId 列表
  const totalNovelId: number[] = [];
  for (const item of items) {
    const [imageId] = await u.db("o_image").insert({
      type: item.type,
      state: "生成中",
      assetsId: item.id,
    });
    await u.db("o_assets").where("id", item.id).update({ imageId });
    totalNovelId.push(imageId);
  }

  // 4. 后台异步并发生成，不阻塞响应
  const limit = pLimit(concurrentCount ?? 1);

  const tasks = items.map((item: { id: number; type: string; name: string; prompt: string; base64: string | null | undefined }, index: number) =>
    limit(async () => {
      const imageId = totalNovelId[index];
      const data = await u.db("o_image").where("id", imageId).select("state").first();
      if (data?.state === "生成失败") {
        return;
      }
      const cfg = assetTypeConfig[item.type as AssetType];
      if (!cfg) return;

      const meta = assetMetaMap.get(item.id);
      const tier = detectAssetTier(meta?.remark, meta?.assetsId);
      const aspectRatio = assetAspectRatio(item.type, tier);
      const assetType = item.type as AssetType;
      const finalPrompt = buildFinalAssetImagePrompt({
        type: assetType,
        dbPrompt: item.prompt,
        remark: meta?.remark,
        assetsId: meta?.assetsId,
        productionSpec: packCtx.productionSpec,
        tier,
        extensions: packCtx.extensions,
      });
      const userPrompt = assetImageWrapper(assetType, tier, project.artStyle ?? "", item.name, finalPrompt);

      await u.db("o_assets").where("id", item.id).update({ imageId });

      const imagePath = `/${projectId}/${cfg.dir}/${uuidv4()}.jpg`;
      console.log(
        `[drama-pack] batchGenerateImageAssets id=${item.id} type=${item.type} tier=${tier} aspect=${aspectRatio} prompt=${finalPrompt.slice(0, 120)}`,
      );
      const describe = `生成${cfg.label}图，名称：${item.name}，提示词：${finalPrompt}`;
      const relatedObjects = { id: item.id, projectId, type: cfg.label };
      try {
        const aiImage = u.Ai.Image(model);
        let referenceBase64 = item.base64 ?? null;
        const referenceList: Array<{ base64: string; type: "image" }> = [];
        if (referenceBase64) {
          referenceList.push({ base64: referenceBase64, type: "image" });
        } else if (tier === "t1_wardrobe") {
          try {
            await requireT1ReferenceOrThrow(projectId, meta?.remark);
          } catch (refErr) {
            await u
              .db("o_image")
              .where("id", imageId)
              .update({ state: "生成失败", errorReason: u.error(refErr).message });
            return;
          }
          referenceBase64 = (await resolveT0ReferenceBase64(projectId, meta?.remark)) ?? null;
          if (referenceBase64) referenceList.push({ base64: referenceBase64, type: "image" });
        } else if (tier === "t0_base" && meta?.remark) {
          const charCode = parseLockCode(meta.remark);
          if (charCode && !charCode.includes(":")) {
            const sec = await resolveSecondaryFaceReferenceBase64(projectId, charCode);
            if (sec) referenceList.push({ base64: sec, type: "image" });
          }
        }
        await aiImage.run(
          {
            prompt: userPrompt,
            referenceList,
            size: resolution,
            aspectRatio,
          },
          {
            taskClass: cfg.taskClass,
            describe,
            projectId,
            relatedObjects: JSON.stringify(relatedObjects),
          },
        );
        aiImage.save(imagePath);

        const imageData = await u.db("o_image").where("id", imageId).select("*").first();
        if (!imageData) return res.status(500).send("资产已被删除");
        if (!imageData) return;
        if (imageData.state === "生成失败") return;
        await u
          .db("o_image")
          .where("id", imageId)
          .update({
            state: "已完成",
            filePath: imagePath,
            type: item.type,
            model: model.split(/:(.+)/)[1],
            resolution,
          });

        await u.db("o_assets").where("id", item.id).update({ imageId });
      } catch (e: any) {
        const normalized = u.error(e);
        u.genLog({
          vendorId: model.split(/:(.+)/)[0],
          model,
          taskClass: cfg.taskClass,
          assetId: imageId,
          phase: "batch_failed",
          message: normalized.message,
          httpStatus: normalized.status,
        });
        await u
          .db("o_image")
          .where("id", imageId)
          .update({ state: "生成失败", errorReason: normalized.message });
      }
    }),
  );

  // 后台执行，不等待结果
  Promise.all(tasks).catch((e) => {
    console.error("[batchGenerateImageAssets] 批量任务异常:", u.error(e).message);
  });

  return res.status(200).send(success({ total: items.length }));
});

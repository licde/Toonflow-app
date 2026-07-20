import express from "express";
import u from "@/utils";
import { z } from "zod";
import sharp from "sharp";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { Output } from "ai";
import { touchPromptForVendor } from "@/ruleEngine/compilers/vendorPromptAdapter";
import { precheckContentPolicy } from "@/ruleEngine/compilers/contentPolicyAdapter";
import { classifyGenerationFailure } from "@/ruleEngine/bundle/generationFailureHelper";
import { buildRePushPlan } from "@/ruleEngine/design/reverseRouteEngine";
import { resolveAssetDerivativeAspect, type AssetStillType } from "@/ruleEngine/bundle/assetStillPrompt";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    assetIds: z.array(z.number()),
    projectId: z.number(),
    scriptId: z.number(),
    concurrentCount: z.number().min(1).optional(),
  }),
  async (req, res) => {
    const { assetIds, projectId, scriptId, concurrentCount = 2 } = req.body;

    const projectSettingData = await u.db("o_project").where("id", projectId).select("imageModel", "imageQuality", "artStyle", "videoRatio").first();

    const assetsDataArr = await u.db("o_assets").whereIn("id", assetIds).select("id", "describe", "name", "type", "assetsId");
    const parentIds = assetsDataArr.map((item) => item.assetsId).filter((id) => id !== null);
    const parentAssetsData = await u
      .db("o_assets")
      .leftJoin("o_image", "o_assets.imageId", "o_image.id")
      .whereIn("o_assets.id", parentIds as number[])
      .select("o_assets.id", "o_image.filePath", "o_assets.describe");
    assetsDataArr.forEach((i: any) => {
      const parent = parentAssetsData.find((item) => item.id === i.assetsId);
      if (parent) {
        i.parentDescribe = parent.describe;
      }
    });
    const imageUrlRecord: Record<number, string> = {};
    parentAssetsData.forEach((item) => {
      if (item.filePath) imageUrlRecord[item.id] = item.filePath;
    });
    const rolePrompt = u.getArtPrompt(projectSettingData!.artStyle!, "art_skills", "art_character_derivative");
    const toolPrompt = u.getArtPrompt(projectSettingData!.artStyle!, "art_skills", "art_prop_derivative");
    const scenePrompt = u.getArtPrompt(projectSettingData!.artStyle!, "art_skills", "art_scene_derivative");
    const promptRecord: Record<string, { prompt: string }> = {
      role: {
        prompt: rolePrompt,
      },
      tool: {
        prompt: toolPrompt,
      },
      scene: {
        prompt: scenePrompt,
      },
    };
    // 先批量为所有 assets 创建 image 记录并标记为"生成中"
    const imageIdMap: Record<number, number> = {};
    for (const item of assetsDataArr) {
      const [imageId] = await u.db("o_image").insert({
        assetsId: item.id,
        type: item.type,
        state: "生成中",
        resolution: projectSettingData?.imageQuality,
        model: projectSettingData?.imageModel,
      });
      imageIdMap[item.id!] = imageId;
      await u.db("o_assets").where("id", item.id).update({ imageId: imageId });
    }

    const imageData: { id: number; state: string; src: string }[] = [];
    res.status(200).send(success("开始生成资产图片"));
    const generateSingleAsset = async (item: any) => {
      const imageId = imageIdMap[item.id!];
      const typeConfig = promptRecord[item.type!] || promptRecord["role"];

      const { text } = await u.Ai.Text("universalAi").invoke({
        system: `${typeConfig.prompt}`,
        messages: [
          {
            role: "user",
            content: `
            父级资产描述: ${item.parentDescribe || "无详细描述"}
            当前资产描述: ${item.describe || "无详细描述"}`,
          },
        ],
      });
        await u.db("o_assets").where("id", item.id).update({ prompt: text });

      const imageBase64 = imageUrlRecord[item.assetsId!] ? await u.oss.getImageBase64(imageUrlRecord[item.assetsId!]) : null;
      if (item.assetsId && !imageBase64) {
        const msg = "DERIVE_PARENT_REF_MISSING";
        const feedback = await classifyGenerationFailure({
          modality: "image",
          shotId: String(item.id),
          error: msg,
          prompt: text,
        });
        const rePushPlan = buildRePushPlan(["derive_parent_ref_missing"]);
        await u.db("o_image").where({ id: imageId }).update({
          state: "生成失败",
          errorReason: JSON.stringify({ message: "衍生缺少父图", feedback, rePushPlan }),
        });
        return { id: item.id!, state: "生成失败", src: "" };
      }
      try {
        const touched = touchPromptForVendor(text, undefined);
        const policy = precheckContentPolicy(touched.vendorPrompt);
        const vendorPrompt = policy.hasSensitiveTerms ? policy.softenedPrompt : touched.vendorPrompt;
        const stillType = (["role", "scene", "tool"].includes(String(item.type)) ? item.type : "role") as AssetStillType;
        const aspectRatio = resolveAssetDerivativeAspect(stillType);
        const repeloadObj = {
          prompt: vendorPrompt,
          size: projectSettingData?.imageQuality as "1K" | "2K" | "4K",
          aspectRatio: aspectRatio as `${number}:${number}`,
        };
        const imageCls = await u.Ai.Image(projectSettingData?.imageModel as `${string}:${string}`).run(
          {
            referenceList: imageBase64 ? [{ type: "image", base64: imageBase64 }] : [],
            ...repeloadObj,
          },
          {
            taskClass: "生成图片",
            describe: `衍生${stillType}图：${item.name || item.id}`,
            relatedObjects: JSON.stringify(repeloadObj),
            projectId: projectId,
          },
        );
        const savePath = `/${projectId}/assets/${scriptId}/${item.type}/${u.uuid()}.jpg`;
        await imageCls.save(savePath);
        await u.db("o_image").where({ id: imageId }).update({ state: "已完成", filePath: savePath });
        try {
          const { invalidateStoryboardsForAsset } = await import("@/ruleEngine/heal/applyStoryboardLifecycle");
          await invalidateStoryboardsForAsset(u.db, item.id!);
        } catch {
          /* lifecycle best-effort */
        }
        return {
          id: item.id!,
          state: "已完成",
          src: await u.oss.getSmallImageUrl(savePath),
        };
      } catch (e) {
        const errMsg = u.error(e).message;
        const feedback = await classifyGenerationFailure({
          modality: "image",
          shotId: String(item.id),
          error: errMsg,
          prompt: text,
        });
        const trigger = feedback.category === "vendor_passthrough" ? null : feedback.ruleId || feedback.category;
        const rePushPlan = trigger ? buildRePushPlan([String(trigger)]) : [];
        await u
          .db("o_image")
          .where({ id: imageId })
          .update({ state: "生成失败", errorReason: JSON.stringify({ message: errMsg, feedback, rePushPlan }) });
        return {
          id: item.id!,
          state: "生成失败",
          src: "",
        };
      }
    };

    // 按 concurrentCount 分批并发执行
    for (let i = 0; i < assetsDataArr.length; i += concurrentCount) {
      const batch = assetsDataArr.slice(i, i + concurrentCount);
      const batchResults = await Promise.all(batch.map(generateSingleAsset));
      imageData.push(...batchResults);
    }
  },
);

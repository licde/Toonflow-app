import express from "express";
import u from "@/utils";
import * as zod from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadProjectPackContext } from "@/lib/dramaPack/loadProjectPackContext";
import { buildFinalAssetImagePrompt, assetImageWrapper } from "@/lib/dramaPack/assetImagePromptBuilder";
import { detectAssetTier, assetAspectRatio } from "@/lib/dramaPack/assetTierUtils";
import { formatAssetPayloadForAi } from "@/lib/dramaPack/assetPayloadForAi";


type ItemType = "characters" | "props" | "scenes";

const router = express.Router();

//润色提示词
export default router.post(
  "/",
  validateFields({
    assetsId: zod.number(),
    projectId: zod.number(),
    type: zod.string(),
    name: zod.string(),
    describe: zod.string(),
  }),
  async (req, res) => {
    const { assetsId, projectId, type, name, describe } = req.body;
    const project = await u.db("o_project").where("id", projectId).select("artStyle", "type", "intro").first();
    if (!project) return res.status(500).send(success({ message: "项目为空" }));

    const assetRow = await u
      .db("o_assets")
      .where("id", assetsId)
      .select("assetsId", "remark", "prompt", "promptSource", "describe", "type")
      .first();
    if (!assetRow) return res.status(500).send(error("资产不存在"));

    const packCtx = await loadProjectPackContext(projectId);
    const assetType = (type === "scene" ? "scene" : type === "tool" ? "tool" : "role") as "role" | "scene" | "tool";
    const tier = detectAssetTier(assetRow.remark, assetRow.assetsId);
    const isT1 = tier === "t1_wardrobe";

    if (assetRow.promptSource === "import" && assetRow.prompt?.trim()) {
      const finalPrompt = buildFinalAssetImagePrompt({
        type: assetType,
        dbPrompt: assetRow.prompt,
        remark: assetRow.remark,
        assetsId: assetRow.assetsId,
        productionSpec: packCtx.productionSpec,
        tier,
        extensions: packCtx.extensions,
      });
      return res.status(200).send(success({ prompt: finalPrompt, assetsId, merged: true }));
    }

    await u.db("o_assets").where("id", assetsId).update({ promptState: "生成中" });

    const assetsData = assetRow;
    const typeConfig: Record<string, { promptKey: string; itemType: ItemType; label: string; nameLabel: string; visualManual: string }> = {
      role: {
        promptKey: "role-polish",
        itemType: "characters",
        label: isT1 ? "角色服化单图参考" : "角色标准四视图",
        nameLabel: "角色",
        visualManual: assetsData.assetsId || isT1 ? "art_character_derivative" : "art_character",
      },
      scene: {
        promptKey: "scene-polish",
        itemType: "scenes",
        label: "场景图",
        nameLabel: "场景",
        visualManual: assetsData.assetsId ? "art_scene_derivative" : "art_scene",
      },
      tool: {
        promptKey: "tool-polish",
        itemType: "props",
        label: "道具图",
        nameLabel: "道具",
        visualManual: assetsData.assetsId ? "art_prop_derivative" : "art_prop",
      },
    };

    const config = typeConfig[type];
    if (!config) return res.status(500).send(error("不支持的类型"));
    if (!config.visualManual) return res.status(500).send(error("视觉手册未定义"));
    //获取到视觉手册
    const visualManual = await u.getArtPrompt(project.artStyle as string, "art_skills", config.visualManual);
    if (!visualManual) return res.status(500).send(error("视觉手册未定义"));
    const systemPrompt = visualManual;
    try {
      const payload = formatAssetPayloadForAi({ ...assetRow, name, describe, type }, packCtx.extensions);
      const { _output } = (await u.Ai.Text("universalAi").invoke({
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `**基础参数：**
      **${config.nameLabel}设定：**
      - ${config.nameLabel}名称:${name},
      - 性别:${payload.gender || "未指定"},
      - ${config.nameLabel}描述:${payload.describe || describe},`,
          },
        ],
      })) as any;

      if (!_output) return res.status(500).send("失败");
      const finalPrompt = buildFinalAssetImagePrompt({
        type: assetType,
        dbPrompt: _output,
        remark: assetRow.remark,
        assetsId: assetRow.assetsId,
        productionSpec: packCtx.productionSpec,
        tier,
        extensions: packCtx.extensions,
      });
      await u.db("o_assets").where("id", assetsId).update({ prompt: finalPrompt, promptState: "已完成", promptSource: "ai" });

      res.status(200).send(success({ prompt: finalPrompt, assetsId }));
    } catch (e: any) {
      await u
        .db("o_assets")
        .where("id", assetsId)
        .update({ promptState: "失败", promptErrorReason: u.error(e).message });
      return res.status(500).send(error(e?.data?.error?.message ?? e?.message ?? "生成失败"));
    }
  },
);

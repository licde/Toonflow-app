import express from "express";
import u from "@/utils";
import pLimit from "p-limit";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { loadProjectPackContext } from "@/lib/dramaPack/loadProjectPackContext";
import { buildFinalAssetImagePrompt, validateAssetPrompt } from "@/lib/dramaPack/assetImagePromptBuilder";
import { detectAssetTier, isT1WardrobeAsset } from "@/lib/dramaPack/assetTierUtils";

const router = express.Router();

/**
 * 场景/道具/角色：规则 merge 进 prompt（不跳过 import）
 * 空 prompt 或 scene/tool 可选 AI 润色（art_scene / art_prop / art_character）
 */
export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    assetIds: z.array(z.number()),
    concurrentCount: z.number().int().min(1).optional(),
    /** scene/tool 在 prompt 为空时走 AI 润色 */
    aiPolishEmpty: z.boolean().optional(),
    forceAiPolish: z.boolean().optional(),
  }),
  async (req, res) => {
    const { projectId, assetIds, concurrentCount = 3, aiPolishEmpty = true, forceAiPolish = false } = req.body;
    const ctx = await loadProjectPackContext(projectId);
    const rows = await u
      .db("o_assets")
      .whereIn("id", assetIds)
      .select("id", "name", "type", "describe", "prompt", "promptSource", "remark", "assetsId");

    if (!rows.length) return res.status(400).send(error("资产不存在"));

    const limit = pLimit(concurrentCount);
    const results: Array<{ id: number; prompt: string; source: string }> = [];

    await Promise.all(
      rows.map((row) =>
        limit(async () => {
          const type = (row.type === "scene" ? "scene" : row.type === "tool" ? "tool" : "role") as "role" | "scene" | "tool";
          const tier = detectAssetTier(row.remark, row.assetsId);
          let basePrompt = row.prompt?.trim() || row.describe?.trim() || "";

          const needAi =
            forceAiPolish ||
            (!basePrompt && aiPolishEmpty && (type === "scene" || type === "tool" || type === "role"));

          if (needAi) {
            const manualKey =
              type === "scene"
                ? "art_scene"
                : type === "tool"
                  ? "art_prop"
                  : isT1WardrobeAsset(row.remark, row.assetsId)
                    ? "art_character_derivative"
                    : "art_character";
            const visualManual = u.getArtPrompt(ctx.artStyle, "art_skills", manualKey);
            if (visualManual) {
              try {
                const { text } = await u.Ai.Text("universalAi").invoke({
                  system: visualManual,
                  messages: [
                    {
                      role: "user",
                      content: `名称: ${row.name}\n描述: ${row.describe || "无"}\n生成英文 image prompt，严格遵守手册约束。`,
                    },
                  ],
                });
                if (text?.trim()) basePrompt = text.trim();
              } catch (e) {
                console.warn(`[drama-pack] ensureAssetPrompt AI fail id=${row.id}`, u.error(e).message);
              }
            }
          }

          const finalPrompt = buildFinalAssetImagePrompt({
            type,
            dbPrompt: basePrompt,
            remark: row.remark,
            assetsId: row.assetsId,
            productionSpec: ctx.productionSpec,
            tier,
            extensions: ctx.extensions,
          });

          const missing = validateAssetPrompt(type, tier, finalPrompt);
          if (missing.length) {
            console.log(`[drama-pack] ensureAssetPrompt id=${row.id} auto-fixed missing: ${missing.join(",")}`);
          }

          const source = needAi && basePrompt ? "ai" : row.promptSource === "import" ? "import" : "import";
          await u.db("o_assets").where("id", row.id).update({
            prompt: finalPrompt,
            promptState: "已完成",
            promptSource: forceAiPolish ? "ai" : source,
          });
          results.push({ id: row.id!, prompt: finalPrompt, source });
        }),
      ),
    );

    return res.status(200).send(success({ updated: results.length, results }));
  },
);

import express from "express";
import u from "@/utils";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { useSkill } from "@/utils/agent/skillsTools";
import { tool, jsonSchema } from "ai";
import { o_script } from "@/types/database";
import { extractJobKey, mergeExtractSummary, setExtractSummary } from "@/lib/extractSummaryStore";

const router = express.Router();

/** 新资产：AI 首次识别到的资产，需要完整信息 */
const NewAssetSchema = z.object({
  name: z.string().describe("资产名称,仅为名称不做其他任何表述"),
  desc: z.string().describe("资产描述"),
  type: z.enum(["role", "tool", "scene"]).describe("资产类型"),
  scriptIds: z.array(z.number()).describe("使用该资产的剧本id数组"),
});

/** 已有资产：数据库中已存在的资产，只需给出名称和关联的剧本 */
const ExistingAssetRefSchema = z.object({
  name: z.string().describe("已有资产的名称,必须与已有资产列表中的名称完全一致"),
  scriptIds: z.array(z.number()).describe("使用该资产的剧本id数组"),
});

export const AssetSchema = z.object({
  name: z.string().describe("资产名称,仅为名称不做其他任何表述"),
  desc: z.string().describe("资产描述"),
  type: z.enum(["role", "tool", "scene"]).describe("资产类型"),
});

type NewAsset = z.infer<typeof NewAssetSchema>;
type ExistingAssetRef = z.infer<typeof ExistingAssetRefSchema>;
type Asset = z.infer<typeof AssetSchema>;

/** 每批 AI 调用的结果 */
type GroupResult = {
  batchScriptIds: number[];
  newAssets: NewAsset[];
  existingRefs: ExistingAssetRef[];
} | null;

/** 将 scriptIds 数组按 groupSize 分组 */
function chunkArray(arr: number[], groupSize: number): number[][][] {
  const batchSize = 5;
  const chunks: number[][] = [];
  for (let i = 0; i < arr.length; i += batchSize) {
    chunks.push(arr.slice(i, i + batchSize));
  }
  const groupChunks: number[][][] = [];
  for (let i = 0; i < chunks.length; i += groupSize) {
    groupChunks.push(chunks.slice(i, i + groupSize));
  }
  return groupChunks;
}

export default router.post(
  "/",
  validateFields({
    scriptIds: z.array(z.number()),
    projectId: z.number(),
    groupSize: z.number().min(1).optional(),
  }),
  async (req, res) => {
    const { scriptIds, projectId, groupSize = 5 } = req.body;

    if (!scriptIds.length) return res.status(400).send(error("请先选择剧本"));
    const scripts = await u.db("o_script").whereIn("id", scriptIds);

    // 构建 scriptId -> script 内容的映射
    const scriptMap = new Map(scripts.map((s: o_script) => [s.id, s]));

    await u.db("o_script").whereIn("id", scriptIds).update({
      extractState: 2,
    });

    const errors: { scriptId: number; error: string }[] = [];
    let successCount = 0;

    // 将 scriptIds 按 groupSize（默认5）分组，每组一起发给 AI
    const scriptGroups = chunkArray(scriptIds as number[], groupSize);

    /** 一组剧本提取完成后统一入库并建立关联 */
    async function persistGroupResult(result: GroupResult) {
      if (!result) return;
      const { batchScriptIds, newAssets, existingRefs } = result;
      if (!newAssets.length && !existingRefs.length) return;

      const existingAssets = await u.db("o_assets").where("projectId", projectId).select("id", "name");
      const existingMap = new Map(existingAssets.map((a) => [a.name!, a.id!]));

      const toInsert = newAssets.filter((asset) => !existingMap.has(asset.name));
      const skippedNew = newAssets.filter((asset) => existingMap.has(asset.name));
      if (toInsert.length) {
        await u.db("o_assets").insert(
          toInsert.map((asset) => ({
            name: asset.name,
            type: asset.type,
            describe: asset.desc,
            prompt: asset.desc?.slice(0, 2000) ?? "",
            projectId: projectId,
            startTime: Date.now(),
          })),
        );
      }

      for (const asset of skippedNew) {
        await u.db("o_assets")
          .where({ projectId, name: asset.name })
          .where(function () {
            this.whereNull("prompt").orWhere("prompt", "");
          })
          .update({ prompt: asset.desc?.slice(0, 2000) ?? "", describe: asset.desc });
      }

      const allAssets = await u.db("o_assets").where("projectId", projectId).select("id", "name");
      const nameToId = new Map(allAssets.map((a) => [a.name, a.id]));

      const scriptAssetRows: { scriptId: number; assetId: number }[] = [];

      for (const asset of newAssets) {
        const assetId = nameToId.get(asset.name);
        if (assetId) {
          for (const sid of asset.scriptIds) {
            scriptAssetRows.push({ scriptId: sid, assetId });
          }
        }
      }

      for (const ref of existingRefs) {
        const assetId = nameToId.get(ref.name);
        if (assetId) {
          for (const sid of ref.scriptIds) {
            scriptAssetRows.push({ scriptId: sid, assetId });
          }
        }
      }

      const uniqueRows = [...new Map(scriptAssetRows.map((r) => [`${r.scriptId}_${r.assetId}`, r])).values()];

      await u.db("o_scriptAssets").whereIn("scriptId", batchScriptIds).delete();
      if (uniqueRows.length) {
        await u.db("o_scriptAssets").insert(uniqueRows);
      }

      await u.db("o_script").whereIn("id", batchScriptIds).where("projectId", projectId).update({
        extractState: 1,
        errorReason: null,
      });

      const jobKey = extractJobKey(projectId, scriptIds as number[]);
      mergeExtractSummary(jobKey, {
        projectId,
        scriptIds: batchScriptIds,
        new: toInsert.length,
        linked: uniqueRows.length,
        existing: existingRefs.length + skippedNew.length,
        skipped: skippedNew.length,
      });
    }
    const jobKey = extractJobKey(projectId, scriptIds as number[]);
    setExtractSummary(jobKey, { projectId, scriptIds: scriptIds as number[], new: 0, linked: 0, existing: 0, skipped: 0, errors: [] });
    res.send(success({ message: "开始提取资产", jobKey, extractStateEnum: { queued: 2, running: 0, ok: 1, fail: -1 } }));

    function processGroup(group: number[][][]) {
      group.map(async (itemIds) => {
        const validScripts: { id: number; script: o_script }[] = [];
        for (const scriptIds of itemIds as number[][]) {
          for (const scriptId of scriptIds) {
            const script = scriptMap.get(scriptId);
            if (!script) {
              errors.push({ scriptId, error: "未找到对应剧本" });
              await u.db("o_script").where("id", scriptId).where("projectId", projectId).update({ extractState: -1, errorReason: "未找到对应剧本" });
            } else {
              // 查看状态是否为等待提取，仅对等待提取进行生成
              const item = await u.db("o_script").where("projectId", projectId).where("id", scriptId).select("extractState").first();
              if (item?.extractState == 2) {
                validScripts.push({ id: scriptId, script });
              }
            }
          }
        }
        if (!validScripts.length) {
          const stuckIds = (itemIds as number[][]).flat();
          if (stuckIds.length) {
            await u.db("o_script")
              .where("projectId", projectId)
              .whereIn("id", stuckIds)
              .whereIn("extractState", [0, 2])
              .update({ extractState: -1, errorReason: "提取任务未执行（状态异常，请重试）" });
          }
          return;
        }
        const validScriptIds = validScripts.map((v) => v.id);
        // 修改状态为正在提取中
        await u.db("o_script").where("projectId", projectId).whereIn("id", validScriptIds).update({
          extractState: 0, // 正在提取
        });
        // 查询当前项目已有的资产列表，提供给 AI 参考
        const existingAssets = await u.db("o_assets").where("projectId", projectId).select("name", "type");
        const existingAssetsList = existingAssets.map((a) => `${a.name}(${a.type})`).join("、");

        // 拼接多集剧本内容，每集用分隔标记
        const scriptsContent = validScripts
          .map(({ id, script }) => `===== 【剧本ID: ${id}】${script.name || ""} =====\n${script.content}`)
          .join("\n\n");

        let collectedNew: NewAsset[] = [];
        let collectedExisting: ExistingAssetRef[] = [];
        try {
          const resultTool = tool({
            description: "返回结果时必须调用这个工具",
            inputSchema: jsonSchema<{ newAssets: NewAsset[]; existingAssetRefs: ExistingAssetRef[] }>(
              z
                .object({
                  newAssets: z
                    .array(NewAssetSchema)
                    .describe("新发现的资产列表（不在已有资产列表中的），需要完整的 prompt、name、desc、type 和使用该资产的 scriptIds"),
                  existingAssetRefs: z
                    .array(ExistingAssetRefSchema)
                    .describe("已有资产的引用列表（在已有资产列表中已存在的），只需给出资产名称和使用该资产的 scriptIds"),
                })
                .toJSONSchema(),
            ),
            execute: async ({ newAssets, existingAssetRefs }) => {
              if (newAssets?.length) collectedNew = newAssets;
              if (existingAssetRefs?.length) collectedExisting = existingAssetRefs;
              return "无需回复用户任何内容";
            },
          });
          const promptData = await u.db("o_prompt").where("type", "scriptAssetExtraction").first();
          let scriptAssetExtraction = "" as string | undefined;
          if (promptData && promptData.useData) {
            scriptAssetExtraction = promptData.useData;
          } else {
            scriptAssetExtraction = promptData?.data ?? undefined;
          }
          const existingHint = existingAssetsList
            ? `\n\n【已有资产列表】：${existingAssetsList}\n对于已有资产，如果在剧本中出现，只需在 existingAssetRefs 中给出资产名称和对应的 scriptIds 数组即可，无需重复生成 desc/type。对于新发现的资产（不在已有列表中），请在 newAssets 中给出完整信息。`
            : "";
          const output = await u.Ai.Text("universalAi").invoke({
            messages: [
              {
                role: "system",
                content:
                  scriptAssetExtraction +
                  "\n\n提取剧本中涉及的资产（角色、场景、道具），参考技能 script_assets_extract 规范，结果必须通过 resultTool 工具返回。" +
                  "\n\n注意：本次会同时提供多集剧本，每集剧本以 ===== 【剧本ID: xxx】 ===== 分隔。你需要分析每集剧本使用了哪些资产，并在输出中用 scriptIds 数组标明每个资产在哪些剧本中出现。",
              },
              {
                role: "user",
                content: `当前已有资产列表：${existingHint}\n\n请根据以下${validScripts.length}集剧本提取对应的剧本资产（角色、场景、道具）:\n\n${scriptsContent}`,
              },
            ],
            tools: { resultTool },
          });
          await persistGroupResult({
            batchScriptIds: validScriptIds,
            newAssets: collectedNew,
            existingRefs: collectedExisting,
          });
        } catch (e) {
          console.error(`[extractAssets] group=[${validScriptIds.join(",")}] 提取失败:`, e);
          for (const { id, script } of validScripts) {
            errors.push({ scriptId: id, error: (script.name || "") + ":" + u.error(e).message });
            await u
              .db("o_script")
              .where("id", id)
              .where("projectId", projectId)
              .update({ extractState: -1, errorReason: u.error(e).message });
          }
          return;
        }
        if (!collectedNew.length && !collectedExisting.length) {
          for (const { id } of validScripts) {
            errors.push({ scriptId: id, error: "AI 未返回任何资产" });
            await u.db("o_script").where("id", id).where("projectId", projectId).update({ extractState: -1, errorReason: "AI 未返回任何资产" });
          }
          return;
        }
      });
    }
    processGroup(scriptGroups);
  },
);

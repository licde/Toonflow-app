import express from "express";
import u from "@/utils";
import pLimit from "p-limit";
import * as zod from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import {
  buildAssetPolishUserMessage,
  polishOutputChecklist,
  resolveAssetTier,
  type AssetTier,
} from "@/ruleEngine/bundle/assetVisualBrief";

const router = express.Router();

type ItemType = "characters" | "props" | "scenes";

const STUB_DESCRIBE = /^(暂无描述|无描述|no\s*description|waiting|stub for\b)/i;
const PURE_SCENE_NEEDLE = /no people|no characters|PURE-SCENE/i;

function extractPolishText(invokeResult: unknown): string {
  const r = invokeResult as { text?: string; _output?: string; output?: string };
  return (r?.text ?? r?._output ?? r?.output ?? "").trim();
}

function normalizePolishType(raw: string): "role" | "scene" | "tool" | string {
  const t = String(raw ?? "").trim().toLowerCase();
  if (t === "props" || t === "prop" || t === "tool") return "tool";
  if (t === "characters" || t === "character" || t === "role") return "role";
  if (t === "scenes" || t === "scene") return "scene";
  return raw;
}

function resolveDescribe(opts: {
  feDescribe: string;
  dbPrompt: string;
  dbDescribe: string;
  name: string;
}): string {
  const fe = String(opts.feDescribe ?? "").trim();
  const prompt = String(opts.dbPrompt ?? "").trim();
  const dbDesc = String(opts.dbDescribe ?? "").trim();
  const candidates = [prompt, dbDesc, fe].filter((c) => c && !STUB_DESCRIBE.test(c) && c !== opts.name);
  if (candidates.length) {
    return candidates.sort((a, b) => b.length - a.length)[0]!;
  }
  if (prompt && !STUB_DESCRIBE.test(prompt)) return prompt;
  if (dbDesc && !STUB_DESCRIBE.test(dbDesc)) return dbDesc;
  // Last resort: name-only still allows polish (LLM expands from art manual + context)
  return opts.name;
}

export default router.post(
  "/",
  validateFields({
    items: zod.array(
      zod.object({
        assetsId: zod.number(),
        type: zod.string(),
        name: zod.string(),
        describe: zod.string(),
      }),
    ),
    projectId: zod.number(),
    concurrentCount: zod.number().int().min(1).optional(),
    otherTextPrompt: zod.string().optional().default(""),
    storyHint: zod.string().optional(),
    styleHint: zod.string().optional(),
    leadCodes: zod.array(zod.string()).optional(),
    leadNames: zod.array(zod.string()).optional(),
  }),
  async (req, res) => {
    const { projectId, items, concurrentCount, leadCodes, leadNames } = req.body;
    const otherTextPrompt = String(req.body.otherTextPrompt ?? "");
    const storyHint = String(req.body.storyHint ?? "");
    const styleHint = String(req.body.styleHint ?? "");

    const project = await u.db("o_project").where("id", projectId).select("artStyle", "type", "intro").first();
    if (!project) return res.status(500).send(error("项目为空"));

    const assetsIds = items.map((item: { assetsId: number }) => item.assetsId);
    const assetsDataList = await u
      .db("o_assets")
      .whereIn("id", assetsIds)
      .select("id", "assetsId", "remark", "prompt", "describe", "name");
    if (!assetsDataList || assetsDataList.length === 0) return res.status(500).send(error("资产不存在"));
    const assetsDataMap = new Map(assetsDataList.map((a: { id: number }) => [a.id, a]));

    await u.db("o_assets").whereIn("id", assetsIds).update({ promptState: "生成中" });

    const getTypeConfig = (
      isDerivative: boolean,
    ): Record<string, { promptKey: string; itemType: ItemType; label: string; nameLabel: string; visualManual: string }> => ({
      role: {
        promptKey: "role-polish",
        itemType: "characters",
        label: "角色标准四视图",
        nameLabel: "角色",
        visualManual: isDerivative ? "art_character_derivative" : "art_character",
      },
      scene: {
        promptKey: "scene-polish",
        itemType: "scenes",
        label: "场景图",
        nameLabel: "场景",
        visualManual: isDerivative ? "art_scene_derivative" : "art_scene",
      },
      tool: {
        promptKey: "tool-polish",
        itemType: "props",
        label: "道具图",
        nameLabel: "道具",
        visualManual: isDerivative ? "art_prop_derivative" : "art_prop",
      },
    });

    const limit = pLimit(concurrentCount ?? 1);
    const tasks = items.map((item: { assetsId: number; type: string; name: string; describe: string }) =>
      limit(async () => {
        const assetData = assetsDataMap.get(item.assetsId) as
          | { id: number; assetsId?: number; remark?: string; prompt?: string; describe?: string; name?: string }
          | undefined;
        if (!assetData) {
          await u
            .db("o_assets")
            .where("id", item.assetsId)
            .update({ promptState: "生成失败", promptErrorReason: "asset_not_found" });
          return;
        }

        const stillType = normalizePolishType(item.type);
        const desc = resolveDescribe({
          feDescribe: item.describe,
          dbPrompt: String(assetData.prompt ?? ""),
          dbDescribe: String(assetData.describe ?? ""),
          name: item.name,
        });
        if (!desc) {
          await u
            .db("o_assets")
            .where("id", item.assetsId)
            .update({ promptState: "生成失败", promptErrorReason: "describe_empty_or_stub" });
          return;
        }

        const remark = String(assetData.remark ?? "");
        // Weak/stub: attempt AI visual complete via polish (no hard orphan fail).
        // complete_failed only if name-only with zero story context and still empty after polish.
        const needsComplete =
          remark.includes("orphanStub:1") ||
          remark.includes("cdStub:1") ||
          remark.includes("speakerSeed:1") ||
          remark.includes("batchExclude:1") ||
          /^stub for\b/i.test(String(assetData.prompt ?? "")) ||
          desc === item.name;

        const typeConfig = getTypeConfig(!!assetData.assetsId);
        const config = typeConfig[stillType];
        if (!config) {
          await u
            .db("o_assets")
            .where("id", item.assetsId)
            .update({ promptState: "生成失败", promptErrorReason: `unsupported_type:${item.type}` });
          return;
        }

        const visualManual = await u.getArtPrompt(project.artStyle as string, "art_skills", config.visualManual);
        if (!visualManual) {
          await u
            .db("o_assets")
            .where("id", item.assetsId)
            .update({ promptState: "生成失败", promptErrorReason: "视觉手册未定义" });
          return;
        }

        const codeMatch = remark.match(/(?:charCode|assetCode):([A-Z0-9_-]+)/i);
        const tier: AssetTier =
          stillType === "role"
            ? resolveAssetTier({
                code: codeMatch?.[1],
                name: item.name,
                leadCodes,
                leadNames,
              })
            : "support";

        const userContent = buildAssetPolishUserMessage({
          type: stillType as "role" | "scene" | "tool",
          name: item.name,
          describe: desc,
          artStyle: project.artStyle as string,
          styleHint: styleHint || undefined,
          storyHint: (storyHint || project.intro || "").slice(0, 800) || undefined,
          intro: project.intro as string | undefined,
          tier,
          label: config.nameLabel,
        });

        const completeHint = needsComplete
          ? `\n【AI设定补全】当前仅有弱设定/姓名。请基于故事语境合理推断完整可画视觉设定（角色须含脸/发/装；禁止与已锁定主角同脸同发同装）。若完全无剧情锚点可推断，输出 COMPLETE_FAILED。`
          : "";

        try {
          const runPolish = async (extraHint?: string) => {
            const invoked = await u.Ai.Text("universalAi").invoke({
              system:
                visualManual +
                completeHint +
                (otherTextPrompt ? `\n${otherTextPrompt}` : "") +
                (extraHint ? `\n${extraHint}` : ""),
              messages: [{ role: "user", content: userContent }],
            });
            return extractPolishText(invoked);
          };

          let text = await runPolish();
          if (!text || text.length < 8 || /COMPLETE_FAILED/i.test(text)) {
            await u
              .db("o_assets")
              .where("id", item.assetsId)
              .update({
                promptState: "生成失败",
                promptErrorReason: needsComplete ? "complete_failed" : "polish_empty_text",
              });
            return;
          }

          const missing = polishOutputChecklist(stillType as "role" | "scene" | "tool", text);
          if (missing.length) {
            const retry = await runPolish(`请补全缺失字段后重写完整提示词：${missing.join("、")}`);
            if (retry && retry.length >= text.length && !/COMPLETE_FAILED/i.test(retry)) text = retry;
          }

          if (stillType === "scene" && !PURE_SCENE_NEEDLE.test(text)) {
            text = `${text}\nPURE-SCENE: empty environment plate, no people, no characters, no faces, no hands`;
          }

          const cleanedRemark =
            [
              ...String(assetData.remark ?? "")
                .split(";")
                .filter(
                  (t) =>
                    t &&
                    t !== "weakPrompt:1" &&
                    t !== "batchExclude:1" &&
                    t !== "cdStub:1" &&
                    t !== "speakerSeed:1" &&
                    t !== "orphanStub:1",
                ),
              needsComplete ? "aiCompleted:1" : null,
            ]
              .filter(Boolean)
              .join(";") || null;

          await u
            .db("o_assets")
            .where("id", item.assetsId)
            .update({
              prompt: text,
              promptState: "已完成",
              promptErrorReason: null,
              remark: cleanedRemark,
            });
        } catch (e: unknown) {
          await u
            .db("o_assets")
            .where("id", item.assetsId)
            .update({ promptState: "生成失败", promptErrorReason: u.error(e).message });
        }
      }),
    );

    void Promise.all(tasks);

    return res.status(200).send(success({ total: items.length }));
  },
);

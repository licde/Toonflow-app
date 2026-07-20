import express from "express";
import u from "@/utils";
import * as zod from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { classifyGenerationFailure } from "@/ruleEngine/bundle/generationFailureHelper";
import { buildAssetPolishUserMessage, polishOutputChecklist } from "@/ruleEngine/bundle/assetVisualBrief";

const router = express.Router();

type ItemType = "characters" | "props" | "scenes";

const STUB_DESCRIBE = /^(暂无描述|无描述|no\s*description|waiting|stub for\b)/i;
const PURE_SCENE_NEEDLE = /no people|no characters|PURE-SCENE/i;

function terminalFail(assetsId: number, reason: string) {
  return u.db("o_assets").where("id", assetsId).update({
    promptState: "生成失败",
    promptErrorReason: reason,
  });
}

async function extractPolishText(invokeResult: unknown): Promise<string> {
  const r = invokeResult as { text?: string; _output?: string; output?: string };
  return (r?.text ?? r?._output ?? r?.output ?? "").trim();
}

function normalizePolishType(raw: string): string {
  const t = String(raw ?? "").trim().toLowerCase();
  if (t === "props" || t === "prop" || t === "tool") return "tool";
  if (t === "characters" || t === "character" || t === "role") return "role";
  if (t === "scenes" || t === "scene") return "scene";
  return raw;
}

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
    const { assetsId, projectId, type: rawType, name, describe } = req.body;
    const type = normalizePolishType(rawType);

    const project = await u.db("o_project").where("id", projectId).select("artStyle", "type", "intro").first();
    if (!project) return res.status(500).send(error("项目为空"));

    const assetsData = await u
      .db("o_assets")
      .where("id", assetsId)
      .select("assetsId", "remark", "prompt", "describe")
      .first();
    if (!assetsData) {
      await terminalFail(assetsId, "asset_not_found");
      return res.status(500).send(error("资产不存在"));
    }

    const feDesc = String(describe ?? "").trim();
    const dbPrompt = String(assetsData.prompt ?? "").trim();
    const dbDesc = String(assetsData.describe ?? "").trim();
    const resolved =
      [dbPrompt, dbDesc, feDesc]
        .filter((c) => c && !STUB_DESCRIBE.test(c) && c !== name)
        .sort((a, b) => b.length - a.length)[0] ||
      (!STUB_DESCRIBE.test(dbPrompt) && dbPrompt) ||
      name;

    if (!resolved) {
      await terminalFail(assetsId, "describe_empty_or_stub");
      return res.status(400).send(error("描述为空或为占位文案，无法润色"));
    }

    await u.db("o_assets").where("id", assetsId).update({ promptState: "生成中" });

    const remark = String(assetsData.remark ?? "");
    const needsComplete =
      remark.includes("orphanStub:1") ||
      remark.includes("cdStub:1") ||
      remark.includes("speakerSeed:1") ||
      remark.includes("batchExclude:1") ||
      /^stub for\b/i.test(String(assetsData.prompt ?? "")) ||
      resolved === name;

    const typeConfig: Record<
      string,
      { promptKey: string; itemType: ItemType; label: string; nameLabel: string; visualManual: string }
    > = {
      role: {
        promptKey: "role-polish",
        itemType: "characters",
        label: "角色标准四视图",
        nameLabel: "角色",
        visualManual: assetsData.assetsId ? "art_character_derivative" : "art_character",
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
    if (!config) {
      await terminalFail(assetsId, "unsupported_type");
      return res.status(500).send(error("不支持的类型"));
    }

    const visualManual = await u.getArtPrompt(project.artStyle as string, "art_skills", config.visualManual);
    if (!visualManual) {
      await terminalFail(assetsId, "visual_manual_missing");
      return res.status(500).send(error("视觉手册未定义"));
    }

    const userContent = buildAssetPolishUserMessage({
      type: type as "role" | "scene" | "tool",
      name,
      describe: resolved,
      artStyle: project.artStyle as string,
      intro: project.intro as string | undefined,
      storyHint: String(project.intro ?? "").slice(0, 800) || undefined,
      label: config.nameLabel,
      tier: "support",
    });

    const completeHint = needsComplete
      ? `\n【AI设定补全】当前仅有弱设定/姓名。请基于故事语境合理推断完整可画视觉设定（角色须含脸/发/装；禁止与已锁定主角同脸同发同装）。若完全无剧情锚点可推断，输出 COMPLETE_FAILED。`
      : "";

    try {
      const invoked = await u.Ai.Text("universalAi").invoke({
        system: visualManual + completeHint,
        messages: [{ role: "user", content: userContent }],
      });

      let text = await extractPolishText(invoked);
      if (!text || text.length < 8 || /COMPLETE_FAILED/i.test(text)) {
        await terminalFail(assetsId, needsComplete ? "complete_failed" : "polish_empty_text");
        const feedback = await classifyGenerationFailure({
          modality: "image",
          shotId: String(assetsId),
          error: needsComplete ? "complete_failed" : "polish returned empty text",
        });
        return res.status(500).send(error(needsComplete ? "设定补全失败，请回设计补 CD" : "润色结果为空", { feedback, trigger: "polish_failed" }));
      }

      const missing = polishOutputChecklist(type as "role" | "scene" | "tool", text);
      if (missing.length) {
        const retry = await u.Ai.Text("universalAi").invoke({
          system: visualManual + completeHint + `\n请补全：${missing.join("、")}`,
          messages: [{ role: "user", content: userContent }],
        });
        const retryText = await extractPolishText(retry);
        if (retryText && retryText.length >= text.length && !/COMPLETE_FAILED/i.test(retryText)) text = retryText;
      }

      if (type === "scene" && !PURE_SCENE_NEEDLE.test(text)) {
        text = `${text}\nPURE-SCENE: empty environment plate, no people, no characters, no faces, no hands`;
      }

      const cleanedRemark =
        [
          ...String(assetsData.remark ?? "")
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
      await u.db("o_assets").where("id", assetsId).update({
        prompt: text,
        promptState: "已完成",
        promptErrorReason: null,
        remark: cleanedRemark,
      });
      res.status(200).send(success({ prompt: text, assetsId }));
    } catch (e: unknown) {
      const msg = u.error(e).message;
      await terminalFail(assetsId, msg);
      const feedback = await classifyGenerationFailure({
        modality: "image",
        shotId: String(assetsId),
        error: msg,
      });
      return res.status(500).send(error(msg || "生成失败", { feedback, trigger: "polish_failed" }));
    }
  },
);

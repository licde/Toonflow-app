import express from "express";
import pLimit from "p-limit";
import u from "@/utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { applyContentPolicy } from "@/ruleEngine/compilers/contentPolicyAdapter";
import { touchPromptForVendor } from "@/ruleEngine/compilers/vendorPromptAdapter";
import { classifyGenerationFailure } from "@/ruleEngine/bundle/generationFailureHelper";
import { buildRePushPlan } from "@/ruleEngine/design/reverseRouteEngine";
import {
  assetStillTypeConfig,
  buildAssetStillPrompt,
  resolveAssetStillAspect,
  shouldBlockAssetStillGen,
  type AssetStillPromptMode,
  type AssetStillType,
} from "@/ruleEngine/bundle/assetStillPrompt";

const router = express.Router();

const PURE_SCENE_NEEDLE = /no people|no characters|PURE-SCENE/i;

const requestSchema = {
  projectId: z.number(),
  model: z.string(),
  resolution: z.string(),
  concurrentCount: z.number().int().min(1).optional(),
  promptMode: z.enum(["identity_plate", "turnaround_sheet"]).optional(),
  allowWeakOverride: z.boolean().optional(),
  /** When true (default), weak items are deferred instead of aborting the whole batch. */
  ensurePrompt: z.boolean().optional(),
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
  const { projectId, model, resolution, concurrentCount, items, promptMode, allowWeakOverride } = req.body;
  const mode = (promptMode ?? "turnaround_sheet") as AssetStillPromptMode;

  const project = await u.db("o_project").where("id", projectId).select("artStyle", "type", "intro").first();
  if (!project) return res.status(500).send(error("项目为空"));

  type Item = { id: number; type: string; name: string; prompt: string; base64: string | null | undefined };
  const accepted: Item[] = [];
  const deferred: { id: number; name: string; reason: string }[] = [];
  const totalNovelId: number[] = [];

  for (const item of items as Item[]) {
    const stillType = (["role", "scene", "tool"].includes(item.type) ? item.type : "role") as AssetStillType;
    const assetRow = await u
      .db("o_assets")
      .where("id", item.id)
      .select("remark", "prompt", "promptState", "name")
      .first();
    const gate = shouldBlockAssetStillGen({
      remark: assetRow?.remark,
      prompt: assetRow?.prompt ?? item.prompt,
      promptState: assetRow?.promptState,
      name: item.name,
      type: stillType,
      allowOverride: allowWeakOverride === true,
    });
    if (gate.block) {
      deferred.push({ id: item.id, name: item.name || String(item.id), reason: gate.reason ?? "blocked" });
      continue;
    }
    const [imageId] = await u.db("o_image").insert({
      type: item.type,
      state: "生成中",
      assetsId: item.id,
    });
    await u.db("o_assets").where("id", item.id).update({ imageId });
    totalNovelId.push(imageId);
    accepted.push(item);
  }

  if (accepted.length === 0) {
    return res.status(400).send(
      error(
        deferred.length
          ? `无可生成项（已暂缓 ${deferred.length}）：${deferred
              .slice(0, 5)
              .map((d) => `${d.name}(${d.reason})`)
              .join("；")}`
          : "无可生成项",
      ),
    );
  }

  const limit = pLimit(concurrentCount ?? 1);

  const tasks = accepted.map((item, index) =>
    limit(async () => {
      const imageId = totalNovelId[index];
      const data = await u.db("o_image").where("id", imageId).select("state").first();
      if (data?.state === "生成失败") return;

      const stillType = item.type as AssetStillType;
      if (!["role", "scene", "tool"].includes(stillType)) return;
      const cfg = assetStillTypeConfig(stillType, mode);

      await u.db("o_assets").where("id", item.id).update({ imageId });

      const assetRow = await u.db("o_assets").where("id", item.id).select("prompt", "promptState").first();
      let prompt = String(item.prompt ?? "").trim();
      if (assetRow?.promptState === "已完成" && String(assetRow.prompt ?? "").trim()) {
        prompt = String(assetRow.prompt).trim();
      }
      if (!prompt || /^stub for\b/i.test(prompt)) {
        await u
          .db("o_image")
          .where("id", imageId)
          .update({
            state: "生成失败",
            errorReason: JSON.stringify({ message: "EMPTY_PROMPT", nextStep: "batch_still" }),
          });
        return;
      }
      if (stillType === "scene" && !PURE_SCENE_NEEDLE.test(prompt)) {
        prompt = `${prompt}\nPURE-SCENE: empty environment plate, no people, no characters, no faces, no hands`;
      }
      const policy = applyContentPolicy(prompt);
      const touched = touchPromptForVendor(policy.softenedPrompt || prompt, undefined);
      prompt = String(touched.vendorPrompt ?? policy.softenedPrompt ?? prompt).trim();
      if (!prompt) {
        await u
          .db("o_image")
          .where("id", imageId)
          .update({
            state: "生成失败",
            errorReason: JSON.stringify({ message: "EMPTY_PROMPT", nextStep: "batch_still" }),
          });
        return;
      }

      const imagePath = `/${projectId}/${cfg.dir}/${uuidv4()}.jpg`;
      const userPrompt = buildAssetStillPrompt(stillType, project.artStyle ?? "", item.name, prompt, mode);
      const aspectRatio = resolveAssetStillAspect(stillType, mode);
      const describe = `生成${cfg.label}图，名称：${item.name}，提示词：${prompt}`;
      const relatedObjects = { id: item.id, projectId, type: cfg.label };
      try {
        const aiImage = u.Ai.Image(model);
        await aiImage.run(
          {
            prompt: userPrompt,
            referenceList: item.base64 ? [{ base64: item.base64, type: "image" }] : [],
            size: resolution,
            aspectRatio: aspectRatio as `${number}:${number}`,
          },
          {
            taskClass: cfg.taskClass,
            describe,
            projectId,
            relatedObjects: JSON.stringify(relatedObjects),
          },
        );
        await aiImage.save(imagePath);

        const imageData = await u.db("o_image").where("id", imageId).select("*").first();
        if (!imageData) return;
        if (imageData.state === "生成失败") return;
        await u.db("o_image").where("id", imageId).update({
          state: "已完成",
          filePath: imagePath,
          type: item.type,
          model: model.split(/:(.+)/)[1],
          resolution,
        });

        await u.db("o_assets").where("id", item.id).update({ imageId });
      } catch (e: unknown) {
        const errMsg = u.error(e).message;
        const feedback = await classifyGenerationFailure({
          modality: "image",
          shotId: String(item.id),
          error: errMsg,
          prompt,
        });
        const busy = /service\s*busy|rate\s*limit|queue|超时|timeout|429|503/i.test(errMsg);
        const nextStep = busy || feedback.category === "vendor_passthrough" ? "batch_still" : "batch_still";
        const trigger = feedback.category === "vendor_passthrough" ? null : feedback.ruleId || feedback.category;
        const rePushPlan = trigger ? buildRePushPlan([String(trigger)]) : [];
        await u
          .db("o_image")
          .where("id", imageId)
          .update({
            state: "生成失败",
            errorReason: JSON.stringify({
              message: errMsg,
              feedback: busy ? { ...feedback, category: "vendor_busy" } : feedback,
              rePushPlan,
              nextStep,
            }),
          });
      }
    }),
  );

  Promise.all(tasks).catch(() => {});

  return res.status(200).send(
    success({
      total: items.length,
      accepted: accepted.length,
      deferred,
      message:
        deferred.length > 0
          ? `已受理 ${accepted.length} 项；暂缓 ${deferred.length} 项（请先批量生成提示词/修复）：${deferred
              .slice(0, 3)
              .map((d) => d.name)
              .join("、")}`
          : `已受理 ${accepted.length} 项`,
    }),
  );
});

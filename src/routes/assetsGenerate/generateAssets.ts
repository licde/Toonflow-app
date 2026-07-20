import express from "express";
import u from "@/utils";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { touchPromptForVendor } from "@/ruleEngine/compilers/vendorPromptAdapter";
import { applyContentPolicy } from "@/ruleEngine/compilers/contentPolicyAdapter";
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
  id: z.number(),
  type: z.enum(["role", "scene", "tool", "storyboard"]),
  name: z.string(),
  prompt: z.string(),
  base64: z.string().optional().nullable(),
  promptMode: z.enum(["identity_plate", "turnaround_sheet"]).optional(),
  allowWeakOverride: z.boolean().optional(),
};

export default router.post("/", validateFields(requestSchema), async (req, res) => {
  const {
    projectId,
    model,
    resolution,
    id,
    type,
    name,
    prompt: bodyPrompt,
    base64,
    promptMode,
    allowWeakOverride,
  } = req.body;
  const mode = (promptMode ?? "turnaround_sheet") as AssetStillPromptMode;

  const project = await u
    .db("o_project")
    .where("id", projectId)
    .select("artStyle", "type", "intro", "videoRatio")
    .first();
  if (!project) return res.status(500).send(error("项目为空"));

  const stillType = type as AssetStillType;
  if (!["role", "scene", "tool"].includes(stillType)) {
    return res.status(400).send(error("不支持的类型"));
  }
  const cfg = assetStillTypeConfig(stillType, mode);

  const assetRow = await u.db("o_assets").where("id", id).select("id", "prompt", "promptState", "remark", "name").first();
  if (!assetRow) return res.status(400).send(error("资产不存在"));

  const gate = shouldBlockAssetStillGen({
    remark: assetRow.remark,
    prompt: assetRow.prompt ?? bodyPrompt,
    promptState: assetRow.promptState,
    name,
    type: stillType,
    allowOverride: allowWeakOverride === true,
  });
  if (gate.block) {
    return res.status(400).send(error(gate.reason ?? "资产不可生成"));
  }

  let prompt = String(bodyPrompt ?? "").trim();
  if (assetRow.promptState === "已完成" && String(assetRow.prompt ?? "").trim()) {
    prompt = String(assetRow.prompt).trim();
  }
  if (!prompt || /^stub for\b/i.test(prompt)) {
    return res.status(400).send(error("提示词为空或为占位文案"));
  }
  if (type === "scene" && prompt.replace(/\s/g, "").length < 8) {
    return res.status(400).send(error("场景提示词过短，请先润色"));
  }
  if (type === "scene" && !PURE_SCENE_NEEDLE.test(prompt)) {
    prompt = `${prompt}\nPURE-SCENE: empty environment plate, no people, no characters, no faces, no hands`;
  }

  const policy = applyContentPolicy(prompt);
  // Identity stills: do not let videoRatio override aspect; only soft-touch prompt text
  const touched = touchPromptForVendor(policy.softenedPrompt || prompt, undefined);
  prompt = String(touched.vendorPrompt ?? policy.softenedPrompt ?? prompt ?? "").trim();
  if (!prompt) {
    return res.status(400).send(error("提示词为空或为占位文案"));
  }

  const [imageId] = await u.db("o_image").insert({
    type,
    state: "生成中",
    assetsId: id,
    model: model.split(/:(.+)/)[1],
    resolution,
  });
  await u.db("o_assets").where("id", id).update({ imageId });

  const imagePath = `/${projectId}/${cfg.dir}/${uuidv4()}.jpg`;
  const userPrompt = buildAssetStillPrompt(stillType, project.artStyle!, name, prompt, mode);
  const aspectRatio = resolveAssetStillAspect(stillType, mode);
  const describe = `生成${cfg.label}图，名称：${name}，提示词：${prompt}`;
  const relatedObjects = { id, projectId, type: cfg.label };

  try {
    const aiImage = u.Ai.Image(model);
    await aiImage.run(
      {
        prompt: userPrompt,
        referenceList: base64 ? [{ type: "image", base64 }] : [],
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
    if (!imageData) return res.status(500).send(error("资产已被删除"));
    if (imageData.state === "生成失败") {
      return res.status(400).send(error(imageData.errorReason || "图片生成失败"));
    }
    await u.db("o_image").where("id", imageId).update({
      state: "已完成",
      filePath: imagePath,
      type,
      model: model.split(/:(.+)/)[1],
      resolution,
    });

    const path = await u.oss.getSmallImageUrl(imagePath);
    await u.db("o_assets").where("id", id).update({ imageId });

    return res.status(200).send(success({ path, assetsId: id }));
  } catch (e) {
    const errMsg = u.error(e).message;
    const feedback = await classifyGenerationFailure({
      modality: "image",
      shotId: String(id),
      error: errMsg,
      prompt,
    });
    const trigger = feedback.category === "vendor_passthrough" ? null : feedback.ruleId || feedback.category;
    const rePushPlan = trigger ? buildRePushPlan([String(trigger)]) : [];
    await u
      .db("o_image")
      .where("id", imageId)
      .update({
        state: "生成失败",
        errorReason: JSON.stringify({ message: errMsg, feedback, rePushPlan, nextStep: "batch_still" }),
      });
    return res.status(400).send(error(errMsg || "图片生成失败", { feedback, rePushPlan, nextStep: "batch_still" }));
  }
});

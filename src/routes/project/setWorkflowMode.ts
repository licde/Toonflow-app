import express from "express";
import { z } from "zod";
import { error, success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import u from "@/utils";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    mode: z.enum(["standard", "quality"]),
  }),
  async (req, res) => {
    const { projectId, mode } = req.body;
    const project = await u.db("o_project").where("id", projectId).first();
    if (!project) return res.status(400).send(error("项目不存在"));
    await u.db("o_project").where("id", projectId).update({ scriptWorkflowMode: mode });
    return res.status(200).send(success({ mode, message: mode === "quality" ? "已切换为高质量模式" : "已切换为标准模式" }));
  },
);

import express from "express";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import u from "@/utils";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
  }),
  async (req, res) => {
    const { projectId } = req.body;
    const project = await u.db("o_project").where("id", projectId).select("scriptWorkflowMode").first();
    const mode = project?.scriptWorkflowMode === "quality" ? "quality" : "standard";
    return res.status(200).send(
      success({
        mode,
        label: mode === "quality" ? "高质量模式" : "标准模式",
        description:
          mode === "quality"
            ? "启用 17 步确认式改编流水线（风格定位→改版矩阵→人物视觉→台词验证）"
            : "使用默认三阶段流水线（故事骨架→改编策略→剧本编写）",
      }),
    );
  },
);

import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
const router = express.Router();

export default router.post(
  "/",
  validateFields({
    ids: z.array(z.number()),
  }),
  async (req, res) => {
    const { ids } = req.body;
    const rows = await u.db("o_storyboard").whereIn("id", ids).select("id", "state", "reason");
    const total = rows.length;
    const generating = rows.filter((r) => r.state === "生成中").length;
    const completed = rows.filter((r) => r.state === "已完成").length;
    const failed = rows.filter((r) => r.state === "生成失败").length;
    const failedItems = rows.filter((r) => r.state === "生成失败").map((r) => ({ id: r.id, reason: r.reason || "未知错误" }));
    return res.status(200).send(success({ total, generating, completed, failed, failedItems }));
  },
);

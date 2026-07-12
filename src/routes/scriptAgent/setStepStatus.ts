import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    stepId: z.string(),
    status: z.enum(["pending", "done", "blocked"]),
  }),
  async (req, res) => {
    const { projectId, stepId, status } = req.body;
    const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
    let plan: Record<string, string> = {};
    if (row?.data) {
      try {
        plan = JSON.parse(row.data as string);
      } catch {
        plan = {};
      }
    }
    let stepStatus: Record<string, { status: string; completedAt?: number }> = {};
    try {
      stepStatus = JSON.parse(plan._stepStatus ?? "{}");
    } catch {
      stepStatus = {};
    }
    stepStatus[stepId] = { status, completedAt: status === "done" ? Date.now() : undefined };
    plan._stepStatus = JSON.stringify(stepStatus);
    if (row) {
      await u.db("o_agentWorkData").where({ id: row.id }).update({ data: JSON.stringify(plan), updateTime: Date.now() });
    } else {
      await u.db("o_agentWorkData").insert({ projectId, key: "scriptAgent", data: JSON.stringify(plan), createTime: Date.now() });
    }
    return res.status(200).send(success({ stepStatus }));
  },
);

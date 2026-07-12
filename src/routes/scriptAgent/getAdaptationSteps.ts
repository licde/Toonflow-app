import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";

const router = express.Router();

const STEPS = [
  { id: "preCheck", label: "P0 预检", field: "preCheck" },
  { id: "adaptationMatrix", label: "P0.3 矩阵", field: "adaptationMatrix" },
  { id: "storyCore", label: "P0.6 核心", field: "storyCore" },
  { id: "postCheck", label: "P0.8 后检", field: "postCheck" },
  { id: "reinforcement", label: "P0.9 加固", field: "reinforcement" },
  { id: "storySkeleton", label: "W1 骨架", field: "storySkeleton" },
  { id: "adaptationStrategy", label: "W2 策略", field: "adaptationStrategy" },
  { id: "script", label: "W3 剧本", field: "script" },
] as const;

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
  }),
  async (req, res) => {
    const { projectId } = req.body;
    const project = await u.db("o_project").where("id", projectId).first();
    const isNovel = project?.projectType === "novel" || project?.type === "novel";
    const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
    let plan: Record<string, string> = {};
    if (row?.data) {
      try {
        plan = JSON.parse(row.data as string);
      } catch {
        plan = {};
      }
    }
    const postCheckPassed = /通过|合格|✓|OK/i.test(plan.postCheck ?? "");
    let stepStatus: Record<string, { status?: string; completedAt?: number }> = {};
    try {
      stepStatus = JSON.parse(plan._stepStatus ?? "{}");
    } catch {
      stepStatus = {};
    }
    const novelCount = await u.db("o_novel").where({ projectId }).count("id as c");
    const steps = STEPS.map((s, idx) => {
      const done = Boolean((plan[s.field] ?? "").trim().length > 20) || stepStatus[s.id]?.status === "done";
      let locked = false;
      let lockReason = "";
      if (isNovel && idx > 0 && !done && STEPS.slice(0, idx).some((p) => !(plan[p.field] ?? "").trim() && stepStatus[p.id]?.status !== "done")) {
        locked = idx <= 4;
        if (locked) lockReason = "请先完成上一步";
      }
      if (isNovel && s.id === "script" && !postCheckPassed) {
        locked = true;
        lockReason = "P0.8 后检未通过";
      }
      return { ...s, done, locked, lockReason, index: idx, status: stepStatus[s.id]?.status ?? (done ? "done" : "pending") };
    });
    return res.status(200).send(
      success({
        projectType: isNovel ? "novel" : "script",
        novelChapterCount: Number((novelCount[0] as { c?: number })?.c ?? 0),
        steps,
        w3Unlocked: isNovel ? postCheckPassed : true,
      }),
    );
  },
);

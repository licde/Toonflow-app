import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { isRedesignRequired, getKeepLegacyAck } from "@/ruleEngine/design/redesignContract";
import { getGenreTemplateFromPlan } from "@/ruleEngine/genre/loadGenreTemplatePack";

const router = express.Router();

const STEPS = [
  { id: "preCheck", label: "P0 预检", field: "preCheck" },
  { id: "adaptationMatrix", label: "P0.3 矩阵", field: "adaptationMatrix" },
  { id: "matrixConfirm", label: "矩阵确认", field: "_userMatrixChoices" },
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
    let plan: Record<string, unknown> = {};
    if (row?.data) {
      try {
        plan = JSON.parse(row.data as string);
      } catch {
        plan = {};
      }
    }
    const planStr = plan as Record<string, string>;
    const postCheckPassed = /通过|合格|✓|OK/i.test(planStr.postCheck ?? "");
    let stepStatus: Record<string, { status?: string; completedAt?: number; stale?: boolean }> = {};
    try {
      stepStatus = JSON.parse(String(plan._stepStatus ?? "{}"));
    } catch {
      stepStatus = {};
    }
    const redesignRequired = isRedesignRequired(plan);
    const genreTemplate = getGenreTemplateFromPlan(plan);
    const novelCount = await u.db("o_novel").where({ projectId }).count("id as c");
    const steps = STEPS.map((s, idx) => {
      let structuredConfirmed = false;
      try {
        const raw = plan._userMatrixChoices ?? plan._adaptationMatrixStructured;
        const parsed = typeof raw === "string" ? JSON.parse(raw as string) : raw;
        structuredConfirmed = Boolean((parsed as { userConfirmed?: boolean })?.userConfirmed);
      } catch {
        structuredConfirmed = false;
      }
      const done =
        Boolean(String(planStr[s.field] ?? "").trim().length > 20) ||
        stepStatus[s.id]?.status === "done" ||
        (s.id === "matrixConfirm" && structuredConfirmed);
      let locked = false;
      let lockReason = "";
      if (
        isNovel &&
        idx > 0 &&
        !done &&
        STEPS.slice(0, idx).some(
          (p) => !(planStr[p.field] ?? "").trim() && stepStatus[p.id]?.status !== "done",
        )
      ) {
        locked = idx <= 5;
        if (locked) lockReason = "请先完成上一步";
      }
      if (isNovel && s.id === "script" && !postCheckPassed) {
        locked = true;
        lockReason = "P0.8 后检未通过";
      }
      if (
        redesignRequired &&
        (s.id === "adaptationStrategy" || s.id === "script") &&
        stepStatus[s.id]?.status === "done"
      ) {
        lockReason = lockReason || "须重设计：公式已更换，请按新规范重验 W3";
      }
      return {
        ...s,
        done,
        locked,
        lockReason,
        index: idx,
        status: stepStatus[s.id]?.status ?? (done ? "done" : "pending"),
        stale:
          Boolean(stepStatus[s.id]?.stale) ||
          (redesignRequired &&
            (s.id === "script" || s.id === "adaptationStrategy" || s.id === "storySkeleton")),
      };
    });
    return res.status(200).send(
      success({
        projectType: isNovel ? "novel" : "script",
        novelChapterCount: Number((novelCount[0] as { c?: number })?.c ?? 0),
        steps,
        w3Unlocked: isNovel ? postCheckPassed : true,
        redesignRequired,
        literaryStale: Boolean(genreTemplate.literaryStale),
        keepLegacyAck: getKeepLegacyAck(plan) ?? null,
        cta: redesignRequired ? "请按新规范重设计（入口 W1 → 验收 W3）" : undefined,
      }),
    );
  },
);

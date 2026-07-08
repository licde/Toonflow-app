import u from "@/utils";
import { executeStructuredGeneration } from "../generationContext/Executor";
import type { AutoApplyPolicy } from "./autoApplyPolicy";
import { getAutoApplyPolicy } from "./autoApplyPolicy";
import { resolveQualityProfile } from "./rulesService";
import taskRecord from "@/utils/taskRecord";

export type ApplyScope = "dirty" | "all" | number[];

export interface ApplyPlanInput {
  projectId: number;
  scriptId: number;
  mode: "syncApply" | "manualApply";
  scope?: ApplyScope;
  phases?: ("variants" | "images" | "videos" | "assemble")[];
  qualityProfileId?: string;
  audioOverride?: boolean;
  tierOverride?: "1K" | "2K" | "4K";
  resolutionOverride?: string;
  concurrency?: number;
  policy?: Partial<AutoApplyPolicy>;
}

async function resolveStoryboardIds(projectId: number, scriptId: number, scope: ApplyScope, includeArchived: boolean) {
  let q = u.db("o_storyboard").where({ projectId, scriptId }).orderBy("index", "asc");
  if (!includeArchived) q = q.whereNot("state", "archived");
  const rows = await q;
  if (scope === "all") return rows.map((r) => r.id!);
  if (scope === "dirty") return rows.filter((r) => r.state === "dirty").map((r) => r.id!);
  if (Array.isArray(scope)) return scope;
  return rows.map((r) => r.id!);
}

export async function applyStructuredPlan(input: ApplyPlanInput) {
  const policy = { ...(await getAutoApplyPolicy(input.projectId, input.scriptId)), ...input.policy };
  const profile = resolveQualityProfile(input.qualityProfileId ?? policy.qualityProfileId);
  const scope: ApplyScope =
    input.scope ??
    (policy.scope === "all" ? "all" : "dirty");
  const storyboardIds = await resolveStoryboardIds(
    input.projectId,
    input.scriptId,
    scope,
    policy.includeArchived,
  );

  const phases = input.phases ?? policy.phases;
  const tier = input.tierOverride ?? profile.imageTier;
  const audio = input.audioOverride ?? profile.audioDefault;
  const concurrency = input.concurrency ?? policy.concurrency;

  const done = await taskRecord(input.projectId, "结构化应用计划", "applyStructuredPlan", {
    describe: input.mode === "syncApply" ? "同步后自动重生成" : "手动应用生成计划",
    content: { scriptId: input.scriptId, scope, phases, storyboardCount: storyboardIds.length },
  });
  const taskRow = await u
    .db("o_tasks")
    .where({ projectId: input.projectId, model: "applyStructuredPlan" })
    .orderBy("id", "desc")
    .first();

  const startedAt = Date.now();
  const planSummary = {
    mode: input.mode,
    scope,
    phases,
    qualityProfileId: profile.id,
    storyboardIds,
    storyboardCount: storyboardIds.length,
    tier,
    audio,
    concurrency,
  };

  if (!storyboardIds.length) {
    await done(1, "无待处理镜头");
    return {
      taskId: taskRow?.id,
      startedAt,
      planSummary,
      message: "无待处理镜头",
      skipped: true,
    };
  }

  // 异步执行，立即返回计划摘要
  void (async () => {
    try {
      await executeStructuredGeneration({
        projectId: input.projectId,
        scriptId: input.scriptId,
        storyboardIds,
        phases,
        tier,
        audio,
        concurrency,
      });
      await done(1, JSON.stringify({ storyboardCount: storyboardIds.length }));
    } catch (e) {
      await done(-1, u.error(e).message);
    }
  })();

  return {
    taskId: taskRow?.id,
    startedAt,
    planSummary,
    message: scope === "all" ? "全局重生成已启动" : "dirty 镜头更新已启动",
  };
}

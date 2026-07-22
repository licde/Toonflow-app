/**
 * Load plan + viral writing context for scriptAgent injection.
 */
import u from "@/utils";
import { syncPackIdAliases } from "../genre/loadGenreTemplatePack";
import { compileViralWritingContext, type ViralWritingContext } from "../genre/compileWritingBrief";

export async function loadScriptAgentPlan(projectId: number): Promise<Record<string, unknown>> {
  const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
  let plan: Record<string, unknown> = { planData: {} };
  if (row?.data) {
    try {
      plan = JSON.parse(row.data as string);
    } catch {
      plan = { planData: {} };
    }
  }
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  syncPackIdAliases(plan);
  return plan;
}

export async function loadViralInjectForProject(
  projectId: number,
  stageId: string,
): Promise<{ plan: Record<string, unknown>; ctx: ViralWritingContext; injectBlock: string }> {
  const plan = await loadScriptAgentPlan(projectId);
  const ctx = compileViralWritingContext(plan, stageId);
  return { plan, ctx, injectBlock: ctx.agentInjectBlock };
}

export function stageIdFromAgentKey(key: string): string {
  if (/preCheck|P0/i.test(key)) return "P0";
  if (/storyCore|P06/i.test(key)) return "P06";
  if (/matrix|P03/i.test(key)) return "P03";
  if (/storySkeleton|W1/i.test(key)) return "W1";
  if (/adaptationStrategy|W2/i.test(key)) return "W2";
  if (/scriptAgent:script|W3|script\b/i.test(key)) return "W3";
  if (/supervision/i.test(key)) return "W3";
  return "W3";
}

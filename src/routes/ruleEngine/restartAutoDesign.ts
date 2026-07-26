import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { getAutoDesignJob, executeAutoDesignJob, shouldUseLlm } from "@/ruleEngine/bundle/autoDesign";
import { resolveContextFromScriptBundle } from "@/ruleEngine/bundle/resolveContext";
import { syncStoryboardToDb } from "@/ruleEngine/bundle/storyboardSync";
import { syncFromFlowData } from "@/ruleEngine/facade";
import { saveEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import type { FlowData } from "@/agents/productionAgent/tools";
import type { AutoDesignStage } from "@/ruleEngine/bundle/types";

const router = express.Router();

async function saveFlowData(projectId: number, scriptId: number, flowData: FlowData) {
  const row = await u.db("o_agentWorkData").where({ projectId: String(projectId), episodesId: String(scriptId), key: "productionAgent" }).first();
  const payload = JSON.stringify(flowData);
  if (!row) {
    await u.db("o_agentWorkData").insert({ projectId, episodesId: scriptId, key: "productionAgent", data: payload, createTime: Date.now() });
  } else {
    await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
  }
}

export default router.post(
  "/",
  validateFields({
    jobId: z.string().optional(),
    projectId: z.number(),
    scriptId: z.number(),
    fromStage: z.enum(["GB", "SB", "EN"]).optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, fromStage, jobId } = req.body;
      const scriptRow = await u.db("o_script").where({ id: scriptId, projectId }).first();
      if (!scriptRow) return res.status(404).send(error("剧本不存在"));

      const job = jobId ? getAutoDesignJob(jobId) : null;
      const stage = (fromStage ?? job?.partialFrom ?? "GB") as AutoDesignStage;
      const ctx = await resolveContextFromScriptBundle(u.db, projectId, scriptId, {
        bundleType: "script",
        meta: { projectId, scriptId },
        script: scriptRow.content ?? "",
      });

      const { createAutoDesignJob } = await import("@/ruleEngine/bundle/autoDesign");
      const newJob = job ?? createAutoDesignJob(projectId, scriptId);
      newJob.partialFrom = stage;
      newJob.status = "running";

      const useLlm = await shouldUseLlm(u.db, projectId);
      let flowData: FlowData = { script: scriptRow.content ?? "", scriptPlan: "", storyboardTable: "", assets: [], storyboard: [], workbench: { videoList: [] } };

      await executeAutoDesignJob(
        u.db,
        newJob.id,
        { script: scriptRow.content ?? "", context: ctx, fromStage: stage },
        async (output) => {
          flowData = { ...flowData, scriptPlan: output.scriptPlan, storyboardTable: output.storyboardTable, storyboard: output.storyboard as FlowData["storyboard"] };
          // M13: sidepath must not dump-mirror; panels keep clientId / banIndexMedia flags
          const sync = await syncStoryboardToDb(u.db, projectId, scriptId, output.storyboard, { replaceAll: true });
          flowData.storyboard = sync.panels as FlowData["storyboard"];
          await saveFlowData(projectId, scriptId, flowData);
          const pkg = await syncFromFlowData(u.db, { projectId, scriptId, ...flowData });
          try {
            const { mirrorDialoguePlanToShots } =
              require("@/ruleEngine/bundle/normalizePreDesignPack") as typeof import("@/ruleEngine/bundle/normalizePreDesignPack");
            const { runSplitOrchestrator } =
              require("@/ruleEngine/design/splitOrchestrator") as typeof import("@/ruleEngine/design/splitOrchestrator");
            // Prefer EpisodePackage shots when present — SSOT mirror only (no private dump)
            const asBundle = {
              planData: { dialoguePlan: (pkg as { dialoguePlan?: unknown }).dialoguePlan },
              preDesignPack: { shots: (pkg.shots ?? []).map((s, i) => ({ ...s, shotIndex: i + 1 })) },
            };
            mirrorDialoguePlanToShots(asBundle as never);
            const orch = runSplitOrchestrator({
              planData: asBundle.planData as Record<string, unknown>,
              shots: (asBundle.preDesignPack.shots ?? []) as Record<string, unknown>[],
              applySemanticSplit: true,
            });
            (pkg as { meta?: Record<string, unknown> }).meta = {
              ...((pkg as { meta?: object }).meta ?? {}),
              importSplitExpanded: true,
              restartAutoDesignOrch: true,
            };
            void orch;
          } catch {
            /* optional — diagnose path still saves pkg */
          }
          await saveEpisodePackage(u.db, pkg);
        },
        useLlm,
      );

      return res.status(200).send(success(getAutoDesignJob(newJob.id)));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

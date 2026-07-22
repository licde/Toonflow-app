import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { migrateEmotionNormIfNeeded } from "@/ruleEngine/emotion/migrateEmotionNorm";
import { getEmotionNormFromPlan } from "@/ruleEngine/emotion/emotionNorm";
import {
  getGenreTemplateFromPlan,
  syncPackIdAliases,
} from "@/ruleEngine/genre/loadGenreTemplatePack";
import { compileViralWritingContext } from "@/ruleEngine/genre/compileWritingBrief";
import { getHookPlanFromPlan, getPeakLedgerFromPlan } from "@/ruleEngine/design/extractPeakLedger";
import { getShotDesignIntentsFromPlan } from "@/ruleEngine/design/shotDesignIntent";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    agentType: z.enum(["scriptAgent"]),
    stageId: z.string().optional(),
  }),
  async (req, res) => {
    const { projectId, agentType, stageId } = req.body as {
      projectId: number;
      agentType: "scriptAgent";
      stageId?: string;
    };
    const row = await u.db("o_agentWorkData").where({ projectId: projectId, key: agentType }).first();

    if (!row) {
      const empty = {
        preCheck: "",
        adaptationMatrix: "",
        storyCore: "",
        postCheck: "",
        reinforcement: "",
        globalAnchors: "",
        storySkeleton: "",
        adaptationStrategy: "",
        script: "",
      };
      const [id] = await u.db("o_agentWorkData").insert({
        projectId: projectId,
        key: agentType,
        data: JSON.stringify(empty),
      });
      return res.status(200).send(
        success({
          data: empty,
          id,
        }),
      );
    }
    const defaults = {
      preCheck: "",
      adaptationMatrix: "",
      storyCore: "",
      postCheck: "",
      reinforcement: "",
      globalAnchors: "",
      storySkeleton: "",
      adaptationStrategy: "",
      script: "",
    };
    const data = { ...defaults, ...JSON.parse(row.data ?? "{}") } as Record<string, unknown>;
    const mig = migrateEmotionNormIfNeeded(data);
    if (mig.migrated) {
      await u.db("o_agentWorkData").where({ id: row.id }).update({ data: JSON.stringify(data) });
    }
    syncPackIdAliases(data);
    data.script = await u.db("o_script").where({ projectId }).select("id", "name", "content");
    (data as { emotionNorm?: unknown }).emotionNorm = getEmotionNormFromPlan(data);
    (data as { genreTemplate?: unknown }).genreTemplate = getGenreTemplateFromPlan(data);

    const stage = stageId || "W3";
    const viralWritingContext = compileViralWritingContext(data, stage);
    (data as { viralWritingContext?: unknown }).viralWritingContext = viralWritingContext;
    (data as { peakLedger?: unknown }).peakLedger = getPeakLedgerFromPlan(data);
    (data as { hookPlan?: unknown }).hookPlan = getHookPlanFromPlan(data);
    (data as { shotDesignIntent?: unknown }).shotDesignIntent = getShotDesignIntentsFromPlan(data);

    res.status(200).send(success({ data, id: row.id }));
  },
);

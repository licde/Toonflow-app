import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import {
  loadEmotionNormProfiles,
  getEmotionNormFromPlan,
} from "@/ruleEngine/emotion/emotionNorm";
import { migrateEmotionNormIfNeeded } from "@/ruleEngine/emotion/migrateEmotionNorm";
import { runContractStructureHeal } from "@/ruleEngine/heal/contractStructureHeal";
import {
  setGenreTemplateOnPlan,
  getGenreTemplateFromPlan,
  loadGenreTemplatePack,
} from "@/ruleEngine/genre/loadGenreTemplatePack";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    activeProfileId: z.string().min(1),
    applyStructureHeal: z.boolean().optional(),
  }),
  async (req, res) => {
    const { projectId, activeProfileId, applyStructureHeal } = req.body as {
      projectId: number;
      activeProfileId: string;
      applyStructureHeal?: boolean;
    };

    const profiles = loadEmotionNormProfiles().profiles ?? {};
    let known = true;
    try {
      loadGenreTemplatePack(activeProfileId);
    } catch {
      known = false;
    }
    if (!profiles[activeProfileId] && !known) {
      return res.status(400).send({
        code: 400,
        message: `未知 emotionNormProfile/packId: ${activeProfileId}`,
        data: { known: Object.keys(profiles) },
      });
    }

    const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
    let plan: Record<string, unknown> = {};
    if (row?.data) {
      try {
        plan = JSON.parse(row.data as string);
      } catch {
        plan = {};
      }
    }

    migrateEmotionNormIfNeeded(plan);
    const prevPack = getGenreTemplateFromPlan(plan).packId;
    setGenreTemplateOnPlan(plan, {
      packId: activeProfileId,
      provisional: false,
      markStale: true,
      literaryStale: true,
    });
    if (prevPack !== activeProfileId) {
      const { cascadeAfterStoryRecon } =
        require("@/ruleEngine/design/viralDoctrine") as typeof import("@/ruleEngine/design/viralDoctrine");
      cascadeAfterStoryRecon(plan, `emotionNorm_switch:${prevPack}->${activeProfileId}`);
    }
    const emotionNorm = getEmotionNormFromPlan(plan);

    let healSummary: Record<string, unknown> | undefined;
    if (applyStructureHeal) {
      const planData = (plan.planData as Record<string, unknown>) ?? {};
      const pack = (planData.preDesignPack as { shots?: unknown[] } | undefined) ?? undefined;
      const shots = pack?.shots ?? (planData.shots as unknown[]) ?? [];
      const sceneMeta =
        (planData.sceneMeta as Record<string, unknown>[]) ??
        ((planData.narrativeBrief as { sceneMeta?: Record<string, unknown>[] })?.sceneMeta ?? []);
      const healed = runContractStructureHeal({
        shots,
        sceneMeta,
        plan,
        profileId: activeProfileId,
      });
      healSummary = healed.healSummary as unknown as Record<string, unknown>;
      if (pack && Array.isArray(pack.shots)) {
        pack.shots = healed.shots;
        planData.preDesignPack = pack;
      } else if (Array.isArray(planData.shots)) {
        planData.shots = healed.shots;
      }
      if (sceneMeta.length || healed.sceneMeta.length) {
        planData.sceneMeta = healed.sceneMeta;
      }
      plan.planData = planData;
      emotionNorm.structureStale = false;
      (plan.planData as Record<string, unknown>).emotionNorm = emotionNorm;
      plan._emotionNorm = emotionNorm;
    }

    const payload = JSON.stringify(plan);
    if (row) {
      await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).update({ data: payload });
    } else {
      await u.db("o_agentWorkData").insert({
        projectId,
        key: "scriptAgent",
        data: payload,
        createTime: Date.now(),
      });
    }

    return res.status(200).send(
      success({
        emotionNorm: getEmotionNormFromPlan(plan),
        genreTemplate: getGenreTemplateFromPlan(plan),
        healSummary,
      }),
    );
  },
);

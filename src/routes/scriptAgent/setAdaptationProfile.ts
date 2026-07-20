import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { readFixtureJson } from "@/ruleEngine/utils/fixturesPath";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    genrePreset: z.string().optional(),
    lockedChoices: z.record(z.string(), z.string()).optional(),
  }),
  async (req, res) => {
    const { projectId, genrePreset, lockedChoices } = req.body;
    const profiles = readFixtureJson<{ profiles?: Record<string, { lockedChoices?: Record<string, string>; deepDefaults?: Record<string, unknown> }> }>(
      "adaptation_profiles.json",
      {},
    );
    const preset = genrePreset ? profiles.profiles?.[genrePreset] : undefined;

    const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
    let plan: Record<string, unknown> = {};
    if (row?.data) {
      try {
        plan = JSON.parse(row.data as string);
      } catch {
        plan = {};
      }
    }

    const mergedDeep = { ...(preset?.deepDefaults ?? {}), ...((plan._adaptationProfile as { deepDefaults?: Record<string, unknown> })?.deepDefaults ?? {}) };

    plan._adaptationProfile = {
      genrePreset: genrePreset ?? (plan._adaptationProfile as { genrePreset?: string })?.genrePreset,
      lockedChoices: { ...preset?.lockedChoices, ...lockedChoices },
      deepDefaults: Object.keys(mergedDeep).length ? mergedDeep : undefined,
      updatedAt: Date.now(),
    };

    if (preset?.deepDefaults && !(plan as { planData?: Record<string, unknown> }).planData) {
      (plan as { planData?: Record<string, unknown> }).planData = {};
    }
    const planData = (plan as { planData?: Record<string, unknown> }).planData;
    if (planData && preset?.deepDefaults) {
      const existing = (planData.adaptationMatrixStructured as { deepAdaptation?: Record<string, unknown> } | undefined)?.deepAdaptation ?? {};
      planData.adaptationMatrixStructured = {
        ...(planData.adaptationMatrixStructured as object ?? {}),
        deepAdaptation: { ...preset.deepDefaults, ...existing },
      };
    }

    if (row) {
      await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).update({ data: JSON.stringify(plan) });
    } else {
      await u.db("o_agentWorkData").insert({ projectId, key: "scriptAgent", data: JSON.stringify(plan), createTime: Date.now() });
    }

    return res.status(200).send(success({ adaptationProfile: plan._adaptationProfile }));
  },
);

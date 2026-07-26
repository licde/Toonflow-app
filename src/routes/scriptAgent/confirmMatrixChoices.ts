import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { normalizeDeepAdaptation } from "@/ruleEngine/bundle/normalizeDeepAdaptation";
import {
  getEmotionNormFromPlan,
  mapMatrixEmotionLogicToProfile,
} from "@/ruleEngine/emotion/emotionNorm";
import { setGenreTemplateOnPlan, getGenreTemplateFromPlan } from "@/ruleEngine/genre/loadGenreTemplatePack";

const matrixEntrySchema = z.object({
  dimId: z.string(),
  choice: z.string(),
  reason: z.string().optional(),
});

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    adaptationMatrixStructured: z.object({
      matrix: z.array(matrixEntrySchema).min(1),
      deepAdaptation: z
        .object({
          nameMap: z.unknown().optional(),
          relationMap: z.unknown().optional(),
          substitutions: z.unknown().optional(),
          settingProfile: z.record(z.string(), z.unknown()).optional(),
          storyKernel: z.unknown().optional(),
          contentTranslatePlan: z.unknown().optional(),
        })
        .passthrough()
        .optional(),
      recommendedConfig: z.string().optional(),
    }),
    userConfirmed: z.boolean().optional(),
  }),
  async (req, res) => {
    const { projectId, adaptationMatrixStructured, userConfirmed } = req.body;

    const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
    let plan: Record<string, unknown> = {};
    if (row?.data) {
      try {
        plan = JSON.parse(row.data as string);
      } catch {
        plan = {};
      }
    }

    const structured = {
      ...adaptationMatrixStructured,
      userConfirmed: userConfirmed ?? true,
      confirmedAt: Date.now(),
    } as {
      matrix: { dimId: string; choice: string; reason?: string }[];
      deepAdaptation?: Record<string, unknown>;
      recommendedConfig?: string;
      userConfirmed: boolean;
      confirmedAt: number;
    };

    plan._userMatrixChoices = JSON.stringify(structured);
    plan._adaptationMatrixStructured = structured;

    if (!plan.planData || typeof plan.planData !== "object") {
      try {
        plan.planData = typeof plan.planData === "string" ? JSON.parse(plan.planData as string) : {};
      } catch {
        plan.planData = {};
      }
    }
    const pd = plan.planData as Record<string, unknown>;
    pd.adaptationMatrixStructured = structured;
    const prof = plan._adaptationProfile as { deepDefaults?: Record<string, unknown> } | undefined;
    if (prof?.deepDefaults || structured.deepAdaptation) {
      structured.deepAdaptation = normalizeDeepAdaptation({
        ...(prof?.deepDefaults ?? {}),
        ...(structured.deepAdaptation ?? {}),
      });
      pd.adaptationMatrixStructured = structured;
    }

    let stepStatus: Record<string, { status?: string; completedAt?: number }> = {};
    try {
      stepStatus = JSON.parse((plan._stepStatus as string) ?? "{}");
    } catch {
      stepStatus = {};
    }
    stepStatus.matrixConfirm = { status: "done", completedAt: Date.now() };
    plan._stepStatus = JSON.stringify(stepStatus);

    // Prefill/lock genre formula from 情感逻辑 or V05
    const locked: Record<string, string> = {};
    for (const e of structured.matrix) {
      locked[e.dimId] = e.choice;
      if (/情感|emotion/i.test(e.dimId)) locked["情感逻辑"] = e.choice;
    }
    const v05 = structured.matrix.find((e) => /V05|genreFramework|类型/i.test(e.dimId))?.choice;
    const v05Map: Record<string, string> = {
      甜宠: "sweet",
      虐恋: "abuse_romance",
      战神: "war_god",
      悬疑: "suspense",
    };
    const mapped =
      (v05 && v05Map[v05]) || mapMatrixEmotionLogicToProfile(locked) || getGenreTemplateFromPlan(plan).packId;
    const prev = getGenreTemplateFromPlan(plan);
    const packChanged = prev.packId !== mapped;
    // Commit provisional → if pack changed or leaving provisional, enter redesign debt
    const wasProvisional = Boolean(prev.provisional);
    setGenreTemplateOnPlan(plan, {
      packId: mapped,
      provisional: false,
      markStale: packChanged || wasProvisional,
      literaryStale: packChanged || wasProvisional || prev.literaryStale,
    });
    if (packChanged || (wasProvisional && getGenreTemplateFromPlan(plan).literaryStale)) {
      const { cascadeAfterStoryRecon } =
        require("@/ruleEngine/design/viralDoctrine") as typeof import("@/ruleEngine/design/viralDoctrine");
      cascadeAfterStoryRecon(plan, `matrix_confirm:${prev.packId}->${mapped}`);
    }

    if (row) {
      await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).update({ data: JSON.stringify(plan) });
    } else {
      await u.db("o_agentWorkData").insert({ projectId, key: "scriptAgent", data: JSON.stringify(plan), createTime: Date.now() });
    }

    return res.status(200).send(
      success({
        adaptationMatrixStructured: structured,
        emotionNorm: getEmotionNormFromPlan(plan),
        genreTemplate: getGenreTemplateFromPlan(plan),
      }),
    );
  },
);

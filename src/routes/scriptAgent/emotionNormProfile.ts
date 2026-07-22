import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import {
  currentNormVersion,
  getEmotionNormFromPlan,
  loadEmotionNormProfiles,
} from "@/ruleEngine/emotion/emotionNorm";
import { migrateEmotionNormIfNeeded } from "@/ruleEngine/emotion/migrateEmotionNorm";
import {
  catalogForPicker,
  getGenreTemplateFromPlan,
  syncPackIdAliases,
} from "@/ruleEngine/genre/loadGenreTemplatePack";
import { readFixtureJson } from "@/ruleEngine/utils/fixturesPath";

const router = express.Router();

export default router.get(
  "/",
  validateFields({ projectId: z.coerce.number().optional() }),
  async (req, res) => {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const profilesFx = loadEmotionNormProfiles();
    const catalog = Object.entries(profilesFx.profiles ?? {}).map(([id, p]) => ({
      id,
      label: p.label ?? id,
      avStyle: p.avStyle,
      colorMood: p.colorMood,
      paletteHints: p.paletteHints,
    }));
    const depthRollout = readFixtureJson("adaptation_depth_rollout.json", { defaultDepth: "viral" });

    let emotionNorm = {
      activeProfileId: "generic",
      normVersion: currentNormVersion(),
    };
    let genreTemplate = { packId: "generic", adaptationDepth: "viral" as const };

    if (projectId) {
      const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
      if (row?.data) {
        try {
          const plan = JSON.parse(row.data as string) as Record<string, unknown>;
          migrateEmotionNormIfNeeded(plan);
          syncPackIdAliases(plan);
          emotionNorm = getEmotionNormFromPlan(plan);
          genreTemplate = getGenreTemplateFromPlan(plan) as typeof genreTemplate;
        } catch {
          /* keep default */
        }
      }
    }

    return res.status(200).send(
      success({
        catalog: catalog.length ? catalog : catalogForPicker(),
        profiles: profilesFx.profiles,
        emotionNorm,
        genreTemplate,
        formulaCatalog: catalogForPicker(),
        matrixEmotionLogicMap: profilesFx.matrixEmotionLogicMap,
        adaptationDepth: depthRollout,
      }),
    );
  },
);

import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { readFixtureJson } from "@/ruleEngine/utils/fixturesPath";

const router = express.Router();

export default router.get(
  "/",
  validateFields({ projectId: z.coerce.number().optional() }),
  async (req, res) => {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const catalog = readFixtureJson("adaptation_matrix_catalog.json", {});
    const profiles = readFixtureJson("adaptation_profiles.json", { profiles: {} });

    let adaptationProfile: Record<string, unknown> | null = null;
    if (projectId) {
      const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
      if (row?.data) {
        try {
          const plan = JSON.parse(row.data as string);
          adaptationProfile = (plan._adaptationProfile as Record<string, unknown>) ?? null;
        } catch {
          adaptationProfile = null;
        }
      }
    }

    return res.status(200).send(success({ catalog, profiles, adaptationProfile }));
  },
);

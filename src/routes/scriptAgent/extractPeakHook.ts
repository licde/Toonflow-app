import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import {
  extractPeakLedgerFromText,
  setPeakHookOnPlan,
  getPeakLedgerFromPlan,
  getHookPlanFromPlan,
} from "@/ruleEngine/design/extractPeakLedger";
import { getGenreTemplateFromPlan, syncPackIdAliases } from "@/ruleEngine/genre/loadGenreTemplatePack";
import { compileViralWritingContext } from "@/ruleEngine/genre/compileWritingBrief";

const router = express.Router();

/** POST: extract peakLedger + hookPlan from source text; optionally persist */
export default router.post(
  "/",
  validateFields({
    projectId: z.number().optional(),
    sourceText: z.string().min(1),
    packId: z.string().optional(),
    persist: z.boolean().optional(),
    maxPeaks: z.number().optional(),
  }),
  async (req, res) => {
    const { projectId, sourceText, packId, persist, maxPeaks } = req.body as {
      projectId?: number;
      sourceText: string;
      packId?: string;
      persist?: boolean;
      maxPeaks?: number;
    };

    let plan: Record<string, unknown> = { planData: {} };
    if (projectId) {
      const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
      if (row?.data) {
        try {
          plan = JSON.parse(row.data as string);
        } catch {
          plan = { planData: {} };
        }
      }
      syncPackIdAliases(plan);
    }

    const resolvedPack = packId || getGenreTemplateFromPlan(plan).packId || "generic";
    const extracted = extractPeakLedgerFromText(sourceText, { packId: resolvedPack, maxPeaks });

    if (persist && projectId) {
      setPeakHookOnPlan(plan, extracted);
      const payload = JSON.stringify(plan);
      const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
      if (row) {
        await u.db("o_agentWorkData").where({ id: row.id }).update({ data: payload, updateTime: Date.now() });
      } else {
        await u.db("o_agentWorkData").insert({
          projectId,
          key: "scriptAgent",
          data: payload,
          createTime: Date.now(),
        });
      }
    }

    const viralWritingContext = compileViralWritingContext(
      persist && projectId
        ? plan
        : {
            planData: {
              genreTemplate: { packId: resolvedPack },
              peakLedger: extracted.peakLedger,
              hookPlan: extracted.hookPlan,
            },
          },
      "P0",
    );

    return res.status(200).send(
      success({
        peakLedger: extracted.peakLedger,
        hookPlan: extracted.hookPlan,
        rejectedFalsePeaks: extracted.rejectedFalsePeaks,
        packId: resolvedPack,
        persisted: Boolean(persist && projectId),
        viralWritingContext,
        peakCard: {
          title: "视听爆点",
          items: extracted.peakLedger.map((p) => ({
            id: p.peakId,
            label: p.avForm,
            emotion: p.emotionType,
            visual: p.avPayload.visual,
            audio: p.avPayload.audio,
          })),
        },
        hookCard: {
          title: "视听钩子",
          opening: extracted.hookPlan.opening,
          mid: extracted.hookPlan.mid,
          end: extracted.hookPlan.end,
          durationHint: viralWritingContext.durationNormLines,
        },
        stored: projectId
          ? { peakLedger: getPeakLedgerFromPlan(plan), hookPlan: getHookPlanFromPlan(plan) }
          : undefined,
      }),
    );
  },
);

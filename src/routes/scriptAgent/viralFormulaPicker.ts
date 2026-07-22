import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { smartMatchViralFormula } from "@/ruleEngine/design/smartMatch";
import {
  catalogForPicker,
  compileAdaptationConstraintBlock,
  getGenreTemplateFromPlan,
  getViralDerivations,
  syncPackIdAliases,
} from "@/ruleEngine/genre/loadGenreTemplatePack";
import { compileViralWritingContext, compileStageWritingBrief } from "@/ruleEngine/genre/compileWritingBrief";
import { extractPeakLedgerFromText } from "@/ruleEngine/design/extractPeakLedger";

const router = express.Router();

/** GET: catalog + current + optional smart match from query snippet */
export const viralFormulaPickerGet = router.get(
  "/",
  validateFields({
    projectId: z.coerce.number().optional(),
    sourceHint: z.string().optional(),
    stageId: z.string().optional(),
  }),
  async (req, res) => {
    const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
    const sourceHint = req.query.sourceHint ? String(req.query.sourceHint) : "";
    const stageId = req.query.stageId ? String(req.query.stageId) : "P0";
    const match = smartMatchViralFormula(sourceHint);
    let genreTemplate = { packId: match.recommendedPackId, adaptationDepth: "viral" as const };
    let constraintBlock = compileAdaptationConstraintBlock(match.recommendedPackId);
    let plan: Record<string, unknown> = {
      planData: { genreTemplate: { packId: match.recommendedPackId, adaptationDepth: "viral" } },
    };

    if (projectId) {
      const row = await u.db("o_agentWorkData").where({ projectId, key: "scriptAgent" }).first();
      if (row?.data) {
        try {
          plan = JSON.parse(row.data as string) as Record<string, unknown>;
          syncPackIdAliases(plan);
          genreTemplate = getGenreTemplateFromPlan(plan) as typeof genreTemplate;
          constraintBlock = compileAdaptationConstraintBlock(genreTemplate.packId, {
            derivations: getViralDerivations(plan),
          });
        } catch {
          /* keep match */
        }
      }
    }

    const previewExtract = sourceHint
      ? extractPeakLedgerFromText(sourceHint, { packId: genreTemplate.packId })
      : null;
    if (previewExtract && !projectId) {
      (plan.planData as Record<string, unknown>).peakLedger = previewExtract.peakLedger;
      (plan.planData as Record<string, unknown>).hookPlan = previewExtract.hookPlan;
    }

    const viralWritingContext = compileViralWritingContext(plan, stageId);
    const stageBrief = compileStageWritingBrief(genreTemplate.packId, stageId, {
      peakLedger: previewExtract?.peakLedger ?? viralWritingContext.peakLedger,
      hookPlan: previewExtract?.hookPlan ?? viralWritingContext.hookPlan,
      derivations: getViralDerivations(plan),
    });
    const { loadViralRhythmContract, getViralPrefs } = await import("@/ruleEngine/design/viralDoctrine");
    const contract = loadViralRhythmContract();

    return res.status(200).send(
      success({
        viralFormulaPicker: {
          recommended: match.recommendedPackId,
          reasons: match.reasons,
          confidence: match.confidence,
          catalog: match.catalog.length ? match.catalog : catalogForPicker(),
          recommendedMatrixDraft: match.recommendedMatrixDraft,
          selected: genreTemplate.packId,
          audienceTasteOptions: contract.audienceTaste ?? [],
          storyStyleOptions: contract.storyStyle ?? [],
          platformProfiles: contract.platformProfiles ?? {},
        },
        genreTemplate,
        viralPrefs: getViralPrefs(plan),
        constraintBlock,
        stageBrief,
        viralWritingContext,
        peakHookPreview: previewExtract
          ? {
              peakLedger: previewExtract.peakLedger,
              hookPlan: previewExtract.hookPlan,
              rejectedFalsePeaks: previewExtract.rejectedFalsePeaks,
            }
          : undefined,
        ux: {
          pickerTitle: "可选爆款模板",
          briefResident: true,
          cta: "按设计思路补全",
          peakHookCard: "展示爆点钩子卡与时长提示",
        },
      }),
    );
  },
);

export default router;

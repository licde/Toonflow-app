import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import {
  appendViralDerivation,
  compileAdaptationConstraintBlock,
  getGenreTemplateFromPlan,
  getViralDerivations,
  setGenreTemplateOnPlan,
  syncPackIdAliases,
  loadGenreTemplatePack,
} from "@/ruleEngine/genre/loadGenreTemplatePack";
import { compileViralWritingContext, compileStageWritingBrief } from "@/ruleEngine/genre/compileWritingBrief";
import {
  extractPeakLedgerFromText,
  setPeakHookOnPlan,
} from "@/ruleEngine/design/extractPeakLedger";
import { setViralPrefs, loadViralRhythmContract, cascadeAfterStoryRecon, LITERARY_STALE_USER_MESSAGE, LITERARY_STALE_OPTIONS } from "@/ruleEngine/design/viralDoctrine";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    packId: z.string().min(1),
    provisional: z.boolean().optional(),
    adaptationDepth: z.enum(["viral", "standard", "weakPath"]).optional(),
    derivationText: z.string().optional(),
    sourceText: z.string().optional(),
    stageId: z.string().optional(),
    audienceTaste: z.string().optional(),
    storyStyle: z.string().optional(),
    platformProfileId: z.string().optional(),
    episodeDurationSec: z.number().optional(),
  }),
  async (req, res) => {
    const {
      projectId,
      packId,
      provisional,
      adaptationDepth,
      derivationText,
      sourceText,
      stageId,
      audienceTaste,
      storyStyle,
      platformProfileId,
      episodeDurationSec,
    } = req.body as {
      projectId: number;
      packId: string;
      provisional?: boolean;
      adaptationDepth?: "viral" | "standard" | "weakPath";
      derivationText?: string;
      sourceText?: string;
      stageId?: string;
      audienceTaste?: string;
      storyStyle?: string;
      platformProfileId?: string;
      episodeDurationSec?: number;
    };

    try {
      loadGenreTemplatePack(packId);
    } catch {
      return res.status(400).send({ code: 400, message: `未知公式 packId: ${packId}` });
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
    syncPackIdAliases(plan);
    const prevPack = getGenreTemplateFromPlan(plan).packId;
    const packChanged = prevPack !== packId;
    const genreTemplate = setGenreTemplateOnPlan(plan, {
      packId,
      provisional: provisional ?? true,
      adaptationDepth,
      markStale: packChanged || !provisional,
      literaryStale: packChanged || !provisional,
    });
    const contract = loadViralRhythmContract();
    setViralPrefs(plan, {
      audienceTaste: audienceTaste || contract.audienceTaste?.[0] || "爽感",
      storyStyle: storyStyle || contract.storyStyle?.[0] || "直白快节奏",
      platformProfileId: platformProfileId || "miniprogram_paywall",
      episodeDurationSec: episodeDurationSec ?? 90,
    });
    let cascade: ReturnType<typeof cascadeAfterStoryRecon> | undefined;
    if (packChanged) {
      cascade = cascadeAfterStoryRecon(plan, `pack_switch:${prevPack}->${packId}`);
    }
    if (derivationText?.trim()) {
      appendViralDerivation(plan, derivationText, stageId || "P0");
    }
    if (sourceText?.trim()) {
      const extracted = extractPeakLedgerFromText(sourceText, { packId });
      setPeakHookOnPlan(plan, extracted);
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

    const stage = stageId || "P0";
    const viralWritingContext = compileViralWritingContext(plan, stage);
    const stageBrief = compileStageWritingBrief(packId, stage, {
      peakLedger: viralWritingContext.peakLedger,
      hookPlan: viralWritingContext.hookPlan,
      derivations: getViralDerivations(plan),
    });

    const redesignRequired = Boolean(getGenreTemplateFromPlan(plan).literaryStale);

    return res.status(200).send(
      success({
        genreTemplate: getGenreTemplateFromPlan(plan),
        constraintBlock: compileAdaptationConstraintBlock(packId, {
          derivations: getViralDerivations(plan),
        }),
        stageBrief,
        viralWritingContext,
        peakLedger: viralWritingContext.peakLedger,
        hookPlan: viralWritingContext.hookPlan,
        rebrief: packChanged,
        redesignRequired,
        cascade,
        stale: {
          literaryStale: genreTemplate.literaryStale,
          structureStale: genreTemplate.structureStale,
        },
        options: redesignRequired ? [...LITERARY_STALE_OPTIONS] : undefined,
        ux: {
          cta: redesignRequired ? "请按新规范重设计" : "按设计思路补全",
          message: redesignRequired ? LITERARY_STALE_USER_MESSAGE : undefined,
        },
      }),
    );
  },
);

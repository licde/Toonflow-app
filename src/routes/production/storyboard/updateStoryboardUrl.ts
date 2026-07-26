import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { markHqOk, mergeReasonMeta, parseStillMetaFromReason, markKeepStill } from "@/ruleEngine/compilers/stillQuality";
import { applyLifecycleInvalidation } from "@/ruleEngine/heal/lifecycleInvalidate";
import { buildPrimaryBlock } from "@/ruleEngine/compilers/primaryBlock";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    id: z.number(),
    url: z.string(),
    flowId: z.number(),
    /** when keep from HQ flow — default treat as hq_ok if already marked, else mark hq_ok for workflow keep */
    qualityMode: z.enum(["hq_update", "draft"]).optional(),
  }),
  async (req, res) => {
    const { id, url, flowId } = req.body;
    const qualityMode = req.body.qualityMode ?? "hq_update";
    const row = await u.db("o_storyboard").where({ id }).first();
    const prev = parseStillMetaFromReason(row?.reason);
    const hq = qualityMode === "hq_update";
    // Keep/upload must NOT forge visualPass — stay weak unless prior L1 pass exists
    const hqMeta = hq
      ? markKeepStill({ ...prev, qualityMode: "hq_update" })
      : { stillQuality: "weak" as const, qualityMode: "draft" as const, visualPass: false };
    const life = applyLifecycleInvalidation("still_regenerated", hqMeta);
    const primary = buildPrimaryBlock(life.primaryNextStep, { stage: "burn" });
    await u
      .db("o_storyboard")
      .where({ id })
      .update({
        filePath: u.replaceUrl(url),
        flowId,
        state: "已完成",
        shouldGenerateImage: url ? 1 : 0,
        reason: mergeReasonMeta(row?.reason, {
          ...hqMeta,
          ...(life.stillMeta ?? {}),
          nextStep: life.primaryNextStep,
          primaryNextStep: life.primaryNextStep,
          userMessage:
            hqMeta.stillQuality === "weak"
              ? "外源/保留图未经验收，未标高质量；请跑静照文学保真或重新生成"
              : primary.userMessage,
          ctaLabel: hqMeta.stillQuality === "weak" ? "重新高质量生成" : primary.ctaLabel,
          keepPath: true,
        }),
      });
    const weak = hqMeta.stillQuality === "weak";
    res.status(200).send(
      success({
        message: "更新分镜成功",
        stillQuality: hqMeta.stillQuality,
        visualPass: Boolean((hqMeta as { visualPass?: boolean }).visualPass),
        // Keep/upload must not wash to "done HQ" — FE must honor these fields
        primaryNextStep: weak ? "batch_still" : life.primaryNextStep,
        userMessage: weak
          ? "外源/保留图未经验收，未标高质量；请跑静照文学保真或重新生成"
          : primary.userMessage,
        ctaLabel: weak ? "重新高质量生成" : primary.ctaLabel,
        keepPath: true,
        stateHint: weak ? "weak_keep" : "ok",
      }),
    );
  },
);

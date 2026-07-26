import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { writeJudgeCorpusEntry } from "@/ruleEngine/qc/judgeSelfImprove";
import {
  mergeReasonMeta,
  parseStillMetaFromReason,
  resolveStillHumanRejudgeOutcome,
} from "@/ruleEngine/compilers/stillQuality";

const router = express.Router();

/**
 * Human rejudge CTA — write corpus + optional expected overrides onto storyboard reason.
 * Hard pixel fails (single_frame / cast_cardinality / background_readable / contact_geom / primary_look)
 * never forge hq_ok. LIT/PROP design debt also blocks burn.
 */
export default router.post(
  "/",
  validateFields({
    storyboardId: z.number(),
    description: z.string().optional(),
    items: z
      .array(
        z.object({
          id: z.string(),
          pass: z.boolean(),
          evidence: z.string().optional(),
          fixHint: z.string().optional(),
        }),
      )
      .min(1),
    expected: z
      .array(z.object({ id: z.string(), pass: z.boolean() }))
      .optional(),
    modality: z.enum(["still", "audio"]).optional(),
  }),
  async (req, res) => {
    try {
      const { storyboardId, description, items, expected, modality } = req.body;
      const row = await u.db("o_storyboard").where({ id: storyboardId }).first();
      if (!row) return res.status(404).send(error("分镜不存在"));
      const prev = parseStillMetaFromReason(row.reason);
      const id = `rejudge-${storyboardId}-${Date.now()}`;
      const file = writeJudgeCorpusEntry({
        id,
        createdAt: new Date().toISOString(),
        description: description || String(prev?.promptUsed ?? "").slice(0, 400),
        items,
        expected: expected ?? items.map((i: { id: string; pass: boolean }) => ({ id: i.id, pass: i.pass })),
        source: "human_rejudge",
        modality: modality ?? "still",
      });
      const outcome = resolveStillHumanRejudgeOutcome({
        items,
        prev,
        modality: modality ?? "still",
      });
      const isAudio = modality === "audio";
      let designDebtBlock = false;
      let missingSlots: string[] = [];
      let irdPrimaryAction: string | undefined;
      let debtCta: string | undefined;
      if (!isAudio) {
        try {
          const { auditLiteraryDetailQuality } =
            require("@/ruleEngine/compilers/stillLiteraryDetailQuality") as typeof import("@/ruleEngine/compilers/stillLiteraryDetailQuality");
          const { irdCtaLabelFromAction } =
            require("@/ruleEngine/design/stillIntentReverse") as typeof import("@/ruleEngine/design/stillIntentReverse");
          const lit = String(
            (prev as { literaryDesc?: string } | null)?.literaryDesc ??
              description ??
              "",
          );
          if (lit.trim().length >= 8) {
            const d2 = auditLiteraryDetailQuality({ visualDescription: lit, shotSize: "" });
            const blocks = d2.findings.filter(
              (f) =>
                f.severity === "BLOCK" &&
                (/^DEX-LIT-/.test(f.id) || f.id === "DEX-PROP-CONT"),
            );
            designDebtBlock = blocks.length > 0;
            missingSlots = [
              ...new Set(blocks.flatMap((f) => f.missingSlots ?? f.missing ?? []).map(String).filter(Boolean)),
            ];
            if (designDebtBlock) {
              irdPrimaryAction = "hand_edit_vd";
              debtCta = irdCtaLabelFromAction({ primaryAction: "hand_edit_vd", missingSlots });
            }
          }
        } catch {
          /* optional */
        }
      }
      const hardGeomOrLook = items.some(
        (i: { id: string; pass: boolean }) =>
          /contact_geom|primary_look/i.test(i.id) && !i.pass,
      );
      const burnOk = isAudio ? outcome.allPass : Boolean(outcome.burnOk) && !designDebtBlock;
      const primaryNextStep = burnOk
        ? "burn"
        : designDebtBlock
          ? "chat_repair"
          : outcome.sheetLeak ||
              items.some((i: { id: string; pass: boolean }) => /single_frame/i.test(i.id) && !i.pass)
            ? "regen_storyboard_hq"
            : hardGeomOrLook
              ? "regen_storyboard_hq"
              : "regen_storyboard_hq";
      const ctaLabel = designDebtBlock
        ? debtCta || "手改文学VD"
        : hardGeomOrLook && !burnOk
          ? items.some((i: { id: string; pass: boolean }) => /contact_geom/i.test(i.id) && !i.pass)
            ? "修接触几何"
            : "修主look"
          : outcome.ctaLabel;
      const userMessage = designDebtBlock
        ? missingSlots.length
          ? `文学细节契约未过（缺 ${missingSlots.join("/")}），人审不可标可燃片；请手改 VD`
          : "文学细节契约未过，人审不可标可燃片；请手改 VD"
        : outcome.userMessage;
      await u.db("o_storyboard").where({ id: storyboardId }).update({
        reason: mergeReasonMeta(row.reason, {
          fidelityItems: items,
          visualPass: isAudio ? prev?.visualPass : outcome.visualPass && !designDebtBlock,
          visualPassAt:
            !isAudio && burnOk ? new Date().toISOString() : isAudio ? prev?.visualPassAt : undefined,
          audioPass: isAudio ? outcome.allPass : prev?.audioPass,
          audioPassAt: isAudio && outcome.allPass ? new Date().toISOString() : prev?.audioPassAt,
          stillQuality: isAudio
            ? outcome.allPass
              ? prev?.stillQuality
              : "weak"
            : designDebtBlock
              ? "weak"
              : outcome.stillQuality,
          sheetLeak: isAudio ? prev?.sheetLeak : outcome.sheetLeak,
          humanRejudgeCorpusId: id,
          humanRejudgeFile: file,
          pendingHumanRejudge: false,
          humanOverride: burnOk ? outcome.humanOverride : false,
          humanOverrideAt: burnOk || (isAudio && outcome.allPass) ? new Date().toISOString() : undefined,
          primaryNextStep: isAudio ? undefined : primaryNextStep,
          ctaLabel: isAudio ? outcome.ctaLabel : ctaLabel,
          userMessage: isAudio ? outcome.userMessage : userMessage,
          burnReady: isAudio ? outcome.allPass : burnOk,
          missingSlots: !isAudio && missingSlots.length ? missingSlots : undefined,
          irdPrimaryAction: !isAudio ? irdPrimaryAction : undefined,
        }),
      });
      return res.status(200).send(
        success({
          corpusId: id,
          file,
          visualPass: isAudio ? undefined : outcome.visualPass && !designDebtBlock,
          audioPass: isAudio ? outcome.allPass : undefined,
          stillQuality: isAudio ? undefined : designDebtBlock ? "weak" : outcome.stillQuality,
          burnReady: isAudio ? outcome.allPass : burnOk,
          primaryNextStep: isAudio ? undefined : primaryNextStep,
          humanOverride: burnOk ? outcome.humanOverride : false,
          userMessage: isAudio ? outcome.userMessage : userMessage,
          ctaLabel: isAudio ? outcome.ctaLabel : ctaLabel,
          designDebtBlock,
          missingSlots: !isAudio && missingSlots.length ? missingSlots : undefined,
          irdPrimaryAction: !isAudio ? irdPrimaryAction : undefined,
        }),
      );
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);

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
    undo: z.boolean().optional(),
    items: z
      .array(
        z.object({
          id: z.string(),
          pass: z.boolean(),
          evidence: z.string().optional(),
          fixHint: z.string().optional(),
        }),
      )
      .optional(),
    expected: z
      .array(z.object({ id: z.string(), pass: z.boolean() }))
      .optional(),
    modality: z.enum(["still", "audio", "video"]).optional(),
    videoId: z.number().optional(),
    trackId: z.number().optional(),
  }),
  async (req, res) => {
    try {
      const { storyboardId, description, items, expected, modality, videoId, trackId, undo } = req.body;

      // V5-N11d: undo restores weak + clears videoPass (symmetric to pass)
      if (undo) {
        const rowU = await u.db("o_storyboard").where({ id: storyboardId }).first();
        if (!rowU) return res.status(404).send(error("分镜不存在"));
        const prevU = parseStillMetaFromReason(rowU.reason);
        await u.db("o_storyboard").where({ id: storyboardId }).update({
          reason: mergeReasonMeta(rowU.reason, {
            stillQuality: "weak",
            visualPass: false,
            visualPassAt: undefined,
            burnReady: false,
            humanOverride: false,
            humanOverrideAt: undefined,
            pendingHumanRejudge: true,
            videoPass: false,
            videoStale: true,
            primaryNextStep: "human_review",
            ctaLabel: "人审已撤销 · 恢复弱图",
            userMessage: "人审撤销：已恢复 weak 并清除 videoPass",
            humanRejudgeUndoneAt: new Date().toISOString(),
          }),
        });
        try {
          const sb = await u.db("o_storyboard").where({ id: storyboardId }).select("trackId").first();
          const tid = Number(trackId ?? sb?.trackId ?? 0);
          if (tid > 0) {
            await u.db("o_videoTrack").where({ id: tid }).update({ videoStale: true });
            const videos = await u.db("o_video").where({ trackId: tid }).select("id", "errorReason");
            for (const v of videos) {
              let er: Record<string, unknown> = {};
              try {
                er =
                  typeof v.errorReason === "string" && v.errorReason.trim().startsWith("{")
                    ? JSON.parse(v.errorReason)
                    : {};
              } catch {
                er = {};
              }
              await u.db("o_video").where({ id: v.id }).update({
                errorReason: JSON.stringify({
                  ...er,
                  videoPass: false,
                  videoStale: true,
                  qcWeak: true,
                  primaryNextStep: "human_review",
                  humanRejudgeUndoneAt: new Date().toISOString(),
                }),
              });
            }
          }
          if (videoId) {
            const vRow = await u.db("o_video").where({ id: videoId }).first();
            if (vRow) {
              let er: Record<string, unknown> = {};
              try {
                er =
                  typeof vRow.errorReason === "string" && vRow.errorReason.trim().startsWith("{")
                    ? JSON.parse(vRow.errorReason)
                    : {};
              } catch {
                er = {};
              }
              await u.db("o_video").where({ id: videoId }).update({
                errorReason: JSON.stringify({
                  ...er,
                  videoPass: false,
                  qcWeak: true,
                  primaryNextStep: "human_review",
                  humanRejudgeUndoneAt: new Date().toISOString(),
                }),
              });
            }
          }
        } catch {
          /* cascade best-effort */
        }
        return res.status(200).send(
          success({
            undone: true,
            stillQuality: "weak",
            videoPass: false,
            visualPass: false,
            pendingHumanRejudge: true,
            previousCorpusId: prevU?.humanRejudgeCorpusId,
            a11yAnnounce: "人审已撤销；已恢复弱图并清除 videoPass",
          }),
        );
      }

      if (!items || !Array.isArray(items) || items.length < 1) {
        return res.status(400).send(error("items 至少一条（或传 undo:true）"));
      }

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
      const isVideo = modality === "video";
      let designDebtBlock = false;
      let missingSlots: string[] = [];
      let irdPrimaryAction: string | undefined;
      let debtCta: string | undefined;
      if (!isAudio && !isVideo) {
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
                (/^DEX-LIT-/.test(f.id) ||
                  f.id === "DEX-PROP-CONT" ||
                  f.id === "DEX-PROP-IN-FRAME"),
            );
            designDebtBlock = blocks.length > 0;
            missingSlots = [
              ...new Set(blocks.flatMap((f) => f.missingSlots ?? f.missing ?? []).map(String).filter(Boolean)),
            ];
            if (designDebtBlock) {
              const enhanceable = missingSlots.length > 0 && missingSlots.every((s) =>
                /contact|grip|ground|path|surface|threshold|xor|wound|propReadable|propInFrame|contactGeom/i.test(s),
              );
              const hasXor = missingSlots.includes("contactRoleXor") || blocks.some((f) => f.id === "DEX-LIT-CONTACT-XOR");
              irdPrimaryAction = hasXor && !enhanceable
                ? "confirm_split"
                : enhanceable
                  ? "confirm_enhance"
                  : "hand_edit_vd";
              debtCta = irdCtaLabelFromAction({ primaryAction: irdPrimaryAction, missingSlots });
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
      const burnOk = isVideo
        ? items.every((i: { pass: boolean }) => i.pass)
        : isAudio
          ? outcome.allPass
          : Boolean(outcome.burnOk) && !designDebtBlock;
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
          ? `文学细节契约未过（缺 ${missingSlots.join("/")}），人审不可标可燃片；请${
              irdPrimaryAction === "confirm_enhance" || irdPrimaryAction === "apply_auto_enhance"
                ? "批准增强或手改 VD"
                : irdPrimaryAction === "confirm_split"
                  ? "拆镜或手改 VD"
                  : "手改 VD"
            }`
          : "文学细节契约未过，人审不可标可燃片；请增强/手改 VD"
        : outcome.userMessage;
      const stillPoseFromItems = (() => {
        const geom = items.find((i: { id: string; pass: boolean }) => /contact_geom|prop_pose/i.test(i.id));
        if (!geom?.pass) return undefined;
        return {
          state: "at_locus" as const,
          source: "human_rejudge" as const,
        };
      })();

      await u.db("o_storyboard").where({ id: storyboardId }).update({
        reason: mergeReasonMeta(row.reason, {
          fidelityItems: isVideo ? prev?.fidelityItems : items,
          visualPass: isVideo ? prev?.visualPass : isAudio ? prev?.visualPass : outcome.visualPass && !designDebtBlock,
          visualPassAt:
            !isAudio && !isVideo && burnOk
              ? new Date().toISOString()
              : isAudio
                ? prev?.visualPassAt
                : prev?.visualPassAt,
          audioPass: isAudio ? outcome.allPass : prev?.audioPass,
          audioPassAt: isAudio && outcome.allPass ? new Date().toISOString() : prev?.audioPassAt,
          stillQuality: isVideo
            ? prev?.stillQuality
            : isAudio
              ? outcome.allPass
                ? prev?.stillQuality
                : "weak"
              : designDebtBlock || !burnOk
                ? "weak"
                : outcome.stillQuality === "hq_ok"
                  ? "hq_ok"
                  : "weak",
          sheetLeak: isAudio || isVideo ? prev?.sheetLeak : outcome.sheetLeak,
          humanRejudgeCorpusId: id,
          humanRejudgeFile: file,
          pendingHumanRejudge: false,
          humanOverride: burnOk && !isVideo ? outcome.humanOverride : prev?.humanOverride,
          humanOverrideAt: burnOk && !isVideo ? new Date().toISOString() : prev?.humanOverrideAt,
          humanRejudgeRequiresVisualPassAt: true,
          primaryNextStep: isVideo ? undefined : isAudio ? undefined : primaryNextStep,
          ctaLabel: isVideo ? (burnOk ? "成片人审通过" : "继续修复") : isAudio ? outcome.ctaLabel : ctaLabel,
          userMessage: isVideo
            ? burnOk
              ? "成片人审已通过（接触运动未测时仍须标注）"
              : "成片人审未全过"
            : isAudio
              ? outcome.userMessage
              : userMessage,
          burnReady: isVideo ? undefined : isAudio ? outcome.allPass : burnOk,
          missingSlots: !isAudio && !isVideo && missingSlots.length ? missingSlots : undefined,
          irdPrimaryAction: !isAudio && !isVideo ? irdPrimaryAction : undefined,
          ...(stillPoseFromItems ? { stillPoseAnchor: stillPoseFromItems, contactStartState: "at_locus" } : {}),
          ...(burnOk && !isVideo && !isAudio ? { videoStale: true } : {}),
        }),
      });

      if (burnOk && !isVideo && !isAudio) {
        try {
          const sb = await u.db("o_storyboard").where({ id: storyboardId }).select("trackId").first();
          const tid = Number(trackId ?? sb?.trackId ?? 0);
          if (tid > 0) {
            await u.db("o_videoTrack").where({ id: tid }).update({ videoStale: true });
            const videos = await u.db("o_video").where({ trackId: tid }).select("id", "errorReason");
            for (const v of videos) {
              let er: Record<string, unknown> = {};
              try {
                er =
                  typeof v.errorReason === "string" && v.errorReason.trim().startsWith("{")
                    ? JSON.parse(v.errorReason)
                    : {};
              } catch {
                er = {};
              }
              await u.db("o_video").where({ id: v.id }).update({
                errorReason: JSON.stringify({
                  ...er,
                  videoPass: false,
                  videoStale: true,
                  qcWeak: er.qcWeak === true ? true : undefined,
                  primaryNextStep: "human_review",
                  staleCascadeAt: new Date().toISOString(),
                }),
              });
            }
          }
        } catch {
          /* cascade best-effort */
        }
      }

      if (isVideo && videoId) {
        const vRow = await u.db("o_video").where({ id: videoId }).first();
        if (vRow) {
          let er: Record<string, unknown> = {};
          try {
            er =
              typeof vRow.errorReason === "string" && vRow.errorReason.trim().startsWith("{")
                ? JSON.parse(vRow.errorReason)
                : {};
          } catch {
            er = {};
          }
          let adaptFeedback: import("@/ruleEngine/quality/adaptFeedbackWriteback").AdaptFeedbackEntry[] =
            [];
          try {
            const {
              adaptFeedbackFromHumanRejudge,
              mergeAdaptFeedback,
              adaptFeedbackPersistSlice,
            } = await import("@/ruleEngine/quality/adaptFeedbackWriteback");
            const prevFb = Array.isArray(er.adaptFeedback) ? (er.adaptFeedback as typeof adaptFeedback) : [];
            const shotIdx = Number(prev?.shotIndex ?? prev?.index ?? 0) || null;
            const newFb = adaptFeedbackFromHumanRejudge({ items, shotIndex: shotIdx });
            adaptFeedback = prevFb;
            for (const fb of newFb) {
              adaptFeedback = mergeAdaptFeedback(adaptFeedback, fb);
            }
            if (burnOk && !newFb.length) {
              adaptFeedback = mergeAdaptFeedback(adaptFeedback, {
                kind: "realization_adapt_ok",
                shotIndex: shotIdx,
                note: "human_pass",
              });
            }
            Object.assign(er, adaptFeedbackPersistSlice(adaptFeedback));
          } catch {
            /* optional adapt feedback */
          }
          const now = new Date().toISOString();
          await u.db("o_video").where({ id: videoId }).update({
            errorReason: JSON.stringify({
              ...er,
              videoPass: burnOk,
              motionPassAt: burnOk ? now : undefined,
              qcWeak: burnOk ? false : true,
              primaryNextStep: burnOk ? "burn" : "human_review",
              ctaLabel: burnOk ? "成片人审通过" : "SVQ 未测维 · 人审",
              humanRejudgeCorpusId: id,
              humanOverride: burnOk ? "human_checklist" : undefined,
              adaptFeedback,
            }),
            state: burnOk ? vRow.state : vRow.state,
          });
        }
      }

      return res.status(200).send(
        success({
          corpusId: id,
          file,
          visualPass: isVideo ? undefined : isAudio ? undefined : outcome.visualPass && !designDebtBlock,
          audioPass: isAudio ? outcome.allPass : undefined,
          videoPass: isVideo ? burnOk : undefined,
          stillQuality: isVideo
            ? undefined
            : isAudio
              ? undefined
              : designDebtBlock || !burnOk
                ? "weak"
                : outcome.stillQuality,
          burnReady: isVideo ? undefined : isAudio ? outcome.allPass : burnOk,
          primaryNextStep: isVideo ? (burnOk ? "burn" : "human_review") : isAudio ? undefined : primaryNextStep,
          humanOverride: burnOk && !isVideo ? outcome.humanOverride : false,
          userMessage: isVideo
            ? burnOk
              ? "成片人审已通过"
              : "成片人审未全过"
            : isAudio
              ? outcome.userMessage
              : userMessage,
          ctaLabel: isVideo ? (burnOk ? "成片人审通过" : "继续修复") : isAudio ? outcome.ctaLabel : ctaLabel,
          designDebtBlock: isVideo ? false : designDebtBlock,
          missingSlots: !isAudio && !isVideo && missingSlots.length ? missingSlots : undefined,
          irdPrimaryAction: !isAudio && !isVideo ? irdPrimaryAction : undefined,
          videoStaleCascaded: burnOk && !isVideo && !isAudio,
        }),
      );
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);

import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { assertVideoPromptReady, isVideoPromptThinShell } from "@/ruleEngine/compilers/assertVideoPromptReady";
import { isVideoPromptStub } from "@/ruleEngine/compilers/sanitizeVideoPrompt";
import { loadEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { resolveStoryboardForTrack } from "@/ruleEngine/compilers/resolveTrackStoryboard";
import {
  mergeTrackReasonMeta,
  designHashStampFromShot,
} from "@/ruleEngine/qc/persistVideoTrackPromptHash";

const router = express.Router();
export default router.post(
  "/",
  validateFields({
    id: z.number(),
    prompt: z.string().optional(),
    manualOverride: z.boolean().optional(),
  }),
  async (req, res) => {
    const { id, prompt, manualOverride } = req.body as {
      id: number;
      prompt?: string;
      manualOverride?: boolean;
      duration?: number;
    };
    const text = String(prompt ?? "");
    const row = await u.db("o_videoTrack").where("id", id).first();
    if (!row) return res.status(404).send(error("轨道不存在"));

    /** Resolve package shot for M7 stamp (hand-edit accepts current design). */
    async function resolveShotForStamp(): Promise<Record<string, unknown> | undefined> {
      try {
        const projectId = Number(row.projectId);
        const scriptId = Number(row.scriptId);
        if (!projectId || !scriptId) return undefined;
        const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
        const bind = await resolveStoryboardForTrack(u.db, id);
        const sbId = bind?.storyboardId;
        const hit =
          (sbId != null
            ? pkg?.shots?.find((s) => Number(s.storyboardId) === Number(sbId))
            : undefined) ??
          (bind?.row?.index != null
            ? pkg?.shots?.find((s) => Number(s.shotIndex) === Number(bind.row.index) + 1) ||
              pkg?.shots?.[Number(bind.row.index)]
            : undefined) ??
          pkg?.shots?.[0];
        if (hit) return hit as Record<string, unknown>;
        if (bind?.row) {
          return {
            visualDescription: String(bind.row.videoDesc ?? bind.row.prompt ?? "").trim(),
            duration: bind.row.duration,
            storyboardId: bind.storyboardId,
          };
        }
        return undefined;
      } catch {
        return undefined;
      }
    }

    if (text && (isVideoPromptStub(text) || isVideoPromptThinShell(text))) {
      if (!manualOverride) {
        return res.status(400).send(
          error("视频词为薄壳/污染壳，禁止直写；请重编译或传 manualOverride=true", {
            code: "VP-THIN-SHELL",
            primaryNextStep: "chat_repair",
            reverseTrigger: "video_prompt_stub",
          }),
        );
      }
      const shot = await resolveShotForStamp();
      const stamp = designHashStampFromShot(shot);
      // manualOverride thin shell must NOT stay burn-ready
      const reason = mergeTrackReasonMeta(row?.reason, {
        ...stamp,
        manualOverrideVideo: true,
        burnAllowed: false,
        decision: "manual_thin_shell",
        nextStep: "chat_repair",
        ctaLabel: "完善后重编译",
        userMessage: "手改薄壳已落库但不可烧片",
      });
      await u.db("o_videoTrack").where("id", id).update({ prompt: text, reason, state: "需完善" });
      return res.status(200).send(
        success({ updated: true, manualOverride: true, state: "需完善", burnAllowed: false }),
      );
    }

    if (text) {
      const ready = assertVideoPromptReady(text);
      if (!ready.ok && !manualOverride) {
        return res.status(400).send(
          error("视频词未通过 ready 门禁", {
            code: ready.code ?? "VP-THIN-SHELL",
            reasons: ready.reasons,
            reverseTrigger: "video_prompt_stub",
          }),
        );
      }
    }

    if (text) {
      const shot = await resolveShotForStamp();
      const stamp = designHashStampFromShot(shot);
      // Hand-edit must re-decide — prior 已完成/burnAllowed must not survive garbage edits
      let burnAllowed = true;
      let qdExtra: Record<string, unknown> = {};
      try {
        const { decideVideoQuality } = await import("@/ruleEngine/compilers/qualityDecision");
        const fxGradeStr = String(
          (shot as { fxFeasibility?: string } | undefined)?.fxFeasibility ??
            (shot as { generation?: { fxFeasibility?: string } } | undefined)?.generation?.fxFeasibility ??
            "",
        );
        const qd = decideVideoQuality({
          videoPrompt: text,
          shot: shot as never,
          vendorId: "agnesai",
          fxGrade: fxGradeStr,
        });
        burnAllowed = Boolean(qd.burnAllowed);
        qdExtra = {
          burnAllowed,
          decision: qd.decision,
          nextStep: qd.nextStep,
          reasons: qd.reasons,
          ctaLabel: qd.envelope?.ctaLabel ?? (burnAllowed ? undefined : "完善后重编译"),
          userMessage: qd.envelope?.userMessage ?? (burnAllowed ? undefined : "手改提示词未达烧片标准"),
        };
      } catch {
        /* decide best-effort */
      }
      if (manualOverride && !burnAllowed) {
        qdExtra = { ...qdExtra, manualOverrideVideo: true };
      } else if (manualOverride) {
        qdExtra = { ...qdExtra, manualOverrideVideo: true };
      }
      const persistState = burnAllowed ? "已完成" : "需完善";
      const reason = mergeTrackReasonMeta(row?.reason, {
        ...stamp,
        ...qdExtra,
      });
      await u.db("o_videoTrack").where("id", id).update({
        prompt: text,
        reason,
        state: persistState,
      });
      return res.status(200).send(
        success({
          updated: true,
          state: persistState,
          burnAllowed,
          ...(manualOverride ? { manualOverride: true } : {}),
        }),
      );
    }
    await u.db("o_videoTrack").where("id", id).update({ prompt });
    res.status(200).send(success({ updated: true }));
  },
);

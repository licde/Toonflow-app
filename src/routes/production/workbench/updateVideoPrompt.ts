import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { assertVideoPromptReady, isVideoPromptThinShell } from "@/ruleEngine/compilers/assertVideoPromptReady";
import { isVideoPromptStub } from "@/ruleEngine/compilers/sanitizeVideoPrompt";

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
      // Explicit hand edit: allow but mark override; burn may still assert
      const row = await u.db("o_videoTrack").where("id", id).first();
      let reason = row?.reason;
      try {
        const meta = typeof reason === "string" ? JSON.parse(reason) : reason ?? {};
        reason = JSON.stringify({ ...meta, manualOverrideVideo: true });
      } catch {
        reason = JSON.stringify({ manualOverrideVideo: true });
      }
      await u.db("o_videoTrack").where("id", id).update({ prompt: text, reason });
      return res.status(200).send(success({ updated: true, manualOverride: true }));
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

    await u.db("o_videoTrack").where("id", id).update({
      prompt,
    });
    res.status(200).send(success("更新成功"));
  },
);

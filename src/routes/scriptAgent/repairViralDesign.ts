import express from "express";
import { success } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { syncPackIdAliases } from "@/ruleEngine/genre/loadGenreTemplatePack";
import { healViralDesignRouter } from "@/ruleEngine/design/healViralDesignRouter";
import {
  confirmPendingStoryRecon,
  reconstructStoryFromSignals,
} from "@/ruleEngine/design/reconstructStoryFromSignals";
import { setLiteraryLocked, isLiteraryLocked } from "@/ruleEngine/design/viralDoctrine";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    stageId: z.string().optional(),
    maxRounds: z.number().optional(),
    confirmStoryRecon: z.boolean().optional(),
    action: z.enum(["heal", "reconstruct", "confirm_recon", "unlock_literary"]).optional(),
  }),
  async (req, res) => {
    const {
      projectId,
      stageId,
      maxRounds,
      confirmStoryRecon,
      action,
    } = req.body as {
      projectId: number;
      stageId?: string;
      maxRounds?: number;
      confirmStoryRecon?: boolean;
      action?: "heal" | "reconstruct" | "confirm_recon" | "unlock_literary";
    };

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

    const act = action || "heal";
    let result: Record<string, unknown> = {};

    if (act === "unlock_literary") {
      setLiteraryLocked(plan, false);
      result = { literaryLocked: false };
    } else if (act === "confirm_recon") {
      const r = confirmPendingStoryRecon(plan);
      result = r as unknown as Record<string, unknown>;
    } else if (act === "reconstruct") {
      const r = reconstructStoryFromSignals(plan, {
        confirm: Boolean(confirmStoryRecon),
        forceKernel: true,
      });
      result = r as unknown as Record<string, unknown>;
    } else {
      const heal = healViralDesignRouter(plan, stageId || "W3", {
        maxRounds: maxRounds ?? 3,
        confirmStoryRecon,
        autoConfirmReverse: confirmStoryRecon,
      });
      plan = heal.plan;
      result = {
        ok: heal.ok,
        rounds: heal.rounds,
        changeDiff: heal.changeDiff,
        exitGate: heal.exitGate,
        rollbackTo: heal.rollbackTo,
        needsUserConfirm: heal.needsUserConfirm,
        blocked: heal.blocked,
        literaryLocked: isLiteraryLocked(plan),
      };
    }

    const payload = JSON.stringify(plan);
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

    return res.status(200).send(success(result));
  },
);

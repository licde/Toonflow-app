import express from "express";
import { success, error } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { importScriptBundle } from "@/ruleEngine/bundle/importAdapter";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    autoDesign: z.boolean().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, autoDesign } = req.body;
      const script = await u.db("o_script").where({ id: scriptId, projectId }).first();
      if (!script) return res.status(404).send(error("剧本不存在"));
      const result = await importScriptBundle(
        u.db,
        {
          bundleType: "script",
          meta: { episodeName: script.name, scriptId, projectId },
          script: script.content ?? "",
        },
        {
          projectId,
          targetScriptId: scriptId,
          importMode: "update",
          autoDesign: autoDesign !== false,
        },
      );
      return res.status(200).send(
        success({
          ...result,
          href: `#/production?scriptId=${scriptId}${autoDesign !== false ? "&autoDesign=1" : ""}`,
        }),
      );
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);

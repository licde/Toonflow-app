import express from "express";
import { success, error } from "@/lib/responseFormat";
import u from "@/utils";
import { z } from "zod";
import { validateFields } from "@/middleware/middleware";
import { importScriptBundle } from "@/ruleEngine/bundle/importAdapter";
import { buildImportPathGuard } from "@/ruleEngine/bundle/importHelpers";
import { loadProjectBlueprint } from "@/ruleEngine/storage/episodePackageStore";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    autoDesign: z.boolean().optional(),
    acknowledgeWeakPath: z.boolean().optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, autoDesign, acknowledgeWeakPath } = req.body;
      const script = await u.db("o_script").where({ id: scriptId, projectId }).first();
      if (!script) return res.status(404).send(error("剧本不存在"));

      const blueprint = await loadProjectBlueprint(u.db, projectId);
      const hasT3Blueprint = Boolean(blueprint?.characterAssets && Object.keys(blueprint.characterAssets as object).length);
      const pathGuard = buildImportPathGuard(null, { viaEnterProduction: true });
      if (hasT3Blueprint && !acknowledgeWeakPath) {
        return res.status(400).send(
          error(
            "该项目含 T3 设计资产，enterProduction 不携带 preDesignPack/generation。请使用 POST /api/ruleEngine/importScript 导入完整 bundle，或传 acknowledgeWeakPath:true 确认仅更新剧本文本。",
          ),
        );
      }

      const result = await importScriptBundle(
        u.db,
        {
          bundleType: "script",
          meta: { episodeName: script.name, scriptId, projectId, episodeKey: script.name },
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
          pathGuard: {
            ...pathGuard,
            severity: acknowledgeWeakPath ? ("WARN" as const) : pathGuard.severity,
            message: acknowledgeWeakPath
              ? "弱路径：仅更新剧本文本，未导入 preDesign/generation，不可宣称制作就绪"
              : pathGuard.message,
          },
          generationReady: false,
          href: `#/production?scriptId=${scriptId}${autoDesign !== false ? "&autoDesign=1" : ""}`,
        }),
      );
    } catch (e) {
      return res.status(400).send(error(u.error(e).message));
    }
  },
);

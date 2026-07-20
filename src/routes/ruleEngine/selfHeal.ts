import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import { runSelfHeal } from "@/ruleEngine/design/selfHealOrchestrator";
import { loadEpisodePackage, saveEpisodePackage, loadProjectBlueprint } from "@/ruleEngine/storage/episodePackageStore";
import { buildCodeAliasMap } from "@/ruleEngine/codes/assetCodeAlias";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

const router = express.Router();

export default router.post(
  "/",
  validateFields({
    projectId: z.number(),
    scriptId: z.number(),
    shotId: z.number().optional(),
    errorText: z.string().optional(),
    category: z.string().optional(),
    jobKind: z.string().optional(),
    round: z.number().optional(),
    dryRun: z.boolean().optional(),
    apply: z.boolean().optional(),
    identityGaps: z
      .array(z.object({ code: z.string(), reason: z.string(), kind: z.string().optional() }))
      .optional(),
    issues: z
      .array(
        z.object({
          ruleId: z.string().optional(),
          message: z.string().optional(),
          autoFix: z
            .object({
              confidence: z.number().optional(),
              patch: z.record(z.string(), z.unknown()).optional(),
            })
            .optional(),
        }),
      )
      .optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, shotId, apply, dryRun } = req.body;
      const pkg = await loadEpisodePackage(u.db, projectId, scriptId);
      const shotRow =
        shotId != null
          ? pkg?.shots?.find((s) => s.storyboardId === shotId || String(s.id) === String(shotId))
          : pkg?.shots?.[0];

      const blueprint = (await loadProjectBlueprint(u.db, projectId)) ?? {};
      const rawCa = blueprint.characterAssets;
      const cdAssets = Array.isArray(rawCa)
        ? rawCa
        : rawCa && typeof rawCa === "object"
          ? Object.entries(rawCa as Record<string, unknown>).map(([code, v]) =>
              v && typeof v === "object"
                ? { code, ...(v as object) }
                : { code, name: String(v ?? code) },
            )
          : ((blueprint.characterDesign as { assets?: unknown[] } | undefined)?.assets ?? []);
      const nameMap: Record<string, string> = {};
      for (const a of cdAssets as { code?: string; name?: string }[]) {
        if (a.code && a.name) nameMap[a.code] = a.name;
      }
      if (rawCa && typeof rawCa === "object" && !Array.isArray(rawCa)) {
        for (const [code, v] of Object.entries(rawCa as Record<string, unknown>)) {
          if (typeof v === "string") nameMap[code] = v;
          else if (v && typeof v === "object" && (v as { name?: string }).name) {
            nameMap[code] = String((v as { name: string }).name);
          }
        }
      }
      const bundle = {
        characterDesign: { assets: cdAssets },
        visualLockTable: {
          sceneColorLock:
            (blueprint.sceneColorLock as Record<string, unknown>) ??
            (blueprint.visualLockTable as { sceneColorLock?: Record<string, unknown> } | undefined)?.sceneColorLock,
          characterAssets: nameMap,
        },
        preDesignPack: blueprint.preDesignPack,
      } as ScriptBundle;
      buildCodeAliasMap(bundle);

      const result = await runSelfHeal({
        projectId,
        scriptId,
        shotId,
        errorText: req.body.errorText,
        category: req.body.category,
        jobKind: req.body.jobKind,
        round: req.body.round,
        dryRun: dryRun === true,
        identityGaps: req.body.identityGaps,
        issues: req.body.issues,
        shot: shotRow as unknown as Record<string, unknown> | undefined,
        db: u.db,
        bundle,
      });

      let appliedToDb = false;
      if (apply !== false && result.patchedShot && pkg && shotRow) {
        const idx = pkg.shots.findIndex((s) => s === shotRow || s.id === shotRow.id);
        if (idx >= 0) {
          const patched = result.patchedShot as typeof shotRow;
          // Merge narrative.sceneCode when applicator wrote top-level / narr
          const narr = {
            ...(shotRow.narrative ?? {}),
            ...((patched as { narrative?: object }).narrative ?? {}),
          };
          const sc =
            (patched as { sceneCode?: string }).sceneCode ??
            (narr as { sceneCode?: string }).sceneCode;
          if (sc) (narr as { sceneCode?: string }).sceneCode = sc;
          pkg.shots[idx] = { ...shotRow, ...patched, narrative: narr };
          await saveEpisodePackage(u.db, pkg);
          appliedToDb = true;
        }
      }

      return res.status(200).send(success({ ...result, appliedToDb }));
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

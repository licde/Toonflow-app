import express from "express";
import u from "@/utils";
import { z } from "zod";
import { success, error } from "@/lib/responseFormat";
import { validateFields } from "@/middleware/middleware";
import {
  runPrecheckLoop,
  createInMemoryPatchApplier,
  type SuggestedPatch,
} from "@/ruleEngine/precheckLoop";
import { prepareBundleForInspect } from "@/ruleEngine/bundle/prepareBundleForInspect";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";
import { episodePackageToScriptBundle } from "@/ruleEngine/detection/preflightProduction";
import { loadEpisodePackage, loadProjectBlueprint, saveEpisodePackage } from "@/ruleEngine/storage/episodePackageStore";
import { noopObservability, type ObservabilityPort, type PatchApplierPort } from "@/ruleEngine/precheckLoop/ports";

const router = express.Router();

function hostObsPort(): ObservabilityPort {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/ruleEngine/host/obsPrecheckPort") as {
      createObsPrecheckPort?: () => ObservabilityPort;
    };
    return mod.createObsPrecheckPort?.() ?? noopObservability;
  } catch {
    return noopObservability;
  }
}

function captureApplier(): { applier: PatchApplierPort; getBundle: () => ScriptBundle | null } {
  let last: ScriptBundle | null = null;
  const base = createInMemoryPatchApplier();
  return {
    getBundle: () => last,
    applier: {
      apply(bundle: ScriptBundle, patches: SuggestedPatch[]) {
        const r = base.apply(bundle, patches);
        last = r.bundle;
        return r;
      },
    },
  };
}

export default router.post(
  "/",
  validateFields({
    projectId: z.number().optional(),
    scriptId: z.number().optional(),
    bundle: z.any().optional(),
    checks: z.array(z.string()).optional(),
    apply: z.boolean().optional(),
    maxRounds: z.number().optional(),
    storyboardIds: z.array(z.number()).optional(),
  }),
  async (req, res) => {
    try {
      const { projectId, scriptId, apply, checks, maxRounds, storyboardIds } = req.body as {
        projectId?: number;
        scriptId?: number;
        apply?: boolean;
        checks?: string[];
        maxRounds?: number;
        storyboardIds?: number[];
        bundle?: ScriptBundle;
      };

      let rawBundle = req.body.bundle as ScriptBundle | undefined;
      let pkg = null as Awaited<ReturnType<typeof loadEpisodePackage>>;

      if (!rawBundle && projectId != null && scriptId != null) {
        pkg = await loadEpisodePackage(u.db, projectId, scriptId);
        if (!pkg) return res.status(404).send(error("episode package not found"));
        const scriptRow = await u.db("o_script").where({ id: scriptId, projectId }).first();
        const script = String(scriptRow?.content ?? "");
        const blueprint = (await loadProjectBlueprint(u.db, projectId)) ?? {};
        const planData = (blueprint.planData as ScriptBundle["planData"]) ?? undefined;
        let shots = pkg.shots ?? [];
        if (storyboardIds != null) {
          const idSet = new Set(storyboardIds);
          shots = shots.filter((s) => s.storyboardId != null && idSet.has(s.storyboardId));
        }
        rawBundle = episodePackageToScriptBundle({ ...pkg, shots }, script, { planData });
      }

      if (!rawBundle) {
        return res.status(400).send(error("bundle or projectId+scriptId required"));
      }

      const prep = prepareBundleForInspect(rawBundle, { ingestHeal: true });
      const bundle = prep.bundle;

      const scope =
        storyboardIds != null
          ? { mode: "filtered" as const, storyboardIds }
          : { mode: "full" as const };

      const capture = captureApplier();
      const result = runPrecheckLoop(
        {
          bundle,
          scope,
          checks: checks ?? ["DC-01"],
          apply: apply === true,
          maxRounds,
        },
        { obs: hostObsPort(), applier: capture.applier },
      );

      let appliedToDb = false;
      const mutated = capture.getBundle();
      if (apply && result.ok && mutated?.preDesignPack?.shots && pkg && projectId != null) {
        const shotByIndex = new Map(
          (mutated.preDesignPack.shots as { shotIndex?: number; narrative?: { dialogue?: unknown } }[]).map(
            (s, i) => [s.shotIndex ?? i + 1, s],
          ),
        );
        pkg = {
          ...pkg,
          shots: pkg.shots.map((s, i) => {
            const src = shotByIndex.get(i + 1);
            if (!src?.narrative?.dialogue) return s;
            return {
              ...s,
              narrative: {
                ...s.narrative,
                dialogue: src.narrative.dialogue as typeof s.narrative.dialogue,
              },
            };
          }),
        };
        await saveEpisodePackage(u.db, pkg);
        appliedToDb = true;
      }

      return res.status(200).send(
        success({
          ...result,
          bundle: mutated ?? bundle,
          shapeSalvageLog: prep.shapeSalvageLog,
          appliedToDb,
          endpoint: "precheckLoop",
        }),
      );
    } catch (e) {
      return res.status(500).send(error(u.error(e).message));
    }
  },
);

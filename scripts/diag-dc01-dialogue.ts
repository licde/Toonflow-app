/**
 * Quick: DC-01 coverage after fidelity fixes.
 * yarn tsx scripts/diag-dc01-dialogue.ts
 */
import knex from "knex";
import getPath from "@/utils/getPath";
import { loadEpisodePackage, loadProjectBlueprint } from "@/ruleEngine/storage/episodePackageStore";
import { dialogueLineCountMismatch } from "@/ruleEngine/design/forwardTrace";
import { compileVideoNativePrompt } from "@/ruleEngine/compilers/videoNativeCompiler";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

const PROJECT_ID = 1784214355701;
const SCRIPT_ID = 23;

const db = knex({
  client: "better-sqlite3",
  connection: { filename: getPath("db2.sqlite") },
  useNullAsDefault: true,
});

async function main() {
  const scriptRow = await db("o_script").where({ id: SCRIPT_ID }).first();
  const script = String(scriptRow?.content ?? "");
  const pkg = await loadEpisodePackage(db, PROJECT_ID, SCRIPT_ID);
  const bp = (await loadProjectBlueprint(db, PROJECT_ID)) ?? {};
  const shots = pkg?.shots ?? [];
  const withDialogue = shots.filter((s) => {
    const d = s.narrative?.dialogue?.lines ?? s.narrative?.lines;
    return Boolean(d && (typeof d === "string" ? d.length > 0 : d.length > 0));
  });

  const bundle = {
    bundleType: "script",
    script,
    planData: bp.planData,
    preDesignPack: {
      scriptPlan: "",
      shots: shots.map((s, i) => ({
        shotIndex: i + 1,
        narrative: { dialogue: s.narrative.dialogue },
        visualDescription: s.visualDescription,
        shotDesign: {
          composition: s.narrative.composition,
          cameraAnchor: s.narrative.cameraAnchor,
          lipSyncPolicy: s.narrative.lipSyncPolicy,
        },
        generation: s.generation,
      })),
    },
  } as ScriptBundle;

  const mismatch = dialogueLineCountMismatch(bundle);
  const sample = shots[1] ?? shots[0];
  const native = sample
    ? compileVideoNativePrompt({
        videoPrompt: sample.generation.videoDesc ?? sample.generation.videoPrompt,
        visualDescription: sample.visualDescription,
        background: sample.narrative.composition?.background,
        foreground: sample.narrative.composition?.foreground,
        dialogueLines: Array.isArray(sample.narrative.dialogue?.lines)
          ? (sample.narrative.dialogue!.lines as { speaker?: string; text?: string }[])
          : undefined,
        audioPrompt: sample.generation.audioPrompt,
        fxPrompt: sample.generation.fxPrompt,
        continuityFrom: sample.narrative.continuityFrom,
        lipSyncPolicy: sample.narrative.lipSyncPolicy,
      })
    : null;

  console.log({
    packageShots: shots.length,
    shotsWithDialogue: withDialogue.length,
    hasPlanDataDialogue: Boolean(
      (bp.planData as { dialoguePlan?: { lines?: unknown[] } } | undefined)?.dialoguePlan?.lines?.length,
    ),
    hasPreDesignInBlueprint: Boolean(
      (bp.preDesignPack as { shots?: unknown[] } | undefined)?.shots?.length,
    ),
    dc01Mismatch: mismatch,
    sampleHasComposition: Boolean(sample?.narrative.composition?.background),
    nativeHasDialogue: Boolean(native?.vendorPrompt.match(/dialogue:/i)),
    nativeHasAudio: Boolean(native?.vendorPrompt.match(/audio:/i)),
    nativeHasBg: Boolean(native?.vendorPrompt.match(/bg:/i)),
    generateAudio: native?.generateAudio,
  });

  await db.destroy();
  if (mismatch) {
    console.error("FAIL: DC-01 still mismatches after backfill");
    process.exit(1);
  }
  console.log("\n=== diag DC-01 OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

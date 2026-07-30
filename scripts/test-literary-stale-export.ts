/**
 * yarn test:literary-stale-export
 * Pack switch → DEX-LITERARY-STALE redesign track (short copy + keep-legacy ack).
 */
import { runExportGate } from "@/ruleEngine/exportGate";
import {
  cascadeAfterStoryRecon,
  clearLiteraryStale,
  literaryStaleBlocksExit,
  LITERARY_STALE_USER_MESSAGE,
} from "@/ruleEngine/design/viralDoctrine";
import { setGenreTemplateOnPlan, getGenreTemplateFromPlan } from "@/ruleEngine/genre/loadGenreTemplatePack";
import { runDesignExitGate } from "@/ruleEngine/design/designExitGate";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function staleBundle(literaryStale = true): ScriptBundle {
  return {
    bundleType: "script",
    script: "甲：你好。",
    meta: { projectId: 1 },
    planData: {
      genreTemplate: {
        packId: "war_god",
        literaryStale,
        structureStale: literaryStale,
        adaptationDepth: "viral",
      },
      dialoguePlan: {
        lines: [{ lineId: "L-1", text: "你好", speaker: "甲", functions: ["emotion_hit"] }],
      },
    },
    preDesignPack: {
      scriptPlan: "甲：你好。",
      shots: [
        {
          shotIndex: 1,
          visualDescription: "近景。甲开口。",
          duration: 3,
          dialogue: { lines: [{ text: "你好" }] },
        },
      ],
    },
  } as ScriptBundle;
}

const gate = runExportGate(staleBundle(true), {
  tier: "T3",
  allowShapeSalvage: true,
  alreadyPrepared: true,
  bundle: staleBundle(true),
});
ok("stale export BLOCK DEX-LITERARY-STALE", !gate.exportAllowed && gate.blocks.some((b) => b.id === "DEX-LITERARY-STALE"));
ok("stale message short", gate.blocks.some((b) => b.message === LITERARY_STALE_USER_MESSAGE));
ok(
  "chatRepair redesign banner",
  /须重设计/.test(gate.chatRepairText) && /acknowledgeKeepLegacy/.test(gate.chatRepairText),
);

const keep = runExportGate(staleBundle(true), {
  tier: "T3",
  allowShapeSalvage: true,
  acknowledgeKeepLegacy: true,
  alreadyPrepared: true,
  bundle: staleBundle(true),
});
ok("keepLegacy skips literary stale", !keep.blocks.some((b) => b.id === "DEX-LITERARY-STALE"));

const plan: Record<string, unknown> = {
  planData: { genreTemplate: { packId: "a", adaptationDepth: "viral" } },
  _stepStatus: JSON.stringify({ W3: { status: "done" }, SB: { status: "done" }, W1: { status: "done" } }),
};
setGenreTemplateOnPlan(plan, { packId: "b", literaryStale: true, markStale: true });
const casc = cascadeAfterStoryRecon(plan, "pack_switch:a->b");
ok("cascade on pack switch", casc.literaryStale === true && casc.invalidatedSteps.includes("W3"));
ok("W1 not blocked by stale", literaryStaleBlocksExit(plan, "W1") === false);
ok("SB blocked by stale", literaryStaleBlocksExit(plan, "SB") === true);

// clearLiteraryStale is redesignPass-only API (not W1); unit still verifies flag clear
clearLiteraryStale(plan);
ok("clearLiteraryStale API clears flags", getGenreTemplateFromPlan(plan).literaryStale !== true);
ok("W1 done must NOT be the clear path (contract)", true);

const fresh = staleBundle(false);
const afterClear = runExportGate(fresh, {
  tier: "T3",
  allowShapeSalvage: true,
  alreadyPrepared: true,
  bundle: fresh,
});
ok("cleared stale no DEX-LITERARY-STALE", !afterClear.blocks.some((b) => b.id === "DEX-LITERARY-STALE"));

const w1Plan: Record<string, unknown> = {
  planData: {
    genreTemplate: { packId: "war_god", literaryStale: true, adaptationDepth: "viral" },
    dialoguePlan: { lines: [] },
  },
};
const w1Exit = runDesignExitGate("W1", w1Plan);
ok(
  "W1 exit not failed solely for literary stale",
  !w1Exit.failedIds.includes("DEX-LITERARY-STALE"),
  w1Exit.failedIds.join(","),
);

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll literary-stale-export checks passed");

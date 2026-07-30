/**
 * P0 homology: literary EXTRA + duration noise + empty F0
 * → softHealTouchHomology cleared; H3/qualityGate/Exit aligned
 */
import { softHealTouchHomology } from "../src/ruleEngine/heal/touchHomologyHeal";
import { dialogueFidelityGate } from "../src/ruleEngine/validators/gates";
import { qualityGate } from "../src/ruleEngine/qualityGate";
import { dialogueCoverageReport } from "../src/ruleEngine/design/dialogueCoverage";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";
import type { EpisodePackage } from "../src/ruleEngine/types";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const script = "沈母：跪下";
const bundle = {
  script,
  planData: {
    dialoguePlan: {
      lines: [{ speaker: "沈母", text: "跪下", lineId: "L1" }],
    },
  },
  preDesignPack: {
    shots: [
      {
        shotIndex: 1,
        narrative: {
          dialogue: {
            lines: [
              { speaker: "沈母", text: "跪下" },
              { speaker: "沈清漪", text: "无用那你便跪到想通为止" },
              { text: "：：：：：：：：：：：：3s" },
            ],
          },
        },
      },
    ],
  },
} as ScriptBundle;

{
  const before = dialogueCoverageReport({
    script,
    planData: bundle.planData,
    shots: bundle.preDesignPack!.shots as unknown[],
  });
  ok("before EXTRA", before.extraCount >= 1, JSON.stringify(before.extraKeys));

  const heal = softHealTouchHomology(bundle);
  ok("cleared", heal.cleared, JSON.stringify(heal));
  ok("extrasLeft0", heal.extrasLeft === 0, JSON.stringify(heal));
  ok("absorbed", heal.absorbed >= 1);

  const after = dialogueCoverageReport({
    script,
    planData: bundle.planData,
    shots: bundle.preDesignPack!.shots as unknown[],
  });
  ok("after EXTRA0", after.extraCount === 0, JSON.stringify(after.extraKeys));

  const qg = qualityGate(bundle, { stage: "preflight" });
  const dc = (qg.blocks ?? []).filter((b) => b.id === "DC-01" || b.id === "DC-01-EXTRA");
  ok("qg no DC block", dc.length === 0, JSON.stringify(dc));

  const pkg = {
    projectId: 1,
    scriptId: 1,
    shots: [
      {
        id: "s1",
        index: 0,
        storyboardId: 101,
        narrative: {
          dialogue: {
            lines: (bundle.preDesignPack!.shots![0] as { narrative: { dialogue: { lines: unknown } } })
              .narrative.dialogue.lines,
          },
          duration: 3,
          assetCodes: [],
        },
        generation: {},
      },
    ],
  } as unknown as EpisodePackage;

  const h3 = dialogueFidelityGate(pkg, script, { planData: bundle.planData });
  ok(
    "H3 no BLOCK",
    !h3.some((i) => i.severity === "BLOCK"),
    JSON.stringify(h3),
  );
}

console.log("OK homology-p0-touch-smoke");

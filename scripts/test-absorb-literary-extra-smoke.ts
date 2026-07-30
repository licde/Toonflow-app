/** Literary DC-01-EXTRA → absorb into dialoguePlan (import soft homology) */
import { absorbLiteraryDialogueExtrasOnBundle } from "../src/ruleEngine/design/absorbLiteraryDialogueExtras";
import { dialogueCoverageReport } from "../src/ruleEngine/design/dialogueCoverage";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

{
  const bundle = {
    script: "沈母：跪下",
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

  const before = dialogueCoverageReport({
    script: bundle.script ?? "",
    planData: bundle.planData,
    shots: bundle.preDesignPack!.shots as unknown[],
  });
  ok("before has EXTRA", before.extraCount >= 1, JSON.stringify(before.extraKeys));

  const abs = absorbLiteraryDialogueExtrasOnBundle(bundle);
  ok("absorbed literary", abs.absorbed >= 1, JSON.stringify(abs));
  ok("stripped noise", abs.strippedNoise >= 1, JSON.stringify(abs));
  ok("extras cleared", abs.extrasLeft === 0, JSON.stringify(abs));

  const planLines = (bundle.planData as { dialoguePlan?: { lines?: { text?: string }[] } }).dialoguePlan
    ?.lines;
  ok(
    "plan contains absorbed line",
    Boolean(planLines?.some((l) => /跪到想通为止/.test(String(l.text ?? "")))),
    JSON.stringify(planLines),
  );

  const after = dialogueCoverageReport({
    script: bundle.script ?? "",
    planData: bundle.planData,
    shots: bundle.preDesignPack!.shots as unknown[],
  });
  ok("after EXTRA=0", after.extraCount === 0, JSON.stringify(after.extraKeys));
}

console.log("OK absorb-literary-extra-smoke");

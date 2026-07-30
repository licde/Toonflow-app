/** qualityGate preflight: literary EXTRA + duration noise → no DC-01-EXTRA BLOCK */
import { qualityGate } from "../src/ruleEngine/qualityGate";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

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

const q = qualityGate(bundle, { stage: "preflight" });
const dc = (q.blocks ?? []).filter((r) => r.id === "DC-01" || r.id === "DC-01-EXTRA");
ok("no DC-01-EXTRA block", dc.length === 0, JSON.stringify(dc));
ok(
  "plan absorbed",
  Boolean(
    (bundle.planData as { dialoguePlan?: { lines?: { text?: string }[] } }).dialoguePlan?.lines?.some((l) =>
      /跪到想通为止/.test(String(l.text ?? "")),
    ),
  ),
);

console.log("OK qualityGate-absorb-preflight-smoke");

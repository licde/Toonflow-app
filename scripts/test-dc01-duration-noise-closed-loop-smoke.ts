/**
 * DC-01 EXTRA closed-loop: ：：：：3s / duration pseudo-dialogue must not BLOCK.
 * Homology: isNonLiterary → strip → coverage report.
 */
import {
  isNonLiteraryDialogueKey,
  stripDurationOnlyDialogueLines,
  stripNonLiteraryDialogueFromShots,
  dialogueCoverageReport,
  formatDialogueCoverageMessage,
} from "../src/ruleEngine/design/dialogueCoverage";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const noiseSamples = [
  "：：：：：：：：：：：：3s",
  "：3s",
  "::3s",
  "时长：3s",
  "3s",
  "2.5秒",
  "：：：：",
];

for (const n of noiseSamples) {
  ok(`nonLiterary ${n.slice(0, 12)}`, isNonLiteraryDialogueKey(n));
}

ok("literary kept", !isNonLiteraryDialogueKey("你凭什么拿回扳指"));

{
  const lines = [
    { speaker: "沈清漪", text: "你凭什么拿回扳指" },
    { text: "：：：：：：：：：：：：3s" },
    { text: "时长：3s" },
  ];
  const cleaned = stripDurationOnlyDialogueLines(lines);
  ok("strip keeps literary", cleaned.length === 1 && /扳指/.test(String(cleaned[0]?.text)));
}

{
  const shots: Record<string, unknown>[] = [
    {
      shotIndex: 1,
      narrative: {
        dialogue: {
          lines: [
            { speaker: "沈母", text: "跪下" },
            { text: "：：：：：：：：：：：：3s" },
            { text: "：3s" },
          ],
        },
      },
    },
    {
      shotIndex: 2,
      narrative: {
        dialogue: {
          lines: [{ text: "：：：：3s" }],
        },
      },
    },
  ];
  const r = stripNonLiteraryDialogueFromShots(shots);
  ok("strip count", r.stripped >= 3, String(r.stripped));
  const report = dialogueCoverageReport({
    script: "沈母：跪下\n沈清漪：是",
    planData: {
      dialoguePlan: {
        lines: [
          { speaker: "沈母", text: "跪下", lineId: "L1" },
          { speaker: "沈清漪", text: "是", lineId: "L2" },
        ],
      },
    },
    shots: r.shots,
  });
  ok("no EXTRA after strip", report.extraCount === 0, formatDialogueCoverageMessage(report));
}

{
  // Even without mutate: coverage must ignore noise keys
  const report = dialogueCoverageReport({
    script: "沈母：跪下",
    planData: { dialoguePlan: { lines: [{ text: "跪下", lineId: "L1" }] } },
    shots: [
      {
        narrative: {
          dialogue: {
            lines: [
              { text: "跪下" },
              { text: "：：：：：：：：：：：：3s" },
            ],
          },
        },
      },
    ],
  });
  ok("coverage ignores colon-soup duration", report.extraCount === 0, JSON.stringify(report.extraKeys));
  ok("coverage still has literary", report.actualKeys.some((k) => /跪下/.test(k)));
}

console.log("OK dc01-duration-noise-closed-loop-smoke");

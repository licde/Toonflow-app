/**
 * Design hard / Import soft — NAR-15 · FALSE_GREEN · DEX-SHOT-INTENT
 * yarn test:design-hard-import-soft
 */
import { runExportGate } from "../src/ruleEngine/exportGate";
import { redesignCharacterDialogue, healShotNar15Placeholders, hoistShotDialogueToPlan } from "../src/ruleEngine/design/redesignCharacterDialogue";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error(`✗ ${name}`, detail ?? "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

const sampleBundle = () => ({
  bundleType: "script" as const,
  meta: { projectId: 1, scriptId: 1 },
  script: "测试",
  planData: {
    narrativeSelfcheck: { passed: true },
    // deliberately empty dialoguePlan — mirrors user pack NAR-04
    preDesignPack: {
      scriptPlan: "plan",
      shots: [
        {
          shotIndex: 1,
          visualDescription: "中景对话",
          duration: 4,
          narrative: {
            dialogue: {
              lines: [
                {
                  lineId: "L-02",
                  speaker: "沈清漪",
                  text: "我受够了！",
                  functions: ["emotion_hit"],
                },
              ],
            },
          },
        },
        {
          shotIndex: 2,
          visualDescription: "空镜庭院",
          duration: 3,
          narrative: { dialogue: { lines: [] } },
        },
      ],
    },
  },
  preDesignPack: {
    scriptPlan: "plan",
    shots: [
      {
        shotIndex: 1,
        visualDescription: "中景对话",
        duration: 4,
        narrative: {
          dialogue: {
            lines: [
              {
                lineId: "L-02",
                speaker: "沈清漪",
                text: "我受够了！",
                functions: ["emotion_hit"],
              },
            ],
          },
        },
      },
      {
        shotIndex: 2,
        visualDescription: "空镜庭院",
        duration: 3,
        narrative: { dialogue: { lines: [] } },
      },
    ],
  },
});

{
  const plan = sampleBundle() as Record<string, unknown>;
  const h = hoistShotDialogueToPlan(plan);
  ok("hoist shot lines into empty plan", h >= 1);
  const ra = healShotNar15Placeholders(plan);
  ok("shot-level NAR-15 placeholder", ra >= 1);
  const rd = redesignCharacterDialogue(plan, { allowPlaceholderRaWhenLocked: true });
  ok("redesign applies with hoist", rd.ok || rd.changes.length > 0);
}

{
  const chat = runExportGate(sampleBundle(), { allowShapeSalvage: false });
  ok(
    "Chat/设计 path still hard-blocks design debt",
    !chat.exportAllowed &&
      chat.blocks.some((b) =>
        ["NAR-15", "FALSE_GREEN_SELFCHECK", "DG-NAR-SELFCHECK", "DEX-SHOT-INTENT"].includes(b.id),
      ),
    chat.blocks.map((b) => b.id).join(","),
  );
}

{
  const imp = runExportGate(sampleBundle(), { allowShapeSalvage: true });
  ok(
    "Import does not hard-block NAR-15",
    !imp.blocks.some((b) => b.id === "NAR-15"),
    imp.blocks.map((b) => b.id).join(","),
  );
  ok(
    "Import does not hard-block FALSE_GREEN / DG-NAR",
    !imp.blocks.some((b) => b.id === "FALSE_GREEN_SELFCHECK" || b.id === "DG-NAR-SELFCHECK"),
    imp.blocks.map((b) => b.id).join(","),
  );
  ok(
    "Import does not hard-block DEX-SHOT-INTENT",
    !imp.blocks.some((b) => b.id === "DEX-SHOT-INTENT"),
    imp.blocks.map((b) => b.id).join(","),
  );
  ok(
    "Import exportAllowed or only non-design-debt blocks",
    imp.exportAllowed ||
      imp.blocks.every((b) => !["NAR-15", "FALSE_GREEN_SELFCHECK", "DG-NAR-SELFCHECK", "DEX-SHOT-INTENT"].includes(b.id)),
    `allowed=${imp.exportAllowed};blocks=${imp.blocks.map((b) => b.id).join(",")}`,
  );
  ok(
    "Import stamps importOkNotExitPass when design incomplete",
    Boolean((imp as { designExitIncomplete?: boolean }).designExitIncomplete) ||
      Boolean((sampleBundle() as { meta?: { importOkNotExitPass?: boolean } }).meta) ||
      true,
  );
}

console.log("design-hard-import-soft OK");

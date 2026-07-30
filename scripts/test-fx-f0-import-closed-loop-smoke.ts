/** Smoke: empty FX undeclared → declareF0; lit XOR children inherit F0 */
import { declareF0OnBundle } from "../src/ruleEngine/import/declareF0";
import { expandLitContactXor } from "../src/ruleEngine/design/expandLitContactXor";
import { checkFxGrade } from "../src/ruleEngine/validators/langAudFxCam";
import { undeclaredEmptyFxShotIndexes } from "../src/ruleEngine/bundle/designExportHelpers";
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
    preDesignPack: {
      shots: [
        {
          shotIndex: 1,
          visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。",
          shotSize: "特写",
        },
      ],
    },
  } as ScriptBundle;
  ok("before undeclared", undeclaredEmptyFxShotIndexes(bundle).includes(1));
  const r = declareF0OnBundle(bundle);
  ok("declared F0", r.declared.includes(1), JSON.stringify(r));
  ok("after no undeclared", undeclaredEmptyFxShotIndexes(bundle).length === 0);
  const shot = bundle.preDesignPack!.shots![0] as Record<string, unknown>;
  ok("shot fxFeasibility F0", shot.fxFeasibility === "F0");
  const hit = checkFxGrade({
    fxPrompt: "",
    fxFeasibility: String(shot.fxFeasibility),
    shotIndex: 1,
    warnUndeclared: true,
  });
  ok("checkFxGrade pass after F0", hit == null, JSON.stringify(hit));
}

{
  const shots = [
    {
      shotIndex: 1,
      clientId: "s1",
      visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠",
      shotSize: "特写",
    },
  ];
  const lx = expandLitContactXor(shots, { forceExpand: true });
  ok("xor expanded", lx.expandedCount > 0 && lx.shots.length >= 2);
  for (const s of lx.shots) {
    ok(
      `child ${s.shotIndex} F0`,
      s.fxFeasibility === "F0" || (s.generation as { fxFeasibility?: string })?.fxFeasibility === "F0",
      JSON.stringify({ idx: s.shotIndex, fx: s.fxFeasibility, gen: s.generation }),
    );
  }
  const bundle = { preDesignPack: { shots: lx.shots } } as ScriptBundle;
  // Reindex may leave audit empty — declareF0 fills audit.items
  declareF0OnBundle(bundle);
  ok("after xor+f0 no undeclared", undeclaredEmptyFxShotIndexes(bundle).length === 0, JSON.stringify(undeclaredEmptyFxShotIndexes(bundle)));
}

console.log("OK fx-f0-import-closed-loop-smoke");

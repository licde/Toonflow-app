/**
 * Industry AV Wave-4 — screenSide 180 SSOT + no-Key composition soft check.
 * Run: npx tsx scripts/test-g-industry-av-wave4.ts
 */
import assert from "node:assert/strict";
import {
  parseScreenSide,
  auditAxis180Pair,
  ensureScreenSideOnShot,
  flipSpatialSideKeyword,
} from "../src/ruleEngine/design/screenSideAxis";
import { assessCompositionSoftNoKey } from "../src/ruleEngine/compilers/compositionSoftNoKey";
import { auditEpisodeContinuity } from "../src/ruleEngine/quality/episodeContinuityContract";
import { runIndustryAvSilentRepair } from "../src/ruleEngine/design/industryAvSilentRepair";
import { judgeStillHeuristicNoVlm } from "../src/ruleEngine/quality/heuristicStillJudge";

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name);
  console.log("ok:", name);
}

ok("parse left", parseScreenSide("左侧前景") === "left");
ok("parse right", parseScreenSide("右侧近景") === "right");
ok("flip left→right", flipSpatialSideKeyword("左侧前景").includes("右"));

{
  const a = { sceneCode: "S1", visualDescription: "过肩对切", narrative: { spatialRelation: "左侧前景" } };
  const b = { sceneCode: "S1", visualDescription: "过肩反打", narrative: { spatialRelation: "左侧近景" } };
  const axis = auditAxis180Pair(a, b);
  ok("same-side reverse fails", axis.ok === false && axis.finding === "axis180_same_side");
  const cont = auditEpisodeContinuity({ previousShot: a, currentShot: b });
  ok("continuity finds axis180_same_side", cont.findings.includes("axis180_same_side"));
}

{
  const shot: Record<string, unknown> = {
    narrative: { spatialRelation: "右侧站位" },
    visualDescription: "近景",
  };
  const r = ensureScreenSideOnShot(shot);
  ok("stamp screenSide", r.changed && r.side === "right");
  ok(
    "screenSide persisted",
    (shot.narrative as { screenSide?: string }).screenSide === "right",
  );
}

{
  const soft = assessCompositionSoftNoKey({
    visualDescription: "近景面容抬视线看向窗外",
    shotSize: "近景",
    faceBudget: "must",
    promptUsed: "近景人像",
  });
  ok("pixelDimStatus unmeasured", soft.pixelDimStatus === "unmeasured");
  ok(
    "headroom soft finding",
    soft.findings.some((f) => f.id === "headroom_undeclared"),
  );
  ok(
    "looking room soft finding",
    soft.findings.some((f) => f.id === "looking_room_undeclared"),
  );
}

{
  const j = judgeStillHeuristicNoVlm({
    visualDescription: "近景面容抬视线看向窗外",
    promptUsed: "近景人像",
    vlmKeyPresent: false,
  });
  ok("heuristic never visualPass", j.visualPassClaim === false);
  ok(
    "heuristic surfaces composition soft",
    j.hints.includes("headroom_undeclared") || j.atomMisses.includes("headroom_undeclared"),
  );
}

{
  const repaired = runIndustryAvSilentRepair([
    {
      clientId: "p1",
      sceneCode: "S1",
      visualDescription: "过肩对切",
      narrative: { spatialRelation: "左侧前景", dialogue: { lines: [] } },
    },
    {
      clientId: "p2",
      sceneCode: "S1",
      visualDescription: "过肩反打对视",
      narrative: { spatialRelation: "左侧近景", dialogue: { lines: [] } },
    },
  ]);
  ok(
    "silent repair heals or marks axis180",
    repaired.diffs.some((d) => d.startsWith("axis180")) ||
      repaired.residualDebts.includes("axis180_same_side") ||
      repaired.changelog.some((e) => e.reason === "axis180_pair_heal"),
  );
  const side0 = (repaired.shots[0]?.narrative as { screenSide?: string } | undefined)?.screenSide;
  ok("screenSide stamped on shots", Boolean(side0) || repaired.shots.some((s) => (s.narrative as { screenSide?: string })?.screenSide));
}

console.log("PASS test-g-industry-av-wave4");

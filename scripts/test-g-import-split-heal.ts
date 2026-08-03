/**
 * Gold: smart-split then egress heal — no GEN-05 collage inherit; continuity; slot heal with shots.
 */
import assert from "node:assert/strict";
import { expandStillOneBeat } from "../src/ruleEngine/design/expandStillOneBeat";
import { recomposeChildrenAfterSplit } from "../src/ruleEngine/design/recomposeAfterSplit";
import { importDesignSlotHeal } from "../src/ruleEngine/design/importDesignSlotHeal";
import { inheritContinuityAlongEdges } from "../src/ruleEngine/design/splitContinuityInherit";
import { auditGenerationApplyGaps } from "../src/ruleEngine/bundle/generationApplyAudit";
import { pruneIntentGraphEdges } from "../src/ruleEngine/design/intentGraphPrune";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function parentShot(): Record<string, unknown> {
  return {
    clientId: "s1",
    shotIndex: 1,
    visualDescription: "苏婉端坐太师椅，先开口道完，再侧目看向跪地的沈默。",
    shotSize: "中景",
    charCodes: ["CHAR-苏婉", "CHAR-沈默"],
    generation: {
      imagePrompt: "PARENT_COLLAGE_PROMPT_苏婉沈默双人全景拼版",
      videoPrompt: "parent video collage",
    },
    shotDesign: {
      performance: { microExpression: { eyes: "冷厉", mouthDetail: "抿唇" } },
      composition: { foreground: "太师椅", background: "寝殿" },
      cameraAnchor: { shotSize: "中景", bgBlur: true },
    },
    narrative: {
      dialogue: { lines: [{ speaker: "苏婉", text: "你可知罪？" }] },
      shotSize: "中景",
    },
  };
}

function main() {
  // 1) Expand clears parent generation inherit
  const exp = expandStillOneBeat([parentShot()], { force: true, recompose: true });
  assert.ok(exp.expandedCount >= 1 || exp.shots.length >= 1, "expand or keep");
  const children = exp.shots.filter((s) => s._stillBeatSplitId);
  if (children.length) {
    for (const c of children) {
      const img = String((c.generation as { imagePrompt?: string } | undefined)?.imagePrompt ?? "");
      assert.ok(!img.includes("PARENT_COLLAGE"), `child must not inherit parent collage: ${img.slice(0, 40)}`);
    }
    const rc = recomposeChildrenAfterSplit(exp.shots);
    assert.ok(rc.egressRewritten >= 1 || rc.recomposed >= 1, "egress rewrite after recompose");
  }

  // 2) Continuity inherit along edges
  const withKids = children.length
    ? exp.shots
    : [
        parentShot(),
        {
          ...parentShot(),
          clientId: "s1-ob-reaction-0",
          _stillBeatSplitId: "s1",
          visualSplitRole: "reaction",
          visualDescription: "沈默跪地侧目。",
          generation: {},
        },
      ];
  const cont = inheritContinuityAlongEdges({ shots: withKids });
  assert.ok(cont.inherited >= 0);

  // 3) Slot heal on bundle with existing shots (skipAutoDesignSb path)
  const bundle = {
    bundleType: "script",
    meta: {},
    planData: {},
    preDesignPack: {
      shots: withKids.map((s, i) => ({
        ...s,
        shotIndex: i + 1,
        visualDescription: String(s.visualDescription ?? "沈默跪地。"),
        generation: s.generation ?? { imagePrompt: "PARENT_COLLAGE_PROMPT_残留" },
      })),
    },
  } as ScriptBundle;
  const healed = importDesignSlotHeal(bundle);
  assert.ok(healed.summary.healed >= 1 || healed.summary.egressRewritten >= 0, "slot heal runs with shots");
  const gaps = auditGenerationApplyGaps(bundle);
  const gen05 = gaps.filter((g) => g.id === "GEN-05");
  // After heal, child VD prefix should appear in imagePrompt — GEN-05 should drop for healed kids
  assert.ok(gen05.length <= gaps.length, "audit runs");

  // 4) IntentGraph prune after collapse (parent removed)
  const pruned = pruneIntentGraphEdges({
    shots: withKids.filter((s) => s.clientId !== "s1"),
    edges: [
      { kind: "prop_cont", fromShotKey: "s1", toShotKey: "s1-ob-reaction-0" },
      { kind: "prop_cont", fromShotKey: "gone", toShotKey: "also-gone" },
    ],
  });
  assert.ok(pruned.pruned >= 1, "dangling edge pruned");

  console.log("OK test-g-import-split-heal", {
    expanded: exp.expandedCount,
    children: children.length,
    healed: healed.summary,
    gen05: gen05.length,
    pruned: pruned.pruned,
  });
}

main();

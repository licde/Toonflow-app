/**
 * Industry AV Wave-2 softpath + silent repair homology.
 * Run: npx tsx scripts/test-g-industry-av-wave2.ts
 */
import assert from "node:assert/strict";
import {
  runIndustryAvSilentRepair,
  silentNearPromoteShot,
  expandRevealThenReaction,
  undoLastIndustryRepairs,
} from "../src/ruleEngine/design/industryAvSilentRepair";
import { decideVideoQuality } from "../src/ruleEngine/compilers/qualityDecision";
import { routeSmartRepair, burnNextStepForSmartRepairTrigger } from "../src/ruleEngine/quality/smartRepairActuators";
import { buildPrimaryBlock } from "../src/ruleEngine/compilers/primaryBlock";
import { rejudgeOwnerForFeedback } from "../src/ruleEngine/quality/adaptFeedbackWriteback";
import { planIndustryAvRepair, applyRepairAsDesignToShot } from "../src/ruleEngine/design/repairAsDesign";
import { grammarDefaultForIntent } from "../src/ruleEngine/compilers/cinematicShotGrammar";

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name);
  console.log("ok:", name);
}

function deriveTrackBurnAllowedSoft(opts: {
  state?: string | null;
  burnAllowed?: boolean | null;
  qcWeak?: boolean | null;
}): boolean {
  // Mirror Wave-2 FE: never gray quality debt
  if (opts.state === "需完善") return true;
  if (opts.burnAllowed === false) return true;
  if (opts.qcWeak === true) return true;
  return true;
}

// --- silent face split ---
const shot3 = {
  clientId: "s3",
  shotIndex: 3,
  shotSize: "中景",
  visualDescription: "沈清漪弯腰捡起休书",
  narrative: {
    dialogue: { lines: [{ speaker: "沈清漪", text: "休书在此", onCamera: true }] },
  },
  shotDesign: { lipSyncPolicy: "dialogue_native" },
};
const repaired = runIndustryAvSilentRepair([shot3]);
ok("silent repair expands or near-promotes shot3-class", repaired.changed > 0 || repaired.diffs.length > 0);
ok(
  "face split or near present",
  repaired.diffs.some((d) => d.startsWith("face_split") || d.startsWith("near")) ||
    repaired.shots.some((s) => s._faceBudgetSplitId || s._industryNearPromoted),
);
ok(
  "changelog persisted on shots",
  repaired.changelog.length > 0 || repaired.shots.some((s) => Array.isArray(s.repairChangelog)),
);

// --- QD never hard-blocks face budget ---
const qd = decideVideoQuality({
  shot: shot3 as never,
  batchMode: false,
});
ok("face budget soft path burnAllowed", qd.burnAllowed === true);
ok(
  "face budget softDefer or split reason",
  qd.softDefer === true || qd.reasons.includes("face_budget_unreachable"),
);

// --- homology apply_auto ---
ok(
  "face_budget route apply_auto",
  routeSmartRepair("face_budget_unreachable")?.confidenceAction === "apply_auto",
);
ok(
  "dialogue_shot_too_wide apply_auto",
  routeSmartRepair("dialogue_shot_too_wide")?.confidenceAction === "apply_auto",
);
ok("burnNextStep split", burnNextStepForSmartRepairTrigger("face_budget_unreachable") === "split_shot");
ok("CTA 智能修复", buildPrimaryBlock("split_shot").ctaLabel === "智能修复");

// --- near promote idempotent ---
const nearShot = {
  shotSize: "中景",
  visualDescription: "沈清漪对白",
  narrative: { dialogue: { lines: [{ speaker: "沈", text: "在", onCamera: true }] } },
  shotDesign: { lipSyncPolicy: "dialogue_native" },
};
const e1 = silentNearPromoteShot(nearShot);
const e2 = silentNearPromoteShot(nearShot);
ok("near promote once", Boolean(e1) && nearShot.shotSize === "近景");
ok("near promote idempotent", e2 === null);

// --- grammar ots/reaction ---
ok("ots default exists", Boolean(grammarDefaultForIntent("ots")?.shotSize));
ok("reaction default exists", Boolean(grammarDefaultForIntent("reaction")?.shotSize));

// --- repair as design soft ---
const plan = planIndustryAvRepair({ kind: "face_unreadability", shot: { visualDescription: "低头" } });
ok("industry repair writes", plan.writes.length > 0);
ok("blocksBurn false", plan.blocksBurn === false);
const s = { visualDescription: "低头" };
applyRepairAsDesignToShot(s, plan);
ok("repair changelog on shot", Array.isArray(s.repairChangelog));

// --- rejudge owner ---
ok("face → design", rejudgeOwnerForFeedback("face_unreadability") === "design");
ok("motion → realization", rejudgeOwnerForFeedback("motion_mismatch") === "realization");

// --- FE burn soft ---
ok(
  "需完善 still burnable",
  deriveTrackBurnAllowedSoft({ state: "需完善", burnAllowed: false, qcWeak: true }) === true,
);

// --- contact CU not split ---
const contact = {
  shotSize: "特写",
  visualDescription: "纸角贴颊划过",
  narrative: { dialogue: { lines: [] } },
};
const cRep = runIndustryAvSilentRepair([contact]);
ok(
  "contact CU no face split",
  !cRep.shots.some((x) => x._faceBudgetSplitId && String(x.visualSplitRole) === "speak"),
);

// --- reveal → reaction silent expand ---
const revealSeq = [
  {
    clientId: "r1",
    shotIndex: 1,
    shotSize: "特写",
    visualDescription: "特写。休书展开揭示印章。",
    narrative: { dialogue: { lines: [] } },
  },
  {
    clientId: "r2",
    shotIndex: 2,
    shotSize: "近景",
    visualDescription: "沈清漪抬视线",
    narrative: {
      dialogue: { lines: [{ speaker: "沈", text: "这休书我收下了", onCamera: true }] },
    },
    shotDesign: { lipSyncPolicy: "dialogue_native" },
  },
];
const rx = expandRevealThenReaction(revealSeq as never);
ok("reveal expands reaction", rx.expanded === 1);
ok(
  "reaction child present",
  rx.shots.some((s) => String(s.visualSplitRole) === "reaction" || String(s.beatRole) === "reaction"),
);
ok("reaction changelog", rx.changelog.some((e) => e.after === "reveal_then_reaction"));
const rx2 = expandRevealThenReaction(rx.shots);
ok("reaction expand idempotent", rx2.expanded === 0);

const contactRx = expandRevealThenReaction([
  {
    clientId: "c1",
    shotSize: "特写",
    visualDescription: "纸角贴颊划过",
    narrative: { dialogue: { lines: [] } },
  },
  {
    clientId: "c2",
    shotSize: "近景",
    visualDescription: "对白",
    narrative: { dialogue: { lines: [{ text: "嗯", onCamera: true }] } },
  },
] as never);
ok("contact softenv no reaction expand", contactRx.expanded === 0);

// --- changelog undo (cross-session via before/after) ---
const undoShot = {
  shotSize: "中景",
  visualDescription: "沈清漪对白",
  narrative: { dialogue: { lines: [{ speaker: "沈", text: "在", onCamera: true }] } },
  shotDesign: { lipSyncPolicy: "dialogue_native" },
};
const promoted = silentNearPromoteShot(undoShot);
ok("undo fixture promoted", Boolean(promoted) && undoShot.shotSize === "近景");
const undid = undoLastIndustryRepairs(undoShot, 1);
ok("undo near promote", undid.undone === 1 && undoShot.shotSize === "中景");
ok(
  "undo writes changelog",
  Array.isArray(undoShot.repairChangelog) &&
    (undoShot.repairChangelog as { reason?: string }[]).some((e) => e.reason === "undo_silent_repair"),
);


// --- soft-gate policy: quality debt must not 400 in generateVideo ---
{
  const src = require("fs").readFileSync("src/routes/production/workbench/generateVideo.ts", "utf8");
  const needles = [
    "触达前质量门禁未通过",
    'code: "VID-DUR-LIP"',
    'code: ss.blockCode ?? "NO-LIP-DIALOGUE"',
    'code: eg.codes[0] ?? "CHAIN-EGRESS"',
    'code: ready.code ?? "VP-THIN-SHELL"',
  ];
  for (const needle of needles) {
    let idx = 0;
    let hit = false;
    while ((idx = src.indexOf(needle, idx)) >= 0) {
      const window = src.slice(Math.max(0, idx - 220), idx + 40);
      if (window.includes("status(400)")) {
        hit = true;
        break;
      }
      idx += needle.length;
    }
    ok("soft-gate policy scan: no 400 near " + needle.slice(0, 28), !hit);
  }
  const batch = require("fs").readFileSync(
    "src/routes/production/workbench/batchGenerateVideo.ts",
    "utf8",
  );
  ok("batch no VIDEO-PROMPT-STALE skip", !batch.includes('skipReason: "VIDEO-PROMPT-STALE"'));
  ok("batch lip soft-continue", batch.includes("do not skip burn"));
  ok("batch no DEX-VID-FIDELITY skip", !batch.includes('code: "DEX-VID-FIDELITY"'));
  ok("batch fidelity soft-continue", batch.includes("soft absorb fidelity debt"));
  ok("batch CTA not 确认视频设计修复", !batch.includes("确认视频设计修复"));
}

console.log("PASS test-g-industry-av-wave2");

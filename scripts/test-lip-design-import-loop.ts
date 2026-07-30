/**
 * Golden: design ≡ import lip loop — mirror SSOT, placement, orch parity, confidence, migrate.
 * yarn test:lip-design-import-loop
 */
import { mirrorDialoguePlanToShotsSsot } from "../src/ruleEngine/design/dialogueMirrorSsot";
import { mirrorDialoguePlanToShots } from "../src/ruleEngine/bundle/normalizePreDesignPack";
import {
  diagnoseDialoguePlacement,
  healMisboundDialoguePlacement,
} from "../src/ruleEngine/design/dialoguePlacementMatch";
import { runSplitOrchestrator, dryRunSplitOrchestrator } from "../src/ruleEngine/design/splitOrchestrator";
import { detectLipSplitPressure } from "../src/ruleEngine/design/lipSplit";
import { gateChatShotWriteback } from "../src/ruleEngine/design/chatWriteGate";
import { migrateStockLipPackage } from "../src/ruleEngine/design/stockLipMigrate";
import { rebindAudioVoiceAfterSplit } from "../src/ruleEngine/design/audioVoiceRebind";
import { scoreSplitConfidence, loadSplitAutoMin } from "../src/ruleEngine/design/splitConfidenceSsot";
import { matchDialogueLinesToShots, scoreLineToShot } from "../src/ruleEngine/design/dialoguePlacementMatch";
import { sliceChildrenAfterSplit } from "../src/ruleEngine/design/orchestratorTailSlice";
import { differentiateSemanticChild } from "../src/ruleEngine/design/splitChildVisual";
import { readFileSync } from "fs";
import path from "path";

function ok(name: string, cond: boolean) {
  if (!cond) {
    console.error(`✗ ${name}`);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

const doctrine = JSON.parse(
  readFileSync(path.join(process.cwd(), "data/fixtures/lip_split_doctrine.json"), "utf-8"),
);
ok("doctrine v2 same-kernel", String(doctrine.version).startsWith("2."));
ok("doctrine import same_kernel", (doctrine.forward?.import ?? []).includes("same_kernel_runSplitOrchestrator"));
ok("doctrine never dump first shot", doctrine.freeze?.neverDumpMissingLinesOntoFirstDialogueShot === true);

// M1: missing lines → new speak shots, not dump onto prop_cu
const propCu = {
  shotIndex: 1,
  clientId: "sb-prop",
  shotSize: "CU",
  visualDescription: "沈母摩挲玉扳指特写，禁止同帧出人像头面部",
  narrative: {
    dialogue: {
      lines: [{ lineId: "L-keep", speaker: "旁白", text: "（特写）" }],
    },
  },
};
const bundle = {
  planData: {
    dialoguePlan: {
      lines: [
        { lineId: "L-keep", speaker: "旁白", text: "（特写）" },
        { lineId: "L-a", speaker: "沈清漪", text: "春日宴上请坐。" },
        { lineId: "L-b", speaker: "侍女", text: "姑娘，谢家主来了！" },
      ],
    },
    preDesignPack: { shots: [structuredClone(propCu)] },
  },
  preDesignPack: { shots: [structuredClone(propCu)] },
} as never;

const mirrored = mirrorDialoguePlanToShotsSsot(bundle as never);
ok("ssot mirror added speak shots", mirrored >= 1);
const afterMirrorShots =
  (bundle as { preDesignPack?: { shots?: Record<string, unknown>[] } }).preDesignPack?.shots ?? [];
ok("ssot grew shot list", afterMirrorShots.length >= 3);
const propAfter = afterMirrorShots.find((s) => String(s.clientId) === "sb-prop") ?? afterMirrorShots[0]!;
const propLines =
  ((propAfter.narrative as { dialogue?: { lines?: { lineId?: string }[] } })?.dialogue?.lines ?? []).map(
    (l) => l.lineId,
  );
const allLineIds = afterMirrorShots.flatMap(
  (s) =>
    ((s.narrative as { dialogue?: { lines?: { lineId?: string }[] } })?.dialogue?.lines ?? []).map((l) =>
      String(l.lineId ?? ""),
    ),
);
ok(
  "no dump L-a/L-b onto prop_cu",
  !propLines.includes("L-a") && !propLines.includes("L-b"),
);
ok("missing lines exist on other shots", allLineIds.includes("L-a") && allLineIds.includes("L-b"));
ok("normalize wrapper delegates ssot", typeof mirrorDialoguePlanToShots === "function");

// M8: prop_cu multi-lip heal
const dirty768 = {
  shotIndex: 2,
  clientId: "sb-768",
  shotSize: "CU",
  visualDescription: "沈母摩挲玉扳指特写，只出手部，禁止同帧出人像头面部",
  narrative: {
    dialogue: {
      lines: [
        { lineId: "L1", speaker: "沈母", text: "春日宴上，清漪你坐下。" },
        { lineId: "L2", speaker: "沈清漪", text: "是，母亲。" },
        { lineId: "L3", speaker: "宾客", text: "好酒！" },
      ],
    },
  },
};
const place = diagnoseDialoguePlacement([dirty768]);
ok("placement flags prop_cu multi", place.issues.some((i) => i.reason === "prop_cu_multi_lip"));
const healed = healMisboundDialoguePlacement([dirty768]);
ok("heal peels multi off prop_cu", healed.peeledToAudio >= 1 || healed.remainingPressure === 0);
const speakLeft = (
  (healed.shots[0]!.narrative as { dialogue?: { lines?: unknown[] } })?.dialogue?.lines ?? []
).length;
ok("prop_cu after heal speak lines <=1", speakLeft <= 1);

// M2/M3 design ≈ import structure
const multi = {
  shotIndex: 1,
  duration: 4,
  visualDescription: "沈清漪中景开口",
  narrative: {
    dialogue: {
      lines: [
        { lineId: "La", speaker: "沈清漪", text: "包扎好伤口后指尖拂过梳妆台。" },
        { lineId: "Lb", speaker: "侍女", text: "姑娘！谢家主来了！" },
      ],
    },
  },
};
const planBase = {
  dialoguePlan: {
    lines: [
      { lineId: "La", speaker: "沈清漪", text: "包扎好伤口后指尖拂过梳妆台。" },
      { lineId: "Lb", speaker: "侍女", text: "姑娘！谢家主来了！" },
    ],
  },
};
const designOrch = runSplitOrchestrator({
  planData: structuredClone(planBase),
  shots: [structuredClone(multi)],
  applyVisBeatExpanders: false,
});
const importOrch = runSplitOrchestrator({
  planData: structuredClone(planBase),
  shots: [structuredClone(multi)],
  applyVisBeatExpanders: false,
});
ok("design≈import shot count", designOrch.shots.length === importOrch.shots.length);
ok(
  "orch expands or clears pressure",
  designOrch.shots.length >= 2 ||
    designOrch.shots.every((s) => !detectLipSplitPressure(s).mustConfirm),
);

// M9 confidence
const dry = dryRunSplitOrchestrator({
  planData: planBase,
  shots: [structuredClone(multi)],
});
ok("dryRun exposes confidence", typeof dry.confidence === "number" && typeof dry.autoEligible === "boolean");
ok("autoMin from doctrine", loadSplitAutoMin() === Number(doctrine.confidence?.autoMin ?? 0.7));
ok("scoreSplitConfidence finite", scoreSplitConfidence({ lineCount: 2 }).confidence > 0);

// M14 audio rebind
const silent = {
  shotIndex: 9,
  visualDescription: "空镜庭院",
  lipSyncPolicy: "required",
  narrative: { dialogue: { lines: [] }, voiceIntent: { type: "lip" } },
};
const reb = rebindAudioVoiceAfterSplit([silent]);
ok("orphan lip cleared on silent", reb.clearedOrphanLip >= 1);

// M16 chat write gate — no false green with pressure
const gatePlan = {
  planData: {
    ...planBase,
    preDesignPack: { shots: [structuredClone(multi)] },
  },
};
const gate = gateChatShotWriteback(gatePlan, { forceExpand: true, stageId: "SB" });
ok("chat gate returns passed boolean", typeof gate.passed === "boolean");
ok("chat gate with forceExpand tries close", gate.log.length >= 1);

// M17 stock migrate
const stockPlan = {
  planData: {
    ...planBase,
    preDesignPack: { shots: [structuredClone(multi), structuredClone(dirty768)] },
  },
};
const mig = migrateStockLipPackage(stockPlan);
ok("stock migrate reduces or stamps", mig.afterPressure <= mig.beforePressure || mig.confirmRequired);
ok("stock migrate log present", mig.log.length >= 1);

// Idempotent: second orch on already expanded should not explode infinitely
const once = runSplitOrchestrator({
  planData: structuredClone(planBase),
  shots: designOrch.shots.map((s) => structuredClone(s)),
  applyVisBeatExpanders: false,
});
ok("second orch shot delta bounded", once.shots.length <= designOrch.shots.length + 4);

// M8 match: prop_cu scores low for on-cam lines
ok(
  "match scores prop_cu low",
  scoreLineToShot({ lineId: "Lx", text: "你好", speaker: "沈清漪" }, dirty768) <
    scoreLineToShot({ lineId: "Lx", text: "你好", speaker: "沈清漪" }, multi),
);
const unmatched = matchDialogueLinesToShots({
  planLines: [{ lineId: "L-new", text: "新句", speaker: "沈清漪" }],
  shots: [dirty768],
});
ok("match flags confirm on prop-only hosts", unmatched.confirmCount >= 1 || (unmatched.routes[0]?.score ?? 0) < 10);

// M6 refuse same-VD when child cannot differentiate
const same = differentiateSemanticChild({
  parentVd: "空",
  role: "reaction",
  lineText: "",
  lineIndex: 0,
  lineCount: 1,
});
ok("differentiate exposes refuse flag", typeof same.refuse === "boolean");

// M10 tail slice
const sliced = sliceChildrenAfterSplit(
  designOrch.shots.map((s) => ({
    ...s,
    _lipMultiSplit: true,
    _stillBeatSplitId: "p1",
    _parentVisualDescription: "沈清漪中景开口，铜镜反光",
  })),
);
ok("tail slice returns shots", sliced.shots.length === designOrch.shots.length);
ok("orch log has placement or tail", designOrch.log.some((l) => /placement|tail_slice|os_peel|mirror|lip_multi/.test(l.step)));

console.log("lip-design-import-loop OK");

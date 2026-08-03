/**
 * yarn test:g-untilclear-prop-intent
 * UntilClear must actually clear DEX-PROP-CONT (3+ shot chain) and DEX-INTENT-PIC (shotIndex mismatch).
 */
import {
  softHealPropContinuityDeclareOnly,
  auditPropContinuity,
} from "../src/ruleEngine/compilers/propContinuitySsot";
import {
  auditIntentPictureSync,
  syncIntentPicturesFromShots,
  type ShotDesignIntent,
} from "../src/ruleEngine/design/shotDesignIntent";
import { applyDesignAutoCloseToBundle } from "../src/ruleEngine/design/designAutoClose";
import { runDesignExitGate } from "../src/ruleEngine/design/designExitGate";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

// --- PROP: 3-shot vanish chain (prior bug: →continues dropped so shot3 never healed)
const chain = [
  { shotIndex: 1, visualDescription: "沈清漪手持休书立于殿中对质", sceneName: "大殿", propState: "", shotSize: "中景" },
  { shotIndex: 2, visualDescription: "两人分立阶前对峙", sceneName: "大殿", shotSize: "中景", propState: "" },
  { shotIndex: 3, visualDescription: "殿柱光影横切", sceneName: "大殿", shotSize: "全景", propState: "" },
];
const beforeBlocks = auditPropContinuity(chain).filter((f) => f.severity === "BLOCK");
ok(beforeBlocks.length >= 1, `3-shot PROP has BLOCK before heal (n=${beforeBlocks.length})`);
const healed = softHealPropContinuityDeclareOnly(chain);
ok(healed.mutated >= 2, `multi-pass heal mutates≥2 (got ${healed.mutated})`);
ok(healed.blocksLeft === 0, `PROP blocksLeft=0 after heal (left=${healed.blocksLeft})`);
ok(/→/.test(String(healed.shots[1]?.propState ?? "")), "shot2 has →continues/offframe");
ok(/→/.test(String(healed.shots[2]?.propState ?? "")), "shot3 carried from shot2 base token");

// --- INTENT: array-order intents without shotIndex vs sparse shotIndex
const intents: ShotDesignIntent[] = [
  {
    purpose: "信息",
    emotionGoal: "冷",
    picture: "花园/流水/桃花/亭台",
    shotSizeIntent: "特写",
    cutIntent: "切",
    audioIntent: "无",
    durationSec: 2,
    // intentionally NO shotIndex — old bug preferred intents[0] wrongly after split
    sceneRef: 2,
  },
  {
    purpose: "信息",
    emotionGoal: "冷",
    picture: "亭台/柳絮/池水/石桥",
    shotSizeIntent: "近景",
    cutIntent: "切",
    audioIntent: "无",
    durationSec: 2,
    shotIndex: 1,
  },
];
const shots = [
  { shotIndex: 1, visualDescription: "沈清漪侧脸，休书纸角贴颊" },
  { shotIndex: 2, visualDescription: "赵凌云持剑立于阶下" },
];
const auditBefore = auditIntentPictureSync({ intents, shots });
ok(!auditBefore.ok, "INTENT-PIC fails before sync");
const synced = syncIntentPicturesFromShots({ intents, shots });
ok(synced.synced >= 1, `syncIntentPictures synced≥1 (got ${synced.synced})`);
const auditAfter = auditIntentPictureSync({ intents: synced.intents, shots });
ok(auditAfter.ok, "INTENT-PIC clears after syncIntentPicturesFromShots");

// --- Bundle autoClose untilClear → exit fails leave
const bundle = {
  preDesignPack: {
    shots: [
      {
        shotIndex: 1,
        visualDescription: "沈清漪手持休书立于殿中",
        sceneName: "大殿",
        duration: 3,
      },
      {
        shotIndex: 2,
        visualDescription: "两人分立阶前对峙",
        sceneName: "大殿",
        shotSize: "中景",
        duration: 2,
      },
      {
        shotIndex: 3,
        visualDescription: "殿柱光影横切",
        sceneName: "大殿",
        shotSize: "全景",
        duration: 2,
      },
    ],
  },
  planData: {
    shotDesignIntent: [
      {
        purpose: "信息",
        emotionGoal: "冷",
        picture: "花园/流水/桃花/亭台/柳絮",
        shotSizeIntent: "近景",
        cutIntent: "切",
        audioIntent: "无",
        durationSec: 3,
        shotIndex: 1,
      },
    ],
    preDesignPack: undefined as unknown,
  },
  narrativeSelfcheck: { passed: false },
} as unknown as ScriptBundle;
(bundle.planData as { preDesignPack?: unknown }).preDesignPack = bundle.preDesignPack;

const exitBefore = runDesignExitGate("SB", {
  planData: bundle.planData,
  preDesignPack: bundle.preDesignPack,
} as never);
ok(
  exitBefore.failedIds.includes("DEX-PROP-CONT") || exitBefore.failedIds.includes("DEX-INTENT-PIC"),
  `exit before has PROP or INTENT (got ${exitBefore.failedIds.slice(0, 8).join(",")})`,
);

const ac = applyDesignAutoCloseToBundle(bundle, { stageId: "SB", maxRounds: 4 });
ok(ac.autoClosed.applied, "autoClose applied");
ok(
  ac.autoClosed.clearedIds.includes("DEX-PROP-CONT") ||
    !ac.autoClosed.remainingFailedIds.includes("DEX-PROP-CONT"),
  `PROP-CONT cleared or not remaining (cleared=${ac.autoClosed.clearedIds.join(",")} remain=${ac.autoClosed.remainingFailedIds.join(",")})`,
);
ok(
  ac.autoClosed.clearedIds.includes("DEX-INTENT-PIC") ||
    !ac.autoClosed.remainingFailedIds.includes("DEX-INTENT-PIC"),
  `INTENT-PIC cleared or not remaining (cleared=${ac.autoClosed.clearedIds.join(",")})`,
);

const exitAfter = runDesignExitGate("SB", {
  planData: bundle.planData,
  preDesignPack: bundle.preDesignPack,
} as never);
ok(!exitAfter.failedIds.includes("DEX-PROP-CONT"), `exit after no PROP-CONT (remain=${exitAfter.failedIds.join(",")})`);
ok(!exitAfter.failedIds.includes("DEX-INTENT-PIC"), `exit after no INTENT-PIC (remain=${exitAfter.failedIds.join(",")})`);

console.log("\ntest:g-untilclear-prop-intent OK");

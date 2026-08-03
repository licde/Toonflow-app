/**
 * yarn test:g-checklist-theme-glue
 * Checklist honesty: PROP-CONT/INTENT-PIC/false-green → autoAdapt, not 须手改;
 * sync_intent picture←VD; propState carry clears vanish.
 */
import { buildAggregatedChatRepairText } from "../src/ruleEngine/exportGate";
import {
  auditPropContinuity,
  softHealPropContinuityDeclareOnly,
} from "../src/ruleEngine/compilers/propContinuitySsot";
import {
  diagnoseStillIntent,
  applyStillIntentPatches,
} from "../src/ruleEngine/design/stillIntentReverse";
import type { ShotDesignIntent } from "../src/ruleEngine/design/shotDesignIntent";
import { auditIntentPictureSync } from "../src/ruleEngine/design/shotDesignIntent";

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

const text = buildAggregatedChatRepairText(
  [],
  ["DG-CAM-FIT-FALSE-GREEN", "FALSE_GREEN_SELFCHECK", "DEX-PROP-CONT", "DEX-INTENT-PIC"],
  undefined,
  [
    { id: "DG-CAM-FIT-FALSE-GREEN", message: "假绿" },
    { id: "FALSE_GREEN_SELFCHECK", message: "自检" },
    { id: "DEX-PROP-CONT", message: "道具" },
    { id: "DEX-INTENT-PIC", message: "同核" },
  ],
);
ok(!/待处理规则：.*DEX-PROP-CONT/.test(text), "PROP-CONT not in 须手改 pending");
ok(!/待处理规则：.*DEX-INTENT-PIC/.test(text), "INTENT-PIC not in 须手改 pending");
ok(!/待处理规则：.*FALSE_GREEN/.test(text), "FALSE_GREEN not in 须手改 pending");
ok(/服务端 untilClear|自动适配/.test(text), "autoAdapt banner present");
ok(/DEX-PROP-CONT/.test(text) && /untilClear|顺延|自动/.test(text), "PROP-CONT explained as auto path");

const shots = [
  { shotIndex: 1, visualDescription: "沈清漪手持休书立于殿中", sceneName: "大殿", propState: "" },
  { shotIndex: 2, visualDescription: "沈清漪侧脸冷笑特写", sceneName: "大殿", shotSize: "特写", propState: "" },
];
const before = auditPropContinuity(shots).filter((f) => f.severity === "BLOCK");
const healed = softHealPropContinuityDeclareOnly(shots);
const after = auditPropContinuity(healed.shots).filter((f) => f.severity === "BLOCK");
ok(healed.mutated >= 1, "prop soft heal mutates");
ok(after.length === 0, `prop soft heal clears BLOCK (left=${after.length}, before=${before.length})`);

const intents: ShotDesignIntent[] = [
  {
    purpose: "信息",
    emotionGoal: "冷",
    picture: "花园/流水/桃花/亭台/柳絮",
    shotSizeIntent: "特写",
    cutIntent: "切",
    audioIntent: "无",
    durationSec: 2,
    sceneRef: 1,
  },
];
const pack = [{ shotIndex: 1, visualDescription: "沈清漪侧脸，休书纸角贴颊" }];
const syncBefore = auditIntentPictureSync({ intents, shots: pack });
ok(!syncBefore.ok, "INTENT-PIC fails before sync");
const diag = diagnoseStillIntent(pack, { intents, chatStrict: false });
const syncP = diag.patches.filter((p) => p.op === "sync_intent_picture");
ok(syncP.length >= 1 && (syncP[0]!.confidence ?? 0) >= 0.85, "sync patch high conf");
ok(typeof (syncP[0]!.after as { picture?: string }).picture === "string", "sync writes picture not invent VD");
const planData: Record<string, unknown> = { shotDesignIntent: intents };
const applied = applyStillIntentPatches(pack, { ...diag, patches: syncP }, {
  intents,
  planData,
  chatStrict: false,
});
ok(applied.applied.length >= 1, "sync applied");
ok(intents[0]!.picture.includes("沈清漪") || intents[0]!.picture.includes("休书"), "picture synced from VD");
const syncAfter = auditIntentPictureSync({ intents, shots: pack });
ok(syncAfter.ok, "INTENT-PIC clears after sidecar sync");

ok(/假绿派生|untilClear|自动适配/.test(text), "false-green explained as derived/auto");
ok(
  /【导入将自动适配[\s\S]*?- DEX-PROP-CONT/m.test(text) ||
    /服务端 untilClear \/ 自动适配：[^\n]*DEX-PROP-CONT/.test(text),
  "PROP-CONT listed under autoAdapt",
);
ok(
  /【导入将自动适配[\s\S]*?- DEX-INTENT-PIC/m.test(text) ||
    /服务端 untilClear \/ 自动适配：[^\n]*DEX-INTENT-PIC/.test(text),
  "INTENT-PIC listed under autoAdapt",
);
ok(!/【须手改 · Chat 契约】NAR[\s\S]*?- DEX-PROP-CONT/m.test(text), "PROP-CONT not as 须手改 bullet");

console.log("\ntest:g-checklist-theme-glue OK");

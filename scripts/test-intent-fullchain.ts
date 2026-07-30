/**
 * Intent full-chain golden — classifyStillIntent + video scrub + firstframe fork.
 * yarn test:intent-fullchain
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { classifyStillIntent } from "../src/ruleEngine/compilers/stillIntentPolicy";
import { isHandEyeMultiBeat } from "../src/ruleEngine/design/dirtyStillPromptGate";
import { detectStillRecipeShotMode } from "../src/ruleEngine/compilers/stillShotRecipeAdapt";
import { resolveShotIdentityBinding } from "../src/ruleEngine/compilers/resolveShotIdentityBinding";
import { assertStillFirstFrameContract } from "../src/ruleEngine/qc/stillFirstFrameGate";
import { assertStillDetectForBurn } from "../src/ruleEngine/qc/stillDetectRepair";
import {
  sanitizeVideoPrompt,
  isVideoPromptStub,
  stripXmlAskStub,
} from "../src/ruleEngine/compilers/sanitizeVideoPrompt";
import {
  appendViralSidecarToPrompt,
  bindViralSidecarForCompile,
  stripCrossShotViralSidecar,
} from "../src/ruleEngine/design/bindViralSidecarForCompile";
import { softPatchQfExpr } from "../src/ruleEngine/compilers/qfExprGate";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error(`✗ ${name}`, detail ?? "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

const POWER_MID =
  "沈清瓷低头隐忍，沈母居高临下说教，指尖摩挲扳指。场面硬约束：角色必须摩挲扳指。" +
  "continuity: continues from 沈母摩挲玉扳指特写，眼神冰 竖屏9:16正脸朝向镜头。权力反差，太师椅，中景。";
const HAND_DIRTY = "手部特写。沈母摩挲扳指，正脸清晰，眼神冰冷。";
const chars = [
  { code: "CHAR-SHENMU", name: "沈母周氏", hasImage: true },
  { code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true },
];

// --- classify / dirty same kernel ---
const cls = classifyStillIntent({ visualDescription: POWER_MID, shotSize: "中景", characterCount: 2 });
ok("power mid → seating_power_mid", cls.intentClass === "seating_power_mid", cls.intentClass);
ok("power mid recipe face_or_scene", cls.recipeMode === "face_or_scene", cls.recipeMode);
ok("power mid not dirtyHandEye", !cls.dirtyHandEye);
ok("dirty gate matches classify", !isHandEyeMultiBeat(POWER_MID));
ok("recipe mode matches classify", detectStillRecipeShotMode({ visualDescription: POWER_MID, shotSize: "中景" }) === "face_or_scene");
ok("true hand+face dirty", classifyStillIntent({ visualDescription: HAND_DIRTY }).dirtyHandEye);
ok("true hand+face isHandEye", isHandEyeMultiBeat(HAND_DIRTY));

// --- identity power bind ---
const bind = resolveShotIdentityBinding({
  description: "沈清瓷低头隐忍，沈母居高临下说教。沈清瓷跪地低头，沈母高位俯视。",
  characters: chars,
});
ok(
  "bind 沈母高位",
  /沈母/.test(bind.highRole?.name ?? "") && /沈清瓷/.test(bind.lowRole?.name ?? ""),
  JSON.stringify({ high: bind.highRole, low: bind.lowRole }),
);

// --- firstframe: seating+扳指 not →SB dirty ---
const ffOk = assertStillFirstFrameContract({
  stillPrompt: POWER_MID + "。权力位：沈母（高位）正脸清晰。",
  stillFilePath: "/tmp/still.png",
  literaryDesc: POWER_MID,
  requireStill: true,
});
ok("firstframe power mid ok", ffOk.ok, `${ffOk.code}|${ffOk.message}`);

const ffDirty = assertStillFirstFrameContract({
  stillPrompt: HAND_DIRTY,
  stillFilePath: "/tmp/still.png",
  literaryDesc: HAND_DIRTY,
  requireStill: true,
});
ok("firstframe true dirty blocks", !ffDirty.ok && ffDirty.reverseTrigger === "dirty_still_prompt", ffDirty.reverseTrigger);

const weak = assertStillDetectForBurn({
  stillPrompt: "中景权力座次",
  stillFilePath: "/tmp/still.png",
  literaryDesc: "中景。沈母端坐太师椅，沈清瓷跪蒲团。",
  fidelityFailed: true,
  stillMeta: { visualPass: false },
});
ok("weak fidelity → batch_still", weak.primaryNextStep === "batch_still", String(weak.primaryNextStep));
ok("weak trigger still_firstframe_weak", weak.reverseTrigger === "still_firstframe_weak", weak.reverseTrigger);

// --- video scrub ---
const xmlAsk = "请提供分镜 XML，包含 Visual Motion Camera。";
ok("xml ask is stub", isVideoPromptStub(xmlAsk));
ok("strip xml ask", stripXmlAskStub(xmlAsk).stripped);

const enShell =
  "[Visual]\n中景权力\n[Motion]\nmotion-from-frame\n[Camera]\nstatic, duration 4s\n[Audio]\n无对白。\n[Narrative]\nsubtle micro-expression on the locked character face (do not alter facial identity); expression detail belongs in storyboard still";
const san = sanitizeVideoPrompt({ prompt: enShell, durationSec: 4 });
ok("sanitize strips EN QF shell", !/storyboard still/i.test(san.prompt) && !/subtle micro-expression on the locked/i.test(san.prompt), san.prompt.slice(0, 120));
ok("sanitize change logged", san.changes.some((c) => /qf|en_qf|strip/i.test(c)), san.changes.join(","));

const qf = softPatchQfExpr("改脸。中景端坐。");
ok("qf soft uses ZH hint", /微表情/.test(qf.prompt) && !/storyboard still/i.test(qf.prompt), qf.prompt);

const plan = {
  planData: {
    shotDesignIntent: [
      {
        intentId: "intent-1",
        purpose: "爆点兑现",
        emotionGoal: "压",
        picture: "本镜权力说教",
        shotSizeIntent: "中景",
        cutIntent: "切",
        audioIntent: "说教",
        durationSec: 4,
        peakId: "PEAK-A",
        sceneRef: 1,
      },
      {
        intentId: "intent-2",
        purpose: "爆点兑现",
        emotionGoal: "爆",
        picture: "全集高潮扳指特写",
        shotSizeIntent: "特写",
        cutIntent: "切",
        audioIntent: "爆",
        durationSec: 2,
        peakId: "PEAK-EPISODE",
        sceneRef: 9,
      },
    ],
  },
} as Record<string, unknown>;

const bindShot = bindViralSidecarForCompile(plan, { shotIndex: 1, maxIntentLines: 1 });
ok("sidecar 本镜 only 1 line", bindShot.promptLines.length === 1 && /PEAK-A/.test(bindShot.promptLines[0]!), bindShot.promptLines.join("|"));
ok("sidecar 不含全集 PEAK", !bindShot.promptLines.some((l) => /PEAK-EPISODE/.test(l)));

const polluted = appendViralSidecarToPrompt("[Visual]\nx", plan); // no shot filter historically dumped many — now max 2
const scrubbed = stripCrossShotViralSidecar(
  polluted + "\n【设计意图 sidecar 续读·禁重发明爆点】\n[intent] peak=PEAK-EPISODE | 画面=全集",
);
const san2 = sanitizeVideoPrompt({ prompt: scrubbed.prompt + "\n请提供分镜 XML" });
ok("sanitize no PEAK-EPISODE dump", !/PEAK-EPISODE/.test(san2.prompt), san2.prompt.slice(0, 160));
ok("sanitize no xml ask left", !/请提供分镜/.test(san2.prompt));

const out = {
  version: "1.0.0",
  cases: {
    powerMid: { intentClass: cls.intentClass, dirty: cls.dirtyHandEye },
    handDirty: classifyStillIntent({ visualDescription: HAND_DIRTY }).dirtyHandEye,
    bind: { high: bind.highRole?.name, low: bind.lowRole?.name },
    firstframe: { powerOk: ffOk.ok, handTrigger: ffDirty.reverseTrigger },
    weak: { next: weak.primaryNextStep, trigger: weak.reverseTrigger },
    video: { changes: san.changes, stub: isVideoPromptStub(xmlAsk) },
  },
};
const dir = join(process.cwd(), "data/fixtures/golden");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "intent-fullchain.json"), JSON.stringify(out, null, 2), "utf8");
console.log("wrote data/fixtures/golden/intent-fullchain.json");
console.log("OK intent-fullchain");
process.exit(process.exitCode ?? 0);

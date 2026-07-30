/**
 * Literary intent survive loop — seating+扳指 ≠ hand_cu; Edit/first-gen base keeps 抄书/太师椅.
 * yarn test:literary-intent-survive
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import {
  detectStillRecipeShotMode,
  resolveStillRecipeAdapt,
} from "../src/ruleEngine/compilers/stillShotRecipeAdapt";
import {
  buildMustSurvive,
  buildLiteraryEgressBase,
  stripCollidingRecipeLayers,
  sortHealInjects,
  resetLiteraryIntentDoctrineCache,
} from "../src/ruleEngine/compilers/stillLiteraryIntentSsot";
import { buildLiteraryEditPrompt } from "../src/ruleEngine/compilers/stillEditLiteraryPrompt";
import { buildEditFocusPrompt } from "../src/ruleEngine/qc/stillImageEdit";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error(`✗ ${name}`, detail ?? "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

resetLiteraryIntentDoctrineCache();

const SEATING_VD =
  "中景。沈母端坐高位太师椅摩挲扳指，沈清瓷跪低位蒲团抄书，权力反差构图，烛火摇曳。";
const HAND_VD = "特写。沈母周氏指尖摩挲扳指，手部特写，袖口绣纹清晰，烛火侧光。";

const chars = [
  { code: "CHAR-SHENMU", name: "沈母周氏", hasImage: true, kind: "character" as const, tier: "lead" as const },
  { code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true, kind: "character" as const, tier: "lead" as const },
];

// --- doctrine detect ---
ok("seating+扳指 → face_or_scene", detectStillRecipeShotMode({ visualDescription: SEATING_VD, shotSize: "中景" }) === "face_or_scene");
ok(
  "seating adapt not hand",
  resolveStillRecipeAdapt({ visualDescription: SEATING_VD, shotSize: "中景", hasSeatingOrKneel: true }).mode ===
    "face_or_scene",
);
ok("explicit 手部特写 → hand_cu", detectStillRecipeShotMode({ visualDescription: HAND_VD, shotSize: "特写" }) === "hand_cu");

const surv = buildMustSurvive({ visualDescription: SEATING_VD, characterNames: ["沈母周氏", "沈清瓷"] });
ok("mustSurvive has seating/抄书 tokens", surv.tokens.some((t) => /抄书|太师椅|蒲团|端坐|跪/.test(t)), surv.tokens.join(","));
ok("mustSurvive hasSeating", surv.hasSeatingOrKneel);

// --- compose seating ---
const seat = composeStillPrompt(
  {
    visualDescription: SEATING_VD,
    shotSize: "中景",
    qualityMode: "hq_update",
    characters: chars,
    dialogueDominantSpeaker: "沈母周氏",
  },
  { mode: "full" },
);
ok("seating compose ok", seat.ok, `${seat.blockReason}|${(seat.warnings ?? []).join(",")}`);
const seatBlob = `${seat.visualBody}\n${seat.prompt}`;
ok("seating prompt has 抄书", /抄书/.test(seatBlob));
ok("seating prompt has 太师椅", /太师椅/.test(seatBlob));
ok("seating prompt has 蒲团", /蒲团/.test(seatBlob));
ok("seating no 只出手与道具", !/本镜只出手与道具/.test(seatBlob));
ok("seating no 手部/袖口身份锁", !/定妆手部\/袖口/.test(seatBlob));
ok("seating must-appear has 沈清瓷", /必须出现：[^。]*沈清瓷/.test(seatBlob), seatBlob.match(/必须出现：[^。]+/)?.[0]);
ok("sources seatingOverride or face", (seat.sources ?? []).some((s) => /recipeAdapt\.seatingOverride|compositionContract/.test(s)));

// --- collision strip ---
const dirtyTail =
  SEATING_VD +
  "。场面硬约束：沈母周氏必须端坐太师椅；沈清瓷必须抄书。本镜只出手与道具细节，禁止同帧出人像头面部抢戏。锁定角色定妆手部/袖口/配饰纹理参考，禁止重塑手部身份细节。";
const stripped = stripCollidingRecipeLayers(dirtyTail, { hasSeating: true });
ok("strip colliding hand cu", stripped.stripped.length > 0 && !/本镜只出手/.test(stripped.cleaned));

// --- Edit / first-gen base ---
const composedLike = seat.prompt;
const litBase = buildLiteraryEditPrompt({
  description: SEATING_VD,
  fullPrompt: composedLike,
  characterNames: ["沈母周氏", "沈清瓷"],
});
ok("Edit base has 抄书", /抄书/.test(litBase));
ok("Edit base has 太师椅", /太师椅/.test(litBase));
ok("Edit base has 场面硬约束 or VD seating", /场面硬约束|端坐/.test(litBase));
const focus = buildEditFocusPrompt({
  literaryPrompt: litBase,
  fixHints: ["沈清瓷必须抄书", "必须出现太师椅"],
});
ok("Edit focus append-only keeps 抄书 in base", /抄书/.test(focus.split("【Edit焦点】")[0] ?? ""));
ok("Edit focus line present", /【Edit焦点】/.test(focus));

const handBase = buildLiteraryEgressBase({
  visualDescription: HAND_VD,
  fullPrompt: "特写。沈母周氏指尖摩挲扳指，手部特写，袖口绣纹清晰，烛火侧光。场面硬约束：沈母周氏必须摩挲扳指。",
});
ok("hand Edit/first base keeps 袖口", /袖口/.test(handBase.base));
ok("hand Edit/first base keeps 烛火", /烛火/.test(handBase.base));

// --- heal priority ---
const missing = surv.items.filter((i) => /抄书|太师椅/.test(i.id) || i.kind === "seating");
const hints = sortHealInjects(missing.length ? missing : surv.items, 8);
ok("heal hints non-empty for seating items", hints.length > 0, hints.join("|"));

// --- hand cu still clean ---
const hand = composeStillPrompt(
  {
    visualDescription: HAND_VD,
    shotSize: "特写",
    qualityMode: "hq_update",
    characters: [chars[0]!],
  },
  { mode: "full" },
);
ok("hand CU compose ok", hand.ok, hand.blockReason);
ok("hand CU no 正脸清晰", !/正脸清晰/.test(hand.prompt + hand.visualBody));

// --- seating + prior prompt with 正脸 must NOT dirty-block ---
{
  const { isHandEyeMultiBeat } = require("../src/ruleEngine/design/dirtyStillPromptGate");
  const prior =
    SEATING_VD +
    "。权力位：沈母周氏（高位）靠近视觉重心，正脸清晰。微表情落在锁定脸型上。";
  ok("seating+摩挲扳指+配方正脸 not hand-eye dirty", !isHandEyeMultiBeat(prior));
  ok(
    "true hand CU + 正脸 still dirty",
    isHandEyeMultiBeat("手部特写。沈母摩挲扳指，正脸清晰，眼神冰冷。"),
  );
  const powerMid =
    "沈清瓷低头隐忍，沈母居高临下说教，指尖摩挲扳指。场面硬约束：角色必须摩挲扳指。" +
    "continuity: continues from 沈母摩挲玉扳指特写，眼神冰 竖屏9:16正脸朝向镜头。权力反差，太师椅，中景。";
  ok("power mid + continuity 扳指特写 not dirty", !isHandEyeMultiBeat(powerMid), powerMid.slice(0, 80));
  const { resolveShotIdentityBinding } = require("../src/ruleEngine/compilers/resolveShotIdentityBinding");
  const bind = resolveShotIdentityBinding({
    description: "沈清瓷低头隐忍，沈母居高临下说教，指尖摩挲扳指。沈清瓷跪地低头，沈母高位俯视。",
    characters: chars,
  });
  ok(
    "bind 沈母高位 沈清瓷低位",
    /沈母/.test(bind.highRole?.name ?? "") && /沈清瓷/.test(bind.lowRole?.name ?? ""),
    JSON.stringify({ high: bind.highRole, low: bind.lowRole, line: bind.bindingLine }),
  );
  const recomposePower = composeStillPrompt(
    {
      visualDescription: "沈清瓷低头隐忍，沈母居高临下说教，指尖摩挲扳指。沈清瓷跪地低头，沈母高位俯视，太师椅，权力反差。",
      shotSize: "中景",
      qualityMode: "hq_update",
      rawPrompt: powerMid,
      compiledImagePrompt: powerMid,
      continuityInject: "continues from 沈母摩挲玉扳指特写，眼神冰",
      characters: chars,
    },
    { mode: "full" },
  );
  ok(
    "compose power mid not dirty-block",
    recomposePower.ok && recomposePower.blockReason !== "DEX-DIRTY-STILL-PROMPT",
    String(recomposePower.blockReason),
  );
  ok(
    "compose power 沈母高位 not 沈清瓷",
    /权力位：沈母|站位绑定：沈母.*=高位/.test(recomposePower.prompt + recomposePower.visualBody),
    (recomposePower.prompt + recomposePower.visualBody).match(/权力位[^。]+|站位绑定[^。]+/)?.[0],
  );
  const recompose = composeStillPrompt(
    {
      visualDescription: SEATING_VD,
      shotSize: "中景",
      qualityMode: "hq_update",
      rawPrompt: prior,
      compiledImagePrompt: prior,
      characters: chars,
    },
    { mode: "full" },
  );
  ok(
    "recompose seating with prior face recipe ok",
    recompose.ok && recompose.blockReason !== "DEX-DIRTY-STILL-PROMPT",
    String(recompose.blockReason),
  );
}

// golden fixture write
const goldenDir = join(__dirname, "../data/fixtures/golden");
mkdirSync(goldenDir, { recursive: true });
const goldenPath = join(goldenDir, "literary-intent-survive.json");
writeFileSync(
  goldenPath,
  JSON.stringify(
    {
      seatingVd: SEATING_VD,
      handVd: HAND_VD,
      requireInSeatingPrompt: ["抄书", "太师椅", "蒲团"],
      forbidInSeatingPrompt: ["本镜只出手与道具", "定妆手部/袖口"],
    },
    null,
    2,
  ),
  "utf8",
);
ok("golden fixture written", Boolean(readFileSync(goldenPath, "utf8")));

console.log("\nall passed");

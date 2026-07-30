/**
 * Still Composition Spec golden matrix.
 * yarn test:still-composition-spec
 */
import {
  selectLayoutFamily,
  buildCastLineFromCompositionSpec,
  resetStillCompositionSpecCache,
  resolveRepairAction,
} from "../src/ruleEngine/qc/stillCompositionSpec";
import {
  dialogueCoverageReport,
  isNonLiteraryDialogueKey,
  stripDurationOnlyDialogueLines,
} from "../src/ruleEngine/design/dialogueCoverage";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { buildEditFocusPrompt } from "../src/ruleEngine/qc/stillImageEdit";
import { shouldForbidLayoutPreserve } from "../src/ruleEngine/compilers/stillRefSlotContract";
import { routeStillRepair } from "../src/ruleEngine/qc/stillRepairRoute";
import { preflightFamilyCref } from "../src/ruleEngine/qc/stillCrefPreflight";
import { detectStillRecipeShotMode } from "../src/ruleEngine/compilers/stillShotRecipeAdapt";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error(`✗ ${name}`, detail ?? "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

resetStillCompositionSpecCache();

// --- family selection ---
ok(
  "seating 2p",
  selectLayoutFamily({
    visualDescription: "沈母端坐太师椅，沈清瓷跪蒲团抄书，权力反差",
    characterCount: 2,
    hasSeatingOrKneel: true,
    recipeMode: "face_or_scene",
  }).familyId === "high_sit_low_kneel_2p",
);
ok(
  "confront 2p",
  selectLayoutFamily({
    visualDescription: "二人面对面左右分立对峙",
    characterCount: 2,
    recipeMode: "face_or_scene",
  }).familyId === "confront_lr_2p",
);
ok(
  "triangle 3p",
  selectLayoutFamily({
    visualDescription: "主位端坐，对立者侧立，旁观见证第三人",
    characterCount: 3,
    recipeMode: "face_or_scene",
  }).familyId === "power_triangle_3p",
);
ok(
  "ots 2p",
  selectLayoutFamily({
    visualDescription: "过肩构图，听者肩前景，对面主体",
    characterCount: 2,
    recipeMode: "face_or_scene",
  }).familyId === "ots_2p",
);
ok(
  "empty",
  selectLayoutFamily({
    visualDescription: "空镜，无人物，室内建立",
    characterCount: 0,
    recipeMode: "empty",
  }).familyId === "establishing_empty",
);
ok(
  "hand cu no people stageA",
  selectLayoutFamily({
    visualDescription: "手部特写摩挲扳指",
    characterCount: 1,
    recipeMode: "hand_cu",
  }).family.twoStage === false,
);
ok(
  "ensemble 4 skip stageA",
  selectLayoutFamily({
    visualDescription: "四人同席",
    characterCount: 4,
    recipeMode: "face_or_scene",
  }).familyId === "ensemble_4plus",
);

// --- cast line N generic ---
const line3 = buildCastLineFromCompositionSpec(["沈甲", "沈乙", "沈丙"]);
ok("N=3 第4人", /仅3人/.test(line3) && /第4人/.test(line3) && !/禁止第三人/.test(line3), line3);
const line2 = buildCastLineFromCompositionSpec(["沈母周氏", "沈清瓷"]);
ok("N=2 第3人", /仅2人/.test(line2) && /第3人/.test(line2), line2);

const seat = composeStillPrompt(
  {
    visualDescription: "中景。沈母端坐高位太师椅，沈清瓷跪低位蒲团抄书，权力反差。",
    shotSize: "中景",
    characters: [
      { code: "CHAR-A", name: "沈母周氏", hasImage: true, kind: "character", tier: "lead" },
      { code: "CHAR-B", name: "沈清瓷", hasImage: true, kind: "character", tier: "lead" },
    ],
  },
  { mode: "full" },
);
ok("compose 出镜人数", /出镜人数：仅2人/.test(seat.prompt), seat.prompt.match(/出镜人数[^。]+/)?.[0]);
ok("compose 禁第3人措辞", /第3人|禁止超员/.test(seat.prompt));

// --- DC-01 duration noise ---
ok("isNonLiterary ：3s", isNonLiteraryDialogueKey("：3s"));
ok("isNonLiterary 3s", isNonLiteraryDialogueKey("3s"));
ok("literary kept", !isNonLiteraryDialogueKey("你给我跪下"));
const stripped = stripDurationOnlyDialogueLines([
  { speaker: "沈母", text: "跪下" },
  { text: "：3s" },
  { text: "时长：3s" },
]);
ok("strip duration rows", stripped.length === 1 && stripped[0].text === "跪下");

const cov = dialogueCoverageReport({
  script: "沈母：跪下\n沈清瓷：是",
  shots: [
    {
      narrative: {
        dialogue: {
          lines: [
            { speaker: "沈母", text: "跪下" },
            { speaker: "沈清瓷", text: "是" },
            { text: "：3s" },
          ],
        },
      },
    },
  ],
});
ok("：3s not EXTRA", cov.extraCount === 0 && cov.ok, JSON.stringify(cov.extraKeys));

// --- edit focus dedupe ---
const focus = buildEditFocusPrompt({
  literaryPrompt:
    "沈母端坐。场面硬约束：沈母周氏必须端坐太师椅；沈清瓷必须抄书。出镜人数：仅2人。",
  fixHints: [
    "场面硬约束：沈母周氏必须端坐太师椅；沈清瓷必须跪于蒲团；沈清瓷必须抄书",
    "沈清瓷必须抄书书",
    "沈母周氏必须端坐太师椅",
  ],
});
ok("focus no 抄书书", !/抄书书/.test(focus));
ok("focus single Edit焦点", (focus.match(/【Edit焦点】/g) || []).length === 1);
ok("focus not dump full hard twice", !/场面硬约束：沈母周氏必须端坐太师椅；沈清瓷必须跪于蒲团/.test(focus.split("【Edit焦点】")[1] ?? ""));

// --- seat miss forbid preserve ---
ok(
  "seat missing forbid",
  shouldForbidLayoutPreserve({ fixHints: ["必须出现太师椅", "无座"] }) === true,
);
const route = routeStillRepair({
  itemResults: [{ id: "prop:太师椅", pass: false, fixHint: "缺太师椅" }],
  checklist: [
    {
      id: "prop:太师椅",
      kind: "seating",
      mustTokens: ["太师椅"],
      vlmQuestion: "q",
      healInject: "必须出现太师椅",
      strengthenKey: "mustProps",
      strengthenValue: "太师椅",
    },
  ],
});
ok("seat fail → swap", route.swapLayoutTemplate && !route.layoutPreserveEdit);

ok(
  "repair action swap",
  resolveRepairAction({ familyId: "high_sit_low_kneel_2p", failClass: "seatMissing" }) === "swap",
);

// --- cref family ---
const gate = preflightFamilyCref({
  required: true,
  minImaged: 3,
  characters: [
    { code: "CHAR-A", name: "甲", hasImage: true, kind: "character" },
    { code: "CHAR-B", name: "乙", hasImage: true, kind: "character" },
    { code: "CHAR-C", name: "丙", hasImage: false, kind: "character" },
  ],
});
ok("triangle needs 3 imaged", gate != null && gate.code === "CREF_MISSING_FOR_FAMILY");

ok(
  "recipe hand detect",
  detectStillRecipeShotMode({ visualDescription: "手部特写扳指", shotSize: "特写" }) === "hand_cu",
);

console.log("still-composition-spec: all passed");

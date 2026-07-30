/**
 * Still Reference Slot Contract — 图N remap + cast cardinality.
 * yarn test:still-ref-slot-contract
 */
import {
  buildCastCardinalityLine,
  buildPhysicalSlots,
  remapPromptToPhysicalRefs,
  expandStageAPrompt,
  shouldForbidLayoutPreserve,
  alignCrefMetaToBindOrder,
} from "../src/ruleEngine/compilers/stillRefSlotContract";
import { applyLayoutAnchorToBurn } from "../src/ruleEngine/qc/stillLayoutControl";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { prepareStillImageEdit, mergeEditReferenceList } from "../src/ruleEngine/qc/stillImageEdit";
import { routeStillRepair } from "../src/ruleEngine/qc/stillRepairRoute";
import { resetLiteraryIntentDoctrineCache } from "../src/ruleEngine/compilers/stillLiteraryIntentSsot";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error(`✗ ${name}`, detail ?? "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

resetLiteraryIntentDoctrineCache();

const names = ["沈母周氏", "沈清瓷"];
const card = buildCastCardinalityLine(names);
ok("cast line has 仅2人", /仅2人/.test(card) && /第3人|禁止第三人/.test(card), card);

const seatVd = "中景。沈母端坐高位太师椅摩挲扳指，沈清瓷跪低位蒲团抄书，权力反差构图，烛火摇曳。";
const chars = [
  { code: "CHAR-SHENMU", name: "沈母周氏", hasImage: true, kind: "character" as const, tier: "lead" as const },
  { code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true, kind: "character" as const, tier: "lead" as const },
];
const seat = composeStillPrompt(
  {
    visualDescription: seatVd,
    shotSize: "中景",
    qualityMode: "hq_update",
    characters: chars,
    dialogueDominantSpeaker: "沈母周氏",
  },
  { mode: "full" },
);
ok("compose has 出镜人数", /出镜人数：仅2人/.test(seat.prompt), seat.prompt.slice(0, 400));
ok("compose dual power no 第三人 only", /不出第三人|禁止第三人|第3人|禁止超员/.test(seat.prompt));

const logicalPrompt =
  "沈母端坐太师椅。站位绑定：沈母周氏=高位/图1（端坐或主位），沈清瓷=低位/图2（跪或侧位）；禁止互换脸与站位。";
const slots = buildPhysicalSlots({
  layoutBase64: "LAYOUT_B64",
  preferLayout: true,
  crefOrdered: [
    { base64: "C1", name: "沈母周氏", standing: "high" },
    { base64: "C2", name: "沈清瓷", standing: "low" },
  ],
});
ok("physical slots layout=1", slots[0]?.role === "layout" && slots[0].ordinal === 1);
ok("physical slots cref=2,3", slots[1]?.ordinal === 2 && slots[2]?.ordinal === 3);

const remapped = remapPromptToPhysicalRefs(logicalPrompt, slots, {
  highName: "沈母周氏",
  lowName: "沈清瓷",
  castNames: names,
  seatingHard: true,
});
ok("remap 图2=沈母", /沈母周氏=高位\/图2/.test(remapped), remapped);
ok("remap 图3=沈清瓷", /沈清瓷=低位\/图3/.test(remapped), remapped);
ok("remap has 布局锁 图1", /【布局锁】图1/.test(remapped), remapped);
ok("remap has 出镜人数", /出镜人数：仅2人/.test(remapped));
ok("remap has 参考图序", /参考图序：图1=/.test(remapped));
ok("remap 图序 沈母高位", /图2=沈母周氏（高位/.test(remapped), remapped);
ok("remap 图序 沈清瓷低位", /图3=沈清瓷（低位/.test(remapped), remapped);
ok("remap no 角色4", !/角色[45]/.test(remapped), remapped);

const aligned = alignCrefMetaToBindOrder({
  crefs: [{ base64: "C1" }, { base64: "C2" }, { base64: "C3" }, { base64: "C4" }],
  orderedNames: ["沈母周氏", "沈清瓷"],
  highName: "沈母周氏",
  lowName: "沈清瓷",
});
ok("align caps to 2", aligned.length === 2);
ok("align high first", aligned[0].name === "沈母周氏" && aligned[0].standing === "high");
ok("align low second", aligned[1].name === "沈清瓷" && aligned[1].standing === "low");

const applied = applyLayoutAnchorToBurn({
  vendorPrompt: logicalPrompt,
  referenceList: [
    { type: "image", base64: "C1" },
    { type: "image", base64: "C2" },
  ],
  layoutBase64: "LAYOUT_B64",
  castNames: names,
  highName: "沈母周氏",
  lowName: "沈清瓷",
  seatingHard: true,
});
ok("applyLayout refs length 3", applied.referenceList.length === 3);
ok("applyLayout prompt remapped", /图2/.test(applied.vendorPrompt) && /布局锁/.test(applied.vendorPrompt));

const stageA = expandStageAPrompt("竖屏灰模：高坐低跪", 2);
ok("stageA exact 2", /仅2人/.test(stageA), stageA);

const merged = mergeEditReferenceList({
  layoutPreserve: true,
  failedImageBase64: "FAILED",
  crefOrderedRefs: [
    { type: "image", base64: "C1", role: "cref" },
    { type: "image", base64: "C2", role: "cref" },
  ],
});
ok("preserve failed first", merged[0]?.role === "failed_still" && merged.length === 3);

const prep = prepareStillImageEdit({
  failedImageBase64: "FAILED",
  fixHints: [],
  literaryPrompt: logicalPrompt + " 出镜人数：仅2人（沈母周氏、沈清瓷）。",
  crefOrderedRefs: [
    { type: "image", base64: "C1", role: "cref" },
    { type: "image", base64: "C2", role: "cref" },
  ],
  model: "agnes:test",
  vendorHint: "agnes",
  layoutPreserve: true,
  castNames: names,
  highName: "沈母周氏",
  lowName: "沈清瓷",
  seatingHard: true,
});
ok(
  "edit remap 图2=沈母高位 not 沈清瓷",
  /高位\/图2/.test(prep.promptUsed) &&
    /图2=沈母周氏（高位/.test(prep.promptUsed) &&
    /图3=沈清瓷（低位/.test(prep.promptUsed) &&
    !/图2=沈清瓷（高位/.test(prep.promptUsed) &&
    !/角色[45]/.test(prep.promptUsed),
  prep.promptUsed.slice(0, 600),
);

const prepExtra = prepareStillImageEdit({
  failedImageBase64: "FAILED",
  fixHints: [],
  literaryPrompt: logicalPrompt,
  crefOrderedRefs: [
    { type: "image", base64: "C1", role: "cref" },
    { type: "image", base64: "C2", role: "cref" },
    { type: "image", base64: "C3", role: "cref" },
    { type: "image", base64: "C4", role: "cref" },
  ],
  model: "agnes:test",
  layoutPreserve: true,
  castNames: names,
  highName: "沈母周氏",
  lowName: "沈清瓷",
  seatingHard: true,
});
ok("extra crefs dropped to 1+2", prepExtra.referenceList.length === 3, String(prepExtra.referenceList.length));
ok("no phantom 角色 in promptUsed", !/角色\d/.test(prepExtra.promptUsed), prepExtra.promptUsed.slice(-200));

const prepDefault = prepareStillImageEdit({
  failedImageBase64: "FAILED",
  fixHints: [],
  literaryPrompt: logicalPrompt,
  crefOrderedRefs: [
    { type: "image", base64: "C1", role: "cref" },
    { type: "image", base64: "C2", role: "cref" },
  ],
  model: "agnes:test",
  vendorHint: "agnes",
  layoutPreserve: false,
  castNames: names,
  highName: "沈母周氏",
  lowName: "沈清瓷",
  seatingHard: true,
});
ok(
  "default edit keeps 图1 binding",
  /高位\/图1/.test(prepDefault.promptUsed) && !/参考图序：图1=构图保真/.test(prepDefault.promptUsed),
  prepDefault.promptUsed.slice(0, 300),
);

// Non-seating action mid: remap must NOT inject throne 站位绑定
{
  const actionPrompt =
    "动作主体：沈清漪靠近视觉重心并完成描写动作；沈母虚化在背景浅景深。出镜人数：仅2人（沈清漪、沈母）。";
  const actionSlots = buildPhysicalSlots({
    failedStillBase64: "FAILED_B64",
    preferLayout: false,
    crefOrdered: [
      { base64: "Y1", name: "沈清漪" },
      { base64: "M1", name: "沈母" },
    ],
  });
  const actionRemap = remapPromptToPhysicalRefs(actionPrompt, actionSlots, {
    highName: "沈母",
    lowName: "沈清漪",
    castNames: ["沈清漪", "沈母"],
    seatingHard: false,
  });
  ok("action remap no 站位绑定", !/站位绑定/.test(actionRemap), actionRemap.slice(0, 280));
  ok("action remap no 端坐或主位", !/端坐或主位|高位端坐|低位跪/.test(actionRemap), actionRemap.slice(0, 280));
  ok("action remap has 身份顺序 or cast", /身份顺序|出镜人数/.test(actionRemap), actionRemap.slice(0, 280));
}

ok(
  "forbid preserve on cast hint",
  shouldForbidLayoutPreserve({ fixHints: ["出镜人数不符，有第三人"] }) === true,
);
ok("allow preserve otherwise", shouldForbidLayoutPreserve({ fixHints: ["补抄书"] }) === false);

const route = routeStillRepair({
  itemResults: [{ id: "identity:cast_cardinality", pass: false, fixHint: "第三人" }],
  checklist: [
    {
      id: "identity:cast_cardinality",
      kind: "cast_cardinality",
      mustTokens: ["出镜人数"],
      vlmQuestion: "q",
      healInject: "出镜人数：仅2人",
      strengthenKey: "castLock",
      strengthenValue: "exact_2",
    },
  ],
});
ok("cast fail → swap layout not preserve", route.swapLayoutTemplate === true && route.layoutPreserveEdit === false);

const forbidPrep = prepareStillImageEdit({
  failedImageBase64: "FAILED",
  fixHints: ["出镜人数：第三人"],
  literaryPrompt: logicalPrompt,
  crefOrderedRefs: [{ type: "image", base64: "C1", role: "cref" }],
  model: "agnes:test",
  layoutPreserve: true,
  forbidLayoutPreserve: true,
  castNames: names,
});
ok("forbidLayoutPreserve drops preserve", forbidPrep.strategy !== "layout_preserve");

console.log("still-ref-slot-contract: all passed");

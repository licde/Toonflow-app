/**
 * yarn test:asset-visual-brief-ep01
 * Flatten CD/VLT briefs + B6 coverage against EP01-shaped fixture (no DB).
 */
import {
  flattenCharacterVisualBrief,
  flattenPropBrief,
  flattenSceneBrief,
  buildAssetPolishUserMessage,
  polishOutputChecklist,
  resolveAssetTier,
  humanizationClause,
  auditAssetDesignCoverage,
} from "@/ruleEngine/bundle/assetVisualBrief";
import { allocateSceneCodes, rewriteSceneColorLock } from "@/ruleEngine/bundle/normalizePreDesignPack";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const shenqingci = {
  code: "CHAR-SHENQINGCI",
  name: "沈清瓷",
  L0: { identity: "沈家养女/二房遗孤", age: "18", gender: "女" },
  L1: { face: "鹅蛋脸", skin: "白皙" },
  L2: { hair: "黑长直及腰" },
  L3: { costume: "素色襦裙，外罩浅青半臂" },
  L4: { posture: "脊背单薄但挺直" },
  L6: { arcVisual: "隐忍低头→抬头直视" },
};

const flat = flattenCharacterVisualBrief(shenqingci);
ok("CD flatten contains 鹅蛋脸", flat.brief.includes("鹅蛋脸"));
ok("CD flatten contains 黑长直", flat.brief.includes("黑长直"));
ok("CD flatten contains 素色襦裙", flat.brief.includes("素色襦裙"));
ok("CD flatten contains posture", flat.brief.includes("脊背单薄"));
ok("CD describe not name-only", flat.describe !== "沈清瓷" && flat.describe.includes("鹅蛋脸"));
ok("CD with L1–L3 not weak", !flat.weak);

const shenmu = flattenCharacterVisualBrief({
  name: "沈母周氏",
  L0: { identity: "沈家主母", age: "45", gender: "女" },
  L1: { face: "圆脸", skin: "保养得当" },
  L2: { hair: "盘发，戴金簪" },
  L3: { costume: "深紫色绣金对襟褂" },
});
ok("沈母 face differs from 清瓷", shenmu.brief.includes("圆脸") && !shenmu.brief.includes("鹅蛋脸"));

const prop = flattenPropBrief({ name: "天命书", significance: "命运提示器，被动触发" }, "PROP-TMS");
ok("prop describe not name-only", prop.describe.includes("命运提示器"));
ok("prop marked weak without material", prop.weak);

const sceneMap = allocateSceneCodes(["沈家祠堂", "沈清瓷卧房"]);
const rewritten = rewriteSceneColorLock(
  {
    沈家祠堂: "烛火暖光3000K，阴影冷调",
    沈清瓷卧房: "烛火暖光3000K+月光冷白",
  },
  sceneMap,
);
ok("Chinese scene lock → SCENE keys", Boolean(rewritten["SCENE-001"]));
const sceneFlat = flattenSceneBrief(
  {
    name: rewritten["SCENE-001"]!.name,
    colorTemp: rewritten["SCENE-001"]!.colorTemp,
    raw: rewritten["SCENE-001"]!.colorTemp,
  },
  rewritten["SCENE-001"]!.name,
);
ok("scene brief has PURE-SCENE", /PURE-SCENE/i.test(sceneFlat.brief));
ok("scene describe not empty", sceneFlat.describe.length > 4);

ok("lead tier for empathy root", resolveAssetTier({ code: "CHAR-SHENQINGCI", leadCodes: ["CHAR-SHENQINGCI"] }) === "lead");
ok("humanization lead mentions 非对称", /非对称|模板脸/.test(humanizationClause("lead", "隐忍→直视")));

const polishMsg = buildAssetPolishUserMessage({
  type: "role",
  name: "沈清瓷",
  describe: flat.brief,
  artStyle: "ancient_painting",
  storyHint: "沈清瓷在世家倾轧中觉醒",
  tier: "lead",
  arcVisual: "隐忍低头→抬头直视",
  label: "角色",
});
ok("polish msg has story", polishMsg.includes("世家倾轧"));
ok("polish msg has tier", polishMsg.includes("lead"));

ok("role checklist flags missing face", polishOutputChecklist("role", "素色襦裙四视图").includes("脸型/五官"));
ok("role checklist ok with face", polishOutputChecklist("role", "鹅蛋脸黑发素色襦裙").length === 0 || !polishOutputChecklist("role", "鹅蛋脸黑发素色襦裙").includes("脸型/五官"));

const b6Warns = auditAssetDesignCoverage({
  designBrief: { B6: { characters: ["沈清瓷", "冬青"], scenes: ["沈家祠堂"], props: ["天命书", "玉扳指"] } },
  characterDesign: { assets: [{ name: "沈清瓷", code: "CHAR-SHENQINGCI" }] },
  visualLockTable: {
    anchorProps: { "PROP-TMS": { name: "天命书" } },
    sceneColorLock: rewritten,
  },
});
ok("B6 warns missing 冬青 in CD", b6Warns.some((w) => w.includes("冬青")));
ok("B6 warns missing 玉扳指 in VLT", b6Warns.some((w) => w.includes("玉扳指")));
ok("B6 no warn for 天命书", !b6Warns.some((w) => w.includes("天命书")));

if (failed) {
  console.error(`\n${failed} FAILED`);
  process.exit(1);
}
console.log("\n=== test:asset-visual-brief-ep01 OK ===");

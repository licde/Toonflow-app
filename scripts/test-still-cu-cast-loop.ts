/**
 * Regression: CU×cast homology — detect, compose reverse, expand, layout, reverse SSOT.
 * Literary single-hero CU → slice_cast（降出场人数）；多人同框 → split.
 * Run: npx tsx scripts/test-still-cu-cast-loop.ts
 */
import assert from "node:assert/strict";
import { detectCuCastConflict } from "../src/ruleEngine/design/detectCuCastConflict";
import { expandStillCuCast } from "../src/ruleEngine/design/expandStillCuCast";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { selectLayoutFamily } from "../src/ruleEngine/qc/stillCompositionSpec";
import { BLOCK_TO_TRIGGER_FOR_TEST, buildBurnGateEnvelope } from "../src/ruleEngine/compilers/burnGateEnvelope";
import { routeStillRepair } from "../src/ruleEngine/qc/stillRepairRoute";

function ok(name: string, cond: boolean) {
  assert.ok(cond, name);
  console.log("ok", name);
}

// 1) Literary single-hero CU × 3 cast → slice_cast
{
  const d = detectCuCastConflict({
    shotSize: "特写",
    charCodes: ["CHAR-A", "CHAR-B", "CHAR-C"],
    characterNames: ["沈清瓷", "沈母周氏", "沈清漪"],
    visualDescription: "沈清漪侧脸，休书纸角划过面颊",
  });
  ok("detect conflict", d.conflict);
  ok("healMode slice_cast", d.healMode === "slice_cast");
  ok("primary 沈清漪", d.primaryName === "沈清漪");
  ok("autoEligible", d.confidence.autoEligible);
  ok("trigger still_cu_cast", d.reverseTrigger === "still_cu_cast");
}

// 2) Mid shot no conflict
{
  const d = detectCuCastConflict({
    shotSize: "中景",
    charCodes: ["CHAR-A", "CHAR-B", "CHAR-C"],
    characterNames: ["沈清瓷", "沈母周氏", "沈清漪"],
  });
  ok("mid no conflict", !d.conflict);
}

// 3) Compose：单人特写双接触 → HQ 优先拆镜（split > XOR soft），不洗绿出图
{
  const r = composeStillPrompt({
    visualDescription: "沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠",
    shotSize: "特写",
    characters: [
      { code: "CHAR-A", name: "沈清瓷", hasImage: true, kind: "role" },
      { code: "CHAR-B", name: "沈母周氏", hasImage: true, kind: "role" },
      { code: "CHAR-C", name: "沈清漪", hasImage: true, kind: "role" },
    ],
    qualityMode: "hq_update",
  });
  ok("compose blocks dual-contact XOR", !r.ok && r.blockReason === "DEX-LIT-CONTACT-XOR");
  ok("compose dual-contact next split_shot", r.primaryNextStep === "split_shot");
}

// 3a) Compose：单人特写仅颊触 → 可降出场人数过绿
{
  const r = composeStillPrompt({
    visualDescription: "沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。",
    shotSize: "特写",
    characters: [
      { code: "CHAR-A", name: "沈清瓷", hasImage: true, kind: "role" },
      { code: "CHAR-B", name: "沈母周氏", hasImage: true, kind: "role" },
      { code: "CHAR-C", name: "沈清漪", hasImage: true, kind: "role" },
    ],
    qualityMode: "hq_update",
  });
  ok("compose cheek-only slices CU cast", r.ok && (r.sources ?? []).some((s) => s.includes("cuCastSlice")));
  ok("compose cheek-only not split_shot", r.primaryNextStep !== "split_shot");
}

// 3b) 多人同框特写 → split block
{
  const r = composeStillPrompt({
    visualDescription: "沈清瓷与沈母周氏对峙同框，怒目相对",
    shotSize: "特写",
    characters: [
      { code: "CHAR-A", name: "沈清瓷", hasImage: true, kind: "role" },
      { code: "CHAR-B", name: "沈母周氏", hasImage: true, kind: "role" },
    ],
    qualityMode: "hq_update",
  });
  ok("compose blocks ensemble CU", !r.ok && r.blockReason === "DEX-STILL-CU-CAST");
  ok("compose ensemble next split_shot", r.primaryNextStep === "split_shot");
}

// 4) Layout: CU×n≥2 → none
{
  const fam = selectLayoutFamily({
    visualDescription: "沈清漪侧脸",
    shotSize: "特写",
    characterCount: 3,
  });
  ok("layout cu_cast_conflict", fam.reason === "cu_cast_conflict" && fam.familyId === "none");
}

// 5) Expand slice
{
  const exp = expandStillCuCast(
    [
      {
        clientId: "s1",
        shotIndex: 1,
        shotSize: "特写",
        visualDescription: "沈清漪侧脸咬唇",
        charCodes: ["CHAR-A", "CHAR-B", "CHAR-C"],
        characterNames: ["沈清瓷", "沈母周氏", "沈清漪"],
      },
    ],
    { chatStrict: false },
  );
  ok("expand slices not split", exp.slicedCount >= 1 && exp.expandedCount === 0);
  ok(
    "sliced cast≤1",
    Array.isArray(exp.shots[0]?.charCodes) && (exp.shots[0]!.charCodes as string[]).length <= 1,
  );
}

// 5b) Ensemble → split
{
  const exp = expandStillCuCast(
    [
      {
        clientId: "s1b",
        shotSize: "特写",
        visualDescription: "沈清瓷与沈母周氏对峙同框特写",
        charCodes: ["CHAR-A", "CHAR-B"],
        characterNames: ["沈清瓷", "沈母周氏"],
      },
    ],
    { chatStrict: false },
  );
  ok("ensemble expand children", exp.expandedCount >= 2);
  const react = exp.shots.find((s) => s.visualSplitRole === "reaction");
  ok("reaction cast sliced", Array.isArray(react?.charCodes) && (react!.charCodes as string[]).length <= 1);
}

// 6) chatStrict → no silent split on ensemble
{
  const exp = expandStillCuCast(
    [
      {
        clientId: "s2",
        shotSize: "特写",
        visualDescription: "甲与乙对峙同框特写",
        charCodes: ["CHAR-A", "CHAR-B"],
        characterNames: ["甲", "乙"],
      },
    ],
    { chatStrict: true },
  );
  ok("chatStrict no silent expand", exp.expandedCount === 0 && exp.confirmRequired);
}

// 7) Reverse SSOT
ok("ONEBEAT→still_onebeat_multi", BLOCK_TO_TRIGGER_FOR_TEST["DEX-STILL-ONEBEAT"] === "still_onebeat_multi");
ok("CU-CAST→still_cu_cast", BLOCK_TO_TRIGGER_FOR_TEST["DEX-STILL-CU-CAST"] === "still_cu_cast");
ok("VID-INHERIT mapped", BLOCK_TO_TRIGGER_FOR_TEST["VID-INHERIT-COMPOSITION"] === "vid_inherit_composition");
ok("IMG-STILL-QA→img_still_weak", BLOCK_TO_TRIGGER_FOR_TEST["IMG-STILL-QA"] === "img_still_weak");

{
  const env = buildBurnGateEnvelope([{ id: "IMG-STILL-QA", message: "weak", reverseTrigger: "img_still_weak" }]);
  ok("weak→batch_still not INFRA", env.nextStep === "batch_still");
}

{
  const env = buildBurnGateEnvelope([
    { id: "DEX-STILL-CU-CAST", message: "cu", reverseTrigger: "still_cu_cast" },
  ]);
  ok("cu_cast envelope split_shot", env.nextStep === "split_shot");
}

// 8) Repair exhausted → split_shot
{
  const r = routeStillRepair({
    itemResults: [{ id: "identity:cast_cardinality", pass: false, evidence: "fail" }],
    exhausted: true,
  });
  ok("exhausted→split_shot", r.nextStep === "split_shot");
}

// 9) 样本：降人数，不拆镜 Confirm
{
  const d = detectCuCastConflict({
    shotSize: "",
    characterNames: ["沈清瓷", "沈母周氏", "沈清漪"],
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊",
  });
  ok("VD-led 特写 slice", d.conflict && d.healMode === "slice_cast");

  const sample =
    "特写。沈清漪侧脸。出镜人数：仅3人（沈清瓷、沈母周氏、沈清漪）；禁止第4人";
  const r = routeStillRepair({
    literaryPrompt: sample,
    shotSize: "特写",
    castNames: ["沈清瓷", "沈母周氏", "沈清漪"],
  });
  ok("sample repair not split (slice)", r.nextStep !== "split_shot");
}

{
  // 截图同款泄漏「仅3人」+ 双接触：HQ 优先拆镜（split > soft XOR），不洗绿出图
  const leak =
    "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。出镜人数：仅3人（沈清瓷、沈母周氏、沈清漪）；禁止第4人、路人、群像、重复分身";
  const d = detectCuCastConflict({
    shotSize: "特写",
    characterNames: ["沈清漪"],
    visualDescription: leak,
    prompt: leak,
  });
  ok("screenshot leak healMode slice", d.conflict && d.healMode === "slice_cast" && d.primaryName === "沈清漪");

  const r = composeStillPrompt({
    visualDescription: leak,
    shotSize: "特写",
    characters: [{ code: "CHAR-C", name: "沈清漪", hasImage: true, kind: "role" }],
    qualityMode: "hq_update",
  });
  ok("screenshot dual-contact blocks split_shot", !r.ok && r.blockReason === "DEX-LIT-CONTACT-XOR");
  ok("screenshot dual-contact next split_shot", r.primaryNextStep === "split_shot");

  // 颊触单动作 + 仅3人泄漏：可过绿并剥契约
  const cheekLeak =
    "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。出镜人数：仅3人（沈清瓷、沈母周氏、沈清漪）；禁止第4人";
  const r2 = composeStillPrompt({
    visualDescription: cheekLeak,
    shotSize: "特写",
    characters: [{ code: "CHAR-C", name: "沈清漪", hasImage: true, kind: "role" }],
    qualityMode: "hq_update",
  });
  ok("screenshot cheek compose ok not 400", r2.ok && r2.primaryNextStep !== "split_shot");
  ok("screenshot cheek prompt no 仅3人", Boolean(r2.prompt) && !/仅3人/.test(r2.prompt!));
}

console.log("\nall still-cu-cast-loop checks passed");


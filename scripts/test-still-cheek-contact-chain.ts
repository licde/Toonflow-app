/**
 * Cheek-contact literary intent chain (划过面颊) — compose → checklist → edit → repair → detect.
 * yarn tsx scripts/test-still-cheek-contact-chain.ts
 */
import assert from "node:assert/strict";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { buildLiteraryFidelityChecklist } from "../src/ruleEngine/compilers/literaryFidelityChecklist";
import { buildEditFocusPrompt } from "../src/ruleEngine/qc/stillImageEdit";
import { routeStillRepair } from "../src/ruleEngine/qc/stillRepairRoute";
import { assertStillDetectForBurn } from "../src/ruleEngine/qc/stillDetectRepair";
import { diagnoseStillIntent } from "../src/ruleEngine/design/stillIntentReverse";
import {
  STILL_SINGLE_FRAME_LOCK_ZH,
  STILL_SHEET_AS_IDENTITY_ONLY_ZH,
} from "../src/ruleEngine/compilers/stillFirstFrameLiterarySsot";

const VD =
  "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。";
const VD_XOR_OK =
  "特写。沈清漪侧脸，休书纸角划过面颊（纸未入口），她紧咬下唇渗出血珠。";
/** Face-CU cheek-only — compose may PASS; dual contact must refuse wash-green */
const VD_CHEEK =
  "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。";
const CAST = ["沈清漪", "沈清瓷"];

function ok(name: string, cond: boolean, detail = "") {
  assert.ok(cond, `${name} ${detail}`);
  console.log("ok", name);
}

{
  const dual = composeStillPrompt({
    visualDescription: VD,
    shotSize: "特写",
    qualityMode: "hq_update",
    characters: [
      { code: "CHAR-A", name: "沈清漪", hasImage: true, kind: "role" },
      { code: "CHAR-B", name: "沈清瓷", hasImage: true, kind: "role" },
    ],
  });
  ok(
    "compose dual XOR refuse",
    Boolean(!dual.ok && dual.blockReason === "DEX-LIT-CONTACT-XOR"),
    String(dual.blockReason),
  );
  ok("compose dual next split_shot", dual.primaryNextStep === "split_shot");

  const xorPhrase = composeStillPrompt({
    visualDescription: VD_XOR_OK,
    shotSize: "特写",
    qualityMode: "hq_update",
    characters: [{ code: "CHAR-A", name: "沈清漪", hasImage: true, kind: "role" }],
  });
  ok(
    "compose face-CU dual+xor phrase still refuse",
    Boolean(!xorPhrase.ok && xorPhrase.blockReason === "DEX-LIT-CONTACT-XOR"),
    String(xorPhrase.blockReason),
  );

  const c = composeStillPrompt({
    visualDescription: VD_CHEEK,
    shotSize: "特写",
    qualityMode: "hq_update",
    characters: [
      { code: "CHAR-A", name: "沈清漪", hasImage: true, kind: "role" },
      { code: "CHAR-B", name: "沈清瓷", hasImage: true, kind: "role" },
    ],
  });
  ok("compose cheek ok", Boolean(c.ok && c.prompt));
  ok(
    "compose keeps contact locus",
    Boolean(c.prompt && /划过面颊|面颊/.test(c.prompt)),
    (c.prompt ?? "").slice(0, 120),
  );
  ok("compose has VD body", Boolean(c.prompt && /休书|划过/.test(c.prompt)));
}

{
  const items = buildLiteraryFidelityChecklist({
    description: VD,
    characterNames: CAST,
    shotSize: "特写",
  });
  ok(
    "checklist geom",
    items.some((i) => i.id.startsWith("contact_geom:") || i.id.startsWith("contact:")),
    items.map((i) => i.id).join(","),
  );
  ok("checklist primary_look", items.some((i) => i.id === "identity:primary_look"));
}

{
  const out = buildEditFocusPrompt({
    literaryPrompt: VD,
    visualDescription: VD,
    castNames: CAST,
    fixHints: [STILL_SINGLE_FRAME_LOCK_ZH, STILL_SHEET_AS_IDENTITY_ONLY_ZH, "背景可读"],
  });
  const focus = out.match(/【Edit焦点】[^\n]*/)?.[0] ?? "";
  ok("edit geom first", /接触几何|面颊/.test(focus), focus);
  ok("edit slim collage", !focus.includes("character turnaround sheet") && !/仅修正：；/.test(focus), focus);
  ok("edit primary look", /主look|沈清漪/.test(focus), focus);
  ok("edit no empty slot", !/仅修正：；/.test(focus), focus);
  ok("edit has bg knife", /禁灰棚|室内可辨|木作/.test(focus) || !/背景弱化/.test(out), focus);

  // Reproduce user leak: long sheet fragment must slim, never empty first
  const leak = buildEditFocusPrompt({
    literaryPrompt: `${VD}\n背景弱化：浅景深，保留室内环境可辨（木作/墙面/烛光），禁止灰棚/纯色摄影棚空白背景。`,
    visualDescription: VD,
    castNames: ["沈清漪"],
    fixHints: [
      "",
      "严禁复刻多格拼版、分栏头像墙或 character sheet 布局，必须输出描写中的单一电影场面。",
      STILL_SHEET_AS_IDENTITY_ONLY_ZH,
    ],
  });
  const leakFocus = leak.match(/【Edit焦点】[^\n]*/)?.[0] ?? "";
  ok("leak no empty", !/仅修正：；/.test(leakFocus), leakFocus);
  ok("leak slim sheet", !leakFocus.includes("character sheet") && /禁四视图|仅借身份|接触几何/.test(leakFocus), leakFocus);
  ok("leak bg + geom", /接触几何|面颊/.test(leakFocus) && /禁灰棚|室内可辨/.test(leakFocus), leakFocus);
}

{
  const dense = routeStillRepair({
    itemResults: [{ id: "contact_geom:面颊", pass: false }],
    visualDescription: VD_CHEEK,
    shotSize: "特写",
    castNames: ["沈清漪"],
  });
  ok("dense geom → 修接触几何", dense.ctaLabel === "修接触几何", JSON.stringify(dense));
  ok("dense geom regen not chat", dense.nextStep === "regen_storyboard_hq");

  const denseXor = routeStillRepair({
    itemResults: [{ id: "contact_geom:面颊", pass: false }],
    visualDescription: VD,
    shotSize: "特写",
    castNames: ["沈清漪"],
  });
  ok(
    "dense xor debt → split/chat not sole geom",
    (denseXor.nextStep === "split_shot" || denseXor.nextStep === "chat_repair") &&
      (denseXor.missingSlots ?? []).includes("contactRoleXor") &&
      denseXor.nextStep !== "regen_storyboard_hq",
    JSON.stringify(denseXor),
  );

  const denseXorPhrase = routeStillRepair({
    itemResults: [{ id: "contact_geom:面颊", pass: false }],
    visualDescription: VD_XOR_OK,
    shotSize: "特写",
    castNames: ["沈清漪"],
  });
  ok(
    "face-CU dual+xor phrase still split (no soft wash)",
    denseXorPhrase.nextStep === "split_shot",
    JSON.stringify(denseXorPhrase),
  );

  const sparse = routeStillRepair({
    itemResults: [{ id: "identity:foo", pass: false }],
    visualDescription: "特写。沈清漪侧脸，休书。",
    shotSize: "特写",
    castNames: ["沈清漪"],
  });
  ok("sparse → hand_edit", sparse.nextStep === "chat_repair" && (sparse.irdPrimaryAction === "hand_edit_vd" || sparse.irdPrimaryAction === "confirm_enhance"));
}

{
  const d = diagnoseStillIntent(
    [{ shotIndex: 1, visualDescription: "特写。沈清漪侧脸，休书。", shotSize: "特写" }],
    {},
  );
  ok("ird sparse hand_edit", d.primaryAction === "hand_edit_vd" || d.primaryAction === "confirm_enhance");
  ok("ird missingSlots", (d.missingSlots?.length ?? 0) > 0);

  const denseIrd = diagnoseStillIntent(
    [{ shotIndex: 1, visualDescription: VD, shotSize: "特写" }],
    {},
  );
  ok(
    "ird dense no lit BLOCK contact",
    !denseIrd.findings.some((f) => f.id === "DEX-LIT-CONTACT" && f.severity === "BLOCK"),
  );
  ok(
    "ird dense XOR BLOCK",
    denseIrd.findings.some((f) => f.id === "DEX-LIT-CONTACT-XOR" && f.severity === "BLOCK"),
  );
  ok(
    "ird dense missing contactRoleXor",
    (denseIrd.missingSlots ?? []).includes("contactRoleXor"),
  );
  ok(
    "ird dense enhance or split",
    denseIrd.primaryAction === "confirm_enhance" ||
      denseIrd.primaryAction === "confirm_split" ||
      denseIrd.primaryAction === "hand_edit_vd",
    denseIrd.primaryAction,
  );
}

{
  const detect = assertStillDetectForBurn({
    fidelityFailed: true,
    literaryDesc: "特写。沈清漪侧脸，休书。",
    shot: { visualDescription: "特写。沈清漪侧脸，休书。", shotSize: "特写" },
  });
  ok("detect slots", (detect.missingSlots?.length ?? 0) > 0);
  ok("detect cta", Boolean(detect.ctaLabel && /手改VD|批准增强|自动增强|确认拆镜/.test(detect.ctaLabel)));
}

console.log("OK still-cheek-contact-chain");
void import("./lib/exitQuietDb").then((m) => m.exitQuietDb(0));

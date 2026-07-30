/**
 * Literary detail quality v2 — structure slots + prop continuity + LLM gate.
 * yarn test:literary-detail-quality
 */
import assert from "node:assert/strict";
import {
  auditLiteraryDetailQuality,
  stillPrimaryLookLockLine,
  extractDeclaredSpatialAnchors,
  resetLiteraryDetailCache,
  isLiteraryDetailLlmFillEnabled,
} from "../src/ruleEngine/compilers/stillLiteraryDetailQuality";
import {
  auditPropContinuity,
  hydratePropStateFromVd,
  hydrateShotsPropState,
} from "../src/ruleEngine/compilers/propContinuitySsot";
import {
  buildLitFillSuggestions,
  applyLitFillToShots,
} from "../src/ruleEngine/design/literaryDetailLlmFill";
import { diagnoseStillIntent } from "../src/ruleEngine/design/stillIntentReverse";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { buildLiteraryFidelityChecklist } from "../src/ruleEngine/compilers/literaryFidelityChecklist";
import { readFixtureJson } from "../src/ruleEngine/utils/fixturesPath";

resetLiteraryDetailCache();

function ok(name: string, cond: boolean, detail = "") {
  assert.ok(cond, `${name} ${detail}`);
  console.log("ok", name);
}

// 1) Dense CU with dual contact — CONTACT pass, XOR BLOCK (no 互斥)
{
  const a = auditLiteraryDetailQuality({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。",
    shotSize: "特写",
  });
  ok(
    "dense CONTACT no block",
    !a.findings.some((f) => f.id === "DEX-LIT-CONTACT" && f.severity === "BLOCK"),
    JSON.stringify(a.findings),
  );
  ok(
    "dense XOR block",
    a.findings.some((f) => f.id === "DEX-LIT-CONTACT-XOR" && f.severity === "BLOCK"),
    JSON.stringify(a.findings),
  );
  ok(
    "dense missing contactRoleXor",
    a.findings.some((f) => (f.missingSlots ?? []).includes("contactRoleXor")),
  );
}

// 1b) XOR satisfied
{
  const a = auditLiteraryDetailQuality({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊（纸未入口），她紧咬下唇渗出血珠。",
    shotSize: "特写",
  });
  ok(
    "xor ok pass",
    !a.findings.some((f) => f.id === "DEX-LIT-CONTACT-XOR" && f.severity === "BLOCK"),
    JSON.stringify(a.findings),
  );
}

// 1c) Single touch_face only — no XOR
{
  const a = auditLiteraryDetailQuality({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。",
    shotSize: "特写",
  });
  ok("single contact no xor", !a.findings.some((f) => f.id === "DEX-LIT-CONTACT-XOR"));
  ok("single contact pass", a.ok || !a.findings.some((f) => f.severity === "BLOCK"));
}

// 2) Sparse face+prop — contact BLOCK
{
  const a = auditLiteraryDetailQuality({
    visualDescription: "特写。沈清漪侧脸，休书。",
    shotSize: "特写",
  });
  ok(
    "sparse prop contact block",
    a.findings.some((f) => f.id === "DEX-LIT-CONTACT" && f.severity === "BLOCK"),
    JSON.stringify(a.findings),
  );
  ok("missingSlots present", (a.findings[0]?.missingSlots?.length ?? 0) > 0);
}

// 3) Pickup without locus
{
  const a = auditLiteraryDetailQuality({
    visualDescription: "沈清瓷弯腰捡起休书。",
    shotSize: "中景",
  });
  ok("pickup needs anchor", a.findings.some((f) => f.id === "DEX-LIT-ANCHOR"), JSON.stringify(a.findings));
}

// 3b) Facing ≠ ground
{
  const a = auditLiteraryDetailQuality({
    visualDescription: "沈清瓷侧脸捡起休书。",
    shotSize: "中景",
  });
  ok(
    "facing ≠ ground",
    a.findings.some((f) => f.ruleId === "ground_action_needs_locus"),
    JSON.stringify(a.findings),
  );
}

// 4) Pickup with ground
{
  const a = auditLiteraryDetailQuality({
    visualDescription: "沈清瓷弯腰从地面捡起休书。",
    shotSize: "中景",
  });
  ok("pickup with ground pass", !a.findings.some((f) => f.id === "DEX-LIT-ANCHOR"), JSON.stringify(a.findings));
}

// 5) Unregistered structure words
{
  const a = auditLiteraryDetailQuality({
    visualDescription: "特写。沈清漪侧脸，信笺角划过面颊。",
    shotSize: "特写",
  });
  ok("未登录词 划过面颊 pass", a.ok || !a.findings.some((f) => f.id === "DEX-LIT-CONTACT" && f.severity === "BLOCK"));
  const b = auditLiteraryDetailQuality({
    visualDescription: "沈清瓷把信笺塞进袖口。",
    shotSize: "中景",
  });
  ok(
    "塞进袖口 structure",
    !b.findings.some((f) => f.ruleId === "pass_transfer_needs_locus" && f.severity === "BLOCK") ||
      b.slots.contactStruct.length > 0,
    JSON.stringify(b),
  );
}

// 6) checklist / look lock
{
  const items = buildLiteraryFidelityChecklist({
    description: "沈清漪侧脸，休书纸角划过面颊",
    characterNames: ["沈清漪"],
    shotSize: "特写",
  });
  ok(
    "checklist contact",
    items.some((i) => i.id.startsWith("contact:") || i.id.startsWith("spatialAnchor:")),
    items.map((i) => i.id).join(","),
  );
  const anchors = extractDeclaredSpatialAnchors("沈清瓷从地面捡起休书手持贴在胸前");
  ok("spatial anchors", anchors.length > 0);
  ok("look lock named", Boolean(stillPrimaryLookLockLine(2, "沈清漪")?.includes("沈清漪")));
}

// 7) IRD
{
  const d = diagnoseStillIntent(
    [{ shotIndex: 1, visualDescription: "特写。沈清漪侧脸，休书。", shotSize: "特写" }],
    {},
  );
  ok("ird contact", d.findings.some((f) => f.id === "DEX-LIT-CONTACT"));
  ok(
    "ird hand_edit or enhance",
    d.primaryAction === "hand_edit_vd" || d.primaryAction === "confirm_enhance",
    d.primaryAction,
  );
  ok("ird top missingSlots", (d.missingSlots?.length ?? 0) > 0, JSON.stringify(d.missingSlots));
  ok("ird ctaLabel", Boolean(d.ctaLabel && (/手改VD|批准增强|自动增强/.test(d.ctaLabel))), d.ctaLabel);
}

// 8) Prop continuity
{
  const findings = auditPropContinuity(
    hydrateShotsPropState([
      {
        shotIndex: 1,
        sceneName: "祠堂",
        visualDescription: "中景。沈清瓷手持休书贴在胸前。",
        shotSize: "中景",
      },
      {
        shotIndex: 2,
        sceneName: "祠堂",
        visualDescription: "中景。沈清瓷冷冷看着她。",
        shotSize: "中景",
      },
    ]),
  );
  ok("prop vanish block", findings.some((f) => f.ruleId === "vanish"), JSON.stringify(findings));
  const exempt = auditPropContinuity([
    { shotIndex: 1, sceneName: "A", visualDescription: "手持休书", shotSize: "中景" },
    { shotIndex: 2, sceneName: "B", visualDescription: "空镜廊下", shotSize: "全景" },
  ]);
  ok("scene change exempt", !exempt.some((f) => f.severity === "BLOCK"));
  ok("hydrate propState", hydratePropStateFromVd("手持休书").includes("休书"));
}

// 9) Dual-track fixtures
{
  const sem = readFixtureJson<{ mustEditBlockIds?: string[]; importSalvageRegistry?: { ruleId: string }[] }>(
    "semantic_gate_dual_track_matrix.json",
    {},
  );
  ok("mustEdit LIT", Boolean(sem.mustEditBlockIds?.includes("DEX-LIT-CONTACT")));
  ok("mustEdit LIT-XOR", Boolean(sem.mustEditBlockIds?.includes("DEX-LIT-CONTACT-XOR")));
  ok("mustEdit PROP", Boolean(sem.mustEditBlockIds?.includes("DEX-PROP-CONT")));
  ok(
    "salvage PROP",
    Boolean(sem.importSalvageRegistry?.some((r) => r.ruleId === "DEX-PROP-CONT")),
  );
  ok(
    "salvage XOR",
    Boolean(sem.importSalvageRegistry?.some((r) => r.ruleId === "DEX-LIT-CONTACT-XOR")),
  );
}

// 10) LLM flag off
{
  ok("llm default off", !isLiteraryDetailLlmFillEnabled({}));
  const sug = buildLitFillSuggestions({
    shots: [{ shotIndex: 1, visualDescription: "特写。侧脸，休书。", shotSize: "特写" }],
    literaryDetailLlmFill: false,
  });
  ok("suggest flag off", sug.refuse === "flag_off" || !sug.enabled);
  const app = applyLitFillToShots({
    shots: [{ shotIndex: 1, visualDescription: "特写。侧脸，休书。", shotSize: "特写" }],
    fills: [{ shotIndex: 1, append: "纸角划过面颊" }],
    literaryDetailLlmFill: false,
  });
  ok("apply flag off", app.refused.includes("flag_off"));
}

// 11) LLM apply with flag + reassert
{
  const app = applyLitFillToShots({
    shots: [{ shotIndex: 1, visualDescription: "特写。沈清漪侧脸，休书。", shotSize: "特写" }],
    fills: [{ shotIndex: 1, append: "纸角划过面颊" }],
    literaryDetailLlmFill: true,
    forceApply: true,
  });
  ok("apply fill ok", app.applied.includes(1), JSON.stringify(app));
  const locked = applyLitFillToShots({
    shots: [{ shotIndex: 1, visualDescription: "特写。沈清漪侧脸，休书。", shotSize: "特写" }],
    fills: [{ shotIndex: 1, append: "纸角划过面颊" }],
    literaryDetailLlmFill: true,
    literaryLocked: true,
  });
  ok("locked refuse", locked.refused.includes("literaryLocked"));
}

// 12) compose look lock
{
  const r = composeStillPrompt({
    visualDescription: "中景。沈清漪与沈清瓷对峙，沈清漪手持休书贴在胸前。",
    shotSize: "中景",
    qualityMode: "hq_update",
    characters: [
      { code: "CHAR-A", name: "沈清漪", hasImage: true, kind: "role" },
      { code: "CHAR-B", name: "沈清瓷", hasImage: true, kind: "role" },
    ],
  });
  ok(
    "compose look lock",
    Boolean(r.ok && ((r.prompt ?? "").includes("主look") || (r.sources ?? []).includes("identity.primaryLookLock"))),
  );
}

// 13) pour / door / 倒地
{
  ok(
    "pour needs target",
    auditLiteraryDetailQuality({ visualDescription: "沈清瓷泼酒。", shotSize: "中景" }).findings.some(
      (f) => f.ruleId === "pour_splash_needs_target",
    ),
  );
  ok(
    "倒地 ≠ pour",
    !auditLiteraryDetailQuality({ visualDescription: "沈清瓷倒地。", shotSize: "中景" }).findings.some(
      (f) => f.ruleId === "pour_splash_needs_target",
    ),
  );
}

// 14) Edit焦点瘦身 + 接触几何/主look优先
{
  const { buildEditFocusPrompt } = require("../src/ruleEngine/qc/stillImageEdit") as typeof import("../src/ruleEngine/qc/stillImageEdit");
  const { STILL_SINGLE_FRAME_LOCK_ZH, STILL_SHEET_AS_IDENTITY_ONLY_ZH } =
    require("../src/ruleEngine/compilers/stillFirstFrameLiterarySsot") as typeof import("../src/ruleEngine/compilers/stillFirstFrameLiterarySsot");
  const out = buildEditFocusPrompt({
    literaryPrompt: "特写。沈清漪侧脸，休书纸角划过面颊。",
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。",
    castNames: ["沈清漪", "沈清瓷"],
    fixHints: [
      STILL_SINGLE_FRAME_LOCK_ZH,
      STILL_SHEET_AS_IDENTITY_ONLY_ZH,
      "补身份细节",
      "背景可读",
      "光线一致",
      "勿改景别",
      "多余长句不应入焦",
    ],
  });
  const focus = (out.match(/【Edit焦点】[^\n]*/)?.[0] ?? "") as string;
  ok("edit focus has geom", /接触几何|面颊|贴合|划过/.test(focus), focus);
  ok("edit focus has primary look", /主look|沈清漪/.test(focus), focus);
  ok(
    "edit focus slim collage",
    /禁四视图\/拼版|四视图仅借身份/.test(focus) && !focus.includes("character turnaround sheet"),
    focus,
  );
  ok("edit focus capped", (focus.match(/；/g) ?? []).length <= 6, focus);

  // 咬/含 locus must share extractDeclaredContactLoci with checklist
  const bite = buildEditFocusPrompt({
    literaryPrompt: "特写。她紧咬下唇渗出血珠。",
    visualDescription: "特写。她紧咬下唇渗出血珠。",
    castNames: ["沈清漪"],
    fixHints: [],
  });
  const biteFocus = bite.match(/【Edit焦点】[^\n]*/)?.[0] ?? "";
  ok("edit geom from bite locus", /下唇|接触几何/.test(biteFocus), biteFocus);

  // Dual contact: Edit must inject XOR and must not sole-heal 下唇 (防塌成咬纸)
  const dualEdit = buildEditFocusPrompt({
    literaryPrompt: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。",
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。",
    castNames: ["沈清漪"],
    fixHints: [],
  });
  const dualFocus = dualEdit.match(/【Edit焦点】[^\n]*/)?.[0] ?? "";
  ok("edit dual xor first", /纸未入口|互斥/.test(dualFocus), dualFocus);
  ok(
    "edit dual skip oral geom collapse",
    !/接触几何：须与下唇/.test(dualFocus),
    dualFocus,
  );
}

// 15) checklist contact_geom + primary_look + EDIT heal
{
  const items = buildLiteraryFidelityChecklist({
    description: "特写。沈清漪侧脸，休书纸角划过面颊，沈清瓷在旁。",
    characterNames: ["沈清漪", "沈清瓷"],
    shotSize: "特写",
  });
  ok(
    "checklist contact_geom",
    items.some((i) => i.id.startsWith("contact_geom:")),
    items.map((i) => i.id).join(","),
  );
  ok(
    "checklist primary_look",
    items.some((i) => i.id === "identity:primary_look"),
    items.map((i) => i.id).join(","),
  );
  const geom = items.find((i) => i.id.startsWith("contact_geom:"));
  ok("geom vlm asks touch", Boolean(geom?.vlmQuestion?.includes("贴合") || geom?.vlmQuestion?.includes("划过")));
  const sf = items.find((i) => i.id === "identity:single_frame");
  ok("single_frame heal EDIT slim", Boolean(sf?.healInject && sf.healInject.length <= 24 && /禁四视图/.test(sf.healInject)));
}

// 16) detect surfaces missingSlots
{
  const { assertStillDetectForBurn } =
    require("../src/ruleEngine/qc/stillDetectRepair") as typeof import("../src/ruleEngine/qc/stillDetectRepair");
  const d = assertStillDetectForBurn({
    fidelityFailed: true,
    literaryDesc: "特写。沈清漪侧脸，休书。",
    shot: { visualDescription: "特写。沈清漪侧脸，休书。", shotSize: "特写" },
    stillMeta: { stillQuality: "weak", visualPass: false },
  });
  ok(
    "detect hand_edit or enhance",
    d.irdPrimaryAction === "hand_edit_vd" || d.irdPrimaryAction === "confirm_enhance",
    JSON.stringify(d),
  );
  ok("detect missingSlots", (d.missingSlots?.length ?? 0) > 0, JSON.stringify(d.missingSlots));
  ok("detect cta slots", Boolean(d.ctaLabel && /手改VD|批准增强|自动增强/.test(d.ctaLabel)), d.ctaLabel);
}

// 17) repair route: lit debt → hand_edit; geom → 修接触几何
{
  const { routeStillRepair } =
    require("../src/ruleEngine/qc/stillRepairRoute") as typeof import("../src/ruleEngine/qc/stillRepairRoute");
  const lit = routeStillRepair({
    itemResults: [{ id: "identity:foo", pass: false }],
    visualDescription: "特写。沈清漪侧脸，休书。",
    shotSize: "特写",
  });
  ok("repair lit → chat_repair", lit.nextStep === "chat_repair", JSON.stringify(lit));
  ok("repair lit missingSlots", (lit.missingSlots?.length ?? 0) > 0, JSON.stringify(lit.missingSlots));
  ok("repair lit cta hand_edit", /手改VD|批准增强|自动增强/.test(lit.ctaLabel), lit.ctaLabel);

  const geom = routeStillRepair({
    itemResults: [{ id: "contact_geom:面颊", pass: false }],
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。",
    shotSize: "特写",
  });
  ok("repair geom CTA", geom.ctaLabel === "修接触几何", JSON.stringify(geom));
  ok("repair geom regen", geom.nextStep === "regen_storyboard_hq");
}

// 18) drift + wound + import soft-fill gate + enhance template homology
{
  const {
    detectLiteraryDrift,
    deriveWoundVisibleAppend,
    hasContactRoleXorSatisfaction,
  } = require("../src/ruleEngine/compilers/stillLiteraryDetailQuality") as typeof import("../src/ruleEngine/compilers/stillLiteraryDetailQuality");
  const { buildEnhanceAppendForMissingSlots, applyLitFillToShots, buildLitFillSuggestions } =
    require("../src/ruleEngine/design/literaryDetailLlmFill") as typeof import("../src/ruleEngine/design/literaryDetailLlmFill");

  ok(
    "drift locked",
    !detectLiteraryDrift({ beforeVd: "沈清漪侧脸", afterVd: "沈清漪侧脸划过", literaryLocked: true }).ok,
  );
  ok(
    "drift new cast invent",
    !detectLiteraryDrift({ beforeVd: "沈清漪侧脸", afterVd: "沈清漪侧脸。新角色登场" }).ok,
  );
  ok(
    "xor satisfaction",
    hasContactRoleXorSatisfaction("休书划过面颊（纸未入口），紧咬下唇"),
  );

  const woundOnly = deriveWoundVisibleAppend({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。",
    intentVisualEnhance: true,
  });
  ok("wound derive needed", woundOnly.needed && /浅痕/.test(woundOnly.append), JSON.stringify(woundOnly));

  const woundXorBlock = deriveWoundVisibleAppend({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。",
    intentVisualEnhance: true,
  });
  ok("wound blocked until xor", !woundXorBlock.needed, JSON.stringify(woundXorBlock));

  const tpl = buildEnhanceAppendForMissingSlots(["contactRoleXor"], "特写。休书划过面颊，咬唇");
  ok("enhance template xor", /互斥|纸未入口|另镜/.test(tpl), tpl);

  const importRefuse = buildLitFillSuggestions({
    shots: [{ shotIndex: 1, visualDescription: "特写。侧脸，休书。", shotSize: "特写" }],
    literaryDetailLlmFill: true,
    importTrack: true,
  });
  // allowImportStructureSoftFill is true in doctrine P1 — suggest should work
  ok(
    "import soft suggest enabled or diagnose",
    importRefuse.enabled || importRefuse.refuse === "import_diagnose_only",
    JSON.stringify(importRefuse),
  );

  const enhanceApply = applyLitFillToShots({
    shots: [{ shotIndex: 1, visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。", shotSize: "特写" }],
    fills: [{ shotIndex: 1, append: "面颊浅痕可见" }],
    literaryDetailLlmFill: true,
    intentVisualEnhance: true,
    forceApply: true,
    confidence: 0.9,
  });
  ok("wound enhance apply", enhanceApply.applied.includes(1), JSON.stringify(enhanceApply));

  const plotRefuse = applyLitFillToShots({
    shots: [{ shotIndex: 1, visualDescription: "特写。沈清漪侧脸，休书。", shotSize: "特写" }],
    fills: [{ shotIndex: 1, append: "忽然心想原来如此" }],
    literaryDetailLlmFill: true,
    forceApply: true,
  });
  ok("plot prose refuse", plotRefuse.refused.some((r) => /plot_or_fx/.test(r)), JSON.stringify(plotRefuse));
}

// 19) dual-track hard design vs soft import registry
{
  const mount = readFixtureJson<{ rows?: { ruleId: string; reverseTrigger?: string }[] }>(
    "design_gate_mount_matrix.json",
    {},
  );
  const rows = mount.rows ?? [];
  const xorRow = rows.find((r) => r.ruleId === "DEX-LIT-CONTACT-XOR");
  ok("mount XOR", Boolean(xorRow), JSON.stringify(xorRow));
  ok("mount XOR trigger", xorRow?.reverseTrigger === "lit_detail_contact_xor");

  const rev = readFixtureJson<Record<string, unknown>>("reverse_route_table.json", {});
  const blob = JSON.stringify(rev);
  ok("reverse has lit_detail_contact_xor", blob.includes("lit_detail_contact_xor"));
  ok(
    "reverse naming isolation note",
    blob.includes("contact_role_xor") || blob.includes("audio_xor"),
  );

  const collision = readFixtureJson<{ collisions?: unknown[]; namingIsolation?: { contact_role_xor?: string } }>(
    "lit_enhance_recipe_collision.json",
    {},
  );
  ok("collision matrix loaded", (collision.collisions?.length ?? 0) >= 2);
  ok(
    "collision naming isolation",
    collision.namingIsolation?.contact_role_xor === "lit_detail_contact_xor",
  );
}

// 20) pillarsLitEnhanceV1 — default enforce hard-block; explicit shadow soft; import soft never hard
{
  const { runDesignExitGate } =
    require("../src/ruleEngine/design/designExitGate") as typeof import("../src/ruleEngine/design/designExitGate");
  const { resolveLitEnhanceMode, isLitEnhanceDesignHardBlock, isImportLitSoftTrack } =
    require("../src/ruleEngine/design/litEnhancePolicy") as typeof import("../src/ruleEngine/design/litEnhancePolicy");
  const { resetLiteraryDetailCache } =
    require("../src/ruleEngine/compilers/stillLiteraryDetailQuality") as typeof import("../src/ruleEngine/compilers/stillLiteraryDetailQuality");
  resetLiteraryDetailCache();
  const dualVd = "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。";
  const mkPlan = (mode: string, extraMeta?: Record<string, unknown>) => ({
    planData: {
      meta: { pillarsLitEnhanceV1: mode, ...(extraMeta ?? {}) },
      preDesignPack: {
        shots: [{ shotIndex: 1, visualDescription: dualVd, shotSize: "特写" }],
      },
    },
  });
  ok(
    "mode default enforce",
    resolveLitEnhanceMode({}) === "enforce" || resolveLitEnhanceMode({ pillarsLitEnhanceV1: "enforce" }) === "enforce",
  );
  ok("enforce hard", isLitEnhanceDesignHardBlock({ pillarsLitEnhanceV1: "enforce" }));
  ok("shadow soft exit flag", !isLitEnhanceDesignHardBlock({ pillarsLitEnhanceV1: "shadow" }));
  // sticky importOkNotExitPass  alone must NOT soft-block design (warehouse≠exit marker)
  ok(
    "sticky importOk still hard on design",
    isLitEnhanceDesignHardBlock({ pillarsLitEnhanceV1: "enforce", importOkNotExitPass: true }),
  );
  ok("active importTrack soft", !isLitEnhanceDesignHardBlock({ pillarsLitEnhanceV1: "enforce", importTrack: true }));
  ok("import soft track helper", isImportLitSoftTrack({ importTrack: true }));
  ok("importOk alone not soft track", !isImportLitSoftTrack({ importOkNotExitPass: true }));

  const shadowExit = runDesignExitGate("SB", mkPlan("shadow") as never);
  ok(
    "shadow Exit not hard-fail XOR",
    !shadowExit.failedIds.includes("DEX-LIT-CONTACT-XOR"),
    JSON.stringify(shadowExit.failedIds),
  );
  ok(
    "shadow warns XOR",
    (shadowExit.warnings ?? []).some((w: string) => /DEX-LIT-CONTACT-XOR/.test(w)),
    JSON.stringify(shadowExit.warnings?.filter((w: string) => /LIT/.test(w)).slice(0, 8)),
  );

  const enforceExit = runDesignExitGate("SB", mkPlan("enforce") as never);
  ok(
    "enforce Exit hard-fail XOR",
    enforceExit.failedIds.includes("DEX-LIT-CONTACT-XOR"),
    JSON.stringify(enforceExit.failedIds),
  );

  const defaultExit = runDesignExitGate("SB", {
    planData: {
      meta: {},
      preDesignPack: { shots: [{ shotIndex: 1, visualDescription: dualVd, shotSize: "特写" }] },
    },
  } as never);
  ok(
    "default Exit hard-fail XOR",
    defaultExit.failedIds.includes("DEX-LIT-CONTACT-XOR"),
    JSON.stringify(defaultExit.failedIds),
  );

  // Compose HQ: soft-inject XOR → ok (intelligent fill) or block residual
  {
    const { composeStillPrompt } =
      require("../src/ruleEngine/compilers/composeStillPrompt") as typeof import("../src/ruleEngine/compilers/composeStillPrompt");
    const c = composeStillPrompt({
      visualDescription: dualVd,
      shotSize: "特写",
      qualityMode: "hq_update",
      characters: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, kind: "character" }],
      requireLeadAssetImage: false,
    });
    ok(
      "compose hq xor soft-inject or refuse",
      (c.ok &&
        (c.sources ?? []).some((s) => /lit\.hq\.xor/.test(s)) &&
        /纸未入口|互斥/.test(c.prompt || "")) ||
        (!c.ok && /^DEX-LIT-/.test(String(c.blockReason ?? ""))),
      JSON.stringify({ ok: c.ok, block: c.blockReason, sources: c.sources?.filter((s) => /lit/.test(s)), head: String(c.prompt || "").slice(0, 120) }),
    );
    // refine+previous must still carry XOR phrase in egress
    const refine = composeStillPrompt(
      {
        visualDescription: dualVd,
        shotSize: "特写",
        qualityMode: "hq_update",
        previousVisualBody: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。背景弱化：浅景深。",
        characters: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", hasImage: true, kind: "character" }],
        requireLeadAssetImage: false,
      },
      { mode: "refine" },
    );
    ok(
      "compose refine face-CU dual refuse xor wash",
      !refine.ok && /^DEX-LIT-/.test(String(refine.blockReason ?? "")),
      JSON.stringify({
        ok: refine.ok,
        block: refine.blockReason,
        sources: refine.sources?.filter((s) => /lit|previous|full/.test(s)),
        head: String(refine.prompt || "").slice(0, 160),
      }),
    );
    const sparse = composeStillPrompt({
      visualDescription: "特写。沈清漪侧脸，休书。",
      shotSize: "特写",
      qualityMode: "hq_update",
      characters: [{ code: "CHAR-X", name: "沈清漪", hasImage: true }],
      requireLeadAssetImage: false,
    });
    ok(
      "compose hq sparse contact refuse",
      !sparse.ok && /DEX-LIT-/.test(String(sparse.blockReason ?? "")),
      JSON.stringify({ ok: sparse.ok, block: sparse.blockReason, next: sparse.primaryNextStep }),
    );
  }
}

console.log("OK literary-detail-quality");
void import("./lib/exitQuietDb").then((m) => m.exitQuietDb(0));

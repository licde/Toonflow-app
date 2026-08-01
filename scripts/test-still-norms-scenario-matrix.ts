/**
 * Still norms scenario matrix — CU / XOR / mid / ensemble / establish / no-VLM / FF / debt router.
 * Run: yarn tsx scripts/test-still-norms-scenario-matrix.ts
 */
import { resolveStillBgPolicy } from "../src/ruleEngine/compilers/stillBgPolicy";
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { gateStillLitDebtForHq } from "../src/ruleEngine/compilers/stillLitHqGate";
import { routeStillDebtAction } from "../src/ruleEngine/compilers/stillDebtActionRouter";
import { assertStillFirstFrameContract } from "../src/ruleEngine/qc/stillFirstFrameGate";
import { routeStillRepair } from "../src/ruleEngine/qc/stillRepairRoute";
import { homologizeStillPromptForStore } from "../src/ruleEngine/compilers/stillPromptHomology";
import { lintStillPromptBody } from "../src/ruleEngine/compilers/stillPromptLint";
import { deriveGenerationContract } from "../src/ruleEngine/design/deriveGenerationContract";
import { assessStillVideoReadiness } from "../src/ruleEngine/qc/stillVideoReadiness";
import { runImportLitDebtHygiene } from "../src/ruleEngine/design/importLitDebtHygiene";
import { VLM_API_KEY_MISSING } from "../src/ruleEngine/qc/vlmKeyResolve";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

// --- face CU: soft_env when SCENE linked ---
{
  const p = resolveStillBgPolicy({
    description: "特写。沈清漪侧脸，休书纸角划过面颊。",
    shotSize: "特写",
    hasSceneLink: true,
  });
  ok("CU soft_env ref", p.keepSoftEnvRef === true && p.bgMode === "soft_env");
}

// --- face CU: excludeScene + soft bg (no temple invite) ---
{
  const p = resolveStillBgPolicy({
    description: "特写。沈清漪侧脸，休书纸角划过面颊。",
    shotSize: "特写",
  });
  ok("CU excludeScene", p.excludeScene === true && p.reason === "faceCuDropScene");
  ok("CU bg no temple invite", !/殿内全景|香案/.test(String(p.bgGuidance ?? "")));
}

// --- mid seating: demote, keep scene available ---
{
  const p = resolveStillBgPolicy({
    description: "中景。沈母端坐太师椅，沈清漪跪于蒲团。",
    shotSize: "中景",
    characterNames: ["沈母", "沈清漪"],
  });
  ok("seating drop scene", p.excludeScene === true && p.reason === "seatingHard");
}

{
  const p = resolveStillBgPolicy({
    description: "中景。沈清漪弯腰捡起休书。",
    shotSize: "中景",
    characterNames: ["沈清漪"],
  });
  ok("action mid demote keep scene", p.excludeScene === false && p.policy === "demote", JSON.stringify(p));
}

// --- establishing keep SCENE ---
{
  const p = resolveStillBgPolicy({
    description: "空镜建立：殿内全景。",
    shotSize: "全景",
    sceneEstablishingHint: true,
  });
  ok("establish keep", p.excludeScene === false && p.policy === "keep");
}

// --- XOR dual → split_shot, no soft inject ---
{
  const vd = "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠";
  const g = gateStillLitDebtForHq({
    visualDescription: vd,
    shotSize: "特写",
    qualityMode: "hq_update",
    allowXorSoftInject: false,
  });
  ok("XOR HQ advise (shootable-first)", g.action === "advise" || g.action === "block", JSON.stringify(g));
  if (g.action === "advise" || g.action === "block") {
    ok("XOR next split_shot", g.primaryNextStep === "split_shot");
    ok("XOR no softInject source", !g.sources.includes("lit.hq.xorSoftInject"));
  }
  const debt = routeStillDebtAction({ visualDescription: vd, shotSize: "特写" });
  ok("debt router XOR", debt.kind === "lit_contact_xor" && debt.action === "split_shot");
}

// --- cheek-only OK ---
{
  const g = gateStillLitDebtForHq({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。",
    shotSize: "特写",
    qualityMode: "hq_update",
  });
  ok("cheek-only pass", g.action === "pass", JSON.stringify(g));
}

// --- compose cheek-only literary first + look anchor ---
{
  const r = composeStillPrompt({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。",
    shotSize: "特写",
    characters: [{ name: "沈清漪", code: "CHAR-C", hasImage: true, kind: "role" }],
    qualityMode: "hq_update",
  });
  ok("compose cheek ok", r.ok, r.blockReason);
  ok("compose objective first", /贴合|道具入画|休书必须清晰入画可读/.test(String(r.prompt ?? "")), String(r.prompt).slice(0, 80));
  ok("compose look anchor", /本镜主look/.test(String(r.prompt ?? "")) || (r.sources ?? []).includes("look.anchor.faceCu"), JSON.stringify(r.sources));
  ok("compose excludeScene", r.excludeScene === true);
  ok("compose prompt lint exported", Array.isArray(r.promptLintConflicts));
  ok("compose generation contract exported", Boolean(r.generationContract?.contractHash));
}

// --- compose XOR advise + slim (shootable-first; requireFixBeforeBurn) ---
{
  const r = composeStillPrompt({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠",
    shotSize: "特写",
    characters: [{ name: "沈清漪", code: "CHAR-C", hasImage: true, kind: "role" }],
    qualityMode: "hq_update",
  });
  ok("compose XOR shootable ok", r.ok === true, JSON.stringify({ ok: r.ok, warn: r.warnings }));
  ok(
    "compose XOR advise sources",
    (r.sources ?? []).some((s) => /advise|slimXor|preferSplit/.test(s)),
    JSON.stringify(r.sources?.slice(-8)),
  );
  ok("compose XOR slim drops oral", !/紧咬下唇/.test(String(r.prompt ?? r.visualBody ?? "")));
}

// --- ensemble mid: no faceCu drop ---
{
  const r = composeStillPrompt({
    visualDescription: "中景对峙。沈清漪与沈母隔案相望，烛火摇曳。",
    shotSize: "中景",
    characters: [
      { name: "沈清漪", code: "CHAR-C", hasImage: true, kind: "role" },
      { name: "沈母", code: "CHAR-M", hasImage: true, kind: "role" },
    ],
    qualityMode: "hq_update",
  });
  ok("ensemble compose ok", r.ok, r.blockReason);
  ok("ensemble not faceCuDrop", r.bgPolicyReason !== "faceCuDropScene", String(r.bgPolicyReason));
}

// --- sheet-lock persist homology ---
{
  const soup =
    "角色参考若为四视图/定妆拼版，仅借脸型；严禁复刻多格拼版或 character sheet 布局。特写。沈清漪侧脸。";
  const h = homologizeStillPromptForStore(soup);
  ok("persist strip soup lead", !/^角色参考|严禁复刻/.test(h.prompt), h.prompt.slice(0, 60));
  ok("persist keeps literary", /特写|侧脸/.test(h.prompt), h.prompt);
}

// --- no VLM key → config stop, no fidelity burn signal ---
{
  const d = routeStillRepair({
    vlmErrorCode: VLM_API_KEY_MISSING,
    visualDescription: "特写。沈清漪侧脸。",
    shotSize: "特写",
  });
  ok("no-VLM config route", d.route === "config" && d.nextStep === "chat_repair");
  const debt = routeStillDebtAction({
    vlmErrorCode: VLM_API_KEY_MISSING,
    visualDescription: "特写。沈清漪侧脸。",
  });
  // G0: Key optional — annotate only; do not stop structure/L0 path or fidelity burn budget
  ok(
    "no-VLM key optional annotate",
    debt.kind === "vlm_key_missing" && debt.stopFidelityBurn === false && debt.action === "pass",
    JSON.stringify(debt),
  );
}

// --- import XOR smart split + stale ---
{
  const shots: Record<string, unknown>[] = [
    {
      shotIndex: 1,
      clientId: "s1",
      shotSize: "特写",
      visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠",
    },
  ];
  const meta: Record<string, unknown> = {};
  const hy = runImportLitDebtHygiene({ shots, meta });
  ok("import XOR split", hy.splitCount > 0, JSON.stringify({ split: hy.splitCount, n: shots.length }));
  ok("import shots expanded", shots.length >= 2, String(shots.length));
  const staleKids = shots.filter((s) => s._litXorSplitId && s.promptState === "stale");
  ok("import XOR children stale", staleKids.length >= 1 || shots.some((s) => s.promptState === "stale"), JSON.stringify(shots.map((s) => ({ id: s._litXorSplitId, ps: s.promptState }))));
}

// --- video first_frame rejects XOR dual / sheet ---
{
  const ff = assertStillFirstFrameContract({
    stillPrompt: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠",
    literaryDesc: "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠",
    stillFilePath: "/tmp/x.jpg",
    stillQuality: "hq_ok",
    requireStill: true,
  });
  ok("FF blocks XOR dual", ff.ok === false, JSON.stringify(ff));
}

{
  const ff = assertStillFirstFrameContract({
    stillPrompt: "特写。沈清漪侧脸。",
    literaryDesc: "特写。沈清漪侧脸。",
    stillFilePath: "/tmp/x.jpg",
    stillQuality: "hq_ok",
    sheetLeak: true,
    requireStill: true,
  });
  ok("FF blocks sheetLeak", ff.ok === false && ff.code === "STILL-FIRSTFRAME-WEAK");
}

{
  const lint = lintStillPromptBody({
    prompt: "特写。沈清漪侧脸。正脸朝向镜头。不可读则拆持物镜+反应镜。禁口含；禁纸入口；仅颊触非口含。禁口含；禁纸入口；仅颊触非口含。",
  });
  ok("prompt lint strips flow sentence", !/拆持物镜/.test(lint.prompt), lint.prompt);
  ok("prompt lint strips front-face conflict", !/正脸朝向镜头/.test(lint.prompt), lint.prompt);
}

{
  const ff = assertStillFirstFrameContract({
    stillPrompt: "特写。沈清漪侧脸，休书纸角划过面颊。沈母站立完整立像抢占半幅画面。",
    literaryDesc: "特写。沈清漪侧脸，休书纸角划过面颊。沈母站立。",
    stillFilePath: "/tmp/x.jpg",
    stillQuality: "hq_ok",
    requireStill: true,
  });
  ok("FF blocks secondary dominance", ff.ok === false && ff.sceneDominanceFail === true, JSON.stringify(ff));
}

{
  const contract = deriveGenerationContract({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。",
    shotSize: "特写",
    characterNames: ["沈清漪", "沈母"],
  });
  ok("contract objective contact geom", contract.objectiveClass === "contact_geom", JSON.stringify(contract));
  const ready = assessStillVideoReadiness({
    stillQuality: "hq_ok",
    visualPass: true,
    fidelityItems: [{ id: "contact_geom", pass: true }],
    promptUsed:
      "特写。薄纸角贴合面颊划过触肤，禁止口含/手持卡片挡脸，禁止以外类手持物替代本镜事件道具。纸未入口；仅颊触非口含。",
  });
  ok("i2v readiness pass", ready.i2vReady === true, JSON.stringify(ready));
}

// --- look + wound L0 atoms (design intent survive; cheek-only, no oral XOR) ---
{
  const r = composeStillPrompt({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊，颊侧留浅痕。纸未入口；仅颊触非口含。",
    shotSize: "特写",
    characters: [{ name: "沈清漪", code: "CHAR-C", hasImage: true, kind: "role" }],
    qualityMode: "hq_update",
  });
  ok("wound cheek compose ok", r.ok, r.blockReason);
  ok("wound atom in prompt", /浅痕/.test(String(r.prompt ?? "")), String(r.prompt).slice(0, 100));
  ok("look anchor in prompt", /本镜主look/.test(String(r.prompt ?? "")), String(r.sources));
}

// --- foundation guard: compress must not drop basics ---
{
  const r = composeStillPrompt({
    visualDescription:
      "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。禁口含；禁纸入口。",
    shotSize: "特写",
    characters: [{ name: "沈清漪", code: "CHAR-SHENQINGYI", hasImage: true, kind: "role" }],
    qualityMode: "hq_update",
  });
  ok("foundation compose ok", r.ok, r.blockReason);
  ok("foundation compose keeps mouth xor", /禁口含/.test(String(r.prompt ?? "")), String(r.prompt).slice(0, 120));
  ok("foundation compose contact first", /纸角|贴颊|划过接触|贴合/.test(String(r.prompt ?? "")), String(r.prompt).slice(0, 120));
  ok(
    "foundation compose sources",
    (r.sources ?? []).some((s) => String(s).startsWith("foundation.") || String(s).startsWith("objective.")),
    JSON.stringify(r.sources),
  );
}

{
  const { decideAutoRepairPolicy, slotsAreEnhanceable } =
    require("../src/ruleEngine/quality/autoRepairPolicy") as typeof import("../src/ruleEngine/quality/autoRepairPolicy");
  ok("slots enhanceable contact", slotsAreEnhanceable(["contactGeom", "propInFrame"]));
  const ar = decideAutoRepairPolicy({
    repairIrdPrimaryAction: "hand_edit_vd",
    missingSlots: ["contactGeom", "propInFrame"],
    keyMissing: true,
    fidelityStopReason: "vlm_error",
  });
  ok("autoRepair lit enhanceable allows regen", ar.allowSilentRegen === true, JSON.stringify(ar));
  ok("autoRepair preferLitEnhance", ar.preferLitEnhance === true, JSON.stringify(ar));
  const arKey = decideAutoRepairPolicy({
    keyMissing: true,
    fidelityStopReason: "vlm_error",
    visualPass: false,
  });
  ok("autoRepair keyMissing allows regen", arKey.allowSilentRegen === true, JSON.stringify(arKey));
}

console.log("OK still-norms-scenario-matrix");

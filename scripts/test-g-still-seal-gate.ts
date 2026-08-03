/**
 * Golden: seal gate / non-block / locus whitelist / first-frame handoff / AV enhance L0 latch.
 * yarn test:g-still-seal-gate
 */
import { composeStillPrompt, type ComposeStillContext } from "../src/ruleEngine/compilers/composeStillPrompt";
import {
  assertEgressObeysPrimarySeal,
  classifyStillContamination,
  stillGenerateNonBlockPolicy,
  buildI2vCriticalFactsFromSeal,
} from "../src/ruleEngine/compilers/stillSealGate";
import { extractDeclaredContactLoci } from "../src/ruleEngine/compilers/stillLiteraryDetailQuality";
import { previousBodyHasOffBeatContamination } from "../src/ruleEngine/compilers/stillFirstFrameLiterarySsot";
import { assertStillContactVideoHandoff } from "../src/ruleEngine/qc/stillContactVideoHandoff";
import { assessStillVideoReadiness } from "../src/ruleEngine/qc/stillVideoReadiness";
import { assertStillMouthVideoHandoff } from "../src/ruleEngine/qc/stillMouthVideoHandoff";
import { enhanceStillAvAfterSeal } from "../src/ruleEngine/design/stillAvLlmEnhance";
import { resolveStillPrimaryCta } from "../src/ruleEngine/design/shootableArchitecture";
import { routeSmartRepair } from "../src/ruleEngine/quality/smartRepairActuators";
import { decideAutoRepairPolicy } from "../src/ruleEngine/quality/autoRepairPolicy";
import { resolveStillDebtSemantics } from "../docs/toonflow-web/types/stillQuality";
import { sealPrimaryIntentCarriers } from "../src/ruleEngine/compilers/primaryIntentSeal";
import { deriveDesignIntentProfile, getEgressNegCarveOut } from "../src/ruleEngine/compilers/designIntentProfile";
import { literaryL0Blob } from "../src/ruleEngine/compilers/literaryStillSsot";
import { createHash } from "crypto";
import {
  buildLiteraryFidelityChecklist,
  assertLiteraryFidelity,
} from "../src/ruleEngine/compilers/literaryFidelityChecklist";
import { assertStillDescCoverage } from "../src/ruleEngine/compilers/stillDescCoverage";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const VD = "中景。沈清漪弯腰捡起休书，指尖捏紧纸张边缘，指节泛白，面颊浅痕清晰。";
const IMAGE =
  "古言写实，中景女子弯腰捡起休书，指尖捏紧纸张指节泛白，面颊浅痕，沈母裙摆虚化背景，暖光烛火";

// 1. Costume「含紫袍金绣」must not become contact locus
{
  const loci = extractDeclaredContactLoci(
    `${VD}服装锁定：素白寝衣外披深蓝斗篷，禁止换袍换色或未声明服色（含紫袍金绣等）。休书须与面颊真实贴合/划过（颊触）。`,
  );
  ok("no_locus_紫袍金", !loci.some((l) => /紫袍金/.test(l)), loci.join(","));
}

// 2. Seal gate strips contact zombie head for bend
{
  const dip = deriveDesignIntentProfile({
    visualDescription: VD,
    imagePrompt: IMAGE,
    background: "沈母裙摆",
    shotSize: "MS",
  });
  const seal = sealPrimaryIntentCarriers({ profile: dip, literaryHash: "t1" });
  ok("seal_bend", seal.poseOccupancy === "bend_pickup", seal.poseOccupancy);
  const zombie =
    "接触几何：须与合贴合/划过，禁止纸/物悬空。禁口含。仅合触非口含。须与紫袍金贴合/划过。占位：弯腰捡拾，躯干前倾。中景弯腰捡起休书。正脸朝向镜头且主体不裁切。";
  const gated = assertEgressObeysPrimarySeal({ prompt: zombie, seal });
  ok("no_contact_head", !/^接触几何/.test(gated.prompt.trim()), gated.prompt.slice(0, 80));
  ok("no_紫袍金触", !/紫袍金|须与合贴合|仅合触/.test(gated.prompt), gated.prompt.slice(0, 120));
  ok("has_bend", /弯腰|捡拾/.test(gated.prompt), gated.prompt.slice(0, 80));
  ok("no_face_recipe", !/正脸朝向镜头/.test(gated.prompt), gated.prompt);
  const contam = classifyStillContamination({
    promptUsed: zombie,
    seal,
    composeSources: ["foundation.restore:mustSurvive:contact_geom:合"],
  });
  ok("contam_contact_zombie", contam === "contact_zombie" || contam === "locus_mangled", contam);
}

// 3. True contact seal keeps cheek (not stripped)
{
  const dipC = deriveDesignIntentProfile({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。",
    shotSize: "CU",
  });
  const sealC = sealPrimaryIntentCarriers({ profile: dipC, literaryHash: "t2" });
  const cheek = "接触几何：须与面颊贴合/划过。休书纸角划过面颊。禁口含；禁纸入口；仅颊触非口含。";
  ok("seal_true_contact", sealC.primaryObjective === "contact_geom", sealC.primaryObjective);
  const gatedC = assertEgressObeysPrimarySeal({ prompt: cheek, seal: sealC });
  ok(
    "contact_keeps_cheek",
    /贴合|划过|颊触/.test(gatedC.prompt),
    `${sealC.primaryObjective} ${gatedC.prompt.slice(0, 60)}`,
  );
}

// 4. Non-block generate policy
{
  const pol = stillGenerateNonBlockPolicy({ contaminationClass: "contact_zombie" });
  ok("never_block_generate", pol.blocksGenerate === false);
  ok("blocks_i2v_inherit", pol.blocksI2vInherit === true);
  const cta = resolveStillPrimaryCta({ contaminationClass: "contact_zombie", stillQuality: "weak" });
  ok("cta_continue", cta.blocksGenerate === false && /动作主导|继续|修复/.test(cta.label), cta.label);
  const ctaBeat = resolveStillPrimaryCta({ contaminationClass: "off_beat_cu", stillQuality: "weak" });
  ok("cta_off_beat", ctaBeat.blocksGenerate === false && /本拍隔离/.test(ctaBeat.label), ctaBeat.label);
}

// 5. previous hold-card / blood vs bend
ok(
  "prev_blood_offbeat",
  previousBodyHasOffBeatContamination("沈清漪渗出血珠，胸前手持卡片", VD),
);

// 6. compose egress head + sources
{
  const ctx: ComposeStillContext = {
    visualDescription: VD,
    compiledImagePrompt: IMAGE,
    shotSize: "中景",
    background: "沈母裙摆",
    characters: [{ name: "沈清漪", code: "CHAR-C", hasImage: true, kind: "role" }],
    qualityMode: "hq_update",
    previousVisualBody:
      "接触几何：须与面颊贴合/划过。沈清漪渗出血珠。特写咬唇。服装锁定：素白（含紫袍金绣等）",
    hasSceneLink: true,
  };
  const r = composeStillPrompt(ctx as ComposeStillContext, { mode: "full" });
  ok("compose_ok_nonblock", r.ok === true || Boolean(r.prompt), String(r.blockReason));
  const head = String(r.prompt ?? "").slice(0, 100);
  ok("compose_no_contact_zombie_head", !/^接触几何/.test(head.trim()), head);
  ok("compose_has_bend", /弯腰|捡拾|捡起/.test(String(r.prompt)), String(r.prompt).slice(0, 120));
  ok(
    "compose_no_紫袍金",
    !/须与紫袍金|仅紫袍金触/.test(String(r.prompt)),
    String(r.prompt).match(/紫袍金.{0,20}/)?.[0] ?? "ok",
  );
}

// 7. First-frame handoff blocks on contam; readiness draft
{
  const handoff = assertStillContactVideoHandoff({
    visualDescription: VD,
    stillPrompt: "弯腰捡起休书",
    stillMeta: { contaminationClass: "contact_zombie", deliveryTier: "draft", stillQuality: "weak" },
    stillQuality: "weak",
  });
  ok("handoff_block_contam", handoff.ok === false && handoff.severity === "BLOCK", handoff.message);
  const ready = assessStillVideoReadiness({
    stillQuality: "hq_ok",
    visualPass: true,
    promptUsed: "弯腰捡起休书",
    stillMeta: { contaminationClass: "contact_zombie", deliveryTier: "draft" },
  });
  ok("i2v_not_ready_contam", ready.i2vReady === false, ready.reason);
}

// 8. AV enhance does not reseal L0
{
  const dip = deriveDesignIntentProfile({ visualDescription: VD, imagePrompt: IMAGE, background: "裙摆" });
  const seal = sealPrimaryIntentCarriers({ profile: dip, literaryHash: "t3" });
  const enh = enhanceStillAvAfterSeal({
    seal,
    hasSkirtFragment: true,
    atmosphere: "烛火",
    llmLines: ["占位：跪坐持物，躯干稳定", "气氛保留：烛火", "背景仅次角裙摆虚化"],
    enableLlm: true,
  });
  ok("llm_drops_kneel", !enh.stillLines.some((l) => /跪坐/.test(l)), enh.stillLines.join("|"));
  ok("llm_keeps_atm", enh.stillLines.some((l) => /气氛|裙摆|烛/.test(l)), enh.stillLines.join("|"));
  ok("seal_still_bend", seal.poseOccupancy === "bend_pickup");
}

// 9. critical facts + carve-out
{
  const dip = deriveDesignIntentProfile({ visualDescription: VD, imagePrompt: IMAGE });
  const seal = sealPrimaryIntentCarriers({ profile: dip, literaryHash: "t4" });
  const facts = buildI2vCriticalFactsFromSeal(seal);
  ok("critical_facts", facts.some((f) => /弯腰|捡拾|主手/.test(f)), facts.join("|"));
  const carve = getEgressNegCarveOut("bend_pickup");
  ok("carve_hold_card", carve.some((c) => /手持卡片|举卡|胸前/.test(c)), carve.join("|"));
}

// 10. modality handoff: mouth closed∩strong lip ≠ false green; after strengthen → BLOCK
{
  const soft = assertStillMouthVideoHandoff({
    stillPrompt: "抿嘴闭口，神情冷淡",
    videoPrompt: "natural mouth movement for dialogue lip-sync",
    hasDialogue: true,
  });
  ok("mouth_soft_not_ok", soft.ok === false && soft.severity === "soft_patch", soft.severity);
  const hard = assertStillMouthVideoHandoff({
    stillPrompt: "抿嘴闭口，神情冷淡",
    videoPrompt: "natural mouth movement for dialogue lip-sync",
    hasDialogue: true,
    afterStrengthen: true,
  });
  ok("mouth_after_strengthen_block", hard.ok === false && hard.severity === "BLOCK", hard.severity);
}

// 11. composition in L0 hash; contam smartRepair routes
{
  const base = literaryL0Blob({ visualDescription: VD, compiledImagePrompt: IMAGE, background: "裙摆" });
  const withFg = literaryL0Blob({
    visualDescription: VD,
    compiledImagePrompt: IMAGE,
    background: "裙摆",
    foreground: "休书在地",
    spatialRelation: "主体前倾近地",
  });
  ok("l0_composition_shifts_hash", base !== withFg);
  const h1 = createHash("sha256").update(base).digest("hex").slice(0, 16);
  const h2 = createHash("sha256").update(withFg).digest("hex").slice(0, 16);
  ok("l0_hash_diff", h1 !== h2);
  const zombieRoute = routeSmartRepair("contact_zombie");
  ok(
    "smart_repair_contact_zombie",
    Boolean(zombieRoute?.actuators.includes("compose_regen")),
    String(zombieRoute?.actuators),
  );
  const beatRoute = routeSmartRepair("off_beat_cu");
  ok(
    "smart_repair_off_beat",
    Boolean(beatRoute?.actuators.includes("compose_regen")),
    String(beatRoute?.actuators),
  );

  const ar = decideAutoRepairPolicy({ contaminationClass: "contact_zombie", round: 1 });
  ok("auto_repair_contam_compose", ar.autoRepairStage === "compose_regen", ar.autoRepairStage);
  const fe = resolveStillDebtSemantics({ contaminationClass: "off_beat_cu", beatIsolationFailed: true });
  ok("fe_cta_off_beat", /本拍隔离/.test(fe.ctaLabel), fe.ctaLabel);
  const { deriveFailureCluster } = require("../src/ruleEngine/quality/failureClusterLibrary");
  const cl = deriveFailureCluster({
    promptUsed: "接触几何汤",
    visualDescription: VD,
    stillQuality: "weak",
    contaminationClass: "contact_zombie",
  });
  ok("cluster_contact_zombie", cl?.kind === "action_misfire", String(cl?.kind));
  const clBeat = deriveFailureCluster({
    stillQuality: "weak",
    contaminationClass: "off_beat_cu",
  });
  ok("cluster_off_beat", clBeat?.kind === "off_beat_contam", String(clBeat?.kind));
}

// 12. bend: wound soft; cheek not hard coverage; egress strips 颊触
{
  const items = buildLiteraryFidelityChecklist({
    description: VD + "面颊浅痕清晰。休书须与面颊真实贴合/划过（颊触）。",
    shotSize: "MS",
  });
  const wound = items.find((i) => i.id === "lit:wound_visible");
  ok("wound_soft_under_bend", Boolean(wound?.soft), String(wound?.soft));
  const cheekGeom = items.find((i) => /^contact_geom:/.test(i.id));
  ok("no_hard_cheek_geom_under_bend", !cheekGeom, cheekGeom?.id);
  const cov = assertStillDescCoverage({
    prompt: "占位：弯腰捡拾，纸在主手触地。休书入画。",
    description: VD + "面颊浅痕。",
    shotSize: "中景",
  });
  ok("coverage_ok_without_wound_token", cov.ok || !cov.missing.includes("lit:wound_visible"), cov.missing.join(","));
  const zombieCheek =
    "占位：弯腰捡拾。休书须与面颊真实贴合/划过（颊触）。指尖捏紧。";
  const dip = deriveDesignIntentProfile({ visualDescription: VD, imagePrompt: IMAGE });
  const seal = sealPrimaryIntentCarriers({ profile: dip, literaryHash: "t5" });
  const gated = assertEgressObeysPrimarySeal({ prompt: zombieCheek, seal });
  ok("strip_paren_颊触", !/颊触|真实贴合/.test(gated.prompt), gated.prompt);
  const leads = (() => {
    const { designIntentEgressSplit } = require("../src/ruleEngine/compilers/designIntentProfile");
    return designIntentEgressSplit(dip).positiveLeads.join("|");
  })();
  ok("bend_lead_触地", /触地|弯腰|捡拾/.test(leads), leads.slice(0, 80));
}


console.log("ALL PASS test-g-still-seal-gate");
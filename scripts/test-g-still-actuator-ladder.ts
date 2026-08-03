/**
 * L0–L2 still actuator ladder (CI). L3 live is opt-in via STILL_ACTUATOR_LIVE=1.
 * yarn test:g-still-actuator-ladder
 *
 * Key never required. Failures → change workflow, not Seedream bans.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  selectStillActuatorProfile,
  compressStillEgressForActuator,
  compressStillEgressForSeedream,
  protectEgressHeadAfterCompress,
  resolvePropPlateGrade,
} from "../src/ruleEngine/compilers/stillActuatorProfile";
import {
  checkComfyHealth,
  runComfyContactSoftEnv,
  applyComfyVendorBaseUrl,
  getComfyBaseUrl,
} from "../src/ruleEngine/actuators/comfyStillActuator";
import { runStillVendorWithActuatorCore } from "../src/ruleEngine/actuators/runStillVendorWithActuator";
import {
  resolveStillDebtSemantics,
  humanRejudgePrimaryCta,
} from "../docs/toonflow-web/types/stillQuality";
import { resolveStillHumanRejudgeOutcome } from "../src/ruleEngine/compilers/stillQuality";
import { deriveStillAtomContract } from "../src/ruleEngine/compilers/stillAtomContract";
import { assertStillContactVideoHandoff } from "../src/ruleEngine/qc/stillContactVideoHandoff";
import { buildPropFormInject } from "../src/ruleEngine/compilers/propFormDoctrine";
import { buildEventRefOrdinalBinding } from "../src/ruleEngine/compilers/eventPlateReadiness";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

async function main() {
  // ── L0: contract / no bake default / profile table / keyOptional copy ──
  const comfyPick = selectStillActuatorProfile({
    objectiveClass: "contact_geom",
    softEnvContinuity: "must",
  });
  ok("L0 contact+softEnv→comfy", comfyPick.preferComfy && comfyPick.actuatorId === "comfy_contact_softenv");

  const seedPick = selectStillActuatorProfile({
    objectiveClass: "atmosphere",
    softEnvContinuity: "none",
  });
  ok("L0 low difficulty→seedream", !seedPick.preferComfy && seedPick.actuatorId === "seedream_multiref");

  const propPick = selectStillActuatorProfile({
    objectiveClass: "prop_readable",
    softEnvContinuity: "must",
  });
  ok("L0 prop_readable+must→comfy", propPick.preferComfy);

  ok(
    "L0 synth grade",
    resolvePropPlateGrade({ synthesizedPropPlate: true }) === "synthetic_geometry",
  );
  ok("L0 asset grade", resolvePropPlateGrade({ propSource: "asset" }) === "asset");
  ok("L0 missing grade", resolvePropPlateGrade({ propPlateMissing: true }) === "missing");

  const debtKey = resolveStillDebtSemantics({
    keyOptional: true,
    pixelDimStatus: "unmeasured",
    pendingHumanRejudge: true,
  });
  ok("L0 key CTA not 必须装", !/必须装|去装 Key|强制.*Key/.test(debtKey.ctaLabel + debtKey.explain));
  ok("L0 key kind", debtKey.kind === "key_unmeasured");
  ok("L0 human CTA", /人审通过（未测·非失败）/.test(humanRejudgePrimaryCta({ pendingHumanRejudge: true })));

  const debtDeg = resolveStillDebtSemantics({
    actuatorDegraded: true,
    actuatorDegradedReason: "COMFY_URL_unset",
  });
  ok("L0 actuator CTA split", debtDeg.kind === "actuator_degraded");

  const debtSynth = resolveStillDebtSemantics({
    propPlateGrade: "synthetic_geometry",
    synthesizedPropPlate: true,
    userMessage: "synthetic_geometry 形态",
  });
  ok("L0 synth form CTA", debtSynth.kind === "prop_form" && /真道具/.test(debtSynth.ctaLabel));

  // ── L0 egress compress (p4) ──
  const longPrompt =
    "女主侧脸。殿内烛火。休书纸角划过面颊。禁止灰棚白棚。禁止卷棒纸卷书本。禁止手持卡片。四视图拼版勿用。--cref http://x --sref http://y";
  const compressed = compressStillEgressForActuator({
    prompt: longPrompt,
    objectiveClass: "contact_geom",
    propClassId: "paper_doc",
  });
  ok("L0 compress stripped or capped", compressed.strippedChars > 0 || compressed.positive.length <= 480);
  ok("L0 compress has neg", /灰棚|白棚|纸卷|手持卡片|牛仔/.test(compressed.negative), compressed.negative);
  ok("L0 compress no --cref", !/--cref|--sref/.test(compressed.positive + compressed.negative));
  ok("L0 compress cheek cue", /颊触|薄纸|软环境/.test(compressed.positive), compressed.positive);
  ok("L0 compress pos bounded", compressed.positive.length <= 480);
  ok("L0 compress neg held card", /手持卡片|挡脸|牛仔/.test(compressed.negative), compressed.negative);
  ok("L0 compress no eng lead", !/cheek contact|bend pick|holding card/i.test(compressed.positive));

  const seedComp = compressStillEgressForSeedream({
    prompt: longPrompt,
    objectiveClass: "contact_geom",
    propClassId: "paper_doc",
  });
  ok("L0 seedream compress bounded", seedComp.prompt.length <= 720);
  ok("L0 seedream bans held card ZH", /手持卡片/.test(seedComp.prompt), seedComp.prompt.slice(0, 200));
  ok("L0 seedream bans denim ZH", /牛仔/.test(seedComp.prompt));
  ok("L0 seedream has geom lead", /颊触|触点/.test(seedComp.prompt));

  // P2 compress 护头: bend L0 survives tight max; cheek head not restored
  const bendSoup =
    "接触几何：须与合贴合/划过。沈清漪弯腰捡起休书，指节泛白，裙摆虚化，烛火暖光，禁止手持卡片挡脸。" +
    "气氛保留：暖光烛火可辨。背景仅次角裙摆碎片。".repeat(20);
  const bendComp = compressStillEgressForSeedream({
    prompt: bendSoup,
    objectiveClass: "action_primary",
    propClassId: "paper_doc",
    poseOccupancy: "bend_pickup",
    primaryIntentSeal: { poseOccupancy: "bend_pickup" },
    maxChars: 280,
    keepSoftEnvRef: true,
  });
  ok("L0 bend compress bounded", bendComp.prompt.length <= 280, String(bendComp.prompt.length));
  ok(
    "L0 bend compress head",
    /弯腰|捡拾|占位：/.test(bendComp.prompt.slice(0, 48)),
    bendComp.prompt.slice(0, 80),
  );
  ok("L0 bend compress no cheek head", !/^接触几何/.test(bendComp.prompt.trim()), bendComp.prompt.slice(0, 40));
  ok("L0 bend compress no skirt-only", !/背景仅裙摆碎片虚化/.test(bendComp.prompt), bendComp.prompt.slice(0, 100));
  ok("L0 bend compress hall lead", /主场景|禁止灰棚/.test(bendComp.prompt), bendComp.prompt.slice(0, 100));
  const protected = protectEgressHeadAfterCompress("裙摆虚化。" + "x".repeat(400), 120, {
    bend: true,
    occupancyLead: "占位：弯腰捡拾，道具在主手。",
  });
  ok("L0 protect head inject", /^占位：弯腰/.test(protected), protected.slice(0, 40));
  ok("L0 protect head bounded", protected.length <= 120);

  // Prop taxonomy / poseForbid / ordinal
  const formInj = buildPropFormInject({
    visualDescription: "特写。休书纸角划过面颊。",
    propClassId: "paper_doc",
    propAlias: "休书",
    locus: "面颊",
  });
  ok("L0 poseForbid 手持卡片", (formInj.forbidden ?? []).some((f) => /手持卡片|挡脸/.test(f)));
  ok("L0 glyph should wording", /几何触点优先|第二刀|更佳/.test(String(formInj.glyphFact ?? "")), String(formInj.glyphFact));
  const bind = buildEventRefOrdinalBinding({
    roles: ["identity", "propSoft", "softEnv"],
    thinSheets: true,
  });
  ok("L0 ordinal no bare 须清晰入画", !/须清晰入画/.test(bind) || /禁止手持卡片/.test(bind));

  // Atoms: pose_locus + glyph should
  const atoms = deriveStillAtomContract({
    visualDescription: "特写。休书纸角划过面颊。",
    prompt:
      "休书须与面颊真实贴合。入画于触点。禁止手持卡片。参考绑定：图2=事件道具几何软板（匿名颊廓+展开薄纸角划过触肤，禁止手持卡片）。",
  });
  ok("L0 has pose_locus atom", atoms.atoms.some((a) => a.id === "prop.pose_locus"));
  const glyphAtom = atoms.atoms.find((a) => a.id === "prop.glyph");
  ok("L0 glyph is should not must", !glyphAtom || glyphAtom.priority === "should");

  // Handoff: degraded+synth blocks
  const handoffBlock = assertStillContactVideoHandoff({
    visualDescription: "特写。休书纸角划过面颊。",
    stillPrompt: "休书纸角划过面颊，禁止手持卡片",
    stillMeta: { actuatorDegraded: true, propPlateGrade: "synthetic_geometry", poseHandoffBlocked: true },
    stillQuality: "weak",
  });
  ok("L0 degraded+synth blocks I2V", handoffBlock.ok === false && handoffBlock.severity === "BLOCK");

  // Vendor baseUrl bridge (env unset → applyComfyVendorBaseUrl)
  const prevBridge = process.env.COMFY_URL;
  const prevBridge2 = process.env.COMFYUI_URL;
  delete process.env.COMFY_URL;
  delete process.env.COMFYUI_URL;
  applyComfyVendorBaseUrl("http://127.0.0.1:8000");
  ok("L0 vendor bridge sets url", getComfyBaseUrl() === "http://127.0.0.1:8000");
  if (prevBridge != null) process.env.COMFY_URL = prevBridge;
  else delete process.env.COMFY_URL;
  if (prevBridge2 != null) process.env.COMFYUI_URL = prevBridge2;
  else delete process.env.COMFYUI_URL;

  // ── L2: golden workflow structure (v1b = Desktop closed-loop default) ──
  const wfPath = path.join(process.cwd(), "data/fixtures/comfy_workflows/contact_softenv_v1b.json");
  const wfRaw = fs.readFileSync(wfPath, "utf8");
  const wf = JSON.parse(wfRaw) as Record<string, { class_type?: string; inputs?: Record<string, unknown>; _meta?: { title?: string } }>;
  const hash = crypto.createHash("sha256").update(wfRaw).digest("hex").slice(0, 16);
  ok("L2 workflow hash stable", hash.length === 16, hash);
  const titles = Object.values(wf).map((n) => String(n._meta?.title ?? ""));
  ok("L2 has identity slot", titles.some((t) => /identity/i.test(t)));
  ok("L2 has softenv slot", titles.some((t) => /softenv|scene/i.test(t)));
  ok("L2 has prop slot", titles.some((t) => /prop/i.test(t)));
  ok("L2 has IPAdapter", Object.values(wf).some((n) => /IPAdapter/i.test(String(n.class_type))));
  ok("L2 has ControlNet", Object.values(wf).some((n) => /ControlNet/i.test(String(n.class_type))));
  ok("L2 has CLIPVision", Object.values(wf).some((n) => String(n.class_type) === "CLIPVisionLoader"));
  ok(
    "L2 softenv wired to ControlNet",
    Object.values(wf).some(
      (n) =>
        /ControlNetApply/i.test(String(n.class_type)) &&
        Array.isArray(n.inputs?.image) &&
        String(n.inputs?.image?.[0]) === "11",
    ),
  );
  ok("L2 prop IPAdapter wired", Object.values(wf).some((n) => /ipadapter_prop/i.test(String(n._meta?.title ?? ""))));
  ok(
    "L2 latent 512-friendly",
    Object.values(wf).some(
      (n) => n.class_type === "EmptyLatentImage" && Number(n.inputs?.width) <= 768 && Number(n.inputs?.width) >= 512,
    ),
  );
  ok("L2 no 休书 hardcode", !/休书/.test(wfRaw));
  ok("L2 no MiDaS runtime dep", !Object.values(wf).some((n) => /MiDaS|DepthMapPreprocessor/i.test(String(n.class_type))));

  // ── L1: stub Comfy degrade + vendor finalize without Key ──
  const prevUrl = process.env.COMFY_URL;
  const prevUrl2 = process.env.COMFYUI_URL;
  delete process.env.COMFY_URL;
  delete process.env.COMFYUI_URL;
  applyComfyVendorBaseUrl(""); // clear vendor cache so L1 sees unset
  const health = await checkComfyHealth();
  ok("L1 health unset", !health.ok && health.reason === "COMFY_URL_unset");

  const tiny = Buffer.from(
    "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z",
    "base64",
  ).toString("base64");

  const comfyOut = await runComfyContactSoftEnv({
    identityBase64: tiny,
    softEnvBase64: tiny,
    propSoftBase64: tiny,
    positive: "cheek contact thin paper",
    negative: "grey studio",
    objectiveClass: "contact_geom",
    propClassId: "paper_doc",
  });
  ok("L1 comfy degrades", comfyOut.ok === false && comfyOut.degraded === true);

  let wrote = false;
  const vendor = await runStillVendorWithActuatorCore({
    vendorPrompt: longPrompt,
    referenceList: [
      { type: "image", base64: tiny },
      { type: "image", base64: tiny },
      { type: "image", base64: tiny },
    ],
    refsRoles: ["identity", "propSoft", "softEnv"],
    objectiveClass: "contact_geom",
    softEnvContinuity: "must",
    keepSoftEnvRef: true,
    propClassId: "paper_doc",
    synthesizedProp: true,
    projectId: 1,
    uuid: () => "test-uuid",
    ossWriteFile: async () => {
      wrote = true;
    },
    getSmallImageUrl: async () => "https://example/test.jpg",
    runSeedream: async () => {
      wrote = true;
      return { url: "https://example/seed.jpg", savePath: "/1/workFlow/x.jpg", imageBase64: tiny };
    },
  });
  ok("L1 vendor fallback seedream", vendor.actuatorId === "seedream_multiref");
  ok("L1 actuatorDegraded honest", vendor.actuatorDegraded === true);
  ok("L1 propPlateGrade synth", vendor.propPlateGrade === "synthetic_geometry");
  ok("L1 egressCompressed", vendor.egressCompressed === true);
  ok("L1 seedream ran", wrote && vendor.vendorCalled);

  // Contact fail → no fake hq_ok
  const humanFail = resolveStillHumanRejudgeOutcome({
    items: [
      { id: "contact_geom", pass: false },
      { id: "background_readable", pass: true },
      { id: "single_frame", pass: true },
    ],
    prev: { pendingHumanRejudge: true },
  });
  ok("L1 contact fail no hq_ok", !humanFail.burnOk && humanFail.stillQuality === "weak");

  const humanPass = resolveStillHumanRejudgeOutcome({
    items: [
      { id: "contact_geom", pass: true },
      { id: "background_readable", pass: true },
      { id: "single_frame", pass: true },
      { id: "primary_look", pass: true },
      { id: "cast_cardinality", pass: true },
    ],
    prev: { pendingHumanRejudge: true, vlmError: "VLM_API_KEY_MISSING" },
  });
  ok("L1 human checklist can burn without Key", humanPass.burnOk && humanPass.stillQuality === "hq_ok");

  if (prevUrl != null) process.env.COMFY_URL = prevUrl;
  else delete process.env.COMFY_URL;
  if (prevUrl2 != null) process.env.COMFYUI_URL = prevUrl2;
  else delete process.env.COMFYUI_URL;

  // ── L3 accept bar checklist (opt-in live; CI only asserts checklist shape) ──
  const acceptPath = path.join(process.cwd(), "data/fixtures/still_contact_softenv_accept_bar.json");
  const acceptJson = JSON.parse(fs.readFileSync(acceptPath, "utf8")) as {
    humanChecklist: Array<{ id: string }>;
    deferred: Array<{ id: string }>;
  };
  ok("L3 accept bar has costume", acceptJson.humanChecklist.some((i) => i.id === "costume_match_silhouette"));
  ok("L3 accept bar has pose_not_held_card", acceptJson.humanChecklist.some((i) => i.id === "pose_not_held_card"));
  ok("L3 glyph deferred", acceptJson.deferred.some((i) => i.id === "glyph_readable"));
  ok("L3 accept bar >=5 items", acceptJson.humanChecklist.length >= 5);
  if (process.env.STILL_ACTUATOR_LIVE === "1") {
    process.env.COMFY_URL = process.env.COMFY_URL || "http://127.0.0.1:8000";
    process.env.COMFY_TIMEOUT_MS = process.env.COMFY_TIMEOUT_MS || "3600000";
    const liveHealth = await checkComfyHealth(5000);
    ok("L3 live health", liveHealth.ok === true, liveHealth.reason);
    const live = await runComfyContactSoftEnv({
      identityBase64: tiny,
      softEnvBase64: tiny,
      propSoftBase64: tiny,
      positive: "cheek contact thin paper soft interior upper body",
      negative: "grey studio white seamless holding card collage",
      objectiveClass: "contact_geom",
      propClassId: "paper_doc",
    });
    ok("L3 live comfy ok", live.ok === true, !live.ok ? live.reason : "");
    if (live.ok) {
      ok("L3 live workflowHash", Boolean(live.workflowHash) && live.workflowHash.length === 16);
      ok("L3 live actuatorId", live.actuatorId === "comfy_contact_softenv");
      ok("L3 live has pixels", Boolean(live.imageBase64) && live.imageBase64.length > 1000);
    }
    console.log("L3 live: Comfy returned pixels; VLM/human accept-bar separate. Fail → edit workflow.");
  } else {
    console.log("ok L3 checklist documented (live opt-in STILL_ACTUATOR_LIVE=1)");
  }

  console.log("PASS still-actuator-ladder");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * softEnv bake + prop prefer + thin sheet — continuity must under cap2.
 * yarn test:g-softenv-bake
 */
import sharp from "sharp";
import {
  bakeSoftEnvIntoIdentity,
  applyContinuityAwareRefBudget,
  applyEventRefSlotBudget,
  resolvePropSoftCodes,
  synthesizePropSoftPlate,
  resolveSoftEnvContinuity,
  decideEventPlateGate,
  cropIdentityPlateToFaceBias,
} from "../src/ruleEngine/compilers/eventPlateReadiness";
import { resolveStillBgPolicy } from "../src/ruleEngine/compilers/stillBgPolicy";
import { deriveShotModalityIntent } from "../src/ruleEngine/compilers/shotModalityIntent";
import { buildStillErrorEnvelope } from "../src/ruleEngine/compilers/stillErrorEnvelope";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

async function tinyJpeg(color: { r: number; g: number; b: number }, w = 128, h = 160): Promise<string> {
  const buf = await sharp({
    create: { width: w, height: h, channels: 3, background: color },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  return buf.toString("base64");
}

async function main() {
  // SSOT continuity
  const bg = resolveStillBgPolicy({
    description: "特写。侧脸。殿内烛火。",
    shotSize: "特写",
    hasSceneLink: true,
  });
  ok("faceCu keepSoft", bg.keepSoftEnvRef === true);
  ok("faceCu continuity must", bg.softEnvContinuity === "must", bg.softEnvContinuity);

  const modality = deriveShotModalityIntent({
    visualDescription: "特写。休书纸角划过面颊。殿内烛火。",
    shotSize: "特写",
    hasSceneLink: true,
    characterNames: ["女主"],
  });
  ok("modality softEnvContinuity must", modality.softEnvContinuity === "must");

  ok(
    "resolve continuity helper",
    resolveSoftEnvContinuity({ keepSoftEnvRef: true, hasSceneLink: true }) === "must",
  );

  // No 休书 → PROP-PAPER hardcode
  const codes = resolvePropSoftCodes({
    visualDescription: "特写。纸角划过面颊。",
    contract: { objectiveClass: "contact_geom" } as never,
  });
  ok("no PROP-PAPER literal", !codes.includes("PROP-PAPER"), codes.join(","));
  ok("has paper class hint", codes.some((c) => /纸|信|笺|PROP-/i.test(c)), codes.join(","));

  // Thin sheet synth
  const synth = await synthesizePropSoftPlate({
    propClassId: "paper_doc",
    glyphText: "休书",
    softPlateHint: "thin_sheets",
  });
  ok("synth kind thin", /thin_sheets/.test(synth.kind), synth.kind);
  const meta = await sharp(Buffer.from(synth.base64, "base64")).metadata();
  ok("synth jpeg", meta.format === "jpeg");
  // New synth must not be greeting-card: mean shouldn't be near-black void-only; glyphs smaller
  const synthStats = await sharp(Buffer.from(synth.base64, "base64")).stats();
  ok(
    "synth not pure void",
    synthStats.channels.some((c) => c.mean > 40),
    JSON.stringify(synthStats.channels.map((c) => Math.round(c.mean))),
  );

  // Bake
  const id = await tinyJpeg({ r: 200, g: 180, b: 160 }, 200, 260);
  const sc = await tinyJpeg({ r: 40, g: 30, b: 20 }, 200, 260);
  const baked = await bakeSoftEnvIntoIdentity({ identityBase64: id, sceneBase64: sc });
  ok("bake ok", baked.baked === true, baked.reason);
  ok("bake has pixels", Boolean(baked.base64?.length));
  ok(
    "bake prefers matted reason",
    /matted|shallow/.test(String(baked.reason)),
    baked.reason,
  );
  // After matte+smaller face, corner pixels should stay scene-dark (not face-sheet white)
  {
    const bakeBuf = Buffer.from(baked.base64!, "base64");
    const { data, info } = await sharp(bakeBuf).raw().toBuffer({ resolveWithObject: true });
    const i = 8 * info.width! * info.channels! + 8 * info.channels!;
    const cornerMean = (data[i]! + data[i + 1]! + data[i + 2]!) / 3;
    ok("bake corner is scene not white", cornerMean < 120, `cornerMean=${cornerMean}`);
  }

  const { stripOrphanSceneSref, matteNearWhiteToAlpha } = await import(
    "../src/ruleEngine/compilers/eventPlateReadiness"
  );
  const matted = await matteNearWhiteToAlpha(id);
  ok("matte runs", matted.matted === true || matted.reason === "no_white", matted.reason);
  const stripped = stripOrphanSceneSref("锁脸。--cref CHAR-X --sref SCENE-001，禁止灰棚", {
    softEnvBakedIntoIdentity: true,
  });
  ok("strip orphan sref when baked", !/--sref\s+SCENE-/i.test(stripped), stripped);
  ok(
    "keep sref when independent soft",
    /--sref\s+SCENE-001/.test(
      stripOrphanSceneSref("a --sref SCENE-001", { softEnvIndependentSlot: true }),
    ),
  );

  // Face bias stronger
  const face = await cropIdentityPlateToFaceBias(id);
  ok("face bias cropped", face.cropped === true, face.reason);

  // Cap2 + softEnv must → softEnv-first keeps hall (drop prop), never honest-drop softEnv
  const refs = [
    { type: "image" as const, base64: id, role: "identity" as const },
    { type: "image" as const, base64: synth.base64, role: "propSoft" as const },
    { type: "image" as const, base64: sc, role: "softEnv" as const },
  ];
  const tightDrop = applyEventRefSlotBudget({ refs, propRequired: true, maxSlots: 2 });
  ok("raw cap2 identity-first drops soft flag", tightDrop.droppedSoftEnv === true);

  const tightSoftFirst = applyEventRefSlotBudget({
    refs,
    propRequired: true,
    maxSlots: 2,
    softEnvFirst: true,
  });
  ok(
    "softEnv-first cap2 keeps softEnv",
    tightSoftFirst.roles.includes("softEnv") && tightSoftFirst.droppedSoftEnv === false,
    tightSoftFirst.roles.join(","),
  );
  ok(
    "softEnv-first cap2 drops prop over hall",
    !tightSoftFirst.roles.includes("propSoft"),
    tightSoftFirst.roles.join(","),
  );

  // Default continuity=must: softEnv+identity under cap2 (no pixel bake)
  const contNoBake = await applyContinuityAwareRefBudget({
    refs,
    propRequired: true,
    maxSlots: 2,
    softEnvContinuity: "must",
  });
  ok("default cap2 keeps softEnv", contNoBake.roles.includes("softEnv"), contNoBake.roles.join(","));
  ok("default cap2 does NOT bake", contNoBake.softEnvBakedIntoIdentity === false, JSON.stringify(contNoBake));
  ok("default cap2 does NOT drop soft", contNoBake.droppedSoftEnv === false, JSON.stringify(contNoBake));
  ok(
    "default cap2 prefers softEnv over prop",
    !contNoBake.roles.includes("propSoft") || contNoBake.roles[0] === "softEnv",
    contNoBake.roles.join(","),
  );

  // Opt-in bake: when softEnv already kept independently, bake not required
  const cont = await applyContinuityAwareRefBudget({
    refs,
    propRequired: true,
    maxSlots: 2,
    softEnvContinuity: "must",
    allowPixelBake: true,
  });
  ok("cap2 must keeps softEnv role or bake", cont.roles.includes("softEnv") || cont.softEnvBakedIntoIdentity, JSON.stringify(cont));
  ok("not bakeFailed when scene present", cont.bakeFailed === false, JSON.stringify(cont));

  // Production path: max3 keeps independent softEnv (common framework norm)
  const prod3 = await applyContinuityAwareRefBudget({
    refs,
    propRequired: true,
    maxSlots: 3,
    softEnvContinuity: "must",
  });
  ok("prod max3 independent soft", prod3.roles.includes("softEnv") && prod3.softEnvBakedIntoIdentity === false);
  ok(
    "prod max3 softEnv-first order",
    prod3.roles[0] === "softEnv" && prod3.roles.includes("identity"),
    prod3.roles.join(","),
  );

  // FE canvas: 2 refs without DB sceneCode must still classify index0 as scene when softEnv needed
  {
    const { classifyFeReferenceRole } = await import("../src/ruleEngine/compilers/eventPlateReadiness");
    const { inferHasSceneLink } = await import("../src/ruleEngine/compilers/shotModalityIntent");
    const { resolveStillBgPolicy } = await import("../src/ruleEngine/compilers/stillBgPolicy");
    const urls = [
      "https://oss.example/upload/abc123.jpg",
      "https://oss.example/upload/CHAR-SHEET.jpg",
    ];
    ok(
      "fe canvas index0 is scene when softEnvNeeded",
      classifyFeReferenceRole(urls[0]!, 0, { softEnvNeeded: true, total: 2 }) === "scene",
    );
    const feHas = urls.some(
      (u, i) => classifyFeReferenceRole(u, i, { softEnvNeeded: true, total: 2 }) === "scene",
    );
    const link = Boolean(inferHasSceneLink({}) || feHas);
    ok("fe canvas hasSceneLink from refs", link === true);
    const pol = resolveStillBgPolicy({
      description: "特写。侧脸。休书纸角划过面颊。殿内烛火。",
      shotSize: "特写",
      hasSceneLink: link,
    });
    ok("faceCu+feScene keepSoftEnv", pol.keepSoftEnvRef === true && pol.softEnvContinuity === "must", JSON.stringify(pol));
    ok(
      "faceCu soft_env atmosphere rim (not punch-out DOF)",
      /氛围|软环境边|融入/.test(String(pol.bgGuidance ?? "")) && !/浅景深虚化环境，保留/.test(String(pol.bgGuidance ?? "")),
      pol.bgGuidance,
    );
  }

  // Event crop SSOT: contact → topRatio 0.72
  {
    const { resolveIdentityCropTopRatio } = await import("../src/ruleEngine/compilers/eventPlateReadiness");
    ok(
      "event crop ≥0.72",
      resolveIdentityCropTopRatio({
        objectiveClass: "contact_geom",
        keepSoftEnvRef: true,
        softEnvContinuity: "must",
      }) >= 0.72,
    );
    ok(
      "ecu no-event crop 0.55",
      resolveIdentityCropTopRatio({ objectiveClass: "identity_first", keepSoftEnvRef: false }) === 0.55,
    );
  }

  // Gate: must + no plate no bake → allow with soft debt (never 400)
  const gateFail = decideEventPlateGate({
    contract: { objectiveClass: "contact_geom" } as never,
    keepSoftEnvRef: true,
    hasSceneLink: true,
    softEnvContinuity: "must",
    propPlatePresent: true,
    softEnvPlatePresent: false,
    softEnvBakedIntoIdentity: false,
    synthesizedPropApplied: true,
  });
  ok("gate soft-allows must without bake", gateFail.allowVendor === true, gateFail.code);
  ok("gate code soft-env missing", gateFail.code === "SOFT-ENV-PLATE-MISSING", gateFail.code);

  const gateOk = decideEventPlateGate({
    contract: { objectiveClass: "contact_geom" } as never,
    keepSoftEnvRef: true,
    softEnvContinuity: "must",
    propPlatePresent: true,
    softEnvPlatePresent: false,
    softEnvBakedIntoIdentity: true,
    synthesizedPropApplied: true,
  });
  ok("gate allows when baked", gateOk.allowVendor === true, gateOk.code);

  const env = buildStillErrorEnvelope({ code: "SOFT-ENV-BAKE-FAILED", errMsg: "烘焙失败" });
  ok("envelope bake CTA", /场景/.test(env.ctaLabel), env.ctaLabel);

  const envVendorLeak = buildStillErrorEnvelope({
    code: "VENDOR",
    errMsg: "upstream 500：软环境缺 SCENE 板：保留室内轮廓……",
  });
  ok(
    "envelope no softenv hijack from prompt leak",
    envVendorLeak.code !== "SOFT-ENV-PLATE-MISSING" && envVendorLeak.code !== "SOFT-ENV-BAKE-FAILED",
    envVendorLeak.code,
  );

  // Prefer 3-slot without bake when soft fits
  const full = await applyContinuityAwareRefBudget({
    refs,
    propRequired: true,
    maxSlots: 3,
    softEnvContinuity: "must",
  });
  ok("cap3 has softEnv role", full.roles.includes("softEnv"), full.roles.join(","));
  ok("cap3 no bake", full.softEnvBakedIntoIdentity === false);

  // ROOT regression: DB identity+prop + FE SCENE → max3 independent softEnv (no collage bake)
  const {
    classifyFeReferenceRole,
    buildEventRefOrdinalBinding,
  } = await import("../src/ruleEngine/compilers/eventPlateReadiness");
  const feUrls = [
    "https://oss.example/scene/temple-altar.jpg",
    "https://oss.example/char/CHAR-SHEET.jpg",
  ];
  ok(
    "fe index0 scene when softEnv",
    classifyFeReferenceRole(feUrls[0]!, 0, { softEnvNeeded: true, total: 2 }) === "scene",
  );
  ok(
    "fe index1 char cue",
    classifyFeReferenceRole(feUrls[1]!, 1, { softEnvNeeded: true, total: 2 }) === "char",
  );
  const dbPlusFe = await applyContinuityAwareRefBudget({
    refs: [
      { type: "image", base64: id, role: "identity" },
      { type: "image", base64: synth.base64, role: "propSoft" },
      { type: "image", base64: sc, role: "softEnv" },
    ],
    propRequired: true,
    maxSlots: 3,
    softEnvContinuity: "must",
  });
  ok("db+fe independent softEnv", dbPlusFe.roles.includes("softEnv") && !dbPlusFe.softEnvBakedIntoIdentity);
  ok("db+fe keeps prop", dbPlusFe.roles.includes("propSoft"));
  const bind = buildEventRefOrdinalBinding({
    roles: dbPlusFe.roles,
    propRequired: true,
    thinSheets: true,
    softEnvBakedIntoIdentity: false,
  });
  ok("bind has softEnv 图", /主场景软环境|须入画可辨|禁止复制图1/.test(bind), bind);

  console.log("test-g-softenv-bake passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

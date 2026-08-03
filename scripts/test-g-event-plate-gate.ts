/**
 * Event plate readiness — hard gate + synth + face-bias (generic, multi propClass).
 * yarn test:g-event-plate-gate
 */
import {
  decideEventPlateGate,
  objectiveNeedsPropPlate,
  objectiveNeedsSoftEnvPlate,
  resolvePropPlateLabel,
  synthesizePropSoftPlate,
  cropIdentityPlateToFaceBias,
  classifyFeReferenceRole,
} from "../src/ruleEngine/compilers/eventPlateReadiness";
import { deriveGenerationContract } from "../src/ruleEngine/design/deriveGenerationContract";
import sharp from "sharp";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

async function main() {
  ok("contact needs prop plate", objectiveNeedsPropPlate("contact_geom"));
  ok("prop_readable needs prop plate", objectiveNeedsPropPlate("prop_readable"));
  ok("identity_first no prop plate", !objectiveNeedsPropPlate("identity_first"));
  ok("soft env when keepSoft", objectiveNeedsSoftEnvPlate({ keepSoftEnvRef: true }));

  {
    const contract = deriveGenerationContract({
      visualDescription: "特写。女主侧脸，纸角划过面颊。",
      shotSize: "特写",
      characterNames: ["女主"],
    });
    const gate = decideEventPlateGate({
      contract,
      keepSoftEnvRef: true,
      propPlatePresent: false,
      softEnvPlatePresent: false,
      allowSynthesizeProp: false,
    });
    ok("hard block without prop", gate.allowVendor === false, JSON.stringify(gate));
    ok("code DEX-PROP-PLATE-MISSING", gate.code === "DEX-PROP-PLATE-MISSING");
    ok("slot propSoftPlate", gate.missingSlots.includes("propSoftPlate"));
  }

  {
    const contract = deriveGenerationContract({
      visualDescription: "特写。女主侧脸，纸角划过面颊。",
      shotSize: "特写",
    });
    const gate = decideEventPlateGate({
      contract,
      keepSoftEnvRef: true,
      propPlatePresent: true,
      softEnvPlatePresent: false,
      allowSynthesizeProp: true,
      synthesizedPropApplied: true,
    });
    ok("allow after synth", gate.allowVendor === true);
    ok("soft env missing honest", gate.softEnvMissing === true);
  }

  {
    const paper = resolvePropPlateLabel({
      visualDescription: "特写。休书纸角划过面颊。纸面须见字迹。",
    });
    ok("paper class", paper.propClassId === "paper_doc", JSON.stringify(paper));
    ok("paper glyph from alias", paper.glyphText.length >= 1);

    const digit = resolvePropPlateLabel({ visualDescription: "特写。摩挲扳指。" });
    ok("digit class", digit.propClassId === "digit_prop", JSON.stringify(digit));

    const cloth = resolvePropPlateLabel({ visualDescription: "近景。帕角拂过面颊。" });
    ok("cloth class", cloth.propClassId === "cloth", JSON.stringify(cloth));
  }

  for (const cls of ["paper_doc", "cloth", "blade", "digit_prop", "generic"] as const) {
    const synth = await synthesizePropSoftPlate({
      propClassId: cls === "generic" ? null : cls,
      canonical: cls,
      glyphText: cls === "paper_doc" ? "书" : "物",
    });
    ok(`synth ${cls} has b64`, Boolean(synth.base64 && synth.base64.length > 100));
    const meta = await sharp(Buffer.from(synth.base64, "base64")).metadata();
    ok(`synth ${cls} jpeg`, meta.format === "jpeg" && (meta.width ?? 0) >= 256);
  }

  {
    const buf = await sharp({
      create: { width: 200, height: 400, channels: 3, background: { r: 40, g: 40, b: 40 } },
    })
      .jpeg()
      .toBuffer();
    const face = await cropIdentityPlateToFaceBias(buf.toString("base64"));
    ok("face bias cropped", face.cropped === true, face.reason);
    const meta = await sharp(Buffer.from(face.base64, "base64")).metadata();
    ok("face bias shorter", (meta.height ?? 0) < 400 && (meta.height ?? 0) >= 200);
  }

  ok("classify scene", classifyFeReferenceRole("https://x/scene-temple.jpg", 1) === "scene");
  ok("classify prop", classifyFeReferenceRole("https://x/PROP-paper.png", 0) === "prop");
  ok("classify char first", classifyFeReferenceRole("https://x/upload/abc.jpg", 0) === "char");
  ok("classify idx1 scene fallback", classifyFeReferenceRole("https://x/upload/xyz.jpg", 1) === "scene");

  {
    const contract = deriveGenerationContract({
      visualDescription: "中景。女主站立凝视。",
      shotSize: "中景",
      characterNames: ["女主"],
    });
    const gate = decideEventPlateGate({
      contract,
      propPlatePresent: false,
      softEnvPlatePresent: false,
    });
    ok("identity no prop hard gate", gate.allowVendor === true && gate.propRequired === false);
  }

  {
    const contract = deriveGenerationContract({
      visualDescription: "特写。女主侧脸，纸角划过面颊。",
      shotSize: "特写",
    });
    const soft = decideEventPlateGate({
      contract,
      keepSoftEnvRef: true,
      propPlatePresent: false,
      softEnvPlatePresent: false,
      allowSynthesizeProp: true,
      synthesizedPropApplied: false,
      synthAttempted: true,
    });
    ok("synth attempted soft-allows prop miss", soft.allowVendor === true, JSON.stringify(soft));
    ok("still marks prop missing", soft.propPlateMissing === true);

    const { inferEventRefRoles } = await import("../src/ruleEngine/compilers/eventPlateReadiness");
    const rolesSoftOnly = inferEventRefRoles({
      count: 2,
      propPresent: false,
      softEnvPresent: true,
      keepSoftEnvRef: true,
      propRequired: true,
    });
    ok("infer [id,soft] not prop", rolesSoftOnly.join(",") === "identity,softEnv", rolesSoftOnly.join(","));
    const rolesProp = inferEventRefRoles({
      count: 2,
      propPresent: true,
      softEnvPresent: false,
      softEnvBakedIntoIdentity: true,
      keepSoftEnvRef: true,
      propRequired: true,
    });
    ok("infer baked [id,prop]", rolesProp.join(",") === "identity,propSoft", rolesProp.join(","));
  }

  console.log("test-g-event-plate-gate passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

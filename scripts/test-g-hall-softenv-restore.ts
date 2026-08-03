/**
 * Golden: hall softEnv Seedream restore closed-loop (no Comfy).
 * softEnvKept path + retag classify + no 花脸 + keep_softEnv delta + I2V gray block + beat isolate.
 * yarn test:g-hall-softenv-restore
 */
import sharp from "sharp";
import {
  applyContinuityAwareRefBudget,
  classifyFeReferenceRole,
  composeBendIdentityPlate,
  inferEventRefRoles,
  isNearBlackVoidPlate,
} from "../src/ruleEngine/compilers/eventPlateReadiness";
import { applyLiteraryRepairDeltas } from "../src/ruleEngine/quality/applyLiteraryRepairDeltas";
import { judgeSampleAtoms } from "../src/ruleEngine/design/judgeSampleAtoms";
import { extractShotDesignSample } from "../src/ruleEngine/design/shotDesignSample";
import { stillQualityUserMessage } from "../src/ruleEngine/quality/practiceCompleteness";
import { assessStillVideoReadiness } from "../src/ruleEngine/qc/stillVideoReadiness";
import { detect as detectBgReadable } from "../src/ruleEngine/quality/handlers/bgReadableUntilClear";
import { selectStillActuatorProfile } from "../src/ruleEngine/compilers/stillActuatorProfile";
import { getDoctrineRefSlotOrder } from "../src/ruleEngine/compilers/designIntentProfile";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

async function solidJpeg(color: { r: number; g: number; b: number }, w = 128, h = 160): Promise<string> {
  const buf = await sharp({
    create: { width: w, height: h, channels: 3, background: color },
  })
    .jpeg({ quality: 80 })
    .toBuffer();
  return buf.toString("base64");
}

async function main() {
  // 0) Doctrine softEnv-first
  const order = getDoctrineRefSlotOrder();
  ok("doctrine.softEnv_first", order[0] === "softEnv", order.join(","));

  // 1) classifyFe: 定妆/四视图 never softEnv; SCENE keyword wins; last slot when softEnv needed
  ok(
    "classify.dingzhuang_is_char",
    classifyFeReferenceRole("https://oss/定妆四视图.jpg", 0, { softEnvNeeded: true, total: 2 }) === "char",
  );
  ok(
    "classify.CHAR_sheet_is_char",
    classifyFeReferenceRole("https://oss/CHAR-LEAD-sheet.jpg", 1, { softEnvNeeded: true, total: 2 }) === "char",
  );
  ok(
    "classify.SCENE_is_scene",
    classifyFeReferenceRole("https://oss/SCENE-HALL.jpg", 0, { softEnvNeeded: true, total: 2 }) === "scene",
  );
  ok(
    "classify.last_unknown_as_scene",
    classifyFeReferenceRole("https://oss/upload/xyz.jpg", 1, { softEnvNeeded: true, total: 2 }) === "scene",
  );

  // 2) batch homology: 2-slot identity+softEnv must NOT tag index1 as propSoft
  {
    const roles = inferEventRefRoles({
      count: 2,
      propPresent: false,
      softEnvPresent: true,
      keepSoftEnvRef: true,
      propRequired: true,
    });
    ok("infer.2slot_softEnv", roles[1] === "softEnv", roles.join(","));
  }

  // 3) near-black propSoft rejected under softEnv must → 2-slot softEnv+identity
  {
    const id = await solidJpeg({ r: 180, g: 150, b: 120 });
    const voidProp = await solidJpeg({ r: 8, g: 6, b: 4 });
    const hall = await solidJpeg({ r: 50, g: 35, b: 25 }, 200, 140);
    const voidCheck = await isNearBlackVoidPlate(voidProp);
    ok("void.near_black", voidCheck.void === true, voidCheck.reason);
    const budgeted = await applyContinuityAwareRefBudget({
      refs: [
        { type: "image", base64: id, role: "identity" },
        { type: "image", base64: voidProp, role: "propSoft" },
        { type: "image", base64: hall, role: "softEnv" },
      ],
      propRequired: true,
      maxSlots: 3,
      softEnvContinuity: "must",
    });
    ok("void.prop_dropped_soft_kept", budgeted.roles.includes("softEnv"), budgeted.roles.join(","));
    ok("void.no_near_black_prop", !budgeted.roles.includes("propSoft"), budgeted.roles.join(","));
  }

  // 4) no 花脸: bend identity uses corner RGB, not global matte punch
  {
    const grayFace = await sharp({
      create: { width: 400, height: 500, channels: 3, background: { r: 210, g: 210, b: 210 } },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 140, height: 160, channels: 3, background: { r: 220, g: 180, b: 150 } },
          })
            .png()
            .toBuffer(),
          left: 130,
          top: 50,
        },
      ])
      .jpeg()
      .toBuffer();
    const plate = await composeBendIdentityPlate({ faceSourceBase64: grayFace.toString("base64") });
    ok("no_huilian.used_face", plate.usedFace === true, plate.reason);
    ok("no_huilian.no_global_matte", !/studio_matted_dark/.test(plate.reason), plate.reason);
    ok(
      "no_huilian.corner_or_pad",
      /corner_gray_rgb|rgb_dark_pad|skip_sparse|no_empty_pad|real_face/.test(plate.reason),
      plate.reason,
    );
    // Face mid region should stay light (not punched to ink)
    const { data, info } = await sharp(Buffer.from(plate.base64, "base64"))
      .resize(64, 64, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const ch = info.channels || 3;
    const cx = 32;
    const cy = 28;
    const i = (cy * 64 + cx) * ch;
    const mid = ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 3;
    ok("no_huilian.mid_not_ink", mid > 60, `mid=${mid}`);
  }

  // 5) keep_softEnv delta truly re-hangs SCENE bytes (not dead hint)
  {
    const hall = await solidJpeg({ r: 45, g: 30, b: 20 }, 180, 120);
    const id = await solidJpeg({ r: 190, g: 160, b: 130 });
    const delta = await applyLiteraryRepairDeltas({
      deltaHints: ["keep_softEnv", "seed"],
      missingEffects: [
        { id: "bg.no_gray_studio", tier: "L0", bar: "must", reason: "softEnv_role_missing" },
      ],
      visualDescription: "中景。沈清漪弯腰捡起休书。殿内烛火。",
      poseOccupancy: "bend_pickup",
      referenceList: [{ type: "image", base64: id, role: "identity" }],
      refsRoles: ["identity"],
      softEnvBase64: hall,
    });
    ok("delta.keep_softEnv_source", delta.sources.some((s) => /keep_softEnv/.test(s)), delta.sources.join(","));
    ok("delta.softEnv_role", delta.refsRoles?.includes("softEnv"), String(delta.refsRoles));
    ok(
      "delta.softEnv_bytes",
      Boolean(delta.referenceList?.some((r) => r.role === "softEnv" && r.base64?.length)),
    );
    ok("delta.plates_swapped", delta.platesSwapped === true || delta.claimPlateRepair === true, JSON.stringify(delta.sources));
    ok("delta.dropped_false", delta.droppedSoftEnv === false);

    // keep wins over drop
    const keepWins = await applyLiteraryRepairDeltas({
      deltaHints: ["drop_softEnv", "keep_softEnv"],
      missingEffects: [{ id: "bg.no_gray_studio", tier: "L0", bar: "must", reason: "gray" }],
      visualDescription: "中景。弯腰捡起休书。殿内。",
      poseOccupancy: "bend_pickup",
      referenceList: [
        { type: "image", base64: id, role: "identity" },
        { type: "image", base64: hall, role: "softEnv" },
      ],
      refsRoles: ["identity", "softEnv"],
    });
    ok("delta.keep_blocks_drop", keepWins.refsRoles?.includes("softEnv"), String(keepWins.refsRoles));
    ok("delta.keep_blocks_drop_src", keepWins.sources.some((s) => /keep_softEnv_blocks_drop|keep_softEnv/.test(s)));
  }

  // 6) qualify: softEnv role missing / egress-only ≠ Must green; gray blocks
  {
    const sample = extractShotDesignSample({
      visualDescription: "中景。弯腰捡起休书。殿内烛火。",
      shotSize: "MS",
      sceneName: "神殿",
      shotDesign: { cameraAnchor: { bgBlur: true }, composition: { background: "殿内烛火" } },
    } as never);
    ok(
      "sample.scene_soft_must",
      sample.must.some((m) => m.id === "bg.scene_soft"),
      sample.must.map((m) => m.id).join(","),
    );
    const missHung = judgeSampleAtoms({
      sample,
      promptUsed: "背景：主场景浅景深虚化，禁止灰棚白棚",
      refsRoles: ["identity"],
      softEnvHung: false,
      localSignals: {},
    });
    ok(
      "qualify.missing_role_fail",
      missHung.mustMissIds.includes("bg.scene_soft"),
      missHung.mustMissIds.join(","),
    );
    const grayDespite = judgeSampleAtoms({
      sample,
      promptUsed: "殿内浅景深",
      refsRoles: ["identity", "softEnv"],
      softEnvHung: true,
      localSignals: { grayStudioSuspected: true },
    });
    ok(
      "qualify.gray_blocks",
      grayDespite.mustMissIds.includes("bg.scene_soft"),
      grayDespite.mustMissIds.join(","),
    );
    const hungOk = judgeSampleAtoms({
      sample,
      promptUsed: "殿内浅景深",
      refsRoles: ["identity", "softEnv"],
      softEnvHung: true,
      localSignals: {},
    });
    ok("qualify.hung_ok", !hungOk.mustMissIds.includes("bg.scene_soft"), hungOk.mustMissIds.join(","));
  }

  // 7) UX: softEnvMissingHonest never claims「必须元素已兑现」
  {
    const msg = stillQualityUserMessage({
      keyAbsent: true,
      literaryEffectsQualified: true,
      sampleMustFulfilled: true,
      softEnvMissingHonest: true,
    });
    ok("ux.no_fake_green", !/必须元素已兑现/.test(msg), msg);
    ok("ux.honest_missing", /软环境板未挂|场景 Must/.test(msg), msg);
  }

  // 8) untilClear BG_READABLE: keepSoft but no plate
  {
    const findings = detectBgReadable({
      phase: "still",
      keepSoftEnvRef: true,
      softEnvPlatePresent: false,
      refsRoles: ["identity"],
      hasSceneLink: true,
    });
    ok(
      "until.keep_soft_no_plate",
      findings.some((f) => f.code === "keep_soft_no_plate"),
      findings.map((f) => f.code).join(","),
    );
  }

  // 9) I2V: gray_studio / softEnv_missing are soft ledger (intent-first burn)
  {
    const gray = assessStillVideoReadiness({
      stillQuality: "hq_ok",
      visualPass: true,
      literaryEffectsQualified: true,
      stillMeta: { grayStudio: true },
    });
    ok("i2v.gray_soft_ready", gray.i2vReady === true && gray.criticalMisses.includes("gray_studio"), gray.criticalMisses.join(","));
    ok("i2v.gray_in_soft", (gray.softMisses ?? []).includes("gray_studio"), JSON.stringify(gray.softMisses));
    const missing = assessStillVideoReadiness({
      stillQuality: "hq_ok",
      visualPass: true,
      literaryEffectsQualified: true,
      stillMeta: { keepSoftEnvRef: true, softEnvPlatePresent: false, softEnvMissingHonest: true },
    });
    ok(
      "i2v.softEnv_missing_soft_ready",
      missing.i2vReady === true && missing.criticalMisses.includes("softEnv_missing"),
      missing.criticalMisses.join(","),
    );
  }

  // 10) No Comfy required for action+softEnv
  {
    const act = selectStillActuatorProfile({
      objectiveClass: "action_primary",
      softEnvContinuity: "must",
      keepSoftEnvRef: true,
    });
    ok("no_comfy.seedream", act.preferComfy === false && act.actuatorId === "seedream_multiref", act.reason);
  }

  // 11) forceThreeSlotProp keeps prop under softEnv must
  {
    const id = await solidJpeg({ r: 180, g: 150, b: 120 });
    const prop = await solidJpeg({ r: 220, g: 210, b: 190 });
    const hall = await solidJpeg({ r: 50, g: 35, b: 25 }, 200, 140);
    const forced = await applyContinuityAwareRefBudget({
      refs: [
        { type: "image", base64: id, role: "identity" },
        { type: "image", base64: prop, role: "propSoft" },
        { type: "image", base64: hall, role: "softEnv" },
      ],
      propRequired: true,
      maxSlots: 3,
      softEnvContinuity: "must",
      forceThreeSlotProp: true,
    });
    ok("force3.has_softEnv", forced.roles.includes("softEnv"), forced.roles.join(","));
    ok("force3.has_prop", forced.roles.includes("propSoft"), forced.roles.join(","));
    ok("force3.has_identity", forced.roles.includes("identity"), forced.roles.join(","));
  }

  // 12) identity contamination probe — modern meta + gray pad
  {
    const { probeIdentityPlateContamination } = await import(
      "../src/ruleEngine/compilers/eventPlateReadiness"
    );
    const modern = await probeIdentityPlateContamination({
      imageBase64: await solidJpeg({ r: 200, g: 200, b: 200 }),
      urlOrRemark: "现代西装定妆 blazer office",
      periodCostumeExpected: true,
    });
    ok("contam.modern_meta", modern.contaminated && modern.modernAttireSuspected, modern.reason);
    const period = await probeIdentityPlateContamination({
      imageBase64: await solidJpeg({ r: 160, g: 140, b: 110 }),
      urlOrRemark: "CHAR-LEAD 古装定妆",
      periodCostumeExpected: true,
    });
    ok("contam.period_ok", !period.modernAttireSuspected, period.reason);
  }

  // 13) UX realizationDegraded + should surface; never fake burn-ready
  {
    const deg = stillQualityUserMessage({
      keyAbsent: true,
      literaryEffectsQualified: true,
      sampleMustFulfilled: true,
      realizationDegraded: true,
      realizationNote: "实现已降级：弯腰→跪持",
      shouldMissIds: ["action.bend_pickup", "prop.glyph.should"],
    });
    ok("ux.degrade_no_必须兑现", !/必须元素已兑现/.test(deg), deg);
    ok("ux.degrade_has_note", /实现已降级|跪持/.test(deg), deg);
    ok("ux.degrade_should", /细节待增强|action\.bend|glyph/.test(deg), deg);
    ok("ux.degrade_no_auto_burn", /弱图债|可烧视频|弱图不可/.test(deg), deg);
    const weak = assessStillVideoReadiness({
      stillQuality: "weak",
      visualPass: false,
      literaryEffectsQualified: true,
    });
    ok("i2v.weak_ready_soft", weak.i2vReady === true, weak.reason);
    ok(
      "i2v.weak_soft_misses",
      (weak.softMisses ?? []).some((m) => /still_quality:weak/.test(m)),
      JSON.stringify(weak.softMisses),
    );
    const stripped = assessStillVideoReadiness({
      stillQuality: "hq_ok",
      visualPass: false,
      literaryEffectsQualified: true,
      stillMeta: {
        keyOptional: true,
        pixelDimStatus: "unmeasured",
        healThenBurnStillDebt: true,
        implementationDegraded: true,
        literaryEffectsQualified: true,
      },
    });
    ok("i2v.strip_visualPass_soft_ready", stripped.i2vReady === true, stripped.reason);
    ok(
      "i2v.strip_visualPass_in_soft",
      (stripped.softMisses ?? []).includes("visualPass_false") && !(stripped.hardMisses ?? []).includes("visualPass_false"),
      JSON.stringify({ soft: stripped.softMisses, hard: stripped.hardMisses }),
    );
  }

  // 14) Shot display SSOT + VIS-SYNC-DRIFT
  {
    const {
      storyboardDisplayNo,
      formatStoryboardBadge,
      detectVisSyncDrift,
      sortTracksByStoryboardIndex,
    } = await import("../src/ruleEngine/compilers/storyboardDisplaySsot");
    ok("display.index0", storyboardDisplayNo({ index: 0 }) === 1);
    ok("display.index2", storyboardDisplayNo({ index: 2 }) === 3);
    ok("display.badge", formatStoryboardBadge(3) === "S03");
    const drift = detectVisSyncDrift({
      tableRowCount: 11,
      panels: Array.from({ length: 18 }, (_, i) => ({ id: i + 1, index: i })),
    });
    ok("vis.drifted", drift.drifted && drift.code === "VIS-SYNC-DRIFT", JSON.stringify(drift));
    ok("vis.cta", /重同步/.test(String(drift.ctaLabel)), drift.ctaLabel);
    const sorted = sortTracksByStoryboardIndex([
      { id: 9, storyboardIndexMin: 5, displayNo: 6 },
      { id: 1, storyboardIndexMin: 0, displayNo: 1 },
      { id: 3, storyboardIndexMin: 2, displayNo: 3 },
    ]);
    ok("vis.sort", sorted[0]?.displayNo === 1 && sorted[1]?.displayNo === 3, JSON.stringify(sorted));
  }

  console.log("test-g-hall-softenv-restore: all passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

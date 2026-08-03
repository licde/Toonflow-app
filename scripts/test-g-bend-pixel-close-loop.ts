/**
 * Golden: scene-first bend close-loop — keep SCENE softEnv, skirt Should/ZH,
 * Agnes strip, pose claim gate, action-body crop, single ground prop, FE honesty.
 * yarn test:g-bend-pixel-close-loop
 */
import { peelLiteraryStillBody } from "../src/ruleEngine/compilers/literaryStillSsot";
import { lintStillPromptBody } from "../src/ruleEngine/compilers/stillPromptLint";
import { compressStillEgressForActuator } from "../src/ruleEngine/compilers/stillActuatorProfile";
import { cropTurnaroundSheetToIdentityPlate } from "../src/ruleEngine/compilers/cropTurnaroundToIdentityPlate";
import {
  synthesizePropSoftPlate,
  buildEventRefOrdinalBinding,
  composeBendIdentityPlate,
  composeBendPropSoftFromScene,
} from "../src/ruleEngine/compilers/eventPlateReadiness";
import { resolveStillRefsContract } from "../src/ruleEngine/compilers/stillRefsContract";
import { resolveStillBgPolicy } from "../src/ruleEngine/compilers/stillBgPolicy";
import { stillQualityUserMessage } from "../src/ruleEngine/quality/practiceCompleteness";
import { resolveStillDebtSemantics } from "../docs/toonflow-web/types/stillQuality";
import { judgeSampleAtoms } from "../src/ruleEngine/design/judgeSampleAtoms";
import { extractShotDesignSample, sampleWantsFragmentOverSoftEnv } from "../src/ruleEngine/design/shotDesignSample";
import { assertStillContactVideoHandoff } from "../src/ruleEngine/qc/stillContactVideoHandoff";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const SHOT3_VD =
  "中景。沈清漪弯腰捡起休书，指尖捏紧纸张边缘，指节泛白，面颊浅痕清晰。背景仅沈母裙摆虚化。烛火暖光。";

const SHOT3: Record<string, unknown> = {
  shotIndex: 3,
  type: "CHAR-SCENE",
  sceneName: "寝殿",
  shotSize: "MS",
  visualDescription: SHOT3_VD,
  shotDesign: {
    composition: { foreground: "沈清漪手捏休书", background: "沈母裙摆" },
    cameraAnchor: { shotSize: "MS", bgBlur: true },
  },
  narrative: {
    spatialRelation: "axis=沈清漪-沈母；anchors=沈清漪弯腰|沈母站立",
  },
};

async function main() {
  // 1. Scene-first contract — keep softEnv
  const sample = extractShotDesignSample(SHOT3);
  ok("sample.scene_must", sample.must.some((m) => m.id === "bg.scene_soft"), JSON.stringify(sample.must.map((m) => m.id)));
  ok("sample.frag_should", sample.should.some((m) => m.id === "bg.fragment"), JSON.stringify(sample.should.map((m) => m.id)));
  ok("sample.no_frag_over_scene", sampleWantsFragmentOverSoftEnv(sample) === false);

  const refsC = resolveStillRefsContract({
    visualDescription: SHOT3_VD,
    poseOccupancy: "bend_pickup",
    primaryObjective: "action_primary",
    shotDesignSample: sample,
  });
  ok("latch.keepSoftEnv", refsC.dropFullSoftEnv === false, refsC.reason);
  ok("latch.face_lock", refsC.identityReplaceStandingSheet === true);
  ok("latch.no_action_body_force", refsC.identityPreferActionBody === false);
  ok("latch.bend_sil_hint", refsC.repairDeltaHints.includes("identity_bend_sil"), refsC.repairDeltaHints.join(","));
  ok("latch.no_drop_hint", !refsC.repairDeltaHints.includes("drop_softEnv"), refsC.repairDeltaHints.join(","));

  const bg = resolveStillBgPolicy({
    description: SHOT3_VD,
    shotSize: "MS",
    hasSceneLink: true,
  });
  ok("bg.keep_soft", bg.keepSoftEnvRef === true, JSON.stringify({ reason: bg.reason, keep: bg.keepSoftEnvRef }));

  // 2. Agnes soup strip
  const soup = `特写。, tag-stack-zh。沈清漪弯腰。指尖捏。${SHOT3_VD}`;
  const peeled = peelLiteraryStillBody(soup);
  ok("strip.peel_no_tag", !/tag-stack-zh/i.test(peeled), peeled);
  const linted = lintStillPromptBody({ prompt: soup, visualDescription: SHOT3_VD });
  ok("strip.lint_no_tag", !/tag-stack-zh/i.test(linted.prompt), linted.prompt);
  const compressed = compressStillEgressForActuator({
    prompt: soup,
    poseOccupancy: "bend_pickup",
  });
  ok("strip.compress_no_tag", !/tag-stack-zh/i.test(compressed.positive), compressed.positive);

  // 3. Pose gate — no false「已换板重出」
  const fakeClaim = stillQualityUserMessage({
    sampleMustFulfilled: false,
    missingEffects: ["action.bend_pickup"],
    platesSwapped: true,
    poseEvidenceOk: false,
  });
  ok("claim.no_false_换板重出", !/已按参考契约换板重出/.test(fakeClaim), fakeClaim);
  ok("claim.pose_gate", /姿态未过|须复验/.test(fakeClaim), fakeClaim);

  // 4. Crop ROI + bend identity replaces standing sheet
  {
    const { default: sharp } = await import("sharp");
    const sheet = await sharp({
      create: { width: 2048, height: 512, channels: 3, background: { r: 40, g: 30, b: 20 } },
    })
      .jpeg()
      .toBuffer();
    const face = await cropTurnaroundSheetToIdentityPlate(sheet.toString("base64"), {
      assumeSheet: true,
      preferActionBody: false,
    });
    const body = await cropTurnaroundSheetToIdentityPlate(sheet.toString("base64"), {
      assumeSheet: true,
      preferActionBody: true,
    });
    ok("crop.action_body_reason", body.cropped === true && /action_body/.test(String(body.reason)), body.reason);
    ok("crop.roi_differs", face.base64 !== body.base64);

    const bendId = await composeBendIdentityPlate({ faceSourceBase64: face.base64 });
    ok("identity.bend_face_kind", bendId.kind === "bend_identity_face", bendId.kind);
    ok("identity.bend_face_used", bendId.usedFace === true, bendId.reason);
    ok("identity.bend_real_face", /real_face/.test(bendId.reason), bendId.reason);
    ok(
      "identity.bend_studio_matted_or_dark",
      /corner_gray_rgb|rgb_dark_pad|rgb_no_matte|real_face_raw|skip_sparse_pad|no_empty_pad/.test(bendId.reason),
      bendId.reason,
    );
    ok("identity.bend_ne_sheet", bendId.base64 !== face.base64 && bendId.base64.length > 100);
    const bendMeta = await sharp(Buffer.from(bendId.base64, "base64")).metadata();
    ok(
      "identity.bend_not_wide_sheet",
      (bendMeta.width ?? 0) > 0 &&
        (bendMeta.height ?? 0) > 0 &&
        Math.abs((bendMeta.width! / bendMeta.height!) - 1) < 0.15,
      `${bendMeta.width}x${bendMeta.height}`,
    );
    ok("identity.bend_has_bytes", bendId.base64.length > 2000, String(bendId.base64.length));
    ok("identity.no_softenv_underlay", !/softenv_underlay/.test(bendId.reason), bendId.reason);

    // Doctrine: even if caller passes scene, identity must NOT collage hall under face
    {
      const { ensureBendIdentityCarriesSoftEnv } = await import(
        "../src/ruleEngine/compilers/eventPlateReadiness"
      );
      const grayFace = await sharp({
        create: { width: 400, height: 500, channels: 3, background: { r: 200, g: 200, b: 200 } },
      })
        .composite([
          {
            input: await sharp({
              create: { width: 120, height: 140, channels: 3, background: { r: 210, g: 170, b: 140 } },
            })
              .png()
              .toBuffer(),
            left: 140,
            top: 40,
          },
        ])
        .jpeg()
        .toBuffer();
      const hall = await sharp({
        create: { width: 640, height: 480, channels: 3, background: { r: 40, g: 28, b: 18 } },
      })
        .jpeg()
        .toBuffer();
      const faceOnly = await composeBendIdentityPlate({
        faceSourceBase64: grayFace.toString("base64"),
      });
      ok("identity.face_only_no_underlay", !/softenv_underlay/.test(faceOnly.reason), faceOnly.reason);
      ok(
        "identity.no_global_matte_huilian",
        !/studio_matted_dark|matted/.test(faceOnly.reason) || /corner_gray_rgb/.test(faceOnly.reason),
        faceOnly.reason,
      );
      ok(
        "identity.corner_or_pad_clean",
        /corner_gray_rgb|rgb_dark_pad|skip_sparse|no_empty_pad|real_face/.test(faceOnly.reason),
        faceOnly.reason,
      );
      // Periphery of plate must not remain light gray (#c8)
      {
        const { data, info } = await sharp(Buffer.from(faceOnly.base64, "base64"))
          .resize(32, 32, { fit: "fill" })
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        const ch = info.channels || 3;
        let cornerSum = 0;
        let n = 0;
        for (const [x, y] of [
          [0, 0],
          [31, 0],
          [0, 31],
          [31, 31],
        ] as const) {
          const i = (y * 32 + x) * ch;
          cornerSum += ((data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0)) / 3;
          n++;
        }
        const cornerMean = n ? cornerSum / n : 255;
        ok("identity.corners_dark_not_gray", cornerMean < 80, `cornerMean=${cornerMean}`);
      }
      const noop = await ensureBendIdentityCarriesSoftEnv({
        identityBase64: grayFace.toString("base64"),
        sceneBase64: hall.toString("base64"),
      });
      ok("identity.ensure_noop", noop.applied === false, noop.reason);
      ok("identity.ensure_doctrine", /independent_softEnv|no_bake/.test(noop.reason), noop.reason);
    }

    // Contract: softEnv independent, not dropped
    ok("contract.softEnv_independent", refsC.dropFullSoftEnv === false);
  }

  // 5. Single ground prop (no large glyph) + SCENE bind
  {
    const bend = await synthesizePropSoftPlate({
      propClassId: "paper_doc",
      canonical: "休书",
      glyphText: "休书",
      softPlateHint: "thin_sheets",
      plateMode: "object_inset",
      poseOccupancy: "bend_pickup",
    });
    const hold = await synthesizePropSoftPlate({
      propClassId: "paper_doc",
      canonical: "休书",
      glyphText: "休书",
      softPlateHint: "thin_sheets",
      plateMode: "readable_doc",
    });
    ok("bend.silhouette_differs_hold", bend.base64 !== hold.base64);

    // Scene-floor propSoft preferred over cartoon when SCENE hung
    {
      const { default: sharp } = await import("sharp");
      // Readable hall floor (not near-void) — dark wood + large paper patch
      const scene = await sharp({
        create: { width: 640, height: 480, channels: 3, background: { r: 72, g: 52, b: 36 } },
      })
        .composite([
          {
            input: await sharp({
              create: { width: 160, height: 100, channels: 3, background: { r: 232, g: 220, b: 198 } },
            })
              .png()
              .toBuffer(),
            left: 240,
            top: 340,
          },
          {
            input: await sharp({
              create: { width: 200, height: 80, channels: 3, background: { r: 110, g: 78, b: 48 } },
            })
              .png()
              .toBuffer(),
            left: 40,
            top: 40,
          },
        ])
        .jpeg()
        .toBuffer();
      const fromScene = await composeBendPropSoftFromScene({
        sceneBase64: scene.toString("base64"),
      });
      ok("prop.scene_floor", fromScene?.fromScene === true && Boolean(fromScene?.base64), fromScene?.reason);
      ok("prop.scene_ne_svg", fromScene!.base64 !== bend.base64);
      ok(
        "prop.ne_full_scene",
        fromScene!.base64 !== scene.toString("base64"),
        "propSoft floor crop must differ from full SCENE softEnv",
      );
    }

    // Near-black SCENE floor must NOT become propSoft (reject → SVG fallback path)
    {
      const { default: sharp } = await import("sharp");
      const blackHall = await sharp({
        create: { width: 640, height: 480, channels: 3, background: { r: 8, g: 6, b: 5 } },
      })
        .jpeg()
        .toBuffer();
      const voidFloor = await composeBendPropSoftFromScene({
        sceneBase64: blackHall.toString("base64"),
      });
      ok("prop.reject_void_floor", voidFloor === null, voidFloor?.reason);
    }

    const bind = buildEventRefOrdinalBinding({
      roles: ["identity", "propSoft", "softEnv"],
      propRequired: true,
      poseOccupancy: "bend_pickup",
      fragmentPlateHung: false,
    });
    ok("bind.ground_single", /触地单纸|近地|禁止胸前|标牌|贴纸/.test(bind), bind);
    ok("bind.softEnv_no_second_paper", /禁止场景另绘第二张|唯一一张|禁止.*第二张/.test(bind), bind);
    ok("bind.scene_soft", /主场景|殿内|木作|烛火|禁止复制图1/.test(bind), bind);
    ok("bind.ignore_id_gray", /忽略其灰棚|禁止复制图1/.test(bind), bind);
    ok("bind.face_lock", /真脸|定妆/.test(bind), bind);
    ok("bind.no_fragment_as_soft", !/裙摆\/衣角碎片氛围/.test(bind) || /主场景/.test(bind), bind);
  }

  // 6. Judge: softEnv hung OK for scene Must; fragment Should miss does not block Must
  {
    const hung = judgeSampleAtoms({
      sample,
      promptUsed: `${SHOT3_VD}。背景：主场景浅景深虚化，禁止灰棚白棚。`,
      refsRoles: ["identity", "propSoft", "softEnv"],
      propSoftPresent: true,
      droppedSoftEnv: false,
      softEnvHung: true,
      fragmentPlateHung: false,
      localHeuristicOk: true,
      localSignals: {
        groundPropSuspected: true,
        primaryPoseGuess: "bend_pickup",
        holdCardSuspected: false,
      },
    });
    ok("judge.no_softEnv_veto_must", !hung.mustMissIds.includes("bg.fragment"), hung.mustMissIds.join(","));
    ok(
      "judge.scene_pass",
      hung.atoms.some((a) => a.id === "bg.scene_soft" && a.pass) || !sample.must.some((m) => m.id === "bg.scene_soft"),
      JSON.stringify(hung.atoms.filter((a) => a.id.startsWith("bg."))),
    );
    ok(
      "judge.must_can_pass_with_scene",
      hung.mustFulfilled === true || !hung.mustMissIds.some((id) => id.startsWith("bg.")),
      hung.mustMissIds.join(","),
    );
  }

  // 7. FE: missing SCENE → soft_env CTA; intentional drop → no CTA; vendor hung → no fragment nag
  {
    const nag = resolveStillDebtSemantics({
      softEnvMissingHonest: true,
      softEnvContinuity: "must",
      missingSlots: ["softEnv"],
      userMessage: "软环境缺 SCENE 板",
    });
    ok("fe.would_nag_soft", nag.kind === "soft_env", nag.kind);

    const honestDrop = resolveStillDebtSemantics({
      softEnvMissingHonest: true,
      droppedSoftEnv: true,
      vendorDroppedSoftEnv: true,
      softEnvContinuity: "none",
      missingSlots: ["softEnv"],
      userMessage: "软环境缺 SCENE 板",
    });
    ok("fe.no_补场景_on_drop", honestDrop.kind !== "soft_env", `${honestDrop.kind}:${honestDrop.ctaLabel}`);

    const withScene = resolveStillDebtSemantics({
      softEnvMissingHonest: false,
      droppedSoftEnv: false,
      refsRoles: ["identity", "propSoft", "softEnv"],
      userMessage: "裙摆碎片",
      sampleMustFulfilled: true,
      literaryEffectsQualified: true,
    });
    ok("fe.no_fragment_nag_with_scene", withScene.kind !== "soft_env", withScene.kind);
  }

  // 8. Video gate — lit unqualified WARN-absorbs (intent-first burn)
  {
    const handoff = assertStillContactVideoHandoff({
      visualDescription: SHOT3_VD,
      stillQuality: "weak",
      stillMeta: {
        literaryEffectsQualified: false,
        missingEffects: ["action.bend_pickup"],
        stillQuality: "weak",
      },
    });
    ok("video.warn_unqualified_allows_burn", handoff.ok === true && handoff.severity === "WARN", JSON.stringify(handoff));
    ok("video.warn_msg", /可烧视频|文学主效果/.test(String(handoff.message ?? "")), handoff.message);
  }

  // 9. Kneel ≠ bend; action miss forbids「已换板重出」
  {
    const kneel = judgeSampleAtoms({
      sample,
      promptUsed: SHOT3_VD,
      refsRoles: ["identity", "propSoft", "softEnv"],
      propSoftPresent: true,
      softEnvHung: true,
      localHeuristicOk: true,
      localSignals: {
        groundPropSuspected: true,
        kneelSquatSuspected: true,
        primaryPoseGuess: "kneel_hold",
      },
    });
    ok("kneel.miss_action", kneel.shouldMissIds.includes("action.bend_pickup"), kneel.shouldMissIds.join(","));
    ok("kneel.trunk_ok", kneel.mustFulfilled === true, kneel.mustMissIds.join(","));

    const fake = stillQualityUserMessage({
      sampleMustFulfilled: false,
      literaryEffectsQualified: false,
      missingEffects: ["action.bend_pickup"],
      platesSwapped: true,
      poseEvidenceOk: false,
    });
    ok("kneel.ux_姿态未过", /姿态未过|须复验/.test(fake) && !/已按参考契约换板重出/.test(fake), fake);

    const deg = stillQualityUserMessage({
      sampleMustFulfilled: true,
      literaryEffectsQualified: true,
      realizationDegraded: true,
      realizationNote: "实现已降级：弯腰→跪持；设计意图仍为弯腰捡拾",
    });
    ok("kneel.ux_degraded", /实现已降级/.test(deg), deg);
  }

  console.log("ALL PASS test-g-bend-pixel-close-loop");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

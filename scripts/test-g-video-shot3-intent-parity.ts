/**
 * yarn test:g-video-shot3-intent-parity
 * Shot3 design intent → spine/adaptBurn atoms (LANG/EXPR/MOTION/VOICE/XOR).
 */
import assert from "node:assert/strict";
import { hydrateShotCompileContextSync } from "../src/ruleEngine/compilers/hydrateShotCompileContext";
import { compileVideoPromptSpine } from "../src/ruleEngine/compilers/compileVideoPromptSpine";
import { adaptBurnFromDesign } from "../src/ruleEngine/compilers/adaptBurnFromDesign";
import { healMouthXorOnShot, mouthXorConflict } from "../src/ruleEngine/design/mouthXorHeal";
import { mayAbsorbBurnDebt, fidelityMissesBlockAbsorb } from "../src/ruleEngine/compilers/burnAbsorbPolicy";
import { assertDexMatrixCoverage, VIDEO_DEX_STAGE_MATRIX } from "../src/ruleEngine/compilers/videoDexStageMatrix";
import { DEFAULT_VIDEO_CAPABILITY } from "../src/ruleEngine/compilers/shotVendorBridge";
import { SHOT3_INTENT_GOLDEN, SHOT3_EXPECTED_ATOMS } from "../data/fixtures/video_shot3_intent_golden";

function ok(name: string, cond: boolean) {
  assert.equal(cond, true, name);
  console.log("ok:", name);
}

// --- mouth XOR heal (design SSOT)
{
  const shot = structuredClone(SHOT3_INTENT_GOLDEN) as Record<string, unknown>;
  ok("shot3 has mouth XOR conflict before heal", mouthXorConflict(shot as never).conflict);
  const r = healMouthXorOnShot(shot as never);
  ok("shot3 mouth XOR healed", r.healed);
  const micro = (shot.shotDesign as { performance?: { microExpression?: { mouthDetail?: string } } })
    ?.performance?.microExpression;
  ok("mouth → speak_ready", micro?.mouthDetail === SHOT3_EXPECTED_ATOMS.mouthHealed);
  ok("eyes preserved", (micro as { eyes?: string })?.eyes === "focused");
}

// --- nativeExpression never blocks
ok("nativeExpression default false", DEFAULT_VIDEO_CAPABILITY.nativeExpression === false);
ok("microExpr stays textOnly", DEFAULT_VIDEO_CAPABILITY.textOnly.includes("microExpr"));

// --- spine atoms
{
  const shot = structuredClone(SHOT3_INTENT_GOLDEN) as never;
  const ctx = hydrateShotCompileContextSync({
    designShot: shot,
    shotMeta: shot as never,
    seedPrompt: "",
    vendorId: "agnesai",
  });
  const spine = compileVideoPromptSpine({ ctx, forceRebuild: true, vendorId: "agnesai" });
  const p = spine.prompt;
  ok("spine has CJK dialogue", p.includes(SHOT3_EXPECTED_ATOMS.dialogueCjk));
  ok("spine has eyes micro", /微表情：眼神focused|focused/.test(p));
  ok("spine has bend/pinch motion", /弯腰|捏紧/.test(p));
  ok("spine has voice line", p.includes("声线") && p.includes("清冷"));
  ok("spine no EN lip shell", !/lip-sync active|natural mouth movement for dialogue/i.test(p));
  ok("spine no [FX] F0", !/\[FX\]\s*F0/i.test(p));
  ok("spine has composition or spatial", /前景|站位|手捏休书/.test(p));
  ok("continuity from markers", Boolean(ctx.continuityHint) || /承接|接信/.test(p));
}

// --- adaptBurn
{
  const shot = structuredClone(SHOT3_INTENT_GOLDEN) as Record<string, unknown>;
  const burn = adaptBurnFromDesign({
    shotMeta: shot,
    trackPrompt: "[Camera] static\n[Visual]\n[Motion]\n[Audio]\n[Narrative]",
    vendorId: "agnesai",
  });
  ok("adaptBurn produces five-section", /\[Visual\]/.test(burn.prompt) && /\[Audio\]/.test(burn.prompt));
  ok("adaptBurn keeps CJK", burn.prompt.includes(SHOT3_EXPECTED_ATOMS.dialogueCjk));
  ok("adaptBurn no EN spoken dialogue wrapper", !/\b(he said|she said)\b/i.test(burn.prompt));
}

// --- absorb policy
ok("warehouse may absorb", mayAbsorbBurnDebt("warehouse"));
ok("still_mouth must not absorb", !mayAbsorbBurnDebt("still_mouth"));
ok("still_contact must not absorb", !mayAbsorbBurnDebt("still_contact"));
ok("lang must not absorb", !mayAbsorbBurnDebt("lang"));
ok(
  "fidelity critical filter",
  fidelityMissesBlockAbsorb([
    { id: "lang_cjk_dialogue", pass: false },
    { id: "av_scene_sfx", pass: false },
  ]).some((x) => x.id === "lang_cjk_dialogue"),
);

// --- DEX stage matrix
{
  const cov = assertDexMatrixCoverage([
    "VID-LANG-01",
    "VID-EXPR-SPEAK",
    "VID-MOUTH-XOR",
    "VID-STILL-HANDOFF",
    "STILL-MOUTH-HANDOFF",
  ]);
  ok("DEX matrix covers core ids", cov.ok);
  ok("DEX matrix non-empty", VIDEO_DEX_STAGE_MATRIX.length >= 10);
}

console.log("PASS test-g-video-shot3-intent-parity");

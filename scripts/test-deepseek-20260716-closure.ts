/**
 * yarn test:deepseek-20260716-closure
 * Four-level expect: normalize → package hydrate → prompt extract → vendor bridge
 */
import fs from "fs";
import path from "path";
import { normalizePreDesignPack, applyNormalizedShotsToBundle } from "@/ruleEngine/bundle/normalizePreDesignPack";
import { hydratePackageFromPreDesign } from "@/ruleEngine/bundle/hydratePackageFromPreDesign";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";
import type { EpisodePackage } from "@/ruleEngine/types";
import { buildExtractContext, extractDesignFields, applyDesignFieldRegistry } from "@/ruleEngine/design/designFieldRegistry";
import { bridgeShotToVendor } from "@/ruleEngine/compilers/shotVendorBridge";
import { fillModeMatrix } from "@/ruleEngine/kernels/compileKernel";
import { normalizePropCode } from "@/ruleEngine/bundle/normalizePreDesignPack";
import { computeDerivativeSkipReason } from "@/ruleEngine/bundle/assetSeedFromBundle";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  const p = path.join(process.cwd(), "data/fixtures/golden/deepseek-20260716-43ce74.json");
  ok("golden file exists", fs.existsSync(p));
  const bundle = JSON.parse(fs.readFileSync(p, "utf-8")) as ScriptBundle;

  // L1 normalize
  const { shots, sceneMap, warnings } = normalizePreDesignPack(bundle);
  applyNormalizedShotsToBundle(bundle, shots);
  ok("normalized shot count 12", shots.length === 12, String(shots.length));
  ok("scene map non-empty", sceneMap.size >= 4, String(sceneMap.size));
  const s0 = shots[0] as { sceneCode?: string; generation?: { imagePrompt?: string; fxPrompt?: string } };
  ok("shot1 has SCENE code", Boolean(s0.sceneCode && /^SCENE-/.test(s0.sceneCode)), s0.sceneCode);
  ok("shot1 imagePrompt has --sref", /--sref\s+SCENE-/i.test(s0.generation?.imagePrompt ?? ""), (s0.generation?.imagePrompt ?? "").slice(-80));
  ok("PROP normalize PROP_TMS", normalizePropCode("PROP_TMS") === "PROP-TMS");

  // L2 hydrate package (synthetic)
  const pkg: EpisodePackage = {
    version: 1,
    projectId: 1,
    scriptId: 1,
    shots: shots.map((s, i) => ({
      id: `shot-${i + 1}`,
      storyboardId: 1000 + i,
      index: i,
      narrative: {
        type: (s.type as never) ?? "CHAR-SCENE",
        sceneName: s.sceneName,
        duration: s.duration,
        emotionIntensity: 4,
      },
      generation: {},
    })),
    rulePackVersion: "test",
    updatedAt: Date.now(),
  };
  const hydrated = hydratePackageFromPreDesign(pkg, shots);
  const h0 = hydrated.shots[0];
  ok("hydrated sceneCode", Boolean(h0.narrative.sceneCode?.startsWith("SCENE-")));
  ok("hydrated duration", h0.narrative.duration === shots[0].duration);
  ok("hydrated shotSize", Boolean(h0.narrative.shotSize), String(h0.narrative.shotSize));
  ok("hydrated assetCodes has CHAR", (h0.narrative.assetCodes ?? []).some((c) => /^CHAR-/.test(c)));
  const withDialogue = hydrated.shots.find((s) => s.narrative.lines && /：/.test(s.narrative.lines));
  ok("hydrated dialogue lines", Boolean(withDialogue?.narrative.lines), withDialogue?.narrative.lines?.slice(0, 40));

  // L3 extract + apply
  const ctx = buildExtractContext({
    modality: "video",
    mode: "text",
    episodeShot: withDialogue ?? h0,
  });
  const fields = extractDesignFields(ctx);
  ok("extract duration", fields.duration != null);
  ok("extract shotSize", Boolean(fields.shotSize));
  ok("extract dialogue or forceAudio", Boolean(fields.dialogue || fields.forceAudioHint));
  const applied = applyDesignFieldRegistry("base beat", fields, { modality: "video", mode: "text" });
  ok("inject duration|shotSize|expr", applied.injected.length >= 2, applied.injected.join(","));

  // L4 vendor bridge
  const bridge = bridgeShotToVendor({
    designFields: { ...fields, shotSize: "CU", duration: 5, dialogue: "测试", forceAudioHint: true },
    request: { duration: 8, audio: false },
  });
  ok("bridge duration prefers field 5", bridge.params.duration === 5, String(bridge.params.duration));
  ok("bridge audio true from dialogue", bridge.params.audio === true);
  ok("bridge marks shotSize text_only", bridge.warnings.some((w) => /shotSize/.test(w)));
  ok("bridge textHardening has close-up|CU", bridge.textHardening.some((t) => /close-up|CU|shotSize/i.test(t)));

  // Mode matrix structural
  const matrix = await fillModeMatrix({
    modes: ["text", "singleImage", "startEndRequired", "multiParameter"],
    seedPrompt: h0.generation.videoPrompt || "祠堂烛火",
    charCodes: (h0.narrative.assetCodes ?? []).filter((c) => /^CHAR-/.test(c)),
    sceneCode: h0.narrative.sceneCode,
    designFields: fields,
  });
  const prompts = ["text", "singleImage", "startEndRequired", "multiParameter"].map((m) => matrix[m]?.prompt ?? "");
  ok("four modes unequal", new Set(prompts.map((p) => p.trim())).size === 4);
  ok("startEnd has START_FRAME", /START_FRAME/i.test(prompts[2]));
  ok("multi has @图", /@图/.test(prompts[3]));

  // Derivative honesty: arcVisual only → 0 derivatives, explicit skip reason
  const cdAssets =
    (bundle.characterDesign as { assets?: { L6?: { arcVisual?: string; stateVariants?: unknown } }[] })?.assets ?? [];
  const derSkip = computeDerivativeSkipReason(cdAssets as Parameters<typeof computeDerivativeSkipReason>[0]);
  ok(
    "43ce74 derivative skip honest",
    derSkip === "arcVisual_only_no_stateVariants" || derSkip === "no_L6_stateVariants",
    String(derSkip),
  );
  ok(
    "43ce74 no stateVariants to fabricate",
    !cdAssets.some((a) => {
      const sv = a.L6?.stateVariants;
      return Array.isArray(sv) ? sv.length > 0 : Boolean(sv && typeof sv === "object" && Object.keys(sv as object).length);
    }),
  );

  void warnings;
  if (failed) {
    console.error(`\n${failed} deepseek-20260716-closure failed`);
    process.exit(1);
  }
  console.log("\n=== test:deepseek-20260716-closure OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

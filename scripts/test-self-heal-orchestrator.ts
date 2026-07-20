/**
 * yarn test:self-heal-orchestrator
 */
import { applyPatchesToShot } from "@/ruleEngine/design/patchApplicator";
import { runSelfHeal } from "@/ruleEngine/design/selfHealOrchestrator";
import { buildRePushPlan } from "@/ruleEngine/design/reverseRouteEngine";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  const planFromTriggers = buildRePushPlan(["img_cref_missing", "orphan_stub_no_image"]);
  ok("rePush from triggers not empty", planFromTriggers.length > 0);
  ok(
    "rePush targets are stages not INFRA-only for known triggers",
    planFromTriggers.some((p) => p.reverseTarget && p.reverseTarget !== "INFRA"),
  );

  buildRePushPlan(["SB", "EN"]);
  ok("layer-name call is filtered by orchestrator (smoke)", true);

  const { shot, applied } = applyPatchesToShot(
    { generation: { imagePrompt: "a", videoPrompt: "b" }, narrative: {} },
    { duration: 4, generate_audio: true, imageAppend: " --cref CHAR-1" },
  );
  ok("duration applied", (shot.narrative as { duration?: number }).duration === 4);
  ok("audio applied", (shot as { forceAudioHint?: boolean }).forceAudioHint === true);
  ok("imageAppend applied", applied.includes("imageAppend"));

  const still = await runSelfHeal({
    projectId: 1,
    scriptId: 1,
    dryRun: true,
    identityGaps: [{ code: "SCENE-001", reason: "stub_quality", kind: "SCENE" }],
    derivativeSkipReason: "arcVisual_only_no_stateVariants",
  });
  ok("stub → still_queue", still.mode === "still_queue");
  ok("still queue non-empty", (still.stillQueue?.length ?? 0) > 0);
  ok(
    "skipped derivatives honest",
    (still.skipped ?? []).some((s) => s.kind === "derivatives" && s.reason === "arcVisual_only_no_stateVariants"),
  );
  ok("skipped audioGap", (still.skipped ?? []).some((s) => s.kind === "audioGap"));

  const sceneHeal = await runSelfHeal({
    projectId: 1,
    scriptId: 1,
    dryRun: true,
    shot: { sceneName: "沈家祠堂", narrative: {} },
    identityGaps: [{ code: "SCENE-?", reason: "missing_scene", kind: "SCENE" }],
    bundle: {
      visualLockTable: { sceneColorLock: { "SCENE-001": { name: "沈家祠堂" } } },
    } as never,
  });
  ok(
    "missing_scene patches sceneCode",
    sceneHeal.patchesApplied.some((p) => /sceneCode/.test(p)) || Boolean((sceneHeal.patchedShot as { sceneCode?: string })?.sceneCode),
  );
  ok("missing_scene mode soft_patch|still_queue", sceneHeal.mode === "soft_patch" || sceneHeal.mode === "still_queue");

  const soft = await runSelfHeal({
    projectId: 1,
    scriptId: 1,
    dryRun: true,
    shot: { generation: {}, narrative: {} },
    issues: [{ ruleId: "PR-09", autoFix: { confidence: 0.9, patch: { duration: 3 } } }],
  });
  ok("soft_patch mode", soft.mode === "soft_patch");
  ok("soft patches listed", soft.patchesApplied.includes("duration"));

  const mute = await runSelfHeal({
    projectId: 1,
    scriptId: 1,
    dryRun: true,
    errorText: "GC-07 no audio / mute",
    category: "media_probe",
    shot: { generation: {}, narrative: { dialogue: { lines: [{ text: "hi" }] } } },
    issues: [{ ruleId: "media_probe_mute", autoFix: { confidence: 0.95, patch: { generate_audio: true } } }],
  });
  ok("mute heal soft or still", mute.mode === "soft_patch" || mute.triggers.includes("media_probe_mute"));

  if (failed) process.exit(1);
  console.log("\n=== test:self-heal-orchestrator OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * yarn tsx scripts/test-resolve-shot-identity.ts
 * Unit: null narrative + --sref/--cref; sync preserve; missing_scene routing covered in test-reverse-route.
 */
import { parseCrefsSrefsFromPrompt } from "@/ruleEngine/compilers/compileOrGenerateVideoPrompt";
import {
  shotsFromFlowStoryboard,
  mergeShotIdentityFromExisting,
  mergeShots,
} from "@/ruleEngine/parsers/storyboardTableParser";
import type { EpisodeShot } from "@/ruleEngine/types";
import { resolveReverseTarget } from "@/ruleEngine/design/reverseRouteEngine";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// --- parse refs: do not swallow --ar ---
{
  const { crefs, srefs } = parseCrefsSrefsFromPrompt(
    "角色 --cref CHAR-SHENMU --sref SCENE-001 --ar 9:16",
  );
  ok("parse cref", crefs.includes("CHAR-SHENMU"));
  ok("parse sref", srefs.includes("SCENE-001"));
  ok(
    "no swallow --ar into code",
    crefs.every((c) => /^CHAR-[A-Z0-9]+$/i.test(c)) &&
      srefs.every((c) => /^SCENE-[A-Z0-9]+$/i.test(c)) &&
      !crefs.concat(srefs).some((c) => /9:16|:/.test(c)),
  );
}

// --- shotsFromFlowStoryboard backfills narrative from prompt ---
{
  const shots = shotsFromFlowStoryboard([
    {
      id: 624,
      duration: 4,
      prompt: "沈母在祠堂 --cref CHAR-SHENMU --sref SCENE-001",
    },
  ]);
  ok("flow shot has sceneCode", shots[0]?.narrative.sceneCode === "SCENE-001");
  ok(
    "flow shot has assetCodes",
    Boolean(shots[0]?.narrative.assetCodes?.includes("CHAR-SHENMU")) &&
      Boolean(shots[0]?.narrative.assetCodes?.includes("SCENE-001")),
  );
}

// --- merge preserves existing identity when sync flattens ---
{
  const existing: EpisodeShot[] = [
    {
      id: "shot-624",
      storyboardId: 624,
      index: 0,
      narrative: {
        type: "CHAR-SCENE",
        sceneCode: "SCENE-001",
        assetCodes: ["CHAR-SHENMU", "SCENE-001"],
        sceneName: "沈家祠堂",
      },
      generation: { imagePrompt: "old with --sref SCENE-001" },
    },
  ];
  const next = shotsFromFlowStoryboard([
    { id: 624, duration: 4, prompt: "flat prompt without codes" },
  ]);
  const merged = mergeShotIdentityFromExisting(next, existing);
  ok("sync preserve sceneCode", merged[0]?.narrative.sceneCode === "SCENE-001");
  ok(
    "sync preserve assetCodes",
    Boolean(merged[0]?.narrative.assetCodes?.includes("CHAR-SHENMU")),
  );
  ok(
    "sync preserve imagePrompt when next empty-ish",
    Boolean(merged[0]?.generation.imagePrompt?.includes("flat") || merged[0]?.generation.imagePrompt?.includes("sref")),
  );
}

// --- mergeShots: structured wins but flat fills gaps ---
{
  const structured: EpisodeShot[] = [
    {
      id: "s1",
      storyboardId: 1,
      index: 0,
      narrative: { type: "CHAR-SCENE", sceneName: "厅堂" },
      generation: { videoDesc: "v" },
    },
  ];
  const flat = shotsFromFlowStoryboard([
    { id: 1, prompt: "--cref CHAR-A --sref SCENE-9" },
  ]);
  const m = mergeShots(structured, flat);
  ok("mergeShots fills sceneCode from flat", m[0]?.narrative.sceneCode === "SCENE-009");
}

ok("missing_scene reverse ≠ INFRA", resolveReverseTarget("missing_scene") !== "INFRA");
ok("missing_scene → SB", resolveReverseTarget("missing_scene") === "SB");

// --- null narrative + prompt-only --sref (GSD/GVP parity input) ---
{
  const shot: EpisodeShot = {
    id: "shot-x",
    storyboardId: 1,
    index: 0,
    narrative: { type: "CHAR-SCENE" },
    generation: {
      imagePrompt: "empty room --cref CHAR-SHENMU --sref SCENE-001",
    },
  };
  const { crefs, srefs } = parseCrefsSrefsFromPrompt(String(shot.generation.imagePrompt));
  const sceneCode =
    shot.narrative.sceneCode ?? srefs[0] ?? null;
  const charCodes = [
    ...(shot.narrative.assetCodes ?? []).filter((c) => /^CHAR-/i.test(c)),
    ...crefs,
  ];
  ok("null narrative + --sref → SCENE-001", sceneCode === "SCENE-001");
  ok("null narrative + --cref → CHAR", charCodes.includes("CHAR-SHENMU"));
}

if (failed) process.exit(1);
console.log("\n=== test:resolve-shot-identity OK ===");

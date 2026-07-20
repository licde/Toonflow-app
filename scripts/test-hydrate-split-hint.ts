/**
 * yarn test:hydrate-split-hint — NAR-14 metadata survives hydrate → burn
 */
import { hydratePackageFromPreDesign } from "@/ruleEngine/bundle/hydratePackageFromPreDesign";
import { decideVideoQuality } from "@/ruleEngine/compilers/qualityDecision";
import { hasAudioDialogueContradiction, hasFiveSectionPlaceholders } from "@/ruleEngine/compilers/finalizeFiveSectionPrompt";
import { normalizePreDesignPack } from "@/ruleEngine/bundle/normalizePreDesignPack";
import { scriptBundleSchema } from "@/ruleEngine/bundle/schema";
import type { EpisodePackage } from "@/ruleEngine/types";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const longText = "这是一句超过二十个汉字的长台词必须带拆镜提示。";

ok(
  "placeholder detects seed motion",
  hasFiveSectionPlaceholders("0s-4s: readable action beats from seed."),
);
ok(
  "placeholder detects empty fg",
  hasFiveSectionPlaceholders("fg:  , bg: x"),
);

const preShot = {
  shotIndex: 1,
  sceneName: "卧房",
  duration: 8,
  narrative: {
    dialogue: {
      lines: [{ speaker: "A", text: longText, lineId: "L1", splitHint: "reaction_shot", reactionAction: "听者微怔" }],
    },
  },
  generation: { imagePrompt: "x", videoPrompt: "[Visual]\nclean\n[Audio]\nA says \"短。\" (dialogue)\n[Camera]\nduration 5s" },
};

const pkg: EpisodePackage = {
  projectId: 1,
  scriptId: 1,
  episodeIndex: 1,
  shots: [
    {
      index: 0,
      storyboardId: 661,
      narrative: { dialogue: { lines: [{ speaker: "A", text: longText }] } },
      generation: {},
    },
  ],
} as never;

const hydrated = hydratePackageFromPreDesign(pkg, [preShot as never]);
const line0 = hydrated.shots[0]?.narrative?.dialogue?.lines;
const structured = Array.isArray(line0) ? (line0[0] as { splitHint?: string; reactionAction?: string; text?: string }) : null;
ok("hydrate keeps splitHint", structured?.splitHint === "reaction_shot", JSON.stringify(structured));
ok("hydrate keeps reactionAction", structured?.reactionAction === "听者微怔");

const withHint = decideVideoQuality({
  vendorId: "agnesai",
  videoPrompt: "[Visual]\nok\n[Audio]\nA says \"短。\" (dialogue), lip-sync active\n[Camera]\nduration 5s",
  shot: {
    duration: 8,
    narrative: { dialogue: { lines: [{ text: longText, splitHint: "reaction_shot" }] } },
  },
});
ok("burn allows when splitHint present", withHint.burnAllowed === true, withHint.reasons.join(","));

const without = decideVideoQuality({
  vendorId: "agnesai",
  videoPrompt: "[Visual]\nok\n[Audio]\nA says \"短。\" (dialogue)\n[Camera]\nduration 5s",
  shot: {
    duration: 8,
    narrative: { dialogue: { lines: [{ text: longText }] } },
  },
});
ok("burn blocks nar14 without hint", !without.burnAllowed && without.reasons.includes("nar14_long_line"));

const dirtyPrompt = `[Visual]
CU, fg:  , bg:  , FX:  , micro-expression: /neutral_closed

[Motion]
0s-4s: readable action beats from seed.

[Audio]
No spoken dialogue. ambient/SFX only., A says "很长很长很长很长很长很长台词" (dialogue), lip-sync active

[Camera]
duration 5s`;
ok("detects empty visual placeholders", hasFiveSectionPlaceholders(dirtyPrompt));
ok("detects audio contradiction", hasAudioDialogueContradiction(dirtyPrompt));

const dirtyQd = decideVideoQuality({
  vendorId: "agnesai",
  videoPrompt: dirtyPrompt,
  shot: { duration: 5, narrative: { dialogue: { lines: [{ text: "短句。" }] } } },
});
ok(
  "dirty prompt blocks burn",
  !dirtyQd.burnAllowed &&
    (dirtyQd.reasons.includes("five_section_placeholder") || dirtyQd.reasons.includes("audio_dialogue_contradiction")),
  dirtyQd.reasons.join(","),
);

// ingestHeal must NOT stub splitHint
const bundle: ScriptBundle = {
  bundleType: "script",
  script: "x",
  meta: {},
  planData: {},
  preDesignPack: {
    scriptPlan: "",
    shots: [
      {
        shotIndex: 1,
        sceneName: "卧房",
        narrative: { dialogue: { lines: [{ text: longText }] } },
        generation: { imagePrompt: "x", videoPrompt: "static 3s" },
      },
    ],
  },
} as never;
const norm = normalizePreDesignPack(bundle, { ingestHeal: true });
const afterHeal = norm.shots[0]?.narrative?.dialogue?.lines?.[0] as { splitHint?: string } | undefined;
ok("ingestHeal does not stub splitHint", !afterHeal?.splitHint, JSON.stringify(afterHeal));

// mirror still works
const bundleMirror: ScriptBundle = {
  bundleType: "script",
  script: "x",
  meta: {},
  planData: {
    dialoguePlan: {
      lines: [{ lineId: "L1", text: longText, splitHint: "reaction_shot" }],
    },
  },
  preDesignPack: {
    scriptPlan: "",
    shots: [
      {
        shotIndex: 1,
        sceneName: "卧房",
        narrative: { dialogue: { lines: [{ lineId: "L1", text: longText }] } },
        generation: { imagePrompt: "x", videoPrompt: "static 3s" },
      },
    ],
  },
} as never;
const mirrored = normalizePreDesignPack(bundleMirror, { ingestHeal: true });
const mLine = mirrored.shots[0]?.narrative?.dialogue?.lines?.[0] as { splitHint?: string } | undefined;
ok("mirror copies plan splitHint to shot", mLine?.splitHint === "reaction_shot");

// Zod schema must not strip NAR metadata (exportGate parse path)
const parsed = scriptBundleSchema.safeParse({
  bundleType: "script",
  meta: {},
  script: "场1\nA：x",
  preDesignPack: {
    scriptPlan: "#",
    shots: [
      {
        shotIndex: 1,
        narrative: {
          dialogue: {
            lines: [{ speaker: "A", text: longText, splitHint: "reaction_shot", reactionAction: "听者微怔" }],
          },
        },
        generation: { imagePrompt: "x", videoPrompt: "static 2s" },
      },
    ],
  },
});
ok("schema parse ok", parsed.success, parsed.success ? "" : JSON.stringify(parsed.error?.issues?.slice(0, 3)));
if (parsed.success) {
  const pl = parsed.data.preDesignPack?.shots?.[0]?.narrative?.dialogue?.lines?.[0] as
    | { splitHint?: string; reactionAction?: string }
    | undefined;
  ok("schema keeps splitHint", pl?.splitHint === "reaction_shot");
  ok("schema keeps reactionAction", pl?.reactionAction === "听者微怔");
}

if (failed) {
  console.error(`\n${failed} test:hydrate-split-hint failed`);
  process.exit(1);
}
console.log("\n=== test:hydrate-split-hint OK ===");

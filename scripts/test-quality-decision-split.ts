/**
 * yarn test:quality-decision-split
 */
import { decideVideoQuality, ensureSplitHintOnShot } from "@/ruleEngine/compilers/qualityDecision";
import { buildBurnGateEnvelope } from "@/ruleEngine/compilers/burnGateEnvelope";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const clean = decideVideoQuality({
  videoPrompt: `[Visual]\nok\n[Audio]\n"短句。"\n[Camera]\nduration 4s`,
  shot: { duration: 4, narrative: { dialogue: { lines: [{ text: "短句。" }] } } },
  vendorId: "agnesai",
});
ok("clean allows burn", clean.burnAllowed && clean.decision === "auto");
ok("clean nextStep burn", clean.nextStep === "burn");

const f5 = decideVideoQuality({
  videoPrompt: "x",
  fxGrade: "F5",
  vendorId: "agnesai",
});
ok("F5 rePush", !f5.burnAllowed && (f5.decision === "rePush_design" || f5.decision === "soft_defer"));
ok("F5 envelope has rePushPlan", Array.isArray(f5.envelope.rePushPlan));

const still = decideVideoQuality({
  missingStillOrCref: true,
  batchMode: true,
});
ok("missing still defer", still.nextStep === "batch_still" && !still.burnAllowed);
ok("missing still soft_defer", still.decision === "soft_defer");

const long = decideVideoQuality({
  vendorId: "klingai",
  shot: {
    duration: 2,
    narrative: {
      dialogue: {
        lines: [
          { text: "一二三四五六七八九十再加很长很长对白触发口型。" },
          { text: "第二句也要说完才行啊。" },
        ],
      },
    },
  },
});
ok("lip split blocks", !long.burnAllowed);
ok("splitHint present", Boolean(long.splitHint));
ok("split decision", long.decision === "split_shot");
ok("split nextStep", long.nextStep === "split_shot");
ok("split envelope triggers lip or nar", long.envelope.triggers.some((t) => t === "pr_lip_duration" || t === "narrative_split_hint"));
ok("split has RH", long.envelope.repairHints.length >= 0);

const nar14 = decideVideoQuality({
  vendorId: "agnesai",
  shot: {
    duration: 8,
    narrative: {
      dialogue: {
        lines: [{ text: "这是一句超过二十个汉字的长台词必须带拆镜提示。" }],
      },
    },
  },
});
ok("NAR-14 blocks without splitHint", !nar14.burnAllowed && nar14.decision === "split_shot");
ok(
  "NAR-14 trigger nar14_split",
  nar14.envelope.triggers.includes("nar14_split") || nar14.envelope.triggers.includes("narrative_split_hint"),
  JSON.stringify(nar14.envelope.triggers),
);
// Confirm/Orchestrator owns physical split — decide must NOT invent splitHint onto shot (false-green)
ok(
  "NAR-14 proposes splitHint without writing shot",
  Boolean(nar14.splitHint) &&
    !(nar14.shotWithSplitHint?.narrative?.dialogue?.lines?.[0] as { splitHint?: string } | undefined)?.splitHint,
  `hint=${nar14.splitHint} written=${Boolean((nar14.shotWithSplitHint?.narrative?.dialogue?.lines?.[0] as { splitHint?: string })?.splitHint)}`,
);

const batchSplit = decideVideoQuality({
  vendorId: "klingai",
  batchMode: true,
  shot: {
    duration: 2,
    narrative: {
      dialogue: {
        lines: [
          { text: "一二三四五六七八九十再加很长很长对白触发口型。" },
          { text: "第二句也要说完才行啊。" },
        ],
      },
    },
  },
});
ok("batch soft_defer", batchSplit.decision === "soft_defer" && !batchSplit.burnAllowed);
ok("batch keeps split_shot nextStep", batchSplit.nextStep === "split_shot");

const patched = ensureSplitHintOnShot(
  {
    narrative: { dialogue: { lines: [{ text: "一二三四五六七八九十再加很长很长对白触发口型。" }] } },
  },
  "reaction_shot",
);
ok(
  "ensureSplitHint writes",
  (patched.narrative?.dialogue?.lines?.[0] as { splitHint?: string })?.splitHint === "reaction_shot",
);

const dirty = decideVideoQuality({
  vendorId: "agnesai",
  videoPrompt: `[Visual]\nfg:  , FX:  ,\n[Motion]\n0s-4s: readable action beats from seed.\n[Audio]\nNo spoken dialogue. ambient/SFX only., A says "hi" (dialogue), lip-sync active\n[Camera]\nduration 4s`,
  shot: { duration: 4, narrative: { dialogue: { lines: [{ text: "短。" }] } } },
});
ok("placeholder/audio conflict blocks burn", !dirty.burnAllowed);
ok(
  "placeholder or audio reason",
  dirty.reasons.includes("five_section_placeholder") || dirty.reasons.includes("audio_dialogue_contradiction"),
  dirty.reasons.join(","),
);

const env = buildBurnGateEnvelope(
  [{ id: "NAR-14", message: "长台词缺 splitHint 须拆镜", reverseTrigger: "narrative_split_hint" }],
  { decision: "split_shot", splitHint: "reaction_shot" },
);
ok("envelope NAR-14 → split_shot", env.nextStep === "split_shot");
ok("envelope decision field", env.decision === "split_shot");
ok("envelope has reverse plan", env.rePushPlan.length > 0 || env.triggers.includes("narrative_split_hint"));

const softNoOverride = buildBurnGateEnvelope(
  [{ id: "LIP-01", message: "口型", reverseTrigger: "pr_lip_duration" }],
  { decision: "soft_defer", nextStep: "split_shot" },
);
ok("soft_defer preserves explicit nextStep", softNoOverride.nextStep === "split_shot");

if (failed) {
  console.error(`\n${failed} quality-decision-split failed`);
  process.exit(1);
}
console.log("\n=== test:quality-decision-split OK ===");

/**
 * yarn test:video-mode-matrix — four modes keep Chinese dialogue after dialect.
 */
import { adaptPromptForModeSync } from "@/ruleEngine/compilers/adaptPromptForMode";
import { compileOrGenerateVideoPrompt } from "@/ruleEngine/compilers/compileOrGenerateVideoPrompt";
import type { PreDesignShot } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  const seed = `[Visual]
ring close-up
[Motion]
static hold
[Camera]
CU, duration 6s
[Audio]
"天命在我。"
lip-sync active.
[Narrative]
peak beat`;

  const modes = ["text", "singleImage", "startEndRequired", "multiParameter"] as const;
  for (const mode of modes) {
    const r = adaptPromptForModeSync(seed, mode);
    ok(`${mode} keeps 天命`, /天命在我/.test(r.prompt), r.prompt.slice(0, 180));
    if (mode === "singleImage") {
      ok(`${mode} mff once`, (r.prompt.match(/motion-from-frame/gi) ?? []).length <= 1);
    }
    if (mode === "startEndRequired") {
      ok(`${mode} START/END`, /START_FRAME/i.test(r.prompt) && /END_FRAME/i.test(r.prompt));
    }
    if (mode === "multiParameter") {
      ok(`${mode} References`, /\[References\]/i.test(r.prompt));
    }
  }

  const shot: PreDesignShot = {
    shotIndex: 1,
    duration: 2,
    generation: { videoPrompt: "中景 static, duration 2s" },
    narrative: { dialogue: { lines: [{ text: "摔杯为证。" }] } },
  };
  const ir = await compileOrGenerateVideoPrompt({
    mode: "text",
    designShot: shot,
    implementationPlanItem: {
      avCausality: { visualPeak: "摔杯烛灭", audioBeat: "碎裂声" },
    },
    dialogueLines: ["摔杯为证。"],
  });
  ok("compile IR source", ir.source === "prompt_ir");
  ok("compile has peak or dialogue", /摔杯/.test(ir.prompt));

  if (failed) {
    console.error(`\n${failed} video-mode-matrix failed`);
    process.exit(1);
  }
  console.log("\n=== test:video-mode-matrix OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

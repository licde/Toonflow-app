/**
 * yarn test:mode-prompt-goldens
 * Structural must/mustNot for four video modes (appendix E1–E4).
 */
import fs from "fs";
import path from "path";
import { fillModeMatrix } from "@/ruleEngine/kernels/compileKernel";
import { applyDesignFieldRegistry, extractDesignFields, loadDesignFieldRegistry } from "@/ruleEngine/design/designFieldRegistry";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  const fixture = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/fixtures/mode-prompt-examples.json"), "utf-8"),
  ) as {
    seed: string;
    charCodes: string[];
    sceneCode: string;
    designFields: Record<string, unknown>;
    modes: Record<string, { must: string[]; mustNot: string[] }>;
  };

  ok("design_field_registry loaded", loadDesignFieldRegistry().length >= 10);

  const extracted = extractDesignFields({
    modality: "video",
    mode: "text",
    charCodes: fixture.charCodes,
    storyboard: { videoDesc: fixture.seed, duration: 5, track: "推进" },
  });
  const fields = { ...extracted, ...fixture.designFields };

  const modes = Object.keys(fixture.modes);
  const matrix = await fillModeMatrix({
    modes,
    seedPrompt: fixture.seed,
    charCodes: fixture.charCodes,
    sceneCode: fixture.sceneCode,
    designFields: fields as never,
  });

  const prompts = modes.map((m) => matrix[m]?.prompt ?? "");
  ok("four mode prompts pairwise unequal", new Set(prompts.map((p) => p.trim())).size === modes.length);

  for (const mode of modes) {
    const prompt = matrix[mode]?.prompt ?? "";
    const spec = fixture.modes[mode];
    for (const pat of spec.must) {
      ok(`${mode} must /${pat}/`, new RegExp(pat, "i").test(prompt), prompt.slice(0, 200));
    }
    for (const pat of spec.mustNot) {
      if (!pat) continue;
      ok(`${mode} mustNot /${pat}/`, !new RegExp(pat, "i").test(prompt), prompt.slice(0, 120));
    }
  }

  // Registry field inject evidence
  const applied = applyDesignFieldRegistry("base", fields as never, { modality: "video", mode: "text" });
  ok("registry injects duration", applied.injected.includes("duration") || /duration/i.test(applied.prompt));
  ok("registry injects dialogue/lip/voice", ["dialogue", "lipSync", "voice"].some((id) => applied.injected.includes(id)));
  ok("registry injects sfx", applied.injected.includes("sfx") || /sfx:/i.test(applied.prompt));
  ok("registry injects exprGuard", applied.injected.includes("exprGuard"));

  if (failed) {
    console.error(`\n${failed} mode-prompt-goldens failed`);
    process.exit(1);
  }
  console.log("\n=== test:mode-prompt-goldens OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

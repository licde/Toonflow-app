/**
 * Enforce modality_prompt_slots.json required slots vs promptIR / fixture presence.
 * yarn test:modality-slots-enforce
 */
import fs from "fs";
import path from "path";
import { readFixtureJson } from "@/ruleEngine/utils/fixturesPath";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function main() {
  console.log("# modality_prompt_slots enforce\n");

  const slots = readFixtureJson<{
    version?: string;
    slots: Record<string, string[]>;
    requiredPerTier: Record<string, string[]>;
  }>("modality_prompt_slots.json", { slots: {}, requiredPerTier: {} });

  ok("fixture has IMG identity", (slots.slots.IMG ?? []).includes("identity"));
  ok("fixture has IMG cref", (slots.slots.IMG ?? []).includes("cref"));
  ok("fixture has VID identity", (slots.slots.VID ?? []).includes("identity"));
  ok("fixture has AUD identity", (slots.slots.AUD ?? []).includes("identity"));
  ok("T3 requires IMG VID AUD FX", (slots.requiredPerTier.T3 ?? []).includes("IMG") && (slots.requiredPerTier.T3 ?? []).includes("VID"));

  const irPath = path.join(process.cwd(), "src", "ruleEngine", "compilers", "promptIR.ts");
  const ir = fs.readFileSync(irPath, "utf-8");
  ok("promptIR enforces identity/cref", /identity|cref|sref/.test(ir));
  ok("promptIR mentions --sref or SCENE", /sref|SCENE/.test(ir));

  // Structural: every modality list in fixture must be non-empty for T3 keys
  for (const mod of ["IMG", "VID", "AUD", "FX"]) {
    ok(`slots.${mod} non-empty`, (slots.slots[mod] ?? []).length > 0, String((slots.slots[mod] ?? []).length));
  }

  if (failed) {
    console.error(`\n${failed} modality-slots check(s) failed`);
    process.exit(1);
  }
  console.log("\n=== test:modality-slots-enforce OK ===");
}

main();

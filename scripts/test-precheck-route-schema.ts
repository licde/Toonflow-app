/**
 * yarn test:precheck-route-schema — Zod 4 safeParse must not throw on real bundles.
 */
import fs from "fs";
import path from "path";
import { z } from "zod";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const precheckSchema = z.object({
  projectId: z.number().optional(),
  scriptId: z.number().optional(),
  bundle: z.any().optional(),
  checks: z.array(z.string()).optional(),
  apply: z.boolean().optional(),
});

const selfHealPatchSchema = z.object({
  patch: z.record(z.string(), z.unknown()).optional(),
});

const golden = path.join(process.cwd(), "data/fixtures/golden/untitled-3-repaired.json");
ok("golden exists", fs.existsSync(golden));
const bundle = JSON.parse(fs.readFileSync(golden, "utf-8")) as Record<string, unknown>;

let threw = false;
try {
  precheckSchema.safeParse({ bundle, apply: true, checks: ["LANG-01"] });
} catch (e) {
  threw = true;
  console.error(e);
}
ok("precheck schema safeParse does not throw", !threw);

const parsed = precheckSchema.safeParse({ bundle, apply: true });
ok("precheck schema parses bundle", parsed.success);

let patchThrew = false;
try {
  selfHealPatchSchema.safeParse({ patch: { op: "set", path: "x" } });
} catch {
  patchThrew = true;
}
ok("selfHeal patch schema safeParse does not throw", !patchThrew);

process.exit(failed ? 1 : 0);

/** yarn test:design-closure-golden — DC-01~15 golden */
import fs from "fs";
import path from "path";
import { runDesignClosureDryRun, designClosureBlocked } from "@/ruleEngine/bundle/designClosureDryRun";
import { scriptBundleSchema, stripCommentFields } from "@/ruleEngine/bundle/schema";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

const cases: { file: string; id: string; expectBlock: boolean }[] = [
  { file: "dialogue-break-block.json", id: "G87", expectBlock: true },
  { file: "scene-break-block.json", id: "G88", expectBlock: true },
  { file: "av-drift-block.json", id: "G89", expectBlock: true },
  { file: "story-marker-missing-block.json", id: "G90", expectBlock: true },
  { file: "script-bundle-template-v2.json", id: "v2-positive", expectBlock: false },
];

let failed = 0;
const dir = path.join(process.cwd(), "data/fixtures");
for (const c of cases) {
  const p = c.file.includes("template") ? path.join(dir, c.file) : path.join(dir, "golden", c.file);
  if (!fs.existsSync(p)) continue;
  const raw = JSON.parse(fs.readFileSync(p, "utf-8"));
  const bundle = scriptBundleSchema.parse(stripCommentFields(raw)) as ScriptBundle;
  const dc = runDesignClosureDryRun(bundle);
  const blocked = designClosureBlocked(dc);
  const ok = blocked === c.expectBlock;
  console.log(`${ok ? "✓" : "✗"} ${c.id} ${c.file} blocked=${blocked}`);
  if (!ok) failed++;
}

process.exit(failed ? 1 : 0);

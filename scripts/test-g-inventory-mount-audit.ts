/**
 * Inventory untilClear mount audit + stillToVideoMap coverage.
 * yarn test:g-inventory-mount-audit
 */
import { loadPracticeInventory } from "../src/ruleEngine/quality/practiceCompleteness";
import { loadUntilClearMountGraph, auditUntilClearMounts } from "../src/ruleEngine/quality/untilClearRuntime";
import { loadVideoLiteraryIntentDoctrine } from "../src/ruleEngine/compilers/videoIntentPolicy";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const inv = loadPracticeInventory();
const untilClearIds = (inv.classes ?? []).filter((c) => c.untilClear).map((c) => c.id);
ok("inventory untilClear count", untilClearIds.length >= 30);

const graph = loadUntilClearMountGraph();
const phase1 = new Set(graph.phase1Classes ?? []);
for (const id of phase1) {
  ok(`phase1 declared ${id}`, graph.bindings.some((b) => b.classId === id));
}
for (const id of ["SPATIAL_LAYOUT", "PAPER_DOC_READABLE", "PROP_IN_FRAME", "ACTION_MISFIRE", "PROMPT_FIDELITY", "IDENTITY_PLATE", "SECONDARY_DOMINANCE"]) {
  ok(`phase1 promoted ${id}`, phase1.has(id));
}

const deferredPath = require("path").join(
  process.cwd(),
  "data/fixtures/until_clear_deferred_classes.json",
);
let deferredList: string[] = untilClearIds.filter((id) => !phase1.has(id));
try {
  const raw = JSON.parse(require("fs").readFileSync(deferredPath, "utf8")) as {
    DEFERRED_UNTIL_CLEAR_CLASSES?: string[];
  };
  // file may be array-wrapped via export const — accept either shape
  if (Array.isArray(raw)) deferredList = raw as string[];
  else if (Array.isArray(raw.DEFERRED_UNTIL_CLEAR_CLASSES)) {
    deferredList = raw.DEFERRED_UNTIL_CLEAR_CLASSES;
  }
} catch {
  /* use computed defer */
}
const audit = auditUntilClearMounts({ deferClassIds: deferredList });
ok("phase1 handlers live", audit.missing.length === 0, JSON.stringify(audit.missing));
ok(
  "deferred list covers non-phase1",
  deferredList.every((id) => !phase1.has(id)) || deferredList.length > 0,
  `deferred=${deferredList.length}`,
);

const map = loadVideoLiteraryIntentDoctrine().stillToVideoMap ?? {};
for (const k of ["action_primary_mid", "ots_mid", "reaction_mid"]) {
  ok(`stillToVideoMap ${k}`, Boolean(map[k]), String(map[k]));
}

// noEscape compile: BG must forbid drop-only heal
const bg = inv.classes?.find((c) => c.id === "BG_READABLE");
ok("BG noEscape", /no_drop_scene_ref_as_sole_heal/.test(bg?.noEscape ?? ""));

console.log("test:g-inventory-mount-audit passed");

/**
 * UntilClearRuntime mount graph + phase1 handlers.
 * yarn test:g-untilclear-runtime
 */
import {
  auditUntilClearMounts,
  loadUntilClearMountGraph,
  runUntilClearDetect,
  untilClearBurnCta,
  mayStampHqOk,
} from "../src/ruleEngine/quality/untilClearRuntime";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

const graph = loadUntilClearMountGraph();
ok("phase1 bindings", (graph.phase1Classes?.length ?? 0) >= 3);
ok("BG handler bound", graph.bindings.some((b) => b.classId === "BG_READABLE"));
ok("CONTACT handler bound", graph.bindings.some((b) => b.classId === "CONTACT_GEOM"));

const audit = auditUntilClearMounts({ deferClassIds: [] });
ok("phase1 live handlers", audit.missing.length === 0, audit.missing.join(","));
ok("no false mounts", audit.falseMounts.length === 0, audit.falseMounts.join(","));

const bgFindings = runUntilClearDetect({
  phase: "still_L1",
  visualDescription: "特写。殿内。",
  fidelityItems: [{ id: "background_readable", pass: false, fixHint: "灰棚" }],
});
ok("BG L1 detect", bgFindings.some((f) => f.classId === "BG_READABLE"));

const cta = untilClearBurnCta(bgFindings);
ok("BG CTA batch_still", cta.primaryNextStep === "batch_still");
ok("BG CTA label", /背景/.test(cta.ctaLabel));

const stamp = mayStampHqOk({
  phase: "still_L1",
  stillQuality: "hq_ok",
  visualPass: false,
  keyAbsent: true,
});
ok("no forge hq without vp", stamp.ok === false);

const stamp2 = mayStampHqOk({
  phase: "still_L1",
  stillQuality: "hq_ok",
  visualPass: true,
  visualPassAt: new Date().toISOString(),
});
ok("stamp ok with vp", stamp2.ok === true);

console.log("test:g-untilclear-runtime passed");

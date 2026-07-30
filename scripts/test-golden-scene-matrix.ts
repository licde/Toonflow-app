/**
 * yarn test:golden-scene-matrix
 * F6: paper_doc / seating / lip / os / ensemble offline asserts
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  isContactEventVd,
  inferContactStartStateFromStill,
  buildContactEventMotionBeats,
} from "../src/ruleEngine/compilers/contactEventPolicy";
import { selectLayoutFamily } from "../src/ruleEngine/qc/stillCompositionSpec";

type Scene = {
  id: string;
  visualDescription: string;
  expect: Record<string, unknown>;
};

const raw = JSON.parse(
  readFileSync(join(__dirname, "../data/fixtures/golden/golden-scene-matrix.json"), "utf8"),
) as { scenes: Scene[] };

let failed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) {
    console.error("✗", msg);
    failed++;
  } else console.log("✓", msg);
}

for (const s of raw.scenes) {
  const vd = s.visualDescription;
  const exp = s.expect;
  if (exp.contactEvent) {
    ok(isContactEventVd(vd) || /休书|贴颊/.test(vd), `${s.id}: contactEvent`);
    const st = inferContactStartStateFromStill({ visualDescription: vd, stillPrompt: vd });
    if (exp.contactStartState) {
      ok(st.state === exp.contactStartState || st.state === "held_mid", `${s.id}: start=${st.state}`);
    }
    const beats = buildContactEventMotionBeats({
      visualDescription: vd,
      durationSec: 2,
      contactStartState: "at_locus",
    });
    if (beats && Array.isArray(exp.motionMustNot)) {
      for (const re of exp.motionMustNot as string[]) {
        ok(!new RegExp(re).test(beats.body), `${s.id}: motion not ${re}`);
      }
    }
  }
  if (exp.layoutFamily) {
    const fam = selectLayoutFamily({
      visualDescription: vd,
      characterCount: Number(exp.characterCount) || undefined,
    });
    ok(fam.familyId === exp.layoutFamily, `${s.id}: family=${fam.familyId} expect ${exp.layoutFamily}`);
  }
  if (exp.stageAForbidden) {
    const fam = selectLayoutFamily({
      visualDescription: vd,
      characterCount: Number(exp.characterCount) || 4,
    });
    ok(
      fam.familyId === "ensemble_4plus" || fam.familyId === "none",
      `${s.id}: StageA forbidden (got ${fam.familyId})`,
    );
  }
  if (exp.lipForbidden) {
    ok(/空镜|（OS）|\(OS\)/.test(vd), `${s.id}: empty/OS mark`);
  }
  if (exp.emptyShot) {
    ok(/空镜|无人/.test(vd), `${s.id}: emptyShot`);
  }
  if (exp.lipSync === "on_cam") {
    ok(/开口|唇形|：「/.test(vd), `${s.id}: on-cam lip cue`);
  }
}

if (failed) {
  console.error(`\n${failed} golden-scene-matrix failed`);
  process.exit(1);
}
console.log("\ntest:golden-scene-matrix OK");

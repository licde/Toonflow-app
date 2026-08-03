/**
 * yarn test:g-desc-coverage-untilclear
 * contact_geom / atmosphere missing must untilClear-inject; egress descCoverageOk true.
 */
import { composeStillPrompt } from "../src/ruleEngine/compilers/composeStillPrompt";
import { assertStillDescCoverage } from "../src/ruleEngine/compilers/stillDescCoverage";

function ok(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

{
  const c = composeStillPrompt({
    visualDescription: "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。",
    shotSize: "特写",
    qualityMode: "hq_update",
    characters: [{ code: "CHAR-A", name: "沈清漪", hasImage: true, kind: "role" }],
    sceneColorLock: { 寝殿: "4500K暖光" },
    sceneName: "寝殿",
    spatialRelation: { axis: "沈清漪-沈母", anchors: ["女主跪坐", "沈母站立"] },
  });
  ok(Boolean(c.ok && c.prompt), `compose ok (${c.blockReason ?? "pass"})`);
  ok(c.descCoverageOk === true, `descCoverageOk after untilClear (missing=${(c.descCoverageMissing ?? []).join(",")})`);
  ok(/禁口含/.test(c.prompt || ""), "mouth-ban present");
  ok(/仅面颊触|仅颊触/.test(c.prompt || ""), "locus-only present");
  ok(/色温：/.test(c.prompt || "") || /4500K/.test(c.prompt || ""), "sceneColorLock string consumed");
  ok(/站位：/.test(c.prompt || ""), "spatialRelation homogenized to 站位");
  ok(!/空间关系：\[object Object\]/.test(c.prompt || ""), "no raw object spatial dump");
}

{
  const cov = assertStillDescCoverage({
    prompt: "特写沈清漪，休书划过面颊，禁口含；禁纸入口；仅面颊触非口含",
    description: "特写。沈清漪侧脸，休书纸角划过面颊。",
    characterNames: ["沈清漪"],
    shotSize: "特写",
    bgPolicy: "drop",
  });
  ok(cov.ok || !cov.missing.some((m) => /background_readable/i.test(m)), `faceCu drop: no BG_READABLE L0 fail (${cov.missing.join(",")})`);
}

console.log("\ntest:g-desc-coverage-untilclear OK");

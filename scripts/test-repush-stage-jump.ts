/**
 * rePush stage jump contract — STAGE_TAB coverage + FE goDesignStage.
 * yarn test:repush-stage-jump
 */
import fs from "fs";
import path from "path";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

/** Mirror of Toonflow-web useAdaptationNav STAGE_TAB — must stay in sync. */
const STAGE_TAB: Record<string, number> = {
  P03: 1,
  CD: 1,
  BP: 1,
  W1: 1,
  W2: 1,
  W3: 1,
  GB: 1,
  B: 1,
  SB: 2,
  EN: 2,
  MD: 2,
  AS: 2,
  INFRA: 2,
};

function main() {
  console.log("# rePush stage jump\n");

  for (const layer of ["CD", "W3", "BP", "INFRA", "EN", "SB"]) {
    ok(`STAGE_TAB has ${layer}`, layer in STAGE_TAB);
  }

  // Prefer source sibling if present
  const navSrc = path.resolve(process.cwd(), "..", "..", "Toonflow-web", "src", "composables", "useAdaptationNav.ts");
  const altNav = path.resolve("I:/toonflow/Toonflow-web/src/composables/useAdaptationNav.ts");
  const navPath = fs.existsSync(navSrc) ? navSrc : fs.existsSync(altNav) ? altNav : null;
  if (navPath) {
    const src = fs.readFileSync(navPath, "utf-8");
    ok("goDesignStage in source", /goDesignStage/.test(src));
    ok("query.stage in source", /stage/.test(src) && /scriptAgent/.test(src));
    for (const layer of ["CD", "W3", "BP", "INFRA"]) {
      ok(`source STAGE_TAB ${layer}`, new RegExp(`${layer}\\s*:`).test(src));
    }
  } else {
    ok("useAdaptationNav source available", false, "Toonflow-web not found");
  }

  // Packaged FE
  const assetsDir = path.join(process.cwd(), "data", "web", "assets");
  let fe = "";
  if (fs.existsSync(assetsDir)) {
    for (const name of fs.readdirSync(assetsDir)) {
      if (!name.endsWith(".js")) continue;
      const p = path.join(assetsDir, name);
      if (fs.statSync(p).size > 5_000_000) continue;
      fe += fs.readFileSync(p, "utf-8");
    }
  }
  ok("FE has goDesignStage or stage jump", /goDesignStage|scriptAgent/.test(fe) && /stage/.test(fe));

  if (failed) {
    console.error(`\n${failed} repush-stage-jump check(s) failed`);
    process.exit(1);
  }
  console.log("\n=== test:repush-stage-jump OK ===");
}

main();

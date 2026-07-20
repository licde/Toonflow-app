/**
 * FE integration contract — shipped data/web must include mode-matrix + picker URL + rePush stage jump.
 * yarn test:fe-integration-contract
 */
import fs from "fs";
import path from "path";

const webDir = path.join(process.cwd(), "data", "web");
const assetsDir = path.join(webDir, "assets");

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function readAllJs(dir: string): string {
  if (!fs.existsSync(dir)) return "";
  const parts: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".js")) continue;
    const p = path.join(dir, name);
    try {
      const st = fs.statSync(p);
      if (st.size > 8_000_000) continue; // skip huge workers
      parts.push(fs.readFileSync(p, "utf-8"));
    } catch {
      /* skip */
    }
  }
  return parts.join("\n");
}

function main() {
  console.log("# FE integration contract\n");
  ok("data/web/index.html exists", fs.existsSync(path.join(webDir, "index.html")));
  ok("data/web/assets exists", fs.existsSync(assetsDir));

  const bundle = readAllJs(assetsDir);
  ok("assets JS readable", bundle.length > 1000, `len=${bundle.length}`);

  ok("fillModeMatrix wired", /fillModeMatrix/.test(bundle));
  ok("promptByMode wired", /promptByMode/.test(bundle));
  ok("slotFingerprint or promptMatrixKey in served data/web", /slotFingerprint|promptMatrixKey/.test(bundle));
  ok("selfHeal or getShotSpecDiff client hint", /getShotSpecDiff|selfHeal|missingAssetImageQueue/.test(bundle) || fs.existsSync(path.join(process.cwd(), "src/routes/ruleEngine/selfHeal.ts")));
  const ruleEngineSrc = path.join("I:/toonflow/Toonflow-web/src/utils/ruleEngine.ts");
  ok("FE ruleEngine.selfHeal helper", fs.existsSync(ruleEngineSrc) && /selfHeal/.test(fs.readFileSync(ruleEngineSrc, "utf-8")));
  if (fs.existsSync(ruleEngineSrc)) {
    const reSrc = fs.readFileSync(ruleEngineSrc, "utf-8");
    // Interceptor already returns envelope; must not double-unwrap via `return data.data` after `const { data } = await axios`
    const doubleUnwrap =
      /const\s*\{\s*data\s*\}\s*=\s*await\s+axios\.post[\s\S]{0,120}return\s+data\.data/.test(reSrc) ||
      (/return\s+data\.data/.test(reSrc) && !/postData|envelope\.data/.test(reSrc));
    ok("FE ruleEngine single unwrap (no data.data after axios)", !doubleUnwrap && /postData|envelope\.data|ApiEnvelope/.test(reSrc));
  }
  ok("resolveUrls present", /resolveUrls/.test(bundle));
  ok("storyboard resolve path", /storyboard/.test(bundle) && /resolveUrl(s|Sync)/.test(bundle));
  ok("IdentitySlotChips or identitySlots", /IdentitySlotChips|identitySlots|identitySlotChips/.test(bundle));
  ok("goDesignStage or stage query jump", /goDesignStage|query:\s*\{[^}]*stage|"stage"/.test(bundle));

  const webSrcAlt = "I:/toonflow/Toonflow-web/src/views/production/components/workbench/generate";
  const drawer = path.join(webSrcAlt, "components/ShotSpecDrawer.vue");
  ok("ShotSpecDrawer component exists", fs.existsSync(drawer));
  if (fs.existsSync(drawer)) {
    const vue = fs.readFileSync(drawer, "utf-8");
    ok("ShotSpecDrawer calls getShotSpecDiff", /getShotSpecDiff/.test(vue));
    ok("ShotSpecDrawer shows modeMatrix", /modeMatrix/.test(vue));
    ok("ShotSpecDrawer has 一键自愈", /一键自愈|selfHeal/.test(vue));
    ok("ShotSpecDrawer healRound null guard", /healRound/.test(vue) && /typeof result\.healRound|result\?\.healRound|响应无效/.test(vue));
    ok("ShotSpecDrawer heal scope whitelist", /自愈范围|仅告知|stateVariants/.test(vue));
  }
  ok("getShotSpecDiff route file", fs.existsSync(path.join(process.cwd(), "src/routes/production/workbench/getShotSpecDiff.ts")));
  ok("importHeal route file", fs.existsSync(path.join(process.cwd(), "src/routes/ruleEngine/importHeal.ts")));
  ok(
    "importHeal orchestrator",
    fs.existsSync(path.join(process.cwd(), "src/ruleEngine/importHealOrchestrator.ts")),
  );
  const feRuleEngine = path.join("I:/toonflow/Toonflow-web/src/utils/ruleEngine.ts");
  if (fs.existsSync(feRuleEngine)) {
    ok("FE importHeal helper", /importHeal/.test(fs.readFileSync(feRuleEngine, "utf-8")));
  }

  // Matrix path must win: genText fills matrix; modeChange reads cache (i18n may still mention modeChangeConfirm)
  const hasMatrixSwitch = /promptByMode/.test(bundle) && /fillModeMatrix/.test(bundle);
  const destructiveClearHandler =
    /modeChangeConfirm[\s\S]{0,400}imageList\.value\s*=\s*\[\s*\][\s\S]{0,200}prompt\s*=\s*[\"']{2}/.test(bundle) ||
    /imageList\.value\s*=\s*\[\s*\][\s\S]{0,120}prompt\s*=\s*[\"']{2}[\s\S]{0,200}modeChangeConfirm/.test(bundle);
  ok(
    "mode switch prefers matrix (not clear-only)",
    hasMatrixSwitch && !destructiveClearHandler,
    hasMatrixSwitch ? (destructiveClearHandler ? "destructive clear handler still present" : "ok") : "matrix missing",
  );

  // TouchKernel SSOT name may live only in BE; FE uses resolveUrlSync — require shared keying id+sources
  ok("url key id:sources pattern", /\$\{[^}]*id[^}]*\}:\$\{[^}]*sources/.test(bundle) || /makeUrlKey|id.*sources/.test(bundle));

  // Slot fingerprint cache key (source contract; packaged web may lag until lite integrate)
  const webSrc = path.join(process.cwd(), "..", "Toonflow-web", "src", "views", "production", "components", "workbench", "generate", "index.vue");
  const webSrcIndex = path.join("I:/toonflow/Toonflow-web/src/views/production/components/workbench/generate/index.vue");
  const vuePath = fs.existsSync(webSrc) ? webSrc : fs.existsSync(webSrcIndex) ? webSrcIndex : "";
  if (vuePath) {
    const vue = fs.readFileSync(vuePath, "utf-8");
    ok("FE promptMatrixKey = trackId::slotFingerprint", /promptMatrixKey|slotFingerprint/.test(vue) && /trackId.*::|::\$\{/.test(vue));
  } else {
    ok("FE slotFingerprint in packaged bundle OR source", /slotFingerprint|promptMatrixKey/.test(bundle) || /::\$\{/.test(bundle));
  }

  if (failed) {
    console.error(`\n${failed} FE contract check(s) failed`);
    process.exit(1);
  }
  console.log("\n=== test:fe-integration-contract OK ===");
}

main();

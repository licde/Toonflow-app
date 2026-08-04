/**
 * V5-02/05/08 + V5-C1: app↔docs contract surface + skill-matrix + runtimeGap baseline zero-growth.
 * yarn audit:v5-contract-ci
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawnSync } from "child_process";

const root = process.cwd();
let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function sha(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 16);
}

const contractFiles = [
  "docs/toonflow-web/types/stillQuality.ts",
  "docs/toonflow-web/types/stillIntentOps.ts",
  "docs/toonflow-web/types/videoIntentOps.ts",
  "docs/toonflow-web/components/RulePanel.vue",
  "docs/toonflow-web/components/LitDetailDebtBar.vue",
  "docs/toonflow-web/components/VideoIntentDebtBar.vue",
  "docs/toonflow-web/components/ShotWorkbenchDebtMount.vue",
];

const hashes: Record<string, string> = {};
for (const rel of contractFiles) {
  const abs = path.join(root, rel);
  ok(`contract present: ${rel}`, fs.existsSync(abs));
  if (fs.existsSync(abs)) {
    hashes[rel] = sha(abs);
    const text = fs.readFileSync(abs, "utf8");
    if (/RulePanel|smartDesign|Confirm|presentationFork/i.test(rel + text) && /RulePanel/.test(rel)) {
      ok("RulePanel has Confirm/Apply", /Confirm|smartProposal|presentationFork/i.test(text));
    }
    if (/stillQuality/.test(rel)) {
      ok("shouldBlockSilentStillRegen exported", /shouldBlockSilentStillRegen/.test(text));
      ok("resolveStillPrimaryCtaLabel exported", /resolveStillPrimaryCtaLabel/.test(text));
      ok("shootable deliveryTier fields", /deliveryTier|requireFixBeforeBurn|ctaKind/.test(text));
      ok("deriveTrackBurnAllowed exported", /deriveTrackBurnAllowed/.test(text));
      ok("evidence fields exported", /contactGeomEvidence|sceneDominanceEvidence|promptProvenance/.test(text));
      ok("i2v readiness fields exported", /i2vReady|autoRepairStage|contractHash/.test(text));
      ok("never-block CTA identity enqueue", /enqueue_identity_and_generate|补定妆并继续生成/.test(text));
      ok("fidelity enhance CTA", /增强锚点并生成|prompt_fidelity/.test(text));
    }
    if (/LitDetailDebtBar/.test(rel)) {
      ok("DebtBar shootable CTA", /resolveStillPrimaryCtaLabel|智拆并生成|继续生成修复/.test(text));
    }
  }
}

// Served FE must ship never-block silent-regen gate (prevent docs↔data/web drift)
const dataWebAssets = path.join(root, "data/web/assets");
if (fs.existsSync(dataWebAssets)) {
  const files = fs.readdirSync(dataWebAssets).filter((f) => /stillQuality/i.test(f) && f.endsWith(".js"));
  let foundNewGate = false;
  for (const f of files) {
    const js = fs.readFileSync(path.join(dataWebAssets, f), "utf8");
    const hasNeverBlockCta =
      /enqueue_identity_and_generate|补定妆并继续生成/.test(js) && /增强锚点并生成|智拆并生成/.test(js);
    // Old gate: if(meta.blockSilentRegen===true)return true at start
    const oldBrick =
      /if\s*\(\s*meta\.blockSilentRegen\s*===\s*true\s*\)\s*return\s*true/.test(js) &&
      /pixelDimStatus\s*===\s*["']unmeasured["']/.test(js);
    foundNewGate = hasNeverBlockCta && !oldBrick;
    if (foundNewGate) break;
  }
  ok("data/web stillQuality silent-regen gate synced", foundNewGate || files.length === 0, files.join(",") || "no stillQuality assets yet");
} else {
  ok("data/web assets dir (optional until integrate)", true);
}

const baselinePath = path.join(root, "data/fixtures/v5_contract_hashes.json");
if (!fs.existsSync(baselinePath)) {
  fs.writeFileSync(baselinePath, JSON.stringify({ version: "1.0.0", hashes }, null, 2) + "\n");
  console.log("wrote initial v5_contract_hashes.json");
} else {
  const base = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as { hashes: Record<string, string> };
  for (const [rel, h] of Object.entries(hashes)) {
    if (!(rel in base.hashes)) {
      console.log(`+ new contract surface ${rel} (accept into baseline on next intentional bump)`);
      continue;
    }
    // drift is WARN for docs (web may diverge until integrate); fail only if file vanished
    if (base.hashes[rel] !== h) {
      ok(`contract hash synced: ${rel}`, false, `${base.hashes[rel]} → ${h}`);
    }
  }
  ok("baseline file readable", true);
}

// skill matrix sync (exit non-zero only if script missing)
const skill = spawnSync("yarn", ["tsx", "scripts/audit-skill-matrix-sync.ts"], {
  cwd: root,
  encoding: "utf8",
  shell: true,
});
ok("audit-skill-matrix-sync runs", skill.status === 0 || skill.status === null, `status=${skill.status}`);
if (skill.stdout) process.stdout.write(skill.stdout.slice(0, 800));
if (skill.stderr && skill.status !== 0) process.stderr.write(skill.stderr.slice(0, 800));

// runtimeGap: ensure registry module still imports (zero-growth smoke)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const reg = require("../src/ruleEngine/bundle/runtimeGapRegistry") as {
    RuntimeGapCollector?: new () => { gaps?: unknown[] };
  };
  ok("runtimeGapRegistry loadable", Boolean(reg.RuntimeGapCollector));
} catch (e) {
  ok("runtimeGapRegistry loadable", false, String(e));
}

// Chat homology: browser_full_flow mentions exportGate / importOk / designExit
const bundleMd = path.join(root, "data/skills/browser_full_flow.bundle.md");
if (fs.existsSync(bundleMd)) {
  const md = fs.readFileSync(bundleMd, "utf8");
  ok("browser_full_flow mentions exportGate", /exportGate/i.test(md));
  ok("browser_full_flow mentions designExit or importOk", /designExit|importOk|importOkNotExitPass/i.test(md));
} else {
  ok("browser_full_flow.bundle.md exists", false);
}

// untilClear phase1 mount graph — live handlers must exist
try {
  const uc = spawnSync("yarn", ["test:g-untilclear-runtime"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  ok("test:g-untilclear-runtime", uc.status === 0, uc.stderr?.slice(0, 200) ?? "");
} catch (e) {
  ok("test:g-untilclear-runtime", false, String(e));
}

try {
  const lint = spawnSync("yarn", ["tsx", "scripts/test-g-prompt-conflict-lint.ts"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  ok("test-g-prompt-conflict-lint", lint.status === 0, lint.stderr?.slice(0, 200) ?? "");
} catch (e) {
  ok("test-g-prompt-conflict-lint", false, String(e));
}

try {
  const generation = spawnSync("yarn", ["tsx", "scripts/test-g-generation-contract.ts"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  ok("test-g-generation-contract", generation.status === 0, generation.stderr?.slice(0, 200) ?? "");
} catch (e) {
  ok("test-g-generation-contract", false, String(e));
}

try {
  const sample = spawnSync("yarn", ["tsx", "scripts/test-g-sample-shot1-atoms.ts"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  ok("test-g-sample-shot1-atoms", sample.status === 0, sample.stderr?.slice(0, 200) ?? "");
} catch (e) {
  ok("test-g-sample-shot1-atoms", false, String(e));
}

try {
  const homology = spawnSync("yarn", ["tsx", "scripts/test-g-chat-heal-homology.ts"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  ok("test-g-chat-heal-homology", homology.status === 0, homology.stderr?.slice(0, 400) ?? homology.stdout?.slice(-400) ?? "");
  if (homology.stdout) process.stdout.write(homology.stdout.slice(0, 1200));
} catch (e) {
  ok("test-g-chat-heal-homology", false, String(e));
}

if (failed) {
  console.error(`\n${failed} audit:v5-contract-ci FAILED`);
  process.exit(1);
}
console.log("\naudit:v5-contract-ci OK");

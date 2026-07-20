/**
 * Golden: visual fidelity orchestrator (mock vendor + mock VLM).
 * yarn tsx scripts/test-still-visual-fidelity-orchestrator.ts
 */
import { buildLiteraryFidelityChecklist } from "../src/ruleEngine/compilers/literaryFidelityChecklist";
import {
  runStillVisualFidelityLoop,
  shouldRunVisualFidelityLoop,
  degradeHqWithoutVisualPass,
  loadStillVisualFidelityLoopConfig,
} from "../src/ruleEngine/qc/stillVisualFidelityLoop";
import { createHealBudget } from "../src/ruleEngine/heal/healBudgetLedger";
import { inferStillQuality } from "../src/ruleEngine/compilers/stillQuality";
import { readFileSync } from "fs";
import { join } from "path";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  const DESC = "沈母端坐高位太师椅摩挲扳指，沈清瓷跪低位蒲团抄书，权力反差构图，烛火摇曳。";
  const checklist = buildLiteraryFidelityChecklist({
    description: DESC,
    characterNames: ["沈母", "沈清瓷"],
    requireDualIdentity: false,
  });

  ok("shouldRun hq+storyboard", shouldRunVisualFidelityLoop({ qualityMode: "hq_update", storyboardId: 1 }));
  ok("skip draft", !shouldRunVisualFidelityLoop({ qualityMode: "draft", storyboardId: 1 }));

  {
    let round = 0;
    const out = await runStillVisualFidelityLoop({
      qualityMode: "hq_update",
      storyboardId: 9,
      description: DESC,
      checklist,
      healBudget: createHealBudget(),
      generateOnce: async () => {
        round++;
        return {
          url: `http://x/${round}.jpg`,
          savePath: `/${round}.jpg`,
          promptUsed: DESC + " 场面硬约束",
          imageBase64: "aaaa",
          allowHqOkL0: true,
          fidelityMissing: [],
        };
      },
      judgeFn: async () => {
        if (round < 2) {
          return {
            ok: false,
            items: checklist.map((c) => ({
              id: c.id,
              pass: !c.id.includes("跪"),
              evidence: c.id.includes("跪") ? "missing kneel" : "ok",
            })),
          };
        }
        return {
          ok: true,
          items: checklist.map((c) => ({ id: c.id, pass: true, evidence: "ok" })),
        };
      },
    });
    ok("regen then pass", out.visualPass && out.stillQuality === "hq_ok", out.stopReason);
    ok("rounds>=2", out.rounds >= 2, String(out.rounds));
    ok("visualPassAt set", Boolean(out.visualPassAt));
  }

  {
    let n = 0;
    const out = await runStillVisualFidelityLoop({
      qualityMode: "hq_update",
      storyboardId: 10,
      description: DESC,
      checklist,
      healBudget: createHealBudget(),
      generateOnce: async () => {
        n++;
        return {
          url: `http://x/c${n}.jpg`,
          savePath: `/c${n}.jpg`,
          promptUsed: DESC,
          imageBase64: "bb",
          allowHqOkL0: true,
          fidelityMissing: [],
        };
      },
      judgeFn: async () => ({
        ok: false,
        items: checklist.map((c) => ({
          id: c.id,
          pass: false,
          evidence: "always fail",
        })),
      }),
    });
    ok("converged or budget stop", out.stopReason === "converged" || out.stopReason === "budget", out.stopReason);
    ok("not visualPass", !out.visualPass);
    ok("weak", out.stillQuality === "weak");
  }

  {
    let judged = false;
    const out = await runStillVisualFidelityLoop({
      qualityMode: "draft",
      storyboardId: 11,
      description: DESC,
      checklist,
      generateOnce: async () => ({
        url: "http://x/d.jpg",
        savePath: "/d.jpg",
        promptUsed: DESC,
        imageBase64: "cc",
        allowHqOkL0: true,
        fidelityMissing: [],
      }),
      judgeFn: async () => {
        judged = true;
        return { ok: true, items: [] };
      },
    });
    ok("draft stopReason skipped", out.stopReason === "skipped_draft", out.stopReason);
    ok("draft did not call VLM", !judged);
  }

  {
    ok("degrade old hq", degradeHqWithoutVisualPass({ stillQuality: "hq_ok" }) === "weak");
    ok(
      "keep visualPass hq",
      degradeHqWithoutVisualPass({ stillQuality: "hq_ok", visualPassAt: "2026-01-01" }) === "hq_ok",
    );
    ok(
      "inferStillQuality degrades",
      inferStillQuality({
        filePath: "/x.jpg",
        meta: { stillQuality: "hq_ok" },
        requireVisualPass: true,
      }) === "weak",
    );
  }

  {
    const root = join(__dirname, "..");
    const core = readFileSync(join(root, "src/routes/production/editImage/generateFlowImageCore.ts"), "utf8");
    const batch = readFileSync(join(root, "src/routes/production/storyboard/batchGenerateImage.ts"), "utf8");
    ok("core uses runStillVisualFidelityLoop", /runStillVisualFidelityLoop/.test(core));
    ok("batch uses runStillVisualFidelityLoop", /runStillVisualFidelityLoop/.test(batch));
    ok("core uses assertStillIdentityPreflight", /assertStillIdentityPreflight/.test(core));
    const cfg = loadStillVisualFidelityLoopConfig();
    ok("cfg hqRequiresVisualPass", cfg.hqRequiresVisualPass !== false);
  }

  if (failed) {
    console.error(`\n${failed} failed`);
    process.exit(1);
  }
  console.log("\ntest-still-visual-fidelity-orchestrator: OK");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

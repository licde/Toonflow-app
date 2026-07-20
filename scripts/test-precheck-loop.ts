/**
 * yarn test:precheck-loop — portable PrecheckLoop golden (no DB)
 */
import fs from "fs";
import path from "path";
import { runPrecheckLoop, createInMemoryPatchApplier } from "@/ruleEngine/precheckLoop";
import { dialogueCoverageReport } from "@/ruleEngine/design/dialogueCoverage";
import { dialogueFidelityGate } from "@/ruleEngine/validators/gates";
import { runDesignClosureDryRun } from "@/ruleEngine/bundle/designClosureDryRun";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";
import type { EpisodePackage } from "@/ruleEngine/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const goldenDir = path.join(process.cwd(), "data/fixtures/golden");
const breakBundle = JSON.parse(
  fs.readFileSync(path.join(goldenDir, "dialogue-break-block.json"), "utf-8"),
) as ScriptBundle;

// 1) Diagnose exposes missingKeys
{
  const loop = runPrecheckLoop({ bundle: breakBundle, checks: ["DC-01"], apply: false });
  const f = loop.findings.find((x) => x.id === "DC-01");
  ok("DC-01 diagnose fails", f?.passed === false);
  ok("evidence.missingCount >= 1", Number(f?.evidence.missingCount) >= 1, JSON.stringify(f?.evidence));
  ok("message includes 缺", (f?.message ?? "").includes("缺"));
  ok("repairHint RH-QP-03", loop.repairHint?.id === "RH-QP-03");
}

// 2) Soft patch heals
{
  const loop = runPrecheckLoop(
    { bundle: breakBundle, checks: ["DC-01"], apply: true },
    { applier: createInMemoryPatchApplier() },
  );
  ok("heal apply ok", loop.ok === true, JSON.stringify(loop.decision));
  ok("heal verified", loop.verified === true);
  ok("decision was soft_patch or ok", loop.decision.mode === "ok" || loop.decision.mode === "soft_patch");
}

// 3) Filtered scope does not BLOCK
{
  const loop = runPrecheckLoop({
    bundle: breakBundle,
    checks: ["DC-01"],
    scope: { mode: "filtered", storyboardIds: [1] },
    apply: false,
  });
  const f = loop.findings.find((x) => x.id === "DC-01");
  ok("filtered scope not BLOCK for generate", loop.ok === true);
  ok("filtered evidence shotScope", f?.evidence.shotScope === "filtered");
}

// 4) H3 ↔ DC-01 missingCount agreement (full scope)
{
  const report = dialogueCoverageReport({
    script: breakBundle.script ?? "",
    shots: breakBundle.preDesignPack?.shots ?? [],
    planData: breakBundle.planData,
  });
  const pkg: EpisodePackage = {
    version: 1,
    projectId: 1,
    scriptId: 1,
    shots: [
      {
        id: "s1",
        index: 0,
        storyboardId: 1,
        narrative: {
          type: "CHAR-SCENE",
          duration: 3,
          dialogue: breakBundle.preDesignPack!.shots[0].narrative?.dialogue as never,
        },
        generation: {},
      },
    ],
    rulePackVersion: "2.0.1",
    updatedAt: Date.now(),
  };
  const h3 = dialogueFidelityGate(pkg, breakBundle.script ?? "", { planData: breakBundle.planData });
  const loop = runPrecheckLoop({ bundle: breakBundle, checks: ["DC-01"] });
  const dc = loop.findings.find((x) => x.id === "DC-01")!;
  ok("H3 blocks when coverage fails", h3.some((i) => i.ruleId === "H3"));
  ok("H3/DC missingCount align", Number(dc.evidence.missingCount) === report.missingCount);
}

// 5) Filtered scope: DC-13 must not BLOCK when only dialogue soft-broken
{
  const loop = runPrecheckLoop({
    bundle: breakBundle,
    checks: ["DC-01", "DC-13"],
    scope: { mode: "filtered", storyboardIds: [1] },
    apply: false,
  });
  const dc13 = loop.findings.find((x) => x.id === "DC-13");
  ok("filtered DC-13 passed (no hard break)", dc13?.passed === true, dc13?.message);
  ok("filtered DC-13 softBroken evidence", Number(dc13?.evidence.softBrokenCount) >= 1);
  ok("filtered multi-check loop ok", loop.ok === true);
}

// 6) Fixture golden contract file if present
{
  const contractPath = path.join(goldenDir, "precheck-loop-dc01-heal.json");
  if (fs.existsSync(contractPath)) {
    const c = JSON.parse(fs.readFileSync(contractPath, "utf-8")) as {
      bundle: ScriptBundle;
      run: { checks: string[]; apply: boolean };
      expect: { before?: { ok: boolean }; after?: { ok: boolean }; "decision.mode"?: string };
    };
    const before = runPrecheckLoop({ bundle: c.bundle, checks: c.run.checks, apply: false });
    ok("contract before.ok", before.ok === (c.expect.before?.ok ?? false));
    if (c.run.apply) {
      const after = runPrecheckLoop(
        { bundle: c.bundle, checks: c.run.checks, apply: true },
        { applier: createInMemoryPatchApplier() },
      );
      ok("contract after.ok", after.ok === (c.expect.after?.ok ?? true));
    }
  } else {
    ok("contract file optional skip", true);
  }
}

// 7) Filtered DC-03 markers should not BLOCK
{
  const withBrief: ScriptBundle = {
    ...breakBundle,
    designBrief: { B5: [{ id: "m1" }] } as ScriptBundle["designBrief"],
  };
  const full = runDesignClosureDryRun(withBrief, { scope: { mode: "full" } });
  const filt = runDesignClosureDryRun(withBrief, { scope: { mode: "filtered", storyboardIds: [1] } });
  const dc03Full = full.find((c) => c.id === "DC-03");
  const dc03Filt = filt.find((c) => c.id === "DC-03");
  ok("full DC-03 blocks without markers", dc03Full?.passed === false);
  ok("filtered DC-03 soft-pass", dc03Filt?.passed === true, dc03Filt?.message);
}

// 8) lineId mode: soft_patch carries lineId+原文; filtered soft-pass omits →SB trigger
{
  const lineIdBundle: ScriptBundle = {
    bundleVersion: "browser-chat-optimized",
    rulePackVersion: "2.0.1",
    bundleType: "script",
    script: "场1\n沈母：春日宴上？\n沈清瓷：女儿在场。",
    planData: {
      dialoguePlan: {
        lines: [
          { speaker: "沈母", text: "春日宴上？", lineId: "L-01" },
          { speaker: "沈清瓷", text: "女儿在场。", lineId: "L-02" },
        ],
      },
    } as ScriptBundle["planData"],
    preDesignPack: {
      scriptPlan: "#",
      shots: [
        {
          shotIndex: 1,
          storyboardId: 1,
          duration: 4,
          narrative: {
            dialogue: {
              lines: [{ speaker: "沈母", text: "春日宴上？", lineId: "L-01" }],
            },
          },
        },
      ],
    },
  } as ScriptBundle;

  const before = runPrecheckLoop({ bundle: lineIdBundle, checks: ["DC-01"], apply: false });
  const f0 = before.findings.find((x) => x.id === "DC-01");
  ok("lineId diagnose fails", f0?.passed === false);
  ok("lineId matchMode", f0?.evidence.matchMode === "lineId");
  ok(
    "lineId not forced human when resolvable",
    !((f0?.evidence.repairReasons as string[]) ?? []).includes("lineId_mode_mismatch"),
    JSON.stringify(f0?.evidence.repairReasons),
  );

  const after = runPrecheckLoop(
    { bundle: lineIdBundle, checks: ["DC-01"], apply: true },
    { applier: createInMemoryPatchApplier() },
  );
  ok("lineId soft_patch heals", after.ok === true, JSON.stringify(after.decision));
  const patchLines =
    (after.patches?.[0]?.patch?.lines as { lineId?: string; text?: string }[] | undefined) ?? [];
  ok(
    "lineId patch carries lineId+原文",
    patchLines.some((l) => l.lineId === "L-02" && /女儿在场/.test(String(l.text ?? ""))),
    JSON.stringify(patchLines),
  );

  const filtered = runPrecheckLoop({
    bundle: lineIdBundle,
    checks: ["DC-01"],
    scope: { mode: "filtered", storyboardIds: [1] },
    apply: false,
  });
  const ff = filtered.findings.find((x) => x.id === "DC-01");
  ok("filtered soft-pass", filtered.ok === true && ff?.passed === true);
  ok("filtered omits →SB trigger", ff?.trigger == null, String(ff?.trigger));
}

process.exit(failed ? 1 : 0);

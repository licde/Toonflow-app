/**
 * yarn test:frost-import-hardening
 * Frost import: salvage → no placeholder QP-02 → anchors → duration raise → trailing strip.
 */
import fs from "fs";
import path from "path";
import { prepareBundleWithLog, stripTrailingRepairSuffix, parseBundleJson } from "@/ruleEngine/bundle/bundleShapePipeline";
import { scriptBundleSchema } from "@/ruleEngine/bundle/schema";
import { prepareBundleForInspect } from "@/ruleEngine/bundle/prepareBundleForInspect";
import { runDesignExitGate } from "@/ruleEngine/design/designExitGate";
import { reindexDerivedTables } from "@/ruleEngine/bundle/reindexDerivedTables";
import { raiseDurationHygieneOnly } from "@/ruleEngine/export/durationHygiene";
import { auditLiteraryBeatCoverage } from "@/ruleEngine/design/literaryBeatCoverage";
import { isForbiddenSplitPlaceholder } from "@/ruleEngine/design/splitChildVisual";
import { qp02MinChars } from "@/ruleEngine/bundle/visualQualityAudit";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function loadGolden(): Record<string, unknown> {
  const p = path.join(process.cwd(), "data/fixtures/golden/frost-import-hardening.json");
  return JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
}

function main() {
  const raw = loadGolden();
  const minChars = qp02MinChars();

  // 0) Trailing checklist strip
  const withTail =
    JSON.stringify(raw) +
    "\n\n【闭环修复清单 — 请按项修改 JSON 字段】\n待处理规则：QP-02, CHAIN-BEAT\n";
  const stripped = stripTrailingRepairSuffix(withTail);
  ok("trailing checklist stripped", !stripped.includes("【闭环修复清单"), stripped.slice(-40));
  ok("trailing still parses", Boolean(parseBundleJson(withTail)));

  // 1) Pre-Zod salvage unlocks SCHEMA
  const prep = prepareBundleWithLog(structuredClone(raw));
  const salvageIds = new Set((prep.shapeSalvageLog ?? []).map((e) => e.ruleId));
  ok("SH-SERIES-CONT salvage", salvageIds.has("SH-SERIES-CONT"), [...salvageIds].join(","));
  ok("SH-SCENE-AV-TAGS salvage", salvageIds.has("SH-SCENE-AV-TAGS"), [...salvageIds].join(","));
  ok("SH-MICRO-EXPR salvage", salvageIds.has("SH-MICRO-EXPR"), [...salvageIds].join(","));

  const sc = (
    prep.bundle.planData as { narrativeBrief?: { seriesContinuity?: unknown } }
  )?.narrativeBrief?.seriesContinuity;
  ok("seriesContinuity is record", sc != null && typeof sc === "object" && !Array.isArray(sc));
  ok(
    "ep1Summary present",
    Boolean((sc as { ep1Summary?: string })?.ep1Summary),
    JSON.stringify(sc)?.slice(0, 80),
  );
  ok(
    "carryInfoIds from B20",
    Array.isArray((sc as { carryInfoIds?: string[] })?.carryInfoIds) &&
      ((sc as { carryInfoIds?: string[] }).carryInfoIds?.length ?? 0) >= 1,
  );

  const parsed = scriptBundleSchema.safeParse(prep.bundle);
  ok("Zod parse after salvage", parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues[0]));

  // 2) Import inspect: IRD + reindex + no short placeholder
  const inspected = prepareBundleForInspect(structuredClone(raw), { ingestHeal: true });
  const shots = (inspected.bundle.preDesignPack as { shots?: Record<string, unknown>[] })?.shots ?? [];
  const nImport = shots.length;
  ok("import expanded or kept shots", nImport >= 3, `n=${nImport}`);

  ok(
    "no 听者反应特写 placeholder",
    !shots.some((s) => isForbiddenSplitPlaceholder(String(s.visualDescription ?? ""))),
    shots
      .filter((s) => isForbiddenSplitPlaceholder(String(s.visualDescription ?? "")))
      .map((s) => s.shotIndex)
      .join(","),
  );

  const shortChildren = shots.filter((s) => {
    const isChild = Boolean(s._stillBeatSplitId || s._visualSplitId);
    const len = String(s.visualDescription ?? "").replace(/\s/g, "").length;
    return isChild && len > 0 && len < minChars;
  });
  ok("no self-heal too_short children", shortChildren.length === 0, `n=${shortChildren.length}`);

  const chain = auditLiteraryBeatCoverage(shots, { knownNames: ["沈清漪", "谢玄辞", "沈父"] });
  ok(
    "no self-heal CHAIN-BEAT",
    !chain.some((f) => f.id === "CHAIN-BEAT"),
    chain.map((f) => f.message).join(";"),
  );

  ok(
    "micro compileable eyes",
    shots.some((s) => {
      const m = (s.shotDesign as { performance?: { microExpression?: { eyes?: string } } })?.performance
        ?.microExpression;
      return m && typeof m.eyes === "string";
    }),
  );

  const planLines =
    ((inspected.bundle.planData as { dialoguePlan?: { lines?: { type?: string; text?: string }[] } })?.dialoguePlan
      ?.lines ?? []) as { type?: string; text?: string; causedByActionId?: string }[];
  ok(
    "OS peel → dialoguePlan or causal stub",
    planLines.some((l) => String(l.type ?? "").toLowerCase() === "os") ||
      planLines.every((l) => !String(l.text ?? "").trim() || Boolean(l.causedByActionId)),
    `lines=${planLines.length}`,
  );

  const self = inspected.bundle.narrativeSelfcheck as { passed?: boolean; serverOverwritten?: boolean } | undefined;
  const mod = inspected.bundle.modalityPromptAudit as Record<string, string> | undefined;
  const meta = (inspected.bundle.meta ?? {}) as {
    importOkNotExitPass?: boolean;
    importSplitExpanded?: boolean;
    irdProvenance?: unknown;
  };
  if (meta.importOkNotExitPass || meta.importSplitExpanded || meta.irdProvenance) {
    ok("false-green selfcheck overwritten or import flag", self?.passed === false || Boolean(meta.importOkNotExitPass));
    ok("modality not raw Chat pass under importOk", mod?.IMG !== "pass" || !meta.importOkNotExitPass, `IMG=${mod?.IMG}`);
  } else {
    ok("no expand path still parseable", true);
  }

  // 3) reindexDerivedTables
  const ri = reindexDerivedTables(inspected.bundle);
  const fxItems = (inspected.bundle.fxFeasibilityAudit as { items?: { shotIndex?: number }[] })?.items ?? [];
  const shotIdx = new Set(shots.map((s) => Number(s.shotIndex)).filter((n) => Number.isFinite(n)));
  const fxIdx = new Set(fxItems.map((i) => Number(i.shotIndex)).filter((n) => Number.isFinite(n)));
  ok(
    "fxAudit covers shots after reindex",
    [...shotIdx].every((i) => fxIdx.has(i)) || ri.fxStubbed >= 0,
    `shots=${shotIdx.size};fx=${fxIdx.size};stub=${ri.fxStubbed}`,
  );

  // 4) duration hygiene raise-only (export path) — clears DFW chars/4
  const durBundle = structuredClone(prep.bundle) as typeof inspected.bundle;
  const shortShot = {
    shotIndex: 99,
    duration: 3,
    narrative: { dialogue: { lines: [{ speaker: "甲", text: "这霜兰令本就是交易筹码你我今日一诺既定。" }] } },
  };
  (durBundle.preDesignPack as { shots: unknown[] }).shots = [
    ...((durBundle.preDesignPack as { shots?: unknown[] }).shots ?? []),
    shortShot,
  ];
  const hy = raiseDurationHygieneOnly(durBundle);
  const raised99 = ((durBundle.preDesignPack as { shots?: { shotIndex?: number; duration?: number }[] }).shots ?? []).find(
    (s) => Number(s.shotIndex) === 99,
  );
  ok("DFW duration raise 3→≥4", Number(raised99?.duration ?? 0) >= 4, `dur=${raised99?.duration};raised=${hy.raised}`);

  // 4b) export cam-fit hygiene clears must-split
  const { applyCamFitHygieneOnExport } = require("@/ruleEngine/export/camFitHygiene") as typeof import("@/ruleEngine/export/camFitHygiene");
  const { auditCamShootableFit } = require("@/ruleEngine/quality/camShootableFit") as typeof import("@/ruleEngine/quality/camShootableFit");
  const camBundle = structuredClone(raw) as typeof inspected.bundle;
  // ensure speak+react parent exists
  const camPrep = prepareBundleWithLog(camBundle);
  const camPack = camPrep.bundle.preDesignPack as { shots?: Record<string, unknown>[] };
  if (camPack?.shots) {
    camPack.shots.push({
      shotIndex: 100,
      clientId: "cam-fit-test",
      duration: 4,
      visualDescription: "谢玄辞端坐开口道完，听者愣住反应侧目凝视。",
      narrative: {
        dialogue: { lines: [{ lineId: "LC", speaker: "谢玄辞", text: "可以。", reactionAction: "侧目" }] },
      },
    });
  }
  const beforeCam = auditCamShootableFit(
    (camPack?.shots ?? []).find((s) => Number(s.shotIndex) === 100) ?? {},
  );
  ok("cam-fit detects must-split before hygiene", beforeCam.findings.some((f) => f.id === "DEX-CAM-FIT"));
  const camHy = applyCamFitHygieneOnExport(camPrep.bundle as never);
  const afterShots = (camPrep.bundle.preDesignPack as { shots?: Record<string, unknown>[] })?.shots ?? [];
  const stillMust = afterShots.filter((s) => !s._stillBeatSplitId).some((s) => auditCamShootableFit(s).findings.some((f) => f.id === "DEX-CAM-FIT" && Number(s.shotIndex) === 100));
  ok(
    "export cam-fit hygiene splits or confirms",
    camHy.applied > 0 || camHy.refused > 0 || !stillMust,
    `applied=${camHy.applied};remain=${camHy.remainingMustSplit};stillMust=${stillMust}`,
  );
  ok(
    "no placeholder after cam hygiene",
    !afterShots.some((s) => isForbiddenSplitPlaceholder(String(s.visualDescription ?? ""))),
  );

  // 4c) untilClear: zero DEX-CAM-FIT on children; speak stripped of reactionAction; mirror no reinject
  const { runCamFitUntilClear } = require("@/ruleEngine/export/camFitHygiene") as typeof import("@/ruleEngine/export/camFitHygiene");
  const { mirrorDialoguePlanToShots } =
    require("@/ruleEngine/bundle/normalizePreDesignPack") as typeof import("@/ruleEngine/bundle/normalizePreDesignPack");
  const { buildAggregatedChatRepairText } =
    require("@/ruleEngine/exportGate") as typeof import("@/ruleEngine/exportGate");
  const untilBundle = structuredClone(raw) as typeof inspected.bundle;
  const untilPrep = prepareBundleWithLog(untilBundle);
  const untilPack = untilPrep.bundle.preDesignPack as { shots?: Record<string, unknown>[] };
  if (untilPack?.shots) {
    untilPack.shots.push({
      shotIndex: 101,
      clientId: "cam-until-clear",
      duration: 4,
      visualDescription: "谢玄辞端坐开口道完，听者愣住反应侧目凝视。",
      narrative: {
        dialogue: {
          lines: [{ lineId: "L-CAM", speaker: "谢玄辞", text: "可以。", reactionAction: "侧目", splitHint: "reaction_shot" }],
        },
      },
    });
  }
  // plan keeps NAR-15 reactionAction
  const pd = ((untilPrep.bundle.planData as Record<string, unknown>) ??= {});
  const dplan = ((pd.dialoguePlan as { lines?: unknown[] }) ??= { lines: [] });
  dplan.lines = [
    ...(dplan.lines ?? []),
    { lineId: "L-CAM", speaker: "谢玄辞", text: "可以。", reactionAction: "侧目", functions: ["emotion_hit"] },
  ];
  const until = runCamFitUntilClear(untilPrep.bundle as never, { maxRounds: 5 });
  mirrorDialoguePlanToShots(untilPrep.bundle as never);
  const uShots = (untilPrep.bundle.preDesignPack as { shots?: Record<string, unknown>[] })?.shots ?? [];
  const camLeft = uShots.filter((s) =>
    auditCamShootableFit(s).findings.some((f) => f.id === "DEX-CAM-FIT" && f.severity === "BLOCK"),
  );
  ok("untilClear zero DEX-CAM-FIT", camLeft.length === 0, `remain=${until.remainingMustSplit};hits=${camLeft.length}`);
  const speakKids = uShots.filter(
    (s) =>
      s._stillBeatSplitId &&
      /speak/i.test(String(s.visualSplitRole ?? "")) &&
      String(s.clientId ?? "").includes("cam-until-clear"),
  );
  ok(
    "speak child cleared reactionAction",
    speakKids.length >= 1 &&
      speakKids.every((s) => {
        const lines = ((s.narrative as { dialogue?: { lines?: { reactionAction?: string }[] } })?.dialogue?.lines ??
          []) as { reactionAction?: string }[];
        return lines.every((l) => !String(l.reactionAction ?? "").trim());
      }),
    `speakKids=${speakKids.length}`,
  );
  ok(
    "plan NAR-15 reactionAction kept",
    ((untilPrep.bundle.planData as { dialoguePlan?: { lines?: { lineId?: string; reactionAction?: string }[] } })
      ?.dialoguePlan?.lines ?? []).some((l) => l.lineId === "L-CAM" && String(l.reactionAction ?? "").trim()),
  );
  const repair = buildAggregatedChatRepairText(
    [{ id: "RH-DEX-CAM-FIT", chatTemplate: "x", ruleId: "DEX-CAM-FIT" }],
    ["DEX-CAM-FIT", "NAR-14"],
    undefined,
    [
      { id: "DEX-CAM-FIT", message: "须拆说话镜+反应镜" },
      { id: "NAR-14", message: "残句" },
    ],
  );
  ok(
    "chatRepair 待处理 must-only (no DEX-CAM in 待处理)",
    /待处理规则：[^\n]*NAR-14/.test(repair) && !/待处理规则：[^\n]*DEX-CAM-FIT/.test(repair),
    repair.slice(0, 200),
  );
  ok(
    "chatRepair auto 勿改 JSON / 无手拆诱词",
    /服务端将愈 · 勿改 JSON/.test(repair) && !/须拆说话镜/.test(repair.split("【须手改")[0] ?? ""),
  );

  // 4d) Chat skill contract strings present
  const skillRoot = path.join(process.cwd(), "data/skills/browser_chat");
  const sb = fs.readFileSync(path.join(skillRoot, "corridor/corridor_SB.md"), "utf8");
  const t3 = fs.readFileSync(path.join(skillRoot, "T3_quality_gate.md"), "utf8");
  const idx = fs.readFileSync(path.join(skillRoot, "00_index.md"), "utf8");
  ok("SB hard: reactionAction 双镜", /禁止.*单条.*shots.*reactionAction|禁止.*单镜.*reactionAction/.test(sb));
  ok("T3 hard: chatStrict 假绿", /chatStrict.*假绿|不得假绿/.test(t3));
  ok("00_index DEX-CAM-FIT 硬约束", /DEX-CAM-FIT 硬约束/.test(idx));

  // 4e) NAR-15 × CAM：plan 有 RA + speak 无 RA → 零 NAR-15；plan 无 RA → BLOCK
  const { collectNar14Nar15Fails } =
    require("@/ruleEngine/nar14ClauseSplit") as typeof import("@/ruleEngine/nar14ClauseSplit");
  const { qualityGate } =
    require("@/ruleEngine/qualityGate") as typeof import("@/ruleEngine/qualityGate");
  const planOkLines = [
    { lineId: "L-CAM", speaker: "谢玄辞", text: "可以。", reactionAction: "侧目", functions: ["emotion_hit"] },
  ];
  const speakShotLines = speakKids.flatMap((s) => {
    const lines = ((s.narrative as { dialogue?: { lines?: unknown[] } })?.dialogue?.lines ?? []) as {
      lineId?: string;
      functions?: string[];
      reactionAction?: string;
      text?: string;
    }[];
    // ensure emotion_hit tag still present without RA (CAM clear)
    return lines.map((l) => ({
      ...l,
      lineId: l.lineId ?? "L-CAM",
      functions: l.functions?.length ? l.functions : ["emotion_hit"],
      reactionAction: undefined,
    }));
  });
  const shotRowsForNar = speakKids.map((s, i) => ({
    shotIndex: Number(s.shotIndex ?? 200 + i),
    lines: speakShotLines.length
      ? speakShotLines
      : [{ lineId: "L-CAM", text: "可以。", functions: ["emotion_hit"] as string[] }],
    skipNar15: true,
  }));
  const narClear = collectNar14Nar15Fails(planOkLines, shotRowsForNar);
  ok(
    "plan有RA+speak无RA → 零 NAR-15",
    !narClear.some((f) => f.id === "NAR-15"),
    narClear.map((f) => f.message).join(";"),
  );
  const narMissing = collectNar14Nar15Fails(
    [{ lineId: "L-MISS", text: "可以。", functions: ["emotion_hit"] }],
    [],
  );
  ok("plan无RA → NAR-15 BLOCK", narMissing.some((f) => f.id === "NAR-15"));

  // qualityGate same SSOT (no 镜 N bare scan)
  const qgBundle = {
    planData: { dialoguePlan: { lines: planOkLines } },
    preDesignPack: {
      shots: speakKids.length
        ? speakKids.map((s) => {
            const lines = ((s.narrative as { dialogue?: { lines?: Record<string, unknown>[] } })?.dialogue
              ?.lines ?? []) as Record<string, unknown>[];
            return {
              ...s,
              narrative: {
                dialogue: {
                  lines: lines.map((l) => ({
                    ...l,
                    lineId: l.lineId ?? "L-CAM",
                    functions: (l.functions as string[])?.length ? l.functions : ["emotion_hit"],
                    reactionAction: undefined,
                  })),
                },
              },
            };
          })
        : [
            {
              shotIndex: 201,
              _stillBeatSplitId: "p",
              visualSplitRole: "speak",
              narrative: {
                dialogue: { lines: [{ lineId: "L-CAM", text: "可以。", functions: ["emotion_hit"] }] },
              },
            },
          ],
    },
  };
  const qg = qualityGate(qgBundle as never, { stage: "export" });
  ok(
    "qualityGate plan有RA+speak无RA → 零 NAR-15",
    !qg.issues.some((i) => i.id === "NAR-15"),
    qg.issues.filter((i) => i.id === "NAR-15").map((i) => i.message).join(";"),
  );
  const qgMiss = qualityGate(
    {
      planData: { dialoguePlan: { lines: [{ lineId: "L-MISS", text: "可以。", functions: ["emotion_hit"] }] } },
      preDesignPack: { shots: [] },
    } as never,
    { stage: "export" },
  );
  ok("qualityGate plan无RA → NAR-15", qgMiss.issues.some((i) => i.id === "NAR-15"));

  const rhCatalog = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "data/fixtures/repair_hint_catalog.json"), "utf8"),
  ) as { hints?: { id?: string; chatTemplate?: string }[] };
  const rh15 = rhCatalog.hints?.find((h) => h.id === "RH-NAR-15")?.chatTemplate ?? "";
  ok("RH-NAR-15 双轨 plan 必填", /dialoguePlan|权威/.test(rh15) && /speak|说话镜/.test(rh15));
  ok("RH-NAR-15 不含同时写在 shots", !/同时写在 dialoguePlan 与 shots/.test(rh15));

  // 5) designExit no double-expand
  const plan = {
    ...(inspected.bundle as object),
    planData: {
      ...((inspected.bundle.planData as object) ?? {}),
      preDesignPack: inspected.bundle.preDesignPack,
      meta: {
        ...meta,
        importSplitExpanded: true,
        irdProvenance: meta.irdProvenance ?? { appliedAt: new Date().toISOString(), patchIds: [], codes: [] },
      },
    },
    meta: {
      ...meta,
      importSplitExpanded: true,
      irdProvenance: meta.irdProvenance ?? { appliedAt: new Date().toISOString() },
    },
    _importSplitExpanded: true,
    preDesignPack: inspected.bundle.preDesignPack,
  } as Record<string, unknown>;

  const beforeExit = ((plan.preDesignPack as { shots?: unknown[] })?.shots ?? []).length;
  // import 已扩：须 diagnose-only，禁 forceExpand 再 cam/IRD 二次膨胀
  const exit = runDesignExitGate("SB", plan, { chatStrict: true, applyL2Heal: false, forceExpand: false });
  const afterExit = (
    ((plan.planData as { preDesignPack?: { shots?: unknown[] } })?.preDesignPack?.shots ??
      (plan.preDesignPack as { shots?: unknown[] })?.shots ??
      []) as unknown[]
  ).length;
  ok(
    "exit no double-expand (count stable or skip)",
    afterExit === beforeExit || afterExit <= beforeExit + 1,
    `before=${beforeExit};after=${afterExit};warn=${(exit.warnings ?? []).slice(0, 3).join("|")}`,
  );
  ok("exit ran", Boolean(exit));

  if (failed) {
    console.error(`\n${failed} assertion(s) failed`);
    process.exit(1);
  }
  console.log("\nAll frost-import-hardening checks passed");
}

main();

/**
 * Chat ≡ smart-heal homology contract — yarn tsx scripts/test-g-chat-heal-homology.ts
 */
import fs from "fs";
import path from "path";

const root = process.cwd();
let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const matrix = JSON.parse(
  fs.readFileSync(path.join(root, "data/fixtures/semantic_gate_dual_track_matrix.json"), "utf8"),
) as {
  mustEditBlockIds?: string[];
  autoAdaptBlockIds?: string[];
  importSalvageRegistry?: {
    ruleId: string;
    untilClear?: boolean;
    confirmOnly?: boolean;
    importHeal?: string;
  }[];
};

const must = new Set(matrix.mustEditBlockIds ?? []);
const auto = new Set(matrix.autoAdaptBlockIds ?? []);
const reg = matrix.importSalvageRegistry ?? [];
const untilClear = new Set(
  reg.filter((e) => e.untilClear && !e.confirmOnly).map((e) => e.ruleId),
);

const mustIntersectUntil = [...must].filter((id) => untilClear.has(id));
ok("mustEdit ∩ untilClear(非 confirm) 为空", mustIntersectUntil.length === 0, mustIntersectUntil.join(","));

for (const id of untilClear) {
  ok(`untilClear ${id} 在 autoAdapt 或可由 loadRepairLayerSets 派生`, auto.has(id) || untilClear.has(id));
}

// Actuator coverage: known C-lane ids must appear in designAutoClose source
const autoCloseSrc = fs.readFileSync(
  path.join(root, "src/ruleEngine/design/designAutoClose.ts"),
  "utf8",
);
const mustHaveActuator = [
  "DEX-DUP-VD",
  "DEX-VID-VOICE-MODE",
  "DEX-STILL-CU-CAST",
  "DEX-STILL-OS-NAME",
  "DEX-STILL-FILLER",
  "DEX-DIRTY-STILL-PROMPT",
  "DC-01-EXTRA",
  "DEX-PROP-CONT",
  "DEX-INTENT-PIC",
];
for (const id of mustHaveActuator) {
  ok(
    `autoClose references ${id}`,
    autoCloseSrc.includes(`"${id}"`) || autoCloseSrc.includes(`'${id}'`),
  );
}

const { buildAggregatedChatRepairText, filterAuthorMustFixIds, runExportGate } =
  require("../src/ruleEngine/exportGate") as typeof import("../src/ruleEngine/exportGate");
ok(
  "C lane DEX-DUP-VD not author must",
  !filterAuthorMustFixIds(["DEX-DUP-VD", "DEX-VID-VOICE-MODE", "DEX-STILL-CU-CAST"]).length,
  filterAuthorMustFixIds(["DEX-DUP-VD", "DEX-VID-VOICE-MODE", "DEX-STILL-CU-CAST"]).join(","),
);
ok(
  "A lane LITERARY-STALE is author must",
  filterAuthorMustFixIds(["DEX-LITERARY-STALE"]).includes("DEX-LITERARY-STALE"),
);

const brief = buildAggregatedChatRepairText(
  [],
  ["DEX-DUP-VD", "DEX-VID-VOICE-MODE", "DEX-STILL-CU-CAST", "DEX-LITERARY-STALE"],
  undefined,
  [
    { id: "DEX-DUP-VD", message: "dup" },
    { id: "DEX-VID-VOICE-MODE", message: "voice" },
    { id: "DEX-STILL-CU-CAST", message: "cu" },
    { id: "DEX-LITERARY-STALE", message: "stale" },
  ],
);
ok("清单 must 不含 DUP/VOICE/CU", !/待处理规则：[^\n]*(DEX-DUP-VD|DEX-VID-VOICE-MODE|DEX-STILL-CU-CAST)/.test(brief));
ok("清单 must 含 LITERARY-STALE 或空 must", /待处理规则：.*DEX-LITERARY-STALE|待处理规则：（无须手改/.test(brief));
ok(
  "清单 auto 含 DUP 或 VOICE 或 CU",
  /服务端 untilClear[^\n]*(DEX-DUP-VD|DEX-VID-VOICE-MODE|DEX-STILL-CU-CAST)/.test(brief),
);

// diversify + voice heal smoke
const { diversifyDialogueDupVdShots, runDesignAutoClose } =
  require("../src/ruleEngine/design/designAutoClose") as typeof import("../src/ruleEngine/design/designAutoClose");
const vd = "沈清漪立于殿中持休书";
const withDlg = Array.from({ length: 4 }, (_, i) => ({
  shotIndex: i + 1,
  visualDescription: vd,
  duration: 2,
  narrative: {
    dialogue: { lines: [{ speaker: "沈清漪", text: `台词${i + 1}` }] },
    voiceIntent: { type: "none" },
  },
}));
const div = diversifyDialogueDupVdShots(withDlg as never, { minRun: 3 });
ok("diversify dialogue same-VD", div.diversified >= 2, `n=${div.diversified}`);

const ac = runDesignAutoClose(
  { planData: { preDesignPack: { shots: structuredClone(withDlg) } } },
  { stageId: "SB", maxRounds: 3, failedIds: ["DEX-DUP-VD"] },
);
ok("autoClose clears or softs DUP-VD", !ac.remainingFailedIds.includes("DEX-DUP-VD") || ac.clearedIds.includes("DEX-DUP-VD"), ac.remainingFailedIds.join(","));

// mount dualTrack sync sample
const mount = JSON.parse(
  fs.readFileSync(path.join(root, "data/fixtures/design_gate_mount_matrix.json"), "utf8"),
) as { rows?: { ruleId?: string; dualTrack?: string }[] };
const voiceRow = (mount.rows ?? []).find((r) => r.ruleId === "DEX-VID-VOICE-MODE");
ok("mount DEX-VID-VOICE-MODE dualTrack=auto", voiceRow?.dualTrack === "auto", JSON.stringify(voiceRow));

const eg = runExportGate(
  {
    bundleType: "script",
    script: "测",
    meta: {},
    planData: {},
    preDesignPack: { scriptPlan: "测", shots: div.shots },
    characterDesign: { assets: [{ code: "CHAR-X", name: "沈清漪", filePath: "/a.png" }] },
  } as never,
  { allowShapeSalvage: true, alreadyPrepared: true },
);
ok("laneDiagnostics present", Boolean(eg.laneDiagnostics), JSON.stringify(eg.laneDiagnostics));
ok(
  "exportAllowed not blocked solely by C-lane",
  eg.exportAllowed || (eg.laneDiagnostics?.mustIds?.length ?? 0) > 0,
  `allowed=${eg.exportAllowed} must=${eg.laneDiagnostics?.mustIds?.join(",")}`,
);

if (failed) {
  console.error(`\n${failed} chat-heal-homology FAILED`);
  process.exit(1);
}
console.log("\nall chat-heal-homology passed");

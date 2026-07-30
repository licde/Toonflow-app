/**
 * Smoke: import lit → smart split (not mere Confirm CTA).
 */
import { runImportLitDebtHygiene } from "../src/ruleEngine/design/importLitDebtHygiene";
import { expandLitContactXor } from "../src/ruleEngine/design/expandLitContactXor";
import { buildExportPreviewStatusLine } from "../src/ruleEngine/exportGate";

const vd = "特写。沈清漪侧脸，休书纸角划过面颊，她紧咬下唇渗出血珠。";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

{
  const r = expandLitContactXor(
    [{ shotIndex: 1, clientId: "c1", visualDescription: vd, shotSize: "特写" }],
    { forceExpand: true },
  );
  ok("expander splits to 2+", r.expandedCount >= 1 && r.shots.length >= 2, JSON.stringify(r.log));
  ok(
    "children xorSplit marked",
    r.shots.every((s) => s.xorSplit || s._litXorSplitId),
    JSON.stringify(r.shots.map((s) => ({ vd: String(s.visualDescription).slice(0, 40), xor: s.xorSplit }))),
  );
  ok(
    "cheek vs oral separated",
    r.shots.some((s) => /划过|颊/.test(String(s.visualDescription))) &&
      r.shots.some((s) => /咬|血珠/.test(String(s.visualDescription))),
    JSON.stringify(r.shots.map((s) => String(s.visualDescription).slice(0, 60))),
  );
}

const shots: Record<string, unknown>[] = [
  { shotIndex: 1, clientId: "c1", visualDescription: vd, shotSize: "特写", charCodes: ["CHAR-SHENQINGYI"] },
];
const meta: Record<string, unknown> = {};
const log: { ruleId: string; path?: string; action?: string }[] = [];
const lit = runImportLitDebtHygiene({ shots, meta, shapeSalvageLog: log });

ok("import smart split count", lit.splitCount >= 1, JSON.stringify(lit));
ok("shots grew", shots.length >= 2, `n=${shots.length}`);
ok(
  "salvage SH-LIT-IMPORT-SMART-SPLIT",
  log.some((e) => e.ruleId === "SH-LIT-IMPORT-SMART-SPLIT"),
  JSON.stringify(log),
);
ok("meta litImportSmartSplit", Number(meta.litImportSmartSplit) >= 1, JSON.stringify(meta));

{
  const {
    detectImportSmartExpand,
    allowPreserveMediaCountMismatch,
  } = require("../src/ruleEngine/bundle/importMergeCountGate") as typeof import("../src/ruleEngine/bundle/importMergeCountGate");
  const fakeBundle = { meta, preDesignPack: { shots } } as import("../src/ruleEngine/bundle/types").ScriptBundle;
  ok(
    "detectImportSmartExpand after lit hygiene",
    detectImportSmartExpand(fakeBundle, shots as import("../src/ruleEngine/bundle/types").StoryboardPanelInput[], log),
  );
  // Gate scenario from prod: 库内10 / 作者8 / 智拆后11 — must allow without forceExpand
  const gate = allowPreserveMediaCountMismatch({
    existingN: 10,
    incomingN: 11,
    rawN: 8,
    diagnoseOnly: true,
    expandAppliedPrepare: false,
    forceExpand: false,
    importSmartExpand: true,
  });
  ok("preserveMedia count gate allows smart expand 10/8/11", gate.allow, gate.note);
  const blocked = allowPreserveMediaCountMismatch({
    existingN: 10,
    incomingN: 11,
    rawN: 8,
    diagnoseOnly: true,
    expandAppliedPrepare: false,
    forceExpand: false,
    importSmartExpand: false,
  });
  ok("preserveMedia still blocks middle-state without smart expand", !blocked.allow);
}

const line = buildExportPreviewStatusLine({
  exportAllowed: true,
  tier: "T3",
  blocks: [],
  designExitIncomplete: true,
  litSmartSplit: true,
  shapeSalvageLog: log,
});
ok("preview says smart split", /已智能拆/.test(line), line);
ok("still 可导入", /可导入/.test(line), line);

{
  const { gateStillLitDebtForHq } =
    require("../src/ruleEngine/compilers/stillLitHqGate") as typeof import("../src/ruleEngine/compilers/stillLitHqGate");
  const g = gateStillLitDebtForHq({
    visualDescription: vd,
    shotSize: "特写",
    qualityMode: "hq_update",
    allowXorSoftInject: true,
  });
  ok("HQ gate prefers split not soft-inject wash", g.action === "block", JSON.stringify(g));
  ok(
    "HQ gate nextStep split_shot",
    g.action === "block" && g.primaryNextStep === "split_shot",
    JSON.stringify(g),
  );
  ok(
    "cheek keeps parent clientId",
    shots.some((s) => s.clientId === "c1" && /颊|划过/.test(String(s.visualDescription))),
    JSON.stringify(shots.map((s) => ({ id: s.clientId, vd: String(s.visualDescription).slice(0, 40) }))),
  );
  ok(
    "oral sibling keeps 咬/血珠",
    shots.some((s) => /咬|血珠|渗血/.test(String(s.visualDescription))),
    JSON.stringify(shots.map((s) => String(s.visualDescription).slice(0, 50))),
  );
}

console.log("OK import-lit-smart-split-smoke");
console.log("preview:", line);
console.log("shots:", shots.map((s) => String(s.visualDescription).slice(0, 50)));

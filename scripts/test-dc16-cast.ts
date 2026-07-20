/**
 * yarn test:dc16-cast
 *
 * DC-16 cast coverage + anti stub green-wash:
 * 1) missing speaker → BLOCK
 * 2) L0.stub-only heal → still BLOCK
 * 3) real L0.identity → cast checks pass
 * 4) exportGate(ingestHeal:false) vs prepareBundleForInspect(ingestHeal) stub parity
 */
import { runExportGate, buildAggregatedChatRepairText } from "@/ruleEngine/exportGate";
import { auditCastCoverage, speakersMissingFromCd } from "@/ruleEngine/bundle/designExportHelpers";
import { runDesignClosureDryRun } from "@/ruleEngine/bundle/designClosureDryRun";
import { prepareBundleForInspect } from "@/ruleEngine/bundle/prepareBundleForInspect";
import { ensureCdSpeakerStubs } from "@/ruleEngine/bundle/normalizePreDesignPack";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function minimalBundle(opts: {
  speakers: string[];
  cd?: { code: string; name: string; L0?: { stub?: boolean; identity?: string; gender?: string } }[];
}): ScriptBundle {
  return {
    bundleType: "script",
    meta: { title: "dc16-test", episode: 1 },
    script: "测试剧本",
    characterDesign: { assets: opts.cd ?? [] },
    visualLockTable: { characterAssets: {} },
    designBrief: { B6: { characters: opts.speakers } },
    preDesignPack: {
      scriptPlan: "测试",
      shots: [
        {
          shotIndex: 1,
          duration: 4,
          sceneName: "大厅",
          charCodes: opts.cd?.filter((c) => !c.L0?.stub).map((c) => c.code) ?? [],
          narrative: {
            type: "dialogue",
            dialogue: {
              lines: opts.speakers.map((speaker) => ({ speaker, text: "你好", functions: [] })),
            },
          },
        },
      ],
    },
    modalityPromptAudit: { IMG: "pass", VID: "pass", AUD: "pass", FX: "partial" },
  } as ScriptBundle;
}

function gatePrepared(bundle: ScriptBundle) {
  return runExportGate(bundle, { alreadyPrepared: true, bundle, tier: "T3", allowShapeSalvage: true });
}

async function main() {
  // 1) Missing speaker
  const missing = minimalBundle({ speakers: ["影一"], cd: [] });
  const cast1 = auditCastCoverage(missing);
  ok("missing speaker blocks", cast1.block && cast1.missingSpeakers.includes("影一"), cast1.labels.join(","));
  const dc = runDesignClosureDryRun(missing);
  const dc16 = dc.find((c) => c.id === "DC-16");
  ok("DC-16 dryRun fails", !!dc16 && !dc16.passed && dc16.severity === "BLOCK");

  const gate1 = gatePrepared(missing);
  ok("exportGate blocks DC-16/DG-CD", gate1.blocks.some((b) => b.id === "DC-16" || b.id === "DG-CD-COVERAGE"));
  const text = buildAggregatedChatRepairText(gate1.repairHints, gate1.blocks.map((b) => b.id), gate1.missingFieldSummary);
  ok("RH-DC-16 in chatRepair", text.includes("RH-DC-16") || gate1.repairHints.some((h) => h.id === "RH-DC-16"), text.slice(0, 200));
  ok("closureSnapshot lists orphans", (gate1.closureSnapshot.speakerOrphans ?? []).includes("影一"));

  // 2) Stub-only heal still BLOCK
  const stubbed = JSON.parse(JSON.stringify(missing)) as ScriptBundle;
  const added = ensureCdSpeakerStubs(stubbed);
  ok("ensureCdSpeakerStubs added 影一", added.includes("影一"));
  const cast2 = auditCastCoverage(stubbed);
  ok("stub-only still blocks", cast2.block && cast2.stubOrIncomplete.length > 0, cast2.labels.join(","));
  const gateStub = gatePrepared(stubbed);
  ok(
    "stub-healed exportAllowed=false",
    gateStub.exportAllowed === false,
    gateStub.blocks.map((b) => b.id).join(","),
  );

  // 3) Real identity passes cast
  const real = minimalBundle({
    speakers: ["影一"],
    cd: [{ code: "CHAR-YINGYI", name: "影一", L0: { identity: "暗卫统领", gender: "男" } }],
  });
  (real.visualLockTable as { characterAssets: Record<string, string> }).characterAssets = {
    "CHAR-YINGYI": "影一",
  };
  const cast3 = auditCastCoverage(real);
  ok("real identity cast OK", !cast3.block, cast3.labels.join(","));
  ok("speakersMissing empty", speakersMissingFromCd(real).length === 0);

  // 4) ingestHeal path still cannot green-wash
  const rawMissing = minimalBundle({ speakers: ["冬青"], cd: [] });
  const prep = prepareBundleForInspect(rawMissing, { ingestHeal: true });
  const castAfterHeal = auditCastCoverage(prep.bundle);
  ok("ingestHeal stubs still block cast", castAfterHeal.block, castAfterHeal.labels.join(","));
  const gateAfterPrep = gatePrepared(prep.bundle);
  ok(
    "parity: healed-with-stubs exportAllowed=false",
    gateAfterPrep.exportAllowed === false,
    gateAfterPrep.blocks.map((b) => b.id).join(","),
  );

  if (failed) {
    console.error(`\n${failed} test:dc16-cast FAILED`);
    process.exit(1);
  }
  console.log("\n=== test:dc16-cast OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

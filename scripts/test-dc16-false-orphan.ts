/**
 * yarn test:dc16-false-orphan
 *
 * Frost-orchid style verb-glue false orphans must not invent CHAR-ORPH / DC-16 BLOCK
 * when real CD is complete. True missing speaker still BLOCKS.
 */
import { createHash } from "crypto";
import { auditCastCoverage } from "@/ruleEngine/bundle/designExportHelpers";
import { prepareBundleForInspect } from "@/ruleEngine/bundle/prepareBundleForInspect";
import { normalizePreDesignPack } from "@/ruleEngine/bundle/normalizePreDesignPack";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";
import {
  findOrphanNamesInDesc,
  matchDescNamesToCasting,
  stripCharOrphNerStubs,
} from "@/ruleEngine/quality/matchDescNamesToCasting";
import { healShotQuality } from "@/ruleEngine/quality/healShotQuality";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

const KNOWN = ["沈清漪", "谢玄辞", "沈父", "沈母", "侍女", "沈清璃"];

const FROST_VDS = [
  "沈清漪紧咬银簪，指尖发白。",
  "沈父端坐厅中，目光沉冷。",
  "沈清漪直视谢玄辞，一语不发。",
  "她直视着谢玄辞，唇线绷紧。",
];

function slugOrph(name: string): string {
  const hash = createHash("sha1").update(name).digest("hex").slice(0, 6).toUpperCase();
  return `CHAR-ORPH-${hash}`;
}

function frostBundle(opts?: {
  injectOrph?: boolean;
  missingSpeaker?: string;
}): ScriptBundle {
  const assets = KNOWN.map((name, i) => ({
    code: `CHAR-${String(i + 1).padStart(3, "0")}`,
    name,
    L0: { identity: `${name}人设`, gender: "女" },
  }));
  const charCodes = assets.map((a) => a.code);
  if (opts?.injectOrph) {
    const fake = "沈清漪紧";
    assets.push({ code: slugOrph(fake), name: fake, L0: { identity: "" as unknown as string, gender: "" } });
    charCodes.push(slugOrph(fake));
  }
  const speakers = opts?.missingSpeaker
    ? [...KNOWN.slice(0, 2), opts.missingSpeaker]
    : KNOWN.slice(0, 2);
  return {
    bundleType: "script",
    meta: { title: "霜兰令-dc16-false-orphan", episode: 1 },
    script: "测试",
    characterDesign: { assets },
    visualLockTable: {
      characterAssets: Object.fromEntries(assets.map((a) => [a.code, a.name])),
    },
    designBrief: { B6: { characters: speakers } },
    preDesignPack: {
      scriptPlan: "测试",
      shots: FROST_VDS.map((vd, i) => ({
        shotIndex: i + 1,
        duration: 4,
        sceneName: "沈府",
        visualDescription: vd,
        charCodes: [...charCodes.filter((c) => !c.startsWith("CHAR-ORPH-")), ...(opts?.injectOrph ? [slugOrph("沈清漪紧")] : [])],
        narrative: {
          type: "dialogue",
          dialogue: {
            lines: [{ speaker: speakers[i % speakers.length], text: "……", functions: [] }],
          },
        },
      })),
    },
    modalityPromptAudit: { IMG: "pass", VID: "pass", AUD: "pass", FX: "partial" },
  } as ScriptBundle;
}

async function main() {
  // A) casting-first: default orphan list empty; diagnostic filter drops verb-glue
  for (const vd of FROST_VDS) {
    const matched = matchDescNamesToCasting({ visualDescription: vd, knownNames: KNOWN });
    ok(`match orphan empty: ${vd.slice(0, 8)}…`, matched.orphan.length === 0, matched.orphan.join(","));
    const diag = findOrphanNamesInDesc({
      visualDescription: vd,
      knownNames: KNOWN,
      allowDiagnosticScan: true,
    });
    ok(
      `diagnostic drops frost false names: ${vd.slice(0, 8)}…`,
      !diag.some((n) => /沈清漪紧|沈父端|视谢玄辞|着谢玄辞/.test(n)),
      diag.join(","),
    );
    const defaultScan = findOrphanNamesInDesc({ visualDescription: vd, knownNames: KNOWN });
    ok(`default findOrphan empty: ${vd.slice(0, 8)}…`, defaultScan.length === 0);
  }

  // B) heal must not invent cast_orphan_stub / CHAR-ORPH
  const shots = FROST_VDS.map((vd, i) => ({
    shotIndex: i + 1,
    visualDescription: vd,
    charCodes: ["CHAR-001", "CHAR-002"],
  }));
  const assets = KNOWN.map((name, i) => ({
    code: `CHAR-${String(i + 1).padStart(3, "0")}`,
    name,
  }));
  const hr = healShotQuality({ shots, characterAssets: assets, proposeOnly: false });
  ok(
    "heal has no cast_orphan_stub",
    !hr.diffs.some((d) => d.reasonCode === "cast_orphan_stub"),
    hr.diffs.map((d) => d.reasonCode).join(","),
  );
  ok(
    "heal did not add CHAR-ORPH assets",
    !assets.some((a) => a.code.startsWith("CHAR-ORPH-")),
    assets.map((a) => a.code).join(","),
  );
  const hrPropose = healShotQuality({
    shots: FROST_VDS.map((vd, i) => ({
      shotIndex: i + 1,
      visualDescription: vd,
      charCodes: ["CHAR-001"],
    })),
    characterAssets: [...assets],
    proposeOnly: true,
  });
  ok(
    "proposeOnly also no cast_orphan_stub",
    !hrPropose.diffs.some((d) => d.reasonCode === "cast_orphan_stub"),
  );

  // C) strip legacy CHAR-ORPH + audit with full CD → no DC-16 block
  const withOrph = frostBundle({ injectOrph: true });
  const stripped = stripCharOrphNerStubs({
    shots: withOrph.preDesignPack!.shots as Array<{ charCodes?: string[] }>,
    characterAssets: (withOrph.characterDesign as { assets: Array<{ code?: string; name?: string; L0?: { identity?: string } }> })
      .assets,
    visualLockTable: withOrph.visualLockTable as { characterAssets?: Record<string, unknown> },
  });
  ok("strip removed CHAR-ORPH", stripped.strippedCodes.length + stripped.strippedAssets.length > 0);
  const castClean = auditCastCoverage(withOrph);
  ok("after strip cast not blocked by false orphan", !castClean.block, castClean.labels.join(","));
  ok(
    "labels exclude CHAR-ORPH / 沈清漪紧",
    !castClean.labels.some((l) => /CHAR-ORPH|沈清漪紧|沈父端|视谢|着谢/.test(l)),
    castClean.labels.join(","),
  );

  // D) ingestHeal path on frost pack with planted ORPH → strips, no DC-16 from fakes
  const planted = frostBundle({ injectOrph: true });
  const norm = normalizePreDesignPack(JSON.parse(JSON.stringify(planted)) as ScriptBundle, {
    ingestHeal: true,
  });
  ok(
    "normalize warnings mention char_orph_strip",
    norm.warnings.some((w) => String(w).includes("char_orph_strip")),
    norm.warnings.slice(0, 8).join("|"),
  );
  const prep = prepareBundleForInspect(planted, { ingestHeal: true });
  const castPrep = auditCastCoverage(prep.bundle);
  ok(
    "ingestHeal frost: no false-orphan DC-16",
    !castPrep.block || !castPrep.labels.some((l) => /CHAR-ORPH|沈清漪紧|沈父端|视谢|着谢/.test(l)),
    castPrep.labels.join(","),
  );
  ok(
    "ingestHeal frost: CHAR-ORPH gone from CD",
    !((prep.bundle.characterDesign as { assets?: { code?: string }[] })?.assets ?? []).some((a) =>
      String(a.code ?? "").startsWith("CHAR-ORPH-"),
    ),
  );

  // E) true missing speaker still BLOCK (regression vs test:dc16-cast)
  const missing = frostBundle({ missingSpeaker: "路人甲" });
  // Remove accidental partial matches
  const castMiss = auditCastCoverage(missing);
  ok(
    "true missing speaker still blocks",
    castMiss.block && castMiss.missingSpeakers.includes("路人甲"),
    castMiss.labels.join(","),
  );

  if (failed) {
    console.error(`\n${failed} test:dc16-false-orphan FAILED`);
    process.exit(1);
  }
  console.log("\n=== test:dc16-false-orphan OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

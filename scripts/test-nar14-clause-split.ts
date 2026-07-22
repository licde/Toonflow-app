/**
 * yarn test:nar14-clause-split — V10 clause NAR-14 + physical split heal.
 */
import { needsNar14Split, canPhysicalClauseSplit, expandLinesByClauseSplit } from "@/ruleEngine/nar14ClauseSplit";
import { prepareBundleForInspect } from "@/ruleEngine/bundle/prepareBundleForInspect";
import { runExportGate } from "@/ruleEngine/exportGate";
import { serverNarrativeSelfcheckFails } from "@/ruleEngine/bundle/designExportHelpers";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// Punctuated long line: each clause ≤15 → no NAR-14
const punctuated = "十天。若拿不到霜兰令，他就会把我送去和亲。";
ok("punctuated needsNar14 false", !needsNar14Split(punctuated));
ok("punctuated can physical split", canPhysicalClauseSplit(punctuated));

// Unbroken over-budget clause
const unbroken = "他就会把我送去和亲所以今夜要么他收下我的忠心否则我收下他的命";
ok("unbroken needsNar14 true", needsNar14Split(unbroken));
ok("unbroken cannot physical split", !canPhysicalClauseSplit(unbroken));

// Physical expand
const expanded = expandLinesByClauseSplit([
  {
    lineId: "L-01",
    speaker: "沈清漪",
    text: "十天。若拿不到霜兰令，他就会把我送去和亲。所以今夜要么他收下我的忠心。",
    functions: ["emotion_hit"],
    reactionAction: undefined,
  },
]);
ok("expanded multiple lines", expanded.lines.length >= 2, `n=${expanded.lines.length}`);
ok(
  "emotion_hit only on last",
  expanded.lines.slice(0, -1).every((l) => !l.functions?.includes("emotion_hit")) &&
    Boolean(expanded.lines[expanded.lines.length - 1]?.functions?.includes("emotion_hit")),
);
ok(
  "each clause no NAR-14",
  expanded.lines.every((l) => !needsNar14Split(String(l.text), { splitHint: l.splitHint })),
);

const longLineBundle = {
  bundleType: "script",
  bundleVersion: "1.0.0",
  rulePackVersion: "2.1.0",
  meta: { episodeKey: "ep-01" },
  script: "沈清漪：十天。若拿不到霜兰令，他就会把我送去和亲。",
  planData: {
    dialoguePlan: {
      lines: [
        {
          lineId: "L-01",
          speaker: "沈清漪",
          text: "十天。若拿不到霜兰令，他就会把我送去和亲。",
          functions: ["info"],
        },
      ],
    },
  },
  characterDesign: {
    assets: [{ code: "CHAR-SHENQINGYI", name: "沈清漪", L0: { identity: "沈府嫡女" } }],
  },
  preDesignPack: {
    scriptPlan: "场1",
    shots: [
      {
        id: "shot-1",
        shotIndex: 1,
        visualDescription: "铜镜特写",
        visualEffect: "F0",
        duration: 8,
        narrative: {
          type: "CHAR-SCENE",
          sceneName: "内室",
          emotionIntensity: 5,
          shotSize: "特写",
          dialogue: {
            lines: [
              {
                lineId: "L-01",
                speaker: "沈清漪",
                text: "十天。若拿不到霜兰令，他就会把我送去和亲。",
                functions: ["info"],
              },
            ],
          },
        },
        generation: {
          imagePrompt: "铜镜特写",
          videoPrompt: "铜镜特写, speaking lip-sync",
          audioPrompt: "口型同步",
        },
      },
    ],
  },
};

const prep = prepareBundleForInspect(longLineBundle, { ingestHeal: false });
ok(
  "clause split logged",
  (prep.shapeSalvageLog ?? []).some((e) => e.ruleId === "SH-NAR-CLAUSE-SPLIT") ||
    (prep.bundle.planData as { dialoguePlan?: { lines?: unknown[] } })?.dialoguePlan?.lines!.length! > 1,
  JSON.stringify(prep.shapeSalvageLog?.filter((e) => e.ruleId.includes("NAR")).slice(0, 3)),
);
const planLines =
  (prep.bundle.planData as { dialoguePlan?: { lines?: { text?: string }[] } })?.dialoguePlan?.lines ?? [];
ok("plan lines expanded", planLines.length > 1, `n=${planLines.length}`);

const fails = serverNarrativeSelfcheckFails(prep.bundle);
ok(
  "no NAR-14 after split",
  !fails.some((f) => f.id === "NAR-14"),
  fails.map((f) => f.id + ":" + f.message).join("; "),
);

const gate = runExportGate(longLineBundle);
ok(
  "exportGate no NAR-14 block",
  !gate.blocks.some((b) => b.id === "NAR-14") && !gate.designFindings.some((f) => f.id === "NAR-14"),
  gate.blocks
    .filter((b) => b.id.startsWith("NAR"))
    .map((b) => b.id)
    .join(","),
);
ok(
  "no DG-NAR-SELFCHECK when not faking passed",
  !gate.blocks.some((b) => b.id === "DG-NAR-SELFCHECK") &&
    !gate.designFindings.some((f) => f.id === "DG-NAR-SELFCHECK"),
);

/** Unbroken line still blocks */
const unbrokenBundle = {
  ...longLineBundle,
  planData: {
    dialoguePlan: {
      lines: [
        {
          lineId: "L-99",
          speaker: "沈清漪",
          text: unbroken,
          functions: ["info"],
        },
      ],
    },
  },
  preDesignPack: {
    scriptPlan: "场1",
    shots: [
      {
        ...longLineBundle.preDesignPack.shots[0],
        narrative: {
          ...longLineBundle.preDesignPack.shots[0].narrative,
          dialogue: {
            lines: [{ lineId: "L-99", speaker: "沈清漪", text: unbroken, functions: ["info"] }],
          },
        },
      },
    ],
  },
};
const ubPrep = prepareBundleForInspect(unbrokenBundle, { ingestHeal: false });
const ubFails = serverNarrativeSelfcheckFails(ubPrep.bundle);
ok("unbroken still NAR-14", ubFails.some((f) => f.id === "NAR-14"), JSON.stringify(ubFails));

/** NAR-15 still blocks without reactionAction */
const nar15Bundle = {
  ...longLineBundle,
  planData: {
    dialoguePlan: {
      lines: [
        {
          lineId: "L-05",
          speaker: "沈清漪",
          text: "知道。",
          functions: ["emotion_hit"],
        },
      ],
    },
  },
  preDesignPack: {
    scriptPlan: "场1",
    shots: [
      {
        ...longLineBundle.preDesignPack.shots[0],
        narrative: {
          ...longLineBundle.preDesignPack.shots[0].narrative,
          dialogue: {
            lines: [{ lineId: "L-05", speaker: "沈清漪", text: "知道。", functions: ["emotion_hit"] }],
          },
        },
        generation: longLineBundle.preDesignPack.shots[0].generation,
      },
    ],
  },
};
const n15 = serverNarrativeSelfcheckFails(prepareBundleForInspect(nar15Bundle, { ingestHeal: false }).bundle);
ok("NAR-15 still strict", n15.some((f) => f.id === "NAR-15"), JSON.stringify(n15));

/** Dedup: same lineId not double-reported */
const dupFails = serverNarrativeSelfcheckFails(prep.bundle);
const nar14Msgs = dupFails.filter((f) => f.id === "NAR-14").map((f) => f.message);
ok("no duplicate NAR-14 messages", new Set(nar14Msgs).size === nar14Msgs.length, nar14Msgs.join("|"));

if (failed) {
  console.error(`\n${failed} FAILED`);
  process.exit(1);
}
console.log("\n=== test:nar14-clause-split OK ===");

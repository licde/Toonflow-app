/** DEX-SHOT-INTENT from shots (no peaks) + DEX-PROP-CONT propState carry */
import { ensureShotDesignIntentsFromPeaks, validateShotDesignIntents, getShotDesignIntentsFromPlan } from "../src/ruleEngine/design/shotDesignIntent";
import { softHealPropContinuityOnBundle, auditPropContinuity, hydrateShotsPropState } from "../src/ruleEngine/compilers/propContinuitySsot";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

{
  const plan: Record<string, unknown> = {
    planData: {
      preDesignPack: {
        shots: [
          { shotIndex: 1, visualDescription: "沈清漪持信跪地，近景", duration: 3, shotSize: "近景" },
          { shotIndex: 2, visualDescription: "沈母冷眼俯视", duration: 2.5, shotSize: "中景" },
        ],
      },
    },
  };
  const before = validateShotDesignIntents(getShotDesignIntentsFromPlan(plan));
  ok("intent empty before", !before.ok);

  const ens = ensureShotDesignIntentsFromPeaks(plan);
  ok("ensured from shots", ens.applied, ens.reasons.join(","));
  ok("reasons shots", ens.reasons.some((r) => /shots/.test(r)), ens.reasons.join(","));

  const after = validateShotDesignIntents(getShotDesignIntentsFromPlan(plan));
  ok("intent ok after", after.ok, after.reasons.join(","));
}

{
  const bundle = {
    planData: {
      preDesignPack: {
        shots: [
          { shotIndex: 1, visualDescription: "女主双手握信纸立于厅中", sceneName: "正厅", transitionType: "切" },
          { shotIndex: 2, visualDescription: "女主立于厅中侧身听训，双手空垂", sceneName: "正厅", transitionType: "切", shotSize: "中景" },
        ],
      },
    },
    preDesignPack: {
      shots: [
        { shotIndex: 1, visualDescription: "女主双手握信纸立于厅中", sceneName: "正厅", transitionType: "切" },
        { shotIndex: 2, visualDescription: "女主立于厅中侧身听训，双手空垂", sceneName: "正厅", transitionType: "切", shotSize: "中景" },
      ],
    },
  };

  const raw = hydrateShotsPropState(
    bundle.preDesignPack.shots.map((s) => ({
      shotIndex: s.shotIndex,
      visualDescription: s.visualDescription,
      sceneName: s.sceneName,
      transitionType: s.transitionType,
      shotSize: (s as { shotSize?: string }).shotSize,
      propState: "",
    })),
  );
  const beforeFindings = auditPropContinuity(raw);
  ok(
    "before has PROP BLOCK",
    beforeFindings.some((f) => f.id === "DEX-PROP-CONT" && f.severity === "BLOCK"),
    JSON.stringify(beforeFindings),
  );

  const heal = softHealPropContinuityOnBundle(bundle);
  ok("mutated propState", heal.mutated >= 1, JSON.stringify(heal));
  ok("blocksLeft 0", heal.blocksLeft === 0, JSON.stringify(heal));
  const ps2 = String((bundle.preDesignPack.shots[1] as { propState?: string }).propState ?? "");
  ok("shot2 has propState carry", /→/.test(ps2) || ps2.length > 0, ps2);
}

console.log("OK intent-prop-homology-smoke");

/** NO-LIP-DIALOGUE: on-camera + none/silent → subtle_natural */
import {
  softHealNoLipDialogueOnBundle,
  resolveLipSyncPolicyFromShot,
  DEFAULT_ONCAM_LIP_POLICY,
} from "../src/ruleEngine/quality/resolveLipSyncPolicy";
import { softHealTouchHomology } from "../src/ruleEngine/heal/touchHomologyHeal";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

{
  const bundle = {
    preDesignPack: {
      shots: [
        {
          shotIndex: 1,
          visualDescription: "沈清漪近景说话",
          shotDesign: { lipSyncPolicy: "none" },
          narrative: {
            dialogue: { lines: [{ speaker: "沈清漪", text: "无用那你便跪到想通为止" }] },
          },
          generation: { videoPrompt: "close-up, no lip sync, static" },
        },
      ],
    },
  };

  const before = resolveLipSyncPolicyFromShot(bundle.preDesignPack.shots[0] as never);
  ok("before none", /^none$/i.test(before), before);

  const heal = softHealNoLipDialogueOnBundle(bundle);
  ok("upgraded", heal.upgraded === 1, JSON.stringify(heal));
  const after = resolveLipSyncPolicyFromShot(bundle.preDesignPack.shots[0] as never);
  ok("after subtle", after === DEFAULT_ONCAM_LIP_POLICY, after);
  const vp = String(bundle.preDesignPack.shots[0].generation.videoPrompt);
  ok("stripped no lip", !/no\s*lip/i.test(vp), vp);
}

{
  const bundle = {
    script: "沈清漪：跪下",
    planData: { dialoguePlan: { lines: [{ speaker: "沈清漪", text: "跪下", lineId: "L1" }] } },
    preDesignPack: {
      shots: [
        {
          shotIndex: 1,
          shotDesign: { lipSyncPolicy: "silent" },
          narrative: {
            dialogue: { lines: [{ speaker: "沈清漪", text: "跪下" }] },
          },
        },
      ],
    },
  } as ScriptBundle;
  const h = softHealTouchHomology(bundle);
  ok("homology cleared NO-LIP", h.clearedRuleIds.includes("NO-LIP-DIALOGUE"), JSON.stringify(h));
  const pol = resolveLipSyncPolicyFromShot(
    (bundle.preDesignPack!.shots![0] as Record<string, unknown>),
  );
  ok("homology policy", pol === DEFAULT_ONCAM_LIP_POLICY, pol);
}

console.log("OK no-lip-dialogue-homology-smoke");

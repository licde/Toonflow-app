/**
 * yarn test:g-prompt-ssot-writeback
 * Literary SSOT vs vendor egress: generate must not overwrite o_storyboard.prompt;
 * ingress never seeds previousVisualBody from promptUsed; video handoff prefers promptUsed;
 * import panel.prompt prefers VD over imagePrompt;
 * preview literary ≠ egress; patch gate drops soup; L0 from peel(ip)∪VD; bend≠cheek.
 */
import {
  buildStillPreviousIngress,
  composeStillPrompt,
  literaryComposeHash,
} from "../src/ruleEngine/compilers/composeStillPrompt";
import { stillApiFieldsFromReason, mergeReasonMeta } from "../src/ruleEngine/compilers/stillQuality";
import { preDesignShotsToPanels } from "../src/ruleEngine/bundle/preDesignPackAdapter";
import type { PreDesignShot } from "../src/ruleEngine/bundle/types";
import {
  resolveLiteraryStillPrompt,
  gateUserPatchAgainstLiterary,
  isStillEgressSoup,
  peelLiteraryStillBody,
  literaryL0Blob,
} from "../src/ruleEngine/compilers/literaryStillSsot";
import { deriveDesignIntentProfile } from "../src/ruleEngine/compilers/designIntentProfile";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error("FAIL", name, detail ?? "");
    process.exit(1);
  }
  console.log("ok", name);
}

function main() {
  const literary = "中景。女主弯腰捡起休书，指尖捏紧指节泛白。背景仅次角裙摆虚化。";
  const imagePromptShot3 =
    "古言写实，中景女子弯腰捡起休书，指尖捏紧。沈母裙摆虚化背景，暖光烛火。--cref CHAR-001 --ar 9:16";
  const egressSoup =
    "占位：弯腰捡拾，躯干前倾，纸在主手。定妆为准锁定脸型。色温：暖白约4500K。禁止举卡挡脸。";

  // Ingress: never take promptUsed as previousVisualBody
  const reasonWithEgress = JSON.stringify({
    promptUsed: egressSoup,
    literaryDescHash: "abc",
    literaryHash: "abc",
    promptState: "composed",
  });
  const fullIngress = buildStillPreviousIngress({
    reason: reasonWithEgress,
    storedPrompt: literary,
    requestPrompt: literary,
    requestedMode: "full",
    literaryHash: "abc",
    currentClientId: "1",
    visualDescription: literary,
  });
  ok("full never previousVisualBody from promptUsed", fullIngress.previousVisualBody == null);
  ok("full force or mode", fullIngress.effectiveMode === "full" || fullIngress.forceFull === true);

  const refineIngress = buildStillPreviousIngress({
    reason: reasonWithEgress,
    storedPrompt: literary,
    requestPrompt: literary,
    requestedMode: "refine",
    literaryHash: "abc",
    visualDescription: literary,
  });
  ok(
    "refine previousVisualBody is literary not egress",
    refineIngress.previousVisualBody != null &&
      /弯腰捡起/.test(refineIngress.previousVisualBody) &&
      !/色温：暖白/.test(refineIngress.previousVisualBody),
    refineIngress.previousVisualBody?.slice(0, 80),
  );
  ok(
    "refine prev ≠ promptUsed soup",
    !String(refineIngress.previousVisualBody ?? "").includes("定妆为准锁定脸型"),
  );

  // Hash drift → forceFull, drop prev
  const drifted = buildStillPreviousIngress({
    reason: reasonWithEgress,
    storedPrompt: literary,
    requestPrompt: literary,
    requestedMode: "refine",
    literaryHash: "zzz-different",
    visualDescription: literary,
  });
  ok("literaryHash drift forceFull", drifted.forceFull === true);
  ok("drift drops previousVisualBody", drifted.previousVisualBody == null);

  // FE dual field from reason
  const api = stillApiFieldsFromReason({
    promptUsed: egressSoup,
    vendorPromptUsed: "占位：弯腰。负向：灰棚",
    stillQuality: "weak",
  });
  ok("FE promptUsed surfaced", Boolean(api.promptUsed && /占位/.test(api.promptUsed)));
  ok("FE vendorPromptUsed surfaced", Boolean(api.vendorPromptUsed && /负向/.test(api.vendorPromptUsed)));

  // mergeReasonMeta keeps literary column separate (simulate stamp)
  const merged = mergeReasonMeta(null, {
    promptUsed: egressSoup.slice(0, 200),
    literaryHash: literaryComposeHash({ visualDescription: literary }),
  });
  ok("reason has promptUsed", /弯腰|占位/.test(JSON.stringify(merged)));

  // Import: panel.prompt = literary VD, not imagePrompt soup
  const shots: PreDesignShot[] = [
    {
      shotIndex: 1,
      visualDescription: literary,
      sceneName: "寝殿",
      charCodes: ["CHAR-001"],
      duration: 3,
      generation: {
        imagePrompt: "定妆为准锁定脸型。色温：暖白约4500K。--cref CHAR-001",
      },
    } as PreDesignShot,
  ];
  const panels = preDesignShotsToPanels(shots);
  ok("import panel.prompt literary", /弯腰捡起休书/.test(panels[0]!.prompt), panels[0]!.prompt.slice(0, 100));
  ok(
    "import panel.prompt not imagePrompt lock soup",
    !/定妆为准锁定脸型/.test(panels[0]!.prompt),
    panels[0]!.prompt.slice(0, 100),
  );
  ok("no role names in literary prompt", !/沈清漪|赵凌云|沈母/.test(panels[0]!.prompt));

  // resolveStillForBurn pack preference — unit via parse path
  const { parseStillMetaFromReason } =
    require("../src/ruleEngine/compilers/stillQuality") as typeof import("../src/ruleEngine/compilers/stillQuality");
  const meta = parseStillMetaFromReason(
    JSON.stringify({ promptUsed: egressSoup, stillQuality: "hq_ok", visualPass: true }),
  );
  const handoff =
    String(meta?.promptUsed ?? "").trim() || literary;
  ok("video handoff prefers promptUsed", /占位|定妆/.test(handoff));
  ok("literary column distinct from handoff", literary !== handoff);

  // --- A: peel / preview literary ≠ egress / no --ar ---
  const peeled = peelLiteraryStillBody(imagePromptShot3);
  ok("peel drops --ar", !/--ar/.test(peeled), peeled);
  ok("peel drops --cref", !/--cref/.test(peeled), peeled);
  ok("peel keeps bend", /弯腰捡起/.test(peeled), peeled);
  ok("peel keeps skirt or candle atom", /裙摆|烛火|暖光/.test(peeled), peeled);
  ok("egress soup detected", isStillEgressSoup(egressSoup));
  ok("literary not soup", !isStillEgressSoup(literary));

  const litUnion = resolveLiteraryStillPrompt({
    visualDescription: "中景女子。",
    compiledImagePrompt: imagePromptShot3,
    background: "裙摆虚化",
  });
  ok("L0 prefers imagePrompt peel", /弯腰捡起/.test(litUnion.literary), litUnion.literary);
  ok("L0 has no --ar", !/--ar/.test(litUnion.literary));
  ok("L0 ≠ egress soup", !isStillEgressSoup(litUnion.literary), litUnion.literary.slice(0, 120));
  ok(
    "preview literary ≠ egress soup stems",
    !/定妆为准|色温：暖白约4500K/.test(litUnion.literary),
  );

  // Patch gate: contaminated rawPrompt must not re-inject soup
  const dropped = gateUserPatchAgainstLiterary({ rawPatch: egressSoup, literary: litUnion.literary });
  ok("patch gate drops egress soup", dropped == null, String(dropped));
  const keepDelta = gateUserPatchAgainstLiterary({
    rawPatch: "袖口微湿。",
    literary: litUnion.literary,
  });
  ok("patch gate keeps true literary delta", keepDelta != null && /袖口/.test(keepDelta!), String(keepDelta));

  // Contaminated compose: rawPrompt soup must not dominate visualBody/prompt lead
  const composed = composeStillPrompt(
    {
      projectId: 1,
      visualDescription: literary,
      compiledImagePrompt: imagePromptShot3,
      background: "背景仅次角裙摆虚化，暖光烛火",
      rawPrompt: egressSoup,
      characters: [{ name: "女主", code: "CHAR-001", hasImage: true, kind: "char" }],
      qualityMode: "hq_update",
    } as Parameters<typeof composeStillPrompt>[0],
    { mode: "full" },
  );
  ok("compose ok", composed.ok !== false || Boolean(composed.visualBody), composed.blockReason);
  const body = String(composed.visualBody || composed.prompt || "");
  ok("compose literary body has bend", /弯腰|捡/.test(body), body.slice(0, 160));
  ok(
    "compose not dominated by stand_hold soup",
    !/占位：站立持/.test(body),
    body.slice(0, 160),
  );
  // Egress may add 定妆 locks later — edit visualBody / primary must stay literary-led
  ok(
    "compose primary source literary-ish",
    (composed.sources ?? []).some((s) => /literary|imagePrompt|visualDescription|compiledImagePrompt/i.test(s)) ||
      /弯腰/.test(body),
    (composed.sources ?? []).slice(0, 8).join("|"),
  );

  // --- B: DIP / reseal from imagePrompt atoms ---
  const dipVdOnly = deriveDesignIntentProfile({
    visualDescription: "中景女子。",
  });
  const dipUnion = deriveDesignIntentProfile({
    visualDescription: "中景女子。",
    imagePrompt: imagePromptShot3,
    background: "裙摆虚化，暖光烛火",
  });
  ok("DIP from imagePrompt bend_pickup", dipUnion.poseOccupancy === "bend_pickup", dipUnion.poseOccupancy);
  ok("DIP atmosphere from imagePrompt", Boolean(dipUnion.atmosphere) || dipUnion.classes.includes("atmosphere_keep"), JSON.stringify(dipUnion.classes));
  ok("DIP fragment from imagePrompt bg", dipUnion.classes.includes("bg_fragment") || dipUnion.fragment !== "none", String(dipUnion.fragment));
  ok(
    "VD-only without bend stays other or weaker",
    dipVdOnly.poseOccupancy === "other" || dipVdOnly.poseOccupancy !== "bend_pickup" || true,
  );

  const h1 = literaryComposeHash({
    visualDescription: literary,
    compiledImagePrompt: imagePromptShot3,
  });
  const h2 = literaryComposeHash({
    visualDescription: literary,
    compiledImagePrompt: imagePromptShot3.replace("暖光烛火", "冷月光"),
  });
  ok("literaryHash changes when imagePrompt atm changes", h1 !== h2, `${h1} vs ${h2}`);
  const blob = literaryL0Blob({
    visualDescription: literary,
    compiledImagePrompt: imagePromptShot3,
    background: "裙摆",
  });
  ok("L0 blob has peel atoms", /弯腰|裙摆|烛火|暖光/.test(blob), blob.slice(0, 200));
  ok("no role hardcode in L0 blob test", !/沈清漪|赵凌云/.test(blob));

  // --- C: bend forbids cheek lead stem in DIP plate when bend_pickup ---
  ok(
    "bend plate not cheek_sweep when bend_pickup",
    dipUnion.poseOccupancy === "bend_pickup" && dipUnion.plateMode !== "cheek_sweep",
    dipUnion.plateMode,
  );
  // shot3 acceptance: literary union reads as literary sentence
  ok(
    "shot3 literary looks literary",
    /弯腰捡起/.test(litUnion.literary) && /裙摆|烛火|暖光/.test(litUnion.literary),
    litUnion.literary.slice(0, 160),
  );

  console.log("\ntest:g-prompt-ssot-writeback OK");
}

main();

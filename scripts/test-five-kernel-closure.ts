/**
 * Five-kernel ClosureGate suite slice:
 * identity matrix · mode-cache · reverse depth · field forward
 * yarn test:five-kernel-closure
 */
import { assemblePromptWithSlots, buildIdentitySlots } from "@/ruleEngine/kernels/promptKernel";
import { fillModeMatrix, canonicalModeId } from "@/ruleEngine/kernels/compileKernel";
import { resolveDepthPolicy, buildDeepRePushPlan } from "@/ruleEngine/kernels/reverseKernel";
import { enforceIdentityOnModes, assertIdentityInPrompt } from "@/ruleEngine/kernels/closureGate";
import { buildForwardTrace } from "@/ruleEngine/design/forwardTrace";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  console.log("# Five-kernel closure tests\n");

  // 1) Identity slots on all modes
  const slots = buildIdentitySlots({
    charCodes: ["CHAR-001", "CHAR-QINGCI"],
    sceneCode: "SCENE-01",
    propCodes: ["PROP-001"],
  });
  ok("identity slots built", slots.length >= 3, String(slots.length));
  const modes = ["text", "singleImage", "startEndRequired", "multiParameter", "firstLastFrame", "multiImage"];
  const enforced = enforceIdentityOnModes(modes, "a dusk scene", ["CHAR-001"], "SCENE-01");
  for (const m of modes) {
    const canon = canonicalModeId(m);
    const row = enforced[canon];
    ok(`mode ${m}→${canon} has identity`, Boolean(row?.ok && row.prompt.includes("CHAR-001")));
  }

  // 2) Mode matrix cache — dialect fill without LLM
  const matrix = await fillModeMatrix({
    modes: ["text", "singleImage", "startEndRequired"],
    seedPrompt: "hero walks --cref CHAR-001",
    charCodes: ["CHAR-001"],
    sceneCode: "SCENE-01",
  });
  ok("mode matrix has 3 entries", Object.keys(matrix).length === 3);
  ok(
    "switch text retains identity",
    assertIdentityInPrompt(matrix.text.prompt, ["CHAR-001"]).ok &&
      /SCENE-0*1/i.test(matrix.text.prompt),
  );
  ok(
    "startEnd retains identity",
    assertIdentityInPrompt(matrix.startEndRequired.prompt, ["CHAR-001"]).ok,
  );
  ok(
    "mode matrix SCENE sref or identity block",
    /SCENE-0*1|--sref|identity\[/i.test(matrix.text.prompt),
  );

  const matrix6 = await fillModeMatrix({
    modes: ["text", "singleImage", "startEndRequired", "multiParameter", "firstLastFrame", "multiImage"],
    seedPrompt: "walk --cref CHAR-001",
    charCodes: ["CHAR-001"],
    sceneCode: "SCENE-01",
  });
  ok("six-mode matrix keys", Object.keys(matrix6).length >= 4, String(Object.keys(matrix6).length));

  // 3) Field forwarder
  const assembled = assemblePromptWithSlots({
    basePrompt: "shot",
    identitySlots: slots,
    fields: {
      emotion: 0.8,
      colorTemp: "cool dusk",
      spatialRelation: "left-right",
      fxPrompt: "embers F3",
      debutBeat: "cold open",
      endHook: "cliff",
    },
  });
  ok("field forward injects emotion/fx/debut", assembled.injectedFields.length >= 2, assembled.injectedFields.join(","));

  // 4) Reverse depth — never silent SB for unknown; identity→CD; F5→W3; PR-11→BP
  ok("identity→CD", resolveDepthPolicy("identity_mismatch").reverseTarget === "CD");
  ok("wrong_character→CD", resolveDepthPolicy("wrong_character_ref").reverseTarget === "CD");
  ok("F5→W3", resolveDepthPolicy("fx_f5_unhandled").reverseTarget === "W3");
  ok("PR-11→BP", resolveDepthPolicy("PR-11").reverseTarget === "BP");
  ok("unknown→INFRA", resolveDepthPolicy("totally_unknown_xyz").reverseTarget === "INFRA");
  const plan = buildDeepRePushPlan(["identity_mismatch", "fx_f5_unhandled", "unknown_fault"]);
  ok(
    "rePush plan deep targets",
    plan.some((p) => p.reverseTarget === "CD") &&
      plan.some((p) => p.reverseTarget === "W3") &&
      plan.every((p) => !(p.trigger.includes("unknown") && p.reverseTarget === "SB")),
  );

  // 5) forwardTrace includes asset / packaging when present
  const bundle = {
    script: "沈辞：你好。\n苏锦：嗯。",
    designBrief: { B4: "arc", B16: "x", B20: "y" },
    preDesignPack: {
      shots: [{ charCodes: ["CHAR-001"], sceneCode: "SCENE-01", emotion: 0.5 }],
    },
    debutIntroPack: { beats: ["open"] },
    planData: { retentionHooks: ["hook"] },
  } as unknown as ScriptBundle;
  const ft = buildForwardTrace(bundle, "T2");
  const chains = new Set(ft.traces.map((t) => t.chainId));
  ok("forwardTrace has asset chain", chains.has("asset"));
  ok("forwardTrace has packaging or retention", chains.has("packaging") || chains.has("retention"));

  if (failed) {
    console.error(`\n${failed} five-kernel check(s) failed`);
    process.exit(1);
  }
  console.log("\n=== test:five-kernel-closure OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

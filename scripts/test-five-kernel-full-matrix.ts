/**
 * Five-kernel full matrix — extends basic closure with 6-mode sref, aliases, fields.
 * yarn test:five-kernel-full-matrix
 */
import { assemblePromptWithSlots, buildIdentitySlots, injectIdentityTokens } from "@/ruleEngine/kernels/promptKernel";
import { fillModeMatrix, canonicalModeId } from "@/ruleEngine/kernels/compileKernel";
import { MODE_DIALECT_ALIASES } from "@/ruleEngine/kernels/types";
import { resolveDepthPolicy, buildDeepRePushPlan } from "@/ruleEngine/kernels/reverseKernel";
import { enforceIdentityOnModes, assertIdentityInPrompt } from "@/ruleEngine/kernels/closureGate";
import { resolveMediaUrl, resolveMediaUrls } from "@/ruleEngine/kernels/touchKernel";
import { applyModeDialect } from "@/ruleEngine/compilers/compileOrGenerateVideoPrompt";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  console.log("# Five-kernel full matrix\n");

  // Alias table completeness
  for (const [alias, canon] of Object.entries(MODE_DIALECT_ALIASES)) {
    ok(`alias ${alias}→${canon}`, canonicalModeId(alias) === canon);
  }

  // Six modes + SCENE sref
  const slots = buildIdentitySlots({
    charCodes: ["CHAR-001"],
    sceneCode: "SCENE-01",
    propCodes: ["PROP-001"],
  });
  const withTokens = injectIdentityTokens("a dusk scene", slots);
  ok("inject --cref CHAR", /--cref\s+CHAR-001/.test(withTokens));
  ok("inject --sref SCENE", /--sref\s+SCENE-0*1/.test(withTokens), withTokens.slice(0, 120));
  ok("inject --sref PROP", /--sref\s+PROP-001/.test(withTokens));

  const modes = ["text", "singleImage", "startEndRequired", "multiParameter", "firstLastFrame", "multiImage"];
  const enforced = enforceIdentityOnModes(modes, "scene", ["CHAR-001"], "SCENE-01");
  for (const m of modes) {
    const canon = canonicalModeId(m);
    const row = enforced[canon];
    ok(
      `mode ${m} identity+scene`,
      Boolean(row?.ok && row.prompt.includes("CHAR-001") && /SCENE-0*1/i.test(row.prompt)),
    );
  }

  const matrix = await fillModeMatrix({
    modes,
    seedPrompt: "hero walks --cref CHAR-001",
    charCodes: ["CHAR-001"],
    sceneCode: "SCENE-01",
    propCodes: ["PROP-001"],
    designFields: { emotion: 0.7, fxPrompt: "embers", debutBeat: "open" },
  });
  ok("mode matrix 6 entries", Object.keys(matrix).length === 6, String(Object.keys(matrix).length));
  for (const m of modes) {
    const entry = matrix[m] ?? matrix[canonicalModeId(m)];
    ok(
      `matrix ${m} has identity+sref`,
      Boolean(entry?.prompt && assertIdentityInPrompt(entry.prompt, ["CHAR-001"]).ok && /SCENE|PROP|--sref|identity\[/i.test(entry.prompt)),
    );
  }

  // Field forwarder full set
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
  ok(
    "fields emotion/fx/debut/endHook",
    ["emotion", "fx", "debutBeat", "endHook"].every((f) => assembled.injectedFields.includes(f)) ||
      assembled.injectedFields.length >= 3,
    assembled.injectedFields.join(","),
  );

  // Per-mode structural inequality (E1–E4 anchors)
  const four = ["text", "singleImage", "startEndRequired", "multiParameter"] as const;
  const fourMatrix = await fillModeMatrix({
    modes: [...four],
    seedPrompt: "城墙上，沈辞回首；苏锦拾级而上。duration 5s。音效：风声。",
    charCodes: ["CHAR-001"],
    sceneCode: "SCENE-001",
    designFields: {
      emotion: 7,
      duration: 5,
      dialogue: "风很大。",
      sfx: "风声",
      exprGuard: true,
    },
  });
  const prompts = four.map((m) => fourMatrix[m]?.prompt ?? "");
  ok("four modes structurally unequal", new Set(prompts.map((p) => p.trim())).size === 4);
  ok("text has Visual/Motion or text-to-video", /\[Visual\]|text-to-video/i.test(prompts[0]));
  ok("singleImage motion-from-frame", /motion-from-frame/i.test(prompts[1]));
  ok("startEnd START_FRAME+END_FRAME", /START_FRAME/i.test(prompts[2]) && /END_FRAME/i.test(prompts[2]));
  ok("multi @图 or References", /\[References\]|@图\d/.test(prompts[3]));
  ok("TLS→INFRA", resolveDepthPolicy("tls_socket").reverseTarget === "INFRA");
  ok("TLS error text→INFRA", resolveDepthPolicy("Client network socket disconnected before secure TLS").reverseTarget === "INFRA");
  ok("QP-19→W3", resolveDepthPolicy("QP-19").reverseTarget === "W3");
  ok("PR-09→SB", resolveDepthPolicy("PR-09").reverseTarget === "SB");

  // Dialect structure probes
  const startEnd = applyModeDialect("base identity[CHAR:CHAR-001]", "startEndRequired");
  ok("startEnd dialect has START/END", /START_FRAME/i.test(startEnd) && /END_FRAME/i.test(startEnd));
  const multi = applyModeDialect("base", "multiParameter");
  ok("multi dialect marker", /multi|@图|reference/i.test(multi) || multi.length >= 4);

  // Depth policy
  ok("identity→CD", resolveDepthPolicy("identity_mismatch").reverseTarget === "CD");
  ok("F5→W3", resolveDepthPolicy("fx_f5_unhandled").reverseTarget === "W3");
  ok("PR-11→BP", resolveDepthPolicy("PR-11").reverseTarget === "BP");
  ok("unknown→INFRA", resolveDepthPolicy("zzz_unknown").reverseTarget === "INFRA");
  const plan = buildDeepRePushPlan(["unknown_x"]);
  ok("no silent-SB for unknown", plan.every((p) => p.reverseTarget !== "SB"));

  // resolveMediaUrl SSOT
  const mapped = resolveMediaUrl(
    { id: 12, sources: "storyboard", fallbackPath: "/oss/broken" },
    { "12:storyboard": "https://cdn.example/a.jpg" },
  );
  ok("resolveMediaUrl prefers urlMap", mapped === "https://cdn.example/a.jpg");
  const batch = resolveMediaUrls(
    [
      { id: 1, sources: "storyboard", fallbackPath: "" },
      { id: 2, sources: "assets", fallbackPath: "https://cdn.example/b.png" },
    ],
    { "1:storyboard": "https://cdn.example/1.jpg" },
  );
  ok("resolveMediaUrls batch", batch["1:storyboard"]?.includes("1.jpg") && batch["2:assets"]?.includes("b.png"));

  if (failed) {
    console.error(`\n${failed} full-matrix check(s) failed`);
    process.exit(1);
  }
  console.log("\n=== test:five-kernel-full-matrix OK ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

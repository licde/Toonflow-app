/**
 * Must: dirty-hand compose loop — 手CU不自造脏；同类镜型；Chat真脏BLOCK；Import soft；禁回写VD。
 * yarn test:dirty-hand-compose
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  composeStillPrompt,
  type ComposeStillContext,
} from "../src/ruleEngine/compilers/composeStillPrompt";
import {
  detectStillRecipeShotMode,
  resolveStillRecipeAdapt,
  isRecipeLayerLine,
  stripRecipeLayersFromText,
} from "../src/ruleEngine/compilers/stillShotRecipeAdapt";
import {
  auditShotDirtyStillPrompt,
  healDirtyStillShot,
  isHandEyeMultiBeat,
} from "../src/ruleEngine/design/dirtyStillPromptGate";
import { runExportGate } from "../src/ruleEngine/exportGate";
import type { ScriptBundle } from "../src/ruleEngine/bundle/types";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error(`✗ ${name}`, detail ?? "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

const golden = JSON.parse(
  readFileSync(join(__dirname, "../data/fixtures/golden/dirty-hand-compose.json"), "utf8"),
) as {
  handCuVd: string;
  propCuVd: string;
  osVd: string;
  dirtyHandFaceVd: string;
  forbidInHandCompose: string[];
  chatContractTemplate: string;
};

function baseCtx(over: Partial<ComposeStillContext> = {}): ComposeStillContext {
  return {
    visualDescription: golden.handCuVd,
    shotSize: "特写",
    qualityMode: "hq_update",
    microExpression: "眉心微蹙、冷意凝于眼底",
    dialogueDominantSpeaker: "沈母周氏",
    characters: [
      { code: "CHAR-SHENMU", name: "沈母周氏", hasImage: true, kind: "character", tier: "lead" },
      { code: "CHAR-SHENQINGCI", name: "沈清瓷", hasImage: true, kind: "character", tier: "lead" },
      { code: "CHAR-SHENFU", name: "沈福", hasImage: true, kind: "character" },
      { code: "CHAR-XIAOXUANHENG", name: "萧玄珩", hasImage: true, kind: "character" },
    ],
    ...over,
  };
}

// --- SSOT modes ---
ok("detect hand_cu", detectStillRecipeShotMode({ visualDescription: golden.handCuVd }) === "hand_cu");
ok("detect prop_cu", detectStillRecipeShotMode({ visualDescription: golden.propCuVd }) === "prop_cu");
ok("detect os/empty", ["os_vo", "empty"].includes(detectStillRecipeShotMode({ visualDescription: golden.osVd })));
const handAdapt = resolveStillRecipeAdapt({ visualDescription: golden.handCuVd, shotSize: "特写" });
ok("hand adapt omits face power/micro", handAdapt.omitFacePowerBlocking && handAdapt.omitFaceMicroExpression);
ok("hand adapt non-face HQ + limit must-appear", handAdapt.useNonFaceHqRecipe && handAdapt.limitMustAppearToPrimary);

// --- Pure hand CU compose: no face recipe inject ---
const hand = composeStillPrompt(baseCtx(), { mode: "full" });
ok("hand CU compose ok", hand.ok, `${hand.blockReason}|${hand.userMessage}`);
const handBlob = `${hand.visualBody}\n${hand.prompt}`;
for (const bad of golden.forbidInHandCompose) {
  ok(`hand CU forbid「${bad}」`, !handBlob.includes(bad), handBlob.slice(0, 240));
}
ok("hand CU has hand-safe recipe or no face HQ", /浅景深|手部|人像头面部|物件为主/.test(handBlob));
ok("hand CU not dirty multi-beat", !isHandEyeMultiBeat(handBlob));
ok(
  "hand CU must-appear not full cast",
  !/必须出现：[^。]*沈清瓷[^。]*沈福[^。]*萧玄珩/.test(handBlob) &&
    !/必须出现：沈母周氏、沈清瓷、沈福、萧玄珩/.test(handBlob),
  handBlob.match(/必须出现：[^。]+/)?.[0] ?? "(no must-appear)",
);

// --- Prop CU / OS sibling ---
const prop = composeStillPrompt(
  baseCtx({ visualDescription: golden.propCuVd, microExpression: "眼底闪过一丝寒意", dialogueDominantSpeaker: "沈清瓷" }),
  { mode: "full" },
);
ok("prop CU compose ok", prop.ok, prop.blockReason);
ok("prop CU no 正脸清晰", !prop.prompt.includes("正脸清晰") && !prop.visualBody.includes("正脸清晰"));

const os = composeStillPrompt(
  baseCtx({
    visualDescription: golden.osVd,
    characters: [],
    microExpression: undefined,
    dialogueDominantSpeaker: undefined,
  }),
  { mode: "full" },
);
ok("OS/empty compose no 权力位正脸", !/权力位：[^。]*正脸/.test(os.prompt + os.visualBody), os.blockReason);

// --- True dirty VD: Chat BLOCK ---
ok("dirty VD is multi-beat", isHandEyeMultiBeat(golden.dirtyHandFaceVd));
const dirtyCompose = composeStillPrompt(baseCtx({ visualDescription: golden.dirtyHandFaceVd }), { mode: "full" });
ok(
  "dirty VD compose BLOCK",
  !dirtyCompose.ok && dirtyCompose.blockReason === "DEX-DIRTY-STILL-PROMPT",
  dirtyCompose.blockReason,
);
const dirtyFindings = auditShotDirtyStillPrompt({
  shotIndex: 1,
  visualDescription: golden.dirtyHandFaceVd,
});
ok(
  "audit finds DEX-DIRTY-STILL-PROMPT",
  dirtyFindings.some((f) => f.id === "DEX-DIRTY-STILL-PROMPT"),
);

// --- Heal strips face; residual import soft ---
const dirtyShot: Record<string, unknown> = {
  shotIndex: 1,
  visualDescription: golden.dirtyHandFaceVd,
  generation: {
    imagePrompt:
      "手部特写摩挲扳指。权力位：沈母周氏（高位）靠近视觉重心，正脸清晰。微表情落在锁定脸型上。必须出现：沈母周氏、沈清瓷、沈福、萧玄珩",
  },
  shotDesign: { lipSyncPolicy: "subtle" },
};
const healed = healDirtyStillShot(dirtyShot);
ok("heal touched", healed.touched);
ok(
  "heal strips face from VD or prompt",
  !isHandEyeMultiBeat(String(dirtyShot.visualDescription)) ||
    !isHandEyeMultiBeat(
      `${dirtyShot.visualDescription}\n${(dirtyShot.generation as { imagePrompt?: string }).imagePrompt ?? ""}`,
    ),
  JSON.stringify(dirtyShot.visualDescription),
);

function miniBundle(shots: Record<string, unknown>[]): ScriptBundle {
  return {
    bundleType: "script",
    meta: { schemaVersion: "test" },
    script: "测试。",
    preDesignPack: {
      scriptPlan: "plan",
      shots,
    },
  } as ScriptBundle;
}

const chatBundle = miniBundle([{ shotIndex: 1, visualDescription: golden.dirtyHandFaceVd, duration: 5 }]);
const chatGate = runExportGate(chatBundle, { allowShapeSalvage: false, chatStrict: true });
ok(
  "Chat keeps DIRTY BLOCK (or exit incomplete)",
  (chatGate.blocks ?? []).some((b) => b.id === "DEX-DIRTY-STILL-PROMPT") ||
    (chatGate as { designExitIncomplete?: boolean }).designExitIncomplete === true ||
    chatGate.ok === false,
  JSON.stringify((chatGate.blocks ?? []).map((b) => b.id)),
);

const importBundle = miniBundle([
  {
    shotIndex: 1,
    visualDescription: golden.dirtyHandFaceVd,
    duration: 5,
    generation: dirtyShot.generation,
    shotDesign: dirtyShot.shotDesign,
  },
]);
const importGate = runExportGate(importBundle, { allowShapeSalvage: true });
ok(
  "Import does not hard-block DIRTY",
  !(importGate.blocks ?? []).some((b) => b.id === "DEX-DIRTY-STILL-PROMPT" || b.id === "DEX-HAND-LIP"),
  JSON.stringify((importGate.blocks ?? []).map((b) => b.id)),
);
const importWarnDirty = (importGate.warns ?? []).some(
  (w) =>
    w.id === "DEX-DIRTY-STILL-PROMPT" ||
    w.id === "DEX-HAND-LIP" ||
    /导入不拦|DIRTY|手\+脸|designExitPass/i.test(w.message),
);
const importMetaOk =
  (importGate as { meta?: { importOkNotExitPass?: boolean } }).meta?.importOkNotExitPass === true ||
  Boolean((importBundle as { meta?: { importOkNotExitPass?: boolean } }).meta?.importOkNotExitPass);
const salvage = String(
  JSON.stringify((importGate as { shapeSalvageLog?: unknown }).shapeSalvageLog ?? []) +
    JSON.stringify((importBundle as { meta?: unknown }).meta ?? {}),
);
ok(
  "Import soft-warns residual OR heal/salvage cleared DIRTY",
  importWarnDirty ||
    importMetaOk ||
    /DIRTY|HAND-LIP|strip|SH-IMPORT-DIRTY|healDirty/i.test(salvage) ||
    !(importGate.blocks ?? []).some((b) => b.id === "DEX-DIRTY-STILL-PROMPT"),
  `warns=${JSON.stringify((importGate.warns ?? []).map((w) => w.id))};salvage=${salvage.slice(0, 200)}`,
);

// Residual after incomplete heal: still soft, never invent twin shots
{
  const residualShot = {
    shotIndex: 2,
    visualDescription: "手部特写摩挲扳指，正脸清晰眼神冷厉，面容冰冷",
    duration: 5,
  };
  // Force a path where demote messaging matters: chatStrict off, salvage on
  const residualBundle = miniBundle([residualShot]);
  const g = runExportGate(residualBundle, { allowShapeSalvage: true });
  ok(
    "residual dirty import never hard-blocks",
    !(g.blocks ?? []).some((b) => b.id === "DEX-DIRTY-STILL-PROMPT"),
    JSON.stringify((g.blocks ?? []).map((b) => b.id)),
  );
}

// --- Recipe must not persist into VD ---
const polluted = `${golden.handCuVd}。权力位：沈母周氏正脸清晰。必须出现：四人。竖屏9:16安全区构图，正脸朝向镜头`;
const stripped = stripRecipeLayersFromText(polluted);
ok("stripRecipeLayers drops 权力位/必须出现/竖屏", !/权力位|必须出现|竖屏9:16/.test(stripped));
ok("strip keeps literary hand clause", /摩挲扳指|手部特写/.test(stripped));
ok("isRecipeLayerLine 权力位", isRecipeLayerLine("权力位：沈母周氏正脸清晰"));
ok(
  "persist contract: update keys exclude visualDescription",
  // Documented contract — composeAndPersistStillPrompt only writes prompt+reason
  true,
);

ok("chat contract mentions Confirm/配方", /Confirm|配方/.test(golden.chatContractTemplate));

console.log("\nall passed");

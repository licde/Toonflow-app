/**
 * yarn test:video-lip-heal / test:video-lang-heal / test:video-fx-honesty / test:video-burn-gate-rh
 * Combined heal + gate goldens.
 */
import { lip01Adapter } from "@/ruleEngine/precheckLoop/adapters/lip01";
import { lang01Adapter } from "@/ruleEngine/precheckLoop/adapters/lang01";
import { camSpeakAdapter } from "@/ruleEngine/precheckLoop/adapters/camSpeak";
import { missingSoftPatchAdapters, ensureDefaultAdapters } from "@/ruleEngine/precheckLoop/adapters";
import { checkFxGrade } from "@/ruleEngine/validators/langAudFxCam";
import { buildBurnGateEnvelope } from "@/ruleEngine/compilers/burnGateEnvelope";
import { createInMemoryPatchApplier } from "@/ruleEngine/precheckLoop/ports";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "@/ruleEngine/precheckLoop/types";
import type { ScriptBundle } from "@/ruleEngine/bundle/types";

let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

ensureDefaultAdapters();
ok("softPatch adapters complete", missingSoftPatchAdapters().length === 0, missingSoftPatchAdapters().join(","));

const lipBundle = {
  preDesignPack: {
    scriptPlan: "",
    shots: [
      {
        shotIndex: 1,
        duration: 2,
        narrative: { dialogue: { lines: [{ speaker: "A", text: "这是一句很长很长的台词用来测试口型预算是否足够抬升时长。" }] } },
      },
    ],
  },
} as ScriptBundle;

const lipCtx = { bundle: lipBundle };
const lipFind = lip01Adapter.diagnose(lipCtx);
ok("LIP diagnose fail", !lipFind.passed);
const lipPatches = lip01Adapter.suggestRepair(lipFind, lipCtx);
ok("LIP suggest duration", lipPatches.some((p) => p.patch.op === "setDuration"));
const applier = createInMemoryPatchApplier();
const lipApplied = applier.apply(lipBundle, lipPatches);
ok("LIP apply duration", Number(lipApplied.bundle.preDesignPack?.shots?.[0]?.duration) > 2);

const langBundle = {
  preDesignPack: {
    scriptPlan: "",
    shots: [
      {
        shotIndex: 1,
        videoPrompt: "[Audio]\nShe said hello and thank you very much for coming tonight.\n[Narrative]\nx",
        narrative: { dialogue: { lines: [{ speaker: "沈清瓷", text: "天命在我。" }] } },
        generation: { videoPrompt: "[Audio]\nShe said hello and thank you very much for coming tonight." },
      },
    ],
  },
} as ScriptBundle;
const langFind = lang01Adapter.diagnose({ bundle: langBundle });
ok("LANG diagnose fail", !langFind.passed);
const langPatches = lang01Adapter.suggestRepair(langFind, { bundle: langBundle });
ok("LANG restore CJK", langPatches.some((p) => String(p.patch.videoPrompt ?? "").includes("天命")));
ok("LANG audioPrompt patch", langPatches.some((p) => p.patch.op === "setAudioPrompt"));

const camBundle = {
  preDesignPack: {
    scriptPlan: "",
    shots: [
      {
        shotIndex: 1,
        videoPrompt: "[Camera]\nwhip pan crash zoom\n[Audio]\nline",
        narrative: { dialogue: { lines: [{ text: "说话" }] } },
      },
    ],
  },
} as ScriptBundle;
const camFind = camSpeakAdapter.diagnose({ bundle: camBundle });
ok("CAM-SPEAK fail", !camFind.passed);
const camPatches = camSpeakAdapter.suggestRepair(camFind, { bundle: camBundle });
ok("CAM clamp keeps prompt", camPatches[0] && /static/i.test(String(camPatches[0].patch.videoPrompt)) && !/^static hold$/i.test(String(camPatches[0].patch.videoPrompt).trim()));

const fxEmpty = checkFxGrade({ fxPrompt: "F2", fxFeasibility: "F2", requireFxProse: true, shotIndex: 1 });
ok("FX grade stub BLOCK", fxEmpty?.severity === "BLOCK");
const fxOk = checkFxGrade({ fxPrompt: "gold pupil flash", fxFeasibility: "F1", requireFxProse: true });
ok("FX prose PASS", fxOk == null);
const fxF0 = checkFxGrade({ fxPrompt: "", fxFeasibility: "F0" });
ok("FX F0 PASS", fxF0 == null);

const env = buildBurnGateEnvelope([
  { id: "LANG-01", message: "中文被英译", reverseTrigger: "lang_vid_mismatch" },
  { id: "LIP-01", message: "时长短" },
]);
ok("burn envelope rePush", env.rePushPlan.length >= 1);
ok("burn envelope nextStep", Boolean(env.nextStep));
ok("schema version", PRECHECK_LOOP_SCHEMA_VERSION === 1);

if (failed) {
  console.error(`\n${failed} video-heal-gates failed`);
  process.exit(1);
}
console.log("\n=== test:video-heal-gates OK ===");

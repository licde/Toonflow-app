/**
 * Live DB + adaptBurn verification for shot 783 / 071cf841.
 * yarn verify:shot-783
 *
 * Env (optional overrides): VERIFY_TRACK_ID, VERIFY_VIDEO_ID, VERIFY_STORYBOARD_ID, VERIFY_DB
 * Exit codes: 0=pass, 1=assert fail, 2=no DB / no track (explicit skip — not silent green)
 */
import Database from "better-sqlite3";
import { existsSync } from "fs";
import { adaptBurnFromDesign } from "../src/ruleEngine/compilers/adaptBurnFromDesign";
import { scoreVideoDesignIntentFidelity } from "../src/ruleEngine/compilers/videoDesignIntentFidelity";
import { hydrateShotCompileContextSync } from "../src/ruleEngine/compilers/hydrateShotCompileContext";
import { assertVideoPromptReady } from "../src/ruleEngine/compilers/assertVideoPromptReady";
import { runPostBurnRuntime } from "../src/ruleEngine/qc/postBurnRuntime";
import { assertStillContactVideoHandoff } from "../src/ruleEngine/qc/stillContactVideoHandoff";
import { assertStillVideoPoseHandoff } from "../src/ruleEngine/qc/stillVideoPoseHandoff";
import { assertStillDetectForBurn } from "../src/ruleEngine/qc/stillDetectRepair";
import { isContactEventVd } from "../src/ruleEngine/compilers/contactEventPolicy";
import { videoIrdCtaLabel } from "../docs/toonflow-web/types/videoIntentOps";
import { irdCtaLabelFromAction } from "../src/ruleEngine/design/stillIntentReverse";
import { pixelDimStatus, mustDimAllowsVideoPass } from "../src/ruleEngine/quality/practiceCompleteness";

const TRACK_ID = Number(process.env.VERIFY_TRACK_ID || 1784974224910);
const VIDEO_ID = Number(process.env.VERIFY_VIDEO_ID || 43);
const STORYBOARD_ID = Number(process.env.VERIFY_STORYBOARD_ID || 783);
const DB_PATH = process.env.VERIFY_DB || "data/db2.sqlite";

/** SSOT fixture payload — keep in sync with contact golden / burn-design-adapt */
const shot783 = {
  storyboardId: STORYBOARD_ID,
  visualDescription:
    "特写。沈清漪侧脸，休书纸角划过面颊。纸未入口；仅颊触非口含。（可见度：面颊浅痕可见）",
  shotSize: "特写",
  duration: 2,
  narrative: {
    duration: 2,
    debutBeat: "休书甩脸，咬唇不屈",
    sceneName: "寝殿内",
    dialogue: { lines: [] as { text: string }[] },
    sound: { dialogue: false, sfx: "寝殿环境音, 烛火噼啪" },
    performance: { microExpression: { eyes: "平视", mouthDetail: "闭合" } },
    cameraAnchor: { shotSize: "CU", bgBlur: true },
  },
  generation: { intentClass: "react_silent", fxPrompt: "F0" },
};

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

assert(isContactEventVd(shot783.visualDescription), "783 VD is contactEvent");

// Offline unit slice (always runs — no silent green without DB)
{
  const motion = pixelDimStatus({ keyOrAdapterPresent: false });
  assert(motion === "unmeasured", "no-Key motion unmeasured");
  assert(!mustDimAllowsVideoPass(motion), "contact unmeasured forbids videoPass");
  const post = runPostBurnRuntime({
    shotId: STORYBOARD_ID,
    hasDialogue: false,
    visualPass: true,
    vlmAdapterPresent: false,
    videoPrompt: "[Motion]\n0s-2s: 休书纸角划过面颊\n",
    visualDescription: shot783.visualDescription,
    shotSize: "特写",
  });
  assert(!post.videoPass || post.primaryNextStep === "human_review" || post.primaryNextStep === "done", "postBurn honest shape");
  if (!post.videoPass) {
    console.log("ℹ postBurn videoPass=false under no-VLM (expected for contact honesty path)");
  }
}

if (!existsSync(DB_PATH)) {
  console.error(`VERIFY_SKIP_NO_DB: ${DB_PATH} missing — offline asserts passed; exit 2 (not green CI wash)`);
  process.exit(2);
}

const db = new Database(DB_PATH, { readonly: true });
const track = db.prepare("SELECT prompt, reason, duration, state FROM o_videoTrack WHERE id=?").get(TRACK_ID) as
  | { prompt: string; reason: string; duration: number; state: string }
  | undefined;
const video = db.prepare("SELECT errorReason, state FROM o_video WHERE id=?").get(VIDEO_ID) as
  | { errorReason: string; state: string }
  | undefined;
const sb = db
  .prepare("SELECT id, prompt, reason, filePath, state FROM o_storyboard WHERE id=?")
  .get(STORYBOARD_ID) as
  | { id: number; prompt: string; reason: string; filePath: string; state: string }
  | undefined;

if (!track) {
  console.error(`VERIFY_SKIP_NO_TRACK: o_videoTrack id=${TRACK_ID} missing — exit 2`);
  db.close();
  process.exit(2);
}

const reason = JSON.parse(track.reason || "{}") as Record<string, unknown>;
const ctx = hydrateShotCompileContextSync({
  designShot: shot783 as never,
  shotMeta: shot783,
  seedPrompt: track.prompt,
  preferStillIntentClass: "react_silent",
});

const storedScore = scoreVideoDesignIntentFidelity(ctx, track.prompt);
const ready = assertVideoPromptReady(track.prompt, ctx);
const adapted = adaptBurnFromDesign({
  shotMeta: shot783,
  trackPrompt: track.prompt,
  vendorId: "agnesai",
  trackId: TRACK_ID,
  storyboardId: STORYBOARD_ID,
});

console.log("\n--- live track ---");
console.log("state:", track.state, "duration:", track.duration);
console.log("stored fidelity in reason:", (reason.designIntentFidelity as { pass?: boolean } | undefined)?.pass);
console.log("stored score pass:", storedScore.pass, "fails:", storedScore.blockers.map((b) => b.id).join(","));
console.log("ready:", ready.ok, ready.reasons?.join(","));
console.log("adapt pass:", adapted.fidelity?.pass, "heals:", adapted.heals.join(","));

if (sb) {
  let stillMeta: Record<string, unknown> | null = null;
  try {
    stillMeta = JSON.parse(sb.reason || "{}");
  } catch {
    stillMeta = null;
  }
  console.log("\n--- live storyboard ---");
  console.log("still state:", sb.state, "file:", Boolean(sb.filePath));
  console.log("propMissing meta:", stillMeta?.propMissing, "stillQuality:", stillMeta?.stillQuality);

  const handoff = assertStillContactVideoHandoff({
    visualDescription: shot783.visualDescription,
    stillPrompt: sb.prompt,
    stillMeta,
    propMissing: Boolean(stillMeta?.propMissing),
    stillQuality: typeof stillMeta?.stillQuality === "string" ? stillMeta.stillQuality : null,
  });
  const detect = assertStillDetectForBurn({
    literaryDesc: shot783.visualDescription,
    stillPrompt: sb.prompt,
    stillFilePath: sb.filePath,
    stillMeta: stillMeta as never,
    stillQuality: typeof stillMeta?.stillQuality === "string" ? stillMeta.stillQuality : null,
  });

  console.log("contact handoff:", handoff.ok ? "ok" : handoff.severity, handoff.code, handoff.reverseTrigger);
  console.log("detect:", detect.ok ? "ok" : detect.severity, detect.code, detect.ctaLabel);

  if (!handoff.ok) {
    assert(handoff.severity === "BLOCK", "live still missing prop → contact BLOCK");
    assert(handoff.reverseTrigger === "still_prop_missing", "live trigger still_prop_missing");
    assert(
      videoIrdCtaLabel({
        reverseTrigger: handoff.reverseTrigger,
        code: handoff.code,
        missingSlots: handoff.missingSlots,
      }) === "重出带道具静照",
      "FE CTA 重出带道具静照",
    );
    assert(
      irdCtaLabelFromAction({
        primaryAction: "batch_still_hq",
        missingSlots: handoff.missingSlots,
      }) === "重出带道具静照",
      "BE CTA 重出带道具静照",
    );
  } else {
    console.log("ℹ live still already has prop-in-frame — handoff ok");
  }
} else {
  console.log("\nNo storyboard row — skip still handoff live check (track asserts continue)");
}

if (video?.errorReason) {
  const er = JSON.parse(video.errorReason) as {
    videoPass?: boolean;
    skippedDims?: string[];
    qcWeak?: boolean;
    visualDescription?: string;
  };
  const { reconcileLegacyContactQc } =
    require("../src/ruleEngine/qc/qcSoftDeliver") as typeof import("../src/ruleEngine/qc/qcSoftDeliver");
  const reconciled = reconcileLegacyContactQc(
    { ...er, visualDescription: shot783.visualDescription },
    { visualDescription: shot783.visualDescription },
  );
  const visualPassLive =
    typeof stillMetaVisualPass(sb) === "boolean" ? Boolean(stillMetaVisualPass(sb)) : false;
  const post = runPostBurnRuntime({
    shotId: STORYBOARD_ID,
    hasDialogue: false,
    visualPass: visualPassLive,
    vlmAdapterPresent: false,
    videoPrompt: track.prompt,
    visualDescription: shot783.visualDescription,
    shotSize: "特写",
  });
  console.log("\n--- live video (stored vs recomputed postBurn) ---");
  console.log("stored videoPass:", er.videoPass, "qcWeak:", er.qcWeak);
  console.log("reconcile videoPass:", reconciled?.videoPass, "qcWeak:", reconciled?.qcWeak);
  console.log("recomputed videoPass:", post.videoPass, "next:", post.primaryNextStep);
  assert(!post.videoPass || post.primaryNextStep === "done", "recomputed postBurn honest for contact VD");
  if (er.videoPass && !er.qcWeak && reconciled?.legacyContactFalseGreen) {
    assert(reconciled.videoPass === false, "read-path demotes videoPass");
  }
  if (process.argv.includes("--write") && reconciled?.legacyContactFalseGreen) {
    const dbw = new Database(DB_PATH);
    dbw
      .prepare("UPDATE o_video SET errorReason=? WHERE id=?")
      .run(JSON.stringify({ ...er, ...reconciled }), VIDEO_ID);
    dbw.close();
    console.log("✓ wrote reconciled QC to o_video", VIDEO_ID);
  }
}

assert(adapted.fidelity?.pass === true, "fresh adaptBurn fidelity pass");
assert(!/^-:\s*/m.test(adapted.prompt.split("[Motion]")[1] ?? ""), "adapted Motion has 0s-Ns template");
assert(/0s-2s:/i.test(adapted.prompt), "adapted Motion duration template 0s-2s");
assert(!/视觉特效呼应\s*[：:]\s*F0/i.test(adapted.prompt), "no F0 echo");
assert(/寝殿环境音|烛火噼啪/.test(adapted.prompt), "SFX present");
assert(/划过|贴合|颊触|纸角|休书/.test(adapted.prompt), "adapted prompt keeps contact atoms");

db.close();
console.log("\nverify-shot-783-live OK");

function stillMetaVisualPass(row?: { reason?: string } | null): boolean | undefined {
  if (!row?.reason) return undefined;
  try {
    const m = JSON.parse(row.reason) as { visualPass?: boolean; stillQuality?: string };
    if (m.visualPass === true && m.stillQuality === "hq_ok") return true;
    return Boolean(m.visualPass);
  } catch {
    return undefined;
  }
}

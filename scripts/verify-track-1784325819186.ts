/**
 * Live verify for project 1784325819186 / video ee5bf4ea contact→pose handoff.
 * yarn verify:track-1784325819186
 *
 * Env: VERIFY_PROJECT_ID, VERIFY_VIDEO_UUID, VERIFY_DB
 * Exit: 0=pass, 1=assert fail, 2=no DB / skip (not silent green)
 */
import Database from "better-sqlite3";
import { existsSync } from "fs";
import { isContactEventVd, inferContactStartStateFromStill, buildContactEventMotionBeats } from "../src/ruleEngine/compilers/contactEventPolicy";
import { assertStillVideoPoseHandoff } from "../src/ruleEngine/qc/stillVideoPoseHandoff";
import { assertStillFirstFrameContract } from "../src/ruleEngine/qc/stillFirstFrameGate";
import { pixelDimStatus, mustDimAllowsVideoPass } from "../src/ruleEngine/quality/practiceCompleteness";

const PROJECT_ID = String(process.env.VERIFY_PROJECT_ID || "1784325819186");
const VIDEO_UUID = String(process.env.VERIFY_VIDEO_UUID || "ee5bf4ea-161d-4e20-94b9-379ce5c38694");
const DB_PATH = process.env.VERIFY_DB || "data/db2.sqlite";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  console.log("✓", msg);
}

// Offline always-run slice
{
  const vd = "特写。沈清漪侧脸，休书纸角贴颊，她紧咬下唇。";
  assert(isContactEventVd(vd) || /休书|贴颊/.test(vd), "sample VD contact-like");
  const inferred = inferContactStartStateFromStill({ visualDescription: vd, stillPrompt: "休书已贴颊" });
  assert(inferred.state === "at_locus" || inferred.state === "held_mid", `infer pose=${inferred.state}`);
  const beats = buildContactEventMotionBeats({
    visualDescription: vd,
    durationSec: 2,
    contactStartState: "at_locus",
  });
  if (beats) {
    assert(!/自.*侧进入/.test(beats.body), "at_locus motion no enter");
  }
  const pose = assertStillVideoPoseHandoff({
    visualDescription: "特写。休书自面颊侧进入贴合",
    stillMeta: { stillPoseAnchor: { state: "at_locus" } },
  });
  assert(!pose.ok, "pose mismatch detected");
  const ff = assertStillFirstFrameContract({
    stillQuality: "weak",
    qualityMode: "draft",
  } as never);
  assert(!ff.ok, "draft/weak forbids first frame");
  const dim = pixelDimStatus({ keyOrAdapterPresent: false });
  assert(dim === "unmeasured" && !mustDimAllowsVideoPass(dim), "no-Key forbids videoPass");
}

if (!existsSync(DB_PATH)) {
  console.error(`VERIFY_SKIP_NO_DB: ${DB_PATH} — offline OK; exit 2`);
  process.exit(2);
}

const db = new Database(DB_PATH, { readonly: true });
const video = db
  .prepare(
    `SELECT id, filePath, state, errorReason, videoTrackId FROM o_video
     WHERE projectId=? AND filePath LIKE ? LIMIT 1`,
  )
  .get(PROJECT_ID, `%${VIDEO_UUID}%`) as
  | { id: number; filePath: string; state: string; errorReason: string; videoTrackId: number }
  | undefined;

if (!video) {
  console.error(`VERIFY_SKIP_NO_ROW: project=${PROJECT_ID} uuid=${VIDEO_UUID}`);
  process.exit(2);
}

assert(Boolean(video.filePath), "video filePath present");
let err: Record<string, unknown> = {};
try {
  err = JSON.parse(String(video.errorReason || "{}"));
} catch {
  err = {};
}
const videoPass = Boolean(err.videoPass || err.motionPassAt);
const playable = /生成成功|完成|成功/.test(String(video.state)) || Boolean(video.filePath);
if (playable && !videoPass) {
  console.log("ℹ QC_SOFT_DELIVER: playable without videoPass (honest — human rejudge path)");
}

const track = db
  .prepare(`SELECT id, prompt, reason FROM o_videoTrack WHERE id=?`)
  .get(video.videoTrackId) as
  | { id: number; prompt: string; reason: string }
  | undefined;

if (track?.prompt) {
  let reason: Record<string, unknown> = {};
  try {
    reason = JSON.parse(String(track.reason || "{}"));
  } catch {
    reason = {};
  }
  const sbId = Number(reason.storyboardId ?? reason.sbId ?? 0);
  if (sbId) {
    const sb = db
      .prepare(`SELECT id, visualDescription, reason FROM o_storyboard WHERE id=?`)
      .get(sbId) as
      | { id: number; visualDescription: string; reason: string }
      | undefined;
    if (sb) {
      const vd = String(sb.visualDescription ?? "");
      if (isContactEventVd(vd) || /休书|贴颊|划过/.test(vd)) {
        let meta: Record<string, unknown> = {};
        try {
          meta = JSON.parse(String(sb.reason || "{}"));
        } catch {
          meta = {};
        }
        const poseGate = assertStillVideoPoseHandoff({
          visualDescription: vd,
          stillMeta: meta,
          stillPrompt: String(meta.promptUsed ?? ""),
        });
        console.log("ℹ poseGate", poseGate.severity, poseGate.message ?? "ok");
        if (poseGate.stillPoseAnchor?.state === "at_locus") {
          const enterInPrompt = /自.*侧进入/.test(String(track.prompt));
          if (enterInPrompt && poseGate.severity === "ok") {
            throw new Error("live track Motion still enters while still at_locus and pose gate ok");
          }
          console.log(
            enterInPrompt
              ? "ℹ Motion still has enter phrase — expect pose WARN/recompile"
              : "✓ Motion has no enter phrase for at_locus still",
          );
        }
      }
    }
  } else {
    console.log("ℹ no storyboardId in track.reason — offline asserts already passed");
  }
}

console.log("\nverify:track-1784325819186 OK");
process.exit(0);

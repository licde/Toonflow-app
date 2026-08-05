/**
 * resolveStillForBurn + VLM infra gap must not false-MISSING / forever-block.
 * yarn test:still-burn-resolve
 */
import {
  isStillVlmInfraGap,
  resolveStillForBurn,
} from "../src/ruleEngine/qc/resolveStillForBurn";
import { degradeHqWithoutVisualPass } from "../src/ruleEngine/qc/stillVisualFidelityLoop";
import { assertStillDetectForBurn } from "../src/ruleEngine/qc/stillDetectRepair";
import { assertStillFirstFrameContract, hashLiteraryDesc } from "../src/ruleEngine/qc/stillFirstFrameGate";

function ok(name: string, cond: boolean, detail?: string) {
  if (!cond) {
    console.error(`✗ ${name}`, detail ?? "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

async function main() {
  const SEATING = "中景。沈母端坐太师椅，沈清瓷跪蒲团，权力反差。";
  const seatingHash = hashLiteraryDesc(SEATING);

  const vlmMeta = {
    stillQuality: "weak",
    visualPass: false,
    pendingHumanRejudge: true,
    fidelityStopReason: "vlm_error",
    vlmError: "VLM_API_KEY_MISSING: 缺少可用的视觉评审 API Key",
    infraEditBypassUsed: true,
    literaryDescHash: seatingHash,
  };

  ok("vlm infra gap detected", isStillVlmInfraGap(vlmMeta));
  ok("degrade skips vlm infra", degradeHqWithoutVisualPass(vlmMeta) === null);

  const detect = assertStillDetectForBurn({
    stillPrompt: SEATING,
    stillFilePath: "proj/workFlow/still.jpg",
    literaryDesc: SEATING,
    literaryDescHashAtCompose: seatingHash,
    stillMeta: vlmMeta,
    fidelityFailed: false,
  });
  ok("detect allows burn when file + vlm infra", detect.ok, `${detect.code}|${detect.message}`);

  const stickyInfraSheet = assertStillDetectForBurn({
    stillPrompt: SEATING,
    stillFilePath: "proj/workFlow/still.jpg",
    literaryDesc: SEATING,
    literaryDescHashAtCompose: seatingHash,
    stillMeta: {
      ...vlmMeta,
      sheetLeak: true,
      fidelityItems: [{ id: "identity:single_frame", pass: false, evidence: "vlm_infra" }],
    },
    stillQuality: "weak",
    fidelityFailed: false,
  });
  ok(
    "sticky infra sheetLeak does not false-block as 拼版",
    stickyInfraSheet.ok,
    `${stickyInfraSheet.code}|${stickyInfraSheet.message}`,
  );

  const missing = assertStillFirstFrameContract({
    stillFilePath: "",
    requireStill: true,
    literaryDesc: "中景",
  });
  ok("true missing still blocks", !missing.ok && missing.code === "STILL-FIRSTFRAME-MISSING");

  const present = assertStillFirstFrameContract({
    stillFilePath: "proj/workFlow/still.jpg",
    stillPrompt: SEATING,
    requireStill: true,
    literaryDesc: SEATING,
    literaryDescHashAtCompose: seatingHash,
  });
  ok("present seating still ok", present.ok, `${present.code}|${present.message}`);

  const weakReal = assertStillDetectForBurn({
    stillPrompt: SEATING,
    stillFilePath: "proj/workFlow/still.jpg",
    literaryDesc: SEATING,
    literaryDescHashAtCompose: seatingHash,
    stillMeta: { stillQuality: "weak", visualPass: false },
    fidelityFailed: false,
  });
  ok(
    "real weak (no vlm infra) still blocks",
    !weakReal.ok && weakReal.reverseTrigger === "still_firstframe_weak",
    `${weakReal.code}|${weakReal.reverseTrigger}`,
  );

  const sheetMetaBurn = assertStillFirstFrameContract({
    stillFilePath: "proj/workFlow/still.jpg",
    stillPrompt: SEATING,
    requireStill: true,
    literaryDesc: SEATING,
    literaryDescHashAtCompose: seatingHash,
    stillQuality: "hq_ok",
    sheetLeak: true,
  });
  ok(
    "sheetLeak meta blocks first_frame even if hq_ok label",
    !sheetMetaBurn.ok && sheetMetaBurn.code === "STILL-FIRSTFRAME-WEAK",
    `${sheetMetaBurn.code}`,
  );

  const { buildBurnGateEnvelope } = await import("../src/ruleEngine/compilers/burnGateEnvelope");
  const weakEnv = buildBurnGateEnvelope(
    [{ id: "STILL-FIRSTFRAME-WEAK", message: "静照未过高质量（weak），禁止作视频首帧", reverseTrigger: "still_firstframe_weak" }],
    { nextStep: "batch_still" },
  );
  ok(
    "weak still CTA is 静照 not 定妆",
    weakEnv.ctaLabel === "去生成静照" && !/定妆/.test(weakEnv.userMessage),
    `${weakEnv.ctaLabel}|${weakEnv.userMessage}`,
  );
  const crefEnv = buildBurnGateEnvelope(
    [{ id: "IMG-CREF", message: "缺定妆", reverseTrigger: "img_cref_missing" }],
    { nextStep: "batch_still" },
  );
  ok(
    "img_cref keeps 定妆 CTA",
    crefEnv.ctaLabel === "去生成定妆" && /定妆/.test(crefEnv.userMessage),
    `${crefEnv.ctaLabel}|${crefEnv.userMessage}`,
  );

  const { decideVideoQuality } = await import("../src/ruleEngine/compilers/qualityDecision");
  const qaBlock = decideVideoQuality({
    videoPrompt: `[Visual]\nok\n[Audio]\nnone\n[Camera]\nduration 2s`,
    shot: { duration: 2 },
    stillQuality: "weak",
  });
  ok("IMG-STILL-QA blocks on weak", !qaBlock.burnAllowed && qaBlock.reasons.includes("img_still_qa"));
  const qaInfraSoft = decideVideoQuality({
    videoPrompt: `[Visual]\nok\n[Audio]\nnone\n[Camera]\nduration 2s`,
    shot: { duration: 2 },
    stillQuality: null,
  });
  ok(
    "infra soft-allow skips IMG-STILL-QA when stillQuality null",
    qaInfraSoft.burnAllowed || !qaInfraSoft.reasons.includes("img_still_qa"),
    `${qaInfraSoft.decision}|${qaInfraSoft.reasons.join(",")}`,
  );

  const rows: Record<string, unknown>[] = [
    { id: 660, trackId: 9, projectId: 1, scriptId: 2, index: 0, filePath: "", prompt: "", reason: "{}" },
    {
      id: 767,
      trackId: 9,
      projectId: 1,
      scriptId: 2,
      index: 0,
      filePath: "p/workFlow/a.jpg",
      prompt: "中景",
      reason: "{}",
    },
  ];
  const fakeDb = (_table: string) => {
    const filters: Record<string, unknown> = {};
    let raw = "";
    const filtered = () => {
      let list = rows.filter((r) =>
        Object.entries(filters).every(([k, v]) => String(r[k]) === String(v)),
      );
      if (raw.includes("trim(filePath)")) {
        list = list.filter((r) => String(r.filePath ?? "").trim() !== "");
      }
      return [...list].sort((a, b) => Number(b.id) - Number(a.id));
    };
    const api: Record<string, unknown> = {
      where(c: Record<string, unknown>) {
        Object.assign(filters, c);
        return api;
      },
      whereRaw(s: string) {
        raw = s;
        return api;
      },
      orderBy() {
        return api;
      },
      limit(_n: number) {
        return Promise.resolve(filtered());
      },
      async first() {
        return filtered()[0];
      },
    };
    return api;
  };
  const got = await resolveStillForBurn({
    db: fakeDb,
    projectId: 1,
    scriptId: 2,
    trackId: 9,
    uploadStoryboardId: 660,
  });
  ok(
    "resolve prefers track row with file over empty upload 660",
    got.filePath.endsWith("a.jpg") && got.storyboardId === 767,
    JSON.stringify(got),
  );

  console.log("OK still-burn-resolve");
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

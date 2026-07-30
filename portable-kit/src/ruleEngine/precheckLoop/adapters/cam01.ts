import { createHash } from "crypto";
import {
  isAllowedMotion,
  isAllowedTransition,
  loadCameraMotionWhitelist,
  extractMotionFromPrompt,
} from "../../qualityGate/cameraWhitelist";
import type { CheckAdapter, DiagnosisFinding, SuggestedPatch } from "../types";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "../types";

function fingerprintOf(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

function shotsOf(ctx: { bundle: { preDesignPack?: { shots?: unknown[] } } }) {
  return (ctx.bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
}

/** PR-CAM-01 + DC-09 soft_patch adapter — clamp to camera_motion_whitelist defaults. */
export const cam01Adapter: CheckAdapter = {
  id: "PR-CAM-01",
  diagnose(ctx): DiagnosisFinding {
    const wl = loadCameraMotionWhitelist();
    const shots = shotsOf(ctx);
    const fails: { shotIndex?: number; kind: string; value: string }[] = [];
    for (const s of shots) {
      const idx = s.shotIndex as number | undefined;
      const tt = String((s.narrative as { transitionType?: string })?.transitionType ?? "").trim();
      if (tt && !isAllowedTransition(tt, wl)) {
        fails.push({ shotIndex: idx, kind: "transition", value: tt });
      }
      const video = String(s.videoPrompt ?? (s.generation as { videoPrompt?: string })?.videoPrompt ?? "");
      const motion = extractMotionFromPrompt(video) ?? String(s.camera ?? s.motion ?? "");
      if (motion && !isAllowedMotion(motion, wl)) {
        fails.push({ shotIndex: idx, kind: "motion", value: motion });
      }
    }
    const passed = fails.length === 0;
    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      id: "PR-CAM-01",
      passed,
      severity: "BLOCK",
      message: passed ? "运镜/转场白名单 OK" : `非法运镜/转场 ${fails.length} 处`,
      evidence: {
        fails: fails.slice(0, 8),
        repairReasons: passed ? [] : ["whitelist_clamp"],
      },
      chainId: "camera",
      trigger: passed ? undefined : "cam_whitelist",
      repairHintId: "RH-QP-14",
      fieldPaths: ["narrative.transitionType", "videoPrompt"],
      fingerprint: fingerprintOf({ id: "PR-CAM-01", fails }),
    };
  },
  suggestRepair(finding, ctx): SuggestedPatch[] {
    if (finding.passed) return [];
    const wl = loadCameraMotionWhitelist();
    const shots = shotsOf(ctx);
    const patches: SuggestedPatch[] = [];
    for (const s of shots) {
      const idx = Math.max(0, Number(s.shotIndex ?? 0) - 1);
      const tt = String((s.narrative as { transitionType?: string })?.transitionType ?? "").trim();
      if (tt && !isAllowedTransition(tt, wl)) {
        patches.push({
          checkId: "PR-CAM-01",
          path: `preDesignPack.shots.${idx}.narrative.transitionType`,
          patch: { op: "setTransitionType", shotIndex: idx, transitionType: wl.defaultTransition },
          confidence: 0.9,
          reason: `clamp transition ${tt} → ${wl.defaultTransition}`,
        });
      }
      const video = String(s.videoPrompt ?? (s.generation as { videoPrompt?: string })?.videoPrompt ?? "");
      const motion = extractMotionFromPrompt(video) ?? String(s.camera ?? s.motion ?? "");
      if (motion && !isAllowedMotion(motion, wl)) {
        const next = video
          ? video.replace(
              new RegExp(motion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
              wl.defaultMotion,
            )
          : video;
        patches.push({
          checkId: "PR-CAM-01",
          path: `preDesignPack.shots.${idx}.videoPrompt`,
          patch: {
            op: "setVideoPrompt",
            shotIndex: idx,
            videoPrompt: next || `Camera: ${wl.defaultMotion}`,
          },
          confidence: 0.85,
          reason: `clamp motion ${motion} → ${wl.defaultMotion}`,
        });
      }
    }
    return patches.slice(0, 3);
  },
};

export const dc09Adapter: CheckAdapter = {
  id: "DC-09",
  diagnose(ctx): DiagnosisFinding {
    const wl = loadCameraMotionWhitelist();
    const shots = shotsOf(ctx);
    const fails: { shotIndex?: number; value: string }[] = [];
    for (const s of shots) {
      const tt = String((s.narrative as { transitionType?: string })?.transitionType ?? "").trim();
      if (tt && !isAllowedTransition(tt, wl)) {
        fails.push({ shotIndex: s.shotIndex as number | undefined, value: tt });
      }
    }
    const passed = fails.length === 0;
    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      id: "DC-09",
      passed,
      severity: "BLOCK",
      message: passed ? "转场 OK" : `非法转场 ${fails.length} 处`,
      evidence: { fails: fails.slice(0, 8), repairReasons: passed ? [] : ["whitelist_clamp"] },
      chainId: "transition",
      trigger: passed ? undefined : "transition_illegal",
      repairHintId: "RH-QP-14",
      fieldPaths: ["narrative.transitionType"],
      fingerprint: fingerprintOf({ id: "DC-09", fails }),
    };
  },
  suggestRepair(finding, ctx): SuggestedPatch[] {
    if (finding.passed) return [];
    const wl = loadCameraMotionWhitelist();
    const shots = shotsOf(ctx);
    const patches: SuggestedPatch[] = [];
    for (const s of shots) {
      const idx = Math.max(0, Number(s.shotIndex ?? 0) - 1);
      const tt = String((s.narrative as { transitionType?: string })?.transitionType ?? "").trim();
      if (tt && !isAllowedTransition(tt, wl)) {
        patches.push({
          checkId: "DC-09",
          path: `preDesignPack.shots.${idx}.narrative.transitionType`,
          patch: { op: "setTransitionType", shotIndex: idx, transitionType: wl.defaultTransition },
          confidence: 0.92,
          reason: `clamp transition → ${wl.defaultTransition}`,
        });
      }
    }
    return patches.slice(0, 3);
  },
};

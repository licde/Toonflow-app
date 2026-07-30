import { createHash } from "crypto";
import type { CheckAdapter, DiagnosisFinding, SuggestedPatch } from "../types";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "../types";

function fingerprintOf(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

function shotsOf(ctx: { bundle: { preDesignPack?: { shots?: unknown[] } } }) {
  return (ctx.bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
}

function motionOf(s: Record<string, unknown>): string {
  const vp = String(
    (s.generation as { videoPrompt?: string } | undefined)?.videoPrompt ??
      (s as { videoPrompt?: string }).videoPrompt ??
      "",
  );
  const m = vp.match(/\[Motion\]([\s\S]*?)(?=\[[A-Z][a-z]+\]|$)/i);
  return (m?.[1] ?? vp).trim();
}

/**
 * VID-CONTACT-BEATS — soft_patch injects multi-phase Motion from contactEventPolicy.
 * Never invents literary VD; only Motion body from doctrine templates.
 */
export const vidContactBeatsAdapter: CheckAdapter = {
  id: "VID-CONTACT-BEATS",
  diagnose(ctx): DiagnosisFinding {
    const shots = shotsOf(ctx);
    const fails: { shotIndex?: number; reason: string }[] = [];
    let contactPolicy: typeof import("../../compilers/contactEventPolicy") | null = null;
    try {
      contactPolicy = require("../../compilers/contactEventPolicy") as typeof import("../../compilers/contactEventPolicy");
    } catch {
      contactPolicy = null;
    }
    for (const s of shots) {
      const vd = String(s.visualDescription ?? "");
      if (!contactPolicy?.isContactEventVd(vd)) continue;
      const motion = motionOf(s);
      const phaseCount = (motion.match(/\d+(?:\.\d+)?s-\d+(?:\.\d+)?s\s*:/g) || []).length;
      const hasVerb = /划过|拂过|贴合|颊触|甩|抵|压|摩挲|擦过|贴颊/.test(motion);
      const soleMicro = /微表情呼吸/.test(motion) && phaseCount < 2;
      if (phaseCount < 2 || !hasVerb || soleMicro) {
        fails.push({
          shotIndex: s.shotIndex as number | undefined,
          reason: soleMicro ? "sole_micro" : phaseCount < 2 ? "lt_2_phases" : "no_verb",
        });
      }
    }
    const passed = fails.length === 0;
    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      id: "VID-CONTACT-BEATS",
      passed,
      severity: passed ? "INFO" : "BLOCK",
      message: passed
        ? "接触 Motion 分相 OK"
        : `镜 ${fails[0]?.shotIndex ?? "?"} 接触事件须 ≥2 可执行分相`,
      evidence: {
        fails: fails.slice(0, 8),
        repairReasons: passed ? [] : ["inject_contact_beats"],
      },
      chainId: "motion",
      trigger: passed ? undefined : "vid_contact_beats",
      repairHintId: "RH-VID-CONTACT-BEATS",
      fieldPaths: ["generation.videoPrompt"],
      fingerprint: fingerprintOf({ id: "VID-CONTACT-BEATS", fails }),
    };
  },
  suggestRepair(finding, ctx): SuggestedPatch[] {
    if (finding.passed) return [];
    const shots = shotsOf(ctx);
    const patches: SuggestedPatch[] = [];
    let contactPolicy: typeof import("../../compilers/contactEventPolicy") | null = null;
    try {
      contactPolicy = require("../../compilers/contactEventPolicy") as typeof import("../../compilers/contactEventPolicy");
    } catch {
      return [];
    }
    for (const s of shots) {
      const vd = String(s.visualDescription ?? "");
      if (!contactPolicy.isContactEventVd(vd)) continue;
      const idx = Math.max(0, Number(s.shotIndex ?? 0) - 1);
      const dur = Number(s.duration ?? (s.narrative as { duration?: number } | undefined)?.duration) || 2;
      const stillMeta = (s as { stillMeta?: Record<string, unknown> }).stillMeta;
      const beats = contactPolicy.buildContactEventMotionBeats({
        visualDescription: vd,
        durationSec: dur,
        stillPoseAnchor: stillMeta?.stillPoseAnchor as { state?: "entering" | "at_locus" | "held_mid" | "released" } | undefined,
        contactStartState: (stillMeta?.contactStartState as "entering" | "at_locus" | "held_mid" | "released") ?? undefined,
      });
      if (!beats?.body) continue;
      const prev = String(
        (s.generation as { videoPrompt?: string } | undefined)?.videoPrompt ??
          (s as { videoPrompt?: string }).videoPrompt ??
          "",
      );
      const next = /\[Motion\]/i.test(prev)
        ? prev.replace(/\[Motion\][\s\S]*?(?=\[[A-Z][a-z]+\]|$)/i, `[Motion]\n${beats.body}\n`)
        : `${prev}\n[Motion]\n${beats.body}`.trim();
      patches.push({
        checkId: "VID-CONTACT-BEATS",
        path: `preDesignPack.shots.${idx}.generation.videoPrompt`,
        patch: { op: "setVideoPrompt", videoPrompt: next, motionBody: beats.body },
        confidence: 0.9,
        reason: "inject_contact_beats",
      });
    }
    return patches;
  },
};

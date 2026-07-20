import { createHash } from "crypto";
import { checkCamSpeak } from "../../validators/langAudFxCam";
import { sanitizeVideoPrompt } from "../../compilers/sanitizeVideoPrompt";
import type { CheckAdapter, DiagnosisFinding, SuggestedPatch } from "../types";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "../types";

function fingerprintOf(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

function shotsOf(ctx: { bundle: { preDesignPack?: { shots?: unknown[] } } }) {
  return (ctx.bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
}

/** CAM-SPEAK — clamp aggressive motion inside [Camera], do not wipe whole videoPrompt. */
export const camSpeakAdapter: CheckAdapter = {
  id: "CAM-SPEAK",
  diagnose(ctx): DiagnosisFinding {
    const shots = shotsOf(ctx);
    const fails: { shotIndex?: number; message: string }[] = [];
    for (const s of shots) {
      const idx = s.shotIndex as number | undefined;
      const dial = (s.narrative as { dialogue?: { lines?: { text?: string }[] } })?.dialogue?.lines ?? [];
      const hasDialogue = dial.some((l) => (l.text ?? "").trim());
      const video = String(s.videoPrompt ?? (s.generation as { videoPrompt?: string })?.videoPrompt ?? "");
      const hit = checkCamSpeak({ hasDialogue, videoPrompt: video, shotIndex: idx });
      if (hit) fails.push({ shotIndex: idx, message: hit.message });
    }
    const passed = fails.length === 0;
    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      id: "CAM-SPEAK",
      passed,
      severity: "BLOCK",
      message: passed ? "台词镜运镜 OK" : fails[0].message,
      evidence: { fails: fails.slice(0, 5), repairReasons: passed ? [] : ["clamp_static"] },
      chainId: "camera",
      trigger: passed ? undefined : "cam_speak",
      repairHintId: "RH-QP-14",
      fieldPaths: ["generation.videoPrompt"],
      fingerprint: fingerprintOf({ id: "CAM-SPEAK", fails }),
    };
  },
  suggestRepair(finding, ctx): SuggestedPatch[] {
    if (finding.passed) return [];
    const shots = shotsOf(ctx);
    const patches: SuggestedPatch[] = [];
    for (const s of shots) {
      const idx = Math.max(0, Number(s.shotIndex ?? 0) - 1);
      const dial = (s.narrative as { dialogue?: { lines?: { text?: string }[] } })?.dialogue?.lines ?? [];
      const hasDialogue = dial.some((l) => (l.text ?? "").trim());
      if (!hasDialogue) continue;
      const video = String(s.videoPrompt ?? (s.generation as { videoPrompt?: string })?.videoPrompt ?? "");
      if (!checkCamSpeak({ hasDialogue: true, videoPrompt: video })) continue;
      const san = sanitizeVideoPrompt({
        prompt: video,
        dialogueLines: dial.map((l) => l.text ?? "").filter(Boolean),
        preferStaticOnDialogue: true,
      });
      let next = san.prompt;
      if (/\[Camera\]/i.test(next)) {
        next = next.replace(/\[Camera\]([\s\S]*?)(?=\[Audio\]|\[Narrative\]|$)/i, (_m, body: string) => {
          const clamped = String(body)
            .replace(/whip.?pan|crash.?zoom|dutch.?extreme|handheld.?shake|速切|甩镜/gi, "static")
            .trim();
          return `[Camera]\n${clamped || "static hold, single continuous take."}\n\n`;
        });
      } else {
        next = `${next}\n[Camera]\nstatic hold, single continuous take.`;
      }
      patches.push({
        checkId: "CAM-SPEAK",
        path: `preDesignPack.shots.${idx}.videoPrompt`,
        patch: { op: "setVideoPrompt", shotIndex: idx, videoPrompt: next },
        confidence: 0.88,
        reason: "clamp Camera to static for dialogue shot",
      });
    }
    return patches.slice(0, 2);
  },
};

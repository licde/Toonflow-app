import { createHash } from "crypto";
import { isVideoPromptStub } from "../../compilers/sanitizeVideoPrompt";
import { finalizeFiveSectionPrompt, hasFiveSectionPlaceholders } from "../../compilers/finalizeFiveSectionPrompt";
import type { CheckAdapter, DiagnosisFinding, SuggestedPatch } from "../types";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "../types";

function fingerprintOf(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

function shotsOf(ctx: { bundle: { preDesignPack?: { shots?: unknown[] } } }) {
  return (ctx.bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
}

/** VP-CONFLICT — dirty five-section / stub / placeholders → finalize soft_patch. */
export const vpConflictAdapter: CheckAdapter = {
  id: "VP-CONFLICT",
  diagnose(ctx): DiagnosisFinding {
    const shots = shotsOf(ctx);
    const fails: { shotIndex?: number; conflicts: string[]; stub: boolean }[] = [];
    for (const s of shots) {
      const idx = s.shotIndex as number | undefined;
      const video = String(s.videoPrompt ?? (s.generation as { videoPrompt?: string })?.videoPrompt ?? "");
      const dial = ((s.narrative as { dialogue?: { lines?: { text?: string }[] } })?.dialogue?.lines ?? [])
        .map((l) => l.text ?? "")
        .filter(Boolean);
      const stub = isVideoPromptStub(video) || hasFiveSectionPlaceholders(video);
      const san = finalizeFiveSectionPrompt({
        prompt: video,
        dialogueLines: dial,
        durationSec: Number(s.duration) || undefined,
      });
      if (stub || san.conflicts.length || /--cref|--sref/i.test(video)) {
        fails.push({ shotIndex: idx, conflicts: san.conflicts, stub });
      }
    }
    const passed = fails.length === 0;
    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      id: "VP-CONFLICT",
      passed,
      severity: passed ? "INFO" : "BLOCK",
      message: passed ? "视频提示词冲突 OK" : `视频提示词冲突/stub/占位 ${fails.length} 镜`,
      evidence: { fails: fails.slice(0, 8), repairReasons: passed ? [] : ["finalize_five_section"] },
      chainId: "video",
      trigger: passed ? undefined : "vp_conflict",
      repairHintId: "RH-MOD-07",
      fieldPaths: ["generation.videoPrompt"],
      fingerprint: fingerprintOf({ id: "VP-CONFLICT", fails }),
    };
  },
  suggestRepair(finding, ctx): SuggestedPatch[] {
    if (finding.passed) return [];
    const shots = shotsOf(ctx);
    const patches: SuggestedPatch[] = [];
    for (const s of shots) {
      const idx = Math.max(0, Number(s.shotIndex ?? 0) - 1);
      const video = String(s.videoPrompt ?? (s.generation as { videoPrompt?: string })?.videoPrompt ?? "");
      const dial = ((s.narrative as { dialogue?: { lines?: { text?: string }[] } })?.dialogue?.lines ?? [])
        .map((l) => l.text ?? "")
        .filter(Boolean);
      const fin = finalizeFiveSectionPrompt({
        prompt: video,
        dialogueLines: dial,
        durationSec: Number(s.duration) || undefined,
      });
      if (fin.prompt && fin.prompt !== video) {
        patches.push({
          checkId: "VP-CONFLICT",
          path: `preDesignPack.shots.${idx}.videoPrompt`,
          patch: { op: "setVideoPrompt", shotIndex: idx, videoPrompt: fin.prompt },
          confidence: 0.9,
          reason: `finalize: ${fin.changes.join(",") || "cleanup"}`,
        });
      }
    }
    return patches.slice(0, 3);
  },
};

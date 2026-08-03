import { createHash } from "crypto";
import { checkLangVid01, checkLangAud01 } from "../../validators/langAudFxCam";
import { flattenDialogueText } from "../../design/dialogueCoverage";
import type { CheckAdapter, DiagnosisFinding, SuggestedPatch } from "../types";
import { PRECHECK_LOOP_SCHEMA_VERSION } from "../types";

function fingerprintOf(parts: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 16);
}

function shotsOf(ctx: { bundle: { preDesignPack?: { shots?: unknown[] } } }) {
  return (ctx.bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
}

export const lang01Adapter: CheckAdapter = {
  id: "LANG-01",
  diagnose(ctx): DiagnosisFinding {
    const shots = shotsOf(ctx);
    const fails: { shotIndex?: number; message: string; sample?: string }[] = [];
    for (const s of shots) {
      const idx = s.shotIndex as number | undefined;
      const dial = flattenDialogueText((s.narrative as { dialogue?: { lines?: unknown } })?.dialogue?.lines);
      const video = String(s.videoPrompt ?? (s.generation as { videoPrompt?: string })?.videoPrompt ?? "");
      const audio = String((s.generation as { audioPrompt?: string })?.audioPrompt ?? "");
      const v = checkLangVid01({ dialogueLines: dial, videoPrompt: video, shotIndex: idx });
      const a = checkLangAud01({ dialogueLines: dial, audioPrompt: audio, shotIndex: idx });
      if (v) fails.push({ shotIndex: idx, message: v.message, sample: String(v.evidence?.sample ?? "") });
      if (a) fails.push({ shotIndex: idx, message: a.message });
    }
    const passed = fails.length === 0;
    return {
      schemaVersion: PRECHECK_LOOP_SCHEMA_VERSION,
      id: "LANG-01",
      passed,
      severity: "BLOCK",
      message: passed ? "语言政策 OK" : fails[0].message,
      evidence: { failCount: fails.length, fails: fails.slice(0, 5), repairReasons: passed ? [] : ["unique_missing_line"] },
      chainId: "dialogue",
      trigger: passed ? undefined : "lang_aud_mismatch",
      repairHintId: "RH-LANG-01",
      fieldPaths: ["generation.videoPrompt"],
      fingerprint: fingerprintOf({ id: "LANG-01", fails }),
    };
  },
  suggestRepair(finding, ctx): SuggestedPatch[] {
    if (finding.passed) return [];
    const shots = shotsOf(ctx);
    const patches: SuggestedPatch[] = [];
    for (const s of shots) {
      const idx = Number(s.shotIndex ?? 0) - 1;
      const dial = (s.narrative as { dialogue?: { lines?: { speaker?: string; text?: string }[] } })?.dialogue?.lines;
      if (!Array.isArray(dial) || !dial.length) continue;
      const video = String(s.videoPrompt ?? (s.generation as { videoPrompt?: string })?.videoPrompt ?? "");
      const flat = flattenDialogueText(dial);
      if (!flat || !checkLangVid01({ dialogueLines: flat, videoPrompt: video })) continue;
      const linesBlock = [
        ...dial.map((l) => `"${l.text ?? ""}"`),
        "口型同步开启。",
      ].join("\n");
      const next = /\[Audio\]/i.test(video)
        ? video.replace(/\[Audio\][\s\S]*?(?=\[Narrative\]|$)/i, `[Audio]\n${linesBlock}\n\n`)
        : `${video}\n\n[Audio]\n${linesBlock}\n`;
      patches.push({
        checkId: "LANG-01",
        path: `preDesignPack.shots.${Math.max(0, idx)}.videoPrompt`,
        patch: { op: "setVideoPrompt", shotIndex: Math.max(0, idx), videoPrompt: next },
        confidence: 0.85,
        reason: "restore source-language dialogue into [Audio]",
      });
      const audioPrompt = dial.map((l) => l.text ?? "").filter(Boolean).join("\n");
      if (audioPrompt) {
        patches.push({
          checkId: "LANG-01",
          path: `preDesignPack.shots.${Math.max(0, idx)}.generation.audioPrompt`,
          patch: { op: "setAudioPrompt", shotIndex: Math.max(0, idx), audioPrompt },
          confidence: 0.85,
          reason: "writeback source lines to audioPrompt",
        });
      }
    }
    return patches.slice(0, 4);
  },
};

/**
 * Audio L1 post-burn — silence heuristic + optional lip + optional ASR; writes audioPass.
 */
import { loadAudioLiteraryFidelityConfig } from "../compilers/audioLiteraryFidelityChecklist";
import { evaluateLipPixel, type MouthSample } from "./lipPixelQc";
import type { QcFinding } from "./postBurnQc";
import { emitHealObs } from "../heal/obsHealBridge";

export interface AudioL1Input {
  hasDialogue: boolean;
  /** Vendor reported generate_audio / mux has audio track */
  vendorReportedAudio?: boolean | null;
  /** Optional RMS / energy samples 0..1 over time windows */
  energySamples?: number[];
  mouthSamples?: MouthSample[];
  dialogueWindows?: Array<{ startSec: number; endSec: number }>;
  /** Optional ASR transcript for coverage (when asrEnabled) */
  asrTranscript?: string | null;
  dialogueLines?: string[];
  shotId?: string | number;
}

export interface AudioL1Result {
  audioPass: boolean;
  audioPassAt?: string;
  findings: QcFinding[];
  notes: string[];
}

export function runAudioLiteraryL1(input: AudioL1Input): AudioL1Result {
  const cfg = loadAudioLiteraryFidelityConfig();
  const findings: QcFinding[] = [];
  const notes: string[] = [];

  if (!input.hasDialogue) {
    return {
      audioPass: true,
      audioPassAt: new Date().toISOString(),
      findings: [],
      notes: ["no_dialogue_skip"],
    };
  }

  // Silence: vendor says no audio, or energy near zero
  const thr = cfg.silenceEnergyThreshold ?? 0.02;
  if (input.vendorReportedAudio === false) {
    findings.push({
      id: "QC-SILENCE",
      severity: "BLOCK",
      message: "厂商回包无音轨/未生成音频",
      shotId: input.shotId,
    });
    notes.push("vendor_no_audio");
  } else if (input.energySamples?.length) {
    const avg = input.energySamples.reduce((a, b) => a + b, 0) / input.energySamples.length;
    if (avg < thr) {
      findings.push({
        id: "QC-SILENCE",
        severity: "BLOCK",
        message: `音量过低 avg=${avg.toFixed(3)}`,
        shotId: input.shotId,
      });
      notes.push("energy_silence");
    }
  }

  if (input.mouthSamples?.length && input.dialogueWindows?.length) {
    const lip = evaluateLipPixel({
      samples: input.mouthSamples,
      dialogueWindows: input.dialogueWindows,
      shotId: input.shotId,
    });
    if (lip) {
      findings.push(lip);
      notes.push("lip_mismatch");
    }
  } else {
    notes.push("lip_skipped_no_samples");
  }

  if (cfg.asrEnabled && input.asrTranscript != null && input.dialogueLines?.length) {
    const tr = String(input.asrTranscript);
    const miss = input.dialogueLines.filter((l) => {
      const slice = l.slice(0, Math.min(4, l.length));
      return slice && !tr.includes(slice);
    });
    if (miss.length) {
      findings.push({
        id: "QC-SILENCE",
        severity: "WARN",
        message: `ASR 未覆盖台词：${miss.map((m) => m.slice(0, 8)).join(",")}`,
        shotId: input.shotId,
      });
      notes.push("asr_miss");
    }
  }

  const audioPass = !findings.some((f) => f.severity === "BLOCK");
  emitHealObs("audio_l1", { audioPass, findings: findings.map((f) => f.id), notes });
  return {
    audioPass,
    audioPassAt: audioPass ? new Date().toISOString() : undefined,
    findings,
    notes,
  };
}

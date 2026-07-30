/**
 * Lip pixel QC heuristic (M3) — dialogue window mouth energy vs silence baseline.
 * Without decoded frames, returns inconclusive; with samples, compares means.
 */
import type { QcFinding } from "./postBurnQc";

export interface MouthSample {
  tSec: number;
  mouthOpenness: number; // 0..1
}

export interface LipPixelInput {
  samples: MouthSample[];
  dialogueWindows: Array<{ startSec: number; endSec: number }>;
  /** Ratio threshold dialogueMean / silenceMean (default 1.35) */
  ratioMin?: number;
  shotId?: string | number;
  /** Prior WARN count for same shot — elevate to BLOCK at >=2 (D7) */
  priorWarnCount?: number;
}

export function evaluateLipPixel(input: LipPixelInput): QcFinding | null {
  if (!input.samples.length || !input.dialogueWindows.length) return null;
  const inDial = (t: number) => input.dialogueWindows.some((w) => t >= w.startSec && t <= w.endSec);
  const dial = input.samples.filter((s) => inDial(s.tSec)).map((s) => s.mouthOpenness);
  const sil = input.samples.filter((s) => !inDial(s.tSec)).map((s) => s.mouthOpenness);
  if (!dial.length || !sil.length) return null;
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const ratio = mean(dial) / Math.max(0.01, mean(sil));
  const min = input.ratioMin ?? 1.35;
  if (ratio >= min) return null;
  const prior = input.priorWarnCount ?? 0;
  return {
    id: "QC-LIP-PIXEL",
    severity: prior >= 1 ? "BLOCK" : "WARN",
    message: `口型运动不足：对白窗/静音窗能量比 ${ratio.toFixed(2)} < ${min}`,
    shotId: input.shotId,
  };
}

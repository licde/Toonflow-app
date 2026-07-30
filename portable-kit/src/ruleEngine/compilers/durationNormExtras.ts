/**
 * Extra duration_norms field checks (reaction / opening hook / atmosphere).
 */
import {
  openingHookWithinSec,
  maxAtmosphereOnlySec,
  reactionShotBounds,
} from "../compilers/durationNorms";

export type DurationNormExtraFinding = {
  id: string;
  severity: "WARN" | "BLOCK";
  message: string;
};

export function auditDurationNormExtras(input: {
  shots: Array<{
    shotIndex?: number;
    duration?: number;
    narrative?: {
      duration?: number;
      shotSize?: string;
      dialogue?: { lines?: unknown[] };
      retentionTier?: string;
      markers?: string[];
    };
    retentionTier?: string;
    splitHint?: string;
    reactionAction?: string;
    visualDescription?: string;
  }>;
}): DurationNormExtraFinding[] {
  const out: DurationNormExtraFinding[] = [];
  const react = reactionShotBounds();
  const hookSec = openingHookWithinSec();
  const atmMax = maxAtmosphereOnlySec();

  let elapsed = 0;
  let sawStrongStimulus = false;
  for (const s of input.shots) {
    const dur = Number(s.duration ?? s.narrative?.duration ?? 0) || 0;
    const isReact = Boolean(s.reactionAction || /reaction/i.test(String(s.splitHint ?? "")));
    if (isReact && dur > 0) {
      if (dur < react.min || dur > react.max) {
        out.push({
          id: "DURATION-REACTION-BAND",
          severity: "WARN",
          message: `反应镜 ${s.shotIndex ?? "?"} 时长 ${dur}s 建议在 ${react.min}-${react.max}s`,
        });
      }
    }
    const desc = String(s.visualDescription ?? "");
    const atmosphereOnly =
      !((s.narrative?.dialogue?.lines ?? []) as unknown[]).length &&
      /氛围|空镜|远景写景|无人/.test(desc) &&
      !/冲突|对峙|巴掌|跪|刺|摔/.test(desc);
    if (atmosphereOnly && dur > atmMax) {
      out.push({
        id: "DURATION-ATMOSPHERE-MAX",
        severity: "WARN",
        message: `氛围镜 ${s.shotIndex ?? "?"} 超过 maxAtmosphereOnlySec=${atmMax}`,
      });
    }
    if (!sawStrongStimulus && elapsed < hookSec) {
      if (/钩|巴掌|跪|刺|摔|哭|怒|冲突/.test(desc) || (s.narrative?.markers ?? []).length) {
        sawStrongStimulus = true;
      }
    }
    elapsed += dur;
  }
  if (input.shots.length && !sawStrongStimulus && elapsed >= hookSec) {
    out.push({
      id: "DURATION-OPENING-HOOK",
      severity: "WARN",
      message: `开场 ${hookSec}s 内未见强刺激（duration_norms.openingHookGroup）`,
    });
  }
  return out;
}

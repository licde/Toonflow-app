import { readFixtureJson } from "../utils/fixturesPath";
import type { ScriptBundle } from "./types";
import type { BundleGap } from "./auditTypes";

export function auditScriptViralGaps(bundle: ScriptBundle): BundleGap[] {
  const gaps: BundleGap[] = [];
  const plan = bundle.planData as Record<string, unknown> | undefined;
  const viral = plan?.viralAdaptation as {
    clipPoints30s?: unknown[];
    paypointSchedule?: unknown[];
    openingCardPlan?: Record<string, unknown>;
    genreFramework?: string;
  } | undefined;
  const spec = readFixtureJson<{
    clipPoints30s?: { minClips?: number };
    paypoints?: { ratios?: number[] };
  }>("viral_video_spec.json", {});

  if (!viral) {
    gaps.push({
      id: "VIR-00",
      severity: "WARN",
      message: "缺少 viralAdaptation",
      chainId: "viral_clip",
      trigger: "viral_clip_shortfall",
      field: "planData.viralAdaptation",
    });
    return gaps;
  }

  const minClips = spec.clipPoints30s?.minClips ?? 1;
  const clips = viral.clipPoints30s ?? [];
  if (clips.length < minClips) {
    gaps.push({
      id: "VIR-01",
      severity: "WARN",
      message: `clipPoints30s 不足 (${clips.length}/${minClips})`,
      chainId: "viral_clip",
      trigger: "viral_clip_shortfall",
      field: "viralAdaptation.clipPoints30s",
    });
  }

  if (!viral.openingCardPlan?.ep1) {
    gaps.push({
      id: "VIR-02",
      severity: "WARN",
      message: "缺 openingCardPlan.ep1 四要素",
      chainId: "viral_clip",
      trigger: "viral_clip_shortfall",
      field: "viralAdaptation.openingCardPlan",
    });
  }

  const paypoints = viral.paypointSchedule ?? [];
  const ratios = spec.paypoints?.ratios ?? [0.1, 0.3, 0.5];
  if (paypoints.length < 1) {
    gaps.push({
      id: "VIR-03",
      severity: "WARN",
      message: "缺 paypointSchedule",
      chainId: "viral_clip",
      trigger: "viral_clip_shortfall",
      field: "viralAdaptation.paypointSchedule",
    });
  } else {
    const hasRatio = paypoints.some((p) => {
      const r = (p as { ratio?: number }).ratio;
      return r != null && ratios.some((x) => Math.abs(x - r) < 0.05);
    });
    if (!hasRatio) {
      gaps.push({
        id: "VIR-03",
        severity: "WARN",
        message: "paypointSchedule 未覆盖标准比例卡",
        chainId: "viral_clip",
        trigger: "viral_clip_shortfall",
        field: "viralAdaptation.paypointSchedule",
      });
    }
  }

  const shots = bundle.preDesignPack?.shots ?? [];
  const rhythmShots = shots.filter((s) => (s as { rhythm31545?: unknown }).rhythm31545);
  if (!rhythmShots.length && bundle.meta?.episodeIndex === 1) {
    gaps.push({
      id: "VIR-04",
      severity: "WARN",
      message: "ep1 SB 无 rhythm31545 标注",
      chainId: "viral_clip",
      trigger: "viral_clip_shortfall",
      field: "shots.rhythm31545",
    });
  }

  return gaps;
}

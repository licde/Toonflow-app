import type { ScriptBundle } from "./types";
import type { BundleGap } from "./auditTypes";

const OPENING_FORBIDDEN = /背景介绍|群像开会|慢写景|环境描写/;

export function auditRetentionGaps(bundle: ScriptBundle): BundleGap[] {
  const gaps: BundleGap[] = [];
  const plan = bundle.planData as Record<string, unknown> | undefined;
  const viral = plan?.viralAdaptation as { retentionPlan?: Record<string, unknown> } | undefined;
  const retention = viral?.retentionPlan ?? (plan?.retentionPlan as Record<string, unknown> | undefined);
  const ep1 = retention?.ep1 as Record<string, unknown> | undefined;
  const shots = bundle.preDesignPack?.shots ?? [];
  const epIndex = bundle.meta?.episodeIndex ?? 1;

  if (epIndex === 1) {
    if (!ep1?.opening5s && !ep1?.opening3to10s) {
      gaps.push({
        id: "RET-01",
        severity: "WARN",
        message: "ep1 缺 opening5s 或 opening3to10s 钩子",
        chainId: "retention",
        trigger: "retention_opening_missing",
        field: "retentionPlan.ep1.opening5s",
      });
    }

    const first30s = ep1?.first30s as { rhythm31545?: Record<string, string>; clip30sCandidate?: boolean } | undefined;
    const r = first30s?.rhythm31545;
    if (!r?.impact3s || !r?.change15s) {
      gaps.push({
        id: "RET-02",
        severity: "WARN",
        message: "ep1 前30s 缺 rhythm31545.impact3s/change15s",
        chainId: "retention",
        trigger: "retention_opening_missing",
        field: "retentionPlan.ep1.first30s.rhythm31545",
      });
    }

    const scriptHead = (bundle.script ?? "").slice(0, 200);
    if (OPENING_FORBIDDEN.test(scriptHead)) {
      gaps.push({
        id: "RET-03",
        severity: "WARN",
        message: "ep1 开场触犯禁词（背景/开会/写景）",
        chainId: "retention",
        trigger: "retention_opening_missing",
        field: "script",
      });
    }

    const hasClip30 = first30s?.clip30sCandidate === true || shots.some((s) => (s as { clip30sCandidate?: boolean }).clip30sCandidate);
    if (!hasClip30) {
      gaps.push({
        id: "RET-04",
        severity: "WARN",
        message: "ep1 30s 窗口无 clip30sCandidate",
        chainId: "retention",
        trigger: "retention_opening_missing",
        field: "clip30sCandidate",
      });
    }

    if (!ep1?.episodeEndHook) {
      gaps.push({
        id: "RET-05",
        severity: "WARN",
        message: "ep1 缺 episodeEndHook",
        chainId: "retention",
        trigger: "retention_opening_missing",
        field: "retentionPlan.ep1.episodeEndHook",
      });
    }

    const firstShot = shots[0] as { retentionTier?: string } | undefined;
    if (!firstShot?.retentionTier?.startsWith("0-2")) {
      gaps.push({
        id: "RET-07",
        severity: "WARN",
        message: "SB 首镜缺 retentionTier=0-2s",
        chainId: "retention",
        trigger: "retention_opening_missing",
        field: "shots[0].retentionTier",
        shotIndex: 1,
      });
    }
  } else if (!retention?.epN && !ep1?.episodeEndHook) {
    gaps.push({
      id: "RET-06",
      severity: "WARN",
      message: "后续集缺 epN retentionPattern 或集末 hook",
      chainId: "retention",
      trigger: "retention_opening_missing",
      field: "retentionPlan.epN",
    });
  }

  return gaps;
}

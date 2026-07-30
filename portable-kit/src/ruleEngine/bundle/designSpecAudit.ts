import type { ScriptBundle } from "./types";
import type { BundleGap } from "./auditTypes";

export function auditDesignSpecGaps(bundle: ScriptBundle): BundleGap[] {
  const gaps: BundleGap[] = [];
  const plan = bundle.planData as Record<string, unknown> | undefined;
  const viral = plan?.viralAdaptation as {
    paypointSchedule?: unknown[];
    clipPoints30s?: unknown[];
    retentionPlan?: unknown;
  } | undefined;
  const brief = bundle.designBrief as Record<string, unknown> | undefined;

  if (viral?.paypointSchedule?.length && !(brief?.B14 as unknown[])?.length && !(brief?.paypointMarkers as unknown[])?.length) {
    gaps.push({
      id: "DSG-B14",
      severity: "WARN",
      message: "paypointSchedule 未镜像 designBrief.B14",
      chainId: "viral_clip",
      trigger: "design_spec_upstream",
      field: "designBrief.B14",
    });
  }

  if (viral?.clipPoints30s?.length && !(brief?.B15 as unknown[])?.length) {
    gaps.push({
      id: "DSG-B15",
      severity: "WARN",
      message: "clipPoints30s 未镜像 designBrief.B15",
      chainId: "viral_clip",
      trigger: "design_spec_upstream",
      field: "designBrief.B15",
    });
  }

  const structured = plan?.adaptationMatrixStructured as { deepAdaptation?: { nameMap?: unknown[] } } | undefined;
  if (structured?.deepAdaptation?.nameMap?.length && !brief?.B16) {
    gaps.push({
      id: "DSG-B16",
      severity: "WARN",
      message: "nameMap 未镜像 designBrief.B16",
      chainId: "adaptation_deep",
      trigger: "design_spec_upstream",
      field: "designBrief.B16",
    });
  }

  const retention = viral?.retentionPlan ?? plan?.retentionPlan;
  if (retention && !brief?.B18 && !brief?.B19) {
    gaps.push({
      id: "DSG-B18",
      severity: "WARN",
      message: "retentionPlan 未镜像 designBrief.B18/B19",
      chainId: "retention",
      trigger: "design_spec_upstream",
      field: "designBrief.B18",
    });
  }

  const ledger = plan?.informationLedger as unknown[] | undefined;
  if (ledger?.length && !(brief?.B20 as unknown[])?.length) {
    gaps.push({
      id: "DSG-B20",
      severity: "WARN",
      message: "informationLedger 未镜像 designBrief.B20",
      chainId: "narrative_drive",
      trigger: "design_spec_upstream",
      field: "designBrief.B20",
    });
  }

  if (plan?.dialoguePlan && !brief?.B21) {
    gaps.push({
      id: "DSG-B21",
      severity: "WARN",
      message: "dialoguePlan 未镜像 designBrief.B21",
      chainId: "narrative_drive",
      trigger: "design_spec_upstream",
      field: "designBrief.B21",
    });
  }

  if (bundle.narrativeCausalityGraph && !brief?.B22) {
    gaps.push({
      id: "DSG-B22",
      severity: "WARN",
      message: "narrativeCausalityGraph 未镜像 designBrief.B22",
      chainId: "narrative_drive",
      trigger: "design_spec_upstream",
      field: "designBrief.B22",
    });
  }

  return gaps;
}

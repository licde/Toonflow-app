import type { ScriptBundle } from "./types";
import type { BundleGap } from "./auditTypes";

const DEEP_DIMS = ["D01_nameMap", "D02_relationMap", "D03_substitutions", "D04_settingProfile"] as const;
const MAP_FIELDS = ["nameMap", "relationMap", "substitutions"] as const;

function isCanonicalRenamePair(item: unknown): boolean {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const o = item as Record<string, unknown>;
  return typeof o.from === "string" && typeof o.to === "string";
}

/** Detect residual non-canonical map shapes (should be rare after BundleShapePipeline). */
function auditMapShapes(deep: Record<string, unknown>): BundleGap[] {
  const gaps: BundleGap[] = [];
  for (const field of MAP_FIELDS) {
    const val = deep[field];
    if (val == null) continue;
    if (!Array.isArray(val)) {
      gaps.push({
        id: "ADP-SHAPE-01",
        severity: "WARN",
        message: `deepAdaptation.${field} 形状残留：期望 [{from,to}] 数组（请跑 BundleShapePipeline / 按契约重写）`,
        chainId: "adaptation_deep",
        field: `deepAdaptation.${field}`,
      });
      continue;
    }
    if (val.length && !val.every(isCanonicalRenamePair)) {
      gaps.push({
        id: "ADP-SHAPE-02",
        severity: "WARN",
        message: `deepAdaptation.${field} 条目未统一为 {from,to}`,
        chainId: "adaptation_deep",
        field: `deepAdaptation.${field}`,
      });
    }
  }
  return gaps;
}

export function auditAdaptationGaps(bundle: ScriptBundle): BundleGap[] {
  const gaps: BundleGap[] = [];
  const plan = bundle.planData as Record<string, unknown> | undefined;
  const structured = plan?.adaptationMatrixStructured as
    | { userConfirmed?: boolean; matrix?: { dimId: string; choice: string }[]; deepAdaptation?: Record<string, unknown> }
    | undefined;

  if (!structured) {
    gaps.push({
      id: "ADP-01",
      severity: "WARN",
      message: "缺少 adaptationMatrixStructured",
      chainId: "adaptation_deep",
      trigger: "adaptation_deep_empty",
      field: "planData.adaptationMatrixStructured",
    });
    return gaps;
  }

  if (!structured.userConfirmed) {
    gaps.push({
      id: "ADP-02",
      severity: "WARN",
      message: "改编矩阵未用户确认 (userConfirmed)",
      chainId: "adaptation_deep",
      trigger: "adaptation_deep_empty",
      field: "adaptationMatrixStructured.userConfirmed",
    });
  }

  const matrix = structured.matrix ?? [];
  if (matrix.length < 12) {
    gaps.push({
      id: "ADP-03",
      severity: "WARN",
      message: `矩阵维度不足 (${matrix.length}/12+)`,
      chainId: "adaptation_deep",
      trigger: "adaptation_deep_empty",
      field: "adaptationMatrixStructured.matrix",
    });
  }

  const deep = structured.deepAdaptation ?? {};
  gaps.push(...auditMapShapes(deep));
  for (const dimId of DEEP_DIMS) {
    const entry = matrix.find((m) => m.dimId === dimId);
    if (entry && entry.choice !== "keep") {
      const key = dimId.replace(/^D\d+_/, "").replace(/Map$/, "Map").replace("settingProfile", "settingProfile");
      const fieldKey =
        dimId === "D01_nameMap" ? "nameMap"
        : dimId === "D02_relationMap" ? "relationMap"
        : dimId === "D03_substitutions" ? "substitutions"
        : "settingProfile";
      const val = deep[fieldKey];
      const empty = Array.isArray(val) ? val.length === 0 : !val || (typeof val === "object" && !Object.keys(val as object).length);
      if (empty) {
        gaps.push({
          id: dimId === "D01_nameMap" ? "ADP-D01" : dimId === "D02_relationMap" ? "ADP-D02" : dimId === "D03_substitutions" ? "ADP-D03" : "ADP-D04",
          severity: "WARN",
          message: `深度改编 ${dimId} choice=${entry.choice} 但 deepAdaptation.${fieldKey} 为空`,
          chainId: "adaptation_deep",
          trigger: "adaptation_deep_empty",
          field: `deepAdaptation.${fieldKey}`,
        });
      }
    }
  }

  const b16 = (bundle.designBrief as { B16?: unknown })?.B16;
  const nameMap = deep.nameMap as unknown[] | undefined;
  if (nameMap?.length && !b16) {
    gaps.push({
      id: "ADP-05",
      severity: "WARN",
      message: "nameMap 已填但 designBrief.B16 未镜像",
      chainId: "adaptation_deep",
      trigger: "design_spec_upstream",
      field: "designBrief.B16",
    });
  }

  return gaps;
}

import type { ScriptBundle } from "./types";
import type { BundleGap } from "./auditTypes";

function isPayoffEpInvalid(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "number" && Number.isFinite(v)) return false;
  return true;
}

function auditLinkageItems(arr: unknown[], basePath: string): BundleGap[] {
  const gaps: BundleGap[] = [];
  if (!Array.isArray(arr)) return gaps;
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    if (isPayoffEpInvalid(o.payoffEp)) {
      gaps.push({
        id: "SHAPE-RESIDUAL-01",
        severity: "WARN",
        message: `${basePath}[${i}].payoffEp 形状残留：期望 number 或省略（语义用 payoffLabel）`,
        chainId: "bundle_shape",
        field: `${basePath}[${i}].payoffEp`,
      });
    }
  }
  return gaps;
}

/** Detect shape issues that survived normalize (missing registry signal). No reverse trigger. */
export function auditShapeResidualGaps(bundle: ScriptBundle | Record<string, unknown>): BundleGap[] {
  const gaps: BundleGap[] = [];
  const db = (bundle as ScriptBundle).designBrief as Record<string, unknown> | undefined;
  if (db && typeof db === "object") {
    if (Array.isArray(db.B5)) gaps.push(...auditLinkageItems(db.B5, "designBrief.B5"));
    if (Array.isArray(db.infoLinkageChain)) gaps.push(...auditLinkageItems(db.infoLinkageChain, "designBrief.infoLinkageChain"));
    if (Array.isArray(db.B20) && db.B20.some((x) => typeof x !== "string")) {
      gaps.push({
        id: "SHAPE-RESIDUAL-B20",
        severity: "BLOCK",
        message: "designBrief.B20 形状残留：期望 string[]（infoId），仍含 object",
        chainId: "bundle_shape",
        field: "designBrief.B20",
      });
    }
    if (Array.isArray(db.B23)) {
      gaps.push({
        id: "SHAPE-RESIDUAL-B23",
        severity: "BLOCK",
        message: "designBrief.B23 形状残留：期望 record，仍为 array",
        chainId: "bundle_shape",
        field: "designBrief.B23",
      });
    }
  }
  const pack = (bundle as ScriptBundle).preDesignPack;
  if (pack?.shots?.length) {
    for (let i = 0; i < pack.shots.length; i++) {
      const shot = pack.shots[i] as Record<string, unknown>;
      for (const field of ["visualEffect", "audioCue"] as const) {
        const v = shot[field];
        if (v != null && typeof v === "object") {
          gaps.push({
            id: "SHAPE-RESIDUAL-SHOT",
            severity: "BLOCK",
            message: `shots[${i}].${field} 形状残留：期望 string，仍为 object`,
            chainId: "bundle_shape",
            field: `preDesignPack.shots[${i}].${field}`,
          });
        }
      }
    }
  }
  return gaps;
}

/**
 * Hoist packaging fields nested under planData → ScriptBundle top-level.
 * Does not invent content; keeps planData copies for undo.
 */
import type { ShapeSalvageLog } from "./shapeSalvageTypes";

const HOIST_KEYS = [
  "preDesignPack",
  "characterDesign",
  "visualLockTable",
  "designBrief",
  "debutIntroPack",
  "narrativeCausalityGraph",
  "fxFeasibilityAudit",
  "modalityPromptAudit",
  "narrativeSelfcheck",
] as const;

function shotCount(pack: unknown): number {
  if (!pack || typeof pack !== "object") return 0;
  const shots = (pack as { shots?: unknown }).shots;
  return Array.isArray(shots) ? shots.length : 0;
}

function cdAssetCount(cd: unknown): number {
  if (!cd || typeof cd !== "object") return 0;
  if (Array.isArray(cd)) return cd.length;
  const assets = (cd as { assets?: unknown }).assets;
  return Array.isArray(assets) ? assets.length : 0;
}

function isTopPdpEmpty(bundle: Record<string, unknown>): boolean {
  return shotCount(bundle.preDesignPack) === 0;
}

function isTopCdEmpty(bundle: Record<string, unknown>): boolean {
  return cdAssetCount(bundle.characterDesign) === 0;
}

function normalizeCdShape(cd: unknown): Record<string, unknown> | undefined {
  if (!cd) return undefined;
  if (Array.isArray(cd)) return { assets: cd };
  if (typeof cd === "object") return cd as Record<string, unknown>;
  return undefined;
}

/**
 * Materialize flowData.storyboard → empty preDesignPack stub counts for empty-episode bypass
 * only when PDP still empty after hoist — returns panel count for gates.
 */
export function flowStoryboardPanelCount(bundle: Record<string, unknown>): number {
  const fd = bundle.flowData as { storyboard?: unknown[] } | undefined;
  return Array.isArray(fd?.storyboard) ? fd!.storyboard!.length : 0;
}

export function hoistPlanDataPackaging(
  bundle: Record<string, unknown>,
  log: ShapeSalvageLog,
): void {
  const pd = bundle.planData;
  if (!pd || typeof pd !== "object" || Array.isArray(pd)) return;
  const plan = pd as Record<string, unknown>;

  // preDesignPack
  const nestedPdp = plan.preDesignPack;
  const nestedShots = shotCount(nestedPdp);
  const topShots = shotCount(bundle.preDesignPack);
  if (nestedShots > 0) {
    if (isTopPdpEmpty(bundle)) {
      const nested = nestedPdp as Record<string, unknown>;
      if (typeof nested.scriptPlan !== "string") nested.scriptPlan = "";
      bundle.preDesignPack = nested;
      log.push("SH-HOIST-PDP", "preDesignPack", `from_planData:shots=${nestedShots}`);
    } else if (nestedShots >= topShots * 2 && topShots <= 2) {
      log.push(
        "SH-HOIST-CONFLICT",
        "preDesignPack",
        `top_shots=${topShots};nested_shots=${nestedShots};kept_top`,
      );
    }
  }

  // characterDesign (+ array shape)
  const nestedCd = normalizeCdShape(plan.characterDesign);
  if (nestedCd && cdAssetCount(nestedCd) > 0) {
    if (isTopCdEmpty(bundle)) {
      bundle.characterDesign = nestedCd;
      log.push("SH-HOIST-CD", "characterDesign", `from_planData:assets=${cdAssetCount(nestedCd)}`);
    }
  } else if (Array.isArray(bundle.characterDesign) && bundle.characterDesign.length) {
    bundle.characterDesign = { assets: bundle.characterDesign };
    log.push("SH-HOIST-CD", "characterDesign", "normalize_array_to_assets");
  }

  for (const key of HOIST_KEYS) {
    if (key === "preDesignPack" || key === "characterDesign") continue;
    const nested = plan[key];
    if (nested == null) continue;
    const top = bundle[key];
    const topEmpty =
      top == null ||
      (typeof top === "object" && !Array.isArray(top) && Object.keys(top as object).length === 0) ||
      (Array.isArray(top) && top.length === 0);
    if (topEmpty) {
      bundle[key] = nested;
      log.push(`SH-HOIST-${key === "visualLockTable" ? "VLT" : key === "designBrief" ? "BRIEF" : "PACK"}`, key, "from_planData");
    }
  }
}

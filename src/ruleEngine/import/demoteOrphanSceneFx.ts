/**
 * Import heal: demote orphan sceneRef F1+ → F0 (no mapped shots). Never invents FX prose.
 */
import type { ScriptBundle } from "../bundle/types";
import { orphanF1SceneRefs, implementationPlanItems, sceneMetaItems } from "../bundle/sceneCardinality";

export interface DemoteOrphanResult {
  demoted: number[];
}

function setFxLevelOnPlanItem(item: { fxIntent?: { level?: string } }, level: string): void {
  item.fxIntent = { ...(item.fxIntent ?? {}), level };
}

export function demoteOrphanSceneFxOnBundle(bundle: ScriptBundle): DemoteOrphanResult {
  const orphans = orphanF1SceneRefs(bundle);
  if (!orphans.length) return { demoted: [] };

  const demoted: number[] = [];
  const refs = new Set(orphans.map((o) => o.sceneRef));

  for (const item of implementationPlanItems(bundle)) {
    const ref = Number(item.sceneRef);
    if (!refs.has(ref)) continue;
    setFxLevelOnPlanItem(item, "F0");
    demoted.push(ref);
  }

  // Ensure narrativeBrief.implementationPlan is the mutated array when nested
  const brief = bundle.planData as { narrativeBrief?: { implementationPlan?: { sceneRef?: number; fxIntent?: { level?: string } }[] } } | undefined;
  if (brief?.narrativeBrief?.implementationPlan) {
    for (const item of brief.narrativeBrief.implementationPlan) {
      const ref = Number(item.sceneRef);
      if (refs.has(ref)) setFxLevelOnPlanItem(item, "F0");
    }
  }

  for (const item of sceneMetaItems(bundle)) {
    const ref = Number(item.sceneRef);
    if (!refs.has(ref)) continue;
    setFxLevelOnPlanItem(item, "F0");
  }

  return { demoted: [...new Set(demoted)] };
}

/**
 * Scene cardinality / orphan plan helpers — unique sceneName order ↔ implementationPlan sceneRef.
 */
import type { ScriptBundle } from "./types";

export type ImplPlanItem = {
  sceneRef?: number;
  fxIntent?: { level?: string };
};

export function uniqueSceneNameOrder(bundle: ScriptBundle): string[] {
  const order: string[] = [];
  for (const s of bundle.preDesignPack?.shots ?? []) {
    const n = String((s as { sceneName?: string }).sceneName ?? "").trim();
    if (n && !order.includes(n)) order.push(n);
  }
  return order;
}

export function implementationPlanItems(bundle: ScriptBundle): ImplPlanItem[] {
  const fromRoot = (bundle as { implementationPlan?: ImplPlanItem[] }).implementationPlan;
  const fromBrief = (bundle.planData as { narrativeBrief?: { implementationPlan?: ImplPlanItem[] } } | undefined)
    ?.narrativeBrief?.implementationPlan;
  const fromPlan = (bundle.planData as { implementationPlan?: ImplPlanItem[] } | undefined)?.implementationPlan;
  return fromRoot ?? fromBrief ?? fromPlan ?? [];
}

export function sceneMetaItems(bundle: ScriptBundle): { sceneRef?: number; fxIntent?: { level?: string } }[] {
  const fromPlan = (bundle.planData as { sceneMeta?: { sceneRef?: number; fxIntent?: { level?: string } }[] } | undefined)
    ?.sceneMeta;
  return fromPlan ?? [];
}

/** Shots mapped to 1-based sceneRef via unique sceneName order (or explicit shot.sceneRef). */
export function shotsForSceneRef(bundle: ScriptBundle, ref: number): Record<string, unknown>[] {
  const shots = (bundle.preDesignPack?.shots ?? []) as Record<string, unknown>[];
  const explicit = shots.filter((s) => Number(s.sceneRef) === ref);
  if (explicit.length) return explicit;
  const order = uniqueSceneNameOrder(bundle);
  const name = order[ref - 1];
  if (!name) return [];
  return shots.filter((s) => String(s.sceneName ?? "").trim() === name);
}

export function isFxIntentF1Plus(level?: string): boolean {
  const g = String(level ?? "")
    .toUpperCase()
    .replace(/^FX:/, "")
    .trim();
  return /^F[1-5]$/.test(g);
}

export interface OrphanSceneRef {
  sceneRef: number;
  fxLevel: string;
  path: string;
}

/** Plan sceneRefs with F1+ but zero mapped shots (P1 orphan). */
export function orphanF1SceneRefs(bundle: ScriptBundle): OrphanSceneRef[] {
  const out: OrphanSceneRef[] = [];
  for (const item of implementationPlanItems(bundle)) {
    const ref = Number(item.sceneRef);
    if (!Number.isFinite(ref) || ref < 1) continue;
    if (!isFxIntentF1Plus(item.fxIntent?.level)) continue;
    if (shotsForSceneRef(bundle, ref).length > 0) continue;
    out.push({
      sceneRef: ref,
      fxLevel: String(item.fxIntent?.level ?? "F1"),
      path: `planData.narrativeBrief.implementationPlan[sceneRef=${ref}].fxIntent.level`,
    });
  }
  return out;
}

export interface SceneCardinalityIssue {
  kind: "plan_gt_scenes" | "scenes_gt_plan" | "meta_mismatch";
  message: string;
  field: string;
}

export function sceneCardinalityIssues(bundle: ScriptBundle): SceneCardinalityIssue[] {
  const scenes = uniqueSceneNameOrder(bundle);
  const impl = implementationPlanItems(bundle);
  const meta = sceneMetaItems(bundle);
  const issues: SceneCardinalityIssue[] = [];

  if (impl.length > 0 && scenes.length > 0 && impl.length !== scenes.length) {
    const orphanRefs = impl
      .map((p) => Number(p.sceneRef))
      .filter((r) => Number.isFinite(r) && r > scenes.length);
    const extraNames = scenes.length > impl.length ? scenes.slice(impl.length) : [];
    if (impl.length > scenes.length) {
      issues.push({
        kind: "plan_gt_scenes",
        message: `【场镜基数】implementationPlan ${impl.length} 条 vs 唯一 sceneName ${scenes.length} 个（${scenes.join("、")}）。多余 sceneRef=${orphanRefs.join(",") || "?"} 无映射镜 — 接场须独立 sceneName，或删除/合并多余 plan，或将孤儿 fxIntent 改为 F0`,
        field: "planData.narrativeBrief.implementationPlan",
      });
    } else {
      issues.push({
        kind: "scenes_gt_plan",
        message: `【幽灵场】唯一 sceneName ${scenes.length} 个多于 implementationPlan ${impl.length} 条；未覆盖：${extraNames.join("、")} — 请补 plan 项或改 sceneName 归入已有场`,
        field: "preDesignPack.shots[].sceneName",
      });
    }
  }

  if (meta.length > 0 && impl.length > 0 && meta.length !== impl.length) {
    issues.push({
      kind: "meta_mismatch",
      message: `【场镜基数】sceneMeta ${meta.length} 条 vs implementationPlan ${impl.length} 条不一致 — 请对齐或删除多余项`,
      field: "planData.sceneMeta",
    });
  }

  return issues;
}

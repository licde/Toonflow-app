/**
 * ReverseKernel — DepthPolicy; never silent-default unknown faults to SB.
 */
import type { FaultLayer } from "./types";
import { resolvePresentationFork } from "../design/presentationForkResolver";
import { readFixtureJson } from "../utils/fixturesPath";

export interface RePushPlanItem {
  id: string;
  trigger: string;
  reverseTarget: string;
  forwardRerun: string[];
  preserveFields?: string[];
  presentationFork?: "fork-A" | "fork-B" | null;
  reason: string;
  status: "pending" | "in_progress" | "completed" | "exhausted";
}

export interface DepthHit {
  reverseTarget: FaultLayer;
  forwardStages: string[];
  trigger: string;
  reason: string;
}

type RouteEntry = { trigger: string; reverseTarget: string; forwardStages?: string[]; ruleIds?: string[] };

let routeCache: RouteEntry[] | null = null;

function loadRoutes(): RouteEntry[] {
  if (routeCache) return routeCache;
  routeCache = readFixtureJson<{ routes?: RouteEntry[] }>("reverse_route_table.json", { routes: [] }).routes ?? [];
  return routeCache;
}

const DEPTH_RULES: { test: (t: string) => boolean; reverseTarget: FaultLayer; forwardStages: string[]; reason: string }[] = [
  {
    test: (t) => /wrong_character|identity_mismatch|identity_asset|missing_l0|pc-14/i.test(t),
    reverseTarget: "CD",
    forwardStages: ["CD", "BP", "SB", "EN", "MD"],
    reason: "identity→CD",
  },
  {
    test: (t) => /cref_unbound|img_cref_unbound/i.test(t),
    reverseTarget: "AS",
    forwardStages: ["AS", "SB", "EN", "MD"],
    reason: "cref unbound→AS",
  },
  {
    test: (t) => t === "img_cref_missing" || t === "cref_missing",
    reverseTarget: "EN",
    forwardStages: ["EN", "MD-IMG"],
    reason: "cref compile→EN",
  },
  {
    test: (t) => /fx_f5|fx_infeasible|fx_grade|f5_unhandled|fx_f5_unhandled/i.test(t),
    reverseTarget: "W3",
    forwardStages: ["W3", "SB", "MD-FX"],
    reason: "F4/F5→W3",
  },
  {
    test: (t) => /mode_rules|modality_slot|video_first_frame|image_mode_ref/i.test(t),
    reverseTarget: "MD",
    forwardStages: ["MD", "EN"],
    reason: "mode/slot→MD",
  },
  {
    test: (t) => /content_policy_rewrite|policy_rewrite/i.test(t),
    reverseTarget: "SB",
    forwardStages: ["SB", "EN", "MD"],
    reason: "policy 2nd→rewrite",
  },
  {
    test: (t) => /packaging_debut/i.test(t),
    reverseTarget: "W3",
    forwardStages: ["W3", "SB", "EN"],
    reason: "debut→W3",
  },
  {
    test: (t) => /pr_prop_state|^PR-11$/i.test(t),
    reverseTarget: "BP",
    forwardStages: ["BP", "SB"],
    reason: "PR-11→BP",
  },
  {
    test: (t) => /pr_os_voice|^PR-10$/i.test(t),
    reverseTarget: "SB",
    forwardStages: ["SB", "EN"],
    reason: "PR-10→SB",
  },
  {
    test: (t) => /pr_spatial|^PR-12$/i.test(t),
    reverseTarget: "SB",
    forwardStages: ["SB", "EN"],
    reason: "PR-12→SB",
  },
  {
    test: (t) => /tls_socket|TLS-SOCKET|ECONNRESET|ETIMEDOUT|secure TLS|network socket disconnected/i.test(t),
    reverseTarget: "INFRA",
    forwardStages: [],
    reason: "TLS/socket→INFRA",
  },
  {
    test: (t) => /pr_lip_duration|^PR-09$/i.test(t),
    reverseTarget: "SB",
    forwardStages: ["SB", "EN"],
    reason: "PR-09→SB",
  },
  {
    test: (t) => /pr_expr_feasibility|^PR-14$|^QF-EXPR$/i.test(t),
    reverseTarget: "SB",
    forwardStages: ["SB", "EN"],
    reason: "PR-14→SB",
  },
  {
    test: (t) => /pr_vendor_fx|^PR-15$/i.test(t),
    reverseTarget: "EN",
    forwardStages: ["EN", "MD"],
    reason: "PR-15→EN",
  },
  {
    test: (t) => /debut_missing|^QP-19$|^PR-16$|packaging_debut/i.test(t),
    reverseTarget: "W3",
    forwardStages: ["W3", "SB", "EN"],
    reason: "QP-19/PR-16→W3",
  },
  {
    test: (t) => /vendor_passthrough|unclassified|^unknown$/i.test(t),
    reverseTarget: "INFRA",
    forwardStages: [],
    reason: "unknown→INFRA",
  },
];

/** DepthPolicy — unmatched → INFRA (never SB). */
export function resolveDepthPolicy(trigger: string): DepthHit {
  const t = trigger.trim();
  for (const rule of DEPTH_RULES) {
    if (rule.test(t)) {
      return { reverseTarget: rule.reverseTarget, forwardStages: rule.forwardStages, trigger: t, reason: rule.reason };
    }
  }
  return { reverseTarget: "INFRA", forwardStages: [], trigger: t, reason: "unmatched→INFRA" };
}

function shouldOverrideWithDepth(trigger: string, tableTarget?: string): boolean {
  if (!tableTarget) return true;
  if (/identity|wrong_character|fx_f5|fx_infeasible|PR-11|pr_prop|packaging_debut|vendor_passthrough|tls_socket|TLS/i.test(trigger)) {
    return true;
  }
  if (tableTarget === "SB" && /identity|fx_|wrong_character/i.test(trigger)) return true;
  return false;
}

export function buildDeepRePushPlan(triggers: string[], preserveFields: string[] = ["script", "globalAnchors"]): RePushPlanItem[] {
  const routes = loadRoutes();
  return triggers.map((t, i) => {
    const hit = routes.find((r) => r.trigger === t || (r.ruleIds ?? []).includes(t));
    const deep = resolveDepthPolicy(t);
    const useDeep = shouldOverrideWithDepth(t, hit?.reverseTarget) || !hit;
    const reverseTarget = useDeep ? deep.reverseTarget : (hit?.reverseTarget ?? deep.reverseTarget);
    const forwardRerun = useDeep && deep.forwardStages.length
      ? deep.forwardStages
      : (hit?.forwardStages ?? deep.forwardStages);
    return {
      id: `RP-auto-${i + 1}`,
      trigger: t,
      reverseTarget,
      forwardRerun: forwardRerun.length ? forwardRerun : [reverseTarget],
      preserveFields,
      presentationFork: resolvePresentationFork(t),
      reason: useDeep ? `trigger:${t}|${deep.reason}` : `trigger:${t}`,
      status: "pending" as const,
    };
  });
}

export function resolveReverseTargetDeep(trigger: string): string {
  const routes = loadRoutes();
  const hit = routes.find((r) => r.trigger === trigger || (r.ruleIds ?? []).includes(trigger));
  if (hit && !shouldOverrideWithDepth(trigger, hit.reverseTarget)) return hit.reverseTarget;
  return resolveDepthPolicy(trigger).reverseTarget;
}

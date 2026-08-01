import type { RePushPlanItem } from "./reverseRouteEngine";
import { migrateMultiBeatStockShots } from "./migrateMultiBeatStock";
import { cascadeForwardStale } from "../quality/forwardStaleCascade";
import { runForwardReentryAfterRepair } from "./designSplitLifecycle";
import { runStillIntentHeal } from "./stillIntentReverse";
import type { ScriptBundle } from "../bundle/types";

export function planRePush(items: RePushPlanItem[]): {
  stagesToRerun: string[];
  preservedFields: string[];
  round: number;
  /** IRD: SB fix must re-pass designExit before MD-IMG */
  designExitRequired: boolean;
} {
  const stages = [...new Set(items.flatMap((i) => i.forwardRerun))];
  const preserved = [...new Set(items.flatMap((i) => i.preserveFields ?? []))];
  const round = items[0] ? 1 : 0;
  const designExitRequired = stages.some((s) => {
    const u = String(s).toUpperCase();
    return u === "SB" || u === "AS" || u === "W3" || u === "DESIGNBRIEF" || u === "MD-IMG";
  });
  return { stagesToRerun: stages, preservedFields: preserved, round, designExitRequired };
}

export type RePushStageRunner = (stage: string, ctx: RePushExecContext) => Promise<void> | void;

export type RePushExecContext = {
  shots: Record<string, unknown>[];
  meta?: Record<string, unknown> | null;
  planData?: Record<string, unknown> | null;
  bundle?: ScriptBundle | null;
  chatStrict?: boolean;
  literaryLocked?: boolean;
};

/**
 * Execute rePush: SB runs IRD+migrate+forwardReentry; MD-IMG/EN cascade stale.
 * Shared loop cap with opts.maxRounds (default 3).
 */
export function executeRePushPlan(
  items: RePushPlanItem[],
  opts?: {
    maxRounds?: number;
    currentRound?: number;
    ctx?: RePushExecContext;
    runStage?: RePushStageRunner;
  },
): {
  stagesToRerun: string[];
  preservedFields: string[];
  round: number;
  designExitRequired: boolean;
  status: "pending" | "completed" | "exhausted";
  items: (RePushPlanItem & { status: string })[];
  stageResults?: { stage: string; ok: boolean; detail?: string }[];
  shots?: Record<string, unknown>[];
} {
  const planned = planRePush(items);
  const maxRounds = opts?.maxRounds ?? 3;
  const round = opts?.currentRound ?? planned.round;
  if (round > maxRounds) {
    return {
      ...planned,
      round,
      status: "exhausted",
      items: items.map((i) => ({ ...i, status: "exhausted" })),
    };
  }

  let shots = opts?.ctx?.shots ? [...opts.ctx.shots] : undefined;
  const stageResults: { stage: string; ok: boolean; detail?: string }[] = [];
  let designExitRequired = planned.designExitRequired;

  // Redesign debt: block MD/EN regen until literary redesignPass (W3)
  try {
    const { isRedesignRequired } = require("./redesignContract") as typeof import("./redesignContract");
    const planForDebt = {
      planData: opts?.ctx?.planData ?? opts?.ctx?.bundle?.planData ?? {},
    } as Record<string, unknown>;
    if (isRedesignRequired(planForDebt)) {
      const blocked = planned.stagesToRerun.filter((st) => {
        const u = String(st).toUpperCase();
        return u === "MD-IMG" || u === "EN" || u === "MD-VID";
      });
      if (blocked.length) {
        return {
          ...planned,
          stagesToRerun: planned.stagesToRerun.filter((st) => !blocked.includes(st)),
          round,
          status: "pending" as const,
          designExitRequired: true,
          items: items.map((i) => ({ ...i, status: "blocked_redesign_debt" })),
          stageResults: blocked.map((stage) => ({
            stage,
            ok: false,
            detail: "redesignRequired：须 W3 redesignPass 后再 regen",
          })),
          shots,
        };
      }
    }
  } catch {
    /* optional */
  }

  for (const stage of planned.stagesToRerun) {
    const s = String(stage).toUpperCase();
    try {
      if (shots && (s === "SB" || s === "AS" || s === "W3" || s === "DESIGNBRIEF")) {
        // IRD design-layer heal before migrate
        if (opts?.ctx?.bundle || opts?.ctx?.planData) {
          const bundle = (opts.ctx.bundle ?? {
            preDesignPack: { shots },
            planData: opts.ctx.planData ?? {},
            meta: opts.ctx.meta ?? {},
          }) as ScriptBundle;
          if (bundle.preDesignPack) {
            (bundle.preDesignPack as { shots?: unknown }).shots = shots;
          }
          const ird = runStillIntentHeal(bundle, {
            chatStrict: opts.ctx.chatStrict,
            literaryLocked: opts.ctx.literaryLocked,
            meta: opts.ctx.meta,
            planData: opts.ctx.planData,
          });
          shots = ird.shots;
          stageResults.push({
            stage: s,
            ok: true,
            detail: `ird_applied=${ird.applied.length};refused=${ird.refused.length}`,
          });
          if (ird.applied.length) designExitRequired = true;
        }
        const mig = migrateMultiBeatStockShots(shots, {
          meta: opts?.ctx?.meta ?? { pillarsStillOneBeatMigrate: true },
        });
        shots = mig.shots;
        const re = runForwardReentryAfterRepair({
          planData: opts?.ctx?.planData,
          shots,
          meta: opts?.ctx?.meta,
          applyClauseSplit: false,
        });
        shots = re.shots;
        stageResults.push({
          stage: s,
          ok: true,
          detail: `migrate=${mig.migrated};refuse=${mig.refused};reentry_stale=${re.reentry.staleClientIds.length}`,
        });
        if (opts?.ctx?.meta) {
          (opts.ctx.meta as Record<string, unknown>).designExitRequiredAfterIrd = true;
        }
      } else if (shots && (s === "MD-IMG" || s === "MD" || s === "EN" || s === "MD-VID")) {
        // bare MD ≡ MD-IMG cascade (reverse_route_table often emits MD)
        cascadeForwardStale({
          shots,
          forwardStages: [s === "MD-VID" ? "EN" : s === "MD" ? "MD-IMG" : s],
        });
        stageResults.push({ stage: s, ok: true, detail: "stale_cascade;await_designExit" });
      } else {
        stageResults.push({ stage: s, ok: true, detail: "queued" });
      }
      if (opts?.runStage) {
        void opts.runStage(s, {
          shots: shots ?? [],
          meta: opts.ctx?.meta,
          planData: opts.ctx?.planData,
        });
      }
    } catch (e) {
      stageResults.push({ stage: s, ok: false, detail: e instanceof Error ? e.message : "fail" });
    }
  }

  return {
    ...planned,
    designExitRequired,
    round,
    status: planned.stagesToRerun.length ? "completed" : "pending",
    items: items.map((i) => ({
      ...i,
      status: i.forwardRerun?.length ? "completed" : "pending",
    })),
    stageResults,
    shots,
  };
}

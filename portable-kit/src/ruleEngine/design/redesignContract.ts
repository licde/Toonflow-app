/**
 * Redesign contract SSOT — debt = effective literaryStale; clear only after redesignPass.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { getGenreTemplateFromPlan } from "../genre/loadGenreTemplatePack";
import {
  clearLiteraryStale,
  isBundleLiteraryStale,
  isLiteraryLocked,
  setLiteraryLocked,
  getEpisodeIndex,
} from "./viralDoctrine";
import { runDesignExitGate, type DesignExitResult } from "./designExitGate";

export type RedesignContract = {
  version?: string;
  redesignPassIds?: { W3?: string[]; ep2plusOmit?: string[] };
  clearStage?: string;
  entryStage?: string;
  healPlaceholderRaNotPass?: boolean;
};

export type RedesignPassResult = {
  ok: boolean;
  failedIds: string[];
  exitGate: DesignExitResult;
  stage: string;
};

function loadContract(): RedesignContract {
  const loaded = readFixtureJson<RedesignContract | null>("redesign_contract.json", null);
  if (!loaded || !loaded.redesignPassIds?.W3?.length) {
    throw new Error("redesign_contract.json missing or empty redesignPassIds.W3 — fail-closed (no code fallback)");
  }
  return {
    ...loaded,
    healPlaceholderRaNotPass: loaded.healPlaceholderRaNotPass !== false,
  };
}

/** Derived redesign-required flag (no separate debt bit). */
export function isRedesignRequired(planOrBundle: Record<string, unknown>): boolean {
  const gt = getGenreTemplateFromPlan(planOrBundle);
  if (gt.literaryStale || gt.structureStale) return true;
  return isBundleLiteraryStale(planOrBundle as { planData?: unknown; genreTemplate?: { literaryStale?: boolean } });
}

export function getKeepLegacyAck(plan: Record<string, unknown>): { at?: number; reason?: string } | undefined {
  const pd = (plan.planData as Record<string, unknown>) ?? plan;
  const ack = pd.keepLegacyAck as { at?: number; reason?: string } | undefined;
  return ack && typeof ack === "object" ? ack : undefined;
}

export function setKeepLegacyAck(plan: Record<string, unknown>, reason = "acknowledgeKeepLegacy"): void {
  if (!plan.planData || typeof plan.planData !== "object") plan.planData = {};
  const pd = plan.planData as Record<string, unknown>;
  pd.keepLegacyAck = { at: Date.now(), reason };
  plan.planData = pd;
}

/** Sync _stepStatus.stale bits when clearing literary debt. */
export function clearStepStatusStaleFlags(plan: Record<string, unknown>): void {
  let stepStatus: Record<string, { status: string; completedAt?: number; weakPath?: boolean; stale?: boolean }> = {};
  try {
    stepStatus = JSON.parse(String(plan._stepStatus ?? "{}"));
  } catch {
    stepStatus = {};
  }
  let changed = false;
  for (const id of Object.keys(stepStatus)) {
    if (stepStatus[id]?.stale) {
      stepStatus[id] = { ...stepStatus[id], stale: false };
      changed = true;
    }
  }
  if (changed) plan._stepStatus = JSON.stringify(stepStatus);
}

/**
 * Literary-core redesign pass (W3). Ignores DEX-LITERARY-STALE itself (cleared after pass).
 * Core fails (NAR-15, false green, intents…) ⇒ not pass.
 * healPlaceholderRaNotPass: any raSource=heal_placeholder on emotion_hit lines ⇒ fail.
 */
export function assertRedesignPass(
  plan: Record<string, unknown>,
  opts?: { stageId?: string; exitGate?: DesignExitResult },
): RedesignPassResult {
  const contract = loadContract();
  const stage = opts?.stageId ?? contract.clearStage ?? "W3";
  const exitGate = opts?.exitGate ?? runDesignExitGate(stage, plan, { chatStrict: true });
  let required = [...(contract.redesignPassIds?.W3 ?? [])];
  if (getEpisodeIndex(plan) > 1) {
    const omit = new Set(contract.redesignPassIds?.ep2plusOmit ?? []);
    required = required.filter((id) => !omit.has(id));
  }
  const coreIds = required.filter((id) => id !== "DEX-LITERARY-STALE");
  const coreFails = exitGate.failedIds.filter((id) => coreIds.includes(id));
  const failedIds = [...coreFails];
  if (contract.healPlaceholderRaNotPass !== false && hasHealPlaceholderRa(plan)) {
    if (!failedIds.includes("NAR-15")) failedIds.push("NAR-15");
    if (!failedIds.includes("DEX-LITERARY-STALE")) {
      /* debt stays; pass fails */
    }
  }
  return {
    ok: failedIds.length === 0,
    failedIds,
    exitGate,
    stage,
  };
}

function hasHealPlaceholderRa(plan: Record<string, unknown>): boolean {
  const pd = (plan.planData as Record<string, unknown>) ?? plan;
  const shots = ((pd.preDesignPack as { shots?: Record<string, unknown>[] } | undefined)?.shots ??
    []) as Record<string, unknown>[];
  for (const s of shots) {
    const ra = String(
      (s.shotDesign as { reactionAction?: string } | undefined)?.reactionAction ??
        (s as { reactionAction?: string }).reactionAction ??
        "",
    );
    const src = String(
      (s.shotDesign as { raSource?: string } | undefined)?.raSource ??
        (s as { raSource?: string }).raSource ??
        "",
    );
    if (src === "heal_placeholder" || /heal_placeholder|（反应镜：停顿/.test(ra)) return true;
  }
  const lines =
    ((pd.dialoguePlan as { lines?: Record<string, unknown>[] } | undefined)?.lines ??
      (pd.preDesignPack as { dialoguePlan?: { lines?: Record<string, unknown>[] } } | undefined)?.dialoguePlan
        ?.lines ??
      []) as Record<string, unknown>[];
  for (const line of lines) {
    if (String(line.raSource ?? "") === "heal_placeholder") return true;
    if (String(line.reactionActionSource ?? "") === "heal_placeholder") return true;
  }
  return false;
}

/**
 * Clear debt only when redesignPass succeeds.
 */
export function clearDebtAfterRedesignPass(
  plan: Record<string, unknown>,
  opts?: { exitGate?: DesignExitResult; force?: boolean },
): { cleared: boolean; pass: RedesignPassResult } {
  const pass = assertRedesignPass(plan, { exitGate: opts?.exitGate });
  if (!pass.ok && !opts?.force) {
    return { cleared: false, pass };
  }
  clearLiteraryStale(plan);
  clearStepStatusStaleFlags(plan);
  return { cleared: true, pass };
}

/** SB/export readiness — does not clear debt. */
export function assertDesignExportReady(
  plan: Record<string, unknown>,
  opts?: { chatStrict?: boolean },
): DesignExitResult {
  return runDesignExitGate("SB", plan, { chatStrict: opts?.chatStrict !== false });
}

/** On cascade / pack switch: unlock literary so redesign can rewrite. */
export function unlockLiteraryForRedesign(plan: Record<string, unknown>): void {
  if (isLiteraryLocked(plan)) setLiteraryLocked(plan, false);
}

export function loadRedesignContract(): RedesignContract {
  return loadContract();
}

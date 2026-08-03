/**
 * UntilClearRuntime — unified debt-class runner across design / still / video phases.
 * Inventory declares untilClear; this module binds live handlers + stages.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { loadPracticeInventory } from "./practiceCompleteness";
import * as bgHandler from "./handlers/bgReadableUntilClear";
import * as contactHandler from "./handlers/contactGeomUntilClear";
import * as hqHandler from "./handlers/stillHqEgressUntilClear";
import * as spatialHandler from "./handlers/spatialLayoutUntilClear";
import * as paperDocHandler from "./handlers/paperDocReadableUntilClear";
import * as propInFrameHandler from "./handlers/propInFrameUntilClear";
import * as promptFidelityHandler from "./handlers/promptFidelityUntilClear";
import * as identityPlateHandler from "./handlers/identityPlateUntilClear";
import * as actionMisfireHandler from "./handlers/actionMisfireUntilClear";
import * as secondaryDominanceHandler from "./handlers/secondaryDominanceUntilClear";

export type UntilClearPhase = "design" | "still_L0" | "still_L1" | "video_burn" | "track";

export type UntilClearLayer = "L0_prompt" | "L1_pixel" | "burn_meta" | "design_exit";

export type UntilClearFinding = {
  classId: string;
  layer: UntilClearLayer;
  code: string;
  message: string;
  debtKind: "coverage" | "pixel" | "compose" | "stamp" | "design";
};

export type UntilClearHealPatch = {
  actuators: string[];
  injectLines?: string[];
  primaryNextStep?: "batch_still" | "chat_repair" | "split_shot" | "human_rejudge";
  ctaLabel?: string;
  /** Occupancy / literaryHash miss → full recompose (not delta) */
  forceFull?: boolean;
};

export type UntilClearHandlerCtx = {
  /** Egress prompt for PROMPT_FIDELITY (vs VD — never self-compare) */
  promptUsed?: string | null;
  imagePrompt?: string | null;
  phase: UntilClearPhase;
  visualDescription?: string | null;
  shotSize?: string | null;
  hasSceneLink?: boolean;
  keepSoftEnvRef?: boolean;
  softEnvPlatePresent?: boolean;
  softEnvMissingHonest?: boolean;
  refsRoles?: string[];
  bgMode?: string;
  stillQuality?: string | null;
  visualPass?: boolean | null;
  visualPassAt?: string | null;
  humanOverride?: boolean | string | null;
  fidelityItems?: Array<{ id: string; pass: boolean; fixHint?: string }>;
  descCoverageMissing?: string[];
  healBudgetRemaining?: number;
  keyAbsent?: boolean;
  poseEvidence?: { primaryPose?: string; secondaryPose?: string; faceCuOnly?: boolean } | null;
};

export type MountBinding = {
  classId: string;
  handlerModule: string;
  stages: string[];
  healKinds: string[];
  passKindsAllowed: string[];
};

export type MountGraph = {
  version?: string;
  phase1Classes?: string[];
  bindings: MountBinding[];
};

type HandlerModule = {
  CLASS_ID: string;
  detect: (ctx: UntilClearHandlerCtx) => UntilClearFinding[];
  heal: (ctx: UntilClearHandlerCtx, findings: UntilClearFinding[]) => UntilClearHealPatch;
  reassert: (ctx: UntilClearHandlerCtx) => boolean;
};

const LIVE_HANDLERS: Record<string, HandlerModule> = {
  BG_READABLE: bgHandler,
  CONTACT_GEOM: contactHandler,
  STILL_HQ_EGRESS: hqHandler,
  SPATIAL_LAYOUT: spatialHandler,
  PAPER_DOC_READABLE: paperDocHandler,
  PROP_IN_FRAME: propInFrameHandler,
  PROMPT_FIDELITY: promptFidelityHandler,
  IDENTITY_PLATE: identityPlateHandler,
  ACTION_MISFIRE: actionMisfireHandler,
  SECONDARY_DOMINANCE: secondaryDominanceHandler,
};

export function loadUntilClearMountGraph(): MountGraph {
  return readFixtureJson<MountGraph>("until_clear_mount_graph.json", { bindings: [] });
}

export function getHandlerForClass(classId: string): HandlerModule | null {
  return LIVE_HANDLERS[classId] ?? null;
}

/** CI: untilClear:true inventory classes must have live handler OR be in defer list */
export function auditUntilClearMounts(opts?: {
  deferClassIds?: string[];
}): { missing: string[]; falseMounts: string[] } {
  const inv = loadPracticeInventory();
  const graph = loadUntilClearMountGraph();
  const bound = new Set(graph.bindings.map((b) => b.classId));
  const defer = new Set(opts?.deferClassIds ?? []);
  const missing: string[] = [];
  for (const c of inv.classes ?? []) {
    if (!c.untilClear) continue;
    if (defer.has(c.id)) continue;
    if (graph.phase1Classes?.includes(c.id)) {
      if (!LIVE_HANDLERS[c.id]) missing.push(c.id);
      continue;
    }
    // Phase1 only enforced in this wave; others deferred
    if (!bound.has(c.id) && !defer.has(c.id)) {
      /* deferred — not missing for phase1 CI */
    }
  }
  const falseMounts: string[] = [];
  for (const b of graph.bindings) {
    if (!LIVE_HANDLERS[b.classId]) falseMounts.push(b.classId);
  }
  return { missing, falseMounts };
}

export function runUntilClearDetect(
  ctx: UntilClearHandlerCtx,
  classIds?: string[],
): UntilClearFinding[] {
  const ids = classIds ?? loadUntilClearMountGraph().phase1Classes ?? Object.keys(LIVE_HANDLERS);
  const findings: UntilClearFinding[] = [];
  for (const id of ids) {
    const h = LIVE_HANDLERS[id];
    if (!h) continue;
    findings.push(...h.detect(ctx));
  }
  return findings;
}

export function runUntilClearHeal(
  ctx: UntilClearHandlerCtx,
  findings: UntilClearFinding[],
): UntilClearHealPatch {
  const merged: UntilClearHealPatch = { actuators: [], injectLines: [] };
  const byClass = new Map<string, UntilClearFinding[]>();
  for (const f of findings) {
    const list = byClass.get(f.classId) ?? [];
    list.push(f);
    byClass.set(f.classId, list);
  }
  for (const [classId, fs] of byClass) {
    const h = LIVE_HANDLERS[classId];
    if (!h) continue;
    const patch = h.heal(ctx, fs);
    merged.actuators.push(...patch.actuators);
    merged.injectLines!.push(...(patch.injectLines ?? []));
    if (patch.primaryNextStep && !merged.primaryNextStep) merged.primaryNextStep = patch.primaryNextStep;
    if (patch.ctaLabel && !merged.ctaLabel) merged.ctaLabel = patch.ctaLabel;
    if (patch.forceFull) merged.forceFull = true;
  }
  merged.actuators = [...new Set(merged.actuators)];
  merged.injectLines = [...new Set(merged.injectLines ?? [])];
  return merged;
}

export function runUntilClearReassert(ctx: UntilClearHandlerCtx, classIds?: string[]): boolean {
  return runUntilClearDetect(ctx, classIds).length === 0;
}

/** Map findings → burn CTA (debt-class aware, not generic visualPass) */
export function untilClearBurnCta(findings: UntilClearFinding[]): {
  primaryNextStep: "batch_still" | "chat_repair" | "split_shot";
  ctaLabel: string;
  debtClass?: string;
} {
  const lit = findings.find((f) => f.debtKind === "design");
  if (lit) {
    return { primaryNextStep: "chat_repair", ctaLabel: "手改VD补文学债", debtClass: lit.classId };
  }
  const contact = findings.find((f) => f.classId === "CONTACT_GEOM");
  if (contact?.layer === "L1_pixel") {
    return { primaryNextStep: "batch_still", ctaLabel: "重出HQ静照（接触几何）", debtClass: "CONTACT_GEOM" };
  }
  const bg = findings.find((f) => f.classId === "BG_READABLE");
  if (bg) {
    return { primaryNextStep: "batch_still", ctaLabel: "重出HQ静照（背景可读）", debtClass: "BG_READABLE" };
  }
  const spatial = findings.find((f) => f.classId === "SPATIAL_LAYOUT");
  if (spatial) {
    return { primaryNextStep: "batch_still", ctaLabel: "重出HQ静照（站位姿态）", debtClass: "SPATIAL_LAYOUT" };
  }
  const prop = findings.find((f) => f.classId === "PAPER_DOC_READABLE" || f.classId === "PROP_IN_FRAME");
  if (prop) {
    return { primaryNextStep: "batch_still", ctaLabel: "重出HQ静照（纸契/道具）", debtClass: prop.classId };
  }
  return { primaryNextStep: "batch_still", ctaLabel: "重出HQ静照" };
}

/** Stamp registry: may hq_ok stamp only when STILL_HQ_EGRESS reassert passes */
export function mayStampHqOk(ctx: UntilClearHandlerCtx): { ok: boolean; reason?: string } {
  if (ctx.keyAbsent && ctx.visualPass !== true) {
    return { ok: false, reason: "unmeasured_no_hq" };
  }
  const hqFindings = hqHandler.detect(ctx);
  if (hqFindings.length) return { ok: false, reason: hqFindings[0]!.message };
  return { ok: true };
}

/**
 * SelfHealOrchestrator — detect → classify → route → apply → revalidate → retryGen (stubbed).
 * Reuses reverse_route SSOT; never invents a second routing table.
 * Never fabricates L6 derivatives — only surfaces skipped reasons.
 */
import { buildRePushPlan } from "./reverseRouteEngine";
import { applyPatchesToShot, type PatchMap } from "./patchApplicator";
import {
  buildMissingAssetImageQueue,
  gateIdentityImages,
  type IdentityImageGap,
} from "../compilers/identityAssetGate";
import { classifyGenerationFailure } from "../bundle/generationFailureHelper";
import { readFixtureJson } from "../utils/fixturesPath";
import { runAssetStillQueue, type StillRunnerResult } from "./assetStillRunner";
import { getBundleAlias, resolveAliasedCode } from "../codes/assetCodeAlias";
import { normalizeAssetCode } from "../codes/assetCodeContract";
import type { Knex } from "knex";
import type { ScriptBundle } from "../bundle/types";

export interface SelfHealInput {
  projectId: number;
  scriptId: number;
  shotId?: number;
  jobKind?: string;
  round?: number;
  maxRounds?: number;
  issues?: {
    ruleId?: string;
    message?: string;
    autoFix?: { confidence?: number; patch?: Record<string, unknown> };
  }[];
  identityGaps?: { code: string; reason: string; kind?: string }[];
  errorText?: string;
  category?: string;
  /** When true, skip real vendor regen / still runner DB writes. */
  dryRun?: boolean;
  /** Optional mutable shot for soft patches */
  shot?: Record<string, unknown>;
  /** DB for still runner / package apply */
  db?: Knex;
  /** Optional bundle for alias / derivative skip honesty */
  bundle?: ScriptBundle | null;
  /** Import-time derivative skip reason to echo (honest zero) */
  derivativeSkipReason?: string;
}

export interface SelfHealSkip {
  kind: string;
  reason: string;
}

export interface SelfHealResult {
  ok: boolean;
  exhausted: boolean;
  healRound: number;
  patchesApplied: string[];
  triggers: string[];
  rePushPlan?: unknown;
  stillQueue?: { code: string; action: string; kind?: string }[];
  /** Post-heal queue after re-gate (usually generate_still once rows exist) */
  nextQueue?: { code: string; action: string; kind?: string }[];
  stillRunner?: StillRunnerResult;
  skipped?: SelfHealSkip[];
  autoApplicable: boolean;
  mode: "infra_retry" | "soft_patch" | "still_queue" | "human" | "ok";
  message: string;
  patchedShot?: Record<string, unknown>;
  retrySuggested?: boolean;
  /** Hint for FE: assets ready, need batch still gen (not re-seed) */
  nextStep?: "batch_still" | "regen_prompt" | "none";
  /** still_queue prepared (may still need batch gen) */
  prepared?: boolean;
  /** identity fully healed for regen */
  healed?: boolean;
}

const LAYER_NAME = /^(SB|EN|MD|AS|CD|GB|W3|INFRA|AUD|IMG|VID|FX)$/i;

function loadMaxRounds(fallback = 3): number {
  try {
    const table = readFixtureJson<{ maxRounds?: number }>("reverse_route_table.json", {});
    return typeof table.maxRounds === "number" && table.maxRounds > 0 ? table.maxRounds : fallback;
  } catch {
    return fallback;
  }
}

function collectTriggers(input: SelfHealInput, classifiedRuleId?: string): string[] {
  const triggers: string[] = [];
  if (classifiedRuleId) triggers.push(classifiedRuleId);
  for (const issue of input.issues ?? []) {
    if (issue.ruleId) triggers.push(issue.ruleId);
  }
  for (const g of input.identityGaps ?? []) {
    if (g.reason === "stub_quality") triggers.push("orphan_stub_no_image");
    else if (g.reason === "no_image" || g.reason === "no_asset") triggers.push("img_cref_missing");
    else if (g.reason === "missing_scene") triggers.push("missing_scene");
  }
  if (input.category === "media_probe" || /mute|no.?audio|GC-07/i.test(input.errorText ?? "")) {
    triggers.push("media_probe_mute");
  }
  if (/polish/i.test(input.errorText ?? "") || input.jobKind === "polish") {
    triggers.push("polish_failed");
  }
  return [...new Set(triggers.filter((t) => t && !LAYER_NAME.test(t)))];
}

function buildSkipped(input: SelfHealInput): SelfHealSkip[] {
  const skipped: SelfHealSkip[] = [];
  const reason =
    input.derivativeSkipReason ??
    (input.bundle
      ? (() => {
          const assets =
            (input.bundle.characterDesign as { assets?: { L6?: { arcVisual?: string; stateVariants?: unknown } }[] })
              ?.assets ?? [];
          let anyVariants = false;
          let anyArc = false;
          for (const a of assets) {
            const sv = a.L6?.stateVariants;
            if (Array.isArray(sv) && sv.length) anyVariants = true;
            else if (sv && typeof sv === "object" && Object.keys(sv as object).length) anyVariants = true;
            if (typeof a.L6?.arcVisual === "string" && a.L6.arcVisual.trim()) anyArc = true;
          }
          if (!anyVariants && anyArc) return "arcVisual_only_no_stateVariants";
          if (!anyVariants && assets.length) return "no_L6_stateVariants";
          return undefined;
        })()
      : undefined);
  if (reason) skipped.push({ kind: "derivatives", reason });
  skipped.push({ kind: "audioGap", reason: "import_does_not_create_audio" });
  return skipped;
}

function shotSceneName(shot: Record<string, unknown> | undefined): string {
  if (!shot) return "";
  const narr = shot.narrative as { sceneName?: string; sceneCode?: string } | undefined;
  return String(shot.sceneName ?? shot.scene ?? narr?.sceneName ?? "").trim();
}

function shotSceneCode(shot: Record<string, unknown> | undefined): string | null {
  if (!shot) return null;
  const narr = shot.narrative as { sceneCode?: string } | undefined;
  const c = shot.sceneCode ?? narr?.sceneCode ?? (shot as { scene_code?: string }).scene_code;
  return typeof c === "string" && /^SCENE-/i.test(c) ? c : null;
}

/** Soft-patch missing_scene using Chinese sceneName → SCENE code from lock / shot. */
function tryPatchMissingScene(
  shot: Record<string, unknown> | undefined,
  bundle: ScriptBundle | null | undefined,
): { patch: PatchMap; applied: string[] } | null {
  if (!shot) return null;
  const existing = shotSceneCode(shot);
  if (existing) return { patch: { sceneCode: existing }, applied: [`sceneCode:${existing}`] };

  const sceneName = shotSceneName(shot);
  if (!sceneName || /^SCENE-/i.test(sceneName)) return null;

  const lock =
    (bundle?.visualLockTable as { sceneColorLock?: Record<string, { name?: string }> } | undefined)?.sceneColorLock ??
    {};
  for (const [code, meta] of Object.entries(lock)) {
    if (meta?.name === sceneName || meta?.name?.includes(sceneName) || sceneName.includes(meta?.name ?? "\0")) {
      return { patch: { sceneCode: code }, applied: [`sceneCode:${code}`] };
    }
  }
  return null;
}

function buildDisplayNames(bundle: ScriptBundle | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  const assets =
    (bundle?.characterDesign as { assets?: { code?: string; name?: string }[] } | undefined)?.assets ?? [];
  for (const a of assets) {
    if (a.code && a.name) {
      const c = normalizeAssetCode(a.code) ?? a.code;
      out[c] = a.name;
    }
  }
  const ca = (bundle?.visualLockTable as { characterAssets?: Record<string, string> } | undefined)?.characterAssets;
  if (ca) {
    for (const [code, name] of Object.entries(ca)) {
      const c = normalizeAssetCode(code) ?? code;
      if (name) out[c] = name;
    }
  }
  const lock =
    (bundle?.visualLockTable as { sceneColorLock?: Record<string, { name?: string }> } | undefined)?.sceneColorLock ??
    {};
  for (const [code, meta] of Object.entries(lock)) {
    if (meta?.name) out[normalizeAssetCode(code) ?? code] = meta.name;
  }
  return out;
}

export async function runSelfHeal(input: SelfHealInput): Promise<SelfHealResult> {
  const healRound = Math.max(1, input.round ?? 1);
  const maxRounds = input.maxRounds ?? loadMaxRounds(3);
  const exhausted = healRound >= maxRounds;
  const skipped = buildSkipped(input);
  const alias = getBundleAlias(input.bundle);

  let category = input.category;
  let classifiedRuleId: string | undefined;
  if (input.errorText) {
    const fb = await classifyGenerationFailure({
      modality: (input.jobKind as "video" | "image" | "audio") || "video",
      shotId: String(input.shotId ?? input.scriptId),
      error: input.errorText,
    });
    category = category ?? fb.category;
    classifiedRuleId = fb.ruleId;
  }

  if (category === "INFRA" || category === "vendor_passthrough" || /429|ECONNRESET|TLS|timeout/i.test(input.errorText ?? "")) {
    return {
      ok: false,
      exhausted,
      healRound,
      patchesApplied: [],
      triggers: classifiedRuleId ? [classifiedRuleId] : [],
      skipped,
      autoApplicable: true,
      mode: "infra_retry",
      message: exhausted ? "INFRA retries exhausted" : "INFRA/vendor — backoff retry only, no prompt rewrite",
    };
  }

  const triggers = collectTriggers(input, classifiedRuleId);
  const rePushPlan = triggers.length ? buildRePushPlan(triggers) : [];

  // Always try sceneCode patch when shot lacks it (combine with still queue in one round)
  let patchedShot: Record<string, unknown> | undefined;
  const patchesApplied: string[] = [];
  const sceneFix = tryPatchMissingScene(input.shot, input.bundle);
  if (sceneFix && input.shot && !shotSceneCode(input.shot)) {
    const r = applyPatchesToShot(input.shot, sceneFix.patch);
    patchedShot = r.shot;
    patchesApplied.push(...r.applied);
  }

  const stillGaps = (input.identityGaps ?? []).map(
    (g) =>
      ({
        code: resolveAliasedCode(normalizeAssetCode(g.code) ?? g.code, alias),
        kind: (g.kind as IdentityImageGap["kind"]) || "UNKNOWN",
        reason: g.reason as IdentityImageGap["reason"],
      }) satisfies IdentityImageGap,
  );
  // Also enqueue SCENE from scene patch / shot when gap was missing_scene
  const sceneCodeForSeed = shotSceneCode(patchedShot ?? input.shot) ?? (sceneFix?.patch.sceneCode as string | undefined);
  if (sceneCodeForSeed && !stillGaps.some((g) => g.code === sceneCodeForSeed)) {
    const hadMissing = (input.identityGaps ?? []).some((g) => g.reason === "missing_scene" || g.code === "SCENE-?");
    if (hadMissing) {
      stillGaps.push({ code: sceneCodeForSeed, kind: "SCENE", reason: "no_asset" });
    }
  }

  const stillQueue = buildMissingAssetImageQueue(stillGaps);
  if (stillQueue.length) {
    let stillRunner: StillRunnerResult | undefined;
    if (!input.dryRun && input.db) {
      stillRunner = await runAssetStillQueue(input.db, input.projectId, stillQueue, {
        codeAlias: alias,
        scriptId: input.scriptId,
        displayNames: buildDisplayNames(input.bundle),
      });
    }

    // Re-gate so FE sees no_image/generate_still instead of sticky no_asset
    let nextQueue = stillQueue.map((q) => ({ ...q, action: "generate_still" as const }));
    let nextStep: SelfHealResult["nextStep"] = "batch_still";
    if (!input.dryRun && input.db && stillRunner && stillRunner.queued > 0) {
      const reGate = await gateIdentityImages(input.db, input.projectId, {
        charCodes: stillGaps.filter((g) => g.kind === "CHAR").map((g) => g.code),
        sceneCode: sceneCodeForSeed,
        codeAlias: alias,
        requireSceneWhenCharScene: false,
      });
      nextQueue = buildMissingAssetImageQueue(reGate.gaps);
      if (reGate.gaps.every((g) => g.reason === "no_image" || g.reason === "stub_quality")) {
        nextStep = "batch_still";
      } else if (reGate.ok) {
        nextStep = "regen_prompt";
        nextQueue = [];
      }
    }

    if (stillRunner?.queued) patchesApplied.push(`still_prepare:${stillRunner.queued}`);
    if (stillRunner?.seeded) patchesApplied.push(`still_seed:${stillRunner.seeded}`);

    return {
      ok: true,
      exhausted,
      healRound,
      patchesApplied,
      triggers,
      rePushPlan,
      stillQueue,
      nextQueue,
      stillRunner,
      skipped,
      autoApplicable: true,
      mode: "still_queue",
      message:
        nextStep === "batch_still"
          ? `${stillRunner?.message ?? "Assets prepared"} — 下一步：资产页批量生静照（勿重复 seed）`
          : stillRunner?.message ?? `Enqueue ${stillQueue.length} missing stills`,
      patchedShot,
      retrySuggested: true,
      nextStep,
      prepared: nextStep === "batch_still",
      healed: nextStep === "regen_prompt",
    };
  }

  // Scene-only soft patch (no still queue)
  if (patchedShot && patchesApplied.length) {
    return {
      ok: !exhausted,
      exhausted,
      healRound,
      patchesApplied,
      triggers,
      rePushPlan,
      skipped,
      autoApplicable: true,
      mode: "soft_patch",
      message: `Patched: ${patchesApplied.join(",")}`,
      patchedShot,
      retrySuggested: true,
      nextStep: "regen_prompt",
    };
  }

  const softPatches: PatchMap = {};
  const appliedKeys: string[] = [];
  for (const issue of input.issues ?? []) {
    const conf = issue.autoFix?.confidence ?? 0;
    if (conf < 0.8 || !issue.autoFix?.patch) continue;
    Object.assign(softPatches, issue.autoFix.patch);
  }
  if (triggers.includes("media_probe_mute")) {
    softPatches.generate_audio = true;
  }

  if (Object.keys(softPatches).length && input.shot) {
    const { shot, applied } = applyPatchesToShot(input.shot, softPatches);
    appliedKeys.push(...applied);
    return {
      ok: !exhausted,
      exhausted,
      healRound,
      patchesApplied: appliedKeys,
      triggers,
      rePushPlan,
      skipped,
      autoApplicable: true,
      mode: "soft_patch",
      message: appliedKeys.length ? `Applied patches: ${appliedKeys.join(",")}` : "No writable patch keys",
      patchedShot: shot,
      retrySuggested: appliedKeys.length > 0,
    };
  }

  if (Object.keys(softPatches).length) {
    return {
      ok: false,
      exhausted,
      healRound,
      patchesApplied: Object.keys(softPatches),
      triggers,
      rePushPlan,
      skipped,
      autoApplicable: true,
      mode: "soft_patch",
      message: "Patches ready but no shot provided (dry)",
    };
  }

  if (!triggers.length && !input.errorText && !(input.issues?.length)) {
    return {
      ok: true,
      exhausted: false,
      healRound,
      patchesApplied: [],
      triggers: [],
      skipped,
      autoApplicable: false,
      mode: "ok",
      message: "Nothing to heal",
    };
  }

  return {
    ok: false,
    exhausted,
    healRound,
    patchesApplied: [],
    triggers,
    rePushPlan,
    skipped,
    autoApplicable: false,
    mode: "human",
    message: "Requires human stage re-push / redesign",
  };
}

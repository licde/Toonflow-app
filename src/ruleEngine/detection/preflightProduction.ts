import type { Knex } from "knex";
import type { EpisodePackage, EpisodeShot, ResolvedConfig } from "../types";
import type { ScriptBundle } from "../bundle/types";
import type { BundleGap, BundleGapAuditResult } from "../bundle/auditTypes";
import { auditAllBundleGaps } from "../bundle/bundleGapAudits";
import { runProductionClosureDryRunForTier } from "../bundle/productionClosureDryRun";
import { runDesignClosureDryRun } from "../bundle/designClosureDryRun";
import { buildClosureReport } from "../bundle/closureReport";
import { applyDurationCalculator } from "../durationCalculator";
import { syncFromFlowData } from "../facade";
import { resolveConfig } from "../resolveConfig";
import { runPrValidator } from "../validators/prValidator";
import { filterRegistryEntries, loadDetectionRegistry, type DetectionModality, type DetectionResult, type DetectionStage } from "./types";
import { ensureClosureRegistry, runGenerationClosureViaRegistry, runIntelligentClosureViaRegistry } from "../closure/registerHandlers";
import { runClosureLevel } from "../closure/ClosureRegistry";
import { asDialogueLineObjects } from "../design/dialogueCoverage";

export interface PreflightProductionInput {
  projectId: number;
  scriptId: number;
  storyboardIds?: number[];
  modality?: DetectionModality;
  tier?: "T1" | "T2" | "T3";
}

export interface PreflightProductionResult {
  tier: "T1" | "T2" | "T3";
  blocked: boolean;
  blockGenerate: boolean;
  rulePackVersion: string;
  detectionResults: DetectionResult[];
  closureChecks: {
    dc: ReturnType<typeof runClosureLevel>;
    pc: ReturnType<typeof runProductionClosureDryRunForTier>;
    gc: ReturnType<typeof runGenerationClosureViaRegistry>;
    ic: ReturnType<typeof runIntelligentClosureViaRegistry>;
    blocked: boolean;
  };
  closureReport: ReturnType<typeof buildClosureReport>;
  shots: EpisodeShot[];
  gapSummary: { total: number; blocks: number; warns: number };
  compiledPreview: { storyboardId?: number; image?: string; video?: string; audio?: string; duration?: number }[];
  /** PrecheckLoop diagnose-only snapshot for DC adapters (evidence + repair hints). */
  precheckLoop?: import("../precheckLoop").LoopResult;
  /** Unified qualityGate (LANG/CAM/QP/…) */
  qualityGate?: import("../qualityGate").QualityGateResult;
}

/** Package → ScriptBundle for PR/DC validators (preserves CHAR identity + 1-based shotIndex). */
export function episodePackageToScriptBundle(pkg: EpisodePackage, script: string, flowExtras?: Record<string, unknown>): ScriptBundle {
  return {
    bundleType: "script",
    meta: { episodeIndex: 1 },
    script,
    planData: flowExtras?.planData as ScriptBundle["planData"],
    designBrief: flowExtras?.designBrief as ScriptBundle["designBrief"],
    characters: flowExtras?.characters as ScriptBundle["characters"],
    preDesignPack: {
      scriptPlan: "",
      shots: pkg.shots.map((s, i) => {
        const rawLines = s.narrative.dialogue?.lines;
        let lines:
          | { speaker?: string; text?: string; lineId?: string; splitHint?: string; reactionAction?: string; functions?: string[] }[]
          | undefined;
        if (Array.isArray(rawLines)) {
          lines = rawLines.map((l) =>
            typeof l === "string"
              ? { text: l }
              : {
                  speaker: l.speaker,
                  text: l.text,
                  lineId: l.lineId,
                  ...(l.splitHint ? { splitHint: l.splitHint } : {}),
                  ...(l.reactionAction ? { reactionAction: l.reactionAction } : {}),
                  ...(l.functions?.length ? { functions: l.functions } : {}),
                },
          );
        } else if (typeof rawLines === "string" && rawLines.trim()) {
          lines = rawLines.split(/\n+/).map((part) => {
            const m = part.match(/^([^：:]{1,20})[：:]\s*(.*)$/);
            return m ? { speaker: m[1].trim(), text: m[2] } : { text: part };
          });
        } else {
          const fallback = asDialogueLineObjects(s.narrative.lines);
          if (fallback.length) lines = fallback;
        }
        const charCodes = (s.narrative.assetCodes ?? []).filter((c) => /^CHAR-/i.test(c));
        // 1-based mirror for PR messages / UI (#n); package.index is 0-based
        const shotIndex = typeof s.index === "number" ? s.index + 1 : i + 1;
        const composition = s.narrative.composition;
        const spatialFromComp =
          composition?.foreground && composition?.background
            ? `fg:${composition.foreground}; bg:${composition.background}`
            : undefined;
        const spatialRelation = s.narrative.spatialRelation ?? spatialFromComp;
        const videoPrompt =
          s.generation.videoPrompt ?? s.generation.compiled?.video ?? s.generation.videoDesc;
        const narrExtra = s.narrative as {
          propCodes?: string[];
          propState?: string;
          notes?: string;
        };
        return {
          shotIndex,
          duration: s.narrative.duration ?? 3,
          emotion: s.narrative.emotionIntensity,
          sceneName: s.narrative.sceneName,
          visualDescription: s.visualDescription,
          charCodes: charCodes.length ? charCodes : undefined,
          videoPrompt,
          spatialRelation,
          propCodes: narrExtra.propCodes,
          propState: narrExtra.propState,
          shotDesign: {
            composition,
            cameraAnchor: s.narrative.cameraAnchor,
            performance: s.narrative.performance,
            lipSyncPolicy: s.narrative.lipSyncPolicy,
          },
          narrative: {
            type: s.narrative.type,
            emotionIntensity: s.narrative.emotionIntensity,
            dialogue: lines?.length
              ? { type: s.narrative.dialogue?.type ?? "dialogue", lines }
              : undefined,
            duration: s.narrative.duration,
            assetCodes: s.narrative.assetCodes,
            charCodes: charCodes.length ? charCodes : undefined,
            spatialRelation,
            shotSize: s.narrative.shotSize,
            transitionType: s.narrative.transitionType,
            rhythmZone: (s.narrative as { rhythmZone?: string }).rhythmZone,
            performance: s.narrative.performance,
            propCodes: narrExtra.propCodes,
            propState: narrExtra.propState,
            notes: narrExtra.notes,
          },
          generation: {
            imagePrompt: s.generation.imagePrompt ?? s.generation.compiled?.image,
            videoPrompt,
            audioPrompt: s.generation.audioPrompt ?? s.generation.compiled?.audio,
            fxPrompt: s.generation.fxPrompt ?? s.generation.compiled?.fx,
          },
        };
      }),
    },
  } as unknown as ScriptBundle;
}

function fxByShotFromAudit(audit: unknown): Record<number, string> {
  const out: Record<number, string> = {};
  if (!audit || typeof audit !== "object") return out;
  const rows =
    (audit as { shots?: { shotIndex?: number; level?: string; fxLevel?: string }[] }).shots ??
    (audit as { items?: { shotIndex?: number; level?: string }[] }).items ??
    [];
  for (const r of rows) {
    const idx = r.shotIndex;
    const level = (r as { level?: string; fxLevel?: string }).level ?? (r as { fxLevel?: string }).fxLevel;
    if (idx != null && level) out[idx] = String(level).toUpperCase();
  }
  return out;
}

function gapToResults(gaps: BundleGap[], registryIds: Set<string>): DetectionResult[] {
  return gaps
    .filter((g) => registryIds.has(g.id))
    .map((g) => ({
      id: g.id,
      level: "GAP" as const,
      domain: g.chainId ?? "GEN",
      chainId: g.chainId ?? "generation_apply",
      description: g.message,
      severity: g.severity,
      passed: false,
      message: g.message,
      shotIndex: g.shotIndex,
      fieldPaths: g.field ? [g.field] : undefined,
    }));
}

function prToResults(items: ReturnType<typeof runPrValidator>["items"]): DetectionResult[] {
  return items.map((item) => ({
    id: item.ruleId,
    level: "PR" as const,
    domain: item.ruleId === "PR-09" || item.ruleId === "PR-04" ? "NAR" : "GEN",
    chainId: item.ruleId.startsWith("PR-09") || item.ruleId === "PR-04" ? "dialogue" : "generation_apply",
    description: item.message,
    severity: item.severity as DetectionResult["severity"],
    passed: false,
    message: item.message,
    shotIndex: item.shotIndex,
    repairHintId: item.ruleId === "PR-09" ? "RH-PR-09" : undefined,
  }));
}

function closureCheckToResults(
  checks: { id: string; passed: boolean; message: string; severity?: string; detail?: Record<string, unknown> }[],
  level: DetectionResult["level"],
  registry?: ReturnType<typeof loadDetectionRegistry>,
): DetectionResult[] {
  const byId = new Map((registry?.entries ?? []).map((e) => [e.id, e]));
  return checks.map((c) => {
    const meta = byId.get(c.id);
    return {
      id: c.id,
      level,
      domain: meta?.domain ?? "MOD",
      chainId: meta?.chainId ?? "modality_compile",
      description: meta?.description ?? c.message,
      severity: (c.severity as DetectionResult["severity"]) ?? "WARN",
      passed: c.passed,
      message: c.message,
      fieldPaths: meta?.fieldPaths,
      repairHintId: meta?.repairHintId,
    };
  });
}

function passedRegistryStubs(entries: ReturnType<typeof filterRegistryEntries>): DetectionResult[] {
  const covered = new Set<string>();
  return entries
    .filter((e) => e.implemented && (
      e.handler === "productionClosureDryRun"
      || e.handler === "designClosureDryRun"
      || e.handler === "closureRegistry"
    ))
    .map((e) => {
      if (covered.has(e.id)) return null;
      covered.add(e.id);
      return {
        id: e.id,
        level: e.level,
        domain: e.domain,
        chainId: e.chainId,
        description: e.description,
        severity: e.severity,
        passed: true,
        message: `${e.id} delegated to closure dryRun`,
        fieldPaths: e.fieldPaths,
        repairHintId: e.repairHintId,
      };
    })
    .filter(Boolean) as DetectionResult[];
}

export async function loadFlowStoryboardRows(
  db: Knex,
  scriptId: number,
): Promise<{ id: number; duration?: number; prompt?: string; videoDesc?: string; audioPrompt?: string; fxPrompt?: string }[]> {
  const rows = await db("o_storyboard").where({ scriptId }).select("id", "duration", "prompt", "videoDesc");
  const work = await db("o_agentWorkData").where("episodesId", String(scriptId)).select("data").first();
  let extras = new Map<number, { audioPrompt?: string; fxPrompt?: string }>();
  if (work?.data) {
    try {
      const parsed = JSON.parse(work.data as string) as { storyboard?: { id?: number; audioPrompt?: string; fxPrompt?: string }[] };
      for (const p of parsed.storyboard ?? []) {
        if (p.id) extras.set(p.id, { audioPrompt: p.audioPrompt, fxPrompt: p.fxPrompt });
      }
    } catch {
      /* ignore */
    }
  }
  return rows.map((r) => {
    const ex = extras.get(r.id);
    return {
      id: r.id,
      duration: r.duration ? Number(r.duration) : undefined,
      prompt: r.prompt,
      videoDesc: r.videoDesc,
      audioPrompt: ex?.audioPrompt,
      fxPrompt: ex?.fxPrompt,
    };
  });
}

export async function runProductionPreflight(
  db: Knex,
  input: PreflightProductionInput,
): Promise<PreflightProductionResult> {
  const tier = input.tier ?? "T3";
  const stage: DetectionStage = "preflight";
  const registry = loadDetectionRegistry();
  const registrySlice = filterRegistryEntries(registry, { stage, tier, modality: input.modality });
  const registryIds = new Set(registrySlice.map((e) => e.id));

  const scriptRow = await db("o_script").where({ id: input.scriptId, projectId: input.projectId }).first();
  const script = (scriptRow?.content as string) ?? "";
  const storyboard = await loadFlowStoryboardRows(db, input.scriptId);

  let pkg = await syncFromFlowData(db, {
    projectId: input.projectId,
    scriptId: input.scriptId,
    script,
    storyboard,
  });

  const { loadProjectBlueprint } = await import("../storage/episodePackageStore");
  const { hydratePackageFromPreDesign } = await import("../bundle/hydratePackageFromPreDesign");
  const blueprint = (await loadProjectBlueprint(db, input.projectId)) ?? {};
  const preShots =
    (blueprint.preDesignPack as { shots?: import("../bundle/types").PreDesignShot[] } | undefined)?.shots ??
    (blueprint.preDesign as { shots?: import("../bundle/types").PreDesignShot[] } | undefined)?.shots;
  if (preShots?.length) {
    const sceneColorLock =
      (blueprint.sceneColorLock as Record<string, { colorTemp?: string; kelvin?: string | number; name?: string }>) ??
      (blueprint.visualLockTable as { sceneColorLock?: Record<string, { colorTemp?: string; kelvin?: string | number; name?: string }> } | undefined)
        ?.sceneColorLock;
    pkg = hydratePackageFromPreDesign(pkg, preShots, {
      sceneColorLock,
      fxByShotIndex: fxByShotFromAudit(blueprint.fxFeasibilityAudit),
      debutBeat:
        (blueprint.debutIntroPack as { items?: { copyHint?: string; beatHint?: string }[] } | undefined)?.items?.[0]
          ?.copyHint ??
        (blueprint.debutIntroPack as { items?: { beatHint?: string }[] } | undefined)?.items?.[0]?.beatHint,
      endHook: (blueprint.planData as { endCard?: { hook?: string } } | undefined)?.endCard?.hook,
    });
  }

  const config: ResolvedConfig = await resolveConfig(db as never, input.projectId);
  const durationFixed = applyDurationCalculator(pkg.shots, config.speechSpeed);
  const durationChanged = durationFixed.some((s, i) => s.narrative.duration !== pkg.shots[i]?.narrative.duration);
  if (durationChanged || preShots?.length) {
    pkg = { ...pkg, shots: durationFixed };
    const { saveEpisodePackage } = await import("../storage/episodePackageStore");
    await saveEpisodePackage(db, pkg);
  }

  const filteredScope = input.storyboardIds != null;

  let planData = (blueprint.planData as ScriptBundle["planData"]) ?? undefined;
  const designBrief =
    (blueprint.designBrief as ScriptBundle["designBrief"]) ??
    (blueprint as { designBrief?: ScriptBundle["designBrief"] }).designBrief;
  const characters = (blueprint as { characters?: ScriptBundle["characters"] }).characters;

  // Homology until-clear on FULL package BEFORE designClosure (no stale DC toast)
  let workingBundle = episodePackageToScriptBundle(pkg, script, {
    planData,
    designBrief,
    characters,
  });
  if (preShots?.length && workingBundle.preDesignPack) {
    (workingBundle.preDesignPack as { shots: unknown }).shots = preShots;
  }
  try {
    const { softHealTouchHomology } =
      require("../heal/touchHomologyHeal") as typeof import("../heal/touchHomologyHeal");
    const heal = softHealTouchHomology(workingBundle);
    planData = workingBundle.planData ?? planData;
    if (heal.absorbed > 0 || heal.strippedNoise > 0 || heal.f0Declared.length) {
      const { saveProjectBlueprint, saveEpisodePackage, loadEpisodePackage } =
        await import("../storage/episodePackageStore");
      const bp = (await loadProjectBlueprint(db, input.projectId)) ?? {};
      await saveProjectBlueprint(db, input.projectId, {
        ...bp,
        fxFeasibilityAudit: (workingBundle as { fxFeasibilityAudit?: unknown }).fxFeasibilityAudit,
        preDesignPack: workingBundle.preDesignPack ?? bp.preDesignPack,
        planData: {
          ...((bp.planData as object) ?? {}),
          ...((workingBundle.planData as object) ?? {}),
          dialoguePlan:
            (workingBundle.planData as { dialoguePlan?: unknown } | undefined)?.dialoguePlan ??
            (bp.planData as { dialoguePlan?: unknown } | undefined)?.dialoguePlan,
        },
      });
      const cleaned =
        (workingBundle.preDesignPack as { shots?: import("../bundle/types").PreDesignShot[] } | undefined)
          ?.shots ?? [];
      if (cleaned.length) {
        const fresh = (await loadEpisodePackage(db, input.projectId, input.scriptId)) ?? pkg;
        pkg = hydratePackageFromPreDesign(fresh, cleaned, {
          fxByShotIndex: fxByShotFromAudit(
            (workingBundle as { fxFeasibilityAudit?: unknown }).fxFeasibilityAudit ??
              blueprint.fxFeasibilityAudit,
          ),
        });
        await saveEpisodePackage(db, pkg);
        workingBundle = episodePackageToScriptBundle(pkg, script, {
          planData,
          designBrief,
          characters,
        });
        if (workingBundle.preDesignPack) {
          (workingBundle.preDesignPack as { shots: unknown }).shots = cleaned;
        }
      }
    }
  } catch {
    /* optional */
  }

  let shots = pkg.shots;
  if (filteredScope) {
    const idSet = new Set(input.storyboardIds);
    shots = shots.filter((s) => s.storyboardId != null && idSet.has(s.storyboardId));
  }

  const bundle = episodePackageToScriptBundle({ ...pkg, shots }, script, {
    planData,
    designBrief,
    characters,
  });
  workingBundle = {
    ...workingBundle,
    ...bundle,
    planData: workingBundle.planData ?? planData,
    preDesignPack: workingBundle.preDesignPack ?? bundle.preDesignPack,
  };

  const gapResult: BundleGapAuditResult = auditAllBundleGaps(workingBundle, tier);
  const prItems = runPrValidator(workingBundle, config.speechSpeed);

  ensureClosureRegistry();
  const dc = runDesignClosureDryRun(workingBundle, {
    scope: filteredScope
      ? { mode: "filtered", storyboardIds: input.storyboardIds }
      : { mode: "full" },
  });
  const pc = runProductionClosureDryRunForTier(workingBundle, tier === "T1" ? "T2" : tier);
  const gc = runGenerationClosureViaRegistry({
    genError: "",
    sfRound: 0,
    probeDuration: 0,
    probeHasAudio: false,
  });
  const ic = runIntelligentClosureViaRegistry(workingBundle);

  const detectionResults: DetectionResult[] = [
    ...gapToResults(gapResult.allGaps, registryIds),
    ...prToResults(prItems.items),
    ...closureCheckToResults(dc, "DC", registry),
    ...closureCheckToResults(pc, "PC", registry),
    ...closureCheckToResults(gc, "GC", registry),
    ...closureCheckToResults(ic, "IC", registry),
    ...passedRegistryStubs(registrySlice),
  ];

  const byId = new Map<string, DetectionResult>();
  for (const r of detectionResults) {
    const prev = byId.get(r.id);
    if (!prev || (!r.passed && prev.passed)) byId.set(r.id, r);
  }
  const mergedResults = [...byId.values()];

  const closureReport = buildClosureReport({
    allGaps: gapResult.allGaps,
    closureChecks: { dc, pc, gc, ic },
    tier,
  });

  const compiledPreview = shots.map((s) => ({
    storyboardId: s.storyboardId,
    image: s.generation.compiled?.image ?? s.generation.imagePrompt,
    video: s.generation.compiled?.video ?? s.generation.videoDesc ?? s.generation.videoPrompt,
    audio: s.generation.compiled?.audio ?? s.generation.audioPrompt,
    duration: s.narrative.duration,
  }));

  const { runPrecheckLoop } = await import("../precheckLoop");
  const { qualityGate } = await import("../qualityGate");
  const scope = filteredScope
    ? { mode: "filtered" as const, storyboardIds: input.storyboardIds }
    : { mode: "full" as const };

  let precheckLoop = runPrecheckLoop({
    bundle: workingBundle,
    scope,
    checks: ["DC-01", "DC-13"],
    apply: false,
  });

  // Full-scope DC-01 soft_patchable → persist once so next burn does not re-fire →SB
  if (!filteredScope) {
    const dc01 = precheckLoop.findings.find((f) => f.id === "DC-01");
    const reasons = (dc01?.evidence?.repairReasons as string[]) ?? [];
    const soft =
      dc01 &&
      !dc01.passed &&
      (reasons.includes("unique_missing_line") ||
        reasons.includes("empty_target_shot") ||
        Number(dc01.evidence?.missingCount ?? 0) <= 3);
    if (soft) {
      try {
        const { applyDc01SoftPatchAndPersist } = await import("../heal/applyDc01SoftPatch");
        const persist = await applyDc01SoftPatchAndPersist({
          db,
          projectId: input.projectId,
          scriptId: input.scriptId,
          forceApply: true,
        });
        if (persist.applied.length || persist.coverageOk) {
          const { loadEpisodePackage } = await import("../storage/episodePackageStore");
          const fresh = await loadEpisodePackage(db, input.projectId, input.scriptId);
          if (fresh?.shots?.length) {
            pkg = fresh;
            shots = fresh.shots;
            workingBundle = episodePackageToScriptBundle(fresh, script, {
              planData,
              designBrief,
              characters,
            });
            precheckLoop = runPrecheckLoop({
              bundle: workingBundle,
              scope,
              checks: ["DC-01", "DC-13"],
              apply: false,
            });
            // Clear stale DC-01 / R2 / H3 BLOCKs when coverage now ok
            const healed = precheckLoop.findings.find((f) => f.id === "DC-01")?.passed === true;
            if (healed) {
              for (const id of ["DC-01", "R2", "H3"]) {
                const prev = byId.get(id);
                if (prev && !prev.passed) {
                  byId.set(id, { ...prev, passed: true, message: "台词覆盖已软补并通过", severity: "INFO" });
                }
              }
            }
          }
        }
      } catch {
        /* persist best-effort; preflight still reports original finding */
      }
    }
  }

  const qg = qualityGate(workingBundle, { stage: "preflight", tier, scope });

  // Merge qualityGate BLOCKs into detection results
  for (const b of qg.blocks) {
    const prev = byId.get(b.id);
    if (!prev || prev.passed) {
      const row: DetectionResult = {
        id: b.id,
        level: "PR",
        domain: b.domain ?? "GEN",
        chainId: b.domain ?? "generation_apply",
        description: b.message,
        severity: "BLOCK",
        passed: false,
        message: b.message,
        shotIndex: b.shotIndex,
        repairHintId: b.repairHintId,
      };
      byId.set(b.id, row);
    }
  }
  const finalResults = [...byId.values()];

  const blocks2 = finalResults.filter((r) => !r.passed && r.severity === "BLOCK").length;
  const warns2 = finalResults.filter((r) => !r.passed && r.severity === "WARN").length;
  const blockGenerate2 = blocks2 > 0;
  const blocked2 = blockGenerate2 || pc.some((c) => !c.passed && c.severity === "BLOCK");

  return {
    tier,
    blocked: blocked2,
    blockGenerate: blockGenerate2,
    rulePackVersion: pkg.rulePackVersion,
    detectionResults: finalResults,
    closureChecks: { dc, pc, gc, ic, blocked: blocked2 },
    closureReport,
    shots,
    gapSummary: { total: finalResults.length, blocks: blocks2, warns: warns2 },
    compiledPreview,
    precheckLoop,
    qualityGate: qg,
  };
}

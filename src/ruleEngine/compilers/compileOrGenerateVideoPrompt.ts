/**
 * Single entry for video prompt: ruleEngine compile IR preferred; LLM fallback + WARN.
 * Pipeline: seed/IR → sanitize → applyModeDialect → postModeSanitize.
 * Mode switch (`adaptPromptForMode`) must call this — no shallow [mode=] tags.
 */
import type { Knex } from "knex";
import { resolveGenerationModeRules, type GenerationModality } from "./resolveGenerationModeRules";
import { loadModePromptTemplate } from "./loadModePromptTemplate";
import { buildVideoPromptUserContent } from "./videoPromptUserContent";
import { getCompiledPromptForStoryboard } from "../facade";
import type { EpisodePackage } from "../types";
import { LANGUAGE_POLICY, normalizeAssetCode } from "../codes/assetCodeContract";
import { sanitizeVideoPrompt, isVideoPromptStub } from "./sanitizeVideoPrompt";
import { finalizeFiveSectionPrompt } from "./finalizeFiveSectionPrompt";
import {
  buildPromptIR,
  applyPromptIRToShot,
  findImplPlanItem,
  type ImplPlanItem,
} from "./promptIR";
import { asDialogueLineObjects } from "../design/dialogueCoverage";
import type { PreDesignShot } from "../bundle/types";

export type RefSlot = {
  role: "start" | "end" | "ref" | "asset" | "storyboard";
  id: number;
  sources: "storyboard" | "assets";
  label?: string;
};

export interface CompileOrGenerateInput {
  modality?: GenerationModality;
  mode: string;
  modelName?: string | null;
  projectVideoRatio?: string | null;
  /** Ordered ref slots — start/end before generic refs */
  slots?: RefSlot[];
  storyboard?: {
    id?: number;
    videoDesc?: string | null;
    prompt?: string | null;
    track?: string | number | null;
    duration?: string | number | null;
    associateAssetsIds?: unknown;
    shouldGenerateImage?: unknown;
    audioPrompt?: string | null;
    fxPrompt?: string | null;
    emotion?: number | string | null;
    colorTemp?: string | null;
    spatialRelation?: string | null;
    charCodes?: string[];
    sceneCode?: string;
  }[];
  assets?: { id?: number; type?: string; name?: string; filePath?: string | null; audioTag?: string; code?: string; remark?: string }[];
  /** Existing prompt when adapting modes */
  existingPrompt?: string;
  fromMode?: string | null;
  /** Rule-engine package when available */
  pkg?: EpisodePackage | null;
  storyboardId?: number;
  modelPromptRoot?: string;
  boundModelPromptPath?: string | null;
  /** Optional LLM invoker — when absent uses compile/dialect only */
  invokeLlm?: (args: { system: string; user: string; assistant?: string }) => Promise<string>;
  artStyleManual?: string;
  preferCompile?: boolean;
  maxUserTokens?: number;
  /** Design shot + plan for IR writeback / stub override */
  designShot?: PreDesignShot | null;
  /** Optional sibling shots for sceneName→sceneRef plan matching */
  designShots?: PreDesignShot[] | null;
  implementationPlanItem?: ImplPlanItem | Record<string, unknown> | null;
  implementationPlan?: ImplPlanItem[] | null;
  dialogueLines?: string[];
  durationSec?: number;
}

export interface CompileOrGenerateResult {
  prompt: string;
  modeId: string;
  templatePath: string;
  source: "compile_ir" | "llm" | "dialect_rewrite" | "prompt_ir";
  mediaContract: ReturnType<typeof resolveGenerationModeRules>["mediaContract"];
  warnings: string[];
  languagePolicy: typeof LANGUAGE_POLICY;
  aspectRatio?: string;
  cancelled?: boolean;
  /** Persisted generation slots when IR ran */
  generationWriteback?: {
    videoPrompt?: string;
    audioPrompt?: string;
    fxPrompt?: string;
    imagePrompt?: string;
    durationSec?: number;
  };
  sanitizeConflicts?: string[];
}

const inFlight = new Map<string, AbortController>();

export function cancelInFlightCompile(key: string): void {
  const c = inFlight.get(key);
  if (c) {
    c.abort();
    inFlight.delete(key);
  }
}

function budgetUserContent(text: string, maxTokens = 6000): string {
  // Rough: 1 token ≈ 2 CJK chars / 4 latin
  const maxChars = maxTokens * 2;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n…[truncated token_budget=${maxTokens}]`;
}

/** Mode structure scaffold — full section anchors per E1–E4; dialect is only a thin suffix fallback. */
export function applyModeDialect(prompt: string, modeId: string, existingPrompt?: string): string {
  const base = (existingPrompt ?? prompt).replace(/\[mode=[^\]]+\]\s*/g, "").trim();
  const id = modeId;

  if (id === "multiParameter" || id === "multiImage" || id === "multi_ref" || id === "seedance") {
    if (/\[References\]/i.test(base) && /@图\d/.test(base)) {
      return base.includes("multi-reference") ? base : `${base}\nmulti-reference composition`;
    }
    // Instruction carries already-sanitized five-section (or seed) — do not re-wrap with No dialogue
    const instructionBody = base || "subject action from references";
    return [
      "[References]",
      "@图1 : [角色参考图]",
      "@图2 : [场景参考图]",
      "@图3 : [分镜图]",
      "",
      "[Instruction]",
      `Based on the storyboard @图3 : preserve subject identity across refs.`,
      instructionBody,
    ]
      .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
      .join("\n")
      .replace(/^\n+/, "");
  }

  if (id === "startEndRequired" || id === "endFrameOptional" || id === "startFrameOptional" || id === "firstLastFrame") {
    let next = base;
    if (!/START_FRAME\s*:/i.test(next)) {
      next = `START_FRAME: opening frame composition.\n${next}`;
    }
    if (!/END_FRAME\s*:/i.test(next)) {
      next = `${next}\nEND_FRAME: closing frame after motion beat.`;
    }
    next = ensureFiveSections(next, "start-end interpolate, consistent identity, smooth temporal bridge.");
    return next;
  }

  if (id === "singleImage" || id === "wan_i2v") {
    let next = base;
    if (!/motion-from-frame/i.test(next)) {
      next = `motion-from-frame from reference: keep face identity unchanged, no exaggerated expression rewrite.\n${next}`;
    }
    next = ensureFiveSections(next, "singleImage reference. subtle camera follow.");
    return next;
  }

  // text (default)
  let next = base;
  next = ensureFiveSections(next, "text-to-video. clear subject, readable motion beats.");
  return next;
}

export function ensureFiveSections(body: string, narrativeExtra: string): string {
  const hasAny =
    /\[Visual\]/i.test(body) || /\[Motion\]/i.test(body) || /\[Camera\]/i.test(body) || /\[Audio\]/i.test(body);
  if (hasAny) {
    let next = body;
    if (!/\[Narrative\]/i.test(next)) next = `${next}\n\n[Narrative]\n${narrativeExtra}`;
    return next;
  }
  const visual = body.trim() || "subject in scene, speaking or silent. keep face identity, no exaggerated expression.";
  return [
    "[Visual]",
    visual,
    "",
    "[Motion]",
    "0s-Ns: readable action beats from seed.",
    "",
    "[Camera]",
    "medium shot, subtle camera, duration Ns, single continuous take.",
    "",
    "[Audio]",
    "No spoken dialogue. ambient/SFX only.",
    "",
    "[Narrative]",
    narrativeExtra,
  ].join("\n");
}

/** Post-dialect cleanup: dedupe motion-from-frame; never strip START/END. */
export function postModeSanitize(prompt: string, modeId: string): string {
  let next = prompt;
  if (modeId === "singleImage" || modeId === "wan_i2v" || /motion-from-frame/i.test(next)) {
    const hits = next.match(/motion-from-frame/gi) ?? [];
    if (hits.length > 1) {
      let n = 0;
      next = next.replace(/motion-from-frame/gi, () => {
        n += 1;
        return n === 1 ? "motion-from-frame" : "";
      });
    }
  }
  return next.replace(/\n{3,}/g, "\n\n").trim();
}

function resolveDialogueLines(input: CompileOrGenerateInput): string[] {
  if (input.dialogueLines?.length) return input.dialogueLines;
  const shot = input.designShot;
  const raw = shot?.narrative?.dialogue?.lines;
  if (raw == null || (typeof raw === "string" && !raw.trim()) || (Array.isArray(raw) && !raw.length)) {
    return [];
  }
  return asDialogueLineObjects(raw)
    .map((l) => String(l.text ?? "").trim())
    .filter(Boolean);
}

function finalizePrompt(
  raw: string,
  modeId: string,
  input: CompileOrGenerateInput,
): { prompt: string; conflicts: string[] } {
  const dialogueLines = resolveDialogueLines(input);
  const durationSec =
    input.durationSec ??
    (typeof input.designShot?.duration === "number" ? input.designShot.duration : undefined) ??
    (input.storyboard?.[0]?.duration != null ? Number(input.storyboard[0].duration) : undefined);
  const dur = Number.isFinite(durationSec) ? Number(durationSec) : undefined;
  const san = sanitizeVideoPrompt({
    prompt: raw,
    dialogueLines,
    durationSec: dur,
    preferStaticOnDialogue: dialogueLines.length > 0,
  });
  const dialected = applyModeDialect(san.prompt, modeId);
  const afterDialect = postModeSanitize(dialected, modeId);
  const fin = finalizeFiveSectionPrompt({
    prompt: afterDialect,
    dialogueLines,
    durationSec: dur,
    preferStaticOnDialogue: dialogueLines.length > 0,
  });
  return { prompt: fin.prompt, conflicts: [...san.conflicts, ...fin.conflicts] };
}

function tryBuildFromDesignShot(input: CompileOrGenerateInput): {
  prompt: string;
  writeback?: CompileOrGenerateResult["generationWriteback"];
  notes: string[];
} | null {
  const shot = input.designShot;
  if (!shot) return null;
  const planItem =
    (input.implementationPlanItem as ImplPlanItem | undefined) ??
    findImplPlanItem(input.implementationPlan ?? undefined, shot, input.designShots ?? (input.designShot ? [shot] : undefined));
  const seed =
    input.existingPrompt?.trim() ||
    shot.generation?.videoPrompt ||
    input.storyboard?.[0]?.videoDesc ||
    "";
  // Always run IR when stub or when plan intent present
  const hasIntent = Boolean(
    planItem?.avCausality || planItem?.voiceIntent || planItem?.fxIntent || planItem?.promptAnchors,
  );
  if (!isVideoPromptStub(seed) && !hasIntent && !input.preferCompile) return null;

  const ir = buildPromptIR(
    {
      ...shot,
      generation: {
        ...shot.generation,
        videoPrompt: seed || shot.generation?.videoPrompt,
        audioPrompt: input.storyboard?.[0]?.audioPrompt ?? shot.generation?.audioPrompt,
        fxPrompt: input.storyboard?.[0]?.fxPrompt ?? shot.generation?.fxPrompt,
      },
    },
    { implementationPlanItem: planItem, forceRebuild: isVideoPromptStub(seed) },
  );
  const applied = applyPromptIRToShot(shot, ir);
  return {
    prompt: ir.videoPrompt ?? seed,
    writeback: {
      videoPrompt: applied.generation?.videoPrompt,
      audioPrompt: applied.generation?.audioPrompt,
      fxPrompt: applied.generation?.fxPrompt,
      imagePrompt: applied.generation?.imagePrompt,
      durationSec: ir.durationSec,
    },
    notes: ir.notes ?? [],
  };
}

export async function compileOrGenerateVideoPrompt(input: CompileOrGenerateInput): Promise<CompileOrGenerateResult> {
  const warnings: string[] = [];
  const rules = resolveGenerationModeRules({
    modality: input.modality ?? "video",
    mode: input.mode,
    modelName: input.modelName,
    referenceCount: input.slots?.length ?? 0,
  });

  const flightKey = `${input.storyboardId ?? "x"}:${rules.modeId}`;
  cancelInFlightCompile(flightKey);
  const ac = new AbortController();
  inFlight.set(flightKey, ac);

  const baseMeta = {
    modeId: rules.modeId,
    templatePath: rules.templatePath,
    mediaContract: rules.mediaContract,
    languagePolicy: LANGUAGE_POLICY,
    aspectRatio: input.projectVideoRatio?.replace(/\s/g, "") || undefined,
  };

  try {
    // 0) Design-shot IR (stub override / intent inject)
    const fromShot = tryBuildFromDesignShot(input);
    if (fromShot) {
      warnings.push(...fromShot.notes.map((n) => `IR:${n}`));
      const fin = finalizePrompt(fromShot.prompt, rules.modeId, {
        ...input,
        durationSec: fromShot.writeback?.durationSec ?? input.durationSec,
        dialogueLines: resolveDialogueLines(input),
      });
      return {
        ...baseMeta,
        prompt: fin.prompt,
        source: "prompt_ir",
        warnings,
        generationWriteback: {
          ...fromShot.writeback,
          videoPrompt: fin.prompt,
        },
        sanitizeConflicts: fin.conflicts,
      };
    }

    // 1) Prefer compiled IR from episode package
    if (input.preferCompile !== false && input.pkg && input.storyboardId) {
      const compiled = getCompiledPromptForStoryboard(input.pkg, input.storyboardId, "video");
      if (compiled) {
        const fin = finalizePrompt(compiled, rules.modeId, input);
        return {
          ...baseMeta,
          prompt: fin.prompt,
          source: "compile_ir",
          warnings,
          sanitizeConflicts: fin.conflicts,
        };
      }
      warnings.push("COMPILE_IR_MISSING");
    }

    // 2) LLM via shared invoker (same path as generateVideoPrompt)
    const { template } = await loadModePromptTemplate(
      () => input.modelPromptRoot ?? "",
      {
        modality: "video",
        mode: rules.modeId,
        modelName: input.modelName ?? undefined,
        boundModelPromptPath: input.boundModelPromptPath ?? null,
      },
    );

    if (input.invokeLlm && template) {
      if (ac.signal.aborted) {
        return {
          ...baseMeta,
          prompt: input.existingPrompt ?? "",
          source: "dialect_rewrite",
          warnings: [...warnings, "CANCELLED"],
          cancelled: true,
        };
      }
      const user = budgetUserContent(
        buildVideoPromptUserContent({
          modelData: input.modelName ?? "",
          assets: input.assets ?? [],
          storyboard: input.storyboard ?? [],
          orderedSlots: input.slots,
          charCodes: input.storyboard?.flatMap((s) => s.charCodes ?? []),
          sceneCode: input.storyboard?.map((s) => s.sceneCode).find(Boolean),
          propCodes: (input.assets ?? [])
            .map((a) => a.code)
            .filter((c): c is string => Boolean(c && /^PROP-/i.test(c))),
        }),
        input.maxUserTokens ?? 6000,
      );
      try {
        const text = await input.invokeLlm({
          system: template,
          user,
          assistant: input.artStyleManual,
        });
        warnings.push("LLM_FALLBACK");
        const fin = finalizePrompt(text, rules.modeId, input);
        return {
          ...baseMeta,
          prompt: fin.prompt,
          source: "llm",
          warnings,
          sanitizeConflicts: fin.conflicts,
        };
      } catch (e) {
        warnings.push(`LLM_FAIL:${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 3) Dialect rewrite of existing / storyboard desc
    const seed =
      input.existingPrompt?.trim() ||
      input.storyboard?.[0]?.videoDesc?.trim() ||
      input.storyboard?.[0]?.prompt?.trim() ||
      "";
    const fin = finalizePrompt(seed, rules.modeId, input);
    return {
      ...baseMeta,
      prompt: fin.prompt,
      source: "dialect_rewrite",
      warnings: [...warnings, "DIALECT_ONLY"],
      sanitizeConflicts: fin.conflicts,
    };
  } finally {
    inFlight.delete(flightKey);
  }
}

/** DB-aware helper used by routes */
export async function hydrateCompileInputs(
  db: Knex,
  projectId: number,
  info: { id: number; sources: string; role?: RefSlot["role"] }[],
): Promise<{
  assets: CompileOrGenerateInput["assets"];
  storyboard: CompileOrGenerateInput["storyboard"];
  slots: RefSlot[];
  videoRatio?: string;
}> {
  const project = await db("o_project").where({ id: projectId }).select("videoRatio").first();
  const slots: RefSlot[] = [];
  const assets: NonNullable<CompileOrGenerateInput["assets"]> = [];
  const storyboard: NonNullable<CompileOrGenerateInput["storyboard"]> = [];

  for (const item of info) {
    if (item.sources === "storyboard") {
      const row = await db("o_storyboard").where("id", item.id).first();
      if (!row) continue;
      const assetRows = await db("o_assets2Storyboard").where("storyboardId", item.id).orderBy("rowid").select("assetId");
      storyboard.push({
        id: item.id,
        videoDesc: row.videoDesc,
        prompt: row.prompt,
        track: row.track,
        duration: row.duration,
        associateAssetsIds: assetRows.map((r: { assetId: number }) => r.assetId),
        shouldGenerateImage: row.shouldGenerateImage,
        audioPrompt: row.audioPrompt,
        fxPrompt: row.fxPrompt,
      });
      const role = (item as { role?: RefSlot["role"] }).role;
      slots.push({
        role: role === "start" || role === "end" || role === "ref" ? role : "storyboard",
        id: item.id,
        sources: "storyboard",
      });
    } else if (item.sources === "assets") {
      const assetsData = await db("o_assets")
        .leftJoin("o_image", "o_image.id", "o_assets.imageId")
        .where("o_assets.id", item.id)
        .select("o_assets.id", "o_assets.type", "o_assets.name", "o_assets.remark", "o_image.filePath")
        .first();
      if (!assetsData) continue;
      const codeMatch = String(assetsData.remark ?? "").match(/(?:assetCode|charCode):([A-Za-z]+-[A-Za-z0-9]+)/i);
      assets.push({
        ...assetsData,
        code: codeMatch?.[1]?.toUpperCase(),
      });
      const role = (item as { role?: RefSlot["role"] }).role;
      slots.push({
        role: role === "start" || role === "end" || role === "ref" ? role : "asset",
        id: item.id,
        sources: "assets",
        label: assetsData.name,
      });
    }
  }

  // Order: start → end → storyboard → asset/ref
  slots.sort((a, b) => {
    const rank = (r: RefSlot) =>
      r.role === "start" ? 0 : r.role === "end" ? 1 : r.role === "storyboard" ? 2 : r.role === "ref" ? 3 : 4;
    return rank(a) - rank(b);
  });

  return { assets, storyboard, slots, videoRatio: project?.videoRatio };
}

/** Storyboard-linked assets (o_assets2Storyboard) — used when workbench info[] has only storyboard ref. */
export async function loadBoundAssetsForStoryboard(
  db: Knex,
  storyboardId: number,
  opts?: { failClosed?: boolean },
): Promise<{ assetId: number; code?: string; name?: string; filePath?: string | null }[]> {
  let assetIds: number[];
  try {
    assetIds = await db("o_assets2Storyboard").where({ storyboardId }).orderBy("rowid").pluck("assetId");
  } catch (e) {
    if (opts?.failClosed) throw e;
    return [];
  }
  if (!assetIds.length) return [];

  try {
    const rows = await db("o_assets")
      .leftJoin("o_image", "o_image.id", "o_assets.imageId")
      .whereIn("o_assets.id", assetIds)
      .select("o_assets.id", "o_assets.name", "o_assets.remark", "o_image.filePath");

    return rows.map((a: { id: number; name?: string; remark?: string; filePath?: string | null }) => {
      const m = String(a.remark ?? "").match(/(?:assetCode|charCode):([A-Za-z]+-[A-Za-z0-9]+)/i);
      const code = m ? (normalizeAssetCode(m[1]) ?? m[1].toUpperCase()) : undefined;
      return { assetId: a.id, code, name: a.name, filePath: a.filePath };
    });
  } catch (e) {
    if (opts?.failClosed) throw e;
    return [];
  }
}

function codeFromRemark(remark?: string | null): string | undefined {
  if (!remark) return undefined;
  const m = remark.match(/(?:assetCode|charCode):([A-Za-z]+-[A-Za-z0-9]+)/i);
  return m ? normalizeAssetCode(m[1]) ?? m[1].toUpperCase() : undefined;
}

export function parseCrefsSrefsFromPrompt(prompt: string): { crefs: string[]; srefs: string[] } {
  const crefs: string[] = [];
  const srefs: string[] = [];
  // Stop at whitespace / comma / next flag — do not swallow "--ar 9:16"
  for (const m of prompt.matchAll(/--cref\s+([A-Za-z]+-[A-Za-z0-9]+)/gi)) {
    const c = normalizeAssetCode(m[1]) ?? m[1].toUpperCase();
    if (c && /^CHAR-/i.test(c)) crefs.push(c);
  }
  for (const m of prompt.matchAll(/--sref\s+([A-Za-z]+-[A-Za-z0-9]+)/gi)) {
    const c = normalizeAssetCode(m[1]) ?? m[1].toUpperCase();
    if (c && /^SCENE-/i.test(c)) srefs.push(c);
  }
  return { crefs: [...new Set(crefs)], srefs: [...new Set(srefs)] };
}

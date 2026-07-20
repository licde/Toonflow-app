/**
 * Load ComposeStillContext from DB + episode package (flow/batch/preview).
 * Enriched: package fallback mapping, compiled imagePrompt, dialogue beat, L0 personality.
 */
import type { Knex } from "knex";
import { loadEpisodePackage } from "../storage/episodePackageStore";
import { getCompiledPromptForStoryboard } from "../facade";
import type { EpisodePackage } from "../types";
import type { ComposeStillCharHint, ComposeStillContext } from "./composeStillPrompt";
import { resolveAssetTier } from "../bundle/assetVisualBrief";

function digMicro(shot: Record<string, unknown> | undefined): string | null {
  const sd = shot?.shotDesign as
    | {
        performance?: {
          microExpression?: string | { eyes?: string; mouthDetail?: string };
        };
        composition?: { foreground?: string; background?: string };
      }
    | undefined;
  const micro = sd?.performance?.microExpression;
  if (!micro) return null;
  if (typeof micro === "string") return micro;
  return [micro.eyes, micro.mouthDetail].filter(Boolean).join("; ") || null;
}

function extractPersonality(remark?: string | null, describe?: string | null): string | null {
  const blob = `${remark ?? ""}\n${describe ?? ""}`;
  const m =
    blob.match(/(?:气质|性格|presence|personality)[:：]\s*([^\n|;]{2,40})/i) ||
    blob.match(/L0[^:]*[:：]\s*([^\n|;]{2,60})/i);
  if (m?.[1]) return m[1].trim().slice(0, 60);
  // Short describe without identity tokens
  const d = String(describe ?? "").trim();
  if (d.length >= 8 && d.length <= 80 && !/--cref|--sref/i.test(d)) return d.slice(0, 60);
  return null;
}

function dialogueBeatFromShot(shot: Record<string, unknown> | undefined): string | null {
  const dial = (shot?.narrative as { dialogue?: { lines?: { speaker?: string; text?: string }[] } } | undefined)
    ?.dialogue;
  const lines = dial?.lines ?? [];
  if (!lines.length) return null;
  const speakers = [...new Set(lines.map((l) => l.speaker).filter(Boolean))];
  const first = lines[0];
  const who = speakers.slice(0, 2).join("与") || first?.speaker || "角色";
  return `${who}对白瞬间神态，目光交汇，嘴部自然微张或闭合`;
}

async function resolvePackageShot(
  db: Knex,
  projectId: number,
  scriptId: number,
  storyboardId: number,
): Promise<{ shot?: Record<string, unknown>; idx: number; pkg: EpisodePackage | null }> {
  const pkg = await loadEpisodePackage(db, projectId, scriptId);
  if (!pkg?.shots?.length) return { idx: -1, pkg };
  const shots = pkg.shots as unknown as Record<string, unknown>[];
  let idx = shots.findIndex((s) => Number((s as { storyboardId?: number }).storyboardId) === Number(storyboardId));
  if (idx >= 0) return { shot: shots[idx], idx, pkg };

  // Fallback: align by row order within same script
  const rows = await db("o_storyboard")
    .where({ projectId, scriptId })
    .orderBy("id", "asc")
    .select("id");
  const rowIdx = rows.findIndex((r: { id: number }) => Number(r.id) === Number(storyboardId));
  if (rowIdx >= 0 && rowIdx < shots.length) {
    idx = rowIdx;
    return { shot: shots[idx], idx, pkg };
  }

  // Fallback: shotIndex field equals 1-based position
  idx = shots.findIndex((s) => Number((s as { shotIndex?: number }).shotIndex) === rowIdx + 1);
  if (idx >= 0) return { shot: shots[idx], idx, pkg };

  return { idx: -1, pkg };
}

export async function hydrateComposeStillContext(
  db: Knex,
  input: {
    projectId: number;
    storyboardId?: number;
    scriptId?: number;
    rawPrompt?: string;
    qualityMode?: "hq_update" | "draft";
    strengthen?: Record<string, string>;
    /** URL refs from request — skip lead imageId hard block when >= 1 */
    referenceUrlCount?: number;
    /**
     * compose = write prompt only (never hard-block on missing look);
     * generate = spend vendor quota (lead/ref gates apply).
     */
    purpose?: "compose" | "generate";
  },
): Promise<ComposeStillContext> {
  const project = await db("o_project")
    .where({ id: input.projectId })
    .select("artStyle", "videoRatio", "imageQuality")
    .first();

  const purpose = input.purpose ?? "generate";
  const refCount = input.referenceUrlCount ?? 0;
  const ctx: ComposeStillContext = {
    rawPrompt: input.rawPrompt ?? "",
    artStyle: project?.artStyle ?? null,
    videoRatio: project?.videoRatio ?? null,
    qualityMode: input.qualityMode ?? "hq_update",
    strengthen: input.strengthen ?? null,
    // Compose path must succeed with literary description even when looks missing
    requireLeadAssetImage: purpose === "compose" ? false : refCount < 1,
    referenceUrlCount: refCount,
    sceneCode: null,
    dialogueBeat: null,
    dialogueSpeakers: null,
  };

  if (!input.storyboardId) return ctx;

  const sb = await db("o_storyboard").where({ id: input.storyboardId }).first();
  if (!sb) return ctx;

  ctx.promptFromStoryboard = sb.prompt ?? null;
  ctx.videoDesc = sb.videoDesc ?? null;
  ctx.emotion = sb.emotion ?? null;
  ctx.spatialRelation = sb.spatialRelation ?? null;

  const scriptId = input.scriptId ?? sb.scriptId;
  if (scriptId) {
    try {
      const { shot, idx, pkg } = await resolvePackageShot(db, input.projectId, scriptId, input.storyboardId);
      if (pkg && input.storyboardId) {
        try {
          const compiled = getCompiledPromptForStoryboard(pkg, input.storyboardId, "image");
          if (compiled?.trim()) {
            ctx.compiledImagePrompt = compiled.trim();
          }
        } catch {
          /* compiled optional */
        }
      }
      if (shot) {
        ctx.visualDescription = (shot.visualDescription as string) ?? ctx.visualDescription ?? null;
        if (!ctx.compiledImagePrompt) {
          const gen = shot.generation as { imagePrompt?: string } | undefined;
          if (gen?.imagePrompt?.trim()) ctx.compiledImagePrompt = gen.imagePrompt.trim();
        }
        ctx.shotSize =
          (shot.shotSize as string) ??
          ((shot.narrative as { shotSize?: string } | undefined)?.shotSize) ??
          null;
        const sd = shot.shotDesign as { composition?: { foreground?: string; background?: string } } | undefined;
        ctx.foreground = sd?.composition?.foreground ?? null;
        ctx.background = sd?.composition?.background ?? null;
        ctx.microExpression = digMicro(shot);
        ctx.splitHint = (shot.splitHint as string) ?? null;
        ctx.reactionAction =
          (shot.reactionAction as string) ??
          ((shot.narrative as { reactionAction?: string } | undefined)?.reactionAction) ??
          null;
        const dial = (shot.narrative as { dialogue?: { lines?: { speaker?: string }[] } } | undefined)?.dialogue;
        ctx.dialogueDominantSpeaker = Boolean(dial?.lines?.length);
        ctx.dialogueBeat = dialogueBeatFromShot(shot);
        ctx.dialogueSpeakers = [
          ...new Set((dial?.lines ?? []).map((l) => String(l.speaker ?? "").trim()).filter(Boolean)),
        ];
        ctx.sceneCode =
          (shot.sceneCode as string) ??
          ((shot as { sceneName?: string }).sceneName ? String((shot as { sceneName?: string }).sceneName) : null);
        if (idx > 0 && pkg?.shots?.[idx - 1]) {
          const prev = pkg.shots[idx - 1] as unknown as Record<string, unknown>;
          ctx.neighborShotSize =
            (prev.shotSize as string) ??
            ((prev.narrative as { shotSize?: string } | undefined)?.shotSize) ??
            null;
          try {
            const { buildCrossShotContinuityInject } = await import("../qc/crossShotContinuity");
            const cont = String(
              (shot.narrative as { continuityFrom?: string } | undefined)?.continuityFrom ?? "",
            );
            const inj = buildCrossShotContinuityInject({
              continuityFrom: cont,
              neighborShotSize: ctx.neighborShotSize,
              neighborStillPresent: true,
            });
            if (inj.promptFragment) {
              ctx.continuityInject = inj.promptFragment;
            }
          } catch {
            /* optional */
          }
        }
      }
    } catch {
      /* package optional */
    }
  }

  const assetRows = await db("o_assets2Storyboard").where({ storyboardId: input.storyboardId }).select("assetId");
  const assetIds = assetRows.map((r: { assetId: number }) => r.assetId).filter(Boolean);
  if (assetIds.length) {
    const assets = await db("o_assets")
      .whereIn("id", assetIds)
      .select("id", "name", "remark", "imageId", "type", "describe");
    const chars: ComposeStillCharHint[] = [];
    const scenes: ComposeStillCharHint[] = [];
    for (const a of assets as Array<{
      id: number;
      name?: string;
      remark?: string;
      imageId?: number;
      type?: string;
      describe?: string;
    }>) {
      const m = String(a.remark ?? "").match(/(?:assetCode|charCode):([A-Za-z]+-[A-Za-z0-9]+)/i);
      const code = m?.[1]?.toUpperCase();
      const isScene =
        a.type === "scene" || /^SCENE-/i.test(code ?? "") || /scene|场景/i.test(a.type ?? "");
      const isChar =
        !isScene &&
        (a.type === "role" || a.type === "character" || !a.type || /^CHAR-/i.test(code ?? ""));
      if (isScene) {
        if (code && !ctx.sceneCode) ctx.sceneCode = code;
        scenes.push({
          code,
          name: a.name,
          tier: "support",
          hasImage: a.imageId != null && Number(a.imageId) > 0,
          kind: "scene",
        });
        continue;
      }
      if (!isChar) continue;
      const tier = resolveAssetTier({ code, name: a.name });
      chars.push({
        code,
        name: a.name,
        tier,
        personality: extractPersonality(a.remark, a.describe) ?? undefined,
        hasImage: a.imageId != null && Number(a.imageId) > 0,
        kind: "character",
      });
    }
    if (!chars.length) {
      for (const a of assets as Array<{ name?: string; remark?: string; imageId?: number; describe?: string }>) {
        const m = String(a.remark ?? "").match(/(?:assetCode|charCode):(CHAR-[A-Za-z0-9]+)/i);
        if (!m) continue;
        chars.push({
          code: m[1].toUpperCase(),
          name: a.name,
          tier: resolveAssetTier({ code: m[1], name: a.name }),
          personality: extractPersonality(a.remark, a.describe) ?? undefined,
          hasImage: a.imageId != null && Number(a.imageId) > 0,
          kind: "character",
        });
      }
    }
    ctx.characters = chars;
    ctx.sceneAssets = scenes;
    // Count linked look images as soft refs for generate gates when URL count omitted
    if (purpose === "generate" && refCount < 1) {
      const imaged = [...chars, ...scenes].filter((c) => c.hasImage).length;
      if (imaged > 0) {
        ctx.referenceUrlCount = imaged;
        ctx.requireLeadAssetImage = false;
      }
    }
  }

  // Always merge package speakers + description-hit names (even when no linked assets)
  ctx.characters = mergeCharacterHints(ctx.characters ?? [], {
    dialogueSpeakers: ctx.dialogueSpeakers,
    visualDescription: ctx.visualDescription,
    videoDesc: ctx.videoDesc,
  });

  return ctx;
}

function nameKey(n?: string | null): string {
  return String(n ?? "")
    .replace(/\s+/g, "")
    .slice(0, 12);
}

/** Union asset-linked chars with speakers / names found in literary description. */
export function mergeCharacterHints(
  linked: ComposeStillCharHint[],
  extra: {
    dialogueSpeakers?: string[] | null;
    visualDescription?: string | null;
    videoDesc?: string | null;
  },
): ComposeStillCharHint[] {
  const byKey = new Map<string, ComposeStillCharHint>();
  const put = (c: ComposeStillCharHint) => {
    const k = (c.code || "").toUpperCase() || nameKey(c.name);
    if (!k) return;
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, { ...c, kind: c.kind ?? "character" });
      return;
    }
    byKey.set(k, {
      ...prev,
      ...c,
      hasImage: Boolean(prev.hasImage || c.hasImage),
      code: prev.code || c.code,
      name: prev.name || c.name,
      personality: prev.personality || c.personality,
    });
  };
  for (const c of linked) put(c);
  for (const sp of extra.dialogueSpeakers ?? []) {
    if (!sp?.trim()) continue;
    put({ name: sp.trim(), hasImage: false, kind: "character", tier: "support" });
  }
  const blob = `${extra.visualDescription ?? ""}\n${extra.videoDesc ?? ""}`;
  const hits =
    blob.match(/沈[\u4e00-\u9fff]{1,3}|[\u4e00-\u9fff]{1,3}(?:清瓷|清辞|周氏)|沈母|阿母|家母/g) ?? [];
  for (const h of hits) {
    put({ name: h, hasImage: false, kind: "character", tier: "support" });
  }
  // Alias merge: 沈母 ↔ 沈母周氏
  const list = [...byKey.values()];
  const out: ComposeStillCharHint[] = [];
  const used = new Set<string>();
  for (const c of list) {
    const nk = nameKey(c.name);
    if (used.has(nk)) continue;
    const alias = list.find(
      (o) =>
        o !== c &&
        o.name &&
        c.name &&
        (o.name.includes(c.name.slice(0, 2)) || c.name.includes(o.name.slice(0, 2))) &&
        (o.hasImage || c.hasImage),
    );
    if (alias && alias.hasImage && !c.hasImage) {
      out.push({
        ...alias,
        name: alias.name?.length >= (c.name?.length ?? 0) ? alias.name : c.name,
        hasImage: true,
      });
      used.add(nameKey(alias.name));
      used.add(nk);
      continue;
    }
    used.add(nk);
    out.push(c);
  }
  return out;
}

/** Sort reference URLs: role/ paths before scene/ when path hints exist. */
export function orderReferenceUrls(urls: string[]): string[] {
  const score = (u: string) => {
    const p = u.toLowerCase();
    if (/\/role\/|\/character\/|char-/.test(p)) return 0;
    if (/\/scene\/|scene-/.test(p)) return 2;
    return 1;
  };
  return [...urls].filter(Boolean).sort((a, b) => score(a) - score(b));
}

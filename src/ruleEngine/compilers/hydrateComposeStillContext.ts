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
import { normalizeDialogueSpeaker, normalizeDialogueSpeakers } from "./normalizeDialogueSpeaker";

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
  const vd = String(shot?.visualDescription ?? "");
  let mouth = micro.mouthDetail;
  try {
    const { mouthDetailAllowedByVd } =
      require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
    if (mouth && !mouthDetailAllowedByVd(mouth, vd)) mouth = undefined;
  } catch {
    /* optional */
  }
  // XOR: dialogue_native drops closed-mouth from micro string
  const lipSync = String(
    (shot?.shotDesign as { lipSyncPolicy?: string } | undefined)?.lipSyncPolicy ?? "",
  );
  if (lipSync === "dialogue_native" && mouth && /neutral_closed|闭口|抿嘴/.test(mouth)) {
    mouth = undefined;
  }
  return [micro.eyes, mouth].filter(Boolean).join("; ") || null;
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

/** Place / set dressing names must never enter character identity gates. */
export function looksLikeSceneName(name?: string | null): boolean {
  const n = String(name ?? "").trim();
  if (!n) return false;
  if (/^SCENE-/i.test(n)) return true;
  return /厅|府|殿|场景|室内|室外|宫殿|府邸|街|巷|园|庭|厢|堂|楼|阁|寺|庙|营|室|会议室|公寓|车内|会场|走廊|正厅|偏厅/.test(
    n,
  );
}

function assetHasImage(a: { imageId?: number | null; src?: string | null; filePath?: string | null; url?: string | null }): boolean {
  if (a.imageId != null && Number(a.imageId) > 0) return true;
  const path = String(a.src ?? a.filePath ?? a.url ?? "").trim();
  return path.length > 0 && !/^null$/i.test(path);
}

function dialogueBeatFromShot(
  shot: Record<string, unknown> | undefined,
  visualDescription?: string | null,
): string | null {
  const dial = (shot?.narrative as { dialogue?: { lines?: { speaker?: string; text?: string }[] } } | undefined)
    ?.dialogue;
  const lines = dial?.lines ?? [];
  if (!lines.length) return null;
  const desc = String(visualDescription ?? shot?.visualDescription ?? "");
  // Mouth-action shots: do not inject generic lip/gaze beat (conflicts with 咬帕/刺 etc.)
  if (/咬|刺|含|衔|捂嘴|咬唇|咬帕/.test(desc)) return null;
  const micro = (shot?.shotDesign as { performance?: { microExpression?: { mouthDetail?: string } } } | undefined)
    ?.performance?.microExpression;
  const lipSync = String(
    (shot?.shotDesign as { lipSyncPolicy?: string } | undefined)?.lipSyncPolicy ?? "",
  );
  // XOR: dialogue_native must not inject closed-mouth beat
  if (micro?.mouthDetail && !(lipSync === "dialogue_native" && /neutral_closed|闭口|抿嘴/.test(micro.mouthDetail))) {
    const speakers = normalizeDialogueSpeakers(lines.map((l) => l.speaker).filter(Boolean) as string[]);
    const who = speakers.slice(0, 2).join("与") || "角色";
    return `${who}表演：嘴型=${micro.mouthDetail}`;
  }
  // No authored performance — do not invent "嘴部自然微张"
  return null;
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

  // Canvas / no-storyboard: infer SCENE from prompt sref tokens (path parity with batch)
  if (!input.storyboardId) {
    try {
      const { inferSceneCodeFromText } =
        require("./shotModalityIntent") as typeof import("./shotModalityIntent");
      const code = inferSceneCodeFromText(input.rawPrompt);
      if (code) ctx.sceneCode = code;
    } catch {
      /* optional */
    }
    return ctx;
  }

  const sb = await db("o_storyboard").where({ id: input.storyboardId }).first();
  if (!sb) return ctx;

  ctx.promptFromStoryboard = sb.prompt ?? null;
  ctx.videoDesc = sb.videoDesc ?? null;
  ctx.emotion = sb.emotion ?? null;
  ctx.spatialRelation = sb.spatialRelation ?? null;
  ctx.colorTemp = (sb as { colorTemp?: string }).colorTemp ?? null;

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
        const codes = (shot.charCodes as string[] | undefined) ?? [];
        if (codes.length) (ctx as { shotCharCodes?: string[] }).shotCharCodes = codes.map((c) => String(c).toUpperCase());
        if (
          (shot as { _forceComposeParity?: boolean })._forceComposeParity ||
          (shot as { _forceRefsDelta?: boolean })._forceRefsDelta ||
          (shot as { _litEnhanceApplied?: boolean })._litEnhanceApplied
        ) {
          (ctx as { _forceComposeParity?: boolean; _forceRefsDelta?: boolean; _litEnhanceApplied?: boolean })._forceComposeParity =
            true;
          (ctx as { _forceRefsDelta?: boolean })._forceRefsDelta = true;
          (ctx as { _litEnhanceApplied?: boolean })._litEnhanceApplied = Boolean(
            (shot as { _litEnhanceApplied?: boolean })._litEnhanceApplied,
          );
        }
        if (!ctx.compiledImagePrompt) {
          const gen = shot.generation as { imagePrompt?: string } | undefined;
          if (gen?.imagePrompt?.trim()) ctx.compiledImagePrompt = gen.imagePrompt.trim();
        }
        ctx.shotSize =
          (shot.shotSize as string) ??
          ((shot.narrative as { shotSize?: string } | undefined)?.shotSize) ??
          null;
        const sd = shot.shotDesign as {
          composition?: { foreground?: string; background?: string };
          cameraAnchor?: { shotSize?: string; bgBlur?: boolean; colorTemp?: string };
          lipSyncPolicy?: string;
        } | undefined;
        ctx.foreground = sd?.composition?.foreground ?? null;
        ctx.background = sd?.composition?.background ?? null;
        // P0: full shotDesign into compose — episodeShot + cameraAnchor
        ctx.episodeShot = shot;
        const cam = sd?.cameraAnchor;
        if (cam?.shotSize && !ctx.shotSize) ctx.shotSize = String(cam.shotSize);
        else if (cam?.shotSize && ctx.shotSize) {
          // Prefer cameraAnchor when top-level missing MS/CU cue
          if (!/MS|CU|中景|近景|特写|全景|远景/i.test(String(ctx.shotSize))) {
            ctx.shotSize = String(cam.shotSize);
          }
        }
        if (typeof cam?.bgBlur === "boolean") {
          (ctx as { bgBlur?: boolean }).bgBlur = cam.bgBlur;
        }
        if (cam?.colorTemp && !ctx.colorTemp) {
          ctx.colorTemp = String(cam.colorTemp);
        }
        if (sd?.lipSyncPolicy) {
          (ctx as { lipSyncPolicy?: string }).lipSyncPolicy = String(sd.lipSyncPolicy);
        }
        // Extract sample atoms (current shot only — not neighbor lexicon)
        try {
          const { extractShotDesignSample } = await import("../design/shotDesignSample");
          const sample = extractShotDesignSample(shot);
          (ctx as { shotDesignSample?: typeof sample }).shotDesignSample = sample;
        } catch {
          /* optional */
        }
        ctx.microExpression = digMicro(shot);
        ctx.splitHint = (shot.splitHint as string) ?? null;
        ctx.reactionAction =
          (shot.reactionAction as string) ??
          ((shot.narrative as { reactionAction?: string } | undefined)?.reactionAction) ??
          null;
        const dial = (shot.narrative as { dialogue?: { lines?: { speaker?: string }[] } } | undefined)?.dialogue;
        const speakers = (dial?.lines ?? []).map((l) => String(l.speaker ?? "").trim()).filter(Boolean);
        ctx.dialogueDominantSpeaker = speakers[0] || (speakers.length ? true : null);
        ctx.dialogueBeat = dialogueBeatFromShot(shot, ctx.visualDescription);
        ctx.dialogueSpeakers = normalizeDialogueSpeakers(speakers);
        ctx.sceneCode =
          (shot.sceneCode as string) ??
          ((shot as { sceneName?: string }).sceneName ? String((shot as { sceneName?: string }).sceneName) : null);
        const narrSpatial = (shot.narrative as { spatialRelation?: string } | undefined)?.spatialRelation;
        if (!ctx.spatialRelation && narrSpatial) ctx.spatialRelation = narrSpatial;
        if (!ctx.colorTemp) {
          ctx.colorTemp =
            ((shot as { colorTemp?: string }).colorTemp ??
              (shot.narrative as { colorTemp?: string } | undefined)?.colorTemp ??
              null) as string | null;
        }
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
        // Episode VD lexicon: neighbor ±3 shots (exclude current) for action-primary harvest
        if (pkg?.shots?.length) {
          const win: string[] = [];
          const lo = Math.max(0, idx - 3);
          const hi = Math.min(pkg.shots.length - 1, idx + 3);
          for (let i = lo; i <= hi; i++) {
            if (i === idx) continue;
            const vd = String((pkg.shots[i] as { visualDescription?: string })?.visualDescription ?? "").trim();
            if (vd.length >= 4) win.push(vd);
          }
          if (win.length) ctx.episodeVisualDescriptions = win.slice(0, 12);
        }
      }
    } catch {
      /* package optional */
    }
    try {
      const agentRow = await db("o_agentWorkData").where({ projectId: input.projectId, key: "scriptAgent" }).first();
      const plan = agentRow?.data ? JSON.parse(String(agentRow.data)) : {};
      const pd = ((plan as { planData?: Record<string, unknown> }).planData ?? plan) as Record<string, unknown>;
      const vlt =
        (pd.visualLockTable as { sceneColorLock?: ComposeStillContext["sceneColorLock"] } | undefined) ??
        ((plan as { visualLockTable?: { sceneColorLock?: ComposeStillContext["sceneColorLock"] } }).visualLockTable);
      if (vlt?.sceneColorLock) ctx.sceneColorLock = vlt.sceneColorLock;
    } catch {
      /* sceneColorLock optional */
    }
  }

  const assetRows = await db("o_assets2Storyboard").where({ storyboardId: input.storyboardId }).select("assetId");
  const assetIds = assetRows.map((r: { assetId: number }) => r.assetId).filter(Boolean);
  if (assetIds.length) {
    const assets = await db("o_assets")
      .leftJoin("o_image", "o_image.id", "o_assets.imageId")
      .whereIn("o_assets.id", assetIds)
      .select(
        "o_assets.id",
        "o_assets.name",
        "o_assets.remark",
        "o_assets.imageId",
        "o_assets.type",
        "o_assets.describe",
        "o_image.filePath",
      );
    const chars: ComposeStillCharHint[] = [];
    const scenes: ComposeStillCharHint[] = [];
    for (const a of assets as Array<{
      id: number;
      name?: string;
      remark?: string;
      imageId?: number;
      type?: string;
      describe?: string;
      filePath?: string | null;
    }>) {
      const m = String(a.remark ?? "").match(/(?:assetCode|charCode):([A-Za-z]+-[A-Za-z0-9]+)/i);
      const code = m?.[1]?.toUpperCase();
      const isScene =
        a.type === "scene" ||
        /^SCENE-/i.test(code ?? "") ||
        /scene|场景/i.test(a.type ?? "") ||
        looksLikeSceneName(a.name);
      const isChar =
        !isScene &&
        (a.type === "role" || a.type === "character" || !a.type || /^CHAR-/i.test(code ?? ""));
      const hasImg = assetHasImage({ imageId: a.imageId, filePath: a.filePath });
      if (isScene) {
        if (code && !ctx.sceneCode) ctx.sceneCode = code;
        scenes.push({
          code,
          name: a.name,
          tier: "support",
          hasImage: hasImg,
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
        hasImage: hasImg,
        kind: "character",
      });
    }
    if (!chars.length) {
      for (const a of assets as Array<{
        name?: string;
        remark?: string;
        imageId?: number;
        describe?: string;
        filePath?: string | null;
      }>) {
        if (looksLikeSceneName(a.name)) continue;
        const m = String(a.remark ?? "").match(/(?:assetCode|charCode):(CHAR-[A-Za-z0-9]+)/i);
        if (!m) continue;
        chars.push({
          code: m[1].toUpperCase(),
          name: a.name,
          tier: resolveAssetTier({ code: m[1], name: a.name }),
          personality: extractPersonality(a.remark, a.describe) ?? undefined,
          hasImage: assetHasImage({ imageId: a.imageId, filePath: a.filePath }),
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
  let knownNames: string[] = (ctx.characters ?? []).map((c) => String(c.name ?? "").trim()).filter((n) => n.length >= 2);
  let nameToCodes: Record<string, string[]> = {};
  for (const c of ctx.characters ?? []) {
    const n = String(c.name ?? "").trim();
    const code = String(c.code ?? "").trim();
    if (n && code) (nameToCodes[n] ??= []).push(code);
  }
  // Expand casting pool from project script assets (CD / seeded roles)
  try {
    if (scriptId) {
      const scriptAssets = await db("o_scriptAssets")
        .where({ scriptId })
        .select("assetId");
      const ids = scriptAssets.map((r: { assetId: number }) => r.assetId).filter(Boolean);
      if (ids.length) {
        const rows = await db("o_assets").whereIn("id", ids).select("name", "remark", "type");
        for (const a of rows as Array<{ name?: string; remark?: string; type?: string }>) {
          if (looksLikeSceneName(a.name) || a.type === "scene") continue;
          const name = String(a.name ?? "")
            .replace(/（OS）|\(OS\)/g, "")
            .trim();
          const m = String(a.remark ?? "").match(/(?:assetCode|charCode):([A-Za-z]+-[A-Za-z0-9]+)/i);
          const code = m?.[1]?.toUpperCase() ?? "";
          if (name.length >= 2) {
            knownNames.push(name);
            if (code) (nameToCodes[name] ??= []).push(code);
          }
        }
      }
    }
  } catch {
    /* optional CD pool */
  }
  knownNames = [...new Set(knownNames)];
  ctx.characters = mergeCharacterHints(ctx.characters ?? [], {
    dialogueSpeakers: ctx.dialogueSpeakers,
    visualDescription: ctx.visualDescription,
    videoDesc: ctx.videoDesc,
    knownNames,
    nameToCodes,
  });

  // bgFragment / skirt-blur: demote non-lead linked cref so secondary face does not steal slots.
  // No secondary asset is a legal path — never treat missing support plate as identity debt.
  try {
    const { resolveBgFragment, pickVdLiteraryPrimary } =
      require("./stillFirstFrameLiterarySsot") as typeof import("./stillFirstFrameLiterarySsot");
    const frag = resolveBgFragment({
      visualDescription: ctx.visualDescription,
      background: ctx.background,
      imagePrompt: ctx.compiledImagePrompt,
      spatialRelation: ctx.spatialRelation,
    });
    if (frag.stripFullSecondary && ctx.characters?.length) {
      const names = ctx.characters.map((c) => String(c.name ?? "")).filter(Boolean);
      const lead = pickVdLiteraryPrimary(ctx.visualDescription, names);
      const shotCodes = ((ctx as { shotCharCodes?: string[] }).shotCharCodes ?? []).map((c) =>
        c.toUpperCase(),
      );
      // Single primary code only when cast has exactly one CHAR — never "any code in shot ⇒ lead"
      const soleCode = shotCodes.length === 1 ? shotCodes[0] : "";
      ctx.characters = ctx.characters.map((c) => {
        const n = String(c.name ?? "");
        const code = String(c.code ?? "").toUpperCase();
        const isLead =
          c.tier === "lead" ||
          (lead && (n === lead || n.includes(lead) || lead.includes(n))) ||
          (Boolean(soleCode) && code === soleCode);
        if (
          !isLead &&
          (frag.kind === "skirt_blur" || frag.kind === "body_fragment" || frag.kind === "sleeve_blur")
        ) {
          // Force demote even when hasImage was false (normalize tier); strip plate when present
          return { ...c, hasImage: false, tier: "support" as const };
        }
        return c;
      });
      (ctx as { bgFragmentDemoted?: boolean }).bgFragmentDemoted = true;
      (ctx as { secondaryAssetOptional?: boolean }).secondaryAssetOptional = true;
    }
  } catch {
    /* optional */
  }

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
    knownNames?: string[] | null;
    nameToCodes?: Record<string, string[]> | null;
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
  for (const c of linked) {
    if (c.kind === "scene" || looksLikeSceneName(c.name)) {
      put({ ...c, kind: "scene" });
      continue;
    }
    put(c);
  }
  for (const sp of normalizeDialogueSpeakers(extra.dialogueSpeakers)) {
    if (!sp || looksLikeSceneName(sp)) continue;
    put({ name: sp, hasImage: false, kind: "character", tier: "support" });
  }
  // Smart bind against casting pool only — never free NER invent (禁剥名；无码保留名)
  const poolNames = [
    ...(extra.knownNames ?? []),
    ...linked.map((c) => String(c.name ?? "").trim()).filter((n) => n.length >= 2),
    ...normalizeDialogueSpeakers(extra.dialogueSpeakers),
  ];
  const poolCodes: Record<string, string[]> = { ...(extra.nameToCodes ?? {}) };
  for (const c of linked) {
    const n = String(c.name ?? "").trim();
    const code = String(c.code ?? "").trim();
    if (n && code) (poolCodes[n] ??= []).push(code);
  }
  if (poolNames.length || String(extra.visualDescription ?? "").trim()) {
    try {
      const { matchDescNamesToCasting } =
        require("../quality/matchDescNamesToCasting") as typeof import("../quality/matchDescNamesToCasting");
      const { extractMentionedNames } =
        require("../quality/shotQualityPredicates") as typeof import("../quality/shotQualityPredicates");
      const blob = `${extra.visualDescription ?? ""}\n${extra.videoDesc ?? ""}`;
      const matched = matchDescNamesToCasting({
        visualDescription: blob,
        knownNames: poolNames,
        nameToCodes: poolCodes,
      });
      for (const b of matched.bound) {
        put({
          name: b.name,
          code: b.code,
          hasImage: linked.some((c) => c.code === b.code && c.hasImage),
          kind: "character",
          tier: "support",
        });
      }
      // Casting-first: known names only — never free-NER invent into still pool
      for (const name of extractMentionedNames(blob, poolNames)) {
        const codes = poolCodes[name] ?? [];
        if (codes.length === 1) {
          put({
            name,
            code: codes[0],
            hasImage: linked.some((c) => c.code === codes[0] && c.hasImage),
            kind: "character",
            tier: "support",
          });
        } else {
          put({ name, hasImage: false, kind: "character", tier: "support" });
        }
      }
    } catch {
      /* optional */
    }
  }
  // Alias merge: 沈母 ↔ 沈母周氏 only (proper-prefix). NEVER 沈清瓷↔沈清漪 via「沈清」.
  const { toBareCastingName, stripToCastingName } = require("./stillIdentitySsot") as typeof import("./stillIdentitySsot");
  const { namesAreProperPrefixAlias } =
    require("./resolveShotIdentityBinding") as typeof import("./resolveShotIdentityBinding");
  const list = [...byKey.values()]
    .filter((c) => c.kind !== "scene" && !looksLikeSceneName(c.name))
    .map((c) => {
      const bare = toBareCastingName(c.name);
      const castingPool = [...byKey.values()]
        .map((x) => toBareCastingName(x.name))
        .filter((n) => n.length >= 2);
      const glued = bare && castingPool.length ? stripToCastingName(bare, castingPool) : bare;
      return { ...c, name: glued || bare || c.name, kind: "character" as const };
    });
  const out: ComposeStillCharHint[] = [];
  const used = new Set<string>();
  for (const c of list) {
    const nk = nameKey(c.name);
    if (used.has(nk)) continue;
    // Same CHAR code → merge; else only proper-prefix alias (沈母⊂沈母周氏)
    const alias = list.find((o) => {
      if (o === c || !o.name || !c.name) return false;
      if (!(o.hasImage || c.hasImage)) return false;
      const sameCode =
        Boolean(o.code && c.code && String(o.code).toUpperCase() === String(c.code).toUpperCase());
      if (sameCode) return true;
      if (o.code && c.code && String(o.code).toUpperCase() !== String(c.code).toUpperCase()) {
        return false; // distinct CHAR codes never collapse
      }
      return namesAreProperPrefixAlias(o.name, c.name);
    });
    if (alias && alias.hasImage && !c.hasImage) {
      out.push({
        ...alias,
        name: alias.name?.length >= (c.name?.length ?? 0) ? alias.name : c.name,
        hasImage: true,
        kind: "character",
      });
      used.add(nameKey(alias.name));
      used.add(nk);
      continue;
    }
    used.add(nk);
    out.push({ ...c, kind: "character" });
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

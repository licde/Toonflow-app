/**
 * VisBeat L0 policy — tags × shotSize conflict matrix (law).
 * Pattern lists are NOT used for BLOCK; see visualBeatSuggestor.
 */
import { readFixtureJson } from "../utils/fixturesPath";

export type VisBeatMode = "off" | "shadow" | "enforce";

export type ConflictRow = {
  id: string;
  whenTagsAny?: string[];
  whenTagsAll?: string[];
  whenShotSizeCanon?: string[];
  action: "must_split" | "ok" | "warn";
  template?: string;
  explain: string;
};

export type VisualBeatVocab = {
  version?: string;
  tags: string[];
  shotSizeCanon: Record<string, string>;
  faceOnlyCanon: string[];
  purposeToTags: Record<string, string[]>;
  conflict_matrix: ConflictRow[];
  splitTemplates?: Record<
    string,
    { beats: Array<{ role: string; shotSize: string; hasDialogue?: boolean; tags?: string[] }> }
  >;
  compat?: {
    weaponSupersedesVisual?: string[];
    seatingHardSkipsVisualMulti?: boolean;
    osVoKeepsDialogueOnSpeakOnly?: boolean;
  };
  tagMutexGroups?: string[][];
  explainI18n?: Record<string, { zh?: string; en?: string }>;
  suggestorPatterns?: Record<string, string[]>;
  rollout?: { metaKey?: string; defaultMode?: VisBeatMode; modes?: VisBeatMode[]; canaryPercentMetaKey?: string };
};

const FALLBACK: VisualBeatVocab = {
  tags: ["reveal", "prop_insert", "reaction", "face_cu", "establish", "action", "speak", "os_vo"],
  shotSizeCanon: {
    ecu: "face_cu",
    cu: "face_cu",
    特写: "face_cu",
    大特写: "face_cu",
    近景: "近景",
    中景: "中景",
  },
  faceOnlyCanon: ["face_cu"],
  purposeToTags: {
    信息: ["reveal"],
    钩子: ["reveal", "prop_insert"],
    反应: ["reaction"],
    共鸣: ["reaction"],
    爆点兑现: ["action", "reveal"],
  },
  conflict_matrix: [
    {
      id: "reveal_face_cu",
      whenTagsAny: ["reveal", "prop_insert"],
      whenShotSizeCanon: ["face_cu"],
      action: "must_split",
      template: "reveal_then_reaction",
      explain: "揭示/道具插入与纯脸特写同镜冲突，须拆为 insert→reaction",
    },
  ],
  rollout: { metaKey: "pillarsVisBeatV2", defaultMode: "shadow", modes: ["off", "shadow", "enforce"] },
};

export function loadVisualBeatVocab(): VisualBeatVocab {
  const raw = readFixtureJson<Partial<VisualBeatVocab>>("visual_beat_vocab.json", FALLBACK);
  return {
    ...FALLBACK,
    ...raw,
    shotSizeCanon: { ...FALLBACK.shotSizeCanon, ...(raw.shotSizeCanon ?? {}) },
    purposeToTags: { ...FALLBACK.purposeToTags, ...(raw.purposeToTags ?? {}) },
    conflict_matrix: raw.conflict_matrix?.length ? raw.conflict_matrix : FALLBACK.conflict_matrix,
    faceOnlyCanon: raw.faceOnlyCanon?.length ? raw.faceOnlyCanon : FALLBACK.faceOnlyCanon,
    tags: raw.tags?.length ? raw.tags : FALLBACK.tags,
    rollout: { ...FALLBACK.rollout, ...(raw.rollout ?? {}) },
  };
}

export function canonicalizeShotSize(shotSize?: string | null, vocab?: VisualBeatVocab): string | null {
  const v = vocab ?? loadVisualBeatVocab();
  const raw = String(shotSize ?? "").trim();
  if (!raw) return null;
  if (v.shotSizeCanon[raw]) return v.shotSizeCanon[raw];
  const lower = raw.toLowerCase();
  if (v.shotSizeCanon[lower]) return v.shotSizeCanon[lower];
  if (/ecu|特写|大特/.test(lower) || lower === "cu") return "face_cu";
  return raw;
}

export function defaultTagsFromPurpose(purpose?: string | null, vocab?: VisualBeatVocab): string[] {
  const v = vocab ?? loadVisualBeatVocab();
  const p = String(purpose ?? "").trim();
  if (!p) return [];
  return [...(v.purposeToTags[p] ?? [])];
}

export function normalizeVisualBeatTags(tags: unknown, vocab?: VisualBeatVocab): string[] {
  const v = vocab ?? loadVisualBeatVocab();
  const allow = new Set(v.tags);
  const list = Array.isArray(tags) ? tags : [];
  return [
    ...new Set(
      list
        .map((t) => String(t ?? "").trim())
        .filter((t) => t && allow.has(t)),
    ),
  ];
}

export type VisBeatEval = {
  ok: boolean;
  action: "ok" | "must_split" | "warn" | "tag_missing" | "tag_inconsistent" | "off";
  matrixRowId?: string;
  explain?: string;
  template?: string;
  tags: string[];
  shotSizeCanon: string | null;
  mode: VisBeatMode;
};

export function resolveVisBeatMode(meta?: Record<string, unknown> | null, vocab?: VisualBeatVocab): VisBeatMode {
  const v = vocab ?? loadVisualBeatVocab();
  const key = v.rollout?.metaKey || "pillarsVisBeatV2";
  const raw = meta?.[key] ?? process.env.PILLARS_VIS_BEAT_V2 ?? v.rollout?.defaultMode ?? "shadow";
  let mode = String(raw).toLowerCase() as VisBeatMode;
  if (mode !== "off" && mode !== "shadow" && mode !== "enforce") mode = "shadow";
  // Canary: percent of projects that stay on enforce; rest soft-fall to shadow
  if (mode === "enforce") {
    const canary = Number(
      meta?.pillarsVisBeatCanaryPercent ?? process.env.PILLARS_VIS_BEAT_CANARY ?? 100,
    );
    const salt = Math.abs(Number(meta?.projectId ?? meta?.canarySalt ?? 0)) % 100;
    if (Number.isFinite(canary) && canary < 100 && salt >= canary) mode = "shadow";
  }
  return mode;
}

/** Migrate suggestedTags → L0 only when confirmed; otherwise flag must-edit. Never invent tags. */
export function migrateShotVisualBeatTags(
  shot: Record<string, unknown>,
  opts?: { confirmSuggested?: boolean; vocab?: VisualBeatVocab },
): Record<string, unknown> {
  const vocab = opts?.vocab ?? loadVisualBeatVocab();
  const existing = normalizeVisualBeatTags(shot.visualBeatTags, vocab);
  if (existing.length) {
    const { visBeatNeedsTagConfirm: _drop, ...rest } = shot as Record<string, unknown> & {
      visBeatNeedsTagConfirm?: boolean;
    };
    void _drop;
    return rest;
  }
  const suggested = normalizeVisualBeatTags(shot.suggestedVisualBeatTags, vocab);
  if (!suggested.length) return shot;
  if (opts?.confirmSuggested) {
    return {
      ...shot,
      visualBeatTags: suggested,
      suggestedVisualBeatTags: undefined,
      visBeatMigrated: true,
      visBeatNeedsTagConfirm: undefined,
    };
  }
  return { ...shot, visBeatNeedsTagConfirm: true };
}

export function evaluateVisBeatConflict(input: {
  visualBeatTags?: unknown;
  shotSize?: string | null;
  purpose?: string | null;
  picture?: string | null;
  weaponId?: string | null;
  seatingHard?: boolean | null;
  requireTags?: boolean;
  meta?: Record<string, unknown> | null;
  vocab?: VisualBeatVocab;
}): VisBeatEval {
  const vocab = input.vocab ?? loadVisualBeatVocab();
  const mode = resolveVisBeatMode(input.meta, vocab);
  if (mode === "off") {
    return { ok: true, action: "off", tags: [], shotSizeCanon: null, mode };
  }

  const weapon = String(input.weaponId ?? "");
  if (weapon && (vocab.compat?.weaponSupersedesVisual ?? []).includes(weapon)) {
    return {
      ok: true,
      action: "ok",
      tags: normalizeVisualBeatTags(input.visualBeatTags, vocab),
      shotSizeCanon: canonicalizeShotSize(input.shotSize, vocab),
      mode,
      explain: `weapon ${weapon} supersedes visual_multi`,
      matrixRowId: "compat.weapon",
    };
  }

  if (input.seatingHard && vocab.compat?.seatingHardSkipsVisualMulti) {
    return {
      ok: true,
      action: "ok",
      tags: normalizeVisualBeatTags(input.visualBeatTags, vocab),
      shotSizeCanon: canonicalizeShotSize(input.shotSize, vocab),
      mode,
      explain: "seatingHard skips visual_multi",
      matrixRowId: "compat.seating",
    };
  }

  let tags = normalizeVisualBeatTags(input.visualBeatTags, vocab);
  if (!tags.length && input.purpose) {
    tags = defaultTagsFromPurpose(input.purpose, vocab);
  }
  const shotSizeCanon = canonicalizeShotSize(input.shotSize, vocab);
  const hasPicture = Boolean(String(input.picture ?? "").trim());

  if (input.requireTags && !tags.length && (hasPicture || input.shotSize)) {
    return {
      ok: mode !== "enforce",
      action: "tag_missing",
      tags,
      shotSizeCanon,
      mode,
      matrixRowId: "VIS-TAG-MISSING",
      explain: resolveExplain("VIS-TAG-MISSING", "有画面/景别但缺少 visualBeatTags（L0）", vocab),
    };
  }

  for (const group of vocab.tagMutexGroups ?? []) {
    const hit = group.filter((t) => tags.includes(t));
    if (hit.length >= 2) {
      return {
        ok: mode !== "enforce",
        action: "tag_inconsistent",
        tags,
        shotSizeCanon,
        mode,
        matrixRowId: "VIS-TAG-INCONSISTENT",
        explain: resolveExplain(
          "VIS-TAG-INCONSISTENT",
          `标签互斥同镜：${hit.join("+")}`,
          vocab,
        ),
      };
    }
  }

  // Partial multi-beat: reveal without prop_insert on face_cu is matrix; tags without picture
  if (tags.length && !hasPicture && input.requireTags) {
    return {
      ok: mode !== "enforce",
      action: "tag_inconsistent",
      tags,
      shotSizeCanon,
      mode,
      matrixRowId: "VIS-TAG-INCONSISTENT",
      explain: resolveExplain("VIS-TAG-INCONSISTENT", "已打 visualBeatTags 但 picture/描写为空", vocab),
    };
  }

  for (const row of vocab.conflict_matrix) {
    const anyOk =
      !row.whenTagsAny?.length || row.whenTagsAny.some((t) => tags.includes(t));
    const allOk =
      !row.whenTagsAll?.length || row.whenTagsAll.every((t) => tags.includes(t));
    const sizeOk =
      !row.whenShotSizeCanon?.length ||
      (shotSizeCanon != null && row.whenShotSizeCanon.includes(shotSizeCanon));
    if (!anyOk || !allOk || !sizeOk) continue;
    if (row.action === "must_split") {
      return {
        ok: mode !== "enforce",
        action: "must_split",
        matrixRowId: row.id,
        explain: resolveExplain(row.id, row.explain, vocab),
        template: row.template,
        tags,
        shotSizeCanon,
        mode,
      };
    }
    if (row.action === "warn") {
      return {
        ok: true,
        action: "warn",
        matrixRowId: row.id,
        explain: resolveExplain(row.id, row.explain, vocab),
        tags,
        shotSizeCanon,
        mode,
      };
    }
  }

  return { ok: true, action: "ok", tags, shotSizeCanon, mode };
}

function resolveExplain(id: string, fallback: string, vocab: VisualBeatVocab, locale: "zh" | "en" = "zh"): string {
  return vocab.explainI18n?.[id]?.[locale] ?? fallback;
}

/** Batch migrate suggested→needsConfirm for historical packs. */
export function migratePackVisualBeatTags(
  shots: Record<string, unknown>[],
  opts?: { confirmSuggested?: boolean; vocab?: VisualBeatVocab },
): { shots: Record<string, unknown>[]; needsConfirm: number; migrated: number } {
  let needsConfirm = 0;
  let migrated = 0;
  const out = shots.map((s) => {
    const next = migrateShotVisualBeatTags(s, opts);
    if (next.visBeatNeedsTagConfirm) needsConfirm++;
    if (next.visBeatMigrated) migrated++;
    return next;
  });
  return { shots: out, needsConfirm, migrated };
}

export function explainVisBeat(evalResult: VisBeatEval, locale: "zh" | "en" = "zh"): string {
  if (evalResult.action === "off" || evalResult.action === "ok") return "";
  const id = evalResult.matrixRowId ? `[${evalResult.matrixRowId}] ` : "";
  if (locale === "en") {
    const en: Record<string, string> = {
      must_split: "must split shot (tag × shotSize conflict)",
      tag_missing: "missing visualBeatTags (L0)",
      tag_inconsistent: "tags set but picture empty or mutually exclusive",
      warn: "warning",
    };
    return `${id}${en[evalResult.action] ?? evalResult.explain ?? evalResult.action}`;
  }
  return `${id}${evalResult.explain ?? evalResult.action}`;
}

/** Same copy for gate / RH / dryRun — SSOT via matrixRowId + explain. */
export function visBeatExplainTriple(ev: VisBeatEval): { matrixRowId?: string; explain: string; chatLine: string } {
  const explain = explainVisBeat(ev);
  return {
    matrixRowId: ev.matrixRowId,
    explain,
    chatLine: explain
      ? `${explain}｜允许 tags：${loadVisualBeatVocab().tags.join(",")}`
      : "",
  };
}

/**
 * Resolve the storyboard panel that owns a video track (o_storyboard.trackId → track).
 * Never use hydrated.storyboard[0] blindly — that caused 镜2→镜1 content.
 *
 * Fallbacks when trackId is orphan (re-sync created new tracks, UI still holds old id):
 * 1) info storyboard ids from the request
 * 2) caller may then match package by storyboardId
 */
import type { Knex } from "knex";

export type TrackStoryboardRow = {
  id: number;
  index?: number | null;
  trackId?: number | null;
  track?: string | number | null;
  videoDesc?: string | null;
  prompt?: string | null;
  duration?: string | number | null;
  audioPrompt?: string | null;
  fxPrompt?: string | null;
  shotSize?: string | null;
  reason?: string | null;
};

const MOTION_TEMPLATE_NOISE =
  /\b(?:static|duration|subtle\s+mouth\s+movement|motion-from-frame|speaking\s+lip-sync|gentle\s+push|slow\s+pan|slow\s+push)\b/gi;

/** Strip still-compose / identity shells that must not enter video Visual. */
const STILL_COMPOSE_NOISE =
  /场面硬约束[：:][^。\n]*/g;

/** Strip identity shells + motion-template + still-compose noise; leftover CJK ≈ literary body. */
export function peelLiteraryBody(text: string): string {
  return String(text ?? "")
    .replace(/锁定脸型身份|禁止夸张(?:改脸|改面容身份)?|无字幕无水印无Logo|表情细节属分镜静帧/g, " ")
    .replace(MOTION_TEMPLATE_NOISE, " ")
    .replace(/时长\s*\d+\s*s/gi, " ")
    .replace(/duration\s*\d+\s*s/gi, " ")
    .replace(STILL_COMPOSE_NOISE, " ")
    .replace(/背景弱化[：:][^。\n]*/g, " ")
    .replace(/必须出现[：:][^。\n]*/g, " ")
    .replace(/景别[：:][^。\n]*/g, " ")
    .replace(/锁定角色定妆[^。\n]*/g, " ")
    .replace(/竖屏9:16[^。\n]*/g, " ")
    .replace(/出镜人数[：:][^。\n]*/g, " ")
    .replace(/本镜只出[^。\n]*/g, " ")
    .replace(/禁止同帧[^。\n]*/g, " ")
    .replace(/高细节视频首帧[^。\n]*/g, " ")
    .replace(/浅景深背景虚化[^。\n]*/g, " ")
    .replace(/场景参考不送像素[^。\n]*/g, " ")
    .replace(/人物与构图优先[^。\n]*/g, " ")
    .replace(/,\s*FX:[^,\n]*/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/[，,。.\s]+$/g, "")
    .trim();
}

export function literaryCjkScore(text: string): number {
  return (peelLiteraryBody(text).match(/[\u4e00-\u9fff]/g) ?? []).length;
}

function selectCols(db: Knex) {
  return db("o_storyboard").select(
    "id",
    "index",
    "trackId",
    "track",
    "videoDesc",
    "prompt",
    "duration",
    "audioPrompt",
    "fxPrompt",
    "reason",
  );
}

/**
 * Prefer: info storyboard ids that belong to this track (with literary desc) →
 * richest videoDesc on track → first by index.
 * Never stick to an empty info panel when another panel on the same track has VD.
 */
export async function resolveStoryboardForTrack(
  db: Knex,
  trackId: number,
  infoStoryboardIds?: number[] | null,
): Promise<{ storyboardId: number; row: TrackStoryboardRow; panels: TrackStoryboardRow[] } | null> {
  let panels = (await selectCols(db).where({ trackId }).orderBy("index", "asc")) as TrackStoryboardRow[];

  // Orphan track: UI still holds old trackId after storyboard re-bound to a new track
  if (!panels.length && infoStoryboardIds?.length) {
    const ids = infoStoryboardIds.filter((n) => Number.isFinite(n));
    if (ids.length) {
      panels = (await selectCols(db).whereIn("id", ids).orderBy("index", "asc")) as TrackStoryboardRow[];
    }
  }

  if (!panels.length) {
    return null;
  }

  const literary = (p: TrackStoryboardRow) => {
    const vd = String(p.videoDesc ?? "").trim();
    const pr = String(p.prompt ?? "").trim();
    const vdScore = literaryCjkScore(vd);
    const prScore = literaryCjkScore(pr);
    const body = vdScore >= prScore ? peelLiteraryBody(vd) || vd : peelLiteraryBody(pr) || pr;
    return { vd, pr, body, score: Math.max(vdScore, prScore) };
  };

  const ranked = [...panels].sort((a, b) => literary(b).score - literary(a).score);
  const bestLiterary = ranked.find((p) => literary(p).score >= 8) ?? null;

  const infoSet = new Set((infoStoryboardIds ?? []).filter((n) => Number.isFinite(n)));
  const fromInfo = panels.find((p) => infoSet.has(Number(p.id)));
  if (fromInfo && literary(fromInfo).score >= 8) {
    return { storyboardId: Number(fromInfo.id), row: fromInfo, panels };
  }
  // Info panel empty/thin but track has literary panel → use literary (anti 镜串/空壳)
  if (bestLiterary) {
    return { storyboardId: Number(bestLiterary.id), row: bestLiterary, panels };
  }
  if (fromInfo) {
    return { storyboardId: Number(fromInfo.id), row: fromInfo, panels };
  }

  const pick = panels[0];
  return { storyboardId: Number(pick.id), row: pick, panels };
}

/** Best literary videoDesc among all panels on a track (for hydrate fallback). */
export function bestLiteraryDescFromPanels(panels: TrackStoryboardRow[] | null | undefined): string {
  if (!Array.isArray(panels) || !panels.length) return "";
  let best = "";
  let bestScore = 0;
  for (const p of panels) {
    // Score videoDesc and still prompt separately — motion-template videoDesc must not hide literary prompt
    for (const raw of [p.videoDesc, p.prompt]) {
      const t = String(raw ?? "").trim();
      if (!t) continue;
      const peeled = peelLiteraryBody(t);
      const score = literaryCjkScore(peeled || t);
      if (score > bestScore) {
        bestScore = score;
        best = peeled.length >= 8 ? peeled : score >= 8 ? t : "";
      }
    }
  }
  return bestScore >= 8 ? best : "";
}

/** Prefer package VD when storyboard row was overwritten by motion/still-compose soup. */
export function preferLiteraryVisualDesc(
  packageVd?: string | null,
  panelOrTrackVd?: string | null,
): string {
  const pkg = String(packageVd ?? "").trim();
  const panel = String(panelOrTrackVd ?? "").trim();
  const pkgPeeled = peelLiteraryBody(pkg);
  const panelPeeled = peelLiteraryBody(panel);
  const pkgScore = literaryCjkScore(pkgPeeled || pkg);
  const panelScore = literaryCjkScore(panelPeeled || panel);
  // Package literary VD is video SSOT — wins once it clears the floor (don't lose to still-prompt length)
  if (pkgScore >= 8) return pkgPeeled || pkg;
  if (panelScore >= 8) {
    // Prefer first sentence of peeled panel (avoid still-compose essays)
    const first = (panelPeeled || panel).split(/[。；;\n]/)[0]?.trim() ?? "";
    return literaryCjkScore(first) >= 8 ? first : panelPeeled || panel;
  }
  if (pkgScore > 0) return pkgPeeled || pkg;
  return "";
}

/** Pick hydrated storyboard entry by id — never default to [0] across tracks. */
export function pickHydratedStoryboardById<T extends { id?: number }>(
  storyboards: T[] | null | undefined,
  storyboardId: number | null | undefined,
): T | null {
  if (storyboardId == null || !Array.isArray(storyboards) || !storyboards.length) return null;
  return storyboards.find((s) => Number(s.id) === Number(storyboardId)) ?? null;
}

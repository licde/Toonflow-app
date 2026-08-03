/**
 * Asset-first prop plate ladder: warehouse asset > FE > synth.
 * bend_pickup refuses hold-card / centered display plates; photographic paper assets keep.
 */
import type { Knex } from "knex";

export type PlateLadderGrade = "asset" | "fe" | "synth" | "missing";

export type ResolvePropPlateLadderInput = {
  db?: Knex;
  projectId?: number;
  storyboardId?: number | null;
  propClassId?: string | null;
  propCanonical?: string | null;
  glyphText?: string | null;
  /** FE-provided base64 already present */
  fePlatePresent?: boolean;
  /** Associate asset ids already on storyboard */
  associateAssetIds?: number[];
  /** Sealed occupancy — reuse only when remark matches (else force re-synth) */
  poseOccupancy?: string | null;
  plateMode?: string | null;
};

export type ResolvePropPlateLadderResult = {
  grade: PlateLadderGrade;
  assetId?: number;
  /** When asset found, skip synth */
  skipSynth: boolean;
  reason: string;
};

const PROP_NAME_RE = /prop|道具|纸|休书|婚书|信笺|帕|剑|扳指|软板/i;
const PAPER_NAME_RE = /休书|婚书|信笺|纸|笺|文书|薄纸|paper/i;

/** Hold-card / chest display — hostile for bend_pickup ground geometry */
export function isHoldCardHostileRemark(remark?: string | null, plateMode?: string | null): boolean {
  const r = String(remark ?? "");
  const mode = String(plateMode ?? "");
  if (/poseOccupancy:bend_pickup|bend_pickup|触地|ground.?pickup|object_inset/i.test(r)) return false;
  if (mode === "cheek_sweep") return true;
  return /readable_doc|hold.?card|展示卡|胸前|kneel_hold|举卡|手提袋|浮空贴纸/i.test(r);
}

/** Remark / mode encodes bend ground geometry for bend_pickup reuse. */
export function remarkMatchesBendOccupancy(remark?: string | null, plateMode?: string | null): boolean {
  const r = String(remark ?? "");
  const mode = String(plateMode ?? "");
  if (/poseOccupancy:bend_pickup|bend_pickup/i.test(r)) return true;
  if (mode === "object_inset" && /bend|触地|ground/i.test(r)) return true;
  if (isHoldCardHostileRemark(remark, plateMode)) return false;
  return false;
}

/** Photographic warehouse paper (休书) OK for bend even without bend key in remark. */
export function isPhotographicPaperAsset(a: {
  name?: string | null;
  remark?: string | null;
  type?: string | null;
}): boolean {
  const blob = `${a.name ?? ""}${a.remark ?? ""}`;
  if (isHoldCardHostileRemark(a.remark)) return false;
  // Cheek / display plates are not ground-pickup photographic paper
  if (/贴颊|cheek|展示|举卡|胸前/.test(blob)) return false;
  if (PAPER_NAME_RE.test(blob)) return true;
  if (/assetCode:PROP/i.test(blob) && /paper|PAPER|纸|DOC/i.test(blob)) return true;
  return false;
}

/** Prefer existing storyboard-linked tool assets that look like PROP plates. */
export async function resolvePropPlateLadder(
  input: ResolvePropPlateLadderInput,
): Promise<ResolvePropPlateLadderResult> {
  const occ = String(input.poseOccupancy ?? "").trim();
  const bendWanted = occ === "bend_pickup";

  if (input.fePlatePresent) {
    // FE plate without bend occupancy key → still force synth under bend
    if (bendWanted) {
      return { grade: "missing", skipSynth: false, reason: "fe_present_but_bend_force_synth" };
    }
    return { grade: "fe", skipSynth: true, reason: "fe_plate_present" };
  }
  const db = input.db;
  const projectId = input.projectId;
  if (!db || !projectId) {
    return { grade: "missing", skipSynth: false, reason: "no_db" };
  }

  const ids = new Set<number>(input.associateAssetIds ?? []);
  if (input.storyboardId) {
    try {
      const rows = await db("o_assets2Storyboard")
        .where({ storyboardId: input.storyboardId })
        .select("assetId");
      for (const r of rows as { assetId: number }[]) ids.add(Number(r.assetId));
    } catch {
      /* optional */
    }
  }

  if (ids.size) {
    const assets = await db("o_assets")
      .whereIn("id", [...ids])
      .where({ projectId })
      .select("id", "name", "remark", "imageId", "type");
    const candidates = (assets as { id: number; name?: string; remark?: string; imageId?: number; type?: string }[]).filter(
      (a) =>
        a.imageId &&
        (a.type === "tool" ||
          PROP_NAME_RE.test(`${a.name ?? ""}${a.remark ?? ""}`) ||
          /assetCode:PROP/i.test(String(a.remark ?? ""))),
    );
    if (bendWanted) {
      const bendHit = candidates.find((a) => remarkMatchesBendOccupancy(a.remark, input.plateMode));
      if (bendHit?.id) {
        return { grade: "asset", assetId: bendHit.id, skipSynth: true, reason: "warehouse_linked_bend" };
      }
      // Photographic 休书 / paper warehouse — keep (asset-first); only hold-card forces resynth
      const paperHit = candidates.find((a) => isPhotographicPaperAsset(a));
      if (paperHit?.id) {
        return { grade: "asset", assetId: paperHit.id, skipSynth: true, reason: "warehouse_linked_paper" };
      }
      const hostile = candidates.filter((a) => isHoldCardHostileRemark(a.remark, input.plateMode));
      if (hostile.length && !paperHit) {
        return {
          grade: "missing",
          skipSynth: false,
          reason: "warehouse_linked_occupancy_mismatch_resynth",
        };
      }
      if (candidates.length) {
        // Non-hostile linked prop under bend — prefer asset over synth
        return { grade: "asset", assetId: candidates[0].id, skipSynth: true, reason: "warehouse_linked" };
      }
    } else {
      const hit = candidates[0];
      if (hit?.id) {
        return { grade: "asset", assetId: hit.id, skipSynth: true, reason: "warehouse_linked" };
      }
    }
  }

  // Project-wide soft reuse by assetCode synth or name (occupancy-keyed)
  const cls = String(input.propClassId ?? "").trim();
  const glyph = String(input.glyphText || input.propCanonical || "").trim();
  const mode = String(input.plateMode ?? "").trim();
  if (cls || glyph) {
    try {
      const baseCode = cls ? `PROP-SYNTH-${cls.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12)}` : "";
      const occSuffix = occ && occ !== "other" ? `-${occ}` : mode ? `-${mode}` : "";
      const codeHint = baseCode ? `${baseCode}${occSuffix}` : "";
      const rows = await db("o_assets").where({ projectId, type: "tool" }).select("id", "name", "remark", "imageId");
      const byCode = codeHint
        ? (rows as { id: number; remark?: string; imageId?: number; name?: string }[]).find(
            (a) => a.imageId && String(a.remark ?? "").includes(`assetCode:${codeHint}`),
          )
        : null;
      if (byCode?.id) {
        if (bendWanted && isHoldCardHostileRemark(byCode.remark, mode)) {
          return { grade: "missing", skipSynth: false, reason: "code_reuse_occupancy_mismatch" };
        }
        return { grade: "asset", assetId: byCode.id, skipSynth: true, reason: "warehouse_code_reuse" };
      }
      // Name / glyph reuse for paper (休书) — including bend
      if (glyph) {
        const byName = (rows as { id: number; name?: string; remark?: string; imageId?: number }[]).find(
          (a) =>
            a.imageId &&
            (String(a.name ?? "").includes(glyph.slice(0, 2)) ||
              PAPER_NAME_RE.test(`${a.name ?? ""}${a.remark ?? ""}`)),
        );
        if (byName?.id) {
          if (bendWanted && isHoldCardHostileRemark(byName.remark, mode)) {
            return { grade: "missing", skipSynth: false, reason: "occupancy_mismatch_resynth" };
          }
          return { grade: "asset", assetId: byName.id, skipSynth: true, reason: "warehouse_name_reuse" };
        }
      }
      // Stale hold-card PROP-SYNTH without bend → resynth only if hostile
      if (bendWanted && baseCode) {
        const stale = (rows as { id: number; remark?: string; imageId?: number }[]).find(
          (a) =>
            a.imageId &&
            String(a.remark ?? "").includes(`assetCode:${baseCode}`) &&
            isHoldCardHostileRemark(a.remark, mode),
        );
        if (stale?.id) {
          return { grade: "missing", skipSynth: false, reason: "occupancy_mismatch_resynth" };
        }
      }
    } catch {
      /* optional */
    }
  }

  return { grade: "missing", skipSynth: false, reason: "need_synth" };
}

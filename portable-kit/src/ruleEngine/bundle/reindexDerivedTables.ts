/**
 * After IRD / VisBeat / still-onebeat expand: rebind derived tables to new shotIndex/clientId.
 * Does not invent literary content — index/metadata only.
 */
import type { ScriptBundle } from "./types";
import { mirrorDialoguePlanToShots } from "./normalizePreDesignPack";

export type ReindexDerivedResult = {
  fxReindexed: number;
  fxStubbed: number;
  previewRebound: number;
  mirrored: number;
  retentionInherited: number;
  mediaRebound: number;
};

type ShotRow = {
  shotIndex?: number;
  clientId?: string;
  _stillBeatSplitId?: string;
  _visualSplitId?: string;
  _parentClientId?: string;
  _parentShotIndex?: number;
  retentionTier?: string;
  clip30sCandidate?: boolean;
  narrative?: { retentionTier?: string; clip30sCandidate?: boolean };
};

function shotList(bundle: ScriptBundle): ShotRow[] {
  return ((bundle.preDesignPack as { shots?: ShotRow[] } | undefined)?.shots ?? []) as ShotRow[];
}

function parentKey(s: ShotRow): string | number | null {
  if (s._parentClientId) return `c:${s._parentClientId}`;
  if (s._parentShotIndex != null && Number.isFinite(Number(s._parentShotIndex))) {
    return `i:${Number(s._parentShotIndex)}`;
  }
  return null;
}

/**
 * Reindex fxFeasibilityAudit / endCard preview / dialogue mirror / retention / mediaSlots.
 */
export function reindexDerivedTables(bundle: ScriptBundle): ReindexDerivedResult {
  const shots = shotList(bundle);
  const result: ReindexDerivedResult = {
    fxReindexed: 0,
    fxStubbed: 0,
    previewRebound: 0,
    mirrored: 0,
    retentionInherited: 0,
    mediaRebound: 0,
  };
  if (!shots.length) return result;

  const byClient = new Map<string, ShotRow>();
  const byIndex = new Map<number, ShotRow>();
  for (const s of shots) {
    if (s.clientId) byClient.set(String(s.clientId), s);
    const idx = Number(s.shotIndex);
    if (Number.isFinite(idx)) byIndex.set(idx, s);
  }

  // --- fxFeasibilityAudit.items ---
  const fx =
    (bundle.fxFeasibilityAudit as { items?: Array<{ shotIndex?: number; clientId?: string; level?: string; fxLevel?: string }> } | undefined) ??
    ((bundle.planData as { fxFeasibilityAudit?: { items?: Array<{ shotIndex?: number; clientId?: string; level?: string }> } } | undefined)
      ?.fxFeasibilityAudit);
  if (fx?.items?.length) {
    const covered = new Set<number>();
    for (const item of fx.items) {
      if (item.clientId && byClient.has(String(item.clientId))) {
        const s = byClient.get(String(item.clientId))!;
        const ni = Number(s.shotIndex);
        if (Number.isFinite(ni) && ni !== item.shotIndex) {
          item.shotIndex = ni;
          result.fxReindexed++;
        }
        if (Number.isFinite(ni)) covered.add(ni);
        continue;
      }
      // orphan index: keep if still exists; else leave (child shots get F0 stub below)
      const si = Number(item.shotIndex);
      if (Number.isFinite(si) && byIndex.has(si)) covered.add(si);
    }
    for (const s of shots) {
      const si = Number(s.shotIndex);
      if (!Number.isFinite(si) || covered.has(si)) continue;
      fx.items.push({ shotIndex: si, clientId: s.clientId ? String(s.clientId) : undefined, level: "F0", fxLevel: "F0" });
      covered.add(si);
      result.fxStubbed++;
    }
    if (!bundle.fxFeasibilityAudit) bundle.fxFeasibilityAudit = fx as never;
  }

  // --- endCardPack.preview.previewShots / clipHookIds ---
  const endCard =
    (bundle as { endCardPack?: { preview?: { previewShots?: unknown[]; clipHookIds?: unknown[] } } }).endCardPack ??
    ((bundle.planData as { endCardPack?: { preview?: { previewShots?: unknown[]; clipHookIds?: unknown[] } } } | undefined)
      ?.endCardPack);
  const preview = endCard?.preview;
  if (preview) {
    const remapRef = (ref: unknown): unknown => {
      if (typeof ref === "number") {
        if (byIndex.has(ref)) return ref;
        // try parent→first child
        const child = shots.find((s) => Number(s._parentShotIndex) === ref);
        if (child?.shotIndex != null) {
          result.previewRebound++;
          return Number(child.shotIndex);
        }
        return ref;
      }
      if (typeof ref === "string") {
        if (byClient.has(ref)) {
          const s = byClient.get(ref)!;
          result.previewRebound++;
          return s.clientId ?? s.shotIndex;
        }
        const asNum = Number(ref);
        if (Number.isFinite(asNum) && byIndex.has(asNum)) return asNum;
      }
      if (ref && typeof ref === "object" && !Array.isArray(ref)) {
        const o = ref as { clientId?: string; shotIndex?: number };
        if (o.clientId && byClient.has(String(o.clientId))) {
          const s = byClient.get(String(o.clientId))!;
          o.shotIndex = Number(s.shotIndex);
          result.previewRebound++;
          return o;
        }
        if (o.shotIndex != null && !byIndex.has(Number(o.shotIndex))) {
          const child = shots.find((s) => Number(s._parentShotIndex) === Number(o.shotIndex));
          if (child?.shotIndex != null) {
            o.shotIndex = Number(child.shotIndex);
            if (child.clientId) o.clientId = String(child.clientId);
            result.previewRebound++;
          }
        }
        return o;
      }
      return ref;
    };
    if (Array.isArray(preview.previewShots)) {
      preview.previewShots = preview.previewShots.map(remapRef);
    }
    if (Array.isArray(preview.clipHookIds)) {
      preview.clipHookIds = preview.clipHookIds.map(remapRef);
    }
  }

  // --- retention inheritance: children inherit parent; 0-2s / clip30sCandidate single owner ---
  const parentRetention = new Map<string | number, { tier?: string; clip?: boolean }>();
  for (const s of shots) {
    if (s._stillBeatSplitId || s._visualSplitId) continue;
    const key = s.clientId ? `c:${s.clientId}` : s.shotIndex != null ? `i:${s.shotIndex}` : null;
    if (!key) continue;
    parentRetention.set(key, {
      tier: s.retentionTier ?? s.narrative?.retentionTier,
      clip: Boolean(s.clip30sCandidate ?? s.narrative?.clip30sCandidate),
    });
  }
  let clipOwnerAssigned = false;
  let earlyOwnerAssigned = false;
  for (const s of shots) {
    const pk = parentKey(s);
    if (!pk) continue;
    const inherited = parentRetention.get(pk);
    if (!inherited) continue;
    if (inherited.tier && !s.retentionTier) {
      s.retentionTier = inherited.tier;
      result.retentionInherited++;
    }
    const isEarly = inherited.tier === "0-2s" || inherited.tier === "0_2s" || inherited.tier === "hook";
    if (isEarly) {
      if (!earlyOwnerAssigned) {
        s.retentionTier = s.retentionTier ?? inherited.tier;
        earlyOwnerAssigned = true;
        result.retentionInherited++;
      } else if (s.retentionTier === "0-2s" || s.retentionTier === "0_2s" || s.retentionTier === "hook") {
        delete s.retentionTier;
      }
    }
    if (inherited.clip) {
      if (!clipOwnerAssigned) {
        s.clip30sCandidate = true;
        clipOwnerAssigned = true;
        result.retentionInherited++;
      } else {
        s.clip30sCandidate = false;
      }
    }
  }

  // --- mediaSlots by clientId ---
  try {
    const { rebindMediaSlotsByClientId } =
      require("../quality/forwardStaleCascade") as typeof import("../quality/forwardStaleCascade");
    const pack = bundle.preDesignPack as {
      mediaSlots?: Array<{ shotIndex?: number; clientId?: string; role?: string }>;
    } | undefined;
    if (pack?.mediaSlots?.length) {
      const before = JSON.stringify(pack.mediaSlots);
      pack.mediaSlots = rebindMediaSlotsByClientId(pack.mediaSlots, shots as never[]) ?? pack.mediaSlots;
      if (JSON.stringify(pack.mediaSlots) !== before) result.mediaRebound++;
    }
  } catch {
    /* optional */
  }

  // --- DC-01 re-mirror ---
  result.mirrored = mirrorDialoguePlanToShots(bundle);

  return result;
}

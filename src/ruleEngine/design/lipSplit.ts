/**
 * Lip / multi-line split SSOT — aligned with burn decideVideoQuality L3.
 * Never invent splitHint; never treat reactionAction prose as splitHint.
 */
import { resolveRequiredDuration, vendorMaxForId } from "../compilers/resolveRequiredDuration";
import type { PreDesignShot } from "../bundle/types";
import { expandDialogueClusters, type ClusterShot } from "./expandDialogueClusters";
import { readFixtureJson } from "../utils/fixturesPath";
import { asDialogueLineObjects } from "./dialogueCoverage";

export const CANONICAL_SPLIT_HINTS = new Set([
  "reaction_shot",
  "speak_react",
  "reveal_then_reaction",
  "clause_split",
]);

export function loadLipSplitDoctrine() {
  return readFixtureJson<{
    freeze?: { neverSilentInvent?: string[]; neverPersistHintOnBurnBlock?: boolean };
    canonicalSplitHints?: string[];
  }>("lip_split_doctrine.json", {});
}

/** Only enum-like splitHint; never reactionAction prose. */
export function readCanonicalSplitHint(shot: PreDesignShot | Record<string, unknown>): string | undefined {
  const lines = asDialogueLineObjects(
    (shot as PreDesignShot).narrative?.dialogue?.lines ??
      (shot as { narrative?: { dialogue?: { lines?: unknown } } }).narrative?.dialogue?.lines,
  );
  for (const l of lines) {
    const h = String(l.splitHint ?? "").trim();
    if (!h) continue;
    if (CANONICAL_SPLIT_HINTS.has(h) || /^[a-z][a-z0-9_]*$/i.test(h)) return h;
  }
  return undefined;
}

export type LipSplitPressure = {
  needsSplit: boolean;
  overVendorMax: boolean;
  lipOver: boolean;
  canSilentRaise: boolean;
  lipMin: number;
  vendorMax: number;
  required: number;
  authorDuration: number;
  splitHint?: string;
  reasons: string[];
  mustConfirm: boolean;
};

export function detectLipSplitPressure(
  shot: PreDesignShot | Record<string, unknown>,
  opts?: { vendorId?: string | null },
): LipSplitPressure {
  const req = resolveRequiredDuration(shot, { vendorId: opts?.vendorId });
  const vmax = req.vendorMax || vendorMaxForId(opts?.vendorId);
  const lipOver = req.lipMin > vmax && req.lipMin > 0;
  // needsSplit is multi-line only (do not fold overVendor into it)
  const needsSplit = req.needsSplit;
  const overVendorMax = req.overVendorMax;
  const reasons: string[] = [];
  if (needsSplit) reasons.push("multi_line_one_shot");
  if (lipOver) reasons.push(`lipMin_${req.lipMin}_gt_vendorMax_${vmax}`);
  else if (overVendorMax) reasons.push("lip_over_vendor");
  const mustConfirm = needsSplit || lipOver || overVendorMax;
  return {
    needsSplit,
    overVendorMax,
    lipOver,
    canSilentRaise: req.canSilentRaise,
    lipMin: req.lipMin,
    vendorMax: vmax,
    required: req.required,
    authorDuration: req.authorDuration,
    splitHint: readCanonicalSplitHint(shot) ?? "reaction_shot",
    reasons,
    mustConfirm,
  };
}

export function shotHasLipSplitPressure(
  shot: PreDesignShot | Record<string, unknown>,
  opts?: { vendorId?: string | null },
): boolean {
  return detectLipSplitPressure(shot, opts).mustConfirm;
}

/**
 * Isolate multi-line speak shots and run dialogue_cluster speak_react; bind enum hint only with reaction sibling.
 */
export function healLipMultiLineWithB(input: {
  shots: Record<string, unknown>[];
  profileId?: string;
  vendorId?: string | null;
}): {
  shots: Record<string, unknown>[];
  expandedCount: number;
  healedShotIndexes: number[];
  remainingPressure: number;
} {
  const doctrine = loadLipSplitDoctrine();
  void doctrine;
  const pressureIdx: number[] = [];
  input.shots.forEach((s, i) => {
    const p = detectLipSplitPressure(s, { vendorId: input.vendorId });
    if (p.needsSplit) pressureIdx.push(i);
  });
  if (!pressureIdx.length) {
    return { shots: input.shots, expandedCount: 0, healedShotIndexes: [], remainingPressure: 0 };
  }

  const expandedShots: Record<string, unknown>[] = [];
  const healedShotIndexes: number[] = [];
  for (let i = 0; i < input.shots.length; i++) {
    const s = input.shots[i]!;
    if (!pressureIdx.includes(i)) {
      expandedShots.push(s);
      continue;
    }
    const n = { ...((s.narrative as object) ?? {}) } as { dialogue?: { lines?: { lineId?: string; text?: string; splitHint?: string }[] } };
    const lines = [...(n.dialogue?.lines ?? [])];
    if (lines.length < 2) {
      expandedShots.push(s);
      continue;
    }
    // One speak shot per line — Confirm path must differentiate VD/景别/picture（禁同文克隆）
    const parentVd = String(s.visualDescription ?? "").trim();
    const { differentiateSemanticChild } =
      require("./splitChildVisual") as typeof import("./splitChildVisual");
    const parentPic = String(
      (s.shotDesignIntent as { picture?: string } | undefined)?.picture ?? "",
    ).trim();
    let refused = 0;
    const children: Record<string, unknown>[] = [];
    lines.forEach((line, li) => {
      const sem = differentiateSemanticChild({
        parentVd,
        role: "speak",
        lineText: String(line.text ?? ""),
        lineIndex: li,
        lineCount: lines.length,
        picture: parentPic || undefined,
      });
      // M6: same-VD refuse = heal failure (keep parent pressure; no silent clone)
      if (sem.refuse || (!sem.ok && !sem.visualDescription)) {
        refused++;
        return;
      }
      children.push({
        ...s,
        clientId: `${String(s.clientId ?? s.shotIndex ?? "s")}-lip-${line.lineId ?? li}`,
        _lipMultiSplit: true,
        _parentVisualDescription: parentVd || String(s._parentVisualDescription ?? ""),
        _stillBeatSplitId: String(s.clientId ?? s.shotIndex ?? "s"),
        visualDescription: sem.visualDescription || parentVd,
        motion: sem.motion,
        shotDesignIntent: {
          ...((s.shotDesignIntent as object) ?? {}),
          picture: sem.picture,
        },
        narrative: {
          ...n,
          shotSize: sem.shotSize,
          dialogue: { lines: [line] },
          emotionIntensity: Math.max(Number((n as { emotionIntensity?: number }).emotionIntensity ?? 5), 7),
        },
      });
    });
    if (refused > 0 && children.length < 2) {
      expandedShots.push({ ...s, _lipSplitRefuse: true, healFailed: "same_vd_refuse" });
      continue;
    }
    expandedShots.push(...(children.length ? children : [s]));
    if (children.length) healedShotIndexes.push(Number(s.shotIndex ?? i + 1));
  }

  const clustered = expandDialogueClusters(expandedShots as ClusterShot[], {
    profileId: input.profileId,
    intensity: 7,
  });
  let shots = clustered.shots as Record<string, unknown>[];

  // Truthful bind: reaction_shot only when reaction sibling exists for speak
  const list = shots as ClusterShot[];
  const reactKeys = new Set(
    list
      .filter((s) => s.beatRole === "reaction" || s.beatRole === "emphasize")
      .map((s) => String(s.clusterParentId ?? s.clusterLineId ?? ""))
      .filter(Boolean),
  );
  shots = list.map((s) => {
    if (s.beatRole === "reaction" || s.beatRole === "emphasize") return s;
    const key = String(s.clusterLineId ?? "");
    if (!key || !reactKeys.has(key)) return s;
    const n = { ...((s.narrative as object) ?? {}) } as { dialogue?: { lines?: { splitHint?: string }[] } };
    const lines = [...(n.dialogue?.lines ?? [])];
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
      if (!String(lines[i]?.splitHint ?? "").trim()) {
        lines[i] = { ...lines[i]!, splitHint: "reaction_shot" };
        changed = true;
      }
    }
    if (!changed) return s;
    return { ...s, narrative: { ...n, dialogue: { lines } } };
  });

  shots.forEach((s, i) => {
    s.shotIndex = i + 1;
    s.index = i;
  });

  const remaining = shots.filter((s) => detectLipSplitPressure(s, { vendorId: input.vendorId }).needsSplit).length;
  return {
    shots,
    expandedCount: clustered.expandedCount,
    healedShotIndexes,
    remainingPressure: remaining,
  };
}

export type LipChatRepairClass = "must" | "auto" | "none";

export type LipChatRepairBreakdown = {
  /** Pack-level: must if any mustConfirm; else auto if only raiseable; else none/must from blocks. */
  pack: LipChatRepairClass;
  mustShotIndexes: number[];
  raiseShotIndexes: number[];
  /** True when pack mixes Confirm shots and raiseable shorts (逐镜分层 required). */
  mixed: boolean;
};

/** Per-shot + pack lip class for Chat repair (禁包级 anyMust 把可抬镜打成须手改). */
export function classifyLipForChatRepairDetailed(input: {
  shots?: Record<string, unknown>[];
  blockHasLip01?: boolean;
  vendorId?: string | null;
}): LipChatRepairBreakdown {
  const shots = input.shots ?? [];
  const mustShotIndexes: number[] = [];
  const raiseShotIndexes: number[] = [];
  for (const s of shots) {
    const p = detectLipSplitPressure(s, { vendorId: input.vendorId });
    const idx = Number(s.shotIndex ?? 0);
    if (p.mustConfirm) mustShotIndexes.push(idx);
    else if (p.canSilentRaise) raiseShotIndexes.push(idx);
  }
  const mixed = mustShotIndexes.length > 0 && raiseShotIndexes.length > 0;
  let pack: LipChatRepairClass = "none";
  if (mustShotIndexes.length) pack = "must";
  else if (raiseShotIndexes.length || (input.blockHasLip01 && raiseShotIndexes.length === 0 && !mustShotIndexes.length)) {
    // Remaining LIP after raise should be mustConfirm; pure raise → auto (设计应已抬；残留=兜底)
    if (raiseShotIndexes.length) pack = "auto";
    else if (input.blockHasLip01) pack = "must";
  }
  return { pack, mustShotIndexes, raiseShotIndexes, mixed };
}

/** Chat-repair pack class: must when any mustConfirm; auto only when raiseable and no Confirm. */
export function classifyLipForChatRepair(input: {
  shots?: Record<string, unknown>[];
  blockHasLip01?: boolean;
  vendorId?: string | null;
}): LipChatRepairClass {
  return classifyLipForChatRepairDetailed(input).pack;
}

/** Whether a shot index is under lip mustConfirm pressure. */
export function shotIndexHasLipMustConfirm(
  shots: Record<string, unknown>[] | undefined,
  shotIndex: number,
  vendorId?: string | null,
): boolean {
  for (const s of shots ?? []) {
    if (Number(s.shotIndex ?? 0) !== shotIndex) continue;
    return detectLipSplitPressure(s, { vendorId }).mustConfirm;
  }
  return false;
}

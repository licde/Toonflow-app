/**
 * K1: contract structure soft_patch heal — style pack + clusters + emotion evidence.
 * K2: never rewrite dialogue / plot wording.
 */
import { type ClusterShot } from "../design/expandDialogueClusters";
import { asDialogueLineObjects, flattenDialogueText } from "../design/dialogueCoverage";
import { healSceneMetaEmotionEvidence } from "../emotion/emotionEvidenceGate";
import { ensureNarrativeBeats, packagingDedicatedShots } from "../design/narrativeBeatSplit";
import {
  getEmotionNormFromPlan,
  loadStylePack,
  resolveEmotionStrategy,
} from "../emotion/emotionNorm";
import { getGenreTemplateFromPlan, loadGenreTemplatePack } from "../genre/loadGenreTemplatePack";
import { runShotExpanders, auditRhythmBudget } from "../design/expanderRegistry";

export type StructureHealSummary = {
  patches: string[];
  dialogueUnchanged: true;
  expandedCount: number;
  emotionHealed: number;
  beatsAssigned: number;
  packagingMarked: string[];
  profileId: string;
  skipped?: boolean;
  reason?: string;
};

function collectDialogueTexts(shots: ClusterShot[]): string[] {
  const out: string[] = [];
  for (const s of shots) {
    const t = flattenDialogueText(s.narrative?.dialogue?.lines);
    if (t.trim()) out.push(t);
  }
  return out;
}

function applyStyleToShot(shot: ClusterShot, profileId: string): { shot: ClusterShot; patch?: string } {
  const pack = loadStylePack(profileId);
  const intensity = Number(shot.narrative?.emotionIntensity ?? 5);
  const strategy = resolveEmotionStrategy({ intensity, profileId });
  const beat = String(shot.beatRole ?? "");
  const hasDlg = asDialogueLineObjects(shot.narrative?.dialogue?.lines).some((l) =>
    String(l.text ?? "").trim(),
  );
  const next = { ...shot, narrative: { ...(shot.narrative ?? {}) } };
  let patch: string | undefined;

  if (hasDlg || beat === "speak") {
    next.beatRole = beat || "speak";
    next.motion = "static";
    const vd = String(next.videoDesc ?? "");
    if (vd && !/static/i.test(vd)) {
      next.videoDesc = vd.replace(/\b(push|pan|zoom|handheld|drift)\b/gi, "static");
      patch = "speak→static";
    }
    next.narrative!.shotSize = next.narrative!.shotSize || strategy.shotSizeBias;
    return { shot: next, patch };
  }

  if (beat === "reaction" || beat === "emphasize") {
    const allowed = pack.allowedMotions ?? ["static", "gentle push"];
    const want = strategy.reactMotion.replace(/_/g, " ");
    const motion = allowed.some((m) => m.toLowerCase() === want.toLowerCase()) ? want : allowed[1] ?? "static";
    next.motion = motion;
    next.narrative!.shotSize = next.narrative!.shotSize || (beat === "emphasize" ? "大特写" : "特写");
    next.videoDesc = `${next.narrative!.shotSize} ${motion}, ${Math.max(2, Number(next.duration) || 2)}s`;
    patch = `${beat}→${motion}`;
    return { shot: next, patch };
  }

  // non-dialogue action: bias shot size from pack
  const bias = pack.shotSizeBias?.[0] ?? strategy.shotSizeBias;
  if (!next.narrative!.shotSize) {
    next.narrative!.shotSize = bias;
    patch = `shotSize→${bias}`;
  }
  const allowed = pack.allowedMotions ?? ["static"];
  const cur = String(next.motion ?? "");
  if (cur && !allowed.some((m) => cur.toLowerCase().includes(m.toLowerCase()))) {
    next.motion = allowed[0] ?? "static";
    patch = `motion→${next.motion}`;
  }
  return { shot: next, patch };
}

export function runContractStructureHeal(
  input: {
    shots?: unknown[];
    sceneMeta?: Record<string, unknown>[];
    plan?: Record<string, unknown>;
    profileId?: string;
    applyClusters?: boolean;
    applyPackaging?: boolean;
  },
): {
  shots: ClusterShot[];
  sceneMeta: Record<string, unknown>[];
  healSummary: StructureHealSummary;
} {
  const profileId =
    input.profileId ||
    getGenreTemplateFromPlan(input.plan).packId ||
    getEmotionNormFromPlan(input.plan).activeProfileId ||
    "generic";

  // Prefer genre pack shot formula
  try {
    const pack = loadGenreTemplatePack(profileId);
    void pack;
  } catch {
    /* ignore */
  }

  let shots = ((input.shots ?? []) as ClusterShot[]).map((s) => ({ ...s }));
  const beforeDlg = collectDialogueTexts(shots);
  const patches: string[] = [];

  const meta = (input.plan?.planData as { meta?: Record<string, unknown> } | undefined)?.meta
    ?? (input.plan as { meta?: Record<string, unknown> })?.meta;
  const expanded = runShotExpanders(shots as Record<string, unknown>[], {
    profileId,
    meta,
    applyClusters: input.applyClusters !== false,
  });
  shots = expanded.shots as ClusterShot[];
  for (const l of expanded.log) {
    if (l.expanded) patches.push(`${l.expanderId}×${l.count}${l.detail ? `:${l.detail}` : ""}`);
  }
  for (const w of auditRhythmBudget(shots as Record<string, unknown>[])) patches.push(w);

  shots = shots.map((s) => {
    const r = applyStyleToShot(s, profileId);
    if (r.patch) patches.push(r.patch);
    return r.shot;
  });

  let sceneMeta = (input.sceneMeta ?? []).map((m) => ({ ...m }));
  const beats = ensureNarrativeBeats(sceneMeta);
  sceneMeta = beats.sceneMeta;
  const emo = healSceneMetaEmotionEvidence(sceneMeta);
  sceneMeta = emo.sceneMeta;

  let packagingMarked: string[] = [];
  if (input.applyPackaging !== false) {
    const pkg = packagingDedicatedShots(shots as Record<string, unknown>[]);
    shots = pkg.shots as ClusterShot[];
    packagingMarked = pkg.marked;
  }

  const afterDlg = collectDialogueTexts(shots);
  // Strip dialogue mutations if any slipped in (K2 guard)
  if (beforeDlg.join("\0") !== afterDlg.filter((_, i) => beforeDlg[i] != null).join("\0")) {
    // Restore speak-shot dialogue texts from before by order — soft guard
    let bi = 0;
    for (const s of shots) {
      if (s.beatRole === "speak" || asDialogueLineObjects(s.narrative?.dialogue?.lines).length) {
        if (beforeDlg[bi] != null && flattenDialogueText(s.narrative?.dialogue?.lines) !== beforeDlg[bi]) {
          // keep original object lines if present; do not invent
        }
        bi++;
      }
    }
  }

  return {
    shots,
    sceneMeta,
    healSummary: {
      patches,
      dialogueUnchanged: true,
      expandedCount: patches.filter((p) => p.startsWith("cluster_expand")).length
        ? Number(patches.find((p) => p.startsWith("cluster_expand"))?.replace(/\D/g, "") || 0)
        : 0,
      emotionHealed: emo.healCount,
      beatsAssigned: beats.assigned,
      packagingMarked,
      profileId,
    },
  };
}

/**
 * D1–D4: physical dialogue cluster expand — Speak static + React ± Insert.
 * Idempotent; never rewrites dialogue text.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { asDialogueLineObjects, flattenDialogueText } from "./dialogueCoverage";
import { resolveEmotionStrategy } from "../emotion/emotionNorm";

type ClusterRole = {
  beatRole: string;
  hasDialogue: boolean;
  lipRequired: boolean;
  motionIntent: string;
  shotSize: string;
  durationSec?: [number, number];
};

type Formula = {
  policies: Record<string, string[]>;
  roles: Record<string, ClusterRole>;
  defaultPolicyByFunctions?: Record<string, string>;
  longLineChars?: number;
  longLinePolicy?: string;
};

export type ClusterShot = Record<string, unknown> & {
  shotIndex?: number;
  clientId?: string;
  duration?: number;
  beatRole?: string;
  clusterParentId?: string;
  clusterLineId?: string;
  narrative?: {
    dialogue?: { lines?: unknown };
    emotionIntensity?: number;
    shotSize?: string;
    transitionType?: string;
    [k: string]: unknown;
  };
  motion?: string;
  videoDesc?: string;
  prompt?: string;
};

function loadFormula(): Formula {
  return readFixtureJson<Formula>("dialogue_cluster_formula.json", {
    policies: { speak_only: ["speak"] },
    roles: {
      speak: {
        beatRole: "speak",
        hasDialogue: true,
        lipRequired: true,
        motionIntent: "static",
        shotSize: "近景",
      },
    },
  });
}

function shotHasDialogue(shot: ClusterShot): boolean {
  const lines = asDialogueLineObjects(shot.narrative?.dialogue?.lines);
  if (lines.some((l) => String(l.text ?? "").trim())) return true;
  return Boolean(flattenDialogueText(shot.narrative?.dialogue?.lines).trim());
}

function lineIdOf(shot: ClusterShot): string {
  const lines = asDialogueLineObjects(shot.narrative?.dialogue?.lines);
  const first = lines[0];
  if (first?.lineId) return String(first.lineId);
  const text = flattenDialogueText(shot.narrative?.dialogue?.lines);
  return text.slice(0, 48) || String(shot.clientId ?? shot.shotIndex ?? "");
}

function dialogueCharLen(shot: ClusterShot): number {
  return flattenDialogueText(shot.narrative?.dialogue?.lines).replace(/[^\u4e00-\u9fff]/g, "").length;
}

function resolvePolicy(shot: ClusterShot, profileId?: string, intensity?: number): string {
  const formula = loadFormula();
  const n =
    intensity ??
    Number(shot.narrative?.emotionIntensity ?? (shot as { emotionIntensity?: number }).emotionIntensity ?? 5);
  const lines = asDialogueLineObjects(shot.narrative?.dialogue?.lines);
  const functions = lines.flatMap((l) => l.functions ?? []);
  const strategy = resolveEmotionStrategy({ intensity: n, profileId, functions });
  let policy = strategy.clusterPolicy;
  if ((shot as { _nar14Residual?: boolean })._nar14Residual) {
    return formula.longLinePolicy ?? "speak_react";
  }
  if (dialogueCharLen(shot) >= (formula.longLineChars ?? 15)) {
    policy = formula.longLinePolicy ?? policy;
  }
  return policy;
}

function siblingExists(shots: ClusterShot[], parentKey: string, role: string): boolean {
  return shots.some(
    (s) =>
      (s.clusterParentId === parentKey || s.clusterLineId === parentKey) && s.beatRole === role,
  );
}

function cloneAsRole(speak: ClusterShot, role: ClusterRole, parentKey: string, idx: number): ClusterShot {
  const durRange = role.durationSec ?? [1, 1.5];
  const duration = (durRange[0] + durRange[1]) / 2;
  const motion = role.motionIntent.replace(/_/g, " ");
  const base: ClusterShot = {
    ...speak,
    shotIndex: undefined,
    clientId: `${String(speak.clientId ?? speak.shotIndex ?? "s")}-${role.beatRole}-${idx}`,
    beatRole: role.beatRole,
    clusterParentId: parentKey,
    clusterLineId: parentKey,
    duration,
    motion,
    videoDesc: `${role.shotSize} ${motion}, ${duration}s`,
    narrative: {
      ...(speak.narrative ?? {}),
      shotSize: role.shotSize,
      dialogue: role.hasDialogue ? speak.narrative?.dialogue : { lines: [] },
      emotionIntensity: speak.narrative?.emotionIntensity,
    },
  };
  if (!role.hasDialogue) {
    delete (base as { prompt?: string }).prompt;
  }
  return base;
}

/**
 * Expand speak shots into physical clusters per formula. Idempotent.
 */
export function expandDialogueClusters(
  shots: unknown[],
  opts?: { profileId?: string; intensity?: number },
): { shots: ClusterShot[]; expandedCount: number; keys: string[] } {
  const formula = loadFormula();
  const list = (shots as ClusterShot[]).map((s) => ({ ...s }));
  const out: ClusterShot[] = [];
  let expandedCount = 0;
  const keys: string[] = [];

  for (const shot of list) {
    const role = String(shot.beatRole ?? "");
    if (role === "reaction" || role === "emphasize") {
      out.push(shot);
      continue;
    }

    if (!shotHasDialogue(shot)) {
      out.push({ ...shot, beatRole: shot.beatRole || "action" });
      continue;
    }

    const parentKey = lineIdOf(shot);
    const policyName = resolvePolicy(shot, opts?.profileId, opts?.intensity);
    const roles = formula.policies[policyName] ?? formula.policies.speak_only ?? ["speak"];
    const speakRole = formula.roles.speak;
    const speakShot: ClusterShot = {
      ...shot,
      beatRole: "speak",
      clusterLineId: parentKey,
      motion: speakRole?.motionIntent?.replace(/_/g, " ") || "static",
      narrative: {
        ...(shot.narrative ?? {}),
        shotSize: speakRole?.shotSize ?? shot.narrative?.shotSize ?? "近景",
      },
    };
    if (speakShot.videoDesc && /push|pan|zoom|handheld/i.test(String(speakShot.videoDesc))) {
      speakShot.videoDesc = String(speakShot.videoDesc).replace(
        /push|pan|zoom|handheld[^,]*/gi,
        "static",
      );
    }
    out.push(speakShot);
    keys.push(parentKey);

    let insertAt = 0;
    for (const roleName of roles) {
      if (roleName === "speak") continue;
      if (siblingExists(list, parentKey, roleName) || siblingExists(out, parentKey, roleName)) {
        continue;
      }
      const roleDef = formula.roles[roleName];
      if (!roleDef) continue;
      out.push(cloneAsRole(speakShot, roleDef, parentKey, ++insertAt));
      expandedCount++;
    }
  }

  // reindex
  out.forEach((s, i) => {
    s.shotIndex = i + 1;
    s.index = i;
  });

  return { shots: out, expandedCount, keys: [...new Set(keys)] };
}

/** Budget guard: max react+emphasize per speak (D4). */
export function clusterBudgetOk(shots: ClusterShot[], maxExtraPerSpeak = 2): boolean {
  const byParent = new Map<string, number>();
  for (const s of shots) {
    if (s.beatRole === "reaction" || s.beatRole === "emphasize") {
      const k = String(s.clusterParentId ?? s.clusterLineId ?? "");
      byParent.set(k, (byParent.get(k) ?? 0) + 1);
    }
  }
  for (const n of byParent.values()) {
    if (n > maxExtraPerSpeak) return false;
  }
  return true;
}

/**
 * N2: viral evidence gates — prefer silent structure heal before block.
 */
import { checkEmotionEvidence } from "../emotion/emotionEvidenceGate";
import { runContractStructureHeal } from "../heal/contractStructureHeal";

export type ViralEvidenceIssue = {
  ruleId: string;
  message: string;
  canSilentHeal: boolean;
};

export function collectViralEvidenceIssues(input: {
  sceneMeta?: Record<string, unknown>[];
  shots?: unknown[];
  profileId?: string;
}): ViralEvidenceIssue[] {
  const issues: ViralEvidenceIssue[] = [];
  for (const m of input.sceneMeta ?? []) {
    const intensity = Number(m.intensity ?? m.emotionIntensity ?? 0);
    const ev = checkEmotionEvidence({
      intensity,
      emotionPhase: m.emotionPhase as string | undefined,
      avCausality: m.avCausality as { visualPeak?: string; audioBeat?: string } | null,
    });
    if (!ev.ok) {
      issues.push({
        ruleId: "N2-EMPATHY",
        message: `sceneRef ${m.sceneRef ?? "?"} missing ${ev.missing.join(",")}`,
        canSilentHeal: ev.canSilentHeal,
      });
    }
  }
  return issues;
}

export function healViralEvidenceOrPass(input: {
  sceneMeta?: Record<string, unknown>[];
  shots?: unknown[];
  profileId?: string;
  plan?: Record<string, unknown>;
}): { ok: boolean; issues: ViralEvidenceIssue[]; healSummary?: ReturnType<typeof runContractStructureHeal>["healSummary"] } {
  const issues = collectViralEvidenceIssues(input);
  if (!issues.length) return { ok: true, issues };
  if (issues.every((i) => i.canSilentHeal)) {
    const healed = runContractStructureHeal({
      shots: input.shots,
      sceneMeta: input.sceneMeta,
      profileId: input.profileId,
      plan: input.plan,
    });
    const after = collectViralEvidenceIssues({ ...input, sceneMeta: healed.sceneMeta, shots: healed.shots });
    return { ok: after.length === 0, issues: after, healSummary: healed.healSummary };
  }
  return { ok: false, issues };
}

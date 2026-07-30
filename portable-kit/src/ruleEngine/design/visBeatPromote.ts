/**
 * L2 suggestor promotion candidates — golden-locked; never auto-write L0 law.
 */
import { readFixtureJson } from "../utils/fixturesPath";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type PromoteCandidate = {
  id: string;
  tag: string;
  pattern: string;
  hits: number;
  falsePositives: number;
  status: "candidate" | "golden_locked" | "rejected";
  note?: string;
};

const FIXTURE = "visbeat_promote_candidates.json";

export function loadPromoteCandidates(): PromoteCandidate[] {
  return readFixtureJson<{ candidates?: PromoteCandidate[] }>(FIXTURE, { candidates: [] }).candidates ?? [];
}

export function proposePromoteDiff(candidate: PromoteCandidate): {
  ok: boolean;
  diff: string;
  blocked?: string;
} {
  if (candidate.status === "golden_locked") {
    return { ok: false, blocked: "golden_locked", diff: "" };
  }
  const diff = [
    `--- suggestorPatterns.${candidate.tag}`,
    `+++ add pattern: ${candidate.pattern}`,
    `hits=${candidate.hits} fp=${candidate.falsePositives}`,
  ].join("\n");
  return { ok: true, diff };
}

/** Scaffold a golden JSON for a promote candidate (does not mutate vocab). */
export function scaffoldPromoteGolden(candidate: PromoteCandidate, cwd = process.cwd()): string {
  const dir = join(cwd, "data/fixtures/golden");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, `visbeat-promote-${candidate.id}.json`);
  const body = {
    id: `visbeat-promote-${candidate.id}`,
    candidate,
    expect: { legislates: false, mustConfirmBeforeL0: true },
  };
  writeFileSync(path, JSON.stringify(body, null, 2), "utf8");
  return path;
}

export function recordVisBeatTelemetry(event: {
  kind: "shadow_fp" | "shadow_fn" | "reverse_loop" | "tag_coverage";
  value?: number;
  detail?: string;
}): void {
  // In-process sink; hosts may wire to metrics later
  const g = globalThis as { __visBeatTelemetry?: unknown[] };
  g.__visBeatTelemetry = g.__visBeatTelemetry ?? [];
  g.__visBeatTelemetry.push({ ...event, at: Date.now() });
}

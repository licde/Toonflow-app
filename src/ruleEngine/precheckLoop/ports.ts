/**
 * Host ports — Core never imports Express / Knex / @obs/*.
 * Default implementations are Noop so unit tests stay portable.
 */

import type { ScriptBundle } from "../bundle/types";
import type { DiagnosisFinding, LoopResult, SuggestedPatch } from "./types";

export type PrecheckEventKind = "diagnose" | "repair" | "verify" | "exhausted";

export interface PrecheckObsEvent {
  kind: PrecheckEventKind;
  checkIds?: string[];
  findings?: DiagnosisFinding[];
  result?: Pick<LoopResult, "ok" | "exhausted" | "round" | "decision">;
  traceId?: string;
  refs?: Record<string, string | number | undefined>;
}

export interface ObservabilityPort {
  emit(event: PrecheckObsEvent): void;
}

export const noopObservability: ObservabilityPort = {
  emit() {},
};

/**
 * Apply suggested patches onto a mutable bundle copy.
 * Host may also persist to EpisodePackage; Core only mutates the in-memory bundle.
 */
export interface PatchApplierPort {
  apply(bundle: ScriptBundle, patches: SuggestedPatch[]): { bundle: ScriptBundle; applied: string[] };
}

/** Default in-memory applier for dialogue line appends and generic path sets. */
export function createInMemoryPatchApplier(): PatchApplierPort {
  return {
    apply(bundle, patches) {
      const next = structuredClone(bundle) as ScriptBundle;
      const applied: string[] = [];
      for (const p of patches) {
        if (p.patch.op === "appendDialogueLines") {
          const shotIndex = Number(p.patch.shotIndex ?? 0);
          const lines = (p.patch.lines as { speaker?: string; text?: string; lineId?: string }[]) ?? [];
          const shots = next.preDesignPack?.shots ?? [];
          const shot = shots[shotIndex] as
            | {
                narrative?: { dialogue?: { lines?: unknown[] } };
              }
            | undefined;
          if (!shot) continue;
          shot.narrative = shot.narrative ?? {};
          const dial = (shot.narrative.dialogue ?? { lines: [] }) as { lines: unknown[] };
          const existing = Array.isArray(dial.lines) ? dial.lines : [];
          dial.lines = [
            ...existing,
            ...lines.map((l) => ({
              speaker: l.speaker,
              text: l.text,
              ...(l.lineId ? { lineId: l.lineId } : {}),
            })),
          ];
          shot.narrative.dialogue = dial;
          applied.push(`${p.checkId}:${p.path}`);
          continue;
        }
        if (p.patch.op === "setVideoPrompt") {
          const shotIndex = Number(p.patch.shotIndex ?? 0);
          const shots = next.preDesignPack?.shots ?? [];
          const shot = shots[shotIndex] as { videoPrompt?: string; generation?: { videoPrompt?: string } } | undefined;
          if (!shot) continue;
          const vp = String(p.patch.videoPrompt ?? "");
          shot.videoPrompt = vp;
          shot.generation = { ...(shot.generation ?? {}), videoPrompt: vp };
          applied.push(`${p.checkId}:${p.path}`);
          continue;
        }
        if (p.patch.op === "setTransitionType") {
          const shotIndex = Number(p.patch.shotIndex ?? 0);
          const shots = next.preDesignPack?.shots ?? [];
          const shot = shots[shotIndex] as { narrative?: { transitionType?: string } } | undefined;
          if (!shot) continue;
          shot.narrative = { ...(shot.narrative ?? {}), transitionType: String(p.patch.transitionType ?? "切") };
          applied.push(`${p.checkId}:${p.path}`);
          continue;
        }
        if (p.patch.op === "setFxFeasibility") {
          const shotIndex = Number(p.patch.shotIndex ?? 0);
          const shots = next.preDesignPack?.shots ?? [];
          const shot = shots[shotIndex] as {
            shotIndex?: number;
            fxFeasibility?: string;
            generation?: { fxFeasibility?: string; fxPrompt?: string };
          } | undefined;
          if (!shot) continue;
          const level = String(p.patch.fxFeasibility ?? "F0");
          const shotNum = shot.shotIndex ?? shotIndex + 1;
          shot.fxFeasibility = level;
          shot.generation = { ...(shot.generation ?? {}), fxFeasibility: level };
          const root = next as {
            fxFeasibilityAudit?: { items?: { shotIndex?: number; level?: string; feasible?: boolean; desc?: string }[] };
          };
          if (!root.fxFeasibilityAudit) root.fxFeasibilityAudit = { items: [] };
          if (!Array.isArray(root.fxFeasibilityAudit.items)) root.fxFeasibilityAudit.items = [];
          const items = root.fxFeasibilityAudit.items;
          const existing = items.find((it) => it.shotIndex === shotNum);
          if (existing) {
            existing.level = level;
            existing.feasible = true;
            if (!existing.desc && level === "F0") existing.desc = "无特效";
          } else {
            items.push({
              shotIndex: shotNum,
              level,
              feasible: true,
              desc: level === "F0" ? "无特效" : undefined,
            });
          }
          applied.push(`${p.checkId}:${p.path}`);
          continue;
        }
        if (p.patch.op === "setDuration") {
          const shotIndex = Number(p.patch.shotIndex ?? 0);
          const shots = next.preDesignPack?.shots ?? [];
          const shot = shots[shotIndex] as { duration?: number; narrative?: { duration?: number } } | undefined;
          if (!shot) continue;
          const d = Number(p.patch.duration);
          if (Number.isFinite(d) && d > 0) {
            shot.duration = d;
            shot.narrative = { ...(shot.narrative ?? {}), duration: d };
            applied.push(`${p.checkId}:${p.path}`);
          }
          continue;
        }
        if (p.patch.op === "setAudioPrompt") {
          const shotIndex = Number(p.patch.shotIndex ?? 0);
          const shots = next.preDesignPack?.shots ?? [];
          const shot = shots[shotIndex] as { generation?: { audioPrompt?: string } } | undefined;
          if (!shot) continue;
          shot.generation = { ...(shot.generation ?? {}), audioPrompt: String(p.patch.audioPrompt ?? "") };
          applied.push(`${p.checkId}:${p.path}`);
          continue;
        }
        if (p.patch.op === "setFxPrompt") {
          const shotIndex = Number(p.patch.shotIndex ?? 0);
          const shots = next.preDesignPack?.shots ?? [];
          const shot = shots[shotIndex] as { generation?: { fxPrompt?: string }; visualEffect?: string } | undefined;
          if (!shot) continue;
          shot.generation = { ...(shot.generation ?? {}), fxPrompt: String(p.patch.fxPrompt ?? "") };
          applied.push(`${p.checkId}:${p.path}`);
          continue;
        }
        applied.push(`${p.checkId}:${p.path}:skipped`);
      }
      return { bundle: next, applied };
    },
  };
}

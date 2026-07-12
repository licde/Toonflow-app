import type { Knex } from "knex";
import type { HostHooks } from "./types";
import { inspectBundle } from "./inspectBundle";
import type { ImportOptions, ImportResult, DryRunImportSummary } from "../bundle/types";
import {
  importScriptBundle,
  importEpisodeBundle,
  dryRunImport,
  buildDryRunSummary,
} from "../bundle/importAdapter";

export interface ToonflowHostHooks extends HostHooks {
  db: Knex;
  importScriptBundle(raw: unknown, opts: ImportOptions): Promise<ImportResult>;
  importEpisodeBundle(raw: unknown, opts: ImportOptions): Promise<ImportResult>;
  dryRunImport(raw: unknown, opts: ImportOptions): Promise<DryRunImportSummary>;
  inspectBundle: typeof inspectBundle;
}

export function createToonflowHostHooks(db: Knex): ToonflowHostHooks {
  return {
    db,
    importScriptBundle: (raw: unknown, opts: ImportOptions) => importScriptBundle(db, raw, opts),
    importEpisodeBundle: (raw: unknown, opts: ImportOptions) => importEpisodeBundle(db, raw, opts),
    dryRunImport: (raw: unknown, opts: ImportOptions) => dryRunImport(db, raw, opts),
    inspectBundle,
    saveShots: async (shots) => {
      // Host persists storyboard panels — delegated to importAdapter storyboardSync at import time
      void shots;
    },
    onGenerationError: async (error) => {
      const result = inspectBundle({}, { genError: error });
      return { rePushPlan: result.rePushPlan };
    },
  };
}

export function inspectOnly(raw: unknown, opts: { tier?: "T1" | "T2" | "T3"; genError?: string; sfRound?: number } = {}) {
  return inspectBundle(raw, opts);
}

export { buildDryRunSummary };

/**
 * Optional ObservabilityPort → obs-kit (or host log sink).
 * Core PrecheckLoop never imports this; routes resolve via try/require.
 */
import type { ObservabilityPort, PrecheckObsEvent } from "../precheckLoop/ports";

export function createObsPrecheckPort(): ObservabilityPort {
  return {
    emit(event: PrecheckObsEvent) {
      // Lightweight host log — swap for @obs/sdk ingest when wired
      if (process.env.PRECHECK_OBS === "1" || process.env.DEBUG_PRECHECK === "1") {
        const summary = {
          kind: event.kind,
          checkIds: event.checkIds,
          ok: event.result?.ok,
          round: event.result?.round,
          fingerprints: event.findings?.map((f) => `${f.id}:${f.fingerprint}:${f.passed}`),
        };
        console.info("[precheck-obs]", JSON.stringify(summary));
      }
    },
  };
}

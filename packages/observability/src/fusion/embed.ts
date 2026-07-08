import type { Observability } from "../observability";

export function createEmbedClient(obs: Observability) {
  return {
    log: obs.log.bind(obs),
    logAiError: obs.logAiError.bind(obs),
    getTraceId: obs.getTraceId.bind(obs),
    runWithContext: obs.runWithContext.bind(obs),
  };
}

import type { Observability } from "../observability";

export function wrapAiSdkCall<T>(
  obs: Observability,
  meta: { vendorId: string; model: string; fnName: string; aiType?: string },
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  return obs.runWithContext({ module: "ai" }, async () => {
    try {
      const result = await fn();
      await obs.log({
        level: "info",
        category: "ai_call",
        module: "ai",
        vendorId: meta.vendorId,
        model: meta.model,
        message: `${meta.fnName} succeeded`,
        payload: { fnName: meta.fnName, aiType: meta.aiType, latencyMs: Date.now() - start },
      });
      return result;
    } catch (e) {
      await obs.logAiError(e, {
        vendorId: meta.vendorId,
        model: meta.model,
        module: "ai",
        aiType: meta.aiType || meta.fnName,
        latencyMs: Date.now() - start,
      });
      throw e;
    }
  });
}

export function createAiSdkAdapter(obs: Observability) {
  return { wrap: wrapAiSdkCall.bind(null, obs) };
}

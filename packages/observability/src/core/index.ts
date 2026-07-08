export * from "./redact";
export * from "./fingerprint";
export * from "./errors";

const LEVEL_ORDER = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

export function levelGte(a: string, b: string): boolean {
  return LEVEL_ORDER.indexOf(a as any) >= LEVEL_ORDER.indexOf(b as any);
}

export { SwitchManager } from "./switchManager";
export { WriteQueue } from "./writeQueue";
export { DegradedChain } from "./degraded";
export { parseTraceparent, formatTraceparent, runWithObsContext, getObsContext, obsAls } from "./context";
export { shouldSample } from "./sampler";
export { registerShutdownHandlers, onObsShutdown } from "./shutdown";

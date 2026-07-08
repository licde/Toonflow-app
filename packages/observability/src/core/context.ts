import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export type ObsContext = {
  traceId: string;
  spanSeq: number;
  module?: string;
  projectId?: number;
  entityRefs?: Record<string, number | undefined>;
  muteCategories?: Record<string, boolean>;
  sampled?: boolean;
};

export const obsAls = new AsyncLocalStorage<ObsContext>();

export function parseTraceparent(header?: string): string | undefined {
  if (!header) return undefined;
  const parts = header.split("-");
  if (parts.length >= 2 && parts[0] === "00" && parts[1]) return parts[1];
  return undefined;
}

export function formatTraceparent(traceId: string): string {
  const spanId = randomUUID().replace(/-/g, "").slice(0, 16);
  return `00-${traceId.replace(/-/g, "").slice(0, 32)}-${spanId}-01`;
}

export function runWithObsContext<T>(ctx: Partial<ObsContext>, fn: () => T): T {
  const parent = obsAls.getStore();
  const traceId = ctx.traceId || parent?.traceId || randomUUID();
  const store: ObsContext = {
    traceId,
    spanSeq: parent?.spanSeq ?? 0,
    module: ctx.module ?? parent?.module,
    projectId: ctx.projectId ?? parent?.projectId,
    entityRefs: { ...parent?.entityRefs, ...ctx.entityRefs },
    muteCategories: { ...parent?.muteCategories, ...ctx.muteCategories },
    sampled: ctx.sampled ?? parent?.sampled,
  };
  return obsAls.run(store, fn);
}

export function getObsContext(): ObsContext | undefined {
  return obsAls.getStore();
}

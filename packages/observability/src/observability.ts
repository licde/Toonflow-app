import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { EntityRefs, LogCategory, LogEvent, LogLevel, LogSink, SwitchConfig } from "./types";
import {
  categorizeAiError,
  computeFingerprint,
  extractUpstreamMessage,
  levelGte,
  sanitizeMessage,
  truncatePayload,
} from "./core";
import { diagnosePlaybook } from "./analyze/playbooks";
import { SwitchManager } from "./core/switchManager";
import { WriteQueue } from "./core/writeQueue";
import { DegradedChain } from "./core/degraded";
import { registerShutdownHandlers } from "./core/shutdown";

export interface ObservabilityOptions {
  appId: string;
  appVersion?: string;
  logDir?: string;
  switches?: Partial<SwitchConfig>;
}

type Ctx = {
  traceId: string;
  spanSeq: number;
  module?: string;
  projectId?: number;
  entityRefs?: EntityRefs;
  muteCategories?: Partial<Record<LogCategory, boolean>>;
};

const als = new AsyncLocalStorage<Ctx>();

export class Observability {
  readonly appId: string;
  readonly appVersion?: string;
  readonly logDir?: string;
  private switches: SwitchConfig;
  private switchManager: SwitchManager;
  private sinks: LogSink[] = [];
  private writeQueue: WriteQueue;
  private degraded = new DegradedChain();
  private spanCounters = new Map<string, number>();
  private rateWindow = new Map<string, { count: number; ts: number }>();
  private seenEventIds = new Set<string>();

  constructor(opts: ObservabilityOptions) {
    this.appId = opts.appId;
    this.appVersion = opts.appVersion;
    this.logDir = opts.logDir;
    this.switches = {
      enabled: opts.switches?.enabled ?? true,
      level: opts.switches?.level ?? "info",
      transports: { stdout: true, file: true, sqlite: true, ...opts.switches?.transports },
      categories: { http: true, ai_call: true, vendor: true, system: true, task: true, client: false, audit: true, ...opts.switches?.categories },
      modules: opts.switches?.modules ?? {},
      vendors: opts.switches?.vendors ?? {},
      features: { trace: true, sampler: true, redact: true, promptDebug: false, recommend: true, fingerprint: true, playbook: true, ...opts.switches?.features },
      retentionDays: opts.switches?.retentionDays ?? 30,
      logDir: opts.logDir,
    };
    this.switchManager = new SwitchManager(this.switches);
    this.writeQueue = new WriteQueue();
    this.writeQueue.start();
    registerShutdownHandlers(this.writeQueue);
  }

  getDegradedState() {
    return this.degraded.getState();
  }

  registerSink(sink: LogSink) {
    this.sinks.push(sink);
    this.writeQueue.setSinks([...this.sinks]);
  }

  updateSwitches(patch: Partial<SwitchConfig>) {
    this.switchManager.update(patch);
    this.switches = this.switchManager.get();
  }

  getSwitches(): SwitchConfig {
    return JSON.parse(JSON.stringify(this.switches));
  }

  applyProfile(name: "balanced" | "secure" | "performance" | "debug") {
    this.switchManager.setProfile(name);
    this.switches = this.switchManager.get();
  }

  runWithContext<T>(ctx: Partial<Ctx>, fn: () => T): T {
    const parent = als.getStore();
    const traceId = ctx.traceId || parent?.traceId || randomUUID();
    const store: Ctx = {
      traceId,
      spanSeq: parent?.spanSeq ?? 0,
      module: ctx.module ?? parent?.module,
      projectId: ctx.projectId ?? parent?.projectId,
      entityRefs: { ...parent?.entityRefs, ...ctx.entityRefs },
      muteCategories: { ...parent?.muteCategories, ...ctx.muteCategories },
    };
    return als.run(store, fn);
  }

  getTraceId(): string | undefined {
    return als.getStore()?.traceId;
  }

  withLocalSwitch<T>(patch: { muteCategories?: Partial<Record<LogCategory, boolean>> }, fn: () => Promise<T>): Promise<T> {
    const parent = als.getStore();
    return this.runWithContext({ traceId: parent?.traceId, muteCategories: patch.muteCategories }, () => fn());
  }

  private nextSpan(traceId: string): number {
    const n = (this.spanCounters.get(traceId) ?? 0) + 1;
    this.spanCounters.set(traceId, n);
    return n;
  }

  private allowRate(key: string, maxPerMin: number): boolean {
    const now = Date.now();
    const row = this.rateWindow.get(key);
    if (!row || now - row.ts > 60_000) {
      this.rateWindow.set(key, { count: 1, ts: now });
      return true;
    }
    if (row.count >= maxPerMin) return false;
    row.count += 1;
    return true;
  }

  private shouldLog(event: LogEvent): boolean {
    if (!this.switches.enabled) return false;
    if (!levelGte(event.level, this.switches.level)) return false;
    if (this.switches.categories[event.category] === false) return false;
    const ctx = als.getStore();
    if (ctx?.muteCategories?.[event.category]) return false;
    if (event.module && this.switches.modules[event.module] === false) return false;
    if (event.vendorId && this.switches.vendors[event.vendorId] === false) return false;
    const cap = event.category === "vendor" ? 30 : event.category === "http" ? 500 : 5000;
    if (!this.allowRate(`${event.category}:${event.module}:${event.vendorId}`, cap) && event.level !== "error" && event.level !== "fatal") return false;
    return true;
  }

  async log(partial: Omit<LogEvent, "schemaVersion" | "ts" | "appId"> & { ts?: number }) {
    const ctx = als.getStore();
    const traceId = partial.traceId || ctx?.traceId;
    const spanSeq = traceId ? this.nextSpan(traceId) : undefined;
    const message = this.switches.features.redact ? sanitizeMessage(partial.message) : partial.message;
    let payload = this.switches.features.redact ? truncatePayload(partial.payload) : partial.payload;

    if ((partial.level === "error" || partial.level === "fatal") && this.switches.features.fingerprint) {
      const ec = String(payload?.errorCategory || "unknown");
      partial.errorFingerprint = partial.errorFingerprint || computeFingerprint(partial.vendorId, ec, message);
    }

    const event: LogEvent = {
      schemaVersion: 1,
      ts: partial.ts ?? Date.now(),
      appId: this.appId,
      appVersion: this.appVersion,
      instanceId: `${process.pid}`,
      traceId,
      spanSeq,
      ...partial,
      message,
      payload,
      projectId: partial.projectId ?? ctx?.projectId ?? partial.entityRefs?.projectId,
      entityRefs: { ...ctx?.entityRefs, ...partial.entityRefs },
    };

    if (event.eventId && this.seenEventIds.has(event.eventId)) return;
    if (event.eventId) this.seenEventIds.add(event.eventId);

    if (!this.shouldLog(event)) return;

    this.writeQueue.enqueue(event);
  }

  async logAiError(err: unknown, meta: { vendorId?: string; model?: string; module?: string; aiType?: string; latencyMs?: number }) {
    const errorCategory = categorizeAiError(err);
    const upstreamMessage = extractUpstreamMessage(err);
    await this.log({
      level: "error",
      category: "ai_call",
      message: upstreamMessage || String(err),
      module: meta.module,
      vendorId: meta.vendorId,
      model: meta.model,
      payload: {
        errorCategory,
        upstreamMessage,
        aiType: meta.aiType,
        latencyMs: meta.latencyMs,
        suggestion: diagnosePlaybook({ errorCategory, vendorId: meta.vendorId, message: upstreamMessage }).conclusion,
      },
    });
  }

  diagnose(_traceId: string, events: LogEvent[]) {
    const err = events.find((e) => e.level === "error" || e.level === "fatal");
    if (!err) return { conclusion: "未发现错误事件", suggestions: [] as string[] };
    return diagnosePlaybook({
      errorCategory: String(err.payload?.errorCategory || "unknown"),
      vendorId: err.vendorId,
      message: err.message,
    });
  }
}

let globalObs: Observability | null = null;

export function createObservability(opts: ObservabilityOptions): Observability {
  globalObs = new Observability(opts);
  return globalObs;
}

export function getObservability(): Observability | null {
  return globalObs;
}

export { als as observabilityAls };

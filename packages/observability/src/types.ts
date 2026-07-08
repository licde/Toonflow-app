export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type LogCategory = "http" | "ai_call" | "vendor" | "system" | "task" | "client" | "audit";

export type AiErrorCategory =
  | "auth"
  | "rate_limit"
  | "timeout"
  | "provider_down"
  | "invalid_request"
  | "content_filter"
  | "quota_exceeded"
  | "unknown";

export interface EntityRefs {
  projectId?: number;
  storyboardId?: number;
  assetId?: number;
  taskId?: number;
  scriptId?: number;
}

export interface LogEvent {
  schemaVersion: 1;
  ts: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  traceId?: string;
  spanSeq?: number;
  spanId?: string;
  appId: string;
  appVersion?: string;
  instanceId?: string;
  module?: string;
  vendorId?: string;
  model?: string;
  projectId?: number;
  taskId?: number;
  errorFingerprint?: string;
  eventId?: string;
  entityRefs?: EntityRefs;
  payload?: Record<string, unknown>;
}

export interface SwitchConfig {
  enabled: boolean;
  level: LogLevel;
  transports: { stdout: boolean; file: boolean; sqlite: boolean };
  categories: Partial<Record<LogCategory, boolean>>;
  modules: Record<string, boolean>;
  vendors: Record<string, boolean>;
  features: {
    trace: boolean;
    sampler: boolean;
    redact: boolean;
    promptDebug: boolean;
    recommend: boolean;
    fingerprint: boolean;
    playbook: boolean;
  };
  retentionDays: number;
  logDir?: string;
}

export interface Recommendation {
  id: string;
  category: "security" | "performance" | "simplicity" | "integration" | "vendor";
  title: string;
  reason: string;
  confidence: number;
  impact: "low" | "medium" | "high";
  safe: boolean;
  action?: { type: string; payload: Record<string, unknown> };
}

export type LogSink = (event: LogEvent) => void | Promise<void>;

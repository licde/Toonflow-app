import type { LogEvent } from "../types";
import { diagnosePlaybook } from "./playbooks";

/** 可选 AI 助手：基于 Playbook + 最近事件生成排障摘要（不调用外部 LLM） */
export function buildAssistantSummary(traceId: string, events: LogEvent[]) {
  const err = events.find((e) => e.level === "error" || e.level === "fatal");
  if (!err) return { traceId, summary: "链路中未发现错误事件", suggestions: [] as string[] };
  const pb = diagnosePlaybook({
    errorCategory: String(err.payload?.errorCategory || "unknown"),
    vendorId: err.vendorId,
    message: err.message,
  });
  return {
    traceId,
    summary: pb.conclusion,
    playbookId: pb.playbookId,
    suggestions: pb.suggestions,
    relatedEvents: events.length,
  };
}

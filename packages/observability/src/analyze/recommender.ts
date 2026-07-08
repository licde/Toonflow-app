import type { LogEvent, Recommendation, SwitchConfig } from "../types";
import { aggregateVendors } from "./aggregate";

export function buildRecommendations(events: LogEvent[], switches: SwitchConfig): Recommendation[] {
  const recs: Recommendation[] = [];
  if (switches?.features?.promptDebug) {
    recs.push({
      id: "rec_disable_prompt_debug",
      category: "security",
      title: "关闭 prompt 调试模式",
      reason: "promptDebug 开启可能泄露剧本内容",
      confidence: 0.9,
      impact: "medium",
      safe: true,
      action: { type: "setSwitch", payload: { "features.promptDebug": false } },
    });
  }
  const vendors = aggregateVendors(events).sort((a, b) => b.score - a.score);
  if (vendors[0]) {
    recs.push({
      id: "rec_vendor_top",
      category: "vendor",
      title: `推荐优先使用 ${vendors[0].vendorId}`,
      reason: `近 7 天成功率约 ${(vendors[0].successRate * 100).toFixed(0)}%，P95 ${vendors[0].p95Ms}ms`,
      confidence: 0.75,
      impact: "low",
      safe: false,
    });
  }
  if (switches.level === "debug") {
    recs.push({
      id: "rec_profile_balanced",
      category: "performance",
      title: "切换为 balanced Profile",
      reason: "当前 debug 级别日志量较大",
      confidence: 0.8,
      impact: "low",
      safe: true,
      action: { type: "setProfile", payload: { profile: "balanced" } },
    });
  }
  const failBurst = events.filter((e) => e.level === "error" && e.category === "ai_call").length;
  if (failBurst > 20) {
    recs.push({
      id: "rec_reduce_concurrency",
      category: "performance",
      title: "降低并发 AI 任务",
      reason: `近期 AI 错误 ${failBurst} 条`,
      confidence: 0.7,
      impact: "medium",
      safe: true,
    });
  }
  return recs;
}

export function computeHealthScore(events: LogEvent[]): number {
  const ai = events.filter((e) => e.category === "ai_call");
  if (!ai.length) return 1;
  const fails = ai.filter((e) => e.level === "error").length;
  return Math.max(0, 1 - fails / ai.length);
}

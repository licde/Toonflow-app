import type { LogEvent, Recommendation } from "./types";
import { computeFingerprint } from "./core";

export interface PlaybookInput {
  errorCategory: string;
  vendorId?: string;
  message?: string;
}

export function diagnosePlaybook(input: PlaybookInput): { conclusion: string; suggestions: string[]; playbookId?: string } {
  const { errorCategory, vendorId, message = "" } = input;
  if (errorCategory === "auth")
    return {
      playbookId: "pb_auth_invalid",
      conclusion: "API Key 无效或过期",
      suggestions: ["打开设置 → 模型配置，检查供应商 API Key", vendorId ? `检查厂商 ${vendorId} 的密钥` : ""].filter(Boolean),
    };
  if (errorCategory === "rate_limit")
    return {
      playbookId: "pb_rate_limit",
      conclusion: "厂商限流（429）",
      suggestions: ["等待 60 秒后重试", "切换备用模型/厂商", "降低并发任务数"],
    };
  if (message.includes("localhost") || message.includes("127.0.0.1"))
    return {
      playbookId: "pb_oss_localhost",
      conclusion: "参考图为本地 URL，外部 API 无法拉取",
      suggestions: ["配置环境变量 ossURL 为公网地址（如 ngrok）", "确认参考图已上传到 OSS"],
    };
  if (errorCategory === "timeout")
    return {
      playbookId: "pb_timeout_poll",
      conclusion: "异步任务超时",
      suggestions: ["检查厂商任务状态", "增大轮询超时或换同步接口厂商"],
    };
  if (errorCategory === "content_filter")
    return {
      playbookId: "pb_content_filter",
      conclusion: "内容审核拦截",
      suggestions: ["修改 prompt 后重试", "尝试其他模型"],
    };
  if (errorCategory === "quota_exceeded")
    return {
      playbookId: "pb_quota",
      conclusion: "额度不足",
      suggestions: ["充值或更换厂商", "检查账户余额"],
    };
  return { conclusion: "未知错误，请查看链路详情", suggestions: ["复制 traceId 联系支持"] };
}

export function buildRecommendations(events: LogEvent[], switches: any): Recommendation[] {
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
  const byVendor = new Map<string, { ok: number; fail: number }>();
  for (const e of events) {
    if (!e.vendorId || e.category !== "ai_call") continue;
    const row = byVendor.get(e.vendorId) || { ok: 0, fail: 0 };
    if (e.level === "error") row.fail += 1;
    else row.ok += 1;
    byVendor.set(e.vendorId, row);
  }
  const rankings = [...byVendor.entries()]
    .map(([vendorId, v]) => ({
      vendorId,
      score: v.ok + v.fail ? v.ok / (v.ok + v.fail) : 0,
      successRate: v.ok + v.fail ? v.ok / (v.ok + v.fail) : 0,
    }))
    .sort((a, b) => b.score - a.score);
  if (rankings[0]) {
    recs.push({
      id: "rec_vendor_top",
      category: "vendor",
      title: `推荐优先使用 ${rankings[0].vendorId}`,
      reason: `近 7 天成功率约 ${(rankings[0].successRate * 100).toFixed(0)}%`,
      confidence: 0.75,
      impact: "low",
      safe: false,
    });
  }
  return recs;
}

export function aggregateVendors(events: LogEvent[]) {
  const map = new Map<string, { ok: number; fail: number; latencies: number[] }>();
  for (const e of events) {
    if (!e.vendorId) continue;
    const row = map.get(e.vendorId) || { ok: 0, fail: 0, latencies: [] };
    if (e.level === "error") row.fail += 1;
    else row.ok += 1;
    const lat = Number(e.payload?.latencyMs);
    if (lat > 0) row.latencies.push(lat);
    map.set(e.vendorId, row);
  }
  return [...map.entries()].map(([vendorId, v]) => {
    const lat = v.latencies.sort((a, b) => a - b);
    const p95 = lat.length ? lat[Math.floor(lat.length * 0.95)] || lat[lat.length - 1] : 0;
    const successRate = v.ok + v.fail ? v.ok / (v.ok + v.fail) : 0;
    return { vendorId, successRate, p95Ms: p95, score: successRate * 0.7 + (p95 ? Math.min(1, 3000 / p95) * 0.3 : 0) };
  });
}

export function findSimilar(events: LogEvent[], fingerprint: string) {
  return events.filter((e) => e.errorFingerprint === fingerprint);
}

export { computeFingerprint };

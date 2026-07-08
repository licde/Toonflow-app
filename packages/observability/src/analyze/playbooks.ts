export interface PlaybookInput {
  errorCategory: string;
  vendorId?: string;
  message?: string;
}

export interface PlaybookResult {
  conclusion: string;
  suggestions: string[];
  playbookId?: string;
}

const PLAYBOOKS: Array<{ id: string; match: (i: PlaybookInput) => boolean; result: (i: PlaybookInput) => PlaybookResult }> = [
  {
    id: "pb_auth_invalid",
    match: (i) => i.errorCategory === "auth",
    result: (i) => ({
      playbookId: "pb_auth_invalid",
      conclusion: "API Key 无效或过期",
      suggestions: ["打开设置 → 模型配置，检查供应商 API Key", i.vendorId ? `检查厂商 ${i.vendorId} 的密钥` : ""].filter(Boolean),
    }),
  },
  {
    id: "pb_rate_limit",
    match: (i) => i.errorCategory === "rate_limit",
    result: () => ({
      playbookId: "pb_rate_limit",
      conclusion: "厂商限流（429）",
      suggestions: ["等待 60 秒后重试", "切换备用模型/厂商", "降低并发任务数"],
    }),
  },
  {
    id: "pb_oss_localhost",
    match: (i) => (i.message || "").includes("localhost") || (i.message || "").includes("127.0.0.1"),
    result: () => ({
      playbookId: "pb_oss_localhost",
      conclusion: "参考图为本地 URL，外部 API 无法拉取",
      suggestions: ["配置环境变量 ossURL 为公网地址（如 ngrok）", "确认参考图已上传到 OSS"],
    }),
  },
  {
    id: "pb_timeout_poll",
    match: (i) => i.errorCategory === "timeout",
    result: () => ({
      playbookId: "pb_timeout_poll",
      conclusion: "异步任务超时",
      suggestions: ["检查厂商任务状态", "增大轮询超时或换同步接口厂商"],
    }),
  },
  {
    id: "pb_content_filter",
    match: (i) => i.errorCategory === "content_filter",
    result: () => ({
      playbookId: "pb_content_filter",
      conclusion: "内容审核拦截",
      suggestions: ["修改 prompt 后重试", "尝试其他模型"],
    }),
  },
  {
    id: "pb_quota",
    match: (i) => i.errorCategory === "quota_exceeded",
    result: () => ({
      playbookId: "pb_quota",
      conclusion: "额度不足",
      suggestions: ["充值或更换厂商", "检查账户余额"],
    }),
  },
  {
    id: "pb_provider_down",
    match: (i) => i.errorCategory === "provider_down",
    result: () => ({
      playbookId: "pb_provider_down",
      conclusion: "厂商服务不可用（502/503/504）",
      suggestions: ["稍后重试", "切换备用厂商", "查看厂商状态页"],
    }),
  },
];

export function diagnosePlaybook(input: PlaybookInput): PlaybookResult {
  for (const pb of PLAYBOOKS) {
    if (pb.match(input)) return pb.result(input);
  }
  return { playbookId: "pb_unknown", conclusion: "未知错误，请查看链路详情", suggestions: ["复制 traceId 联系支持"] };
}

export function listPlaybookIds() {
  return PLAYBOOKS.map((p) => p.id);
}

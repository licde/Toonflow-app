# 自定义 Playbook 诊断规则

扩展内置 playbook，为业务特有错误提供固定结论与修复建议。

## 适用场景

- 新增内部错误码（如 `STORYBOARD_LOCKED`）需要一键诊断文案
- 厂商返回信息匹配关键字（本地 URL、额度不足）已有内置规则，需补充业务规则
- 在 `POST /api/logs/diagnose` 返回可操作的 `suggestions`

## 前置条件

- 错误日志 `payload.errorCategory` 或 `message` 可被规则匹配
- 熟悉现有 playbook ID 列表：`listPlaybookIds()`（`packages/observability/src/analyze/playbooks.ts`）
- 修改 playbook 需重新构建/重启 Node 服务（当前为编译期数组，非热加载）

## 完整代码

**内置 playbook 结构（节选）：**

```typescript
// packages/observability/src/analyze/playbooks.ts
const PLAYBOOKS = [
  {
    id: "pb_rate_limit",
    match: (i) => i.errorCategory === "rate_limit",
    result: () => ({
      playbookId: "pb_rate_limit",
      conclusion: "厂商限流（429）",
      suggestions: ["等待 60 秒后重试", "切换备用模型/厂商"],
    }),
  },
  // ...
];

export function diagnosePlaybook(input: PlaybookInput): PlaybookResult {
  for (const pb of PLAYBOOKS) {
    if (pb.match(input)) return pb.result(input);
  }
  return { playbookId: "pb_unknown", conclusion: "未知错误，请查看链路详情", suggestions: ["复制 traceId 联系支持"] };
}
```

**新增自定义规则（fork 后添加）：**

```typescript
{
  id: "pb_storyboard_locked",
  match: (i) => (i.message || "").includes("STORYBOARD_LOCKED"),
  result: () => ({
    playbookId: "pb_storyboard_locked",
    conclusion: "分镜正在被其他用户编辑",
    suggestions: ["等待对方释放锁", "联系管理员强制解锁"],
  }),
},
```

**写入可诊断的日志：**

```typescript
await getObs().log({
  level: "error",
  category: "task",
  message: "STORYBOARD_LOCKED: project 42",
  traceId: getObs().getTraceId(),
  payload: { errorCategory: "invalid_request" },
});
```

**调用诊断 API：**

```bash
curl -s -X POST http://localhost:10588/api/logs/diagnose \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"traceId": "<traceId>"}' | jq .
```

`Observability.diagnose()` 会取 trace 内最后一条 error 的 `errorCategory` 与 `message` 传入 `diagnosePlaybook`。

## 预期输出

匹配成功时：

```json
{
  "playbookId": "pb_storyboard_locked",
  "conclusion": "分镜正在被其他用户编辑",
  "suggestions": ["等待对方释放锁", "联系管理员强制解锁"]
}
```

未匹配时 `playbookId: "pb_unknown"`。

## FAQ

**Q1：能否通过配置文件添加 playbook？**  
当前版本为代码内数组；路线图支持外部 YAML。临时方案可在业务层包装 `diagnose` API 追加自定义结论。

**Q2：`errorCategory` 有哪些标准值？**  
见 `AiErrorCategory`：`auth | rate_limit | timeout | provider_down | invalid_request | content_filter | quota_exceeded | unknown`（`packages/observability/src/types.ts`）。

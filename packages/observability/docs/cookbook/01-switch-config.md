# 运行时开关与 Profile 切换

在不重启服务的情况下调整日志级别、传输通道与预设 Profile。

## 适用场景

- 生产环境临时打开 `debug` 排查，结束后切回 `balanced`
- 磁盘紧张时关闭 `file` transport，仅保留 `sqlite`
- 通过 HTTP API 远程运维多实例 Toonflow

## 前置条件

- Toonflow 已启动且 JWT 有效
- 了解四种 Profile：`balanced` | `secure` | `performance` | `debug`（定义于 `packages/observability/src/profiles.ts`）
- 宿主在 `src/observability/bootstrap.ts` 中支持 `OBS_PROFILE`、`OBS_ENABLED` 环境变量

## 完整代码

**读取当前开关：**

```bash
curl -s http://localhost:10588/api/logs/switches/getSwitches \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" | jq .
```

**更新为 debug Profile 并关闭 stdout：**

```bash
curl -s -X POST http://localhost:10588/api/logs/switches/updateSwitches \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "profile": "debug",
    "enabled": true,
    "transports": { "stdout": false, "file": true, "sqlite": true }
  }' | jq .
```

**应用内代码（Node SDK）：**

```typescript
import { getObs } from "@/observability/bootstrap";

const obs = getObs();

// 应用预设
obs.applyProfile("performance");

// 细粒度 patch
obs.updateSwitches({
  level: "warn",
  categories: { http: false, client: false },
  vendors: { agnesai: true },
});

console.log(obs.getSwitches());
```

**配置文件** `observability.config.json`（示例见 `observability.config.example.json`）：

```json
{
  "appId": "my-app",
  "profile": "balanced",
  "switches": {
    "enabled": true,
    "level": "info",
    "transports": { "stdout": true, "file": true, "sqlite": false }
  },
  "logDir": "./logs"
}
```

`createFromConfigFile()` 会合并文件 + `OBS_PROFILE` 环境变量（`packages/observability/src/configFile.ts`）。

## 预期输出

`getSwitches` 返回完整 `SwitchConfig`，含 `features.trace`、`features.redact`、`retentionDays` 等。

切换 `profile: "debug"` 后：

- `level` → `debug`
- `features.sampler` → `false`（全量采样）
- `features.promptDebug` → `true`

新产生的 HTTP 请求日志级别更细；已写入 JSONL 的历史不受影响。

## FAQ

**Q1：`secure` 与 `performance` 有何差异？**  
`secure` 关闭 `client`、`http` category 并保持 `redact`；`performance` 同样关闭高频 category 但保留 sampler，适合高 QPS API。

**Q2：API 更新开关会持久化到磁盘吗？**  
运行时 `updateSwitches` 仅内存生效；重启后由 `observability.config.json` 与环境变量重新加载。需永久变更请改配置文件或部署模板。

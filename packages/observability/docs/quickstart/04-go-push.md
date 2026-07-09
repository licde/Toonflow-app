# Go Push 上报

Go 微服务或 CLI 通过标准库 `net/http` 向 Toonflow 注入结构化日志。

## 适用场景

- Go 编写的转码、推理网关、定时任务需要与 Node 主应用统一日志中心
- 容器内无 Node 运行时，仅需轻量 HTTP 客户端
- 与 Python Push、Sidecar 模式共用 ingest API

## 前置条件

- Go 1.20+
- Toonflow 运行中，JWT 通过 `TOONFLOW_TOKEN` 注入
- 出站 HTTPS 若走自签证书，需配置 `http.Transport` TLS（生产建议正规证书）

## 完整代码

与 `packages/observability/examples/go-ingest/main.go` 一致：

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

func main() {
	ingest := os.Getenv("TOONFLOW_LOG_INGEST")
	if ingest == "" {
		ingest = "http://localhost:10588/api/logs/ingest"
	}
	token := os.Getenv("TOONFLOW_TOKEN")
	event := map[string]any{
		"level":    "error",
		"category": "system",
		"message":  "simulated failure from go",
		"traceId":  "demo-trace-go",
	}
	body, _ := json.Marshal(event)
	req, _ := http.NewRequest("POST", ingest, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	fmt.Println("status", res.StatusCode)
}
```

带重试与超时的生产片段：

```go
client := &http.Client{Timeout: 10 * time.Second}
for attempt := 0; attempt < 3; attempt++ {
    res, err := client.Do(req)
    if err == nil && res.StatusCode == 200 {
        break
    }
    time.Sleep(time.Duration(attempt+1) * time.Second)
}
```

运行：

```bash
export TOONFLOW_TOKEN="<jwt>"
go run packages/observability/examples/go-ingest/main.go
```

也可使用 SDK 中的 `createPushClient` 模式（Node 侧参考 `packages/observability/src/fusion/push.ts`）。

## 预期输出

```
status 200
```

查询验证：

```bash
curl -s -X POST http://localhost:10588/api/logs/query \
  -H "Authorization: Bearer $TOONFLOW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"traceId":"demo-trace-go","limit":10}' | jq .
```

返回 `data.rows` 中含 `message: "simulated failure from go"`。

## FAQ

**Q1：401 Unauthorized？**  
检查 `Authorization: Bearer <token>` 前缀、token 是否过期、服务器 `tokenKey` 是否已配置（见 `troubleshooting/02-auth-401.md`）。

**Q2：能否在 Go 里复用 Node 的 `createPushClient`？**  
不能；保持 HTTP JSON 契约即可。字段定义见 `docs/api/openapi.yaml` 的 `LogIngestRequest`。

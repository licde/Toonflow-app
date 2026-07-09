# Python Push 上报

异构 Python 脚本/服务通过 HTTP 将日志推送到 Toonflow 日志中心。

## 适用场景

- Python 批处理、Celery Worker、Jupyter 流水线调用 AI 厂商失败需集中查看
- 无法嵌入 Node SDK，只需单向 Push
- 与 Go/小程序 Sidecar 共用同一 `POST /api/logs/ingest` 契约

## 前置条件

- Toonflow API 已启动（默认 `http://localhost:10588`）
- 已通过 `POST /api/login/login` 获取 JWT，设为环境变量 `TOONFLOW_TOKEN`
- 网络可达 Toonflow 主机（Docker 部署时注意端口映射）

## 完整代码

与 `packages/observability/examples/python-ingest/push.py` 一致：

```python
"""Push 模式示例：向 Toonflow ingest 上报日志"""
import os
import json
import urllib.request

INGEST = os.environ.get("TOONFLOW_LOG_INGEST", "http://localhost:10588/api/logs/ingest")
TOKEN = os.environ.get("TOONFLOW_TOKEN", "")

event = {
    "level": "error",
    "category": "ai_call",
    "message": "simulated vendor failure",
    "vendorId": "agnesai",
    "traceId": "demo-trace-python",
    "payload": {"errorCategory": "rate_limit"},
}

req = urllib.request.Request(
    INGEST,
    data=json.dumps(event).encode("utf-8"),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"},
    method="POST",
)
with urllib.request.urlopen(req) as resp:
    print(resp.status, resp.read().decode())
```

使用 `requests` 的等价写法：

```python
import os, requests

r = requests.post(
    os.environ["TOONFLOW_LOG_INGEST"],
    json={
        "level": "info",
        "category": "task",
        "message": "batch job finished",
        "projectId": 42,
    },
    headers={"Authorization": f"Bearer {os.environ['TOONFLOW_TOKEN']}"},
    timeout=10,
)
print(r.json())
```

运行：

```bash
export TOONFLOW_TOKEN="<jwt>"
export TOONFLOW_LOG_INGEST=http://localhost:10588/api/logs/ingest
python packages/observability/examples/python-ingest/push.py
```

服务端校验见 `src/routes/logs/ingest.ts`：`level`、`category`、`message` 为必填。

## 预期输出

**终端：**

```
200 {"code":200,"data":{"accepted":true},"message":"成功"}
```

**日志中心**：`POST /api/logs/query` 可筛到 `traceId=demo-trace-python`、`vendorId=agnesai` 的记录；`POST /api/logs/diagnose` 对应该 trace 可能命中 playbook `pb_rate_limit`。

## FAQ

**Q1：`category` 有哪些合法值？**  
`http | ai_call | vendor | system | task | client | audit`，与 `LogCategory` 及 ingest 路由 Zod 校验一致。

**Q2：高吞吐怎么办？**  
改用 `POST /api/logs/ingest/batch`，或 Sidecar `scripts/tail-to-ingest.ts` 批量推送（见 `06-sidecar-tail.md`）。

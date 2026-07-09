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

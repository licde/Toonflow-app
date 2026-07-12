---
name: smart_detection_modality
description: SD-IMG/VID/AUD/FX 四模态子检
stageId: SD-MOD
rulePackVersion: "2.0.1"
---

# SD 四模态子检（smart_detection_modality）

挂载于 MD 阶段与 T3 export 前；结果写入 `smartDetection.modalityChecks`。

## SD-IMG

| ID | 检查 | severity |
|----|------|----------|
| SD-IMG-01 | cref 可解析 | BLOCK |
| SD-IMG-02 | PURE 类型 negative 前置 | BLOCK |

## SD-VID

| ID | 检查 | severity |
|----|------|----------|
| SD-VID-01 | referenceImage / 分镜图（Agnes） | BLOCK |
| SD-VID-02 | motion 白名单 | BLOCK |
| SD-VID-03 | duration 1–30 | WARN |
| SD-VID-04 | lipSync 与 lines 镜数 | WARN |

## SD-AUD

| ID | 检查 | severity |
|----|------|----------|
| SD-AUD-01 | lines hash vs SB | BLOCK |
| SD-AUD-02 | voiceProfile vs BP L6 | BLOCK |
| SD-AUD-03 | videoAudioPolicy 路径 | BLOCK |
| SD-AUD-04 | OS/VO deliveryType | WARN |

## SD-FX

| ID | 检查 | severity |
|----|------|----------|
| SD-FX-01 | feasibilityLevel 已标注 | BLOCK |
| SD-FX-02 | F5 有 degrade 或拆镜 | BLOCK |
| SD-FX-03 | F3+ 同镜 VID 复杂度 | WARN |

## schema 片段

```json
{
  "smartDetection": {
    "modalityChecks": [
      { "id": "SD-VID-01", "modality": "VID", "passed": false, "severity": "BLOCK", "fix": "生成首位帧分镜图" }
    ]
  }
}
```

## 下游

FAIL → smart_fix（SF）→ rePushPlan → corridor_repush。

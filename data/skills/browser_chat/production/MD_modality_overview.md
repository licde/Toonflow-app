---
name: MD_modality_overview
description: MD 四模态编排总览 IMG/VID/AUD/FX
stageId: MD
outputTag: modalityAudit
rulePackVersion: "2.0.1"
---

# MD 四模态总览（T3）

T3 档位：在 EN compile 基础上，为每 shot 生成 IMG/VID/AUD/FX 四模态 prompt 槽位。

## 入口条件

- T2 corridor_EN 已通过
- visualLockTable 可用
- ModalityOrchestrator 路由表对齐 rulePack 2.0.1

## 四模态职责

| 模态 | 槽位 | 输入 | Touch 级别 |
|------|------|------|------------|
| IMG | imagePrompt | Y.subject + refs | L0 Gate |
| VID | videoPrompt | Y.spatial + performance | L0 Gate |
| AUD | audioPrompt | dialogue + voiceLock | L0 Gate |
| FX | fxPrompt | fxFeasibility F 等级 | L1 可选 |

## modalityAudit 结构

```json
{
  "modalityAudit": {
    "rulePackVersion": "2.0.1",
    "shots": [
      {
        "shotId": "shot-1",
        "modalities": {
          "IMG": { "status": "ready", "slotCount": 3 },
          "VID": { "status": "ready", "slotCount": 2 },
          "AUD": { "status": "ready", "slotCount": 1 },
          "FX": { "status": "skip", "level": "F0" }
        },
        "overallReady": true
      }
    ],
    "blockGenerate": false
  }
}
```

## 执行步骤

1. 逐 shot 读取 EN generation + visualLockTable
2. 按模态路由表填充 prompt 槽位
3. FX 模态对照 fxFeasibilityAudit F 等级
4. 跑 MD_prompt_compliance 预检
5. 汇总 modalityAudit

## cache key

`hash(shotFields + rulePackVersion + modelId + artStyle) → compiledPrompt`

## BLOCK 闸门

- 每镜 IMG + VID 至少 ready
- 有台词镜 AUD 必须 ready
- F4+ FX 须有 degrade 或 skip 说明
- blockGenerate=false 方可触达生成

## 严禁

跳过 Touch L0 Gate 直接声称已生成。

## 下游

→ MD_prompt_compliance → 生成 → GenerationFeedback。

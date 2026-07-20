---
name: production_fx_feasibility
description: fxFeasibilityAudit F0-F5 特效 AI 可实现性
stageId: PF
outputTag: fxFeasibilityAudit
rulePackVersion: "2.0.1"
---

# 特效可实现性审计（F0–F5）

特效设计 → prompt → AI 生成链路的前置闸门。对照 `fx_feasibility_matrix.json`。

## 审计等级 F0–F5

| 等级 | 含义 | 处理 |
|------|------|------|
| **F0** | 纯实拍，无特效 | 直接通过 |
| **F1** | 轻后期（调色/模糊） | 标准 prompt |
| **F2** | 粒子/光效（模型擅长） | 附参考词表 |
| **F3** | 中等特效（变形/融合） | 需 degrade 备选 |
| **F4** | 高难度（大规模破坏） | degradeFixPlan 必须 |
| **F5** | 当前模型不可实现 | BLOCK + 改 W3 △ 或 SB |

## fxFeasibilityAudit 结构

```json
{
  "fxFeasibilityAudit": {
    "rulePackVersion": "2.0.1",
    "items": [
      {
        "shotId": "shot-5",
        "fxDesc": "手掌发出金色光芒",
        "level": "F2",
        "modelCapable": true,
        "promptHint": "soft golden glow, hand close-up"
      }
    ],
    "blockCount": 0,
    "overallPass": true
  }
}
```

## degradeFixPlan（F4+）

```json
{
  "degradeFixPlan": {
    "original": "大楼爆炸坍塌",
    "degraded": "远处烟雾+人群惊逃反应",
    "targetStage": "W3",
    "ruleId": "F4-DEG"
  }
}
```

## 执行步骤

1. 从 shots 提取 △ 中含特效描述的镜
2. 对照 matrix 判定 F0–F5
3. F4+ 必须写 degradeFixPlan
4. F5 → blockCount++，附 GenerationFeedback
5. overallPass = blockCount === 0

## BLOCK 闸门

- F5 项须降级或 rePush 上游
- F4 须有 degradeFixPlan
- 与 debutIntroPack 特效介绍镜协调

## 反馈合流

生成失败 → GenerationFeedback → rePushPlan（见 corridor_repush）。

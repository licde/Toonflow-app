---
name: corridor_repush
description: 反推重推 rePushPlan schema 与路由表
stageId: RP
outputTag: rePushPlan
rulePackVersion: "2.0.1"
---

# 走廊反推 · rePushPlan

检测 fail 或 supervision C/D 时，产出 `rePushPlan[]`，从上游 stage **正向重跑**（非单字段 patch）。maxRounds = 3。

## 触发来源

- supervision_review grade C/D
- T1_quality_gate BLOCK
- identityAudit / fxFeasibilityAudit / PR 检出
- linkageAudit 多链断裂
- GenerationFeedback 回流

## rePushPlan schema

```json
{
  "rePushPlan": [
    {
      "id": "RP-{episodeKey}-r1",
      "rulePackVersion": "2.0.1",
      "round": 1,
      "maxRounds": 3,
      "symptom": "情绪不符",
      "qpId": "QP-08",
      "reverseTarget": "designBrief",
      "affectedStages": ["B", "GB", "SB"],
      "forwardRerun": ["design_brief", "corridor_GB", "corridor_SB"],
      "preserveFields": ["script", "globalAnchors"],
      "reason": "SB 情绪强度与 B4 弧线偏差>3",
      "status": "pending|in_progress|completed|exhausted"
    }
  ]
}
```

## reverse_route_table 摘要

| 症状域 | reverseTarget | forwardRerun |
|--------|---------------|--------------|
| 台词不符 | SB 或 W3 | corridor_SB / W3_script |
| 情绪不符 | designBrief / GB | design_brief → corridor_GB |
| 构图难表达 | presentationFork | W3 △ 或 SB spatialRelation |
| 故事断链 | W3 / W2 / W1 | 按断裂深度上游 |
| prompt 不合规 | EN / MD | corridor_EN → MD_prompt_compliance |
| 身份不一致 | BP / EN | BP_blueprint → corridor_EN |

## presentationFork

当「构图难表达」时，二选一：

- **fork-A**：改 W3 △ 描述（叙事层）
- **fork-B**：改 SB spatialRelation（镜级）

须在 rePushPlan 中显式标注 fork 选择。

## 执行步骤

1. 读取症状 + qpId（如有）
2. 查 reverse_route_table 确定 reverseTarget
3. 列出 affectedStages + forwardRerun 顺序
4. 标注 preserveFields（锚点/剧本通常保留）
5. round++ ，超限设 status=exhausted

## 产品契约（质量优先）

- **rePush / 回推按钮 = 仅跳转设计台，不改 JSON 数据**。
- 真正修复：复制 `chatRepairText`（exportGate / import 400 / burn 失败）→ Chat 改字段 → 再 dryRun/exportGate → 再导入/烧片。
- 路由表须含 `cam_whitelist`、`img_cref_missing`、`narrative_split_hint`、`pr_lip_duration`、`modality_fx_missing`；禁止落到 INFRA 死路由。

## BLOCK

round > 3 → 停止自动重推，上报用户决策。

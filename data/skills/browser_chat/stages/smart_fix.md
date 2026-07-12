---
name: smart_fix
description: SF 智能修复 fixPlan 结构与 autoFix 对齐
stageId: SF
outputTag: fixPlan
rulePackVersion: "2.0.1"
---

# SF 智能修复（fixPlan）

SD 检出或 validate 预检失败后，产出结构化 `fixPlan`，对齐 `fix_templates.json` 与 autoFixLibrary。**不得**直接输出 T1 终稿。

## 触发条件

- smartDetection 有 fail 项
- linkageAudit 链断裂
- corridor 某阶段 BLOCK 未过
- supervision_review 评级 C/D

## fixPlan 结构

```json
{
  "fixPlan": {
    "id": "SF-{episodeKey}-{round}",
    "rulePackVersion": "2.0.1",
    "triggerStage": "SB",
    "round": 1,
    "maxRounds": 3,
    "items": [
      {
        "fixId": "FT-001",
        "ruleId": "R2",
        "severity": "BLOCK",
        "symptom": "分镜台词与剧本 hash 不一致",
        "targetStage": "SB",
        "targetField": "shots[].narrative.dialogue.lines",
        "action": "逐句对齐剧本引号与角色名",
        "templateRef": "fix_templates.json#dialogue-fidelity",
        "autoApplicable": true
      }
    ],
    "linkageRepairPlan": [
      { "chain": "台词", "breakPoint": "shot-3", "repair": "补 lines 映射" }
    ],
    "status": "pending|applied|rejected"
  }
}
```

## 执行步骤

1. 读取 smartDetection / linkageAudit 失败项
2. 每项匹配 fix_templates 中 templateRef
3. 标注 targetStage + targetField + ruleId
4. 评估 autoApplicable（可自动 vs 需人工）
5. round ≤ maxRounds(3)，超限 → rePushPlan

## 修复优先级

| severity | 处理 |
|----------|------|
| BLOCK | 必须先修，不得下一阶段 |
| WARN | 建议修，可附说明跳过 |
| INFO | 记录，不阻断 |

## BLOCK 闸门

- 每个 BLOCK 项均有 fixId + action
- ruleId 来自 rule_cards，禁止自造
- applied 后须重跑 SD + corridor 自检
- 未 applied 不得 output ScriptBundle T1

## 与 rePushPlan 关系

单字段 fix → fixPlan；多域/上游断裂 → 升级 rePushPlan（见 corridor_repush）。

## 七维修复路由

| 维 | 典型 ruleId | 先修 | 再修 |
|----|-------------|------|------|
| 台词 | R2/H3 | SB lines | W3 script |
| 场景 | V5 | SB sceneName | designBrief B6 |
| 故事 | PR-09 | SB markers | designBrief B5 / W1 |
| 运镜 | PR-CAM-01/QP-14 | EN motion | SB transition |
| 视听 | L10 | GB emotionCurve | designBrief B4 |
| 改编 | P03 | W2 strategy | W3 |
| 模态 | PC-09~14 | EN/MD | SB |

见 `reverse_route_table.json` + `repair_hint_catalog.json`（附录 V）。

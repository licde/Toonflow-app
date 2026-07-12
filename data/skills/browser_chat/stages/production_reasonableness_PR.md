---
name: production_reasonableness_PR
description: 分镜合理性 PR-01 至 PR-16 审计
stageId: PR
outputTag: reasonablenessAudit
rulePackVersion: "2.0.1"
---

# 分镜合理性审计（PR-01–PR-16）

分镜不合理时**反推重设计**，走 rePushPlan（非单字段 fix）。

## PR 规则清单

| ID | 检查项 | 严重度 | 典型反推 |
|----|--------|--------|----------|
| PR-01 | 景别与情绪不匹配 | WARN | SB shotSize |
| PR-02 | 单镜时长超平台阈值 | WARN | SB duration |
| PR-03 | 同场景重复构图 >3 | BLOCK | SB 拆镜 |
| PR-04 | 台词镜无人物 | BLOCK | SB 补 CHAR |
| PR-05 | 情绪跳变无铺垫 | BLOCK | GB/W3 |
| PR-06 | 空间关系矛盾 | BLOCK | SB spatialRelation |
| PR-07 | 竖屏横向全景 | BLOCK | SB shotSize |
| PR-08 | 因果断裂（动作无因） | BLOCK | W3 △ |
| PR-09 | 信息镜缺 markers | WARN | shots.markers |
| PR-10 | 钩子镜缺失 | BLOCK | SB 末镜 |
| PR-11 | 群戏人数与资产不符 | WARN | AS extract |
| PR-12 | 跨场跳切无过渡 | WARN | GB 过渡表 |
| PR-13 | OS/VO 镜标 type 错误 | BLOCK | SB dialogue.type |
| PR-14 | 正反打轴线混乱 | WARN | SB spatialRelation |
| PR-15 | 特效镜无 F 等级 | BLOCK | fxFeasibilityAudit |
| PR-16 | 首次出场无 establishing | BLOCK | debutIntroPack |
| PR-CAM-01 | 运镜/过渡不可执行 | BLOCK | EN / SB transition |

> **PR-CAM-01** 专责运镜白名单与 transitionType；情绪跳变仍走 **PR-05** → GB/W3。

## 输出结构

```json
{
  "reasonablenessAudit": {
    "rulePackVersion": "2.0.1",
    "items": [
      { "ruleId": "PR-05", "shotId": "shot-7", "severity": "BLOCK", "desc": "情绪从2跳到9无铺垫" }
    ],
    "blockCount": 1,
    "rePushPlanRef": "RP-ep-01-r1"
  }
}
```

## 执行步骤

1. 逐 shot 跑 PR-01–PR-16
2. BLOCK 项计数 blockCount
3. blockCount > 0 → 生成 rePushPlan（非 fixPlan）
4. 按断裂深度选 reverseTarget：SB < GB < W3
5. 与 narrativeCausalityGraph 交叉验证

## BLOCK 闸门

- blockCount = 0 方可进 EN/生成
- PR-08 断裂须附因果图断点 ID
- 反推须走 corridor_repush schema

## 与 QP 映射

| 用户话术 | QP | PR |
|----------|-----|-----|
| 太单调 | QP-06 | PR-03 |
| 没张力 | QP-08 | PR-05 |
| 场太少 | QP-02 | PR-12 |
| 运镜不行 | QP-14 | PR-CAM-01 |

---
name: P09_reinforce
description: P0.9 改编后剧本加固与规则引用
stageId: P09
outputTag: reinforcement
rulePackVersion: "2.0.1"
---

# P0.9 改编加固

针对 P0.8 残留问题执行加固，引用具体 ruleId，通过后进入 G 层。

## 入口条件

- `planData.postCheck.conclusion` = 需加固
- `postCheck.residualIssues` 非空

## 执行区块

| 区块 | 字段 |
|------|------|
| actions | 问题 / 措施 / ruleId |
| changeLog | 改动项 / 原 / 新 |
| verification | 维度 / 加固前 / 加固后 / 变化 |
| conclusion | 通过 / 仍不通过 |

## 常用 ruleId 引用

| 问题类型 | 可引用 ruleId |
|----------|---------------|
| 情绪不足 | W77, B8 |
| 反转稀疏 | W93, P2 |
| 冲突弱化 | W12, P4 |
| 弧光断裂 | G1, P5 |
| 台词平淡 | W13, P6 |

## 执行步骤

1. 逐条读取 residualIssues
2. 为每条选定措施 + ruleId（不得自造 ruleId）
3. 修改 storyCore 对应字段，记录 changeLog
4. 六维度再验证，全部 ≥5 方可 conclusion=通过
5. 更新 ruleAudit

## 输出

```xml
<reinforcement rulePackVersion="2.0.1">
  <actions ruleId="W77" issue="P-003">增加第2集情绪爆点...</actions>
  <changeLog>...</changeLog>
  <verification>
    <dim id="P1" before="4" after="6" />
  </verification>
  <conclusion>通过</conclusion>
</reinforcement>
```

## BLOCK 闸门

- 每条残留问题均有 actions + ruleId
- 加固后六维度均 ≥5
- conclusion=通过 方可进 G_anchors

## 失败路由

conclusion=仍不通过 → 回 P06_story_core 或 P03_matrix（附 rePushPlan 草案）。

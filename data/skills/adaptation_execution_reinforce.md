---
name: adaptation_execution_reinforce
description: P0.9 改编后剧本加固（步骤0.9）
stageId: P09
outputTag: reinforcement
---

# P0.9 改编加固

针对 P0.8 残留问题执行加固，引用具体规则 ID。

## 输入

- `planData.postCheck.residualIssues`
- `planData.storyCore`

## 执行

| 区块 | 内容 |
|------|------|
| 加固执行 | 问题 / 措施 / 规则 ID（如 W77、B8） |
| 加固改动日志 | 改动项 / 原 / 新 |
| 加固后验证 | 维度 / 加固前 / 加固后 / 变化 |

## 边界条件

- 加固措施必须引用具体 ruleId
- 加固后六维度均 ≥5 方可 conclusion=通过
- 通过后方可进入 G 层 / W1

## 输出

写入 `planData.reinforcement`：

```xml
<reinforcement>
  <actions ruleId="W77">...</actions>
  <changeLog>...</changeLog>
  <verification>...</verification>
  <conclusion>通过</conclusion>
</reinforcement>
```

## ruleAudit

- stage: `P09`
- BLOCK：conclusion=通过 且 六维度≥5

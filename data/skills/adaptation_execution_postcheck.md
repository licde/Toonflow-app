---
name: adaptation_execution_postcheck
description: P0.8 改编后剧本后检（步骤0.8）
stageId: P08
outputTag: postCheck
---

# P0.8 改编后检

对 P0.6 故事框架做**改编前后对比**与六维度再评分。

## 输入

- `planData.storyCore`
- `planData.preCheck`（旧评分基准）

## 执行

| 区块 | 内容 |
|------|------|
| 改编前后对比 | 旧问题 / 是否解决 / 说明 |
| 六维度再评分 | 维度 / 新分 / 旧分 / 变化 |
| 残留问题 | 问题 / 描述 / 加固方向 |
| 后检结论 | 通过 / 需加固 / 需重新改编 |

## 边界条件（P7）

- **六维度评分均须 ≥5** 才算通过
- 残留问题须给出具体加固方向（指向 P0.9 或 W 阶段）

## 输出

写入 `planData.postCheck`：

```xml
<postCheck>
  <comparison>...</comparison>
  <dimensions>...</dimensions>
  <residualIssues>...</residualIssues>
  <conclusion>通过|需加固|需重新改编</conclusion>
</postCheck>
```

## ruleAudit

- stage: `P08`
- BLOCK：六维度均≥5 或 conclusion=需加固（不得进 W1 直至加固完成）

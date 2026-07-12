---
name: adaptation_execution_story_core
description: P0.6 改编后故事核心构建（步骤0.6）
stageId: P06
outputTag: storyCore
---

# P0.6 故事核心

基于源材料 + 改编矩阵，构建**新叙事内核**与事件序列。W1 骨架须引用本产出。

## 输入

- `planData.adaptationMatrix`
- 源材料摘要

## 产出字段

| 字段 | 说明 |
|------|------|
| 新叙事内核 | 一句话故事核心 |
| 新人物锚点 | 角色 / 核心矛盾 / 初始状态 / 终局状态 |
| 新关系架构 | 关系表或简述 |
| 新核心事件序列 | 阶段 / 集数 / 核心事件 / 对应旧问题解决 |
| 改编改动日志 | 改动项 / 旧 / 新 / 原因 |

## 边界条件

- 新故事须解决 P0 中 ≥80% 识别问题
- 改动日志记录每一项修改的因果逻辑
- 人物 ≤4（大三角原则，W1 复验）

## 输出

写入 `planData.storyCore`：

```xml
<storyCore>
  <narrativeKernel>...</narrativeKernel>
  <characterAnchors>...</characterAnchors>
  <relationships>...</relationships>
  <eventSequence>...</eventSequence>
  <changeLog>...</changeLog>
</storyCore>
```

## ruleAudit

- stage: `P06`
- BLOCK：叙事内核非空、事件序列≥3 行、改动日志≥1 条

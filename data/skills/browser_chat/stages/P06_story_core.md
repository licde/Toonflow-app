---
name: P06_story_core
description: P0.6 改编后故事核心构建
stageId: P06
outputTag: storyCore
rulePackVersion: "2.0.1"
---

# P0.6 故事核心

基于源材料 + 改编矩阵，构建**新叙事内核**与事件序列。W1 骨架须引用本产出。

## 入口条件

- `planData.adaptationMatrix` 已通过 P03 BLOCK
- 源材料摘要可用

## 产出字段

| 字段 | 说明 | ruleId 关联 |
|------|------|-------------|
| narrativeKernel | 一句话故事核心 | W1 故事核 |
| characterAnchors | 角色/矛盾/初态/终态 | G1 预留 |
| relationships | 关系表或简述 | G5 预留 |
| eventSequence | 阶段/集数/事件/旧问题解决 | P0 问题闭环 |
| changeLog | 改动项/旧/新/原因 | P09 可追溯 |

## 执行步骤

1. 从 adaptationMatrix.recommendedConfig 提取改编约束
2. 写 narrativeKernel（≤50 字，含心理级爽点类型）
3. 立 characterAnchors，人物 ≤4（大三角原则）
4. 排 eventSequence ≥3 行，标注解决的 P-00x
5. 逐条记录 changeLog，附因果逻辑

## 边界条件

- 新故事须解决 P0 中 ≥80% 识别问题
- 人物 ≤4，为 W1 人物小传奠基
- 金手指须有约束，非同质化（市面 >10 次须升级）

## 输出

```xml
<storyCore rulePackVersion="2.0.1">
  <narrativeKernel>...</narrativeKernel>
  <characterAnchors>...</characterAnchors>
  <relationships>...</relationships>
  <eventSequence>
    <event phase="铺垫" episode="1-3" desc="..." resolves="P-001" />
  </eventSequence>
  <changeLog>...</changeLog>
</storyCore>
```

## BLOCK 闸门

- narrativeKernel 非空
- eventSequence ≥3 行
- changeLog ≥1 条
- 问题解决率 ≥80%

## ruleAudit

stage `P06`；未通过不得进 P08_postcheck。

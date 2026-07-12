---
name: P08_postcheck
description: P0.8 改编后剧本后检与六维度再评分
stageId: P08
outputTag: postCheck
rulePackVersion: "2.0.1"
---

# P0.8 改编后检

对 P0.6 故事框架做**改编前后对比**与六维度再评分，决定进入加固或 W 阶段。

## 入口条件

- `planData.storyCore` 已完成
- `planData.preCheck` 作为旧评分基准

## 执行区块

| 区块 | 内容 |
|------|------|
| comparison | 旧问题 / 是否解决 / 说明 |
| dimensions | 维度 / 新分 / 旧分 / 变化 |
| residualIssues | 问题 / 描述 / 加固方向 |
| conclusion | 通过 / 需加固 / 需重新改编 |

## 再评分标准

沿用 P1–P6 六维度，对比 preCheck 基线：

- **通过**：六维度均 ≥5，且无未解决严重问题
- **需加固**：任一维度 <5 或残留问题可局部修复
- **需重新改编**：≥3 维度 <4 或核心矛盾未解决

## 执行步骤

1. 逐条对照 preCheck.issues 与 storyCore.eventSequence
2. 六维度再评分，记录 delta（新分 - 旧分）
3. 残留问题标注加固方向（指向 P09 或 W 阶段 ruleId）
4. 输出 conclusion

## 输出

```xml
<postCheck rulePackVersion="2.0.1">
  <comparison>...</comparison>
  <dimensions>
    <dim id="P1" old="6" new="7" delta="+1" />
  </dimensions>
  <residualIssues>...</residualIssues>
  <conclusion>通过|需加固|需重新改编</conclusion>
</postCheck>
```

## BLOCK 闸门

- 六维度均有新旧分
- conclusion 非空
- conclusion=通过 → 六维度均 ≥5
- conclusion=需加固 → 残留问题均有加固方向

## 路由

| conclusion | 下一 stage |
|------------|------------|
| 通过 | G_anchors |
| 需加固 | P09_reinforce |
| 需重新改编 | P03_matrix |

---
name: W2_strategy
description: W2 改编策略 adaptationStrategy XML
stageId: W2
outputTag: adaptationStrategy
rulePackVersion: "2.0.1"
---

# W2 改编策略

基于 W1 骨架制定改编策略，输出 `<adaptationStrategy>` XML。原创项目可简化为「载体适配策略」。

## 入口条件

- `planData.storySkeleton` 已通过 W1 BLOCK
- `planData.adaptationMatrixStructured.userConfirmed` = true
- globalAnchors G1–G5 可用

## 策略必含区块

| 区块 | 内容 |
|------|------|
| 核心改编原则 | 3–5 条，含优先级、正面指导、负面边界 |
| 主要删除决策 | 被删/压缩内容、原因、主线影响 |
| 世界观呈现策略 | 出场节奏、解释度、角色态度锚点 |
| 三大密度保障 | 情绪/信息/情节密度删留标尺 |
| 股价级反转来源 | 与骨架登记表一一对应 |

## 8 大核心要点（必覆盖）

1. 强画面感  2. 台词精简  3. 节奏极致快  4. 只沿主线
5. 降低理解成本  6. 情绪大于一切  7. 开篇给足期待感  8. 展示不要告诉

## 执行步骤

**步骤 0**：读 `viralWritingContext.stageBrief`；冲突曲线峰值场必须对齐 `peakLedger`（禁假爆点）。

1. 读取 storySkeleton 删减记录与反转登记表 + peak/hook
2. 读取 `adaptationMatrixStructured` + `adaptationProfile`（含 deepAdaptation / V/R/C 维）
3. 写 3–5 条核心原则，每条服务故事核与真视听爆点
3. 列删除决策表格（列：**三密度影响** + **替代爆点 peakId**）；写入 `narrativeBrief.densityBudget`
4. 写世界观渐进披露方案（对话/OS/VO，禁大段旁白；遵守 infoGap）
5. 核对 ≈3 个反转与骨架登记表一致；标注 3-15-45 留存点

## 输出

```xml
<adaptationStrategy rulePackVersion="2.0.1">
  <principles>
    <p priority="1" do="..." dont="..." />
  </principles>
  <deletions>...</deletions>
  <worldviewStrategy>...</worldviewStrategy>
  <densityPolicy>...</densityPolicy>
</adaptationStrategy>
```

## BLOCK 闸门

- 原则 3–5 条
- 删除决策与骨架删减记录一致
- 8 大要点均有体现
- 反转来源与骨架登记表无冲突

## 下游

通过 → W3_script；可选 supervision_review（策略审核）。

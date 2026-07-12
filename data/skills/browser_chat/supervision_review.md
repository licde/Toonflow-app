---
name: supervision_review
description: SD-S 监督审核 A/B/C/D 评级与闸门
stageId: SD-S
outputTag: supervisionReport
rulePackVersion: "2.0.1"
---

# SD-S 监督审核

Browser Chat 监督层，对 W1 骨架、W2 策略、T1 终稿等产出评级。**只提问题与建议，不做修改决策。**

## 审核对象映射

| 关键词 | 审核对象 | 对照 Skill |
|--------|----------|------------|
| 骨架/故事骨架 | storySkeleton | W1_skeleton |
| 策略/改编策略 | adaptationStrategy | W2_strategy |
| 剧本/T1 | script + preDesignPack | W3 + corridor |

## 评级标准（A/B/C/D）

| 评级 | 严重问题 | 中等问题 | 闸门 |
|------|----------|----------|------|
| **A** 可直接使用 | 0 | ≤2 | 放行 |
| **B** 小修后可用 | 0 | ≤5 | 放行（附建议） |
| **C** 需较大修改 | 1–2 | 不限 | **BLOCK 下一阶段** |
| **D** 建议重做 | ≥3 | 不限 | **BLOCK 下一阶段** |

## 报告结构

```markdown
# 审核报告：{对象}
## 总评
- **评分**：B
- **概要**：...
## 问题清单
| # | 严重程度 | 审核项 | 问题 | 建议方案 |
## 需要您决定（仅 C/D）
```

## 短剧通用红线（违反即严重）

1. 连续 3 集无情绪爆点  2. 多线并行  3. 第 1 集无强冲突
4. 现实官职称谓  5. 大段旁白灌输  6. 金手指同质化
7. 反转空降硬凹  8. 开篇三天坑  9. 只堆吵架无真矛盾

## T1 专项（R2 台词忠实）

- 剧本 hash ↔ preDesignPack.shots.lines hash 一致
- 每句台词映射到 `narrative.dialogue.lines`
- externalHashCheck.match = true

## 执行步骤

1. 识别审核对象，读取对应 planData 字段
2. 对照 Skills 红线逐项检查
3. 合并同类轻微问题
4. 输出评级 + 问题清单
5. 写入 `supervisionReport`

## 输出

```json
{
  "supervisionReport": {
    "target": "storySkeleton",
    "grade": "B",
    "rulePackVersion": "2.0.1",
    "issues": [{ "severity": "medium", "item": "付费点分布", "desc": "...", "fix": "..." }],
    "blockNext": false
  }
}
```

C/D 级 → 触发 smart_fix 或 corridor_repush，不得进入下一阶段。

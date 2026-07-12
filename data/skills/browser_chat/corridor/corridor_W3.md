---
name: corridor_W3
description: 质量走廊 · W3 剧本阶段边界
stageId: W3
rulePackVersion: "2.0.1"
---

# 走廊 · W3 剧本

## SPEC · 严禁越界

- **CAN**：文学剧本、场标、对白、动作描写
- **CANNOT**：景别、切镜、BGM、色温、prompt、分镜表

## LINK · 输入输出

| 输入 | 输出 |
|------|------|
| W1 storySkeleton 本集行 | script 正文 |
| W2 adaptationStrategy | designBrief（W3 末） |
| G globalAnchors | ruleAudit.W3 |

## SD-W · 智能检测

挂载 `smart_detection.md` 模块 **SD-W**：密度/钩子/台词/时长。

BLOCK → fixPlan → 修订 script，不得进 designBrief。

## SF · 修复

| 问题 | fixPlan 动作 |
|------|-------------|
| R2 台词不保真 | 恢复源材料引号内原文 |
| W12 缺开篇钩 | 补第一场视觉+情感悬念 |
| W13 缺集末钩 | 补未解问题 |

## 出口闸门

- ruleAudit.W3.passed = true
- 随后 **designBrief**（B1–B11 + H1），再 GB

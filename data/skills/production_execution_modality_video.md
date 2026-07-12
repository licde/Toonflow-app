---
name: production_execution_modality_video
description: MD 视频模态 · videoPrompt 运镜与唇形
stageId: MD-VID
---

# MD 视频模态

## slots

motion, camera, duration, lipSync, identity, fx

## 规则

- duration 与 SB duration 一致
- 有对白须 lipSync 关键词
- fx 须 fxFeasibilityAudit 级别 ≤F3
- singleImage 模式禁止重写面部表情（QF-EXPR-06）

## 输出

`videoPrompt` / `videoDesc` + modalityPromptAudit.VID

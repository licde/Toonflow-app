---
name: P06_story_core
description: P0.6 改编后故事核心 — 先示范原→改再重构情绪过山车
stageId: P06
outputTag: storyCore
rulePackVersion: "2.0.1"
---

# P0.6 故事核心（爆款重构主示范站）

基于源材料 + 改编矩阵 + **题材原→改示范**，构建新叙事内核。W1 骨架须引用本产出。

## 入口条件

- `planData.adaptationMatrixStructured.userConfirmed` = true
- 已选 `genreTemplate.packId`；建议已有 `peakLedger`/`hookPlan`（可调用 `extract_peak_hook`）

## 产出字段

| 字段 | 说明 |
|------|------|
| narrativeKernel | 一句话故事核 + 心理级爽点类型 |
| characterAnchors | 角色/矛盾/初态/终态 ≤4 |
| relationships | 关系表 |
| eventSequence | 兑现 peak + 开场微循环 + 集末钩 + 付费卡前拍 |
| changeLog | **假爆点→真视听钩** 必填 |

## 执行步骤

**步骤 0（强制）**：调用 `get_viral_writing_context(stageId=P06)`；**先向用户展示 1 条「原→改」示范**（来自 brief），再动手写。

1. 读取矩阵 + peakLedger/hookPlan；缺 peak 则 `extract_peak_hook`
2. 写 narrativeKernel（≤50 字，含情绪任务）
3. 立 characterAnchors ≤4
4. 排 `eventSequence` ≥3：每行标注 `peakIds` / `hookSlot` / `resolves`；ep1 须开场微循环 + 3-15-45
5. `changeLog` 每条须含：`from`(假/弱) → `to`(真视听钩) + `matrixDim` + `emotionTask` + `paypoint?`
6. 写入 `narrativeBrief.reconstructionTrace[]`；镜像 `hookPlan.paypointIntent`

## 边界

- 解决 P0 ≥80% 问题；禁只改人名不改情绪过山车
- 付费卡：高潮切断前一拍写进事件/钩子
- 景别秒数不进本 XML 正文（留给 W3 sidecar）

## BLOCK

- 步骤0 已展示原→改
- narrativeKernel / eventSequence≥3 / changeLog≥1 含假→真
- DEX-HOOK-PLAN / DEX-EMPATHY / DEX-PAYPOINT / DEX-RECON-EXAMPLE

## 下游

通过 → P08；W1 必须引用本 storyCore 的 peak 落点。

---
name: corridor_SB
description: SB 分镜表走廊 — shots dialogue.lines，禁 prompt
stageId: SB
outputTag: storyboardTable
rulePackVersion: "2.0.1"
---

# 走廊 SB · 分镜表

质量走廊第二阶段：scriptPlan → shots[]。**每句台词映射 dialogue.lines**，严禁 compiled prompt。

## 入口条件

- corridor_GB scriptPlan 已通过
- script 全文可用

## 每镜必填字段

| 字段 | 说明 | ruleId |
|------|------|--------|
| id | shot-1 递增 | — |
| narrative.type | CHAR-SCENE / CHAR-PROP 等 | V4 |
| narrative.sceneName | 场景名（后续映射 SCENE-CODE） | V5 |
| narrative.dialogue.lines | **每句台词原文**，含角色名与引号 | R2, H3 |
| narrative.emotionIntensity | 0-10，对齐 GB 场情绪 | L10 |
| narrative.shotSize | 景别（特写/中景/全景） | S4 |
| narrative.duration | 预估秒数 | — |
| narrative.transitionType | 切/淡入/叠化 | PR-CAM-01 |
| narrative.rhythmZone | 起/承/转/合（引用 B12） | DC-05 |
| narrative.markers | 伏笔/揭晓/钩子标记 | PR-09, DC-06 |
| narrative.spatialRelation | 轴线/站位（引用 B13） | PR-06, PR-14 |

## 台词映射铁律（R2）

1. 剧本每句 `{角色}：{台词}` → 恰好一镜 lines
2. 禁止删改字词、调换语序、合并台词
3. OS/VO 单独成镜，type 标注 os/vo
4. 出口前计算 linesHash，与 scriptHash 对照

## 执行步骤

1. 按 scriptPlan 分场拆镜
2. 为每句台词创建 shot，填入 dialogue.lines
3. 标 shotSize + emotionIntensity + duration + rhythmZone
4. 为信息镜填 markers；标 spatialRelation 对齐 B13
5. 跑 externalHashCheck 预检
6. 写入 preDesignPack.shots[]

## BLOCK 闸门

| 项 | 条件 |
|----|------|
| R2 | 台词零删改，覆盖率 100% |
| H3 | hash 一致 |
| 镜数 | ≥ 台词句数 |
| 禁越界 | 无 imagePrompt/videoPrompt/audioPrompt |

## 严禁产出

compiled prompt、API 参数、vendor 字段、Touch 配置。

## 下游

通过 → T1_quality_gate 或 corridor_EN（T2）；台词问题 → rePush W3 或 SB 拆镜。

---
name: design_scene
description: 场景设计维 · B6→SCENE→IMG
stageId: SCN
rulePackVersion: "2.0.1"
---

# 场景设计（scene + asset 链）

## 正推

B6.scenes → GB 场表 → SB.sceneName → BP.sceneColorLock → EN.cref → IMG.scene

**MUST**：唯一 `SB.sceneName` 数 = `implementationPlan`/`sceneMeta` 条数。接场同地点须用不同 sceneName（如「卧房·后」），或合并 plan 删除多余 sceneRef。禁止孤儿场（plan 有 F1、无映射镜）。

## 反推

| 触发 | 目标 |
|------|------|
| 场景名不一致 | GB/SB |
| 场镜基数 / 孤儿场 | W3 plan 或 SB sceneName |
| cref 缺失 | EN/BP |

## SD-SCN

SD-SCN-01 B6↔SB.sceneName；SD-SCN-02 sceneColorLock；SD-SCN-03 plan↔唯一 sceneName 基数

## dryRun DC-06/DC-08 / DG-SCENE-CARDINALITY

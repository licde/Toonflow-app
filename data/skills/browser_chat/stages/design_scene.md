---
name: design_scene
description: 场景设计维 · B6→SCENE→IMG
stageId: SCN
rulePackVersion: "2.0.1"
---

# 场景设计（scene + asset 链）

## 正推

B6.scenes → GB 场表 → SB.sceneName → BP.sceneColorLock → EN.cref → IMG.scene

## 反推

| 触发 | 目标 |
|------|------|
| 场景名不一致 | GB/SB |
| cref 缺失 | EN/BP |

## SD-SCN

SD-SCN-01 B6↔SB.sceneName；SD-SCN-02 sceneColorLock

## dryRun DC-06/DC-08

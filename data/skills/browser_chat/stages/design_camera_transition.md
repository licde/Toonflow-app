---
name: design_camera_transition
description: 运镜/场景切换 · SB→VID
stageId: CAM
rulePackVersion: "2.0.1"
---

# 运镜与场景切换（camera 链）

## 正推

B12 rhythmDesign → B13 transitionPolicy → SB.shotSize/transitionType/rhythmZone → EN.motion → MD-VID.camera

## 反推

| 触发 | 目标 | 规则 |
|------|------|------|
| 运镜非法 | EN/MD | PR-CAM-01, QP-14 |
| 情绪跳变 | GB/W3 | PR-05 |
| 跨场跳切 | SB | PR-12 |

## CAN/CANNOT

GB 禁切镜指令；SB 写抽象字段；T3 MD 写运镜白名单。

## dryRun DC-09
